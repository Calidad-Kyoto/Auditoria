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
