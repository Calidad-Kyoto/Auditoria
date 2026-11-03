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
