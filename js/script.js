// =========================================================
// WEB NEXA — Core Script
// GSAP is used where available (loaded via CDN in <head>);
// every GSAP-driven feature has a plain-JS/CSS fallback so the
// site still works fully if GSAP fails to load.
// =========================================================

document.addEventListener('DOMContentLoaded', () => {

  const HAS_GSAP = typeof gsap !== 'undefined';
  const HAS_ST = HAS_GSAP && typeof ScrollTrigger !== 'undefined';
  if (HAS_ST) gsap.registerPlugin(ScrollTrigger);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  /* ---------- Loading screen ---------- */
  const loadingScreen = document.getElementById('loadingScreen');
  const hideLoader = () => {
    if (!loadingScreen) return;
    loadingScreen.classList.add('hidden');
  };
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 300);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 300));
    setTimeout(hideLoader, 2500); // safety net if 'load' stalls
  }

  /* ---------- Magnetic buttons (GSAP quickTo when available) ---------- */
  if (!isTouch) {
    document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
      const strength = 18;
      const xTo = HAS_GSAP ? gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' }) : null;
      const yTo = HAS_GSAP ? gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' }) : null;

      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width * strength;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height * strength;
        if (xTo) { xTo(x); yTo(y); }
        else btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        if (xTo) { xTo(0); yTo(0); }
        else btn.style.transform = 'translate(0,0)';
      });

      // Ripple on click — contained in its own layer so it doesn't
      // clip the button's glow box-shadow
      btn.addEventListener('click', (e) => {
        let layer = btn.querySelector('.btn-ripple-layer');
        if (!layer) {
          layer = document.createElement('span');
          layer.className = 'btn-ripple-layer';
          btn.appendChild(layer);
        }
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        layer.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /* ---------- Navbar scroll state ---------- */
  const navbar = document.querySelector('.navbar');
  const onScroll = () => {
    if (window.scrollY > 80) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  const hamburger = document.querySelector('.hamburger');
  const overlay = document.querySelector('.mobile-overlay');
  const closeBtn = document.querySelector('.mobile-close');

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => overlay.classList.add('open'));
    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => overlay.classList.remove('open'))
    );
  }

  /* ---------- Marquee duplication for seamless loop ---------- */
  document.querySelectorAll('.marquee-track').forEach(track => {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- Count-up stats ---------- */
  const counters = document.querySelectorAll('.stat-num[data-count]');
  const animateCount = (el) => {
    const target = el.getAttribute('data-count');
    const isNumeric = /^\d+$/.test(target);
    if (!isNumeric) { el.textContent = target; return; }
    const end = parseInt(target, 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1400;
    const startTime = performance.now();
    const step = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      el.textContent = Math.floor(progress * end) + suffix;
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = end + suffix;
    };
    requestAnimationFrame(step);
  };
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  counters.forEach(c => statObserver.observe(c));

  /* ---------- Scroll reveal ----------
     GSAP + ScrollTrigger drives a cinematic blur/scale/rotate-in when
     available; otherwise IntersectionObserver + the .reveal CSS class
     (already defined in style.css) provides a clean fade/slide fallback. */
  const revealEls = document.querySelectorAll('.reveal');
  if (HAS_ST && !reduceMotion) {
    revealEls.forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 34, rotateX: 6, filter: 'blur(6px)' },
        {
          opacity: 1, y: 0, rotateX: 0, filter: 'blur(0px)',
          duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' }
        }
      );
    });
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------- Aurora parallax on scroll ---------- */
  if (HAS_ST && !reduceMotion) {
    document.querySelectorAll('.aurora-blob').forEach((blob, i) => {
      gsap.to(blob, {
        y: (i % 2 === 0 ? 1 : -1) * 120,
        ease: 'none',
        scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1 }
      });
    });
  }

  /* ---------- Card 3D tilt + spotlight on hover ---------- */
  document.querySelectorAll('.card, .feature-block').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(6px)`;
      card.style.setProperty('--spotlight-x', `${(x / rect.width) * 100}%`);
      card.style.setProperty('--spotlight-y', `${(y / rect.height) * 100}%`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
  });

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  /* ---------- Page transition ----------
     Intercepts plain same-origin .html link clicks to fade the page
     out before navigating, for a smoother app-like feel. Skips
     modified clicks (new tab / new window), external links, and
     tel:/mailto:/wa.me links so normal browser behavior is preserved. */
  const pageShell = document.querySelector('.page-shell');
  if (pageShell && !reduceMotion) {
    pageShell.classList.add('page-enter');
    requestAnimationFrame(() => pageShell.classList.add('page-enter-active'));

    document.querySelectorAll('a[href$=".html"]').forEach(link => {
      link.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const href = link.getAttribute('href');
        if (!href || link.target === '_blank') return;
        e.preventDefault();
        pageShell.classList.add('page-leave');
        setTimeout(() => { window.location.href = href; }, 280);
      });
    });
  }

});
