/*! © 2026 Goodwin Anto. All rights reserved. */
import { MAGNET_STRENGTH } from '../config.js';
import { $$ } from '../dom.js';
import { richPointer } from '../env.js';

/**
 * Buttons lean toward the pointer. Uses the `translate` property so it never fights
 * the hover `transform`; CSS transitions do the easing. Mice only, motion allowed.
 */
export function initMagnetic() {
    if (!richPointer()) return;
    for (const el of $$('.btn, .btn-hire, [data-magnetic]')) {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            const x = (e.clientX - (r.left + r.width / 2)) * MAGNET_STRENGTH;
            const y = (e.clientY - (r.top + r.height / 2)) * MAGNET_STRENGTH;
            el.style.translate = `${x}px ${y}px`;
        });
        el.addEventListener('pointerleave', () => {
            el.style.translate = '';
        });
    }
}
