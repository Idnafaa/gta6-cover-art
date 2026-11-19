// Caption lettering: the big stacked title, every line stretched to the box's width in a heavy extra-condensed face,
// leaned forward, extruded into a deep 3D shadow, outlined thick and filled with the grade's sunset gradient; a
// brush-like italic tagline slapped across its foot; and an optional small spaced credit line.

export const LETTERING_STYLES = [
  { id: 'sunset-gradient', name: 'Sunset Gradient' },
  { id: 'clean-white', name: 'Clean White' },
  { id: 'neon-glow', name: 'Neon Glow' },
];

const CAPTION_FONT = '"Coast Display"';
const TAGLINE_FONT = '"Coast Serif"';
const INK = '#0b0214';
const TAGLINE_TILT = 0.06;

/** Splits a caption into 1 to 3 stacked lines: at newlines or " / " when given, else balanced by length. */
export function splitCaptionLines(caption) {
  const text = caption.trim().toUpperCase();
  if (!text) return [];
  const explicit = text.split(/\s*(?:\n|\s\/\s)\s*/).filter(Boolean);
  if (explicit.length > 1) return explicit.slice(0, 3);
  const words = text.split(/\s+/);
  if (words.length < 2 || text.length <= 9) return [text];
  let best = [text], bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) { bestDiff = diff; best = [a, b]; }
  }
  return best;
}

function measureAt(ctx, family, text, size, style = '') {
  ctx.font = `${style}${size}px ${family}`;
  return ctx.measureText(text).width;
}

/** Works out a font size per line so each fills the width, then shrinks them together to fit the height. */
function fitStackedLines(ctx, lines, maxWidth, maxHeight) {
  const CAP = 0.73, GAP = 0.1;
  let sizes = lines.map((line) => (100 * maxWidth) / Math.max(1, measureAt(ctx, CAPTION_FONT, line, 100)));
  // a single short word should not tower over the poster
  sizes = sizes.map((s) => Math.min(s, maxHeight / CAP));
  const total = sizes.reduce((sum, s) => sum + s * CAP, 0) + GAP * sizes.reduce((a, s) => a + s, 0) * ((lines.length - 1) / lines.length);
  if (total > maxHeight) sizes = sizes.map((s) => (s * maxHeight) / total);
  return { sizes, CAP, GAP };
}

function drawLetteredLine(ctx, text, cx, baseline, size, grade, styleId, lean) {
  ctx.save();
  ctx.translate(cx, baseline);
  ctx.transform(1, 0, -lean, 1, 0, 0);
  ctx.font = `${size}px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  const capH = size * 0.73;
  const depth = size * 0.075, steps = 12;
  // extrusion: dark slices stepping down-right, outlined at the back
  ctx.lineWidth = size * 0.13;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, depth, depth);
  ctx.fillStyle = styleId === 'neon-glow' ? grade.palette[1] : grade.titleShade;
  for (let k = steps; k >= 1; k--) ctx.fillText(text, (depth * k) / steps, (depth * k) / steps);
  // front face
  if (styleId === 'neon-glow') {
    ctx.shadowColor = grade.titleFill[3];
    ctx.shadowBlur = size * 0.25;
  }
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.shadowBlur = 0;
  let fill;
  if (styleId === 'clean-white') {
    fill = ctx.createLinearGradient(0, -capH, 0, 0);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(1, '#f1e6ff');
  } else {
    fill = ctx.createLinearGradient(0, -capH, 0, 0);
    grade.titleFill.forEach((c, i) => fill.addColorStop(i / (grade.titleFill.length - 1), c));
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  if (styleId === 'neon-glow') {
    ctx.lineWidth = size * 0.025;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeText(text, 0, 0);
  } else {
    // a glossy highlight across the upper third of the letters
    ctx.save();
    ctx.beginPath();
    ctx.rect(-1e5, -capH, 2e5, capH * 0.3);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** The tagline, a heavy italic serif slapped at a slight angle under the caption's last line, ending past its right edge. */
function taglineSize(ctx, text, maxW, maxSize) {
  return Math.min(maxSize, (100 * maxW) / Math.max(1, measureAt(ctx, TAGLINE_FONT, text, 100, 'italic ')));
}

function drawTagline(ctx, text, right, baseline, size, grade) {
  ctx.save();
  ctx.translate(right, baseline + size * 0.7);
  ctx.rotate(-TAGLINE_TILT);
  ctx.font = `italic ${size}px ${TAGLINE_FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, size * 0.05, size * 0.06);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grade.tagline;
  ctx.fillText(text, 0, 0);
  ctx.lineWidth = size * 0.03;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

function drawCreditLine(ctx, text, box, bottom, preferredSize) {
  const size = Math.max(10, preferredSize);
  ctx.save();
  ctx.font = `${size}px ${CAPTION_FONT}`;
  ctx.letterSpacing = `${size * 0.32}px`;
  let width = ctx.measureText(text).width;
  const scale = Math.min(1, (box.w * 0.9) / width);
  ctx.translate(box.x + box.w / 2, bottom);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28;
  ctx.strokeStyle = INK;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/**
 * Measures the caption block for a caption area of `areaH` pixels: line sizes, tagline size, credit size and the
 * total height the stack takes from the first cap line to the credit line's foot.
 */
function planCaptionBlock(ctx, box, lines, tagline, credit, areaH) {
  const fit = lines.length ? fitStackedLines(ctx, lines, box.w * 0.9, areaH) : { sizes: [], CAP: 0.73, GAP: 0.1 };
  const { sizes, CAP, GAP } = fit;
  const used = sizes.reduce((s, z) => s + z * CAP, 0) + sizes.slice(1).reduce((s, z) => s + z * GAP, 0);
  const lastSize = sizes.length ? sizes[sizes.length - 1] : areaH * 0.3;
  const lastWidth = lines.length ? measureAt(ctx, CAPTION_FONT, lines[lines.length - 1], lastSize) : box.w * 0.6;
  const tagSize = tagline ? taglineSize(ctx, tagline, Math.min(box.w * 0.8, lastWidth * 1.1), lastSize * 0.42) : 0;
  const creditSize = credit ? Math.max(9, Math.min(lastSize * 0.16, box.h * 0.07)) : 0;
  // the tagline leans by TAGLINE_TILT around its right end, so its left end drops by width * sin(tilt)
  const tagWidth = tagline ? measureAt(ctx, TAGLINE_FONT, tagline, tagSize, 'italic ') : 0;
  const taglineDrop = tagSize * 1.08 + tagWidth * Math.sin(TAGLINE_TILT);
  const taglineExtra = tagline ? lastSize * 0.04 + taglineDrop : lastSize * 0.1;
  const creditExtra = credit ? creditSize * 1.45 : 0;
  return { sizes, CAP, GAP, used, lastSize, lastWidth, tagSize, taglineDrop, creditSize, total: used + taglineExtra + creditExtra };
}

/**
 * Draws the caption block inside `box` (pixels): stacked caption, tagline and credit line, as many as are given.
 * `text` is { caption, tagline, credit }. The three are stacked top to bottom, shrunk together until they fit, and
 * centred in the box.
 */
export function drawCaptionBlock(ctx, box, text, grade, styleId) {
  const lines = splitCaptionLines(text.caption);
  const tagline = text.tagline.trim();
  const credit = text.credit.trim().toUpperCase();
  if (!lines.length && !tagline && !credit) return;
  let areaH = box.h * 0.8;
  let plan = planCaptionBlock(ctx, box, lines, tagline, credit, areaH);
  for (let i = 0; i < 4 && plan.total > box.h; i++) {
    areaH *= (box.h / plan.total) * 0.99;
    plan = planCaptionBlock(ctx, box, lines, tagline, credit, areaH);
  }
  const centre = box.x + box.w / 2;
  let y = box.y + (box.h - plan.total) / 2;
  lines.forEach((line, i) => {
    if (i) y += plan.sizes[i] * plan.GAP;
    y += plan.sizes[i] * plan.CAP;
    drawLetteredLine(ctx, line, centre - plan.sizes[i] * 0.03, y, plan.sizes[i], grade, styleId, 0.13);
  });
  let bottom = y + plan.lastSize * 0.1;
  if (tagline) {
    const right = Math.min(box.x + box.w, centre + plan.lastWidth / 2 + plan.lastSize * 0.12);
    const baseline = y + plan.lastSize * 0.04;
    drawTagline(ctx, tagline, right, baseline, plan.tagSize, grade);
    bottom = baseline + plan.taglineDrop;
  }
  if (credit) {
    const w = Math.min(box.w, Math.max(plan.lastWidth * 1.2, box.w * 0.5));
    drawCreditLine(ctx, credit, { ...box, x: centre - w / 2, w }, bottom + plan.creditSize * 1.25, plan.creditSize);
  }
}
