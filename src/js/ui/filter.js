/*! © 2026 Goodwin Anto. All rights reserved. */
import { $, $$ } from '../dom.js';
import { withTransition } from './transitions.js';

const ALL = 'all';

/**
 * Project filter: a group of toggle buttons (aria-pressed) that hide non-matching cards
 * and announce the result in a polite live region. Cards list their tags in data-tags.
 */
export function initFilter() {
    const bar = $('.filter-bar');
    const status = $('#filter-status');
    const cards = $$('.project-card[data-tags]');
    if (!bar || !status || !cards.length) return;

    cards.forEach((card, i) => {
        card.style.viewTransitionName = `project-${i}`;
    });
    bar.hidden = false; // without JS every project shows and the bar stays hidden

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
        const tag = btn.dataset.filter;
        const shown = cards.filter((c) => tag === ALL || c.dataset.tags.split(' ').includes(tag));
        withTransition(() => {
            for (const b of $$('button[data-filter]', bar)) b.setAttribute('aria-pressed', String(b === btn));
            for (const c of cards) c.hidden = !shown.includes(c);
        });
        const label = tag === ALL ? 'all' : btn.textContent.trim();
        status.textContent = `Showing ${shown.length} of ${cards.length} projects (${label}).`;
    });
}
