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
