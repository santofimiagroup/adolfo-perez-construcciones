/* =============================================================================
   Aplicación: navegación, barra lateral, eventos globales y arranque
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC, f = A.fmt, APP = window.APP, U = APP.ui;
  const { esc, $, $$, icon } = U;
  APP.forms = APP.forms || {};

  const main = $('#main');
  const sidebar = $('#sidebar');
  const appEl = $('#app');
  const mq = window.matchMedia('(max-width: 1023px)');

  /* ---------- barra lateral ---------- */
  function navGroups() {
    const t = A.totals();
    const docs = A.documentos.filter(d => d.status !== 'vigente').length;
    return [
      ['Operaciones', [['inicio', 'Inicio', 'house'], ['obras', 'Obras', 'building'], ['equipo', 'Equipo', 'users'], ['fichajes', 'Fichajes', 'clock-4', t.review.length, true], ['partes', 'Partes de trabajo', 'clipboard-list', t.partesPend.length], ['incidencias', 'Incidencias', 'triangle-alert', t.openInc.length]]],
      ['Gestión', [['economico', 'Control económico', 'circle-euro'], ['documentacion', 'Documentación', 'folder-open', docs], ['informes', 'Informes', 'chart-column']]]
    ];
  }
  const BADGE_HINT = { fichajes: 'fichajes por revisar', partes: 'partes pendientes de validar', incidencias: 'incidencias abiertas', documentacion: 'documentos que requieren atención' };
  function brand() {
    return A.COMPANY.logo
      ? `<img src="${A.COMPANY.logo}" alt="${esc(A.COMPANY.name)}" width="128" height="76">`
      : `<span class="sb__brand-text">${esc(A.COMPANY.short)}<small>Construcciones</small></span>`;
  }
  function renderSidebar() {
    const route = APP.route || { name: 'inicio' };
    const current = route.name === 'obra' ? 'obras' : route.name;
    sidebar.innerHTML = `
      <a class="sb__brand" href="#/inicio" aria-label="${esc(A.COMPANY.name)} · Inicio">${brand()}</a>
      <nav class="sb__nav" aria-label="Secciones">
        ${navGroups().map(([g, items]) => `<p class="sb__group" aria-hidden="true">${g}</p>${items.map(([k, l, ic, badge, alert]) => `<a class="sb__item" href="#/${k}"${k === current ? ' aria-current="page"' : ''}>${icon(ic, 19)}<span>${l}</span>${badge ? `<span class="sb__badge${alert ? ' sb__badge--alert' : ''}" aria-label="${badge} ${BADGE_HINT[k] || ''}">${badge}</span>` : ''}</a>`).join('')}`).join('')}
      </nav>
      <div class="sb__foot">
        <button type="button" class="sb__user" data-act="user-menu" aria-haspopup="dialog">${U.avatar('USER')}<span><strong>${esc(A.USER.name)}</strong><small>${esc(A.USER.role)}</small></span>${icon('settings', 17)}</button>
        <p class="sb__credit">Solución diseñada por <strong>ADVENTUM Strategy</strong></p>
      </div>`;
    syncInert();
  }
  function renderMobileBar() {
    const n = U.alertGroups().length;
    $('#mobile-bar').innerHTML = `<button type="button" class="icon-btn" data-act="nav-open" aria-label="Abrir menú" aria-controls="sidebar" aria-expanded="false">${icon('menu', 21)}</button>
      <a class="mobile-bar__brand" href="#/inicio" aria-label="${esc(A.COMPANY.name)} · Inicio">${A.COMPANY.logo ? `<img src="${A.COMPANY.logo}" alt="${esc(A.COMPANY.name)}" width="57" height="34">` : esc(A.COMPANY.short)}</a>
      <button type="button" class="icon-btn" data-act="alerts" aria-label="Avisos pendientes${n ? `: ${n}` : ''}">${icon('bell', 20)}${n ? `<span class="bell-dot">${n}</span>` : ''}</button>`;
  }
  function syncInert() { const closed = mq.matches && !sidebar.classList.contains('is-open'); if ('inert' in sidebar) sidebar.inert = closed; }
  function openNav() { sidebar.classList.add('is-open'); appEl.classList.add('nav-open'); syncInert(); const b = $('[data-act="nav-open"]'); if (b) b.setAttribute('aria-expanded', 'true'); const first = $('.sb__item', sidebar); if (first) first.focus(); }
  function closeNav(focusToggle) { if (!sidebar.classList.contains('is-open')) return; sidebar.classList.remove('is-open'); appEl.classList.remove('nav-open'); syncInert(); const b = $('[data-act="nav-open"]'); if (b) { b.setAttribute('aria-expanded', 'false'); if (focusToggle) b.focus(); } }
  APP.actions.skip = () => { const h = main.querySelector('h1') || main; if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1'); h.focus(); };
  APP.actions['nav-open'] = () => openNav();
  APP.actions['nav-close'] = () => closeNav(true);
  mq.addEventListener ? mq.addEventListener('change', () => { if (!mq.matches) closeNav(); syncInert(); }) : mq.addListener(syncInert);

  /* ---------- menú de usuaria ---------- */
  APP.actions['user-menu'] = el => {
    U.openPopover(el, `<div class="popover__head"><strong>${esc(A.USER.name)}</strong><span class="muted" style="font-size:12px">${esc(A.USER.role)}</span></div>
      <button type="button" class="popover__item" data-act="about"><span class="ico">${icon('info', 17)}</span><span><strong>Acerca de esta demo</strong><small>Qué es, datos y créditos</small></span></button>
      <button type="button" class="popover__item" data-act="reset-demo"><span class="ico ico--warn">${icon('rotate-ccw', 17)}</span><span><strong>Restablecer datos de la demo</strong><small>${A.journalSize ? `Deshace ${A.journalSize} ${A.journalSize === 1 ? 'cambio guardado' : 'cambios guardados'}` : 'No hay cambios guardados'}</small></span></button>`, 'popover--menu');
  };
  APP.actions['reset-demo'] = async () => {
    U.closePopover();
    const ok = await U.confirmDialog({ title: 'Restablecer la demo', text: 'Se borrarán las incidencias, partes, fichajes, documentos y avances que hayas registrado en este navegador, y la demo volverá a su estado inicial.', confirmLabel: 'Restablecer', danger: true });
    if (!ok) return;
    A.reset(); U.toast('Demo restablecida a su estado inicial.');
    APP.refresh();
  };
  APP.actions.about = () => {
    U.closePopover();
    U.openModal({
      title: 'Acerca de esta demo', size: 'lg',
      body: `<div style="display:grid;gap:16px;font-size:14px;color:var(--ink-2)">
        <p><strong style="color:var(--ink)">Plataforma de operaciones para ${esc(A.COMPANY.name)}.</strong> Es una demostración interactiva de cómo podría funcionar un sistema a medida que centralice obras, equipos, fichajes, partes, incidencias, costes y documentación. Ha sido diseñada por ADVENTUM Strategy como herramienta de trabajo para validar necesidades; no es una solución definitiva.</p>
        <div class="callout callout--warn">${icon('circle-alert', 16)}<span><strong>Datos ficticios.</strong> Las obras, personas, cifras, fotografías y ubicaciones son de demostración. No hay ninguna conexión con los sistemas de la empresa.</span></div>
        <ul class="ai-list">
          <li>Los cambios que hagas (incidencias, partes, fichajes, avances, documentos) se guardan solo en este navegador y puedes restablecerlos desde el menú de usuario.</li>
          <li>El asistente responde con reglas locales sobre los datos de la demo. En una versión real se conectaría a un modelo de IA a través de un servidor seguro, con permisos por usuario.</li>
          <li>La exportación CSV genera archivos reales; los informes se pueden imprimir o guardar en PDF.</li>
          <li>La web no envía datos a terceros: tipografías, imágenes y cartografía se sirven desde el propio sitio.</li>
        </ul>
        <div><p class="section-lbl">Créditos</p><p style="font-size:12.5px;color:var(--muted);line-height:1.6">Fotografías: Unsplash (licencia Unsplash) y Wikimedia Commons (CC BY-SA 4.0: «Unfertige Dinge 002» de F. Riedel; «Viviendas Donado Holmberg 2018 (05)», Gobierno de la Ciudad de Buenos Aires; «Construction crane x» de Øyvind Holmstad), recortadas y redimensionadas. Cartografía: © colaboradores de OpenStreetMap (ODbL). Iconos: Lucide (ISC). Tipografías: Inter y DM Serif Display (SIL OFL).</p></div>
      </div>`,
      foot: `<button type="submit" class="btn btn--primary">Entendido</button>`
    });
  };

  /* ---------- enrutado ---------- */
  function parse() {
    const raw = location.hash.replace(/^#\/?/, '');
    const qi = raw.indexOf('?');
    const path = qi >= 0 ? raw.slice(0, qi) : raw; const qs = qi >= 0 ? raw.slice(qi + 1) : '';
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) parts.push('inicio');
    const params = {}; new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
    let name = parts[0];
    if (name === 'obras' && parts[1]) name = 'obra';
    return { name, parts, params };
  }
  function notFound() {
    return `<div class="page">${U.pageHead({ title: 'Página no encontrada' })}${U.empty({ ico: 'circle-question-mark', title: 'Esta sección no existe', text: 'Puede que el enlace no sea correcto.', action: '<a class="btn btn--secondary" href="#/inicio">Ir al inicio</a>' })}</div>`;
  }
  function render(opts = {}) {
    const route = parse(); APP.route = route;
    const view = APP.views[route.name];
    U.closePopover();
    if (!opts.update) { const d = $('#drawer'); if (d.open) { APP.onDrawerClose = null; d.close(); d.innerHTML = ''; } const m = $('#modal'); if (m.open) { m.close(); m.innerHTML = ''; } }
    main.innerHTML = view ? view.render(route) : notFound();
    if (opts.update && main.firstElementChild) main.firstElementChild.classList.add('no-anim');
    renderSidebar(); renderMobileBar();
    const name = route.name === 'obra' ? (A.obraById(route.parts[1]) || {}).short || 'Obra' : view ? view.title : 'No encontrada';
    document.title = `${name} · ${A.COMPANY.name} (demo)`;
    if (view && view.mount) view.mount(route, opts);
    syncScrollRegions();
    if (!opts.update) {
      window.scrollTo(0, 0);
      const h = main.querySelector('h1[tabindex="-1"]');
      if (h && APP.booted) h.focus({ preventScroll: true });
    }
  }
  /* Tablas que no caben: región desplazable accesible con teclado (solo si no tienen ya elementos enfocables) */
  function syncScrollRegions() {
    main.querySelectorAll('.table-wrap').forEach(w => {
      const scrolls = w.scrollWidth > w.clientWidth + 1;
      const focusable = w.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (scrolls && !focusable) {
        if (!w.hasAttribute('tabindex')) {
          const h = w.closest('section, .card');
          const title = h && h.querySelector('h2, h3') ? h.querySelector('h2, h3').textContent.trim() : '';
          w.setAttribute('tabindex', '0'); w.setAttribute('role', 'region');
          w.setAttribute('aria-label', `${title ? `${title}: ` : ''}tabla con desplazamiento horizontal`);
        }
      } else if (w.getAttribute('role') === 'region') {
        w.removeAttribute('tabindex'); w.removeAttribute('role'); w.removeAttribute('aria-label');
      }
    });
  }
  APP.syncScrollRegions = syncScrollRegions;
  let resizeTimer = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncScrollRegions, 160); });
  function rerender() {
    const ae = document.activeElement;
    const id = ae && ae.id && main.contains(ae) ? ae.id : null;
    const sel = id && ae.setSelectionRange && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
    const key = ae && ae.dataset && ae.dataset.act === 'param' ? `[data-act="param"][data-k="${ae.dataset.k}"]` : null;
    const sy = window.scrollY;
    render({ update: true });
    window.scrollTo(0, sy);
    if (id) { const el = document.getElementById(id); if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { /* tipo sin selección */ } } }
    else if (key) { const el = main.querySelector(`${key}[aria-pressed="true"]`) || main.querySelector(key); if (el) el.focus({ preventScroll: true }); }
  }
  APP.setParams = (patch, opts = {}) => {
    const r = APP.route; const params = Object.assign({}, r.params, patch);
    Object.keys(params).forEach(k => { if (params[k] == null || params[k] === '') delete params[k]; });
    const qs = new URLSearchParams(params).toString();
    history.replaceState(null, '', `#/${r.parts.map(encodeURIComponent).join('/')}${qs ? `?${qs}` : ''}`);
    APP.route.params = params;
    if (!opts.silent) rerender();
  };
  APP.refresh = () => rerender();

  /* ---------- eventos globales ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      const link = e.target.closest('a[href^="#/"]');
      if (link && sidebar.contains(link)) closeNav();
      return;
    }
    const act = el.dataset.act;
    if (act === 'param') { e.preventDefault(); APP.setParams({ [el.dataset.k]: el.dataset.v || null }); return; }
    if (act === 'clear-params') { e.preventDefault(); const keep = {}; if (APP.route.params.vista) keep.vista = APP.route.params.vista; const all = {}; Object.keys(APP.route.params).forEach(k => { all[k] = keep[k] || null; }); APP.setParams(all); return; }
    const fn = APP.actions[act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('select[data-param]');
    if (el) APP.setParams({ [el.dataset.param]: el.value || null });
  });
  let deb = null;
  document.addEventListener('input', e => {
    const el = e.target.closest('input[data-param]');
    if (!el) return;
    clearTimeout(deb);
    deb = setTimeout(() => APP.setParams({ [el.dataset.param]: el.value.trim() || null }), 220);
  });
  document.addEventListener('submit', e => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    const fn = APP.forms[form.dataset.form]; if (fn) fn(form);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) { closeNav(true); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable;
    if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const input = $('#ai-input'); if (input) { e.preventDefault(); input.focus(); input.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
  });
  window.addEventListener('hashchange', () => { closeNav(); render(); });
  window.addEventListener('storage', e => { if (e.key && e.key.startsWith('apc-demo')) { A.load(); APP.refresh(); } });

  /* ---------- arranque ---------- */
  if (!location.hash || location.hash === '#' || location.hash === '#/') history.replaceState(null, '', '#/inicio');
  render();
  APP.booted = true;
})();
