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
  // Pregunta SI/NO de Auditoría de OR. extra: obligatoria, ayuda, foto, si: { id, valor } (sólo se muestra
  // si la pregunta `id` tiene la respuesta `valor`; si no se muestra se guarda como NO CORRESPONDE).
  function sn(id, texto, extra) {
    return Object.assign({ id: id, lineas: [texto], etiqueta: texto, img: null, opciones: ['SI', 'NO'], obligatoria: false }, extra || {});
  }
  // Observaciones libres de una sección (texto, no cuenta para el cumplimiento).
  function obs(id, texto) {
    return { id: id, lineas: [texto], etiqueta: texto, img: null, observacion: true };
  }
  // Campo de texto de una línea que aparece sólo con cierta respuesta (y entonces es obligatorio).
  function dato(id, etiqueta, rotulo, si) {
    return { id: id, lineas: [rotulo], etiqueta: etiqueta, img: null, observacion: true, linea: true, obligatoria: true, si: si };
  }
  function proto(id, etiqueta, texto) {
    return { id: id, lineas: [], etiqueta: etiqueta, img: null, texto: texto };
  }

  return {
    checkin: {
      titulo: 'CHECK IN',
      hoja: 'Check In',
      observaciones: true,
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
      observaciones: true,
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
      observaciones: true,
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
            dato('ge_no_show_cliente', 'Control No show – Nombre del cliente', 'Nombre del cliente:', { id: 'ge_no_show', valor: 'NO' }),
            pregunta('ge_recordatorio_turnos', 'Control de recordatorio de turnos'),
            dato('ge_recordatorio_cliente', 'Control de recordatorio de turnos – Nombre del cliente', 'Nombre del cliente:', { id: 'ge_recordatorio_turnos', valor: 'NO' }),
            pregunta('ge_uso_epp', 'Control de uso de EPP'),
            pregunta('ge_cobertores_capot', 'Control de uso de cobertores de capot de vehículos')
          ]
        }
      ]
    },

    // Auditoría de OR: copia del Google Form "Auditoría de Órdenes" (sin la pregunta de correo).
    auditoria: {
      titulo: 'AUDITORÍA DE ÓRDENES',
      hoja: 'Auditoría de OR',
      intro: '¡Bienvenido! En el siguiente formulario deberá contestar cada pregunta referente a la orden que usted seleccione para auditar. Dejará indicado el número de orden y las imágenes necesarias de la misma a fin de corroborar lo anotado.',
      fotos: { ayuda: 'Cargue imágenes de la orden que respalden lo auditado.', max: 5 },
      secciones: [
        {
          id: 'au_a', tipo: 'preguntas', titulo: 'A. Apertura de órdenes', items: [
            sn('au_a1', 'A1. En "Manifestación del cliente", ¿está redactada correctamente la voz del cliente?', {
              obligatoria: true, foto: 'img/au_a1.jpg',
              ayuda: 'Si pide un servicio de XX km, debe decir "SERVICE xx km $xx". Si remite otra incidencia, debe estar aclarado.' }),
            sn('au_a2', 'A2. ¿Se encuentra la descripción del técnico de la tarea realizada?', { obligatoria: true, foto: 'img/au_a2.jpg' }),
            sn('au_a3', 'A3. El APS ¿anotó sus observaciones en "Interpretación del Asesor"? Si no hay observaciones al respecto, debe figurar "sin observaciones".', { obligatoria: true }),
            sn('au_a4', 'A4. ¿Se encuentra el diagnóstico del técnico respecto del vehículo?', { obligatoria: true }),
            sn('au_a5', 'A5. La orden, ¿posee sello de calidad, firma de ingreso y egreso?', { obligatoria: true, foto: 'img/au_a5.jpg' }),
            obs('au_a6', 'A6. Observaciones de Apertura')
          ]
        },
        {
          id: 'au_b', tipo: 'preguntas', titulo: 'B. Proforma',
          descripcion: ['Tengan en cuenta que esta sección posee preguntas condicionales, es decir, dependen de repuestas anteriores. Si correspondía el uso de la proforma, ignorar las preguntas referentes a la situación en que no se la utilizó.'],
          items: [
            sn('au_b1', 'B1. La proforma ¿está impresa en el dorso de la orden?', {
              obligatoria: true, ayuda: 'Si no está impresa, responder y saltar a la siguiente sección ignorando el resto de preguntas.' }),
            sn('au_b2', 'B2. ¿Se utilizó la proforma? (Recuerde que se usa cuando el cliente pide adicionales, o el técnico recomienda reemplazos.', {
              si: { id: 'au_b1', valor: 'SI' },
              ayuda: 'Si la respuesta es "No", ir a la pregunta B3. Si la respuesta es "Si", ir a las preguntas B4 a B6.)' }),
            sn('au_b3', 'B3. ¿Se encuentra la proforma tachada?', {
              si: { id: 'au_b2', valor: 'NO' }, ayuda: 'Una vez respondido, continuar a la siguiente sección.' }),
            sn('au_b4', 'B4. ¿Se encuentran los presupuestos asignados y la disponibilidad de stock marcada?', { si: { id: 'au_b2', valor: 'SI' } }),
            sn('au_b5', 'B5. La autorización del cliente, ¿está correctamente señalizada por caso?', { si: { id: 'au_b2', valor: 'SI' } }),
            sn('au_b6', 'B6. ¿Está firmada por el cliente?', { si: { id: 'au_b2', valor: 'SI' } }),
            obs('au_b7', 'B7. Observaciones de Preforma')
          ]
        },
        {
          id: 'au_c', tipo: 'preguntas', titulo: 'C. Checks', items: [
            sn('au_c1', 'C1. ¿Tiene CHECK IN completo, acorde al "Manual de Órdenes de Reparación", con firma del APS y del cliente?', { obligatoria: true }),
            sn('au_c2', 'C2. ¿Tiene CHECK UP completo, acorde al "Manual de Órdenes de Reparación", con nombre o sello y firma del técnico?', { obligatoria: true }),
            sn('au_c3', 'C3. ¿Tiene CHECK OUT completo, acorde al "Manual de Órdenes de Reparación", con firma del cliente y del APS?', { obligatoria: true }),
            obs('au_c4', 'C4. Observaciones de Checks')
          ]
        },
        {
          id: 'au_d', tipo: 'preguntas', titulo: 'D. Prueba de manejo',
          descripcion: [
            'Las pruebas solo son necesarias en 2 situaciones:',
            'Si el cliente remite un ruido, molestia al andar u otra indicación. En este caso se controlan las 3 pruebas.',
            'Si el técnico considera necesario realizar una prueba. En este caso se controla la prueba de manejo 2.',
            'De no realizarse, debe estar asentado que no fue requerida ni realizada junto con el nombre o sello y firma del ténico'
          ],
          items: [
            sn('au_d1', 'D1. Se realizó la prueba de manejo?.', {
              ayuda: 'Si la respuesta es "Si", responder D3 e ignorar el resto. Si la respuesta es "No", responder D2 e ignorar el resto.' }),
            sn('au_d2', 'D2. ¿Figura por escrito que no se realizaron las pruebas, validado con nombre o sello y firma del técnico?.', {
              si: { id: 'au_d1', valor: 'NO' }, ayuda: 'Una vez respondido, pasar a la siguiente sección.' }),
            sn('au_d3', 'D3. ¿Están las casillas marcadas, más las observaciones correspondientes, validado con sello o nombre y firma del técnico?.', {
              si: { id: 'au_d1', valor: 'SI' } }),
            obs('au_d4', 'D4. Observaciones de prueba de manejo')
          ]
        },
        {
          id: 'au_e', tipo: 'preguntas', titulo: 'E. Control cruzado', items: [
            sn('au_e1', 'E1. ¿Están las preguntas contestadas junto con nombre o sello y firma del técnico de control?', { obligatoria: true }),
            obs('au_e2', 'E2. Observaciones de control cruzado')
          ]
        },
        {
          id: 'au_f', tipo: 'preguntas', titulo: 'F. Inspección final', items: [
            sn('au_f1', 'F1. ¿El control final está completo con nombre o sello y firma del APS?', { obligatoria: true }),
            obs('au_f2', 'F2. Observaciones de inspección final')
          ]
        },
        {
          id: 'au_g', tipo: 'preguntas', titulo: 'G. Herramientas APS',
          descripcion: ['Control del uso de las herramientas de Check in y Check out que dispone el APS para seguir el proceso de recepción y entrega.'],
          items: [
            sn('au_g1', 'G1. ¿Se encuentra la herramienta abrochada a la orden?', {
              obligatoria: true,
              ayuda: 'Si la respuesta es "No", se interpreta que no fue utilizada, Ignorar las siguientes preguntas y terminar la auditoria.' }),
            sn('au_g2', 'G2. La herramienta Check In, ¿posee todas las marcas de seguimiento?', { si: { id: 'au_g1', valor: 'SI' }, foto: 'img/au_g2.jpg' }),
            sn('au_g3', 'G3. La herramienta Check Out, ¿posee todas las marcas de seguimiento?', { si: { id: 'au_g1', valor: 'SI' }, foto: 'img/au_g3.jpg' }),
            obs('au_g4', 'G4. Observaciones de Herramientas APS')
          ]
        }
      ]
    }
  };
});
