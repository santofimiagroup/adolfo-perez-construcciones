/* =============================================================================
   Adolfo Pérez Construcciones · Plataforma de operaciones (DEMO)
   -----------------------------------------------------------------------------
   CONJUNTO DE DATOS FICTICIO. Ninguna obra, persona, cifra ni ubicación
   corresponde a datos reales de la empresa. La fecha y la hora son las
   reales del momento de la visita: los datos se calculan respecto a ese
   momento (días laborables, festivos y fase de la jornada), para que la demo
   sea coherente a cualquier hora.

   Este archivo es la única fuente de datos: los indicadores, las vistas y el
   asistente se calculan a partir de aquí. Los cambios hechos en la demo se
   guardan como un registro de operaciones (localStorage) que se reaplica
   sobre estos datos al cargar.
   ============================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
     1. Fechas de referencia
     ------------------------------------------------------------------------- */
  const DAY = 86400000;
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const at = (d, hh, mm) => { const r = new Date(d); r.setHours(hh, mm, 0, 0); return r; };
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  /* Festivos laborables de la Comunitat Valenciana (nacionales y autonómicos).
     2026: Decreto 100/2025 del Consell (DOGV n.º 10145, 7-7-2025).
     2027: calendario aprobado por el Consell en marzo de 2026.
     Las dos fiestas locales dependen de cada municipio y no se incluyen. */
  const HOLIDAYS = {
    '2026-01-01': 'Año Nuevo', '2026-01-06': 'Epifanía del Señor', '2026-03-19': 'San José', '2026-04-03': 'Viernes Santo',
    '2026-04-06': 'Lunes de Pascua', '2026-05-01': 'Fiesta del Trabajo', '2026-06-24': 'San Juan', '2026-08-15': 'Asunción de la Virgen',
    '2026-10-09': 'Día de la Comunitat Valenciana', '2026-10-12': 'Fiesta Nacional de España', '2026-12-08': 'Inmaculada Concepción', '2026-12-25': 'Navidad',
    '2027-01-01': 'Año Nuevo', '2027-01-06': 'Epifanía del Señor', '2027-03-19': 'San José', '2027-03-26': 'Viernes Santo',
    '2027-03-29': 'Lunes de Pascua', '2027-05-01': 'Fiesta del Trabajo', '2027-10-09': 'Día de la Comunitat Valenciana', '2027-10-12': 'Fiesta Nacional de España',
    '2027-11-01': 'Todos los Santos', '2027-12-06': 'Día de la Constitución', '2027-12-08': 'Inmaculada Concepción', '2027-12-25': 'Navidad'
  };
  const holidayName = d => HOLIDAYS[iso(d)] || null;
  const isWorkday = d => !isWeekend(d) && !HOLIDAYS[iso(d)];
  const prevWorkday = d => { let r = addDays(d, -1); while (!isWorkday(r)) r = addDays(r, -1); return r; };
  /** Fecha n días naturales antes de la referencia, llevada al último día laborable si cae en fin de semana o festivo */
  const workBack = n => { let r = addDays(REF, -n); while (!isWorkday(r)) r = addDays(r, -1); return r; };

  /* Fecha y hora reales de la visita.
     · Jornada: de 7:00 a 17:30 aprox. (viernes, hasta las 14:30). Se da por cerrada a las 18:15 (viernes, 15:15).
     · REF es el día operativo: hoy si es laborable; si no (fin de semana o festivo), la última jornada laborable.
     · PHASE: 'antes' (laborable, antes de las 7:00) · 'jornada' · 'cerrada' (tras el cierre) · 'libre' (hoy no se trabaja). */
  const NOW = new Date();
  const TODAY = new Date(NOW); TODAY.setHours(0, 0, 0, 0);
  const IS_WORKDAY = isWorkday(TODAY);
  const REF = IS_WORKDAY ? new Date(TODAY) : prevWorkday(TODAY);
  const START_MIN = 7 * 60;
  const closeMin = d => d.getDay() === 5 ? 15 * 60 + 15 : 18 * 60 + 15;
  const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
  const PHASE = !IS_WORKDAY ? 'libre' : nowMin < START_MIN ? 'antes' : nowMin < closeMin(TODAY) ? 'jornada' : 'cerrada';
  /** Momento hasta el que existen datos del día operativo (lo posterior aún no ha ocurrido) */
  const CUT = PHASE === 'libre' ? at(REF, 23, 59) : NOW;
  const DAY_CLOSED = PHASE === 'cerrada' || PHASE === 'libre';
  /** Un fichaje sin salida solo está «en curso» hoy y durante la jornada */
  const isLive = d => PHASE === 'jornada' && sameDay(d, TODAY);

  /** Hora de un evento sembrado: los viernes la jornada termina a las 14:30, así que lo posterior se adelanta 3 h */
  const atW = (d, hh, mm) => (d.getDay() === 5 && hh * 60 + mm > 14 * 60 + 35 ? at(d, hh - 3, mm) : at(d, hh, mm));

  /** n días laborables respecto al día operativo (negativo = pasado) */
  function workday(n) {
    let d = new Date(REF); const step = n < 0 ? -1 : 1; let left = Math.abs(n);
    while (left > 0) { d = addDays(d, step); if (isWorkday(d)) left--; }
    return d;
  }

  /* Generador pseudoaleatorio determinista (mismos datos en cada visita) */
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* Curva S de planificación (avance previsto en función del tiempo, 0–1) */
  const S = t => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };
  function Sinv(p) { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (S(m) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

  /* ---------------------------------------------------------------------------
     2. Empresa y usuaria de la demo
     ------------------------------------------------------------------------- */
  const COMPANY = {
    name: 'Adolfo Pérez Construcciones',
    short: 'Adolfo Pérez',
    // Logotipo facilitado por el cliente (fondo transparente). Si se elimina,
    // la interfaz muestra el nombre en texto.
    logo: 'assets/brand/logo-adolfo-perez.png',
    region: 'Marina Baixa · Alicante',
    credit: 'Solución diseñada por ADVENTUM Strategy'
  };
  const USER = { name: 'Mari', initials: 'M', role: 'Administración' };

  /* ---------------------------------------------------------------------------
     3. Equipo (20 personas ficticias)
     ------------------------------------------------------------------------- */
  const CATEGORIES = {
    jefe: 'Jefatura de obra', encargado: 'Encargados', tecnico: 'Personal técnico',
    oficial: 'Oficiales', operario: 'Operarios'
  };
  const EMPLEADOS = [
    { id: 'E01', name: 'Javier Llorca Ferrer', role: 'Jefe de obra', cat: 'jefe', obras: ['terrasses', 'apartamentos'], since: 2012, prl: ['PRL 60 h · nivel básico', 'Recurso preventivo'] },
    { id: 'E02', name: 'Marta Soler Ivars', role: 'Jefa de obra', cat: 'jefe', obras: ['villas', 'nave'], since: 2016, prl: ['PRL 60 h · nivel básico', 'Coordinación de seguridad'] },
    { id: 'E03', name: 'Rubén Climent Orts', role: 'Jefe de obra', cat: 'jefe', obras: ['atalaya', 'hotel'], since: 2010, prl: ['PRL 60 h · nivel básico', 'Recurso preventivo'] },
    { id: 'E04', name: 'Paco Berenguer Sanz', role: 'Encargado', cat: 'encargado', obras: ['terrasses'], since: 2005, prl: ['PRL 20 h · encargados', 'Operador de grúa torre'] },
    { id: 'E05', name: 'Toni Lloret Guardiola', role: 'Encargado', cat: 'encargado', obras: ['villas', 'nave'], since: 2014, prl: ['PRL 20 h · encargados'] },
    { id: 'E06', name: 'Vicente Such Ferri', role: 'Encargado', cat: 'encargado', obras: ['atalaya'], since: 2009, prl: ['PRL 20 h · encargados', 'Montaje de andamios'] },
    { id: 'E07', name: 'José Ángel Pastor Mira', role: 'Encargado', cat: 'encargado', obras: ['hotel'], since: 2018, prl: ['PRL 20 h · encargados'] },
    { id: 'E08', name: 'Laura Mengual Cortés', role: 'Arquitecta técnica', cat: 'tecnico', obras: [], since: 2019, prl: ['PRL 60 h · nivel básico'], note: 'Oficina técnica · mediciones y certificaciones' },
    { id: 'E09', name: 'Sergio Baldó Ruiz', role: 'Técnico de prevención', cat: 'tecnico', obras: [], since: 2021, prl: ['Técnico superior en PRL'], note: 'Visitas de seguridad en todas las obras' },
    { id: 'E10', name: 'Andrés Cárdenas Ríos', role: 'Oficial 1.ª albañil', cat: 'oficial', obras: ['terrasses'], since: 2017, prl: ['PRL 20 h · albañilería'] },
    { id: 'E11', name: 'Ionuț Popescu', role: 'Oficial 1.ª encofrador', cat: 'oficial', obras: ['terrasses'], since: 2015, prl: ['PRL 20 h · encofrados', 'Trabajos en altura'] },
    { id: 'E12', name: 'Miguel Ripoll Vidal', role: 'Oficial 1.ª electricista', cat: 'oficial', obras: ['apartamentos'], since: 2020, prl: ['PRL 20 h · electricidad'] },
    { id: 'E13', name: 'Youssef El Amrani', role: 'Oficial 1.ª albañil', cat: 'oficial', obras: ['villas'], since: 2016, prl: ['PRL 20 h · albañilería'] },
    { id: 'E14', name: 'David Gomis Sellés', role: 'Oficial 1.ª fontanero', cat: 'oficial', obras: ['hotel'], since: 2019, prl: ['PRL 20 h · fontanería'] },
    { id: 'E15', name: 'Kevin Moll Andreu', role: 'Oficial 2.ª fachadas', cat: 'oficial', obras: ['atalaya'], since: 2022, prl: ['PRL 20 h · fachadas', 'Trabajos en altura'] },
    { id: 'E16', name: 'Pere Fuster Bou', role: 'Oficial montador', cat: 'oficial', obras: ['nave'], since: 2013, prl: ['PRL 20 h · estructura metálica', 'Plataformas elevadoras'] },
    { id: 'E17', name: 'Iván Seguí Navarro', role: 'Peón', cat: 'operario', obras: ['terrasses'], since: 2023, prl: ['PRL 8 h · nivel inicial'] },
    { id: 'E18', name: 'Bogdan Ionescu', role: 'Peón especialista', cat: 'operario', obras: ['atalaya'], since: 2021, prl: ['PRL 8 h · nivel inicial', 'Trabajos en altura (caducada)'] },
    { id: 'E19', name: 'Samuel Tur Esteve', role: 'Peón', cat: 'operario', obras: ['villas'], since: 2024, prl: ['PRL 8 h · nivel inicial'] },
    { id: 'E20', name: 'Rafael Zaragoza Lledó', role: 'Peón especialista', cat: 'operario', obras: ['hotel'], since: 2020, prl: ['PRL 8 h · nivel inicial', 'Carretilla elevadora'] }
  ];
  EMPLEADOS.forEach(e => {
    const parts = e.name.split(' ');
    const compound = parts[0] === 'José' && parts[1] === 'Ángel';
    e.first = compound ? 'José Ángel' : parts[0];
    const rest = parts.slice(compound ? 2 : 1);
    const surname = ['El', 'De', 'Del', 'La'].includes(rest[0]) ? `${rest[0]} ${rest[1]}` : rest[0];
    e.short = `${e.first} ${surname}`;
    e.initials = (parts[0][0] + surname.split(' ').pop()[0]).toUpperCase();
  });
  const empById = id => EMPLEADOS.find(e => e.id === id);

  /* ---------------------------------------------------------------------------
     4. Obras (6 obras ficticias, ubicaciones ficticias)
     -------------------------------------------------------------------------
     duration: meses totales · t: fracción de plazo transcurrida hoy
     progress: avance físico real (%) · budget: presupuesto de coste (€)
     cost: coste ejecutado a origen (€)
     ------------------------------------------------------------------------- */
  const CHAPTERS = {
    residencial: [['Movimiento de tierras', 4, 0, 8], ['Cimentación', 8, 4, 18], ['Estructura', 22, 12, 50], ['Albañilería y cerramientos', 16, 36, 82], ['Cubiertas', 4, 44, 84], ['Instalaciones', 18, 46, 96], ['Carpintería exterior', 7, 68, 92], ['Acabados interiores', 15, 72, 100], ['Urbanización y zonas comunes', 6, 86, 100]],
    villas: [['Movimiento de tierras', 5, 0, 10], ['Cimentación', 9, 6, 22], ['Estructura', 20, 16, 46], ['Albañilería', 14, 38, 66], ['Cubiertas', 5, 44, 62], ['Instalaciones', 16, 50, 90], ['Carpintería exterior', 8, 60, 82], ['Acabados', 14, 70, 100], ['Piscinas y exteriores', 9, 30, 100]],
    rehabilitacion: [['Andamios y medios auxiliares', 10, 0, 100], ['Demoliciones y saneado', 8, 0, 30], ['Reparación estructural', 14, 10, 96], ['Fachada · aislamiento SATE', 30, 26, 92], ['Cubierta e impermeabilización', 16, 30, 96], ['Carpintería y barandillas', 12, 60, 98], ['Remates y limpieza', 10, 88, 100]],
    nave: [['Movimiento de tierras', 8, 0, 14], ['Cimentación', 12, 6, 28], ['Solera', 10, 40, 60], ['Estructura metálica', 28, 22, 56], ['Cerramiento y cubierta', 22, 48, 80], ['Instalaciones', 14, 60, 96], ['Urbanización', 6, 84, 100]],
    hotel: [['Demoliciones', 5, 0, 10], ['Cimentación y estructura', 20, 4, 40], ['Albañilería', 13, 28, 72], ['Climatización y ventilación', 15, 40, 86], ['Fontanería y saneamiento', 10, 42, 84], ['Electricidad', 11, 46, 90], ['Revestimientos y acabados', 18, 66, 100], ['Exteriores y piscina', 8, 76, 100]],
    reforma: [['Demoliciones', 6, 0, 12], ['Albañilería', 14, 8, 36], ['Instalaciones', 26, 20, 70], ['Carpintería', 14, 54, 86], ['Revestimientos', 22, 50, 92], ['Pintura', 8, 80, 98], ['Equipamiento y limpieza', 10, 86, 100]]
  };
  const CHAPTER_COST_FACTOR = { // desviaciones por capítulo (hacen creíble el reparto del coste)
    terrasses: { 'Estructura': 1.03, 'Albañilería y cerramientos': 1.02 },
    villas: { 'Cimentación': 0.97, 'Estructura': 0.98 },
    atalaya: { 'Reparación estructural': 1.22, 'Fachada · aislamiento SATE': 1.04 },
    nave: {},
    hotel: { 'Climatización y ventilación': 1.24, 'Cimentación y estructura': 1.02 },
    reforma: {}
  };

  const OBRAS = [
    {
      id: 'terrasses', code: 'OB-2407', name: 'Residencial Les Terrasses', short: 'Les Terrasses',
      type: 'Residencial plurifamiliar', scope: '32 viviendas, garaje y zonas comunes', template: 'residencial',
      town: 'Finestrat', place: 'Ladera de Sierra Cortina', lat: 38.5552, lng: -0.1640,
      client: 'Promotora privada', jefe: 'E01', encargado: 'E04', team: ['E01', 'E04', 'E10', 'E11', 'E17'], subcontract: 14,
      duration: 20, t: 0.65, progress: 68, budget: 5840000, cost: 4040000,
      photo: 'terrasses', focus: '50% 38%',
      gallery: [['terrasses', 'Estructura y cerramientos · estado actual'], ['terrasses-2', 'Armado de pilares, bloque B'], ['terrasses-3', 'Encofrados y acopios en planta baja'], ['terrasses-ref', 'Referencia del proyecto terminado']],
      milestones: [[2, 'Hormigonado del forjado de cubierta, bloque A'], [7, 'Inicio de carpintería exterior', 'Pendiente del proveedor (INC-041)'], [16, 'Inicio de instalaciones en el bloque B']]
    },
    {
      id: 'villas', code: 'OB-2502', name: 'Villas Serra Gelada', short: 'Villas Serra Gelada',
      type: 'Viviendas unifamiliares', scope: '6 villas con piscina', template: 'villas',
      town: "l'Alfàs del Pi", place: 'Zona Albir', lat: 38.5800, lng: -0.0815,
      client: 'Cooperativa privada', jefe: 'E02', encargado: 'E05', team: ['E02', 'E05', 'E13', 'E19'], subcontract: 6,
      duration: 15, t: 0.45, progress: 44, budget: 2360000, cost: 1021000,
      photo: 'villas', focus: '50% 55%',
      gallery: [['villas', 'Villas 3 y 4 · cerramientos'], ['villas-ref', 'Referencia de acabado mediterráneo']],
      milestones: [[3, 'Hormigonado de la losa de la villa 5'], [9, 'Impermeabilización de cubiertas, villas 1–3'], [21, 'Inicio de vasos de piscina, villas 5 y 6']]
    },
    {
      id: 'atalaya', code: 'OB-2509', name: 'Edificio Atalaya', short: 'Edificio Atalaya',
      type: 'Rehabilitación', scope: 'Fachada, SATE y cubierta · 11 plantas', template: 'rehabilitacion',
      town: 'Benidorm', place: 'Zona Poniente', lat: 38.5393, lng: -0.1372,
      client: 'Comunidad de propietarios', jefe: 'E03', encargado: 'E06', team: ['E03', 'E06', 'E15', 'E18'], subcontract: 8,
      duration: 9, t: 0.80, progress: 77, budget: 1180000, cost: 968000,
      photo: 'atalaya', focus: '30% 50%',
      gallery: [['atalaya', 'Andamio de fachada y grúas'], ['atalaya-2', 'Reparación de frentes de forjado']],
      milestones: [[4, 'Fin del aislamiento SATE en la fachada este', 'Bloqueado por el acceso a terrazas (INC-044)'], [11, 'Desmontaje del andamio de la fachada sur'], [23, 'Prueba de estanqueidad de la cubierta']]
    },
    {
      id: 'nave', code: 'OB-2511', name: 'Nave logística Sector 4', short: 'Nave logística',
      type: 'Industrial', scope: 'Nave de 4.800 m² con muelles de carga', template: 'nave',
      town: 'La Vila Joiosa', place: 'Área empresarial interior', lat: 38.5238, lng: -0.2470,
      client: 'Operador logístico', jefe: 'E02', encargado: 'E05', team: ['E02', 'E05', 'E16'], subcontract: 9,
      duration: 12, t: 0.16, progress: 9, budget: 3120000, cost: 276500,
      photo: 'nave', focus: '50% 45%',
      gallery: [['nave', 'Cimentación y conducciones'], ['nave-2', 'Ferralla de zapatas, ejes A–C'], ['nave-ref', 'Referencia de estructura metálica']],
      milestones: [[5, 'Hormigonado de zapatas, ejes D–F'], [14, 'Recepción del informe geotécnico de la zona C', 'Condiciona la cimentación de la zona C (INC-047)'], [22, 'Inicio del montaje de la estructura metálica']]
    },
    {
      id: 'hotel', code: 'OB-2503', name: 'Hotel Albera · ampliación', short: 'Hotel Albera',
      type: 'Hotelero', scope: 'Ampliación de 24 habitaciones y spa', template: 'hotel',
      town: 'Altea', place: 'Primera línea', lat: 38.5948, lng: -0.0595,
      client: 'Explotadora hotelera', jefe: 'E03', encargado: 'E07', team: ['E03', 'E07', 'E14', 'E20'], subcontract: 11,
      duration: 14, t: 0.55, progress: 55, budget: 2750000, cost: 1611000,
      photo: 'hotel', focus: '50% 40%',
      gallery: [['hotel', 'Fachada principal y piscina'], ['hotel-2', 'Terraza del spa · zona exterior']],
      milestones: [[3, 'Prueba de presión de fontanería, planta 2'], [8, 'Revisión del proyecto modificado de climatización'], [19, 'Inicio de alicatados en habitaciones']]
    },
    {
      id: 'apartamentos', code: 'OB-2505', name: 'Apartamentos Levante · reforma integral', short: 'Apartamentos Levante',
      type: 'Reforma interior', scope: '8 apartamentos turísticos', template: 'reforma',
      town: 'Benidorm', place: 'Zona Levante', lat: 38.5398, lng: -0.1178,
      client: 'Propiedad privada', jefe: 'E01', encargado: null, team: ['E01', 'E12'], subcontract: 4,
      duration: 6, t: 0.92, progress: 96, budget: 960000, cost: 912300,
      photo: 'apartamentos', focus: '50% 50%',
      gallery: [['apartamentos', 'Salón del apartamento 4B terminado'], ['apartamentos-2', 'Zona de día · apartamento 3B'], ['apartamentos-antes', 'Estado inicial · demoliciones']],
      milestones: [[2, 'Limpieza final y repasos de pintura'], [6, 'Visita de recepción con la propiedad'], [9, 'Entrega de llaves']]
    }
  ];

  OBRAS.forEach(o => {
    const durDays = Math.round(o.duration * 30.4375);
    o.start = addDays(REF, -Math.round(o.t * durDays));
    o.end = addDays(o.start, durDays);
    o.durDays = durDays;
    o.photoSm = `assets/img/obras/${o.photo}-sm.jpg`;
    o.photoLg = `assets/img/obras/${o.photo}-lg.jpg`;
    o.milestones = o.milestones.map(([days, label, risk]) => ({ date: workday(Math.max(1, Math.round(days * 5 / 7))), label, risk: risk || null }));
    o.baseProgress = o.progress;
  });
  const obraById = id => OBRAS.find(o => o.id === id);

  /* ---------------------------------------------------------------------------
     5. Fichajes (últimos 10 días laborables)
     ------------------------------------------------------------------------- */
  const TODAY_IN = { // entradas de hoy · obra donde fichan
    E01: [7, 52, 'terrasses'], E02: [8, 5, 'villas'], E03: [7, 58, 'atalaya'], E04: [7, 31, 'terrasses'],
    E05: [7, 35, 'villas'], E06: [7, 29, 'atalaya'], E07: [7, 40, 'hotel'], E08: [8, 12, 'oficina'],
    E09: [8, 20, 'nave'], E10: [7, 33, 'terrasses'], E11: [7, 30, 'terrasses'], E12: [7, 45, 'apartamentos'],
    E13: [7, 38, 'villas'], E14: [7, 42, 'hotel'], E16: [7, 36, 'nave'], E20: [7, 44, 'hotel']
  };
  function defaultObra(e, d, rnd) {
    if (e.id === 'E08') return 'oficina';
    if (e.id === 'E09') return OBRAS[Math.floor(rnd() * OBRAS.length)].id;
    if (e.obras.length > 1) return e.obras[d.getDate() % e.obras.length];
    return e.obras[0];
  }
  const FORGETS_OUT = 'E12';   // en el día operativo, se olvida de fichar la salida
  function buildFichajes() {
    const list = [];
    for (let n = 0; n <= 9; n++) {
      const d = workday(-n); const dateIso = iso(d); const friday = d.getDay() === 5;
      EMPLEADOS.forEach(e => {
        const rnd = seeded(e.id + dateIso);
        const rec = { id: `${e.id}@${dateIso}`, emp: e.id, date: d, dateIso, obra: defaultObra(e, d, rnd), in: null, out: null, status: 'cerrado', note: '', geo: 'ok', origin: 'App de obra', history: [] };
        if (n === 0) {
          // Día operativo: solo existe lo ocurrido hasta este momento (CUT)
          if (e.id === 'E18') { rec.obra = 'atalaya'; rec.status = 'ausencia'; rec.note = 'Vacaciones aprobadas.'; list.push(rec); return; }
          if (e.id === 'E19') { rec.obra = 'villas'; rec.status = 'ausencia'; rec.note = 'Asuntos propios (comunicado el día anterior).'; list.push(rec); return; }
          if (e.id === 'E17') {   // se marca como anomalía a partir de las 9:00, cuando ya debería haber fichado
            if (CUT < at(d, 9, 0)) return;
            rec.obra = 'terrasses'; rec.status = 'revision'; rec.note = 'Sin fichaje de entrada y sin ausencia comunicada.'; list.push(rec); return;
          }
          const plan = e.id === 'E15' ? [8, 47, 'atalaya'] : TODAY_IN[e.id];
          if (!plan) return;
          const inAt = at(d, plan[0], plan[1]);
          if (CUT < inAt) return;   // todavía no ha fichado la entrada
          const outMin = friday ? 14 * 60 + Math.floor(rnd() * 40) : 17 * 60 + Math.floor(rnd() * 45);
          const outAt = at(d, Math.floor(outMin / 60), outMin % 60);
          rec.in = inAt; rec.obra = plan[2]; rec.origin = plan[2] === 'oficina' ? 'Tableta de oficina' : 'App de obra';
          if (e.id === 'E15') { rec.status = 'revision'; rec.geo = 'fuera'; rec.note = 'Entrada registrada a 2,4 km de la obra (fuera de la geocerca).'; if (CUT >= outAt) rec.out = outAt; }
          else if (e.id === FORGETS_OUT) { rec.status = DAY_CLOSED ? 'pendiente' : 'presente'; if (DAY_CLOSED) rec.note = 'Sin fichaje de salida.'; }
          else if (CUT >= outAt) { rec.out = outAt; rec.status = 'cerrado'; }
          else rec.status = 'presente';
          list.push(rec); return;
        }
        if (e.id === 'E18' && n <= 3) { rec.status = 'ausencia'; rec.note = 'Vacaciones aprobadas.'; list.push(rec); return; }
        if (e.id === 'E05' && n === 6) { rec.status = 'ausencia'; rec.note = 'Permiso retribuido.'; list.push(rec); return; }
        const inMin = friday ? 7 * 60 + 15 + Math.floor(rnd() * 25) : 7 * 60 + 22 + Math.floor(rnd() * 38);
        const outMin = friday ? 14 * 60 + Math.floor(rnd() * 40) : 17 * 60 + Math.floor(rnd() * 45);
        rec.in = at(d, Math.floor(inMin / 60), inMin % 60);
        rec.out = at(d, Math.floor(outMin / 60), outMin % 60);
        if (e.id === 'E11' && n === 1) { rec.out = null; rec.status = 'pendiente'; rec.note = 'Sin fichaje de salida.'; }
        if (e.id === 'E14' && n === 2) { rec.out = null; rec.status = 'pendiente'; rec.note = 'Sin fichaje de salida.'; }
        if (rec.obra === 'oficina') rec.origin = 'Tableta de oficina';
        list.push(rec);
      });
    }
    return list;
  }
  /** horas efectivas de una jornada (descuenta 1 h de comida en jornada partida) */
  function hoursOf(rec) {
    if (!rec.in || !rec.out) return null;
    let mins = (rec.out - rec.in) / 60000;
    if (rec.out.getHours() >= 16) mins -= 60;
    return Math.max(0, mins / 60);
  }

  /* ---------------------------------------------------------------------------
     6. Partes de trabajo
     ------------------------------------------------------------------------- */
  function buildPartes() {
    const P = (id, day, hh, mm, obra, author, crew, hours, work, materials, status, extra) => Object.assign({
      id, date: atW(workday(day), hh, mm), obra, author, crew, hours, work, materials, status,
      validatedBy: null, validatedAt: null, returnReason: null, notes: ''
    }, extra || {});
    return [
      P('PT-2301', -5, 17, 12, 'terrasses', 'E04', ['E04', 'E10', 'E11', 'E17'], 32, 'Hormigonado de pilares de planta 4, bloque B.', [['Hormigón HA-25/B/20/IIa', '18', 'm³'], ['Acero B500S', '1.420', 'kg']], 'validado', { validatedBy: 'E01', validatedAt: atW(workday(-5), 18, 30) }),
      P('PT-2302', -5, 16, 40, 'atalaya', 'E06', ['E06', 'E15', 'E18'], 24, 'Montaje de andamio tubular en fachada sur, plantas 1 a 5.', [['Andamio tubular (alquiler)', '420', 'm²']], 'validado', { validatedBy: 'E03', validatedAt: atW(workday(-4), 8, 15) }),
      P('PT-2303', -4, 17, 5, 'nave', 'E05', ['E05', 'E16'], 16, 'Excavación de zapatas en los ejes C a F y retirada de tierras.', [['Retirada de tierras a vertedero', '64', 'm³']], 'validado', { validatedBy: 'E02', validatedAt: atW(workday(-4), 18, 2) }),
      P('PT-2304', -4, 16, 55, 'hotel', 'E07', ['E07', 'E20'], 16, 'Tabiquería de placa de yeso laminado en la zona de spa.', [['Placa de yeso laminado 15 mm', '180', 'm²'], ['Perfilería 48 mm', '1', 'lote']], 'devuelto', { returnReason: 'Falta indicar las horas de la subcontrata de placa de yeso.' }),
      P('PT-2305', -4, 15, 30, 'apartamentos', 'E12', ['E12'], 8, 'Instalación de mecanismos y luminarias en los apartamentos 3B y 4B.', [['Mecanismos serie blanca', '46', 'ud'], ['Downlight LED 12 W', '28', 'ud']], 'validado', { validatedBy: 'E01', validatedAt: atW(workday(-3), 9, 10) }),
      P('PT-2306', -3, 17, 20, 'villas', 'E05', ['E05', 'E13', 'E19'], 24, 'Hormigonado de la losa de cimentación de la villa 5.', [['Hormigón HA-30/B/20/IIa', '36', 'm³'], ['Acero B500S', '2.100', 'kg']], 'validado', { validatedBy: 'E02', validatedAt: atW(workday(-3), 18, 40) }),
      P('PT-2307', -3, 16, 48, 'atalaya', 'E06', ['E06', 'E15'], 16, 'Colocación de placas EPS del sistema SATE en fachada este, plantas 6 a 8.', [['Placa EPS 60 mm', '180', 'm²'], ['Mortero adhesivo', '1.100', 'kg']], 'validado', { validatedBy: 'E03', validatedAt: atW(workday(-2), 8, 5) }),
      P('PT-2308', -2, 17, 30, 'terrasses', 'E04', ['E04', 'E10', 'E11', 'E17'], 34, 'Hormigonado del forjado de cubierta del bloque B.', [['Hormigón HA-25/B/20/IIa', '48', 'm³'], ['Acero B500S', '2.300', 'kg']], 'validado', { validatedBy: 'E01', validatedAt: atW(workday(-2), 18, 55) }),
      P('PT-2309', -2, 16, 35, 'hotel', 'E07', ['E07', 'E14', 'E20'], 24, 'Canalizaciones de climatización en planta 1, zona de habitaciones.', [['Conducto de chapa galvanizada', '86', 'm'], ['Aislamiento térmico', '90', 'm²']], 'validado', { validatedBy: 'E03', validatedAt: atW(workday(-1), 8, 20) }),
      P('PT-2310', -2, 15, 50, 'apartamentos', 'E12', ['E12'], 8, 'Repaso de pintura y limpieza final del apartamento 2A.', [['Pintura plástica mate', '24', 'l']], 'validado', { validatedBy: 'E01', validatedAt: atW(workday(-1), 9, 0) }),
      P('PT-2311', -2, 16, 20, 'nave', 'E16', ['E16'], 8, 'Vertido de hormigón de limpieza en las zapatas de los ejes A a C.', [['Hormigón HL-150', '22', 'm³']], 'validado', { validatedBy: 'E02', validatedAt: atW(workday(-1), 8, 40) }),
      P('PT-2312', -1, 16, 50, 'hotel', 'E07', ['E07', 'E14', 'E20'], 24, 'Distribución de tubería multicapa en planta 2 (habitaciones 201 a 212).', [['Tubería multicapa 16 mm', '420', 'm'], ['Accesorios de presión', '1', 'lote']], 'validado', { validatedBy: 'E03', validatedAt: atW(workday(-1), 18, 10) }),
      P('PT-2313', -1, 17, 5, 'villas', 'E05', ['E05', 'E13', 'E19'], 24, 'Encofrado y armado del muro del vaso de piscina de la villa 4.', [['Acero B500S', '640', 'kg'], ['Panel de encofrado (alquiler)', '38', 'm²']], 'pendiente'),
      P('PT-2314', -1, 17, 12, 'nave', 'E16', ['E16'], 8, 'Colocación de pernos de anclaje y nivelación de placas base en los ejes A a C.', [['Pernos de anclaje M20', '96', 'ud'], ['Mortero sin retracción', '150', 'kg']], 'pendiente', { notes: 'Trabajo coordinado con la subcontrata de estructura metálica.' }),
      P('PT-2315', -1, 17, 24, 'terrasses', 'E04', ['E04', 'E10', 'E11'], 22.5, 'Cerramiento de la fachada norte con bloque de termoarcilla, planta 3.', [['Bloque de termoarcilla 30×19×24', '1.250', 'ud'], ['Mortero M-7,5', '2,4', 'm³']], 'pendiente'),
      P('PT-2316', -1, 17, 38, 'atalaya', 'E06', ['E06', 'E15'], 14, 'Reparación de frentes de forjado y armaduras en los balcones de la planta 9 (fachada este).', [['Mortero de reparación R4', '340', 'kg'], ['Inhibidor de corrosión', '12', 'l']], 'pendiente', { notes: 'Ver incidencia INC-037: la corrosión es mayor de lo previsto.' })
    ];
  }

  /* ---------------------------------------------------------------------------
     7. Incidencias
     ------------------------------------------------------------------------- */
  const INC_CATEGORIES = ['Seguridad', 'Calidad', 'Suministro', 'Imprevisto técnico', 'Cliente y permisos', 'Coordinación de proyecto', 'Económica', 'Logística', 'Documentación'];
  function buildIncidencias() {
    const I = (id, obra, title, cat, prio, status, daysAgo, hh, mm, owner, by, desc, extra) => Object.assign({
      id, obra, title, category: cat, priority: prio, status, openedAt: atW(workBack(daysAgo), hh, mm), owner, openedBy: by,
      description: desc, resolvedAt: null, resolution: '', log: []
    }, extra || {});
    return [
      I('INC-036', 'terrasses', 'Falta de protección en el hueco del ascensor de la planta 2', 'Seguridad', 'alta', 'resuelta', 11, 8, 40, 'E04', 'E09', 'Detectado en la visita de seguridad: falta la barandilla perimetral del hueco del ascensor.', { resolvedAt: atW(workBack(10), 11, 20), resolution: 'Barandilla instalada y revisada por el técnico de prevención.' }),
      I('INC-037', 'atalaya', 'Corrosión de armaduras más extensa de lo previsto en balcones', 'Imprevisto técnico', 'media', 'abierta', 19, 10, 15, 'E03', 'E06', 'Al sanear los frentes de forjado aparecen armaduras con pérdida de sección en 14 balcones (previstos: 6). Requiere valorar la ampliación de la partida de reparación.', { decision: 'Aprobar la ampliación de la partida de reparación estructural de Edificio Atalaya (INC-037).' }),
      I('INC-038', 'apartamentos', 'Desperfecto en la puerta de entrada del apartamento 3B', 'Calidad', 'baja', 'resuelta', 6, 12, 5, 'E01', 'E12', 'Golpe en la hoja de la puerta durante la descarga de material.', { resolvedAt: atW(workday(-1), 16, 42), resolution: 'Hoja sustituida por el carpintero.' }),
      I('INC-039', 'terrasses', 'Fisura en el muro de contención del garaje (eje 4)', 'Calidad', 'media', 'en_curso', 9, 9, 30, 'E08', 'E04', 'Fisura vertical de unos 2 m. Pendiente del informe de la oficina técnica para decidir el sellado o el refuerzo.'),
      I('INC-040', 'villas', 'Camión de áridos sin acceso por corte de calle', 'Logística', 'baja', 'resuelta', 7, 7, 55, 'E05', 'E05', 'Corte de la calle de acceso por obras municipales.', { resolvedAt: atW(workBack(5), 13, 0), resolution: 'Entrega reprogramada por el acceso norte.' }),
      I('INC-041', 'terrasses', 'Retraso del proveedor de carpintería exterior de aluminio', 'Suministro', 'alta', 'abierta', 6, 11, 10, 'E01', 'E01', 'El proveedor retrasa tres semanas la entrega de la carpintería del bloque A. Afecta al inicio de los acabados interiores.', { decision: 'Decidir si se activa un proveedor alternativo de carpintería para Les Terrasses (INC-041).' }),
      I('INC-042', 'atalaya', 'Anclaje de andamio con holgura en la planta 8 (fachada este)', 'Seguridad', 'alta', 'en_curso', 3, 9, 5, 'E09', 'E09', 'Dos anclajes con holgura detectados en la revisión semanal. Zona señalizada y acceso restringido hasta su reparación.'),
      I('INC-043', 'hotel', 'Sobrecoste en climatización por cambio de equipos', 'Económica', 'media', 'abierta', 8, 13, 20, 'E03', 'E07', 'La propiedad solicita equipos de mayor eficiencia. Incremento estimado de 64.000 € pendiente de aprobación.', { decision: 'Aprobar o rechazar el sobrecoste de climatización de Hotel Albera, estimado en 64.000 € (INC-043).' }),
      I('INC-044', 'atalaya', 'La comunidad no autoriza el acceso a tres terrazas privadas', 'Cliente y permisos', 'alta', 'abierta', 14, 12, 0, 'E03', 'E06', 'Sin acceso a las terrazas de las plantas 9, 10 y 11 no se puede terminar el SATE de la fachada este. Pendiente de la junta de propietarios.', { decision: 'Enviar un escrito formal a la comunidad de Edificio Atalaya para desbloquear el acceso a las terrazas (INC-044).' }),
      I('INC-045', 'hotel', 'Interferencia entre conductos de climatización y vigas en la planta 1', 'Coordinación de proyecto', 'media', 'abierta', 4, 10, 40, 'E07', 'E07', 'El trazado del proyecto choca con dos vigas de cuelgue. Se necesita la solución de la dirección facultativa.', { decision: 'Pedir a la dirección facultativa la solución para el cruce de conductos y vigas de Hotel Albera (INC-045).' }),
      I('INC-046', 'villas', 'Agua freática en la excavación de la piscina de la villa 5', 'Imprevisto técnico', 'media', 'en_curso', 2, 8, 50, 'E02', 'E05', 'Aparece agua a 1,8 m de profundidad. Se ha instalado una bomba de achique de forma provisional.'),
      I('INC-047', 'nave', 'Pendiente del informe geotécnico complementario de la zona C', 'Documentación', 'baja', 'abierta', 1, 12, 30, 'E02', 'E02', 'La dirección facultativa solicita un ensayo adicional antes de hormigonar las zapatas de la zona C.')
    ];
  }

  /* ---------------------------------------------------------------------------
     8. Documentación
     ------------------------------------------------------------------------- */
  function buildDocumentos() {
    const Dc = (id, obra, name, type, status, dateDays, expiryDays, extra) => Object.assign({
      id, obra, name, type, status, date: workBack(-dateDays), expiry: expiryDays == null ? null : addDays(REF, expiryDays), validatedBy: null, size: null
    }, extra || {});
    return [
      Dc('DOC-101', 'terrasses', 'Licencia de obra mayor', 'Licencia', 'vigente', -420, null),
      Dc('DOC-102', 'terrasses', 'Plan de seguridad y salud', 'Seguridad y salud', 'vigente', -392, null),
      Dc('DOC-103', 'terrasses', 'Revisión periódica de la grúa torre', 'Maquinaria', 'caduca', -170, 9),
      Dc('DOC-104', 'terrasses', 'Certificación n.º 13 (mes anterior)', 'Certificación', 'pendiente', -2, null),
      Dc('DOC-105', 'villas', 'Licencia de obra mayor', 'Licencia', 'vigente', -230, null),
      Dc('DOC-106', 'villas', 'Estudio geotécnico', 'Proyecto', 'vigente', -260, null),
      Dc('DOC-107', 'atalaya', 'Licencia de obras de rehabilitación', 'Licencia', 'vigente', -235, null),
      Dc('DOC-108', 'atalaya', 'Acta de la junta de propietarios', 'Cliente', 'pendiente', -1, null),
      Dc('DOC-109', 'atalaya', 'Certificado de montaje del andamio', 'Seguridad y salud', 'vigente', -150, 120),
      Dc('DOC-110', 'nave', 'Licencia de obra mayor', 'Licencia', 'vigente', -75, null),
      Dc('DOC-111', 'nave', 'Informe geotécnico complementario · zona C', 'Proyecto', 'pendiente', -1, null),
      Dc('DOC-112', 'hotel', 'Proyecto modificado de climatización', 'Proyecto', 'pendiente', -1, null),
      Dc('DOC-113', 'hotel', 'Plan de seguridad y salud', 'Seguridad y salud', 'vigente', -230, null),
      Dc('DOC-114', 'apartamentos', 'Certificado de la instalación eléctrica', 'Instalaciones', 'pendiente', -3, null),
      Dc('DOC-115', null, 'Formación en trabajos en altura · Bogdan Ionescu', 'Formación PRL', 'caducado', -1107, -12),
      Dc('DOC-116', null, 'Documentación CAE · subcontrata de placa de yeso', 'Coordinación empresarial', 'caduca', -360, 5)
    ];
  }

  /* ---------------------------------------------------------------------------
     9. Actividad reciente (eventos sembrados)
     ------------------------------------------------------------------------- */
  function buildActividad(fichajes) {
    const A = (day, hh, mm, kind, who, title, detail, obra, ref) => ({ at: atW(workday(day), hh, mm), kind, who, title, detail, obra, ref });
    const d0 = workday(0);
    const entered = fichajes.filter(fc => sameDay(fc.date, d0) && fc.in && fc.in <= at(d0, 8, 20) && fc.geo !== 'fuera');
    const centers = new Set(entered.map(fc => fc.obra)).size;
    const list = [
      // día operativo (solo se muestran los eventos ya ocurridos)
      A(0, 16, 10, 'validacion', 'E09', 'Visita de seguridad completada', 'Sin incidencias', 'nave'),
      A(0, 12, 45, 'foto', 'E06', '5 fotografías añadidas', 'Andamio de la fachada sur', 'atalaya'),
      A(0, 11, 20, 'material', null, 'Recepción de material', 'Acero B500S · 2.300 kg', 'villas'),
      A(0, 10, 31, 'avance', 'E01', 'Avance actualizado al 68 %', null, 'terrasses'),
      A(0, 9, 40, 'foto', 'E08', '6 fotografías añadidas', 'Saneado de balcones, planta 9', 'atalaya'),
      A(0, 8, 47, 'alerta', 'E15', 'Fichaje fuera de geocerca', 'Entrada a 2,4 km de la obra', 'atalaya'),
      A(0, 8, 20, 'equipo', null, 'Entrada del equipo', `${entered.length} fichajes correctos en ${centers} centros de trabajo`, null),
      // jornada anterior
      A(-1, 18, 10, 'validacion', 'E03', 'Parte validado · PT-2312', null, 'hotel', 'PT-2312'),
      A(-1, 17, 52, 'documento', 'E08', 'Nuevo documento', 'Proyecto modificado de climatización', 'hotel', 'DOC-112'),
      A(-1, 17, 38, 'parte', 'E06', 'Parte enviado · PT-2316', 'Reparación de frentes de forjado', 'atalaya', 'PT-2316'),
      A(-1, 17, 24, 'parte', 'E04', 'Parte enviado · PT-2315', 'Cerramiento de la fachada norte', 'terrasses', 'PT-2315'),
      A(-1, 17, 12, 'parte', 'E16', 'Parte enviado · PT-2314', 'Pernos de anclaje, ejes A–C', 'nave', 'PT-2314'),
      A(-1, 17, 5, 'parte', 'E05', 'Parte enviado · PT-2313', 'Muro del vaso de piscina, villa 4', 'villas', 'PT-2313'),
      A(-1, 16, 42, 'resuelta', 'E01', 'Incidencia resuelta · INC-038', 'Puerta del apartamento 3B', 'apartamentos', 'INC-038'),
      A(-1, 12, 30, 'incidencia', 'E02', 'Incidencia abierta · INC-047', 'Informe geotécnico complementario', 'nave', 'INC-047'),
      A(-1, 11, 5, 'foto', 'E02', '4 fotografías añadidas', 'Villas 3 y 4 · cerramientos', 'villas'),
      A(-1, 9, 30, 'material', null, 'Recepción de material', '1.250 bloques de termoarcilla', 'terrasses')
    ];
    // cierre automático de cada jornada (resumen de fichajes)
    const closure = d => {
      const recs = fichajes.filter(fc => sameDay(fc.date, d));
      const worked = recs.filter(fc => fc.in).length; const noOut = recs.filter(fc => fc.in && !fc.out).length;
      return { at: at(d, Math.floor(closeMin(d) / 60), closeMin(d) % 60), kind: 'equipo', who: null, title: 'Cierre de jornada', detail: `${worked} jornadas registradas${noOut ? ` · ${noOut} sin fichaje de salida` : ''}`, obra: null };
    };
    list.push(closure(workday(-1)));
    if (DAY_CLOSED) list.push(closure(d0));
    return list.filter(ev => ev.at <= CUT);
  }

  /* ---------------------------------------------------------------------------
     10. Estado mutable + registro de cambios (persistencia local)
     ------------------------------------------------------------------------- */
  const STORE_KEY = 'apc-demo-journal-v1';
  const state = { fichajes: [], partes: [], incidencias: [], documentos: [], actividad: [], journal: [] };

  function seed() {
    OBRAS.forEach(o => { o.progress = o.baseProgress; });
    state.fichajes = buildFichajes();
    state.partes = buildPartes();
    state.incidencias = buildIncidencias();
    state.documentos = buildDocumentos();
    state.actividad = buildActividad(state.fichajes);
  }
  function readJournal() { try { const raw = localStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; } }
  function writeJournal() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state.journal)); return true; } catch (e) { return false; } }

  const revive = v => (v ? new Date(v) : null);
  function nextId(prefix, list) {
    const max = list.reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 0);
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }
  function addEvent(ev) { state.actividad.push(Object.assign({ user: true }, ev)); }

  /** Aplica una operación sobre los datos. Devuelve el objeto afectado o null. */
  function apply(op) {
    const when = revive(op.at) || new Date();
    switch (op.type) {
      case 'incidencia.create': {
        const d = op.data;
        const inc = { id: d.id, obra: d.obra, title: d.title, category: d.category, priority: d.priority, status: 'abierta', openedAt: when, owner: d.owner, openedBy: 'USER', description: d.description || '', resolvedAt: null, resolution: '', log: [], isNew: true };
        state.incidencias.push(inc);
        addEvent({ at: when, kind: 'incidencia', who: 'USER', title: `Incidencia abierta · ${inc.id}`, detail: inc.title, obra: inc.obra, ref: inc.id });
        return inc;
      }
      case 'incidencia.status': {
        const inc = state.incidencias.find(i => i.id === op.id); if (!inc) return null;
        inc.status = op.status;
        if (op.status === 'resuelta') { inc.resolvedAt = when; inc.resolution = op.note || ''; }
        if (op.status !== 'resuelta') { inc.resolvedAt = null; }
        inc.log.push({ at: when, status: op.status, note: op.note || '' });
        const label = op.status === 'resuelta' ? 'Incidencia resuelta' : op.status === 'en_curso' ? 'Incidencia en curso' : 'Incidencia reabierta';
        addEvent({ at: when, kind: op.status === 'resuelta' ? 'resuelta' : 'incidencia', who: 'USER', title: `${label} · ${inc.id}`, detail: inc.title, obra: inc.obra, ref: inc.id });
        return inc;
      }
      case 'parte.create': {
        const d = op.data;
        const p = { id: d.id, date: revive(d.date) || when, obra: d.obra, author: d.author, crew: d.crew, hours: d.hours, work: d.work, materials: d.materials || [], status: 'pendiente', validatedBy: null, validatedAt: null, returnReason: null, notes: d.notes || '', isNew: true, createdAt: when };
        state.partes.push(p);
        addEvent({ at: when, kind: 'parte', who: 'USER', title: `Parte registrado · ${p.id}`, detail: p.work.length > 60 ? p.work.slice(0, 58) + '…' : p.work, obra: p.obra, ref: p.id });
        return p;
      }
      case 'parte.validate': {
        const p = state.partes.find(x => x.id === op.id); if (!p) return null;
        p.status = 'validado'; p.validatedBy = 'USER'; p.validatedAt = when; p.returnReason = null;
        addEvent({ at: when, kind: 'validacion', who: 'USER', title: `Parte validado · ${p.id}`, detail: null, obra: p.obra, ref: p.id });
        return p;
      }
      case 'parte.return': {
        const p = state.partes.find(x => x.id === op.id); if (!p) return null;
        p.status = 'devuelto'; p.returnReason = op.reason; p.validatedBy = null; p.validatedAt = null;
        addEvent({ at: when, kind: 'alerta', who: 'USER', title: `Parte devuelto · ${p.id}`, detail: op.reason, obra: p.obra, ref: p.id });
        return p;
      }
      case 'fichaje.resolve': {
        let f = state.fichajes.find(x => x.id === op.id);
        if (!f && op.action === 'entrada') {   // persona que aún no tenía registro ese día
          const [emp, dateIso] = String(op.id).split('@'); const e = empById(emp);
          const inWindow = Array.from({ length: 10 }, (_, n) => iso(workday(-n))).includes(dateIso);
          if (!e || !dateIso || !inWindow) return null;
          const [y, mo, dd] = dateIso.split('-').map(Number); const date = new Date(y, mo - 1, dd);
          f = { id: op.id, emp, date, dateIso, obra: op.obra || e.obras[0] || 'oficina', in: null, out: null, status: 'revision', note: '', geo: 'ok', origin: 'Corrección de oficina', history: [] };
          state.fichajes.push(f);
        }
        if (!f) return null;
        const prev = f.status;
        if (op.action === 'salida') { f.out = revive(op.out); f.status = 'cerrado'; f.note = `Salida registrada manualmente: ${op.note || 'sin observaciones'}`; f.origin = 'Corrección de oficina'; }
        if (op.action === 'validar') { f.status = f.out ? 'cerrado' : isLive(f.date) ? 'presente' : 'pendiente'; f.geo = f.geo === 'fuera' ? 'validado' : f.geo; f.note = `Validado por oficina: ${op.note || 'sin observaciones'}`; }
        if (op.action === 'entrada') { f.in = revive(op.in); if (op.obra) f.obra = op.obra; f.status = f.out ? 'cerrado' : isLive(f.date) ? 'presente' : 'pendiente'; f.origin = 'Corrección de oficina'; f.note = `Entrada registrada manualmente: ${op.note || 'sin observaciones'}`; }
        if (op.action === 'ausencia') { f.status = 'ausencia'; f.in = null; f.out = null; f.note = op.note || 'Ausencia registrada por oficina.'; }
        f.history.push({ at: when, from: prev, action: op.action });
        const emp = empById(f.emp);
        addEvent({ at: when, kind: 'fichaje', who: 'USER', title: 'Fichaje revisado', detail: `${emp ? emp.short : f.emp} · ${f.status === 'ausencia' ? 'ausencia registrada' : 'corregido por oficina'}`, obra: f.obra === 'oficina' ? null : f.obra, ref: f.id });
        return f;
      }
      case 'obra.progress': {
        const o = obraById(op.id); if (!o) return null;
        const from = o.progress; o.progress = op.progress;
        addEvent({ at: when, kind: 'avance', who: 'USER', title: `Avance actualizado al ${op.progress} %`, detail: op.note ? `«${op.note}» (antes ${from} %)` : `Antes ${from} %`, obra: o.id });
        return o;
      }
      case 'doc.validate': {
        const d = state.documentos.find(x => x.id === op.id); if (!d) return null;
        d.status = 'vigente'; d.validatedBy = 'USER'; d.validatedAt = when;
        addEvent({ at: when, kind: 'validacion', who: 'USER', title: 'Documento validado', detail: d.name, obra: d.obra, ref: d.id });
        return d;
      }
      case 'doc.upload': {
        const d = op.data;
        const doc = { id: d.id, obra: d.obra || null, name: d.name, type: d.type, status: 'pendiente', date: when, expiry: revive(d.expiry), validatedBy: null, size: d.size || null, fileName: d.fileName || null, isNew: true };
        state.documentos.push(doc);
        addEvent({ at: when, kind: 'documento', who: 'USER', title: 'Nuevo documento', detail: doc.name, obra: doc.obra, ref: doc.id });
        return doc;
      }
      default: return null;
    }
  }

  function commit(op) {
    op.at = op.at || new Date().toISOString();
    const result = apply(op);
    if (result) { state.journal.push(op); writeJournal(); }
    return result;
  }
  function load() {
    seed();
    state.journal = readJournal();
    state.journal.forEach(op => { try { apply(op); } catch (e) { /* operación obsoleta: se ignora */ } });
  }
  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* sin almacenamiento */ }
    state.journal = [];
    seed();
  }

  /* ---------------------------------------------------------------------------
     11. Cálculos derivados (indicadores, estado de obras, economía)
     ------------------------------------------------------------------------- */
  const OPEN = s => s !== 'resuelta';
  const STATUS_LABEL = { plazo: 'En plazo', riesgo: 'En riesgo', retrasada: 'Retrasada', terminada: 'Terminada' };

  function chaptersOf(o, m) {
    const tpl = CHAPTERS[o.template];
    const P = o.progress;
    // "tiempo virtual" τ tal que Σ peso·avance(capítulo) = avance de la obra
    const prog = tau => tpl.map(([name, w, a, b]) => ({ name, w, p: Math.min(1, Math.max(0, (tau - a) / (b - a))) }));
    const total = tau => prog(tau).reduce((s, c) => s + c.w * c.p, 0);
    let lo = 0, hi = 100; for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (total(mid) < P) lo = mid; else hi = mid; }
    const ch = prog((lo + hi) / 2);
    const factors = CHAPTER_COST_FACTOR[o.id === 'apartamentos' ? 'reforma' : o.id] || {};
    const raw = ch.map(c => ({ ...c, budget: o.budget * c.w / 100, ev: o.budget * c.w / 100 * c.p, f: factors[c.name] || 1 }));
    const weighted = raw.reduce((s, c) => s + c.ev * c.f, 0) || 1;
    const k = (m ? m.ac : o.cost) / weighted;
    return raw.map(c => ({ name: c.name, weight: c.w, progress: Math.round(c.p * 100), budget: c.budget, ev: c.ev, cost: c.ev * c.f * k, dev: c.ev > 0 ? (c.ev * c.f * k - c.ev) / c.ev : 0 }));
  }

  function metrics(o) {
    const planned = S(o.t) * 100;
    const gap = planned - o.progress;
    const tReal = Sinv(Math.min(0.999, o.progress / 100));
    const daysBehind = Math.max(0, Math.round((o.t - tReal) * o.durDays));
    let status = 'plazo';
    if (o.progress >= 100) status = 'terminada'; else if (gap > 8) status = 'retrasada'; else if (gap > 3) status = 'riesgo';
    const ev = o.budget * o.progress / 100;
    const ac = o.cost;
    const cv = ac - ev;                  // > 0 → gasta más de lo que produce
    const eac = ac + (o.budget - ev);    // previsión de coste a fin de obra
    const dev = eac - o.budget;
    const devPct = dev / o.budget * 100;
    const incs = state.incidencias.filter(i => i.obra === o.id);
    const open = incs.filter(i => OPEN(i.status));
    const high = open.filter(i => i.priority === 'alta');
    const present = presentOf(state.fichajes.filter(f => sameDay(f.date, REF) && f.obra === o.id));
    const partesPend = state.partes.filter(p => p.obra === o.id && p.status === 'pendiente');
    const phase = o.progress < 15 ? 'Inicio de obra' : o.progress >= 90 ? 'Fase final' : null;
    const remainingDays = daysBetween(REF, o.end);
    const attention = (status === 'retrasada' ? 3 : status === 'riesgo' ? 1.6 : 0) + Math.max(0, gap) * 0.12 + high.length * 1.4 + open.length * 0.45 + Math.max(0, devPct) * 0.45 + partesPend.length * 0.2;
    return { planned, gap, daysBehind, status, statusLabel: STATUS_LABEL[status], phase, ev, ac, cv, eac, dev, devPct, cpi: ev / ac, open, high, incs, present, partesPend, remainingDays, attention };
  }

  function todayFichajes() { return state.fichajes.filter(f => sameDay(f.date, REF)); }
  /** Durante la jornada: quien está ahora en obra (entrada sin salida). Fuera de ella: quien trabajó ese día. */
  function presentOf(recs) { return PHASE === 'jornada' ? recs.filter(f => f.in && !f.out) : recs.filter(f => f.in); }
  function reviewFichajes() { return state.fichajes.filter(f => f.status === 'revision' || f.status === 'pendiente'); }

  function totals() {
    const ms = OBRAS.map(o => ({ o, m: metrics(o) }));
    const budget = OBRAS.reduce((s, o) => s + o.budget, 0);
    const ac = ms.reduce((s, x) => s + x.m.ac, 0);
    const ev = ms.reduce((s, x) => s + x.m.ev, 0);
    const eac = ms.reduce((s, x) => s + x.m.eac, 0);
    const tf = todayFichajes();
    const present = presentOf(tf);
    const worked = tf.filter(f => f.in);
    const absent = tf.filter(f => f.status === 'ausencia');
    const missing = tf.filter(f => !f.in && f.status !== 'ausencia');
    const openInc = state.incidencias.filter(i => OPEN(i.status));
    return {
      obras: OBRAS.length,
      attention: ms.filter(x => x.m.status !== 'plazo' || x.m.devPct > 3),
      delayed: ms.filter(x => x.m.status === 'retrasada' || x.m.status === 'riesgo'),
      avgProgress: OBRAS.reduce((s, o) => s + o.progress, 0) / OBRAS.length,
      weightedProgress: ev / budget * 100,
      budget, ac, ev, eac, dev: eac - budget, devPct: (eac - budget) / budget * 100,
      employees: EMPLEADOS.length, present, worked, absent, missing,
      review: reviewFichajes(),
      openInc, highInc: openInc.filter(i => i.priority === 'alta'),
      partesPend: state.partes.filter(p => p.status === 'pendiente'),
      docsAlert: state.documentos.filter(d => d.status !== 'vigente'),
      ms
    };
  }

  /* Coste mensual (planificado y real) a partir de las curvas de cada obra */
  function monthlyCost(months = 6, obraId = null) {
    const list = obraId ? OBRAS.filter(o => o.id === obraId) : OBRAS;
    const out = [];
    for (let k = months - 1; k >= 0; k--) {
      const mStart = new Date(REF.getFullYear(), REF.getMonth() - k, 1);
      const mEnd = k === 0 ? new Date(REF.getTime() + DAY) : new Date(REF.getFullYear(), REF.getMonth() - k + 1, 1);
      let planned = 0, actual = 0;
      list.forEach(o => {
        const tAt = d => Math.min(1, Math.max(0, (d - o.start) / (o.end - o.start)));
        const t0 = tAt(mStart), t1 = tAt(mEnd);
        planned += o.budget * (S(t1) - S(t0));
        const scale = S(o.t) > 0 ? o.cost / S(o.t) : 0; // el coste real sigue la curva hasta hoy
        const c0 = Math.min(t0, o.t), c1 = Math.min(t1, o.t);
        actual += scale * (S(c1) - S(c0));
      });
      out.push({ month: mStart, planned, actual, current: k === 0 });
    }
    return out;
  }

  /* Serie de presencia (últimos días laborables) para los minigráficos */
  function presenceSeries(days = 10) {
    const out = [];
    for (let n = days - 1; n >= 0; n--) {
      const d = workday(-n);
      const recs = state.fichajes.filter(f => sameDay(f.date, d));
      out.push({ date: d, value: recs.filter(f => f.in).length });
    }
    return out;
  }
  /* ---------------------------------------------------------------------------
     Formato (es-ES)
     ------------------------------------------------------------------------- */
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_S = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
  const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const group = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fmt = {
    num(n, d = 0) { if (n == null || isNaN(n)) return '—'; const s = Math.abs(n).toFixed(d); const [i, f] = s.split('.'); const neg = n < 0 && Number(s) !== 0; return (neg ? '−' : '') + group(i) + (f ? ',' + f : ''); },
    eur(n) { return fmt.num(n) + ' €'; },
    eurM(n, d = 2) { return fmt.num(n / 1e6, d) + ' M€'; },
    eurAuto(n) { return Math.abs(n) >= 1e6 ? fmt.eurM(n) : fmt.eur(Math.round(n / 100) * 100); },
    signedEur(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt.eurAuto(Math.abs(n)); },
    pct(n, d = 0) { return fmt.num(n, d) + ' %'; },
    signedPct(n, d = 1) { const r = Number(Math.abs(n).toFixed(d)); return (r === 0 ? '' : n > 0 ? '+' : '−') + fmt.num(Math.abs(n), d) + ' %'; },
    hours(h) { if (h == null) return '—'; const hh = Math.floor(h + 1e-9); const mm = Math.round((h - hh) * 60); return mm ? `${hh} h ${String(mm).padStart(2, '0')} min` : `${hh} h`; },
    time(d) { return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '—'; },
    dayLong(d) { return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; },
    dayMed(d) { return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`; },
    dayShort(d) { return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; },
    weekdayShort(d) { return `${cap(WEEKDAYS[d.getDay()]).slice(0, 3)} ${d.getDate()}`; },
    weekday(d) { return WEEKDAYS[d.getDay()]; },
    monthYear(d) { return `${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`; },
    monthLong(d) { return MONTHS[d.getMonth()]; },
    monthShort(d) { return MONTHS_S[d.getMonth()]; },
    cap,
    /** Etiqueta temporal para la actividad y los registros */
    when(d) {
      const now = new Date();
      const diff = (now - d) / 60000;
      if (diff >= 0 && diff < 1) return 'Ahora mismo';
      if (diff >= 1 && diff < 60) return `Hace ${Math.round(diff)} min`;
      if (sameDay(d, now)) return `Hoy, ${fmt.time(d)}`;
      const y = addDays(now, -1);
      if (sameDay(d, y)) return `Ayer, ${fmt.time(d)}`;
      if (daysBetween(d, now) < 7) return `${cap(WEEKDAYS[d.getDay()])}, ${fmt.time(d)}`;
      return `${fmt.dayShort(d)}, ${fmt.time(d)}`;
    },
    /** Día relativo sin hora (hoy, ayer, jueves 15…) respecto a la fecha real */
    dayRel(d) {
      const now = new Date();
      if (sameDay(d, now)) return 'Hoy';
      if (sameDay(d, addDays(now, -1))) return 'Ayer';
      if (sameDay(d, addDays(now, 1))) return 'Mañana';
      return cap(fmt.weekdayShort(d));
    },
    daysAgo(d) { const n = daysBetween(new Date(d.getFullYear(), d.getMonth(), d.getDate()), TODAY); return n <= 0 ? 'hoy' : n === 1 ? '1 día' : `${n} días`; }
  };
  function daysOpen(inc) { const end = inc.resolvedAt || TODAY; return Math.max(0, daysBetween(new Date(inc.openedAt.getFullYear(), inc.openedAt.getMonth(), inc.openedAt.getDate()), new Date(end.getFullYear(), end.getMonth(), end.getDate()))); }

  /* Cómo nombrar el día operativo en los textos */
  const DAYCTX = (() => {
    const isToday = sameDay(REF, TODAY);
    const refName = `${WEEKDAYS[REF.getDay()]} ${REF.getDate()}`;                 // «viernes 16»
    const holiday = holidayName(TODAY);
    return {
      isToday, refName,
      ref: isToday ? 'hoy' : `el ${refName}`,                                         // «hoy» · «el viernes 16»
      Ref: isToday ? 'Hoy' : `El ${refName}`,
      off: IS_WORKDAY ? null : holiday ? `festivo (${holiday})` : WEEKDAYS[TODAY.getDay()],   // «domingo» · «festivo (…)»
      start: '7:00',
      end: REF.getDay() === 5 ? '14:30' : '17:30'
    };
  })();

  /* ---------------------------------------------------------------------------
     12. API pública
     ------------------------------------------------------------------------- */
  load();
  window.APC = {
    NOW, TODAY, REF, PHASE, IS_WORKDAY, DAYCTX, COMPANY, USER, CATEGORIES, INC_CATEGORIES, EMPLEADOS, OBRAS,
    get fichajes() { return state.fichajes; },
    get partes() { return state.partes; },
    get incidencias() { return state.incidencias; },
    get documentos() { return state.documentos; },
    get actividad() { return state.actividad; },
    get journalSize() { return state.journal.length; },
    empById, obraById, metrics, chaptersOf, totals, monthlyCost, presenceSeries, daysOpen, fmt,
    todayFichajes, reviewFichajes, hoursOf, workday, addDays, at, sameDay, iso, daysBetween, isWeekend, isWorkday, holidayName, isLive,
    commit, reset, load, nextId: prefix => nextId(prefix, prefix === 'INC' ? state.incidencias : prefix === 'PT' ? state.partes : state.documentos),
    S, Sinv, STATUS_LABEL, OPEN
  };
})();
