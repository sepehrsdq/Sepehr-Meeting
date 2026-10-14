'use strict';

/**
 * سامانه سپهر — UI effects
 * Dependency-free motion layer: scroll reveals, ambient parallax, 3D tilt,
 * magnetic buttons, counters, sticky header state and mobile navigation.
 * Every effect degrades gracefully and honours prefers-reduced-motion.
 */
(function () {
    const root = document.documentElement;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    root.classList.add('sp-js');

    const toPersian = (value) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

    /* ---------------------------------------------------------------- reveal */
    function initReveal() {
        const items = Array.from(document.querySelectorAll('[data-reveal]'));
        if (!items.length) return;

        const noAnim = reduced || new URLSearchParams(window.location.search).has('noanim');

        items.forEach((el, index) => {
            const delay = el.getAttribute('data-delay');
            el.style.setProperty('--sp-delay', `${delay ? Number(delay) : (index % 4) * 70}ms`);
        });

        if (noAnim || !('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in');
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
        );

        items.forEach((el) => observer.observe(el));
    }

    /* -------------------------------------------------------- scroll state */
    function initScroll() {
        const header = document.querySelector('.sp-header');
        const progress = document.querySelector('.sp-progress');
        const top = document.querySelector('.sp-top');
        let ticking = false;

        const update = () => {
            ticking = false;
            const y = window.scrollY || root.scrollTop;
            const max = Math.max(root.scrollHeight - window.innerHeight, 1);
            if (header) header.classList.toggle('is-scrolled', y > 10);
            if (progress) progress.style.transform = `scaleX(${Math.min(y / max, 1)})`;
            if (top) top.classList.toggle('is-visible', y > 620);
        };

        window.addEventListener(
            'scroll',
            () => {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(update);
            },
            { passive: true }
        );
        update();

        if (top) {
            top.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            });
        }
    }

    /* ------------------------------------------------------- mobile drawer */
    function initMobileNav() {
        const button = document.getElementById('spMenuBtn');
        const panel = document.getElementById('spMobile');
        if (!button || !panel) return;

        const icon = button.querySelector('i');
        const setOpen = (open) => {
            panel.classList.toggle('is-open', open);
            button.setAttribute('aria-expanded', String(open));
            if (icon) icon.className = open ? 'fas fa-xmark' : 'fas fa-bars';
        };

        button.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
        panel.addEventListener('click', (event) => {
            if (event.target.closest('a')) setOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setOpen(false);
        });
        window.addEventListener('resize', () => {
            if (window.innerWidth > 900) setOpen(false);
        });
    }

    /* --------------------------------------------------------- hero tilt */
    function initTilt() {
        if (reduced || !finePointer) return;
        document.querySelectorAll('[data-tilt]').forEach((el) => {
            const strength = Number(el.getAttribute('data-tilt')) || 8;
            let frame = null;

            el.addEventListener('pointermove', (event) => {
                if (frame) return;
                frame = window.requestAnimationFrame(() => {
                    frame = null;
                    const rect = el.getBoundingClientRect();
                    const x = (event.clientX - rect.left) / rect.width - 0.5;
                    const y = (event.clientY - rect.top) / rect.height - 0.5;
                    el.style.transform = `perspective(1100px) rotateX(${(-y * strength).toFixed(2)}deg) rotateY(${(x * strength).toFixed(2)}deg)`;
                });
            });

            el.addEventListener('pointerleave', () => {
                el.style.transform = 'perspective(1100px) rotateX(0deg) rotateY(0deg)';
            });
        });
    }

    /* ----------------------------------------------------- magnetic buttons */
    function initMagnetic() {
        if (reduced || !finePointer) return;
        document.querySelectorAll('[data-magnetic]').forEach((el) => {
            el.addEventListener('pointermove', (event) => {
                const rect = el.getBoundingClientRect();
                const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
                const y = (event.clientY - rect.top - rect.height / 2) * 0.2;
                el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
            });
            el.addEventListener('pointerleave', () => {
                el.style.transform = '';
            });
        });
    }

    /* ------------------------------------------------------ card spotlight */
    function initSpotlight() {
        if (!finePointer) return;
        document.querySelectorAll('.sp-feature').forEach((card) => {
            card.addEventListener(
                'pointermove',
                (event) => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
                    card.style.setProperty('--my', `${event.clientY - rect.top}px`);
                },
                { passive: true }
            );
        });
    }

    /* --------------------------------------------------------- counters */
    function initCounters() {
        const counters = Array.from(document.querySelectorAll('[data-count]'));
        if (!counters.length) return;

        const render = (el, value) => {
            const suffix = el.getAttribute('data-suffix') || '';
            el.textContent = toPersian(value) + suffix;
        };

        if (reduced || !('IntersectionObserver' in window)) {
            counters.forEach((el) => render(el, Number(el.getAttribute('data-count')) || 0));
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    observer.unobserve(el);
                    const target = Number(el.getAttribute('data-count')) || 0;
                    const duration = 1100;
                    const start = performance.now();
                    const tick = (now) => {
                        const t = Math.min((now - start) / duration, 1);
                        const eased = 1 - Math.pow(1 - t, 3);
                        render(el, Math.round(target * eased));
                        if (t < 1) window.requestAnimationFrame(tick);
                    };
                    window.requestAnimationFrame(tick);
                });
            },
            { threshold: 0.4 }
        );
        counters.forEach((el) => observer.observe(el));
    }

    /* --------------------------------------------------- ambient parallax */
    function initParallax() {
        if (reduced) return;
        const orbs = Array.from(document.querySelectorAll('.sp-orb'));
        if (!orbs.length) return;
        let ticking = false;
        window.addEventListener(
            'scroll',
            () => {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(() => {
                    ticking = false;
                    const y = window.scrollY || 0;
                    orbs.forEach((orb, i) => {
                        const factor = (i + 1) * 0.02;
                        orb.style.marginTop = `${Math.min(y * factor, 70).toFixed(1)}px`;
                    });
                });
            },
            { passive: true }
        );
    }

    /* --------------------------------------------------- demo interactions */
    function initDemo() {
        const mic = document.getElementById('spDemoMic');
        if (mic) {
            let on = true;
            mic.addEventListener('click', () => {
                on = !on;
                mic.classList.toggle('is-off', !on);
                mic.innerHTML = on ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
                mic.setAttribute('aria-pressed', String(!on));
            });
        }
    }

    function boot() {
        initReveal();
        initScroll();
        initMobileNav();
        initTilt();
        initMagnetic();
        initSpotlight();
        initCounters();
        initParallax();
        initDemo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})();
