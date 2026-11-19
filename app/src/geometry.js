// Small plane-geometry helpers for the poster grid: slanted divider lines, the quad where four of them cross,
// shrinking a panel inward to open the thick dark gutters, hit-testing a pointer and a panel's bounding box.

/** A "vertical" divider: x as a fraction of the width at the top edge (top) and at the bottom edge (bottom). */
export const vline = (top, bottom = top) => ({ kind: 'v', top, bottom });
/** A "horizontal" divider: y as a fraction of the height at the left edge (left) and at the right edge (right). */
export const hline = (left, right = left) => ({ kind: 'h', left, right });

/** Where a vertical and a horizontal divider cross, in unit coordinates (0..1 on both axes). */
export function crossDividers(v, h) {
  // x = a + b*y  and  y = c + d*x
  const a = v.top, b = v.bottom - v.top;
  const c = h.left, d = h.right - h.left;
  const x = (a + b * c) / (1 - b * d);
  return { x, y: c + d * x };
}

/** The four corners (clockwise from top-left) of the cell bounded by left/right verticals and top/bottom horizontals. */
export function cellCorners(left, right, top, bottom) {
  return [crossDividers(left, top), crossDividers(right, top), crossDividers(right, bottom), crossDividers(left, bottom)];
}

/** Scales unit points to pixels. */
export function toPixels(points, width, height) {
  return points.map((p) => ({ x: p.x * width, y: p.y * height }));
}

function signedArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

/** Moves every edge of a convex polygon inward by `distance` pixels and returns the smaller polygon. */
export function insetConvexPolygon(poly, distance) {
  const n = poly.length;
  const orientation = signedArea(poly) > 0 ? 1 : -1;
  const shifted = [];
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const dx = q.x - p.x, dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    // inward normal for this winding
    const nx = (-dy / len) * orientation, ny = (dx / len) * orientation;
    shifted.push({ p: { x: p.x + nx * distance, y: p.y + ny * distance }, d: { x: dx, y: dy } });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const e1 = shifted[(i - 1 + n) % n], e2 = shifted[i];
    const denom = e1.d.x * e2.d.y - e1.d.y * e2.d.x;
    if (Math.abs(denom) < 1e-9) { out.push(e2.p); continue; }
    const t = ((e2.p.x - e1.p.x) * e2.d.y - (e2.p.y - e1.p.y) * e2.d.x) / denom;
    out.push({ x: e1.p.x + e1.d.x * t, y: e1.p.y + e1.d.y * t });
  }
  return out;
}

/** True when (x, y) lies inside the polygon (even-odd rule). */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The axis-aligned box around a polygon. */
export function boundingBox(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Traces a polygon as the current path of a 2D context. */
export function tracePolygon(ctx, poly) {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}
