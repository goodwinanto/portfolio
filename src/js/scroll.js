/*! © 2026 Goodwin Anto. All rights reserved. */
import { ANCHOR_OFFSET, LENIS_DURATION, LENIS_TOUCH_MULTIPLIER } from './config.js';
import { richPointer } from './env.js';
import { addTask, ORDER } from './loop.js';

/** @type {import('lenis').default | null} */
let lenis = null;

/** Exponential ease-out used by Lenis. */
const easeOutExpo = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t));

/**
 * Moves keyboard and screen-reader focus to an in-page target after a jump.
 * @param {HTMLElement} target
 */
function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
}

/**
 * Smooth scrolling (Lenis, desktop mice only; loaded as its own chunk) and anchor links
 * that also move focus. Phones, touch and reduced motion keep native scrolling.
 * @returns {Promise<void>}
 */
export async function initScroll() {
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        const id = a?.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: ANCHOR_OFFSET });
        else target.scrollIntoView();
        history.replaceState(null, '', id);
        focusTarget(target);
    });

    if (!richPointer()) return;
    try {
        const { default: Lenis } = await import('lenis');
        lenis = new Lenis({
            duration: LENIS_DURATION,
            easing: easeOutExpo,
            smoothWheel: true,
            touchMultiplier: LENIS_TOUCH_MULTIPLIER,
            autoRaf: false,
        });
        addTask((time) => lenis.raf(time), ORDER.SCROLL);
    } catch {
        /* chunk failed to load: native scrolling is fine */
    }
}
