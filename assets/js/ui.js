/* =============================================================================
   Utilidades de interfaz: iconos, componentes, gráficos, diálogos, avisos, CSV
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC;
  const f = A.fmt;
  const APP = window.APP = window.APP || {};
  APP.actions = APP.actions || {};
  APP.views = APP.views || {};

  /* ---------- básicos ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const icon = (name, size = 18, cls = '') => `<svg class="i ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${(window.ICONS || {})[name] || ''}</svg>`;

  /* ---------- personas y obras ---------- */
  function avatar(id, size = '') {
    const sz = size ? ` avatar--${size}` : '';
    if (id === 'USER') return `<span class="avatar avatar--user${sz}" aria-hidden="true">${A.USER.initials}</span>`;
    const e = A.empById(id); if (!e) return '';
    return `<span class="avatar avatar--${e.cat}${sz}" aria-hidden="true">${e.initials}</span>`;
  }
  const personName = id => id === 'USER' ? `${A.USER.name} (tú)` : (A.empById(id) || {}).short || '—';
  function person(id, sub, size = 'sm') {
    if (id === 'USER') return `<span class="person">${avatar('USER', size)}<span><strong>${esc(A.USER.name)}</strong><small>${esc(sub || A.USER.role)}</small></span></span>`;
    const e = A.empById(id); if (!e) return '—';
    return `<span class="person">${avatar(id, size)}<span><strong>${esc(e.short)}</strong><small>${esc(sub == null ? e.role : sub)}</small></span></span>`;
  }
  function photo(o, size = 'sm', cls = '', alt) {
    const sm = `assets/img/obras/${o.photo || o}-sm.jpg`, lg = `assets/img/obras/${o.photo || o}-lg.jpg`;
    const sizes = size === 'lg' ? '(max-width: 1023px) 100vw, 60vw' : '(max-width: 720px) 100vw, 33vw';
    return `<img class="${cls}" src="${size === 'lg' ? lg : sm}" srcset="${sm} 760w, ${lg} 1800w" sizes="${sizes}" alt="${esc(alt == null ? '' : alt)}" loading="lazy" decoding="async" style="object-position:${o.focus || '50% 50%'}">`;
  }
  function obraChip(id) {
    if (!id || id === 'oficina') return `<span class="obra-chip obra-chip--office"><span class="ico">${icon('building', 15)}</span>Oficina central</span>`;
    const o = A.obraById(id); if (!o) return '—';
    return `<span class="obra-chip"><img src="${o.photoSm}" alt="" loading="lazy" style="object-position:${o.focus}">${esc(o.short)}</span>`;
  }

  /* ---------- estados ---------- */
  const STATUS = {
    inc: { abierta: 'Abierta', en_curso: 'En curso', resuelta: 'Resuelta' },
    parte: { pendiente: 'Pendiente de validar', validado: 'Validado', devuelto: 'Devuelto' },
    fichaje: { presente: 'Presente', pendiente: 'Pendiente de salida', ausencia: 'Ausencia registrada', revision: 'Revisión necesaria', cerrado: 'Jornada completa' },
    doc: { vigente: 'Vigente', pendiente: 'Pendiente de validar', caduca: 'Caduca pronto', caducado: 'Caducado' }
  };
  const PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const obraPill = m => `<span class="pill pill--${m.status}">${m.statusLabel}</span>`;
  const phasePill = m => m.phase ? `<span class="pill pill--fase pill--plain">${m.phase}</span>` : '';
  const incPill = s => `<span class="pill pill--${s}">${STATUS.inc[s]}</span>`;
  const partePill = s => `<span class="pill pill--${s}">${STATUS.parte[s]}</span>`;
  const fichajePill = s => `<span class="pill pill--${s === 'pendiente' ? 'pendiente_salida' : s}">${STATUS.fichaje[s]}</span>`;
  const docPill = s => `<span class="pill pill--${s}">${STATUS.doc[s]}</span>`;
  const prio = p => `<span class="prio prio--${p}">${PRIO[p]}</span>`;
  function progressBar(o, m, extra = '') {
    return `<div class="bar bar--${m.status} ${extra}" role="img" aria-label="Avance real ${o.progress} %, previsto ${Math.round(m.planned)} %"><i style="width:${o.progress}%"></i><b style="left:${Math.min(100, m.planned)}%"></b></div>`;
  }

  /* ---------- gráficos SVG ---------- */
  function sparkBars(values, { w = 92, h = 40, gap = 3, color = '#C9C2B4', last = 'var(--accent)', min = 0 } = {}) {
    const n = values.length; const bw = (w - gap * (n - 1)) / n;
    const max = Math.max(...values, 1); const lo = Math.min(min, ...values);
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${values.map((v, i) => {
      const bh = Math.max(3, (v - lo) / (max - lo || 1) * (h - 4));
      return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="1.6" fill="${i === n - 1 ? last : color}"/>`;
    }).join('')}</svg>`;
  }
  function progressColumns(items, { w = 92, h = 40 } = {}) {
    const n = items.length, gap = 5, bw = (w - gap * (n - 1)) / n;
    const col = { plazo: 'var(--accent)', riesgo: '#B98E4B', retrasada: '#B5654F', terminada: 'var(--accent)' };
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${items.map((it, i) => {
      const x = i * (bw + gap); const bh = Math.max(3, it.v / 100 * h);
      return `<rect x="${x.toFixed(1)}" y="0" width="${bw.toFixed(1)}" height="${h}" rx="2" fill="#F0EDE7"/><rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${col[it.s] || 'var(--accent)'}"/>`;
    }).join('')}</svg>`;
  }
  function prioBars(c, { w = 92, h = 40 } = {}) {
    const items = [['alta', c.alta, 'var(--danger)'], ['media', c.media, 'var(--warn)'], ['baja', c.baja, '#BDB9B1']];
    const max = Math.max(1, ...items.map(x => x[1])); const bw = 22, gap = (w - bw * 3) / 2;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h + 12}" aria-hidden="true">${items.map(([k, v, col], i) => {
      const x = i * (bw + gap); const bh = Math.max(3, v / max * (h - 6));
      return `<rect x="${x}" y="${(h - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" rx="3" fill="${col}" opacity=".85"/><text x="${x + bw / 2}" y="${h + 10}" text-anchor="middle" font-size="9.5" fill="#8B8E86" font-family="Inter, sans-serif">${k[0].toUpperCase()}</text>`;
    }).join('')}</svg>`;
  }
  function costBars(series, { w = 92, h = 40 } = {}) {
    const n = series.length, gap = 4, bw = (w - gap * (n - 1)) / n;
    const max = Math.max(...series.map(s => Math.max(s.actual, s.planned)), 1);
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${series.map((s, i) => {
      const x = i * (bw + gap); const ah = s.actual / max * (h - 3); const py = h - s.planned / max * (h - 3);
      return `<rect x="${x.toFixed(1)}" y="${(h - ah).toFixed(1)}" width="${bw.toFixed(1)}" height="${ah.toFixed(1)}" rx="1.6" fill="${s.current ? 'var(--accent)' : '#C9C2B4'}"/><rect x="${(x - 1).toFixed(1)}" y="${(py - 1).toFixed(1)}" width="${(bw + 2).toFixed(1)}" height="2" rx="1" fill="#242824" opacity=".55"/>`;
    }).join('')}</svg>`;
  }

  /** Curva S: planificación (discontinua) frente a avance real (continua) */
  function sCurve(o, m, { w = 560, h = 190 } = {}) {
    const pad = { l: 34, r: 14, t: 14, b: 26 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const X = t => pad.l + t * iw, Y = p => pad.t + (1 - p) * ih;
    const N = 60; let plan = '';
    for (let i = 0; i <= N; i++) { const t = i / N; plan += `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(A.S(t)).toFixed(1)}`; }
    const k = A.S(o.t) > 0 ? (o.progress / 100) / A.S(o.t) : 0;
    let real = ''; const M = Math.max(2, Math.round(N * o.t));
    for (let i = 0; i <= M; i++) { const t = o.t * i / M; real += `${i ? 'L' : 'M'}${X(t).toFixed(1)} ${Y(Math.min(1, A.S(t) * k)).toFixed(1)}`; }
    const area = real + `L${X(o.t).toFixed(1)} ${Y(0)}L${X(0)} ${Y(0)}Z`;
    const grid = [0, .25, .5, .75, 1].map(p => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(p)}" y2="${Y(p)}" stroke="#EFEDE8"/><text x="${pad.l - 8}" y="${Y(p) + 3.5}" text-anchor="end">${p * 100}%</text>`).join('');
    const ticks = []; const months = Math.round(o.duration);
    const step = months > 12 ? 4 : months > 8 ? 2 : 1;
    for (let mth = 0; mth <= months; mth += step) {
      const d = new Date(o.start.getFullYear(), o.start.getMonth() + mth, 1);
      const t = (d - o.start) / (o.end - o.start); if (t < 0 || t > 1) continue;
      ticks.push(`<text x="${X(t).toFixed(1)}" y="${h - 6}" text-anchor="middle">${f.monthShort(d)}${d.getMonth() === 0 || mth === 0 ? ' ' + String(d.getFullYear()).slice(2) : ''}</text>`);
    }
    const tx = X(o.t), ty = Y(o.progress / 100), py = Y(A.S(o.t));
    return `<svg class="scurve" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none" role="img" aria-label="Curva de avance: real ${o.progress} %, previsto ${Math.round(m.planned)} % a hoy">
      ${grid}${ticks.join('')}
      <path d="${area}" fill="rgba(185,161,187,.22)"/>
      <path d="${plan}" fill="none" stroke="#9A9D96" stroke-width="1.5" stroke-dasharray="4 4"/>
      <path d="${real}" fill="none" stroke="var(--accent-700)" stroke-width="2.4" stroke-linecap="round"/>
      <line x1="${tx}" x2="${tx}" y1="${pad.t}" y2="${Y(0)}" stroke="#242824" stroke-opacity=".25" stroke-dasharray="2 3"/>
      <circle cx="${tx}" cy="${py}" r="3.5" fill="#fff" stroke="#9A9D96" stroke-width="1.5"/>
      <circle cx="${tx}" cy="${ty}" r="5" fill="var(--accent-ink)" stroke="#fff" stroke-width="2"/>
      <text x="${Math.min(tx + 8, w - 40)}" y="${pad.t + 10}" style="fill:#242824;font-weight:600">Hoy</text>
    </svg>`;
  }

  /** Coste mensual: barras de coste real y marca de lo planificado */
  function monthlyChart(series, { w = 520, h = 220 } = {}) {
    const pad = { l: 46, r: 10, t: 16, b: 28 };
    const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
    const max = Math.max(...series.map(s => Math.max(s.actual, s.planned))) * 1.12 || 1;
    const nice = (() => { const raw = max / 4; const p = Math.pow(10, Math.floor(Math.log10(raw))); const n = Math.ceil(raw / p); return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; })();
    const Y = v => pad.t + ih - v / (nice * 4) * ih;
    const n = series.length, slot = iw / n, bw = Math.min(42, slot * .52);
    const grid = [0, 1, 2, 3, 4].map(i => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${Y(nice * i)}" y2="${Y(nice * i)}" stroke="#EFEDE8"/><text x="${pad.l - 8}" y="${Y(nice * i) + 4}" text-anchor="end">${i === 0 ? '0' : f.num(nice * i / 1e6, nice * i / 1e6 < 1 ? 2 : 1) + ' M'}</text>`).join('');
    const bars = series.map((s, i) => {
      const cx = pad.l + slot * i + slot / 2;
      const ah = Y(0) - Y(s.actual);
      return `<g><title>${f.cap(f.monthLong(s.month))}${s.current ? ' (en curso)' : ''}: coste real ${f.eurAuto(s.actual)} · planificado ${f.eurAuto(s.planned)}</title>
        <rect x="${(cx - bw / 2).toFixed(1)}" y="${Y(s.actual).toFixed(1)}" width="${bw.toFixed(1)}" height="${ah.toFixed(1)}" rx="4" fill="${s.current ? 'var(--accent)' : '#C9C2B4'}"/>
        <rect x="${(cx - bw / 2 - 5).toFixed(1)}" y="${(Y(s.planned) - 1.25).toFixed(1)}" width="${(bw + 10).toFixed(1)}" height="2.5" rx="1.2" fill="var(--warn)"/>
        <text x="${cx.toFixed(1)}" y="${h - 8}" text-anchor="middle" style="${s.current ? 'fill:#242824;font-weight:600' : ''}">${f.monthShort(s.month)}${s.current ? '*' : ''}</text></g>`;
    }).join('');
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Coste mensual real frente a planificado de los últimos ${n} meses">${grid}${bars}</svg>`;
  }

  /* ---------- avisos (toasts) ---------- */
  function toast(msg, { type = 'ok', actionLabel, onAction, timeout = 4600 } = {}) {
    const box = $('#toasts'); if (!box) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span class="ico">${icon(type === 'error' ? 'circle-alert' : type === 'info' ? 'info' : 'check', 15)}</span><span>${msg}${actionLabel ? ` <button type="button" class="link">${esc(actionLabel)}</button>` : ''}</span>`;
    if (actionLabel && onAction) el.querySelector('button').addEventListener('click', () => { onAction(); dismiss(); });
    box.appendChild(el);
    let t = setTimeout(dismiss, timeout);
    el.addEventListener('mouseenter', () => clearTimeout(t));
    el.addEventListener('mouseleave', () => { t = setTimeout(dismiss, 1800); });
    function dismiss() { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 320); }
  }
  function announce(text) { const el = $('#sr-live'); if (!el) return; el.textContent = ''; setTimeout(() => { el.textContent = text; }, 60); }

  /* ---------- diálogos ---------- */
  let lastFocus = null;
  function openModal({ title, sub = '', body, foot, size = '', onSubmit, onOpen, submitLabel = 'Guardar', cancelLabel = 'Cancelar', footNote = '' }) {
    const dlg = $('#modal');
    lastFocus = document.activeElement;
    dlg.className = 'modal' + (size ? ` modal--${size}` : '');
    const footer = foot != null ? foot : `${footNote ? `<span class="left">${footNote}</span>` : ''}<button type="button" class="btn btn--ghost" data-close>${esc(cancelLabel)}</button><button type="submit" class="btn btn--primary">${esc(submitLabel)}</button>`;
    dlg.innerHTML = `<form class="modal__panel" novalidate>
      <div class="modal__head"><div><h2 class="modal__title" id="modal-title">${title}</h2>${sub ? `<p class="modal__sub">${sub}</p>` : ''}</div>
      <button type="button" class="icon-btn" data-close aria-label="Cerrar">${icon('x', 18)}</button></div>
      <div class="modal__body">${body}</div>
      <div class="modal__foot">${footer}</div></form>`;
    const form = dlg.querySelector('form');
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!onSubmit) return closeModal();
      const r = onSubmit(form);
      if (r !== false) closeModal();
    });
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', () => closeModal()));
    dlg.onclick = e => { if (e.target === dlg) closeModal(); };
    dlg.oncancel = e => { e.preventDefault(); closeModal(); };
    if (!dlg.open) dlg.showModal();
    const first = form.querySelector('[autofocus], .modal__body input:not([type=hidden]):not([type=radio]):not([type=checkbox]), .modal__body select, .modal__body textarea, .modal__body button');
    if (first) setTimeout(() => first.focus(), 30);
    if (onOpen) onOpen(form);
    return form;
  }
  function closeModal() {
    const dlg = $('#modal'); if (dlg.open) dlg.close();
    dlg.innerHTML = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function confirmDialog({ title, text, confirmLabel = 'Confirmar', danger = false }) {
    return new Promise(resolve => {
      let done = false;
      openModal({
        title, size: 'sm', body: `<p style="color:var(--ink-2)">${text}</p>`,
        foot: `<button type="button" class="btn btn--ghost" data-close>Cancelar</button><button type="submit" class="btn ${danger ? 'btn--danger' : 'btn--primary'}">${esc(confirmLabel)}</button>`,
        onSubmit: () => { done = true; resolve(true); }
      });
      const dlg = $('#modal');
      dlg.addEventListener('close', () => { if (!done) resolve(false); }, { once: true });
    });
  }
  let drawerFocus = null;
  function openDrawer({ eyebrow = '', title, body, foot = '', onOpen, label }) {
    const dlg = $('#drawer');
    if (!dlg.open) drawerFocus = document.activeElement;
    dlg.innerHTML = `<div class="drawer__panel">
      <div class="drawer__head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h2 class="drawer__title" id="drawer-title">${title}</h2></div>
      <button type="button" class="icon-btn" data-close aria-label="Cerrar panel">${icon('x', 18)}</button></div>
      <div class="drawer__body">${body}</div>${foot ? `<div class="drawer__foot">${foot}</div>` : ''}</div>`;
    $$('[data-close]', dlg).forEach(b => b.addEventListener('click', closeDrawer));
    dlg.onclick = e => { if (e.target === dlg) closeDrawer(); };
    dlg.oncancel = e => { e.preventDefault(); closeDrawer(); };
    if (!dlg.open) dlg.showModal();
    if (label) dlg.setAttribute('aria-label', label);
    const btn = dlg.querySelector('.drawer__head .icon-btn'); if (btn) setTimeout(() => btn.focus(), 30);
    if (onOpen) onOpen(dlg);
    return dlg;
  }
  function closeDrawer() {
    const dlg = $('#drawer'); if (dlg.open) dlg.close();
    dlg.innerHTML = '';
    if (APP.onDrawerClose) { const cb = APP.onDrawerClose; APP.onDrawerClose = null; cb(); }
    if (drawerFocus && document.contains(drawerFocus)) drawerFocus.focus();
  }

  /* ---------- formularios ---------- */
  function fieldError(form, name, msg) {
    const el = form.elements[name]; if (!el) return;
    const target = el.length && !el.tagName ? el[0] : el;
    const field = target.closest('.field');
    const id = `err-${name}`;
    let err = field && field.querySelector('.error');
    if (msg) {
      if (target.setAttribute) target.setAttribute('aria-invalid', 'true');
      if (target.setAttribute) target.setAttribute('aria-describedby', id);
      if (field && !err) { err = document.createElement('p'); err.className = 'error'; err.id = id; field.appendChild(err); }
      if (err) err.innerHTML = `${icon('circle-alert', 13)}${esc(msg)}`;
    } else {
      if (target.removeAttribute) { target.removeAttribute('aria-invalid'); target.removeAttribute('aria-describedby'); }
      if (err) err.remove();
    }
  }
  function validate(form, rules) {
    let ok = true; let first = null;
    Object.entries(rules).forEach(([name, r]) => {
      const el = form.elements[name]; if (!el) return;
      const v = (el.value || '').trim();
      let msg = '';
      if (r.required && !v) msg = r.requiredMsg || 'Este campo es obligatorio.';
      else if (r.min && v.length < r.min) msg = `Escribe al menos ${r.min} caracteres.`;
      else if (r.number) { const n = Number(v.replace(',', '.')); if (isNaN(n) || n < r.number[0] || n > r.number[1]) msg = `Introduce un valor entre ${f.num(r.number[0], r.number[0] % 1 ? 1 : 0)} y ${f.num(r.number[1])}.`; }
      else if (r.custom) msg = r.custom(v, form) || '';
      fieldError(form, name, msg);
      if (msg) { ok = false; if (!first) first = el; }
    });
    if (first && first.focus) first.focus();
    return ok;
  }
  // limpia el error de un campo al editarlo
  document.addEventListener('input', e => { const t = e.target; if (t.getAttribute && t.getAttribute('aria-invalid') === 'true' && t.form) fieldError(t.form, t.name, ''); });
  document.addEventListener('change', e => { const t = e.target; if (t.getAttribute && t.getAttribute('aria-invalid') === 'true' && t.form) fieldError(t.form, t.name, ''); });

  /* ---------- CSV ---------- */
  const csvNum = (n, d = 2) => (n == null || isNaN(n)) ? '' : Number(n).toFixed(d).replace('.', ',');
  function downloadCSV(filename, header, rows) {
    const cell = v => { const s = v == null ? '' : String(v); return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [header].concat(rows).map(r => r.map(cell).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(`Se ha descargado <strong>${esc(filename)}</strong> (${rows.length} filas).`, { type: 'ok' });
  }

  /* ---------- cabecera de página ---------- */
  function utilityTools(glass = false) {
    const n = alertGroups().length;
    return `<span class="demo-pill${glass ? ' demo-pill--glass' : ''}" title="Todas las obras, personas, cifras y ubicaciones son ficticias."><span class="demo-pill__long">Entorno de demostración · Datos ficticios</span><span class="demo-pill__short" aria-hidden="true">Demo · Datos ficticios</span></span>
      <button type="button" class="icon-btn${glass ? '' : ' icon-btn--outline'}" data-act="alerts" aria-label="Avisos pendientes${n ? `: ${n}` : ''}" aria-haspopup="dialog">${icon('bell', 19)}${n ? `<span class="bell-dot">${n}</span>` : ''}</button>`;
  }
  function pageHead({ crumbs = [], eyebrow = '', title, sub = '', actions = '' }) {
    return `<header class="page-head">
      <div class="page-head__bar">
        <nav class="crumbs" aria-label="Ruta"><a href="#/inicio">${icon('house', 14)}<span class="sr-only">Inicio</span></a>${crumbs.map(c => `${icon('chevron-right', 13)}${c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span aria-current="page">${esc(c.label)}</span>`}`).join('')}</nav>
        <div class="page-head__tools">${utilityTools()}</div>
      </div>
      <div class="page-head__main">
        <div>${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1 class="page-title" tabindex="-1">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ''}
      </div>
    </header>`;
  }
  function footer() {
    return `<footer class="footer"><span><strong>Entorno de demostración · Datos ficticios</strong></span><span>${esc(A.COMPANY.name)} · Plataforma de operaciones · ${esc(A.COMPANY.credit)}</span></footer>`;
  }
  function empty({ ico = 'search', title, text = '', action = '' }) {
    return `<div class="empty"><div><span class="empty__icon">${icon(ico, 22)}</span><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${action}</div></div>`;
  }

  /* ---------- avisos agrupados (campana) ---------- */
  function alertGroups() {
    const t = A.totals();
    const docsBad = A.documentos.filter(d => d.status === 'caducado' || d.status === 'caduca');
    const groups = [];
    if (t.review.length) groups.push({ ico: 'clock-4', tone: 'alert', n: t.review.length, title: `${t.review.length} fichajes por revisar`, sub: 'Sin salida, fuera de geocerca o sin fichar', href: '#/fichajes?estado=revision' });
    if (t.highInc.length) groups.push({ ico: 'triangle-alert', tone: 'alert', n: t.highInc.length, title: `${t.highInc.length} incidencias de prioridad alta`, sub: 'Abiertas o en curso', href: '#/incidencias?estado=abiertas&prioridad=alta' });
    if (t.partesPend.length) groups.push({ ico: 'clipboard-list', tone: 'warn', n: t.partesPend.length, title: `${t.partesPend.length} partes pendientes de validar`, sub: 'Enviados desde obra', href: '#/partes?estado=pendiente' });
    if (docsBad.length) groups.push({ ico: 'file-clock', tone: 'warn', n: docsBad.length, title: `${docsBad.length} documentos caducados o por caducar`, sub: 'Revisión, formación y CAE', href: '#/documentacion?estado=alertas' });
    return groups;
  }
  let popEl = null;
  function closePopover() { if (popEl) { popEl.remove(); popEl = null; document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escKey, true); } }
  function outside(e) { if (popEl && !popEl.contains(e.target) && !e.target.closest('[data-act="alerts"],[data-act="user-menu"]')) closePopover(); }
  function escKey(e) { if (e.key === 'Escape') { const anchor = popEl && popEl._anchor; closePopover(); if (anchor) anchor.focus(); } }
  function openPopover(anchor, html, cls = '') {
    const same = popEl && popEl._anchor === anchor;
    closePopover(); if (same) return;
    popEl = document.createElement('div');
    popEl.className = `popover ${cls}`; popEl.setAttribute('role', 'dialog'); popEl._anchor = anchor;
    popEl.innerHTML = html;
    document.body.appendChild(popEl);
    const r = anchor.getBoundingClientRect(); const pw = popEl.offsetWidth; const ph = popEl.offsetHeight;
    let left = Math.min(window.innerWidth - pw - 12, Math.max(12, r.right - pw));
    let top = r.bottom + 8;
    if (top + ph > window.innerHeight - 12) top = Math.max(12, r.top - ph - 8);
    popEl.style.left = `${left}px`; popEl.style.top = `${top}px`;
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escKey, true);
    const first = popEl.querySelector('a,button'); if (first) first.focus();
    popEl.addEventListener('click', e => { if (e.target.closest('a[href]')) closePopover(); });
  }
  APP.actions.alerts = el => {
    const g = alertGroups();
    openPopover(el, `<div class="popover__head"><strong>Avisos pendientes</strong><span class="muted" style="font-size:12px">${g.length ? 'Requieren revisión' : 'Todo al día'}</span></div>
      ${g.length ? g.map(x => `<a class="popover__item" href="${x.href}"><span class="ico ico--${x.tone}">${icon(x.ico, 17)}</span><span><strong>${x.title}</strong><small>${x.sub}</small></span>${icon('chevron-right', 15, 'muted')}</a>`).join('') : `<p class="muted" style="padding:6px 12px 12px;font-size:13px">No hay avisos pendientes.</p>`}`);
  };

  Object.assign(APP, {
    ui: { esc, $, $$, wait, icon, avatar, person, personName, photo, obraChip, obraPill, phasePill, incPill, partePill, fichajePill, docPill, prio, progressBar, sparkBars, progressColumns, prioBars, costBars, sCurve, monthlyChart, toast, announce, openModal, closeModal, confirmDialog, openDrawer, closeDrawer, validate, fieldError, downloadCSV, csvNum, pageHead, footer, empty, utilityTools, alertGroups, openPopover, closePopover, reduceMotion, STATUS, PRIO }
  });
})();
