// The photo library: reads the person's own image files in the browser (file picker or drag and drop, nothing is
// uploaded), scales each to a working size, and keeps one graded copy per colour grade so redraws stay fast.
import { applyColorGrade, gradeById } from './colorGrades.js';

const WORKING_LONG_SIDE = 1600;

function decodeImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file is not an image this browser can read.'));
    img.src = url;
  });
}

/** Turns an image URL (an object URL of a local file, or a sample under app/) into a library photo. */
export async function photoFromUrl(url, name) {
  const img = await decodeImage(url);
  const k = Math.min(1, WORKING_LONG_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  const thumb = document.createElement('canvas');
  const t = 96 / Math.max(canvas.width, canvas.height);
  thumb.width = Math.round(canvas.width * t);
  thumb.height = Math.round(canvas.height * t);
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return { name, canvas, subject: findPhotoSubject(canvas), thumbnail: thumb.toDataURL('image/jpeg', 0.8), graded: new Map() };
}

/**
 * Guesses where the photo's subject is, so default crops frame it: on a 64 px copy, scores each pixel by local
 * detail plus a bonus for skin-like warm tones and a gentle pull to the upper middle, and returns the centroid of
 * the best-scoring sixteenth as fractions { x, y } of the photo.
 */
export function findPhotoSubject(canvas) {
  const k = 64 / Math.max(canvas.width, canvas.height);
  const w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k));
  const small = document.createElement('canvas');
  small.width = w; small.height = h;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(canvas, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const lum = (x, y) => { const p = (y * w + x) * 4; return 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]; };
  const scored = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = (y * w + x) * 4, r = d[p], g = d[p + 1], b = d[p + 2];
      const detail = Math.abs(lum(x + 1, y) - lum(x - 1, y)) + Math.abs(lum(x, y + 1) - lum(x, y - 1));
      const skin = r > 90 && r > g && g > b && r - b > 25 && r - g < 90 ? 60 : 0;
      const place = Math.max(0.05, 1 - 0.6 * Math.abs(x / w - 0.5) - 1.4 * Math.max(0, y / h - 0.22));
      scored.push({ x, y, score: (detail + skin) * place });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored.slice(0, Math.max(1, Math.round(scored.length / 16)));
  const cx = best.reduce((s, p) => s + p.x, 0) / best.length, cy = best.reduce((s, p) => s + p.y, 0) / best.length;
  return { x: cx / w, y: Math.min(0.5, cy / h) };
}

/** Reads local File objects (images only) into library photos. */
export async function photosFromFiles(files) {
  const out = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      out.push(await photoFromUrl(url, file.name));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return out;
}

/** The photo graded with `gradeId`, made once and then reused. */
export function gradedCopy(photo, gradeId) {
  if (!photo.graded.has(gradeId)) photo.graded.set(gradeId, applyColorGrade(photo.canvas, gradeById(gradeId)));
  return photo.graded.get(gradeId);
}

/** Calls `onFiles(fileList)` when image files are dropped anywhere on `target`, highlighting it while dragging. */
export function enableDropZone(target, onFiles) {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  target.addEventListener('dragover', (e) => { stop(e); document.body.classList.add('dragging'); });
  target.addEventListener('dragleave', (e) => { if (e.target === target || !target.contains(e.relatedTarget)) document.body.classList.remove('dragging'); });
  target.addEventListener('drop', (e) => {
    stop(e);
    document.body.classList.remove('dragging');
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  });
}
