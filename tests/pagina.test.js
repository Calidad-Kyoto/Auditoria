'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('index.html carga los scripts en orden y tiene la estructura de solapas', () => {
  const html = leer('index.html');
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<link rel="stylesheet" href="css\/estilos\.css">/);
  const scripts = [...html.matchAll(/<script src="js\/(\w+)\.js"><\/script>/g)].map((m) => m[1]);
  assert.deepStrictEqual(scripts, ['catalogo', 'logica', 'vista', 'indicadores', 'config', 'app']);
  assert.match(html, /<nav class="solapas"[^>]*>[\s\S]*POSVENTA[\s\S]*<\/nav>/);
  for (const t of ['checkin', 'checkout', 'agendamiento', 'general', 'auditoria', 'indicadores']) {
    assert.match(html, new RegExp(`<button[^>]*class="subsolapa"[^>]*data-tipo="${t}"`), `falta la sub-solapa ${t}`);
  }
  assert.match(html, /<main id="app"/);
  assert.match(html, /<div id="avisos" aria-live="polite"/);
});

test('estilos.css define los colores del PDF y las grillas', () => {
  const css = leer('css/estilos.css');
  for (const [token, hex] of [['--negro', '#231F20'], ['--rojo-pdf', '#FD0100'], ['--rojo-nissan', '#C3002F']]) {
    assert.match(css, new RegExp(`${token}:\\s*${hex}`, 'i'), `falta ${token}`);
  }
  for (const sel of ['.pestana', '.grilla--4', '.grilla--3', '.celda', '.casillero', '.ofrecemos__titulo',
    '.postentrega', '.grilla--roja', '.protocolo__item', '.barra-guardar']) {
    assert.ok(css.includes(sel), `falta el selector ${sel}`);
  }
  assert.match(css, /dashed/);
  assert.match(css, /dotted/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /:focus-visible/);
});

test('config.js expone POSVENTA_CONFIG.ENDPOINT', () => {
  const ventana = {};
  new Function('window', leer('js/config.js'))(ventana);
  assert.strictEqual(typeof ventana.POSVENTA_CONFIG.ENDPOINT, 'string');
});
