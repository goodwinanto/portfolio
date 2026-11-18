/*! © 2026 Goodwin Anto. All rights reserved. */
import { CURSOR_LERP } from './config.js';
import { $ } from './dom.js';
import { richPointer } from './env.js';
import { addTask, lerp } from './loop.js';

const INTERACTIVE = 'a, button, summary, label, [role="button"]';
/** 3D views carry data-gl; the ring turns into a reticle over them. */
const GL_VIEW = '[data-gl]';
const TEXT_INPUT = 'input, textarea, select';

/**
 * Custom cursor for mice: a dot, a lagging ring and a soft glow. The ring grows over
 * links and becomes a labelled reticle over 3D elements. Decorative and aria-hidden;
 * the native cursor returns over text fields.
 */
export function initCursor() {
    if (!richPointer()) return;
    const dot = $('.custom-cursor');
    const ring = $('.custom-cursor-follower');
    const glow = $('.cursor-glow');
    if (!dot || !ring || !glow) return;

    const body = document.body;
    body.classList.add('has-cursor');
    const pos = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
    const place = (el, x, y) => {
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };

    window.addEventListener(
        'pointermove',
        (e) => {
            if (e.pointerType !== 'mouse') return;
            pos.x = e.clientX;
            pos.y = e.clientY;
        },
        { passive: true },
    );
    document.addEventListener('pointerover', (e) => {
        const gl = e.target.closest(GL_VIEW);
        body.classList.toggle('cursor-hover', !!e.target.closest(INTERACTIVE));
        body.classList.toggle('cursor-3d', !!gl && !e.target.closest(INTERACTIVE));
        body.classList.toggle('cursor-text', !!e.target.closest(TEXT_INPUT));
        ring.dataset.label = gl?.dataset.cursor ?? '';
    });
    document.addEventListener('pointerleave', () => body.classList.add('cursor-away'));
    document.addEventListener('pointerenter', () => body.classList.remove('cursor-away'));

    addTask(() => {
        pos.rx = lerp(pos.rx, pos.x, CURSOR_LERP);
        pos.ry = lerp(pos.ry, pos.y, CURSOR_LERP);
        place(dot, pos.x, pos.y);
        place(glow, pos.x, pos.y);
        place(ring, pos.rx, pos.ry);
    });
}
