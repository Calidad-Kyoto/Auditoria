// Servidor de prueba local: sirve la página y simula el Apps Script con los .gs reales
// (usa tests/gas-sim.js, el "Sheet" vive en memoria mientras corre el servidor).
//   node tools/servidor-local.js [puerto]   → http://localhost:8765 (o el puerto indicado)
//   GET /hojas                              → contenido de las hojas simuladas (JSON)
// No se usa en producción: en GitHub Pages la página habla con el Apps Script publicado.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { cargarCodigo } = require('../tests/gas-sim.js');

const RAIZ = path.join(__dirname, '..');
const PUERTO = Number(process.argv[2] || process.env.PORT) || 8765;
const { ctx, planilla } = cargarCodigo();
ctx.configurarHojas();
const cfg = planilla.getSheetByName('Config');
cfg.appendRow(['KYOTO CORRIENTES', 'Ana Gómez', 'SI']);
cfg.appendRow(['KYOTO CORRIENTES', 'Luis Pérez', 'SI']);

const TIPOS = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json', '.pdf': 'application/pdf' };

function responder(res, estado, tipo, cuerpo) {
  res.writeHead(estado, { 'Content-Type': tipo + '; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(cuerpo);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  if (url.pathname === '/exec' && req.method === 'GET') {
    const salida = ctx.doGet({ parameter: Object.fromEntries(url.searchParams) });
    return responder(res, 200, salida.tipo === 'JAVASCRIPT' ? 'text/javascript' : 'application/json', salida.getContent());
  }
  if (url.pathname === '/exec' && req.method === 'POST') {
    let cuerpo = '';
    req.on('data', (c) => { cuerpo += c; });
    req.on('end', () => responder(res, 200, 'application/json', ctx.doPost({ postData: { contents: cuerpo } }).getContent()));
    return;
  }
  if (url.pathname === '/hojas') {
    ctx.actualizarResumen();
    const hojas = Object.fromEntries(planilla.getSheets().map((h) => [h.getName(), h.datos]));
    return responder(res, 200, 'application/json', JSON.stringify(hojas, null, 1));
  }
  if (url.pathname === '/js/config.js') {
    return responder(res, 200, 'text/javascript', `window.POSVENTA_CONFIG = { ENDPOINT: 'http://localhost:${PUERTO}/exec' };\n`);
  }
  const archivo = path.join(RAIZ, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    return responder(res, 404, 'text/plain', 'no encontrado');
  }
  responder(res, 200, TIPOS[path.extname(archivo)] || 'application/octet-stream', fs.readFileSync(archivo));
}).listen(PUERTO, () => console.log(`Servidor local de prueba en http://localhost:${PUERTO} (Apps Script simulado en /exec)`));

