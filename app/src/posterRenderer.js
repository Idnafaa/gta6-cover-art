// Renders a whole poster onto a 2D context at any size: dark gutters, every photo panel with its own crop (zoom and
// pan) of a graded photo, the halftone screen and sunset glow over the panels, the painted title tile or the caption
// laid over the panels, and film grain. The same function draws the live preview and the full-size PNG export.
import { layoutForSize } from './posterLayouts.js';
import { toPixels, insetConvexPolygon, boundingBox, tracePolygon } from './geometry.js';
import { gradeById } from './colorGrades.js';
import { drawSunsetBackdrop } from './sunsetDecor.js';
import { drawCaptionBlock } from './captionLettering.js';

const patternCache = new Map();

function halftoneTile(cell, color) {
  const key = `${cell}|${color}`;
  if (!patternCache.has(key)) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = cell;
    const t = tile.getContext('2d');
    t.fillStyle = color;
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.75]]) {
      t.beginPath();
      t.arc(cell * x, cell * y, cell * 0.2, 0, Math.PI * 2);
      t.fill();
    }
    patternCache.set(key, tile);
  }
  return patternCache.get(key);
}

let grainTile = null;
function filmGrainTile() {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 160;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(160, 160);
    let seed = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = seed % 256;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  return grainTile;
}

/** The crop a panel gets when the user has not touched it, so one photo fills many panels with different shots:
 * a zoom and a focus point (the photo point, as fractions, that sits at the panel's centre) placed around the photo's
 * subject (`subjects[photo]`, found by findPhotoSubject), with every other repeat of a photo mirrored. */
export function defaultPanelCrop(index, photoCount, subjects = []) {
  const shots = [
    [1.0, 0, 0.1], [2.3, 0, 0.02], [1.5, 0.1, 0.08], [1.85, -0.08, 0.04], [1.25, 0, 0.14],
    [2.8, 0.02, 0], [1.6, 0.12, 0.12], [1.35, -0.12, 0.16], [2.05, 0.06, 0.05],
  ];
  const n = Math.max(1, photoCount);
  const photo = index % n;
  const repeat = Math.floor(index / n);
  const [zoom, dx, dy] = shots[(repeat * 3 + photo * 2) % shots.length];
  const subject = subjects[photo] ?? { x: 0.5, y: 0.35 };
  return { photo, zoom, focusX: subject.x + dx, focusY: subject.y + dy, mirror: repeat % 2 === 1 };
}

/** Where the photo is drawn inside a panel box for a crop: cover-fit times zoom, centred on the focus point and
 * kept so the photo always covers the whole panel. */
export function photoPlacement(box, image, crop) {
  const cover = Math.max(box.w / image.width, box.h / image.height) * crop.zoom;
  const dw = image.width * cover, dh = image.height * cover;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fx = crop.mirror ? 1 - crop.focusX : crop.focusX;
  const x = clamp(box.x + box.w / 2 - fx * dw, box.x + box.w - dw, box.x);
  const y = clamp(box.y + box.h / 2 - crop.focusY * dh, box.y + box.h - dh, box.y);
  return { x, y, w: dw, h: dh };
}

/** Keeps a crop's focus point where the photo can still cover the panel (so a drag past the edge does not pile up). */
export function clampCropFocus(box, image, crop) {
  const at = photoPlacement(box, image, { ...crop, focusX: 0.5, focusY: 0.5 });
  const hx = box.w / 2 / at.w, hy = box.h / 2 / at.h;
  crop.focusX = Math.max(hx, Math.min(1 - hx, crop.focusX));
  crop.focusY = Math.max(hy, Math.min(1 - hy, crop.focusY));
}

/** The panels of the poster as pixel polygons (after the gutters), with their roles. */
export function posterPanels(state, width, height) {
  const gutter = state.border * Math.min(width, height);
  const layout = layoutForSize(state.templateId, width, height);
  const innerW = width - gutter, innerH = height - gutter;
  const cells = layout.cells.map((cell) => {
    const px = toPixels(cell.corners, innerW, innerH).map((p) => ({ x: p.x + gutter / 2, y: p.y + gutter / 2 }));
    const poly = insetConvexPolygon(px, gutter / 2);
    return { role: cell.role, poly, box: boundingBox(poly) };
  });
  const captionBox = layout.captionBox
    ? { x: layout.captionBox.x * width, y: layout.captionBox.y * height, w: layout.captionBox.w * width, h: layout.captionBox.h * height }
    : null;
  return { cells, captionBox };
}

function drawEmptyPanel(ctx, cell, grade, scale) {
  drawSunsetBackdrop(ctx, cell.box, grade);
  ctx.fillStyle = 'rgba(10, 2, 20, 0.45)';
  ctx.fillRect(cell.box.x, cell.box.y, cell.box.w, cell.box.h);
  ctx.font = `${Math.max(12, 30 * scale)}px "Coast Display"`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('DROP A PHOTO', cell.box.x + cell.box.w / 2, cell.box.y + cell.box.h / 2);
}

/**
 * Draws the poster for `state` at width x height. `gradedPhoto(index)` returns the graded canvas of photo `index`
 * (or null), `photoCount` how many photos are loaded. `options.selectedPanel` outlines one panel (preview only).
 */
export function renderPoster(ctx, width, height, state, gradedPhoto, photoCount, options = {}) {
  const grade = gradeById(state.gradeId);
  const scale = Math.min(width, height) / 1080;
  const { cells, captionBox } = posterPanels(state, width, height);
  ctx.save();
  ctx.fillStyle = '#07020d';
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createLinearGradient(width, 0, 0, height);
  glow.addColorStop(0, grade.glow[0]);
  glow.addColorStop(0.5, 'rgba(0,0,0,0)');
  glow.addColorStop(1, grade.glow[1]);
  const halftone = ctx.createPattern(halftoneTile(Math.max(4, Math.round(7 * scale)), grade.palette[0]), 'repeat');

  let photoIndex = 0;
  for (const cell of cells) {
    ctx.save();
    tracePolygon(ctx, cell.poly);
    ctx.clip();
    if (cell.role === 'title') {
      drawSunsetBackdrop(ctx, cell.box, grade);
    } else {
      const crop = state.panels[photoIndex] ?? defaultPanelCrop(photoIndex, photoCount);
      const image = photoCount ? gradedPhoto(crop.photo % photoCount) : null;
      if (image) {
        const at = photoPlacement(cell.box, image, crop);
        if (crop.mirror) {
          ctx.save();
          ctx.translate(at.x + at.w, at.y);
          ctx.scale(-1, 1);
          ctx.drawImage(image, 0, 0, at.w, at.h);
          ctx.restore();
        } else {
          ctx.drawImage(image, at.x, at.y, at.w, at.h);
        }
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = grade.halftone;
        ctx.fillStyle = halftone;
        ctx.fillRect(cell.box.x, cell.box.y, cell.box.w, cell.box.h);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = glow;
        ctx.fillRect(cell.box.x, cell.box.y, cell.box.w, cell.box.h);
        ctx.globalCompositeOperation = 'source-over';
        const shade = ctx.createLinearGradient(0, cell.box.y, 0, cell.box.y + cell.box.h);
        shade.addColorStop(0, 'rgba(10,2,20,0)');
        shade.addColorStop(0.65, 'rgba(10,2,20,0)');
        shade.addColorStop(1, 'rgba(10,2,20,0.4)');
        ctx.fillStyle = shade;
        ctx.fillRect(cell.box.x, cell.box.y, cell.box.w, cell.box.h);
      } else {
        drawEmptyPanel(ctx, cell, grade, scale);
      }
      cell.panelIndex = photoIndex;
      photoIndex++;
    }
    ctx.restore();
  }

  // the title tile's caption is drawn last and may break out over the gutters, like a logo stamped on the grid
  const titleTile = cells.find((c) => c.role === 'title');
  if (titleTile) {
    const { x, y, w, h } = titleTile.box;
    drawCaptionBlock(ctx, { x: x - w * 0.02, y: y - h * 0.1, w: w * 1.04, h: h * 1.18 }, state, grade, state.letteringId);
  }

  if (captionBox) {
    const shadow = ctx.createRadialGradient(
      captionBox.x + captionBox.w / 2, captionBox.y + captionBox.h / 2, 0,
      captionBox.x + captionBox.w / 2, captionBox.y + captionBox.h / 2, Math.max(captionBox.w, captionBox.h) * 0.6,
    );
    shadow.addColorStop(0, 'rgba(8,2,16,0.5)');
    shadow.addColorStop(1, 'rgba(8,2,16,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, width, height);
    drawCaptionBlock(ctx, captionBox, state, grade, state.letteringId);
  }

  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = ctx.createPattern(filmGrainTile(), 'repeat');
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (options.selectedPanel != null) {
    const sel = cells.find((c) => c.panelIndex === options.selectedPanel);
    if (sel) {
      ctx.setLineDash([12 * scale, 8 * scale]);
      ctx.lineWidth = 4 * scale;
      ctx.strokeStyle = '#4df3ff';
      tracePolygon(ctx, insetConvexPolygon(sel.poly, 3 * scale));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
  return cells;
}
