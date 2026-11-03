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
