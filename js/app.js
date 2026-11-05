/* app.js — único archivo que toca el DOM.
 * Usa window.CATALOGO, window.Logica, window.Vista y window.POSVENTA_CONFIG.
 */
(function () {
  'use strict';

  var CATALOGO = window.CATALOGO;
  var Logica = window.Logica;
  var Vista = window.Vista;
  var ENDPOINT = ((window.POSVENTA_CONFIG || {}).ENDPOINT || '').trim();
  var MARCADOR = 'PEGAR_AQUI_LA_URL_DEL_APPS_SCRIPT';
  var TIPOS = ['checkin', 'checkout', 'agendamiento', 'general', 'auditoria'];
  var TEXTO_BOTON = { checkin: 'GUARDAR CHECK IN', checkout: 'GUARDAR CHECK OUT', agendamiento: 'GUARDAR AGENDAMIENTO',
    general: 'GUARDAR GENERAL', auditoria: 'GUARDAR AUDITORÍA' };
  var CAMPOS_LIBRES = ['or', 'patente', 'cliente', 'fechaTurno', 'observaciones', 'fechaCierre', 'aps', 'mecanico'];
  var LADO_FOTO = 1600; // px del lado mayor al comprimir las fotos

  var $app = document.getElementById('app');
  var $avisos = document.getElementById('avisos');
  var $progreso = document.getElementById('progreso');
  var $guardar = document.getElementById('guardar');

  var estado = { tipo: 'checkin', sucursales: null, listas: {}, porTipo: {} };
  TIPOS.forEach(function (t) { estado.porTipo[t] = { datos: {}, marcados: {}, fotos: [] }; });

  // ───────── localStorage (siempre con try/catch) ─────────

  function leerLS(clave) {
    try { var v = localStorage.getItem(clave); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function escribirLS(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento: seguimos igual */ }
  }

  // ───────── Avisos ─────────

  var avisos = {};
  var ORDEN_AVISOS = ['endpoint', 'config', 'validacion', 'rechazo', 'pendientes'];
  function aviso(clave, html) {
    if (html) avisos[clave] = html; else delete avisos[clave];
    $avisos.innerHTML = ORDEN_AVISOS.filter(function (k) { return avisos[k]; }).map(function (k) { return avisos[k]; }).join('');
  }
  function htmlAviso(tipo, texto, accion, textoBoton) {
    return '<div class="aviso' + (tipo === 'error' ? ' aviso--error' : '') + '"><div>' + texto + '</div>' +
      (accion ? '<button type="button" class="aviso__boton" data-accion="' + accion + '">' + textoBoton + '</button>' : '') + '</div>';
  }

  // ───────── Config de sucursales y asesores (JSONP + caché) ─────────

  var nConfig = 0;
  function cargarConfig() {
    if (!ENDPOINT || ENDPOINT === MARCADOR) { usarCacheConfig(); return; }
    var nombre = '__posventaCfg' + (++nConfig);
    var script = document.createElement('script');
    var terminado = false;
    var reloj = setTimeout(function () { fin(null); }, 10000);
    function fin(res) {
      if (terminado) return;
      terminado = true;
      clearTimeout(reloj);
      window[nombre] = function () {};
      if (script.parentNode) script.parentNode.removeChild(script);
      if (res && res.ok && Array.isArray(res.sucursales)) {
        escribirLS('posventa_config', { guardado: new Date().toISOString(), sucursales: res.sucursales, listas: res.listas || {} });
        aviso('config', null);
        aplicarSucursales(res.sucursales, res.listas);
      } else {
        usarCacheConfig();
      }
    }
    window[nombre] = fin;
    script.onerror = function () { fin(null); };
    script.src = ENDPOINT + '?accion=config&callback=' + nombre + '&t=' + Date.now();
    document.body.appendChild(script);
  }

  function usarCacheConfig() {
    var cache = leerLS('posventa_config');
    if (cache && Array.isArray(cache.sucursales)) {
      aplicarSucursales(cache.sucursales, cache.listas);
      return;
    }
    if (ENDPOINT && ENDPOINT !== MARCADOR) {
      aviso('config', htmlAviso('error', 'No se pudo leer la lista de asesores. Revisá la conexión.', 'reintentar-config', 'Reintentar'));
    }
    aplicarSucursales([]);
  }

  function aplicarSucursales(lista, listas) {
    estado.sucursales = lista;
    estado.listas = listas || {};
    dibujar();
  }

  // ───────── Dibujo de la sub-solapa activa ─────────

  function tipoDesdeHash() {
    var t = (location.hash || '').replace('#', '');
    return TIPOS.indexOf(t) >= 0 ? t : 'checkin';
  }

  function precargarUltimo(datos) {
    if (datos.sucursal) return;
    var ultimo = leerLS('posventa_ultimo');
    if (ultimo && ultimo.sucursal) { datos.sucursal = ultimo.sucursal; datos.asesor = ultimo.asesor || ''; }
  }

  function dibujar() {
    var tipo = estado.tipo;
    var e = estado.porTipo[tipo];
    var cargando = estado.sucursales === null;
    var sucursales = estado.sucursales || [];
    if (!sucursales.some(function (s) { return s.nombre === e.datos.sucursal; })) { e.datos.sucursal = ''; e.datos.asesor = ''; }
    precargarUltimo(e.datos);
    if (!sucursales.some(function (s) { return s.nombre === e.datos.sucursal; })) { e.datos.sucursal = ''; e.datos.asesor = ''; }

    $app.innerHTML = '<div class="hoja hoja--' + tipo + '">' + Vista.htmlDatos(tipo, sucursales, estado.listas) + Vista.htmlCheck(tipo, CATALOGO) + '</div>';

    var selSucursal = $app.querySelector('select[name="sucursal"]');
    var selAsesor = $app.querySelector('select[name="asesor"]'); // no existe en Auditoría de OR
    if (cargando) {
      Array.prototype.forEach.call($app.querySelectorAll('.datos select'), function (sel) {
        sel.innerHTML = '<option value="" disabled selected>Cargando…</option>';
        sel.disabled = true;
      });
    } else if (e.datos.sucursal) {
      selSucursal.value = e.datos.sucursal;
      if (selAsesor) {
        selAsesor.innerHTML = Vista.opcionesAsesores(sucursales, e.datos.sucursal);
        var asesores = (sucursales.filter(function (s) { return s.nombre === e.datos.sucursal; })[0] || {}).asesores || [];
        if (asesores.indexOf(e.datos.asesor) >= 0) selAsesor.value = e.datos.asesor; else e.datos.asesor = '';
      }
    }
    CAMPOS_LIBRES.forEach(function (n) {
      var campo = $app.querySelector('[name="' + n + '"]');
      if (!campo || cargando && campo.tagName === 'SELECT') return;
      campo.value = e.datos[n] || '';
      // una opción que se desactivó en la hoja Listas ya no está en el desplegable
      if (campo.tagName === 'SELECT' && campo.value !== (e.datos[n] || '')) { campo.value = ''; e.datos[n] = ''; }
    });
    Array.prototype.forEach.call($app.querySelectorAll('.respuesta-texto'), function (t) {
      t.value = e.marcados[t.getAttribute('data-item')] || '';
    });
    dibujarFotos();

    Array.prototype.forEach.call($app.querySelectorAll('.respuesta'), function (r) {
      r.checked = e.marcados[r.getAttribute('data-item')] === r.value;
    });
    Array.prototype.forEach.call($app.querySelectorAll('.pregunta'), function (f) {
      f.classList.toggle('pregunta--respondida', !!e.marcados[f.getAttribute('data-item')]);
    });
    aplicarCondiciones();

    Array.prototype.forEach.call($app.querySelectorAll('.casillero'), function (c) {
      c.checked = !!e.marcados[c.getAttribute('data-item')];
      marcarCelda(c);
    });

    Array.prototype.forEach.call(document.querySelectorAll('.subsolapa'), function (b) {
      var activa = b.getAttribute('data-tipo') === tipo;
      b.classList.toggle('subsolapa--activa', activa);
      if (activa) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $guardar.textContent = TEXTO_BOTON[tipo];
    actualizarProgreso();
  }

  function marcarCelda(casillero) {
    var celda = casillero.closest('label');
    if (celda) celda.classList.toggle('celda--ok', casillero.checked);
  }

  function actualizarProgreso() {
    var pr = Logica.progreso(estado.tipo, estado.porTipo[estado.tipo].marcados, CATALOGO);
    $progreso.textContent = pr.cuestionario ? pr.hechos + ' / ' + pr.total + ' respondidas' : Vista.textoProgreso(pr.hechos, pr.total);
  }

  // Preguntas condicionales: se muestran sólo si la pregunta de la que dependen tiene la respuesta indicada.
  function aplicarCondiciones() {
    var marcados = estado.porTipo[estado.tipo].marcados;
    // en orden de aparición: la pregunta de la que depende ya quedó resuelta (si está oculta, arrastra a esta)
    Array.prototype.forEach.call($app.querySelectorAll('.pregunta[data-si-id]'), function (f) {
      var padre = $app.querySelector('.pregunta[data-item="' + f.getAttribute('data-si-id') + '"]');
      f.hidden = (padre && padre.hidden) || marcados[f.getAttribute('data-si-id')] !== f.getAttribute('data-si-valor');
      if (f.hidden) f.classList.remove('pregunta--error');
    });
  }

  // ───────── Fotos (Auditoría de OR) ─────────

  // Achica la foto a LADO_FOTO px y la pasa a JPEG: una foto de celular queda en ~300 KB.
  function comprimirFoto(archivo) {
    return new Promise(function (ok, mal) {
      var url = URL.createObjectURL(archivo);
      var img = new Image();
      img.onload = function () {
        var f = Math.min(1, LADO_FOTO / Math.max(img.naturalWidth, img.naturalHeight));
        var lienzo = document.createElement('canvas');
        lienzo.width = Math.round(img.naturalWidth * f);
        lienzo.height = Math.round(img.naturalHeight * f);
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height);
        URL.revokeObjectURL(url);
        var dataUrl = lienzo.toDataURL('image/jpeg', 0.75);
        ok({ nombre: archivo.name, tipo: 'image/jpeg', datos: dataUrl.split(',')[1], vista: dataUrl });
      };
      img.onerror = function () { URL.revokeObjectURL(url); mal(new Error('no se pudo leer ' + archivo.name)); };
      img.src = url;
    });
  }

  function dibujarFotos() {
    var lista = $app.querySelector('.fotos__lista');
    if (!lista) return;
    var fotos = estado.porTipo[estado.tipo].fotos;
    lista.innerHTML = fotos.map(function (f, i) {
      return '<div class="fotos__item"><img src="' + f.vista + '" alt="' + Vista.esc(f.nombre) + '">' +
        '<button type="button" class="fotos__quitar" data-quitar-foto="' + i + '" aria-label="Quitar ' + Vista.esc(f.nombre) + '">✕</button></div>';
    }).join('');
  }

  // ───────── Eventos ─────────

  $app.addEventListener('change', function (ev) {
    var el = ev.target;
    var e = estado.porTipo[estado.tipo];
    if (el.classList.contains('casillero')) {
      e.marcados[el.getAttribute('data-item')] = el.checked;
      marcarCelda(el);
      actualizarProgreso();
      return;
    }
    if (el.classList.contains('respuesta')) {
      e.marcados[el.getAttribute('data-item')] = el.value;
      aviso('validacion', null);
      var fs = el.closest('.pregunta');
      fs.classList.add('pregunta--respondida');
      fs.classList.remove('pregunta--error');
      aplicarCondiciones();
      actualizarProgreso();
      return;
    }
    if (el.classList.contains('fotos__input')) {
      var max = CATALOGO[estado.tipo].fotos.max;
      var archivos = Array.prototype.slice.call(el.files || [], 0, Math.max(0, max - e.fotos.length));
      if ((el.files || []).length > archivos.length) aviso('validacion', htmlAviso('error', 'Se pueden adjuntar hasta ' + max + ' fotos.'));
      el.value = '';
      Promise.all(archivos.map(comprimirFoto)).then(function (nuevas) {
        e.fotos = e.fotos.concat(nuevas);
        dibujarFotos();
      }, function (err) { aviso('validacion', htmlAviso('error', Vista.esc(err.message))); });
      return;
    }
    if (el.name === 'sucursal') {
      e.datos.sucursal = el.value;
      e.datos.asesor = '';
      var selA = $app.querySelector('select[name="asesor"]');
      if (selA) selA.innerHTML = Vista.opcionesAsesores(estado.sucursales || [], el.value);
      escribirLS('posventa_ultimo', { sucursal: e.datos.sucursal, asesor: '' });
    } else if (el.name === 'asesor') {
      e.datos.asesor = el.value;
      escribirLS('posventa_ultimo', { sucursal: e.datos.sucursal, asesor: e.datos.asesor });
    } else if (el.name) {
      e.datos[el.name] = el.value;
    }
    var campo = el.closest('.campo');
    if (campo) campo.classList.remove('campo--error');
  });

  $app.addEventListener('input', function (ev) {
    var el = ev.target;
    if (el.classList.contains('respuesta-texto')) {
      estado.porTipo[estado.tipo].marcados[el.getAttribute('data-item')] = el.value;
      return;
    }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'file' && el.name) {
      estado.porTipo[estado.tipo].datos[el.name] = el.value;
    }
  });

  $app.addEventListener('click', function (ev) {
    var i = ev.target.getAttribute && ev.target.getAttribute('data-quitar-foto');
    if (i === null || i === undefined) return;
    estado.porTipo[estado.tipo].fotos.splice(Number(i), 1);
    dibujarFotos();
  });

  Array.prototype.forEach.call(document.querySelectorAll('.subsolapa'), function (b) {
    b.addEventListener('click', function () { location.hash = b.getAttribute('data-tipo'); });
  });

  window.addEventListener('hashchange', function () {
    estado.tipo = tipoDesdeHash();
    aviso('validacion', null);
    dibujar();
  });

  $avisos.addEventListener('click', function (ev) {
    var accion = ev.target.getAttribute && ev.target.getAttribute('data-accion');
    if (accion === 'reintentar-config') { aviso('config', null); estado.sucursales = null; dibujar(); cargarConfig(); }
    if (accion === 'reintentar-pendientes') enviarCola();
  });

  // ───────── Guardar, cola sin conexión y confirmación ─────────

  var sinEndpoint = !ENDPOINT || ENDPOINT === MARCADOR;
  var cola = Logica.crearCola({
    getItem: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    setItem: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
  });
  var cadena = Promise.resolve();

  function enviar(p) {
    return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify(p) }).then(function (r) { return r.json(); });
  }

  // Los envíos van de a uno (encadenados) para no mandar dos veces el mismo check a la vez.
  function enviarCola() {
    if (sinEndpoint) return Promise.resolve(null);
    cadena = cadena.then(function () {
      return Logica.enviarPendientes(cola, enviar);
    }).then(function (res) {
      if (res.rechazados.length) {
        aviso('rechazo', htmlAviso('error', 'El Sheet rechazó un check: ' + Vista.esc(res.rechazados[0].error) + '. Revisá los datos y volvé a guardar.'));
      }
      mostrarPendientes();
      return res;
    }, function (err) {
      console.warn('Posventa: falló el envío', err);
      mostrarPendientes();
      return null;
    });
    return cadena;
  }

  function mostrarPendientes() {
    var n = cola.tamano();
    aviso('pendientes', n ? htmlAviso('info', n + (n === 1 ? ' check pendiente' : ' checks pendientes') + ' de envío (sin conexión).', 'reintentar-pendientes', 'Reintentar') : null);
  }

  function marcarErrores(tipo, datos) {
    var primero = null;
    Logica.REQUERIDOS[tipo].forEach(function (k) {
      var vacio = !String(datos[k] || '').trim();
      var malo = vacio || (k === 'patente' && !Logica.patenteValida(datos[k]));
      var campo = $app.querySelector('[name="' + k + '"]');
      if (!campo) return;
      campo.closest('.campo').classList.toggle('campo--error', malo);
      if (malo && !primero) primero = campo;
    });
    Array.prototype.forEach.call($app.querySelectorAll('.pregunta[data-obligatoria]'), function (f) {
      var falta = !f.hidden && !estado.porTipo[tipo].marcados[f.getAttribute('data-item')];
      f.classList.toggle('pregunta--error', falta);
      if (falta && !primero) primero = f.querySelector('.respuesta');
    });
    if (primero) primero.focus();
  }

  var $confirmacion = document.querySelector('.confirmacion');
  function mostrarConfirmacion(pendiente, hoja, pct) {
    $confirmacion.classList.toggle('confirmacion--pendiente', pendiente);
    $confirmacion.querySelector('.confirmacion__icono').textContent = pendiente ? '!' : '✓';
    $confirmacion.querySelector('.confirmacion__titulo').textContent = pendiente ? 'Guardado en esta tablet' : 'Guardado ✓';
    $confirmacion.querySelector('.confirmacion__texto').textContent = pendiente
      ? 'Se enviará solo cuando vuelva la conexión.'
      : 'En la hoja ' + hoja + ' · ' + pct + ' % de cumplimiento.';
    $confirmacion.hidden = false;
    document.getElementById('cargar-otro').focus();
  }

  $guardar.addEventListener('click', function () {
    var tipo = estado.tipo;
    var e = estado.porTipo[tipo];
    aviso('rechazo', null);
    var errores = Logica.validarDatos(tipo, e.datos).concat(Logica.validarRespuestas(tipo, e.marcados, CATALOGO));
    if (errores.length) {
      aviso('validacion', htmlAviso('error', 'Faltan datos para guardar:<ul>' + errores.map(function (x) { return '<li>' + Vista.esc(x) + '</li>'; }).join('') + '</ul>'));
      marcarErrores(tipo, e.datos);
      return;
    }
    aviso('validacion', null);
    var payload = Logica.construirPayload(tipo, e.datos, e.marcados, CATALOGO, Logica.nuevoId(), new Date(), e.fotos);
    cola.agregar(payload);
    if (e.datos.asesor) escribirLS('posventa_ultimo', { sucursal: e.datos.sucursal, asesor: e.datos.asesor });
    $guardar.disabled = true;
    $guardar.textContent = 'GUARDANDO…';
    function listo() {
      $guardar.disabled = false;
      $guardar.textContent = TEXTO_BOTON[estado.tipo];
    }
    var enCola = cola.listar().some(function (p) { return p.idEnvio === payload.idEnvio; });
    if (!enCola) {
      // Con fotos puede no entrar en la memoria de la tablet: se manda directo y, sin conexión, no se pierde lo cargado.
      enviar(payload).then(function (r) {
        listo();
        if (r && r.ok) mostrarConfirmacion(false, CATALOGO[tipo].hoja, Logica.porcentaje(payload.items));
        else aviso('rechazo', htmlAviso('error', 'El Sheet rechazó el envío: ' + Vista.esc((r && r.error) || 'respuesta inválida') + '.'));
      }, function () {
        listo();
        aviso('rechazo', htmlAviso('error', 'Sin conexión: con las fotos no entra en la memoria de la tablet. Volvé a guardar cuando haya señal (no se borró nada).'));
      });
      return;
    }
    enviarCola().then(function (res) {
      listo();
      var rechazado = res && res.rechazados.some(function (r) { return r.idEnvio === payload.idEnvio; });
      if (rechazado) return; // el aviso de rechazo ya está a la vista y el formulario queda como estaba
      var pendiente = cola.listar().some(function (p) { return p.idEnvio === payload.idEnvio; });
      mostrarConfirmacion(pendiente, CATALOGO[tipo].hoja, Logica.porcentaje(payload.items));
    });
  });

  // Cargar otro: limpia el check actual y conserva sucursal y asesor.
  document.getElementById('cargar-otro').addEventListener('click', function () {
    var e = estado.porTipo[estado.tipo];
    e.marcados = {};
    e.fotos = [];
    CAMPOS_LIBRES.forEach(function (k) { delete e.datos[k]; });
    if (e.datos.asesor) escribirLS('posventa_ultimo', { sucursal: e.datos.sucursal, asesor: e.datos.asesor });
    $confirmacion.hidden = true;
    dibujar();
    window.scrollTo(0, 0);
  });

  if (sinEndpoint) {
    aviso('endpoint', htmlAviso('error', 'Falta configurar la URL del Apps Script (js/config.js).'));
  }
  window.addEventListener('online', enviarCola);
  setInterval(enviarCola, 60000);

  // ───────── Inicio ─────────

  estado.tipo = tipoDesdeHash();
  dibujar();
  if (sinEndpoint) $guardar.disabled = true;
  cargarConfig();
  mostrarPendientes();
  enviarCola();
})();
