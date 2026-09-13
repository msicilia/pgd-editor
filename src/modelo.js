/* ------------------------------------------------------------------
   Modelo del documento.

   El centro es el RDA DMP Common Standard: un objeto `dmp` con su
   contacto, su proyecto y una lista de `dataset`. Lo que el estándar
   no cubre vive en `x_pgd`, con prefijo, para que el JSON siga siendo
   reconocible por cualquier herramienta que hable RDA.

   No se edita a mano: lo escribe y lo lee la aplicación.
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var ESQUEMA = 'https://github.com/RDA-DMP-Common/RDA-DMP-Common-Standard';

  function hoy() {
    return new Date().toISOString().slice(0, 10);
  }

  /* Los tres valores que admite el estándar donde pregunta por datos
     personales y sensibles. «unknown» no es un fallo: es una respuesta
     legítima mientras no se haya averiguado. */
  var TRES = [
    { v: 'yes', t: 'Sí' },
    { v: 'no', t: 'No' },
    { v: 'unknown', t: 'Todavía no lo sé' }
  ];

  var ESTADO_FINANCIACION = [
    { v: 'planned', t: 'Previsto, aún no solicitado' },
    { v: 'applied', t: 'Solicitado, pendiente de resolución' },
    { v: 'granted', t: 'Concedido' },
    { v: 'rejected', t: 'Denegado' },
    { v: '', t: 'Sin financiación externa' }
  ];

  function documentoNuevo() {
    return {
      dmp: {
        schema: ESQUEMA,
        title: '',
        description: '',
        language: 'spa',
        created: hoy(),
        modified: hoy(),
        dmp_id: { type: 'other', identifier: '' },
        contact: {
          name: '',
          mbox: '',
          contact_id: { type: 'orcid', identifier: '' }
        },
        project: [{
          title: '',
          description: '',
          start: '',
          end: '',
          funding: [{
            name: '',
            grant_id: { type: 'other', identifier: '' },
            funding_status: ''
          }]
        }],
        dataset: []
      },
      x_pgd: {
        version: '1.0',
        fecha_version: hoy(),
        /* Una versión abierta es un borrador: se puede reexportar las
           veces que haga falta con el mismo número. Una cerrada es la
           que se ha entregado a alguien, y a partir de ahí el número
           solo puede subir. Es lo que permite saber, mirando dos PDF,
           cuál es posterior. */
        estado: 'abierta',
        minima: '',
        sello: '',
        institucion: '',
        historial: []
      }
    };
  }

  /* Los identificadores CD1, CD2… son los que después se usan para
     referirse al conjunto en todo el documento, así que se asignan
     solos y no se reutilizan aunque se borre uno por el medio. */
  function siguienteId(doc) {
    var max = 0;
    (doc.dmp.dataset || []).forEach(function (d) {
      var m = /^CD(\d+)$/.exec((d.dataset_id && d.dataset_id.identifier) || '');
      if (m) { max = Math.max(max, parseInt(m[1], 10)); }
    });
    return 'CD' + (max + 1);
  }

  /* La ficha de un conjunto tiene catorce campos, y pedirlos todos de
     golpe la primera vez es la forma más segura de que no se rellene
     ninguno. Por eso van en cuatro niveles: el primero basta para que
     el conjunto exista y se pueda nombrar en el resto del documento;
     los demás se abren cuando hay algo que decir.

     Lo que cabe en el estándar RDA usa sus nombres. Lo que no, lleva
     prefijo `x_`. */
  var NIVELES = [
    { id: 1, titulo: 'Identificación y clasificación',
      pista: 'Con estos cuatro campos el conjunto queda constituido y puede citarse por su identificador en el resto del documento. Son, además, los que el estándar RDA exige.',
      campos: ['title', 'description', 'personal_data', 'sensitive_data'] },
    { id: 2, titulo: 'Procedencia y formato',
      pista: 'El origen condiciona el resto del plan. Un dato preexistente de origen asistencial requiere una habilitación propia y sigue el circuito de autorización que tenga establecido la institución.',
      campos: ['x_origen', 'x_sistema', 'x_formato', 'x_volumen'] },
    { id: 3, titulo: 'Identificabilidad',
      pista: 'Determina la base legal aplicable, el emplazamiento admisible y lo que podrá compartirse. Conviene resolverlo con precisión una vez, porque todo lo demás se apoya en ello.',
      campos: ['x_identificabilidad', 'x_intrinseca', 'x_seudonimizacion'] },
    { id: 4, titulo: 'Documentación para la reutilización',
      pista: 'La ficha describe qué es el conjunto. Las decisiones sobre él —emplazamiento, plazo de conservación y destino— se toman en los apartados 7, 8 y 9, donde los conjuntos se presentan juntos y sus diferencias quedan a la vista.',
      campos: ['keyword', 'data_quality_assurance', 'x_utilidad', 'x_responsable'] }
  ];

  var ORIGEN = [
    { v: '', t: '—' },
    { v: 'nueva', t: 'Recogida nueva del proyecto' },
    { v: 'asistencial', t: 'Preexistente, de origen asistencial' },
    { v: 'cedido', t: 'Cedido por un tercero' },
    { v: 'reutilizado', t: 'Reutilizado de un proyecto anterior' },
    { v: 'derivado', t: 'Derivado de otros conjuntos de este proyecto' }
  ];

  var IDENTIFICABILIDAD = [
    { v: '', t: '—' },
    { v: 'identificable', t: 'Identificable' },
    { v: 'seudo-accesible', t: 'Seudonimizado, con la clave accesible al equipo' },
    { v: 'seudo-separada', t: 'Seudonimizado, con la clave separada y custodiada por otros' },
    { v: 'anonimo', t: 'Anonimizado' },
    { v: 'no-personal', t: 'No son datos personales' }
  ];

  var DESTINO = [
    { v: '', t: '— sin decidir —' },
    { v: 'open', t: 'Abierto' },
    { v: 'shared', t: 'Acceso controlado, con solicitud' },
    { v: 'closed', t: 'No se comparte' }
  ];

  var SI_NO = [
    { v: '', t: '— sin responder —' },
    { v: 'si', t: 'Sí' },
    { v: 'no', t: 'No' }
  ];

  /* Las cuatro vías que habilitan un tratamiento en investigación
     biomédica. No son alternativas de estilo: cada una arrastra sus
     propias obligaciones y su propio alcance. */
  var BASE_LEGAL = [
    { v: '', t: '— sin decidir —' },
    { v: 'consentimiento', t: 'Consentimiento informado' },
    { v: 'interes-publico', t: 'Interés público en el ámbito de la salud' },
    { v: 'obligacion', t: 'Obligación legal o ejercicio de poderes públicos' },
    { v: 'no-personal', t: 'No procede: no son datos personales' }
  ];

  var EIPD = [
    { v: '', t: '— sin decidir —' },
    { v: 'no', t: 'No procede, y consta por qué' },
    { v: 'pendiente', t: 'Procede, pendiente de realizar' },
    { v: 'hecha', t: 'Realizada' }
  ];

  function conjuntoNuevo(doc) {
    return {
      dataset_id: { type: 'other', identifier: siguienteId(doc) },
      title: '',
      description: '',
      personal_data: 'unknown',
      sensitive_data: 'unknown',
      keyword: [],
      x_origen: '',
      x_sistema: '',
      x_formato: '',
      x_volumen: '',
      x_identificabilidad: '',
      x_intrinseca: '',
      x_seudonimizacion: '',
      data_quality_assurance: '',
      x_responsable: '',
      x_utilidad: '',

      /* decisiones que se toman en su propio apartado, no en la ficha:
         la ficha dice qué es el conjunto; los apartados, qué se hace
         con él. Cada una difiere de un conjunto a otro, y esa es
         justamente la razón de que el documento no se pueda escribir
         en singular. */
      x_diccionario: '',
      x_vocabularios: '',
      x_base_legal: '',
      x_alcance: '',
      x_emplazamiento: '',
      x_administra: '',
      x_respaldo: '',
      x_plazo: '',
      x_plazo_norma: '',
      x_destino: '',
      x_justificacion: '',
      x_repositorio: '',
      x_licencia: ''
    };
  }

  /* --- Los apartados con campos ----------------------------------------
     Cada uno declara sus campos de proyecto y, si procede, sus campos
     de conjunto. Los que tienen campos de conjunto muestran además una
     tabla que pone a todos los conjuntos juntos: es lo que hace visible
     que las decisiones no coinciden, y lo que impide decidir en bloque
     sin darse cuenta.

     Un campo puede llevar `si`, y entonces solo aparece cuando otro
     campo tiene un valor determinado. Se usa para no pedir seis cosas
     sobre muestras biológicas a un proyecto que no maneja ninguna.    */
  var TEMAS = {
    documentacion: {
      pista: 'Este apartado responde a una sola pregunta: si alguien ajeno al proyecto recibiera estos datos, ¿podría interpretarlos? La convención de nombres es del proyecto; el diccionario de variables y los vocabularios, de cada conjunto.',
      proyecto: [
        { k: 'x_nombrado', req: 'recomendado', et: 'Convención de nombres y versiones de fichero', tipo: 'textarea',
          ayuda: 'Cualquier convención declarada es preferible a ninguna. Una habitual es proyecto_conjunto_versión_fecha, con la fecha en formato año-mes-día, que ordena correctamente por orden alfabético.' },
        { k: 'x_esquema', req: 'recomendado', et: 'Esquema de metadatos del depósito', tipo: 'text',
          ayuda: 'Lo impone en gran medida el repositorio. Basta con decir cuál se prevé.' },
        { k: 'x_software_lectura', req: 'recomendado', et: 'Software necesario para leer los datos', tipo: 'textarea',
          ayuda: 'Si para abrir o interpretar un conjunto hace falta un programa concreto —un visor de imagen médica, un paquete estadístico, un guion de lectura—, conviene decir cuál, en qué versión y si se depositará junto a los datos. Si bastan herramientas corrientes, también conviene hacerlo constar.' },
        { k: 'x_ontologias', req: 'recomendado', et: 'Vocabularios propios, si los hay', tipo: 'textarea',
          ayuda: 'Solo cuando una variable no admite ningún catálogo existente y hay que definir uno del proyecto. Lo que se pide entonces es a qué vocabulario común se corresponde y si se publicará para que otros puedan reutilizarlo.' },
        { k: 'x_referencias', req: 'recomendado', et: 'Enlaces con otros conjuntos de datos', tipo: 'textarea',
          ayuda: 'Si estos datos se relacionan con otros —de un proyecto anterior, de un registro externo, de un consorcio—, con cuáles y por qué variable se enlazan. Si no se relacionan con ninguno, conviene decirlo.' }
      ],
      conjunto: [
        { k: 'x_diccionario', req: 'recomendado', et: 'Diccionario de variables', tipo: 'textarea',
          ayuda: 'Dónde reside, quién lo mantiene y desde cuándo existe. No es necesario reproducir su contenido en el plan.' },
        { k: 'x_vocabularios', req: 'recomendado', et: 'Estándares y vocabularios', tipo: 'textarea',
          ayuda: 'Con qué se codifica cada variable clave, y en qué versión. Lo normal es que se herede del sistema de origen: el trabajo no es escoger, es no perderlo y declarar cuál es.' }
      ],
      columnas: [{ k: 'x_diccionario', et: 'Diccionario' }]
    },
    almacenamiento: {
      pista: 'Un proyecto ordinario mantiene datos en tres emplazamientos simultáneos: el sistema de captura, el espacio de trabajo y el entorno de análisis. Declarar solo el primero deja fuera copias que suelen estar peor protegidas.',
      proyecto: [
        { k: 'x_no_usar', req: 'recomendado', et: 'Qué no se usará', tipo: 'textarea',
          ayuda: 'Nube personal, correo electrónico, dispositivos sin cifrar, herramientas en línea no autorizadas y asistentes de inteligencia artificial de uso general. Conviene indicar junto a cada exclusión la alternativa prevista: una restricción sin alternativa no se cumple.' },
        { k: 'x_transferencia', req: 'recomendado', et: 'Cómo viajan los datos cuando salen de su sistema', tipo: 'textarea',
          ayuda: 'Qué canal, quién lo autoriza y con qué protección.' }
      ],
      conjunto: [
        { k: 'x_emplazamiento', req: 'obligatorio', et: 'Dónde reside', tipo: 'text',
          ayuda: 'El nombre del sistema concreto. «Servidores institucionales» no se puede comprobar.' },
        { k: 'x_administra', req: 'recomendado', et: 'Quién lo administra', tipo: 'text' },
        { k: 'x_respaldo', req: 'recomendado', et: 'Copias de seguridad', tipo: 'textarea',
          ayuda: 'Qué sistemas están cubiertos y cuáles no, con qué frecuencia, cuánta retención y si se ha verificado alguna restauración. Conviene confirmarlo con el servicio responsable en lugar de darlo por supuesto.' }
      ],
      columnas: [{ k: 'x_emplazamiento', et: 'Sistema' }, { k: 'x_administra', et: 'Administra' }]
    },
    conservacion: {
      pista: 'Sobre los mismos datos concurren obligaciones de origen distinto, cada una con su propio plazo. Cuando varias normas fijan plazos diferentes rige el más largo: cumplir el más corto no exime del otro.',
      proyecto: [
        { k: 'x_bloqueo', req: 'recomendado', et: 'Bloqueo', tipo: 'textarea',
          ayuda: 'El estado intermedio entre «los estoy usando» y «ya no existen»: conservar impidiendo cualquier tratamiento salvo su puesta a disposición de jueces o administraciones. Cuánto dura, dónde residen y quién puede levantarlo, que no debería ser el equipo investigador.' },
        { k: 'x_borrado', req: 'recomendado', et: 'Borrado seguro', tipo: 'textarea',
          ayuda: 'Quién lo ejecuta, con qué procedimiento y —lo que siempre se olvida— cómo queda acreditado. Sin un acta con fecha, «los datos se destruyeron en 2041» es indemostrable.' }
      ],
      conjunto: [
        { k: 'x_plazo', req: 'obligatorio', et: 'Plazo de conservación', tipo: 'text',
          ayuda: 'Tiene que permitir poner una fecha en un calendario. «El tiempo necesario» no lo permite.' },
        { k: 'x_plazo_norma', req: 'obligatorio', et: 'Quién lo fija', tipo: 'text',
          ayuda: 'La norma o el compromiso concreto. Sin esto el plazo no se puede comprobar ni discutir.' }
      ],
      columnas: [{ k: 'x_plazo', et: 'Plazo' }, { k: 'x_plazo_norma', et: 'Lo fija' }]
    },
    comparticion: {
      pista: 'Tres destinos posibles, que no constituyen una escala de mejor a peor. Un proyecto rara vez tiene un destino único, y suponerlo lleva a aplicar a todos los conjuntos el régimen del más restringido.',
      proyecto: [
        { k: 'x_procedimiento', req: 'recomendado', et: 'Procedimiento de acceso controlado', tipo: 'textarea',
          ayuda: 'Quién autoriza las solicitudes, con qué criterios publicados y bajo qué acuerdo. Y qué pasa cuando el proyecto termine: un procedimiento que depende de una persona caduca con ella.' },
        { k: 'x_gestiones', req: 'recomendado', et: 'Gestiones ya hechas con el repositorio', tipo: 'textarea',
          ayuda: 'Si se ha consultado que admita el volumen, el tipo de dato y el acceso restringido, y qué contestaron. Es la diferencia entre haber elegido un repositorio y haberlo supuesto.' },
        { k: 'x_embargo', req: 'recomendado', et: 'Embargo, si se aplica', tipo: 'textarea',
          ayuda: 'Cuánto dura, desde qué fecha cuenta y qué lo motiva: una publicación en curso o una solicitud de patente. Si no hay embargo, conviene decirlo expresamente en lugar de dejar el punto en blanco.' },
        { k: 'x_disponibilidad', req: 'recomendado', et: 'Declaración de disponibilidad prevista', tipo: 'textarea',
          ayuda: 'El párrafo que pedirá la revista. Dejarlo redactado evita improvisarlo el día del envío, que es cuando aparece la fórmula de «disponible bajo petición al autor».' }
      ],
      conjunto: [
        { k: 'x_destino', req: 'obligatorio', et: 'Destino', tipo: 'select', opciones: 'DESTINO',
          ayuda: 'Se decide conjunto por conjunto. Una decisión en bloque aplica a todos el régimen del conjunto más restringido, y deja sin publicar lo que no lo requería.' },
        { k: 'x_justificacion', req: 'obligatorio', et: 'Justificación, si no es abierto', tipo: 'textarea',
          ayuda: 'De dónde viene la restricción: el RGPD, el consentimiento o un tercero. «Por motivos de confidencialidad» no identifica ninguno de los tres.' },
        { k: 'x_repositorio', req: 'recomendado', et: 'Repositorio previsto', tipo: 'text',
          ayuda: 'Cuál, y por qué ese. Hay que comprobar antes que admita el volumen, el acceso restringido y el coste.' },
        { k: 'x_licencia', req: 'recomendado', et: 'Licencia', tipo: 'text',
          ayuda: 'En acceso controlado la licencia no es lo que gobierna: gobierna el acuerdo de uso que firma quien solicita.' }
      ],
      columnas: [{ k: 'x_destino', et: 'Destino', opciones: 'DESTINO' }, { k: 'x_repositorio', et: 'Repositorio' }]
    },

    muestras: {
      pista: 'Una muestra no es un dato, pero casi siempre lleva uno pegado. El apartado existe por eso: mientras exista el vínculo entre el tubo y la fila, lo que se decida sobre las muestras condiciona lo que se puede decidir sobre los datos.',
      proyecto: [
        { k: 'x_muestras_hay', req: 'obligatorio', et: '¿El proyecto maneja muestras biológicas?', tipo: 'select', opciones: 'SI_NO',
          ayuda: 'Sangre, tejido, orina, saliva y cualquier material derivado, tanto recogido de nuevo como cedido por un biobanco o procedente del sobrante de una determinación asistencial. Si no hay ninguna, se declara aquí y el apartado queda resuelto.' },
        { k: 'x_muestras_tipos', si: { k: 'x_muestras_hay', v: 'si' }, req: 'obligatorio',
          et: 'Qué muestras, de cuántos sujetos y en qué momentos', tipo: 'textarea',
          ejemplo: 'Suero y ADN de 300 sujetos, en la visita basal y a los doce meses.',
          ayuda: 'Tipo de material, número aproximado de sujetos y alícuotas, y en qué visitas se obtiene. Es lo que permite dimensionar la conservación y el coste.' },
        { k: 'x_muestras_consentimiento', si: { k: 'x_muestras_hay', v: 'si' }, req: 'obligatorio',
          et: 'Qué ampara su obtención y su uso', tipo: 'textarea',
          ayuda: 'El consentimiento específico del proyecto, un consentimiento previo de biobanco o la exención que corresponda. Importa sobre todo el alcance: si cubre solo este análisis, si cubre usos futuros relacionados y si cubre la cesión a terceros. Un consentimiento que no menciona los usos futuros impide reutilizar las muestras aunque nadie se oponga.' },
        { k: 'x_muestras_vinculo', si: { k: 'x_muestras_hay', v: 'si' }, req: 'obligatorio',
          et: 'Quién custodia el vínculo entre la muestra y el dato', tipo: 'text',
          ayuda: 'Una muestra codificada sigue siendo dato personal mientras alguien pueda volver al sujeto. Aquí se dice quién puede, y conviene que no sea el mismo equipo que analiza.' },
        { k: 'x_muestras_lugar', si: { k: 'x_muestras_hay', v: 'si' }, req: 'recomendado',
          et: 'Dónde se conservan y en qué condiciones', tipo: 'text',
          ejemplo: 'Biobanco del instituto, congeladores a -80 °C con registro de temperatura.',
          ayuda: 'El emplazamiento concreto y quién responde de él. Si es un biobanco registrado, conviene nombrarlo: es lo que da trazabilidad a la custodia.' },
        { k: 'x_muestras_destino', si: { k: 'x_muestras_hay', v: 'si' }, req: 'obligatorio',
          et: 'Destino al terminar el proyecto', tipo: 'textarea',
          ayuda: 'Destrucción con acta, incorporación a una colección o a un biobanco, o cesión. Son las tres únicas salidas, y la que no se decide ahora acaba siendo un congelador que nadie se atreve a vaciar.' }
      ],
      conjunto: [],
      columnas: []
    },

    otros: {
      pista: 'La Comisión pregunta expresamente por los resultados que no son datos. Casi siempre se pueden publicar en abierto sin restricción legal alguna, de modo que son la vía más accesible a la ciencia abierta para un proyecto cuyos datos están restringidos.',
      proyecto: [
        { k: 'x_software', req: 'recomendado', et: 'Software y código de análisis', tipo: 'textarea',
          ejemplo: 'Guiones de depuración y análisis en R, con el fichero de entorno que fija las versiones de los paquetes.',
          ayuda: 'Qué se programa dentro del proyecto y qué hace. Depositarlo es lo que convierte un resultado en reproducible, y no exige liberar ningún dato.' },
        { k: 'x_protocolos', req: 'recomendado', et: 'Protocolos y procedimientos', tipo: 'textarea',
          ayuda: 'Protocolos de recogida, procedimientos normalizados de trabajo, cuestionarios y escalas propias. Se publican con identificador permanente y se citan igual que un artículo.' },
        { k: 'x_materiales', req: 'recomendado', et: 'Materiales y otros resultados físicos', tipo: 'textarea',
          ayuda: 'Modelos, líneas celulares, anticuerpos, reactivos o cualquier material que otro equipo pudiera pedir. Si no hay ninguno, conviene hacerlo constar.' },
        { k: 'x_otros_deposito', req: 'recomendado', et: 'Dónde se depositarán', tipo: 'text',
          ejemplo: 'Repositorio de código con archivo permanente que asigne DOI a cada versión publicada.',
          ayuda: 'Un repositorio de código no basta por sí solo: hace falta que la versión publicada quede archivada con identificador permanente, porque una rama se puede reescribir.' },
        { k: 'x_otros_licencia', req: 'recomendado', et: 'Con qué licencia', tipo: 'text',
          ejemplo: 'MIT para el código, CC BY 4.0 para los protocolos.',
          ayuda: 'El código lleva licencia de software y los documentos licencia de contenido: no es la misma, y usar una sola para todo deja una de las dos cosas sin condiciones de uso claras.' }
      ],
      conjunto: [],
      columnas: []
    },

    legal: {
      pista: 'Lo que habilita el tratamiento no es único para todo el proyecto: un conjunto recogido con consentimiento y otro extraído de la historia clínica se apoyan en bases distintas y admiten usos distintos. Por eso este apartado tiene una parte de proyecto y otra de cada conjunto.',
      proyecto: [
        { k: 'x_comite', req: 'obligatorio', et: 'Comité de ética y referencia del dictamen', tipo: 'text',
          ejemplo: 'Comité de Ética de la Investigación del centro, dictamen favorable de 12/03/2026, referencia 041/2026.',
          ayuda: 'El nombre del comité, la fecha del dictamen y su referencia. Es el dato que permite comprobar que la aprobación existe, y el que se pide en cuanto el proyecto se audita.' },
        { k: 'x_consentimiento', req: 'obligatorio', et: 'Qué cubre el consentimiento y qué no', tipo: 'textarea',
          ayuda: 'Lo decisivo no es que exista, sino su alcance: si cubre la conservación a largo plazo, la compartición con otros equipos y los usos futuros relacionados. Si no los menciona, el plan no puede prometerlos, y ese es el choque que aparece cuando la revista pide los datos.' },
        { k: 'x_eipd', req: 'recomendado', et: 'Evaluación de impacto en protección de datos', tipo: 'select', opciones: 'EIPD',
          ayuda: 'Un tratamiento a gran escala de datos de salud la exige. Cuando no procede, lo que se pide es que conste el motivo, no que se omita el punto.' },
        { k: 'x_cesiones', req: 'recomendado', et: 'Cesiones a terceros y encargados de tratamiento', tipo: 'textarea',
          ayuda: 'Quién más va a tratar estos datos: un laboratorio externo, un centro colaborador, un proveedor de servicios en la nube. Cada uno necesita su contrato, y conviene decir cuál lo cubre. El proveedor que trata datos sin contrato de encargo es el hallazgo más frecuente de una inspección.' },
        { k: 'x_transferencias', req: 'recomendado', et: 'Transferencias fuera del Espacio Económico Europeo', tipo: 'textarea',
          ayuda: 'Si las hay, a qué país y con qué garantía. Conviene revisar dónde están los servidores de las herramientas que ya se usan: muchas transferencias no se deciden, se heredan del programa que alguien instaló.' }
      ],
      conjunto: [
        { k: 'x_base_legal', req: 'obligatorio', et: 'Base que habilita el tratamiento', tipo: 'select', opciones: 'BASE_LEGAL',
          ayuda: 'En datos de salud hacen falta dos habilitaciones a la vez y no una: la del tratamiento y la que levanta la prohibición general sobre las categorías especiales. Un conjunto de origen asistencial no se ampara en el consentimiento del proyecto por el hecho de que el proyecto lo tenga.' },
        { k: 'x_alcance', req: 'recomendado', et: 'Qué ampara ese permiso para este conjunto', tipo: 'textarea',
          ayuda: 'Hasta dónde llega: el análisis previsto, la conservación posterior, la cesión a terceros, la publicación. Es lo que después tiene que coincidir con el destino declarado en Compartición y publicación; si no coincide, uno de los dos apartados está prometiendo algo que no puede cumplir.' }
      ],
      columnas: [{ k: 'x_base_legal', et: 'Base legal', opciones: 'BASE_LEGAL' }]
    },

    responsabilidades: {
      pista: 'Todo lo decidido en los apartados anteriores cuesta tiempo y dinero de alguien. Aquí se dice de quién. Una tarea asignada a «el equipo investigador» es una tarea de nadie, y eso se descubre cuando no se ha hecho.',
      proyecto: [
        { k: 'x_reparto', req: 'obligatorio', et: 'Reparto de tareas, con nombres', tipo: 'textarea',
          ejemplo: 'Depuración y control de calidad mensual: nombre y apellidos. Extracción y seudonimización: servicio de informática. Depósito final: nombre y apellidos.',
          ayuda: 'Quién hace cada cosa: recoger, depurar, custodiar la clave, depositar, atender las solicitudes de acceso. Con nombres de personas o de servicios concretos.' },
        { k: 'x_coste', req: 'obligatorio', et: 'Coste estimado y partidas', tipo: 'textarea',
          ejemplo: 'Almacenamiento y respaldo institucional durante cinco años; tasa de depósito del repositorio; dedicación estimada de un mes de persona para depurar y documentar.',
          ayuda: 'Los tres costes que existen de verdad: almacenamiento durante el proyecto, depósito y conservación después, y el tiempo de una persona en documentar. El tercero es el mayor y el que nunca se presupuesta. Basta con órdenes de magnitud.' },
        { k: 'x_cobertura', req: 'recomendado', et: 'Con qué se cubre ese coste', tipo: 'text',
          ayuda: 'Partida del proyecto, servicio incluido de la institución o financiación pendiente. Los costes de gestión de datos son elegibles dentro de la ayuda si se han previsto.' },
        { k: 'x_relevo', req: 'recomendado', et: 'Qué ocurre si alguien deja el proyecto', tipo: 'textarea',
          ayuda: 'En un proyecto de cinco años con personal en formación, alguien se irá. Lo que se pide es que las claves de acceso, los ficheros y la documentación no se vayan con esa persona.' },
        { k: 'x_custodia_larga', req: 'obligatorio', et: 'Quién custodia los datos cuando el proyecto termina', tipo: 'text',
          ayuda: 'Una unidad o un servicio que siga existiendo, no una persona. Es la pregunta que decide si el plan sobrevive al proyecto, y la que casi nunca tiene respuesta escrita.' }
      ],
      conjunto: [
        { k: 'x_responsable', req: 'obligatorio', et: 'Persona responsable del conjunto', tipo: 'text',
          ejemplo: 'Nombre y apellidos',
          ayuda: 'Es el mismo campo que figura en la ficha del conjunto: lo que se escriba aquí aparece allí. A quién se pregunta por este conjunto en concreto, que no tiene por qué ser quien firma el plan.' }
      ],
      columnas: [{ k: 'x_responsable', et: 'Responsable' }]
    }
  };

  /* Un campo con `si` solo aparece cuando otro campo tiene el valor que
     pide. Lo usan a la vez el formulario, el estado del índice y el
     volcado a PDF, para que los tres coincidan. */
  function campoVisible(f, obj) {
    if (!f.si) { return true; }
    return String((obj && obj[f.si.k]) || '') === f.si.v;
  }

  /* Cuántos campos de un nivel están puestos. Lo usa el detalle para
     decir, con el nivel cerrado, si hay algo dentro. */
  function nivelHecho(c, nivel) {
    var n = NIVELES.filter(function (x) { return x.id === nivel; })[0];
    if (!n) { return { hechos: 0, total: 0 }; }
    var hechos = 0;
    n.campos.forEach(function (k) {
      var v = c[k];
      if (k === 'keyword') { if ((v || []).length) { hechos++; } return; }
      if (k === 'personal_data' || k === 'sensitive_data') {
        if (v && v !== 'unknown') { hechos++; } return;
      }
      if (String(v == null ? '' : v).trim()) { hechos++; }
    });
    return { hechos: hechos, total: n.campos.length };
  }

  /* --- El esquema del documento ---------------------------------------
     El índice no se escribe en el HTML: se genera de aquí, para que
     añadir un apartado sea añadir una fila.

     El orden es el de las decisiones, no el de las letras FAIR: nadie
     se sienta a decidir «cómo hago mis datos interoperables», sino qué
     formato usa y con qué codifica los diagnósticos. La estructura de
     la Comisión Europea se obtiene al exportar, no al editar: así se
     escribe una vez y se vuelca en el formulario que toque.

     Cada grupo lleva un tono, que es lo único que distingue de un
     vistazo en qué parte del documento se está trabajando.           */
  var SECCIONES = [
    { grupo: 'Documento', tono: 'documento', items: [
      { id: 'portada', n: '0', titulo: 'Portada y control del documento' },
      { id: 'resumen', n: '1', titulo: 'Resumen de la gestión de datos' }
    ]},
    { grupo: 'Datos', tono: 'datos', items: [
      { id: 'conjuntos', n: '2', titulo: 'Conjuntos de datos', hijos: true },
      { id: 'muestras', n: '3', titulo: 'Muestras biológicas', tema: 'muestras' },
      { id: 'otros', n: '4', titulo: 'Otros resultados', tema: 'otros' }
    ]},
    { grupo: 'Documentación', tono: 'documentacion', items: [
      { id: 'documentacion', n: '5', titulo: 'Documentación y metadatos', tema: 'documentacion' }
    ]},
    { grupo: 'Marco legal', tono: 'legal', items: [
      { id: 'legal', n: '6', titulo: 'Marco legal y ético', tema: 'legal' }
    ]},
    { grupo: 'Custodia y conservación', tono: 'custodia', items: [
      { id: 'almacenamiento', n: '7', titulo: 'Almacenamiento, seguridad y acceso', tema: 'almacenamiento' },
      { id: 'conservacion', n: '8', titulo: 'Conservación y disposición final', tema: 'conservacion' }
    ]},
    { grupo: 'Difusión', tono: 'difusion', items: [
      { id: 'comparticion', n: '9', titulo: 'Compartición y publicación', tema: 'comparticion' }
    ]},
    { grupo: 'Gestión', tono: 'gestion', items: [
      { id: 'responsabilidades', n: '10', titulo: 'Responsabilidades y recursos', tema: 'responsabilidades' }
    ]},
    { grupo: 'Cierre', tono: 'cierre', items: [
      { id: 'revision', titulo: 'Revisión y exportación' }
    ]}
  ];

  /* --- Comprobaciones -------------------------------------------------
     Solo las que se pueden automatizar: que un campo esté puesto, que
     dos apartados no se contradigan, que no se haya colado una palabra
     que no compromete a nada. Cada aviso dice a qué apartado pertenece,
     para mostrarlo donde se arregla y no en una lista suelta.         */

  var VAGAS = /\b(adecuad|apropiad|pertinent|vigent|necesari|periódic|periodic|correspondient)[oa]s?\b/i;

  function comprobar(doc) {
    var avisos = [];
    var d = doc.dmp;

    if (!d.title.trim()) {
      avisos.push({ grave: true, seccion: 'portada', texto: 'El plan no tiene título.' });
    }
    if (!d.contact.name.trim()) {
      avisos.push({ grave: true, seccion: 'portada', texto: 'No hay una persona responsable con nombre. Un plan sin nombre no es ejecutable: no hay a quién preguntar.' });
    }
    if (!doc.x_pgd.institucion.trim()) {
      avisos.push({ grave: false, seccion: 'portada', texto: 'Falta la institución responsable, que es quien responde de los datos cuando el proyecto termine.' });
    }
    if (!String(d.description || '').trim()) {
      avisos.push({ grave: false, seccion: 'resumen', texto: 'Falta el resumen. Se escribe el último, cuando el resto está decidido.' });
    } else if (VAGAS.test(d.description)) {
      avisos.push({ grave: false, seccion: 'resumen', texto: 'El resumen usa palabras que no se pueden comprobar. Si el párrafo se puede pegar en otro proyecto sin cambiar nada, todavía no describe este.' });
    }
    if (!d.dataset.length) {
      avisos.push({ grave: true, seccion: 'conjuntos', texto: 'No hay ningún conjunto de datos. Es el apartado del que depende todo el resto del documento.' });
    }
    if (d.dataset.length === 1) {
      avisos.push({
        grave: false, seccion: 'conjuntos',
        texto: 'Solo hay un conjunto. Conviene comprobar que de verdad es uno: los datos derivados —la base de análisis, las tablas de resultados— suelen ser conjuntos aparte, y suelen ser los únicos que se pueden compartir.'
      });
    }

    d.dataset.forEach(function (c) {
      var id = (c.dataset_id && c.dataset_id.identifier) || '?';
      if (!c.title.trim()) {
        avisos.push({ grave: true, seccion: 'conjuntos', conjunto: id, texto: id + ' no tiene nombre.' });
      }
      if (!c.description.trim()) {
        avisos.push({ grave: true, seccion: 'conjuntos', conjunto: id, texto: id + ' no tiene descripción. Sin ella nadie puede juzgar si le sirve.' });
      } else if (VAGAS.test(c.description)) {
        avisos.push({
          grave: false, seccion: 'conjuntos', conjunto: id,
          texto: id + ' usa palabras que no se pueden comprobar («adecuado», «pertinente», «vigente»…). Conviene sustituirlas por lo que hay.'
        });
      }
      if (c.personal_data === 'unknown') {
        avisos.push({
          grave: false, seccion: 'conjuntos', conjunto: id,
          texto: id + ': falta decir si contiene datos de personas. Si hay duda, la respuesta es que sí.'
        });
      }
      if (c.x_identificabilidad === 'no-personal' && !String(c.x_intrinseca || '').trim()) {
        avisos.push({
          grave: false, seccion: 'conjuntos', conjunto: id,
          texto: id + ' se declara no personal. Conviene decir qué se ha comprobado para que no permita reidentificar: una celda con uno o dos casos, en una cohorte pequeña, señala a una persona igual de bien que una fila con su nombre.'
        });
      }
      if (c.personal_data === 'yes' && c.sensitive_data === 'unknown') {
        avisos.push({
          grave: false, seccion: 'conjuntos', conjunto: id,
          texto: id + ' contiene datos personales: falta decir si son de categoría especial. En investigación biomédica casi siempre lo son.'
        });
      }

      /* Las comprobaciones que cruzan apartados son las que de verdad
         valen: cada apartado por separado puede parecer correcto y
         contradecir al de al lado. */
      if (c.personal_data === 'yes' && !c.x_base_legal) {
        avisos.push({
          grave: false, seccion: 'legal', conjunto: id,
          texto: id + ' contiene datos personales y no declara en qué se ampara su tratamiento. No todos los conjuntos se apoyan en la misma base.'
        });
      }
      if (c.x_base_legal === 'consentimiento' && c.x_origen === 'asistencial') {
        avisos.push({
          grave: false, seccion: 'legal', conjunto: id,
          texto: id + ' es de origen asistencial y se ampara en el consentimiento del proyecto. Conviene comprobarlo: un dato recogido antes, para atender al paciente, rara vez queda cubierto por un consentimiento firmado después.'
        });
      }
      if (c.x_destino === 'open' && c.personal_data === 'yes' &&
          c.x_identificabilidad && c.x_identificabilidad !== 'anonimo' && c.x_identificabilidad !== 'no-personal') {
        avisos.push({
          grave: true, seccion: 'comparticion', conjunto: id,
          texto: id + ' se declara abierto y a la vez seudonimizado o identificable. Un conjunto que sigue siendo dato personal no puede publicarse en abierto: o se anonimiza de verdad, o el destino es acceso controlado.'
        });
      }
    });

    if (!String(doc.x_pgd.x_muestras_hay || '')) {
      avisos.push({ grave: false, seccion: 'muestras',
        texto: 'Falta decir si el proyecto maneja muestras biológicas. Responder que no también cierra el apartado.' });
    }
    if (!String(doc.x_pgd.x_comite || '').trim()) {
      avisos.push({ grave: false, seccion: 'legal',
        texto: 'Falta el comité de ética y la referencia de su dictamen, que es lo que permite comprobar que la aprobación existe.' });
    }
    if (!String(doc.x_pgd.x_coste || '').trim()) {
      avisos.push({ grave: false, seccion: 'responsabilidades',
        texto: 'Falta el coste de gestionar los datos. Es elegible dentro de la ayuda si se ha previsto, y no lo es si aparece cuando ya no hay presupuesto.' });
    }
    if (!String(doc.x_pgd.x_custodia_larga || '').trim()) {
      avisos.push({ grave: false, seccion: 'responsabilidades',
        texto: 'Falta quién custodia los datos cuando el proyecto termine. Tiene que ser una unidad que siga existiendo, no una persona.' });
    }

    return avisos;
  }

  /* Estado de una sección, para el punto del índice.
     lleno · parcial · vacio                                          */
  function estadoSeccion(doc, id) {
    var d = doc.dmp;
    function e(hechos, total) {
      if (!hechos) { return 'vacio'; }
      return hechos >= total ? 'lleno' : 'parcial';
    }
    switch (id) {
      case 'portada':
        return e([d.title, doc.x_pgd.institucion, d.contact.name, d.contact.mbox]
          .filter(function (v) { return String(v || '').trim(); }).length, 4);
      case 'resumen':
        return String(d.description || '').trim() ? 'lleno' : 'vacio';
      case 'conjuntos':
        if (!d.dataset.length) { return 'vacio'; }
        return d.dataset.every(function (c) {
          return c.title.trim() && c.description.trim() && c.personal_data !== 'unknown';
        }) ? 'lleno' : 'parcial';
      case 'revision':
        return comprobar(doc).length ? 'parcial' : 'lleno';
      default:
        var tema = TEMAS[id];
        if (!tema) { return 'vacio'; }
        var hechos = 0, total = 0;
        tema.proyecto.forEach(function (f) {
          if (!campoVisible(f, doc.x_pgd)) { return; }
          total++;
          if (String(doc.x_pgd[f.k] || '').trim()) { hechos++; }
        });
        d.dataset.forEach(function (c) {
          tema.conjunto.forEach(function (f) {
            total++;
            if (String(c[f.k] || '').trim()) { hechos++; }
          });
        });
        return e(hechos, total);
    }
  }

  /* --- Serialización -------------------------------------------------- */

  function aJSON(doc) {
    doc.dmp.modified = hoy();
    return JSON.stringify(doc, null, 2);
  }

  /* Tolerante a propósito: acepta un documento de esta aplicación o un
     RDA pelado, y rellena lo que falte con los valores por defecto. */
  function desdeJSON(txt) {
    var leido = JSON.parse(txt);
    var base = documentoNuevo();
    if (!leido || !leido.dmp) { throw new Error('El fichero no contiene un plan de gestión de datos.'); }

    function funde(destino, origen) {
      Object.keys(origen).forEach(function (k) {
        var v = origen[k];
        if (v === null || v === undefined) { return; }
        if (Array.isArray(v)) { destino[k] = v; }
        else if (typeof v === 'object' && typeof destino[k] === 'object' && destino[k] !== null && !Array.isArray(destino[k])) {
          funde(destino[k], v);
        } else { destino[k] = v; }
      });
    }
    funde(base, leido);
    if (!Array.isArray(base.dmp.dataset)) { base.dmp.dataset = []; }
    if (!Array.isArray(base.dmp.project) || !base.dmp.project.length) {
      base.dmp.project = documentoNuevo().dmp.project;
    }
    return base;
  }

  /* --- Versiones -------------------------------------------------------
     Dos números: el primero para los cambios que obligan a avisar a
     alguien, el segundo para los que no.                             */

  function subirVersion(v, mayor) {
    var p = String(v || '1.0').split('.');
    var a = parseInt(p[0], 10) || 1, b = parseInt(p[1], 10) || 0;
    return mayor ? (a + 1) + '.0' : a + '.' + (b + 1);
  }

  function partesVersion(v) {
    var p = String(v || '0.0').split('.');
    return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0];
  }

  /* -1 si a es anterior, 0 si iguales, 1 si a es posterior */
  function compararVersion(a, b) {
    var x = partesVersion(a), y = partesVersion(b);
    if (x[0] !== y[0]) { return x[0] < y[0] ? -1 : 1; }
    if (x[1] !== y[1]) { return x[1] < y[1] ? -1 : 1; }
    return 0;
  }

  function versionValida(v) {
    return /^\d+\.\d+$/.test(String(v || '').trim());
  }

  /* Una huella del contenido, para detectar que el JSON incrustado en
     un PDF cerrado se ha modificado por fuera.

     Conviene ser claro sobre su alcance: esto detecta manipulaciones
     accidentales y descuidos, no a alguien decidido a falsificar un
     documento. Para eso haría falta firma criptográfica, que a su vez
     necesita una autoridad que custodie las claves. Si el sello no
     cuadra, la aplicación avisa; no impide nada. */
  function huella(txt) {
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < txt.length; i++) {
      var c = txt.charCodeAt(i);
      h1 = ((h1 ^ c) >>> 0) * 16777619 >>> 0;
      h2 = ((h2 + c * (i + 1)) >>> 0) * 2654435761 >>> 0;
    }
    return ('00000000' + h1.toString(16)).slice(-8) +
           ('00000000' + h2.toString(16)).slice(-8);
  }

  function contenidoParaSello(doc) {
    var copia = JSON.parse(JSON.stringify(doc));
    delete copia.x_pgd.sello;
    copia.dmp.modified = '';
    return JSON.stringify(copia);
  }

  function sellar(doc) {
    doc.x_pgd.estado = 'cerrada';
    doc.x_pgd.minima = doc.x_pgd.version;
    doc.x_pgd.sello = huella(contenidoParaSello(doc));
    return doc;
  }

  function selloCorrecto(doc) {
    if (!doc.x_pgd.sello) { return null; }          // no venía sellado
    return doc.x_pgd.sello === huella(contenidoParaSello(doc));
  }

  /* ¿Se puede exportar tal como está? Si la versión que hay es una que
     ya se cerró, hay que subirla antes: si no, circularían dos PDF
     distintos con el mismo número. */
  function puedeExportar(doc) {
    var x = doc.x_pgd;
    if (!versionValida(x.version)) {
      return { ok: false, motivo: 'La versión debe tener la forma «1.0»: dos números separados por un punto.' };
    }
    if (x.minima && compararVersion(x.version, x.minima) <= 0) {
      return { ok: false,
        motivo: 'La versión ' + x.minima + ' ya se cerró. Para exportar hay que subir el número: ' +
                'si no, circularían dos documentos distintos con la misma versión.' };
    }
    return { ok: true };
  }

  global.Modelo = {
    documentoNuevo: documentoNuevo,
    conjuntoNuevo: conjuntoNuevo,
    siguienteId: siguienteId,
    comprobar: comprobar,
    estadoSeccion: estadoSeccion,
    nivelHecho: nivelHecho,
    campoVisible: campoVisible,
    aJSON: aJSON,
    desdeJSON: desdeJSON,
    subirVersion: subirVersion,
    compararVersion: compararVersion,
    versionValida: versionValida,
    puedeExportar: puedeExportar,
    sellar: sellar,
    selloCorrecto: selloCorrecto,
    hoy: hoy,
    SECCIONES: SECCIONES,
    TEMAS: TEMAS,
    NIVELES: NIVELES,
    TRES: TRES,
    ORIGEN: ORIGEN,
    IDENTIFICABILIDAD: IDENTIFICABILIDAD,
    DESTINO: DESTINO,
    SI_NO: SI_NO,
    BASE_LEGAL: BASE_LEGAL,
    EIPD: EIPD,
    ESTADO_FINANCIACION: ESTADO_FINANCIACION
  };
})(window);
