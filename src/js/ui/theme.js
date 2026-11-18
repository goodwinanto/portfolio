/*! © 2026 Goodwin Anto. All rights reserved. */
import { EVENTS } from '../config.js';
import { currentTheme, media } from '../env.js';
import { withTransition } from './transitions.js';

const STORAGE_KEY = 'theme';

const root = document.documentElement;

const store = (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, value);
    } catch {
        /* private mode: the choice just isn't remembered */
    }
};

/**
 * Wires the theme toggle. The stored choice is applied before first paint by the inline head script;
 * with nothing stored the system preference wins and is followed live.
 * @param {HTMLButtonElement | null} button
 */
export function initTheme(button) {
    const sync = () => {
        button?.setAttribute('aria-pressed', String(currentTheme() === 'light')); // the button is "Light theme"
        window.dispatchEvent(new CustomEvent(EVENTS.THEME, { detail: currentTheme() }));
    };
    media.light.addEventListener('change', () => {
        if (!root.dataset.theme) sync();
    });
    button?.classList.add('is-ready');
    button?.addEventListener('click', () => {
        const next = currentTheme() === 'dark' ? 'light' : 'dark';
        withTransition(() => {
            root.dataset.theme = next;
            sync();
        });
        store(next);
    });
    sync();
}
