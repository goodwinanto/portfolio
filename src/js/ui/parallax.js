/*! © 2026 Goodwin Anto. All rights reserved. */
import { HERO_PARALLAX, HERO_POINTER_DEPTH, POINTER_LERP, TILT_MAX_DEG } from '../config.js';
import { $, $$ } from '../dom.js';
import { richPointer } from '../env.js';
import { addTask, clamp, lerp } from '../loop.js';

/** Inner layers of a project frame drift at different speeds as it crosses the viewport (share of height). */
const PROJECT_LAYERS = [
    ['.mock-inner', 0.08],
    ['.mock span', 0.18],
    ['.mock code', -0.4],
];

/**
 * Desktop-only depth: hero layers scrubbed to scroll plus pointer depth, project frames
 * with inner parallax and a hover tilt. All driven by the shared loop, transforms only.
 */
export function initParallax() {
    if (!richPointer()) return;
    const hero = $('#hero');
    if (!hero) return;

    const layers = Object.keys(HERO_PARALLAX).map((name) => ({
        outer: $(`.layer-${name}`, hero),
        inner: $(`.layer-${name} .depth`, hero),
        rate: HERO_PARALLAX[name],
        depth: HERO_POINTER_DEPTH[name] ?? 0,
    }));
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    hero.addEventListener('pointermove', (e) => {
        pointer.x = e.clientX / innerWidth - 0.5;
        pointer.y = e.clientY / innerHeight - 0.5;
    });

    const cards = $$('.project-card').map((card) => ({
        card,
        mock: $('.mock', card),
        layers: PROJECT_LAYERS.map(([sel, rate]) => ({ el: $(sel, card), rate })),
        tilt: { x: 0, y: 0, tx: 0, ty: 0 },
    }));
    for (const c of cards) {
        c.mock.addEventListener('pointermove', (e) => {
            const r = c.mock.getBoundingClientRect();
            c.tilt.ty = ((e.clientX - r.left) / r.width - 0.5) * 2 * TILT_MAX_DEG;
            c.tilt.tx = -((e.clientY - r.top) / r.height - 0.5) * 2 * TILT_MAX_DEG;
        });
        c.mock.addEventListener('pointerleave', () => {
            c.tilt.tx = 0;
            c.tilt.ty = 0;
        });
    }

    addTask(() => {
        // all layout reads first, then writes, so the frame never forces a second layout
        const progress = clamp(window.scrollY / (hero.offsetHeight || 1));
        const rects = cards.map((c) => (c.card.hidden ? null : c.card.getBoundingClientRect()));
        pointer.sx = lerp(pointer.sx, pointer.x, POINTER_LERP);
        pointer.sy = lerp(pointer.sy, pointer.y, POINTER_LERP);
        if (progress < 1) {
            for (const l of layers) {
                l.outer.style.transform = `translate3d(0, ${progress * l.rate * 100}%, 0)`;
                l.inner.style.transform = `translate3d(${-pointer.sx * l.depth}px, ${-pointer.sy * l.depth}px, 0)`;
            }
        }
        cards.forEach((c, i) => {
            const r = rects[i];
            if (!r || r.bottom < 0 || r.top > innerHeight) return;
            const t = clamp((innerHeight - r.top) / (innerHeight + r.height)) * 2 - 1; // -1 entering .. 1 leaving
            for (const l of c.layers) l.el.style.transform = `translate3d(0, ${-t * l.rate * 100}%, 0)`;
            c.tilt.x = lerp(c.tilt.x, c.tilt.tx, POINTER_LERP);
            c.tilt.y = lerp(c.tilt.y, c.tilt.ty, POINTER_LERP);
            c.mock.style.transform = `rotateX(${c.tilt.x}deg) rotateY(${c.tilt.y}deg)`;
        });
    });
}
