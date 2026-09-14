/* ------------------------------------------------------------------
   Exportar el plan a PDF e importarlo de vuelta.

   El PDF es un documento normal y a la vez lleva el modelo dentro. Al
   reimportarlo no se lee el texto impreso: se extrae el JSON.

   Se imprime por los apartados de la plantilla de plan de gestión de
   datos de Horizon Europe, citados por su título y no por su número,
   porque la Comisión los renumera al revisar la plantilla.

   El modelo va por duplicado dentro del fichero:

     1. Como adjunto del PDF, que es la forma estándar. Quien lo abra en
        un lector con panel de adjuntos verá «plan-gestion-datos.json».
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
     El lienzo: las primitivas de dibujo, que no saben nada del plan.
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
    /* Fondo oscuro y letra blanca en lo que es estructura: títulos de
       apartado, cabeceras de tabla y cabecera de cada caja. */
    var BANDA = L.rgb(0.12, 0.21, 0.20);
    var BLANCO = L.rgb(1, 1, 1);

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
        api.espacio(18);
        api.sitio(58);
        var alto = 19;
        pagina.drawRectangle({ x: MX - 6, y: y - alto + 4, width: ANCHO + 12, height: alto,
          color: BANDA });
        pagina.drawText(seguro(titulo.toUpperCase()),
          { x: MX, y: y - alto + 10, size: 9.5, font: neg, color: BLANCO });
        y -= alto + 6;
        if (sub) { api.escribir(sub, { tam: 9, color: TENUE }); }
        api.espacio(4);
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
        if (et) { api.escribir(et, { negrita: true, tam: 8.5, color: SUAVE }); }
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
          if (negrita) {
            pagina.drawRectangle({ x: MX - 4, y: y - n * 8.5 * 1.4 - 2,
              width: ANCHO + 8, height: n * 8.5 * 1.4 + 6, color: BANDA });
          }
          var x = MX;
          trozos.forEach(function (t, i) {
            t.forEach(function (ln, k) {
              pagina.drawText(ln, { x: x + 2, y: y - 8.5 - k * 8.5 * 1.4, size: 8.5,
                font: negrita ? neg : reg, color: colorTexto || (negrita ? BLANCO : SUAVE) });
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
      /* El diagrama de tablas, con la disposición que calcula el
         modelo. Aquí solo se traduce a coordenadas de página: la y del
         modelo crece hacia abajo y la del PDF hacia arriba. */
      diagrama: function (esq) {
        if (!esq.nodos.length) { return; }
        var escala = Math.min(1, ANCHO / esq.ancho);
        var alto = esq.alto * escala;
        api.espacio(6);
        api.sitio(alto + 16);
        var cima = y;
        function PX(vx) { return MX + vx * escala; }
        function PY(vy) { return cima - vy * escala; }
        function tam(n) { return Math.max(5.2, n * escala); }

        esq.aristas.forEach(function (ar) {
          pagina.drawLine({ start: { x: PX(ar.x1), y: PY(ar.y1) },
            end: { x: PX(ar.x2), y: PY(ar.y2) }, thickness: 0.8, color: TENUE });
          var dx = ar.x2 > ar.x1 ? -1 : 1;
          [-2.6, 2.6].forEach(function (d) {
            pagina.drawLine({ start: { x: PX(ar.x2), y: PY(ar.y2) },
              end: { x: PX(ar.x2) + dx * 6 * escala, y: PY(ar.y2) + d * escala },
              thickness: 0.8, color: TENUE });
          });
          if (ar.texto) {
            var et = seguro(ar.texto), t6 = tam(6.5);
            pagina.drawText(et, {
              x: PX((ar.x1 + ar.x2) / 2) - reg.widthOfTextAtSize(et, t6) / 2,
              y: PY((ar.y1 + ar.y2) / 2) + 2.5, size: t6, font: reg, color: SUAVE });
          }
        });

        esq.nodos.forEach(function (n) {
          /* cuerpo, banda de cabecera y marco, en ese orden */
          pagina.drawRectangle({ x: PX(n.x), y: PY(n.y + n.h),
            width: n.w * escala, height: n.h * escala, color: L.rgb(1, 1, 1) });
          pagina.drawRectangle({ x: PX(n.x), y: PY(n.y + 19),
            width: n.w * escala, height: 19 * escala, color: BANDA });
          pagina.drawRectangle({ x: PX(n.x), y: PY(n.y + n.h),
            width: n.w * escala, height: n.h * escala,
            borderWidth: 0.7, borderColor: TENUE });

          var t65 = tam(6.5), t75 = tam(7.5);
          pagina.drawText(seguro(n.cod), { x: PX(n.x + 9), y: PY(n.y + 13),
            size: t65, font: neg, color: L.rgb(0.78, 0.85, 0.83) });
          pagina.drawText(seguro(n.nombre).slice(0, 20),
            { x: PX(n.x + 9) + reg.widthOfTextAtSize(seguro(n.cod), t65) + 5,
              y: PY(n.y + 13), size: t75, font: neg, color: BLANCO });
          n.granoLineas.forEach(function (ln, k) {
            pagina.drawText(seguro(ln), { x: PX(n.x + 9), y: PY(n.y + 32 + k * 10),
              size: t65, font: reg, color: n.grano ? TINTA : FALTA });
          });
          pagina.drawText(seguro(n.columnas ? n.columnas + ' columnas' : 'sin columnas'),
            { x: PX(n.x + 9), y: PY(n.y + 52), size: tam(6), font: reg, color: SUAVE });
        });

        y = cima - alto - 12;
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
     Disposición «ec»: los apartados de la plantilla de la Comisión.
     Se citan por su título, nunca por su número: la Comisión los
     renumera al revisar la plantilla y las referencias numéricas
     quedarían desfasadas.
     ================================================================ */
  /* Qué responde el plan a cada indicación del formulario europeo. La
     clave es el identificador que genera `preguntas-ec.js` leyendo el
     DOCX oficial. Una indicación sin respuesta sale marcada. */
  function nombreTabla(doc, id) {
    var e = global.Modelo.tablasDelPlan(doc).filter(function (x) { return x.tabla.id === id; })[0];
    return e ? e.cod + ' · ' + (e.tabla.nombre || e.tabla.id) : id;
  }

  /* La estructura de los conjuntos tabulares: el diagrama y, debajo,
     la definición de cada tabla. Solo aparece si se ha descrito. */
  function estructuraEC(a, doc) {
    var esq = global.Modelo.esquema(doc);
    if (!esq.nodos.length) { return; }
    a.sub('Estructura de los conjuntos tabulares');
    a.diagrama(esq);
    global.Modelo.tablasDelPlan(doc).forEach(function (e) {
      var t = e.tabla;
      var frase = 'Una fila es ' + (String(t.grano || '').trim() || '— sin declarar —');
      if (String(t.clave || '').trim()) { frase += '. Identificada por ' + t.clave; }
      if (t.enlace && t.enlace.con) {
        frase += '. Se une con ' + nombreTabla(doc, t.enlace.con) +
          (t.enlace.por ? ' por ' + t.enlace.por : '');
      }
      a.campo(e.cod + ' · ' + (t.nombre || t.id), frase + '.');
      if ((t.columnas || []).length) {
        a.tabla(['Columna', 'Tipo', 'Qué contiene'], t.columnas.map(function (c) {
          return [c.n || '—', etiqueta(global.Modelo.TIPOS, c.tipo) || '—', c.d || ''];
        }), [30, 16, 54]);
      }
    });
  }

  function respuestasEC(a, doc) {
    var d = doc.dmp, x = doc.x_pgd, M = global.Modelo;
    var hay = d.dataset.length > 0;

    /* Un campo de cada conjunto, uno debajo de otro. */
    function porConjunto(campo, vacio) {
      return function () {
        if (!hay) { return a.campo('', '', { vacio: 'El plan no declara ningún conjunto de datos.' }); }
        var algo = false;
        d.dataset.forEach(function (c) {
          var v = typeof campo === 'function' ? campo(c) : c[campo];
          if (!String(v || '').trim()) { return; }
          algo = true;
          a.campo(c.dataset_id.identifier + ' · ' + (c.title || 'sin nombre'), v);
        });
        if (!algo) { a.campo('', '', { vacio: vacio || '— sin cumplimentar para ningún conjunto —' }); }
      };
    }
    /* Los conjuntos en una tabla: es la forma en que las diferencias
       entre ellos quedan a la vista, que es de lo que trata el plan. */
    function tablaDe(cabeceras, cols, pesos) {
      return function () {
        if (!hay) { return a.campo('', '', { vacio: 'El plan no declara ningún conjunto de datos.' }); }
        a.tabla(cabeceras, d.dataset.map(function (c) {
          return [c.dataset_id.identifier, c.title || 'sin nombre'].concat(
            cols.map(function (f) { return f(c) || '—'; }));
        }), pesos);
      };
    }
    function texto(valor, vacio) {
      return function () { a.campo('', valor, { vacio: vacio }); };
    }
    function campos(lista) {
      return function () {
        lista.forEach(function (par) { a.campo(par[0], par[1], { vacio: par[2] }); });
      };
    }
    function fijo(txt) { return function () { a.parrafo(txt); }; }
    var muestrasHay = x.x_muestras_hay === 'si';

    return {
      /* --- Data Summary ------------------------------------------------
         El orden es el del formulario de la Comisión, que empieza por la
         reutilización y no por los formatos. */
      ds1: function () {
        var r = d.dataset.filter(function (c) {
          return ['reutilizado', 'cedido', 'asistencial'].indexOf(c.x_origen) >= 0;
        });
        if (!hay) { return a.campo('', '', { vacio: 'El plan no declara ningún conjunto de datos.' }); }
        if (!r.length) {
          return a.parrafo('El proyecto no reutiliza datos preexistentes: todos los conjuntos se recogen de nuevo o se derivan de los recogidos.');
        }
        r.forEach(function (c) {
          a.campo(c.dataset_id.identifier + ' · ' + (c.title || 'sin nombre'),
            etiqueta(M.ORIGEN, c.x_origen) +
            (c.x_sistema ? '. Procedencia: ' + c.x_sistema + '.' : '.') +
            (c.description ? ' ' + c.description : ''));
        });
      },
      ds2: tablaDe(['Id', 'Conjunto', 'Formato'], [function (c) { return c.x_formato; }], [8, 62, 30]),
      ds3: texto(d.description),
      ds4: tablaDe(['Id', 'Conjunto', 'Volumen'], [function (c) { return c.x_volumen; }], [8, 48, 44]),
      ds5: porConjunto(function (c) {
        return [etiqueta(M.ORIGEN, c.x_origen), c.x_sistema].filter(Boolean).join('. ');
      }),
      ds6: porConjunto('x_utilidad'),

      /* --- Making data findable --------------------------------------- */
      f1: fijo('Sí. El identificador permanente lo asigna el repositorio en el momento del depósito; el repositorio previsto de cada conjunto figura bajo «Making data accessible».'),
      f2: texto(x.x_esquema),
      f3: tablaDe(['Id', 'Conjunto', 'Términos de búsqueda'],
        [function (c) { return (c.keyword || []).join(', '); }], [8, 34, 58]),
      f4: fijo('Sí. Los metadatos quedan en el catálogo del repositorio elegido, que los expone para su recolección e indización por terceros.'),

      /* --- Making data accessible ------------------------------------- */
      ac1: porConjunto('x_repositorio', '— sin repositorio decidido para ningún conjunto —'),
      ac2: texto(x.x_gestiones),
      ac3: function () {
        a.parrafo('Sí: el repositorio asigna a cada depósito un identificador permanente y lo resuelve al objeto digital. Los repositorios previstos son:');
        porConjunto('x_repositorio', '— sin repositorio decidido para ningún conjunto —')();
      },
      ac4: function () {
        if (!hay) { return a.campo('', '', { vacio: 'El plan no declara ningún conjunto de datos.' }); }
        a.tabla(['Id', 'Conjunto', 'Acceso'],
          d.dataset.map(function (c) {
            return [c.dataset_id.identifier, c.title || 'sin nombre',
              etiqueta(M.DESTINO, c.x_destino) || 'sin decidir'];
          }), [8, 55, 37]);
        var alguna = false;
        d.dataset.forEach(function (c) {
          if (c.x_destino && c.x_destino !== 'open' && String(c.x_justificacion || '').trim()) {
            alguna = true;
            a.campo('Motivo de la restricción · ' + c.dataset_id.identifier, c.x_justificacion);
          }
        });
        if (!alguna) {
          var restringidos = d.dataset.filter(function (c) {
            return c.x_destino && c.x_destino !== 'open';
          });
          if (restringidos.length) {
            a.campo('', '', { vacio: '— falta el motivo de la restricción, y es lo que el formulario pide separar entre razones legales y decisión propia —' });
          }
        }
      },
      ac5: texto(x.x_embargo, '— no se declara embargo alguno —'),
      ac6: fijo('Sí. Los conjuntos abiertos quedan accesibles por el protocolo normalizado del repositorio, libre y gratuito. Los de acceso controlado se obtienen por el procedimiento de solicitud descrito a continuación, sin que ello altere el protocolo de acceso a los metadatos, que es el mismo y abierto.'),
      ac7: texto(x.x_procedimiento),
      ac8: texto(x.x_procedimiento),
      ac9: texto(x.x_procedimiento),
      ac10: fijo('Sí. Los metadatos se publican bajo la dedicación al dominio público CC0, conforme al acuerdo de subvención, e incluyen la información necesaria para localizar los datos y solicitar el acceso cuando este sea controlado.'),
      ac11: function () {
        tablaDe(['Id', 'Conjunto', 'Plazo', 'Lo fija'],
          [function (c) { return c.x_plazo; }, function (c) { return c.x_plazo_norma; }], [8, 30, 29, 33])();
        a.campo('Custodia una vez terminado el proyecto', x.x_custodia_larga);
        a.parrafo('El registro con los metadatos permanece en el catálogo del repositorio aunque los ficheros dejen de estar disponibles.');
      },
      ac12: texto(x.x_software_lectura),

      /* --- Making data interoperable ---------------------------------- */
      io1: porConjunto(function (c) {
        return [c.x_formato, c.x_vocabularios].filter(Boolean).join('. ');
      }),
      io2: texto(x.x_ontologias, '— no se generan vocabularios propios —'),
      io3: function () {
        a.campo('', x.x_referencias);
        var enlaces = M.tablasDelPlan(doc).filter(function (e) {
          return e.tabla.enlace && e.tabla.enlace.con;
        });
        if (enlaces.length) {
          a.tabla(['Tabla', 'Se une con', 'Por'], enlaces.map(function (e) {
            return [e.cod + ' · ' + (e.tabla.nombre || e.tabla.id),
              nombreTabla(doc, e.tabla.enlace.con), e.tabla.enlace.por || '—'];
          }), [34, 42, 24]);
        }
      },

      /* --- Increase data re-use --------------------------------------- */
      ru1: function () {
        porConjunto('x_diccionario')();
        estructuraEC(a, doc);
      },
      ru2: porConjunto('x_licencia', '— sin licencia decidida para ningún conjunto —'),
      ru3: porConjunto('x_utilidad'),
      ru4: texto(x.x_nombrado),
      ru5: porConjunto('data_quality_assurance'),
      ru6: fijo('Los resultados distintos de los datos figuran bajo «Other research outputs»; la asignación de recursos, bajo «Allocation of resources»; la seguridad, bajo «Data security»; y las cuestiones éticas y legales, bajo «Ethics».'),

      /* --- Other research outputs ------------------------------------- */
      or1: campos([
        ['Software y código de análisis', x.x_software],
        ['Protocolos y procedimientos', x.x_protocolos],
        ['Materiales y otros resultados físicos', x.x_materiales],
        ['Muestras biológicas', muestrasHay
          ? [x.x_muestras_tipos, x.x_muestras_lugar].filter(Boolean).join(' ')
          : (x.x_muestras_hay === 'no' ? 'El proyecto no maneja muestras biológicas.' : ''),
          '— falta declarar si el proyecto maneja muestras biológicas —']
      ]),
      or2: campos([
        ['Dónde se depositarán', x.x_otros_deposito],
        ['Con qué licencia', x.x_otros_licencia],
        ['Destino de las muestras al terminar', muestrasHay ? x.x_muestras_destino : 'No procede.']
      ]),

      /* --- Allocation of resources ------------------------------------ */
      re1: texto(x.x_coste),
      re2: texto(x.x_cobertura),
      re3: function () {
        a.campo('Responsable del plan', [d.contact.name, d.contact.mbox].filter(Boolean).join(' · '));
        a.campo('Reparto de tareas', x.x_reparto);
        a.campo('Si alguien deja el proyecto', x.x_relevo);
        porConjunto('x_responsable', '— sin responsable nombrado por conjunto —')();
      },
      re4: function () {
        a.campo('Quién custodia los datos cuando el proyecto termina', x.x_custodia_larga);
        tablaDe(['Id', 'Conjunto', 'Plazo', 'Lo fija'],
          [function (c) { return c.x_plazo; }, function (c) { return c.x_plazo_norma; }], [8, 30, 29, 33])();
        a.campo('Coste previsto y con qué se cubre',
          [x.x_coste, x.x_cobertura].filter(Boolean).join(' '));
        a.campo('Bloqueo y disposición final',
          [x.x_bloqueo, x.x_borrado].filter(Boolean).join(' '));
      },

      /* --- Data security ---------------------------------------------- */
      se1: function () {
        tablaDe(['Id', 'Conjunto', 'Dónde reside', 'Administra'],
          [function (c) { return c.x_emplazamiento; }, function (c) { return c.x_administra; }],
          [8, 28, 35, 29])();
        porConjunto('x_respaldo', '— sin copias de seguridad declaradas —')();
        a.campo('Transferencia fuera de su sistema', x.x_transferencia);
        a.campo('Medios que no se utilizarán', x.x_no_usar);
      },
      se2: porConjunto('x_repositorio', '— sin repositorio decidido para ningún conjunto —'),

      /* --- Ethics ------------------------------------------------------ */
      et1: function () {
        a.campo('Comité de ética y referencia del dictamen', x.x_comite);
        if (hay) {
          a.tabla(['Id', 'Conjunto', 'Personales', 'Cat. especial', 'Base legal'],
            d.dataset.map(function (c) {
              return [c.dataset_id.identifier, c.title || 'sin nombre',
                tresT(c.personal_data), tresT(c.sensitive_data),
                etiqueta(M.BASE_LEGAL, c.x_base_legal) || '—'];
            }), [8, 22, 15, 16, 39]);
          a.tabla(['Id', 'Conjunto', 'Identificabilidad'],
            d.dataset.map(function (c) {
              return [c.dataset_id.identifier, c.title || 'sin nombre',
                etiqueta(M.IDENTIFICABILIDAD, c.x_identificabilidad) || '—'];
            }), [8, 42, 50]);
          porConjunto('x_seudonimizacion', '— sin declarar la custodia de la clave —')();
        }
        a.campo('Evaluación de impacto en protección de datos', etiqueta(M.EIPD, x.x_eipd));
        a.campo('Cesiones a terceros y encargados de tratamiento', x.x_cesiones);
        a.campo('Transferencias fuera del Espacio Económico Europeo', x.x_transferencias);
      },
      et2: function () {
        a.campo('Qué cubre el consentimiento y qué no', x.x_consentimiento);
        porConjunto('x_alcance', '— sin declarar el alcance del permiso por conjunto —')();
      },

      /* --- Other issues ------------------------------------------------ */
      oi1: texto(x.institucion
        ? 'Se siguen los procedimientos de gestión de datos de ' + x.institucion +
          (String(x.x_esquema || '').trim() ? ', y el esquema de metadatos indicado bajo «Making data findable».' : '.')
        : '', '— falta la institución responsable, que es de quien dependen esos procedimientos —')
    };
  }

  function disposicionEC(a, doc) {
    var d = doc.dmp, x = doc.x_pgd;
    var bloques = global.PREGUNTAS_EC || [];
    var resp = respuestasEC(a, doc);

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
    a.nota('Documento volcado a la plantilla de plan de gestión de datos de Horizon Europe. En cursiva y en inglés figuran las indicaciones tal como aparecen en el formulario de la Comisión, tomadas de su documento original, para poder localizarlas al trasladar las respuestas. Los apartados se citan por su título y no por su número: la Comisión los renumera al revisar la plantilla, que además es recomendada y no obligatoria.');

    var seccionPuesta = null;
    bloques.forEach(function (b) {
      if (b.seccion !== seccionPuesta && !b.sub) { a.seccion(b.seccion); seccionPuesta = b.seccion; }
      else if (b.sub) {
        if (b.seccion !== seccionPuesta) { a.seccion(b.seccion); seccionPuesta = b.seccion; }
        a.sub(b.sub);
      }
      b.preguntas.forEach(function (q) {
        a.pregunta(q.t);
        var f = resp[q.id];
        if (f) { f(); }
        else { a.pendiente('Esta indicación del formulario no tiene respuesta en el editor.'); }
      });
    });
  }

  var DISPOSICIONES = {
    ec: { fn: disposicionEC, nombre: 'Formato de la Comisión Europea' }
  };

  /* ================================================================ */

  async function exportar(doc, opciones) {
    opciones = opciones || {};
    var clave = DISPOSICIONES[opciones.formato] ? opciones.formato : 'ec';
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
