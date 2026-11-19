// Neon Coast Poster Studio: wires the editor. Photos come in by file picker or drag and drop; the layout, grade,
// lettering and size pickers and the caption fields change one state object; the preview canvas redraws live and
// takes clicks (select a panel), drags (pan its photo) and wheel turns (zoom); Export writes the PNG.
import { POSTER_TEMPLATES, photoPanelCount } from './posterLayouts.js';
import { COLOR_GRADES } from './colorGrades.js';
import { LETTERING_STYLES } from './captionLettering.js';
import { renderPoster, defaultPanelCrop, photoPlacement, clampCropFocus } from './posterRenderer.js';
import { pointInPolygon } from './geometry.js';
import { photosFromFiles, photoFromUrl, gradedCopy, enableDropZone } from './photoLibrary.js';
import { POST_SIZES, downloadPosterPng } from './pngExport.js';

const $ = (id) => document.getElementById(id);
const preview = $('poster-preview');
const previewCtx = preview.getContext('2d');

const state = {
  templateId: 'heist-grid',
  gradeId: 'vice-sunset',
  letteringId: 'sunset-gradient',
  sizeId: 'landscape',
  caption: $('caption-input').value,
  tagline: $('tagline-input').value,
  credit: $('credit-input').value,
  border: Number($('border-width').value),
  panels: [],
};
const photos = [];
let selectedPanel = 0;
let lastCells = [];
let previewScale = 1;
let redrawQueued = false;

const currentSize = () => POST_SIZES.find((s) => s.id === state.sizeId);
const gradedPhoto = (i) => (photos[i] ? gradedCopy(photos[i], state.gradeId) : null);
const photoSubjects = () => photos.map((p) => p.subject);
const setStatus = (text) => { $('status').textContent = text; };

/** The most photo panels the template has in any size, so crops survive a size switch. */
function panelSlotsForTemplate() {
  return Math.max(...POST_SIZES.map((s) => photoPanelCount(state.templateId, s.width, s.height)));
}

/** Gives every panel a fresh crop, cycling through the photos so several photos spread over the poster. */
function spreadPhotosOverPanels() {
  state.panels = Array.from({ length: panelSlotsForTemplate() }, (_, i) => defaultPanelCrop(i, photos.length, photoSubjects()));
}

function fillEveryPanelWith(photoIndex) {
  state.panels = Array.from({ length: panelSlotsForTemplate() }, (_, i) => ({ ...defaultPanelCrop(i, 1, [photos[photoIndex].subject]), photo: photoIndex }));
}

function ensurePanelSlots() {
  for (let i = 0; i < panelSlotsForTemplate(); i++) if (!state.panels[i]) state.panels[i] = defaultPanelCrop(i, photos.length, photoSubjects());
}

function requestRedraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawPreview();
  });
}

function drawPreview() {
  const size = currentSize();
  previewScale = Math.min(1, 1280 / Math.max(size.width, size.height));
  const w = Math.round(size.width * previewScale), h = Math.round(size.height * previewScale);
  if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
  lastCells = renderPoster(previewCtx, w, h, state, gradedPhoto, photos.length, { selectedPanel: photos.length ? selectedPanel : null });
  syncPanelControls();
}

// ---------- pickers ----------

function buildRadioChips(container, items, isChecked, onPick, render) {
  container.replaceChildren();
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.id = item.id;
    render(button, item);
    button.addEventListener('click', () => { onPick(item); refreshPickers(); requestRedraw(); });
    container.appendChild(button);
  }
  container._isChecked = isChecked;
}

function refreshPickers() {
  for (const id of ['template-list', 'grade-list', 'lettering-list', 'size-list']) {
    const container = $(id);
    for (const b of container.children) b.setAttribute('aria-checked', String(container._isChecked(b.dataset.id)));
  }
}

function setupPickers() {
  buildRadioChips($('template-list'), POSTER_TEMPLATES, (id) => id === state.templateId,
    (t) => { state.templateId = t.id; ensurePanelSlots(); selectedPanel = 0; },
    (b, t) => { b.innerHTML = `${t.name}<small>${t.hint}</small>`; });
  buildRadioChips($('grade-list'), COLOR_GRADES, (id) => id === state.gradeId,
    (g) => { state.gradeId = g.id; setStatus(`Grade: ${g.name}`); },
    (b, g) => { b.textContent = g.name; b.style.background = `linear-gradient(120deg, ${g.sky.join(', ')})`; });
  buildRadioChips($('lettering-list'), LETTERING_STYLES, (id) => id === state.letteringId,
    (l) => { state.letteringId = l.id; }, (b, l) => { b.textContent = l.name; });
  buildRadioChips($('size-list'), POST_SIZES, (id) => id === state.sizeId,
    (s) => { state.sizeId = s.id; }, (b, s) => { b.innerHTML = `${s.name}<small>${s.hint}</small>`; });
  refreshPickers();
}

// ---------- photos ----------

function renderPhotoStrip() {
  const strip = $('photo-strip');
  strip.replaceChildren(...photos.map((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `Put ${p.name} in the selected panel`;
    b.innerHTML = `<img alt="${p.name.replace(/"/g, '')}" src="${p.thumbnail}">`;
    b.addEventListener('click', () => assignPhotoToSelectedPanel(i));
    return b;
  }));
}

async function addPhotos(newPhotos) {
  if (!newPhotos.length) { setStatus('No image found in what was dropped.'); return; }
  photos.push(...newPhotos);
  spreadPhotosOverPanels();
  renderPhotoStrip();
  setStatus(`${photos.length} photo${photos.length > 1 ? 's' : ''} loaded. Drag inside a panel to frame it.`);
  requestRedraw();
}

async function addPhotoFiles(fileList) {
  setStatus('Reading photos...');
  try {
    await addPhotos(await photosFromFiles([...fileList]));
  } catch (err) {
    setStatus(err.message);
  }
}

function assignPhotoToSelectedPanel(photoIndex) {
  ensurePanelSlots();
  state.panels[selectedPanel] = { ...state.panels[selectedPanel], photo: photoIndex };
  requestRedraw();
}

// ---------- selected panel ----------

function syncPanelControls() {
  const crop = state.panels[selectedPanel];
  const count = lastCells.filter((c) => c.role === 'photo').length;
  $('panel-label').textContent = photos.length ? `${selectedPanel + 1} of ${count}` : '(add a photo first)';
  if (crop && document.activeElement !== $('panel-zoom')) $('panel-zoom').value = String(crop.zoom);
  const choices = $('panel-photo-choices');
  if (choices.childElementCount !== photos.length) {
    choices.replaceChildren(...photos.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.innerHTML = `<img alt="photo ${i + 1}" src="${p.thumbnail}">`;
      b.addEventListener('click', () => assignPhotoToSelectedPanel(i));
      return b;
    }));
  }
  [...choices.children].forEach((b, i) => b.setAttribute('aria-checked', String(!!crop && crop.photo % photos.length === i)));
}

function setupPanelControls() {
  $('panel-zoom').addEventListener('input', (e) => {
    ensurePanelSlots();
    state.panels[selectedPanel].zoom = Number(e.target.value);
    requestRedraw();
  });
  $('panel-reset').addEventListener('click', () => {
    ensurePanelSlots();
    const subject = photos[state.panels[selectedPanel].photo]?.subject ?? { x: 0.5, y: 0.4 };
    state.panels[selectedPanel] = { ...state.panels[selectedPanel], zoom: 1, focusX: subject.x, focusY: subject.y };
    requestRedraw();
  });
  $('panel-mirror').addEventListener('click', () => {
    ensurePanelSlots();
    state.panels[selectedPanel].mirror = !state.panels[selectedPanel].mirror;
    requestRedraw();
  });
  $('shuffle-crops').addEventListener('click', () => {
    ensurePanelSlots();
    state.panels = state.panels.map((p) => ({
      ...p, zoom: 1 + Math.random() * 1.6, focusX: 0.25 + Math.random() * 0.5, focusY: 0.15 + Math.random() * 0.45, mirror: Math.random() < 0.4,
    }));
    requestRedraw();
  });
  $('fill-one-photo').addEventListener('click', () => {
    if (!photos.length) return;
    fillEveryPanelWith(state.panels[selectedPanel]?.photo ?? 0);
    requestRedraw();
  });
  $('spread-photos').addEventListener('click', () => { spreadPhotosOverPanels(); requestRedraw(); });
  $('border-width').addEventListener('input', (e) => { state.border = Number(e.target.value); requestRedraw(); });
}

// ---------- direct manipulation on the preview ----------

function canvasPoint(event) {
  const r = preview.getBoundingClientRect();
  return { x: ((event.clientX - r.left) / r.width) * preview.width, y: ((event.clientY - r.top) / r.height) * preview.height, cssToCanvas: preview.width / r.width };
}

function photoCellAt(point) {
  return lastCells.find((c) => c.role === 'photo' && pointInPolygon(point.x, point.y, c.poly));
}

function setupPreviewGestures() {
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const point = canvasPoint(e);
    const cell = photoCellAt(point);
    if (!cell || !photos.length) return;
    selectedPanel = cell.panelIndex;
    ensurePanelSlots();
    const crop = state.panels[selectedPanel];
    const image = gradedPhoto(crop.photo % photos.length);
    clampCropFocus(cell.box, image, crop);
    const at = photoPlacement(cell.box, image, crop);
    drag = { start: point, cell, image, focusX: crop.focusX, focusY: crop.focusY, w: at.w, h: at.h };
    preview.setPointerCapture(e.pointerId);
    preview.classList.add('dragging');
    requestRedraw();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const point = canvasPoint(e);
    const crop = state.panels[selectedPanel];
    const dx = (point.x - drag.start.x) / drag.w, dy = (point.y - drag.start.y) / drag.h;
    crop.focusX = drag.focusX + (crop.mirror ? dx : -dx);
    crop.focusY = drag.focusY - dy;
    clampCropFocus(drag.cell.box, drag.image, crop);
    requestRedraw();
  });
  const endDrag = () => { drag = null; preview.classList.remove('dragging'); };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
  preview.addEventListener('wheel', (e) => {
    const cell = photoCellAt(canvasPoint(e));
    if (!cell || !photos.length) return;
    e.preventDefault();
    selectedPanel = cell.panelIndex;
    ensurePanelSlots();
    const crop = state.panels[selectedPanel];
    crop.zoom = Math.max(1, Math.min(4, crop.zoom * Math.exp(-e.deltaY * 0.0015)));
    clampCropFocus(cell.box, gradedPhoto(crop.photo % photos.length), crop);
    requestRedraw();
  }, { passive: false });
}

// ---------- caption fields and export ----------

function setupCaptionFields() {
  for (const [id, key] of [['caption-input', 'caption'], ['tagline-input', 'tagline'], ['credit-input', 'credit']]) {
    $(id).addEventListener('input', (e) => { state[key] = e.target.value; requestRedraw(); });
  }
}

function setupExport() {
  $('export-png').addEventListener('click', async () => {
    setStatus('Rendering full size...');
    const name = await downloadPosterPng(state, currentSize(), gradedPhoto, photos.length);
    setStatus(`Saved ${name}`);
  });
  $('export-all').addEventListener('click', async () => {
    const names = [];
    for (const size of POST_SIZES) names.push(await downloadPosterPng(state, size, gradedPhoto, photos.length));
    setStatus(`Saved ${names.join(', ')}`);
  });
}

function setupPhotoInputs() {
  $('photo-input').addEventListener('change', (e) => { if (e.target.files.length) addPhotoFiles(e.target.files); e.target.value = ''; });
  enableDropZone(document.body, addPhotoFiles);
  $('use-samples').addEventListener('click', async () => {
    setStatus('Loading samples...');
    await addPhotos(await Promise.all([photoFromUrl('samples/pier.jpg', 'pier.jpg'), photoFromUrl('samples/boulevard.jpg', 'boulevard.jpg')]));
  });
}

async function startStudio() {
  setupPickers();
  setupPanelControls();
  setupPreviewGestures();
  setupCaptionFields();
  setupExport();
  setupPhotoInputs();
  await Promise.all([document.fonts.load('100px "Coast Display"'), document.fonts.load('italic 100px "Coast Serif"')]);
  ensurePanelSlots();
  requestRedraw();
  window.__studioReady = true;
}

startStudio();
