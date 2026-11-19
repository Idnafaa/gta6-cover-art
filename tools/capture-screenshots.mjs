// Makes the four screenshots in screenshots/ from the running app (node serve.ts first), by driving it in headless
// Chromium the way a person would: load the sample photos through the file picker, pick layout, grade and size,
// type the caption, click Export PNG, then scale the exported PNG down (nothing else) and save it as a JPEG under
// the 256 KiB screenshot cap. The editor shot is the page itself with the photos loaded and a panel selected.
//
//   node serve.ts --port 8080 &
//   npm i --prefix /tmp/pw playwright-core   (any copy of playwright-core and a Chromium build)
//   PLAYWRIGHT_CORE=/tmp/pw/node_modules/playwright-core/index.mjs CHROMIUM=/path/to/chrome node tools/capture-screenshots.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const plan = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const MAX_BYTES = 256 * 1024;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });

async function openStudioWithSamples() {
  await page.goto(plan.url);
  await page.waitForFunction(() => window.__studioReady);
  await page.setInputFiles('#photo-input', plan.photos.map((p) => join(repoRoot, 'app', p)));
  await page.waitForFunction((n) => document.querySelectorAll('#photo-strip button').length === n, plan.photos.length);
}

async function applySettings(shot) {
  await page.click(`#size-list button[data-id="${shot.size}"]`);
  await page.click(`#template-list button[data-id="${shot.template}"]`);
  await page.click(`#grade-list button[data-id="${shot.grade}"]`);
  await page.click(`#lettering-list button[data-id="${shot.lettering ?? 'sunset-gradient'}"]`);
  await page.fill('#caption-input', shot.caption);
  await page.fill('#tagline-input', shot.tagline);
  await page.fill('#credit-input', shot.credit);
}

/** Scales a PNG (bytes) to fit `box` inside the page's own canvas and JPEG-encodes it at the best quality that fits. */
async function scaleToJpeg(png, box) {
  return page.evaluate(async ({ b64, box, maxBytes }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const k = Math.min(box.w / img.width, box.h / img.height, 1);
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (let q = 0.92; q > 0.3; q -= 0.04) {
      const url = c.toDataURL('image/jpeg', q);
      if ((url.length - 23) * 0.75 <= maxBytes) return { b64: url.slice(23), w: c.width, h: c.height, q };
    }
    throw new Error('could not fit the cap');
  }, { b64: png.toString('base64'), box, maxBytes: MAX_BYTES });
}

mkdirSync(join(repoRoot, 'screenshots'), { recursive: true });
await openStudioWithSamples();
for (const shot of plan.shots) {
  await applySettings(shot);
  let out;
  if (shot.kind === 'export') {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#export-png')]);
    const png = readFileSync(await download.path());
    out = await scaleToJpeg(png, shot.fit);
    console.log(`${shot.name}: exported ${download.suggestedFilename()} -> ${out.w}x${out.h} q${out.q.toFixed(2)}`);
  } else {
    const box = await page.locator('#poster-preview').boundingBox();
    const [x, y] = shot.selectPanelAt;
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * x - 30, box.y + box.height * y + 8, { steps: 6 });
    await page.mouse.up();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    const png = await page.screenshot();
    out = await scaleToJpeg(png, shot.fit);
    console.log(`${shot.name}: editor ${out.w}x${out.h} q${out.q.toFixed(2)}`);
  }
  writeFileSync(join(repoRoot, 'screenshots', shot.name), Buffer.from(out.b64, 'base64'));
}
await browser.close();
if (problems.length) { console.error('page problems:', problems); process.exit(1); }
