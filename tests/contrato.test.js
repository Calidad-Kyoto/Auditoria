'use strict';
// Contrato página ↔ Apps Script: lo que arma js/logica.js lo acepta apps-script/*.gs.
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const CATALOGO = require('../js/catalogo.js');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

const DATOS = {
  checkin: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', or: '777', patente: 'AC456BD', cliente: 'María', trabajo: 'Servicio de 150.000 Km' },
  checkout: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', or: '777', patente: 'AC456BD', cliente: 'María', trabajo: 'Servicio Exprés' },
  agendamiento: { sucursal: 'KYOTO SAENZ PEÑA', asesor: 'Asesor de prueba', cliente: 'María', patente: 'AC456BD', fechaTurno: '2026-11-12' },
};

for (const tipo of Object.keys(DATOS)) {
  test(`el payload de ${tipo} se guarda con una columna por ítem del catálogo`, () => {
    const { ctx, planilla } = cargarCodigo();
    const marcados = Object.fromEntries(L.itemsDe(CATALOGO, tipo).map((i) => [i.id, true]));
    const p = L.construirPayload(tipo, DATOS[tipo], marcados, CATALOGO, L.nuevoId());
    const r = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
    assert.strictEqual(r.ok, true, r.error);
    const h = planilla.getSheetByName(CATALOGO[tipo].hoja);
    for (const it of L.itemsDe(CATALOGO, tipo)) {
      assert.strictEqual(h.datos[1][h.datos[0].indexOf(it.etiqueta)], 'SI', it.etiqueta);
    }
    assert.strictEqual(h.datos[1][h.datos[0].indexOf('% Cumplimiento')], 100);
  });
}

test('Check In guarda las observaciones; una hoja creada antes suma la columna al final', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const h = planilla.getSheetByName('Check In');
  h.datos[0] = h.datos[0].filter((c) => c !== 'Observaciones'); // como estaba la versión anterior
  const datos = Object.assign({}, DATOS.checkin, { observaciones: '  Cliente apurado, no quiso lavado  ' });
  const p = L.construirPayload('checkin', datos, {}, CATALOGO, L.nuevoId());
  const r = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
  assert.strictEqual(r.ok, true, r.error);
  const enc = h.datos[0];
  assert.strictEqual(enc.indexOf('Observaciones'), 11); // después de las 11 fijas viejas (incluida Trabajo a realizar)
  assert.strictEqual(h.datos[1][enc.indexOf('Observaciones')], 'Cliente apurado, no quiso lavado');
  assert.strictEqual(h.datos[1][enc.indexOf('Nº OR')], '777');
});
