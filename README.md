# Adolfo Pérez Construcciones · Plataforma de operaciones (demo)

Demostración interactiva de un sistema de gestión a medida para **Adolfo Pérez Construcciones**, diseñada por **ADVENTUM Strategy** como herramienta comercial y de descubrimiento.

> **Entorno de demostración · Datos ficticios.** Todas las obras, personas, cifras, fotografías y ubicaciones son inventadas. No existe ninguna conexión con los sistemas de la empresa.

URL: **https://adolfo-perez.adventumstrategy.es**

---

## Qué incluye

| Sección | Qué se puede hacer |
|---|---|
| **Inicio** | Saludo, obra en portada, asistente con preguntas en lenguaje natural, 4 indicadores, obras ordenadas por atención, mapa con el equipo en obra, actividad reciente y próximos hitos. |
| **Obras** | Tarjetas o tabla, filtros, orden y exportación CSV. Detalle con galería, curva de avance real frente a planificado, capítulos, equipo, partes, incidencias, economía y documentación. Permite actualizar el avance. |
| **Equipo** | 20 personas ficticias con filtros, búsqueda y ficha (fichajes, horas, partes y formación). |
| **Fichajes** | Últimos 10 días laborables, estados (presente, pendiente de salida, ausencia, revisión), resolución de anomalías, fichaje manual y CSV. |
| **Partes de trabajo** | Validar, devolver con motivo y crear partes nuevos con equipo, horas y materiales. |
| **Incidencias** | Filtros por estado, prioridad y obra; alta de incidencias; cambio de estado con historial; CSV. |
| **Control económico** | Presupuesto, coste ejecutado, previsión al cierre y desviación por obra y por mes. |
| **Documentación** | Vigencias y caducidades, validación y subida de documentos (el archivo no sale del navegador). |
| **Informes** | Resumen para dirección, estado de obras, horas, incidencias y economía. Se pueden imprimir, guardar en PDF y exportar a CSV. |

Todos los indicadores se **calculan** a partir de los datos de `assets/js/data.js`, así que las cifras coinciden en todas las pantallas. Los cambios que se hacen en la demo (incidencias, partes, fichajes, avances y documentos) se guardan en el navegador (`localStorage`) y se pueden deshacer desde **Menú de usuario → Restablecer datos de la demo**.

### El asistente

Responde con un **motor local de reglas** sobre los datos de la demo, incluidos los cambios hechos durante la sesión. **No se conecta a ningún modelo de IA** ni envía datos fuera del navegador. En una versión real se conectaría a un modelo de lenguaje a través de un servidor seguro, con permisos por usuario.

Ejemplos: «¿Qué obras están teniendo retrasos?», «¿Qué empleados no han fichado hoy?», «¿Qué jefe de obra tiene más incidencias pendientes?», «¿Cómo vamos de presupuesto este mes?», «Prepárame un resumen para la reunión de mañana».

Las fechas se calculan respecto al día en que se abre la demo. En fin de semana se muestra la última jornada laborable.

---

## Estructura

```
index.html            Página principal (aplicación de una sola página, navegación con #)
404.html              Redirige cualquier ruta desconocida a la aplicación
CNAME                 Dominio personalizado para GitHub Pages
robots.txt            Evita la indexación en buscadores (además de <meta name="robots">)
.nojekyll             Publica los archivos tal cual, sin procesarlos con Jekyll
assets/
  css/styles.css      Estilos (paleta, tipografía y componentes)
  js/data.js          Datos ficticios, cálculos y registro de cambios  ← editar aquí los datos
  js/assistant.js     Motor del asistente
  js/ui.js            Componentes, gráficos, diálogos y exportación CSV
  js/home.js          Página de inicio, mapa y asistente
  js/views.js         Obras, detalle de obra, Equipo y Fichajes
  js/views2.js        Partes, Incidencias, Control económico, Documentación e Informes
  js/app.js           Navegación, barra lateral y arranque
  js/icons.js         Iconos (Lucide)
  js/map-data.js      Cartografía precalculada de la Marina Baixa (OpenStreetMap)
  fonts/              Inter y DM Serif Display (servidas desde el propio sitio)
  img/obras/          Fotografías (versiones -sm y -lg)
  brand/              Logotipo, favicon e imagen para compartir
```

No necesita instalación ni compilación. Para verla en local basta con abrir `index.html` en el navegador.

**Privacidad:** la web no carga nada de terceros (ni Google Fonts, ni CDN, ni analítica, ni cookies). Lo único que guarda es el registro de cambios de la demo en el propio navegador.

**Fichajes y RGPD (planteamiento de diseño):** registro diario de jornada según el art. 34.9 del Estatuto de los Trabajadores, con trazabilidad de cada corrección. La ubicación solo se comprueba en el momento de fichar (geocerca de la obra), sin seguimiento continuo, y el mapa muestra recuentos por obra, no posiciones individuales. Un despliegue real exigiría informar previamente a la plantilla (art. 90 LOPDGDD) y revisar el resto de obligaciones con asesoría laboral.

---

## Publicación

Publicada el 18 de octubre de 2026 y comprobada en navegador.

| Elemento | Configuración |
|---|---|
| Repositorio | `santofimiagroup/adolfo-perez-construcciones` (público), rama `main` |
| GitHub Pages | *Deploy from a branch* → `main` / `(root)` |
| Dominio | `adolfo-perez.adventumstrategy.es` (archivo `CNAME`) · *DNS check successful* |
| DNS (Hostinger, zona `adventumstrategy.es`) | `CNAME` · `adolfo-perez` → `santofimiagroup.github.io` · TTL 14400. No se modificó ningún otro registro. |
| HTTPS | Certificado emitido por GitHub · *Enforce HTTPS* activado (`http://` redirige a `https://`) |

La dirección `santofimiagroup.github.io/adolfo-perez-construcciones/` redirige al dominio.

### Actualizar la demo

1. Editar los archivos en local y revisarlos abriendo `index.html`.
2. Si cambia CSS o JS, actualizar el valor `?v=` de las referencias en `index.html` (por ejemplo, con la fecha): GitHub Pages deja los archivos 10 minutos en la caché del navegador.
3. En GitHub, entrar en la carpeta correspondiente → *Add file → Upload files* → arrastrar los archivos → *Commit changes*.
4. En uno o dos minutos la acción *pages build and deployment* publica la nueva versión (pestaña *Actions*).

### Rehacer la publicación desde cero (referencia)

1. Repositorio **público** (GitHub Pages gratuito lo exige) con el contenido de esta carpeta en la raíz de `main`, incluidos `CNAME` y `.nojekyll`.
2. *Settings → Pages*: *Deploy from a branch*, `main` / `(root)`.
3. *Custom domain*: `adolfo-perez.adventumstrategy.es` → *Save*. Hacerlo **antes** de crear el registro DNS, para que nadie pueda reclamar el subdominio.
4. Hostinger (hPanel) → *Dominios → adventumstrategy.es → DNS / Nameservers*: añadir **solo** `CNAME` · `adolfo-perez` · `santofimiagroup.github.io` (sin el nombre del repositorio). En «Nombre» va solo `adolfo-perez`.
5. Cuando GitHub emita el certificado (de minutos a 24 h), activar *Enforce HTTPS*.

**Recomendado:** verificar el dominio `adventumstrategy.es` en GitHub (*Settings de la cuenta → Pages → Add a domain*), que pide un registro TXT `_github-pages-challenge-santofimiagroup` en Hostinger. Protege los subdominios frente a apropiaciones si algún día se borra el repositorio. No usar registros DNS comodín (`*.adventumstrategy.es`).

Comprobación desde Windows (PowerShell): `Resolve-DnsName adolfo-perez.adventumstrategy.es`

---

## Personalización rápida

- **Logotipo:** `assets/brand/logo-adolfo-perez.png` (fondo transparente). Si se sustituye, mantener el nombre o actualizar `COMPANY.logo` en `assets/js/data.js`.
- **Usuaria de la demo:** `USER` en `assets/js/data.js` (nombre y rol).
- **Obras, equipo, partes, incidencias y documentos:** `assets/js/data.js`. Los indicadores se recalculan solos.

---

## Créditos y licencias

- Fotografías: [Unsplash](https://unsplash.com/license) (licencia Unsplash) y Wikimedia Commons (CC BY-SA 4.0), recortadas y redimensionadas:
  - «Unfertige Dinge 002 2016 11 27», F. Riedel — https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_002_2016_11_27.jpg
  - «Viviendas Donado Holmberg 2018 (05)», Gobierno de la Ciudad Autónoma de Buenos Aires — https://commons.wikimedia.org/wiki/File:Viviendas_Donado_Holmberg_2018_(05).jpg
  - «Construction crane x», Øyvind Holmstad — https://commons.wikimedia.org/wiki/File:Construction_crane_x.jpg
- Cartografía: © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL).
- Iconos: [Lucide](https://lucide.dev) (ISC).
- Tipografías: Inter y DM Serif Display (SIL Open Font License).
- Logotipo: propiedad de Adolfo Pérez Construcciones, utilizado con fines de presentación.

Solución diseñada por ADVENTUM Strategy.
