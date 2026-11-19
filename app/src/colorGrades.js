// Colour-grade presets and the pixel work that turns an ordinary photo into a sunset-poster illustration: contrast and
// saturation, a gradient map through the preset's palette (optionally posterized into flat bands), and dark ink lines
// traced from the photo's edges. The poster renderer adds the halftone screen, the glow and the grain on top.

export const COLOR_GRADES = [
  {
    id: 'vice-sunset', name: 'Sunset Strip',
    palette: ['#14062e', '#5b1a6b', '#d92f6e', '#ff8a3d', '#ffe39a'], mapStrength: 0.68, contrast: 1.34, saturation: 1.3,
    posterLevels: 0, ink: 0.35, halftone: 0.16,
    sky: ['#1c0838', '#6a1b7a', '#e2336f', '#ff8f45', '#ffd86b'], sun: ['#fff1a8', '#ff9a3c', '#ff3d7f'],
    titleFill: ['#fffbe0', '#ffd25e', '#ff7a3a', '#ff2e7e'], titleShade: '#2a0638', tagline: '#ff4fa8',
    glow: ['rgba(255, 70, 150, 0.2)', 'rgba(255, 160, 60, 0.14)'],
  },
  {
    id: 'neon-night', name: 'Neon Night',
    palette: ['#040221', '#1d1466', '#7d1fa8', '#ff2fc9', '#6af3ff'], mapStrength: 0.7, contrast: 1.35, saturation: 1.3,
    posterLevels: 0, ink: 0.42, halftone: 0.2,
    sky: ['#05021c', '#1d0f5c', '#6b17a3', '#e626b8', '#ff7ad9'], sun: ['#ffe4ff', '#ff4fd8', '#7b2cff'],
    titleFill: ['#ffffff', '#9ff8ff', '#36d6ff', '#ff3ccf'], titleShade: '#12052e', tagline: '#4df3ff',
    glow: ['rgba(255, 40, 200, 0.3)', 'rgba(60, 220, 255, 0.22)'],
  },
  {
    id: 'ocean-drive', name: 'Ocean Drive',
    palette: ['#031a26', '#0a5a6c', '#27b5b0', '#ff8f66', '#ffeccb'], mapStrength: 0.62, contrast: 1.3, saturation: 1.28,
    posterLevels: 0, ink: 0.3, halftone: 0.14,
    sky: ['#062b3a', '#0e7c86', '#46d1c1', '#ffb07a', '#ffe7b8'], sun: ['#fff7d6', '#ffb36b', '#ff6f61'],
    titleFill: ['#ffffff', '#c8fff6', '#ffcf8a', '#ff7f6a'], titleShade: '#032029', tagline: '#ff8a6b',
    glow: ['rgba(0, 210, 200, 0.25)', 'rgba(255, 140, 90, 0.25)'],
  },
  {
    id: 'golden-hour', name: 'Golden Hour',
    palette: ['#1f0610', '#6a1a1c', '#d2522a', '#ffae3d', '#fff0b8'], mapStrength: 0.7, contrast: 1.36, saturation: 1.3,
    posterLevels: 0, ink: 0.34, halftone: 0.15,
    sky: ['#2a0b12', '#8a2a1a', '#e2612a', '#ffaa3f', '#ffe9a1'], sun: ['#fffbe0', '#ffc94d', '#ff6a2b'],
    titleFill: ['#fffdf0', '#ffe27a', '#ffa23a', '#e4492a'], titleShade: '#2a0c06', tagline: '#ffd166',
    glow: ['rgba(255, 150, 40, 0.3)', 'rgba(255, 80, 60, 0.2)'],
  },
  {
    id: 'comic-ink', name: 'Comic Ink',
    palette: ['#120424', '#4e1660', '#e0306b', '#ff9b45', '#fff0b0'], mapStrength: 0.78, contrast: 1.4, saturation: 1.3,
    posterLevels: 5, ink: 0.85, halftone: 0.3,
    sky: ['#170530', '#5d167a', '#ea3a6e', '#ff9a45', '#ffe07a'], sun: ['#fff6b8', '#ffa23c', '#ff3b78'],
    titleFill: ['#ffffff', '#fff07a', '#ffb02e', '#ff3b78'], titleShade: '#160426', tagline: '#ffe05a',
    glow: ['rgba(255, 60, 140, 0.25)', 'rgba(255, 190, 60, 0.2)'],
  },
];

export function gradeById(id) {
  return COLOR_GRADES.find((g) => g.id === id) ?? COLOR_GRADES[0];
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A 256-entry lookup of the palette, dark to light, as RGB triples. */
function buildGradientMap(palette) {
  const stops = palette.map(hexToRgb);
  const table = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) table[i * 3 + c] = stops[k][c] + (stops[k + 1][c] - stops[k][c]) * f;
  }
  return table;
}

/** Luminance of every pixel, softened by a 3 x 3 box blur so the ink lines follow shapes and not noise. */
function blurredLuminance(data, w, h) {
  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) lum[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          s += lum[yy * w + xx]; n++;
        }
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

/** Returns a new canvas holding `source` (a canvas) graded with `grade`. */
export function applyColorGrade(source, grade) {
  const w = source.width, h = source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const map = buildGradientMap(grade.palette);
  const lum = grade.ink > 0 ? blurredLuminance(d, w, h) : null;
  const levels = grade.posterLevels;
  const { contrast, saturation, mapStrength: s, ink } = grade;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, p = i * 4;
      let r = (d[p] - 128) * contrast + 128, g = (d[p + 1] - 128) * contrast + 128, b = (d[p + 2] - 128) * contrast + 128;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      r = l + (r - l) * saturation; g = l + (g - l) * saturation; b = l + (b - l) * saturation;
      let li = Math.max(0, Math.min(255, l));
      if (levels) li = Math.round((li / 255) * (levels - 1)) * (255 / (levels - 1));
      const m = (li | 0) * 3;
      r = r * (1 - s) + map[m] * s; g = g * (1 - s) + map[m + 1] * s; b = b * (1 - s) + map[m + 2] * s;
      if (lum && x > 0 && y > 0 && x < w - 1 && y < h - 1) {
        const gx = lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1];
        const gy = lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1];
        const edge = Math.min(1, Math.max(0, (Math.hypot(gx, gy) - 70) / 160));
        const k = 1 - ink * edge;
        r *= k; g *= k; b *= k;
      }
      d[p] = r; d[p + 1] = g; d[p + 2] = b;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
