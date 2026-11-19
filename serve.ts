// Local static server for Neon Coast Poster Studio (Node 22+, standard library only): serves app/ so the studio
// can be opened at http://localhost:8080 with no build step. `node serve.ts --port 9000` picks another port.
// Development use only: it answers on 127.0.0.1, serves files inside app/ and nothing else.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function chosenPort(argv: string[]): number {
  const flag = argv.indexOf('--port');
  const value = flag >= 0 ? Number(argv[flag + 1]) : 8080;
  return Number.isInteger(value) && value > 0 && value < 65536 ? value : 8080;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/** Maps a request path to a regular file inside app/, or null when there is none (or it would leave app/). */
function fileForRequest(rawUrl: string | undefined): string | null {
  let path: string;
  try {
    path = decodeURIComponent(new URL(rawUrl ?? '/', 'http://localhost').pathname);
  } catch {
    return null;
  }
  if (path.endsWith('/')) path += 'index.html';
  const file = resolve(join(appRoot, normalize(path)));
  if (!file.startsWith(appRoot + sep)) return null;
  try {
    return statSync(file).isFile() ? file : null;
  } catch {
    return null;
  }
}

const port = chosenPort(process.argv.slice(2));
createServer((request, response) => {
  const file = fileForRequest(request.url);
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': statSync(file).size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Neon Coast Poster Studio: http://localhost:${port}`));
