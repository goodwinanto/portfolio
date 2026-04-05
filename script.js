// 1. Initialize Lenis immediately for buttery smooth scrolling without initial lag
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

document.addEventListener('DOMContentLoaded', () => {

    // 2. Custom Cursor Logic (Desktop Only)
    const cursor = document.querySelector('.custom-cursor');
    const cursorFollower = document.querySelector('.custom-cursor-follower');
    const cursorGlow = document.querySelector('.cursor-glow');
    
    if (window.matchMedia('(min-width: 768px)').matches && cursor && cursorFollower) {
        
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        
        // Follower trailing logic
        let followerX = window.innerWidth / 2;
        let followerY = window.innerHeight / 2;
        
        window.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            // Instantly move center dot
            cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            
            if (cursorGlow) {
                cursorGlow.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
            }
        });

        // Loop for smooth follower interpolation
        const render = () => {
            followerX += (mouseX - followerX) * 0.15;
            followerY += (mouseY - followerY) * 0.15;
            cursorFollower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%)`;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);

        // Hover states
        const interactiveElements = document.querySelectorAll('a, button, .hover-target, input, .project-card');
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('cursor-hover');
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('cursor-hover');
            });
        });
    }

    // 3. GSAP Animations with ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Dynamic viewport check for Project Cards specifically
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        // If already comfortably in the viewport on load
        if (rect.top < window.innerHeight) {
            gsap.fromTo(card, 
                { y: 50, opacity: 0 },
                { 
                    y: 0, 
                    opacity: 1, 
                    duration: 1.2, 
                    ease: 'power3.out',
                    delay: 0.4
                }
            );
        } else {
            gsap.fromTo(card,
                { y: 50, opacity: 0 },
                { 
                    y: 0, 
                    opacity: 1, 
                    duration: 1.2, 
                    ease: 'power3.out',
                    immediateRender: false,
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 90%',
                    }
                }
            );
        }
    });

    // Fade-in replacements for standard elements (excluding project cards handled above)
    const fadeElements = document.querySelectorAll('.fade-in:not(.project-card)');
    fadeElements.forEach(el => {
        gsap.fromTo(el, 
            { y: 50, opacity: 0 },
            { 
                y: 0, 
                opacity: 1, 
                duration: 1.2, 
                ease: 'power3.out',
                immediateRender: false,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 90%',
                }
            }
        );
    });

    // Special cinematic reveal for section headers
    const sectionHeaders = document.querySelectorAll('.section-header h2');
    sectionHeaders.forEach(header => {
        gsap.fromTo(header,
            { y: 60, opacity: 0, rotationX: -15 },
            {
                y: 0, opacity: 1, rotationX: 0,
                duration: 1.5,
                ease: 'power4.out',
                immediateRender: false,
                scrollTrigger: {
                    trigger: header,
                    start: 'top 90%',
                }
            }
        );
    });

    // Staggered reveal for services
    gsap.fromTo('.service-card',
        { y: 40, opacity: 0 },
        {
            y: 0, opacity: 1,
            stagger: 0.1,
            duration: 1,
            ease: 'power3.out',
            immediateRender: false,
            scrollTrigger: {
                trigger: '.services-grid',
                start: 'top 90%',
            }
        }
    );

    // 4. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    }

    // 5. Smooth Scrolling for Anchor Links (Tied to Lenis)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                lenis.scrollTo(targetElement, {
                    offset: -80,
                    duration: 1.2,
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
            }
        });
    });

    // 6. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('nav-active');
            if (isActive) {
                navLinks.style.display = 'flex';
                // Simple animation
                gsap.fromTo(navLinks, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4 });
            } else {
                gsap.to(navLinks, { opacity: 0, y: -20, duration: 0.3, onComplete: () => navLinks.style.display = 'none' });
            }
        });
        
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    document.body.classList.remove('nav-active');
                    gsap.to(navLinks, { opacity: 0, y: -20, duration: 0.3, onComplete: () => navLinks.style.display = 'none' });
                }
            });
        });
    }
});
