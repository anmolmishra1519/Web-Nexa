// =========================================================
// WEB NEXA — Scroll-Scrubbed Frame Sequence
// Maps scroll position (0 -> bottom of page) to a frame from the
// provided 150-image sequence, drawn on a fixed full-viewport
// canvas sitting behind all content. Progressive preload so the
// page never blocks on the full image set; falls back to the
// nearest already-loaded frame while the rest finish loading.
// =========================================================

(function () {
  const CONFIG = {
    frameCount: 150,
    path: 'assets/frames/',
    prefix: 'frame-',
    digits: 3,
    ext: '.jpg',
    eagerCount: 24,     // frames loaded immediately, up front
    concurrency: 6       // parallel loads for the remaining frames
  };

  function frameUrl(i) {
    return `${CONFIG.path}${CONFIG.prefix}${String(i + 1).padStart(CONFIG.digits, '0')}${CONFIG.ext}`;
  }

  class ScrollSequence {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.frames = new Array(CONFIG.frameCount).fill(null);
      this.lastLoadedIndex = -1;
      this.currentIndex = -1;
      this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.ticking = false;

      this.resize();
      window.addEventListener('resize', () => this.resize());

      this.loadEager().then(() => {
        this.drawNearest(this.reduceMotion ? Math.floor(CONFIG.frameCount / 2) : this.targetIndex());
        this.loadRest();
        if (!this.reduceMotion) {
          window.addEventListener('scroll', () => this.onScroll(), { passive: true });
          this.onScroll();
        }
      });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cw = window.innerWidth;
      this.ch = window.innerHeight;
      if (this.currentIndex >= 0) this.drawFrame(this.currentIndex);
    }

    loadImage(i) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { this.frames[i] = img; resolve(); };
        img.onerror = () => resolve(); // skip a broken frame rather than stall the sequence
        img.src = frameUrl(i);
      });
    }

    async loadEager() {
      const n = Math.min(CONFIG.eagerCount, CONFIG.frameCount);
      const promises = [];
      for (let i = 0; i < n; i++) promises.push(this.loadImage(i));
      await Promise.all(promises);
    }

    async loadRest() {
      const remaining = [];
      for (let i = CONFIG.eagerCount; i < CONFIG.frameCount; i++) remaining.push(i);

      const worker = async () => {
        while (remaining.length) {
          const i = remaining.shift();
          await this.loadImage(i);
        }
      };
      const workers = [];
      for (let w = 0; w < CONFIG.concurrency; w++) workers.push(worker());
      await Promise.all(workers);
    }

    targetIndex() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      return Math.round(progress * (CONFIG.frameCount - 1));
    }

    onScroll() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.drawNearest(this.targetIndex());
        this.ticking = false;
      });
    }

    // Draws the requested frame if loaded, otherwise the closest
    // already-loaded frame so the canvas is never left blank.
    drawNearest(index) {
      if (this.frames[index]) {
        this.drawFrame(index);
        return;
      }
      for (let d = 1; d < CONFIG.frameCount; d++) {
        const before = index - d, after = index + d;
        if (before >= 0 && this.frames[before]) { this.drawFrame(before); return; }
        if (after < CONFIG.frameCount && this.frames[after]) { this.drawFrame(after); return; }
      }
    }

    drawFrame(index) {
      const img = this.frames[index];
      if (!img) return;
      this.currentIndex = index;

      // object-fit: cover math
      const scale = Math.max(this.cw / img.width, this.ch / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const dx = (this.cw - dw) / 2, dy = (this.ch - dh) / 2;

      this.ctx.clearRect(0, 0, this.cw, this.ch);
      this.ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  function init() {
    const canvas = document.getElementById('scrollSequenceCanvas');
    if (!canvas) return;
    new ScrollSequence(canvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
