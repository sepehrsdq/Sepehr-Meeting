'use strict';

/**
 * سامانه سپهر — Theme Effects
 * GSAP motion choreography for the landing page.
 * Tiers used (ui-ux-pro-max/motion): Subtle stagger + Standard scroll reveal.
 * All motion respects prefers-reduced-motion.
 */

(function () {
    if (typeof gsap === 'undefined') return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);

    // ---------- Scroll progress ----------
    const progress = document.querySelector('.scroll-progress');
    if (progress && !reduced) {
        gsap.to(progress, {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.4 },
        });
    }

    if (reduced) return;

    // ---------- Hero entrance (choreographed) ----------
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    heroTl
        .from('.site-header', { y: -50, opacity: 0, duration: 0.65 })
        .from('.hero-badge', { y: 18, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('.hero-title, #appTitle', { y: 34, opacity: 0, duration: 0.75 }, '-=0.28')
        .from('.hero-paragraph, #appDescription', { y: 26, opacity: 0, duration: 0.65 }, '-=0.45')
        .from('.hero-trust-item', { y: 16, opacity: 0, duration: 0.45, stagger: 0.07 }, '-=0.4')
        .from('.hero-figure-box', { scale: 0.55, opacity: 0, duration: 0.65, stagger: 0.05 }, '-=0.55')
        .from('.cta-inner', { y: 44, opacity: 0, duration: 0.75 }, '-=0.4')
        .from('.site-footer', { opacity: 0, duration: 0.6 }, '-=0.3');

    // ---------- Scroll reveals ----------
    document.querySelectorAll('.gs-reveal').forEach((el, i) => {
        gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            delay: (i % 3) * 0.08,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });

    // ---------- Floating orbs (infinite drift) ----------
    document.querySelectorAll('.hero-orb').forEach((orb, i) => {
        gsap.to(orb, {
            x: i % 2 === 0 ? 70 : -55,
            y: i % 2 === 0 ? 45 : -60,
            duration: 9 + i * 2.5,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    });

    // ---------- Hero figure: pointer 3D tilt ----------
    const figure = document.querySelector('.hero-figure');
    if (figure && window.matchMedia('(pointer: fine)').matches) {
        gsap.set(figure, { transformPerspective: 900 });
        const rotX = gsap.quickTo(figure, 'rotationX', { duration: 0.7, ease: 'power2.out' });
        const rotY = gsap.quickTo(figure, 'rotationY', { duration: 0.7, ease: 'power2.out' });
        figure.addEventListener('pointermove', (e) => {
            const r = figure.getBoundingClientRect();
            rotY(((e.clientX - r.left) / r.width - 0.5) * 14);
            rotX(-((e.clientY - r.top) / r.height - 0.5) * 11);
        });
        figure.addEventListener('pointerleave', () => {
            rotX(0);
            rotY(0);
        });
    }

    // ---------- Magnetic CTAs ----------
    document.querySelectorAll('.button-primary, .landing-nav-cta').forEach((btn) => {
        const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power2.out' });
        const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power2.out' });
        btn.addEventListener('pointermove', (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.14);
            yTo((e.clientY - r.top - r.height / 2) * 0.22);
        });
        btn.addEventListener('pointerleave', () => {
            xTo(0);
            yTo(0);
        });
    });

    // ---------- Input glow on focus (drawn ring) ----------
    const roomInput = document.getElementById('roomName');
    if (roomInput) {
        roomInput.addEventListener('focus', () => {
            gsap.fromTo(
                roomInput,
                { boxShadow: '0 0 0 0px rgba(56,189,248,0.25)' },
                { boxShadow: '0 0 0 4px rgba(56,189,248,0.16)', duration: 0.35, ease: 'power2.out' }
            );
        });
    }
})();
