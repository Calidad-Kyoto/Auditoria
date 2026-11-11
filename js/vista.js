/* Vista de los checks: funciones puras que devuelven HTML (sin DOM).
 * Funciona en el navegador (window.Vista) y en Node (require) para los tests.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.Vista = fabrica();
})(this, function () {
  // Opciones del desplegable "Trabajo a realizar" (Check In y Check Out).
  var TRABAJOS = [];
  for (var km = 10; km <= 150; km += 10) TRABAJOS.push('Servicio de ' + km + '.000 Km');
  TRABAJOS.push('Diagnóstico', 'Servicio Exprés');

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
    var detalle = it.ayuda || it.foto;
    return '<fieldset class="pregunta' + (detalle ? ' pregunta--detalle' : '') + '" data-item="' + esc(it.id) + '"' +
      (it.obligatoria !== false ? ' data-obligatoria="1"' : '') +
      (it.si ? ' data-si-id="' + esc(it.si.id) + '" data-si-valor="' + esc(it.si.valor) + '" hidden' : '') +
      '><legend class="pregunta__texto">' + it.lineas.map(esc).join('<br>') +
      (it.obligatoria === true ? ' <span class="obligatoria" aria-hidden="true">*</span>' : '') + '</legend>' +
      (it.ayuda ? '<p class="pregunta__ayuda">' + esc(it.ayuda) + '</p>' : '') +
      (it.foto ? '<img class="pregunta__foto" src="' + esc(it.foto) + '" alt="Ejemplo" loading="lazy">' : '') +
      '<div class="pregunta__opciones">' + it.opciones.map(function (op) {
        return '<label class="opcion"><input type="radio" class="respuesta" name="' + esc(it.id) + '" value="' + esc(op) +
          '" data-item="' + esc(it.id) + '"><span>' + esc(op) + '</span></label>';
      }).join('') + '</div></fieldset>';
  }
  function observacion(it) {
    var control = it.linea
      ? '<input type="text" class="respuesta-texto" name="' + esc(it.id) + '" data-item="' + esc(it.id) + '" maxlength="200" autocomplete="off">'
      : '<textarea class="respuesta-texto" name="' + esc(it.id) + '" data-item="' + esc(it.id) + '" rows="3" maxlength="2000"></textarea>';
    return '<label class="observacion' + (it.linea ? ' observacion--linea' : '') + '" data-item="' + esc(it.id) + '"' +
      (it.obligatoria === true ? ' data-obligatoria="1"' : '') +
      (it.si ? ' data-si-id="' + esc(it.si.id) + '" data-si-valor="' + esc(it.si.valor) + '" hidden' : '') +
      '><span class="observacion__titulo">' + it.lineas.map(esc).join('<br>') + '</span>' + control + '</label>';
  }
  function itemCuestionario(it) {
    return it.observacion ? observacion(it) : pregunta(it);
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
      case 'preguntas': return '<div class="preguntas" data-seccion="' + esc(sec.id) + '">' +
        (sec.titulo ? '<h3 class="seccion__titulo">' + esc(sec.titulo) + '</h3>' : '') +
        (sec.descripcion || []).map(function (l) { return '<p class="seccion__desc">' + esc(l) + '</p>'; }).join('') +
        sec.items.map(itemCuestionario).join('') + '</div>';
      default: throw new Error('tipo de sección desconocido: ' + sec.tipo);
    }
  }
  function htmlCheck(tipo, catalogo) {
    var c = catalogo[tipo];
    return '<section class="check check--' + esc(tipo) + '" data-tipo="' + esc(tipo) + '"><h2 class="pestana">' + esc(c.titulo) + '</h2>' +
      (c.intro ? '<p class="check__intro">' + esc(c.intro) + '</p>' : '') +
      (c.fotos ? '<div class="fotos"><h3 class="observaciones__titulo">IMÁGENES DE LA ORDEN</h3><p class="fotos__ayuda">' + esc(c.fotos.ayuda) +
        ' (hasta ' + c.fotos.max + ')</p><label class="fotos__boton">+ Agregar fotos<input type="file" class="fotos__input" accept="image/*" multiple></label>' +
        '<div class="fotos__lista"></div></div>' : '') +
      c.secciones.map(seccion).join('') +
      (c.observaciones ? '<div class="observaciones"><h3 class="observaciones__titulo">OBSERVACIONES</h3>' +
        '<textarea name="observaciones" class="observaciones__texto" rows="5" maxlength="2000" placeholder="Cualquier comentario sobre este control"></textarea></div>' : '') +
      '</section>';
  }
  function campo(nombre, etiqueta, control) {
    return '<label class="campo"><span>' + etiqueta + '</span>' + control + '</label>';
  }
  function opcionesLista(lista, vacia) {
    return '<option value="" disabled selected>' + vacia + '</option>' + (lista || []).map(function (op) {
      return '<option value="' + esc(op) + '">' + esc(op) + '</option>';
    }).join('');
  }
  function htmlDatos(tipo, sucursales, listas) {
    var ops = '<option value="" disabled selected>Elegí la sucursal</option>' + sucursales.map(function (s) {
      return '<option value="' + esc(s.nombre) + '">' + esc(s.nombre) + '</option>';
    }).join('');
    var h = campo('sucursal', 'Sucursal', '<select name="sucursal" required>' + ops + '</select>');
    if (tipo === 'auditoria') {
      listas = listas || {};
      return '<div class="datos" data-tipo="auditoria">' + h +
        campo('or', 'Ingrese el número de referencia de la orden. *', '<input name="or" inputmode="numeric" autocomplete="off" required>') +
        campo('fechaCierre', 'Ingrese la fecha de cierre de la orden. *', '<input name="fechaCierre" type="date" required>') +
        campo('aps', 'Ingrese el número de operario del APS. *', '<select name="aps" required>' + opcionesLista(listas.aps, 'Elegir') + '</select>') +
        campo('mecanico', 'Ingrese el número de operario del mecánico. *', '<select name="mecanico" required>' + opcionesLista(listas.mecanico, 'Elegir') + '</select>') +
        campo('firmaCalidad', 'Firma de control de calidad *', '<select name="firmaCalidad" required>' + opcionesLista(listas.mecanico, 'Elegir') + '</select>') +
        '</div>';
    }
    h += campo('asesor', tipo === 'agendamiento' ? 'Quién atendió' : 'Asesor', '<select name="asesor" required><option value="" disabled selected>Elegí primero la sucursal</option></select>');
    if (tipo === 'checkin' || tipo === 'checkout') h += campo('or', 'N° de Ref.', '<input name="or" inputmode="numeric" autocomplete="off" required>');
    if (tipo !== 'general') {
      h += campo('patente', 'Patente', '<input name="patente" autocapitalize="characters" autocomplete="off" required>');
      h += campo('cliente', 'Cliente', '<input name="cliente" autocomplete="off" required>');
    }
    if (tipo === 'checkin' || tipo === 'checkout') {
      h += campo('trabajo', 'Trabajo a realizar', '<select name="trabajo" required>' + opcionesLista(TRABAJOS, 'Elegir') + '</select>');
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
  return { TRABAJOS: TRABAJOS, esc: esc, htmlCheck: htmlCheck, htmlDatos: htmlDatos, opcionesAsesores: opcionesAsesores, textoProgreso: textoProgreso };
});
