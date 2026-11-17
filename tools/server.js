// Petit serveur statique local : les modules ES ne se chargent pas depuis file://.
// Usage : npm start  (port modifiable avec la variable d'environnement PORT)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const filePath = normalize(join(ROOT, relative));
  if (!filePath.startsWith(normalize(ROOT + sep))) {
    res.writeHead(403).end('Interdit');
    return;
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(filePath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
});

server.listen(PORT, () => {
  console.log(`Jeu disponible sur http://localhost:${PORT}`);
});
