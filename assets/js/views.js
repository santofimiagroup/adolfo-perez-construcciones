/* =============================================================================
   Vistas: Obras, detalle de obra, Equipo y Fichajes
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC, f = A.fmt, APP = window.APP, U = APP.ui;
  const { esc, $, $$, icon } = U;
  APP.render = APP.render || {};

  const seg = (name, options, current) => `<div class="seg" role="group" aria-label="${esc(options.label || '')}">${options.items.map(o => `<button type="button" data-act="param" data-k="${name}" data-v="${o.v}" aria-pressed="${String((current || options.def) === o.v)}">${esc(o.label)}${o.count != null ? ` <span class="count">${o.count}</span>` : ''}</button>`).join('')}</div>`;
  const selectParam = (name, label, opts, current, id) => `<label class="sr-only" for="${id}">${esc(label)}</label><select class="select" id="${id}" data-param="${name}">${opts.map(o => `<option value="${esc(o.v)}"${String(current || '') === String(o.v) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  const searchParam = (id, placeholder, value) => `<label class="sr-only" for="${id}">${esc(placeholder)}</label><input class="input input--search" type="search" id="${id}" data-param="q" placeholder="${esc(placeholder)}" value="${esc(value || '')}" autocomplete="off">`;
  const obraOptions = (all = 'Todas las obras') => [{ v: '', label: all }].concat(A.OBRAS.map(o => ({ v: o.id, label: o.short })));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  APP.helpers = { seg, selectParam, searchParam, obraOptions, norm };

  /* ===========================================================================
     OBRAS · listado
     ========================================================================= */
  function obrasFiltered(p) {
    const t = A.totals(); let list = t.ms.slice();
    if (p.filtro === 'atencion') list = list.filter(x => x.m.status !== 'plazo' || x.m.devPct > 3);
    if (p.filtro === 'plazo') list = list.filter(x => x.m.status === 'plazo');
    if (p.jefe) list = list.filter(x => x.o.jefe === p.jefe);
    const orden = p.orden || 'atencion';
    const sorters = { atencion: (a, b) => b.m.attention - a.m.attention, avance: (a, b) => b.o.progress - a.o.progress, presupuesto: (a, b) => b.o.budget - a.o.budget, fin: (a, b) => a.o.end - b.o.end };
    list.sort(sorters[orden] || sorters.atencion);
    return { t, list };
  }
  function obraCard({ o, m }) {
    const jefe = A.empById(o.jefe);
    const pts = n => `${f.num(n, 0)} ${Math.round(n) === 1 ? 'punto' : 'puntos'}`;
    const gapTxt = m.gap > 3 ? `<span style="color:var(--danger-ink);font-weight:600">−${pts(m.gap)}</span>` : m.gap < -1 ? `<span style="color:var(--olive-ink);font-weight:600">+${pts(-m.gap)}</span>` : '<span>En línea con lo previsto</span>';
    return `<a class="ocard" href="#/obras/${o.id}">
      <div class="ocard__media">${U.photo(o, 'sm', '', `${o.name} (imagen de demostración)`)}<div class="ocard__badges">${m.phase && m.status === 'plazo' ? `<span class="pill pill--fase pill--plain">${m.phase}</span>` : U.obraPill(m)}<span class="code">${o.code}</span></div></div>
      <div class="ocard__body">
        <div><p class="ocard__eyebrow">${esc(o.type)} · ${esc(o.town)}</p><h3 class="ocard__name">${esc(o.name)}</h3></div>
        <div class="ocard__prog">
          <div class="ocard__prog-row"><span>Avance real</span><strong>${o.progress}<span style="font-size:15px"> %</span></strong></div>
          ${U.progressBar(o, m)}
          <div class="ocard__prog-row"><span>Previsto hoy ${f.pct(m.planned)}</span>${gapTxt}</div>
        </div>
        <div class="ocard__facts">
          <div class="fact"><span>Jefe de obra</span><strong>${esc(jefe.short)}</strong></div>
          <div class="fact"><span>Fin previsto</span><strong>${f.monthYear(o.end)}</strong></div>
          <div class="fact"><span>Incidencias</span><strong>${m.open.length ? `${m.open.length} ${m.open.length === 1 ? 'abierta' : 'abiertas'}` : 'Ninguna'}</strong></div>
        </div>
      </div>
    </a>`;
  }
  function obrasTable(list) {
    return `<div class="card table-card"><div class="table-wrap"><table class="dtable dtable--stack">
      <thead><tr><th scope="col">Obra</th><th scope="col">Jefe de obra</th><th scope="col">Avance</th><th scope="col" class="r hide-lg">Previsto</th><th scope="col">Estado</th><th scope="col" class="r">Presupuesto</th><th scope="col" class="r">Desviación</th><th scope="col" class="r">Fin previsto</th><th scope="col" class="r">Incid.</th></tr></thead>
      <tbody>${list.map(({ o, m }) => `<tr>
        <td class="primary"><a href="#/obras/${o.id}" class="obra-chip"><img src="${o.photoSm}" alt="" style="object-position:${o.focus}"><span><strong>${esc(o.short)}</strong><br><small class="muted">${esc(o.town)} · ${o.code}</small></span></a></td>
        <td data-label="Jefe de obra">${U.person(o.jefe, '')}</td>
        <td data-label="Avance" class="col-progress"><div style="display:flex;align-items:center;gap:10px">${U.progressBar(o, m)}<strong class="num">${o.progress}%</strong></div></td>
        <td class="r hide-sm hide-lg">${f.pct(m.planned)}</td>
        <td data-label="Estado">${U.obraPill(m)}</td>
        <td class="r" data-label="Presupuesto">${f.eurM(o.budget)}</td>
        <td class="r" data-label="Desviación" style="color:${m.devPct > 1 ? 'var(--warn-ink)' : 'var(--olive-ink)'};font-weight:600">${f.signedPct(m.devPct)}</td>
        <td class="r" data-label="Fin">${f.dayMed(o.end)}</td>
        <td class="r" data-label="Incidencias">${m.open.length}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function renderObras(route) {
    const p = route.params; const { t, list } = obrasFiltered(p);
    const att = t.ms.filter(x => x.m.status !== 'plazo' || x.m.devPct > 3).length;
    const vista = p.vista || 'tarjetas';
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Obras' }], eyebrow: 'Operaciones', title: 'Obras', sub: `<strong>${t.obras} obras activas</strong> con ${f.eurM(t.budget)} de presupuesto · ${att} requieren atención por plazo o coste.`, actions: `<button type="button" class="btn btn--secondary" data-act="obras-csv">${icon('download', 16)}Exportar CSV</button>` })}
      <div class="toolbar">
        ${seg('filtro', { label: 'Filtrar obras', def: 'todas', items: [{ v: 'todas', label: 'Todas', count: t.obras }, { v: 'atencion', label: 'Requieren atención', count: att }, { v: 'plazo', label: 'En plazo', count: t.ms.filter(x => x.m.status === 'plazo').length }] }, p.filtro)}
        ${selectParam('jefe', 'Jefe de obra', [{ v: '', label: 'Todos los jefes de obra' }].concat(A.EMPLEADOS.filter(e => e.cat === 'jefe').map(e => ({ v: e.id, label: e.short }))), p.jefe, 'f-jefe')}
        ${selectParam('orden', 'Ordenar', [{ v: 'atencion', label: 'Ordenar por atención' }, { v: 'avance', label: 'Ordenar por avance' }, { v: 'presupuesto', label: 'Ordenar por presupuesto' }, { v: 'fin', label: 'Ordenar por fecha de fin' }], p.orden || 'atencion', 'f-orden')}
        <span class="toolbar__spacer"></span>
        ${seg('vista', { label: 'Vista', def: 'tarjetas', items: [{ v: 'tarjetas', label: 'Tarjetas' }, { v: 'tabla', label: 'Tabla' }] }, vista)}
      </div>
      ${list.length ? (vista === 'tabla' ? obrasTable(list) : `<div class="ogrid">${list.map(obraCard).join('')}</div>`) : U.empty({ ico: 'building', title: 'No hay obras con estos filtros', text: 'Prueba a cambiar el filtro o el jefe de obra.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      ${U.footer()}
    </div>`;
  }
  APP.actions['obras-csv'] = () => {
    const { list } = obrasFiltered(APP.route.params);
    U.downloadCSV(`obras_${A.iso(A.REF)}.csv`,
      ['Código', 'Obra', 'Tipo', 'Municipio (ficticio)', 'Jefe de obra', 'Inicio', 'Fin previsto', 'Avance real (%)', 'Avance previsto (%)', 'Estado', 'Presupuesto (€)', 'Coste ejecutado (€)', 'Previsión al cierre (€)', 'Desviación (€)', 'Desviación (%)', 'Incidencias abiertas'],
      list.map(({ o, m }) => [o.code, o.name, o.type, o.town, A.empById(o.jefe).name, A.iso(o.start), A.iso(o.end), o.progress, U.csvNum(m.planned, 1), m.statusLabel, U.csvNum(o.budget, 0), U.csvNum(m.ac, 0), U.csvNum(m.eac, 0), U.csvNum(m.dev, 0), U.csvNum(m.devPct, 2), m.open.length]));
  };
  APP.views.obras = { render: renderObras, title: 'Obras' };

  /* ===========================================================================
     OBRA · detalle
     ========================================================================= */
  const TABS = [['resumen', 'Resumen'], ['equipo', 'Equipo'], ['partes', 'Partes'], ['incidencias', 'Incidencias'], ['economico', 'Economía'], ['documentos', 'Documentación']];
  function renderObra(route) {
    const o = A.obraById(route.parts[1]);
    if (!o) return `<div class="page">${U.pageHead({ crumbs: [{ label: 'Obras', href: '#/obras' }, { label: 'No encontrada' }], title: 'Obra no encontrada' })}${U.empty({ ico: 'building', title: 'Esta obra no existe', text: 'Puede que el enlace no sea correcto.', action: '<a class="btn btn--secondary" href="#/obras">Volver a obras</a>' })}</div>`;
    const m = A.metrics(o); const tab = TABS.some(x => x[0] === route.parts[2]) ? route.parts[2] : 'resumen';
    const jefe = A.empById(o.jefe); const enc = o.encargado ? A.empById(o.encargado) : null;
    const gi = Math.min(Number(route.params.foto || 0), o.gallery.length - 1);
    const [gp, gcap] = o.gallery[gi];
    const counts = { partes: A.partes.filter(p => p.obra === o.id).length, incidencias: m.open.length, documentos: A.documentos.filter(d => d.obra === o.id).length, equipo: o.team.length };
    const gapLine = m.gap > 3 ? `<span style="color:var(--danger-ink)">${f.num(m.gap, 0)} puntos por detrás de lo previsto · retraso estimado ${m.daysBehind >= 14 ? `${Math.round(m.daysBehind / 7)} semanas` : `${m.daysBehind} días`}</span>` : m.gap < -1 ? `<span style="color:var(--olive-ink)">${f.num(-m.gap, 0)} puntos por delante de lo previsto</span>` : `<span style="color:var(--olive-ink)">En línea con la planificación</span>`;
    return `<div class="page">
      <header class="page-head" style="padding-bottom:8px">
        <div class="page-head__bar"><nav class="crumbs" aria-label="Ruta"><a href="#/inicio">${icon('house', 14)}<span class="sr-only">Inicio</span></a>${icon('chevron-right', 13)}<a href="#/obras">Obras</a>${icon('chevron-right', 13)}<span aria-current="page">${esc(o.short)}</span></nav><div class="page-head__tools">${U.utilityTools()}</div></div>
      </header>
      <section class="ohead">
        <div>
          <p class="eyebrow">${o.code} · ${esc(o.type)}</p>
          <h1 class="ohead__title" tabindex="-1">${esc(o.name)}</h1>
          <p class="ohead__loc">${icon('map-pin', 15)}${esc(o.town)} · ${esc(o.place)} <span class="tag" style="margin-left:4px">Ubicación ficticia</span></p>
          <div class="ohead__tags">${U.obraPill(m)}${U.phasePill(m)}<span class="pill pill--plain">${esc(o.client)}</span></div>
          <p class="ohead__scope">${esc(o.scope)}.</p>
          <div class="ofacts">
            <div class="fact"><span>Jefe de obra</span><div class="person">${U.avatar(o.jefe, 'sm')}<strong>${esc(jefe.short)}</strong></div></div>
            <div class="fact"><span>Encargado</span>${enc ? `<div class="person">${U.avatar(o.encargado, 'sm')}<strong>${esc(enc.short)}</strong></div>` : '<strong>Asume el jefe de obra</strong>'}</div>
            <div class="fact"><span>Equipo</span><strong>${o.team.length} propios · ${o.subcontract} subcontrata</strong></div>
            <div class="fact"><span>Inicio</span><strong>${f.dayMed(o.start)}</strong></div>
            <div class="fact"><span>Fin previsto</span><strong>${f.dayMed(o.end)}</strong></div>
            <div class="fact"><span>Presupuesto</span><strong>${f.eur(o.budget)}</strong></div>
          </div>
          <div class="ohead__actions">
            <button type="button" class="btn btn--primary" data-act="obra-progress" data-id="${o.id}">${icon('trending-up', 16)}Actualizar avance</button>
            <button type="button" class="btn btn--secondary" data-act="inc-new" data-obra="${o.id}">${icon('triangle-alert', 16)}Nueva incidencia</button>
            <button type="button" class="btn btn--secondary" data-act="parte-new" data-obra="${o.id}">${icon('clipboard-list', 16)}Nuevo parte</button>
          </div>
        </div>
        <div class="ohead__gallery">
          <div class="gallery__main">${U.photo({ photo: gp, focus: gi === 0 ? o.focus : '50% 50%' }, 'lg', '', `${gcap} (imagen de demostración)`).replace('loading="lazy"', 'loading="eager"')}<div class="gallery__cap"><span>${esc(gcap)}</span><span>${gi + 1} / ${o.gallery.length}</span></div></div>
          <div class="gallery__thumbs" role="group" aria-label="Fotografías de la obra">${o.gallery.map(([ph, cap], i) => `<button type="button" data-act="gallery" data-i="${i}" aria-pressed="${i === gi}" aria-label="Ver fotografía: ${esc(cap)}"><img src="assets/img/obras/${ph}-sm.jpg" alt="" loading="lazy"></button>`).join('')}</div>
        </div>
      </section>
      <section class="card progress-band" aria-label="Avance de la obra">
        <div>
          <div class="progress-band__big">${o.progress}<small> %</small></div>
          <p class="progress-band__lbl">Avance real registrado · previsto hoy <strong>${f.pct(m.planned)}</strong></p>
          <p class="progress-band__gap">${gapLine}</p>
        </div>
        <div>${U.sCurve(o, m)}<div class="legend" style="margin-top:6px"><span><i></i>Avance real</span><span><i class="line" style="background:#9A9D96"></i>Planificación</span></div></div>
        <div class="progress-band__eco">
          <div class="fact"><span>Coste ejecutado</span><strong>${f.eurAuto(m.ac)}</strong></div>
          <div class="fact"><span>Previsión al cierre</span><strong>${f.eurAuto(m.eac)}</strong></div>
          <div class="fact"><span>Desviación prevista</span><strong style="color:${m.dev > 0 ? 'var(--warn-ink)' : 'var(--olive-ink)'}">${f.signedEur(m.dev)} · ${f.signedPct(m.devPct)}</strong></div>
        </div>
      </section>
      <div class="tabs" role="tablist" aria-label="Secciones de la obra">${TABS.map(([k, l]) => `<a role="tab" class="tab" href="#/obras/${o.id}/${k}" aria-selected="${k === tab}" aria-controls="panel-${k}" id="tab-${k}">${l}${counts[k] != null ? ` <span class="count">${counts[k]}</span>` : ''}</a>`).join('')}</div>
      <section id="panel-${tab}" role="tabpanel" aria-labelledby="tab-${tab}">${obraTab(o, m, tab)}</section>
      ${U.footer()}
    </div>`;
  }
  function obraTab(o, m, tab) {
    if (tab === 'equipo') {
      return `<div class="pgrid">${o.team.map(id => personCard(A.empById(id))).join('')}</div>
        <p class="callout" style="margin-top:16px">${icon('info', 16)}<span>Además del equipo propio, la obra cuenta con <strong>${o.subcontract} personas de subcontratas</strong>. En una versión completa, sus fichajes y su documentación de coordinación de actividades (CAE) se gestionarían desde aquí.</span></p>`;
    }
    if (tab === 'partes') {
      const list = A.partes.filter(p => p.obra === o.id).sort((a, b) => b.date - a.date);
      return `<div class="toolbar"><p class="result-count">${list.length} partes · ${list.filter(p => p.status === 'pendiente').length} pendientes de validar</p><span class="toolbar__spacer"></span><button type="button" class="btn btn--primary btn--sm" data-act="parte-new" data-obra="${o.id}">${icon('plus', 15)}Nuevo parte</button></div>
        ${list.length ? `<div class="rows">${list.map(p => APP.render.parteRow(p)).join('')}</div>` : U.empty({ ico: 'clipboard-list', title: 'Sin partes de trabajo', text: 'Todavía no se ha registrado ningún parte en esta obra.' })}`;
    }
    if (tab === 'incidencias') {
      const list = A.incidencias.filter(i => i.obra === o.id).sort((a, b) => (A.OPEN(b.status) - A.OPEN(a.status)) || b.openedAt - a.openedAt);
      return `<div class="toolbar"><p class="result-count">${m.open.length} abiertas · ${list.length - m.open.length} resueltas</p><span class="toolbar__spacer"></span><button type="button" class="btn btn--primary btn--sm" data-act="inc-new" data-obra="${o.id}">${icon('plus', 15)}Nueva incidencia</button></div>
        ${list.length ? `<div class="rows">${list.map(i => APP.render.incRow(i)).join('')}</div>` : U.empty({ ico: 'circle-check', title: 'Sin incidencias', text: 'Esta obra no tiene incidencias registradas.' })}`;
    }
    if (tab === 'documentos') {
      const list = A.documentos.filter(d => d.obra === o.id);
      return list.length ? `<div class="rows">${list.map(d => APP.render.docRow(d)).join('')}</div>` : U.empty({ ico: 'folder-open', title: 'Sin documentos', text: 'No hay documentación asociada a esta obra.' });
    }
    if (tab === 'economico') {
      const ch = A.chaptersOf(o, m);
      const tot = ch.reduce((s, c) => ({ b: s.b + c.budget, ev: s.ev + c.ev, c: s.c + c.cost }), { b: 0, ev: 0, c: 0 });
      return `<div class="two-col">
        <section class="card table-card"><div class="card__head"><div><h2 class="card__title">Coste por capítulo</h2><p class="card__sub">Presupuesto, avance y coste real de cada capítulo</p></div></div>
          <div class="table-wrap"><table class="dtable dtable--stack"><thead><tr><th scope="col">Capítulo</th><th scope="col" class="r">Presupuesto</th><th scope="col" class="r">Avance</th><th scope="col" class="r">Coste real</th><th scope="col" class="r">Desviación</th></tr></thead>
          <tbody>${ch.map(c => { const d = c.cost - c.ev; return `<tr><td class="primary"><strong>${esc(c.name)}</strong></td><td class="r" data-label="Presupuesto">${f.eur(Math.round(c.budget))}</td><td class="r" data-label="Avance">${c.progress} %</td><td class="r" data-label="Coste real">${c.cost ? f.eur(Math.round(c.cost)) : '—'}</td><td class="r" data-label="Desviación" style="font-weight:600;color:${d > 1000 ? 'var(--warn-ink)' : d < -1000 ? 'var(--olive-ink)' : 'var(--muted)'}">${Math.abs(d) < 500 ? '—' : f.signedEur(d)}</td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td>Total obra</td><td class="r">${f.eur(Math.round(tot.b))}</td><td class="r">${o.progress} %</td><td class="r">${f.eur(Math.round(tot.c))}</td><td class="r">${f.signedEur(tot.c - tot.ev)}</td></tr></tfoot></table></div></section>
        <section class="card"><div class="card__head"><div><h2 class="card__title">Coste mensual</h2><p class="card__sub">Coste real (barras) frente a planificado (marca)</p></div></div><div class="card__body">${U.monthlyChart(A.monthlyCost(6, o.id), { h: 240 })}<div class="legend" style="margin-top:8px"><span><i class="sand" style="background:#C9C2B4"></i>Coste real</span><span><i class="line"></i>Planificado</span><span>* mes en curso</span></div></div></section>
      </div>
      <p class="method">${icon('info', 15)}<span>Desviación de cada capítulo = coste real − presupuesto correspondiente a su avance. La previsión al cierre suma al coste real el presupuesto del trabajo pendiente.</span></p>`;
    }
    // resumen
    const ch = A.chaptersOf(o, m);
    const next = o.milestones.filter(x => x.date >= A.REF);
    return `<div class="two-col">
      <section class="card"><div class="card__head"><div><h2 class="card__title">Capítulos de obra</h2><p class="card__sub">Avance físico por capítulo (peso sobre el presupuesto)</p></div></div>
        <div class="chapters">${ch.map(c => `<div class="chapter"><span>${esc(c.name)}<span class="w">${c.weight} %</span></span><div class="bar bar--thin"><i style="width:${c.progress}%;${c.progress >= 100 ? 'background:#8FA289' : ''}"></i></div><span class="num">${c.progress} %</span></div>`).join('')}</div></section>
      <div class="stack">
        <section class="card"><div class="card__head"><h2 class="card__title">Próximos hitos</h2></div>
          <div class="milestones">${next.length ? next.map(x => `<div class="ms"><span class="ms__date"><b>${x.date.getDate()}</b><small>${f.monthShort(x.date)}</small></span><span class="ms__text">${esc(x.label)}<small>${f.cap(f.weekday(x.date))} · dentro de ${A.daysBetween(A.REF, x.date)} días</small></span></div>`).join('') : '<p class="muted">Sin hitos pendientes.</p>'}</div></section>
        <section class="card"><div class="card__head"><h2 class="card__title">Actividad de la obra</h2></div>
          <div class="timeline">${APP.home.activityHTML(APP.home.activityItems(5, o.id), { showObra: false })}</div></section>
      </div>
    </div>`;
  }
  APP.actions.gallery = el => { APP.setParams({ foto: el.dataset.i === '0' ? null : el.dataset.i }); };
  APP.actions['obra-progress'] = el => {
    const o = A.obraById(el.dataset.id); const m0 = A.metrics(o);
    U.openModal({
      title: 'Actualizar avance', sub: `${esc(o.name)} · avance actual ${o.progress} % · previsto hoy ${f.pct(m0.planned)}`, submitLabel: 'Guardar avance',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="pg-range">Avance físico real</label>
          <div style="display:flex;align-items:center;gap:16px"><input type="range" id="pg-range" name="progress" min="0" max="100" step="1" value="${o.progress}" aria-describedby="pg-preview"><output id="pg-out" style="font-family:var(--serif);font-size:30px;min-width:76px;text-align:right">${o.progress} %</output></div>
          <p class="hint" id="pg-preview"></p></div>
        <div class="field span-2"><label for="pg-note">Comentario <span class="muted" style="font-weight:400">(opcional)</span></label><input class="input" id="pg-note" name="note" maxlength="120" placeholder="Ej.: terminado el cerramiento de la planta 3"></div>
      </div>`,
      onOpen: form => {
        const r = form.elements.progress; const out = $('#pg-out'); const pv = $('#pg-preview');
        const upd = () => { const v = Number(r.value); out.textContent = `${v} %`; const gap = m0.planned - v; const st = v >= 100 ? 'Terminada' : gap > 8 ? 'Retrasada' : gap > 3 ? 'En riesgo' : 'En plazo'; pv.innerHTML = `Estado resultante: <strong>${st}</strong> (${gap > 0 ? `${f.num(gap, 0)} puntos por detrás` : `${f.num(-gap, 0)} puntos por delante`} de lo previsto).`; };
        r.addEventListener('input', upd); upd();
      },
      onSubmit: form => {
        const v = Number(form.elements.progress.value);
        if (v === o.progress) { U.toast('El avance no ha cambiado.', { type: 'info' }); return; }
        A.commit({ type: 'obra.progress', id: o.id, progress: v, note: form.elements.note.value.trim() });
        U.toast(`Avance de <strong>${esc(o.short)}</strong> actualizado al ${v} %. Los indicadores y el asistente ya usan el nuevo dato.`);
        APP.refresh();
      }
    });
  };
  APP.views.obra = { render: renderObra, title: 'Obra' };

  /* ===========================================================================
     EQUIPO
     ========================================================================= */
  function todayRec(empId) { return A.todayFichajes().find(fc => fc.emp === empId); }
  function statusOf(empId) {
    const r = todayRec(empId);
    if (!r) return ['sin', 'Sin registro'];
    if (r.status === 'ausencia') return ['ausencia', r.note.replace(/\.$/, '').split('(')[0].split(':')[0].trim()];
    if (!r.in) return ['sin', 'Sin fichar'];
    if (r.status === 'revision') return ['revision', `Por revisar · ${f.time(r.in)}`];
    return ['presente', `En ${r.obra === 'oficina' ? 'oficina' : 'obra'} · ${f.time(r.in)}`];
  }
  function weekHours(empId) { return A.fichajes.filter(fc => fc.emp === empId && A.daysBetween(fc.date, A.REF) < 7).reduce((s, fc) => s + (A.hoursOf(fc) || 0), 0); }
  function personCard(e) {
    const [st, label] = statusOf(e.id);
    return `<button type="button" class="pcard" data-act="person" data-id="${e.id}">
      <div class="pcard__top">${U.avatar(e.id, 'lg')}<div><p class="pcard__name">${esc(e.name)}</p><p class="pcard__role">${esc(e.role)}</p></div></div>
      <div class="pcard__obras">${e.obras.length ? e.obras.map(id => `<span class="tag">${esc(A.obraById(id).short)}</span>`).join('') : `<span class="tag">${esc(e.note || 'Oficina')}</span>`}</div>
      <div class="pcard__status"><span class="statusdot statusdot--${st}">${esc(label)}</span><span class="pcard__hours" title="Horas registradas en los últimos 7 días">${f.num(weekHours(e.id), 1)} h</span></div>
    </button>`;
  }
  function equipoFiltered(p) {
    let list = A.EMPLEADOS.slice();
    if (p.cat) list = list.filter(e => e.cat === p.cat);
    if (p.obra) list = list.filter(e => e.obras.includes(p.obra));
    if (p.q) { const q = norm(p.q); list = list.filter(e => norm(`${e.name} ${e.role}`).includes(q)); }
    return list;
  }
  function renderEquipo(route) {
    const p = route.params; const list = equipoFiltered(p); const t = A.totals();
    const catCount = c => A.EMPLEADOS.filter(e => e.cat === c).length;
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Equipo' }], eyebrow: 'Operaciones', title: 'Equipo', sub: `<strong>${t.employees} personas</strong> en plantilla · ${t.present.length} han fichado ${A.IS_WEEKEND ? 'en la última jornada' : 'hoy'} · ${catCount('jefe')} jefes de obra y ${catCount('encargado')} encargados.`, actions: `<button type="button" class="btn btn--secondary" data-act="equipo-csv">${icon('download', 16)}Exportar CSV</button>` })}
      <div class="toolbar">
        ${seg('cat', { label: 'Categoría', def: '', items: [{ v: '', label: 'Todos', count: t.employees }].concat(Object.entries(A.CATEGORIES).map(([k, l]) => ({ v: k, label: l, count: catCount(k) }))) }, p.cat || '')}
        ${selectParam('obra', 'Obra', obraOptions(), p.obra, 'f-obra')}
        ${searchParam('f-q', 'Buscar por nombre o puesto', p.q)}
      </div>
      ${list.length ? `<div class="pgrid">${list.map(personCard).join('')}</div>` : U.empty({ ico: 'users', title: 'Nadie coincide con la búsqueda', text: 'Revisa el nombre o cambia los filtros.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      <p class="method">${icon('lock', 15)}<span>Personas ficticias creadas para la demostración. No se utilizan datos personales reales de la plantilla.</span></p>
      ${U.footer()}
    </div>`;
  }
  function openPerson(id) {
    const e = A.empById(id); if (!e) return;
    const [st, label] = statusOf(e.id);
    const recs = A.fichajes.filter(fc => fc.emp === e.id).sort((a, b) => b.date - a.date).slice(0, 5);
    const partes = A.partes.filter(p => p.author === e.id || p.crew.includes(e.id)).sort((a, b) => b.date - a.date).slice(0, 3);
    U.openDrawer({
      eyebrow: `${esc(A.CATEGORIES[e.cat])} · ${e.id}`, title: esc(e.name), label: `Ficha de ${e.name}`,
      body: `<div style="display:flex;align-items:center;gap:14px">${U.avatar(e.id, 'xl')}<div><p style="font-size:15px;font-weight:600">${esc(e.role)}</p><p class="muted">${e.obras.length ? e.obras.map(i => esc(A.obraById(i).short)).join(' · ') : esc(e.note || '')}</p><p style="margin-top:8px"><span class="statusdot statusdot--${st}">${esc(label)}</span></p></div></div>
        <dl class="dl"><dt>En la empresa desde</dt><dd>${e.since}</dd><dt>Horas (últimos 7 días)</dt><dd>${f.hours(weekHours(e.id))}</dd><dt>Formación PRL</dt><dd>${e.prl.map(esc).join('<br>')}</dd></dl>
        <div><p class="section-lbl">Últimos fichajes</p><table class="mtable"><thead><tr><th>Día</th><th>Obra</th><th>Entrada</th><th>Salida</th><th>Horas</th></tr></thead><tbody>${recs.map(r => `<tr><td>${f.cap(f.weekdayShort(r.date))}</td><td>${r.obra === 'oficina' ? 'Oficina' : esc((A.obraById(r.obra) || {}).short || '—')}</td><td>${r.status === 'ausencia' ? '<span class="muted">Ausencia</span>' : f.time(r.in)}</td><td>${r.out ? f.time(r.out) : r.in ? '<span class="muted">—</span>' : ''}</td><td>${A.hoursOf(r) != null ? f.hours(A.hoursOf(r)) : '—'}</td></tr>`).join('')}</tbody></table></div>
        <div><p class="section-lbl">Partes recientes</p>${partes.length ? `<ul class="log">${partes.map(p => `<li><span><strong>${p.id}</strong> · ${esc(A.obraById(p.obra).short)}<small>${esc(p.work)}</small></span></li>`).join('')}</ul>` : '<p class="muted">No figura en partes recientes.</p>'}</div>`,
      foot: `<a class="btn btn--secondary" href="#/fichajes?q=${encodeURIComponent(e.first)}">${icon('clock-4', 15)}Ver sus fichajes</a>`
    });
    APP.onDrawerClose = () => { if (APP.route.params.id) APP.setParams({ id: null }, { silent: true }); };
  }
  APP.actions.person = el => openPerson(el.dataset.id);
  APP.actions['equipo-csv'] = () => {
    const list = equipoFiltered(APP.route.params);
    U.downloadCSV(`equipo_${A.iso(A.REF)}.csv`, ['ID', 'Nombre', 'Puesto', 'Categoría', 'Obras asignadas', 'En la empresa desde', 'Estado del día', 'Horas últimos 7 días'],
      list.map(e => [e.id, e.name, e.role, A.CATEGORIES[e.cat], e.obras.map(i => A.obraById(i).short).join(', ') || (e.note || 'Oficina'), e.since, statusOf(e.id)[1], U.csvNum(weekHours(e.id), 2)]));
  };
  APP.views.equipo = { render: renderEquipo, title: 'Equipo', mount: route => { if (route.params.id) openPerson(route.params.id); } };
  APP.render.personCard = personCard;

  /* ===========================================================================
     FICHAJES
     ========================================================================= */
  const ABS_REASONS = ['Vacaciones', 'Asuntos propios', 'Permiso retribuido', 'Ausencia injustificada'];
  function fichajesFiltered(p) {
    const day = p.dia ? A.fichajes.find(fc => fc.dateIso === p.dia) ? p.dia : A.iso(A.REF) : A.iso(A.REF);
    let list;
    if (p.estado === 'revision') list = A.reviewFichajes().slice();
    else {
      list = A.fichajes.filter(fc => fc.dateIso === day);
      if (p.estado === 'presente') list = list.filter(fc => fc.status === 'presente' || fc.status === 'cerrado');
      else if (p.estado) list = list.filter(fc => fc.status === p.estado);
    }
    if (p.obra) list = list.filter(fc => fc.obra === p.obra);
    if (p.q) { const q = norm(p.q); list = list.filter(fc => norm(A.empById(fc.emp).name).includes(q)); }
    const rank = { revision: 0, pendiente: 1, ausencia: 3, presente: 2, cerrado: 2 };
    list.sort((a, b) => (b.date - a.date) || (rank[a.status] - rank[b.status]) || ((a.in || 0) - (b.in || 0)));
    return { day, list };
  }
  function fichajeRow(fc, showDay) {
    const e = A.empById(fc.emp); const h = A.hoursOf(fc);
    const needs = fc.status === 'revision' || fc.status === 'pendiente';
    const geo = fc.in ? (fc.geo === 'fuera' ? `<span title="Fuera de la geocerca de la obra" style="color:var(--danger-ink)">${icon('map-pin', 13)}</span>` : fc.geo === 'validado' ? `<span title="Validado por oficina" style="color:var(--olive)">${icon('circle-check', 13)}</span>` : `<span title="${esc(fc.origin)} · dentro de la geocerca" style="color:var(--muted-2)">${icon('map-pin', 13)}</span>`) : '';
    const live = fc.status === 'presente' && !fc.out && A.sameDay(fc.date, A.REF);
    return `<tr${fc._new ? ' class="is-highlight"' : ''}>
      <td class="primary">${U.person(fc.emp, e.role)}</td>
      ${showDay ? `<td data-label="Día" class="nowrap">${f.cap(f.weekdayShort(fc.date))}</td>` : ''}
      <td data-label="Obra">${U.obraChip(fc.obra)}</td>
      <td data-label="Entrada" class="nowrap"><span style="display:inline-flex;align-items:center;gap:6px">${fc.in ? `<strong class="num">${f.time(fc.in)}</strong>${geo}` : '<span class="muted">—</span>'}</span></td>
      <td data-label="Salida" class="nowrap">${fc.out ? `<strong class="num">${f.time(fc.out)}</strong>` : live ? '<span class="muted">En curso</span>' : '<span class="muted">—</span>'}</td>
      <td data-label="Horas" class="r nowrap hide-md">${h != null ? f.hours(h) : '—'}</td>
      <td data-label="Estado">${U.fichajePill(fc.status)}</td>
      <td class="hide-sm"><span class="cell-note">${esc(fc.note || (fc.origin && fc.status !== 'ausencia' ? fc.origin : ''))}</span></td>
      <td class="r">${needs ? `<button type="button" class="btn btn--secondary btn--xs" data-act="fichaje-resolve" data-id="${fc.id}">Resolver</button>` : ''}</td>
    </tr>`;
  }
  function renderFichajes(route) {
    const p = route.params; const { day, list } = fichajesFiltered(p);
    const days = []; for (let n = 0; n < 10; n++) days.push(A.workday(-n));
    const dayRecs = A.fichajes.filter(fc => fc.dateIso === day);
    const isToday = day === A.iso(A.REF);
    const cnt = s => dayRecs.filter(fc => s === 'presente' ? (fc.status === 'presente' || fc.status === 'cerrado') : fc.status === s).length;
    const review = A.reviewFichajes();
    const showDay = p.estado === 'revision';
    const dObj = days.find(d => A.iso(d) === day) || A.REF;
    const boxes = [
      ['presente', isToday ? 'Presentes' : 'Jornadas completas', isToday ? 'Entrada registrada' : 'Entrada y salida'],
      ['pendiente', 'Pendientes de salida', 'Falta fichar la salida'],
      ['ausencia', 'Ausencias registradas', 'Vacaciones y permisos'],
      ['revision', 'Revisión necesaria', 'Anomalías del día']
    ];
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Fichajes' }], eyebrow: 'Operaciones', title: 'Fichajes', sub: `Registro de entradas y salidas desde la app de obra y la tableta de oficina · <strong>${review.length} fichajes pendientes de revisión</strong>.`, actions: `<button type="button" class="btn btn--secondary" data-act="fichajes-csv">${icon('download', 16)}Exportar CSV</button><button type="button" class="btn btn--primary" data-act="fichaje-manual">${icon('plus', 16)}Registrar fichaje manual</button>` })}
      <div class="days" role="group" aria-label="Día">${days.map(d => { const di = A.iso(d); const flag = A.fichajes.some(fc => fc.dateIso === di && (fc.status === 'revision' || fc.status === 'pendiente')); return `<button type="button" class="day" data-act="param" data-k="dia" data-v="${di === A.iso(A.REF) ? '' : di}" aria-pressed="${!showDay && di === day}"><small>${A.sameDay(d, A.REF) && !A.IS_WEEKEND ? 'Hoy' : f.cap(f.weekday(d)).slice(0, 3)}</small><b>${d.getDate()}</b><span class="sr-only">, ${esc(f.dayLong(d))}${flag ? ', con fichajes por revisar' : ''}</span>${flag ? '<span class="flag" aria-hidden="true"></span>' : ''}</button>`; }).join('')}</div>
      ${showDay ? `<div class="callout callout--warn" style="margin-bottom:18px">${icon('circle-alert', 16)}<span>Mostrando los <strong>${list.length} fichajes pendientes de revisión</strong> de los últimos 10 días laborables. <button type="button" class="link" data-act="param" data-k="estado" data-v="" style="border:0;background:none;padding:0">Volver al día</button></span></div>` : `
      <div class="sumstrip" role="group" aria-label="Filtrar por estado · ${esc(f.dayLong(dObj))}">${boxes.map(([k, l, s]) => `<button type="button" class="sumbox" data-act="param" data-k="estado" data-v="${p.estado === k ? '' : k}" aria-pressed="${p.estado === k}"><b>${cnt(k)}</b><span><strong>${l}</strong>${s}</span></button>`).join('')}</div>`}
      <div class="toolbar">
        ${selectParam('obra', 'Obra', obraOptions('Todas las obras').concat([{ v: 'oficina', label: 'Oficina central' }]), p.obra, 'f-obra')}
        ${searchParam('f-q', 'Buscar persona', p.q)}
        <span class="toolbar__spacer"></span>
        <span class="result-count">${list.length} registros${showDay ? '' : ` · ${f.dayLong(dObj)}`}</span>
        ${!showDay && review.length ? `<button type="button" class="btn btn--secondary btn--sm" data-act="param" data-k="estado" data-v="revision">${icon('circle-alert', 15)}Ver todos los pendientes (${review.length})</button>` : ''}
      </div>
      ${list.length ? `<div class="card table-card"><div class="table-wrap"><table class="dtable dtable--stack">
        <thead><tr><th scope="col">Persona</th>${showDay ? '<th scope="col">Día</th>' : ''}<th scope="col">Obra</th><th scope="col">Entrada</th><th scope="col">Salida</th><th scope="col" class="r hide-md">Horas</th><th scope="col">Estado</th><th scope="col">Observaciones</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>${list.map(fc => fichajeRow(fc, showDay)).join('')}</tbody></table></div></div>` : U.empty({ ico: 'clock-4', title: p.estado === 'revision' ? 'No hay fichajes pendientes' : 'No hay registros con estos filtros', text: p.estado === 'revision' ? 'Todos los fichajes están revisados.' : 'Prueba con otro día, estado u obra.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      <p class="method">${icon('shield-check', 15)}<span>Registro diario de jornada (art. 34.9 del Estatuto de los Trabajadores, conservación de 4 años). Cada corrección queda trazada: quién, cuándo y por qué. La ubicación solo se comprueba en el momento de fichar, sin seguimiento continuo (art. 90 LOPDGDD: la plantilla debe estar informada previamente). Fichajes ficticios; horas efectivas descontando 1 h de comida en jornada partida.</span></p>
      ${U.footer()}
    </div>`;
  }
  APP.actions['fichaje-resolve'] = el => {
    const fc = A.fichajes.find(x => x.id === el.dataset.id); if (!fc) return;
    const e = A.empById(fc.emp);
    let body, onSubmit;
    if (fc.status === 'pendiente') {
      body = `<div class="callout callout--warn">${icon('clock-4', 16)}<span>Entrada a las <strong>${f.time(fc.in)}</strong> el ${f.dayLong(fc.date)} sin fichaje de salida.</span></div>
        <div class="form-grid" style="margin-top:16px"><div class="field"><label for="rs-out">Hora de salida<span class="req">*</span></label><input class="input" type="time" id="rs-out" name="out" value="${fc.date.getDay() === 5 ? '14:30' : '17:30'}" required></div>
        <div class="field span-2"><label for="rs-note">Observaciones<span class="req">*</span></label><input class="input" id="rs-note" name="note" placeholder="Ej.: confirmado con el encargado" maxlength="120"></div></div>`;
      onSubmit = form => {
        if (!U.validate(form, { out: { required: true, custom: v => { const [h, m] = v.split(':').map(Number); const out = A.at(fc.date, h, m); return out <= fc.in ? 'La salida debe ser posterior a la entrada.' : ''; } }, note: { required: true, min: 4 } })) return false;
        const [h, m] = form.elements.out.value.split(':').map(Number);
        A.commit({ type: 'fichaje.resolve', id: fc.id, action: 'salida', out: A.at(fc.date, h, m).toISOString(), note: form.elements.note.value.trim() });
        U.toast(`Salida de <strong>${esc(e.short)}</strong> registrada a las ${form.elements.out.value}.`); APP.refresh();
      };
    } else if (fc.in) {
      body = `<div class="callout callout--danger">${icon('map-pin', 16)}<span>${esc(fc.note)}</span></div>
        <fieldset style="border:0;padding:0;margin:16px 0 0;display:grid;gap:10px"><legend class="label" style="font-size:12.5px;font-weight:600;margin-bottom:8px">¿Qué quieres hacer?</legend>
        <label class="radio-card"><input type="radio" name="action" value="validar" checked><span><strong>Validar el fichaje</strong><small>El trabajador estaba en la obra (por ejemplo, fichó al llegar al acopio).</small></span></label>
        <label class="radio-card"><input type="radio" name="action" value="ausencia"><span><strong>Anular y registrar ausencia</strong><small>El fichaje no corresponde a una jornada en obra.</small></span></label></fieldset>
        <div class="field" style="margin-top:14px"><label for="rs-note">Observaciones<span class="req">*</span></label><input class="input" id="rs-note" name="note" placeholder="Ej.: confirmado por el encargado" maxlength="120"></div>`;
      onSubmit = form => {
        if (!U.validate(form, { note: { required: true, min: 4 } })) return false;
        const action = form.elements.action.value;
        A.commit({ type: 'fichaje.resolve', id: fc.id, action, note: form.elements.note.value.trim() });
        U.toast(action === 'validar' ? `Fichaje de <strong>${esc(e.short)}</strong> validado.` : `Registrada la ausencia de <strong>${esc(e.short)}</strong>.`); APP.refresh();
      };
    } else {
      body = `<div class="callout callout--danger">${icon('user-x', 16)}<span>${esc(fc.note)}</span></div>
        <fieldset style="border:0;padding:0;margin:16px 0 0;display:grid;gap:10px"><legend class="label" style="font-size:12.5px;font-weight:600;margin-bottom:8px">¿Qué quieres hacer?</legend>
        <label class="radio-card"><input type="radio" name="action" value="entrada" checked><span><strong>Registrar la entrada manualmente</strong><small>Está trabajando pero no pudo fichar (por ejemplo, sin batería).</small></span></label>
        <label class="radio-card"><input type="radio" name="action" value="ausencia"><span><strong>Registrar una ausencia</strong><small>No ha acudido a la obra.</small></span></label></fieldset>
        <div class="form-grid" style="margin-top:14px">
          <div class="field" data-show="entrada"><label for="rs-in">Hora de entrada</label><input class="input" type="time" id="rs-in" name="in" value="07:30"></div>
          <div class="field" data-show="ausencia" hidden><label for="rs-reason">Motivo</label><select class="select" id="rs-reason" name="reason">${ABS_REASONS.map(r => `<option>${r}</option>`).join('')}</select></div>
          <div class="field span-2"><label for="rs-note">Observaciones<span class="req">*</span></label><input class="input" id="rs-note" name="note" placeholder="Ej.: avisado por el encargado a las 9:15" maxlength="120"></div>
        </div>`;
      onSubmit = form => {
        if (!U.validate(form, { note: { required: true, min: 4 } })) return false;
        const action = form.elements.action.value;
        if (action === 'entrada') {
          const [h, m] = (form.elements.in.value || '07:30').split(':').map(Number);
          A.commit({ type: 'fichaje.resolve', id: fc.id, action: 'entrada', in: A.at(fc.date, h, m).toISOString(), note: form.elements.note.value.trim() });
          U.toast(`Entrada de <strong>${esc(e.short)}</strong> registrada a las ${form.elements.in.value}.`);
        } else {
          A.commit({ type: 'fichaje.resolve', id: fc.id, action: 'ausencia', note: `${form.elements.reason.value}: ${form.elements.note.value.trim()}` });
          U.toast(`Ausencia de <strong>${esc(e.short)}</strong> registrada.`);
        }
        APP.refresh();
      };
    }
    U.openModal({
      title: 'Resolver fichaje', sub: `${esc(e.name)} · ${esc(e.role)} · ${f.dayLong(fc.date)}`, body, onSubmit, submitLabel: 'Guardar',
      onOpen: form => {
        const sync = () => { const v = (form.elements.action || {}).value; $$('[data-show]', form).forEach(el => { el.hidden = el.dataset.show !== v; }); };
        $$('input[name="action"]', form).forEach(r => r.addEventListener('change', sync)); sync();
      }
    });
  };
  APP.actions['fichaje-manual'] = () => {
    const route = APP.route; const day = fichajesFiltered(route.params).day;
    const days = []; for (let n = 0; n < 10; n++) days.push(A.workday(-n));
    U.openModal({
      title: 'Registrar fichaje manual', sub: 'Para correcciones de oficina. Queda registrado quién y por qué lo introduce.', submitLabel: 'Registrar',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="fm-emp">Persona<span class="req">*</span></label><select class="select" id="fm-emp" name="emp"><option value="">Selecciona una persona</option>${A.EMPLEADOS.map(e => `<option value="${e.id}">${esc(e.name)} · ${esc(e.role)}</option>`).join('')}</select></div>
        <div class="field"><label for="fm-day">Día<span class="req">*</span></label><select class="select" id="fm-day" name="day">${days.map(d => `<option value="${A.iso(d)}"${A.iso(d) === day ? ' selected' : ''}>${f.cap(f.dayLong(d))}</option>`).join('')}</select></div>
        <div class="field"><label for="fm-kind">Tipo<span class="req">*</span></label><select class="select" id="fm-kind" name="kind"><option value="entrada">Entrada</option><option value="salida">Salida</option></select></div>
        <div class="field"><label for="fm-time">Hora<span class="req">*</span></label><input class="input" type="time" id="fm-time" name="time" value="07:30"></div>
        <div class="field"><label for="fm-obra">Centro de trabajo</label><select class="select" id="fm-obra" name="obra">${A.OBRAS.map(o => `<option value="${o.id}">${esc(o.short)}</option>`).join('')}<option value="oficina">Oficina central</option></select></div>
        <div class="field span-2"><label for="fm-note">Motivo de la corrección<span class="req">*</span></label><input class="input" id="fm-note" name="note" maxlength="120" placeholder="Ej.: el móvil del trabajador se quedó sin batería"></div>
      </div>`,
      onOpen: form => {
        form.elements.emp.addEventListener('change', () => { const e = A.empById(form.elements.emp.value); if (e) form.elements.obra.value = e.obras[0] || 'oficina'; });
      },
      onSubmit: form => {
        const ok = U.validate(form, {
          emp: { required: true, requiredMsg: 'Selecciona la persona.' }, time: { required: true }, note: { required: true, min: 6 },
          day: { custom: () => { const fc = A.fichajes.find(x => x.emp === form.elements.emp.value && x.dateIso === form.elements.day.value); const kind = form.elements.kind.value; if (!form.elements.emp.value) return ''; if (kind === 'salida' && (!fc || !fc.in)) return 'No hay una entrada registrada ese día para esta persona.'; return ''; } }
        });
        if (!ok) return false;
        const empId = form.elements.emp.value; const di = form.elements.day.value; const kind = form.elements.kind.value;
        const [h, m] = form.elements.time.value.split(':').map(Number);
        const fc = A.fichajes.find(x => x.emp === empId && x.dateIso === di);
        const when = A.at(fc.date, h, m);
        if (kind === 'salida' && when <= fc.in) { U.fieldError(form, 'time', 'La salida debe ser posterior a la entrada.'); return false; }
        A.commit(kind === 'entrada' ? { type: 'fichaje.resolve', id: fc.id, action: 'entrada', in: when.toISOString(), obra: form.elements.obra.value, note: form.elements.note.value.trim() } : { type: 'fichaje.resolve', id: fc.id, action: 'salida', out: when.toISOString(), note: form.elements.note.value.trim() });
        fc._new = true; setTimeout(() => { fc._new = false; }, 3000);
        U.toast(`Fichaje de ${kind} de <strong>${esc(A.empById(empId).short)}</strong> registrado a las ${form.elements.time.value}.`);
        APP.setParams({ dia: di === A.iso(A.REF) ? null : di, estado: null });
      }
    });
  };
  APP.actions['fichajes-csv'] = () => {
    const { day, list } = fichajesFiltered(APP.route.params);
    U.downloadCSV(`fichajes_${APP.route.params.estado === 'revision' ? 'pendientes' : day}.csv`, ['Fecha', 'ID', 'Persona', 'Puesto', 'Centro de trabajo', 'Entrada', 'Salida', 'Horas efectivas', 'Estado', 'Geolocalización', 'Origen', 'Observaciones'],
      list.map(fc => { const e = A.empById(fc.emp); const h = A.hoursOf(fc); return [fc.dateIso, e.id, e.name, e.role, fc.obra === 'oficina' ? 'Oficina central' : A.obraById(fc.obra).short, fc.in ? f.time(fc.in) : '', fc.out ? f.time(fc.out) : '', h != null ? U.csvNum(h, 2) : '', U.STATUS.fichaje[fc.status], fc.in ? (fc.geo === 'fuera' ? 'Fuera de geocerca' : fc.geo === 'validado' ? 'Validado por oficina' : 'Dentro de geocerca') : '', fc.origin || '', fc.note || '']; }));
  };
  APP.views.fichajes = { render: renderFichajes, title: 'Fichajes' };
})();
