'use strict';
const test = require('node:test');
const assert = require('node:assert');
const V = require('../js/vista.js');
const CATALOGO = require('../js/catalogo.js');

const cuenta = (html, s) => html.split(s).length - 1;
const todos = (tipo) => CATALOGO[tipo].secciones.flatMap((s) => s.items);

test('htmlCheck dibuja un casillero por ítem del catálogo', () => {
  const esperados = { checkin: 26, checkout: 21, agendamiento: 18 };
  for (const [tipo, n] of Object.entries(esperados)) {
    const html = V.htmlCheck(tipo, CATALOGO);
    assert.strictEqual(cuenta(html, 'class="casillero"'), n, tipo);
    for (const it of todos(tipo)) assert.ok(html.includes(`data-item="${it.id}"`), `${tipo}: falta ${it.id}`);
    assert.ok(html.includes(`<h2 class="pestana">${CATALOGO[tipo].titulo}</h2>`), `${tipo}: falta la pestaña negra`);
  }
});

test('cada sección especial tiene su contenedor', () => {
  const ci = V.htmlCheck('checkin', CATALOGO);
  assert.ok(ci.includes('class="grilla grilla--4"'));
  assert.ok(ci.includes('class="ofrecemos"') && ci.includes('class="ofrecemos__titulo">OFRECEMOS<'));
  const co = V.htmlCheck('checkout', CATALOGO);
  assert.ok(co.includes('class="grilla grilla--3 postentrega"'));
  const ag = V.htmlCheck('agendamiento', CATALOGO);
  assert.ok(ag.includes('class="grilla grilla--3 grilla--roja"'));
  assert.ok(ag.includes('class="protocolo protocolo--inicio"') && ag.includes('class="protocolo protocolo--cierre"'));
  assert.ok(ag.includes('>SALUDO<') && ag.includes('DURANTE TODA LA LLAMADA REFERIRSE AL CLIENTE POR SU NOMBRE'));
});

test('los íconos usan la imagen del catálogo y las etiquetas respetan los cortes del PDF', () => {
  const ci = V.htmlCheck('checkin', CATALOGO);
  assert.ok(ci.includes('src="img/ci_rueda_kit.png"'));
  assert.ok(ci.includes('Rueda de Auxilio<br>kit de Seguridad'));
  assert.ok(ci.includes('aria-label="Rueda de Auxilio kit de Seguridad"'));
});

test('escapa HTML en los textos', () => {
  const falso = { x: { titulo: 'X', secciones: [{ id: 's', tipo: 'grilla', columnas: 4, items: [
    { id: 'x1', lineas: ['<b>hola</b> & "chau"'], etiqueta: '<b>', img: 'img/x1.png' }] }] } };
  const html = V.htmlCheck('x', falso);
  assert.ok(html.includes('&lt;b&gt;hola&lt;/b&gt; &amp; &quot;chau&quot;'));
  assert.ok(!html.includes('<b>hola'));
});

test('htmlDatos muestra los campos de cada tipo', () => {
  const suc = [{ nombre: 'KYOTO POSADAS', asesores: ['Ana'] }];
  const ci = V.htmlDatos('checkin', suc);
  for (const n of ['sucursal', 'asesor', 'or', 'patente', 'cliente']) assert.ok(ci.includes(`name="${n}"`), n);
  assert.ok(!ci.includes('name="fechaTurno"'));
  const ag = V.htmlDatos('agendamiento', suc);
  assert.ok(ag.includes('name="fechaTurno"') && ag.includes('type="date"'));
  assert.ok(!ag.includes('name="or"'));
  assert.ok(ci.includes('<option value="KYOTO POSADAS">KYOTO POSADAS</option>'));
});

test('opcionesAsesores y textoProgreso', () => {
  const suc = [{ nombre: 'A', asesores: ['Ana', 'Luis'] }, { nombre: 'B', asesores: [] }];
  const op = V.opcionesAsesores(suc, 'A');
  assert.strictEqual(cuenta(op, '<option'), 3);
  assert.ok(op.startsWith('<option value="" disabled selected>'));
  assert.ok(V.opcionesAsesores(suc, 'B').includes('Sin asesores cargados'));
  assert.strictEqual(V.textoProgreso(12, 26), '12 / 26 · 46 %');
  assert.strictEqual(V.textoProgreso(0, 0), '0 / 0 · 0 %');
});
