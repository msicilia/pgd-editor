/* ------------------------------------------------------------------
   Exportar el plan a PDF, e importarlo de vuelta.

   La idea que sostiene todo esto: el PDF que sale es un documento
   normal, legible por cualquiera, y a la vez lleva el modelo dentro.
   Al reimportarlo NO se lee el texto impreso —eso se rompería en
   cuanto alguien cambie una etiqueta—: se extrae el JSON exacto.

   Va por duplicado a propósito:

     1. Como fichero adjunto del PDF, que es la forma estándar. Quien
        abra el documento en Acrobat verá «plan-gestion-datos.json» en
        el panel de adjuntos y podrá sacarlo sin esta aplicación.
     2. En base64 dentro del diccionario de información del documento,
        entre dos marcas. Esta segunda copia va SIN COMPRIMIR, de modo
        que reimportar es buscar dos marcas en los bytes del fichero y
        no depende de cómo una versión concreta de la biblioteca
        serialice los adjuntos.

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

  function etiquetaTres(v) {
    return v === 'yes' ? 'Sí' : v === 'no' ? 'No' : 'Sin determinar';
  }

  async function exportar(doc) {
    var L = global.PDFLib;
    var pdf = await L.PDFDocument.create();
    var reg = await pdf.embedFont(L.StandardFonts.Helvetica);
    var neg = await pdf.embedFont(L.StandardFonts.HelveticaBold);

    var A4 = [595.28, 841.89];
    var MX = 64, MY = 64, ANCHO = A4[0] - MX * 2;
    var TINTA = L.rgb(0.08, 0.13, 0.12);
    var SUAVE = L.rgb(0.42, 0.48, 0.47);
    var ACENTO = L.rgb(0.06, 0.42, 0.39);

    var pagina, y;
    function nuevaPagina() {
      pagina = pdf.addPage(A4);
      y = A4[1] - MY;
    }
    function sitio(alto) {
      if (y - alto < MY + 28) { nuevaPagina(); }
    }
    function escribir(texto, o) {
      o = o || {};
      var f = o.negrita ? neg : reg;
      var tam = o.tam || 10.5;
      var color = o.color || TINTA;
      var lineas = partir(texto, f, tam, o.ancho || ANCHO);
      var alto = tam * 1.42;
      lineas.forEach(function (ln) {
        sitio(alto);
        pagina.drawText(ln, { x: o.x || MX, y: y - tam, size: tam, font: f, color: color });
        y -= alto;
      });
    }
    function espacio(n) { y -= (n || 8); }
    function regla() {
      sitio(14);
      pagina.drawLine({
        start: { x: MX, y: y - 4 }, end: { x: MX + ANCHO, y: y - 4 },
        thickness: 0.75, color: L.rgb(0.85, 0.89, 0.88)
      });
      y -= 14;
    }
    function seccion(t) {
      espacio(14); sitio(30);
      escribir(t.toUpperCase(), { negrita: true, tam: 9.5, color: ACENTO });
      regla();
    }
    function campo(et, val) {
      var v = String(val || '').trim();
      sitio(26);
      escribir(et, { negrita: true, tam: 8.5, color: SUAVE });
      escribir(v || '— sin cumplimentar —', { tam: 10.5, color: v ? TINTA : L.rgb(0.7, 0.4, 0.35) });
      espacio(6);
    }

    var d = doc.dmp, x = doc.x_pgd;

    /* --- Portada ---------------------------------------------------- */
    nuevaPagina();
    escribir('PLAN DE GESTIÓN DE DATOS', { negrita: true, tam: 9.5, color: ACENTO });
    espacio(10);
    escribir(d.title || 'Sin título', { negrita: true, tam: 21 });
    espacio(6);
    escribir('Versión ' + x.version + ' · ' + (x.fecha_version || ''), { tam: 11, color: SUAVE });
    espacio(16);
    regla();

    seccion('Identificación');
    campo('Título del proyecto', d.project[0].title || d.title);
    campo('Código o expediente', d.dmp_id.identifier);
    campo('Institución responsable', x.institucion);
    campo('Financiación', [d.project[0].funding[0].name,
      d.project[0].funding[0].grant_id.identifier].filter(Boolean).join(' · '));
    campo('Estado de la financiación', estadoTexto(d.project[0].funding[0].funding_status));

    seccion('Persona responsable');
    campo('Nombre', d.contact.name);
    campo('Correo electrónico', d.contact.mbox);
    campo('ORCID', d.contact.contact_id.identifier);

    if (String(d.description || '').trim()) {
      seccion('Resumen');
      escribir(d.description, { tam: 10.5 });
      espacio(6);
    }

    /* --- Conjuntos de datos ---------------------------------------- */
    seccion('Conjuntos de datos (' + d.dataset.length + ')');
    if (!d.dataset.length) {
      escribir('El plan no declara ningún conjunto de datos.', { tam: 10.5, color: L.rgb(0.7, 0.4, 0.35) });
    }
    d.dataset.forEach(function (c, i) {
      var id = (c.dataset_id && c.dataset_id.identifier) || ('CD' + (i + 1));

      /* Se mide el bloque entero antes de empezar a escribirlo: un
         conjunto partido por la mitad se lee mal, y el hueco que deja
         al final de la página es preferible. */
      var alto = 0;
      alto += partir(id + ' · ' + (c.title || 'sin nombre'), neg, 12, ANCHO).length * 12 * 1.42;
      alto += partir(c.description || '— sin descripción —', reg, 10.5, ANCHO).length * 10.5 * 1.42;
      alto += 9 * 1.42 + 19;

      espacio(8);
      sitio(alto);
      escribir(id + ' · ' + (c.title || 'sin nombre'), { negrita: true, tam: 12 });
      espacio(2);
      escribir(c.description || '— sin descripción —', {
        tam: 10.5, color: c.description ? TINTA : L.rgb(0.7, 0.4, 0.35)
      });
      espacio(3);
      escribir('Datos de personas: ' + etiquetaTres(c.personal_data) +
        '    ·    Categoría especial: ' + etiquetaTres(c.sensitive_data),
        { tam: 9, color: SUAVE });
      espacio(6);
    });

    /* --- Pie ------------------------------------------------------- */
    var n = pdf.getPageCount();
    pdf.getPages().forEach(function (p, i) {
      p.drawText('Versión ' + x.version + ' · ' + (x.fecha_version || '') +
        '    ·    página ' + (i + 1) + ' de ' + n,
        { x: MX, y: MY - 26, size: 7.5, font: reg, color: SUAVE });
      p.drawText('Este PDF lleva incorporado el plan en formato RDA; puede volver a abrirse en el editor.',
        { x: MX, y: MY - 38, size: 7.5, font: reg, color: L.rgb(0.62, 0.68, 0.67) });
    });

    /* --- El modelo, dentro --------------------------------------- */
    var json = global.Modelo.aJSON(doc);

    /* 1 · adjunto estándar, para quien abra el PDF fuera del editor */
    await pdf.attach(new TextEncoder().encode(json), 'plan-gestion-datos.json', {
      mimeType: 'application/json',
      description: 'El plan en formato RDA DMP Common Standard. Reimportable en el editor.',
      creationDate: new Date(),
      modificationDate: new Date()
    });

    /* 2 · copia sin comprimir, que es la que se lee al reimportar */
    var info = pdf.context.lookup(pdf.context.trailerInfo.Info);
    info.set(L.PDFName.of('PGDPlan'),
      L.PDFString.of(MARCA_INI + aBase64(json) + MARCA_FIN));

    pdf.setTitle(seguro(d.title || 'Plan de gestión de datos'));
    pdf.setSubject('Plan de gestión de datos · versión ' + x.version);
    pdf.setCreator('Editor de planes de gestión de datos');
    pdf.setProducer('Editor de planes de gestión de datos');
    pdf.setKeywords(['plan de gestión de datos', 'RDA DMP Common Standard']);

    /* Sin compresión, para que la marca quede legible en los bytes y la
       reimportación no dependa de cómo se serialicen los adjuntos. */
    return await pdf.save({ useObjectStreams: false });
  }

  function estadoTexto(v) {
    var m = { planned: 'Previsto, aún no solicitado', applied: 'Solicitado, pendiente de resolución',
      granted: 'Concedido', rejected: 'Denegado' };
    return m[v] || 'Sin financiación externa';
  }

  /* Lee el JSON de vuelta desde los bytes del PDF. Se decodifica como
     latin-1 a propósito: así cada byte es un carácter y las posiciones
     de las marcas no se desplazan. */
  function importar(buffer) {
    var texto = new TextDecoder('latin1').decode(new Uint8Array(buffer));
    var i = texto.indexOf(MARCA_INI);
    var j = texto.indexOf(MARCA_FIN, i + 1);
    if (i === -1 || j === -1) {
      throw new Error(
        'Este PDF no lleva dentro ningún plan. Solo se pueden reabrir los PDF que haya generado este editor.'
      );
    }
    var b64 = texto.slice(i + MARCA_INI.length, j).replace(/\s+/g, '');
    return global.Modelo.desdeJSON(deBase64(b64));
  }

  global.PDF = { exportar: exportar, importar: importar, MARCA_INI: MARCA_INI, MARCA_FIN: MARCA_FIN };
})(window);
