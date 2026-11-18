# Portfolio: Goodwin Anto

Personal portfolio of Goodwin Anto, AI Engineer & Software Developer.
Live at [portfolio-goodwinanto.vercel.app](https://portfolio-goodwinanto.vercel.app).

> **Do not copy.** © 2026 Goodwin Anto. All rights reserved. This code, the "Latent Field" 3D scene,
> its shaders, the design and the copy are **not** open source. You may read it, but you may not
> copy, reuse or adapt any part of it. See [LICENSE](LICENSE). Builds carry a unique signature, so
> copies can be identified.

## Setup

Requires Node 20+ (and Google Chrome for the tests).

```bash
npm ci
npm run dev      # watch + serve dist/ on http://localhost:5173 (inline source maps, dev only)
npm run build    # minified bundle in dist/, no source maps, CSP hash check
npm run preview  # serve dist/ with the production headers from vercel.json (CSP included)
npm run lint     # ESLint + Prettier check
npm test         # Playwright smoke tests against the production build
```

## Structure

```
src/
  index.html, 404.html     pages (copied as-is; the inline <head> script hash is pinned in the CSP)
  css/                     tokens (light-dark theme), base, chrome, sections, depth (3D + CSS fallbacks), motion, responsive, 404
  js/
    main.js                entry: wires every module, lazy-loads 3D after load + idle
    config.js              named constants (breakpoints, timings, signature, events, WebGL colours)
    env.js                 media queries, 3D eligibility, current theme
    loop.js                the single requestAnimationFrame loop (scroll → render → styles)
    scroll.js              Lenis smooth scroll (desktop mice only, lazy chunk) + accessible anchor links
    cursor.js              custom cursor; reticle + label over 3D elements
    form.js                contact form: inline validation, Web3Forms POST, email fallback
    ui/                    theme, nav, reveal, parallax, magnetic, filter, sound, preloader, easter egg, view transitions
    3d/                    renderer (one canvas, one WebGL context, scissored views), shaders (GLSL),
                           geometry (procedural shapes, signature-seeded), views (per-view motion), gl, math
public/                    static files copied to dist/ (assets, robots.txt, sitemap.xml, .well-known)
scripts/build.mjs          esbuild bundle + icon/font generation + CSP check
scripts/serve.mjs          local server with production headers
tests/                     Playwright smoke tests
```

### How the 3D works

One fixed, transparent `<canvas>` sits behind the page with a single WebGL context. Every element
with `data-gl="<shape>"` is a view: each frame the renderer draws that shape into the element's box
using a scissored viewport, as one task in the shared loop. Shapes: `field` (contour shader),
`graph`, `orbit`, `stack`, `docs`, `migrate`, `chat`, `form`, `scaffold`, `path`, `helix`, `lattice`,
`ring`. Each shape assembles from scattered points the first time it scrolls into view.

The scene only loads on screens ≥ 768px with motion allowed, ≥ 4 CPU cores, a hardware GPU and a
fast connection. Everywhere else (phones, reduced motion, no WebGL, context loss, chunk load
failure) the CSS-depth versions inside each view stay visible, with no console errors.

### Icons and fonts

Icons are Phosphor (regular). Use `<i class="ph ph-name" aria-hidden="true"></i>` with any name
from `@phosphor-icons/core`; the build generates CSS for the names it finds and fails on unknown ones.
Geist is self-hosted; Clash Display is loaded from Fontshare.

### Changing the inline head script

Its SHA-256 is pinned in the CSP in `vercel.json`. `npm run build` fails and prints the new hash if
they don't match; update `vercel.json` with it.

### New images

`/assets` is served with a one-year immutable cache. Always give a changed image a **new filename**.

## Deploy

Vercel (Git integration): every push builds with `npm run build` and serves `dist/`
(`vercel.json` sets `buildCommand`, `outputDirectory`, headers and redirects).

1. Push a branch and open the preview URL Vercel posts.
2. Check the preview: no console errors or CSP violations, Lighthouse, and the form.
3. Merge to `main` to deploy production.

Security headers (CSP, HSTS, COOP/CORP, frame and referrer policies), hotlink protection for
`/assets` and long-lived caching all live in `vercel.json`.
