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
const BANNER =
    '/*! © 2026 Goodwin Anto. All rights reserved. Unauthorised copying or reuse is prohibited. Bundled third-party code keeps its own licence. */';
const HTML_PAGES = ['index.html', '404.html'];
const ICON_DIR = 'node_modules/@phosphor-icons/core/assets/regular';

/** Self-hosted font, copied under a versioned name because /assets is cached for a year. */
const pkgVersion = async (name) =>
    JSON.parse(await readFile(path.join(ROOT, 'node_modules', name, 'package.json'), 'utf8')).version;
const GEIST = {
    from: 'node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2',
    to: `assets/fonts/geist-variable-${await pkgVersion('geist')}.woff2`,
};

/**
 * esbuild plugin for `@import 'virtual:fonts'`: the Geist @font-face plus a CSS mask icon for each
 * Phosphor icon class the pages actually use (`<i class="ph ph-name">`). Icons are inline SVG data
 * URIs tinted with currentColor, so there is no 145 KB icon font and no third-party request.
 * @returns {import('esbuild').Plugin}
 */
function fontsPlugin() {
    return {
        name: 'fonts',
        setup(build) {
            build.onResolve({ filter: /^virtual:fonts$/ }, () => ({ path: 'fonts', namespace: 'virtual' }));
            build.onLoad({ filter: /.*/, namespace: 'virtual' }, async () => {
                const files = [...HTML_PAGES.map((p) => `src/${p}`), ...(await listFiles('src/js'))];
                const sources = await Promise.all(files.map((f) => readFile(path.join(ROOT, f), 'utf8')));
                const used = [...new Set(sources.join('\n').match(/\bph-[a-z0-9-]+/g))].sort();
                const icons = await Promise.all(
                    used.map(async (name) => {
                        const svg = await readFile(path.join(ROOT, ICON_DIR, `${name.slice(3)}.svg`), 'utf8').catch(
                            () => {
                                throw new Error(`Unknown Phosphor icon "${name}"`);
                            },
                        );
                        return `.${name}{--icon:url("data:image/svg+xml,${encodeURIComponent(svg.trim())}")}`;
                    }),
                );
                return {
                    loader: 'css',
                    contents: [
                        `@font-face{font-family:"Geist";src:url("/${GEIST.to}") format("woff2");font-weight:100 900;font-style:normal;font-display:swap}`,
                        '.ph{display:inline-block;width:1em;height:1em;vertical-align:-0.125em;flex-shrink:0;background:currentColor;mask:var(--icon) center/contain no-repeat}',
                        ...icons,
                    ].join('\n'),
                };
            });
        },
    };
}

/** @returns {Promise<string[]>} every file under dir, relative to the repo root */
async function listFiles(dir) {
    const entries = await readdir(path.join(ROOT, dir), { recursive: true, withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => path.relative(ROOT, path.join(e.parentPath, e.name)));
}

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
    external: ['/assets/*'],
    plugins: [fontsPlugin()],
};

/** Copies public/ and the HTML pages into dist/. */
async function copyStatic() {
    await cp(path.join(ROOT, 'public'), DIST, { recursive: true });
    await cp(path.join(ROOT, GEIST.from), path.join(DIST, GEIST.to));
    await writeThirdPartyLicences();
    await Promise.all(HTML_PAGES.map((p) => cp(path.join(ROOT, 'src', p), path.join(DIST, p))));
}

/** Ships the licence text of every runtime dependency, as MIT and OFL require. */
async function writeThirdPartyLicences() {
    const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    const parts = await Promise.all(
        Object.keys(pkg.dependencies).map(async (name) => {
            const dir = path.join(ROOT, 'node_modules', name);
            const file = (await readdir(dir)).find((f) => /^licen[cs]e/i.test(f));
            return `== ${name}@${await pkgVersion(name)} ==\n\n${await readFile(path.join(dir, file), 'utf8')}`;
        }),
    );
    await writeFile(path.join(DIST, 'third-party-licenses.txt'), parts.join('\n\n'));
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
