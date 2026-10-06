// SPIN-UP (scroll: 1 face -> thousands of clones -> Game of Life made of faces), the arsenal loadout builder, and the 128 BPM sound toggle.
(() => {
  const { flapSet, flash, RM, hash } = window.ACDX;
  const $ = (s) => document.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const BEAT = 60 / 128;
  let beatAt = -1e9;                       // performance.now() of the last beat (sound on)

  /* ================= SPIN-UP ================= */
  const sec = $('#spinup'), cv = $('#spin');
  if (sec && cv) {
    const ctx = cv.getContext('2d');
    const cnt = $('#spincnt'), line = $('#spinline'), hint = $('#spinhint');
    const N = 12, T = 384, TS = 64;
    const atlas = new Image(), lead = new Image();
    atlas.src = 'img/spin/atlas.jpg'; lead.src = 'img/spin/lead.jpg';
    // four atlases: big/small × plain/green (green = multiply-tinted + edge), baked once so frames are just drawImage calls
    const mk = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
    const big = mk(N * T, T), bigG = mk(N * T, T), small = mk(N * TS, TS), smallG = mk(N * TS, TS);
    let ready = false;
    function tint(dst, srcC, S) {
      const g = dst.getContext('2d');
      g.drawImage(srcC, 0, 0);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#00ef00'; g.globalAlpha = .7; g.fillRect(0, 0, dst.width, dst.height);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.strokeStyle = '#00ef00'; g.lineWidth = Math.max(1, S / 48);
      for (let i = 0; i < N; i++) g.strokeRect(i * S + g.lineWidth / 2, g.lineWidth / 2, S - g.lineWidth, S - g.lineWidth);
    }
    atlas.onload = () => {
      big.getContext('2d').drawImage(atlas, 0, 0);
      small.getContext('2d').drawImage(atlas, 0, 0, N * TS, TS);
      tint(bigG, big, T); tint(smallG, small, TS); ready = true;
    };
    let W = 0, H = 0, dpr = 1;
    const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
    resize(); addEventListener('resize', () => { resize(); gol = null; });

    const tsEnd = () => Math.max(8, Math.sqrt(W * H / 4300));   // final tile so the mosaic passes 4,096 clones on any screen
    const P1 = .76;                                   // end of the zoom-out, start of Life
    const h2 = (c, r, s = 0) => hash(c * 73.13 + r * 151.7 + s * 19.3);
    let gol = null, golCols = 0, golRows = 0, golC0 = 0, golR0 = 0, lastStep = 0;
    const seedGlider = (cx, cy) => {
      const sx = Math.random() < .5 ? 1 : -1, sy = Math.random() < .5 ? 1 : -1;
      [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([dx, dy]) => {
        const x = (cx + sx * (dx - 1) + golCols) % golCols, y = (cy + sy * (dy - 1) + golRows) % golRows;
        gol[y * golCols + x] = 1;
      });
    };
    function golInit(c0, c1, r0, r1) {
      golC0 = c0; golR0 = r0; golCols = c1 - c0 + 1; golRows = r1 - r0 + 1;
      gol = new Uint8Array(golCols * golRows);
      for (let i = 0; i < gol.length; i++) gol[i] = Math.random() < .14 ? 1 : 0;
      for (let k = 0; k < 18; k++) seedGlider(Math.floor(Math.random() * golCols), Math.floor(Math.random() * golRows));
    }
    function golStep() {
      const n = new Uint8Array(gol.length);
      for (let y = 0; y < golRows; y++) for (let x = 0; x < golCols; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) s += gol[((y + dy + golRows) % golRows) * golCols + ((x + dx + golCols) % golCols)];
        const a = gol[y * golCols + x];
        n[y * golCols + x] = (a && (s === 2 || s === 3)) || (!a && s === 3) ? 1 : 0;
      }
      gol = n;
      if (Math.random() < .25) seedGlider(Math.floor(Math.random() * golCols), Math.floor(Math.random() * golRows));
    }

    const MS = [1, 8, 64, 412, 4096];
    let shownCnt = '', lastCntT = 0, shownLine = '';
    function setCounter(v, now) {
      const s = v === Infinity ? '∞∞∞∞' : String(Math.min(9999, v)).padStart(4, '0');
      if (s === shownCnt || now - lastCntT < 110) return;
      shownCnt = s; lastCntT = now;
      flapSet(cnt, s, { green: (i) => v === Infinity || i >= 4 - String(Math.min(9999, v)).length, spins: 2, stagger: 12 });
    }
    function setLine(html, hintTxt) { if (html !== shownLine) { shownLine = html; line.innerHTML = html; hint.textContent = hintTxt; } }

    function corners(x, y, w, h, col, lab) {
      const k = Math.max(8, Math.min(28, w * .18));
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
      ctx.moveTo(x + w - k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + k);
      ctx.moveTo(x, y + h - k); ctx.lineTo(x, y + h); ctx.lineTo(x + k, y + h);
      ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
      ctx.stroke();
      if (lab) {
        ctx.font = '600 12px Mono, monospace'; const tw = ctx.measureText(lab).width + 12;
        ctx.fillStyle = col; ctx.fillRect(x, y - 22, tw, 18); ctx.fillStyle = '#000'; ctx.fillText(lab, x + 6, y - 9);
      }
    }

    let visible = false;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }, { rootMargin: '100px' }).observe(sec);

    function frame(now) {
      if (!visible) return;
      const t = now / 1000;
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      const pz = ease(clamp(p / P1));
      const minTs = tsEnd();
      const ts = Math.exp(Math.log(Math.max(W, H) * 1.12) + (Math.log(minTs) - Math.log(Math.max(W, H) * 1.12)) * pz);
      const gap = ts > 140 ? ts * .012 : Math.max(1, ts * .07);
      const beat = clamp(1 - (now - beatAt) / 180);
      const lifeK = clamp((p - P1) / .05);           // 0 → 1 as Life takes over

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (!ready) { requestAnimationFrame(frame); return; }

      const cx = W / 2, cy = H / 2;
      const c0 = -Math.ceil(cx / ts + .5), c1 = Math.ceil(cx / ts + .5), r0 = -Math.ceil(cy / ts + .5), r1 = Math.ceil(cy / ts + .5);
      if (lifeK > 0 && !gol) golInit(c0, c1, r0, r1);
      if (lifeK === 0 && gol && p < P1 - .02) gol = null;
      if (gol && lifeK > 0 && now - lastStep > 115 && !RM) { golStep(); lastStep = now; }

      const activeFrac = .04 + .32 * clamp((pz - .15) / .85);
      const useSmall = ts <= 72, S = useSmall ? TS : T, P = useSmall ? small : big, G = useSmall ? smallG : bigG;
      const sz = ts - gap;
      let count = 0;
      const dead = [], plain = [], green = [];
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const x = cx + cc * ts - ts / 2, y = cy + rr * ts - ts / 2;
        if (x > W || y > H || x + ts < 0 || y + ts < 0) continue;
        count++;
        let f = cc === 0 && rr === 0 ? 0 : Math.floor(h2(cc, rr) * N);
        if ((t * .55 + h2(cc, rr, 1)) % 1 < .05) f = 3;          // the clones wink
        if (gol) {
          const gx = cc - golC0, gy = rr - golR0;
          const live = gx >= 0 && gy >= 0 && gx < golCols && gy < golRows ? gol[gy * golCols + gx] : 0;
          (live ? (lifeK > .5 ? green : plain) : dead).push(x, y, f);
        } else {
          const act = h2(cc, rr, Math.floor(t * 1.6)) < activeFrac && !(cc === 0 && rr === 0 && ts > 200);
          (act ? green : plain).push(x, y, f);
        }
      }
      const draw = (arr, img) => { for (let i = 0; i < arr.length; i += 3) ctx.drawImage(img, arr[i + 2] * S, 0, S, S, arr[i], arr[i + 1], sz, sz); };
      if (dead.length) { ctx.globalAlpha = 1 - .88 * lifeK; draw(dead, P); ctx.globalAlpha = 1; }
      if (ts > 380 && lead.complete && !gol) {               // the original, sharp, while she is big
        const lx = cx - ts / 2, ly = cy - ts / 2;
        for (let i = 0; i < plain.length; i += 3) if (Math.abs(plain[i] - lx) < 1 && Math.abs(plain[i + 1] - ly) < 1) { plain.splice(i, 3); break; }
        ctx.drawImage(lead, lx, ly, sz, sz);
      }
      draw(plain, P);
      ctx.globalAlpha = 1; draw(green, G);
      if (beat > 0 && green.length) { ctx.globalAlpha = .5 * beat; draw(green, G); ctx.globalAlpha = 1; }
      // the original, always tracked
      if (ts > 34 && lifeK < 1) corners(cx - sz / 2 + 6, cy - sz / 2 + 6, sz - 12, sz - 12, '#00ef00', ts > 90 ? 'BUILDER 01 · ORIGINAL · 0.97' : '');
      if (beat > 0) { ctx.fillStyle = `rgba(0,239,0,${.06 * beat})`; ctx.fillRect(0, 0, W, H); }

      if (lifeK > 0) {
        setCounter(Infinity, now);
        setLine('Todos tú<span class="g">.</span><br>A la vez<span class="g">.</span>', 'click = deploy un glider');
      } else {
        setCounter(count, now);
        const m = MS.filter((v) => v <= count).pop() || 1;
        setLine(m === 1 ? '1 humano<span class="g">.</span>' : `${m.toLocaleString('es-ES')} agentes<span class="g">.</span>`, m === 1 ? 'scroll ↓ para hacer fork' : 'fork · fork · fork');
      }
      requestAnimationFrame(frame);
    }

    cv.addEventListener('click', (e) => {
      if (!gol) return;
      const r = cv.getBoundingClientRect();
      const minTs = tsEnd();
      const cc = Math.round((e.clientX - r.left - W / 2) / minTs), rr = Math.round((e.clientY - r.top - H / 2) / minTs);
      seedGlider(((cc - golC0) % golCols + golCols) % golCols, ((rr - golR0) % golRows + golRows) % golRows);
      flash();
    });
  }

  /* ================= platform screen: tilted, straightens as you scroll ================= */
  const scr = document.querySelector('.screen');
  if (scr && !RM) {
    const upd = () => {
      const r = scr.getBoundingClientRect(), k = clamp(1 - (r.top - innerHeight * .15) / (innerHeight * .75));
      scr.style.setProperty('--rx', `${(1 - k) * 22}deg`); scr.style.setProperty('--sc', String(.9 + .1 * k));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ================= ARSENAL: loadout builder ================= */
  const MODELS = {
    kimi: { slug: 'kimi-k2.6', sizes: [['1T', 1000]], def: 0, lic: 'MIT modificada' },
    qwen: { slug: 'qwen3', sizes: [['8B', 8], ['32B', 32], ['235B', 235]], def: 1, lic: 'Apache 2.0' },
    glm: { slug: 'glm-5', sizes: [['744B', 744]], def: 0, lic: 'MIT' },
    mistral: { slug: 'mistral-small-3', sizes: [['24B', 24]], def: 0, lic: 'Apache 2.0' },
  };
  const arms = document.querySelectorAll('.arm');
  if (arms.length) {
    const st = { m: 'kimi', s: 0, q: 4, a: 64 };
    const sizes = $('#sizes'), vram = $('#vram'), fits = $('#fits'), cmd = $('#cmd');
    const tier = (gb) => gb <= 16 ? 'Cabe en <b>1 GPU de 16 GB</b>. La del portátil gamer.' : gb <= 24 ? 'Cabe en <b>1 GPU de 24 GB</b>. La prestada del taller.'
      : gb <= 48 ? 'Pide <b>2 GPU de 24 GB</b>. Bridas incluidas.' : gb <= 80 ? 'Cabe en <b>1 GPU de 80 GB</b>. Hierro de verdad.'
      : gb <= 160 ? 'Pide <b>2 GPU de 80 GB</b>. Ya hablamos de racks.' : 'Necesitas <b>un rack entero</b>. O cuantizar más.';
    function render() {
      const M = MODELS[st.m], [lab, params] = M.sizes[st.s];
      const gb = Math.round(params * st.q / 8);
      flapSet(vram, String(gb).padStart(3, '0'), { green: () => true, spins: 4, stagger: 40 });
      fits.innerHTML = tier(gb);
      cmd.textContent = `$ acdx deploy --model ${M.slug}-${lab.toLowerCase().replace(/\s+/g, '-')} --quant ${st.q}bit --agents ${st.a}\n[+] ${st.a} ${st.a === 1 ? 'agente' : 'agentes'} · 1 modelo compartido · licencia ${M.lic}\n[+] humanos en el teclado: 0`;
    }
    function renderSizes() {
      const M = MODELS[st.m];
      sizes.innerHTML = M.sizes.map(([l], i) => `<button data-s="${i}" class="${i === st.s ? 'on' : ''}">${l}</button>`).join('');
    }
    arms.forEach((b) => b.addEventListener('click', () => {
      arms.forEach((x) => x.classList.toggle('on', x === b));
      st.m = b.dataset.m; st.s = MODELS[st.m].def; renderSizes(); render();
    }));
    sizes.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.s = +b.dataset.s; renderSizes(); render(); });
    $('#quant').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.q = +b.dataset.q; [...b.parentNode.children].forEach((x) => x.classList.toggle('on', x === b)); render(); });
    $('#agents').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; st.a = +b.dataset.a; [...b.parentNode.children].forEach((x) => x.classList.toggle('on', x === b)); render(); });
    renderSizes(); render();
  }

  /* ================= SOUND: the film's song, the page pulses at 128 BPM ================= */
  const snd = $('#snd'), song = $('#song');
  if (snd && song) {
    let lastBeat = -1;
    snd.addEventListener('click', () => {
      if (song.paused) { song.play(); snd.setAttribute('aria-pressed', 'true'); snd.querySelector('.t').textContent = 'Sonido on'; flash(); }
      else { song.pause(); snd.setAttribute('aria-pressed', 'false'); snd.querySelector('.t').textContent = 'Sonido off'; }
    });
    (function tick() {
      if (!song.paused) {
        const b = Math.floor((song.currentTime - .025) / BEAT);
        if (b !== lastBeat) {
          lastBeat = b; beatAt = performance.now();
          if (!RM) { document.body.classList.add('beat'); setTimeout(() => document.body.classList.remove('beat'), 110); }
        }
      }
      requestAnimationFrame(tick);
    })();
  }
})();
