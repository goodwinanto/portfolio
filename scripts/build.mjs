/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * Build: bundles and minifies JS and CSS into dist/, copies HTML and static files,
 * then checks that every inline <script> hash is allowed by the CSP in vercel.json.
 * `--dev` watches, serves dist/ and keeps inline source maps (never shipped).
 */
import * as esbuild from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEV = process.argv.includes('--dev');
const DEV_PORT = 5173;
const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BANNER = '/*! © 2026 Goodwin Anto. All rights reserved. Unauthorised copying or reuse is prohibited. */';
const HTML_PAGES = ['index.html', '404.html'];

/** @type {import('esbuild').BuildOptions} */
const options = {
    absWorkingDir: ROOT,
    entryPoints: { 'js/main': 'src/js/main.js', 'css/main': 'src/css/main.css' },
    outdir: DIST,
    bundle: true,
    format: 'esm',
    splitting: true, // the 3D scene is a lazy chunk
    chunkNames: 'js/chunks/[name]-[hash]',
    target: ['es2022', 'chrome111', 'firefox115', 'safari16'],
    minify: !DEV,
    sourcemap: DEV ? 'inline' : false,
    legalComments: 'inline',
    banner: { js: BANNER, css: BANNER },
    logLevel: 'info',
};

/** Copies public/ and the HTML pages into dist/. */
async function copyStatic() {
    await cp(path.join(ROOT, 'public'), DIST, { recursive: true });
    await Promise.all(HTML_PAGES.map((p) => cp(path.join(ROOT, 'src', p), path.join(DIST, p))));
}

/** Fails the build if an inline script in dist/*.html is missing from the CSP script-src. */
async function checkCsp() {
    const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
    const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
    const pages = (await readdir(DIST)).filter((f) => f.endsWith('.html'));
    for (const page of pages) {
        const html = await readFile(path.join(DIST, page), 'utf8');
        for (const [, body] of html.matchAll(
            /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g,
        )) {
            const hash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
            if (!csp.includes(hash)) throw new Error(`CSP is missing ${hash} for an inline script in ${page}`);
        }
    }
    console.log(`CSP check passed for ${pages.length} page(s)`);
}

await rm(DIST, { recursive: true, force: true });
if (DEV) {
    const ctx = await esbuild.context(options);
    await copyStatic(); // shortcut: HTML/public are copied once; restart dev after editing them
    await ctx.watch();
    const { port } = await ctx.serve({ servedir: DIST, port: DEV_PORT });
    console.log(`Dev server: http://localhost:${port}/`);
} else {
    await esbuild.build(options);
    await copyStatic();
    await checkCsp();
    await writeFile(path.join(DIST, '.build'), new Date().toISOString());
}
