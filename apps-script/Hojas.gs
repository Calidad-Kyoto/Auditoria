/**
 * Kyoto Posventa — Hojas.gs: constantes, hojas, Config y GET.
 * Backend de los checks (Check In, Check Out, Agendamiento, General).
 * Script VINCULADO al Google Sheet (Extensiones → Apps Script). Se publica como aplicación web.
 *
 *   GET  ?accion=config[&callback=fn]  → sucursales y asesores activos de la hoja Config (JSON o JSONP)
 *   POST body JSON {accion:'guardar', ...} → agrega una fila en la hoja del check
 */

var HOJAS = { checkin: 'Check In', checkout: 'Check Out', agendamiento: 'Agendamiento', general: 'General' };
var HOJA_CONFIG = 'Config';
var HOJA_RESUMEN = 'Resumen';
var COL_ID = 'ID envío';

var FIJAS = {
  checkin: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID],
  checkout: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Nº OR', 'Patente', 'Cliente', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID],
  agendamiento: ['Fecha/Hora', 'Sucursal', 'Asesor', 'Cliente', 'Patente', 'Fecha del turno', '% Cumplimiento', 'Ítems OK', 'Ítems totales', COL_ID],
  general: ['Fecha/Hora', 'Sucursal', 'Asesor', '% Cumplimiento', 'Ítems OK', 'Ítems totales', 'Observaciones', COL_ID]
};

// Encabezado de columna → campo de payload.datos
var CAMPOS = { 'Sucursal': 'sucursal', 'Asesor': 'asesor', 'Nº OR': 'or', 'Patente': 'patente', 'Cliente': 'cliente', 'Fecha del turno': 'fechaTurno', 'Observaciones': 'observaciones' };

var REQUERIDOS = {
  checkin: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
  checkout: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
  agendamiento: ['sucursal', 'asesor', 'cliente', 'patente', 'fechaTurno'],
  general: ['sucursal', 'asesor']
};

// Respuestas posibles de un ítem. Los checks con casillero mandan ok:true/false (= SI/NO);
// las preguntas de General mandan valor: 'SI' | 'NO' | 'NO CORRESPONDE'.
var VALORES = ['SI', 'NO', 'NO CORRESPONDE'];
var MAX_OBSERVACIONES = 2000;

var SUCURSALES_INICIALES = ['KYOTO RESISTENCIA', 'KYOTO CORRIENTES', 'KYOTO POSADAS', 'KYOTO SAENZ PEÑA'];

// ───────────────────────── Hojas ─────────────────────────

function configurarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = ss.getSheetByName(HOJA_CONFIG);
  if (!config) {
    config = ss.insertSheet(HOJA_CONFIG);
    config.appendRow(['Sucursal', 'Asesor', 'Activo']);
    SUCURSALES_INICIALES.forEach(function (s) { config.appendRow([s, 'Asesor de prueba', 'SI']); });
    config.getRange(1, 1, 1, 3).setFontWeight('bold');
    config.setFrozenRows(1);
  }
  Object.keys(HOJAS).forEach(function (tipo) { hojaDeCheck_(tipo); });
  if (!ss.getSheetByName(HOJA_RESUMEN)) ss.insertSheet(HOJA_RESUMEN);
  return true;
}

function hojaDeCheck_(tipo) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJAS[tipo]);
  if (!hoja) {
    hoja = ss.insertSheet(HOJAS[tipo]);
    hoja.appendRow(FIJAS[tipo]);
    hoja.getRange(1, 1, 1, FIJAS[tipo].length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function encabezados_(hoja) {
  var n = hoja.getLastColumn();
  return n ? hoja.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
}

// ───────────────────────── Config ─────────────────────────

function leerConfig_() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CONFIG);
  var porSucursal = {};
  var orden = [];
  if (hoja && hoja.getLastRow() > 1) {
    hoja.getRange(2, 1, hoja.getLastRow() - 1, 3).getValues().forEach(function (f) {
      var suc = String(f[0]).trim();
      var ase = String(f[1]).trim();
      var activo = String(f[2]).trim().toUpperCase() !== 'NO';
      if (!suc) return;
      if (!porSucursal[suc]) { porSucursal[suc] = []; orden.push(suc); }
      if (ase && activo && porSucursal[suc].indexOf(ase) < 0) porSucursal[suc].push(ase);
    });
  }
  return orden.map(function (s) { return { nombre: s, asesores: porSucursal[s] }; });
}

// ───────────────────────── Web app ─────────────────────────

function doGet(e) {
  var p = (e && e.parameter) || {};
  var res;
  if (p.accion === 'config') {
    configurarHojas();
    res = { ok: true, sucursales: leerConfig_() };
  } else {
    res = { ok: false, error: 'accion desconocida' };
  }
  return responder_(res, p.callback);
}

function responder_(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback && /^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}
