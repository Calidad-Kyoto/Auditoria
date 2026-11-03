# Kyoto Posventa — Checks de Check In, Check Out y Agendamiento — Blueprint

> Página web interna con una solapa **POSVENTA** que se divide en tres checks idénticos a los PDFs
> de Kyoto Automotores (mismos íconos, mismos textos). Cada check completado se guarda solo en un
> Google Sheet, una fila por check, como un Google Form.

| | |
|---|---|
| Forma | Herramienta interna (formulario + planilla) |
| Stack | HTML/CSS/JS puro en GitHub Pages · Google Apps Script vinculado a un Google Sheet |
| Modo | Archivo único — 10 pasos de construcción (§9) |
| Generado | 2026-11-03 con the-architect (modo clone) |
| Raíz del proyecto | `kyoto-posventa/` — todos los comandos corren desde ahí, en **Git Bash** (Windows) |

---

## 1. Project Overview & Non-Goals

### Vision
Los asesores de servicio de las 4 sucursales Kyoto Nissan completan en una tablet o PC el mismo
check que hoy está impreso en papel (Check In, Check Out y el guion de Agendamiento telefónico). La
página reproduce los PDFs celda por celda —mismo ícono, mismo texto, mismo casillero arriba a la
derecha— y al tocar **Guardar** el check queda en una hoja de Google Sheets con una columna SI/NO por
ítem y el % de cumplimiento. Calidad mide quién cumple el protocolo, sin pasar nada a mano.

### Users
| Usuario | Qué hace | Dispositivo |
|---|---|---|
| Asesor de servicio | Completa Check In al recibir el auto y Check Out al entregarlo | Tablet o PC en recepción de taller |
| Quien atiende el teléfono de turnos | Completa Agendamiento durante o al terminar la llamada | PC |
| Calidad (Tobías) | Lee las hojas y el Resumen; carga los asesores en la hoja Config | Google Sheets |

Acceso: **link abierto, sin login** (decisión del usuario). El asesor se elige de una lista fija por
sucursal que sale de la hoja `Config`.

### Goals — v1 scope
1. Solapa **POSVENTA** con 3 sub-solapas: **CHECK IN · CHECK OUT · AGENDAMIENTO**.
2. Cada sub-solapa reproduce su PDF: 26 ítems en Check In (20 de la grilla + 6 de OFRECEMOS),
   21 en Check Out (18 de la grilla + 3 de post-entrega), 18 en Agendamiento (2 de protocolo inicial
   + 12 celdas + 4 reglas de cierre). Los 59 íconos se recortan de los PDFs originales.
3. Datos que identifican cada check: Check In / Check Out → Sucursal, Asesor, Nº de OR, Patente,
   Cliente. Agendamiento → Sucursal, Quién atendió, Cliente, Patente, Fecha del turno. La fecha y hora
   se graban solas.
4. Guardado en el Sheet: hojas `Check In`, `Check Out`, `Agendamiento` (una fila por check), hoja
   `Config` (sucursales y asesores, editable por Calidad) y hoja `Resumen` (automática, cada hora).
5. Cola sin conexión: si la tablet no tiene red, el check queda guardado en el navegador y se envía
   solo al volver la conexión. Un reintento nunca duplica la fila.

### Non-Goals — explicitly out of scope for v1
| Fuera de v1 | Por qué | Vuelve cuando |
|---|---|---|
| Login / cuentas de Google | El usuario eligió link abierto: velocidad en el mostrador | Aparezcan cargas falsas o de gente ajena |
| Fotos o adjuntos (evidencia de piezas) | Duplica el peso del envío y exige Drive | Calidad pida evidencia fotográfica |
| Vincular Check In ↔ Check Out de la misma OR | Requiere búsqueda y estado por OR | Se quiera medir tiempos de estadía |
| Mails o alertas | No pedido | Se defina un umbral de cumplimiento con dueño |
| Dashboard visual | El Resumen en el Sheet alcanza para v1 | Calidad pida gráficos (se puede sumar al Canvas VOC) |
| Checks nuevos de posventa | El usuario: "después vamos a agregar más, pero primero esto" | Lleguen los PDFs nuevos — ver skill `agregar-check-item` |
| Auditoría tipo "Vehículos" del kyoto-checklist | Riesgo aceptado (§20.2) | Se detecte que se tilda todo sin hacerlo |
| Integración con el kyoto-checklist existente | El usuario eligió página aparte | — |

### Success metrics
| Métrica | Meta | Dónde se ve |
|---|---|---|
| Checks guardados por día hábil | ≥ 1 Check In por OR abierta | Hojas `Check In` / `Check Out` |
| Checks perdidos | 0 (cola sin conexión + `ID envío` sin duplicados) | `ID envío` único por hoja |
| Tiempo para completar un check | < 2 minutos | Prueba manual §20.1 |
| % de cumplimiento visible por asesor y mes | Disponible desde el primer día | Hoja `Resumen` |

## 2. Tech Stack

| Capa | Elección | Por qué |
|---|---|---|
| Página | HTML + CSS + JavaScript puro, sin framework ni build | Es el patrón de todas las herramientas de Kyoto (kyoto-checklist, encuesta-cliente): se edita con el Bloc de notas y se publica subiendo archivos |
| Hosting | GitHub Pages, repo `tchequim/kyoto-posventa` | Gratis, HTTPS, link fijo para guardar en la tablet |
| Backend | Google Apps Script **vinculado** al Sheet, publicado como aplicación web | Escribe en el Sheet sin credenciales en la página; el usuario ya lo maneja |
| Datos | Google Sheets (5 hojas) | Es "como un Google Form": Calidad ya trabaja ahí |
| Lectura de config | GET con JSONP (`?accion=config&callback=…`) | Mismo patrón que el Dashboard VOC; funciona aun abriendo el HTML como archivo local |
| Guardado | `fetch` POST con cuerpo JSON **sin** `Content-Type` | Pedido "simple": no dispara preflight CORS, que Apps Script no responde |
| Fuente | Montserrat (Google Fonts), 300 y 700 | La más parecida a NissanBrand Light (la del PDF), que no tiene licencia web |
| Íconos | PNG RGBA recortados de los PDFs con PyMuPDF a 300 dpi | Son los mismos dibujos del PDF: fidelidad exacta |
| Tests | `node --test` (Node 22+) + simulador de Apps Script propio | Cero dependencias npm; el backend se prueba completo en la PC |

### Compatibility check
- `node --test "tests/*.test.js"`: el patrón con comillas lo expande Node (soportado desde Node 21);
  por eso `engines.node` es `>=22`. Pasar una carpeta (`node --test tests/`) **falla** en Node 24
  (`Cannot find module …\tests`) — comprobado en la generación.
- PyMuPDF 1.28.0 publica wheel `cp314`, compatible con el Python 3.14 de la PC.
- Apps Script: `SpreadsheetApp.getActiveSpreadsheet()` funciona dentro de una aplicación web sólo si
  el script está **vinculado** al Sheet (Extensiones → Apps Script). Por eso no hay `SPREADSHEET_ID`.

## 3. Directory Structure

```
kyoto-posventa/
├── index.html                 # paso 7 — página: encabezado, solapa POSVENTA, sub-solapas
├── INSTALACION.md             # paso 10 — puesta en marcha paso a paso (Sheet, Apps Script, Pages)
├── package.json               # Bootstrap (§10) — scripts test / iconos / servir; sin dependencias
├── .gitignore                 # Bootstrap (§10)
├── css/estilos.css            # paso 7 — diseño fiel a los PDFs (§7)
├── js/
│   ├── catalogo.js            # paso 1 — los 65 ítems: id, etiqueta (columna del Sheet), texto, ícono
│   ├── logica.js              # paso 5 — validación, armado del envío, cola sin conexión (sin DOM)
│   ├── vista.js               # paso 6 — funciones que devuelven HTML (sin DOM)
│   ├── config.js              # paso 7 — window.POSVENTA_CONFIG.ENDPOINT
│   └── app.js                 # pasos 8 y 9 — único archivo que toca el DOM
├── img/                       # paso 1 — 59 PNG generados por tools/extraer_iconos.py (se commitean)
├── fuentes/                   # Bootstrap — PDFs originales (entrada del recorte)
│   ├── check-in-out.pdf
│   └── agendamiento.pdf
├── tools/extraer_iconos.py    # paso 1 — recorta cada celda del PDF a PNG transparente
├── apps-script/               # se pegan en el editor de Apps Script (comparten ámbito global)
│   ├── Hojas.gs               # paso 2 — constantes, hojas, Config, doGet
│   ├── Guardar.gs             # paso 3 — doPost, validación, escritura con lock
│   └── Resumen.gs             # paso 4 — actualizarResumen, instalar, onOpen
├── tests/
│   ├── gas-sim.js             # paso 2 — simulador de Apps Script para Node
│   └── *.test.js              # uno por paso (ver §9)
└── blueprints/                # este blueprint + los PDFs originales (no se tocan)
    ├── kyoto-posventa-blueprint.md
    └── kyoto-posventa-fuentes/{check-in-out.pdf, agendamiento.pdf}
```

Total de ítems: 26 + 21 + 18 = **65**; con ícono: **59** (los 6 de protocolo de Agendamiento son texto).

## 4. Data Model

No hay base de datos: el modelo son las hojas del Google Sheet.

### Entities
| Hoja | Una fila es | Columnas |
|---|---|---|
| `Config` | Un asesor habilitado en una sucursal | `Sucursal`, `Asesor`, `Activo` (SI/NO) |
| `Check In` | Un Check In completado | `Fecha/Hora`, `Sucursal`, `Asesor`, `Nº OR`, `Patente`, `Cliente`, `% Cumplimiento`, `Ítems OK`, `Ítems totales`, `ID envío`, y luego **una columna por ítem** (encabezado = `etiqueta` del catálogo, valor `SI`/`NO`) |
| `Check Out` | Un Check Out completado | Igual que `Check In` |
| `Agendamiento` | Una llamada de turno | `Fecha/Hora`, `Sucursal`, `Asesor`, `Cliente`, `Patente`, `Fecha del turno`, `% Cumplimiento`, `Ítems OK`, `Ítems totales`, `ID envío`, y una columna por ítem |
| `Resumen` | Se reescribe entera cada hora | Bloque 1: `Mes`, `Check`, `Sucursal`, `Asesor`, `Cantidad`, `% promedio` · fila en blanco · Bloque 2: `Check`, `Ítem`, `Veces NO`, `Total`, `% NO` (top 10 por check) |

Reglas:
- `Fecha/Hora` = momento en que el asesor tocó Guardar (`creado` del envío), no el de llegada: un
  check que estuvo en la cola sin conexión conserva su hora real.
- `% Cumplimiento` = `round(Ítems OK × 100 / Ítems totales)`, entero 0–100.
- `ID envío` = UUID generado en la página. Si llega un envío con un `ID envío` que ya está en la
  hoja, no se agrega otra fila (respuesta `duplicado: true`).
- Las columnas de ítems se ubican **por encabezado**, no por posición. Un ítem nuevo agrega su
  columna al final; las existentes no se mueven. Por eso agregar checks o ítems después no rompe
  las filas viejas.
- Nada se borra desde la página ni desde el script.

### Relationships
`Config.Sucursal` + `Config.Asesor` (con `Activo` ≠ `NO`) es la lista blanca: el script rechaza un
check cuyo par sucursal/asesor no esté ahí. No hay otras relaciones en v1.

### Indexes
NOT APPLICABLE — Google Sheets no tiene índices; el volumen esperado (≈ 100 filas/día) se lee entero.

### Schema
Los encabezados exactos están en `FIJAS` de `apps-script/Hojas.gs` (paso 2) y los fija
`tests/hojas.test.js`.

### Migrations
NOT APPLICABLE — `configurarHojas()` crea lo que falta y es idempotente; las columnas de ítems
nuevos se agregan solas al guardar.

### Seed data
`configurarHojas()` crea `Config` con una fila por sucursal: `KYOTO RESISTENCIA`, `KYOTO CORRIENTES`,
`KYOTO POSADAS`, `KYOTO SAENZ PEÑA`, cada una con el asesor `Asesor de prueba` activo. Calidad los
reemplaza por los nombres reales (INSTALACION.md, sección 6).

## 5. API Design

### Conventions
- Una sola URL: la de la aplicación web de Apps Script (`https://script.google.com/macros/s/<id>/exec`).
- Respuestas JSON con `ok: true|false`; en error, `error: "<mensaje en castellano>"`. Nunca HTTP de
  error (Apps Script siempre responde 200).
- El `callback` de JSONP sólo se acepta si cumple `^[A-Za-z_$][\w$]*$`; si no, se responde JSON.

### Routes
| Método | Parámetros | Respuesta |
|---|---|---|
| GET | `accion=config` [`&callback=fn`] | `{ ok: true, sucursales: [{ nombre, asesores: [..] }] }` |
| GET | otra `accion` | `{ ok: false, error: "accion desconocida" }` |
| POST | cuerpo JSON (abajo) | `{ ok: true, duplicado: false, fila: N }` · `{ ok: true, duplicado: true, fila: N }` · `{ ok: false, error }` |

### Critical endpoints — full detail
Cuerpo del POST (lo arma `Logica.construirPayload`, paso 5):
```json
{
  "accion": "guardar",
  "tipo": "checkin",
  "idEnvio": "3f1c2a9e-5b7d-4e21-9a0c-1d2e3f4a5b6c",
  "creado": "2026-11-03T13:30:00.000Z",
  "datos": { "sucursal": "KYOTO CORRIENTES", "asesor": "Asesor de prueba", "or": "4521", "patente": "AB123CD", "cliente": "Juan Pérez" },
  "items": [ { "id": "ci_datos_cliente", "etiqueta": "Datos del cliente", "ok": true } ]
}
```
`tipo` ∈ `checkin | checkout | agendamiento`. Para `agendamiento`, `datos` lleva `fechaTurno`
(`AAAA-MM-DD`) y no lleva `or`. `items` trae **todos** los ítems del check, marcados o no.

Validaciones del servidor (en este orden; cualquiera falla → `ok:false` y no se escribe nada):
tipo conocido · `idEnvio` de 8 a 64 caracteres · datos requeridos no vacíos · par sucursal/asesor
activo en `Config` · al menos un ítem · cada ítem con `etiqueta` no vacía y `ok` booleano · sin
etiquetas repetidas. La escritura corre dentro de `LockService.getScriptLock()` (dos asesores
guardando a la vez no se pisan).

## 6. Frontend Architecture

### Routes
Una sola página. La sub-solapa activa sale del hash: `#checkin` (por defecto), `#checkout`,
`#agendamiento`. Cambiar de sub-solapa no borra lo cargado en las otras (el estado vive en memoria
por tipo).

### Rendering strategy
Todo se dibuja en el navegador con funciones puras de `js/vista.js` que devuelven strings HTML;
`js/app.js` las inserta y conecta eventos. Sin framework.

### Component hierarchy
```
header.encabezado            KYOTO AUTOMOTORES · Concesionario Oficial Nissan (barra roja abajo)
nav.solapas                  [POSVENTA]  (una sola solapa en v1, lista para sumar más)
nav.subsolapas               [CHECK IN] [CHECK OUT] [AGENDAMIENTO]  → button.subsolapa[data-tipo]
div#avisos (aria-live)       errores de validación, "N checks pendientes de envío", falta de ENDPOINT
main#app
  div.hoja                   el "papel"
    div.datos                Vista.htmlDatos(tipo, sucursales)
    section.check            Vista.htmlCheck(tipo, CATALOGO)
footer.barra-guardar         progreso "12 / 26 · 46 %" + botón GUARDAR CHECK IN
div.confirmacion             overlay "Guardado ✓" + botón "Cargar otro"
```

Contrato de `js/vista.js` (UMD: `window.Vista` en el navegador, `require` en Node). Los tests del
paso 6 lo fijan; lo que no está acá queda a criterio del constructor:

| Función | Devuelve |
|---|---|
| `esc(s)` | `s` con `& < > "` escapados |
| `htmlCheck(tipo, catalogo)` | `<section class="check check--{tipo}" data-tipo="{tipo}"><h2 class="pestana">{titulo}</h2>` + una pieza por sección + `</section>` |
| sección `grilla` | `<div class="grilla grilla--{columnas}" data-seccion="{id}">` + celdas |
| sección `ofrecemos` | `<div class="ofrecemos"><div class="ofrecemos__titulo">OFRECEMOS</div><div class="grilla grilla--3">` + celdas + `</div></div>` |
| sección `postentrega` | `<div class="grilla grilla--3 postentrega">` + celdas |
| sección `grilla-roja` | `<div class="grilla grilla--3 grilla--roja">` + celdas |
| sección `protocolo-inicio` / `protocolo-cierre` | `<div class="protocolo protocolo--inicio">` / `--cierre` + ítems de protocolo |
| celda | `<label class="celda" data-item="{id}"><input type="checkbox" class="casillero" name="{id}" data-item="{id}" aria-label="{etiqueta}"><img class="icono" src="{img}" alt="" loading="lazy"><span class="etiqueta">{lineas unidas con <br>}</span></label>` |
| ítem de protocolo | `<label class="protocolo__item" data-item="{id}">` + el mismo `input.casillero` + `<span class="protocolo__titulo">{titulo}</span>` (si hay) + `<span class="protocolo__texto">{texto}</span>` + `<span class="protocolo__nota">{nota}</span>` (si hay) + `</label>` |
| `htmlDatos(tipo, sucursales)` | `<div class="datos" data-tipo="{tipo}">` con `<label class="campo">` por campo: `select[name=sucursal]` (opción inicial vacía + una `<option value="{nombre}">{nombre}</option>` por sucursal), `select[name=asesor]`, `input[name=or]` (no en agendamiento), `input[name=patente]`, `input[name=cliente]`, `input[name=fechaTurno][type=date]` (sólo agendamiento). En agendamiento el rótulo del asesor es "Quién atendió" |
| `opcionesAsesores(sucursales, nombre)` | `<option value="" disabled selected>Elegí el asesor</option>` + una opción por asesor; si no hay: `<option value="" disabled selected>Sin asesores cargados en la hoja Config</option>` |
| `textoProgreso(marcados, total)` | `"{marcados} / {total} · {round(marcados*100/total)} %"`; con total 0 → `"0 / 0 · 0 %"` |

Una sección de tipo desconocido lanza `Error('tipo de sección desconocido: …')`.

### State management
En `app.js`, un objeto por tipo: `{ datos: {..}, marcados: { idItem: true } }`. Persistencia en
`localStorage` (todo dentro de `try/catch`; si falla, la página funciona igual):
- `posventa_config` — `{ guardado: ISO, sucursales }`, la última config leída (sirve sin conexión).
- `posventa_ultimo` — `{ sucursal, asesor }`, para preseleccionarlos la próxima vez.
- `posventa_cola` — envíos pendientes (lo maneja `Logica.crearCola`).

### Loading, empty, and error states
| Situación | Qué ve el asesor |
|---|---|
| Leyendo la config | Selects deshabilitados con "Cargando…" |
| Config no disponible y sin caché | Aviso rojo "No se pudo leer la lista de asesores. Revisá la conexión." + botón Reintentar; Guardar deshabilitado |
| Sucursal sin asesores | Opción "Sin asesores cargados en la hoja Config"; Guardar falla la validación |
| `ENDPOINT` = `PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT` | Aviso "Falta configurar la URL del Apps Script (js/config.js)"; Guardar deshabilitado |
| Validación local falla | Lista de errores en `#avisos` y foco en el primer campo con error |
| Guardado OK | Overlay "Guardado ✓ en la hoja {hoja} · {pct} % de cumplimiento" + "Cargar otro" |
| Sin red al guardar | Overlay "Guardado en esta tablet. Se enviará solo cuando vuelva la conexión." + "Cargar otro" |
| El servidor rechaza (`ok:false`) | Aviso rojo con el `error` del servidor; el formulario queda como estaba para corregir y volver a guardar |
| Hay pendientes | Aviso "N checks pendientes de envío" + botón Reintentar |

## 7. Design System

Dirección: **igual al PDF**. Fondo blanco, íconos negros, líneas punteadas, pestaña negra con el
título. Lo único que agrega la página es el encabezado Kyoto, las solapas y la barra de guardar.

### Colors
| Token (en `:root` de `css/estilos.css`) | Hex | Uso |
|---|---|---|
| `--negro` | `#231F20` | Texto, pestañas `CHECK IN`/`CHECK OUT`, líneas de la grilla, casilleros (es el negro exacto del PDF) |
| `--blanco` | `#FFFFFF` | Papel |
| `--fondo` | `#EDEDED` | Fondo detrás del papel |
| `--rojo-pdf` | `#FD0100` | "SALUDO" y líneas punteadas de Agendamiento (exacto del PDF) |
| `--rojo-nissan` | `#C3002F` | Barra del encabezado, solapa activa, botón Guardar, foco |
| `--gris-ok` | `#F2F2F2` | Fondo de una celda tildada |
| `--verde` | `#1E7D32` | Tilde del overlay "Guardado ✓" |
| `--error` | `#B00020` | Avisos de error |

### Typography
Montserrat desde Google Fonts (`family=Montserrat:wght@300;700`), con `system-ui, sans-serif` de
respaldo. Etiquetas de celda: 300, 15 px (13 px en celular), centradas. Pestañas y títulos: 700,
22 px, mayúsculas. Protocolo de Agendamiento: 700, 18 px, centrado; "SALUDO" en `--rojo-pdf`.

### Spacing, radius, elevation
Papel `.hoja`: ancho máximo 1100 px, padding 24 px, sombra `0 2px 12px rgba(0,0,0,.12)`. Celda:
alto mínimo 170 px (220 px en Agendamiento), padding 12 px. Casillero: 28×28 px, borde 2 px
`--negro`, radio 3 px, en la esquina superior derecha de la celda (`position:absolute; top:8px;
right:10px`). Ícono: alto máximo 84 px (110 px en Agendamiento), ancho máximo 80 %.

Grillas:
- `.grilla--4` / `.grilla--3`: CSS grid de 4 / 3 columnas iguales.
- Check In / Check Out: cada celda con `border-right` y `border-bottom` `2px dashed var(--negro)`,
  salvo la última columna (sin borde derecho) y la última fila (sin borde inferior).
- `.ofrecemos`: borde `2px solid var(--negro)`; columna izquierda `.ofrecemos__titulo` de 56 px con
  fondo `--negro`, texto blanco 22 px 700, vertical (`writing-mode: vertical-rl;
  transform: rotate(180deg)`); celdas internas separadas por `1.5px solid var(--negro)`.
- `.postentrega`: separada 40 px arriba, ancho 75 % alineada a la derecha, sólo líneas verticales
  `2px dashed` a ambos lados de cada celda (como en el PDF).
- `.grilla--roja`: líneas `2px dotted var(--rojo-pdf)`; el papel de Agendamiento lleva
  `background: radial-gradient(ellipse at center, #FFFFFF 60%, #F2F2F2 100%)`. La celda
  `[data-item="ag_recordar_traer"] .etiqueta` va alineada a la izquierda (como en el PDF).
- `.protocolo__item`: casillero a la izquierda del texto, en fila.

Celular (`@media (max-width: 700px)`): `.grilla--4` y `.grilla--3` pasan a 2 columnas; el título
OFRECEMOS pasa a barra horizontal arriba; `.postentrega` ocupa 100 %.

### Motion
Sólo dos: la celda cambia a `--gris-ok` con `transition: background-color 120ms ease-out` al
tildarse, y el overlay de confirmación aparece con `opacity` 0→1 en 150 ms. Con
`prefers-reduced-motion: reduce`, sin transiciones.

### Component style
- Casillero: `appearance: none`; tildado = fondo `--negro` con tilde blanca (SVG inline en
  `background-image`). Toda la celda es clickeable (es un `<label>`).
- Botón Guardar: fondo `--rojo-nissan`, texto blanco 700 mayúsculas, alto 52 px, radio 6 px. Su
  texto cambia por tipo: "GUARDAR CHECK IN" / "GUARDAR CHECK OUT" / "GUARDAR AGENDAMIENTO".
- Sub-solapas: botones con borde inferior 4 px; la activa en `--rojo-nissan`.
- Foco: `:focus-visible { outline: 3px solid var(--rojo-nissan); outline-offset: 2px; }`.

## 8. Authentication & Authorization

### Provider and rationale
Ninguno: link abierto, decisión del usuario (velocidad en el mostrador). La única barrera es que
el par sucursal/asesor tenga que existir en `Config`.

### Flows
NOT APPLICABLE — sin login.

### Route protection
El Apps Script se publica "Ejecutar como: yo · Quién tiene acceso: Cualquier persona". Sólo expone
leer la lista de asesores y agregar filas validadas; no permite leer, editar ni borrar checks.

### Roles and permissions
| Rol | Puede |
|---|---|
| Cualquiera con el link | Ver la página y enviar checks válidos |
| Editores del Sheet (Calidad) | Todo lo demás: ver datos, cargar asesores, editar filas |

### Sessions
NOT APPLICABLE — sin login.

### Multi-tenancy / row-level isolation
NOT APPLICABLE — una sola organización, un solo Sheet.

## 9. BUILD ORDER

Reglas para quien construye: un paso por vez; un paso termina cuando su `Verify` sale con 0 **y**
los anteriores siguen en 0 (`npm test` corre todos los tests existentes); no se saltea nada; si un
paso se traba, `git reset --hard <tag del paso anterior>` y se reintenta. Los archivos marcados
"contenido literal" se copian **exactamente** como están acá: ya se ejecutaron y pasaron en la
generación de este blueprint.

### Step map
| # | Paso | Depende de | Toca | Gate |
|---|---|---|---|---|
| 1 | Catálogo e íconos | Bootstrap | `tools/extraer_iconos.py`, `js/catalogo.js`, `tests/catalogo.test.js`, `img/` | `npm run iconos && npm test` |
| 2 | Hojas, Config y GET | 1 | `tests/gas-sim.js`, `apps-script/Hojas.gs`, `tests/hojas.test.js`, `tests/config.test.js` | `npm test` |
| 3 | Guardar (POST) | 2 | `apps-script/Guardar.gs`, `tests/guardar.test.js` | `npm test` |
| 4 | Resumen y disparador | 3 | `apps-script/Resumen.gs`, `tests/resumen.test.js` | `npm test` |
| 5 | Lógica de la página + contrato | 3 | `js/logica.js`, `tests/logica.test.js`, `tests/contrato.test.js` | `npm test` |
| 6 | Vista (HTML de los checks) | 1 | `js/vista.js`, `tests/vista.test.js` | `npm test` |
| 7 | Página y estilos | 6 | `index.html`, `css/estilos.css`, `js/config.js`, `tests/pagina.test.js` | `npm test` + página servida en 200 |
| 8 | app.js: config, solapas y tildado | 5, 7 | `js/app.js`, `tests/app-config.test.js` | `npm test` |
| 9 | app.js: guardar, cola y confirmación | 8 | `js/app.js`, `tests/app-envio.test.js` | `npm test` |
| 10 | Instalación y publicación | 9 | `INSTALACION.md`, `README.md`, `tests/publicacion.test.js` | `npm test` |

Orden: datos y backend primero (es el contrato), después la lógica que lo consume (el paso 5 prueba
el contrato página ↔ script apenas existen los dos lados), después lo visual.

---

#### Step 1 — Catálogo e íconos

**Do**
Crear con **contenido literal**:
- `tools/extraer_iconos.py` — recorta cada celda de `fuentes/*.pdf`, borra las etiquetas de texto,
  tapa el casillero, pasa el fondo a transparente y guarda `img/<id>.png`.

`tools/extraer_iconos.py` — contenido literal:

```python
"""Recorta cada ícono de los PDFs originales y lo guarda como PNG transparente en img/.
Uso (desde la raíz del repo):  python tools/extraer_iconos.py
"""
import os, sys
import pymupdf

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTES = os.path.join(RAIZ, "fuentes")
SALIDA = os.path.join(RAIZ, "img")
DPI = 300

# Bordes de la grilla en puntos PDF (medidos de las líneas punteadas de cada PDF).
CI_X = [28, 163, 298, 432, 567]          # Check In: 4 columnas
CO_X = [621, 758, 893, 1028, 1163]       # Check Out: 4 columnas
FILAS = [56, 164, 272, 380, 487, 595]    # 5 filas, iguales en Check In y Check Out
OF_X = [96, 230, 365, 499]               # bloque OFRECEMOS: 3 columnas
OF_Y = [603, 711, 819]                   #                   2 filas
PE_X = [691, 826, 960, 1095]             # post entrega (abajo del Check Out): 3 columnas
PE_Y = [635, 746]
AG_X = [35, 290, 551, 806]               # Agendamiento: 3 columnas
AG_Y = [180, 401, 622, 843, 1064]        #               4 filas

def grilla(ids, xs, ys):
    """Asigna ids a celdas de izquierda a derecha y de arriba hacia abajo."""
    celdas, n = {}, 0
    for f in range(len(ys) - 1):
        for c in range(len(xs) - 1):
            if n < len(ids) and ids[n]:
                celdas[ids[n]] = (xs[c], ys[f], xs[c + 1], ys[f + 1])
            n += 1
    return celdas

CHECK_IN = grilla([
    "ci_datos_cliente", "ci_nro_cono", "ci_bocina_luces", "ci_protecciones",
    "ci_chequeo_errores", "ci_combustible_km", "ci_verificacion_ocular", "ci_apertura_capot",
    "ci_aceite_filtro", "ci_manual_garantia", "ci_baul", "ci_rueda_kit",
    "ci_objetos_valor", "ci_trabajos_adicionales", "ci_prueba_manejo", "ci_recall",
    "ci_explicacion_trabajos", "ci_lavado", "ci_consult_bateria", "ci_venta_consultiva",
], CI_X, FILAS)
CHECK_IN.update(grilla([
    "of_valor_servicio", "of_formas_pago", "of_sala_espera",
    "of_hora_checkout", "of_tarjeta_checkin", "of_traslado",
], OF_X, OF_Y))
CHECK_OUT = grilla([
    "co_explicacion_realizados", "co_ticket_bateria", "co_escaneo", "co_asistencia_24x7",
    "co_repuestos_originales", "co_garantia_servicio", "co_manual_sellado", "co_proximo_servicio",
    "co_explicacion_factura", "co_tarjeta_checkout", "co_encuesta_satisfaccion", "co_capot_abierto",
    "co_nivel_aceite", "co_piezas_sustituidas", "co_luces", "co_baul_objetos",
    "co_rueda_kit", "co_retiro_cono",
], CO_X, FILAS)
CHECK_OUT.update(grilla([
    "pe_reconfirmar_datos", "pe_llamado_acompanamiento", "pe_encuesta_nissan",
], PE_X, PE_Y))
AGENDAMIENTO = grilla([
    "ag_datos_cliente", "ag_patente_km", "ag_motivo",
    "ag_recall", "ag_opciones_horarios", "ag_explicacion",
    "ag_lavado", "ag_horario_entrega", "ag_formas_pago",
    "ag_recordar_traer", "ag_objetos_valor", "ag_traslado",
], AG_X, AG_Y)

TAREAS = [  # (archivo PDF, tamaño de letra de las etiquetas, celdas)
    ("check-in-out.pdf", 12.0, {**CHECK_IN, **CHECK_OUT}),
    ("agendamiento.pdf", 18.6, AGENDAMIENTO),
]

def es_casillero(r, celdas):
    """Un casillero es un cuadrado de ~21 pt pegado a la esquina superior derecha de su celda."""
    if not (19 <= r.width <= 24 and 19 <= r.height <= 24):
        return False
    return any(x1 - 16 <= r.x1 <= x1 + 2 and y0 - 4 <= r.y0 <= y0 + 22
               for (x0, y0, x1, y1) in celdas.values())

def limpiar_pagina(page, tam_etiqueta, celdas):
    """Borra las etiquetas de texto y tapa los casilleros, para que quede sólo el dibujo."""
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            for s in l["spans"]:
                if abs(s["size"] - tam_etiqueta) < 0.2 and s["text"].strip():
                    page.add_redact_annot(pymupdf.Rect(s["bbox"]))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE,
                          graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
    for d in page.get_drawings():
        r = d["rect"]
        if d.get("color") and es_casillero(r, celdas):
            page.draw_rect(r + (-1.5, -1.5, 1.5, 1.5), color=None, fill=(1, 1, 1))

def a_transparente(pix):
    """Fondo blanco/gris claro -> transparente. Grises neutros pasan a negro con alfa
    (sobre blanco se ven idénticos); los colores (rojo, azul) quedan opacos."""
    w, h, src = pix.width, pix.height, pix.samples
    out = bytearray(w * h * 4)
    x0, y0, x1, y1 = w, h, -1, -1
    for i in range(w * h):
        r, g, b = src[3 * i], src[3 * i + 1], src[3 * i + 2]
        mx, mn = max(r, g, b), min(r, g, b)
        if mx - mn <= 18:
            a = (236 - (r + g + b) // 3) * 255 // 236
            a = 0 if a < 8 else min(a, 255)
            px = (0, 0, 0, a)
        else:
            a = 255
            px = (r, g, b, 255)
        out[4 * i:4 * i + 4] = bytes(px)
        if a:
            x, y = i % w, i // w
            if x < x0: x0 = x
            if x > x1: x1 = x
            if y < y0: y0 = y
            if y > y1: y1 = y
    return out, (x0, y0, x1, y1)

def main():
    os.makedirs(SALIDA, exist_ok=True)
    total = 0
    for archivo, tam, celdas in TAREAS:
        doc = pymupdf.open(os.path.join(FUENTES, archivo))
        page = doc[0]
        limpiar_pagina(page, tam, celdas)
        for ident, (x0, y0, x1, y1) in celdas.items():
            clip = pymupdf.Rect(x0 + 3, y0 + 3, x1 - 3, y1 - 3)
            pix = page.get_pixmap(dpi=DPI, clip=clip, alpha=False)
            datos, (a, b, c, d) = a_transparente(pix)
            if c < 0:
                sys.exit(f"ERROR: la celda {ident} quedó vacía")
            m = 6  # margen en píxeles
            a, b, c, d = max(a - m, 0), max(b - m, 0), min(c + m, pix.width - 1), min(d + m, pix.height - 1)
            filas = []
            for yy in range(b, d + 1):
                base = (yy * pix.width + a) * 4
                filas.append(datos[base: base + (c - a + 1) * 4])
            rec = pymupdf.Pixmap(pymupdf.csRGB, c - a + 1, d - b + 1, b"".join(filas), True)
            rec.save(os.path.join(SALIDA, f"{ident}.png"))
            total += 1
    print(f"OK {total} iconos en {SALIDA}")

if __name__ == "__main__":
    main()
```

- `js/catalogo.js` — los 65 ítems (59 con ícono).

`js/catalogo.js` — contenido literal:

```javascript
/* Catálogo de los checks de Posventa: textos e íconos tal cual los PDFs originales.
 * `etiqueta` es el nombre de la columna en el Sheet (única dentro de cada check).
 * `lineas` es el texto que se ve debajo del ícono, respetando los cortes de línea del PDF.
 * `img` es el archivo en img/ (lo genera tools/extraer_iconos.py); null = ítem sin ícono.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.CATALOGO = fabrica();
})(this, function () {
  function it(id, lineas, etiqueta) {
    return { id: id, lineas: lineas, etiqueta: etiqueta || lineas.join(' '), img: 'img/' + id + '.png' };
  }
  function proto(id, etiqueta, texto) {
    return { id: id, lineas: [], etiqueta: etiqueta, img: null, texto: texto };
  }

  return {
    checkin: {
      titulo: 'CHECK IN',
      hoja: 'Check In',
      secciones: [
        {
          id: 'checkin', tipo: 'grilla', columnas: 4, items: [
            it('ci_datos_cliente', ['Datos del cliente']),
            it('ci_nro_cono', ['Nro de Cono en OR']),
            it('ci_bocina_luces', ['Bocina', 'Luces - Escobillas']),
            it('ci_protecciones', ['Protecciones']),
            it('ci_chequeo_errores', ['Chequeo de Errores']),
            it('ci_combustible_km', ['Nivel de Combustible', 'y Km.']),
            it('ci_verificacion_ocular', ['Verificacion Ocular']),
            it('ci_apertura_capot', ['Apertura Capot']),
            it('ci_aceite_filtro', ['Mostrar Nivel de Aceite', 'y Filtro de Aire']),
            it('ci_manual_garantia', ['Manual de Garantía']),
            it('ci_baul', ['Baul /Caja de Carga']),
            it('ci_rueda_kit', ['Rueda de Auxilio', 'kit de Seguridad']),
            it('ci_objetos_valor', ['Objetos de Valor']),
            it('ci_trabajos_adicionales', ['Trabajos Adicionales']),
            it('ci_prueba_manejo', ['Prueba de Manejo']),
            it('ci_recall', ['Verificar Recall']),
            it('ci_explicacion_trabajos', ['Explicacion de', 'Trabajos a Realizar']),
            it('ci_lavado', ['Lavado']),
            it('ci_consult_bateria', ['Consult / Batería']),
            it('ci_venta_consultiva', ['Venta Consultiva'])
          ]
        },
        {
          id: 'ofrecemos', tipo: 'ofrecemos', titulo: 'OFRECEMOS', columnas: 3, items: [
            it('of_valor_servicio', ['Valor del Servicio']),
            it('of_formas_pago', ['Formas de Pago']),
            it('of_sala_espera', ['Cortesía Sala', 'de Espera']),
            it('of_hora_checkout', ['Hora del Check - Out']),
            it('of_tarjeta_checkin', ['Tarjeta Check In']),
            it('of_traslado', ['Traslado/Remis'])
          ]
        }
      ]
    },

    checkout: {
      titulo: 'CHECK OUT',
      hoja: 'Check Out',
      secciones: [
        {
          id: 'checkout', tipo: 'grilla', columnas: 4, items: [
            it('co_explicacion_realizados', ['Explicación de', 'Trabajos Realizados']),
            it('co_ticket_bateria', ['Ticket Bateria']),
            it('co_escaneo', ['Escaneo y Resultado']),
            it('co_asistencia_24x7', [], 'Asistencia Nissan 24x7'),
            it('co_repuestos_originales', ['Información de', 'Repuestos Originales']),
            it('co_garantia_servicio', ['Garantía de Servicio']),
            it('co_manual_sellado', ['Manual Sellado']),
            it('co_proximo_servicio', ['Info Próximo Servicio']),
            it('co_explicacion_factura', ['Explicación Factura']),
            it('co_tarjeta_checkout', ['Tarjeta Check Out']),
            it('co_encuesta_satisfaccion', ['Formulario Encuesta', 'de Satisfacción']),
            it('co_capot_abierto', ['Capot Abierto']),
            it('co_nivel_aceite', ['Nivel de Aceite']),
            it('co_piezas_sustituidas', ['Piezas Sustituidas', 'Evidencia']),
            it('co_luces', ['Luces']),
            it('co_baul_objetos', ['Baul - Caja', 'Objetos de Valor']),
            it('co_rueda_kit', ['Rueda de Auxilio', 'kit de Seguridad']),
            it('co_retiro_cono', ['Retiro de Cono', 'y Protecciones'])
          ]
        },
        {
          id: 'postentrega', tipo: 'postentrega', columnas: 3, items: [
            it('pe_reconfirmar_datos', ['Reconfirmar', 'Datos del cliente']),
            it('pe_llamado_acompanamiento', ['Llamado de', 'Acompañamiento']),
            it('pe_encuesta_nissan', ['Encuesta Nissan', 'Escala y Medio'])
          ]
        }
      ]
    },

    agendamiento: {
      titulo: 'AGENDAMIENTO',
      hoja: 'Agendamiento',
      secciones: [
        {
          id: 'protocolo-inicio', tipo: 'protocolo-inicio', items: [
            proto('ag_3er_ring', 'Atiende antes del 3er ring', 'SE ATIENDE EL LLAMADO ANTES DEL 3ER RING'),
            Object.assign(proto('ag_saludo', 'Saludo y nombre del cliente',
              '“ Buenos días/tardes mi nombre es (…). Con quién tengo el gusto de hablar? (Usar el nombre del cliente) en que puedo ayudarte? ”'),
              { titulo: 'SALUDO', nota: 'DURANTE TODA LA LLAMADA REFERIRSE AL CLIENTE POR SU NOMBRE' })
          ]
        },
        {
          id: 'agendamiento', tipo: 'grilla-roja', columnas: 3, items: [
            it('ag_datos_cliente', ['Datos del cliente']),
            it('ag_patente_km', ['Patente, Vehículo y Km.', 'Solicitar cédula del vehiculo', 'de ser necesario'], 'Patente, Vehículo y Km.'),
            it('ag_motivo', ['Motivo del turno', '(Servicio/Reparacion)', 'Trabajos adicionales', '(indagar)'], 'Motivo del turno y trabajos adicionales'),
            it('ag_recall', ['Verifica RECALL']),
            it('ag_opciones_horarios', ['Opciones de', 'días y horarios']),
            it('ag_explicacion', ['Explicacion detallada de los', 'trabajos a realizar']),
            it('ag_lavado', ['Lavado de cortesia']),
            it('ag_horario_entrega', ['Horario de entrega']),
            it('ag_formas_pago', ['Formas de pago']),
            it('ag_recordar_traer', ['Recordar traer:', 'Cedula del vehículo', 'Manual de mantenimiento', 'Llave tuercas antirrobo'], 'Recordar traer (cédula, manual, llave antirrobo)'),
            it('ag_objetos_valor', ['No dejar objetos de valor', 'en su vehiculo']),
            it('ag_traslado', ['Traslado/Remis'])
          ]
        },
        {
          id: 'protocolo-cierre', tipo: 'protocolo-cierre', items: [
            proto('ag_tiempo_15', 'Tiempo de recepción 15 minutos', '- Tiempo de recepcion 15 minutos.'),
            proto('ag_recordar_turno', 'Recordó día y hora del turno', '- Recordar al cliente el día y hora del turno antes de terminar el llamado.'),
            proto('ag_puntualidad', 'Reforzó la puntualidad', '- Reforzar la importancia de la puntualidad.'),
            proto('ag_despedida', 'Saludó y despidió por nombre', '- Saludar cordialmente por nombre y despedir al cliente.')
          ]
        }
      ]
    }
  };
});
```

- `tests/catalogo.test.js`

`tests/catalogo.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const CATALOGO = require('../js/catalogo.js');

const RAIZ = path.join(__dirname, '..');
const todos = (tipo) => CATALOGO[tipo].secciones.flatMap((s) => s.items);

test('cada check tiene la cantidad de ítems de los PDFs', () => {
  assert.strictEqual(todos('checkin').length, 26);      // 20 de la grilla + 6 de OFRECEMOS
  assert.strictEqual(todos('checkout').length, 21);     // 18 de la grilla + 3 de post entrega
  assert.strictEqual(todos('agendamiento').length, 18); // 2 de inicio + 12 de la grilla + 4 de cierre
});

test('ids únicos en todo el catálogo y etiquetas únicas dentro de cada check', () => {
  const ids = ['checkin', 'checkout', 'agendamiento'].flatMap((t) => todos(t).map((i) => i.id));
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const t of ['checkin', 'checkout', 'agendamiento']) {
    const et = todos(t).map((i) => i.etiqueta);
    assert.strictEqual(new Set(et).size, et.length, `etiqueta repetida en ${t}`);
    assert.ok(et.every((e) => e.trim().length > 0), `etiqueta vacía en ${t}`);
  }
});

test('cada ítem con ícono tiene su PNG RGBA en img/', () => {
  const conImg = ['checkin', 'checkout', 'agendamiento'].flatMap(todos).filter((i) => i.img);
  assert.strictEqual(conImg.length, 59);
  for (const i of conImg) {
    const f = path.join(RAIZ, i.img);
    assert.ok(fs.existsSync(f), `falta ${i.img}`);
    const b = fs.readFileSync(f);
    assert.strictEqual(b.subarray(1, 4).toString(), 'PNG', `${i.img} no es PNG`);
    assert.strictEqual(b[25], 6, `${i.img} no tiene canal alfa (RGBA)`);
    assert.ok(b.length > 1000, `${i.img} está casi vacío`);
  }
});
```

Después correr `npm run iconos` (≈ 40 s) para generar los 59 PNG en `img/`. Los PNG se commitean
(la página los sirve tal cual; el script no corre en GitHub Pages).

**Done when**
- [ ] WHEN se corre `npm run iconos` THE SYSTEM SHALL imprimir `OK 59 iconos en …` y salir con 0.
- [ ] WHEN se corre `npm test` THE SYSTEM SHALL pasar los 3 tests de `tests/catalogo.test.js` con 0 fallas.
- [ ] WHEN un ítem del catálogo apunta a un PNG inexistente o sin canal alfa THE SYSTEM SHALL fallar `npm test` nombrando el archivo.

**Verify**
```bash
npm run iconos                              # expect: "OK 59 iconos en …", exit 0
npm test                                    # expect: exit 0, "fail 0"
test "$(ls img/*.png | wc -l)" -eq 59       # expect: exit 0 (59 íconos = 59 ítems con img en el catálogo)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 1: catalogo e iconos"
git tag step-01-catalogo-iconos
```

---

#### Step 2 — Hojas, Config y GET

**Do**
Crear con **contenido literal**:
- `tests/gas-sim.js` — simulador de Apps Script para Node (carga todos los `apps-script/*.gs`).

`tests/gas-sim.js` — contenido literal:

```javascript
// Simulador mínimo de Google Apps Script para correr apps-script/*.gs en Node.
// Implementa sólo lo que usan esos archivos: SpreadsheetApp, LockService, ContentService,
// Utilities, Session, ScriptApp, Logger.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Los valores que llegan desde el contexto de los .gs se copian al contexto de los tests
// (igual que Sheets guarda sus propias copias): arrays y fechas comparables con assert.
function aHost(v) {
  return Object.prototype.toString.call(v) === '[object Date]' ? new Date(v.getTime()) : v;
}

class HojaFalsa {
  constructor(nombre) { this.nombre = nombre; this.datos = []; }
  getName() { return this.nombre; }
  getLastRow() { return this.datos.length; }
  getLastColumn() { return this.datos.reduce((m, f) => Math.max(m, f.length), 0); }
  appendRow(fila) { this.datos.push(Array.from(fila, aHost)); return this; }
  clear() { this.datos = []; return this; }
  setFrozenRows() { return this; }
  autoResizeColumns() { return this; }
  getRange(fila, col, nFilas, nCols) {
    const hoja = this;
    nFilas = nFilas || 1; nCols = nCols || 1;
    const rango = {
      getValues() {
        const out = [];
        for (let r = 0; r < nFilas; r++) {
          const f = hoja.datos[fila - 1 + r] || [];
          const linea = [];
          for (let c = 0; c < nCols; c++) { const v = f[col - 1 + c]; linea.push(v === undefined ? '' : v); }
          out.push(linea);
        }
        return out;
      },
      setValues(vals) {
        if (vals.length !== nFilas || vals.some((f) => f.length !== nCols)) {
          throw new Error(`setValues: se esperaban ${nFilas}x${nCols}`);
        }
        for (let r = 0; r < nFilas; r++) {
          while (hoja.datos.length < fila + r) hoja.datos.push([]);
          const f = hoja.datos[fila - 1 + r];
          for (let c = 0; c < nCols; c++) f[col - 1 + c] = aHost(vals[r][c]);
        }
        return rango;
      },
      setValue(v) { return rango.setValues([[v]]); },
      setFontWeight() { return rango; },
      setBackground() { return rango; },
      setFontColor() { return rango; },
      setNumberFormat() { return rango; },
    };
    return rango;
  }
}

class PlanillaFalsa {
  constructor() { this.hojas = []; }
  getSheetByName(n) { return this.hojas.find((h) => h.getName() === n) || null; }
  insertSheet(n) {
    if (this.getSheetByName(n)) throw new Error(`Ya existe una hoja llamada "${n}"`);
    const h = new HojaFalsa(n); this.hojas.push(h); return h;
  }
  getSheets() { return this.hojas.slice(); }
}

function cargarCodigo(opciones) {
  const planilla = new PlanillaFalsa();
  const disparadores = [];
  const ctx = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => planilla },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT' },
      createTextOutput(texto) {
        return { tipo: null, setMimeType(t) { this.tipo = t; return this; }, getContent: () => texto };
      },
    },
    Session: { getScriptTimeZone: () => 'America/Argentina/Buenos_Aires' },
    Utilities: {
      formatDate(fecha, zona, formato) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
          timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(fecha).map((x) => [x.type, x.value]));
        return formato.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day)
          .replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
      },
    },
    ScriptApp: {
      getProjectTriggers: () => disparadores.slice(),
      newTrigger(funcion) {
        const t = { funcion, getHandlerFunction: () => funcion };
        const b = { timeBased: () => b, everyHours: () => b, create: () => { disparadores.push(t); return t; } };
        return b;
      },
    },
  };
  vm.createContext(ctx);
  // Carga todos los .gs de apps-script/ (en Apps Script comparten el mismo ámbito global).
  const dir = (opciones && opciones.dir) || path.join(__dirname, '..', 'apps-script');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.gs')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, planilla, disparadores };
}

// Convierte la salida de doGet/doPost en objeto. Acepta JSON y JSONP.
function leerSalida(salida) {
  const texto = salida.getContent();
  const m = /^[A-Za-z_$][\w$]*\(([\s\S]*)\)$/.exec(texto);
  return JSON.parse(m ? m[1] : texto);
}

module.exports = { cargarCodigo, leerSalida, HojaFalsa, PlanillaFalsa };
```

- `apps-script/Hojas.gs` — constantes, creación idempotente de hojas, lectura de `Config`, `doGet`.

`apps-script/Hojas.gs` — contenido literal:

```javascript
/**
 * Kyoto Posventa — Hojas.gs: constantes, hojas, Config y GET.
 * Backend de los checks (Check In, Check Out, Agendamiento).
 * Script VINCULADO al Google Sheet (Extensiones → Apps Script). Se publica como aplicación web.
 *
 *   GET  ?accion=config[&callback=fn]  → sucursales y asesores activos de la hoja Config (JSON o JSONP)
 *   POST body JSON {accion:'guardar', ...} → agrega una fila en la hoja del check
 */

var HOJAS = { checkin: 'Check In', checkout: 'Check Out', agendamiento: 'Agendamiento' };
var HOJA_CONFIG = 'Config';
var HOJA_RESUMEN = 'Resumen';
var COL_ID = 'ID envío';

var FIJAS = {
  checkin: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID],
  checkout: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID],
  agendamiento: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Cliente', 'Patente', 'Fecha del turno', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID]
};

// Encabezado de columna → campo de payload.datos
var CAMPOS = { 'Sucursal': 'sucursal', 'Asesor': 'asesor', 'Nº OR': 'or', 'Patente': 'patente', 'Cliente': 'cliente', 'Fecha del turno': 'fechaTurno' };

var REQUERIDOS = {
  checkin: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
  checkout: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
  agendamiento: ['sucursal', 'asesor', 'cliente', 'patente', 'fechaTurno']
};

var SUCURSALES_INICIALES = ['KYOTO RESISTENCIA', 'KYOTO CORRIENTES', 'KYOTO POSADAS', 'KYOTO SAENZ PEÑA'];

// ───────────────────────── Hojas ─────────────────────────

function configurarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(HOJA_CONFIG);
  if (!config) {
    config = ss.insertSheet(HOJA_CONFIG);
    config.appendRow(['Sucursal', 'Asesor', 'Activo']);
    SUCURSALES_INICIALES.forEach(function (s) { config.appendRow([s, 'Asesor de prueba', 'SI']); });
    config.getRange(1, 1, 1, 3).setFontWeight('bold');
    config.setFrozenRows(1);
  }
  Object.keys(HOJAS).forEach(function (tipo) { hojaDeCheck_(tipo); });
  if (!ss.getSheetByName(HOJA_RESUMEN)) ss.insertSheet(HOJA_RESUMEN);
  return true;
}

function hojaDeCheck_(tipo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJAS[tipo]);
  if (!hoja) {
    hoja = ss.insertSheet(HOJAS[tipo]);
    hoja.appendRow(FIJAS[tipo]);
    hoja.getRange(1, 1, 1, FIJAS[tipo].length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function encabezados_(hoja) {
  var n = hoja.getLastColumn();
  return n ? hoja.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
}

// ───────────────────────── Config ─────────────────────────

function leerConfig_() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONFIG);
  var porSucursal = {};
  var orden = [];
  if (hoja && hoja.getLastRow() > 1) {
    hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues().forEach(function (f) {
      var suc = String(f[0]).trim();
      var ase = String(f[1]).trim();
      var activo = String(f[2]).trim().toUpperCase() !== 'NO';
      if (!suc) return;
      if (!porSucursal[suc]) { porSucursal[suc] = []; orden.push(suc); }
      if (ase && activo && porSucursal[suc].indexOf(ase) < 0) porSucursal[suc].push(ase);
    });
  }
  return orden.map(function (s) { return { nombre: s, asesores: porSucursal[s] }; });
}

// ───────────────────────── Web app ─────────────────────────

function doGet(e) {
  var p = (e && e.parameter) || {};
  var res;
  if (p.accion === 'config') {
    configurarHojas();
    res = { ok: true, sucursales: leerConfig_() };
  } else {
    res = { ok: false, error: 'accion desconocida' };
  }
  return responder_(res, p.callback);
}

function responder_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
```

- `tests/hojas.test.js`

`tests/hojas.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo } = require('./gas-sim.js');

test('configurarHojas crea Config, las 3 hojas de checks y Resumen', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const nombres = planilla.getSheets().map((h) => h.getName());
  for (const n of ['Config', 'Check In', 'Check Out', 'Agendamiento', 'Resumen']) assert.ok(nombres.includes(n), `falta ${n}`);
  assert.deepStrictEqual(planilla.getSheetByName('Config').datos[0], ['Sucursal', 'Asesor', 'Activo']);
  assert.deepStrictEqual(planilla.getSheetByName('Config').datos.slice(1).map((f) => f[0]),
    ['KYOTO RESISTENCIA', 'KYOTO CORRIENTES', 'KYOTO POSADAS', 'KYOTO SAENZ PEÑA']);
  assert.deepStrictEqual(planilla.getSheetByName('Check In').datos[0],
    ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'ID envío']);
  assert.deepStrictEqual(planilla.getSheetByName('Agendamiento').datos[0],
    ['Fecha/Hora', 'Sucursal', 'Asesor', 'Cliente', 'Patente', 'Fecha del turno', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'ID envío']);
});

test('configurarHojas es idempotente: correrlo dos veces no duplica hojas ni filas', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  ctx.configurarHojas();
  assert.strictEqual(planilla.getSheets().length, 5);
  assert.strictEqual(planilla.getSheetByName('Config').getLastRow(), 5);
  assert.strictEqual(planilla.getSheetByName('Check Out').getLastRow(), 1);
});
```

- `tests/config.test.js`

`tests/config.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

test('GET accion=config devuelve sucursales y asesores activos', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const cfg = planilla.getSheetByName('Config');
  cfg.appendRow(['KYOTO POSADAS', 'Ana Gómez', 'SI']);
  cfg.appendRow(['KYOTO POSADAS', 'Luis Pérez', 'NO']);
  const r = leerSalida(ctx.doGet({ parameter: { accion: 'config' } }));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.sucursales.length, 4);
  const pos = r.sucursales.find((s) => s.nombre === 'KYOTO POSADAS');
  assert.deepStrictEqual(pos.asesores, ['Asesor de prueba', 'Ana Gómez']);
});

test('GET con callback válido responde JSONP; con callback inválido responde JSON', () => {
  const { ctx } = cargarCodigo();
  const jsonp = ctx.doGet({ parameter: { accion: 'config', callback: 'cb_123' } });
  assert.match(jsonp.getContent(), /^cb_123\(\{.*\}\)$/s);
  assert.strictEqual(jsonp.tipo, 'JAVASCRIPT');
  const json = ctx.doGet({ parameter: { accion: 'config', callback: 'alert(1)//' } });
  assert.strictEqual(json.tipo, 'JSON');
  assert.strictEqual(JSON.parse(json.getContent()).ok, true);
});

test('GET con accion desconocida responde ok:false', () => {
  const { ctx } = cargarCodigo();
  const r = leerSalida(ctx.doGet({ parameter: { accion: 'borrar' } }));
  assert.deepStrictEqual(r, { ok: false, error: 'accion desconocida' });
});
```

**Done when**
- [ ] WHEN se llama `configurarHojas()` sobre un Sheet vacío THE SYSTEM SHALL crear `Config`, `Check In`, `Check Out`, `Agendamiento` y `Resumen` con los encabezados de §4.
- [ ] WHEN se llama `configurarHojas()` dos veces THE SYSTEM SHALL dejar 5 hojas y 5 filas en `Config` (encabezado + 4 sucursales).
- [ ] WHEN llega `GET ?accion=config` THE SYSTEM SHALL devolver las sucursales con sus asesores activos (los `Activo = NO` no aparecen).
- [ ] WHEN el `callback` no es un identificador válido THE SYSTEM SHALL responder JSON en vez de JSONP.

**Verify**
```bash
npm test        # expect: exit 0, "fail 0" (catalogo + hojas + config)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 2: hojas, config y get"
git tag step-02-hojas-config
```

---

#### Step 3 — Guardar (POST)

**Do**
Crear con **contenido literal** `apps-script/Guardar.gs` (validación §5, lock, deduplicación por
`ID envío`, columnas por encabezado) y `tests/guardar.test.js`.

`apps-script/Guardar.gs` — contenido literal:

```javascript
/**
 * Kyoto Posventa — Guardar.gs: POST que agrega un check a su hoja.
 */

function doPost(e) {
  var res;
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (p.accion !== 'guardar') throw new Error('accion desconocida');
    res = guardarCheck_(p);
  } catch (err) {
    res = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return responder_(res);
}

// ───────────────────────── Guardar ─────────────────────────

function validar_(p) {
  if (!HOJAS[p.tipo]) throw new Error('tipo de check desconocido');
  if (typeof p.idEnvio !== 'string' || p.idEnvio.length < 8 || p.idEnvio.length > 64) throw new Error('idEnvio inválido');
  var d = p.datos || {};
  REQUERIDOS[p.tipo].forEach(function (k) {
    if (!d[k] || !String(d[k]).trim()) throw new Error('falta el dato: ' + k);
  });
  var suc = leerConfig_().filter(function (s) { return s.nombre === d.sucursal; })[0];
  if (!suc || suc.asesores.indexOf(d.asesor) < 0) throw new Error('Asesor no habilitado para esa sucursal');
  if (!Array.isArray(p.items) || !p.items.length) throw new Error('el check no tiene ítems');
  var vistas = {};
  p.items.forEach(function (it) {
    if (!it || typeof it.etiqueta !== 'string' || !it.etiqueta.trim() || typeof it.ok !== 'boolean') throw new Error('ítem inválido');
    if (vistas[it.etiqueta]) throw new Error('ítem repetido: ' + it.etiqueta);
    vistas[it.etiqueta] = true;
  });
}

function guardarCheck_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    configurarHojas();
    validar_(p);
    var hoja = hojaDeCheck_(p.tipo);
    var enc = encabezados_(hoja);

    var colId = enc.indexOf(COL_ID);
    if (hoja.getLastRow() > 1) {
      var ids = hoja.getRange(2, colId + 1, hoja.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === p.idEnvio) return { ok: true, duplicado: true, fila: i + 2 };
      }
    }

    var nuevas = p.items.map(function (it) { return it.etiqueta; }).filter(function (et) { return enc.indexOf(et) < 0; });
    if (nuevas.length) {
      hoja.getRange(1, enc.length + 1, 1, nuevas.length).setValues([nuevas]).setFontWeight('bold');
      enc = enc.concat(nuevas);
    }

    var okCount = p.items.filter(function (it) { return it.ok; }).length;
    var fecha = new Date(p.creado);
    if (isNaN(fecha.getTime())) fecha = new Date();
    var fila = enc.map(function (h) {
      if (h === 'Fecha/Hora') return fecha;
      if (h === '% Cumplimiento') return Math.round(okCount * 100 / p.items.length);
      if (h === 'Ítems OK') return okCount;
      if (h === 'Ítems totales') return p.items.length;
      if (h === COL_ID) return p.idEnvio;
      if (CAMPOS[h]) return String(p.datos[CAMPOS[h]] || '').trim();
      return '';
    });
    p.items.forEach(function (it) { fila[enc.indexOf(it.etiqueta)] = it.ok ? 'SI' : 'NO'; });
    hoja.appendRow(fila);
    return { ok: true, duplicado: false, fila: hoja.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}
```

`tests/guardar.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

function post(ctx, cuerpo) {
  return leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(cuerpo) } }));
}
function base(extra) {
  return Object.assign({
    accion: 'guardar', tipo: 'checkin', idEnvio: 'envio-0001', creado: '2026-11-03T13:30:00.000Z',
    datos: { sucursal: 'KYOTO CORRIENTES', asesor: 'Asesor de prueba', or: '4521', patente: 'AB123CD', cliente: 'Juan Pérez' },
    items: [{ id: 'a', etiqueta: 'Datos del cliente', ok: true }, { id: 'b', etiqueta: 'Lavado', ok: false },
      { id: 'c', etiqueta: 'Protecciones', ok: true }, { id: 'd', etiqueta: 'Venta Consultiva', ok: true }],
  }, extra);
}

test('guardar agrega una fila con datos, SI/NO por ítem y % de cumplimiento', () => {
  const { ctx, planilla } = cargarCodigo();
  const r = post(ctx, base());
  assert.deepStrictEqual(r, { ok: true, duplicado: false, fila: 2 });
  const h = planilla.getSheetByName('Check In');
  const enc = h.datos[0];
  const fila = h.datos[1];
  const v = (col) => fila[enc.indexOf(col)];
  assert.strictEqual(v('Sucursal'), 'KYOTO CORRIENTES');
  assert.strictEqual(v('Nº OR'), '4521');
  assert.strictEqual(v('% Cumplimiento'), 75);
  assert.strictEqual(v('Ítems OK'), 3);
  assert.strictEqual(v('Ítems totales'), 4);
  assert.strictEqual(v('Lavado'), 'NO');
  assert.strictEqual(v('Datos del cliente'), 'SI');
  assert.strictEqual(v('ID envío'), 'envio-0001');
  assert.ok(v('Fecha/Hora') instanceof Date);
});

test('el mismo idEnvio dos veces deja una sola fila (reintento de la cola)', () => {
  const { ctx, planilla } = cargarCodigo();
  post(ctx, base());
  const r = post(ctx, base());
  assert.strictEqual(r.duplicado, true);
  assert.strictEqual(planilla.getSheetByName('Check In').getLastRow(), 2);
});

test('un ítem nuevo agrega su columna al final sin mover las anteriores', () => {
  const { ctx, planilla } = cargarCodigo();
  post(ctx, base());
  const p = base({ idEnvio: 'envio-0002' });
  p.items.push({ id: 'e', etiqueta: 'Ítem agregado después', ok: true });
  post(ctx, p);
  const h = planilla.getSheetByName('Check In');
  assert.strictEqual(h.datos[0][h.datos[0].length - 1], 'Ítem agregado después');
  assert.strictEqual(h.datos[2][h.datos[0].length - 1], 'SI');
  assert.strictEqual(h.datos[1][h.datos[0].indexOf('Lavado')], 'NO');
});

test('rechaza asesor fuera de Config, datos faltantes y tipo desconocido sin escribir filas', () => {
  const { ctx, planilla } = cargarCodigo();
  const malos = [
    base({ datos: Object.assign(base().datos, { asesor: 'Intruso' }) }),
    base({ datos: Object.assign(base().datos, { or: '' }) }),
    base({ tipo: 'lavadero' }),
    base({ items: [] }),
    base({ items: [{ id: 'a', etiqueta: 'X', ok: true }, { id: 'b', etiqueta: 'X', ok: false }] }),
  ];
  for (const m of malos) assert.strictEqual(post(ctx, m).ok, false);
  assert.strictEqual(post(ctx, { accion: 'otra' }).error, 'accion desconocida');
  assert.strictEqual(post(ctx, base({ idEnvio: 'corto' })).error, 'idEnvio inválido');
  assert.ok(ctx.doPost({ postData: { contents: '{no es json' } }).getContent().includes('"ok":false'));
  assert.strictEqual(planilla.getSheetByName('Check In').getLastRow(), 1);
});

test('agendamiento guarda Fecha del turno en su propia hoja', () => {
  const { ctx, planilla } = cargarCodigo();
  const r = post(ctx, base({ tipo: 'agendamiento', idEnvio: 'envio-ag-01',
    datos: { sucursal: 'KYOTO POSADAS', asesor: 'Asesor de prueba', cliente: 'Ana', patente: 'ABC123', fechaTurno: '2026-11-10' } }));
  assert.strictEqual(r.ok, true);
  const h = planilla.getSheetByName('Agendamiento');
  assert.strictEqual(h.datos[1][h.datos[0].indexOf('Fecha del turno')], '2026-11-10');
});
```

**Done when**
- [ ] WHEN llega un POST válido de `checkin` THE SYSTEM SHALL agregar exactamente 1 fila con `SI`/`NO` por ítem, `% Cumplimiento` = 75 para 3 de 4 ítems, y responder `{ok:true, duplicado:false, fila:2}`.
- [ ] WHEN llega dos veces el mismo `idEnvio` THE SYSTEM SHALL dejar una sola fila y responder `duplicado:true` la segunda vez.
- [ ] WHEN llega un ítem con etiqueta nueva THE SYSTEM SHALL agregar su columna al final sin mover las columnas existentes.
- [ ] WHEN el asesor no está activo en `Config`, falta un dato, el tipo es desconocido, no hay ítems o hay etiquetas repetidas THE SYSTEM SHALL responder `ok:false` y no escribir ninguna fila.

**Verify**
```bash
npm test        # expect: exit 0, "fail 0"
```

**Checkpoint**
```bash
git add -A && git commit -m "step 3: guardar"
git tag step-03-guardar
```

---

#### Step 4 — Resumen y disparador

**Do**
Crear con **contenido literal** `apps-script/Resumen.gs` y `tests/resumen.test.js`.

`apps-script/Resumen.gs` — contenido literal:

```javascript
/**
 * Kyoto Posventa — Resumen.gs: hoja Resumen, disparador horario y menú.
 */

// ───────────────────────── Resumen ─────────────────────────

function actualizarResumen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  configurarHojas();
  var tz = Session.getScriptTimeZone();
  var grupos = {};
  var fallas = {};

  Object.keys(HOJAS).forEach(function (tipo) {
    var hoja = ss.getSheetByName(HOJAS[tipo]);
    if (hoja.getLastRow() < 2) return;
    var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
    var enc = datos[0].map(String);
    var cF = enc.indexOf('Fecha/Hora'), cS = enc.indexOf('Sucursal'), cA = enc.indexOf('Asesor'), cP = enc.indexOf('% Cumplimiento');
    var inicioItems = enc.indexOf(COL_ID) + 1;
    for (var r = 1; r < datos.length; r++) {
      var f = datos[r];
      var fecha = f[cF] instanceof Date ? f[cF] : new Date(f[cF]);
      var mes = isNaN(fecha.getTime()) ? 'sin fecha' : Utilities.formatDate(fecha, tz, 'yyyy-MM');
      var clave = [mes, HOJAS[tipo], f[cS], f[cA]].join('|');
      if (!grupos[clave]) grupos[clave] = { mes: mes, check: HOJAS[tipo], suc: f[cS], ase: f[cA], n: 0, suma: 0 };
      grupos[clave].n++;
      grupos[clave].suma += Number(f[cP]) || 0;
      for (var c = inicioItems; c < enc.length; c++) {
        if (f[c] !== 'SI' && f[c] !== 'NO') continue;
        var k = HOJAS[tipo] + '|' + enc[c];
        if (!fallas[k]) fallas[k] = { check: HOJAS[tipo], item: enc[c], no: 0, total: 0 };
        fallas[k].total++;
        if (f[c] === 'NO') fallas[k].no++;
      }
    }
  });

  var filas = [['Mes', 'Check', 'Sucursal', 'Asesor', 'Cantidad', '% promedio']];
  Object.keys(grupos).map(function (k) { return grupos[k]; })
    .sort(function (a, b) {
      return a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : (a.check + a.suc + a.ase).localeCompare(b.check + b.suc + b.ase);
    })
    .forEach(function (g) { filas.push([g.mes, g.check, g.suc, g.ase, g.n, Math.round(g.suma / g.n)]); });

  filas.push(['', '', '', '', '', '']);
  filas.push(['Check', 'Ítem', 'Veces NO', 'Total', '% NO', '']);
  Object.keys(HOJAS).forEach(function (tipo) {
    Object.keys(fallas).map(function (k) { return fallas[k]; })
      .filter(function (x) { return x.check === HOJAS[tipo] && x.no > 0; })
      .sort(function (a, b) { return b.no - a.no || a.item.localeCompare(b.item); })
      .slice(0, 10)
      .forEach(function (x) { filas.push([x.check, x.item, x.no, x.total, Math.round(x.no * 100 / x.total), '']); });
  });

  var res = ss.getSheetByName(HOJA_RESUMEN);
  res.clear();
  res.getRange(1, 1, filas.length, 6).setValues(filas);
  res.getRange(1, 1, 1, 6).setFontWeight('bold');
  return filas.length;
}

// ───────────────────────── Instalación ─────────────────────────

function instalar() {
  configurarHojas();
  var existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'actualizarResumen'; });
  if (!existe) ScriptApp.newTrigger('actualizarResumen').timeBased().everyHours(1).create();
  actualizarResumen();
  return true;
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Posventa')
    .addItem('Actualizar resumen', 'actualizarResumen')
    .addItem('Configurar hojas', 'configurarHojas')
    .addToUi();
}
```

`tests/resumen.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo } = require('./gas-sim.js');

function guardar(ctx, id, creado, okLavado) {
  ctx.doPost({ postData: { contents: JSON.stringify({
    accion: 'guardar', tipo: 'checkout', idEnvio: id, creado,
    datos: { sucursal: 'KYOTO RESISTENCIA', asesor: 'Asesor de prueba', or: '1', patente: 'AB123CD', cliente: 'X' },
    items: [{ id: 'a', etiqueta: 'Lavado', ok: okLavado }, { id: 'b', etiqueta: 'Luces', ok: true }],
  }) } });
}

test('actualizarResumen agrupa por mes, check, sucursal y asesor con % promedio', () => {
  const { ctx, planilla } = cargarCodigo();
  guardar(ctx, 'envio-r-01', '2026-11-03T15:00:00.000Z', false); // 50 %
  guardar(ctx, 'envio-r-02', '2026-11-04T15:00:00.000Z', true);  // 100 %
  guardar(ctx, 'envio-r-03', '2026-10-20T15:00:00.000Z', true);  // otro mes
  ctx.actualizarResumen();
  const d = planilla.getSheetByName('Resumen').datos;
  assert.deepStrictEqual(d[0], ['Mes', 'Check', 'Sucursal', 'Asesor', 'Cantidad', '% promedio']);
  assert.deepStrictEqual(d[1], ['2026-11', 'Check Out', 'KYOTO RESISTENCIA', 'Asesor de prueba', 2, 75]);
  assert.deepStrictEqual(d[2], ['2026-10', 'Check Out', 'KYOTO RESISTENCIA', 'Asesor de prueba', 1, 100]);
  const i = d.findIndex((f) => f[0] === 'Check' && f[1] === 'Ítem');
  assert.ok(i > 0, 'falta el bloque de ítems que más fallan');
  assert.deepStrictEqual(d[i + 1], ['Check Out', 'Lavado', 1, 3, 33, '']);
});

test('instalar crea un solo disparador horario aunque se corra dos veces', () => {
  const { ctx, disparadores } = cargarCodigo();
  ctx.instalar();
  ctx.instalar();
  assert.strictEqual(disparadores.filter((t) => t.funcion === 'actualizarResumen').length, 1);
});
```

**Done when**
- [ ] WHEN se corre `actualizarResumen()` con 2 Check Out de noviembre (50 % y 100 %) y 1 de octubre THE SYSTEM SHALL escribir `['2026-11','Check Out','KYOTO RESISTENCIA','Asesor de prueba',2,75]` antes que la fila de `2026-10`.
- [ ] WHEN hay ítems en NO THE SYSTEM SHALL listarlos en el bloque `Check | Ítem | Veces NO | Total | % NO`, de mayor a menor.
- [ ] WHEN se corre `instalar()` dos veces THE SYSTEM SHALL tener un único disparador horario de `actualizarResumen`.

**Verify**
```bash
npm test        # expect: exit 0, "fail 0"
```

**Checkpoint**
```bash
git add -A && git commit -m "step 4: resumen y disparador"
git tag step-04-resumen
```

---

#### Step 5 — Lógica de la página + contrato con el Apps Script

**Do**
Crear con **contenido literal** `js/logica.js` (UMD: `window.Logica` / `require`),
`tests/logica.test.js` y `tests/contrato.test.js` (arma el envío con `logica.js` + `catalogo.js` y lo
manda a los `.gs` del simulador: prueba el contrato de §5 de punta a punta, para los 3 tipos).

`js/logica.js` — contenido literal:

```javascript
/* Lógica pura de los checks (sin DOM): validación, armado del envío y cola sin conexión.
 * Funciona en el navegador (window.Logica) y en Node (require) para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(this, function () {
  var REQUERIDOS = {
    checkin: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
    checkout: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
    agendamiento: ['sucursal', 'asesor', 'cliente', 'patente', 'fechaTurno']
  };
  var NOMBRES = { sucursal: 'Sucursal', asesor: 'Asesor', or: 'Nº de OR', patente: 'Patente', cliente: 'Cliente', fechaTurno: 'Fecha del turno' };

  function normalizarPatente(s) {
    return String(s || '').toUpperCase().replace(/[\s.\-]/g, '');
  }

  // Patentes argentinas: AAA123 (vieja) o AA123BB (Mercosur).
  function patenteValida(s) {
    return /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(normalizarPatente(s));
  }

  function validarDatos(tipo, datos) {
    var errores = [];
    if (!REQUERIDOS[tipo]) return ['Tipo de check desconocido'];
    REQUERIDOS[tipo].forEach(function (k) {
      if (!datos || !String(datos[k] || '').trim()) errores.push('Falta: ' + NOMBRES[k]);
    });
    if (datos && String(datos.patente || '').trim() && !patenteValida(datos.patente)) {
      errores.push('Patente inválida (ej.: AB123CD o ABC123)');
    }
    return errores;
  }

  function itemsDe(catalogo, tipo) {
    var out = [];
    catalogo[tipo].secciones.forEach(function (sec) { sec.items.forEach(function (i) { out.push(i); }); });
    return out;
  }

  function porcentaje(items) {
    if (!items.length) return 0;
    var ok = items.filter(function (i) { return i.ok; }).length;
    return Math.round(ok * 100 / items.length);
  }

  function nuevoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // marcados: objeto { idItem: true }
  function construirPayload(tipo, datos, marcados, catalogo, idEnvio, ahora) {
    var d = {};
    REQUERIDOS[tipo].forEach(function (k) { d[k] = String(datos[k] || '').trim(); });
    d.patente = normalizarPatente(d.patente);
    return {
      accion: 'guardar',
      tipo: tipo,
      idEnvio: idEnvio,
      creado: (ahora || new Date()).toISOString(),
      datos: d,
      items: itemsDe(catalogo, tipo).map(function (i) {
        return { id: i.id, etiqueta: i.etiqueta, ok: !!marcados[i.id] };
      })
    };
  }

  // Cola de envíos pendientes guardada en localStorage (o cualquier objeto con getItem/setItem).
  function crearCola(almacen, clave) {
    clave = clave || 'posventa_cola';
    function leer() {
      try { var v = JSON.parse(almacen.getItem(clave) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    function escribir(lista) { almacen.setItem(clave, JSON.stringify(lista)); }
    return {
      listar: leer,
      tamano: function () { return leer().length; },
      agregar: function (p) {
        var l = leer().filter(function (x) { return x.idEnvio !== p.idEnvio; });
        l.push(p); escribir(l);
      },
      quitar: function (id) { escribir(leer().filter(function (x) { return x.idEnvio !== id; })); }
    };
  }

  // enviar(payload) → Promise<{ok, error?}>; si rechaza (sin red) se corta y queda pendiente.
  function enviarPendientes(cola, enviar) {
    var resultado = { enviados: 0, rechazados: [], pendientes: 0 };
    var lista = cola.listar();
    var i = 0;
    function siguiente() {
      if (i >= lista.length) { resultado.pendientes = cola.tamano(); return Promise.resolve(resultado); }
      var p = lista[i++];
      return enviar(p).then(function (r) {
        if (r && r.ok) { resultado.enviados++; cola.quitar(p.idEnvio); }
        else { resultado.rechazados.push({ idEnvio: p.idEnvio, error: (r && r.error) || 'respuesta inválida' }); cola.quitar(p.idEnvio); }
        return siguiente();
      }, function () {
        resultado.pendientes = cola.tamano();
        return resultado;
      });
    }
    return siguiente();
  }

  return {
    REQUERIDOS: REQUERIDOS,
    normalizarPatente: normalizarPatente,
    patenteValida: patenteValida,
    validarDatos: validarDatos,
    itemsDe: itemsDe,
    porcentaje: porcentaje,
    nuevoId: nuevoId,
    construirPayload: construirPayload,
    crearCola: crearCola,
    enviarPendientes: enviarPendientes
  };
});
```

`tests/logica.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const CATALOGO = require('../js/catalogo.js');

function almacen() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

test('patentes: normaliza y valida formatos vieja y Mercosur', () => {
  assert.strictEqual(L.normalizarPatente(' ab 123-cd '), 'AB123CD');
  assert.ok(L.patenteValida('ab123cd'));
  assert.ok(L.patenteValida('ABC 123'));
  assert.ok(!L.patenteValida('A1B2C3'));
});

test('validarDatos exige los campos de cada tipo', () => {
  assert.deepStrictEqual(L.validarDatos('checkin', { sucursal: 'S', asesor: 'A', or: '1', patente: 'AB123CD', cliente: 'C' }), []);
  assert.ok(L.validarDatos('checkin', { sucursal: 'S', asesor: 'A', patente: 'AB123CD', cliente: 'C' }).includes('Falta: Nº de OR'));
  assert.ok(L.validarDatos('agendamiento', { sucursal: 'S', asesor: 'A', patente: 'AB123CD', cliente: 'C' }).includes('Falta: Fecha del turno'));
  assert.ok(L.validarDatos('checkout', { sucursal: 'S', asesor: 'A', or: '1', patente: 'XX', cliente: 'C' }).some((e) => e.startsWith('Patente inválida')));
});

test('construirPayload incluye todos los ítems del catálogo en orden, marcados o no', () => {
  const p = L.construirPayload('checkin', { sucursal: 'S', asesor: 'A', or: '9', patente: 'ab 123 cd', cliente: 'C' },
    { ci_lavado: true }, CATALOGO, 'envio-0009', new Date('2026-11-03T10:00:00Z'));
  assert.strictEqual(p.items.length, 26);
  assert.strictEqual(p.items[0].id, 'ci_datos_cliente');
  assert.strictEqual(p.items.find((i) => i.id === 'ci_lavado').ok, true);
  assert.strictEqual(p.items.filter((i) => i.ok).length, 1);
  assert.strictEqual(p.datos.patente, 'AB123CD');
  assert.strictEqual(p.creado, '2026-11-03T10:00:00.000Z');
  assert.strictEqual(L.porcentaje(p.items), 4);
});

test('cola: agregar sin duplicar, enviar y quitar; sin red queda pendiente', async () => {
  const cola = L.crearCola(almacen());
  cola.agregar({ idEnvio: 'a1' }); cola.agregar({ idEnvio: 'a1' }); cola.agregar({ idEnvio: 'b2' });
  assert.strictEqual(cola.tamano(), 2);
  const sinRed = await L.enviarPendientes(cola, () => Promise.reject(new Error('offline')));
  assert.deepStrictEqual(sinRed, { enviados: 0, rechazados: [], pendientes: 2 });
  const r = await L.enviarPendientes(cola, (p) => Promise.resolve(p.idEnvio === 'a1'
    ? { ok: true } : { ok: false, error: 'Asesor no habilitado para esa sucursal' }));
  assert.strictEqual(r.enviados, 1);
  assert.deepStrictEqual(r.rechazados, [{ idEnvio: 'b2', error: 'Asesor no habilitado para esa sucursal' }]);
  assert.strictEqual(cola.tamano(), 0);
});
```

`tests/contrato.test.js` — contenido literal:

```javascript
'use strict';
// Contrato página ↔ Apps Script: lo que arma js/logica.js lo acepta apps-script/*.gs.
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const CATALOGO = require('../js/catalogo.js');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

const DATOS = {
  checkin: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', or: '777', patente: 'AC456BD', cliente: 'María' },
  checkout: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', or: '777', patente: 'AC456BD', cliente: 'María' },
  agendamiento: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', cliente: 'María', patente: 'AC456BD', fechaTurno: '2026-11-12' },
};

for (const tipo of Object.keys(DATOS)) {
  test(`el payload de ${tipo} se guarda con una columna por ítem del catálogo`, () => {
    const { ctx, planilla } = cargarCodigo();
    const marcados = Object.fromEntries(L.itemsDe(CATALOGO, tipo).map((i) => [i.id, true]));
    const p = L.construirPayload(tipo, DATOS[tipo], marcados, CATALOGO, L.nuevoId());
    const r = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
    assert.strictEqual(r.ok, true, r.error);
    const h = planilla.getSheetByName(CATALOGO[tipo].hoja);
    for (const it of L.itemsDe(CATALOGO, tipo)) {
      assert.strictEqual(h.datos[1][h.datos[0].indexOf(it.etiqueta)], 'SI', it.etiqueta);
    }
    assert.strictEqual(h.datos[1][h.datos[0].indexOf('% Cumplimiento')], 100);
  });
}
```

**Done when**
- [ ] WHEN se normaliza `' ab 123-cd '` THE SYSTEM SHALL devolver `AB123CD`, y `A1B2C3` SHALL ser patente inválida.
- [ ] WHEN se arma el envío de un Check In con 1 ítem tildado THE SYSTEM SHALL incluir los 26 ítems en orden de catálogo y dar 4 % de cumplimiento.
- [ ] WHEN la cola intenta enviar sin red THE SYSTEM SHALL dejar los envíos pendientes; WHEN el servidor rechaza uno THE SYSTEM SHALL sacarlo de la cola y reportar su error.
- [ ] WHEN un envío completo de cada tipo llega a los `.gs` THE SYSTEM SHALL guardarlo con `SI` en la columna de cada ítem del catálogo y `% Cumplimiento` = 100.

**Verify**
```bash
npm test        # expect: exit 0, "fail 0"
```

**Checkpoint**
```bash
git add -A && git commit -m "step 5: logica y contrato"
git tag step-05-logica
```

---

#### Step 6 — Vista: HTML de los checks

**Do**
Escribir `js/vista.js` (UMD: `window.Vista` / `require`) cumpliendo **exactamente** el contrato de
la tabla de §6 (*Component hierarchy*). Sin DOM: sólo funciones que devuelven strings; todo texto del
catálogo pasa por `esc()`. Crear con **contenido literal** `tests/vista.test.js`:

`tests/vista.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const V = require('../js/vista.js');
const CATALOGO = require('../js/catalogo.js');

const cuenta = (html, s) => html.split(s).length - 1;
const todos = (tipo) => CATALOGO[tipo].secciones.flatMap((s) => s.items);

test('htmlCheck dibuja un casillero por ítem del catálogo', () => {
  const esperados = { checkin: 26, checkout: 21, agendamiento: 18 };
  for (const [tipo, n] of Object.entries(esperados)) {
    const html = V.htmlCheck(tipo, CATALOGO);
    assert.strictEqual(cuenta(html, 'class="casillero"'), n, tipo);
    for (const it of todos(tipo)) assert.ok(html.includes(`data-item="${it.id}"`), `${tipo}: falta ${it.id}`);
    assert.ok(html.includes(`<h2 class="pestana">${CATALOGO[tipo].titulo}</h2>`), `${tipo}: falta la pestaña negra`);
  }
});

test('cada sección especial tiene su contenedor', () => {
  const ci = V.htmlCheck('checkin', CATALOGO);
  assert.ok(ci.includes('class="grilla grilla--4"'));
  assert.ok(ci.includes('class="ofrecemos"') && ci.includes('class="ofrecemos__titulo">OFRECEMOS<'));
  const co = V.htmlCheck('checkout', CATALOGO);
  assert.ok(co.includes('class="grilla grilla--3 postentrega"'));
  const ag = V.htmlCheck('agendamiento', CATALOGO);
  assert.ok(ag.includes('class="grilla grilla--3 grilla--roja"'));
  assert.ok(ag.includes('class="protocolo protocolo--inicio"') && ag.includes('class="protocolo protocolo--cierre"'));
  assert.ok(ag.includes('>SALUDO<') && ag.includes('DURANTE TODA LA LLAMADA REFERIRSE AL CLIENTE POR SU NOMBRE'));
});

test('los íconos usan la imagen del catálogo y las etiquetas respetan los cortes del PDF', () => {
  const ci = V.htmlCheck('checkin', CATALOGO);
  assert.ok(ci.includes('src="img/ci_rueda_kit.png"'));
  assert.ok(ci.includes('Rueda de Auxilio<br>kit de Seguridad'));
  assert.ok(ci.includes('aria-label="Rueda de Auxilio kit de Seguridad"'));
});

test('escapa HTML en los textos', () => {
  const falso = { x: { titulo: 'X', secciones: [{ id: 's', tipo: 'grilla', columnas: 4, items: [
    { id: 'x1', lineas: ['<b>hola</b> & "chau"'], etiqueta: '<b>', img: 'img/x1.png' }] }] } };
  const html = V.htmlCheck('x', falso);
  assert.ok(html.includes('&lt;b&gt;hola&lt;/b&gt; &amp; &quot;chau&quot;'));
  assert.ok(!html.includes('<b>hola'));
});

test('htmlDatos muestra los campos de cada tipo', () => {
  const suc = [{ nombre: 'KYOTO POSADAS', asesores: ['Ana'] }];
  const ci = V.htmlDatos('checkin', suc);
  for (const n of ['sucursal', 'asesor', 'or', 'patente', 'cliente']) assert.ok(ci.includes(`name="${n}"`), n);
  assert.ok(!ci.includes('name="fechaTurno"'));
  const ag = V.htmlDatos('agendamiento', suc);
  assert.ok(ag.includes('name="fechaTurno"') && ag.includes('type="date"'));
  assert.ok(!ag.includes('name="or"'));
  assert.ok(ci.includes('<option value="KYOTO POSADAS">KYOTO POSADAS</option>'));
});

test('opcionesAsesores y textoProgreso', () => {
  const suc = [{ nombre: 'A', asesores: ['Ana', 'Luis'] }, { nombre: 'B', asesores: [] }];
  const op = V.opcionesAsesores(suc, 'A');
  assert.strictEqual(cuenta(op, '<option'), 3);
  assert.ok(op.startsWith('<option value="" disabled selected>'));
  assert.ok(V.opcionesAsesores(suc, 'B').includes('Sin asesores cargados'));
  assert.strictEqual(V.textoProgreso(12, 26), '12 / 26 · 46 %');
  assert.strictEqual(V.textoProgreso(0, 0), '0 / 0 · 0 %');
});
```

**Done when**
- [ ] WHEN se dibuja cada check THE SYSTEM SHALL generar 26 / 21 / 18 `input.casillero` y un `data-item` por cada id del catálogo.
- [ ] WHEN se dibuja Check In THE SYSTEM SHALL incluir el bloque `.ofrecemos` con su título; Check Out el `.postentrega`; Agendamiento la `.grilla--roja`, los dos bloques de protocolo y el texto "DURANTE TODA LA LLAMADA…".
- [ ] WHEN un texto trae `<`, `&` o `"` THE SYSTEM SHALL escaparlo.
- [ ] WHEN se pide `textoProgreso(12, 26)` THE SYSTEM SHALL devolver `12 / 26 · 46 %`.

**Verify**
```bash
npm test        # expect: exit 0, "fail 0"
```

**Checkpoint**
```bash
git add -A && git commit -m "step 6: vista"
git tag step-06-vista
```

---

#### Step 7 — Página y estilos

**Do**
- `index.html`: `<html lang="es">`, `<meta charset="utf-8">`,
  `<meta name="viewport" content="width=device-width, initial-scale=1">`, título "Posventa · Kyoto
  Nissan", el `<link>` de Google Fonts de §7 y `<link rel="stylesheet" href="css/estilos.css">`.
  Cuerpo, en este orden: `header.encabezado` · `<nav class="solapas" aria-label="Áreas">` con un
  botón activo `POSVENTA` · `<nav class="subsolapas" aria-label="Checks de posventa">` con tres
  `<button type="button" class="subsolapa" data-tipo="checkin|checkout|agendamiento">` ·
  `<div id="avisos" aria-live="polite"></div>` · `<main id="app"></main>` ·
  `<footer class="barra-guardar">` con `<span id="progreso"></span>` y
  `<button type="button" id="guardar">` · `<div class="confirmacion" hidden>` · y al final, en este
  orden exacto y sin atributos extra:
  `<script src="js/catalogo.js"></script>` `<script src="js/logica.js"></script>`
  `<script src="js/vista.js"></script>` `<script src="js/config.js"></script>`
  `<script src="js/app.js"></script>`. Crear también `js/app.js` vacío (sólo un comentario) para que
  la página cargue sin 404; se completa en el paso 8.
- `css/estilos.css`: todo §7 — tokens en `:root`, grillas, celdas, casillero, OFRECEMOS,
  post-entrega, grilla roja, protocolo, `.barra-guardar` fija abajo, `.confirmacion`, `@media
  (max-width: 700px)`, `@media (prefers-reduced-motion: reduce)` y `:focus-visible`.
- `js/config.js`: exactamente
  `window.POSVENTA_CONFIG = { ENDPOINT: 'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT' };`
- Crear con **contenido literal** `tests/pagina.test.js`:

`tests/pagina.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('index.html carga los scripts en orden y tiene la estructura de solapas', () => {
  const html = leer('index.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<link rel="stylesheet" href="css\/estilos\.css">/);
  const scripts = [...html.matchAll(/<script src="js\/(\w+)\.js"><\/script>/g)].map((m) => m[1]);
  assert.deepStrictEqual(scripts, ['catalogo', 'logica', 'vista', 'config', 'app']);
  assert.match(html, /<nav class="solapas"[^>]*>[\s\S]*POSVENTA[\s\S]*<\/nav>/);
  for (const t of ['checkin', 'checkout', 'agendamiento']) {
    assert.match(html, new RegExp(`<button[^>]*class="subsolapa"[^>]*data-tipo="${t}"`), `falta la sub-solapa ${t}`);
  }
  assert.match(html, /<main id="app"/);
  assert.match(html, /<div id="avisos" aria-live="polite"/);
});

test('estilos.css define los colores del PDF y las grillas', () => {
  const css = leer('css/estilos.css');
  for (const [token, hex] of [['--negro', '#231F20'], ['--rojo-pdf', '#FD0100'], ['--rojo-nissan', '#C3002F']]) {
    assert.match(css, new RegExp(`${token}:\\s*${hex}`, 'i'), `falta ${token}`);
  }
  for (const sel of ['.pestana', '.grilla--4', '.grilla--3', '.celda', '.casillero', '.ofrecemos__titulo',
    '.postentrega', '.grilla--roja', '.protocolo__item', '.barra-guardar']) {
    assert.ok(css.includes(sel), `falta el selector ${sel}`);
  }
  assert.match(css, /dashed/);
  assert.match(css, /dotted/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /:focus-visible/);
});

test('config.js expone POSVENTA_CONFIG.ENDPOINT', () => {
  const ventana = {};
  new Function('window', leer('js/config.js'))(ventana);
  assert.strictEqual(typeof ventana.POSVENTA_CONFIG.ENDPOINT, 'string');
});
```

**Done when**
- [ ] WHEN se corre `npm test` THE SYSTEM SHALL pasar `pagina.test.js` (estructura, orden de scripts, tokens de color, selectores, media query) y todos los anteriores.
- [ ] WHEN se sirve la carpeta por HTTP THE SYSTEM SHALL responder 200 a `/index.html`, `/css/estilos.css` y `/img/ci_nro_cono.png`, y el HTML servido SHALL contener `class="subsolapa"`.

**Verify**
```bash
npm test                                                     # expect: exit 0, "fail 0"
python - <<'PY'                              # levanta un servidor, prueba 3 URLs y lo cierra
import functools, http.server, threading, urllib.request
class Silencioso(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Silencioso, directory='.'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
try:
    for ruta in ['/index.html', '/css/estilos.css', '/img/ci_nro_cono.png']:
        assert urllib.request.urlopen('http://127.0.0.1:8765' + ruta).status == 200, ruta
    assert b'class="subsolapa"' in urllib.request.urlopen('http://127.0.0.1:8765/index.html').read()
    print('OK pagina servida')
finally:
    srv.shutdown()
    srv.server_close()
PY
# expect: "OK pagina servida", exit 0. (No usar "python -m http.server &" + kill: en Git Bash kill no cierra python.exe.)
```

**Checkpoint**
```bash
git add -A && git commit -m "step 7: pagina y estilos"
git tag step-07-pagina
```

---

#### Step 8 — app.js: config, sub-solapas y tildado

**Do**
Completar `js/app.js` (IIFE, `'use strict'`, usa `window.CATALOGO`, `window.Logica`, `window.Vista`,
`window.POSVENTA_CONFIG`):
1. **Config por JSONP**: crear `<script src="{ENDPOINT}?accion=config&callback=__posventaCfg{n}">`
   con timeout de 10 s. OK → guardar `{ guardado, sucursales }` en `localStorage['posventa_config']`.
   Falla → usar la caché; sin caché → aviso de §6 con Reintentar.
2. **Sub-solapas**: leer `location.hash` (`#checkin` por defecto); escuchar `hashchange`; marcar la
   `.subsolapa` activa; dibujar `Vista.htmlDatos(tipo, sucursales)` + `Vista.htmlCheck(tipo, CATALOGO)`
   dentro de `<div class="hoja">` en `main#app`; restaurar datos y tildes guardados en memoria para
   ese tipo; cambiar el texto del botón (§7).
3. **Sucursal → asesores**: al cambiar `select[name=sucursal]`, llenar `select[name=asesor]` con
   `Vista.opcionesAsesores`. Preseleccionar desde `localStorage['posventa_ultimo']`.
4. **Tildado**: en `change` de un `.casillero`, actualizar `marcados`, la clase `celda--ok` de su
   `<label>` y `#progreso` con `Vista.textoProgreso`.
5. Todo acceso a `localStorage` dentro de `try/catch`.

Crear con **contenido literal** `tests/app-config.test.js`:

`tests/app-config.test.js` — contenido literal:

```javascript
'use strict';
// Chequeos estáticos de js/app.js (el código que toca el DOM se prueba a mano en §20.1).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

test('app.js es JavaScript válido', () => {
  assert.doesNotThrow(() => new vm.Script(src, { filename: 'app.js' }));
});

test('app.js lee la config de sucursales por JSONP y la guarda en caché', () => {
  for (const s of ['accion=config', 'callback=', 'posventa_config', 'posventa_ultimo', 'hashchange',
    'Vista.htmlCheck', 'Vista.htmlDatos', 'Vista.opcionesAsesores', 'Vista.textoProgreso']) {
    assert.ok(src.includes(s), `app.js no contiene ${s}`);
  }
});
```

**Done when**
- [ ] WHEN se corre `npm test` THE SYSTEM SHALL pasar `app-config.test.js` (app.js parsea y usa JSONP, caché, `hashchange` y las 4 funciones de `Vista`) y todos los anteriores.
- [ ] WHEN `js/app.js` tiene un error de sintaxis THE SYSTEM SHALL fallar `node --check js/app.js` y `app-config.test.js`.
- [ ] WHEN `js/app.js` deja de usar alguna de las 4 funciones de `Vista` o la caché `posventa_config` THE SYSTEM SHALL fallar `app-config.test.js` nombrando la que falta.

**Verify**
```bash
npm test                    # expect: exit 0, "fail 0"
node --check js/app.js      # expect: exit 0
```

**Checkpoint**
```bash
git add -A && git commit -m "step 8: app config y tildado"
git tag step-08-app-config
```

---

#### Step 9 — app.js: guardar, cola sin conexión y confirmación

**Do**
Completar `js/app.js`:
1. Si `POSVENTA_CONFIG.ENDPOINT === 'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT'` → aviso de §6 y botón
   Guardar deshabilitado.
2. **Guardar**: `Logica.validarDatos(tipo, datos)`; con errores → listarlos en `#avisos` y enfocar
   el primer campo. Sin errores → `Logica.construirPayload(tipo, datos, marcados, CATALOGO,
   Logica.nuevoId(), new Date())` → `cola.agregar(payload)` (cola = `Logica.crearCola(localStorage)`)
   → `Logica.enviarPendientes(cola, enviar)` → mostrar el overlay según el resultado (§6).
3. `enviar(p)` = `fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(p) }).then(r => r.json())`.
   **No** poner `headers` ni mencionar ese encabezado en el código ni en comentarios
   (`tests/app-envio.test.js` lo controla): sin él el pedido es "simple" y no hay preflight CORS.
4. Overlay `.confirmacion` con botón **Cargar otro**: limpia `marcados`, `or`, `patente`,
   `cliente`, `fechaTurno` del tipo actual; conserva sucursal y asesor; guarda
   `posventa_ultimo`.
5. Pendientes: al cargar la página, en `window.addEventListener('online', …)` y cada 60 s llamar
   `enviarPendientes`; si quedan, aviso "N checks pendientes de envío" con Reintentar.

Crear con **contenido literal** `tests/app-envio.test.js`:

`tests/app-envio.test.js` — contenido literal:

```javascript
'use strict';
// Chequeos estáticos del envío en js/app.js (el flujo real se prueba a mano en §20.1).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

test('app.js guarda con la lógica probada y la cola sin conexión', () => {
  for (const s of ['Logica.validarDatos', 'Logica.construirPayload', 'Logica.nuevoId', 'Logica.crearCola',
    'Logica.enviarPendientes', "method: 'POST'", "addEventListener('online'", 'Cargar otro',
    'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT']) {
    assert.ok(src.includes(s), `app.js no contiene ${s}`);
  }
});

test('el POST no manda Content-Type (pedido simple, sin preflight CORS)', () => {
  assert.ok(!/content-type/i.test(src), 'app.js no debe fijar Content-Type en el fetch');
});
```

**Done when**
- [ ] WHEN se corre `npm test` THE SYSTEM SHALL pasar `app-envio.test.js` y todos los anteriores.
- [ ] WHEN `js/app.js` fija un `Content-Type` THE SYSTEM SHALL fallar `npm test`.
- [ ] WHEN `js/app.js` no usa `Logica.crearCola` / `Logica.enviarPendientes` o no escucha `online` THE SYSTEM SHALL fallar `app-envio.test.js`.
(El guardado contra un Sheet real se prueba en la puesta en marcha, §20.1 — necesita la cuenta de Google del usuario.)

**Verify**
```bash
npm test                    # expect: exit 0, "fail 0"
node --check js/app.js      # expect: exit 0
```

**Checkpoint**
```bash
git add -A && git commit -m "step 9: guardar y cola"
git tag step-09-guardar-cola
```

---

#### Step 10 — Instalación y publicación

**Do**
- `INSTALACION.md` en castellano rioplatense, con estas 6 secciones exactas y los pasos de §12:
  `## 1. Crear el Sheet`, `## 2. Pegar el Apps Script`, `## 3. Publicar como aplicación web`,
  `## 4. Configurar la página`, `## 5. Publicar en GitHub Pages`, `## 6. Cargar asesores`.
- `README.md`: qué es, link a INSTALACION.md, cómo correr `npm test` y `npm run servir`, y cómo
  agregar un ítem (resumen de la skill `agregar-check-item`).
- Crear con **contenido literal** `tests/publicacion.test.js`:

`tests/publicacion.test.js` — contenido literal:

```javascript
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('ENDPOINT es el marcador o una URL de Apps Script /exec', () => {
  const ventana = {};
  new Function('window', leer('js/config.js'))(ventana);
  const url = ventana.POSVENTA_CONFIG.ENDPOINT;
  assert.ok(url === 'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT' ||
    /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url), `ENDPOINT inválido: ${url}`);
});

test('todo archivo local que referencia index.html existe', () => {
  const html = leer('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 6);
  for (const r of refs) assert.ok(fs.existsSync(path.join(RAIZ, r)), `no existe ${r}`);
});

test('INSTALACION.md tiene los 6 pasos de puesta en marcha', () => {
  const md = leer('INSTALACION.md');
  for (const h of ['## 1. Crear el Sheet', '## 2. Pegar el Apps Script', '## 3. Publicar como aplicación web',
    '## 4. Configurar la página', '## 5. Publicar en GitHub Pages', '## 6. Cargar asesores']) {
    assert.ok(md.includes(h), `falta la sección "${h}"`);
  }
});

test('los íconos pesan menos de 3 MB en total', () => {
  const dir = path.join(RAIZ, 'img');
  const total = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 3 * 1024 * 1024, `img/ pesa ${total} bytes`);
});
```

**Done when**
- [ ] WHEN se corre `npm test` THE SYSTEM SHALL pasar los 12 archivos de test con 0 fallas.
- [ ] WHEN `js/config.js` tiene una URL que no es `https://script.google.com/macros/s/<id>/exec` ni el marcador THE SYSTEM SHALL fallar `publicacion.test.js`.
- [ ] WHEN `index.html` referencia un archivo local inexistente THE SYSTEM SHALL fallar `publicacion.test.js` nombrándolo.

**Verify**
```bash
npm test                                   # expect: exit 0, "fail 0"
test "$(ls tests/*.test.js | wc -l)" -eq 12  # expect: exit 0 — catalogo, hojas, config, guardar, resumen, logica, contrato, vista, pagina, app-config, app-envio, publicacion
```

**Checkpoint**
```bash
git add -A && git commit -m "step 10: instalacion y publicacion"
git tag step-10-publicacion
```

### 9.1 Parity and cutover
NOT APPLICABLE — greenfield build, no system is being replaced. (El check en papel sigue existiendo;
no hay datos que migrar.)

## 10. Environment Setup

### Prerequisites
| Herramienta | Versión | Comprobar |
|---|---|---|
| Git for Windows (Git Bash) | la instalada (2.53.0 en la PC) | `git --version` |
| Node.js | 22 o mayor (24.15.0 en la PC) | `node --version` |
| Python | 3.10 o mayor (3.14.5 en la PC) | `python --version` |
| curl | el de Git Bash | `curl --version` |

### Accounts to create first
| Cuenta | Para qué | Primer paso que la necesita |
|---|---|---|
| Google (la de Calidad) | Sheet + Apps Script | Ninguno de §9 (todo se prueba con el simulador); sí la puesta en marcha de §12 |
| GitHub `tchequim` | Repo `kyoto-posventa` + GitHub Pages | Ninguno de §9; sí §12 |

### Environment variables
NOT APPLICABLE — no hay `.env`. La única configuración es `ENDPOINT` en `js/config.js` (paso 7),
que no es secreta: cualquiera que abra la página la ve.

### Files that must be committed
| Archivo | Por qué | Excepción en `.gitignore` |
|---|---|---|
| `img/*.png` | La página los sirve en GitHub Pages | — no coincide con ningún patrón |
| `fuentes/*.pdf` | Entrada de `npm run iconos` | — no coincide con ningún patrón |
| `package.json` | Scripts de test | — no coincide con ningún patrón |
| `apps-script/*.gs` | Fuente del backend | — no coincide con ningún patrón |
| `blueprints/**` | Este blueprint y los PDFs originales | — no coincide con ningún patrón |

### Bootstrap
Correr en **Git Bash**, desde `kyoto-posventa/` (la carpeta que contiene `blueprints/`). Es seguro
correrlo dos veces.

```bash
set -e
# orden: .gitignore → repo → identidad git → package.json → PDFs fuente → herramientas → primer commit
[ -f .gitignore ] || printf '%s\n' 'node_modules/' '__pycache__/' '*.pyc' '.DS_Store' 'Thumbs.db' '.env' > .gitignore
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main          # no-op si ya existe
git config user.name  >/dev/null 2>&1 || git config user.name  "Kyoto Posventa"     # sólo si no hay identidad
git config user.email >/dev/null 2>&1 || git config user.email "posventa@localhost"
[ -f package.json ] || cat > package.json <<'JSON'
{
  "name": "kyoto-posventa",
  "version": "1.0.0",
  "private": true,
  "description": "Checks de Posventa (Check In, Check Out, Agendamiento) para Kyoto Automotores",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "node --test \"tests/*.test.js\"",
    "iconos": "python tools/extraer_iconos.py",
    "servir": "python -m http.server 8765"
  }
}
JSON
mkdir -p fuentes img
[ -f fuentes/check-in-out.pdf ] || cp blueprints/kyoto-posventa-fuentes/check-in-out.pdf fuentes/check-in-out.pdf
[ -f fuentes/agendamiento.pdf ] || cp blueprints/kyoto-posventa-fuentes/agendamiento.pdf fuentes/agendamiento.pdf
node -e "process.exit(+process.versions.node.split('.')[0] >= 22 ? 0 : 1)"   # Node 22+
python -m pip install --quiet --disable-pip-version-check "PyMuPDF==1.28.0"  # ya instalada → no hace nada
python -c "import pymupdf; print('PyMuPDF', pymupdf.VersionBind)"            # expect: PyMuPDF 1.28.0
git add -A && git commit -q --allow-empty -m "chore: scaffold"
```

## 11. Dependencies

### Runtime
Ninguna librería en la página. Fuente Montserrat cargada desde `fonts.googleapis.com` (si no hay
internet se usa `system-ui`).

| Paquete / runtime | Versión | Fuente | Verificado |
|---|---|---|---|
| Google Apps Script (V8) | servicio, sin versión | — | n/a |

### Development
| Paquete / runtime | Versión fijada | Fuente | Estado | Fecha |
|---|---|---|---|---|
| PyMuPDF | 1.28.0 | https://pypi.org/pypi/PyMuPDF/1.28.0/json (wheel cp314, subida 2026-06-29; la última es 2.1) | VERIFIED — instalada y usada en la generación | 2026-11-03 |
| Node.js | ≥ 22 (probado con 24.15.0; LTS vigente 26.13.0) | https://nodejs.org/dist/index.json | VERIFIED | 2026-11-03 |
| Python | ≥ 3.10 (probado con 3.14.5) | `requires_python` de PyMuPDF 1.28.0 | VERIFIED | 2026-11-03 |

Se fija 1.28.0 y no 2.1 porque es la versión con la que se ejecutó y validó el recorte de los 59
íconos; subir de versión es un cambio aparte (ver §20.3).

### Deliberately not used
| No se usa | Por qué |
|---|---|
| React/Vue/Vite | Agrega build y dependencias a algo que es un formulario |
| jsdom / Playwright | Sumarían dependencias npm; el DOM se limita a `app.js` y se prueba a mano (§20.1) |
| clasp | El usuario pega el Apps Script a mano, como en sus otros proyectos |
| Google Forms | No reproduce los íconos ni el diseño del PDF |

## 12. Deployment Strategy

### Hosting
- Página: GitHub Pages desde la rama `main`, carpeta raíz. URL:
  `https://tchequim.github.io/kyoto-posventa/`.
- Backend: aplicación web de Apps Script, "Ejecutar como: yo", "Quién tiene acceso: Cualquier
  persona".

### Environments
| Entorno | Qué es |
|---|---|
| Local | `npm test` (simulador) + `npm run servir` → `http://localhost:8765` |
| Producción | GitHub Pages + Apps Script publicado |

No hay staging: para probar contra un Sheet real se usa una copia del Sheet con su propia
publicación y se cambia `ENDPOINT` localmente.

### CI/CD
NOT APPLICABLE en v1 — sin GitHub Actions; `npm test` se corre a mano antes de cada push.

### Release and rollback
Puesta en marcha (lo que va en INSTALACION.md, paso 10):
1. Crear un Google Sheet nuevo "Posventa – Checks Kyoto".
2. Extensiones → Apps Script → crear 3 archivos `Hojas.gs`, `Guardar.gs`, `Resumen.gs` y pegar el
   contenido de `apps-script/`. Guardar. Ejecutar `instalar` una vez y aceptar permisos.
3. Implementar → Nueva implementación → Aplicación web → Ejecutar como: yo · Acceso: Cualquier
   persona → copiar la URL `/exec`.
4. Pegar la URL en `js/config.js` (`ENDPOINT`). Correr `npm test` (debe seguir en 0).
5. Crear el repo `tchequim/kyoto-posventa`, subir, y en Settings → Pages elegir `main` / raíz.
6. En la hoja `Config`, reemplazar "Asesor de prueba" por los asesores reales de cada sucursal
   (`Activo` = SI). Para dar de baja: `Activo` = NO (no borrar la fila).

Rollback: página → `git revert` del commit y push (Pages se actualiza en ~1 min). Apps Script →
Implementar → Gestionar implementaciones → editar → elegir la versión anterior (la URL no cambia).
**Nunca** crear una implementación nueva para corregir: cambia la URL y deja la página apuntando a la
vieja.

### Domain, DNS, TLS
NOT APPLICABLE — se usa el dominio de GitHub Pages con HTTPS incluido.

## 13. Testing Strategy

| Capa | Cómo | Dónde |
|---|---|---|
| Íconos y catálogo | Existencia, formato PNG RGBA, ids y etiquetas únicas | `tests/catalogo.test.js` |
| Backend Apps Script | Simulador en memoria (`tests/gas-sim.js`) que carga los `.gs` reales | `hojas`, `config`, `guardar`, `resumen` |
| Contrato página ↔ script | Envío real de `logica.js` procesado por los `.gs` | `tests/contrato.test.js` |
| Lógica y vista | Funciones puras | `logica`, `vista` |
| Página y app.js | Chequeos estáticos (estructura, orden de scripts, tokens, uso de la lógica probada) | `pagina`, `app-config`, `app-envio`, `publicacion` |
| Flujo real en el navegador | Manual, una vez antes de lanzar | §20.1 |

### Critical flows to cover E2E
Manual (§20.1): completar y guardar un Check In real; repetir sin wifi y comprobar que se envía al
volver; cambiar de sub-solapa sin perder lo cargado.

### Test data
Sucursales semilla + `Asesor de prueba`. Patentes de prueba `AB123CD`, `ABC123`, `AC456BD`.

### What is deliberately not tested
El DOM de `app.js` de forma automática (sería sumar jsdom o Playwright); la apariencia pixel a pixel
(se compara a ojo contra el PDF en §20.1); el servicio real de Google (se prueba al publicar).

## 14. Security & Secrets

- No hay secretos: la URL del Apps Script es pública por diseño y sólo permite agregar filas
  validadas y leer nombres de asesores.
- Riesgo de abuso (alguien carga basura con el link): mitigado por la lista blanca de `Config`;
  aceptado en v1 (§20.2).
- JSONP: `callback` validado con `^[A-Za-z_$][\w$]*$` (test en `config.test.js`).
- Todo texto que se dibuja pasa por `Vista.esc` (test en `vista.test.js`).
- Datos personales: nombre del cliente y patente. Quedan en un Sheet de la empresa con acceso de
  Calidad; no se envían a terceros.

## 15. Accessibility

### Baseline requirements
- Cada casillero es un `<input type="checkbox">` real dentro de un `<label>`, con `aria-label` =
  etiqueta del ítem (las celdas sin texto, como 24×7, igual se anuncian).
- Íconos con `alt=""` (decorativos: el texto está en la etiqueta).
- Navegación completa con Tab / Espacio; `:focus-visible` con contorno rojo de 3 px.
- `#avisos` con `aria-live="polite"` para errores y estado de envío.
- Contraste: `#231F20` sobre blanco 16:1; botón blanco sobre `#C3002F` 6,1:1.

### WCAG 2.2 additions — the ones most often missed
- 2.5.8 Tamaño de objetivo: la celda entera es clickeable (≥ 170 px de alto).
- 3.3.7 Entrada redundante: sucursal y asesor se recuerdan entre checks.

### Verification
Manual en §20.1: recorrer un Check In completo sólo con teclado.

## 16. Observability & Cost

### Instrumentation
- Apps Script: los errores quedan en Ejecuciones (script.google.com → Ejecuciones).
- Página: `console.warn` en fallas de red; el aviso de pendientes hace visible un problema de
  conexión.

### The metrics that matter for this project
Filas por día y por sucursal, % de cumplimiento promedio por asesor (hoja `Resumen`), pendientes en
cola (aviso en la página).

### Health check
Abrir `{ENDPOINT}?accion=config` en el navegador → debe mostrar `{"ok":true,"sucursales":[…]}`.

### Cost model
$0: GitHub Pages y Apps Script gratuitos. Cuota de Apps Script (cuenta gratuita): 20.000 llamadas
por día y 6 minutos por ejecución; el uso esperado (≈ 100 checks/día + 24 resúmenes) queda muy por
debajo.

## 17. Model Routing
NOT APPLICABLE — el producto no usa modelos de IA.

## 18. Skills to Use During Build

Todas se activan solas (sin `/`). Ya están instaladas en el Claude Code de la PC; si alguna falta,
seguir sin ella — ningún paso depende de una skill.

| Skill | Cuándo | Instalación si falta |
|---|---|---|
| `superpowers:test-driven-development` | Pasos 6 a 9: copiar primero el test literal y escribir el código hasta que pase | plugin `superpowers` (instalado en la PC; si falta, seguir sin la skill) |
| `ui-ux-pro-max` | Paso 7: ajustar `estilos.css` contra el PDF sin cambiar los tokens de §7 | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` y `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| `superpowers:verification-before-completion` | Antes de dar por terminado cada paso | igual que la primera fila |
| Navegador integrado del Claude Code desktop | Pasos 7 a 9: abrir la página servida y compararla con el PDF | viene con la app |

## 19. Agent Workspace

Modo archivo único: copiar cada bloque a su ruta **antes del paso 1** (si el archivo ya existe, no
pisarlo).

### 19.1 `CLAUDE.md`

````markdown
# Kyoto Posventa

Checks de Posventa (Check In, Check Out, Agendamiento) idénticos a los PDFs de Kyoto Automotores.
La página guarda cada check en un Google Sheet vía Apps Script. Blueprint: `blueprints/kyoto-posventa-blueprint.md`.

## Commands

Todo desde la raíz del repo, en Git Bash.

| Tarea | Comando |
|---|---|
| Tests (todos) | `npm test` |
| Un solo test | `node --test tests/guardar.test.js` |
| Regenerar íconos desde los PDFs | `npm run iconos` (≈ 40 s, escribe `img/*.png`) |
| Servir la página | `npm run servir` → http://localhost:8765 |
| Chequear sintaxis de app.js | `node --check js/app.js` |

No hay install, build, lint ni typecheck: el proyecto no tiene dependencias npm.

## Stack

HTML/CSS/JS puro (GitHub Pages) · Google Apps Script vinculado a un Google Sheet · tests con `node --test` y un simulador de Apps Script propio.

## Architecture

Un guardado, de punta a punta:
`index.html` → `js/app.js` lee el formulario → `Logica.validarDatos` → `Logica.construirPayload(tipo, datos, marcados, CATALOGO, id, fecha)` → `Logica.crearCola(localStorage).agregar` → `Logica.enviarPendientes` → `fetch(ENDPOINT, {method:'POST', body})` → `apps-script/Guardar.gs` `doPost` → `guardarCheck_` (lock, valida contra `Config`, deduplica por `ID envío`) → `appendRow` en la hoja del check.

| Archivo | Puede usar | Nunca |
|---|---|---|
| `js/catalogo.js` | nada | Lógica; es sólo datos |
| `js/logica.js`, `js/vista.js` | nada (reciben el catálogo por parámetro) | Tocar `document`, `window`, `localStorage` directo |
| `js/app.js` | `CATALOGO`, `Logica`, `Vista`, `POSVENTA_CONFIG` | Armar HTML a mano (usa `Vista`) o el envío a mano (usa `Logica`) |
| `apps-script/*.gs` | entre sí (ámbito global compartido) | Borrar filas o datos |

| Tema | Única fuente de verdad |
|---|---|
| Ítems, textos, íconos, columnas del Sheet | `js/catalogo.js` (`etiqueta` = encabezado de columna) |
| Recortes de los íconos | `tools/extraer_iconos.py` (coordenadas de la grilla del PDF) |
| Encabezados fijos de las hojas y campos requeridos | `FIJAS` y `REQUERIDOS` en `apps-script/Hojas.gs` (espejo en `js/logica.js`) |
| URL del backend | `js/config.js` → `POSVENTA_CONFIG.ENDPOINT` |
| Colores | variables en `:root` de `css/estilos.css` |

## Code rules

1. Antes de cambiar código, correr `npm test`; después, de nuevo. Debe quedar "fail 0".
2. Una `etiqueta` del catálogo ya publicada no se renombra: es el encabezado de una columna con datos. Para cambiar el texto visible, cambiar `lineas`.
3. Ítems nuevos siempre con `id` nuevo; nunca reutilizar un `id`.
4. El `fetch` del POST no lleva `headers` (pedido simple, sin preflight CORS). `tests/app-envio.test.js` lo controla.
5. Todo texto que va al HTML pasa por `Vista.esc`.
6. Todo acceso a `localStorage` dentro de `try/catch`.
7. Apps Script en sintaxis compatible ES5 (`var`, `function`), como el resto de los `.gs`.
8. Los PNG de `img/` se generan con `npm run iconos`; no se editan a mano.

## Design system

| Rol | Valor | Uso |
|---|---|---|
| Negro PDF | `#231F20` | Texto, pestañas, líneas, casilleros |
| Rojo PDF | `#FD0100` | "SALUDO" y líneas de Agendamiento |
| Rojo Nissan | `#C3002F` | Encabezado, solapa activa, botón Guardar, foco |
| Papel / fondo | `#FFFFFF` / `#EDEDED` | Hoja / detrás de la hoja |
| Celda tildada | `#F2F2F2` | Fondo de celda marcada |
| Error / OK | `#B00020` / `#1E7D32` | Avisos / "Guardado ✓" |

Fuente Montserrat 300 (etiquetas) y 700 (títulos). Casillero 28 px arriba a la derecha. Grilla Check In/Out con `2px dashed`; Agendamiento con `2px dotted` rojo. Celular ≤ 700 px: 2 columnas.

## Environment

Sin variables de entorno. La única configuración es `ENDPOINT` en `js/config.js` (pública).

## Rules

| Archivo | Aplica a |
|---|---|
| `.claude/rules/apps-script.md` | `apps-script/**` |
| `.claude/rules/pagina.md` | `index.html`, `css/**`, `js/**` |

## Non-negotiable

- Nunca crear una implementación NUEVA del Apps Script para publicar cambios: se edita la existente (si no, cambia la URL y la página deja de guardar).
- Nunca borrar ni reordenar columnas en las hojas de checks; los ítems se ubican por encabezado.
- Nunca pushear ni publicar sin que el usuario lo pida.
- Los checks deben seguir idénticos a los PDFs de `fuentes/`: no cambiar textos, orden ni íconos sin pedido explícito.
````

### 19.2 `AGENTS.md`

````markdown
# Kyoto Posventa — guía para agentes

Página web (HTML/CSS/JS puro, GitHub Pages) con los checks de Posventa de Kyoto Automotores
(Check In, Check Out, Agendamiento), idénticos a los PDFs de `fuentes/`. Cada check se guarda en un
Google Sheet mediante el Apps Script de `apps-script/`.

## Comandos
- `npm test` — todos los tests (Node 22+, sin dependencias).
- `npm run iconos` — regenera `img/*.png` desde los PDFs (Python + PyMuPDF 1.28.0).
- `npm run servir` — sirve la página en http://localhost:8765.

## Las tres reglas que más importan
1. `js/catalogo.js` es la única fuente de ítems; su `etiqueta` es el encabezado de columna en el
   Sheet y no se renombra una vez publicada.
2. El POST del `fetch` no lleva `Content-Type` (evita el preflight CORS de Apps Script).
3. El Apps Script se actualiza editando la implementación existente, nunca creando otra.

La fuente de verdad completa es `CLAUDE.md`; el diseño, `blueprints/kyoto-posventa-blueprint.md`.
````

### 19.3 `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm run iconos)",
      "Bash(node --test:*)",
      "Bash(node --check:*)",
      "Bash(python tools/extraer_iconos.py)",
      "Bash(python -m http.server:*)",
      "Bash(python -:*)",
      "Bash(curl -s:*)",
      "Bash(ls img:*)",
      "Bash(ls tests:*)",
      "Bash(test:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git tag:*)",
      "Bash(git ls-files:*)"
    ],
    "deny": [
      "Bash(git push:*)",
      "Bash(git push --force:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

### 19.4 Project skills — `.claude/skills/<name>/SKILL.md`

| Skill | Se activa con | Qué automatiza |
|---|---|---|
| `agregar-check-item` | "agregar un ítem / un check nuevo / cambiar un texto del check" | Catálogo + recorte + tests sin romper el Sheet |
| `publicar-cambios` | "subir los cambios / publicar / actualizar el Apps Script" | Tests, push a Pages y nueva versión del Apps Script sin cambiar la URL |

`.claude/skills/agregar-check-item/SKILL.md`
````markdown
---
name: agregar-check-item
description: Agregar un ítem o un check nuevo de Posventa (o cambiar el texto visible de uno) sin romper las columnas del Sheet. Usar cuando digan "agregar un ítem", "sumar un check nuevo", "llegó otro PDF de posventa", "cambiar el texto de una celda".
---

# Agregar un ítem o un check de Posventa

## When to use
- Llega un PDF nuevo de posventa o una versión nueva de uno existente.
- Hay que sumar, quitar o reescribir una celda de Check In, Check Out o Agendamiento.

## Steps
1. Copiar el PDF nuevo a `fuentes/` con nombre en minúsculas y guiones.
2. Medir la grilla: correr un script con PyMuPDF que liste las líneas horizontales y verticales
   (`page.get_drawings()`) y anotar los bordes en puntos, como `CI_X` / `FILAS` en
   `tools/extraer_iconos.py`.
3. En `tools/extraer_iconos.py`: agregar los bordes y un `grilla([...ids...], X, Y)`; sumar la tarea
   a `TAREAS` con el tamaño de letra de las etiquetas de ese PDF.
4. En `js/catalogo.js`: agregar los ítems con `id` NUEVO (prefijo del check), `lineas` iguales al PDF
   y una `etiqueta` única dentro del check (será el encabezado de columna). Un check nuevo es una
   clave nueva con `titulo`, `hoja` y `secciones`; además hay que sumarlo a `HOJAS`, `FIJAS` y
   `REQUERIDOS` en `apps-script/Hojas.gs` y a `REQUERIDOS` en `js/logica.js`, más un botón
   `.subsolapa` en `index.html`.
5. Actualizar los conteos de `tests/catalogo.test.js` y `tests/vista.test.js` (contándolos del catálogo).
6. `npm run iconos` y mirar los PNG nuevos al lado del PDF.
7. Para cambiar sólo el texto visible de un ítem existente: cambiar `lineas`, **no** `etiqueta`.

## Verify
```bash
npm run iconos   # expect: "OK <n> iconos en …"
npm test         # expect: exit 0, "fail 0"
```

## Do not
- Renombrar una `etiqueta` publicada: crea una columna nueva y deja la vieja huérfana en el Sheet.
- Reutilizar un `id` borrado.
- Editar PNG a mano.
````

`.claude/skills/publicar-cambios/SKILL.md`
````markdown
---
name: publicar-cambios
description: Publicar cambios de Kyoto Posventa en GitHub Pages y en el Apps Script sin cambiar la URL del backend. Usar cuando digan "subir los cambios", "publicar", "actualizar la página", "actualizar el Apps Script".
---

# Publicar cambios

## When to use
- Hay cambios en `index.html`, `css/`, `js/`, `img/` (página) o en `apps-script/` (backend).

## Steps
1. `npm test` en 0 fallas.
2. Pedir confirmación al usuario antes de cualquier `git push`.
3. Página: `git push` a `main`; GitHub Pages se actualiza en ~1 minuto.
4. Apps Script (si cambió `apps-script/`): el usuario pega los `.gs` en el editor, guarda, y va a
   Implementar → Gestionar implementaciones → lápiz → Versión: **Nueva versión** → Implementar.
   La URL `/exec` queda igual.
5. Probar `{ENDPOINT}?accion=config` en el navegador: debe responder `"ok":true`.

## Verify
```bash
npm test                                                    # expect: exit 0, "fail 0"
curl -sL "$(node -e "global.window={};require('./js/config.js');console.log(window.POSVENTA_CONFIG.ENDPOINT)")?accion=config" | grep -q '"ok":true'   # expect: exit 0 (sólo con ENDPOINT real)
```

## Do not
- Crear una implementación NUEVA del Apps Script: cambia la URL y la página deja de guardar.
- Pushear sin pedido explícito del usuario.
````

### 19.5 `.claude/rules/*.md`

| Archivo | `paths` | Cubre |
|---|---|---|
| `.claude/rules/apps-script.md` | `apps-script/**` | ES5 compatible, sin borrar datos, lock, columnas por encabezado |
| `.claude/rules/pagina.md` | `index.html`, `css/**`, `js/**` | DOM sólo en app.js, escape, sin Content-Type, tokens de §7 |

`.claude/rules/apps-script.md`
```markdown
---
paths:
  - "apps-script/**"
---

# Apps Script

- Sintaxis compatible ES5: `var`, `function`, sin arrow functions ni template literals (igual que el resto de los `.gs`).
- Ninguna función borra filas, hojas ni datos. `Resumen` es la única hoja que se reescribe.
- Toda escritura en hojas de checks va dentro de `LockService.getScriptLock()` con `waitLock(20000)` y `releaseLock()` en `finally`.
- Las columnas de ítems se buscan por encabezado (`encabezados_`), nunca por posición fija.
- Las respuestas siempre son `{ ok: true, ... }` o `{ ok: false, error: '<castellano>' }` vía `responder_`.
- Toda función nueva usada por la web app tiene su test en `tests/` con `tests/gas-sim.js`; si usa un servicio de Google que el simulador no tiene, se agrega al simulador en el mismo cambio.
```

`.claude/rules/pagina.md`
```markdown
---
paths:
  - "index.html"
  - "css/**"
  - "js/**"
---

# Página

- Sólo `js/app.js` toca el DOM, `window` o `localStorage`. `logica.js` y `vista.js` son funciones puras con tests.
- HTML nuevo se arma en `js/vista.js` y todo texto pasa por `esc()`.
- El `fetch` del POST no lleva `headers` ni se menciona ese encabezado en el código (lo controla `tests/app-envio.test.js`).
- Colores sólo vía variables de `:root` en `css/estilos.css`; nada de hex sueltos fuera de `:root`, salvo el degradé del papel de Agendamiento.
- El orden de scripts en `index.html` es `catalogo, logica, vista, config, app` (lo controla `tests/pagina.test.js`).
- Cambios visuales se comparan al lado del PDF de `fuentes/` antes de darlos por buenos.
```

### 19.6 Verify-critical config and local infrastructure

| Archivo que necesita un `Verify` | Dónde está su contenido |
|---|---|
| `package.json` (script `test` con el patrón `"tests/*.test.js"`) | §10 Bootstrap (literal) |
| `.gitignore` | §10 Bootstrap (literal) |
| `fuentes/*.pdf` | `blueprints/kyoto-posventa-fuentes/`, copiados por el Bootstrap |
| `tests/gas-sim.js` | Paso 2 (literal) |

No hay servicios locales (sin Docker, sin base de datos): el "Sheet" de los tests es el simulador en
memoria.

| Herramienta que recorre el árbol | Exclusión de `blueprints/` |
|---|---|
| `node --test "tests/*.test.js"` | No hace falta: el patrón sólo toma `tests/*.test.js` |
| Formateador / linter | No hay ninguno obligatorio en este proyecto |

**Byte-exact artifact reconciliation**
| Artefacto | Contra el blueprint | Contra el runtime fijado | Ambos confirmados |
|---|---|---|---|
| Filas esperadas en `resumen.test.js` | §4 (bloques del Resumen) | Ejecutado con Node 24.15.0, `Intl` con zona `America/Argentina/Buenos_Aires` | yes |
| `% Cumplimiento` = 75 / 33 / 4 en los tests | §4 (`round(OK×100/total)`) | Ejecutado con Node 24.15.0 | yes |
| `textoProgreso(12, 26)` = `12 / 26 · 46 %` | §6 | Ejecutado con Node 24.15.0 (prototipo de validación) | yes |

**Cross-artifact value reconciliation**
| Valor | Lado A | Lado B | Comparado en | Comparado |
|---|---|---|---|---|
| Ids de ítems e imágenes | `js/catalogo.js` | `tools/extraer_iconos.py` → `img/` | paso 1, `catalogo.test.js` | yes |
| Forma del envío (§5) | `js/logica.js` | `apps-script/Guardar.gs` | paso 5, `contrato.test.js` | yes |
| Campos requeridos por tipo | `REQUERIDOS` de `logica.js` | `REQUERIDOS` de `Hojas.gs` | paso 5, `contrato.test.js` + `guardar.test.js` | yes |
| Orden de scripts | `index.html` | archivos de `js/` | paso 7 `pagina.test.js`, paso 10 `publicacion.test.js` | yes |

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

```bash
npm test                                         # expect: exit 0, "fail 0", "skipped 0"
node --check js/app.js                           # expect: exit 0
python tools/extraer_iconos.py                   # expect: "OK 59 iconos en …" (regenera idéntico)
test -z "$(git status --porcelain img/)"          # expect: exit 0 — los PNG regenerados son idénticos a los commiteados
test "$(git tag -l 'step-*' | wc -l)" -eq 10     # expect: exit 0, un tag por paso
```

Manuales, una vez antes de lanzar:
- [ ] `git ls-files --error-unmatch package.json` y lo mismo, de a una ruta, para `.gitignore`,
      `fuentes/check-in-out.pdf`, `fuentes/agendamiento.pdf`, `img/ci_nro_cono.png` → exit 0 cada una.
- [ ] `git log --diff-filter=A --format=%s -- .gitignore` muestra `chore: scaffold`.
- [ ] Bootstrap (§10) corrido dos veces sobre el árbol ya armado → exit 0 las dos veces.
- [ ] Con un Sheet de prueba publicado y su URL en `config.js`: guardar 1 Check In, 1 Check Out y
      1 Agendamiento → aparece 1 fila en cada hoja con `% Cumplimiento` correcto.
- [ ] Wifi apagado: guardar un Check In → overlay "Guardado en esta tablet…"; prender wifi → el aviso
      de pendientes desaparece y la fila aparece una sola vez.
- [ ] Cada sub-solapa puesta al lado de su PDF: mismas celdas, mismo orden, mismos textos, mismos
      íconos (65 ítems).
- [ ] Recorrer un Check In completo sólo con teclado (Tab/Espacio/Enter).
- [ ] En un celular (≤ 700 px) la grilla pasa a 2 columnas y no hay scroll horizontal.
- [ ] `{ENDPOINT}?accion=config` responde `ok:true`; menú Posventa → Actualizar resumen llena `Resumen`.
- [ ] Todo lo de §1 *Non-Goals* sigue sin construir.

### 20.2 Risk register
| Riesgo | Prob. | Impacto | Primera señal | Mitigación |
|---|---|---|---|---|
| Wifi del taller corta el envío | A | A | Aviso "N pendientes" que no baja | Cola en `localStorage` + `ID envío` sin duplicados (pasos 5 y 9) |
| Se tilda todo sin hacerlo | M | A | Resumen con 100 % constante | **Aceptado en v1.** v2: auditoría como la de Vehículos del kyoto-checklist |
| Alguien publica una implementación nueva del Apps Script y cambia la URL | M | A | La página deja de guardar | INSTALACION.md y skill `publicar-cambios`: siempre editar la implementación existente |
| Muchas filas vuelven lento `actualizarResumen` | B | M | Ejecución > 1 min en Ejecuciones | Corre cada hora, fuera del guardado; si crece, archivar por año |
| Hoja `Config` vacía o mal escrita | M | M | "Sin asesores cargados" en la página | Semilla con "Asesor de prueba"; INSTALACION.md sección 6 |
| Se borra el localStorage de la tablet con checks pendientes | B | M | Pérdida silenciosa | Se envían apenas hay red (al cargar, `online`, cada 60 s); el overlay avisa cuando quedó pendiente |
| La fuente Montserrat no carga sin internet | M | B | Tipografía del sistema | Respaldo `system-ui`; no afecta el uso |

### 20.3 Decision log
| # | Decisión | Alternativa descartada | Por qué | Se revierte si |
|---|---|---|---|---|
| 1 | Página aparte | Solapa dentro del kyoto-checklist | Lo eligió el usuario; separa recepción de posventa | Se quiera un único link para todo |
| 2 | HTML puro + Apps Script + Sheets | TS/Node (default de the-architect) | Stack que el usuario ya mantiene; cero servidores | Hagan falta login real o muchos usuarios simultáneos |
| 3 | Link abierto + lista blanca en `Config` | Login con Google | Velocidad en el mostrador (decisión del usuario) | Aparezcan cargas de gente ajena |
| 4 | Íconos recortados del PDF | Redibujarlos en SVG | Fidelidad exacta y cero trabajo de diseño | Haga falta escalarlos muy grandes |
| 5 | Una columna por ítem, ubicada por encabezado | Ítems en una columna JSON | Calidad filtra y cuenta directo en el Sheet; se pueden agregar ítems sin romper filas | La cantidad de columnas moleste |
| 6 | Resumen por disparador horario | Recalcular en cada guardado | El guardado sigue rápido aunque crezcan las hojas | Calidad necesite el resumen al instante |
| 7 | Tests con simulador propio | jsdom/Playwright/clasp | Cero dependencias npm | El DOM de app.js crezca y den problemas que no se ven a mano |
| 8 | PyMuPDF 1.28.0 | 2.1 (última) | Es la versión con la que se validaron los 59 recortes | Una 2.x rinda igual y se necesite |
| 9 | "Asistencia Nissan 24x7" sin texto bajo el ícono | Inventar una etiqueta visible | En el PDF la tarjeta no tiene etiqueta; la etiqueta sólo va al Sheet y al lector de pantalla | El usuario pida texto visible |
| 10 | Protocolo de Agendamiento: 2 casilleros arriba ("3er ring" y "Saludo", que incluye "referirse por el nombre") | 3 casilleros separados | Es lo que aprobó el usuario | Calidad quiera medir el uso del nombre aparte |

### 20.4 What to build next
1. Los próximos checks de posventa (cuando lleguen los PDFs) — skill `agregar-check-item`.
2. Auditoría de checks (comparar lo tildado con una revisión de Calidad), como en el kyoto-checklist.
3. Vincular Check In y Check Out por Nº de OR (tiempo de estadía, check out faltantes).
4. Dashboard visual del Resumen (o sumarlo al Canvas VOC).
5. Login con Google si aparecen cargas indebidas.

---

*Fin del blueprint. El orden de construcción es §9. Se termina cuando §20.1 está en verde.*
