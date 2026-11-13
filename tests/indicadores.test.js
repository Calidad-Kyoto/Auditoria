'use strict';
// Solapa INDICADORES: resumen del Apps Script (Indicadores.gs) + análisis y HTML de js/indicadores.js.
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const I = require('../js/indicadores.js');
const CATALOGO = require('../js/catalogo.js');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

function post(ctx, cuerpo) {
  return leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(cuerpo) } }));
}
function checkin(ctx, id, creado, sucursal, marcados, observaciones) {
  const datos = { sucursal, asesor: 'Asesor de prueba', or: id.slice(-3), patente: 'AB123CD', cliente: 'X',
    trabajo: 'Servicio de 10.000 Km', observaciones };
  const r = post(ctx, L.construirPayload('checkin', datos, marcados, CATALOGO, id, new Date(creado)));
  assert.strictEqual(r.ok, true, r.error);
}

// Noviembre: Corrientes 2 Check In (Lavado SI y NO), Posadas 1 (Lavado SI). Octubre: Corrientes 1 (Lavado NO).
function cargarDatos() {
  const app = cargarCodigo();
  const { ctx } = app;
  checkin(ctx, 'envio-ind-01', '2026-11-03T13:00:00Z', 'KYOTO CORRIENTES', { ci_lavado: true, ci_datos_cliente: true }, 'Cliente <apurado> & enojado');
  checkin(ctx, 'envio-ind-02', '2026-11-05T13:00:00Z', 'KYOTO CORRIENTES', { ci_datos_cliente: true });
  checkin(ctx, 'envio-ind-03', '2026-11-06T13:00:00Z', 'KYOTO POSADAS', { ci_lavado: true });
  checkin(ctx, 'envio-ind-04', '2026-10-20T13:00:00Z', 'KYOTO CORRIENTES', {});
  const general = L.construirPayload('general', { sucursal: 'KYOTO CORRIENTES', asesor: 'Asesor de prueba' },
    { ge_no_show: 'NO', ge_no_show_cliente: 'Juan Pérez', ge_recordatorio_turnos: 'SI', ge_uso_epp: 'NO CORRESPONDE', ge_cobertores_capot: 'SI' },
    CATALOGO, 'envio-ind-05', new Date('2026-11-04T13:00:00Z'));
  assert.strictEqual(post(ctx, general).ok, true);
  app.clave = app.planilla.getSheetByName('Ajustes').datos[1][1];
  return app;
}

test('Ajustes guarda una clave al azar y sin ella no hay indicadores', () => {
  const { ctx, clave, planilla } = cargarDatos();
  assert.deepStrictEqual(planilla.getSheetByName('Ajustes').datos[0], ['Ajuste', 'Valor']);
  assert.strictEqual(planilla.getSheetByName('Ajustes').datos[1][0], 'Clave de indicadores');
  assert.match(clave, /^[0-9A-F]{6}$/);
  assert.deepStrictEqual(post(ctx, { accion: 'indicadores', clave: 'MALA', mes: '2026-11' }), { ok: false, error: 'clave incorrecta' });
  assert.strictEqual(post(ctx, { accion: 'indicadores', mes: '2026-11' }).error, 'clave incorrecta');
});

test('el Apps Script resume el mes por sucursal, con el mes anterior y las observaciones', () => {
  const { ctx, clave } = cargarDatos();
  const r = post(ctx, { accion: 'indicadores', clave, mes: '2026-11' });
  assert.strictEqual(r.ok, true, r.error);
  assert.strictEqual(r.mes, '2026-11');
  assert.strictEqual(r.mesAnterior, '2026-10');
  assert.ok(r.meses.includes('2026-11') && r.meses.includes('2026-10'));
  assert.deepStrictEqual(r.checks.map((c) => c.hoja), ['Check In', 'Check Out', 'Agendamiento', 'General', 'Auditoría de OR']);

  const ci = r.checks[0];
  assert.deepStrictEqual(ci.sucursales.map((s) => s.nombre), ['KYOTO CORRIENTES', 'KYOTO POSADAS']);
  const ctes = ci.sucursales[0];
  assert.strictEqual(ctes.n, 2);
  assert.strictEqual(ctes.nAnt, 1);
  const lavado = ctes.items.find((i) => i.etiqueta === 'Lavado');
  assert.deepStrictEqual(lavado, { etiqueta: 'Lavado', si: 1, no: 1, nc: 0, siAnt: 0, noAnt: 1 });
  assert.strictEqual(ctes.items.length, 26);
  assert.deepStrictEqual(ctes.textos.map((t) => [t.campo, t.texto, t.ref]), [['Observaciones', 'Cliente <apurado> & enojado', '-01']]);
  assert.strictEqual(r.checks[1].sucursales.length, 0); // Check Out sin registros

  const ge = r.checks[3].sucursales[0];
  assert.deepStrictEqual(ge.textos.map((t) => [t.campo, t.texto]), [['Control No show – Nombre del cliente', 'Juan Pérez']]);
  const noShow = ge.items.find((i) => i.etiqueta === 'Control No show');
  assert.strictEqual(noShow.no, 1);
  assert.ok(!ge.items.some((i) => i.etiqueta.includes('Nombre del cliente')), 'la columna de nombres no es un indicador SI/NO');
});

test('octubre no trae los registros de noviembre', () => {
  const { ctx, clave } = cargarDatos();
  const r = post(ctx, { accion: 'indicadores', clave, mes: '2026-10' });
  assert.deepStrictEqual(r.checks[0].sucursales.map((s) => [s.nombre, s.n]), [['KYOTO CORRIENTES', 1]]);
  assert.strictEqual(r.checks[3].sucursales.length, 0);
});

test('combinar y analizar: todas las sucursales, mejor y peor, tendencia y casos', () => {
  const { ctx, clave } = cargarDatos();
  const r = post(ctx, { accion: 'indicadores', clave, mes: '2026-11' });
  const c = I.combinar(r.checks[0], '');
  assert.strictEqual(c.n, 3);
  const lav = c.items.find((i) => i.etiqueta === 'Lavado');
  assert.deepStrictEqual([lav.si, lav.no], [2, 1]);
  const a = I.analizar(c, r.mes, r.mesAnterior);
  const tLav = a.items.find((i) => i.etiqueta === 'Lavado').texto;
  assert.match(tLav, /^Lavado: 67 % de SI \(2 de 3\)\. Crítico, requiere acción\./);
  assert.match(tLav, /Mejor: KYOTO POSADAS \(100 %\); más bajo: KYOTO CORRIENTES \(50 %\)\./);
  assert.match(tLav, /Mejoró 67 puntos respecto de octubre 2026 \(0 %\)\./);
  assert.match(a.resumen, /^Check In: 3 registros en noviembre 2026 con \d+ % de cumplimiento promedio/);
  assert.match(a.resumen, /Hay 1 observación cargada\./);
  // de peor a mejor
  const pcts = a.items.filter((i) => i.pct !== null).map((i) => i.pct);
  assert.deepStrictEqual(pcts, [...pcts].sort((x, y) => x - y));

  const sola = I.combinar(r.checks[0], 'KYOTO POSADAS');
  assert.strictEqual(sola.n, 1);
  assert.ok(!I.analizar(sola, r.mes, r.mesAnterior).items.some((i) => i.texto.includes('Mejor:')));

  const ge = I.analizar(I.combinar(r.checks[3], ''), r.mes, r.mesAnterior);
  assert.match(ge.items.find((i) => i.etiqueta === 'Control No show').texto, /Casos informados: Juan Pérez\./);
});

test('HTML de la solapa y del informe: tablas, observaciones escapadas, logo', () => {
  const { ctx, clave } = cargarDatos();
  const r = post(ctx, { accion: 'indicadores', clave, mes: '2026-11' });
  const filtros = { mes: '2026-11', sucursal: '' };
  const html = I.htmlContenido(r, filtros);
  assert.ok(html.includes('Cliente &lt;apurado&gt; &amp; enojado'));
  assert.ok(!html.includes('<apurado>'));
  assert.ok(html.includes('class="ind-matriz') || html.includes('ind-tabla ind-matriz'));
  assert.ok(html.includes('Análisis por indicador'));
  assert.ok(html.includes('Sin registros en noviembre 2026.')); // Check Out
  assert.strictEqual(html.split('class="ind-check"').length - 1, 2); // con datos: Check In y General
  const controles = I.htmlControles(r, filtros, ['KYOTO RESISTENCIA']);
  assert.ok(controles.includes('<option value="2026-10">Octubre 2026</option>'));
  assert.ok(controles.includes('<option value="KYOTO RESISTENCIA">'));
  assert.ok(controles.includes('id="ind-pdf"'));
  const informe = I.htmlInforme(r, { mes: '2026-11', sucursal: 'KYOTO CORRIENTES' }, '2026-11-13T15:00:00Z');
  assert.ok(informe.includes('src="img/logo-nissan-kyoto.png"'));
  assert.ok(informe.includes('Informe de indicadores · Posventa'));
  assert.ok(informe.includes('Noviembre 2026 · KYOTO CORRIENTES'));
  assert.ok(!informe.includes('KYOTO POSADAS'), 'el informe de una sucursal no muestra las otras');
});

test('semáforo y meses', () => {
  assert.deepStrictEqual([I.estado(95), I.estado(90), I.estado(89), I.estado(75), I.estado(74), I.estado(null)],
    ['ok', 'ok', 'alerta', 'alerta', 'mal', 'sin']);
  assert.strictEqual(I.nombreMes('2026-01'), 'enero 2026');
  assert.strictEqual(I.porcentaje(0, 0), null);
});
