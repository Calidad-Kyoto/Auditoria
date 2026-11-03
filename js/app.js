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
  var TIPOS = ['checkin', 'checkout', 'agendamiento'];
  var TEXTO_BOTON = { checkin: 'GUARDAR CHECK IN', checkout: 'GUARDAR CHECK OUT', agendamiento: 'GUARDAR AGENDAMIENTO' };

  var $app = document.getElementById('app');
  var $avisos = document.getElementById('avisos');
  var $progreso = document.getElementById('progreso');
  var $guardar = document.getElementById('guardar');

  var estado = { tipo: 'checkin', sucursales: null, porTipo: {} };
  TIPOS.forEach(function (t) { estado.porTipo[t] = { datos: {}, marcados: {} }; });

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
        escribirLS('posventa_config', { guardado: new Date().toISOString(), sucursales: res.sucursales });
        aviso('config', null);
        aplicarSucursales(res.sucursales);
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
      aplicarSucursales(cache.sucursales);
      return;
    }
    if (ENDPOINT && ENDPOINT !== MARCADOR) {
      aviso('config', htmlAviso('error', 'No se pudo leer la lista de asesores. Revisá la conexión.', 'reintentar-config', 'Reintentar'));
    }
    aplicarSucursales([]);
  }

  function aplicarSucursales(lista) {
    estado.sucursales = lista;
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

    $app.innerHTML = '<div class="hoja hoja--' + tipo + '">' + Vista.htmlDatos(tipo, sucursales) + Vista.htmlCheck(tipo, CATALOGO) + '</div>';

    var selSucursal = $app.querySelector('select[name="sucursal"]');
    var selAsesor = $app.querySelector('select[name="asesor"]');
    if (cargando) {
      selSucursal.innerHTML = '<option value="" disabled selected>Cargando…</option>';
      selAsesor.innerHTML = '<option value="" disabled selected>Cargando…</option>';
      selSucursal.disabled = true;
      selAsesor.disabled = true;
    } else if (e.datos.sucursal) {
      selSucursal.value = e.datos.sucursal;
      selAsesor.innerHTML = Vista.opcionesAsesores(sucursales, e.datos.sucursal);
      var asesores = (sucursales.filter(function (s) { return s.nombre === e.datos.sucursal; })[0] || {}).asesores || [];
      if (asesores.indexOf(e.datos.asesor) >= 0) selAsesor.value = e.datos.asesor; else e.datos.asesor = '';
    }
    ['or', 'patente', 'cliente', 'fechaTurno'].forEach(function (n) {
      var campo = $app.querySelector('[name="' + n + '"]');
      if (campo) campo.value = e.datos[n] || '';
    });

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
    var e = estado.porTipo[estado.tipo];
    var total = Logica.itemsDe(CATALOGO, estado.tipo).length;
    var marcados = Object.keys(e.marcados).filter(function (k) { return e.marcados[k]; }).length;
    $progreso.textContent = Vista.textoProgreso(marcados, total);
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
    if (el.name === 'sucursal') {
      e.datos.sucursal = el.value;
      e.datos.asesor = '';
      $app.querySelector('select[name="asesor"]').innerHTML = Vista.opcionesAsesores(estado.sucursales || [], el.value);
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
    if (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.name) {
      estado.porTipo[estado.tipo].datos[el.name] = el.value;
    }
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
  });

  // ───────── Inicio ─────────

  estado.tipo = tipoDesdeHash();
  dibujar();
  cargarConfig();
})();
