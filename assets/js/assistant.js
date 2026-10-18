/* =============================================================================
   Asistente de operaciones · motor de respuestas LOCAL (demo)
   -----------------------------------------------------------------------------
   No se conecta a ningún modelo de IA ni a sistemas de la empresa.
   Interpreta la pregunta con reglas (palabras clave y entidades) y construye
   la respuesta con los datos ficticios de la demo (window.APC), incluidos los
   cambios que se hagan durante la sesión.

   En producción, este módulo se sustituiría por una llamada a un backend seguro
   que consulte un modelo de lenguaje con acceso controlado a los datos.
   ============================================================================= */
(function () {
  'use strict';
  const A = window.APC;
  const f = A.fmt;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:()«»"']/g, ' ').replace(/\s+/g, ' ').trim();
  const has = (q, re) => re.test(q);
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* --- fecha y hora reales: cómo nombrar la jornada --- */
  const DC = A.DAYCTX;
  const offTxt = () => `Hoy es ${DC.off} y no hay jornada`;   // «Hoy es domingo y no hay jornada»
  function teamKpi(t) {
    if (A.PHASE === 'jornada') return { label: 'En obra ahora', value: `${t.present.length}/${t.employees}` };
    if (A.PHASE === 'antes') return { label: 'En obra hoy', value: `0/${t.employees}` };
    if (A.PHASE === 'cerrada') return { label: 'Fichajes de hoy', value: `${t.worked.length}/${t.employees}` };
    return { label: 'Última jornada', value: `${t.worked.length}/${t.employees}` };
  }

  /* --- bloques de respuesta --- */
  const P = html => ({ type: 'p', html });
  const L = items => ({ type: 'list', items });
  const H = text => ({ type: 'h', text });
  const T = (head, rows, align) => ({ type: 'table', head, rows, align });
  const K = items => ({ type: 'kpis', items });
  const ACT = items => ({ type: 'actions', items });
  const NOTE = html => ({ type: 'note', html });

  const obraLink = o => `<a href="#/obras/${o.id}" class="ai-link">${esc(o.short)}</a>`;
  const incLink = i => `<a href="#/incidencias?id=${i.id}" class="ai-link">${i.id}</a>`;
  const empName = id => id === 'USER' ? A.USER.name : (A.empById(id) || {}).short || id;
  const statusTag = m => `<span class="ai-tag ai-tag--${m.status}">${m.statusLabel}</span>`;
  const weeksTxt = d => d >= 14 ? `≈ ${Math.round(d / 7)} semanas` : d > 0 ? `≈ ${plural(d, 'día', 'días')}` : '—';
  const PRIO = { alta: 'Alta', media: 'Media', baja: 'Baja' };
  const INC_STATUS = { abierta: 'Abierta', en_curso: 'En curso', resuelta: 'Resuelta' };

  /* --- entidades --- */
  const OBRA_ALIASES = {
    terrasses: ['les terrasses', 'terrasses', 'terrases', 'terrazas', 'finestrat', 'residencial'],
    villas: ['serra gelada', 'sierra helada', 'villas', 'villa', 'alfas', 'albir'],
    atalaya: ['atalaya', 'rehabilitacion', 'poniente'],
    nave: ['nave', 'logistica', 'vila joiosa', 'villajoyosa', 'sector 4', 'industrial'],
    hotel: ['hotel', 'albera', 'altea', 'spa'],
    apartamentos: ['apartamentos', 'levante', 'reforma integral']
  };
  function findObras(q) {
    const found = new Set();
    Object.entries(OBRA_ALIASES).forEach(([id, al]) => { if (al.some(a => new RegExp(`\\b${a}\\b`).test(q))) found.add(id); });
    if (/\bbenidorm\b/.test(q)) { found.add('atalaya'); found.add('apartamentos'); }
    return [...found].map(A.obraById);
  }
  function findEmpleados(q) {
    const out = [];
    A.EMPLEADOS.forEach(e => {
      const tokens = norm(e.name).split(' ').filter(t => t.length > 2 && !['del', 'las', 'los'].includes(t));
      const first = norm(e.first);
      if (new RegExp(`\\b${first}\\b`).test(q) || tokens.slice(first.split(' ').length).some(t => new RegExp(`\\b${t}\\b`).test(q))) out.push(e);
    });
    return out;
  }

  /* --- intenciones (ordenadas por prioridad) --- */
  const INTENTS = [
    ['meeting', q => has(q, /\b(reunion|briefing|comite|orden del dia)\b/) || (has(q, /\b(preparame|prepara|preparar)\b/) && has(q, /\b(resumen|informe|nota)\b/))],
    ['ideas', q => has(q, /\b(ideas?|mejorar|mejoras|automatiz\w*|optimiz\w*|ahorrar|eficien\w*|oportunidad\w*)\b/)],
    ['incByJefe', q => has(q, /incidenc/) && has(q, /\b(jefe|jefa|jefes|responsable|quien)\b/)],
    ['incOldest', q => has(q, /incidenc/) && has(q, /(mas tiempo|antigu|sin resolver|llevan|mas viejas|desde hace|atascad|estancad|lleva)/)],
    ['absent', q => has(q, /(no (han|ha) fichado|sin fichar|no (han|ha) (venido|llegado)|ausen|quien(es)? (no|falta)|faltan?\b|han faltado|no estan)/)],
    ['review', q => has(q, /(fichaj\w* (pendiente|por revisar|a revisar|con incidencias)|anomal|geocerca|revisar (los )?fichajes)/)],
    ['delays', q => has(q, /(retras|plazo|van tarde|atrasad|demora|desfase|a tiempo|en fecha|calendario|planificacion)/)],
    ['attention', q => !has(q, /incidenc/) && has(q, /(atencion|priorizar|prioridad|preocup|critic|foco|urgente|riesgo|por donde empiezo|que hago|vigilar)/)],
    ['budget', q => has(q, /(presupuest|coste|costo|desviaci|dinero|gasto|gastado|economic|margen|sobrecoste|euro|€|facturac|rentab|certificac|cuanto llevamos)/)],
    ['partes', q => has(q, /\bpartes?\b|validar|pendientes de validacion/)],
    ['docs', q => has(q, /(document|licencia|caduc|vencid|permiso|certificado|\bcae\b|papeles|formacion)/)],
    ['incidents', q => has(q, /(incidenc|problema|averia|seguridad|bloqueo)/)],
    ['presence', q => has(q, /(fichaj|presentes?|quien(es)? (esta|estan)|cuant\w* (hay|estan|trabajan|personas)|trabajando|en obra hoy|equipo hoy|donde esta mi equipo|plantilla|personal hoy|asistencia)/)],
    ['summary', q => has(q, /(resumen|resume|resumir|situacion|estado|vision general|panorama|como vamos|como va todo|todas las obras|en general|novedades|como estamos)/)],
    ['help', q => has(q, /(que puedes|ayuda|que sabes|como funciona|que te puedo|ejemplos|que haces)/)],
    ['greet', q => has(q, /^(hola|buenas|buenos dias|buenas tardes|hey|que tal)\b/)]
  ];

  /* ===========================================================================
     Respuestas
     ========================================================================= */
  function ansSummary(ctx) {
    const t = A.totals();
    const ms = ctx.obras.length ? t.ms.filter(x => ctx.obras.includes(x.o)) : t.ms;
    if (ctx.obras.length === 1) return ansObra(ctx.obras[0]);
    const worstTime = [...t.ms].sort((a, b) => b.m.gap - a.m.gap)[0];
    const worstCost = [...t.ms].sort((a, b) => b.m.devPct - a.m.devPct)[0];
    return [
      P(`Situación de ${ctx.obras.length ? 'las obras seleccionadas' : `las <strong>${t.obras} obras activas</strong>`} a ${f.dayLong(A.TODAY).replace(/^\S+, /, '')}, ${f.time(new Date())}:`),
      K([
        { label: 'Avance medio', value: f.pct(t.avgProgress) },
        teamKpi(t),
        { label: 'Incidencias abiertas', value: String(t.openInc.length), tone: t.highInc.length ? 'warn' : '' },
        { label: 'Desviación prevista', value: f.signedPct(t.devPct), tone: t.devPct > 0 ? 'warn' : 'ok' }
      ]),
      L(ms.map(({ o, m }) => `${obraLink(o)} <span class="ai-muted">· ${esc(o.town)}</span> — ${f.pct(o.progress)} ${statusTag(m)}${m.open.length ? ` · ${plural(m.open.length, 'incidencia abierta', 'incidencias abiertas')}` : ''} · coste ${f.signedPct(m.devPct)}`)),
      P(worstTime.o === worstCost.o
        ? `Lo más relevante: <strong>${esc(worstTime.o.short)}</strong> concentra a la vez el mayor desfase de plazo (${f.num(worstTime.m.gap, 0)} puntos) y la mayor desviación de coste (${f.signedPct(worstCost.m.devPct)}).${(() => { const second = [...t.ms].sort((a, b) => b.m.devPct - a.m.devPct)[1]; return second && second.m.devPct > 2 ? ` Le sigue <strong>${esc(second.o.short)}</strong> en coste (${f.signedPct(second.m.devPct)}).` : ''; })()}`
        : `Lo más relevante: <strong>${esc(worstTime.o.short)}</strong> concentra el mayor desfase de plazo (${f.num(worstTime.m.gap, 0)} puntos) y <strong>${esc(worstCost.o.short)}</strong> la mayor desviación de coste (${f.signedPct(worstCost.m.devPct)}).`),
      ACT([{ label: 'Ver todas las obras', href: '#/obras' }, { label: 'Control económico', href: '#/economico' }])
    ];
  }

  function ansObra(o) {
    const m = A.metrics(o);
    const jefe = A.empById(o.jefe);
    const next = o.milestones.filter(x => x.date >= A.TODAY)[0];
    const blocks = [
      P(`<strong>${esc(o.name)}</strong> · ${esc(o.type)} en ${esc(o.town)} ${statusTag(m)}`),
      K([
        { label: 'Avance real', value: f.pct(o.progress) },
        { label: 'Previsto hoy', value: f.pct(m.planned) },
        { label: 'Desviación coste', value: f.signedPct(m.devPct), tone: m.devPct > 2 ? 'warn' : m.devPct < 0 ? 'ok' : '' },
        { label: teamKpi({ present: m.present, worked: m.present, employees: 0 }).label, value: String(m.present.length) }
      ]),
      L([
        `Jefe de obra: <strong>${esc(jefe.short)}</strong>${o.encargado ? ` · encargado: ${esc(A.empById(o.encargado).short)}` : ''}.`,
        `Coste ejecutado ${f.eurAuto(m.ac)} de ${f.eurAuto(o.budget)}; previsión al cierre ${f.eurAuto(m.eac)}.`,
        m.open.length ? `${plural(m.open.length, 'incidencia abierta', 'incidencias abiertas')}: ${m.open.slice(0, 3).map(i => `${incLink(i)} ${esc(i.title.toLowerCase())}`).join('; ')}.` : 'Sin incidencias abiertas.',
        `Fin previsto: ${f.dayMed(o.end)}${m.daysBehind > 7 && m.status !== 'plazo' ? ` (retraso estimado ${weeksTxt(m.daysBehind)})` : ''}.`,
        next ? `Próximo hito: ${esc(next.label)} (${f.dayShort(next.date)}).` : ''
      ].filter(Boolean)),
      ACT([{ label: `Abrir ${o.short}`, href: `#/obras/${o.id}` }, { label: 'Incidencias de la obra', href: `#/incidencias?obra=${o.id}` }])
    ];
    return blocks;
  }

  function ansDelays(ctx) {
    const t = A.totals();
    let list = t.ms.filter(x => x.m.gap > 3).sort((a, b) => b.m.gap - a.m.gap);
    if (ctx.obras.length) list = list.filter(x => ctx.obras.includes(x.o));
    if (!list.length) {
      return [P(ctx.obras.length ? `${ctx.obras.map(o => `<strong>${esc(o.short)}</strong>`).join(' y ')} avanza${ctx.obras.length > 1 ? 'n' : ''} dentro de su planificación.` : 'Ninguna obra presenta retraso significativo respecto a su planificación.'), ACT([{ label: 'Ver obras', href: '#/obras' }])];
    }
    const top = list[0];
    const causes = top.m.open.filter(i => i.priority === 'alta' || A.daysOpen(i) > 10).sort((a, b) => A.daysOpen(b) - A.daysOpen(a)).slice(0, 2);
    const onTime = t.ms.length - t.ms.filter(x => x.m.gap > 3).length;
    return [
      P(`${list.length === 1 ? 'Hay <strong>1 obra</strong>' : `Hay <strong>${list.length} obras</strong>`} por detrás de su planificación a día de hoy:`),
      T(['Obra', 'Real', 'Previsto', 'Desfase', 'Retraso'], list.map(({ o, m }) => [obraLink(o), f.pct(o.progress), f.pct(m.planned), `−${f.num(m.gap, 0)} pts`, weeksTxt(m.daysBehind)]), ['l', 'r', 'r', 'r', 'r']),
      causes.length ? P(`En <strong>${esc(top.o.short)}</strong> el desfase se explica sobre todo por ${causes.map(i => `${incLink(i)} (${esc(i.title.charAt(0).toLowerCase() + i.title.slice(1))}, abierta hace ${A.fmt.daysAgo(i.openedAt)})`).join(' y ')}.`) : null,
      !ctx.obras.length ? P(`Las otras ${onTime} obras avanzan en plazo.`) : null,
      ACT([{ label: `Abrir ${top.o.short}`, href: `#/obras/${top.o.id}` }, { label: 'Incidencias de la obra', href: `#/incidencias?obra=${top.o.id}` }]),
      NOTE('Desfase = avance previsto según la planificación de cada obra − avance real registrado.')
    ].filter(Boolean);
  }

  function ansAbsent(ctx) {
    const inScope = fc => !ctx.obras.length || ctx.obras.some(o => o.id === fc.obra);
    const all = A.todayFichajes();
    const tf = all.filter(inScope);
    const noIn = tf.filter(fc => !fc.in);
    const outFence = tf.filter(fc => fc.in && fc.status === 'revision');
    const scope = ctx.obras.length ? ` de ${ctx.obras.map(o => esc(o.short)).join(' y ')}` : '';
    const row = fc => { const e = A.empById(fc.emp); const o = A.obraById(fc.obra); return `<strong>${esc(e.short)}</strong> <span class="ai-muted">(${esc(e.role.toLowerCase())}${o ? ` · ${esc(o.short)}` : ''})</span> — ${fc.status === 'ausencia' ? `ausencia registrada: ${esc(fc.note.replace(/\.$/, '').toLowerCase())}` : '<span class="ai-warn">sin fichaje ni ausencia comunicada</span>'}`; };
    if (A.PHASE === 'antes') {
      return [
        P(`Todavía no ha empezado la jornada (empieza a las ${DC.start}), así que aún no ha fichado nadie${scope}.`),
        noIn.length ? P(`Ya hay ${plural(noIn.length, 'ausencia registrada', 'ausencias registradas')} para hoy:`) : null,
        noIn.length ? L(noIn.map(row)) : null,
        ACT([{ label: 'Abrir fichajes', href: '#/fichajes' }])
      ].filter(Boolean);
    }
    // durante la jornada, quien todavía no tiene ningún fichaje
    const waiting = A.PHASE === 'jornada' ? A.EMPLEADOS.filter(e => !all.some(fc => fc.emp === e.id) && (!ctx.obras.length || ctx.obras.some(o => e.obras.includes(o.id)))) : [];
    const lead = A.PHASE === 'libre' ? `${offTxt()}. En la última jornada (${DC.refName})` : 'Hoy';
    const hay = A.PHASE === 'libre' ? 'hubo' : 'hay';
    if (!noIn.length && !outFence.length && !waiting.length) return [P(`Todo el equipo${scope} ha fichado correctamente ${DC.ref}.`), ACT([{ label: 'Ver fichajes', href: '#/fichajes' }])];
    const blocks = [
      P(noIn.length ? `${lead} ${hay} <strong>${plural(noIn.length, 'persona', 'personas')}</strong> sin fichaje de entrada:` : `${lead}, todas las personas con jornada han fichado la entrada.`),
      noIn.length ? L(noIn.map(row)) : null
    ];
    if (outFence.length) blocks.push(P(`Además, ${outFence.map(fc => `<strong>${esc(A.empById(fc.emp).short)}</strong> fichó a las ${f.time(fc.in)} ${fc.geo === 'fuera' ? 'fuera de la geocerca' : 'con una anomalía'} de ${esc((A.obraById(fc.obra) || {}).short || 'la obra')}`).join(' y ')}: queda pendiente de revisión.`));
    if (waiting.length) blocks.push(P(`Todavía no ${waiting.length === 1 ? 'ha' : 'han'} fichado la entrada ${plural(waiting.length, 'persona', 'personas')} (son las ${f.time(new Date())}; la entrada habitual es entre las 7:30 y las 8:30): ${waiting.map(e => esc(e.short)).join(', ')}.`));
    const unjust = noIn.filter(fc => fc.status !== 'ausencia').length;
    if (unjust) blocks.push(P(`Te recomiendo confirmar con el encargado ${unjust === 1 ? 'la ausencia sin comunicar' : 'las ausencias sin comunicar'}${A.PHASE === 'jornada' ? ' antes del cierre de la jornada' : ' y dejarla registrada'}.`));
    blocks.push(ACT([{ label: A.PHASE === 'libre' ? 'Abrir la última jornada' : 'Abrir fichajes de hoy', href: '#/fichajes' }, { label: 'Pendientes de revisión', href: '#/fichajes?estado=revision' }]));
    return blocks.filter(Boolean);
  }

  function ansReview() {
    const r = A.reviewFichajes();
    if (!r.length) return [P('No hay fichajes pendientes de revisión.'), ACT([{ label: 'Ver fichajes', href: '#/fichajes' }])];
    return [
      P(`Hay <strong>${plural(r.length, 'fichaje', 'fichajes')}</strong> pendientes de revisar:`),
      T(['Persona', 'Día', 'Obra', 'Motivo'], r.map(fc => [esc(A.empById(fc.emp).short), f.dayRel(fc.date), esc((A.obraById(fc.obra) || { short: 'Oficina' }).short), esc(fc.note || (fc.status === 'pendiente' ? 'Sin fichaje de salida' : 'Revisión necesaria'))]), ['l', 'l', 'l', 'l']),
      ACT([{ label: 'Resolver en Fichajes', href: '#/fichajes?estado=revision' }])
    ];
  }

  function ansPresence(ctx) {
    const t = A.totals();
    const recs = A.todayFichajes();
    const live = A.PHASE === 'jornada';
    const count = list => list.filter(fc => fc.in && (!live || !fc.out)).length;
    const byObra = A.OBRAS.map(o => ({ o, n: count(recs.filter(fc => fc.obra === o.id)) })).filter(x => !ctx.obras.length || ctx.obras.includes(x.o));
    const office = count(recs.filter(fc => fc.obra === 'oficina'));
    const extra = [t.absent.length ? plural(t.absent.length, 'ausencia registrada', 'ausencias registradas') : '', t.missing.length ? `${plural(t.missing.length, 'persona', 'personas')} sin fichar` : ''].filter(Boolean).join(' y ');
    let lead;
    if (A.PHASE === 'antes') lead = `Todavía no ha empezado la jornada (empieza a las ${DC.start}): aún no hay nadie en obra.${extra ? ` Hay ${extra}.` : ''}`;
    else if (live) lead = `Ahora mismo (${f.time(new Date())}) hay <strong>${t.present.length} de ${t.employees} personas</strong> en obra; hoy han fichado ${t.worked.length}.${extra ? ` Hay ${extra}.` : ''}`;
    else if (A.PHASE === 'cerrada') lead = `La jornada de hoy ya ha terminado: han fichado <strong>${t.worked.length} de ${t.employees} personas</strong>.${extra ? ` Hubo ${extra}.` : ''}`;
    else lead = `${offTxt()}. El ${DC.refName} ficharon <strong>${t.worked.length} de ${t.employees} personas</strong>.${extra ? ` Hubo ${extra}.` : ''}`;
    return [
      P(lead),
      T(['Centro de trabajo', live ? 'En obra ahora' : 'Personas', 'Subcontrata'], byObra.map(({ o, n }) => [obraLink(o), String(n), String(o.subcontract)]).concat(ctx.obras.length ? [] : [['Oficina central', String(office), '—']]), ['l', 'r', 'r']),
      NOTE('La subcontrata se muestra como dotación prevista; sus fichajes no forman parte de esta demo.'),
      ACT([{ label: 'Abrir fichajes', href: '#/fichajes' }, { label: 'Ver equipo', href: '#/equipo' }])
    ];
  }

  function ansIncByJefe() {
    const jefes = A.EMPLEADOS.filter(e => e.cat === 'jefe').map(e => {
      const obras = A.OBRAS.filter(o => o.jefe === e.id);
      const open = A.incidencias.filter(i => obras.some(o => o.id === i.obra) && A.OPEN(i.status));
      const oldest = open.reduce((m, i) => Math.max(m, A.daysOpen(i)), 0);
      return { e, obras, open, high: open.filter(i => i.priority === 'alta'), oldest };
    }).sort((a, b) => b.open.length - a.open.length || b.high.length - a.high.length);
    const top = jefes[0];
    const split = top.obras.map(o => `${esc(o.short)} (${top.open.filter(i => i.obra === o.id).length})`).join(' y ');
    return [
      P(`<strong>${esc(top.e.short)}</strong> acumula <strong>${plural(top.open.length, 'incidencia abierta', 'incidencias abiertas')}</strong> entre ${split}${top.high.length ? `, ${top.high.length} de prioridad alta` : ''}.`),
      T(['Jefe de obra', 'Obras', 'Abiertas', 'Alta', 'Más antigua'], jefes.map(j => [esc(j.e.short), j.obras.map(o => esc(o.short)).join(', '), String(j.open.length), String(j.high.length), j.oldest ? `${j.oldest} días` : '—']), ['l', 'l', 'r', 'r', 'r']),
      P(top.open.length >= 4 ? 'Conviene revisar su carga: lleva dos obras con incidencias de cliente y económicas que necesitan decisión de dirección.' : 'La carga de incidencias está repartida de forma equilibrada.'),
      ACT([{ label: 'Ver incidencias abiertas', href: '#/incidencias?estado=abiertas' }])
    ];
  }

  function ansIncOldest(ctx) {
    const open = A.incidencias.filter(i => A.OPEN(i.status) && (!ctx.obras.length || ctx.obras.some(o => o.id === i.obra))).sort((a, b) => A.daysOpen(b) - A.daysOpen(a));
    if (!open.length) return [P('No hay incidencias abiertas con esos criterios.')];
    const top = open.slice(0, 5);
    return [
      P(`Estas son las incidencias que más tiempo llevan sin resolverse:`),
      T(['Incidencia', 'Obra', 'Prioridad', 'Abierta'], top.map(i => [`${incLink(i)} ${esc(i.title)}`, esc(A.obraById(i.obra).short), `<span class="ai-prio ai-prio--${i.priority}">${PRIO[i.priority]}</span>`, `${A.daysOpen(i)} días`]), ['l', 'l', 'l', 'r']),
      P(`La más antigua, ${incLink(top[0])}, está asignada a <strong>${esc(empName(top[0].owner))}</strong> y sigue en estado «${INC_STATUS[top[0].status]}».`),
      ACT([{ label: 'Abrir incidencias', href: '#/incidencias?estado=abiertas&orden=antiguedad' }])
    ];
  }

  function ansIncidents(ctx, q) {
    let list = A.incidencias.filter(i => A.OPEN(i.status));
    if (ctx.obras.length) list = list.filter(i => ctx.obras.some(o => o.id === i.obra));
    const prio = /\b(alta|urgente|critica|graves?)\b/.test(q) ? 'alta' : /\bmedia\b/.test(q) ? 'media' : /\bbaja\b/.test(q) ? 'baja' : null;
    if (prio) list = list.filter(i => i.priority === prio);
    if (/seguridad/.test(q)) list = list.filter(i => i.category === 'Seguridad');
    const scope = ctx.obras.length ? ` en ${ctx.obras.map(o => esc(o.short)).join(' y ')}` : '';
    if (!list.length) return [P(`No hay incidencias abiertas${prio ? ` de prioridad ${prio}` : ''}${scope}.`), ACT([{ label: 'Ver incidencias', href: '#/incidencias' }])];
    list.sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.priority] - { alta: 0, media: 1, baja: 2 }[b.priority]) || A.daysOpen(b) - A.daysOpen(a));
    const href = `#/incidencias?estado=abiertas${ctx.obras.length === 1 ? `&obra=${ctx.obras[0].id}` : ''}${prio ? `&prioridad=${prio}` : ''}`;
    return [
      P(`Hay <strong>${plural(list.length, 'incidencia abierta', 'incidencias abiertas')}</strong>${prio ? ` de prioridad ${prio}` : ''}${scope}:`),
      L(list.slice(0, 6).map(i => `<span class="ai-prio ai-prio--${i.priority}">${PRIO[i.priority]}</span> ${incLink(i)} ${esc(i.title)} <span class="ai-muted">· ${esc(A.obraById(i.obra).short)} · ${A.daysOpen(i)} días</span>`)),
      list.length > 6 ? P(`Y ${list.length - 6} más.`) : null,
      ACT([{ label: 'Abrir el listado filtrado', href }])
    ].filter(Boolean);
  }

  function ansBudget(ctx, q) {
    const t = A.totals();
    if (ctx.obras.length === 1) {
      const o = ctx.obras[0], m = A.metrics(o);
      const ch = A.chaptersOf(o, m).filter(c => c.ev > 0).sort((a, b) => (b.cost - b.ev) - (a.cost - a.ev));
      const worst = ch[0];
      return [
        P(`<strong>${esc(o.name)}</strong>: coste ejecutado de <strong>${f.eurAuto(m.ac)}</strong> para un avance del ${f.pct(o.progress)} (valor de la obra ejecutada: ${f.eurAuto(m.ev)}).`),
        K([{ label: 'Presupuesto', value: f.eurAuto(o.budget) }, { label: 'Previsión al cierre', value: f.eurAuto(m.eac) }, { label: 'Desviación', value: f.signedPct(m.devPct), tone: m.devPct > 1 ? 'warn' : 'ok' }]),
        worst && worst.cost - worst.ev > 1000 ? P(`La mayor desviación está en el capítulo <strong>${esc(worst.name)}</strong> (${f.signedEur(worst.cost - worst.ev)} sobre lo presupuestado para su avance).`) : P('Ningún capítulo presenta una desviación relevante.'),
        ACT([{ label: 'Ver el detalle económico', href: `#/obras/${o.id}/economico` }])
      ];
    }
    const months = A.monthlyCost(6);
    const cur = months[months.length - 1];
    const prev = months[months.length - 2];
    const monthDev = cur.planned ? (cur.actual - cur.planned) / cur.planned * 100 : 0;
    const top = [...t.ms].sort((a, b) => b.m.dev - a.m.dev);
    const over = top.filter(x => x.m.dev > 0);
    const wantsMonth = /\b(mes|mensual|este mes|octubre|noviembre|septiembre)\b/.test(q) || true;
    const blocks = [];
    if (wantsMonth) blocks.push(P(`En lo que va de <strong>${f.monthLong(A.REF)}</strong> se han ejecutado <strong>${f.eurAuto(cur.actual)}</strong> de coste frente a ${f.eurAuto(cur.planned)} previstos para estas fechas (${f.signedPct(monthDev)}). En ${f.monthLong(prev.month)} el cierre fue de ${f.eurAuto(prev.actual)} (${f.signedPct((prev.actual - prev.planned) / prev.planned * 100)} sobre lo planificado).`));
    blocks.push(K([
      { label: 'Presupuesto total', value: f.eurM(t.budget) },
      { label: 'Coste ejecutado', value: f.eurM(t.ac) },
      { label: 'Previsión al cierre', value: f.eurM(t.eac) },
      { label: 'Desviación', value: f.signedPct(t.devPct), tone: t.devPct > 0 ? 'warn' : 'ok' }
    ]));
    const list = over.slice(0, 3).map(x => `<strong>${esc(x.o.short)}</strong> (${f.signedEur(x.m.dev)})`);
    const joined = list.length > 1 ? list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1] : list[0];
    if (over.length) blocks.push(P(`${joined} ${over.length > 1 ? 'explican' : 'explica'} la desviación prevista de ${f.signedEur(t.dev)}.${top[top.length - 1].m.dev < 0 ? ` En sentido contrario, ${esc(top[top.length - 1].o.short)} va ${f.eurAuto(-top[top.length - 1].m.dev)} por debajo de su presupuesto.` : ''}`));
    const inc = A.incidencias.find(i => i.category === 'Económica' && A.OPEN(i.status));
    if (inc) blocks.push(P(`Pendiente de decisión: ${incLink(inc)} ${esc(inc.title.toLowerCase())}.`));
    blocks.push(ACT([{ label: 'Abrir control económico', href: '#/economico' }]));
    return blocks;
  }

  function ansPartes(ctx) {
    let pend = A.partes.filter(p => p.status === 'pendiente');
    const dev = A.partes.filter(p => p.status === 'devuelto');
    if (ctx.obras.length) pend = pend.filter(p => ctx.obras.some(o => o.id === p.obra));
    if (!pend.length) return [P('No hay partes de trabajo pendientes de validar.'), ACT([{ label: 'Ver partes', href: '#/partes' }])];
    const oldest = [...pend].sort((a, b) => a.date - b.date)[0];
    return [
      P(`Hay <strong>${plural(pend.length, 'parte pendiente', 'partes pendientes')}</strong> de validar${dev.length ? ` y ${plural(dev.length, 'parte devuelto', 'partes devueltos')} esperando corrección` : ''}:`),
      T(['Parte', 'Obra', 'Responsable', 'Horas', 'Enviado'], pend.sort((a, b) => a.date - b.date).map(p => [`<a href="#/partes?id=${p.id}" class="ai-link">${p.id}</a>`, esc(A.obraById(p.obra).short), esc(empName(p.author)), f.num(p.hours, p.hours % 1 ? 1 : 0), f.when(p.date)]), ['l', 'l', 'l', 'r', 'l']),
      P(`El más antiguo es el ${oldest.id} (${esc(A.obraById(oldest.obra).short)}). Puedes validarlos directamente desde la sección de partes.`),
      ACT([{ label: 'Validar partes', href: '#/partes?estado=pendiente' }])
    ];
  }

  function ansDocs() {
    const docs = A.documentos.filter(d => d.status !== 'vigente');
    const order = { caducado: 0, caduca: 1, pendiente: 2 };
    docs.sort((a, b) => order[a.status] - order[b.status] || (a.expiry || a.date) - (b.expiry || b.date));
    const label = d => d.status === 'caducado' ? '<span class="ai-warn">Caducado</span>' : d.status === 'caduca' ? `Caduca el ${f.dayShort(d.expiry)}` : 'Pendiente de validar';
    return [
      P(`Hay <strong>${plural(docs.length, 'documento', 'documentos')}</strong> que requieren atención:`),
      L(docs.map(d => `${label(d)} · ${esc(d.name)} <span class="ai-muted">· ${d.obra ? esc(A.obraById(d.obra).short) : 'Empresa'}</span>`)),
      ACT([{ label: 'Abrir documentación', href: '#/documentacion' }])
    ];
  }

  function ansAttention() {
    const t = A.totals();
    const ranked = [...t.ms].sort((a, b) => b.m.attention - a.m.attention).slice(0, 3);
    const reasons = ({ o, m }) => {
      const r = [];
      if (m.status !== 'plazo') r.push(`${m.statusLabel.toLowerCase()} (${f.num(m.gap, 0)} pts de desfase)`);
      if (m.high.length) r.push(`${plural(m.high.length, 'incidencia de prioridad alta', 'incidencias de prioridad alta')}`);
      if (m.devPct > 2) r.push(`desviación de coste ${f.signedPct(m.devPct)}`);
      if (m.partesPend.length) r.push(`${plural(m.partesPend.length, 'parte por validar', 'partes por validar')}`);
      const next = o.milestones.find(x => x.date >= A.TODAY && A.daysBetween(A.TODAY, x.date) <= 7);
      if (next) r.push(`hito el ${f.dayShort(next.date)}: ${esc(next.label.charAt(0).toLowerCase() + next.label.slice(1))}`);
      return r;
    };
    return [
      P('Estas son las obras que más atención necesitan esta semana, ordenadas por plazo, incidencias, coste y tareas pendientes:'),
      { type: 'ranked', items: ranked.map(({ o, m }, i) => ({ n: i + 1, title: obraLink(o), tag: statusTag(m), text: reasons({ o, m }).join(' · ') || 'Sin alertas relevantes.' })) },
      P(`Para el resto (${t.ms.length - 3} obras) no hay alertas relevantes.`),
      ACT([{ label: `Abrir ${ranked[0].o.short}`, href: `#/obras/${ranked[0].o.id}` }])
    ];
  }

  function ansEmployee(e) {
    const tf = A.todayFichajes().find(fc => fc.emp === e.id);
    const obras = e.obras.map(A.obraById);
    let where;
    if (tf && tf.status === 'ausencia') where = `no trabaja (${esc(tf.note.replace(/\.$/, '').toLowerCase())})`;
    else if (tf && tf.in) where = `fichó la entrada a las ${f.time(tf.in)} en ${tf.obra === 'oficina' ? 'la oficina central' : esc(A.obraById(tf.obra).short)}${tf.out ? ` y la salida a las ${f.time(tf.out)}` : A.isLive(tf.date) ? ' y sigue en la jornada' : ' y no fichó la salida'}`;
    else if (A.PHASE === 'antes') where = `todavía no ha fichado: la jornada empieza a las ${DC.start}`;
    else if (!tf && A.PHASE === 'jornada') where = 'todavía no ha fichado la entrada';
    else where = 'no fichó la entrada';
    const week = A.fichajes.filter(fc => fc.emp === e.id && A.daysBetween(fc.date, A.TODAY) < 7);
    const hours = week.reduce((s, fc) => s + (A.hoursOf(fc) || 0), 0);
    const partes = A.partes.filter(p => p.author === e.id || p.crew.includes(e.id)).sort((a, b) => b.date - a.date);
    return [
      P(`<strong>${esc(e.name)}</strong> · ${esc(e.role)}${obras.length ? ` en ${obras.map(o => esc(o.short)).join(' y ')}` : e.note ? ` · ${esc(e.note)}` : ''}.`),
      L([
        `${A.PHASE === 'libre' ? `El ${DC.refName} (última jornada)` : 'Hoy'} ${where}${tf && tf.status === 'revision' ? ' <span class="ai-warn">(pendiente de revisión)</span>' : ''}.`,
        `Horas registradas en los últimos 7 días: <strong>${f.hours(hours)}</strong>.`,
        partes.length ? `Último parte en el que participa: ${partes[0].id} (${f.dayShort(partes[0].date)}) · ${esc(partes[0].work.charAt(0).toLowerCase() + partes[0].work.slice(1))}` : 'No figura en partes recientes.',
        `Formación: ${e.prl.map(esc).join(' · ')}.`
      ]),
      ACT([{ label: 'Ver ficha en Equipo', href: `#/equipo?id=${e.id}` }])
    ];
  }

  function ansMeeting() {
    const t = A.totals();
    const next = A.workday(1);
    const ranked = [...t.ms].sort((a, b) => b.m.attention - a.m.attention).filter(x => x.m.attention > 1.5).slice(0, 3);
    const decisions = A.incidencias.filter(i => A.OPEN(i.status) && i.decision).sort((a, b) => ({ alta: 0, media: 1, baja: 2 }[a.priority] - { alta: 0, media: 1, baja: 2 }[b.priority]) || A.daysOpen(b) - A.daysOpen(a)).slice(0, 4);
    const milestones = A.OBRAS.flatMap(o => o.milestones.filter(x => x.date >= A.TODAY && A.daysBetween(A.TODAY, x.date) <= 7).map(x => ({ o, x }))).sort((a, b) => a.x.date - b.x.date);
    const teamLine = A.PHASE === 'jornada' ? `${t.present.length} de ${t.employees} personas en obra ahora mismo`
      : A.PHASE === 'antes' ? `La jornada de hoy aún no ha empezado (${plural(t.absent.length, 'ausencia prevista', 'ausencias previstas')})`
      : A.PHASE === 'cerrada' ? `${t.worked.length} de ${t.employees} personas ficharon hoy`
      : `${t.worked.length} de ${t.employees} personas ficharon en la última jornada (${DC.refName})`;
    const docsExp = t.docsAlert.filter(d => d.status === 'caducado' || d.status === 'caduca');
    const critical = ranked.map(({ o, m }) => {
      const parts = [];
      if (m.status !== 'plazo') parts.push(`${f.num(m.gap, 0)} pts de desfase (${weeksTxt(m.daysBehind)})`);
      if (m.devPct > 2) parts.push(`desviación de coste ${f.signedPct(m.devPct)}`);
      const keyInc = m.open.filter(i => i.priority === 'alta' || i.category === 'Económica').sort((a, b) => A.daysOpen(b) - A.daysOpen(a))[0];
      if (keyInc) parts.push(`clave: ${keyInc.id}, ${esc(keyInc.title.charAt(0).toLowerCase() + keyInc.title.slice(1))}`);
      return `<strong>${esc(o.short)}</strong>: ${parts.join('; ')}.`;
    });
    return [
      { type: 'brief', title: `Resumen para la reunión del ${f.weekday(next)} ${next.getDate()} de ${f.monthLong(next)}`, sections: [
        { h: '1. Situación general', items: [`${t.obras} obras activas con un avance medio del ${f.pct(t.avgProgress)}. ${plural(t.attention.length, 'obra requiere', 'obras requieren')} atención.`, `Coste ejecutado: ${f.eurM(t.ac)} de ${f.eurM(t.budget)} presupuestados. Previsión al cierre: ${f.eurM(t.eac)} (${f.signedPct(t.devPct)}).`] },
        { h: '2. Puntos críticos', items: critical },
        { h: '3. Decisiones que requieren dirección', items: decisions.map(i => esc(i.decision)) },
        { h: '4. Equipo y fichajes', items: [`${teamLine}; ${plural(t.review.length, 'fichaje pendiente', 'fichajes pendientes')} de revisión.`, docsExp.length ? `Documentación a renovar: ${docsExp.map(d => esc(d.name)).join('; ')}.` : 'Sin documentación caducada.'] },
        { h: '5. Próximos hitos (7 días)', items: milestones.length ? milestones.slice(0, 5).map(({ o, x }) => `${f.cap(f.weekdayShort(x.date))} · ${esc(o.short)}: ${esc(x.label)}`) : ['Sin hitos en los próximos 7 días.'] },
        { h: '6. Pendiente de oficina', items: [`${plural(t.partesPend.length, 'parte de trabajo', 'partes de trabajo')} por validar y ${plural(A.documentos.filter(d => d.status === 'pendiente').length, 'documento', 'documentos')} por validar.`] }
      ] },
      ACT([{ label: 'Abrir como informe', href: '#/informes?tipo=reunion' }, { label: 'Copiar el resumen', action: 'copy-brief' }])
    ];
  }

  function ansIdeas() {
    const t = A.totals();
    const pend = t.partesPend.length;
    const geo = t.review.filter(fc => fc.geo === 'fuera').length;
    const supply = A.incidencias.filter(i => A.OPEN(i.status) && i.category === 'Suministro').length;
    const docs = t.docsAlert.filter(d => d.status === 'caduca' || d.status === 'caducado').length;
    return [
      P('Con los datos actuales veo estas oportunidades de mejora operativa:'),
      { type: 'ranked', items: [
        { n: 1, title: 'Validación de partes desde el móvil', text: `Hay ${plural(pend, 'parte pendiente', 'partes pendientes')}. Avisar al jefe de obra en cuanto se envía un parte y permitirle validarlo desde la obra reduciría la espera y el trabajo de oficina.` },
        { n: 2, title: 'Alertas de suministro', text: `${supply ? `${plural(supply, 'incidencia de suministro', 'incidencias de suministro')} está afectando al plazo.` : 'Los suministros afectan al plazo.'} Cruzar las fechas de entrega de los proveedores con la planificación permitiría anticipar retrasos antes de que lleguen a la obra.` },
        { n: 3, title: 'Vencimientos de documentación', text: `${plural(docs, 'documento caduca o ha caducado', 'documentos caducan o han caducado')}. Un aviso automático 30 días antes evitaría paradas por documentación de PRL o de subcontratas.` },
        { n: 4, title: 'Fichajes con geolocalización', text: `${geo ? `${plural(geo, 'fichaje fuera de la geocerca', 'fichajes fuera de la geocerca')} hoy.` : 'Sin anomalías hoy.'} Revisar los perímetros de cada obra y avisar al trabajador en el momento reduce las correcciones manuales.` }
      ] },
      NOTE('Son ideas para validar con vuestro equipo; su prioridad depende de cómo trabajáis hoy.')
    ];
  }

  function ansHelp() {
    return [
      P(`Puedo responder preguntas sobre las obras, el equipo, los fichajes, los partes, las incidencias, los costes y la documentación de esta demo. Por ejemplo:`),
      L(['«¿Qué obras están teniendo retrasos?»', '«¿Quién no ha fichado hoy?»', '«¿Cómo va Les Terrasses?»', '«Incidencias de prioridad alta en Atalaya»', '«¿Cómo vamos de presupuesto este mes?»', '«Prepárame un resumen para la reunión de mañana»']),
      NOTE('Versión de demostración: las respuestas se generan en el navegador a partir de los datos ficticios de la plataforma.')
    ];
  }

  function ansFallback(q) {
    return [
      P(pick(['No he encontrado datos en la plataforma para responder a eso.', 'Esa consulta queda fuera de lo que puedo responder en esta demo.', 'No tengo información sobre eso en los datos de la demo.'], hash(q)) + ' Prueba con alguna de estas preguntas:'),
      { type: 'chips', items: ['¿Qué obras necesitan más atención esta semana?', '¿Qué jefe de obra tiene más incidencias pendientes?', '¿Qué partes están pendientes de validar?'] }
    ];
  }

  /* ===========================================================================
     Interpretación
     ========================================================================= */
  const THINKING = {
    delays: 'Comparando el avance real con la planificación de cada obra…',
    absent: 'Revisando los fichajes de hoy…', review: 'Revisando los fichajes pendientes…', presence: 'Revisando los fichajes de hoy…',
    budget: 'Analizando el control económico…', incByJefe: 'Agrupando incidencias por jefe de obra…', incOldest: 'Ordenando las incidencias abiertas…',
    incidents: 'Consultando las incidencias abiertas…', partes: 'Consultando los partes de trabajo…', docs: 'Revisando la documentación…',
    meeting: 'Preparando el resumen con obras, equipo, costes e incidencias…', attention: 'Priorizando obras por plazo, incidencias y coste…',
    summary: 'Reuniendo la situación de todas las obras…', obra: 'Consultando la obra…', employee: 'Consultando la ficha y los fichajes…',
    ideas: 'Buscando oportunidades en los datos…', help: 'Preparando ejemplos…', greet: '…', fallback: 'Buscando en los datos de la plataforma…'
  };

  const memory = { lastIntent: null, lastObras: [] };

  function interpret(question) {
    const q = norm(question);
    const obras = findObras(q);
    const emps = findEmpleados(q).filter(e => !(obras.length && /\b(villas?|hotel|nave)\b/.test(norm(e.first))));
    let intent = null;
    for (const [name, test] of INTENTS) { if (test(q)) { intent = name; break; } }
    // seguimiento: «¿y en Villas?» reutiliza la intención anterior con otra obra
    const followUp = /^(y|e|que tal|y en|y de|y la|y el|y las|y los)\b/.test(q) && q.split(' ').length <= 6;
    if ((!intent || intent === 'summary') && followUp && memory.lastIntent && obras.length) intent = memory.lastIntent;
    if (!intent && obras.length) intent = 'obra';
    if ((!intent || intent === 'summary' || intent === 'presence') && emps.length === 1 && !obras.length) intent = 'employee';
    if (intent === 'summary' && obras.length === 1) intent = 'obra';
    if (!intent) intent = 'fallback';
    return { q, intent, obras, emps };
  }

  function answer(question) {
    const { q, intent, obras, emps } = interpret(question);
    const ctx = { obras };
    let blocks;
    switch (intent) {
      case 'meeting': blocks = ansMeeting(); break;
      case 'ideas': blocks = ansIdeas(); break;
      case 'incByJefe': blocks = ansIncByJefe(); break;
      case 'incOldest': blocks = ansIncOldest(ctx); break;
      case 'absent': blocks = ansAbsent(ctx); break;
      case 'review': blocks = ansReview(); break;
      case 'delays': blocks = ansDelays(ctx); break;
      case 'attention': blocks = ansAttention(); break;
      case 'budget': blocks = ansBudget(ctx, q); break;
      case 'partes': blocks = ansPartes(ctx); break;
      case 'docs': blocks = ansDocs(); break;
      case 'incidents': blocks = ansIncidents(ctx, q); break;
      case 'presence': blocks = ansPresence(ctx); break;
      case 'obra': blocks = ansObra(obras[0]); break;
      case 'employee': blocks = ansEmployee(emps[0]); break;
      case 'summary': blocks = ansSummary(ctx); break;
      case 'help': blocks = ansHelp(); break;
      case 'greet': blocks = [P(`Hola, ${esc(A.USER.name)}. ¿Qué quieres revisar? Puedo darte la situación de las obras, el equipo de hoy, las incidencias o los costes.`)]; break;
      default: blocks = ansFallback(q);
    }
    if (intent !== 'fallback' && intent !== 'help' && intent !== 'greet') { memory.lastIntent = intent === 'obra' ? 'summary' : intent; memory.lastObras = obras; }
    return { intent, thinking: THINKING[intent] || THINKING.fallback, blocks: blocks.filter(Boolean) };
  }

  /** Texto plano de una respuesta (para copiar o anunciar a lectores de pantalla) */
  function toText(blocks) {
    const strip = h => String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return blocks.map(b => {
      if (b.type === 'p' || b.type === 'note') return strip(b.html);
      if (b.type === 'list') return b.items.map(i => '• ' + strip(i)).join('\n');
      if (b.type === 'table') return [b.head.join(' | ')].concat(b.rows.map(r => r.map(strip).join(' | '))).join('\n');
      if (b.type === 'kpis') return b.items.map(k => `${k.label}: ${strip(k.value)}`).join(' · ');
      if (b.type === 'ranked') return b.items.map(i => `${i.n}. ${strip(i.title)} — ${strip(i.text)}`).join('\n');
      if (b.type === 'brief') return [b.title].concat(b.sections.map(s => s.h + '\n' + s.items.map(i => '• ' + strip(i)).join('\n'))).join('\n\n');
      return '';
    }).filter(Boolean).join('\n\n');
  }

  window.Assistant = {
    answer, toText, interpret,
    suggestions: [
      { label: 'Obras con retraso', q: '¿Qué obras están teniendo retrasos?' },
      { label: 'Quién no ha fichado hoy', q: '¿Qué empleados no han fichado hoy?' },
      { label: 'Resumen de todas las obras', q: 'Resume la situación de todas las obras.' },
      { label: 'Presupuesto del mes', q: '¿Cómo vamos de presupuesto este mes?' },
      { label: 'Incidencias más antiguas', q: '¿Qué incidencias llevan más tiempo sin resolverse?' },
      { label: 'Resumen para la reunión', q: 'Prepárame un resumen para la reunión de mañana.' }
    ],
    more: [
      '¿Qué obras necesitan más atención esta semana?',
      '¿Qué jefe de obra tiene más incidencias pendientes?',
      '¿Qué partes están pendientes de validar?',
      '¿Hay documentación caducada?',
      '¿Cómo va Les Terrasses?',
      'Ideas para mejorar la operativa'
    ]
  };
})();
