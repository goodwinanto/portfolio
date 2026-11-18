/*! © 2026 Goodwin Anto. All rights reserved. */
import { $ } from '../dom.js';

/**
 * The preloader is a short CSS sequence that never waits on the network (so it can't
 * hurt LCP or hang). This only removes the node once its exit animation has finished.
 */
export function initPreloader() {
    const el = $('.preloader');
    if (!el) return;
    const remove = () => el.remove();
    if (getComputedStyle(el).display === 'none') remove();
    else el.addEventListener('animationend', (e) => e.target === el && remove());
}
