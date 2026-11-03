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
