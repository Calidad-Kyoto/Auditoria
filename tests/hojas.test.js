'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { cargarCodigo } = require('./gas-sim.js');

test('configurarHojas crea Config, las 4 hojas de checks y Resumen', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const nombres = planilla.getSheets().map((h) => h.getName());
  for (const n of ['Config', 'Check In', 'Check Out', 'Agendamiento', 'General', 'Auditoría de OR', 'Listas', 'Resumen']) assert.ok(nombres.includes(n), `falta ${n}`);
  assert.deepStrictEqual(planilla.getSheetByName('Config').datos[0], ['Sucursal', 'Asesor', 'Activo']);
  assert.deepStrictEqual(planilla.getSheetByName('Config').datos.slice(1).map((f) => f[0]),
    ['KYOTO RESISTENCIA', 'KYOTO CORRIENTES', 'KYOTO POSADAS', 'KYOTO SAENZ PEÑA']);
  assert.deepStrictEqual(planilla.getSheetByName('Check In').datos[0],
    ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'ID envío']);
  assert.deepStrictEqual(planilla.getSheetByName('Agendamiento').datos[0],
    ['Fecha/Hora', 'Sucursal', 'Asesor', 'Cliente', 'Patente', 'Fecha del turno', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'ID envío']);
  assert.deepStrictEqual(planilla.getSheetByName('General').datos[0],
    ['Fecha/Hora', 'Sucursal', 'Asesor', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'Observaciones', 'ID envío']);
});

test('configurarHojas es idempotente: correrlo dos veces no duplica hojas ni filas', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  ctx.configurarHojas();
  assert.strictEqual(planilla.getSheets().length, 8);
  assert.strictEqual(planilla.getSheetByName('Config').getLastRow(), 5);
  assert.strictEqual(planilla.getSheetByName('Listas').getLastRow(), 25); // encabezado + 8 APS + 16 mecánicos
  assert.strictEqual(planilla.getSheetByName('Check Out').getLastRow(), 1);
});
