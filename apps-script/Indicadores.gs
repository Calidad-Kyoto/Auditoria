/**
 * Kyoto Posventa — Indicadores.gs: resumen del mes por sucursal para la solapa INDICADORES.
 *
 *   POST {accion:'indicadores', clave, mes:'2026-11'} →
 *     { ok, mes, mesAnterior, meses, actualizado, checks: [{ tipo, hoja, sucursales: [{ nombre, n, nPct, pct, nAnt, pctAnt,
 *       items: [{ etiqueta, si, no, nc, siAnt, noAnt }], textos: [{ campo, texto, fecha, asesor, ref }] }] }] }
 *
 * Clave optativa: si la celda "Clave de indicadores" de la hoja Ajustes está vacía, los indicadores se ven sin clave;
 * si tiene algo, se pide (el resumen trae observaciones y nombres de clientes, y la aplicación web es pública).
 */

var HOJA_AJUSTES = 'Ajustes';
var AJUSTE_CLAVE = 'Clave de indicadores';
var MAX_TEXTOS = 100;

function crearAjustes_(ss) {
  if (ss.getSheetByName(HOJA_AJUSTES)) return;
  var hoja = ss.insertSheet(HOJA_AJUSTES);
  hoja.appendRow(['Ajuste', 'Valor', 'Nota']);
  hoja.appendRow([AJUSTE_CLAVE, '', 'Vacía = INDICADORES se ve sin clave. Si escribís una clave, la página la pide.']);
  hoja.getRange(1, 1, 1, 3).setFontWeight('bold');
  hoja.setFrozenRows(1);
}

function claveIndicadores_() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_AJUSTES);
  if (!hoja || hoja.getLastRow() < 2) return '';
  var filas = hoja.getRange(2, 1, hoja.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i][0]).trim() === AJUSTE_CLAVE) return String(filas[i][1]).trim();
  }
  return '';
}

function mesAnterior_(mes) {
  var p = mes.split('-');
  var a = Number(p[0]);
  var m = Number(p[1]) - 1;
  if (m === 0) { a--; m = 12; }
  return a + '-' + (m < 10 ? '0' : '') + m;
}

function indicadores_(p) {
  configurarHojas();
  var clave = claveIndicadores_();
  if (clave && String(p.clave || '').trim() !== clave) throw new Error('clave incorrecta');

  var tz = Session.getScriptTimeZone();
  var mes = /^\d{4}-\d{2}$/.test(String(p.mes || '')) ? p.mes : Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  var ant = mesAnterior_(mes);
  var meses = {};
  meses[Utilities.formatDate(new Date(), tz, 'yyyy-MM')] = true;
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var checks = Object.keys(HOJAS).map(function (tipo) {
    var res = { tipo: tipo, hoja: HOJAS[tipo], sucursales: [] };
    var hoja = ss.getSheetByName(HOJAS[tipo]);
    if (!hoja || hoja.getLastRow() < 2) return res;
    var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
    var enc = datos[0].map(String);
    var cF = enc.indexOf('Fecha/Hora');
    var cS = enc.indexOf('Sucursal');
    var cA = enc.indexOf('Asesor') >= 0 ? enc.indexOf('Asesor') : enc.indexOf('APS');
    var cP = enc.indexOf('% Cumplimiento');
    var cR = enc.indexOf('Nº OR') >= 0 ? enc.indexOf('Nº OR') : enc.indexOf('Cliente');

    // Columnas de respuesta (sólo SI / NO / NO CORRESPONDE) y de texto (observaciones, nombres de clientes).
    var respuestas = [];
    var textos = [];
    enc.forEach(function (h, c) {
      if (h === 'Observaciones') { textos.push(c); return; }
      if (!h || FIJAS[tipo].indexOf(h) >= 0 || h === 'Fotos') return;
      for (var r = 1; r < datos.length; r++) {
        var v = datos[r][c];
        if (v !== '' && v !== null && VALORES.indexOf(String(v)) < 0) { textos.push(c); return; }
      }
      respuestas.push(c);
    });

    var porSucursal = {};
    for (var r = 1; r < datos.length; r++) {
      var f = datos[r];
      var fecha = f[cF] instanceof Date ? f[cF] : new Date(f[cF]);
      if (isNaN(fecha.getTime())) continue;
      var m = Utilities.formatDate(fecha, tz, 'yyyy-MM');
      meses[m] = true;
      if (m !== mes && m !== ant) continue;
      var actual = m === mes;
      var nombre = String(f[cS] || '').trim() || 'Sin sucursal';
      var s = porSucursal[nombre];
      if (!s) {
        s = porSucursal[nombre] = { nombre: nombre, n: 0, nPct: 0, suma: 0, nAnt: 0, nPctAnt: 0, sumaAnt: 0, items: {}, textos: [] };
      }
      var pct = f[cP];
      var tienePct = pct !== '' && pct !== null && !isNaN(Number(pct));
      if (actual) { s.n++; if (tienePct) { s.nPct++; s.suma += Number(pct); } }
      else { s.nAnt++; if (tienePct) { s.nPctAnt++; s.sumaAnt += Number(pct); } }

      respuestas.forEach(function (c) {
        var v = String(f[c]);
        if (v !== 'SI' && v !== 'NO' && v !== 'NO CORRESPONDE') return;
        var it = s.items[enc[c]];
        if (!it) it = s.items[enc[c]] = { etiqueta: enc[c], orden: c, si: 0, no: 0, nc: 0, siAnt: 0, noAnt: 0 };
        if (actual) { if (v === 'SI') it.si++; else if (v === 'NO') it.no++; else it.nc++; }
        else if (v === 'SI') it.siAnt++;
        else if (v === 'NO') it.noAnt++;
      });

      if (actual) {
        textos.forEach(function (c) {
          var t = String(f[c] === null ? '' : f[c]).trim();
          if (!t) return;
          s.textos.push({
            campo: enc[c], texto: t, fecha: Utilities.formatDate(fecha, tz, 'yyyy-MM-dd HH:mm'),
            asesor: cA >= 0 ? String(f[cA]) : '', ref: cR >= 0 ? String(f[cR]) : '', t: fecha.getTime()
          });
        });
      }
    }

    res.sucursales = Object.keys(porSucursal).sort().map(function (k) {
      var s = porSucursal[k];
      if (!s.n) return null; // sólo sucursales con registros en el mes elegido
      return {
        nombre: s.nombre, n: s.n, nPct: s.nPct, pct: s.nPct ? Math.round(s.suma / s.nPct) : null,
        nAnt: s.nAnt, pctAnt: s.nPctAnt ? Math.round(s.sumaAnt / s.nPctAnt) : null,
        items: Object.keys(s.items).map(function (e) { return s.items[e]; })
          .filter(function (it) { return it.si + it.no + it.nc > 0; })
          .sort(function (a, b) { return a.orden - b.orden; })
          .map(function (it) { return { etiqueta: it.etiqueta, si: it.si, no: it.no, nc: it.nc, siAnt: it.siAnt, noAnt: it.noAnt }; }),
        textos: s.textos.sort(function (a, b) { return b.t - a.t; }).slice(0, MAX_TEXTOS)
          .map(function (x) { return { campo: x.campo, texto: x.texto, fecha: x.fecha, asesor: x.asesor, ref: x.ref }; })
      };
    }).filter(Boolean);
    return res;
  });

  return {
    ok: true, mes: mes, mesAnterior: ant, meses: Object.keys(meses).sort().reverse(),
    actualizado: new Date().toISOString(), checks: checks
  };
}
