// Minimal static server for dist/, used by the evidence script. Resolves directories to index.html.
// With `{ pagesStyle404: true }` an unknown URL gets dist/404.html with status 404, the way GitHub Pages answers.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

export async function serve(root, port = 0, { pagesStyle404 = false } = {}) {
  const base = resolve(root);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      let file = normalize(join(base, decodeURIComponent(url.pathname)));
      if (!file.startsWith(base)) throw new Error('outside root');
      const info = await stat(file).catch(() => null);
      if (info?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      const page = pagesStyle404 ? await readFile(join(base, '404.html')).catch(() => null) : null;
      res.writeHead(404, { 'content-type': page ? types['.html'] : 'text/plain' });
      res.end(page ?? 'Not found');
    }
  });
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  const { port: actual } = server.address();
  return { url: `http://127.0.0.1:${actual}`, close: () => new Promise((ok) => server.close(ok)) };
}
