'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(RAIZ, f), 'utf8');

test('ENDPOINT es el marcador o una URL de Apps Script /exec', () => {
  const ventana = {};
  new Function('window', leer('js/config.js'))(ventana);
  const url = ventana.POSVENTA_CONFIG.ENDPOINT;
  assert.ok(url === 'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT' ||
    /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url), `ENDPOINT inválido: ${url}`);
});

test('todo archivo local que referencia index.html existe', () => {
  const html = leer('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length >= 6);
  for (const r of refs) assert.ok(fs.existsSync(path.join(RAIZ, r)), `no existe ${r}`);
});

test('INSTALACION.md tiene los 6 pasos de puesta en marcha', () => {
  const md = leer('INSTALACION.md');
  for (const h of ['## 1. Crear el Sheet', '## 2. Pegar el Apps Script', '## 3. Publicar como aplicación web',
    '## 4. Configurar la página', '## 5. Publicar en GitHub Pages', '## 6. Cargar asesores']) {
    assert.ok(md.includes(h), `falta la sección "${h}"`);
  }
});

test('los íconos pesan menos de 3 MB en total', () => {
  const dir = path.join(RAIZ, 'img');
  const total = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(total < 3 * 1024 * 1024, `img/ pesa ${total} bytes`);
});
