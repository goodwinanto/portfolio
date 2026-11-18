/*! © 2026 Goodwin Anto. All rights reserved. */
import { BREAKPOINT_MENU, NAV_SCROLLED_AT } from '../config.js';
import { $ } from '../dom.js';

/** Navbar background on scroll and the mobile menu (class toggle, Escape closes, resets on resize). */
export function initNav() {
    const navbar = $('.navbar');
    const menuBtn = $('.mobile-menu-btn');
    const links = $('#nav-links');
    if (!navbar || !menuBtn || !links) return;

    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > NAV_SCROLLED_AT);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const setMenu = (open) => {
        links.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.firstElementChild.className = open ? 'ph ph-x' : 'ph ph-list';
    };
    menuBtn.addEventListener('click', () => setMenu(!links.classList.contains('is-open')));
    links.addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('is-open')) {
            setMenu(false);
            menuBtn.focus();
        }
    });
    window.matchMedia(`(min-width: ${BREAKPOINT_MENU}px)`).addEventListener('change', () => setMenu(false));
}
