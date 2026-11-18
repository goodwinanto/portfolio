/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * Serves dist/ with the headers from vercel.json (CSP included) and the 404 page, so local
 * checks and Playwright run against the same policy as production. Usage: node scripts/serve.mjs [port]
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.argv[2]) || 4173;
const COMPRESSIBLE = /\.(html|js|css|txt|xml|json|svg)$/;
const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
};
const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
// shortcut: only the "/(.*)" and "/prefix/(.*)" source shapes used in vercel.json are supported
const rules = vercel.headers.map((r) => ({
    re: new RegExp(`^${r.source.replace('(.*)', '.*')}$`),
    headers: r.headers,
}));

createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    for (const r of rules) if (r.re.test(url)) r.headers.forEach((h) => res.setHeader(h.key, h.value));
    const file = path.join(DIST, url.endsWith('/') ? `${url}index.html` : url);
    if (!file.startsWith(DIST)) return res.writeHead(400).end();
    try {
        let body = await readFile(file);
        const headers = { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' };
        // compress like Vercel does, so local Lighthouse numbers are comparable
        if (COMPRESSIBLE.test(file) && /gzip/.test(req.headers['accept-encoding'] ?? '')) {
            body = gzipSync(body);
            headers['Content-Encoding'] = 'gzip';
        }
        res.writeHead(200, headers).end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(await readFile(path.join(DIST, '404.html')));
    }
}).listen(PORT, () => console.log(`Serving dist/ with production headers on http://localhost:${PORT}/`));
