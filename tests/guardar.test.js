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
    datos: { sucursal: 'KYOTO CORRIENTES', asesor: 'Asesor de prueba', or: '4521', patente: 'AB123CD', cliente: 'Juan Pérez', trabajo: 'Servicio de 10.000 Km' },
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
