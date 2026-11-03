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
