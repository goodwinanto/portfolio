/*! © 2026 Goodwin Anto. All rights reserved. */
import { SOUND_BLIP_S, SOUND_CLICK_HZ, SOUND_GAIN, SOUND_HOVER_HZ } from '../config.js';
import { $ } from '../dom.js';

const INTERACTIVE = 'a, button, summary';

/**
 * Optional UI sound: off on every visit, never autoplays. The AudioContext is only
 * created inside the click that turns sound on, so browsers never block or warn.
 */
export function initSound() {
    const toggle = $('#sound-toggle');
    if (!toggle || !window.AudioContext) return;
    toggle.classList.add('is-ready'); // space is reserved in CSS, so showing it causes no layout shift
    /** @type {AudioContext | null} */
    let ctx = null;
    let on = false;
    let last = null;

    const blip = (hz) => {
        if (!on || !ctx) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz, t);
        gain.gain.setValueAtTime(SOUND_GAIN, t);
        gain.gain.exponentialRampToValueAtTime(SOUND_GAIN / 100, t + SOUND_BLIP_S);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + SOUND_BLIP_S);
    };

    toggle.addEventListener('click', () => {
        on = !on;
        ctx ??= new AudioContext();
        if (on) ctx.resume();
        else ctx.suspend();
        toggle.setAttribute('aria-pressed', String(on));
        toggle.firstElementChild.className = on ? 'ph ph-speaker-simple-high' : 'ph ph-speaker-simple-x';
        blip(SOUND_CLICK_HZ);
    });
    document.addEventListener('pointerover', (e) => {
        const el = e.target.closest(INTERACTIVE);
        if (el && el !== last) blip(SOUND_HOVER_HZ);
        last = el;
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest(INTERACTIVE) && !e.target.closest('#sound-toggle')) blip(SOUND_CLICK_HZ);
    });
}
