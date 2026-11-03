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
