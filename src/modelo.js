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
    { id: 1, titulo: 'Lo esencial',
      pista: 'Con esto el conjunto ya existe y se puede nombrar en el resto del documento.',
      campos: ['title', 'description', 'personal_data', 'sensitive_data'] },
    { id: 2, titulo: 'De dónde sale y qué forma tiene',
      pista: 'El origen determina casi todo lo demás: un dato preexistente arrastra su propio circuito de autorizaciones.',
      campos: ['x_origen', 'x_sistema', 'x_formato', 'x_volumen'] },
    { id: 3, titulo: 'Identificabilidad',
      pista: 'El campo que más discusión genera dentro de un equipo, y el que más veces se rellena mal. Conviene mirarlo de frente una vez.',
      campos: ['x_identificabilidad', 'x_intrinseca', 'x_seudonimizacion'] },
    { id: 4, titulo: 'Para quién sirve',
      pista: 'La ficha describe qué es el conjunto. Qué se hace con él —dónde vive, cuánto dura, con quién se comparte— se decide en los apartados 7, 8 y 9, porque allí se ven los conjuntos juntos y las diferencias saltan a la vista.',
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

  /* --- Los apartados que se deciden conjunto por conjunto -------------
     Cada uno tiene campos de proyecto y campos de conjunto. La tabla
     resumen de arriba existe para que las diferencias entre conjuntos
     se vean juntas: es lo que hace imposible decidir en bloque sin
     darse cuenta.                                                     */
  var TEMAS = {
    documentacion: {
      proyecto: [
        { k: 'x_nombrado', req: 'recomendado', et: 'Convención de nombres y versiones de fichero', tipo: 'textarea',
          ayuda: 'Cualquier convención explícita es mejor que «datos_final_v2_revisado_BUENO.csv». Una que funciona: proyecto_conjunto_versión_fecha, con la fecha en año-mes-día para que ordene sola.' },
        { k: 'x_esquema', req: 'recomendado', et: 'Esquema de metadatos del depósito', tipo: 'text',
          ayuda: 'Lo impone en gran medida el repositorio. Basta con decir cuál se prevé.' }
      ],
      conjunto: [
        { k: 'x_diccionario', req: 'recomendado', et: 'Diccionario de variables', tipo: 'textarea',
          ayuda: 'Dónde vive, quién lo mantiene y desde cuándo existe. No hay que pegarlo aquí.' },
        { k: 'x_vocabularios', req: 'recomendado', et: 'Estándares y vocabularios', tipo: 'textarea',
          ayuda: 'Con qué se codifica cada variable clave, y en qué versión. Lo normal es que se herede del sistema de origen: el trabajo no es escoger, es no perderlo y declarar cuál es.' }
      ],
      columnas: [{ k: 'x_diccionario', et: 'Diccionario' }]
    },
    almacenamiento: {
      proyecto: [
        { k: 'x_no_usar', req: 'recomendado', et: 'Qué no se usará', tipo: 'textarea',
          ayuda: 'Nube personal, correo electrónico, dispositivos sin cifrar, herramientas en línea no autorizadas, asistentes de inteligencia artificial de uso general. Conviene decir al lado qué se usa en su lugar: prohibir sin ofrecer salida garantiza que la regla se incumpla.' },
        { k: 'x_transferencia', req: 'recomendado', et: 'Cómo viajan los datos cuando salen de su sistema', tipo: 'textarea',
          ayuda: 'Qué canal, quién lo autoriza y con qué protección.' }
      ],
      conjunto: [
        { k: 'x_emplazamiento', req: 'obligatorio', et: 'Dónde reside', tipo: 'text',
          ayuda: 'El nombre del sistema concreto. «Servidores institucionales» no se puede comprobar.' },
        { k: 'x_administra', req: 'recomendado', et: 'Quién lo administra', tipo: 'text' },
        { k: 'x_respaldo', req: 'recomendado', et: 'Copias de seguridad', tipo: 'textarea',
          ayuda: 'Qué está cubierto y qué no, con qué frecuencia, cuánta retención, y si alguien ha probado a restaurar. Se pregunta, no se supone: es la afirmación que más veces resulta falsa al comprobarla.' }
      ],
      columnas: [{ k: 'x_emplazamiento', et: 'Sistema' }, { k: 'x_administra', et: 'Administra' }]
    },
    conservacion: {
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
      proyecto: [
        { k: 'x_procedimiento', req: 'recomendado', et: 'Procedimiento de acceso controlado', tipo: 'textarea',
          ayuda: 'Quién autoriza las solicitudes, con qué criterios publicados y bajo qué acuerdo. Y qué pasa cuando el proyecto termine: un procedimiento que depende de una persona caduca con ella.' },
        { k: 'x_disponibilidad', req: 'recomendado', et: 'Declaración de disponibilidad prevista', tipo: 'textarea',
          ayuda: 'El párrafo que pedirá la revista. Dejarlo redactado evita improvisarlo el día del envío, que es cuando aparece la fórmula de «disponible bajo petición al autor».' }
      ],
      conjunto: [
        { k: 'x_destino', req: 'obligatorio', et: 'Destino', tipo: 'select', opciones: 'DESTINO',
          ayuda: 'Se decide por conjunto. Decidir en bloque lleva a no publicar ni siquiera lo que no tenía ningún problema.' },
        { k: 'x_justificacion', req: 'obligatorio', et: 'Justificación, si no es abierto', tipo: 'textarea',
          ayuda: 'De dónde viene la restricción: el RGPD, el consentimiento o un tercero. «Por motivos de confidencialidad» no identifica ninguno de los tres.' },
        { k: 'x_repositorio', req: 'recomendado', et: 'Repositorio previsto', tipo: 'text',
          ayuda: 'Cuál, y por qué ese. Hay que comprobar antes que admita el volumen, el acceso restringido y el coste.' },
        { k: 'x_licencia', req: 'recomendado', et: 'Licencia', tipo: 'text',
          ayuda: 'En acceso controlado la licencia no es lo que gobierna: gobierna el acuerdo de uso que firma quien solicita.' }
      ],
      columnas: [{ k: 'x_destino', et: 'Destino', opciones: 'DESTINO' }, { k: 'x_repositorio', et: 'Repositorio' }]
    }
  };

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

     El orden es el de la plantilla del curso, que va por decisiones y
     no por letras FAIR. La estructura de la Comisión Europea se
     obtiene al exportar, no al editar: así se escribe una vez y se
     vuelca en el formulario que toque.                               */
  var SECCIONES = [
    { grupo: 'Identificación', items: [
      { id: 'portada', n: '0', titulo: 'Portada y control del documento', ud: 'D9·01' },
      { id: 'resumen', n: '1', titulo: 'Resumen de la gestión de datos', ud: 'D9·02' }
    ]},
    { grupo: 'Qué datos hay', items: [
      { id: 'conjuntos', n: '2', titulo: 'Conjuntos de datos', hijos: true, ud: 'D9·03' },
      { id: 'muestras', n: '3', titulo: 'Muestras biológicas', pendiente: 'D9·04',
        adelanto: 'Solo si el proyecto maneja muestras. Qué muestras, con qué consentimiento, quién custodia el vínculo con el dato y cuál es su destino final.' },
      { id: 'otros', n: '4', titulo: 'Otros resultados', pendiente: 'D9·05',
        adelanto: 'Software, código de análisis, protocolos y modelos. Se pueden publicar en abierto sin restricción legal, y son la vía más accesible a la ciencia abierta para un proyecto con datos restringidos.' }
    ]},
    { grupo: 'Cómo se entienden', items: [
      { id: 'documentacion', n: '5', titulo: 'Documentación y metadatos', tema: 'documentacion', ud: 'D10' }
    ]},
    { grupo: 'Qué lo ampara', items: [
      { id: 'legal', n: '6', titulo: 'Marco legal y ético', pendiente: 'D11',
        adelanto: 'Base legal de cada tratamiento, qué cubre el consentimiento y qué no, identificabilidad y custodia de la clave, cesiones y encargados.' }
    ]},
    { grupo: 'Dónde viven', items: [
      { id: 'almacenamiento', n: '7', titulo: 'Almacenamiento, seguridad y acceso', tema: 'almacenamiento', ud: 'D12·01 a D12·04' },
      { id: 'conservacion', n: '8', titulo: 'Conservación y disposición final', tema: 'conservacion', ud: 'D12·05 y D12·06' }
    ]},
    { grupo: 'Con quién', items: [
      { id: 'comparticion', n: '9', titulo: 'Compartición y publicación', tema: 'comparticion', ud: 'D13' }
    ]},
    { grupo: 'Quién responde', items: [
      { id: 'responsabilidades', n: '10', titulo: 'Responsabilidades y recursos', pendiente: 'D14',
        adelanto: 'Reparto de tareas con nombres de personas, coste y partidas, y qué ocurre si alguien deja el proyecto.' }
    ]},
    { grupo: null, items: [
      { id: 'revision', titulo: 'Revisión y exportación' }
    ]}
  ];

  /* --- Comprobaciones -------------------------------------------------
     Son las de la lista del curso que se pueden automatizar con lo que
     hay en esta maqueta. Cada aviso dice a qué sección pertenece, para
     poder mostrarlo donde se arregla y no en una lista suelta.        */

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
    });

    return avisos;
  }

  /* Estado de una sección, para el punto del índice.
     lleno · parcial · vacio · pendiente (aún sin campos en la maqueta) */
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
        if (!tema) { return 'pendiente'; }
        var hechos = 0, total = 0;
        tema.proyecto.forEach(function (f) {
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

  /* Al exportar se sube la versión: el número menor si no ha cambiado
     ninguna decisión, y eso lo decide quien exporta. Aquí solo se
     ofrece el siguiente de cada tipo. */
  function subirVersion(v, mayor) {
    var p = String(v || '1.0').split('.');
    var a = parseInt(p[0], 10) || 1, b = parseInt(p[1], 10) || 0;
    return mayor ? (a + 1) + '.0' : a + '.' + (b + 1);
  }

  global.Modelo = {
    documentoNuevo: documentoNuevo,
    conjuntoNuevo: conjuntoNuevo,
    siguienteId: siguienteId,
    comprobar: comprobar,
    estadoSeccion: estadoSeccion,
    nivelHecho: nivelHecho,
    aJSON: aJSON,
    desdeJSON: desdeJSON,
    subirVersion: subirVersion,
    hoy: hoy,
    SECCIONES: SECCIONES,
    TEMAS: TEMAS,
    NIVELES: NIVELES,
    TRES: TRES,
    ORIGEN: ORIGEN,
    IDENTIFICABILIDAD: IDENTIFICABILIDAD,
    DESTINO: DESTINO,
    ESTADO_FINANCIACION: ESTADO_FINANCIACION
  };
})(window);
