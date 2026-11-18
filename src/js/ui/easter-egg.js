/*! © 2026 Goodwin Anto. All rights reserved. */
import { COPYRIGHT, EASTER_EGG, EVENTS, SIGNATURE } from '../config.js';

const EGG_CLASS = 'egg';
const EGG_MS = 2400;

/**
 * Typing the easter-egg word anywhere outside a form field makes the scene flare and the logo
 * glow, and prints the build signature. Part of the provenance trail, harmless for everyone else.
 */
export function initEasterEgg() {
    let typed = '';
    document.addEventListener('keydown', (e) => {
        if (e.target.closest('input, textarea, select, [contenteditable]') || e.key.length !== 1) return;
        typed = (typed + e.key.toLowerCase()).slice(-EASTER_EGG.length);
        if (typed !== EASTER_EGG) return;
        typed = '';
        const root = document.documentElement;
        root.classList.add(EGG_CLASS);
        setTimeout(() => root.classList.remove(EGG_CLASS), EGG_MS);
        window.dispatchEvent(new CustomEvent(EVENTS.EGG));
        console.info(`${COPYRIGHT} Build ${SIGNATURE}`);
    });
}
