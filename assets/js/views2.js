/* =============================================================================
   Vistas: Partes de trabajo, Incidencias, Control económico, Documentación e Informes
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC, f = A.fmt, APP = window.APP, U = APP.ui, Hh = APP.helpers;
  const { esc, $, $$, icon } = U;
  const { seg, selectParam, searchParam, obraOptions, norm } = Hh;

  /* ===========================================================================
     PARTES DE TRABAJO
     ========================================================================= */
  function parteRow(p) {
    const o = A.obraById(p.obra);
    return `<article class="row row--parte${p.isNew && (new Date() - (p.createdAt || 0)) < 8000 ? ' is-new' : ''}" aria-labelledby="pt-${p.id}">
      <span class="datebox" aria-hidden="true"><b>${p.date.getDate()}</b><small>${f.monthShort(p.date)}</small></span>
      <div style="min-width:0">
        <div class="row__title" id="pt-${p.id}"><button type="button" data-act="parte-open" data-id="${p.id}" style="all:unset;cursor:pointer"><span class="code">${p.id}</span>${esc(o.short)}</button></div>
        <p class="row__desc">${esc(p.work)}</p>
        <div class="row__meta"><span><span class="avatar-stack">${p.crew.slice(0, 4).map(id => U.avatar(id, 'xs')).join('')}</span> ${p.crew.length} ${p.crew.length === 1 ? 'persona' : 'personas'}</span><span>${f.num(p.hours, p.hours % 1 ? 1 : 0)} h</span><span>${p.materials.length ? `${p.materials.length} ${p.materials.length === 1 ? 'material' : 'materiales'}` : 'Sin materiales'}</span><span>${f.when(p.date)}</span></div>
      </div>
      <div class="row__aside">${U.person(p.author, 'Responsable')}</div>
      <div class="row__end">${U.partePill(p.status)}
        ${p.status === 'pendiente' ? `<button type="button" class="btn btn--primary btn--xs" data-act="parte-validate" data-id="${p.id}">${icon('check', 14)}Validar</button><button type="button" class="btn btn--ghost btn--xs" data-act="parte-return" data-id="${p.id}">Devolver</button>` : `<button type="button" class="icon-btn icon-btn--sm" data-act="parte-open" data-id="${p.id}" aria-label="Ver el parte ${p.id}">${icon('chevron-right', 16)}</button>`}
      </div>
    </article>`;
  }
  APP.render.parteRow = parteRow;
  function partesFiltered(p) {
    let list = A.partes.slice();
    if (p.estado) list = list.filter(x => x.status === p.estado);
    if (p.obra) list = list.filter(x => x.obra === p.obra);
    if (p.q) { const q = norm(p.q); list = list.filter(x => norm(`${x.id} ${x.work} ${A.obraById(x.obra).name} ${(A.empById(x.author) || { name: A.USER.name }).name}`).includes(q)); }
    list.sort((a, b) => (a.status === 'pendiente') === (b.status === 'pendiente') ? b.date - a.date : a.status === 'pendiente' ? -1 : 1);
    return list;
  }
  function renderPartes(route) {
    const p = route.params; const list = partesFiltered(p);
    const c = s => A.partes.filter(x => x.status === s).length;
    const hours = A.partes.filter(x => A.daysBetween(x.date, A.REF) < 7).reduce((s, x) => s + x.hours, 0);
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Partes de trabajo' }], eyebrow: 'Operaciones', title: 'Partes de trabajo', sub: `Trabajo realizado, horas y materiales enviados desde cada obra · <strong>${c('pendiente')} pendientes de validar</strong> · ${f.num(hours, 0)} h registradas en los últimos 7 días.`, actions: `<button type="button" class="btn btn--secondary" data-act="partes-csv">${icon('download', 16)}Exportar CSV</button><button type="button" class="btn btn--primary" data-act="parte-new">${icon('plus', 16)}Nuevo parte</button>` })}
      <div class="toolbar">
        ${seg('estado', { label: 'Estado', def: '', items: [{ v: '', label: 'Todos', count: A.partes.length }, { v: 'pendiente', label: 'Pendientes', count: c('pendiente') }, { v: 'validado', label: 'Validados', count: c('validado') }, { v: 'devuelto', label: 'Devueltos', count: c('devuelto') }] }, p.estado || '')}
        ${selectParam('obra', 'Obra', obraOptions(), p.obra, 'f-obra')}
        ${searchParam('f-q', 'Buscar en los partes', p.q)}
        <span class="toolbar__spacer"></span><span class="result-count">${list.length} partes</span>
      </div>
      ${list.length ? `<div class="rows">${list.map(parteRow).join('')}</div>` : U.empty({ ico: 'clipboard-list', title: p.estado === 'pendiente' ? 'No hay partes pendientes de validar' : 'No hay partes con estos filtros', text: p.estado === 'pendiente' ? 'Todo validado. Buen trabajo.' : 'Prueba con otro estado u obra.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      ${U.footer()}
    </div>`;
  }
  function openParte(id) {
    const p = A.partes.find(x => x.id === id); if (!p) return;
    const o = A.obraById(p.obra);
    U.openDrawer({
      eyebrow: `Parte de trabajo · ${p.id}`, title: esc(o.name), label: `Parte ${p.id}`,
      body: `<div style="display:flex;gap:8px;flex-wrap:wrap">${U.partePill(p.status)}<span class="pill pill--plain">${f.cap(f.dayLong(p.date))}</span></div>
        <dl class="dl"><dt>Responsable</dt><dd>${esc(U.personName(p.author))}</dd><dt>Equipo</dt><dd>${p.crew.map(id => esc(U.personName(id))).join(', ')}</dd><dt>Horas</dt><dd>${f.num(p.hours, p.hours % 1 ? 1 : 0)} h</dd><dt>Enviado</dt><dd>${f.when(p.createdAt || p.date)}</dd>
        ${p.status === 'validado' ? `<dt>Validado</dt><dd>${esc(U.personName(p.validatedBy))} · ${f.when(p.validatedAt)}</dd>` : ''}</dl>
        <div><p class="section-lbl">Trabajo realizado</p><p style="font-size:14px">${esc(p.work)}</p></div>
        ${p.materials.length ? `<div><p class="section-lbl">Materiales</p><table class="mtable"><thead><tr><th>Material</th><th style="text-align:right">Cantidad</th><th>Unidad</th></tr></thead><tbody>${p.materials.map(([n, q, u]) => `<tr><td>${esc(n)}</td><td style="text-align:right">${esc(q)}</td><td>${esc(u)}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${p.notes ? `<div class="callout">${icon('info', 16)}<span>${esc(p.notes)}</span></div>` : ''}
        ${p.status === 'devuelto' ? `<div class="callout callout--danger">${icon('undo-2', 16)}<span><strong>Devuelto para corregir:</strong> ${esc(p.returnReason)}</span></div>` : ''}`,
      foot: p.status === 'pendiente' ? `<button type="button" class="btn btn--ghost" data-act="parte-return" data-id="${p.id}">Devolver</button><button type="button" class="btn btn--primary" data-act="parte-validate" data-id="${p.id}">${icon('check', 15)}Validar parte</button>` : `<a class="btn btn--secondary" href="#/obras/${o.id}/partes">Ver partes de la obra</a>`
    });
    APP.onDrawerClose = () => { if (APP.route.params.id) APP.setParams({ id: null }, { silent: true }); };
  }
  APP.actions['parte-open'] = el => openParte(el.dataset.id);
  APP.actions['parte-validate'] = el => {
    const p = A.commit({ type: 'parte.validate', id: el.dataset.id });
    if (!p) return;
    U.closeDrawer();
    U.toast(`Parte <strong>${p.id}</strong> validado. Pasa al control de horas y costes.`);
    APP.refresh();
  };
  APP.actions['parte-return'] = el => {
    const p = A.partes.find(x => x.id === el.dataset.id); if (!p) return;
    U.closeDrawer();
    U.openModal({
      title: 'Devolver parte', sub: `${p.id} · ${esc(A.obraById(p.obra).short)} · ${esc(U.personName(p.author))}`, submitLabel: 'Devolver al responsable', size: 'sm',
      body: `<div class="field"><label for="rt-reason">Motivo<span class="req">*</span></label><textarea class="textarea" id="rt-reason" name="reason" maxlength="240" placeholder="Ej.: falta indicar las horas de la subcontrata"></textarea><p class="hint">El responsable recibirá el parte con este comentario.</p></div>`,
      onSubmit: form => {
        if (!U.validate(form, { reason: { required: true, min: 10 } })) return false;
        A.commit({ type: 'parte.return', id: p.id, reason: form.elements.reason.value.trim() });
        U.toast(`Parte <strong>${p.id}</strong> devuelto para su corrección.`, { type: 'info' }); APP.refresh();
      }
    });
  };
  function matRow(i) { return `<div class="mat-row" data-mat><input class="input" name="mat_name_${i}" placeholder="Material" aria-label="Material ${i + 1}" maxlength="80"><input class="input" name="mat_qty_${i}" placeholder="Cant." aria-label="Cantidad del material ${i + 1}" inputmode="decimal" maxlength="12"><select class="select" name="mat_unit_${i}" aria-label="Unidad del material ${i + 1}">${['ud', 'm', 'm²', 'm³', 'kg', 'l', 'lote'].map(u => `<option>${u}</option>`).join('')}</select><button type="button" class="icon-btn icon-btn--sm" data-mat-remove aria-label="Quitar material ${i + 1}">${icon('x', 15)}</button></div>`; }
  APP.actions['parte-new'] = el => {
    const preObra = el && el.dataset.obra ? el.dataset.obra : (APP.route.params.obra || '');
    const today = A.iso(A.REF);
    U.openModal({
      title: 'Nuevo parte de trabajo', sub: 'Lo que se ha hecho hoy en la obra, quién y con qué materiales.', size: 'lg', submitLabel: 'Enviar parte',
      footNote: 'Se enviará al jefe de obra para su validación.',
      body: `<div class="form-grid">
        <div class="field"><label for="np-obra">Obra<span class="req">*</span></label><select class="select" id="np-obra" name="obra"><option value="">Selecciona la obra</option>${A.OBRAS.map(o => `<option value="${o.id}"${o.id === preObra ? ' selected' : ''}>${esc(o.short)}</option>`).join('')}</select></div>
        <div class="field"><label for="np-date">Fecha<span class="req">*</span></label><input class="input" type="date" id="np-date" name="date" value="${today}" max="${today}" min="${A.iso(A.workday(-9))}"></div>
        <div class="field"><label for="np-author">Responsable<span class="req">*</span></label><select class="select" id="np-author" name="author"><option value="">Primero elige la obra</option></select></div>
        <div class="field"><label for="np-hours">Horas totales del equipo<span class="req">*</span></label><input class="input" id="np-hours" name="hours" inputmode="decimal" placeholder="Ej.: 16"><p class="hint">Suma de las horas de todas las personas.</p></div>
        <div class="field span-2"><span class="label" id="np-crew-l">Equipo que ha trabajado</span><div class="choice-grid" id="np-crew" role="group" aria-labelledby="np-crew-l"><span class="hint">Elige una obra para ver su equipo.</span></div></div>
        <div class="field span-2"><label for="np-work">Trabajos realizados<span class="req">*</span></label><textarea class="textarea" id="np-work" name="work" maxlength="400" placeholder="Ej.: colocación de bloque de termoarcilla en la fachada norte, planta 3"></textarea></div>
        <div class="field span-2"><span class="label">Materiales <span class="muted" style="font-weight:400">(opcional)</span></span><div class="mat-rows" id="np-mats">${matRow(0)}</div><button type="button" class="btn btn--ghost btn--sm" data-mat-add style="align-self:flex-start;margin-top:4px">${icon('plus', 14)}Añadir material</button></div>
        <div class="field span-2"><label for="np-notes">Observaciones <span class="muted" style="font-weight:400">(opcional)</span></label><input class="input" id="np-notes" name="notes" maxlength="200"></div>
      </div>`,
      onOpen: form => {
        const fill = () => {
          const o = A.obraById(form.elements.obra.value);
          const sel = form.elements.author; const crew = $('#np-crew');
          if (!o) { sel.innerHTML = '<option value="">Primero elige la obra</option>'; crew.innerHTML = '<span class="hint">Elige una obra para ver su equipo.</span>'; return; }
          const team = o.team.map(A.empById);
          sel.innerHTML = team.filter(e => e.cat === 'jefe' || e.cat === 'encargado' || e.cat === 'oficial').map(e => `<option value="${e.id}">${esc(e.short)} · ${esc(e.role)}</option>`).join('');
          if (o.encargado) sel.value = o.encargado;
          crew.innerHTML = team.map(e => `<label class="choice"><input type="checkbox" name="crew" value="${e.id}"${e.cat !== 'jefe' ? ' checked' : ''}><span>${U.avatar(e.id, 'xs')}${esc(e.short)}</span></label>`).join('');
        };
        form.elements.obra.addEventListener('change', fill); fill();
        let n = 1;
        form.addEventListener('click', e => {
          if (e.target.closest('[data-mat-add]')) { $('#np-mats').insertAdjacentHTML('beforeend', matRow(n++)); const last = $('#np-mats').lastElementChild.querySelector('input'); if (last) last.focus(); }
          const rm = e.target.closest('[data-mat-remove]'); if (rm) { const rows = $$('[data-mat]', form); if (rows.length > 1) rm.closest('[data-mat]').remove(); else rows[0].querySelectorAll('input').forEach(i => { i.value = ''; }); }
        });
      },
      onSubmit: form => {
        const ok = U.validate(form, {
          obra: { required: true, requiredMsg: 'Selecciona la obra.' },
          date: { required: true, custom: v => (v > A.iso(A.REF) ? 'La fecha no puede ser futura.' : v < A.iso(A.workday(-9)) ? 'Solo se admiten partes de los últimos 10 días laborables.' : '') },
          author: { required: true, requiredMsg: 'Selecciona el responsable.' },
          hours: { required: true, number: [0.5, 200] },
          work: { required: true, min: 15 }
        });
        if (!ok) return false;
        const crew = $$('input[name="crew"]:checked', form).map(i => i.value);
        if (!crew.length) { U.toast('Marca al menos una persona del equipo.', { type: 'error' }); return false; }
        const mats = $$('[data-mat]', form).map(r => { const [n, q] = r.querySelectorAll('input'); const u = r.querySelector('select'); return [n.value.trim(), q.value.trim(), u.value]; }).filter(m => m[0]);
        const [y, mo, d] = form.elements.date.value.split('-').map(Number);
        const now = new Date(); const date = new Date(y, mo - 1, d, now.getHours(), now.getMinutes());
        const id = A.nextId('PT');
        A.commit({ type: 'parte.create', data: { id, date: date.toISOString(), obra: form.elements.obra.value, author: form.elements.author.value, crew, hours: Number(form.elements.hours.value.replace(',', '.')), work: form.elements.work.value.trim(), materials: mats, notes: form.elements.notes.value.trim() } });
        U.toast(`Parte <strong>${id}</strong> enviado a validación.`);
        if (APP.route.name === 'partes') APP.setParams({ estado: null, obra: null, q: null }); else APP.refresh();
      }
    });
  };
  APP.actions['partes-csv'] = () => {
    const list = partesFiltered(APP.route.params);
    U.downloadCSV(`partes_${A.iso(A.REF)}.csv`, ['Parte', 'Fecha', 'Obra', 'Responsable', 'Equipo', 'Horas', 'Trabajo realizado', 'Materiales', 'Estado', 'Validado por', 'Motivo de devolución'],
      list.map(p => [p.id, A.iso(p.date), A.obraById(p.obra).name, U.personName(p.author).replace(' (tú)', ''), p.crew.map(id => U.personName(id).replace(' (tú)', '')).join(', '), U.csvNum(p.hours, 1), p.work, p.materials.map(m => `${m[0]} (${m[1]} ${m[2]})`).join(' | '), U.STATUS.parte[p.status], p.validatedBy ? U.personName(p.validatedBy).replace(' (tú)', '') : '', p.returnReason || '']));
  };
  APP.views.partes = { render: renderPartes, title: 'Partes de trabajo', mount: r => { if (r.params.id) openParte(r.params.id); } };

  /* ===========================================================================
     INCIDENCIAS
     ========================================================================= */
  function incRow(i) {
    const o = A.obraById(i.obra); const closed = i.status === 'resuelta'; const d = A.daysOpen(i);
    return `<article class="row row--inc p-${i.priority}${closed ? ' is-closed' : ''}${i.isNew && (new Date() - i.openedAt) < 8000 ? ' is-new' : ''}">
      <div style="min-width:0">
        <h3 class="row__title"><button type="button" data-act="inc-open" data-id="${i.id}" style="all:unset;cursor:pointer"><span class="code">${i.id}</span>${esc(i.title)}</button></h3>
        <div class="row__meta"><span>${esc(o.short)}</span><span>${esc(i.category)}</span><span>Abierta el ${f.dayShort(i.openedAt)}</span></div>
      </div>
      <div class="row__aside row__aside--owner">${U.person(i.owner, 'Responsable')}</div>
      <div class="row__aside">${closed ? `<strong>Resuelta</strong>en ${d === 0 ? 'el día' : `${d} ${d === 1 ? 'día' : 'días'}`}` : `<strong style="${d >= 10 ? 'color:var(--danger-ink)' : ''}">${d === 0 ? 'Hoy' : `${d} ${d === 1 ? 'día' : 'días'}`}</strong>${d === 0 ? 'abierta' : 'sin resolver'}`}</div>
      <div class="row__end" style="flex-direction:column;align-items:flex-end;gap:6px">${U.incPill(i.status)}${U.prio(i.priority)}</div>
    </article>`;
  }
  APP.render.incRow = incRow;
  const PRANK = { alta: 0, media: 1, baja: 2 };
  function incFiltered(p) {
    const estado = p.estado || 'abiertas';
    let list = A.incidencias.slice();
    if (estado === 'abiertas') list = list.filter(i => A.OPEN(i.status));
    else if (estado !== 'todas') list = list.filter(i => i.status === estado);
    if (p.prioridad) list = list.filter(i => i.priority === p.prioridad);
    if (p.obra) list = list.filter(i => i.obra === p.obra);
    if (p.q) { const q = norm(p.q); list = list.filter(i => norm(`${i.id} ${i.title} ${i.category} ${i.description}`).includes(q)); }
    const orden = p.orden || 'prioridad';
    const s = { prioridad: (a, b) => (A.OPEN(b.status) - A.OPEN(a.status)) || PRANK[a.priority] - PRANK[b.priority] || A.daysOpen(b) - A.daysOpen(a), antiguedad: (a, b) => A.daysOpen(b) - A.daysOpen(a), recientes: (a, b) => b.openedAt - a.openedAt };
    list.sort(s[orden] || s.prioridad);
    return { estado, list };
  }
  function renderIncidencias(route) {
    const p = route.params; const { estado, list } = incFiltered(p);
    const open = A.incidencias.filter(i => A.OPEN(i.status));
    const oldest = open.reduce((m, i) => Math.max(m, A.daysOpen(i)), 0);
    const c = s => A.incidencias.filter(i => i.status === s).length;
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Incidencias' }], eyebrow: 'Operaciones', title: 'Incidencias', sub: `<strong>${open.length} abiertas</strong> · ${open.filter(i => i.priority === 'alta').length} de prioridad alta · la más antigua lleva ${oldest} días sin resolver.`, actions: `<button type="button" class="btn btn--secondary" data-act="inc-csv">${icon('download', 16)}Exportar CSV</button><button type="button" class="btn btn--primary" data-act="inc-new">${icon('plus', 16)}Nueva incidencia</button>` })}
      <div class="toolbar">
        ${seg('estado', { label: 'Estado', def: 'abiertas', items: [{ v: 'abiertas', label: 'Abiertas', count: open.length }, { v: 'en_curso', label: 'En curso', count: c('en_curso') }, { v: 'resuelta', label: 'Resueltas', count: c('resuelta') }, { v: 'todas', label: 'Todas', count: A.incidencias.length }] }, estado)}
        ${selectParam('prioridad', 'Prioridad', [{ v: '', label: 'Todas las prioridades' }, { v: 'alta', label: 'Prioridad alta' }, { v: 'media', label: 'Prioridad media' }, { v: 'baja', label: 'Prioridad baja' }], p.prioridad, 'f-prio')}
        ${selectParam('obra', 'Obra', obraOptions(), p.obra, 'f-obra')}
        ${selectParam('orden', 'Ordenar', [{ v: 'prioridad', label: 'Ordenar por prioridad' }, { v: 'antiguedad', label: 'Ordenar por antigüedad' }, { v: 'recientes', label: 'Más recientes primero' }], p.orden || 'prioridad', 'f-orden')}
        ${searchParam('f-q', 'Buscar incidencia', p.q)}
        <span class="toolbar__spacer"></span><span class="result-count">${list.length} ${list.length === 1 ? 'incidencia' : 'incidencias'}</span>
      </div>
      ${list.length ? `<div class="rows">${list.map(incRow).join('')}</div>` : U.empty({ ico: 'circle-check', title: 'No hay incidencias con estos filtros', text: estado === 'abiertas' && !p.obra && !p.prioridad ? 'No queda ninguna incidencia abierta.' : 'Prueba a cambiar el estado, la prioridad o la obra.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      ${U.footer()}
    </div>`;
  }
  function openInc(id) {
    const i = A.incidencias.find(x => x.id === id); if (!i) { U.toast(`No se encuentra la incidencia ${esc(id)}.`, { type: 'error' }); return; }
    const o = A.obraById(i.obra); const d = A.daysOpen(i);
    const log = [{ at: i.openedAt, text: `Abierta por ${U.personName(i.openedBy)}` }].concat(i.log.map(l => ({ at: l.at, text: `${l.status === 'resuelta' ? 'Resuelta' : l.status === 'en_curso' ? 'Pasa a «En curso»' : 'Reabierta'} por ${A.USER.name}${l.note ? `: «${l.note}»` : ''}` })));
    if (i.status === 'resuelta' && !i.log.length && i.resolvedAt) log.push({ at: i.resolvedAt, text: 'Resuelta' });
    const actions = i.status === 'abierta' ? `<button type="button" class="btn btn--secondary" data-act="inc-status" data-id="${i.id}" data-s="en_curso">${icon('loader-circle', 15)}Pasar a «En curso»</button><button type="button" class="btn btn--primary" data-act="inc-resolve" data-id="${i.id}">${icon('circle-check', 15)}Resolver</button>`
      : i.status === 'en_curso' ? `<button type="button" class="btn btn--ghost" data-act="inc-status" data-id="${i.id}" data-s="abierta">Volver a «Abierta»</button><button type="button" class="btn btn--primary" data-act="inc-resolve" data-id="${i.id}">${icon('circle-check', 15)}Resolver</button>`
        : `<button type="button" class="btn btn--secondary" data-act="inc-status" data-id="${i.id}" data-s="abierta">${icon('rotate-ccw', 15)}Reabrir</button>`;
    U.openDrawer({
      eyebrow: `${i.id} · ${esc(i.category)}`, title: esc(i.title), label: `Incidencia ${i.id}`,
      body: `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${U.incPill(i.status)}${U.prio(i.priority)}</div>
        <dl class="dl"><dt>Obra</dt><dd><a class="ai-link" href="#/obras/${o.id}">${esc(o.name)}</a></dd><dt>Responsable</dt><dd>${esc(U.personName(i.owner))}</dd><dt>Apertura</dt><dd>${f.cap(f.dayLong(i.openedAt))}, ${f.time(i.openedAt)}</dd><dt>${i.status === 'resuelta' ? 'Tiempo de resolución' : 'Días abierta'}</dt><dd>${d} ${d === 1 ? 'día' : 'días'}</dd></dl>
        ${i.description ? `<div><p class="section-lbl">Descripción</p><p style="font-size:14px">${esc(i.description)}</p></div>` : ''}
        ${i.decision && A.OPEN(i.status) ? `<div class="callout callout--warn">${icon('flag', 16)}<span><strong>Decisión pendiente de dirección.</strong> ${esc(i.decision)}</span></div>` : ''}
        ${i.status === 'resuelta' && i.resolution ? `<div class="callout callout--ok">${icon('circle-check', 16)}<span><strong>Resolución:</strong> ${esc(i.resolution)}</span></div>` : ''}
        <div><p class="section-lbl">Historial</p><ul class="log">${log.sort((a, b) => a.at - b.at).map(l => `<li><span>${esc(l.text)}<small>${f.when(l.at)}</small></span></li>`).join('')}</ul></div>`,
      foot: actions
    });
    APP.onDrawerClose = () => { if (APP.route.params.id) APP.setParams({ id: null }, { silent: true }); };
  }
  APP.actions['inc-open'] = el => openInc(el.dataset.id);
  APP.actions['inc-status'] = el => {
    const i = A.commit({ type: 'incidencia.status', id: el.dataset.id, status: el.dataset.s });
    if (!i) return;
    U.toast(`Incidencia <strong>${i.id}</strong>: ${U.STATUS.inc[i.status].toLowerCase()}.`);
    APP.refresh(); openInc(i.id);
  };
  APP.actions['inc-resolve'] = el => {
    const i = A.incidencias.find(x => x.id === el.dataset.id); if (!i) return;
    U.closeDrawer();
    U.openModal({
      title: 'Resolver incidencia', sub: `${i.id} · ${esc(i.title)}`, size: 'sm', submitLabel: 'Marcar como resuelta',
      body: `<div class="field"><label for="rv-note">¿Cómo se ha resuelto?<span class="req">*</span></label><textarea class="textarea" id="rv-note" name="note" maxlength="240" placeholder="Ej.: anclajes sustituidos y revisados por el técnico de prevención"></textarea></div>`,
      onSubmit: form => {
        if (!U.validate(form, { note: { required: true, min: 10 } })) return false;
        A.commit({ type: 'incidencia.status', id: i.id, status: 'resuelta', note: form.elements.note.value.trim() });
        U.toast(`Incidencia <strong>${i.id}</strong> resuelta.`); APP.refresh();
      }
    });
  };
  APP.actions['inc-new'] = el => {
    const preObra = el && el.dataset.obra ? el.dataset.obra : (APP.route.params.obra || '');
    U.openModal({
      title: 'Nueva incidencia', sub: 'Registra un problema de obra para asignarlo y hacer su seguimiento.', submitLabel: 'Registrar incidencia',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="ni-title">Título<span class="req">*</span></label><input class="input" id="ni-title" name="title" maxlength="110" placeholder="Ej.: Grieta en el forjado de la planta 2"></div>
        <div class="field"><label for="ni-obra">Obra<span class="req">*</span></label><select class="select" id="ni-obra" name="obra"><option value="">Selecciona la obra</option>${A.OBRAS.map(o => `<option value="${o.id}"${o.id === preObra ? ' selected' : ''}>${esc(o.short)}</option>`).join('')}</select></div>
        <div class="field"><label for="ni-cat">Categoría<span class="req">*</span></label><select class="select" id="ni-cat" name="category"><option value="">Selecciona</option>${A.INC_CATEGORIES.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
        <div class="field span-2"><span class="label" id="ni-prio-l">Prioridad<span class="req">*</span></span><div class="choice-grid" role="radiogroup" aria-labelledby="ni-prio-l">${[['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']].map(([v, l]) => `<label class="choice"><input type="radio" name="priority" value="${v}"${v === 'media' ? ' checked' : ''}><span style="padding-left:12px"><span class="prio prio--${v}">${l}</span></span></label>`).join('')}</div></div>
        <div class="field span-2"><label for="ni-owner">Responsable<span class="req">*</span></label><select class="select" id="ni-owner" name="owner">${A.EMPLEADOS.filter(e => e.cat !== 'operario').map(e => `<option value="${e.id}">${esc(e.short)} · ${esc(e.role)}</option>`).join('')}</select><p class="hint">Por defecto, el jefe de obra.</p></div>
        <div class="field span-2"><label for="ni-desc">Descripción <span class="muted" style="font-weight:400">(opcional)</span></label><textarea class="textarea" id="ni-desc" name="description" maxlength="500" placeholder="Qué ha pasado, dónde y qué se necesita para resolverlo"></textarea></div>
      </div>`,
      onOpen: form => { const sync = () => { const o = A.obraById(form.elements.obra.value); if (o) form.elements.owner.value = o.jefe; }; form.elements.obra.addEventListener('change', sync); sync(); },
      onSubmit: form => {
        const ok = U.validate(form, { title: { required: true, min: 8 }, obra: { required: true, requiredMsg: 'Selecciona la obra.' }, category: { required: true, requiredMsg: 'Selecciona la categoría.' } });
        if (!ok) return false;
        const id = A.nextId('INC');
        A.commit({ type: 'incidencia.create', data: { id, obra: form.elements.obra.value, title: form.elements.title.value.trim(), category: form.elements.category.value, priority: form.elements.priority.value, owner: form.elements.owner.value, description: form.elements.description.value.trim() } });
        U.toast(`Incidencia <strong>${id}</strong> registrada y asignada a ${esc(U.personName(form.elements.owner.value))}.`);
        if (APP.route.name === 'incidencias') APP.setParams({ estado: null, prioridad: null, obra: null, q: null, orden: 'recientes' }); else APP.refresh();
      }
    });
  };
  APP.actions['inc-csv'] = () => {
    const { list } = incFiltered(APP.route.params);
    U.downloadCSV(`incidencias_${A.iso(A.REF)}.csv`, ['ID', 'Título', 'Obra', 'Categoría', 'Prioridad', 'Estado', 'Responsable', 'Fecha de apertura', 'Días abierta', 'Resolución'],
      list.map(i => [i.id, i.title, A.obraById(i.obra).name, i.category, U.PRIO[i.priority], U.STATUS.inc[i.status], U.personName(i.owner).replace(' (tú)', ''), A.iso(i.openedAt), A.daysOpen(i), i.resolution || '']));
  };
  APP.views.incidencias = { render: renderIncidencias, title: 'Incidencias', mount: r => { if (r.params.id) openInc(r.params.id); } };

  /* ===========================================================================
     CONTROL ECONÓMICO
     ========================================================================= */
  function renderEconomico() {
    const t = A.totals(); const months = A.monthlyCost(6);
    const cur = months[months.length - 1];
    const rows = t.ms.slice().sort((a, b) => b.o.budget - a.o.budget);
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Control económico' }], eyebrow: 'Gestión', title: 'Control económico', sub: 'Presupuesto, coste ejecutado y previsión al cierre de cada obra, calculados a partir del avance registrado.', actions: `<button type="button" class="btn btn--secondary" data-act="eco-csv">${icon('download', 16)}Exportar CSV</button>` })}
      <div class="ekpis">
        <div class="card ekpi"><span>Presupuesto total</span><strong>${f.eurM(t.budget)}</strong><small>${t.obras} obras en curso</small></div>
        <div class="card ekpi"><span>Coste ejecutado</span><strong>${f.eurM(t.ac)}</strong><small>${f.pct(t.ac / t.budget * 100)} del presupuesto · avance ponderado ${f.pct(t.weightedProgress)}</small></div>
        <div class="card ekpi"><span>Previsión al cierre</span><strong>${f.eurM(t.eac)}</strong><small>Coste real + trabajo pendiente</small></div>
        <div class="card ekpi${t.dev > 0 ? ' ekpi--warn' : ''}"><span>Desviación prevista</span><strong>${f.signedPct(t.devPct)}</strong><small>${f.signedEur(t.dev)} sobre presupuesto</small></div>
      </div>
      <div class="two-col">
        <section class="card"><div class="card__head"><div><h2 class="card__title">Coste y avance por obra</h2><p class="card__sub">Si la barra supera la marca, se está gastando más de lo que se ha producido</p></div></div>
          <div class="bullets">${rows.map(({ o, m }) => { const cpct = Math.min(100, m.ac / o.budget * 100); return `<div class="bullet">
            <div class="bullet__name"><a href="#/obras/${o.id}/economico">${esc(o.short)}</a><small>${f.eurM(o.budget)} presupuesto</small></div>
            <div><div class="btrack" role="img" aria-label="${esc(`Coste ejecutado ${f.pct(cpct)} del presupuesto, avance físico ${o.progress} %`)}"><i class="${m.ac > m.ev * 1.01 ? 'over' : ''}" style="width:${cpct}%"></i><b style="left:${o.progress}%"></b></div><div class="btrack__lbl"><span>Coste ${f.pct(cpct)}</span><span>Avance ${o.progress} %</span></div></div>
            <div class="bullet__dev"><strong style="color:${m.dev > 0 ? 'var(--warn-ink)' : 'var(--olive-ink)'}">${f.signedPct(m.devPct)}</strong><span class="muted">${f.signedEur(m.dev)}</span></div></div>`; }).join('')}</div>
          <div class="legend" style="padding:0 20px 18px"><span><i></i>Coste ejecutado (% del presupuesto)</span><span><i class="mark"></i>Avance físico</span><span><i style="background:#B5654F"></i>Coste por encima del avance</span></div>
        </section>
        <section class="card"><div class="card__head"><div><h2 class="card__title">Coste mensual · todas las obras</h2><p class="card__sub">${f.cap(f.monthLong(cur.month))} en curso: ${f.eurAuto(cur.actual)} de ${f.eurAuto(cur.planned)} previstos a esta fecha</p></div></div>
          <div class="card__body">${U.monthlyChart(months)}<div class="legend" style="margin-top:8px"><span><i style="background:#C9C2B4"></i>Coste real</span><span><i class="line"></i>Planificado</span><span>* mes en curso, hasta hoy</span></div></div></section>
      </div>
      <section class="card table-card" style="margin-top:20px"><div class="card__head"><div><h2 class="card__title">Detalle por obra</h2></div></div>
        <div class="table-wrap"><table class="dtable dtable--stack"><thead><tr><th scope="col">Obra</th><th scope="col" class="r">Presupuesto</th><th scope="col" class="r">Coste ejecutado</th><th scope="col" class="r">Avance físico</th><th scope="col" class="r hide-lg">Valor del avance</th><th scope="col" class="r">Previsión al cierre</th><th scope="col" class="r">Desviación</th></tr></thead>
        <tbody>${rows.map(({ o, m }) => `<tr><td class="primary"><a class="obra-chip" href="#/obras/${o.id}/economico"><img src="${o.photoSm}" alt="" style="object-position:${o.focus}"><strong>${esc(o.short)}</strong></a></td><td class="r" data-label="Presupuesto">${f.eur(o.budget)}</td><td class="r" data-label="Coste ejecutado">${f.eur(m.ac)}</td><td class="r" data-label="Avance">${o.progress} %</td><td class="r hide-sm hide-lg">${f.eur(Math.round(m.ev))}</td><td class="r" data-label="Previsión">${f.eur(Math.round(m.eac))}</td><td class="r" data-label="Desviación" style="font-weight:600;color:${m.dev > 0 ? 'var(--warn-ink)' : 'var(--olive-ink)'}">${f.signedEur(m.dev)} · ${f.signedPct(m.devPct)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="r">${f.eur(t.budget)}</td><td class="r">${f.eur(t.ac)}</td><td class="r">${f.pct(t.weightedProgress)}</td><td class="r hide-sm hide-lg">${f.eur(Math.round(t.ev))}</td><td class="r">${f.eur(Math.round(t.eac))}</td><td class="r">${f.signedEur(t.dev)} · ${f.signedPct(t.devPct)}</td></tr></tfoot></table></div></section>
      <p class="method">${icon('info', 15)}<span>Método: valor del avance = presupuesto × avance físico. Desviación = coste ejecutado − valor del avance; la previsión al cierre añade al coste real el presupuesto del trabajo pendiente. Cifras ficticias de demostración.</span></p>
      ${U.footer()}
    </div>`;
  }
  APP.actions['eco-csv'] = () => {
    const t = A.totals();
    U.downloadCSV(`control-economico_${A.iso(A.REF)}.csv`, ['Obra', 'Presupuesto (€)', 'Coste ejecutado (€)', 'Avance físico (%)', 'Valor del avance (€)', 'Previsión al cierre (€)', 'Desviación (€)', 'Desviación (%)'],
      t.ms.map(({ o, m }) => [o.name, U.csvNum(o.budget, 0), U.csvNum(m.ac, 0), o.progress, U.csvNum(m.ev, 0), U.csvNum(m.eac, 0), U.csvNum(m.dev, 0), U.csvNum(m.devPct, 2)]).concat([['TOTAL', U.csvNum(t.budget, 0), U.csvNum(t.ac, 0), U.csvNum(t.weightedProgress, 1), U.csvNum(t.ev, 0), U.csvNum(t.eac, 0), U.csvNum(t.dev, 0), U.csvNum(t.devPct, 2)]]));
  };
  APP.views.economico = { render: renderEconomico, title: 'Control económico' };

  /* ===========================================================================
     DOCUMENTACIÓN
     ========================================================================= */
  const DOC_TYPES = ['Licencia', 'Proyecto', 'Seguridad y salud', 'Certificación', 'Maquinaria', 'Instalaciones', 'Cliente', 'Formación PRL', 'Coordinación empresarial'];
  const DOC_ICON = { Licencia: 'badge-check', Proyecto: 'ruler', 'Seguridad y salud': 'shield-check', Certificación: 'receipt-euro', Maquinaria: 'hammer', Instalaciones: 'gauge', Cliente: 'signature', 'Formación PRL': 'hard-hat', 'Coordinación empresarial': 'users' };
  function docRow(d) {
    const where = d.obra ? A.obraById(d.obra).short : 'Empresa';
    const exp = d.expiry ? (d.status === 'caducado' ? `<strong style="color:var(--danger-ink)">Caducó el ${f.dayShort(d.expiry)}</strong>hace ${A.daysBetween(d.expiry, A.REF)} días` : `<strong${d.status === 'caduca' ? ' style="color:var(--warn-ink)"' : ''}>Caduca el ${f.dayMed(d.expiry)}</strong>${d.status === 'caduca' ? `en ${A.daysBetween(A.REF, d.expiry)} días` : 'Con caducidad'}`) : '<strong>Sin caducidad</strong>No requiere renovación';
    return `<article class="row row--doc${d.isNew && (new Date() - d.date) < 8000 ? ' is-new' : ''}">
      <span class="docicon docicon--${d.status}" aria-hidden="true">${icon(DOC_ICON[d.type] || 'file-text', 20)}</span>
      <div style="min-width:0"><h3 class="row__title">${esc(d.name)}</h3><div class="row__meta"><span>${esc(where)}</span><span>${esc(d.type)}</span><span>${d.status === 'pendiente' ? 'Subido' : 'Emitido'} el ${f.dayShort(d.date)}</span>${d.fileName ? `<span>${esc(d.fileName)}</span>` : ''}${d.validatedBy ? `<span>Validado por ${esc(U.personName(d.validatedBy))}</span>` : ''}</div></div>
      <div class="row__aside">${d.obra ? U.obraChip(d.obra) : '<span class="tag">Empresa</span>'}</div>
      <div class="row__aside">${exp}</div>
      <div class="row__end">${U.docPill(d.status)}${d.status === 'pendiente' ? `<button type="button" class="btn btn--primary btn--xs" data-act="doc-validate" data-id="${d.id}">${icon('check', 14)}Validar</button>` : d.status === 'caduca' || d.status === 'caducado' ? `<button type="button" class="btn btn--secondary btn--xs" data-act="doc-upload" data-renew="${d.id}">${icon('upload', 14)}Renovar</button>` : ''}</div>
    </article>`;
  }
  APP.render.docRow = docRow;
  function docsFiltered(p) {
    let list = A.documentos.slice();
    if (p.estado === 'alertas') list = list.filter(d => d.status === 'caduca' || d.status === 'caducado');
    else if (p.estado) list = list.filter(d => d.status === p.estado);
    if (p.obra === 'empresa') list = list.filter(d => !d.obra); else if (p.obra) list = list.filter(d => d.obra === p.obra);
    if (p.q) { const q = norm(p.q); list = list.filter(d => norm(`${d.name} ${d.type}`).includes(q)); }
    const rank = { caducado: 0, caduca: 1, pendiente: 2, vigente: 3 };
    list.sort((a, b) => rank[a.status] - rank[b.status] || (a.expiry || 0) - (b.expiry || 0) || b.date - a.date);
    return list;
  }
  function renderDocs(route) {
    const p = route.params; const list = docsFiltered(p);
    const c = s => A.documentos.filter(d => d.status === s).length;
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Documentación' }], eyebrow: 'Gestión', title: 'Documentación', sub: `<strong>${c('pendiente')} documentos pendientes de validar</strong> · ${c('caduca')} caducan en los próximos días · ${c('caducado')} caducado.`, actions: `<button type="button" class="btn btn--primary" data-act="doc-upload">${icon('upload', 16)}Subir documento</button>` })}
      <div class="toolbar">
        ${seg('estado', { label: 'Estado', def: '', items: [{ v: '', label: 'Todos', count: A.documentos.length }, { v: 'pendiente', label: 'Por validar', count: c('pendiente') }, { v: 'alertas', label: 'Caducados o por caducar', count: c('caduca') + c('caducado') }, { v: 'vigente', label: 'Vigentes', count: c('vigente') }] }, p.estado || '')}
        ${selectParam('obra', 'Obra', obraOptions('Todas las obras y empresa').concat([{ v: 'empresa', label: 'Empresa (general)' }]), p.obra, 'f-obra')}
        ${searchParam('f-q', 'Buscar documento', p.q)}
        <span class="toolbar__spacer"></span><span class="result-count">${list.length} documentos</span>
      </div>
      ${list.length ? `<div class="rows">${list.map(docRow).join('')}</div>` : U.empty({ ico: 'folder-open', title: 'No hay documentos con estos filtros', text: 'Prueba con otro estado u obra.', action: `<button type="button" class="btn btn--secondary" data-act="clear-params">Quitar filtros</button>` })}
      <p class="method">${icon('lock', 15)}<span>En esta demo los archivos no se suben a ningún servidor: solo se registra su nombre en tu navegador.</span></p>
      ${U.footer()}
    </div>`;
  }
  APP.actions['doc-validate'] = el => {
    const d = A.commit({ type: 'doc.validate', id: el.dataset.id }); if (!d) return;
    U.toast(`Documento «${esc(d.name)}» validado.`); APP.refresh();
  };
  APP.actions['doc-upload'] = el => {
    const renew = el && el.dataset.renew ? A.documentos.find(x => x.id === el.dataset.renew) : null;
    U.openModal({
      title: renew ? 'Renovar documento' : 'Subir documento', sub: renew ? esc(renew.name) : 'Añade un documento a una obra o a la documentación general de la empresa.', submitLabel: 'Subir y enviar a validación',
      footNote: 'El archivo no sale de tu navegador.',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="du-file">Archivo<span class="req">*</span></label><input class="input" type="file" id="du-file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" style="padding:7px 10px;height:auto"><p class="hint">PDF, imagen u ofimática.</p></div>
        <div class="field span-2"><label for="du-name">Nombre del documento<span class="req">*</span></label><input class="input" id="du-name" name="name" maxlength="120" value="${renew ? esc(renew.name) : ''}"></div>
        <div class="field"><label for="du-type">Tipo<span class="req">*</span></label><select class="select" id="du-type" name="type"><option value="">Selecciona</option>${DOC_TYPES.map(t => `<option${renew && renew.type === t ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        <div class="field"><label for="du-obra">Obra</label><select class="select" id="du-obra" name="obra"><option value="">Empresa (general)</option>${A.OBRAS.map(o => `<option value="${o.id}"${renew && renew.obra === o.id ? ' selected' : ''}>${esc(o.short)}</option>`).join('')}</select></div>
        <div class="field"><label for="du-exp">Fecha de caducidad <span class="muted" style="font-weight:400">(si aplica)</span></label><input class="input" type="date" id="du-exp" name="expiry" min="${A.iso(A.REF)}"></div>
      </div>`,
      onOpen: form => { form.elements.file.addEventListener('change', () => { const file = form.elements.file.files[0]; if (file && !form.elements.name.value) form.elements.name.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '); }); },
      onSubmit: form => {
        const ok = U.validate(form, { file: { custom: () => form.elements.file.files.length ? '' : 'Selecciona un archivo.' }, name: { required: true, min: 4 }, type: { required: true, requiredMsg: 'Selecciona el tipo.' } });
        if (!ok) return false;
        const file = form.elements.file.files[0];
        if (file.size > 25 * 1024 * 1024) { U.fieldError(form, 'file', 'El archivo supera los 25 MB.'); return false; }
        const id = A.nextId('DOC');
        A.commit({ type: 'doc.upload', data: { id, name: form.elements.name.value.trim(), type: form.elements.type.value, obra: form.elements.obra.value || null, expiry: form.elements.expiry.value ? new Date(form.elements.expiry.value + 'T00:00:00').toISOString() : null, fileName: file.name, size: file.size } });
        U.toast(`«${esc(form.elements.name.value.trim())}» subido y pendiente de validación.`);
        if (APP.route.name === 'documentacion') APP.setParams({ estado: null, obra: null, q: null }); else APP.refresh();
      }
    });
  };
  APP.views.documentacion = { render: renderDocs, title: 'Documentación' };

  /* ===========================================================================
     INFORMES
     ========================================================================= */
  const RTYPES = [
    ['reunion', 'Resumen para dirección', 'Situación, puntos críticos y decisiones para la próxima reunión.', 'list-checks'],
    ['obras', 'Estado de obras', 'Avance, plazo, coste e incidencias de cada obra.', 'building'],
    ['fichajes', 'Horas y fichajes', 'Horas por persona en los últimos 5 días laborables.', 'clock-4'],
    ['incidencias', 'Incidencias abiertas', 'Pendientes por obra, prioridad y antigüedad.', 'triangle-alert'],
    ['economico', 'Control económico', 'Presupuesto, coste y previsión al cierre.', 'circle-euro']
  ];
  const report = { html: '', csv: null, title: '' };
  function sheet(title, inner) {
    const logo = A.COMPANY.logo ? `<img src="${A.COMPANY.logo}" alt="${esc(A.COMPANY.name)}">` : `<strong>${esc(A.COMPANY.name)}</strong>`;
    return `<article class="sheet" aria-label="${esc(title)}">
      <header class="sheet__head"><div>${logo}<h2 class="sheet__title">${esc(title)}</h2></div><div class="sheet__meta">Generado el ${f.dayLong(new Date())}, ${f.time(new Date())}<br>por ${esc(A.USER.name)} · ${esc(A.USER.role)}<br><strong style="color:var(--sand-ink)">Datos ficticios de demostración</strong></div></header>
      ${inner}
      <footer class="sheet__foot"><span>${esc(A.COMPANY.name)} · Plataforma de operaciones</span><span>${esc(A.COMPANY.credit)}</span></footer>
    </article>`;
  }
  function buildReport(tipo, obra) {
    const t = A.totals();
    const ms = obra ? t.ms.filter(x => x.o.id === obra) : t.ms;
    if (tipo === 'reunion') {
      const r = window.Assistant.answer('Prepárame un resumen para la reunión de mañana');
      const brief = r.blocks.find(b => b.type === 'brief');
      return { title: brief.title, csv: null, html: brief.sections.map(s => `<h3>${esc(s.h.replace(/^\d+\.\s*/, ''))}</h3><ul>${s.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('') };
    }
    if (tipo === 'obras') {
      const head = ['Obra', 'Avance', 'Previsto', 'Estado', 'Desviación coste', 'Incid. abiertas', 'Fin previsto'];
      return {
        title: obra ? `Estado de obra · ${A.obraById(obra).short}` : 'Estado de obras',
        html: `<p>${ms.length} ${ms.length === 1 ? 'obra' : 'obras'} · avance medio ${f.pct(ms.reduce((s, x) => s + x.o.progress, 0) / ms.length)} · ${ms.filter(x => x.m.status !== 'plazo').length} con desfase de plazo.</p>
          <h3>Resumen por obra</h3><table class="dtable"><thead><tr>${head.map((h, i) => `<th${i ? ' class="r"' : ''}>${h}</th>`).join('')}</tr></thead><tbody>${ms.map(({ o, m }) => `<tr><td><strong>${esc(o.name)}</strong><br><small class="muted">${esc(o.town)} · ${esc(A.empById(o.jefe).short)}</small></td><td class="r">${o.progress} %</td><td class="r">${f.pct(m.planned)}</td><td class="r">${m.statusLabel}</td><td class="r">${f.signedPct(m.devPct)}</td><td class="r">${m.open.length}</td><td class="r">${f.dayMed(o.end)}</td></tr>`).join('')}</tbody></table>
          <h3>Observaciones</h3><ul>${ms.filter(x => x.m.open.length).map(({ o, m }) => `<li><strong>${esc(o.short)}:</strong> ${m.open.slice(0, 2).map(i => `${i.id} ${esc(i.title.charAt(0).toLowerCase() + i.title.slice(1))}`).join('; ')}.</li>`).join('') || '<li>Sin incidencias abiertas.</li>'}</ul>`,
        csv: { name: `informe-obras_${A.iso(A.REF)}.csv`, head: ['Obra', 'Municipio', 'Jefe de obra', 'Avance (%)', 'Previsto (%)', 'Estado', 'Desviación coste (%)', 'Incidencias abiertas', 'Fin previsto'], rows: ms.map(({ o, m }) => [o.name, o.town, A.empById(o.jefe).name, o.progress, U.csvNum(m.planned, 1), m.statusLabel, U.csvNum(m.devPct, 2), m.open.length, A.iso(o.end)]) }
      };
    }
    if (tipo === 'fichajes') {
      const days = []; for (let n = 4; n >= 0; n--) days.push(A.workday(-n));
      const rows = A.EMPLEADOS.map(e => {
        const recs = days.map(d => A.fichajes.find(fc => fc.emp === e.id && A.sameDay(fc.date, d)));
        const hours = recs.reduce((s, r) => s + ((r && A.hoursOf(r)) || 0), 0);
        const abs = recs.filter(r => r && r.status === 'ausencia').length; const rev = recs.filter(r => r && (r.status === 'revision' || r.status === 'pendiente')).length;
        return { e, recs, hours, abs, rev };
      });
      const total = rows.reduce((s, r) => s + r.hours, 0);
      return {
        title: 'Horas y fichajes · últimos 5 días laborables',
        html: `<p>Del ${f.dayMed(days[0])} al ${f.dayMed(days[4])}: <strong>${f.hours(total)}</strong> en jornadas cerradas de ${A.EMPLEADOS.length} personas (la jornada en curso se suma al fichar la salida). ${rows.filter(r => r.rev).length} personas tienen fichajes pendientes de revisión.</p>
          <h3>Detalle por persona</h3><table class="dtable"><thead><tr><th>Persona</th>${days.map(d => `<th class="r">${f.cap(f.weekdayShort(d))}</th>`).join('')}<th class="r">Total</th><th class="r">Incid.</th></tr></thead><tbody>${rows.map(r => `<tr><td><strong>${esc(r.e.short)}</strong><br><small class="muted">${esc(r.e.role)}</small></td>${r.recs.map(rc => `<td class="r">${!rc ? '—' : rc.status === 'ausencia' ? '<span class="muted">Aus.</span>' : A.hoursOf(rc) != null ? f.num(A.hoursOf(rc), 1) : rc.in ? (A.sameDay(rc.date, A.REF) ? '<span class="muted">En curso</span>' : '<span style="color:var(--warn-ink)">Sin salida</span>') : '<span style="color:var(--danger-ink)">Sin fichar</span>'}</td>`).join('')}<td class="r"><strong>${f.num(r.hours, 1)}</strong></td><td class="r">${r.rev || ''}</td></tr>`).join('')}</tbody></table>`,
        csv: { name: `informe-fichajes_${A.iso(A.REF)}.csv`, head: ['Persona', 'Puesto'].concat(days.map(d => A.iso(d))).concat(['Total horas', 'Ausencias', 'Fichajes por revisar']), rows: rows.map(r => [r.e.name, r.e.role].concat(r.recs.map(rc => !rc ? '' : rc.status === 'ausencia' ? 'Ausencia' : A.hoursOf(rc) != null ? U.csvNum(A.hoursOf(rc), 2) : rc.in ? (A.sameDay(rc.date, A.REF) ? 'En curso' : 'Sin salida') : 'Sin fichar')).concat([U.csvNum(r.hours, 2), r.abs, r.rev])) }
      };
    }
    if (tipo === 'incidencias') {
      const open = A.incidencias.filter(i => A.OPEN(i.status) && (!obra || i.obra === obra)).sort((a, b) => PRANK[a.priority] - PRANK[b.priority] || A.daysOpen(b) - A.daysOpen(a));
      const groups = A.OBRAS.filter(o => open.some(i => i.obra === o.id));
      return {
        title: 'Incidencias abiertas',
        html: `<p><strong>${open.length} incidencias abiertas</strong> · ${open.filter(i => i.priority === 'alta').length} de prioridad alta · antigüedad media ${f.num(open.reduce((s, i) => s + A.daysOpen(i), 0) / Math.max(1, open.length), 1)} días.</p>
          ${groups.map(o => `<h3>${esc(o.name)}</h3><table class="dtable"><thead><tr><th>Incidencia</th><th>Prioridad</th><th>Estado</th><th>Responsable</th><th class="r">Días</th></tr></thead><tbody>${open.filter(i => i.obra === o.id).map(i => `<tr><td><strong>${i.id}</strong> ${esc(i.title)}</td><td>${U.PRIO[i.priority]}</td><td>${U.STATUS.inc[i.status]}</td><td>${esc(U.personName(i.owner).replace(' (tú)', ''))}</td><td class="r">${A.daysOpen(i)}</td></tr>`).join('')}</tbody></table>`).join('') || '<p>No hay incidencias abiertas.</p>'}`,
        csv: { name: `informe-incidencias_${A.iso(A.REF)}.csv`, head: ['ID', 'Obra', 'Título', 'Prioridad', 'Estado', 'Responsable', 'Días abierta'], rows: open.map(i => [i.id, A.obraById(i.obra).name, i.title, U.PRIO[i.priority], U.STATUS.inc[i.status], U.personName(i.owner).replace(' (tú)', ''), A.daysOpen(i)]) }
      };
    }
    // económico
    const months = A.monthlyCost(6);
    return {
      title: 'Control económico',
      html: `<p>Presupuesto ${f.eurM(t.budget)} · coste ejecutado ${f.eurM(t.ac)} · previsión al cierre ${f.eurM(t.eac)} (<strong>${f.signedPct(t.devPct)}</strong>, ${f.signedEur(t.dev)}).</p>
        <h3>Por obra</h3><table class="dtable"><thead><tr><th>Obra</th><th class="r">Presupuesto</th><th class="r">Coste ejecutado</th><th class="r">Avance</th><th class="r">Previsión</th><th class="r">Desviación</th></tr></thead><tbody>${ms.map(({ o, m }) => `<tr><td>${esc(o.name)}</td><td class="r">${f.eur(o.budget)}</td><td class="r">${f.eur(m.ac)}</td><td class="r">${o.progress} %</td><td class="r">${f.eur(Math.round(m.eac))}</td><td class="r">${f.signedPct(m.devPct)}</td></tr>`).join('')}</tbody></table>
        <h3>Evolución mensual</h3><table class="dtable"><thead><tr><th>Mes</th><th class="r">Planificado</th><th class="r">Real</th><th class="r">Diferencia</th></tr></thead><tbody>${months.map(x => `<tr><td>${f.cap(f.monthLong(x.month))} ${x.month.getFullYear()}${x.current ? ' (en curso)' : ''}</td><td class="r">${f.eur(Math.round(x.planned))}</td><td class="r">${f.eur(Math.round(x.actual))}</td><td class="r">${f.signedPct((x.actual - x.planned) / x.planned * 100)}</td></tr>`).join('')}</tbody></table>`,
      csv: { name: `informe-economico_${A.iso(A.REF)}.csv`, head: ['Obra', 'Presupuesto (€)', 'Coste ejecutado (€)', 'Avance (%)', 'Previsión al cierre (€)', 'Desviación (%)'], rows: ms.map(({ o, m }) => [o.name, U.csvNum(o.budget, 0), U.csvNum(m.ac, 0), o.progress, U.csvNum(m.eac, 0), U.csvNum(m.devPct, 2)]) }
    };
  }
  function renderInformes(route) {
    const p = route.params; const tipo = RTYPES.some(r => r[0] === p.tipo) ? p.tipo : 'reunion';
    const allowObra = tipo === 'obras' || tipo === 'incidencias' || tipo === 'economico';
    return `<div class="page">
      ${U.pageHead({ crumbs: [{ label: 'Informes' }], eyebrow: 'Gestión', title: 'Informes', sub: 'Informes listos para imprimir, guardar en PDF o exportar a Excel, generados con los datos de la plataforma en el momento.' })}
      <div class="rtypes" role="group" aria-label="Tipo de informe">${RTYPES.map(([k, l, d, ic]) => `<button type="button" class="rtype" data-act="param" data-k="tipo" data-v="${k}" aria-pressed="${k === tipo}">${icon(ic, 20)}<strong>${l}</strong><small>${d}</small></button>`).join('')}</div>
      <div class="rbuilder">
        ${allowObra ? `<div class="field"><label for="r-obra">Obras</label><select class="select" id="r-obra" data-param="obra">${obraOptions('Todas las obras').map(o => `<option value="${o.v}"${(p.obra || '') === o.v ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>` : ''}
        <button type="button" class="btn btn--secondary" data-act="report-generate">${icon('refresh-cw', 16)}Actualizar con los datos actuales</button>
      </div>
      <div id="report-out" aria-live="polite">${report.html && report.key === `${tipo}|${p.obra || ''}` ? report.html : ''}</div>
      ${U.footer()}
    </div>`;
  }
  APP.actions['report-generate'] = async () => {
    const p = APP.route.params; const tipo = RTYPES.some(r => r[0] === p.tipo) ? p.tipo : 'reunion';
    const out = $('#report-out'); if (!out) return;
    out.innerHTML = `<div class="sheet" aria-busy="true"><div class="skeleton" style="height:28px;width:40%"></div><div class="skeleton" style="height:14px;width:70%;margin-top:22px"></div><div class="skeleton" style="height:14px;width:62%;margin-top:10px"></div><div class="skeleton" style="height:160px;margin-top:26px"></div><p class="muted" style="margin-top:14px;font-size:13px">Generando el informe con los datos actuales…</p></div>`;
    await U.wait(U.reduceMotion() ? 50 : 650);
    const r = buildReport(tipo, (tipo === 'obras' || tipo === 'incidencias' || tipo === 'economico') ? p.obra : null);
    report.csv = r.csv; report.key = `${tipo}|${p.obra || ''}`;
    report.html = sheet(r.title, r.html) + `<div class="sheet-actions"><button type="button" class="btn btn--primary" data-act="report-print">${icon('printer', 16)}Imprimir o guardar PDF</button>${r.csv ? `<button type="button" class="btn btn--secondary" data-act="report-csv">${icon('download', 16)}Descargar CSV</button>` : ''}</div>`;
    if (document.contains(out)) { out.innerHTML = report.html; }
  };
  APP.actions['report-print'] = () => window.print();
  APP.actions['report-csv'] = () => { if (report.csv) U.downloadCSV(report.csv.name, report.csv.head, report.csv.rows); };
  APP.views.informes = { render: renderInformes, title: 'Informes', mount: r => { const tipo = RTYPES.some(x => x[0] === r.params.tipo) ? r.params.tipo : 'reunion'; if (report.key !== `${tipo}|${r.params.obra || ''}` || !$('#report-out .sheet')) APP.actions['report-generate'](); } };
})();
