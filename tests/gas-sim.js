// Simulador mínimo de Google Apps Script para correr apps-script/*.gs en Node.
// Implementa sólo lo que usan esos archivos: SpreadsheetApp, LockService, ContentService,
// Utilities, Session, ScriptApp, Logger.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Los valores que llegan desde el contexto de los .gs se copian al contexto de los tests
// (igual que Sheets guarda sus propias copias): arrays y fechas comparables con assert.
function aHost(v) {
  return Object.prototype.toString.call(v) === '[object Date]' ? new Date(v.getTime()) : v;
}

class HojaFalsa {
  constructor(nombre) { this.nombre = nombre; this.datos = []; }
  getName() { return this.nombre; }
  getLastRow() { return this.datos.length; }
  getLastColumn() { return this.datos.reduce((m, f) => Math.max(m, f.length), 0); }
  appendRow(fila) { this.datos.push(Array.from(fila, aHost)); return this; }
  clear() { this.datos = []; return this; }
  setFrozenRows() { return this; }
  autoResizeColumns() { return this; }
  getRange(fila, col, nFilas, nCols) {
    const hoja = this;
    nFilas = nFilas || 1; nCols = nCols || 1;
    const rango = {
      getValues() {
        const out = [];
        for (let r = 0; r < nFilas; r++) {
          const f = hoja.datos[fila - 1 + r] || [];
          const linea = [];
          for (let c = 0; c < nCols; c++) { const v = f[col - 1 + c]; linea.push(v === undefined ? '' : v); }
          out.push(linea);
        }
        return out;
      },
      setValues(vals) {
        if (vals.length !== nFilas || vals.some((f) => f.length !== nCols)) {
          throw new Error(`setValues: se esperaban ${nFilas}x${nCols}`);
        }
        for (let r = 0; r < nFilas; r++) {
          while (hoja.datos.length < fila + r) hoja.datos.push([]);
          const f = hoja.datos[fila - 1 + r];
          for (let c = 0; c < nCols; c++) f[col - 1 + c] = aHost(vals[r][c]);
        }
        return rango;
      },
      setValue(v) { return rango.setValues([[v]]); },
      setFontWeight() { return rango; },
      setBackground() { return rango; },
      setFontColor() { return rango; },
      setNumberFormat() { return rango; },
      insertCheckboxes() { return rango; },
    };
    return rango;
  }
}

class PlanillaFalsa {
  constructor() { this.hojas = []; }
  getSheetByName(n) { return this.hojas.find((h) => h.getName() === n) || null; }
  insertSheet(n) {
    if (this.getSheetByName(n)) throw new Error(`Ya existe una hoja llamada "${n}"`);
    const h = new HojaFalsa(n); this.hojas.push(h); return h;
  }
  getSheets() { return this.hojas.slice(); }
}

function cargarCodigo(opciones) {
  const planilla = new PlanillaFalsa();
  const disparadores = [];
  const drive = { carpetas: [], archivos: [] };
  const propiedades = {};
  const ctx = {
    console,
    Logger: { log() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => planilla },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT' },
      createTextOutput(texto) {
        return { tipo: null, setMimeType(t) { this.tipo = t; return this; }, getContent: () => texto };
      },
    },
    Session: { getScriptTimeZone: () => 'America/Argentina/Buenos_Aires' },
    Utilities: {
      base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
      getUuid: () => require('node:crypto').randomUUID(),
      newBlob: (bytes, tipo, nombre) => ({ bytes, tipo, nombre }),
      formatDate(fecha, zona, formato) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
          timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
        }).formatToParts(fecha).map((x) => [x.type, x.value]));
        return formato.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day)
          .replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in propiedades ? propiedades[k] : null),
        setProperty: (k, v) => { propiedades[k] = String(v); },
      }),
    },
    DriveApp: {
      createFolder(nombre) {
        const id = 'carpeta-' + (drive.carpetas.length + 1);
        const carpeta = {
          nombre, getId: () => id,
          createFile(blob) {
            const n = drive.archivos.length + 1;
            drive.archivos.push({ carpeta: nombre, nombre: blob.nombre, tipo: blob.tipo, bytes: blob.bytes.length });
            return { getUrl: () => 'https://drive.google.com/file/d/archivo-' + n + '/view' };
          },
        };
        drive.carpetas.push(carpeta);
        return carpeta;
      },
      getFolderById(id) {
        const c = drive.carpetas.find((x) => x.getId() === id);
        if (!c) throw new Error('No se encontró la carpeta');
        return c;
      },
    },
    ScriptApp: {
      getProjectTriggers: () => disparadores.slice(),
      newTrigger(funcion) {
        const t = { funcion, getHandlerFunction: () => funcion };
        const b = { timeBased: () => b, everyHours: () => b, create: () => { disparadores.push(t); return t; } };
        return b;
      },
    },
  };
  vm.createContext(ctx);
  // Carga todos los .gs de apps-script/ (en Apps Script comparten el mismo ámbito global).
  const dir = (opciones && opciones.dir) || path.join(__dirname, '..', 'apps-script');
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.gs')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, planilla, disparadores, drive };
}

// Convierte la salida de doGet/doPost en objeto. Acepta JSON y JSONP.
function leerSalida(salida) {
  const texto = salida.getContent();
  const m = /^[A-Za-z_$][\w$]*\(([\s\S]*)\)$/.exec(texto);
  return JSON.parse(m ? m[1] : texto);
}

module.exports = { cargarCodigo, leerSalida, HojaFalsa, PlanillaFalsa };
