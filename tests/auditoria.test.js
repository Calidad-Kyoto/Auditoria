'use strict';
// Solapa AUDITORÍA DE OR: copia del Google Form "Auditoría de Órdenes".
const test = require('node:test');
const assert = require('node:assert');
const L = require('../js/logica.js');
const V = require('../js/vista.js');
const CATALOGO = require('../js/catalogo.js');
const { cargarCodigo, leerSalida } = require('./gas-sim.js');

const items = L.itemsDe(CATALOGO, 'auditoria');
const preguntas = items.filter((i) => i.opciones);
const DATOS = { sucursal: 'KYOTO RESISTENCIA', or: '123456', fechaCierre: '2026-11-04',
  aps: '926 - Barboza Maximiliano Roberto', mecanico: '94 - Britos Cristian', firmaCalidad: '229 - Navarro Leonardo Luis' };
const cuenta = (html, s) => html.split(s).length - 1;

// Todo "SI", con la proforma usada y la prueba de manejo hecha.
function todoSi() {
  return Object.fromEntries(preguntas.map((i) => [i.id, 'SI']));
}

test('el catálogo copia el form: 22 preguntas SI/NO en 7 secciones y 7 observaciones', () => {
  assert.strictEqual(preguntas.length, 22);
  assert.strictEqual(items.filter((i) => i.observacion).length, 7);
  assert.deepStrictEqual(CATALOGO.auditoria.secciones.map((s) => s.titulo),
    ['A. Apertura de órdenes', 'B. Proforma', 'C. Checks', 'D. Prueba de manejo', 'E. Control cruzado', 'F. Inspección final', 'G. Herramientas APS']);
  assert.deepStrictEqual(preguntas.filter((i) => i.obligatoria).map((i) => i.id),
    ['au_a1', 'au_a2', 'au_a3', 'au_a4', 'au_a5', 'au_b1', 'au_c1', 'au_c2', 'au_c3', 'au_e1', 'au_f1', 'au_g1']);
  for (const i of preguntas) assert.deepStrictEqual(i.opciones, ['SI', 'NO']);
  assert.strictEqual(new Set(items.map((i) => i.etiqueta)).size, items.length);
  assert.strictEqual(CATALOGO.auditoria.hoja, 'Auditoría de OR');
});

test('las fotos de ejemplo del form existen', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const fotos = items.filter((i) => i.foto).map((i) => i.foto);
  assert.deepStrictEqual(fotos, ['img/au_a1.jpg', 'img/au_a2.jpg', 'img/au_a5.jpg', 'img/au_g2.jpg', 'img/au_g3.jpg']);
  for (const f of fotos) assert.ok(fs.statSync(path.join(__dirname, '..', f)).size > 5000, f);
});

test('la vista: secciones, condicionales ocultas al inicio, observaciones, fotos y desplegables', () => {
  const html = V.htmlCheck('auditoria', CATALOGO);
  assert.strictEqual(cuenta(html, 'class="respuesta"'), 44);
  assert.strictEqual(cuenta(html, 'class="respuesta-texto"'), 7);
  assert.strictEqual(cuenta(html, 'class="seccion__titulo"'), 7);
  assert.strictEqual(cuenta(html, ' hidden>'), 9); // B2-B6, D2, D3, G2, G3
  assert.ok(html.includes('data-si-id="au_b2" data-si-valor="NO"'));
  assert.ok(html.includes('class="fotos__input"'));
  assert.ok(html.includes('src="img/au_g2.jpg"'));
  const datos = V.htmlDatos('auditoria', [{ nombre: 'KYOTO RESISTENCIA', asesores: [] }], { aps: ['79 - Romero Silva Matias'], mecanico: ['94 - Britos Cristian'] });
  for (const n of ['sucursal', 'or', 'fechaCierre', 'aps', 'mecanico', 'firmaCalidad']) assert.ok(datos.includes(`name="${n}"`), n);
  assert.strictEqual(cuenta(datos, '<option value="94 - Britos Cristian">'), 2); // mecánico y firma de calidad usan la misma lista
  assert.ok(!datos.includes('name="asesor"'));
  assert.ok(datos.includes('<option value="94 - Britos Cristian">94 - Britos Cristian</option>'));
});

test('condicionales: lo que no se muestra va como NO CORRESPONDE y no se exige', () => {
  const m = todoSi();
  m.au_b1 = 'NO'; // proforma no impresa → B2 a B6 no corresponden
  m.au_d1 = 'NO'; // sin prueba de manejo → D3 no corresponde, D2 sí
  m.au_g1 = 'NO'; // herramienta no abrochada → G2 y G3 no corresponden
  const p = L.construirPayload('auditoria', DATOS, m, CATALOGO, 'envio-au-01');
  const v = Object.fromEntries(p.items.map((i) => [i.id, i.valor !== undefined ? i.valor : i.texto]));
  for (const id of ['au_b2', 'au_b3', 'au_b4', 'au_b5', 'au_b6', 'au_d3', 'au_g2', 'au_g3']) assert.strictEqual(v[id], 'NO CORRESPONDE', id);
  assert.strictEqual(v.au_d2, 'SI');
  assert.strictEqual(v.au_a6, '');
  assert.deepStrictEqual(L.validarRespuestas('auditoria', {}, CATALOGO).length, 12);
  assert.deepStrictEqual(L.validarRespuestas('auditoria', m, CATALOGO), []);
  const pr = L.progreso('auditoria', { au_b1: 'SI' }, CATALOGO);
  assert.deepStrictEqual(pr, { hechos: 1, total: 14, cuestionario: true }); // 13 sin condición + B2, que se muestra porque B1 = SI
});

test('el % cuenta sólo SI/NO: ni observaciones, ni vacías, ni NO CORRESPONDE', () => {
  const m = todoSi();
  m.au_a1 = 'NO';
  m.au_b1 = 'NO';
  delete m.au_d1; // optativa sin responder → D2 y D3 ocultas
  m.au_a6 = 'Falta la firma de egreso';
  const p = L.construirPayload('auditoria', DATOS, m, CATALOGO, 'envio-au-02');
  // puntuables: A1-A5 (5) + B1 + C1-C3 (3) + E1 + F1 + G1-G3 (3) = 14, con 2 NO (A1 y B1) → 12/14
  assert.strictEqual(L.porcentaje(p.items), 86);
  assert.strictEqual(p.items.find((i) => i.id === 'au_a6').texto, 'Falta la firma de egreso');
});

test('el Apps Script guarda la auditoría con observaciones, NO CORRESPONDE y fotos en Drive', () => {
  const { ctx, planilla, drive } = cargarCodigo();
  const m = todoSi();
  m.au_g1 = 'NO';
  m.au_c4 = 'Check up sin sello';
  const foto = { nombre: 'orden.jpg', tipo: 'image/jpeg', datos: Buffer.from('foto de prueba').toString('base64') };
  const p = L.construirPayload('auditoria', DATOS, m, CATALOGO, 'envio-au-03', new Date('2026-11-05T13:00:00Z'), [foto, foto]);
  const r = leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
  assert.strictEqual(r.ok, true, r.error);
  const h = planilla.getSheetByName('Auditoría de OR');
  const v = (col) => h.datos[1][h.datos[0].indexOf(col)];
  assert.strictEqual(v('Nº OR'), '123456');
  assert.strictEqual(v('Fecha de cierre'), '2026-11-04');
  assert.strictEqual(v('APS'), '926 - Barboza Maximiliano Roberto');
  assert.strictEqual(v('Mecánico'), '94 - Britos Cristian');
  assert.strictEqual(v('Firma de control de calidad'), '229 - Navarro Leonardo Luis');
  assert.strictEqual(v('C4. Observaciones de Checks'), 'Check up sin sello');
  assert.strictEqual(v('G2. La herramienta Check In, ¿posee todas las marcas de seguimiento?'), 'NO CORRESPONDE');
  // no corresponden B3 (B2 = SI), D2 (D1 = SI), G2 y G3 (G1 = NO) → 18 SI/NO, 17 SI → 94 %
  assert.strictEqual(v('% Cumplimiento'), 94);
  assert.strictEqual(v('Fotos').split('\n').length, 2);
  assert.strictEqual(drive.archivos.length, 2);
  assert.strictEqual(drive.archivos[0].nombre, 'OR 123456 2026-11-05 (1).jpg');
  // el reintento no vuelve a subir las fotos
  leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } }));
  assert.strictEqual(drive.archivos.length, 2);
  ctx.actualizarResumen();
  const fila = planilla.getSheetByName('Resumen').datos.find((f) => f[1] === 'Auditoría de OR');
  assert.deepStrictEqual(fila.slice(1), ['Auditoría de OR', 'KYOTO RESISTENCIA', '926 - Barboza Maximiliano Roberto', 1, 94]);
});

test('Listas: destildar Activo saca la opción del desplegable', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const listas = planilla.getSheetByName('Listas');
  assert.deepStrictEqual(listas.datos[0], ['Lista', 'Opción', 'Activo']);
  const fila = listas.datos.findIndex((f) => f[1] === '84 - Lopez Guillermo');
  listas.datos[fila][2] = false; // un click en la casilla
  const r = leerSalida(ctx.doGet({ parameter: { accion: 'config' } }));
  assert.strictEqual(r.listas.aps.length, 7);
  assert.ok(!r.listas.aps.includes('84 - Lopez Guillermo'));
  assert.strictEqual(r.listas.mecanico.length, 16);
});

test('el Apps Script rechaza más de 5 fotos o archivos que no son imágenes', () => {
  const { ctx } = cargarCodigo();
  const foto = { nombre: 'x.jpg', tipo: 'image/jpeg', datos: 'AAAA' };
  const muchas = L.construirPayload('auditoria', DATOS, todoSi(), CATALOGO, 'envio-au-04', new Date(), Array(6).fill(foto));
  assert.match(leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(muchas) } })).error, /hasta 5 fotos/);
  const pdf = L.construirPayload('auditoria', DATOS, todoSi(), CATALOGO, 'envio-au-05', new Date(), [{ nombre: 'x.pdf', tipo: 'application/pdf', datos: 'AAAA' }]);
  assert.strictEqual(leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(pdf) } })).error, 'foto inválida');
});

test('una hoja Auditoría de OR creada antes suma la columna Firma de control de calidad al final', () => {
  const { ctx, planilla } = cargarCodigo();
  ctx.configurarHojas();
  const h = planilla.getSheetByName('Auditoría de OR');
  h.datos[0] = h.datos[0].filter((c) => c !== 'Firma de control de calidad'); // como estaba la versión anterior
  const p = L.construirPayload('auditoria', DATOS, todoSi(), CATALOGO, 'envio-au-06');
  assert.strictEqual(leerSalida(ctx.doPost({ postData: { contents: JSON.stringify(p) } })).ok, true);
  const enc = h.datos[0];
  assert.strictEqual(enc.indexOf('Firma de control de calidad'), 11); // después de las 11 columnas fijas viejas
  assert.strictEqual(h.datos[1][enc.indexOf('Firma de control de calidad')], '229 - Navarro Leonardo Luis');
  assert.strictEqual(h.datos[1][enc.indexOf('Nº OR')], '123456');
});

test('sin firma de control de calidad no se puede guardar', () => {
  assert.ok(L.validarDatos('auditoria', Object.assign({}, DATOS, { firmaCalidad: '' })).includes('Falta: Firma de control de calidad'));
});
