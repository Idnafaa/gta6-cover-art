// PNG export: draws the poster again at the chosen post size on an offscreen canvas and saves it as a PNG file named
// after the caption and the size. Nothing leaves the machine: the file is handed to the browser's download.
import { renderPoster } from './posterRenderer.js';

export const POST_SIZES = [
  { id: 'landscape', name: '1920 x 1080', hint: 'Landscape / X / YouTube', width: 1920, height: 1080 },
  { id: 'portrait', name: '1080 x 1350', hint: 'Portrait / Instagram feed', width: 1080, height: 1350 },
  { id: 'square', name: '1080 x 1080', hint: 'Square post', width: 1080, height: 1080 },
];

/** A file name like `sunset-heist-1920x1080.png`. */
export function exportFileName(caption, size) {
  const slug = caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'poster';
  return `${slug}-${size.width}x${size.height}.png`;
}

/** Renders the poster at `size` and resolves to its PNG blob. */
export function renderPosterBlob(state, size, gradedPhoto, photoCount) {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  renderPoster(canvas.getContext('2d'), size.width, size.height, state, gradedPhoto, photoCount);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

/** Renders and downloads one PNG; resolves to the file name. */
export async function downloadPosterPng(state, size, gradedPhoto, photoCount) {
  const blob = await renderPosterBlob(state, size, gradedPhoto, photoCount);
  const name = exportFileName(state.caption, size);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  return name;
}
