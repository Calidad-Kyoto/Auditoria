/**
 * Kyoto Posventa — Guardar.gs: POST que agrega un check a su hoja.
 */

function doPost(e) {
  var res;
  try {
    var p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (p.accion !== 'guardar') throw new Error('accion desconocida');
    res = guardarCheck_(p);
  } catch (err) {
    res = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return responder_(res);
}

// ───────────────────────── Guardar ─────────────────────────

function validar_(p) {
  if (!HOJAS[p.tipo]) throw new Error('tipo de check desconocido');
  if (typeof p.idEnvio !== 'string' || p.idEnvio.length < 8 || p.idEnvio.length > 64) throw new Error('idEnvio inválido');
  var d = p.datos || {};
  REQUERIDOS[p.tipo].forEach(function (k) {
    if (!d[k] || !String(d[k]).trim()) throw new Error('falta el dato: ' + k);
  });
  var suc = leerConfig_().filter(function (s) { return s.nombre === d.sucursal; })[0];
  if (!suc || suc.asesores.indexOf(d.asesor) < 0) throw new Error('Asesor no habilitado para esa sucursal');
  if (!Array.isArray(p.items) || !p.items.length) throw new Error('el check no tiene ítems');
  var vistas = {};
  p.items.forEach(function (it) {
    if (!it || typeof it.etiqueta !== 'string' || !it.etiqueta.trim()) throw new Error('ítem inválido');
    if (it.valor !== undefined ? VALORES.indexOf(it.valor) < 0 : typeof it.ok !== 'boolean') throw new Error('respuesta inválida: ' + it.etiqueta);
    if (vistas[it.etiqueta]) throw new Error('ítem repetido: ' + it.etiqueta);
    vistas[it.etiqueta] = true;
  });
  if (d.observaciones !== undefined && String(d.observaciones).length > MAX_OBSERVACIONES) {
    throw new Error('las observaciones superan los ' + MAX_OBSERVACIONES + ' caracteres');
  }
}

// 'SI' | 'NO' | 'NO CORRESPONDE' de un ítem, venga como ok (casillero) o como valor (pregunta).
function valorDe_(it) {
  return it.valor !== undefined ? it.valor : (it.ok ? 'SI' : 'NO');
}

function guardarCheck_(p) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    configurarHojas();
    validar_(p);
    var hoja = hojaDeCheck_(p.tipo);
    var enc = encabezados_(hoja);

    var colId = enc.indexOf(COL_ID);
    if (hoja.getLastRow() > 1) {
      var ids = hoja.getRange(2, colId + 1, hoja.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === p.idEnvio) return { ok: true, duplicado: true, fila: i + 2 };
      }
    }

    var nuevas = p.items.map(function (it) { return it.etiqueta; }).filter(function (et) { return enc.indexOf(et) < 0; });
    if (nuevas.length) {
      hoja.getRange(1, enc.length + 1, 1, nuevas.length).setValues([nuevas]).setFontWeight('bold');
      enc = enc.concat(nuevas);
    }

    // Los ítems "NO CORRESPONDE" no cuentan para el cumplimiento.
    var valores = p.items.map(valorDe_);
    var okCount = valores.filter(function (v) { return v === 'SI'; }).length;
    var aplicables = valores.filter(function (v) { return v !== 'NO CORRESPONDE'; }).length;
    var fecha = new Date(p.creado);
    if (isNaN(fecha.getTime())) fecha = new Date();
    var fila = enc.map(function (h) {
      if (h === 'Fecha/Hora') return fecha;
      if (h === '% Cumplimiento') return aplicables ? Math.round(okCount * 100 / aplicables) : '';
      if (h === 'Ítems OK') return okCount;
      if (h === 'Ítems totales') return aplicables;
      if (h === COL_ID) return p.idEnvio;
      if (CAMPOS[h]) return String(p.datos[CAMPOS[h]] || '').trim();
      return '';
    });
    p.items.forEach(function (it, i) { fila[enc.indexOf(it.etiqueta)] = valores[i]; });
    hoja.appendRow(fila);
    return { ok: true, duplicado: false, fila: hoja.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}
