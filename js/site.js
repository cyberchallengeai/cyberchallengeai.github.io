// ACDX site — split-flaps, word reveals, flashes, agent loop, detection-box cursor, Game of Life. No dependencies.
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = (n, w) => String(n).padStart(w, '0');
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- glider ---------- */
  const GL = [[0,1,0,0,0,1,1,1,1],[1,0,1,0,1,1,0,1,0],[0,0,1,1,0,1,0,1,1],[1,0,0,0,1,1,1,1,0]];
  const gliders = $$('[data-glider]');
  gliders.forEach((g) => { g.innerHTML = '<i></i>'.repeat(9); g.classList.add('glider'); });
  let gph = 0;
  setInterval(() => { gph++; gliders.forEach((g) => [...g.children].forEach((c, i) => c.classList.toggle('on', !!GL[gph % 4][i]))); }, 470);

  /* ---------- split flap ---------- */
  const GLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function flapSet(el, text, { green = () => false, instant = false, stagger = 45, spins = 6 } = {}) {
    const chars = [...text];
    while (el.children.length < chars.length) el.appendChild(Object.assign(document.createElement('div'), { className: 'c' }));
    while (el.children.length > chars.length) el.lastChild.remove();
    chars.forEach((ch, i) => {
      const c = el.children[i];
      const done = () => { c.textContent = ch === ' ' ? ' ' : ch; c.className = 'c' + (green(i, ch) ? ' g' : ''); };
      if (instant || RM || ch === ' ' || c.dataset.v === ch) { c.dataset.v = ch; done(); return; }
      c.dataset.v = ch;
      const pool = /\d/.test(ch) ? '0123456789' : GLY;
      let k = 0;
      setTimeout(function step() {
        if (c.dataset.v !== ch) return;
        if (k++ >= spins) return done();
        c.className = 'c f';
        c.innerHTML = pool[Math.floor(Math.random() * pool.length)] + '<i class="leaf"></i>';
        const leaf = c.firstElementChild;
        if (leaf) leaf.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: 60 });
        setTimeout(step, 62);
      }, i * stagger);
    });
  }
  $$('.flap[data-flap]').forEach((el) => flapSet(el, el.dataset.flap, { instant: true, green: () => el.closest('.stats') == null && false }));

  /* ---------- hero: counter, waveform, ruler, timecode, ticker ---------- */
  const cnt = $('#cnt');
  const SEQ = ['0001', '0004', '0008', '0064', '0412', '1024', '2048', '4096', '9999', '∞∞∞∞'];
  let si = 0;
  const greenDigits = (v) => (i) => v.includes('∞') || i >= 4 - String(parseInt(v, 10)).length;
  setInterval(() => { si = Math.min(si + 1, SEQ.length - 1); flapSet(cnt, SEQ[si], { green: greenDigits(SEQ[si]) }); if (si === SEQ.length - 1) setTimeout(() => { si = 0; }, 6000); }, 2100);
  flapSet(cnt, SEQ[0], { instant: true, green: greenDigits(SEQ[0]) });

  const wave = $('[data-wave]');
  if (wave) { wave.innerHTML = '<i></i>'.repeat(44); }
  const ruler = $('[data-ruler]');
  if (ruler) { let h = ''; for (let y = 0; y < 1400; y += 12) h += `<i style="top:${y}px;width:${(y / 12) % 5 ? 7 : 14}px"></i>`; ruler.innerHTML = h; }
  const tc = $('#tc');
  const t0 = performance.now();
  function heroTick(now) {
    const t = (now - t0) / 1000;
    if (tc) { const f = Math.floor(t * 24), s = Math.floor(f / 24); tc.textContent = `${pad(Math.floor(s / 3600), 2)}:${pad(Math.floor(s / 60) % 60, 2)}:${pad(s % 60, 2)}:${pad(f % 24, 2)}`; }
    if (wave && !RM) [...wave.children].forEach((b, i) => { b.style.height = `${2 + 20 * Math.abs(Math.sin(t * 3.1 + i * .55) * hash(Math.floor(t * 8) + i))}px`; });
    if (ruler && !RM) ruler.style.transform = `translateY(${-(t * 20 % 60)}px)`;
    requestAnimationFrame(heroTick);
  }
  requestAnimationFrame(heroTick);

  const ticker = $('#ticker');
  function tickerHTML(k) {
    const tok = 1204332118 + Math.floor(k * 91374);
    const s = [`TOKENS QUEMADOS ${tok.toLocaleString('es-ES')} <b>▲</b>`, 'HUMANOS TECLEANDO: 0', `AGENTES ONLINE ${pad(412 + (k % 3000), 4)}`,
      `FLAGS ${pad(3882 + Math.floor(k / 3), 5)} <b>▲</b>`, '€/FLAG 0,04 <b>▼</b>', 'KIMI K2.6 <b>▲</b>', 'QWEN3 <b>▲</b>', 'GLM-5 <b>▲</b>', 'MISTRAL <b>▲</b>',
      'KEVIN-8B <b>▲</b> 31,0%', 'CAJAS NEGRAS: 0', 'TEMPORADA 26/27', 'STOP TYPING → ORCHESTRATE', 'LICENCIA: APACHE 2.0', "DON'T PLAY → <b>DEPLOY</b>"].join('  ●  ') + '  ●  ';
    return s + s;
  }
  if (ticker) { let k = 0; ticker.innerHTML = tickerHTML(0); setInterval(() => { k += 7; ticker.innerHTML = tickerHTML(k); }, 1000); }

  /* ---------- header solid on scroll ---------- */
  const hdr = $('#top');
  addEventListener('scroll', () => hdr.classList.toggle('solid', scrollY > 40), { passive: true });

  /* ---------- word reveal + flash + section-enter effects ---------- */
  $$('.reveal-words').forEach((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) frag.append(p);
            else frag.append(Object.assign(document.createElement('span'), { className: 'wd', textContent: p }));
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('strike')) walk(n);
        else if (n.nodeType === 1) n.classList.add('wd');
      });
    };
    walk(el);
    $$('.wd', el).forEach((w, i) => { w.style.transitionDelay = `${i * 90}ms`; });
  });
  const flashEl = $('#flash');
  const flash = () => { if (RM) return; flashEl.classList.remove('on'); void flashEl.offsetWidth; flashEl.classList.add('on'); };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    if (el.hasAttribute('data-flash') && !el.dataset.flashed) { el.dataset.flashed = 1; flash(); }
    if (el.classList.contains('stats')) $$('.flap', el).forEach((f, i) => setTimeout(() => flapSet(f, f.dataset.flap, { green: () => true }), i * 200));
    if (el.id === 'unis') lightNodes();
    if (el.classList.contains('board')) boardIn(el);
    io.unobserve(el);
  }), { threshold: .25 });
  $$('.reveal-words, [data-flash], .stats, #unis, .board').forEach((el) => io.observe(el));

  /* ---------- eras board (manifesto) ---------- */
  const ERAS = [['1769', 'VAPOR       '], ['1882', 'ELECTRICIDAD'], ['1971', 'SILICIO     '], ['2026', 'AGENTES     ']];
  const eras = $('#eras');
  if (eras) {
    const [fy, fw] = $$('.flap', eras);
    let ei = 0, running = false;
    const step = () => { ei = (ei + 1) % ERAS.length; const g = ei === 3; flapSet(fy, ERAS[ei][0], { green: () => g, stagger: 70, spins: 8 }); flapSet(fw, ERAS[ei][1], { green: () => g, stagger: 35 }); };
    new IntersectionObserver((es) => { if (es[0].isIntersecting && !running) { running = true; setInterval(step, 2200); } }, { threshold: .3 }).observe(eras);
  }

  /* ---------- agent loop + log ---------- */
  const nodes = $$('#loop .node'), iterEl = $('#iter'), term = $('#term');
  const LOG = [
    ['g', '$ acdx deploy --agent kevin-8b --arena 01'],
    ['', '[+] entorno aislado listo · presupuesto €2,00'],
    ['', '[reason]  leyendo el enunciado del reto web-07…'],
    ['', '[reason]  plan: 3 hipótesis, empiezo por la más barata'],
    ['', '[execute] tool_call #01 · respuesta 200 · 1,2 kB'],
    ['', '[observe] pista encontrada en la respuesta'],
    ['', '[reason]  descarto hipótesis 2 · ajusto estrategia'],
    ['', '[execute] tool_call #02 · respuesta 200 · 0,4 kB'],
    ['', '[observe] el patrón coincide · confianza 0,93'],
    ['', '[execute] tool_call #03'],
    ['g', '[✓] FLAG capturada · 00:04.12 · €0,04'],
    ['', '    humanos que tocaron el teclado: 0'],
  ];
  let li = 0, it = 0, act = 0, logTxt = [];
  function loopStep() {
    nodes.forEach((n, i) => n.classList.toggle('on', i === act));
    act = (act + 1) % 4;
    if (act === 0) { it++; if (iterEl) iterEl.textContent = pad(it, 4); }
  }
  function logStep() {
    if (!term) return;
    if (li >= LOG.length) { li = 0; logTxt = []; }
    const [cls, line] = LOG[li++];
    logTxt.push(cls ? `<span class="g">${line}</span>` : line);
    term.innerHTML = logTxt.slice(-12).join('\n') + '\n<span class="cur"></span>';
  }
  let loopOn = false;
  if (nodes.length) new IntersectionObserver((es) => { if (es[0].isIntersecting && !loopOn) { loopOn = true; setInterval(loopStep, 470); setInterval(logStep, 700); } }, { threshold: .2 }).observe($('#como'));

  /* ---------- university nodes ---------- */
  function lightNodes() {
    const unis = $$('#unis .uni:not(.uni-next)');
    const nf = $('#nodes');
    unis.forEach((u, i) => setTimeout(() => { u.classList.add('on'); flapSet(nf, pad(i + 1, 2), { green: () => true, spins: 3 }); }, 150 + i * 160));
  }

  /* ---------- league board rows ---------- */
  $$('.board .ln').forEach((ln) => { const f = document.createElement('div'); f.className = 'flap row'; ln.appendChild(f); flapSet(f, ' '.repeat(ln.dataset.row.length), { instant: true }); });
  function boardIn(b) { $$('.ln', b).forEach((ln, i) => setTimeout(() => flapSet(ln.firstChild, ln.dataset.row, { green: (j) => j < 2 || ln.dataset.row.includes('TU EQUIPO'), stagger: 25 }), i * 260)); }

  /* ---------- barcodes ---------- */
  $$('[data-bc]').forEach((el) => {
    let h = 0; for (const ch of el.dataset.bc) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let s = '';
    for (let i = 0; i < 60; i++) { h = (h * 1103515245 + 12345) >>> 0; s += `<i style="width:${1 + (h >>> 28) % 4}px;margin-right:${1 + (h >>> 24) % 3}px"></i>`; }
    el.innerHTML = s;
  });

  /* ---------- film ---------- */
  const film = $('#film'), fv = $('#filmv');
  $('#play')?.addEventListener('click', () => { film.classList.add('playing'); fv.controls = true; fv.play(); flash(); });

  /* ---------- detection-box cursor ---------- */
  const cur = $('#cursor');
  if (matchMedia('(pointer: fine)').matches && !RM) {
    const lab = $('.lab', cur);
    let tx = 0, ty = 0, tw = 28, th = 28, x = 0, y = 0, w = 28, h = 28, target = null;
    addEventListener('mousemove', (e) => {
      const el = e.target.closest('[data-box], a, button, summary');
      target = el;
      if (el && el.hasAttribute('data-box')) {
        const r = el.getBoundingClientRect();
        tx = r.left - 6; ty = r.top - 6; tw = r.width + 12; th = r.height + 12;
        lab.textContent = el.dataset.box; cur.classList.add('boxed');
      } else {
        const s = el ? 40 : 28; tx = e.clientX - s / 2; ty = e.clientY - s / 2; tw = th = s; cur.classList.remove('boxed');
      }
    }, { passive: true });
    addEventListener('scroll', () => { if (target && target.hasAttribute('data-box')) { const r = target.getBoundingClientRect(); tx = r.left - 6; ty = r.top - 6; } }, { passive: true });
    (function loop() { x += (tx - x) * .25; y += (ty - y) * .25; w += (tw - w) * .25; h += (th - h) * .25; cur.style.transform = `translate(${x}px,${y}px)`; cur.style.width = w + 'px'; cur.style.height = h + 'px'; requestAnimationFrame(loop); })();
  }

  /* ---------- grain ---------- */
  const gc = $('#grain'), gx = gc.getContext('2d');
  function grain() {
    const img = gx.createImageData(gc.width, gc.height), d = img.data;
    for (let p = 0; p < d.length; p += 4) { const v = Math.random() * 255; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
    gx.putImageData(img, 0, 0);
  }
  grain(); if (!RM) setInterval(grain, 83);

  /* ---------- Game of Life (CTA background) ---------- */
  const lc = $('#life');
  if (lc) {
    const C = 14, ctx = lc.getContext('2d');
    let cols, rows, grid;
    const seedGlider = (g, x, y) => [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([dx, dy]) => { g[((y + dy) % rows) * cols + ((x + dx) % cols)] = 1; });
    function resize() {
      lc.width = lc.offsetWidth; lc.height = lc.offsetHeight; cols = Math.ceil(lc.width / C); rows = Math.ceil(lc.height / C);
      grid = new Uint8Array(cols * rows);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < .08 ? 1 : 0;
      for (let k = 0; k < 14; k++) seedGlider(grid, Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
    }
    function step() {
      const n = new Uint8Array(cols * rows);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) s += grid[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
        const a = grid[y * cols + x]; n[y * cols + x] = (a && (s === 2 || s === 3)) || (!a && s === 3) ? 1 : 0;
      }
      grid = n;
      if (Math.random() < .08) seedGlider(grid, Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
    }
    function draw() {
      ctx.clearRect(0, 0, lc.width, lc.height); ctx.fillStyle = '#00ef00';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (grid[y * cols + x]) ctx.fillRect(x * C + 1, y * C + 1, C - 2, C - 2);
    }
    resize(); draw(); addEventListener('resize', resize);
    let lifeOn = false;
    new IntersectionObserver((es) => { lifeOn = es[0].isIntersecting; }).observe(lc);
    if (!RM) setInterval(() => { if (lifeOn) { step(); draw(); } }, 140);
  }

  window.ACDX = { flapSet, flash, RM, hash };

  /* ---------- boot ---------- */
  const boot = $('#boot'), bl = $('#bootlog');
  const kill = () => { boot.classList.add('gone'); flash(); setTimeout(() => boot.remove(), 400); };
  let seen = false; try { seen = sessionStorage.getItem('acdx-boot') === '1'; sessionStorage.setItem('acdx-boot', '1'); } catch (e) {}
  if (RM || seen) { boot.remove(); }
  else {
    const L = ['> acdx init --season 26/27', '[+] cargando manifiesto e/acc ............ ok', '[+] modelos de pesos abiertos .............. ok',
      '[+] nodos universitarios .................. 11', '[+] humanos tecleando ...................... 0', "> don't play. deploy."];
    let i = 0;
    const iv = setInterval(() => { bl.textContent += (i ? '\n' : '') + L[i]; if (++i >= L.length) { clearInterval(iv); setTimeout(kill, 500); } }, 190);
    boot.addEventListener('click', () => { clearInterval(iv); kill(); });
  }
})();
