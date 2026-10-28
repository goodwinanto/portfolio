/* Portfolio motion. GSAP 3.12.5 + ScrollTrigger + Lenis 1.0.35.
   Everything animated is wrapped in gsap.matchMedia; without GSAP the page stays fully visible. */
(() => {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const root = document.documentElement;

    const navbar = $('.navbar');
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- Mobile menu: class toggle, no inline styles ---------- */
    const menuBtn = $('.mobile-menu-btn');
    const navLinks = $('#nav-links');
    const setMenu = (open) => {
        navLinks.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.firstElementChild.className = open ? 'ph ph-x' : 'ph ph-list';
    };
    menuBtn.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
    navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
    window.matchMedia('(min-width: 769px)').addEventListener('change', () => setMenu(false));

    /* ---------- Contact form (Web3Forms; key is a TODO placeholder in the HTML) ---------- */
    const form = $('#contact-form');
    const status = $('#form-status');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const say = (msg, cls) => { status.textContent = msg; status.className = 'form-status ' + cls; };
        if (!form.checkValidity()) return say('Please fill in your name, a valid email and a message.', 'err');
        if (form.botcheck.checked) return; // honeypot: silently drop bots
        const btn = form.querySelector('button');
        btn.disabled = true;
        say('Sending…', '');
        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(Object.fromEntries(new FormData(form))),
            });
            const json = await res.json();
            if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
            form.reset();
            say('Thanks, your message is in. I will reply within 24 hours.', 'ok');
        } catch {
            say('Could not send that. Please email goodwinantoofficial@gmail.com instead.', 'err');
        } finally {
            btn.disabled = false;
        }
    });

    /* ---------- Motion ---------- */
    if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('js'); return; }
    gsap.registerPlugin(ScrollTrigger);

    let lenis = null;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && window.Lenis) {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2,
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // Anchor links go through Lenis when it exists, else the browser's native jump
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a || a.getAttribute('href') === '#') return;
        const target = $(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -70 });
        else target.scrollIntoView();
        history.replaceState(null, '', a.getAttribute('href'));
    });

    /* Hand-rolled word split: <span.w><span.wi>word</span></span> */
    const splitWords = (el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.setAttribute('aria-label', words.join(' '));
        el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span class="wi">${w}</span></span>`).join(' ');
        return $$('.wi', el);
    };

    const mm = gsap.matchMedia();

    /* Cursor: fine pointers only; the rAF loop runs only while the follower is still catching up */
    mm.add('(hover: hover) and (pointer: fine) and (min-width: 768px)', () => {
        const dot = $('.custom-cursor'), ring = $('.custom-cursor-follower'), glow = $('.cursor-glow');
        document.body.classList.add('has-cursor');
        let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, running = false;
        const place = (el, x, y) => { el.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-50%)`; };
        [dot, ring, glow].forEach((el) => place(el, mx, my));
        const tick = () => {
            rx += (mx - rx) * 0.15; ry += (my - ry) * 0.15;
            place(ring, rx, ry);
            if (Math.abs(mx - rx) < 0.1 && Math.abs(my - ry) < 0.1) { running = false; return; }
            requestAnimationFrame(tick);
        };
        const move = (e) => {
            mx = e.clientX; my = e.clientY;
            place(dot, mx, my); place(glow, mx, my);
            if (!running) { running = true; requestAnimationFrame(tick); }
        };
        const over = (e) => document.body.classList.toggle('cursor-hover', !!e.target.closest('a, button, summary'));
        addEventListener('mousemove', move, { passive: true });
        document.addEventListener('mouseover', over);
        return () => {
            document.body.classList.remove('has-cursor', 'cursor-hover');
            removeEventListener('mousemove', move);
            document.removeEventListener('mouseover', over);
        };
    });

    /* Everything below: motion allowed */
    mm.add('(prefers-reduced-motion: no-preference)', () => {
        const desktop = innerWidth >= 768;

        // Hero intro
        gsap.fromTo('.hero-in', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.1 });

        // Split headings
        $$('.split').forEach((el) => {
            const words = splitWords(el);
            gsap.set(words, { yPercent: 110 });
            el.classList.add('is-split');
            gsap.to(words, {
                yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.05,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            });
        });

        // Generic reveals
        $$('.reveal').forEach((el) => {
            gsap.fromTo(el, { y: 30, opacity: 0 }, {
                y: 0, opacity: 1, duration: 1, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            });
        });

        // Services cards: revealed one after another as the list scrolls in
        $$('.service-card').forEach((card, i) => {
            gsap.fromTo(card, { y: 50, opacity: 0 }, {
                y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: desktop ? 0 : i * 0.04,
                scrollTrigger: { trigger: card, start: 'top 90%', once: true },
            });
        });

        // Project cards reveal on all sizes
        $$('.project-card').forEach((card) => {
            gsap.fromTo(card, { y: 50, opacity: 0 }, {
                y: 0, opacity: 1, duration: 1.1, ease: 'power3.out',
                scrollTrigger: { trigger: card, start: 'top 88%', once: true },
            });
        });

        if (!desktop) return; // simplified on small screens: reveals only

        // Hero parallax: layers move at different rates, scrubbed to scroll
        const heroST = { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('.layer-ambient', { yPercent: 12, ease: 'none', scrollTrigger: heroST });
        gsap.to('.layer-grid', { yPercent: 22, ease: 'none', scrollTrigger: heroST });
        gsap.to('.layer-core', { yPercent: 38, ease: 'none', scrollTrigger: heroST });
        gsap.to('.layer-orbs', { yPercent: 55, ease: 'none', scrollTrigger: heroST });
        gsap.to('.hero-content', { yPercent: -18, opacity: 0.2, ease: 'none', scrollTrigger: heroST });

        // Pointer depth on the inner wrappers (scroll parallax is on the outer layers)
        const depth = [['.layer-ambient', 10], ['.layer-grid', 16], ['.layer-core', 34], ['.layer-orbs', 52]].map(([s, k]) => ({
            x: gsap.quickTo(`${s} .depth`, 'x', { duration: 0.9, ease: 'power3.out' }),
            y: gsap.quickTo(`${s} .depth`, 'y', { duration: 0.9, ease: 'power3.out' }), k,
        }));
        const hero = $('#hero');
        const pointer = (e) => {
            const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
            depth.forEach((d) => { d.x(-nx * d.k); d.y(-ny * d.k); });
        };
        hero.addEventListener('pointermove', pointer);

        // Project inner parallax (media moves at a different speed from the card) + tilt
        const tiltCleanups = $$('.project-card').map((card) => {
            const mock = $('.mock', card), inner = $('.mock-inner', card);
            gsap.fromTo(inner, { yPercent: -8 }, {
                yPercent: 8, ease: 'none',
                scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
            });
            const rx = gsap.quickTo(mock, 'rotationX', { duration: 0.5, ease: 'power3.out' });
            const ry = gsap.quickTo(mock, 'rotationY', { duration: 0.5, ease: 'power3.out' });
            const mv = (e) => {
                const r = mock.getBoundingClientRect();
                ry(((e.clientX - r.left) / r.width - 0.5) * 10);
                rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
            };
            const lv = () => { rx(0); ry(0); };
            mock.addEventListener('pointermove', mv);
            mock.addEventListener('pointerleave', lv);
            return () => { mock.removeEventListener('pointermove', mv); mock.removeEventListener('pointerleave', lv); };
        });

        return () => {
            hero.removeEventListener('pointermove', pointer);
            tiltCleanups.forEach((fn) => fn());
        };
    });
})();
