// The painted backdrop of a title tile: a banded sunset sky, a striped retro sun sinking into the sea, a low city
// skyline and two palm silhouettes, all drawn with canvas paths in the active grade's colours (no image files).

function drawPalmTree(ctx, baseX, baseY, height, lean, color) {
  const topX = baseX + lean * height, topY = baseY - height;
  const trunk = height * 0.055;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(baseX - trunk, baseY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.2 - trunk, baseY - height * 0.55, topX - trunk * 0.45, topY);
  ctx.lineTo(topX + trunk * 0.45, topY);
  ctx.quadraticCurveTo(baseX + lean * height * 0.2 + trunk, baseY - height * 0.55, baseX + trunk, baseY);
  ctx.closePath();
  ctx.fill();
  const fronds = [-2.9, -2.4, -1.95, -1.2, -0.75, -0.25, 0.25];
  for (const angle of fronds) {
    const len = height * (0.42 + 0.1 * Math.cos(angle * 3));
    const ex = topX + Math.cos(angle) * len, ey = topY + Math.sin(angle) * len * 0.55 + len * 0.28;
    const cx = topX + Math.cos(angle) * len * 0.55, cy = topY + Math.sin(angle) * len * 0.75 - len * 0.12;
    const w = height * 0.06;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy - w, ex, ey);
    ctx.quadraticCurveTo(cx, cy + w, topX, topY);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(topX, topY + height * 0.02, height * 0.035, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkyline(ctx, box, horizon, color) {
  ctx.fillStyle = color;
  let x = box.x;
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  ctx.beginPath();
  ctx.moveTo(box.x, horizon);
  while (x < box.x + box.w) {
    const bw = box.w * (0.018 + rand() * 0.035);
    const bh = box.h * (0.03 + rand() * rand() * 0.2);
    ctx.lineTo(x, horizon - bh);
    ctx.lineTo(x + bw, horizon - bh);
    x += bw;
  }
  ctx.lineTo(box.x + box.w, horizon);
  ctx.closePath();
  ctx.fill();
}

/** Paints the sunset backdrop filling `box` (a pixel rect); call it with the tile's clip already set. */
export function drawSunsetBackdrop(ctx, box, grade) {
  const { x, y, w, h } = box;
  const horizon = y + h * 0.7;
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, horizon - y + 1);

  // the striped sun
  const r = Math.min(w, h) * 0.42;
  const cx = x + w * 0.5, cy = horizon - r * 0.15;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r * 0.3);
  grade.sun.forEach((c, i) => sun.addColorStop(i / (grade.sun.length - 1), c));
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) {
    const band = cy - r * 0.05 + i * r * 0.13;
    ctx.fillRect(cx - r, band, r * 2, r * (0.025 + i * 0.012));
  }
  ctx.restore();

  drawSkyline(ctx, box, horizon, 'rgba(20, 4, 36, 0.85)');

  // the sea, with streaks of reflected sun
  const sea = ctx.createLinearGradient(0, horizon, 0, y + h);
  sea.addColorStop(0, grade.palette[1]);
  sea.addColorStop(1, grade.palette[0]);
  ctx.fillStyle = sea;
  ctx.fillRect(x, horizon, w, y + h - horizon);
  ctx.fillStyle = grade.sun[1];
  for (let i = 0; i < 9; i++) {
    const ly = horizon + (y + h - horizon) * (0.08 + i * 0.1);
    const lw = r * (1.4 - i * 0.12);
    ctx.globalAlpha = 0.55 - i * 0.05;
    ctx.fillRect(cx - lw / 2, ly, lw, Math.max(1, h * 0.008));
  }
  ctx.globalAlpha = 1;

  const palm = '#10021c';
  const tall = Math.min(h, w * 0.9);
  drawPalmTree(ctx, x + w * 0.05, y + h * 1.02, tall * 0.82, 0.22, palm);
  drawPalmTree(ctx, x + w * 0.13, y + h * 1.03, tall * 0.6, 0.38, palm);
  drawPalmTree(ctx, x + w * 0.95, y + h * 1.02, tall * 0.78, -0.24, palm);
}
