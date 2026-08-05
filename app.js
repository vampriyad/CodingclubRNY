/* ============================================================
   CODING CLUB RNY — RETRO ARCADE ENGINE
   WebAudio SFX · theme · wipe transitions · particles
   ============================================================ */
'use strict';

const RNY = (() => {

  /* -------------------- SOUND ENGINE -------------------- */
  const SFX = {
    ctx: null,
    master: null,
    on: localStorage.getItem('rny_sfx') !== 'off',
    ready: false,

    init() {
      if (this.ready || !this.on) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.ctx.destination);
        this.ready = true;
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch (e) { /* audio unavailable */ }
    },

    setOn(v) {
      this.on = v;
      localStorage.setItem('rny_sfx', v ? 'on' : 'off');
      if (v) this.init();
      if (this.master) this.master.gain.value = v ? 0.16 : 0;
    },

    tone(freq, dur, type = 'square', vol = 1, t0 = 0, slideTo = null) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime + t0;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + .02);
    },

    noise(dur = .06, vol = .5, t0 = 0) {
      if (!this.on || !this.ctx) return;
      const t = this.ctx.currentTime + t0;
      const len = this.ctx.sampleRate * dur;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 900;
      const g = this.ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
    },

    hover()  { this.tone(1150 + Math.random() * 350, .045, 'square', .22); },
    click()  { this.tone(660, .07, 'square', .5); this.tone(990, .09, 'square', .4, .06); },
    coin()   { this.tone(988, .09, 'square', .5); this.tone(1319, .3, 'square', .5, .09); },
    back()   { this.tone(520, .07, 'square', .4); this.tone(330, .1, 'square', .4, .06); },
    start()  {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, .12, 'square', .5, i * .09));
      this.tone(1568, .35, 'square', .4, .38);
    },
    win() {
      const seq = [523, 523, 523, 523, 415, 466, 523, 466, 523];
      const dut = [.1, .1, .1, .18, .14, .14, .3, .1, .45];
      let t = 0;
      seq.forEach((f, i) => { this.tone(f, dut[i], 'square', .5, t); t += dut[i] + .02; });
      this.tone(2093, .6, 'square', .22, t);
    },
    err() { this.tone(220, .16, 'sawtooth', .5, 0, 110); this.tone(180, .2, 'sawtooth', .4, .12, 90); },
    type() { this.noise(.025, .16); },
    teleport() { this.tone(300, .35, 'square', .4, 0, 1600); },
    powerup() { [440, 554, 659, 880].forEach((f, i) => this.tone(f, .1, 'triangle', .5, i * .07)); },
    oneup() {
      [660, 830, 990, 660, 830, 1180].forEach((f, i) => this.tone(f, .11, 'square', .5, i * .1));
    }
  };

  /* -------------------- STATE / SELECTORS -------------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  /* -------------------- THEME -------------------- */
  function initTheme() {
    const btn = $('#theme-btn');
    const apply = t => {
      document.documentElement.dataset.theme = t;
      localStorage.setItem('rny_theme', t);
      dispatchEvent(new CustomEvent('rny:theme'));
    };
    btn?.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      SFX.init(); SFX.powerup();
      apply(next);
    });
  }

  /* -------------------- SOUND TOGGLE -------------------- */
  function initSoundToggle() {
    const btn = $('#sfx-btn');
    if (!btn) return;
    const render = () => {
      btn.setAttribute('aria-pressed', SFX.on ? 'true' : 'false');
      btn.title = SFX.on ? 'Mute sound effects' : 'Unmute sound effects';
      btn.querySelector('.ico-on')?.classList.toggle('hidden', !SFX.on);
      btn.querySelector('.ico-off')?.classList.toggle('hidden', SFX.on);
    };
    render();
    btn.addEventListener('click', () => {
      SFX.setOn(!SFX.on);
      if (SFX.on) SFX.coin();
      render();
    });
  }

  /* -------------------- GLOBAL HOVER / CLICK SFX -------------------- */
  function initGlobalSfx() {
    let lastEl = null;
    document.addEventListener('mouseover', e => {
      const el = e.target.closest('a, button, .px-option, input, select, textarea, .cart, .stat, .path-card, .avatar-card');
      if (el && el !== lastEl) { lastEl = el; SFX.hover(); }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('a, button, .px-option, .cart, .stat, .path-card, .avatar-card')) lastEl = null;
    });
    document.addEventListener('pointerdown', () => SFX.init(), { once: true });
    if (!isTouch) {
      document.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button, .px-option, input[type=radio], input[type=checkbox]')) SFX.click();
      });
    }
  }

  /* -------------------- WIPE TRANSITIONS -------------------- */
  function initWipes() {
    const wipe = $('#wipe');
    if (!wipe) return;
    if (sessionStorage.getItem('rny_wipe') === '1') {
      sessionStorage.removeItem('rny_wipe');
      const bars = $$('.bar', wipe);
      bars.forEach(b => b.style.transform = 'scaleY(1)');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        wipe.classList.add('reveal');
        setTimeout(() => {
          wipe.classList.remove('reveal');
          bars.forEach(b => b.style.transform = '');
        }, 950);
      }));
      SFX.init();
    }
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href$=".html"]');
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return;
      const url = new URL(a.href, location.href);
      if (url.pathname === location.pathname) return;
      e.preventDefault();
      SFX.init(); SFX.teleport();
      sessionStorage.setItem('rny_wipe', '1');
      wipe.classList.add('cover-in');
      setTimeout(() => { location.href = a.href; }, 560);
    });
  }

  /* -------------------- START OVERLAY (HOME) -------------------- */
  function initStartOverlay() {
    const ov = $('#start-overlay');
    if (!ov) return;
    const dismiss = () => {
      if (ov.classList.contains('off')) return;
      SFX.init(); SFX.coin();
      setTimeout(() => SFX.start(), 180);
      ov.classList.add('off');
      sessionStorage.setItem('rny_started', '1');
      setTimeout(() => ov.remove(), 600);
    };
    ov.addEventListener('click', dismiss);
    addEventListener('keydown', dismiss);
    if (sessionStorage.getItem('rny_started') === '1') ov.remove();
  }

  /* -------------------- PARTICLE CANVAS -------------------- */
  function initParticles() {
    const cv = $('#bg-canvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, parts = [];
    let hueWarm = document.documentElement.dataset.theme !== 'dark';

    const starColors = () => hueWarm
      ? ['#f06414', '#e8a30c', '#d92b4b', '#28786b']
      : ['#ff8a3c', '#ffc94d', '#ff5d73', '#4fd6c2'];

    function newStar() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        s: [2, 3, 4, 6][Math.random() * 4 | 0],
        v: .18 + Math.random() * .5,
        drift: (Math.random() - .5) * .2,
        c: starColors()[Math.random() * 4 | 0],
        tw: Math.random() * Math.PI * 2
      };
    }
    const resize = () => {
      W = cv.width = innerWidth; H = cv.height = innerHeight;
      const cap = W < 760 ? 26 : 55;
      const n = Math.min(cap, Math.floor(W * H / 26000));
      parts = Array.from({ length: n }, () => newStar());
    };
    addEventListener('rny:theme', () => {
      hueWarm = document.documentElement.dataset.theme !== 'dark';
      parts.forEach(p => p.c = starColors()[Math.random() * 4 | 0]);
    });
    addEventListener('resize', resize);
    resize();
    let mx = 0;
    addEventListener('pointermove', e => mx = (e.clientX / W - .5) * 14);
    let last = 0;
    (function draw(ts) {
      requestAnimationFrame(draw);
      if (ts - last < 33) return;  // ~30fps for retro feel
      last = ts;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(p => {
        p.y -= p.v; p.x += p.drift; p.tw += .08;
        if (p.y < -8) { p.y = H + 8; p.x = Math.random() * W; }
        if (p.x < -8) p.x = W + 8; if (p.x > W + 8) p.x = -8;
        const a = (hueWarm ? .3 : .55) + Math.sin(p.tw) * .2;
        ctx.globalAlpha = Math.max(.05, a);
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x + mx), Math.round(p.y), p.s, p.s);
      });
      ctx.globalAlpha = 1;
    })(0);
  }

  /* -------------------- TYPEWRITER -------------------- */
  function initTypewriter() {
    const els = $$('[data-type]');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting || en.target.dataset.done) return;
        en.target.dataset.done = '1';
        typeEl(en.target);
      });
    }, { threshold: .5 });
    els.forEach(el => {
      el.dataset.full = el.textContent.trim();
      el.textContent = '';
      el.insertAdjacentHTML('beforeend', '<span class="cursor">▮</span>');
      io.observe(el);
    });
    function typeEl(el) {
      const full = el.dataset.full;
      const cur = $('.cursor', el);
      let i = 0;
      const speed = parseInt(el.dataset.speed || '38', 10);
      (function step() {
        if (i <= full.length) {
          el.textContent = full.slice(0, i);
          if (cur) el.appendChild(cur);
          if (i % 2 === 0) SFX.type();
          i++;
          setTimeout(step, speed + Math.random() * 26);
        } else if (cur && el.dataset.keepCursor !== '1') {
          setTimeout(() => cur.remove(), 2600);
        }
      })();
    }
  }

  /* -------------------- COUNTERS -------------------- */
  function initCounters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting || en.target.dataset.done) return;
        en.target.dataset.done = '1';
        const target = parseFloat(en.target.dataset.count);
        const dec = (en.target.dataset.count.split('.')[1] || '').length;
        const suffix = en.target.dataset.suffix || '';
        const steps = 26; let n = 0;
        (function step() {
          n++;
          const v = target * Math.min(1, n / steps);
          en.target.textContent = v.toFixed(dec) + suffix;
          if (n < steps) setTimeout(step, 46);
          else { en.target.textContent = target.toFixed(dec) + suffix; SFX.coin(); }
        })();
      });
    }, { threshold: .4 });
    els.forEach(el => io.observe(el));
  }

  /* -------------------- REVEAL ON SCROLL -------------------- */
  function initReveal() {
    const els = $$('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); }
      });
    }, { threshold: .18 });
    els.forEach(el => io.observe(el));
  }

  /* -------------------- METERS / BARS -------------------- */
  function initMeters() {
    const els = $$('.meter > i');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.style.width = en.target.dataset.fill + '%';
        io.unobserve(en.target);
      });
    }, { threshold: .4 });
    els.forEach(el => io.observe(el));
  }

  /* -------------------- MOBILE NAV -------------------- */
  function initNav() {
    const ham = $('#hamburger');
    const links = $('#nav-links');
    ham?.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      ham.setAttribute('aria-expanded', open);
      SFX.init(); open ? SFX.powerup() : SFX.back();
    });
    const page = document.body.dataset.page;
    $$('.nav-link').forEach(a => {
      if (a.dataset.page === page) a.classList.add('active');
    });
  }

  /* -------------------- KONAMI CODE -------------------- */
  function initKonami() {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    addEventListener('keydown', e => {
      pos = (e.key === seq[pos]) ? pos + 1 : (e.key === seq[0] ? 1 : 0);
      if (pos === seq.length) { pos = 0; cheatOn(); }
    });
    function cheatOn() {
      SFX.init(); SFX.oneup();
      toast('CHEAT ACTIVATED <span class="hi">+1UP</span> — YOU FOUND THE SECRET!');
      confetti(90);
    }
  }

  /* -------------------- TOAST -------------------- */
  let toastTimer;
  function toast(html) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.innerHTML = html;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  }

  /* -------------------- CONFETTI -------------------- */
  function confetti(n = 60) {
    const colors = ['#f06414', '#d92b4b', '#e8a30c', '#28786b', '#6b3fd4', '#fff'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      const sz = 6 + Math.random() * 8;
      c.style.width = sz + 'px'; c.style.height = (sz * (Math.random() > .5 ? .4 : 1)) + 'px';
      c.style.animationDuration = (2.2 + Math.random() * 2.4) + 's';
      c.style.animationDelay = (Math.random() * .5) + 's';
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 5200);
    }
  }

  /* -------------------- JOIN FORM -------------------- */
  function initJoinForm() {
    const form = $('#join-form');
    if (!form) return;
    form.addEventListener('submit', e => {
      e.preventDefault();
      SFX.init();
      let valid = true;
      $$('[required]', form).forEach(inp => {
        const errEl = $(`#err-${inp.id}`);
        const bad = !inp.value.trim() ||
          (inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value));
        inp.classList.toggle('err', bad);
        errEl?.classList.toggle('show', bad);
        if (bad) valid = false;
      });
      if (!valid) { SFX.err(); toast('<span class="hi">ERROR</span> CHECK HIGHLIGHTED FIELDS'); return; }
      SFX.win(); confetti(80);
      form.classList.add('hidden');
      const suc = $('#join-success');
      suc.classList.add('show');
      $('#join-name-out').textContent = $('#f-nick').value.trim().toUpperCase() || 'PLAYER 1';
      suc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('PLAYER CREATED — <span class="hi">WELCOME TO RNY!</span>');
    });
    form.addEventListener('input', e => {
      e.target.classList.remove('err');
      $(`#err-${e.target.id}`)?.classList.remove('show');
    });
  }

  /* -------------------- FLOAT DECOR PARALLAX -------------------- */
  function initParallax() {
    if (isTouch) return;
    const els = $$('[data-para]');
    if (!els.length) return;
    addEventListener('pointermove', e => {
      const rx = (e.clientX / innerWidth - .5), ry = (e.clientY / innerHeight - .5);
      els.forEach(el => {
        const f = parseFloat(el.dataset.para || '12');
        el.style.translate = `${rx * f}px ${ry * f}px`;
      });
    });
  }

  /* -------------------- BOOT -------------------- */
  function boot() {
    initTheme();
    initSoundToggle();
    initGlobalSfx();
    initWipes();
    initStartOverlay();
    initParticles();
    initTypewriter();
    initCounters();
    initReveal();
    initMeters();
    initNav();
    initKonami();
    initJoinForm();
    initParallax();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();

  return { SFX, toast, confetti };
})();
