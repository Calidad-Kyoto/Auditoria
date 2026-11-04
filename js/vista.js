/* Vista de los checks: funciones puras que devuelven HTML (sin DOM).
 * Funciona en el navegador (window.Vista) y en Node (require) para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Vista = fabrica();
})(this, function () {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function casillero(it) {
    return '<input type="checkbox" class="casillero" name="' + esc(it.id) + '" data-item="' + esc(it.id) + '" aria-label="' + esc(it.etiqueta) + '">';
  }
  function celda(it) {
    return '<label class="celda" data-item="' + esc(it.id) + '">' + casillero(it) +
      (it.img ? '<img class="icono" src="' + esc(it.img) + '" alt="" loading="lazy">' : '') +
      '<span class="etiqueta">' + it.lineas.map(esc).join('<br>') + '</span></label>';
  }
  function protocolo(it) {
    return '<label class="protocolo__item" data-item="' + esc(it.id) + '">' + casillero(it) +
      (it.titulo ? '<span class="protocolo__titulo">' + esc(it.titulo) + '</span>' : '') +
      '<span class="protocolo__texto">' + esc(it.texto) + '</span>' +
      (it.nota ? '<span class="protocolo__nota">' + esc(it.nota) + '</span>' : '') + '</label>';
  }
  function pregunta(it) {
    return '<fieldset class="pregunta" data-item="' + esc(it.id) + '"><legend class="pregunta__texto">' + it.lineas.map(esc).join('<br>') +
      '</legend><div class="pregunta__opciones">' + it.opciones.map(function (op) {
        return '<label class="opcion"><input type="radio" class="respuesta" name="' + esc(it.id) + '" value="' + esc(op) +
          '" data-item="' + esc(it.id) + '"><span>' + esc(op) + '</span></label>';
      }).join('') + '</div></fieldset>';
  }
  function seccion(sec) {
    var celdas = sec.items.map(celda).join('');
    switch (sec.tipo) {
      case 'grilla': return '<div class="grilla grilla--' + sec.columnas + '" data-seccion="' + esc(sec.id) + '">' + celdas + '</div>';
      case 'ofrecemos': return '<div class="ofrecemos"><div class="ofrecemos__titulo">OFRECEMOS</div><div class="grilla grilla--3">' + celdas + '</div></div>';
      case 'postentrega': return '<div class="grilla grilla--3 postentrega">' + celdas + '</div>';
      case 'grilla-roja': return '<div class="grilla grilla--3 grilla--roja">' + celdas + '</div>';
      case 'protocolo-inicio': return '<div class="protocolo protocolo--inicio">' + sec.items.map(protocolo).join('') + '</div>';
      case 'protocolo-cierre': return '<div class="protocolo protocolo--cierre">' + sec.items.map(protocolo).join('') + '</div>';
      case 'preguntas': return '<div class="preguntas">' + sec.items.map(pregunta).join('') + '</div>';
      default: throw new Error('tipo de sección desconocido: ' + sec.tipo);
    }
  }
  function htmlCheck(tipo, catalogo) {
    var c = catalogo[tipo];
    return '<section class="check check--' + esc(tipo) + '" data-tipo="' + esc(tipo) + '"><h2 class="pestana">' + esc(c.titulo) + '</h2>' +
      c.secciones.map(seccion).join('') +
      (c.observaciones ? '<div class="observaciones"><h3 class="observaciones__titulo">OBSERVACIONES</h3>' +
        '<textarea name="observaciones" class="observaciones__texto" rows="5" maxlength="2000" placeholder="Cualquier comentario sobre este control"></textarea></div>' : '') +
      '</section>';
  }
  function campo(nombre, etiqueta, control) {
    return '<label class="campo"><span>' + etiqueta + '</span>' + control + '</label>';
  }
  function htmlDatos(tipo, sucursales) {
    var ops = '<option value="" disabled selected>Elegí la sucursal</option>' + sucursales.map(function (s) {
      return '<option value="' + esc(s.nombre) + '">' + esc(s.nombre) + '</option>';
    }).join('');
    var h = campo('sucursal', 'Sucursal', '<select name="sucursal" required>' + ops + '</select>') +
      campo('asesor', tipo === 'agendamiento' ? 'Quién atendió' : 'Asesor', '<select name="asesor" required><option value="" disabled selected>Elegí primero la sucursal</option></select>');
    if (tipo === 'checkin' || tipo === 'checkout') h += campo('or', 'Nº de OR', '<input name="or" inputmode="numeric" autocomplete="off" required>');
    if (tipo !== 'general') {
      h += campo('patente', 'Patente', '<input name="patente" autocapitalize="characters" autocomplete="off" required>');
      h += campo('cliente', 'Cliente', '<input name="cliente" autocomplete="off" required>');
    }
    if (tipo === 'agendamiento') h += campo('fechaTurno', 'Fecha del turno', '<input name="fechaTurno" type="date" required>');
    return '<div class="datos" data-tipo="' + esc(tipo) + '">' + h + '</div>';
  }
  function opcionesAsesores(sucursales, nombre) {
    var s = sucursales.filter(function (x) { return x.nombre === nombre; })[0];
    if (!s || !s.asesores.length) return '<option value="" disabled selected>Sin asesores cargados en la hoja Config</option>';
    return '<option value="" disabled selected>Elegí el asesor</option>' + s.asesores.map(function (a) {
      return '<option value="' + esc(a) + '">' + esc(a) + '</option>';
    }).join('');
  }
  function textoProgreso(marcados, total) {
    return marcados + ' / ' + total + ' · ' + (total ? Math.round(marcados * 100 / total) : 0) + ' %';
  }
  return { esc: esc, htmlCheck: htmlCheck, htmlDatos: htmlDatos, opcionesAsesores: opcionesAsesores, textoProgreso: textoProgreso };
});
