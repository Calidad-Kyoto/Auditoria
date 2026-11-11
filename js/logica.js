/* Lógica pura de los checks (sin DOM): validación, armado del envío y cola sin conexión.
 * Funciona en el navegador (window.Logica) y en Node (require) para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Logica = fabrica();
})(this, function () {
  var REQUERIDOS = {
    checkin: ['sucursal', 'asesor', 'or', 'patente', 'cliente', 'trabajo'],
    checkout: ['sucursal', 'asesor', 'or', 'patente', 'cliente', 'trabajo'],
    agendamiento: ['sucursal', 'asesor', 'cliente', 'patente', 'fechaTurno'],
    general: ['sucursal', 'asesor'],
    auditoria: ['sucursal', 'or', 'fechaCierre', 'aps', 'mecanico', 'firmaCalidad']
  };
  var MAX_OBSERVACIONES = 2000;
  var NOMBRES = { sucursal: 'Sucursal', asesor: 'Asesor', or: 'N° de Ref.', patente: 'Patente', cliente: 'Cliente', fechaTurno: 'Fecha del turno', trabajo: 'Trabajo a realizar',
    fechaCierre: 'Fecha de cierre de la orden', aps: 'Número de operario del APS', mecanico: 'Número de operario del mecánico',
    firmaCalidad: 'Firma de control de calidad' };

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

  // Ítems con casillero traen ok:true/false; las preguntas traen valor 'SI' | 'NO' | 'NO CORRESPONDE' | ''
  // y las observaciones traen texto. Sólo las respuestas SI/NO cuentan para el cumplimiento.
  function puntuable(i) {
    if (i.texto !== undefined) return false;
    return i.valor === undefined || i.valor === 'SI' || i.valor === 'NO';
  }
  function porcentaje(items) {
    var aplicables = items.filter(puntuable);
    if (!aplicables.length) return 0;
    var ok = aplicables.filter(function (i) { return i.valor !== undefined ? i.valor === 'SI' : i.ok; }).length;
    return Math.round(ok * 100 / aplicables.length);
  }

  // Una pregunta condicional (`si: { id, valor }`) sólo se muestra si la otra tiene esa respuesta
  // y, a su vez, está visible (B4 depende de B2, que depende de B1).
  function visible(item, marcados, items) {
    if (!item.si) return true;
    if (marcados[item.si.id] !== item.si.valor) return false;
    var padre = (items || []).filter(function (i) { return i.id === item.si.id; })[0];
    return padre ? visible(padre, marcados, items) : true;
  }

  // Las preguntas visibles son obligatorias salvo que digan obligatoria: false; los campos de texto
  // sólo si dicen obligatoria: true (ej. "Nombre del cliente" cuando se responde NO).
  function validarRespuestas(tipo, marcados, catalogo) {
    var items = itemsDe(catalogo, tipo);
    return items.filter(function (i) {
      if (!visible(i, marcados, items)) return false;
      if (i.observacion) return i.obligatoria === true && !String(marcados[i.id] || '').trim();
      return i.opciones && i.obligatoria !== false && i.opciones.indexOf(marcados[i.id]) < 0;
    }).map(function (i) { return i.observacion ? 'Falta completar: ' + i.etiqueta : 'Falta responder: ' + i.etiqueta; });
  }

  // Avance para la barra de abajo: casilleros tildados, o preguntas visibles respondidas.
  function progreso(tipo, marcados, catalogo) {
    var items = itemsDe(catalogo, tipo);
    var preguntas = items.filter(function (i) { return i.opciones; });
    if (!preguntas.length) {
      return { hechos: items.filter(function (i) { return marcados[i.id]; }).length, total: items.length, cuestionario: false };
    }
    var vis = preguntas.filter(function (i) { return visible(i, marcados, items); });
    return { hechos: vis.filter(function (i) { return marcados[i.id]; }).length, total: vis.length, cuestionario: true };
  }

  function nuevoId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // marcados: { idItem: true } (casilleros), { idItem: 'SI' } (preguntas) o { idItem: 'texto' } (observaciones).
  // fotos (optativo): [{ nombre, tipo, datos: base64 }]
  function construirPayload(tipo, datos, marcados, catalogo, idEnvio, ahora, fotos) {
    var d = {};
    REQUERIDOS[tipo].forEach(function (k) { d[k] = String(datos[k] || '').trim(); });
    if (d.patente !== undefined) d.patente = normalizarPatente(d.patente);
    if (catalogo[tipo].observaciones) d.observaciones = String(datos.observaciones || '').trim().slice(0, MAX_OBSERVACIONES);
    var todos = itemsDe(catalogo, tipo);
    var payload = {
      accion: 'guardar',
      tipo: tipo,
      idEnvio: idEnvio,
      creado: (ahora || new Date()).toISOString(),
      datos: d,
      items: todos.map(function (i) {
        if (i.observacion) {
          var texto = visible(i, marcados, todos) ? String(marcados[i.id] || '').trim().slice(0, MAX_OBSERVACIONES) : '';
          return { id: i.id, etiqueta: i.etiqueta, texto: texto };
        }
        if (i.opciones) return { id: i.id, etiqueta: i.etiqueta, valor: visible(i, marcados, todos) ? (marcados[i.id] || '') : 'NO CORRESPONDE' };
        return { id: i.id, etiqueta: i.etiqueta, ok: !!marcados[i.id] };
      })
    };
    if (fotos && fotos.length) {
      payload.fotos = fotos.map(function (f) { return { nombre: f.nombre, tipo: f.tipo, datos: f.datos }; });
    }
    return payload;
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
    validarRespuestas: validarRespuestas,
    visible: visible,
    progreso: progreso,
    itemsDe: itemsDe,
    porcentaje: porcentaje,
    nuevoId: nuevoId,
    construirPayload: construirPayload,
    crearCola: crearCola,
    enviarPendientes: enviarPendientes
  };
});
