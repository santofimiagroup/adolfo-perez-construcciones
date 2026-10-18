/* =============================================================================
   INICIO · saludo, obra en portada, asistente, indicadores, obras, mapa y actividad
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC, f = A.fmt, APP = window.APP, U = APP.ui;
  const { esc, $, $$, icon, wait } = U;

  /* ---------- estado de la página de inicio ---------- */
  const home = { featured: null };
  const AI = { messages: [], busy: false, rec: null, listening: false };

  function greeting() {
    const h = new Date().getHours();
    return h >= 6 && h < 14 ? 'Buenos días' : h >= 14 && h < 21 ? 'Buenas tardes' : 'Buenas noches';
  }
  function featuredOrder() { return A.totals().ms.slice().sort((a, b) => b.m.attention - a.m.attention).map(x => x.o); }

  /* ---------- obra en portada ---------- */
  function featureHTML(o) {
    const m = A.metrics(o); const order = featuredOrder(); const idx = order.indexOf(o);
    return `<div class="feature__top"><span class="eyebrow">Obra en portada</span><span class="feature__count">${String(idx + 1).padStart(2, '0')} / ${String(order.length).padStart(2, '0')}</span></div>
      <p class="feature__name">${esc(o.short)}</p>
      <p class="feature__meta">${esc(o.town)} · ${esc(o.type)}</p>
      <div class="feature__prog"><span class="num">${o.progress}<span style="font-size:16px"> %</span></span>${U.progressBar(o, m, 'bar--dark')}</div>
      <div class="feature__status"><span>${m.statusLabel} · previsto ${f.pct(m.planned)}</span><span>Fin ${f.monthYear(o.end)}</span></div>
      <div class="feature__nav">
        <button type="button" data-act="feature-prev" aria-label="Obra anterior">${icon('chevron-left', 16)}</button>
        <a href="#/obras/${o.id}">Ver obra ${icon('arrow-right', 14)}</a>
        <button type="button" data-act="feature-next" aria-label="Obra siguiente">${icon('chevron-right', 16)}</button>
      </div>`;
  }
  function heroImg(o, active = true) {
    return `<img class="hero__img${active ? ' is-active' : ''}" src="${o.photoLg}" alt="${esc(`${o.name}, ${o.town} (imagen de demostración)`)}" style="object-position:${o.focus}" fetchpriority="high" decoding="async">`;
  }
  function switchFeature(dir) {
    const order = featuredOrder(); let i = order.indexOf(home.featured);
    i = (i + dir + order.length) % order.length; home.featured = order[i];
    const media = $('.hero__media'); const feat = $('.feature');
    if (!media || !feat) return;
    const shade = $('.hero__shade', media);
    const old = $$('.hero__img', media);
    shade.insertAdjacentHTML('beforebegin', heroImg(home.featured, false));
    const img = shade.previousElementSibling;
    img.style.opacity = '0';
    const reveal = () => requestAnimationFrame(() => { img.style.opacity = '1'; img.classList.add('is-active'); setTimeout(() => old.forEach(o => o.remove()), 1050); });
    if (img.complete) reveal(); else { img.onload = reveal; img.onerror = reveal; }
    feat.innerHTML = featureHTML(home.featured);
    U.announce(`Obra en portada: ${home.featured.name}`);
  }
  APP.actions['feature-next'] = () => switchFeature(1);
  APP.actions['feature-prev'] = () => switchFeature(-1);

  /* ---------- asistente ---------- */
  function assistantHTML() {
    const has = AI.messages.length > 0;
    return `<section class="assistant${has ? ' has-thread' : ''}" id="assistant" aria-labelledby="ai-name">
      <div class="assistant__head">
        <span class="assistant__mark">${icon('sparkles', 16)}</span>
        <span class="assistant__name" id="ai-name">Asistente de ${esc(A.COMPANY.short)}</span>
        <span class="tag tag--demo" tabindex="0" title="Versión de demostración: las respuestas se calculan en el navegador con los datos ficticios de esta plataforma. No se conecta a ningún modelo de IA ni a sistemas de la empresa.">Demo</span>
        <div class="assistant__head-actions"><button type="button" class="icon-btn icon-btn--sm" data-act="ai-reset" aria-label="Nueva conversación" title="Nueva conversación"${has ? '' : ' hidden'}>${icon('rotate-ccw', 15)}</button></div>
      </div>
      <div class="assistant__intro">
        <h2 class="assistant__title">¿En qué puedo ayudarte?</h2>
        <div class="chips" role="list">${window.Assistant.suggestions.map(s => `<button type="button" role="listitem" class="chip" data-act="ai-ask" data-q="${esc(s.q)}">${esc(s.label)}</button>`).join('')}</div>
      </div>
      <div class="thread" id="ai-thread" role="log" aria-label="Conversación con el asistente">${AI.messages.map(staticMsg).join('')}</div>
      <form class="composer" data-form="ai" autocomplete="off">
        <label for="ai-input" class="sr-only">Escribe tu pregunta para el asistente</label>
        <button type="button" class="composer__mic" data-act="ai-mic" aria-label="Dictar la pregunta por voz" aria-pressed="false" hidden>${icon('mic', 18)}</button>
        <input id="ai-input" name="q" type="text" maxlength="240" placeholder="Pregunta por obras, equipo, fichajes, costes…" enterkeyhint="send" autocomplete="off">
        <button type="submit" class="composer__send" aria-label="Enviar pregunta">${icon('arrow-up', 18)}</button>
      </form>
      <p class="assistant__foot">${icon('info', 13)}<span>Demo: respuestas calculadas en el navegador con los datos ficticios de la plataforma.</span></p>
    </section>`;
  }
  const userMsg = text => `<div class="msg msg--user"><div class="msg__bubble">${esc(text)}</div></div>`;
  function staticMsg(m) {
    if (m.role === 'user') return userMsg(m.text);
    const body = document.createElement('div');
    m.blocks.forEach(b => body.appendChild(renderBlock(b, false)));
    return `<div class="msg msg--ai"><span class="msg__avatar">${icon('sparkles', 14)}</span><div class="msg__body">${body.innerHTML}${followUps(m)}</div></div>`;
  }

  function renderBlock(b, animate) {
    const wrap = document.createElement('div');
    const li = items => items.map(x => `<li>${x}</li>`).join('');
    switch (b.type) {
      case 'p': wrap.innerHTML = `<p>${b.html}</p>`; break;
      case 'h': wrap.innerHTML = `<h5 class="section-lbl">${esc(b.text)}</h5>`; break;
      case 'list': wrap.innerHTML = `<ul class="ai-list">${li(b.items)}</ul>`; break;
      case 'note': wrap.innerHTML = `<p class="ai-note">${icon('info', 13)}<span>${b.html}</span></p>`; break;
      case 'kpis': wrap.innerHTML = `<div class="ai-kpis">${b.items.map(k => `<div class="ai-kpi${k.tone ? ' ai-kpi--' + k.tone : ''}"><span>${esc(k.label)}</span><strong>${k.value}</strong></div>`).join('')}</div>`; break;
      case 'table': wrap.innerHTML = `<div class="ai-table-wrap"><table class="ai-table"><thead><tr>${b.head.map((h, i) => `<th class="${(b.align || [])[i] === 'r' ? 'r' : ''}" scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((c, i) => `<td class="${(b.align || [])[i] === 'r' ? 'r' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; break;
      case 'actions': wrap.innerHTML = `<div class="ai-actions">${b.items.map(a => a.href ? `<a class="btn btn--secondary btn--sm" href="${a.href}">${esc(a.label)} ${icon('arrow-right', 14)}</a>` : `<button type="button" class="btn btn--secondary btn--sm" data-act="${a.action}">${icon('copy', 14)} ${esc(a.label)}</button>`).join('')}</div>`; break;
      case 'ranked': wrap.innerHTML = `<ol class="ai-ranked">${b.items.map(i => `<li><span class="n">${i.n}</span><div><div class="t">${i.title} ${i.tag || ''}</div><div class="x">${i.text}</div></div></li>`).join('')}</ol>`; break;
      case 'brief': wrap.innerHTML = `<div class="ai-brief"><h4>${esc(b.title)}</h4>${b.sections.map(s => `<h5>${esc(s.h)}</h5><ul class="ai-list">${li(s.items)}</ul>`).join('')}</div>`; break;
      case 'chips': wrap.innerHTML = `<div class="chips chips--follow">${b.items.map(q => `<button type="button" class="chip" data-act="ai-ask" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`; break;
      default: wrap.innerHTML = '';
    }
    const el = wrap.firstElementChild || document.createElement('div');
    if (animate && !U.reduceMotion()) animateEl(el, b.type);
    return el;
  }
  function animateEl(el, type) {
    if (type === 'p' || type === 'note') {
      let i = 0; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => {
        const parts = node.textContent.split(/(\s+)/); const frag = document.createDocumentFragment();
        parts.forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; } const s = document.createElement('span'); s.className = 'ai-w'; s.style.animationDelay = `${Math.min(i++ * 16, 1100)}ms`; s.textContent = p; frag.appendChild(s); });
        node.parentNode.replaceChild(frag, node);
      });
      el._words = i;
    } else {
      el.classList.add('ai-block');
      const kids = el.querySelectorAll('li, tbody tr, .ai-kpi, .btn');
      kids.forEach((k, i) => { k.classList.add('ai-block'); k.style.animationDelay = `${i * 70}ms`; });
      el._items = kids.length;
    }
  }
  function blockPause(el, type) {
    if (U.reduceMotion()) return 40;
    if (type === 'p' || type === 'note') return Math.min(160 + (el._words || 0) * 16, 1100);
    return 140 + Math.min((el._items || 0) * 70, 700);
  }
  const FOLLOW = {
    delays: ['¿Qué incidencias llevan más tiempo sin resolverse?', '¿Cómo va Edificio Atalaya?'],
    absent: ['¿Qué fichajes están pendientes de revisar?', '¿Cuántas personas hay hoy en cada obra?'],
    review: ['¿Qué empleados no han fichado hoy?'],
    presence: ['¿Qué empleados no han fichado hoy?', '¿Qué fichajes están pendientes de revisar?'],
    summary: ['¿Qué obras necesitan más atención esta semana?', 'Prepárame un resumen para la reunión de mañana.'],
    budget: ['¿Qué obras están teniendo retrasos?', 'Presupuesto de Hotel Albera'],
    incOldest: ['¿Qué jefe de obra tiene más incidencias pendientes?', 'Incidencias de prioridad alta'],
    incByJefe: ['¿Qué incidencias llevan más tiempo sin resolverse?', '¿Cómo va Hotel Albera?'],
    incidents: ['¿Qué incidencias llevan más tiempo sin resolverse?', '¿Qué jefe de obra tiene más incidencias pendientes?'],
    meeting: ['¿Qué obras necesitan más atención esta semana?', 'Ideas para mejorar la operativa'],
    attention: ['Prepárame un resumen para la reunión de mañana.', '¿Cómo vamos de presupuesto este mes?'],
    partes: ['¿Qué empleados no han fichado hoy?', '¿Hay documentación caducada?'],
    docs: ['¿Qué partes están pendientes de validar?', '¿Qué obras necesitan más atención esta semana?'],
    ideas: ['Prepárame un resumen para la reunión de mañana.'],
    employee: ['¿Qué empleados no han fichado hoy?'],
    obra: [], fallback: [], help: [], greet: ['Resume la situación de todas las obras.', '¿Qué obras están teniendo retrasos?']
  };
  function followUps(m) {
    if (m.role !== 'assistant' || m.intent === 'fallback') return '';
    let qs = (FOLLOW[m.intent] || []).slice();
    if (m.intent === 'obra' && m.obra) qs = [`Incidencias de ${m.obra.short}`, `Presupuesto de ${m.obra.short}`];
    qs = qs.filter(q => q !== m.question).slice(0, 2);
    if (!qs.length) return '';
    return `<div class="chips chips--follow" aria-label="Preguntas sugeridas">${qs.map(q => `<button type="button" class="chip" data-act="ai-ask" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  }
  /** Desplaza la conversación: sigue la respuesta, pero sin perder de vista la última pregunta */
  function scrollThread() {
    const t = $('#ai-thread'); if (!t) return;
    const users = t.querySelectorAll('.msg--user'); const last = users[users.length - 1];
    const bottom = t.scrollHeight - t.clientHeight;
    t.scrollTop = last ? Math.min(bottom, last.offsetTop - 10) : bottom;
  }

  async function ask(question) {
    const q = String(question || '').trim();
    const input = $('#ai-input');
    if (!q) { if (input) { input.focus(); U.toast('Escribe una pregunta para el asistente.', { type: 'info' }); } return; }
    if (AI.busy) return;
    AI.busy = true;
    const card = $('#assistant'); const thread = $('#ai-thread');
    if (!card || !thread) { AI.busy = false; return; }
    card.classList.add('has-thread');
    const reset = card.querySelector('[data-act="ai-reset"]'); if (reset) reset.hidden = false;
    if (input) { input.value = ''; }
    const send = card.querySelector('.composer__send'); if (send) send.disabled = true;
    AI.messages.push({ role: 'user', text: q });
    thread.insertAdjacentHTML('beforeend', userMsg(q));
    let res;
    try { res = window.Assistant.answer(q); }
    catch (err) { console.error(err); res = { intent: 'fallback', thinking: 'Buscando…', blocks: [{ type: 'p', html: 'No he podido procesar la pregunta. Prueba a formularla de otra manera.' }] }; }
    const interp = window.Assistant.interpret(q);
    const msg = { role: 'assistant', intent: res.intent, blocks: res.blocks, question: q, obra: interp.obras[0] || null };
    thread.insertAdjacentHTML('beforeend', `<div class="msg msg--ai" aria-busy="true"><span class="msg__avatar">${icon('sparkles', 14)}</span><div class="msg__body"><div class="thinking"><span class="thinking__dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="thinking__text">${esc(res.thinking)}</span></div></div></div>`);
    const node = thread.lastElementChild; const body = node.querySelector('.msg__body');
    scrollThread();
    await wait(U.reduceMotion() ? 250 : 700 + Math.round(Math.random() * 450));
    if (!document.contains(body)) { AI.messages.push(msg); AI.busy = false; return; }
    body.innerHTML = '';
    for (const b of res.blocks) {
      const el = renderBlock(b, true); body.appendChild(el); scrollThread();
      await wait(blockPause(el, b.type));
      if (!document.contains(body)) break;
    }
    body.insertAdjacentHTML('beforeend', followUps(msg));
    node.removeAttribute('aria-busy');
    scrollThread();
    AI.messages.push(msg);
    U.announce(window.Assistant.toText(res.blocks).slice(0, 600));
    if (send) send.disabled = false;
    AI.busy = false;
  }
  APP.actions['ai-ask'] = el => { const q = el.getAttribute('data-q'); if (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] !== 'inicio' && location.hash.length > 2) { APP.pendingQuestion = q; location.hash = '#/inicio'; return; } ask(q); };
  APP.actions['ai-reset'] = () => { AI.messages = []; const card = $('#assistant'); if (card) { card.outerHTML = assistantHTML(); setupMic(); const i = $('#ai-input'); if (i) i.focus(); } };
  APP.actions['copy-brief'] = async () => {
    const last = [...AI.messages].reverse().find(m => m.intent === 'meeting');
    if (!last) return;
    const text = window.Assistant.toText(last.blocks.filter(b => b.type === 'brief'));
    try { await navigator.clipboard.writeText(text); U.toast('Resumen copiado al portapapeles.'); }
    catch (e) { U.toast('No se ha podido copiar automáticamente. Puedes abrirlo como informe e imprimirlo.', { type: 'info' }); }
  };
  APP.forms = APP.forms || {};
  APP.forms.ai = form => { ask(form.elements.q.value); };

  /* dictado por voz (solo si el navegador lo admite) */
  function setupMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btn = $('[data-act="ai-mic"]');
    if (!btn || !SR || !window.isSecureContext) return;
    btn.hidden = false;
  }
  APP.actions['ai-mic'] = btn => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (AI.listening && AI.rec) { AI.rec.stop(); return; }
    const rec = new SR(); AI.rec = rec;
    rec.lang = 'es-ES'; rec.interimResults = true; rec.maxAlternatives = 1;
    const input = $('#ai-input'); let finalText = '';
    rec.onstart = () => { AI.listening = true; btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', 'Detener el dictado'); if (input) input.placeholder = 'Te escucho…'; };
    rec.onresult = e => { let txt = ''; for (let i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) finalText += e.results[i][0].transcript; } if (input) input.value = (finalText || txt).trim(); };
    rec.onerror = e => {
      const msg = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'El navegador no ha dado permiso para usar el micrófono.' : e.error === 'no-speech' ? 'No se ha detectado voz. Inténtalo de nuevo.' : 'El dictado por voz no está disponible en este momento.';
      U.toast(msg, { type: 'info' });
    };
    rec.onend = () => {
      AI.listening = false; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Dictar la pregunta por voz');
      if (input) input.placeholder = 'Pregunta por obras, equipo, fichajes, costes…';
      if (finalText.trim()) ask(finalText.trim());
    };
    try { rec.start(); } catch (e) { U.toast('El dictado por voz no está disponible en este momento.', { type: 'info' }); }
  };

  /* ---------- indicadores ---------- */
  function kpisHTML(t) {
    const prioCount = { alta: 0, media: 0, baja: 0 }; t.openInc.forEach(i => { prioCount[i.priority]++; });
    const pres = A.presenceSeries(10).map(x => x.value);
    const months = A.monthlyCost(6);
    const delayed = t.ms.filter(x => x.m.status !== 'plazo').length;
    const lastWeekPresence = pres.slice(0, -1).reduce((s, v) => s + v, 0) / Math.max(1, pres.length - 1);
    const card = (href, ic, label, value, ctx, viz, vizTitle) => `<a class="kpi" href="${href}">
        <span class="kpi__top"><span class="kpi__icon">${icon(ic, 17)}</span><span class="kpi__label">${label}</span></span>
        <span class="kpi__row"><span class="kpi__value">${value}</span><span class="kpi__viz" title="${esc(vizTitle)}">${viz}</span></span>
        <span class="kpi__ctx">${ctx}</span></a>`;
    return `<section class="kpis" aria-label="Indicadores principales">
      ${card('#/obras', 'building', 'Obras activas', t.obras, `<span class="warn">${t.attention.length} requieren atención</span>`, U.progressColumns(t.ms.map(x => ({ v: x.o.progress, s: x.m.status }))), 'Avance de cada obra')}
      ${card('#/fichajes', 'users', 'Equipo en obra hoy', `${t.present.length}<small> / ${t.employees}</small>`, `<span>${t.absent.length} ausencias ·</span><span class="bad">${t.review.length} por revisar</span>`, U.sparkBars(pres, { min: 10 }), `Personas que han fichado en los últimos 10 días laborables (media ${f.num(lastWeekPresence, 1)})`)}
      ${card('#/incidencias?estado=abiertas', 'triangle-alert', 'Incidencias abiertas', t.openInc.length, `<span class="bad">${t.highInc.length} de prioridad alta</span>`, U.prioBars(prioCount), 'Incidencias abiertas por prioridad: alta, media y baja')}
      ${card('#/economico', 'circle-euro', 'Desviación de coste prevista', f.signedPct(t.devPct), `<span class="${t.dev > 0 ? 'warn' : 'ok'}">${f.signedEur(t.dev)}</span><span>al cierre</span>`, U.costBars(months), 'Coste mensual real (barras) frente a planificado (marca)')}
    </section>`;
  }

  /* ---------- lista de obras ---------- */
  function obrasCard(t) {
    const rows = t.ms.slice().sort((a, b) => b.m.attention - a.m.attention).map(({ o, m }) => `
      <a class="orow" href="#/obras/${o.id}">
        <img class="orow__img" src="${o.photoSm}" alt="" loading="lazy" style="object-position:${o.focus}">
        <span style="min-width:0"><span class="orow__name">${esc(o.short)}</span><span class="orow__meta">${icon('map-pin', 12)}${esc(o.town)}</span></span>
        <span class="orow__prog">${U.progressBar(o, m)}<span class="num">${o.progress}%</span></span>
        ${m.phase && m.status === 'plazo' ? `<span class="pill pill--fase pill--plain">${m.phase}</span>` : U.obraPill(m)}
      </a>`).join('');
    return `<section class="card card--obras" aria-labelledby="h-obras">
      <div class="card__head"><div><h2 class="card__title" id="h-obras">Obras en curso</h2><p class="card__sub">Ordenadas por la atención que requieren</p></div><a class="link" href="#/obras">Ver todas ${icon('arrow-right', 14)}</a></div>
      <div class="olist">${rows}</div>
    </section>`;
  }

  /* ---------- mapa ---------- */
  function mapCard(t) {
    const M = window.MAP_DATA;
    const proj = APP.mapProject;
    const pins = t.ms.map(({ o, m }) => { const [x, y] = proj(o.lat, o.lng); return { o, m, x, y, n: m.present.length }; });
    const towns = Object.entries(M.towns).filter(([n]) => !['Relleu', 'Sella', "Callosa d'en Sarrià"].includes(n));
    return `<section class="card card--map" aria-labelledby="h-map">
      <div class="card__head"><div><h2 class="card__title" id="h-map">Equipo y obras en el mapa</h2><p class="card__sub">Personas que han fichado hoy en cada obra</p></div><a class="link" href="#/fichajes">Ver fichajes ${icon('arrow-right', 14)}</a></div>
      <div class="map" id="map">
        <svg viewBox="0 0 ${M.W} ${M.H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect x="-500" y="-500" width="${M.W + 1000}" height="${M.H + 1000}" fill="#E7EAE7"/>
          <path class="map__land" d="${M.land}"/>
          ${M.lakes.map(l => `<path class="map__lake" d="${l.d}"/>`).join('')}
          <path class="map__river" d="${M.rivers}"/>
          <path class="map__road-casing map__road--primary" d="${M.roads.primary}" style="stroke-width:3"/>
          <path class="map__road-casing" d="${M.roads.trunk}" style="stroke-width:4"/>
          <path class="map__road-casing" d="${M.roads.motorway}" style="stroke-width:5"/>
          <path class="map__road map__road--primary" d="${M.roads.primary}"/>
          <path class="map__road map__road--trunk" d="${M.roads.trunk}"/>
          <path class="map__road map__road--motorway" d="${M.roads.motorway}"/>
          ${towns.map(([n, [x, y]]) => `<g class="map__townG"><circle class="map__town-dot" cx="${x}" cy="${y}" r="2.6"/><text class="map__town" x="${x + 7}" y="${y + 4}">${esc(n)}</text></g>`).join('')}
          <text class="map__sea" x="600" y="540">Mar Mediterráneo</text>
        </svg>
        <div class="map__pins">${pins.map(p => `<button type="button" class="pin pin--${p.m.status}" data-act="pin" data-id="${p.o.id}" data-x="${p.x.toFixed(1)}" data-y="${p.y.toFixed(1)}" aria-label="${esc(`${p.o.name}, ${p.o.town}: ${p.n} personas en obra hoy, avance ${p.o.progress} %`)}"><span class="pin__dot">${p.n}</span></button>`).join('')}</div>
        <span class="map__fict">Ubicaciones ficticias</span>
        <div class="map__legend" aria-hidden="true"><span><i style="background:var(--olive)"></i>En plazo</span><span><i style="background:#A98244"></i>En riesgo</span><span><i style="background:#A65A45"></i>Retrasada</span></div>
        <span class="map__attr">© OpenStreetMap</span>
      </div>
    </section>`;
  }
  let mapRO = null;
  function fitMap() {
    const box = $('#map'); if (!box) return;
    const svg = $('svg', box); const pins = $$('.pin', box);
    const xs = pins.map(p => +p.dataset.x), ys = pins.map(p => +p.dataset.y);
    let x0 = Math.min(...xs) - 80, x1 = Math.max(...xs) + 120, y0 = Math.min(...ys) - 120, y1 = Math.max(...ys) + 70;
    const cw = box.clientWidth, ch = box.clientHeight; if (!cw || !ch) return;
    let w = x1 - x0, h = y1 - y0; const ar = cw / ch;
    if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
    svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const s = cw / w; const u = 1 / s;
    $$('.map__town', svg).forEach(tx => { tx.style.fontSize = `${10.5 * u}px`; tx.style.strokeWidth = `${3.5 * u}px`; });
    $$('.map__town-dot', svg).forEach(c => c.setAttribute('r', 2.4 * u));
    const sea = $('.map__sea', svg); if (sea) { sea.style.fontSize = `${14 * u}px`; sea.setAttribute('x', x0 + w * 0.6); sea.setAttribute('y', y0 + h * 0.9); sea.style.display = cw < 480 ? 'none' : ''; }
    pins.forEach(p => { p.style.left = `${(p.dataset.x - x0) * s}px`; p.style.top = `${(p.dataset.y - y0) * s}px`; });
    // coloca los nombres de municipio donde no los tape un marcador (derecha, debajo, izquierda o arriba)
    const pinPts = pins.map(p => [(p.dataset.x - x0) * s, (p.dataset.y - y0) * s]);
    const placed = [];
    $$('.map__townG', svg).forEach(g => {
      const tx = $('.map__town', g); const dot = $('.map__town-dot', g);
      const cx = +dot.getAttribute('cx'), cy = +dot.getAttribute('cy');
      let bb; try { tx.setAttribute('text-anchor', 'start'); tx.setAttribute('x', cx + 6 * u); tx.setAttribute('y', cy + 3.6 * u); bb = tx.getBBox(); } catch (e) { return; }
      const tw = bb.width, th = bb.height;
      const spots = [[cx + 6 * u, cy + 3.6 * u, 'start'], [cx, cy + 15 * u, 'middle'], [cx - 6 * u, cy + 3.6 * u, 'end'], [cx, cy - 8 * u, 'middle'], [cx, cy + 34 * u, 'middle']];
      const rectOf = ([x, y, anchor]) => { const left = anchor === 'start' ? x : anchor === 'end' ? x - tw : x - tw / 2; return [(left - x0) * s - 4, (left + tw - x0) * s + 4, (y - th * 0.8 - y0) * s - 3, (y + th * 0.2 - y0) * s + 3]; };
      const free = sp => {
        const [L, R, T, B] = rectOf(sp);
        if (L < 2 || R > cw - 2 || T < 2 || B > ch - 2) return false;
        if (pinPts.some(([px, py]) => px > L - 17 && px < R + 17 && py > T - 17 && py < B + 17)) return false;
        return !placed.some(([l, r, t, bt]) => L < r && R > l && T < bt && B > t);
      };
      const spot = spots.find(free);
      if (!spot) { g.style.opacity = '0'; return; }
      placed.push(rectOf(spot));
      g.style.opacity = '1'; tx.setAttribute('x', spot[0]); tx.setAttribute('y', spot[1]); tx.setAttribute('text-anchor', spot[2]);
    });
    const pop = $('.map__pop', box); if (pop) placePop(pop, $(`.pin[data-id="${pop.dataset.id}"]`, box));
  }
  function placePop(pop, pin) { if (!pin) return; pop.style.left = pin.style.left; pop.style.top = pin.style.top; const box = $('#map'); const bw = box.clientWidth; const px = parseFloat(pin.style.left); const half = pop.offsetWidth / 2 || 125; const dx = px < half + 8 ? half + 8 - px : px > bw - half - 8 ? (bw - half - 8) - px : 0; pop.style.marginLeft = `${dx}px`; pop.style.setProperty('--arrow', `${-dx}px`); }
  function showPop(id) {
    const box = $('#map'); if (!box) return;
    $$('.pin', box).forEach(p => p.classList.toggle('is-active', p.dataset.id === id));
    const old = $('.map__pop', box); if (old) old.remove();
    const o = A.obraById(id); const m = A.metrics(o); const pin = $(`.pin[data-id="${id}"]`, box);
    box.insertAdjacentHTML('beforeend', `<div class="map__pop" data-id="${id}"><img src="${o.photoSm}" alt="" style="object-position:${o.focus}"><div><strong>${esc(o.short)}</strong><small>${m.present.length} en obra hoy · ${o.progress} %</small><a class="link" href="#/obras/${o.id}">Ver obra ${icon('arrow-right', 13)}</a></div></div>`);
    placePop($('.map__pop', box), pin);
  }
  APP.actions.pin = el => showPop(el.dataset.id);
  APP.mapProject = (lat, lng) => {
    const M = window.MAP_DATA; const rad = d => d * Math.PI / 180;
    const my = l => Math.log(Math.tan(Math.PI / 4 + rad(l) / 2));
    return [(rad(lng) - rad(M.bbox.w)) * M.k, (my(M.bbox.n) - my(lat)) * M.k];
  };

  /* ---------- actividad ---------- */
  const KIND = {
    parte: ['clipboard-list', ''], foto: ['camera', ''], incidencia: ['triangle-alert', 'alert'], alerta: ['circle-alert', 'alert'],
    avance: ['trending-up', 'ok'], documento: ['file-up', ''], validacion: ['circle-check', 'ok'], resuelta: ['circle-check', 'ok'],
    material: ['truck', ''], equipo: ['users', ''], fichaje: ['clock-4', '']
  };
  function activityItems(limit = 7, obraId = null) {
    return A.actividad.filter(e => !obraId || e.obra === obraId).slice().sort((a, b) => b.at - a.at).slice(0, limit);
  }
  function activityHTML(list, { showObra = true } = {}) {
    if (!list.length) return `<p class="muted" style="padding:8px 0 4px;font-size:13px">Sin actividad registrada.</p>`;
    return list.map(e => {
      const [ic, tone] = KIND[e.kind] || ['circle-dot', ''];
      const who = e.who === 'USER' ? A.USER.name : e.who ? (A.empById(e.who) || {}).short || '' : '';
      const obra = e.obra ? A.obraById(e.obra) : null;
      const useDetail = ['documento', 'material', 'equipo'].includes(e.kind) || !showObra;
      const sub = (showObra ? [useDetail ? e.detail : null, obra ? obra.short : null, useDetail && obra ? null : who] : [e.detail, who]).filter(Boolean).join(' · ');
      const w = f.when(e.at);
      const t = /^(Hace|Ahora)/.test(w) ? w : w.replace(/^(\S+), /, (_, d) => `${d.length > 4 ? d.slice(0, 3) : d}<br>`);
      return `<div class="tl${e.user && (new Date() - e.at) < 120000 ? ' is-new' : ''}">
        <span class="tl__time">${t}</span>
        <span class="tl__dot${e.user ? ' tl__dot--user' : tone ? ` tl__dot--${tone}` : ''}"><span>${icon(ic, 14)}</span></span>
        <span class="tl__text" title="${esc([e.title, e.detail, obra ? obra.name : '', who].filter(Boolean).join(' · '))}"><strong>${esc(e.title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span>
      </div>`;
    }).join('');
  }
  function agendaCard() {
    const items = A.OBRAS.flatMap(o => o.milestones.filter(x => x.date >= A.REF && A.daysBetween(A.REF, x.date) <= 14).map(x => ({ o, x }))).sort((a, b) => a.x.date - b.x.date).slice(0, 6);
    return `<section class="card card--agenda" aria-labelledby="h-agenda">
      <div class="card__head"><div><h2 class="card__title" id="h-agenda">Próximos hitos</h2><p class="card__sub">Planificación de las dos próximas semanas</p></div></div>
      <div class="milestones">${items.length ? items.map(({ o, x }) => `<a class="ms" href="#/obras/${o.id}"><span class="ms__date"><b>${x.date.getDate()}</b><small>${f.monthShort(x.date)}</small></span><span class="ms__text">${esc(x.label)}<small>${esc(o.short)} · ${f.cap(f.weekday(x.date))}${x.risk ? '' : ''}</small>${x.risk ? `<span class="ms__risk">${icon('circle-alert', 13)}${esc(x.risk)}</span>` : ''}</span></a>`).join('') : '<p class="muted">Sin hitos en las próximas dos semanas.</p>'}</div>
    </section>`;
  }
  function activityCard() {
    return `<section class="card card--activity" aria-labelledby="h-act">
      <div class="card__head"><div><h2 class="card__title" id="h-act">Actividad reciente</h2><p class="card__sub">Fichajes, partes, incidencias y documentos</p></div></div>
      <div class="timeline" id="home-activity">${activityHTML(activityItems(8))}</div>
    </section>`;
  }

  /* ---------- render ---------- */
  function render() {
    const t = A.totals();
    if (!home.featured) home.featured = featuredOrder()[0];
    const ref = A.REF;
    const dateTxt = f.dayLong(ref).toUpperCase();
    const week = (() => { const d = new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate())); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil(((d - y0) / 86400000 + 1) / 7); })();
    return `<div class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero__media">${heroImg(home.featured)}<div class="hero__shade"></div></div>
        <div class="hero__bar"><span></span><div class="hero__tools">${U.utilityTools(true)}</div></div>
        <div class="hero__copy">
          <p class="hero__date"><span>${dateTxt}</span><span class="sep"></span><span>Semana ${week}</span></p>
          <h1 class="hero__title" id="hero-title" tabindex="-1">${greeting()},<br><em>${esc(A.USER.name)}</em></h1>
          <p class="hero__sub">La situación de tus obras, equipos y operaciones, en un solo lugar.</p>
          ${A.IS_WEEKEND ? `<p class="hero__note">${icon('calendar-days', 14)}Fin de semana: se muestra la última jornada laborable.</p>` : ''}
        </div>
        <aside class="feature" aria-label="Obra en portada">${featureHTML(home.featured)}</aside>
        ${assistantHTML()}
      </section>
      ${kpisHTML(t)}
      <div class="home-grid">
        ${obrasCard(t)}
        ${mapCard(t)}
      </div>
      <div class="home-grid home-grid--b">
        ${activityCard()}
        ${agendaCard()}
      </div>
      ${U.footer()}
    </div>`;
  }
  function mount() {
    setupMic();
    fitMap();
    if (mapRO) mapRO.disconnect();
    const box = $('#map');
    if (box && window.ResizeObserver) { mapRO = new ResizeObserver(() => fitMap()); mapRO.observe(box); }
    const busiest = A.totals().ms.slice().sort((a, b) => b.m.present.length - a.m.present.length)[0];
    if (busiest) showPop(busiest.o.id);
    scrollThread();
    if (APP.pendingQuestion) { const q = APP.pendingQuestion; APP.pendingQuestion = null; setTimeout(() => { const a = $('#assistant'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' }); ask(q); }, 250); }
  }

  APP.views.inicio = { render, mount, title: 'Inicio' };
  APP.home = { activityHTML, activityItems, ask };
})();
