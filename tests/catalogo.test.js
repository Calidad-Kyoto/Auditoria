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
