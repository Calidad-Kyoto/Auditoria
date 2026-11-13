// Pone un número de versión nuevo (?v=AAAAMMDDHHMM) a la hoja de estilos y a los scripts de index.html.
// GitHub Pages deja que el navegador guarde los archivos 10 minutos: sin esto, después de publicar
// una tablet puede mezclar el index.html nuevo con un app.js viejo.
//   node tools/versionar.js      (o npm run versionar) — correrlo antes de cada publicación
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const archivo = path.join(__dirname, '..', 'index.html');
const d = new Date();
const dos = (n) => String(n).padStart(2, '0');
const version = `${d.getFullYear()}${dos(d.getMonth() + 1)}${dos(d.getDate())}${dos(d.getHours())}${dos(d.getMinutes())}`;
const html = fs.readFileSync(archivo, 'utf8')
  .replace(/((?:src|href)="(?:css|js)\/[\w-]+\.(?:css|js))(?:\?v=[\w.-]+)?"/g, `$1?v=${version}"`);
fs.writeFileSync(archivo, html);
console.log(`index.html → v=${version}`);
