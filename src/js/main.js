/*! © 2026 Goodwin Anto. All rights reserved. */
/**
 * Entry point. Content-critical features (theme, menu, form, filter) work everywhere; motion
 * and 3D are layered on only where the device, input and user preferences allow.
 */
import { IDLE_FALLBACK_MS, IDLE_TIMEOUT_MS } from './config.js';
import { initCursor } from './cursor.js';
import { $ } from './dom.js';
import { can3D, media } from './env.js';
import { initForm } from './form.js';
import { initScroll } from './scroll.js';
import { initEasterEgg } from './ui/easter-egg.js';
import { initFilter } from './ui/filter.js';
import { initMagnetic } from './ui/magnetic.js';
import { initNav } from './ui/nav.js';
import { initParallax } from './ui/parallax.js';
import { initPreloader } from './ui/preloader.js';
import { initReveal } from './ui/reveal.js';
import { initSound } from './ui/sound.js';
import { initTheme } from './ui/theme.js';

/**
 * Runs `fn` once the page has loaded and the main thread is idle.
 * @param {() => void} fn
 */
function whenIdle(fn) {
    const idle = () =>
        'requestIdleCallback' in window
            ? requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS })
            : setTimeout(fn, IDLE_FALLBACK_MS);
    if (document.readyState === 'complete') idle();
    else window.addEventListener('load', idle, { once: true });
}

/**
 * Loads the WebGL scene as a separate chunk after load, and tears it down if the screen
 * shrinks to phone size or reduced motion is switched on. Any failure (chunk import,
 * no WebGL, shader compile) leaves the CSS depth versions in place.
 */
function init3D() {
    let dispose = null;
    let booting = false;
    const boot = async () => {
        if (dispose || booting || !can3D()) return;
        booting = true;
        try {
            const { start } = await import('./3d/renderer.js');
            if (can3D()) dispose = start();
        } catch {
            /* chunk failed to load (offline, blocked): CSS fallbacks stay */
        } finally {
            booting = false;
        }
    };
    const recheck = () => {
        if (can3D()) return boot();
        dispose?.();
        dispose = null;
    };
    media.desktop.addEventListener('change', recheck);
    media.reducedMotion.addEventListener('change', recheck);
    whenIdle(boot);
}

initTheme($('#theme-toggle'));
initNav();
initForm();
initFilter();
initReveal();
initPreloader();
initEasterEgg();
initSound();
initScroll();
// shortcut: cursor, magnet and parallax decide once at load; a reload picks up a changed preference
initCursor();
initMagnetic();
initParallax();
init3D();
