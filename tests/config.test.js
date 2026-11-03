'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

test('GET accion=config devuelve sucursales y asesores activos', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const cfg = planilla.getSheetByName('Config');
  cfg.appendRow(['KYOTO POSADAS', 'Ana Gómez', 'SI']);
  cfg.appendRow(['KYOTO POSADAS', 'Luis Pérez', 'NO']);
  const r = leerSalida(ctx.doGet({ parameter: { accion: 'config' } }));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.sucursales.length, 4);
  const pos = r.sucursales.find((s) => s.nombre === 'KYOTO POSADAS');
  assert.deepStrictEqual(pos.asesores, ['Asesor de prueba', 'Ana Gómez']);
});

test('GET con callback válido responde JSONP; con callback inválido responde JSON', () => {
  const { ctx } = cargarCodigo();
  const jsonp = ctx.doGet({ parameter: { accion: 'config', callback: 'cb_123' } });
  assert.match(jsonp.getContent(), /^cb_123\(\{.*\}\)$/s);
  assert.strictEqual(jsonp.tipo, 'JAVASCRIPT');
  const json = ctx.doGet({ parameter: { accion: 'config', callback: 'alert(1)//' } });
  assert.strictEqual(json.tipo, 'JSON');
  assert.strictEqual(JSON.parse(json.getContent()).ok, true);
});

test('GET con accion desconocida responde ok:false', () => {
  const { ctx } = cargarCodigo();
  const r = leerSalida(ctx.doGet({ parameter: { accion: 'borrar' } }));
  assert.deepStrictEqual(r, { ok: false, error: 'accion desconocida' });
});
