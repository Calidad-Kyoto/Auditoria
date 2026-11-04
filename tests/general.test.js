'use strict';
// Solapa GENERAL: preguntas SI / NO / NO CORRESPONDE + observaciones.
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const V = require('../js/vista.js');
const CATALOGO = require('../js/catalogo.js');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

const PREGUNTAS = ['Control No show', 'Control de recordatorio de turnos', 'Control de uso de EPP',
  'Control de uso de cobertores de capot de vehículos'];
const DATOS = { sucursal: 'KYOTO POSADAS', asesor: 'Asesor de prueba', observaciones: '  Faltan cobertores en box 2  ' };
const cuenta = (html, s) => html.split(s).length - 1;

test('el catálogo tiene las 4 preguntas de General con 3 opciones cada una', () => {
  const items = L.itemsDe(CATALOGO, 'general');
  assert.deepStrictEqual(items.map((i) => i.etiqueta), PREGUNTAS);
  for (const i of items) assert.deepStrictEqual(i.opciones, ['SI', 'NO', 'NO CORRESPONDE']);
  assert.strictEqual(CATALOGO.general.hoja, 'General');
});

test('la vista dibuja 3 opciones por pregunta, observaciones y sólo sucursal/asesor', () => {
  const html = V.htmlCheck('general', CATALOGO);
  assert.strictEqual(cuenta(html, 'class="respuesta"'), 12);
  assert.strictEqual(cuenta(html, 'class="casillero"'), 0);
  assert.ok(html.includes('<h2 class="pestana">GENERAL</h2>'));
  assert.ok(html.includes('>OBSERVACIONES</h3>') && html.includes('name="observaciones"'));
  assert.ok(html.includes('value="NO CORRESPONDE"'));
  const datos = V.htmlDatos('general', [{ nombre: 'KYOTO POSADAS', asesores: ['Ana'] }]);
  assert.ok(datos.includes('name="sucursal"') && datos.includes('name="asesor"'));
  for (const n of ['or', 'patente', 'cliente', 'fechaTurno']) assert.ok(!datos.includes(`name="${n}"`), n);
  assert.ok(!V.htmlCheck('checkin', CATALOGO).includes('OBSERVACIONES'));
});

test('validarRespuestas exige responder las 4 preguntas', () => {
  assert.deepStrictEqual(L.validarDatos('general', DATOS), []);
  const faltan = L.validarRespuestas('general', { ge_no_show: 'SI' }, CATALOGO);
  assert.strictEqual(faltan.length, 3);
  assert.ok(faltan.includes('Falta responder: Control de uso de EPP'));
  assert.deepStrictEqual(L.validarRespuestas('checkin', {}, CATALOGO), []);
});

test('el % de cumplimiento no cuenta los NO CORRESPONDE', () => {
  const marcados = { ge_no_show: 'SI', ge_recordatorio_turnos: 'NO', ge_uso_epp: 'NO CORRESPONDE', ge_cobertores_capot: 'SI' };
  const p = L.construirPayload('general', DATOS, marcados, CATALOGO, 'envio-ge-01', new Date('2026-11-04T12:00:00Z'));
  assert.deepStrictEqual(p.items.map((i) => i.valor), ['SI', 'NO', 'NO CORRESPONDE', 'SI']);
  assert.strictEqual(p.datos.observaciones, 'Faltan cobertores en box 2');
  assert.strictEqual(L.porcentaje(p.items), 67);
});

test('el Apps Script guarda General con SI/NO/NO CORRESPONDE y observaciones', () => {
  const { ctx, planilla } = cargarCodigo();
  const marcados = { ge_no_show: 'SI', ge_recordatorio_turnos: 'NO', ge_uso_epp: 'NO CORRESPONDE', ge_cobertores_capot: 'SI' };
  const p = L.construirPayload('general', DATOS, marcados, CATALOGO, 'envio-ge-02');
  const r = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
  assert.strictEqual(r.ok, true, r.error);
  const h = planilla.getSheetByName('General');
  const v = (col) => h.datos[1][h.datos[0].indexOf(col)];
  assert.strictEqual(v('Control de uso de EPP'), 'NO CORRESPONDE');
  assert.strictEqual(v('Control de recordatorio de turnos'), 'NO');
  assert.strictEqual(v('% Cumplimiento'), 67);
  assert.strictEqual(v('Ítems OK'), 2);
  assert.strictEqual(v('Ítems totales'), 3);
  assert.strictEqual(v('Observaciones'), 'Faltan cobertores en box 2');
});

test('el Apps Script rechaza respuestas inválidas y todo NO CORRESPONDE deja el % vacío', () => {
  const { ctx, planilla } = cargarCodigo();
  const malo = L.construirPayload('general', DATOS, { ge_no_show: 'TAL VEZ' }, CATALOGO, 'envio-ge-03');
  const r1 = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(malo) } }));
  assert.strictEqual(r1.ok, false);
  assert.match(r1.error, /respuesta inválida/);
  const nc = Object.fromEntries(L.itemsDe(CATALOGO, 'general').map((i) => [i.id, 'NO CORRESPONDE']));
  const p = L.construirPayload('general', DATOS, nc, CATALOGO, 'envio-ge-04');
  assert.strictEqual(leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } })).ok, true);
  const h = planilla.getSheetByName('General');
  assert.strictEqual(h.datos[1][h.datos[0].indexOf('% Cumplimiento')], '');
  ctx.actualizarResumen();
  const fila = planilla.getSheetByName('Resumen').datos.find((f) => f[1] === 'General');
  assert.deepStrictEqual(fila.slice(1), ['General', 'KYOTO POSADAS', 'Asesor de prueba', 1, '']);
});
