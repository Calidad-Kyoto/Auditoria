/* Solapa INDICADORES: combina los datos por sucursal, analiza cada indicador y arma el HTML
 * (pantalla e informe PDF). Sin DOM: window.Indicadores en el navegador, require en Node para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Indicadores = fabrica();
})(this, function () {
  var META = 90;    // % de SI para "cumple"
  var ALERTA = 75;  // debajo de esto es "crítico"
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var TEXTO_ESTADO = { ok: 'cumple la meta', alerta: 'por debajo de la meta', mal: 'crítico, requiere acción', sin: 'sin datos' };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function mayuscula(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function nombreMes(mes) {
    var p = String(mes || '').split('-');
    var nombre = MESES[Number(p[1]) - 1];
    return nombre ? nombre + ' ' + p[0] : String(mes || '');
  }
  function porcentaje(si, no) { return si + no ? Math.round(si * 100 / (si + no)) : null; }
  function estado(p) { return p === null || p === undefined ? 'sin' : p >= META ? 'ok' : p >= ALERTA ? 'alerta' : 'mal'; }

  // Une los datos de un check para la sucursal elegida ('' = todas).
  function combinar(check, sucursal) {
    var sucs = check.sucursales.filter(function (s) { return !sucursal || s.nombre === sucursal; });
    var c = { tipo: check.tipo, hoja: check.hoja, sucursales: sucs.map(function (s) { return s.nombre; }),
      n: 0, nPct: 0, suma: 0, nAnt: 0, nPctAnt: 0, sumaAnt: 0, items: [], textos: [] };
    var porEtiqueta = {};
    sucs.forEach(function (s) {
      c.n += s.n;
      c.nAnt += s.nAnt || 0;
      if (s.pct !== null && s.pct !== undefined) { c.nPct += s.nPct; c.suma += s.pct * s.nPct; }
      if (s.pctAnt !== null && s.pctAnt !== undefined) { c.nPctAnt += s.nAnt; c.sumaAnt += s.pctAnt * s.nAnt; }
      s.items.forEach(function (it) {
        var x = porEtiqueta[it.etiqueta];
        if (!x) {
          x = porEtiqueta[it.etiqueta] = { etiqueta: it.etiqueta, si: 0, no: 0, nc: 0, siAnt: 0, noAnt: 0, porSucursal: [] };
          c.items.push(x);
        }
        x.si += it.si; x.no += it.no; x.nc += it.nc; x.siAnt += it.siAnt; x.noAnt += it.noAnt;
        x.porSucursal.push({ nombre: s.nombre, si: it.si, no: it.no });
      });
      s.textos.forEach(function (t) { c.textos.push(Object.assign({ sucursal: s.nombre }, t)); });
    });
    c.pct = c.nPct ? Math.round(c.suma / c.nPct) : null;
    c.pctAnt = c.nPctAnt ? Math.round(c.sumaAnt / c.nPctAnt) : null;
    c.textos.sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
    return c;
  }

  function tendencia(p, pAnt, mesAnt) {
    if (p === null || pAnt === null || pAnt === undefined) return '';
    var d = p - pAnt;
    if (d === 0) return ' Igual que en ' + nombreMes(mesAnt) + '.';
    return (d > 0 ? ' Mejoró ' : ' Bajó ') + Math.abs(d) + (Math.abs(d) === 1 ? ' punto' : ' puntos') +
      ' respecto de ' + nombreMes(mesAnt) + ' (' + pAnt + ' %).';
  }

  // Análisis de un check combinado: un resumen y una línea por indicador (de peor a mejor).
  function analizar(c, mes, mesAnt) {
    var items = c.items.map(function (it) {
      var p = porcentaje(it.si, it.no);
      var e = estado(p);
      var t;
      if (p === null) {
        t = it.etiqueta + ': sin respuestas SI/NO en ' + nombreMes(mes) + (it.nc ? ' (' + it.nc + ' no corresponde).' : '.');
      } else {
        t = it.etiqueta + ': ' + p + ' % de SI (' + it.si + ' de ' + (it.si + it.no) + ')' +
          (it.nc ? ', ' + it.nc + ' no corresponde' : '') + '. ' + mayuscula(TEXTO_ESTADO[e]) + '.';
        var conDatos = it.porSucursal.filter(function (s) { return s.si + s.no > 0; })
          .map(function (s) { return { nombre: s.nombre, p: porcentaje(s.si, s.no) }; })
          .sort(function (a, b) { return b.p - a.p; });
        if (conDatos.length > 1 && conDatos[0].p !== conDatos[conDatos.length - 1].p) {
          var peor = conDatos[conDatos.length - 1];
          t += ' Mejor: ' + conDatos[0].nombre + ' (' + conDatos[0].p + ' %); más bajo: ' + peor.nombre + ' (' + peor.p + ' %).';
        }
        t += tendencia(p, porcentaje(it.siAnt, it.noAnt), mesAnt);
        var casos = c.textos.filter(function (x) { return x.campo.indexOf(it.etiqueta + ' – ') === 0; })
          .map(function (x) { return x.texto; });
        if (casos.length) t += ' Casos informados: ' + casos.join(', ') + '.';
      }
      return { etiqueta: it.etiqueta, pct: p, estado: e, texto: t };
    }).sort(function (a, b) {
      return (a.pct === null ? 101 : a.pct) - (b.pct === null ? 101 : b.pct);
    });

    var resumen;
    if (!c.n) {
      resumen = c.hoja + ': sin registros en ' + nombreMes(mes) + '.';
    } else {
      var conDato = items.filter(function (i) { return i.pct !== null; });
      var cumplen = conDato.filter(function (i) { return i.estado === 'ok'; }).length;
      var bajos = conDato.filter(function (i) { return i.estado !== 'ok'; }).slice(0, 3);
      resumen = c.hoja + ': ' + c.n + (c.n === 1 ? ' registro' : ' registros') + ' en ' + nombreMes(mes) +
        (c.pct !== null ? ' con ' + c.pct + ' % de cumplimiento promedio (' + TEXTO_ESTADO[estado(c.pct)] + ').' : '.') +
        ' ' + cumplen + ' de ' + conDato.length + ' indicadores cumplen la meta del ' + META + ' %.' +
        (bajos.length ? ' Los más bajos: ' + bajos.map(function (i) { return i.etiqueta + ' (' + i.pct + ' %)'; }).join('; ') + '.' : '') +
        tendencia(c.pct, c.pctAnt, mesAnt) +
        (c.textos.length ? ' Hay ' + c.textos.length + (c.textos.length === 1 ? ' observación cargada.' : ' observaciones cargadas.') : '');
    }
    return { resumen: resumen, estado: estado(c.pct), items: items };
  }

  function sucursalesDe(datos, extra) {
    var vistas = [];
    datos.checks.forEach(function (ch) { ch.sucursales.forEach(function (s) { if (vistas.indexOf(s.nombre) < 0) vistas.push(s.nombre); }); });
    (extra || []).forEach(function (n) { if (vistas.indexOf(n) < 0) vistas.push(n); });
    return vistas.sort();
  }

  // ───────── HTML ─────────

  function barra(p) {
    if (p === null) return '<div class="ind-barra ind-barra--vacia"></div>';
    return '<div class="ind-barra" role="img" aria-label="' + p + ' % de SI"><span class="ind-barra__si" style="width:' + p +
      '%"></span><span class="ind-barra__no" style="width:' + (100 - p) + '%"></span></div>';
  }
  function chip(p) {
    return '<span class="ind-chip ind-chip--' + estado(p) + '">' + (p === null ? '—' : p + ' %') + '</span>';
  }

  function htmlControles(datos, filtros, sucursalesExtra) {
    var meses = (datos && datos.meses) || [filtros.mes];
    return '<div class="ind-controles">' +
      '<label class="campo"><span>Mes</span><select id="ind-mes">' + meses.map(function (m) {
        return '<option value="' + esc(m) + '"' + (m === filtros.mes ? ' selected' : '') + '>' + esc(mayuscula(nombreMes(m))) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="campo"><span>Sucursal</span><select id="ind-sucursal"><option value="">Todas las sucursales</option>' +
      (datos ? sucursalesDe(datos, sucursalesExtra) : []).map(function (s) {
        return '<option value="' + esc(s) + '"' + (s === filtros.sucursal ? ' selected' : '') + '>' + esc(s) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="ind-acciones"><button type="button" id="ind-actualizar" class="ind-boton">Actualizar</button>' +
      '<button type="button" id="ind-pdf" class="ind-boton ind-boton--rojo">Descargar PDF</button></div>' +
      '<p class="ind-actualizado">' + (datos ? 'Actualizado ' + esc(horaLocal(datos.actualizado)) + ' · se actualiza solo cada minuto' : '') + '</p>' +
      '</div>';
  }

  function horaLocal(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var dos = function (n) { return (n < 10 ? '0' : '') + n; };
    return dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes());
  }

  function htmlTarjetas(combinados, datos) {
    return '<div class="ind-tarjetas">' + combinados.map(function (c) {
      return '<div class="ind-tarjeta ind-tarjeta--' + estado(c.pct) + '"><span class="ind-tarjeta__titulo">' + esc(c.hoja) + '</span>' +
        '<span class="ind-tarjeta__pct">' + (c.pct === null ? '—' : c.pct + ' %') + '</span>' +
        '<span class="ind-tarjeta__det">' + c.n + (c.n === 1 ? ' registro' : ' registros') +
        (c.pctAnt !== null ? ' · ' + esc(nombreMes(datos.mesAnterior).split(' ')[0]) + ': ' + c.pctAnt + ' %' : '') + '</span></div>';
    }).join('') + '</div>';
  }

  // Tabla sucursal × check (sólo con "Todas las sucursales").
  function htmlMatriz(datos) {
    var sucs = sucursalesDe(datos);
    if (sucs.length < 2) return '';
    return '<table class="ind-tabla ind-matriz"><thead><tr><th>Sucursal</th>' + datos.checks.map(function (ch) {
      return '<th>' + esc(ch.hoja) + '</th>';
    }).join('') + '</tr></thead><tbody>' + sucs.map(function (s) {
      return '<tr><th scope="row">' + esc(s) + '</th>' + datos.checks.map(function (ch) {
        var x = ch.sucursales.filter(function (y) { return y.nombre === s; })[0];
        return '<td>' + (x ? chip(x.pct) + '<small> ' + x.n + ' reg.</small>' : '<span class="ind-nada">—</span>') + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }

  function htmlCheck(c, a, datos, todas) {
    if (!c.n) {
      return '<section class="ind-check ind-check--vacio"><h3 class="seccion__titulo">' + esc(c.hoja) + '</h3>' +
        '<p class="ind-nada">Sin registros en ' + esc(nombreMes(datos.mes)) + '.</p></section>';
    }
    var varias = todas && c.sucursales.length > 1;
    var cab = '<tr><th>Indicador</th><th class="ind-col-barra">SI / NO</th><th>% SI</th><th>% NO</th><th class="ind-col-cuentas">SI · NO · N/C</th>' +
      (varias ? c.sucursales.map(function (s) { return '<th class="ind-col-suc">' + esc(s.replace(/^KYOTO /, '')) + '</th>'; }).join('') : '') +
      '<th>vs ' + esc(nombreMes(datos.mesAnterior).split(' ')[0]) + '</th></tr>';
    var filas = c.items.map(function (it) {
      var p = porcentaje(it.si, it.no);
      var pAnt = porcentaje(it.siAnt, it.noAnt);
      var d = p !== null && pAnt !== null ? p - pAnt : null;
      return '<tr class="ind-fila ind-fila--' + estado(p) + '"><td class="ind-etiqueta">' + esc(it.etiqueta) + '</td><td class="ind-col-barra">' + barra(p) + '</td>' +
        '<td class="ind-num">' + (p === null ? '—' : p + ' %') + '</td><td class="ind-num">' + (p === null ? '—' : (100 - p) + ' %') + '</td>' +
        '<td class="ind-num ind-col-cuentas">' + it.si + ' · ' + it.no + ' · ' + it.nc + '</td>' +
        (varias ? c.sucursales.map(function (s) {
          var x = it.porSucursal.filter(function (y) { return y.nombre === s; })[0];
          return '<td class="ind-num">' + (x ? chip(porcentaje(x.si, x.no)) : '—') + '</td>';
        }).join('') : '') +
        '<td class="ind-num ind-var' + (d === null ? '' : d > 0 ? ' ind-var--sube' : d < 0 ? ' ind-var--baja' : '') + '">' +
        (d === null ? '—' : (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= ') + d) + '</td></tr>';
    }).join('');
    var obs = '<aside class="ind-obs"><h4>Observaciones (' + c.textos.length + ')</h4>' + (c.textos.length
      ? '<ul>' + c.textos.map(function (t) {
        return '<li class="ind-obs__item"><span class="ind-obs__meta">' + esc(t.fecha) + ' · ' + esc(t.sucursal.replace(/^KYOTO /, '')) +
          (t.asesor ? ' · ' + esc(t.asesor) : '') + (t.ref ? ' · ' + esc(t.ref) : '') + '</span>' +
          (t.campo !== 'Observaciones' ? '<span class="ind-obs__campo">' + esc(t.campo) + '</span>' : '') +
          '<span class="ind-obs__texto">' + esc(t.texto) + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="ind-nada">Sin observaciones en el mes.</p>') + '</aside>';
    return '<section class="ind-check"><h3 class="seccion__titulo">' + esc(c.hoja) + ' · ' + chip(c.pct) + '</h3>' +
      '<div class="ind-cuerpo"><div class="ind-tabla-caja"><table class="ind-tabla"><thead>' + cab + '</thead><tbody>' + filas +
      '</tbody></table></div>' + obs + '</div>' +
      '<div class="ind-analisis"><h4>Análisis por indicador</h4><p class="ind-analisis__resumen">' + esc(a.resumen) + '</p><ul>' +
      a.items.map(function (i) { return '<li class="ind-analisis__item ind-analisis__item--' + i.estado + '">' + esc(i.texto) + '</li>'; }).join('') +
      '</ul></div></section>';
  }

  // Todo el contenido (pantalla e informe): resumen general, tarjetas, matriz y un bloque por check.
  function htmlContenido(datos, filtros) {
    var todas = !filtros.sucursal;
    var combinados = datos.checks.map(function (ch) { return combinar(ch, filtros.sucursal); });
    var analisis = combinados.map(function (c) { return analizar(c, datos.mes, datos.mesAnterior); });
    var conDatos = combinados.filter(function (c) { return c.pct !== null; });
    var debajo = conDatos.filter(function (c) { return estado(c.pct) !== 'ok'; });
    var general = !conDatos.length
      ? 'No hay registros en ' + nombreMes(datos.mes) + (todas ? '' : ' para ' + filtros.sucursal) + '.'
      : (debajo.length
        ? 'Debajo de la meta del ' + META + ' %: ' + debajo.map(function (c) { return c.hoja + ' (' + c.pct + ' %)'; }).join(', ') + '.'
        : 'Todos los controles con datos cumplen la meta del ' + META + ' %.') +
        ' Total de registros: ' + combinados.reduce(function (s, c) { return s + c.n; }, 0) + '.';
    return '<div class="ind-contenido"><p class="ind-general">' + esc(general) + '</p>' +
      htmlTarjetas(combinados, datos) + (todas ? htmlMatriz(datos) : '') +
      combinados.map(function (c, i) { return htmlCheck(c, analisis[i], datos, todas); }).join('') + '</div>';
  }

  function htmlInforme(datos, filtros, emitido) {
    return '<div class="informe"><header class="informe__cabecera"><img class="informe__logo" src="img/logo-nissan-kyoto.png" alt="Nissan Kyoto">' +
      '<div class="informe__titulos"><h1>Informe de indicadores · Posventa</h1><p>' + esc(mayuscula(nombreMes(datos.mes))) + ' · ' +
      esc(filtros.sucursal || 'Todas las sucursales') + ' · Emitido ' + esc(horaLocal(emitido)) + '</p></div></header>' +
      htmlContenido(datos, filtros) +
      '<footer class="informe__pie">Kyoto Automotores · Concesionario Oficial Nissan · Calidad · Meta: ' + META + ' % de SI · ' +
      'Verde ≥ ' + META + ' %, amarillo ' + ALERTA + '–' + (META - 1) + ' %, rojo &lt; ' + ALERTA + ' %</footer></div>';
  }

  return {
    META: META, ALERTA: ALERTA, esc: esc, nombreMes: nombreMes, porcentaje: porcentaje, estado: estado,
    combinar: combinar, analizar: analizar, sucursalesDe: sucursalesDe,
    htmlControles: htmlControles, htmlContenido: htmlContenido, htmlInforme: htmlInforme
  };
});
