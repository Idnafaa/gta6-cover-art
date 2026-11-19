// Poster layout templates. Each one cuts the poster into slanted panels with dark gutters, the collage look of a
// crime-epic poster, and places the caption either in its own sunset title tile or over the panels. Every template
// has a wide variant (1920 x 1080) and a tall one (1080 x 1080 and 1080 x 1350), all in unit coordinates.
import { vline, hline, cellCorners } from './geometry.js';

const LEFT = vline(0), RIGHT = vline(1), TOP = hline(0), BOTTOM = hline(1);
const photoCell = (l, r, t, b) => ({ role: 'photo', corners: cellCorners(l, r, t, b) });
const titleCell = (l, r, t, b) => ({ role: 'title', corners: cellCorners(l, r, t, b) });

function heistGridWide() {
  const a = vline(0.27, 0.24), b = vline(0.505, 0.535), c = vline(0.76, 0.73);
  const leftSplit = hline(0.56, 0.5), midTop = hline(0.33, 0.29), midBottom = hline(0.74, 0.78), rightSplit = hline(0.62, 0.56);
  return {
    cells: [
      photoCell(LEFT, a, TOP, leftSplit),
      photoCell(c, RIGHT, TOP, rightSplit),
      photoCell(a, b, TOP, midTop),
      photoCell(b, c, TOP, midTop),
      photoCell(a, b, midBottom, BOTTOM),
      photoCell(b, c, midBottom, BOTTOM),
      photoCell(LEFT, a, leftSplit, BOTTOM),
      photoCell(c, RIGHT, rightSplit, BOTTOM),
      titleCell(a, c, midTop, midBottom),
    ],
  };
}

function heistGridTall() {
  const rowA = hline(0.27, 0.23), rowB = hline(0.47, 0.51), rowC = hline(0.8, 0.77);
  const topSplit = vline(0.58, 0.52), midL = vline(0.34, 0.3), midR = vline(0.67, 0.7);
  const titleEdge = vline(0.72, 0.7), bottomSplit = vline(0.45, 0.5);
  return {
    cells: [
      photoCell(LEFT, topSplit, TOP, rowA),
      photoCell(topSplit, RIGHT, TOP, rowA),
      photoCell(LEFT, midL, rowA, rowB),
      photoCell(midL, midR, rowA, rowB),
      photoCell(midR, RIGHT, rowA, rowB),
      photoCell(titleEdge, RIGHT, rowB, rowC),
      photoCell(LEFT, bottomSplit, rowC, BOTTOM),
      photoCell(bottomSplit, RIGHT, rowC, BOTTOM),
      titleCell(LEFT, titleEdge, rowB, rowC),
    ],
  };
}

function mosaicNine() {
  const v1 = vline(0.29, 0.27), v2 = vline(0.71, 0.73), h1 = hline(0.3, 0.27), h2 = hline(0.7, 0.73);
  const cols = [LEFT, v1, v2, RIGHT], rows = [TOP, h1, h2, BOTTOM];
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      cells.push(photoCell(cols[c], cols[c + 1], rows[r], rows[r + 1]));
    }
  }
  cells.push(titleCell(v1, v2, h1, h2));
  return { cells };
}

function triptychTiltWide() {
  const a = vline(0.36, 0.3), b = vline(0.7, 0.64);
  return {
    cells: [photoCell(a, b, TOP, BOTTOM), photoCell(LEFT, a, TOP, BOTTOM), photoCell(b, RIGHT, TOP, BOTTOM)],
    captionBox: { x: 0.08, y: 0.5, w: 0.84, h: 0.46 },
  };
}

function triptychTiltTall() {
  const a = hline(0.36, 0.3), b = hline(0.68, 0.62);
  return {
    cells: [photoCell(LEFT, RIGHT, TOP, a), photoCell(LEFT, RIGHT, a, b), photoCell(LEFT, RIGHT, b, BOTTOM)],
    captionBox: { x: 0.05, y: 0.63, w: 0.9, h: 0.34 },
  };
}

function heroStripWide() {
  const heroEdge = vline(0.66, 0.62), s1 = hline(0.34, 0.32), s2 = hline(0.67, 0.69);
  return {
    cells: [
      photoCell(LEFT, heroEdge, TOP, BOTTOM),
      photoCell(heroEdge, RIGHT, TOP, s1),
      photoCell(heroEdge, RIGHT, s1, s2),
      photoCell(heroEdge, RIGHT, s2, BOTTOM),
    ],
    captionBox: { x: 0.02, y: 0.44, w: 0.6, h: 0.53 },
  };
}

function heroStripTall() {
  const heroEdge = hline(0.66, 0.62), s1 = vline(0.34, 0.31), s2 = vline(0.67, 0.7);
  return {
    cells: [
      photoCell(LEFT, RIGHT, TOP, heroEdge),
      photoCell(LEFT, s1, heroEdge, BOTTOM),
      photoCell(s1, s2, heroEdge, BOTTOM),
      photoCell(s2, RIGHT, heroEdge, BOTTOM),
    ],
    captionBox: { x: 0.04, y: 0.33, w: 0.92, h: 0.31 },
  };
}

function diagonalDuoWide() {
  const cut = vline(0.6, 0.4);
  return {
    cells: [photoCell(LEFT, cut, TOP, BOTTOM), photoCell(cut, RIGHT, TOP, BOTTOM)],
    captionBox: { x: 0.08, y: 0.24, w: 0.84, h: 0.54 },
  };
}

function diagonalDuoTall() {
  const cut = hline(0.6, 0.4);
  return {
    cells: [photoCell(LEFT, RIGHT, TOP, cut), photoCell(LEFT, RIGHT, cut, BOTTOM)],
    captionBox: { x: 0.05, y: 0.3, w: 0.9, h: 0.38 },
  };
}

/** Every template, in the order the editor lists them. */
export const POSTER_TEMPLATES = [
  { id: 'heist-grid', name: 'Heist Grid', hint: '8 panels + title tile', wide: heistGridWide, tall: heistGridTall },
  { id: 'mosaic-nine', name: 'Mosaic Nine', hint: '8 panels around the title', wide: mosaicNine, tall: mosaicNine },
  { id: 'hero-strip', name: 'Hero + Strip', hint: '1 hero, 3 side shots', wide: heroStripWide, tall: heroStripTall },
  { id: 'triptych-tilt', name: 'Triptych Tilt', hint: '3 slanted panels', wide: triptychTiltWide, tall: triptychTiltTall },
  { id: 'diagonal-duo', name: 'Diagonal Duo', hint: '2 panels, one cut', wide: diagonalDuoWide, tall: diagonalDuoTall },
];

/** The cells of `templateId` for a poster of the given pixel size. */
export function layoutForSize(templateId, width, height) {
  const template = POSTER_TEMPLATES.find((t) => t.id === templateId) ?? POSTER_TEMPLATES[0];
  const built = (width / height > 1.2 ? template.wide : template.tall)();
  return { cells: built.cells, captionBox: built.captionBox ?? null };
}

/** How many photo panels the template has at this size. */
export function photoPanelCount(templateId, width, height) {
  return layoutForSize(templateId, width, height).cells.filter((c) => c.role === 'photo').length;
}
