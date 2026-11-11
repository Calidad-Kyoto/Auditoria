'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo } = require('./gas-sim.js');

function guardar(ctx, id, creado, okLavado) {
  ctx.doPost({ postData: { contents: JSON.stringify({
    accion: 'guardar', tipo: 'checkout', idEnvio: id, creado,
    datos: { sucursal: 'KYOTO RESISTENCIA', asesor: 'Asesor de prueba', or: '1', patente: 'AB123CD', cliente: 'X', trabajo: 'Diagnóstico' },
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
