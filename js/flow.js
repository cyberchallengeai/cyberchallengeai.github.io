// Agent-flow viewer: live recreation of the platform's flow diagram (serpentine boxes + bezier edges; the camera follows
// the newest step; click a box to read it). Abstract example run, focused on agent engineering.
(() => {
  const host = document.getElementById('af-canvas'); if (!host) return;
  const { flash, RM } = window.ACDX;
  const inner = document.getElementById('af-inner'), svg = document.getElementById('af-edges');
  const elStep = document.getElementById('af-step'), elCost = document.getElementById('af-cost');
  const dKind = document.getElementById('af-kind'), dTitle = document.getElementById('af-title'), dBody = document.getElementById('af-body');
  const C = { prompt: '#6e6e6a', llm: '#f2f2ee', act: '#5fd35f', flag: '#00ef00', ev: '#3a3a37' };
  const KIND = { prompt: 'Prompt', llm: 'Respuesta del modelo', act: 'Acción del agente', flag: 'Flag capturada', ev: 'Evento' };
  const STEPS = [
    ['ev', 'Agente desplegado', 'presupuesto €2,00 · 60 pasos', { Evento: 'Entorno aislado listo.\nModelo: Nemotron 3 Nano · presupuesto €2,00.' }],
    ['prompt', 'Enunciado del reto', 'reto 07 · dificultad media', { Prompt: 'Encuentra la flag del reto 07.\nTienes herramientas y un presupuesto limitado.' }],
    ['llm', 'Plan inicial', '3 hipótesis · orden por coste', { Razonamiento: 'Primero entender, luego actuar.\nOrdeno tres hipótesis de la más barata a la más cara.', 'Siguiente paso': 'Reunir contexto con la herramienta más barata.' }],
    ['act', 'tool_call #01', 'reunir contexto', { 'Acción': 'tool_call #01 · modo lectura', 'Resultado': 'Contexto obtenido · 1,2 kB' }],
    ['llm', 'Analiza resultado', 'la hipótesis A gana peso', { Razonamiento: 'El resultado encaja con la hipótesis A.\nDescarto C por coste: no compensa todavía.' }],
    ['act', 'tool_call #02', 'probar hipótesis A', { 'Acción': 'tool_call #02', 'Resultado': 'Resultado parcial · no concluyente' }],
    ['llm', 'Autocorrección', 'A incompleta · combino A + B', { Razonamiento: 'A no basta sola. Reviso el log: la pista estaba en el paso 4.\nCombino A con B.', 'Confianza': '0,71 → 0,88' }],
    ['act', 'tool_call #03', 'verificar A + B', { 'Acción': 'tool_call #03', 'Resultado': 'El patrón coincide' }],
    ['llm', 'Decisión', 'confianza 0,93 · ejecutar', { Razonamiento: 'Confianza suficiente y presupuesto de sobra.\nEjecuto y verifico el resultado.' }],
    ['act', 'tool_call #04', 'ejecutar y verificar', { 'Acción': 'tool_call #04', 'Resultado': 'Formato de flag válido' }],
    ['flag', 'FLAG capturada', '+300 pts · 00:04.12', { Flag: 'FLAG{…} · +300 puntos', 'Coste': '€0,04 · 11 pasos · 9.812 tokens' }],
    ['ev', 'Agente finalizado', 'humanos en el teclado: 0', { Evento: 'Run completado.\nTodo el razonamiento queda en el log para la revisión del equipo.' }],
  ];
  const NW = 208, NH = 60, GX = 46, GY = 40;
  let cols = 4, shown = 0, focus = -1, follow = true, timer = null, pauseUntil = 0;

  function layout() {
    cols = Math.max(2, Math.floor((host.clientWidth - 40) / (NW + GX)));
    return STEPS.map((_, i) => { const r = Math.floor(i / cols); let c = i % cols; if (r % 2) c = cols - 1 - c; return { x: 20 + c * (NW + GX), y: 20 + r * (NH + GY) }; });
  }
  let P = layout();

  function edges(n) {
    let d = '';
    for (let i = 1; i < n; i++) {
      const a = P[i - 1], b = P[i];
      let path;
      if (Math.abs(a.y - b.y) < 2) {
        const l = a.x < b.x, x1 = l ? a.x + NW : a.x, x2 = l ? b.x : b.x + NW, y = a.y + NH / 2, dx = (x2 - x1) * .5;
        path = `M${x1} ${y} C${x1 + dx} ${y}, ${x2 - dx} ${y}, ${x2} ${y}`;
      } else {
        const ax = a.x + NW / 2, ay = a.y + NH, bx = b.x + NW / 2, by = b.y;
        path = `M${ax} ${ay} C${ax} ${ay + 22}, ${bx} ${by - 22}, ${bx} ${by}`;
      }
      d += `<path d="${path}"${i === n - 1 ? ' class="new"' : ''}/>`;
    }
    return d;
  }
  function render() {
    const rows = Math.ceil(STEPS.length / cols);
    inner.style.width = `${40 + cols * (NW + GX)}px`; inner.style.height = `${40 + rows * (NH + GY)}px`;
    svg.setAttribute('width', 40 + cols * (NW + GX)); svg.setAttribute('height', 40 + rows * (NH + GY));
    svg.innerHTML = edges(shown);
    inner.querySelectorAll('.af-node').forEach((n) => n.remove());
    for (let i = 0; i < shown; i++) {
      const [k, l, d] = STEPS[i];
      const el = document.createElement('div');
      el.className = `af-node${i === shown - 1 && shown < STEPS.length ? ' recent' : ''}${i === shown - 1 && k === 'act' ? ' run' : ''}${k === 'flag' ? ' flag' : ''}${i === focus ? ' focus' : ''}`;
      el.style.cssText = `left:${P[i].x}px;top:${P[i].y}px;width:${NW}px;height:${NH}px;--c:${C[k]}`;
      el.innerHTML = `<div class="t"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="l">${l}</span><i></i></div><div class="d">${d}</div>`;
      el.addEventListener('click', () => { focusStep(i); pauseUntil = performance.now() + 7000; });
      inner.appendChild(el);
    }
    elStep.textContent = `PASO ${String(shown).padStart(2, '0')} / ${STEPS.length}`;
    elCost.textContent = `€${(Math.min(shown, 11) * 0.0036).toFixed(3).replace('.', ',')}`;
  }
  function camera(i) {
    const p = P[Math.max(0, i)];
    const iw = inner.offsetWidth, ih = 20 + (Math.floor((shown - 1) / cols) + 1) * (NH + GY);   // only the rows that exist
    const tx = Math.min(0, Math.max(host.clientWidth - iw, host.clientWidth * .5 - (p.x + NW / 2)));
    const ty = Math.min(0, Math.max(host.clientHeight - ih - 10, host.clientHeight * .5 - (p.y + NH / 2)));
    inner.style.transform = `translate(${tx}px, ${ty}px)`;
  }
  function detail(i) {
    const [k, l, , sec] = STEPS[i];
    dKind.textContent = `${KIND[k]} · paso ${i + 1} de ${STEPS.length}`;
    dTitle.textContent = l;
    dBody.innerHTML = Object.entries(sec).map(([t, v]) => `<p class="af-sec">${t}</p><div class="af-pre">${k === 'flag' ? `<span class="g">${v}</span>` : v}</div>`).join('');
  }
  function focusStep(i) { focus = i; follow = false; render(); camera(i); detail(i); }
  function advance() {
    if (performance.now() < pauseUntil) return;
    if (shown >= STEPS.length) { shown = 0; focus = -1; follow = true; }
    shown++;
    if (follow || focus < 0) { focus = -1; render(); camera(shown - 1); detail(shown - 1); } else render();
    if (STEPS[shown - 1][0] === 'flag') { flash(); pauseUntil = performance.now() + 2500; }
    if (shown === STEPS.length) pauseUntil = performance.now() + 4000;
  }
  document.getElementById('af-prev').onclick = () => { focusStep(Math.max(0, (focus < 0 ? shown - 1 : focus) - 1)); pauseUntil = performance.now() + 7000; };
  document.getElementById('af-next').onclick = () => { focusStep(Math.min(shown - 1, (focus < 0 ? shown - 1 : focus) + 1)); pauseUntil = performance.now() + 7000; };
  document.getElementById('af-live').onclick = () => { follow = true; focus = -1; pauseUntil = 0; render(); camera(shown - 1); detail(Math.max(0, shown - 1)); };
  addEventListener('resize', () => { P = layout(); render(); camera(focus < 0 ? shown - 1 : focus); });

  if (RM) { shown = STEPS.length; render(); camera(0); detail(STEPS.length - 2); return; }
  new IntersectionObserver((es) => {
    if (es[0].isIntersecting && !timer) { advance(); timer = setInterval(advance, 1100); }
    else if (!es[0].isIntersecting && timer) { clearInterval(timer); timer = null; }
  }, { threshold: .25 }).observe(host);
})();
