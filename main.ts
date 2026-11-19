// Hands in Neon Coast Poster Studio (Node 22+, standard library only).
//
// The entry is the static web app in app/ (index.html, ES modules under app/src, OFL fonts under app/fonts, two
// sample photos) plus the screenshots in screenshots/. This program copies both folders into the output directory
// and writes dossier.json there with the make.fun library in vendor/, the summary the judge reads.
//
// The grader's output directory is /output; set MAKEFUN_OUTPUT_DIR to use another one locally:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// To try the app itself: node serve.ts, then open http://localhost:8080

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies one folder of the repository into the output directory (an absent folder becomes an empty one). */
function copyFolder(name: string): void {
  const from = join(repoDir, name);
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('app');
copyFolder('screenshots');

// The limits passed to buildDossier are the scorer's own: a 160 KiB source text, at most 4 screenshots of 256 KiB
// each, and app/ kept to 993 entries, 48 MiB and 1000-byte paths so /output stays under its 1000-entry cap.
const dossierLimits = {
  text_max_bytes: 160 * 1024,
  screenshots: { max: 4, max_bytes: 256 * 1024 },
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  app_path_max_bytes: 1000,
};
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, dossierLimits));
console.log(`Neon Coast Poster Studio written to ${outputDir} (app/, screenshots/, dossier.json)`);
