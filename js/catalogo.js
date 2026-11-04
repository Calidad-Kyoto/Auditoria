/* Catálogo de los checks de Posventa: textos e íconos tal cual los PDFs originales.
 * `etiqueta` es el nombre de la columna en el Sheet (única dentro de cada check).
 * `lineas` es el texto que se ve debajo del ícono, respetando los cortes de línea del PDF.
 * `img` es el archivo en img/ (lo genera tools/extraer_iconos.py); null = ítem sin ícono.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.CATALOGO = fabrica();
})(this, function () {
  function it(id, lineas, etiqueta) {
    return { id: id, lineas: lineas, etiqueta: etiqueta || lineas.join(' '), img: 'img/' + id + '.png' };
  }
  function pregunta(id, texto) {
    return { id: id, lineas: [texto], etiqueta: texto, img: null, opciones: ['SI', 'NO', 'NO CORRESPONDE'] };
  }
  function proto(id, etiqueta, texto) {
    return { id: id, lineas: [], etiqueta: etiqueta, img: null, texto: texto };
  }

  return {
    checkin: {
      titulo: 'CHECK IN',
      hoja: 'Check In',
      secciones: [
        {
          id: 'checkin', tipo: 'grilla', columnas: 4, items: [
            it('ci_datos_cliente', ['Datos del cliente']),
            it('ci_nro_cono', ['Nro de Cono en OR']),
            it('ci_bocina_luces', ['Bocina', 'Luces - Escobillas']),
            it('ci_protecciones', ['Protecciones']),
            it('ci_chequeo_errores', ['Chequeo de Errores']),
            it('ci_combustible_km', ['Nivel de Combustible', 'y Km.']),
            it('ci_verificacion_ocular', ['Verificacion Ocular']),
            it('ci_apertura_capot', ['Apertura Capot']),
            it('ci_aceite_filtro', ['Mostrar Nivel de Aceite', 'y Filtro de Aire']),
            it('ci_manual_garantia', ['Manual de Garantía']),
            it('ci_baul', ['Baul /Caja de Carga']),
            it('ci_rueda_kit', ['Rueda de Auxilio', 'kit de Seguridad']),
            it('ci_objetos_valor', ['Objetos de Valor']),
            it('ci_trabajos_adicionales', ['Trabajos Adicionales']),
            it('ci_prueba_manejo', ['Prueba de Manejo']),
            it('ci_recall', ['Verificar Recall']),
            it('ci_explicacion_trabajos', ['Explicacion de', 'Trabajos a Realizar']),
            it('ci_lavado', ['Lavado']),
            it('ci_consult_bateria', ['Consult / Batería']),
            it('ci_venta_consultiva', ['Venta Consultiva'])
          ]
        },
        {
          id: 'ofrecemos', tipo: 'ofrecemos', titulo: 'OFRECEMOS', columnas: 3, items: [
            it('of_valor_servicio', ['Valor del Servicio']),
            it('of_formas_pago', ['Formas de Pago']),
            it('of_sala_espera', ['Cortesía Sala', 'de Espera']),
            it('of_hora_checkout', ['Hora del Check - Out']),
            it('of_tarjeta_checkin', ['Tarjeta Check In']),
            it('of_traslado', ['Traslado/Remis'])
          ]
        }
      ]
    },

    checkout: {
      titulo: 'CHECK OUT',
      hoja: 'Check Out',
      secciones: [
        {
          id: 'checkout', tipo: 'grilla', columnas: 4, items: [
            it('co_explicacion_realizados', ['Explicación de', 'Trabajos Realizados']),
            it('co_ticket_bateria', ['Ticket Bateria']),
            it('co_escaneo', ['Escaneo y Resultado']),
            it('co_asistencia_24x7', [], 'Asistencia Nissan 24x7'),
            it('co_repuestos_originales', ['Información de', 'Repuestos Originales']),
            it('co_garantia_servicio', ['Garantía de Servicio']),
            it('co_manual_sellado', ['Manual Sellado']),
            it('co_proximo_servicio', ['Info Próximo Servicio']),
            it('co_explicacion_factura', ['Explicación Factura']),
            it('co_tarjeta_checkout', ['Tarjeta Check Out']),
            it('co_encuesta_satisfaccion', ['Formulario Encuesta', 'de Satisfacción']),
            it('co_capot_abierto', ['Capot Abierto']),
            it('co_nivel_aceite', ['Nivel de Aceite']),
            it('co_piezas_sustituidas', ['Piezas Sustituidas', 'Evidencia']),
            it('co_luces', ['Luces']),
            it('co_baul_objetos', ['Baul - Caja', 'Objetos de Valor']),
            it('co_rueda_kit', ['Rueda de Auxilio', 'kit de Seguridad']),
            it('co_retiro_cono', ['Retiro de Cono', 'y Protecciones'])
          ]
        },
        {
          id: 'postentrega', tipo: 'postentrega', columnas: 3, items: [
            it('pe_reconfirmar_datos', ['Reconfirmar', 'Datos del cliente']),
            it('pe_llamado_acompanamiento', ['Llamado de', 'Acompañamiento']),
            it('pe_encuesta_nissan', ['Encuesta Nissan', 'Escala y Medio'])
          ]
        }
      ]
    },

    agendamiento: {
      titulo: 'AGENDAMIENTO',
      hoja: 'Agendamiento',
      secciones: [
        {
          id: 'protocolo-inicio', tipo: 'protocolo-inicio', items: [
            proto('ag_3er_ring', 'Atiende antes del 3er ring', 'SE ATIENDE EL LLAMADO ANTES DEL 3ER RING'),
            Object.assign(proto('ag_saludo', 'Saludo y nombre del cliente',
              '“ Buenos días/tardes mi nombre es (…). Con quién tengo el gusto de hablar? (Usar el nombre del cliente) en que puedo ayudarte? ”'),
              { titulo: 'SALUDO', nota: 'DURANTE TODA LA LLAMADA REFERIRSE AL CLIENTE POR SU NOMBRE' })
          ]
        },
        {
          id: 'agendamiento', tipo: 'grilla-roja', columnas: 3, items: [
            it('ag_datos_cliente', ['Datos del cliente']),
            it('ag_patente_km', ['Patente, Vehículo y Km.', 'Solicitar cédula del vehiculo', 'de ser necesario'], 'Patente, Vehículo y Km.'),
            it('ag_motivo', ['Motivo del turno', '(Servicio/Reparacion)', 'Trabajos adicionales', '(indagar)'], 'Motivo del turno y trabajos adicionales'),
            it('ag_recall', ['Verifica RECALL']),
            it('ag_opciones_horarios', ['Opciones de', 'días y horarios']),
            it('ag_explicacion', ['Explicacion detallada de los', 'trabajos a realizar']),
            it('ag_lavado', ['Lavado de cortesia']),
            it('ag_horario_entrega', ['Horario de entrega']),
            it('ag_formas_pago', ['Formas de pago']),
            it('ag_recordar_traer', ['Recordar traer:', 'Cedula del vehículo', 'Manual de mantenimiento', 'Llave tuercas antirrobo'], 'Recordar traer (cédula, manual, llave antirrobo)'),
            it('ag_objetos_valor', ['No dejar objetos de valor', 'en su vehiculo']),
            it('ag_traslado', ['Traslado/Remis'])
          ]
        },
        {
          id: 'protocolo-cierre', tipo: 'protocolo-cierre', items: [
            proto('ag_tiempo_15', 'Tiempo de recepción 15 minutos', '- Tiempo de recepcion 15 minutos.'),
            proto('ag_recordar_turno', 'Recordó día y hora del turno', '- Recordar al cliente el día y hora del turno antes de terminar el llamado.'),
            proto('ag_puntualidad', 'Reforzó la puntualidad', '- Reforzar la importancia de la puntualidad.'),
            proto('ag_despedida', 'Saludó y despidió por nombre', '- Saludar cordialmente por nombre y despedir al cliente.')
          ]
        }
      ]
    },

    // General: preguntas SI / NO / NO CORRESPONDE y observaciones libres (sin PDF de origen).
    general: {
      titulo: 'GENERAL',
      hoja: 'General',
      observaciones: true,
      secciones: [
        {
          id: 'general', tipo: 'preguntas', items: [
            pregunta('ge_no_show', 'Control No show'),
            pregunta('ge_recordatorio_turnos', 'Control de recordatorio de turnos'),
            pregunta('ge_uso_epp', 'Control de uso de EPP'),
            pregunta('ge_cobertores_capot', 'Control de uso de cobertores de capot de vehículos')
          ]
        }
      ]
    }
  };
});
