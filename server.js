import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { handleAI } from './ai.js';
const root = resolve(process.env.SERVE_DIST ? 'dist' : '.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) {
      const action = pathname.slice(5);
      if ((action === 'status' && req.method !== 'GET') || (action !== 'status' && req.method !== 'POST')) { res.writeHead(405); return res.end(); }
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 100000) { res.writeHead(413); return res.end(); } }
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { res.writeHead(400); return res.end('Invalid JSON'); }
      const result = await handleAI(action, body, req.headers.authorization || '');
      res.writeHead(result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(result.body));
    }
    const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + sep) || !Object.hasOwn(types, extname(file))) {
      res.writeHead(404); return res.end('Not found');
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Tsuzuri is running on port ' + (process.env.PORT || 3000)));
