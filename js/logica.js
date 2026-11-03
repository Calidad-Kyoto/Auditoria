/* Lógica pura de los checks (sin DOM): validación, armado del envío y cola sin conexión.
 * Funciona en el navegador (window.Logica) y en Node (require) para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(this, function () {
  var REQUERIDOS = {
    checkin: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
    checkout: ['sucursal', 'asesor', 'or', 'patente', 'cliente'],
    agendamiento: ['sucursal', 'asesor', 'cliente', 'patente', 'fechaTurno']
  };
  var NOMBRES = { sucursal: 'Sucursal', asesor: 'Asesor', or: 'Nº de OR', patente: 'Patente', cliente: 'Cliente', fechaTurno: 'Fecha del turno' };

  function normalizarPatente(s) {
    return String(s || '').toUpperCase().replace(/[\s.\-]/g, '');
  }

  // Patentes argentinas: AAA123 (vieja) o AA123BB (Mercosur).
  function patenteValida(s) {
    return /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(normalizarPatente(s));
  }

  function validarDatos(tipo, datos) {
    var errores = [];
    if (!REQUERIDOS[tipo]) return ['Tipo de check desconocido'];
    REQUERIDOS[tipo].forEach(function (k) {
      if (!datos || !String(datos[k] || '').trim()) errores.push('Falta: ' + NOMBRES[k]);
    });
    if (datos && String(datos.patente || '').trim() && !patenteValida(datos.patente)) {
      errores.push('Patente inválida (ej.: AB123CD o ABC123)');
    }
    return errores;
  }

  function itemsDe(catalogo, tipo) {
    var out = [];
    catalogo[tipo].secciones.forEach(function (sec) { sec.items.forEach(function (i) { out.push(i); }); });
    return out;
  }

  function porcentaje(items) {
    if (!items.length) return 0;
    var ok = items.filter(function (i) { return i.ok; }).length;
    return Math.round(ok * 100 / items.length);
  }

  function nuevoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // marcados: objeto { idItem: true }
  function construirPayload(tipo, datos, marcados, catalogo, idEnvio, ahora) {
    var d = {};
    REQUERIDOS[tipo].forEach(function (k) { d[k] = String(datos[k] || '').trim(); });
    d.patente = normalizarPatente(d.patente);
    return {
      accion: 'guardar',
      tipo: tipo,
      idEnvio: idEnvio,
      creado: (ahora || new Date()).toISOString(),
      datos: d,
      items: itemsDe(catalogo, tipo).map(function (i) {
        return { id: i.id, etiqueta: i.etiqueta, ok: !!marcados[i.id] };
      })
    };
  }

  // Cola de envíos pendientes guardada en localStorage (o cualquier objeto con getItem/setItem).
  function crearCola(almacen, clave) {
    clave = clave || 'posventa_cola';
    function leer() {
      try { var v = JSON.parse(almacen.getItem(clave) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    function escribir(lista) { almacen.setItem(clave, JSON.stringify(lista)); }
    return {
      listar: leer,
      tamano: function () { return leer().length; },
      agregar: function (p) {
        var l = leer().filter(function (x) { return x.idEnvio !== p.idEnvio; });
        l.push(p); escribir(l);
      },
      quitar: function (id) { escribir(leer().filter(function (x) { return x.idEnvio !== id; })); }
    };
  }

  // enviar(payload) → Promise<{ok, error?}>; si rechaza (sin red) se corta y queda pendiente.
  function enviarPendientes(cola, enviar) {
    var resultado = { enviados: 0, rechazados: [], pendientes: 0 };
    var lista = cola.listar();
    var i = 0;
    function siguiente() {
      if (i >= lista.length) { resultado.pendientes = cola.tamano(); return Promise.resolve(resultado); }
      var p = lista[i++];
      return enviar(p).then(function (r) {
        if (r && r.ok) { resultado.enviados++; cola.quitar(p.idEnvio); }
        else { resultado.rechazados.push({ idEnvio: p.idEnvio, error: (r && r.error) || 'respuesta inválida' }); cola.quitar(p.idEnvio); }
        return siguiente();
      }, function () {
        resultado.pendientes = cola.tamano();
        return resultado;
      });
    }
    return siguiente();
  }

  return {
    REQUERIDOS: REQUERIDOS,
    normalizarPatente: normalizarPatente,
    patenteValida: patenteValida,
    validarDatos: validarDatos,
    itemsDe: itemsDe,
    porcentaje: porcentaje,
    nuevoId: nuevoId,
    construirPayload: construirPayload,
    crearCola: crearCola,
    enviarPendientes: enviarPendientes
  };
});
