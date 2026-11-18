/*! © 2026 Goodwin Anto. All rights reserved. */
import { REVEAL_ROOT_MARGIN, SPLIT_STAGGER_MS } from '../config.js';
import { $$ } from '../dom.js';
import { motionAllowed } from '../env.js';

/**
 * Splits a heading into masked words; the accessible name stays the plain sentence.
 * @param {HTMLElement} el
 */
function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.replaceChildren(
        ...words.flatMap((word, i) => {
            const outer = document.createElement('span');
            const inner = document.createElement('span');
            outer.className = 'w';
            outer.setAttribute('aria-hidden', 'true');
            inner.className = 'wi';
            inner.textContent = word;
            inner.style.transitionDelay = `${i * SPLIT_STAGGER_MS}ms`;
            outer.append(inner);
            return i ? [' ', outer] : [outer];
        }),
    );
}

/**
 * Scroll reveals. Hidden states only apply once `reveal-on` is set here, so if this
 * module never runs (import failure, no JS) every element simply stays visible.
 */
export function initReveal() {
    if (!motionAllowed() || !('IntersectionObserver' in window)) return;
    const targets = $$('.reveal, .split, .service-card, .project-card');
    $$('.split').forEach(splitWords);
    const io = new IntersectionObserver(
        (entries) => {
            for (const e of entries) {
                if (!e.isIntersecting) continue;
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            }
        },
        { rootMargin: REVEAL_ROOT_MARGIN },
    );
    document.documentElement.classList.add('reveal-on');
    targets.forEach((el) => io.observe(el));
}
