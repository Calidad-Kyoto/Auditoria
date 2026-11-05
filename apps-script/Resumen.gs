/**
 * Kyoto Posventa — Resumen.gs: hoja Resumen, disparador horario y menú.
 */

// ───────────────────────── Resumen ─────────────────────────

function actualizarResumen() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  configurarHojas();
  var tz = Session.getScriptTimeZone();
  var grupos = {};
  var fallas = {};

  Object.keys(HOJAS).forEach(function (tipo) {
    var hoja = ss.getSheetByName(HOJAS[tipo]);
    if (hoja.getLastRow() < 2) return;
    var datos = hoja.getRange(1, 1, hoja.getLastRow(), hoja.getLastColumn()).getValues();
    var enc = datos[0].map(String);
    var cF = enc.indexOf('Fecha/Hora'), cS = enc.indexOf('Sucursal'), cA = enc.indexOf('Asesor') >= 0 ? enc.indexOf('Asesor') : enc.indexOf('APS'), cP = enc.indexOf('% Cumplimiento');
    var inicioItems = enc.indexOf(COL_ID) + 1;
    for (var r = 1; r < datos.length; r++) {
      var f = datos[r];
      var fecha = f[cF] instanceof Date ? f[cF] : new Date(f[cF]);
      var mes = isNaN(fecha.getTime()) ? 'sin fecha' : Utilities.formatDate(fecha, tz, 'yyyy-MM');
      var clave = [mes, HOJAS[tipo], f[cS], f[cA]].join('|');
      if (!grupos[clave]) grupos[clave] = { mes: mes, check: HOJAS[tipo], suc: f[cS], ase: f[cA], n: 0, conPct: 0, suma: 0 };
      grupos[clave].n++;
      if (f[cP] !== '' && f[cP] !== null) { grupos[clave].conPct++; grupos[clave].suma += Number(f[cP]) || 0; } // vacío = todo NO CORRESPONDE
      for (var c = inicioItems; c < enc.length; c++) {
        if (f[c] !== 'SI' && f[c] !== 'NO') continue; // observaciones, NO CORRESPONDE y vacías no cuentan
        var k = HOJAS[tipo] + '|' + enc[c];
        if (!fallas[k]) fallas[k] = { check: HOJAS[tipo], item: enc[c], no: 0, total: 0 };
        fallas[k].total++;
        if (f[c] === 'NO') fallas[k].no++;
      }
    }
  });

  var filas = [['Mes', 'Check', 'Sucursal', 'Asesor', 'Cantidad', '% promedio']];
  Object.keys(grupos).map(function (k) { return grupos[k]; })
    .sort(function (a, b) {
      return a.mes < b.mes ? 1 : a.mes > b.mes ? -1 : (a.check + a.suc + a.ase).localeCompare(b.check + b.suc + b.ase);
    })
    .forEach(function (g) { filas.push([g.mes, g.check, g.suc, g.ase, g.n, g.conPct ? Math.round(g.suma / g.conPct) : '']); });

  filas.push(['', '', '', '', '', '']);
  filas.push(['Check', 'Ítem', 'Veces NO', 'Total', '% NO', '']);
  Object.keys(HOJAS).forEach(function (tipo) {
    Object.keys(fallas).map(function (k) { return fallas[k]; })
      .filter(function (x) { return x.check === HOJAS[tipo] && x.no > 0; })
      .sort(function (a, b) { return b.no - a.no || a.item.localeCompare(b.item); })
      .slice(0, 10)
      .forEach(function (x) { filas.push([x.check, x.item, x.no, x.total, Math.round(x.no * 100 / x.total), '']); });
  });

  var res = ss.getSheetByName(HOJA_RESUMEN);
  res.clear();
  res.getRange(1, 1, filas.length, 6).setValues(filas);
  res.getRange(1, 1, 1, 6).setFontWeight('bold');
  return filas.length;
}

// ───────────────────────── Instalación ─────────────────────────

function instalar() {
  configurarHojas();
  var existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'actualizarResumen'; });
  if (!existe) ScriptApp.newTrigger('actualizarResumen').timeBased().everyHours(1).create();
  actualizarResumen();
  return true;
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Posventa')
    .addItem('Actualizar resumen', 'actualizarResumen')
    .addItem('Configurar hojas', 'configurarHojas')
    .addToUi();
}
