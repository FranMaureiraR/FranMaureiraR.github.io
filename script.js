// ===== Scroll suave (Lenis) =====
// Si la librería no carga o la persona prefiere menos movimiento, se usa el scroll normal.
let lenis = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.Lenis && !reduceMotion) {
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  document.documentElement.style.scrollBehavior = 'auto';
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
const smoothTo = (target) => {
  if (lenis) lenis.scrollTo(target, { duration: 1.4 });
  else if (typeof target === 'number') window.scrollTo({ top: target, behavior: 'smooth' });
  else target.scrollIntoView({ behavior: 'smooth' });
};

// Enlaces dentro de la misma página (#work, #contact, índice lateral) con el mismo scroll suave
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  smoothTo(target);
  history.replaceState(null, '', link.getAttribute('href'));
});

// ===== Aparece suavemente cada bloque al entrar en pantalla =====
const pending = new Set(document.querySelectorAll('.reveal'));
function revealVisible() {
  const limit = window.innerHeight * 0.92;
  pending.forEach((el) => {
    if (el.getBoundingClientRect().top < limit) {
      el.classList.add('in');
      pending.delete(el);
    }
  });
}
window.addEventListener('scroll', revealVisible, { passive: true });
window.addEventListener('resize', revealVisible);
window.addEventListener('load', revealVisible);
revealVisible();

// ===== Botón "volver arriba" =====
const toTop = document.querySelector('.to-top');
if (toTop) {
  const toggle = () => toTop.classList.toggle('show', window.scrollY > 600);
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  toTop.addEventListener('click', () => smoothTo(0));
}

// ===== Índice lateral en las páginas de caso =====
const sections = [...document.querySelectorAll('.cs-sec[id]')];
if (sections.length) {
  const nav = document.createElement('nav');
  nav.className = 'cs-toc';
  nav.setAttribute('aria-label', 'On this page');
  nav.innerHTML = '<ul>' + sections.map((s) =>
    `<li><a href="#${s.id}"><span>${s.querySelector('h2').textContent}</span></a></li>`).join('') + '</ul>';
  document.body.appendChild(nav);
  const links = [...nav.querySelectorAll('a')];
  const mark = () => {
    let current = 0;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
  };
  window.addEventListener('scroll', mark, { passive: true });
  mark();
}

// ===== Featured work: el scroll vertical mueve los proyectos hacia el lado (solo en computador) =====
const work = document.querySelector('.featured');
const track = document.querySelector('.g-track');
if (work && track) {
  const desktop = window.matchMedia('(min-width: 801px)');
  const buttons = document.querySelectorAll('.gallery-arrows button');
  const PACE = 1.6; // cuánto scroll vertical hace falta por cada píxel horizontal (más alto = más lento)
  let distance = 0; // recorrido horizontal

  const layout = () => {
    if (desktop.matches) {
      distance = Math.max(0, track.scrollWidth - window.innerWidth);
      work.style.height = `${window.innerHeight + distance * PACE}px`;
    } else {
      distance = 0;
      work.style.height = '';
      track.style.transform = '';
    }
    move();
  };

  const progress = () => Math.min(distance, Math.max(0, (window.scrollY - work.offsetTop) / PACE));

  const move = () => {
    if (!desktop.matches) return;
    const p = progress();
    track.style.transform = `translate3d(${-p}px, 0, 0)`;
    if (buttons.length) {
      buttons[0].disabled = p <= 2;
      buttons[1].disabled = p >= distance - 2;
    }
  };

  // Las flechas avanzan un proyecto moviendo el scroll de la página
  buttons.forEach((b) => b.addEventListener('click', () => {
    const step = track.querySelector('.g-item').getBoundingClientRect().width + 28;
    const target = Math.min(distance, Math.max(0, progress() + step * Number(b.dataset.dir)));
    smoothTo(work.offsetTop + target * PACE);
  }));

  window.addEventListener('scroll', move, { passive: true });
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  desktop.addEventListener('change', layout);
  layout();
}

// ===== Componentes del mosaico (Mis Stocks y Saldos Bci) =====
// Escala cada componente para que quepa en su cuadro, manteniendo su diseño original.
const fits = [...document.querySelectorAll('.fit')];
const fitAll = () => {
  const scales = fits.map((el) => {
    const box = el.parentElement;
    return Math.min(1, (box.clientWidth * 0.86) / el.offsetWidth, (box.clientHeight * 0.84) / el.offsetHeight);
  });
  // En computador ambos usan la misma escala para que se vean del mismo tamaño
  // Cada componente usa su propia escala (Front, Bci y ETpay tienen proporciones distintas)
  fits.forEach((el, i) => {
    el.style.setProperty('--s', scales[i]);
    el.style.margin = `${-el.offsetHeight / 2}px 0 0 ${-el.offsetWidth / 2}px`; // centrado exacto
  });
};
if (fits.length) {
  new ResizeObserver(fitAll).observe(document.querySelector('.mosaic'));
  document.fonts?.ready.then(fitAll);
  fitAll();
}

const fmt = (n, dec = 0) => n.toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const countTo = (el, from, to, { dec = 0, prefix = '', ms = 900 } = {}) => {
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = prefix + fmt(from + (to - from) * e, dec);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const rs = document.querySelector('.rs');
if (rs && !reduceMotion) {
  const val = rs.querySelector('.rs-val'), diff = rs.querySelector('.rs-diff');
  const states = [[325230, -25371], [341870, 16640], [333512, 8282], [318904, -6326]];
  let i = 0;
  setInterval(() => {
    const from = states[i][0]; i = (i + 1) % states.length; const [v, d] = states[i];
    countTo(val, from, v, { prefix: '$' });
    diff.textContent = (d < 0 ? '-$' : '+$') + fmt(Math.abs(d));
    diff.classList.toggle('up', d > 0);
  }, 2600);
}

const bc = document.querySelector('.bc');
if (bc && !reduceMotion) {
  const tabs = [...bc.querySelectorAll('.bc-tabs span')], bar = bc.querySelector('.bc-bar');
  const main = bc.querySelector('.bc-main'), book = bc.querySelector('.bc-book'), hold = bc.querySelector('.bc-hold');
  const data = [
    { cur: 'CLP', main: 12480320, book: 12530320, hold: 50000, dec: 0 },
    { cur: 'USD', main: 8245.6, book: 8395.6, hold: 150, dec: 2 },
    { cur: 'EUR', main: 3120.45, book: 3120.45, hold: 0, dec: 2 },
  ];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % data.length; const d = data[i];
    tabs.forEach((t, j) => t.classList.toggle('on', j === i));
    bar.style.transform = `translateX(${i * 100}%)`;
    bc.classList.add('swap');
    setTimeout(() => {
      bc.querySelectorAll('.bc-cur').forEach((c) => (c.textContent = d.cur));
      book.textContent = fmt(d.book, d.dec); hold.textContent = fmt(d.hold, d.dec);
      bc.classList.remove('swap');
      countTo(main, d.main * 0.6, d.main, { dec: d.dec, ms: 800 });
    }, 250);
  }, 3000);
}

// ===== ETpay: el buscador escribe un banco y aparece su fila =====
const ep = document.querySelector('.ep');
if (ep) {
  const banks = [['Banco Estado', 'estado'], ['Banco Santander', 'santander'], ['Banco de Chile / Edwards', 'chile'], ['Banco Bci', 'bci'], ['Banco Itaú', 'itau'], ['Banco Falabella', 'falabella']];
  const search = ep.querySelector('.ep-search'), typed = ep.querySelector('.ep-typed');
  const row = ep.querySelector('.ep-bank'), logo = ep.querySelector('.ep-logo'), name = ep.querySelector('.ep-name');
  const show = ([n, c]) => { name.textContent = n; logo.className = 'ep-logo ' + c; row.classList.add('show'); };
  if (reduceMotion) { show(banks[0]); typed.textContent = 'Estado'; search.classList.add('typing'); }
  else {
    let b = 0;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    (async function loop() {
      for (;;) {
        const [n, c] = banks[b]; const q = n.replace(/^Banco (de )?/, '').split(' ')[0];
        search.classList.add('typing');
        for (let i = 1; i <= q.length; i++) { typed.textContent = q.slice(0, i); await wait(110); }
        show([n, c]); await wait(500);
        row.classList.add('pick'); await wait(1500);
        row.classList.remove('pick', 'show'); await wait(300);
        for (let i = q.length; i >= 0; i--) { typed.textContent = q.slice(0, i); await wait(35); }
        search.classList.remove('typing'); await wait(400);
        b = (b + 1) % banks.length;
      }
    })();
  }
}

// ===== My journey: arrastrar, flechas y avance automático la primera vez =====
const jScroll = document.querySelector('.j-scroll');
if (jScroll) {
  let down = false, startX = 0, startL = 0, moved = 0;
  jScroll.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return; // en touch se usa el scroll nativo
    down = true; moved = 0; startX = e.clientX; startL = jScroll.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX; moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) jScroll.classList.add('dragging');
    jScroll.scrollLeft = startL - dx;
  });
  window.addEventListener('pointerup', () => { down = false; jScroll.classList.remove('dragging'); });
  // Si fue un arrastre, no abrir el link que estaba debajo
  jScroll.addEventListener('click', (e) => { if (moved > 4) { e.preventDefault(); e.stopPropagation(); } }, true);
  jScroll.addEventListener('dragstart', (e) => e.preventDefault());

  const glide = (to, ms = 900) => {
    const from = jScroll.scrollLeft, t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / ms); jScroll.scrollLeft = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  document.querySelectorAll('.j-arrows button').forEach((btn) => btn.addEventListener('click', () => {
    glide(jScroll.scrollLeft + Number(btn.dataset.dir) * Math.min(420, jScroll.clientWidth * 0.8), 600);
  }));
  jScroll.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); glide(jScroll.scrollLeft + (e.key === 'ArrowRight' ? 380 : -380), 450); }
  });
  // La primera vez que aparece recorre la línea de tiempo hasta hoy (Front), como en un viaje
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { io.disconnect(); setTimeout(() => glide(jScroll.scrollWidth - jScroll.clientWidth, 2200), 300); }
    }, { threshold: 0.45 });
    io.observe(jScroll);
  }
}

// ===== Slides del header de cada caso: si hay más de uno, rotan solos =====
document.querySelectorAll('.cs-stage').forEach((stage) => {
  const slides = [...stage.querySelectorAll('.stage-slide')];
  if (slides.length < 2) return;
  stage.classList.add('rotating');
  const dots = document.createElement('div');
  dots.className = 'stage-dots';
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Show slide ${i + 1}`);
    b.addEventListener('click', () => { show(i); restart(); });
    dots.appendChild(b);
  });
  stage.after(dots);
  let cur = 0, timer;
  const show = (i) => {
    cur = i;
    slides.forEach((s, j) => s.classList.toggle('on', j === i));
    [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  };
  const restart = () => { clearInterval(timer); if (!reduceMotion) timer = setInterval(() => show((cur + 1) % slides.length), 4500); };
  show(0); restart();
});

// ===== Idioma: botón EN/ES arriba a la derecha =====
// Traduce cada texto buscando su versión en inglés en un diccionario:
// window.I18N_ES (i18n-es.js, páginas públicas) + <script id="i18n-page"> (dentro de cada caso de Front, cifrado).
(() => {
  const SEL = 'h1, h2, h3, p, li, dt, dd, figcaption, th, td, blockquote, label, .cs-chips span, .cs-steps div, .cs-stats span:not(.tbd), .cs-stats strong, .cs-cta span, .cs-pager span, .cs-pager strong, .nav a, .slot-label, .cs-toc a span, .contact .links a, .j-btn, .cv-tab, .ab-btn, .g-cat, .fp-cap, .ab-stats span, .ab-when, .ab-chips li';
  let dict = Object.assign({}, window.I18N_ES || {});
  const own = document.getElementById('i18n-page');
  if (own) { try { Object.assign(dict, JSON.parse(own.textContent)); } catch (e) {} }
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const skip = (el) => el.closest('.mosaic, .tbd, script, .lang-toggle');
  const attrs = ['alt', 'aria-label'];

  const apply = (lang) => {
    document.documentElement.lang = lang;
    document.querySelectorAll(SEL).forEach((el) => {
      if (skip(el)) return;
      if (lang === 'es') {
        const es = dict[norm(el.dataset.en ?? el.innerHTML)];
        if (es && el.dataset.en == null) { el.dataset.en = el.innerHTML; el.innerHTML = es; }
      } else if (el.dataset.en != null) { el.innerHTML = el.dataset.en; delete el.dataset.en; }
    });
    attrs.forEach((a) => document.querySelectorAll(`[${a}]`).forEach((el) => {
      if (el.closest('.lang-toggle')) return;
      const k = `en${a === 'alt' ? 'Alt' : 'Aria'}`;
      if (lang === 'es') { const es = dict[norm(el.getAttribute(a))]; if (es && el.dataset[k] == null) { el.dataset[k] = el.getAttribute(a); el.setAttribute(a, es); } }
      else if (el.dataset[k] != null) { el.setAttribute(a, el.dataset[k]); delete el.dataset[k]; }
    }));
    if (lang === 'es') { const t = dict[norm(document.title)]; if (t) { document.documentElement.dataset.enTitle = document.title; document.title = t; } }
    else if (document.documentElement.dataset.enTitle) document.title = document.documentElement.dataset.enTitle;
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.textContent = lang === 'es' ? 'EN' : 'ES';
      b.setAttribute('aria-label', lang === 'es' ? 'View in English' : 'Ver en español');
    });
  };

  let lang = 'en';
  try { lang = localStorage.getItem('fm-lang') || 'en'; } catch (e) {}
  if (lang === 'es') apply('es');
  document.querySelectorAll('.lang-toggle').forEach((b) => b.addEventListener('click', () => {
    lang = lang === 'es' ? 'en' : 'es';
    try { localStorage.setItem('fm-lang', lang); } catch (e) {}
    apply(lang);
  }));
})();

// ===== Mis Stocks del mosaico: los valores y porcentajes cambian solos =====
(() => {
  const sk = document.querySelector('.sk');
  if (!sk || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rows = [...sk.querySelectorAll('.sk-row')], sum = sk.querySelector('.sk-sum'), gain = sk.querySelector('.sk-gain');
  const base = [72.43, 24.10, 18.55, 12.42, 6.56];
  const money = (n) => 'US$' + n.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  setInterval(() => {
    let total = 0;
    rows.forEach((r, i) => {
      const ch = (Math.random() - 0.4) * 0.06, v = base[i] * (1 + ch); total += v;
      const pct = r.querySelector('.sk-pct'), up = ch >= 0;
      r.querySelector('.sk-val').textContent = money(v);
      pct.textContent = (up ? '↗ ' : '↘ ') + Math.abs(ch * 100 + (up ? 3 : 0)).toLocaleString('es-CL', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + '%';
      pct.classList.toggle('up', up);
    });
    sum.textContent = money(total);
    const g = (total / 128.0 - 1) * 100;
    gain.textContent = (g >= 0 ? '↗ ' : '↘ ') + Math.abs(g).toLocaleString('es-CL', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + '%';
    gain.classList.toggle('up', g >= 0);
  }, 2600);
})();

// ===== Reproductor de flujo (.fp): pasa las pantallas solo, mueve el cursor y hace clic donde corresponde =====
document.querySelectorAll('.fp').forEach((fp) => {
  const shots = [...fp.querySelectorAll('.fp-shot')], steps = [...fp.querySelectorAll('.fp-step')];
  const cursor = fp.querySelector('.fp-cursor'), capbox = fp.querySelector('.fp-capbox');
  const btnPlay = fp.querySelector('[data-fp="play"]');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = (i) => +(shots[i].dataset.d || 5200);
  let cur = -1, timer = null, clickT = null, paused = calm;
  const pauseIcon = '<svg viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10" rx="1"/><rect x="8" y="2" width="3" height="10" rx="1"/></svg>';
  const playIcon = '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M4 2.5v9l7-4.5z"/></svg>';
  const setBtn = () => { if (!btnPlay) return; btnPlay.innerHTML = paused ? playIcon : pauseIcon; btnPlay.setAttribute('aria-label', paused ? 'Play' : 'Pause'); fp.classList.toggle('paused', paused); };
  const show = (i) => {
    cur = (i + shots.length) % shots.length;
    shots.forEach((s, j) => s.classList.toggle('on', j === cur));
    steps.forEach((s, j) => { s.classList.toggle('on', j === cur); s.classList.toggle('done', j < cur); s.setAttribute('aria-current', j === cur ? 'step' : 'false'); });
    fp.style.setProperty('--d', dur(cur) + 'ms');
    // Reinicia la barra de progreso del paso actual
    const bar = steps[cur] && steps[cur].querySelector('i'); if (bar) { bar.style.display = 'none'; void bar.offsetWidth; bar.style.display = ''; }
    if (capbox) capbox.innerHTML = `<b>${cur + 1}/${shots.length}</b>` + steps[cur].querySelector('.fp-cap').innerHTML;
    const s = shots[cur];
    if (cursor) {
      if (s.dataset.x) { cursor.classList.remove('hide'); cursor.style.left = s.dataset.x + '%'; cursor.style.top = s.dataset.y + '%'; }
      else cursor.classList.add('hide');
      cursor.classList.remove('click'); clearTimeout(clickT);
      if (s.dataset.click !== undefined && !calm) clickT = setTimeout(() => { cursor.classList.add('click'); }, dur(cur) - 900);
    }
    clearTimeout(timer);
    if (!paused) timer = setTimeout(() => show(cur + 1), dur(cur));
  };
  steps.forEach((s, j) => s.addEventListener('click', () => show(j)));
  fp.querySelector('[data-fp="prev"]')?.addEventListener('click', () => show(cur - 1));
  fp.querySelector('[data-fp="next"]')?.addEventListener('click', () => show(cur + 1));
  btnPlay?.addEventListener('click', () => { paused = !paused; setBtn(); show(cur); });
  // Solo corre cuando está en pantalla
  if ('IntersectionObserver' in window) {
    let started = false;
    new IntersectionObserver((en) => en.forEach((e) => {
      if (e.isIntersecting && !started) { started = true; show(0); }
      else if (!e.isIntersecting && started && !paused) { clearTimeout(timer); }
      else if (e.isIntersecting && started && !paused) { clearTimeout(timer); timer = setTimeout(() => show(cur + 1), dur(cur)); }
    }), { threshold: 0.3 }).observe(fp);
  } else show(0);
  setBtn();
  // Al cambiar de idioma, el texto del paso actual se actualiza
  document.querySelectorAll('.lang-toggle').forEach((b) => b.addEventListener('click', () => setTimeout(() => { if (cur >= 0 && capbox) capbox.innerHTML = `<b>${cur + 1}/${shots.length}</b>` + steps[cur].querySelector('.fp-cap').innerHTML; }, 0)));
});
