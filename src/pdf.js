/* ------------------------------------------------------------------
   Exportar el plan a PDF, e importarlo de vuelta.

   Lo que sostiene todo esto: el PDF que sale es un documento normal,
   legible por cualquiera, y a la vez lleva el modelo dentro. Al
   reimportarlo NO se lee el texto impreso —eso se rompería en cuanto
   alguien cambiase una etiqueta—: se extrae el JSON exacto.

   De ahí se sigue algo que conviene aprovechar: **el formato impreso
   es una decisión de presentación, no del archivo**. El mismo
   documento se puede imprimir de varias maneras y todas se reimportan
   igual. Por eso hay dos:

     · «curso», por decisiones, en el orden de la plantilla del curso.
       Es el que sirve para trabajar y para enseñar.
     · «ec», por los apartados de la plantilla de la Comisión Europea,
       citados por su título y no por su número, porque la Comisión los
       renumera al revisar la plantilla.

   Escribir una vez y volcar, que es la tesis de D8·04, deja de ser una
   afirmación y pasa a ser un botón.

   El modelo va por duplicado dentro del fichero:

     1. Como adjunto del PDF, que es la forma estándar. Quien lo abra en
        Acrobat verá «plan-gestion-datos.json» en el panel de adjuntos.
     2. En base64 en el diccionario de información, entre dos marcas y
        SIN COMPRIMIR. Esa es la copia que se lee al reimportar, y no
        depende de cómo una versión concreta de la biblioteca serialice
        los adjuntos.

   Se usa base64 porque su alfabeto no contiene ninguno de los
   caracteres que el formato PDF trata de forma especial —paréntesis y
   barras invertidas—, así que el texto sobrevive intacto sea cual sea
   el contenido del plan.
   ------------------------------------------------------------------ */
(function (global) {
  'use strict';

  var MARCA_INI = '%%PGD1%%';
  var MARCA_FIN = '%%/PGD1%%';

  function aBase64(txt) {
    var bytes = new TextEncoder().encode(txt), s = '';
    for (var i = 0; i < bytes.length; i++) { s += String.fromCharCode(bytes[i]); }
    return btoa(s);
  }
  function deBase64(b64) {
    var s = atob(b64), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) { bytes[i] = s.charCodeAt(i); }
    return new TextDecoder('utf-8').decode(bytes);
  }

  /* Las fuentes estándar del PDF cubren Latin-1. Es de sobra para
     español, pero conviene sustituir lo que no entra en vez de dejar
     que la exportación falle por una comilla tipográfica. */
  function seguro(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/ /g, ' ')
      .replace(/[^\x20-\x7E¡-ÿ]/g, '');
  }

  function etiqueta(lista, v) {
    for (var i = 0; i < lista.length; i++) {
      if (lista[i].v === v) { return lista[i].v ? lista[i].t : ''; }
    }
    return '';
  }
  function tresT(v) { return v === 'yes' ? 'Sí' : v === 'no' ? 'No' : 'Sin determinar'; }

  /* ================================================================
     El lienzo: primitivas de dibujo compartidas por las dos
     disposiciones. Ninguna sabe nada del plan.
     ================================================================ */
  async function lienzo(pdf, L) {
    var reg = await pdf.embedFont(L.StandardFonts.Helvetica);
    var neg = await pdf.embedFont(L.StandardFonts.HelveticaBold);
    var ita = await pdf.embedFont(L.StandardFonts.HelveticaOblique);

    var A4 = [595.28, 841.89];
    var MX = 62, MY = 62, ANCHO = A4[0] - MX * 2;
    var TINTA = L.rgb(0.08, 0.13, 0.12);
    var SUAVE = L.rgb(0.42, 0.48, 0.47);
    var TENUE = L.rgb(0.62, 0.68, 0.67);
    var ACENTO = L.rgb(0.06, 0.42, 0.39);
    var FALTA = L.rgb(0.62, 0.35, 0.30);

    var pagina, y;

    function partir(texto, fuente, tam, ancho) {
      var lineas = [];
      seguro(texto).split(/\n/).forEach(function (parrafo) {
        var palabras = parrafo.split(/\s+/).filter(Boolean);
        if (!palabras.length) { lineas.push(''); return; }
        var linea = '';
        palabras.forEach(function (p) {
          var prueba = linea ? linea + ' ' + p : p;
          if (fuente.widthOfTextAtSize(prueba, tam) > ancho && linea) {
            lineas.push(linea); linea = p;
          } else { linea = prueba; }
        });
        if (linea) { lineas.push(linea); }
      });
      return lineas;
    }

    var api = {
      ANCHO: ANCHO, MX: MX,
      TINTA: TINTA, SUAVE: SUAVE, TENUE: TENUE, ACENTO: ACENTO, FALTA: FALTA,
      nuevaPagina: function () { pagina = pdf.addPage(A4); y = A4[1] - MY; },
      alto: function (texto, tam, fuente, ancho) {
        return partir(texto, fuente || reg, tam || 10.5, ancho || ANCHO).length * (tam || 10.5) * 1.42;
      },
      sitio: function (necesario) {
        if (y - necesario < MY + 30) { api.nuevaPagina(); }
      },
      escribir: function (texto, o) {
        o = o || {};
        var f = o.negrita ? neg : (o.cursiva ? ita : reg);
        var tam = o.tam || 10.5;
        var color = o.color || TINTA;
        var ancho = o.ancho || ANCHO;
        partir(texto, f, tam, ancho).forEach(function (ln) {
          api.sitio(tam * 1.42);
          pagina.drawText(ln, { x: o.x || MX, y: y - tam, size: tam, font: f, color: color });
          y -= tam * 1.42;
        });
      },
      espacio: function (n) { y -= (n || 8); },
      regla: function () {
        api.sitio(14);
        pagina.drawLine({ start: { x: MX, y: y - 4 }, end: { x: MX + ANCHO, y: y - 4 },
          thickness: 0.75, color: L.rgb(0.85, 0.89, 0.88) });
        y -= 14;
      },
      seccion: function (titulo, sub) {
        api.espacio(16);
        api.sitio(46);
        api.escribir(titulo.toUpperCase(), { negrita: true, tam: 9.5, color: ACENTO });
        if (sub) { api.escribir(sub, { tam: 9, color: TENUE }); }
        api.regla();
      },
      sub: function (titulo) {
        api.espacio(10);
        api.sitio(24);
        api.escribir(titulo, { negrita: true, tam: 11 });
        api.espacio(3);
      },
      campo: function (et, valor, o) {
        o = o || {};
        var v = String(valor == null ? '' : valor).trim();
        if (!v && o.omitirVacio) { return; }
        api.sitio(28);
        api.escribir(et, { negrita: true, tam: 8.5, color: SUAVE });
        api.escribir(v || (o.vacio || '— sin cumplimentar —'),
          { tam: 10.5, color: v ? TINTA : FALTA });
        api.espacio(6);
      },
      parrafo: function (texto, o) {
        o = o || {};
        api.escribir(texto, { tam: o.tam || 10.5, color: o.color || TINTA, cursiva: o.cursiva });
        api.espacio(o.espacio === undefined ? 8 : o.espacio);
      },
      /* Una tabla sencilla de anchos proporcionales. Las columnas
         largas se parten en varias líneas y la fila crece con ellas. */
      tabla: function (cabeceras, filas, pesos) {
        var total = pesos.reduce(function (a, b) { return a + b; }, 0);
        var anchos = pesos.map(function (p) { return (p / total) * ANCHO; });
        function fila(celdas, negrita, colorTexto) {
          var trozos = celdas.map(function (c, i) {
            return partir(c, negrita ? neg : reg, 8.5, anchos[i] - 8);
          });
          var n = Math.max.apply(null, trozos.map(function (t) { return t.length; }));
          api.sitio(n * 8.5 * 1.4 + 8);
          var x = MX;
          trozos.forEach(function (t, i) {
            t.forEach(function (ln, k) {
              pagina.drawText(ln, { x: x + 2, y: y - 8.5 - k * 8.5 * 1.4, size: 8.5,
                font: negrita ? neg : reg, color: colorTexto || (negrita ? TINTA : SUAVE) });
            });
            x += anchos[i];
          });
          y -= n * 8.5 * 1.4 + 6;
          pagina.drawLine({ start: { x: MX, y: y + 2 }, end: { x: MX + ANCHO, y: y + 2 },
            thickness: 0.5, color: L.rgb(0.88, 0.91, 0.90) });
          y -= 4;
        }
        api.espacio(4);
        fila(cabeceras, true);
        filas.forEach(function (f) { fila(f, false); });
        api.espacio(6);
      },
      /* Las preguntas de la plantilla europea, tal como figuran en el
         formulario. Van en inglés a propósito: son la cadena que hay
         que buscar en el documento de la Comisión al volcar. */
      pregunta: function (texto) {
        api.espacio(7);
        api.sitio(26);
        api.escribir(texto, { tam: 8.5, color: TENUE, cursiva: true });
        api.espacio(3);
      },
      nota: function (texto) {
        api.espacio(4);
        api.escribir(texto, { tam: 9, color: TENUE, cursiva: true });
        api.espacio(8);
      },
      pendiente: function (texto) {
        api.sitio(24);
        api.escribir('[ Pendiente ]  ' + texto, { tam: 9.5, color: FALTA, cursiva: true });
        api.espacio(8);
      },
      pie: function (x_pgd, formatoT) {
        var n = pdf.getPageCount();
        pdf.getPages().forEach(function (p, i) {
          p.drawText(seguro('Versión ' + x_pgd.version + ' · ' + (x_pgd.fecha_version || '') +
            '    ·    ' + formatoT + '    ·    página ' + (i + 1) + ' de ' + n),
            { x: MX, y: MY - 26, size: 7.5, font: reg, color: SUAVE });
          p.drawText(seguro('Este PDF lleva incorporado el plan en formato RDA; puede volver a abrirse en el editor.'),
            { x: MX, y: MY - 37, size: 7.5, font: reg, color: TENUE });
        });
      }
    };
    return api;
  }

  /* ================================================================
     Disposición «curso»: por decisiones, en el orden de la plantilla.
     ================================================================ */
  function disposicionCurso(a, doc) {
    var d = doc.dmp, x = doc.x_pgd, M = global.Modelo;

    a.nuevaPagina();
    a.escribir('PLAN DE GESTIÓN DE DATOS', { negrita: true, tam: 9.5, color: a.ACENTO });
    a.espacio(10);
    a.escribir(d.title || 'Sin título', { negrita: true, tam: 21 });
    a.espacio(6);
    a.escribir('Versión ' + x.version + ' · ' + (x.fecha_version || ''), { tam: 11, color: a.SUAVE });
    a.espacio(14);
    a.regla();

    a.seccion('0 · Portada y control del documento');
    a.campo('Título del proyecto', d.project[0].title || d.title);
    a.campo('Código o expediente', d.dmp_id.identifier);
    a.campo('Institución responsable', x.institucion);
    a.campo('Financiación', [d.project[0].funding[0].name,
      d.project[0].funding[0].grant_id.identifier].filter(Boolean).join(' · '));
    a.campo('Estado de la financiación', etiqueta(M.ESTADO_FINANCIACION, d.project[0].funding[0].funding_status));
    a.campo('Persona responsable', [d.contact.name, d.contact.mbox,
      d.contact.contact_id.identifier].filter(Boolean).join(' · '));

    a.seccion('1 · Resumen de la gestión de datos');
    a.parrafo(d.description || '— sin cumplimentar —',
      { color: d.description ? a.TINTA : a.FALTA });

    a.seccion('2 · Conjuntos de datos', d.dataset.length + ' conjuntos');
    if (!d.dataset.length) {
      a.pendiente('El plan no declara ningún conjunto de datos.');
    } else {
      a.tabla(['Id', 'Conjunto', 'Personales', 'Destino'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            tresT(c.personal_data), etiqueta(M.DESTINO, c.x_destino) || 'sin decidir'];
        }), [7, 46, 20, 27]);
    }
    d.dataset.forEach(function (c) { fichaConjunto(a, c, M); });

    seccionTema(a, doc, 'documentacion', '5 · Documentación y metadatos');
    a.seccion('6 · Marco legal y ético');
    a.pendiente('Este apartado todavía no tiene campos en el editor.');
    seccionTema(a, doc, 'almacenamiento', '7 · Almacenamiento, seguridad y acceso');
    seccionTema(a, doc, 'conservacion', '8 · Conservación y disposición final');
    seccionTema(a, doc, 'comparticion', '9 · Compartición y publicación');
    a.seccion('10 · Responsabilidades y recursos');
    a.pendiente('Este apartado todavía no tiene campos en el editor.');
  }

  function fichaConjunto(a, c, M) {
    var id = c.dataset_id.identifier;
    a.espacio(10);
    a.sitio(70);
    a.escribir(id + ' · ' + (c.title || 'sin nombre'), { negrita: true, tam: 12.5 });
    a.espacio(3);
    a.parrafo(c.description || '— sin descripción —', { espacio: 5 });
    a.campo('Clasificación frente al RGPD',
      'Datos personales: ' + tresT(c.personal_data) +
      ' · Categoría especial: ' + tresT(c.sensitive_data));
    a.campo('Origen', etiqueta(M.ORIGEN, c.x_origen), { omitirVacio: true });
    a.campo('Sistema de recogida u origen', c.x_sistema, { omitirVacio: true });
    a.campo('Formato y volumen', [c.x_formato, c.x_volumen].filter(Boolean).join(' · '), { omitirVacio: true });
    a.campo('Nivel de identificabilidad', etiqueta(M.IDENTIFICABILIDAD, c.x_identificabilidad), { omitirVacio: true });
    a.campo('Identificabilidad intrínseca', c.x_intrinseca, { omitirVacio: true });
    a.campo('Seudonimización y custodia de la clave', c.x_seudonimizacion, { omitirVacio: true });
    a.campo('Palabras clave', (c.keyword || []).join(', '), { omitirVacio: true });
    a.campo('Aseguramiento de la calidad', c.data_quality_assurance, { omitirVacio: true });
    a.campo('Utilidad fuera del proyecto', c.x_utilidad, { omitirVacio: true });
    a.campo('Persona responsable', c.x_responsable, { omitirVacio: true });
  }

  function seccionTema(a, doc, tema, titulo) {
    var t = global.Modelo.TEMAS[tema];
    a.seccion(titulo);
    t.proyecto.forEach(function (f) { a.campo(f.et, doc.x_pgd[f.k]); });
    if (!doc.dmp.dataset.length) { return; }
    a.sub('Por conjunto de datos');
    doc.dmp.dataset.forEach(function (c) {
      var algo = t.conjunto.some(function (f) { return String(c[f.k] || '').trim(); });
      a.espacio(6);
      a.sitio(40);
      a.escribir(c.dataset_id.identifier + ' · ' + (c.title || 'sin nombre'),
        { negrita: true, tam: 10.5 });
      a.espacio(2);
      if (!algo) { a.pendiente('Sin decidir para este conjunto.'); return; }
      t.conjunto.forEach(function (f) {
        var v = f.tipo === 'select' ? etiqueta(global.Modelo[f.opciones], c[f.k]) : c[f.k];
        a.campo(f.et, v, { omitirVacio: true });
      });
    });
  }

  /* ================================================================
     Disposición «ec»: los apartados de la plantilla de la Comisión.
     Se citan por su título, nunca por su número: la Comisión los
     renumera al revisar la plantilla y las referencias numéricas
     quedarían desfasadas.
     ================================================================ */
  function disposicionEC(a, doc) {
    var d = doc.dmp, x = doc.x_pgd, M = global.Modelo;
    var hay = d.dataset.length > 0;

    function porConjunto(campos, vacio) {
      if (!hay) { return a.pendiente(vacio || 'No hay conjuntos declarados.'); }
      var algo = false;
      d.dataset.forEach(function (c) {
        var v = campos(c);
        if (!String(v || '').trim()) { return; }
        algo = true;
        a.campo(c.dataset_id.identifier + ' · ' + (c.title || 'sin nombre'), v);
      });
      if (!algo) { a.pendiente(vacio || 'Sin cumplimentar para ningún conjunto.'); }
    }

    a.nuevaPagina();
    a.escribir('DATA MANAGEMENT PLAN', { negrita: true, tam: 9.5, color: a.ACENTO });
    a.espacio(10);
    a.escribir(d.title || 'Sin título', { negrita: true, tam: 21 });
    a.espacio(6);
    a.escribir('Versión ' + x.version + ' · ' + (x.fecha_version || '') +
      ' · ' + (x.estado === 'cerrada' ? 'versión cerrada' : 'borrador'),
      { tam: 11, color: a.SUAVE });
    a.espacio(6);
    a.escribir([d.project[0].funding[0].name, d.dmp_id.identifier, x.institucion]
      .filter(Boolean).join('  ·  '), { tam: 10, color: a.SUAVE });
    a.espacio(14);
    a.regla();
    a.nota('Documento volcado a la estructura de la plantilla de plan de gestión de datos de Horizon Europe. Bajo cada apartado figuran, en inglés y en cursiva, las preguntas tal como aparecen en el formulario de la Comisión, para poder localizarlas al trasladar las respuestas. Los apartados se citan por su título y no por su número: la Comisión los renumera al revisar la plantilla. La plantilla es recomendada, no obligatoria; lo que obliga es el acuerdo de subvención.');

    /* ---------------- Data Summary ---------------- */
    a.seccion('Data Summary', 'Resumen de los datos');

    a.pregunta('What is the purpose of the data generation or re-use and its relation to the objectives of the project?');
    a.campo('Finalidad de los datos', d.description);

    a.pregunta('What types and formats of data will the project generate or re-use?');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Formato', 'Volumen'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre', c.x_formato || '—', c.x_volumen || '—'];
        }), [7, 44, 20, 29]);
    } else { a.pendiente('No hay conjuntos declarados.'); }

    a.pregunta('What is the expected size of the data that you intend to generate or re-use?');
    a.campo('Volumen previsto', hay
      ? d.dataset.map(function (c) {
          return c.dataset_id.identifier + ': ' + (c.x_volumen || 'sin estimar');
        }).join('. ')
      : '');

    a.pregunta('What is the origin / provenance of the data, either generated or re-used?');
    porConjunto(function (c) {
      return [etiqueta(M.ORIGEN, c.x_origen), c.x_sistema].filter(Boolean).join('. ');
    });

    a.pregunta('Will you re-use any existing data and what will you re-use it for? State the reasons if re-use of any existing data has been considered but discarded.');
    var reut = d.dataset.filter(function (c) {
      return ['reutilizado', 'cedido', 'asistencial'].indexOf(c.x_origen) >= 0;
    });
    if (!reut.length) {
      a.parrafo('El proyecto no reutiliza datos preexistentes: los conjuntos se recogen de nuevo o se derivan de los recogidos.');
    } else {
      reut.forEach(function (c) {
        a.campo(c.dataset_id.identifier + ' · ' + (c.title || ''),
          etiqueta(M.ORIGEN, c.x_origen) + (c.x_sistema ? '. Procedencia: ' + c.x_sistema + '.' : '') +
          (c.description ? ' ' + c.description : ''));
      });
    }

    a.pregunta("To whom might your data be useful ('data utility'), outside your project?");
    porConjunto(function (c) { return c.x_utilidad; });

    /* ---------------- FAIR data ---------------- */
    a.seccion('FAIR data');

    a.sub('Making data findable, including provisions for metadata');
    a.pregunta('Will data be identified by a persistent identifier?');
    a.parrafo('El identificador permanente lo asigna el repositorio en el momento del depósito. El repositorio previsto de cada conjunto figura bajo «Making data accessible».');
    a.pregunta('Will rich metadata be provided to allow discovery? What metadata will be created? What disciplinary or general standards will be followed?');
    a.campo('Esquema de metadatos previsto', x.x_esquema);
    a.pregunta('Will search keywords be provided in the metadata to optimize the possibility for discovery and then potential re-use?');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Términos de búsqueda'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            (c.keyword || []).join(', ') || 'sin palabras clave'];
        }), [7, 36, 57]);
    } else { a.pendiente('No hay conjuntos declarados.'); }

    a.sub('Making data accessible');
    a.pregunta('Will all data be made openly available? If certain datasets cannot be shared, explain why, clearly separating legal and contractual reasons from intentional restrictions.');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Acceso', 'Repositorio'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            etiqueta(M.DESTINO, c.x_destino) || 'sin decidir', c.x_repositorio || '—'];
        }), [7, 34, 26, 33]);
      var cerrados = d.dataset.filter(function (c) { return c.x_destino && c.x_destino !== 'open'; });
      if (cerrados.length) {
        cerrados.forEach(function (c) {
          a.campo('Motivo de la restricción · ' + c.dataset_id.identifier, c.x_justificacion);
        });
      }
    } else { a.pendiente('No hay conjuntos declarados.'); }

    a.pregunta('Will the data be deposited in a trusted repository? Does the repository ensure that the data is assigned an identifier?');
    porConjunto(function (c) { return c.x_repositorio; });

    a.pregunta('If there are restrictions on use, how will access be provided to the data, both during and after the end of the project? How will the identity of the person accessing the data be ascertained? Is there a need for a data access committee?');
    a.campo('Procedimiento de acceso controlado', x.x_procedimiento);

    a.pregunta('If an embargo is applied to give time to publish or seek protection of the intellectual property, specify why and how long this will apply.');
    a.pendiente('El editor todavía no recoge el embargo.');

    a.pregunta('How long will the data remain available and findable? Will metadata be guaranteed to remain available after data is no longer available?');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Plazo', 'Lo fija'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            c.x_plazo || 'sin decidir', c.x_plazo_norma || '—'];
        }), [7, 33, 28, 32]);
    } else { a.pendiente('No hay conjuntos declarados.'); }

    a.sub('Making data interoperable');
    a.pregunta('What data and metadata vocabularies, standards, formats or methodologies will you follow to make your data interoperable to allow data exchange and re-use within and across disciplines?');
    porConjunto(function (c) {
      return [c.x_formato, c.x_vocabularios].filter(Boolean).join('. ');
    });

    a.sub('Increase data re-use');
    a.pregunta('How will you provide documentation needed to validate data analysis and facilitate data re-use (readme files, codebooks, data cleaning, variable definitions, units of measurement)?');
    porConjunto(function (c) { return c.x_diccionario; });
    a.pregunta('Will your data be licensed using standard reuse licenses, in line with the obligations set out in the Grant Agreement?');
    porConjunto(function (c) { return c.x_licencia; }, 'Sin licencia decidida para ningún conjunto.');
    a.pregunta('Describe all relevant data quality assurance processes.');
    porConjunto(function (c) { return c.data_quality_assurance; });
    a.pregunta('Will the provenance of the data be thoroughly documented using the appropriate standards?');
    a.campo('Convención de nombres y versiones', x.x_nombrado);

    /* ---------------- Other research outputs ---------------- */
    a.seccion('Other research outputs', 'Otros resultados de investigación');
    a.pregunta('Beneficiaries should consider which of the questions pertaining to FAIR data above can apply to the management of other research outputs, digital (software, workflows, protocols, models) or physical (materials, antibodies, reagents, samples).');
    a.pendiente('El editor todavía no recoge software, protocolos, modelos ni muestras biológicas.');

    /* ---------------- Allocation of resources ---------------- */
    a.seccion('Allocation of resources', 'Asignación de recursos');
    a.pregunta('What will the costs be for making data or other research outputs FAIR in your project? How will these be covered?');
    a.pendiente('El editor todavía no recoge costes ni partidas.');
    a.pregunta('Who will be responsible for data management in your project?');
    a.campo('Responsable del plan', [d.contact.name, d.contact.mbox].filter(Boolean).join(' · '));
    porConjunto(function (c) { return c.x_responsable; }, 'Sin responsable nombrado por conjunto.');
    a.pregunta('How will long term preservation be ensured? What data will be kept and for how long?');
    a.campo('Bloqueo', x.x_bloqueo);
    a.campo('Disposición final', x.x_borrado);

    /* ---------------- Data security ---------------- */
    a.seccion('Data security', 'Seguridad de los datos');
    a.pregunta('What provisions are or will be in place for data security, including data recovery as well as secure storage / archiving and transfer of sensitive data?');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Dónde reside', 'Administra'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            c.x_emplazamiento || 'sin decidir', c.x_administra || '—'];
        }), [7, 32, 35, 26]);
    } else { a.pendiente('No hay conjuntos declarados.'); }
    porConjunto(function (c) { return c.x_respaldo; }, 'Sin respaldo declarado.');
    a.campo('Transferencia de datos fuera de su sistema', x.x_transferencia);
    a.campo('Medios que no se utilizarán', x.x_no_usar);

    /* ---------------- Ethics ---------------- */
    a.seccion('Ethics', 'Ética y cuestiones legales');
    a.pregunta('Are there, or could there be, any ethics or legal issues that can have an impact on data sharing?');
    if (hay) {
      a.tabla(['Id', 'Conjunto', 'Personales', 'Cat. especial', 'Identificabilidad'],
        d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre',
            tresT(c.personal_data), tresT(c.sensitive_data),
            etiqueta(M.IDENTIFICABILIDAD, c.x_identificabilidad) || '—'];
        }), [7, 26, 16, 17, 34]);
      porConjunto(function (c) { return c.x_seudonimizacion; }, 'Sin declarar la custodia de la clave.');
    } else { a.pendiente('No hay conjuntos declarados.'); }
    a.pregunta('Will informed consent for data sharing and long term preservation be included in questionnaires dealing with personal data?');
    a.pendiente('El editor todavía no recoge el apartado de marco legal y consentimiento.');

    /* ---------------- Other issues ---------------- */
    a.seccion('Other issues', 'Otras cuestiones');
    a.pregunta('Do you, or will you, make use of other national / funder / sectorial / departmental procedures for data management? If yes, which ones?');
    a.campo('Procedimientos aplicables', x.institucion
      ? 'Los que establezca la política de gestión de datos de ' + x.institucion + '.'
      : '');
  }

  var DISPOSICIONES = {
    curso: { fn: disposicionCurso, nombre: 'Formato del curso' },
    ec: { fn: disposicionEC, nombre: 'Formato de la Comisión Europea' }
  };

  /* ================================================================ */

  async function exportar(doc, opciones) {
    opciones = opciones || {};
    var clave = DISPOSICIONES[opciones.formato] ? opciones.formato : 'curso';
    var L = global.PDFLib;
    var pdf = await L.PDFDocument.create();
    var a = await lienzo(pdf, L);

    DISPOSICIONES[clave].fn(a, doc);
    a.pie(doc.x_pgd, DISPOSICIONES[clave].nombre);

    var json = global.Modelo.aJSON(doc);
    await pdf.attach(new TextEncoder().encode(json), 'plan-gestion-datos.json', {
      mimeType: 'application/json',
      description: 'El plan en formato RDA DMP Common Standard. Reimportable en el editor.',
      creationDate: new Date(), modificationDate: new Date()
    });
    var info = pdf.context.lookup(pdf.context.trailerInfo.Info);
    info.set(L.PDFName.of('PGDPlan'), L.PDFString.of(MARCA_INI + aBase64(json) + MARCA_FIN));

    pdf.setTitle(seguro(doc.dmp.title || 'Plan de gestión de datos'));
    pdf.setSubject(seguro('Plan de gestión de datos · versión ' + doc.x_pgd.version +
      ' · ' + DISPOSICIONES[clave].nombre));
    pdf.setCreator('Editor de planes de gestión de datos');
    pdf.setProducer('Editor de planes de gestión de datos');
    pdf.setKeywords(['plan de gestión de datos', 'RDA DMP Common Standard']);

    return await pdf.save({ useObjectStreams: false });
  }

  /* Lee el JSON de vuelta desde los bytes del PDF. Se decodifica como
     latin-1 a propósito: así cada byte es un carácter y las posiciones
     de las marcas no se desplazan. */
  function importar(buffer) {
    var texto = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    var i = texto.indexOf(MARCA_INI);
    var j = texto.indexOf(MARCA_FIN, i + 1);
    if (i === -1 || j === -1) {
      throw new Error('Este PDF no lleva dentro ningún plan. Solo se pueden reabrir los PDF que haya generado este editor.');
    }
    var b64 = texto.slice(i + MARCA_INI.length, j).replace(/\s+/g, '');
    return global.Modelo.desdeJSON(deBase64(b64));
  }

  global.PDF = {
    exportar: exportar,
    importar: importar,
    DISPOSICIONES: DISPOSICIONES,
    MARCA_INI: MARCA_INI,
    MARCA_FIN: MARCA_FIN
  };
})(window);
