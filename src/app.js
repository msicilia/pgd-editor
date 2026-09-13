/* ------------------------------------------------------------------
   La aplicación.

   Decisiones de uso que conviene no deshacer sin motivo:

   · Índice a la izquierda, una sección a la vez a la derecha. Siempre
     abierto, sin plegar: nada queda escondido tras un triángulo.
   · El orden es el de las decisiones, no el de las letras FAIR. La
     estructura de la Comisión se obtiene al exportar.
   · No hay botón de guardar. Se guarda solo. El botón que sí existe
     es «exportar», porque exportar sí es una decisión de una persona.
   · La ficha de un conjunto se abre por niveles. Pedir los catorce
     campos de golpe es la forma más segura de que no se rellene
     ninguno.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var CLAVE = 'pgd-editor:borrador';
  var ABIERTOS = 'pgd-editor:niveles';

  var doc = null;
  var vista = { seccion: 'portada', conjunto: null };
  var niveles = { 1: true, 2: false, 3: false, 4: false };
  var temporizador = null;

  var $ = function (s) { return document.querySelector(s); };
  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) { n.className = clase; }
    if (texto !== undefined && texto !== null) { n.textContent = texto; }
    return n;
  }

  /* --- acceso por ruta ---------------------------------------------- */
  function leer(obj, ruta) {
    return ruta.split('.').reduce(function (o, k) {
      return (o === null || o === undefined) ? undefined : o[k];
    }, obj);
  }
  function escribir(obj, ruta, valor) {
    var p = ruta.split('.'), ult = p.pop();
    var destino = p.reduce(function (o, k) {
      if (o[k] === null || o[k] === undefined) { o[k] = /^\d+$/.test(k) ? [] : {}; }
      return o[k];
    }, obj);
    destino[ult] = valor;
  }

  /* --- persistencia --------------------------------------------------
     Red de seguridad frente a un cierre accidental, no el formato de
     archivo: el formato de archivo es el PDF. De ahí los try/catch.  */
  function guardarBorrador() {
    try {
      localStorage.setItem(CLAVE, Modelo.aJSON(doc));
      localStorage.setItem(ABIERTOS, JSON.stringify(niveles));
    } catch (e) { /* sin red de seguridad */ }
    marcarEstado('Guardado', true);
  }
  function recuperarBorrador() {
    try {
      var n = localStorage.getItem(ABIERTOS);
      if (n) { niveles = JSON.parse(n); }
      var t = localStorage.getItem(CLAVE);
      return t ? Modelo.desdeJSON(t) : null;
    } catch (e) { return null; }
  }

  var estadoTimer = null;
  function marcarEstado(txt, ok) {
    var e = $('#estado');
    e.textContent = txt;
    e.className = 'estado' + (ok ? ' guardado' : '');
    clearTimeout(estadoTimer);
    estadoTimer = setTimeout(function () { e.textContent = ''; }, 2000);
  }

  /* Cambio en los datos: guarda, y repinta el índice porque los puntos
     de estado dependen de lo que se acaba de escribir. */
  function cambiado(repintarPanel) {
    clearTimeout(temporizador);
    temporizador = setTimeout(guardarBorrador, 500);
    $('#etiqueta-version').textContent = 'v' + (doc.x_pgd.version || '1.0');
    $('#titulo-barra').textContent = doc.dmp.title || 'Plan de gestión de datos';
    pintarIndice();
    if (repintarPanel) { pintarPanel(); }
  }

  function irA(seccion, conjunto) {
    vista = { seccion: seccion, conjunto: conjunto || null };
    pintarIndice();
    pintarPanel();
    $('#panel').scrollTop = 0;
    $('#panel').focus({ preventScroll: true });
    document.body.classList.remove('indice-visible');
  }

  /* ================= ÍNDICE ========================================= */

  var PUNTOS = { lleno: '●', parcial: '◐', vacio: '○', pendiente: '·' };
  var PUNTOS_T = { lleno: 'completo', parcial: 'a medias', vacio: 'vacío', pendiente: 'todavía sin campos' };

  function pintarIndice() {
    var nav = $('#indice');
    nav.innerHTML = '';

    Modelo.SECCIONES.forEach(function (g) {
      if (g.grupo) { nav.appendChild(el('div', 'grupo', g.grupo)); }
      g.items.forEach(function (it) {
        var estado = Modelo.estadoSeccion(doc, it.id);
        var b = el('button', 'item' + (it.pendiente ? ' futuro' : ''));
        b.type = 'button';
        if (vista.seccion === it.id && !vista.conjunto) { b.setAttribute('aria-current', 'true'); }

        var p = el('span', 'punto ' + estado, PUNTOS[estado]);
        p.title = PUNTOS_T[estado];
        b.appendChild(p);

        var t = el('span', 'rot');
        if (it.n) { t.appendChild(el('span', 'num', it.n)); }
        t.appendChild(document.createTextNode(it.titulo));
        b.appendChild(t);

        if (it.id === 'conjuntos' && doc.dmp.dataset.length) {
          b.appendChild(el('span', 'cuenta', String(doc.dmp.dataset.length)));
        }
        if (it.id === 'revision') {
          var n = Modelo.comprobar(doc).length;
          if (n) { b.appendChild(el('span', 'cuenta alerta', String(n))); }
        }

        b.addEventListener('click', function () { irA(it.id, null); });
        nav.appendChild(b);

        /* los conjuntos cuelgan de su apartado, siempre a la vista */
        if (it.hijos) {
          doc.dmp.dataset.forEach(function (c) {
            var id = c.dataset_id.identifier;
            var h = el('button', 'hijo');
            h.type = 'button';
            if (vista.conjunto === id) { h.setAttribute('aria-current', 'true'); }
            h.appendChild(el('span', 'cod', id));
            h.appendChild(el('span', 'rot', c.title || 'sin nombre'));
            h.addEventListener('click', function () { irA('conjuntos', id); });
            nav.appendChild(h);
          });
          var mas = el('button', 'hijo anadir', '+  añadir un conjunto');
          mas.type = 'button';
          mas.addEventListener('click', anadirConjunto);
          nav.appendChild(mas);
        }
      });
    });
  }

  function anadirConjunto() {
    var c = Modelo.conjuntoNuevo(doc);
    doc.dmp.dataset.push(c);
    niveles[1] = true;
    irA('conjuntos', c.dataset_id.identifier);
    cambiado();
    var primero = $('#panel input, #panel textarea');
    if (primero) { primero.focus(); }
  }

  /* ================= PANEL ========================================== */

  function pintarPanel() {
    var p = $('#panel');
    p.innerHTML = '';

    if (vista.conjunto) { return panelConjunto(p); }

    var it = null;
    Modelo.SECCIONES.forEach(function (g) {
      g.items.forEach(function (x) { if (x.id === vista.seccion) { it = x; } });
    });
    if (!it) { return; }

    p.appendChild(cabecera(it.n, it.titulo, false, it.ud));

    if (it.pendiente) { return panelPendiente(p, it); }
    if (it.tema) { return panelTema(p, it); }
    if (it.id === 'portada') { return panelPortada(p); }
    if (it.id === 'resumen') { return panelResumen(p); }
    if (it.id === 'conjuntos') { return panelConjuntos(p); }
    if (it.id === 'revision') { return panelRevision(p); }
  }

  /* --- apartados que se deciden conjunto por conjunto ------------------
     Mismo patrón para los cuatro: lo de proyecto arriba, una tabla que
     pone las decisiones de todos los conjuntos juntas, y debajo un
     bloque plegable por conjunto para rellenarlas.                     */
  var temaAbierto = {};

  function panelTema(p, it) {
    var t = Modelo.TEMAS[it.tema];

    p.appendChild(pista(PISTA_TEMA[it.tema]));

    if (t.proyecto.length) {
      var g = el('section', 'grupo-campos');
      g.appendChild(el('h3', null, 'De proyecto'));
      t.proyecto.forEach(function (f) {
        g.appendChild(campoTema(f, doc.x_pgd, function () { cambiado(); }));
      });
      p.appendChild(g);
    }

    var g2 = el('section', 'grupo-campos');
    g2.appendChild(el('h3', null, 'Por conjunto de datos'));

    if (!doc.dmp.dataset.length) {
      var v = el('div', 'vacio');
      v.appendChild(el('p', null, 'Esto se decide conjunto por conjunto, y todavía no hay ninguno.'));
      var ir = el('button', null, 'Ir a Conjuntos de datos');
      ir.type = 'button';
      ir.addEventListener('click', function () { irA('conjuntos', null); });
      v.appendChild(ir);
      g2.appendChild(v);
      p.appendChild(g2);
      return;
    }

    g2.appendChild(tablaResumen(t));

    doc.dmp.dataset.forEach(function (c) {
      g2.appendChild(bloqueConjunto(c, t, it.tema));
    });
    p.appendChild(g2);

    var a = bloqueAvisos(avisosDe(it.id));
    if (a) { p.appendChild(a); }
  }

  var PISTA_TEMA = {
    documentacion: 'El apartado 5 responde a una sola pregunta: ¿alguien que no estuvo en el proyecto podrá entender estos datos? La convención de nombres es del proyecto entero; el diccionario y los vocabularios, de cada conjunto.',
    almacenamiento: 'Un proyecto ordinario tiene datos en tres sitios a la vez: el sistema de captura, el espacio de trabajo y el entorno de análisis. Escribir que «residen en la plataforma institucional» cuando además hay dos copias más es incompleto, y lo que queda fuera suele ser lo peor protegido.',
    conservacion: 'No hay un plazo, hay varios: sobre los mismos datos concurren obligaciones de origen distinto. Y cuando varias normas fijan plazos distintos rige el más largo, porque cumplir el corto no exime del otro.',
    comparticion: 'Tres destinos posibles, y no son una escala de mejor a peor. Un proyecto casi nunca tiene un destino único: suponerlo lleva a aplicar a todo el régimen del conjunto más sensible, y a no publicar ni siquiera lo que no tenía ningún problema.'
  };

  function valorCorto(c, col) {
    var v = c[col.k];
    if (col.opciones) {
      var lista = Modelo[col.opciones];
      for (var i = 0; i < lista.length; i++) {
        if (lista[i].v === v) { return lista[i].v ? lista[i].t : ''; }
      }
      return '';
    }
    v = String(v || '').trim().replace(/\s+/g, ' ');
    return v.length > 54 ? v.slice(0, 52) + '…' : v;
  }

  function tablaResumen(t) {
    var caja = el('div', 'tabla-resumen');
    var tb = el('table');
    var thead = el('thead');
    var tr = el('tr');
    tr.appendChild(el('th', null, ''));
    tr.appendChild(el('th', null, 'Conjunto'));
    t.columnas.forEach(function (col) { tr.appendChild(el('th', null, col.et)); });
    thead.appendChild(tr);
    tb.appendChild(thead);

    var tbody = el('tbody');
    doc.dmp.dataset.forEach(function (c) {
      var f = el('tr');
      f.appendChild(el('td', 'cod-celda', c.dataset_id.identifier));
      f.appendChild(el('td', null, c.title || 'sin nombre'));
      t.columnas.forEach(function (col) {
        var v = valorCorto(c, col);
        f.appendChild(el('td', v ? '' : 'falta', v || 'sin decidir'));
      });
      f.addEventListener('click', function () {
        temaAbierto[c.dataset_id.identifier] = true;
        pintarPanel();
        var d = document.getElementById('bloque-' + c.dataset_id.identifier);
        if (d) { d.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      });
      tbody.appendChild(f);
    });
    tb.appendChild(tbody);
    caja.appendChild(tb);
    return caja;
  }

  function bloqueConjunto(c, t, tema) {
    var id = c.dataset_id.identifier;
    var abierto = !!temaAbierto[id];
    var hechos = t.conjunto.filter(function (f) { return String(c[f.k] || '').trim(); }).length;

    var caja = el('section', 'nivel' + (abierto ? ' abierto' : ''));
    caja.id = 'bloque-' + id;

    var cab = el('button', 'nivel-cab');
    cab.type = 'button';
    cab.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    cab.appendChild(el('span', 'flecha', abierto ? '▾' : '▸'));
    cab.appendChild(el('span', 'cod', id));
    cab.appendChild(el('span', 'nivel-t', c.title || 'sin nombre'));
    cab.appendChild(el('span', 'nivel-estado' + (hechos === t.conjunto.length ? ' completo' : ''),
      hechos + ' de ' + t.conjunto.length));
    cab.addEventListener('click', function () {
      temaAbierto[id] = !abierto;
      pintarPanel();
    });
    caja.appendChild(cab);

    if (!abierto) { return caja; }

    var cuerpo = el('div', 'nivel-cuerpo');
    t.conjunto.forEach(function (f) {
      /* la justificación solo tiene sentido si el conjunto no es abierto */
      if (tema === 'comparticion' && f.k === 'x_justificacion' &&
          (c.x_destino === 'open' || !c.x_destino)) { return; }
      cuerpo.appendChild(campoTema(f, c, function () { cambiado(true); }));
    });

    if (tema === 'comparticion' && c.x_destino === 'closed') {
      cuerpo.appendChild(destacado('Por cada «no se comparte», una pregunta',
        '¿Es este conjunto el que no se puede compartir, o hay una versión de él que sí? Casi siempre la hay: una versión agregada, un subconjunto sin las variables que identifican, o el registro con los metadatos públicos y los ficheros bajo solicitud.'));
    }

    caja.appendChild(cuerpo);
    return caja;
  }

  /* Un campo declarado en TEMAS, sobre el objeto que sea. */
  function campoTema(f, obj, alCambiar) {
    if (f.tipo === 'select') {
      return selectLibre(f.et, obj[f.k], Modelo[f.opciones], f.ayuda, function (v) {
        obj[f.k] = v; alCambiar();
      });
    }
    return campoLibre(f.et, f.tipo, obj[f.k], f.ayuda, function (v) {
      obj[f.k] = v; alCambiar();
    });
  }

  function cabecera(n, titulo, vuelta, ud) {
    var c = el('header', 'cab');
    if (vuelta) {
      var v = el('button', 'volver', '←  Conjuntos de datos');
      v.type = 'button';
      v.addEventListener('click', function () { irA('conjuntos', null); });
      c.appendChild(v);
    }
    var h = el('h2');
    if (n) { h.appendChild(el('span', 'num', n)); }
    h.appendChild(document.createTextNode(titulo));
    c.appendChild(h);
    if (ud) {
      var r = el('p', 'ud');
      r.appendChild(document.createTextNode('Se trata en '));
      r.appendChild(el('strong', null, ud));
      r.appendChild(document.createTextNode(' del curso.'));
      c.appendChild(r);
    }
    return c;
  }

  function avisosDe(seccion, conjunto) {
    return Modelo.comprobar(doc).filter(function (a) {
      if (a.seccion !== seccion) { return false; }
      if (conjunto) { return a.conjunto === conjunto; }
      return true;
    });
  }

  function bloqueAvisos(lista, titulo) {
    if (!lista.length) { return null; }
    var d = el('div', 'avisos-bloque');
    d.appendChild(el('h3', null, titulo || 'Qué falta en este apartado'));
    var ul = el('ul', 'avisos');
    lista.forEach(function (a) {
      var li = el('li', a.grave ? 'grave' : 'leve', a.texto);
      ul.appendChild(li);
    });
    d.appendChild(ul);
    return d;
  }

  /* --- apartados sin campos todavía --------------------------------- */
  function panelPendiente(p, it) {
    var d = el('div', 'pendiente-caja');
    d.appendChild(el('p', 'et', 'Todavía sin campos en esta maqueta'));
    d.appendChild(el('p', null, it.adelanto));
    var pie = el('p', 'ref');
    pie.appendChild(document.createTextNode('Se trata en la unidad didáctica '));
    pie.appendChild(el('strong', null, it.pendiente));
    pie.appendChild(document.createTextNode(' del curso.'));
    d.appendChild(pie);
    p.appendChild(d);
  }

  /* --- 0 · portada --------------------------------------------------- */
  function panelPortada(p) {
    p.appendChild(pista('Lo que permite saber, dentro de diez años, de qué proyecto es este documento y a quién preguntar.'));

    p.appendChild(grupoCampos('El proyecto', [
      campoTexto('Título del proyecto', 'dmp.title', 'Tal como figura en la resolución, si ya está concedido', true),
      dos(
        campoTexto('Código o expediente', 'dmp.dmp_id.identifier', 'Se deja vacío si aún no existe'),
        campoTexto('Institución responsable', 'x_pgd.institucion', 'Quien responde de los datos')
      ),
      dos(
        campoTexto('Financiador', 'dmp.project.0.funding.0.name', 'Vacío si no hay financiación externa'),
        campoSelect('Estado de la financiación', 'dmp.project.0.funding.0.funding_status', Modelo.ESTADO_FINANCIACION)
      )
    ]));

    p.appendChild(grupoCampos('Persona responsable', [
      pista('Un nombre, no un servicio ni «el equipo investigador». Es a quien se dirigirá quien tenga una pregunta sobre estos datos dentro de diez años.'),
      dos(
        campoTexto('Nombre y apellidos', 'dmp.contact.name'),
        campoTexto('Correo electrónico', 'dmp.contact.mbox')
      ),
      campoTexto('ORCID', 'dmp.contact.contact_id.identifier', '0000-0000-0000-0000',
        false, 'Opcional. Es lo que permite que el conjunto de datos cuente en el currículo de quien lo produjo.')
    ]));

    p.appendChild(grupoCampos('Control del documento', [
      pista('El plan se escribe antes de empezar, cuando muchas cosas son estimaciones, y se corrige cuando la realidad las desmiente. Sin versión no se puede saber cuál estaba vigente cuando ocurrió algo.'),
      dos(
        campoTexto('Versión', 'x_pgd.version'),
        campoFecha('Fecha', 'x_pgd.fecha_version')
      )
    ]));

    var a = bloqueAvisos(avisosDe('portada'));
    if (a) { p.appendChild(a); }
  }

  /* --- 1 · resumen ---------------------------------------------------- */
  function panelResumen(p) {
    p.appendChild(pista('Media página: qué datos hay, dónde vivirán, quién responde de ellos y qué se hará con ellos al terminar. Es el párrafo que un evaluador lee entero mientras hojea el resto.'));
    p.appendChild(destacado('Se escribe el último', 'Cuando el resto del documento ya está decidido. Escribirlo primero produce resúmenes que prometen cosas que los apartados siguientes acaban desmintiendo.'));
    p.appendChild(campoArea('Resumen de la gestión de datos', 'dmp.description',
      'Si este párrafo se puede pegar en otro proyecto sin cambiar nada, todavía no describe este.', 8));
    var a = bloqueAvisos(avisosDe('resumen'));
    if (a) { p.appendChild(a); }
  }

  /* --- 2 · conjuntos · lista ------------------------------------------ */
  function panelConjuntos(p) {
    p.appendChild(pista('Un proyecto no tiene «unos datos»: tiene varios conjuntos con orígenes, identificabilidades y destinos distintos. Aquí se rellena lo esencial de varios a la vez; para la ficha completa de uno, se abre su detalle.'));

    if (!doc.dmp.dataset.length) {
      var v = el('div', 'vacio');
      v.appendChild(el('p', null, 'Todavía no hay ningún conjunto de datos.'));
      var ayuda = el('p', 'menor', 'Un buen punto de partida es recorrer el proyecto por orden: qué se recoge de nuevo, qué se extrae de sistemas que ya existen, qué producen las pruebas, qué llega de fuera y qué produce el análisis. Lo último es lo que más se olvida, y suele ser lo único que se puede compartir.');
      v.appendChild(ayuda);
      var b = el('button', 'principal', 'Añadir el primer conjunto');
      b.type = 'button';
      b.addEventListener('click', anadirConjunto);
      v.appendChild(b);
      p.appendChild(v);
      return;
    }

    var lista = el('div', 'conjuntos');
    doc.dmp.dataset.forEach(function (c, i) {
      lista.appendChild(tarjetaConjunto(c, i));
    });
    p.appendChild(lista);

    var mas = el('button', null, '+  Añadir un conjunto de datos');
    mas.type = 'button';
    mas.style.marginTop = '14px';
    mas.addEventListener('click', anadirConjunto);
    p.appendChild(mas);

    var a = bloqueAvisos(avisosDe('conjuntos'), 'Qué falta en los conjuntos');
    if (a) { p.appendChild(a); }
  }

  function tarjetaConjunto(c, i) {
    var id = c.dataset_id.identifier;
    var completo = c.title.trim() && c.description.trim();
    var caja = el('div', 'conjunto' + (completo ? '' : ' incompleto'));

    var cab = el('div', 'conjunto-cab');
    cab.appendChild(el('span', 'cod', id));
    var hueco = el('span', 'sep');
    cab.appendChild(hueco);

    var det = el('button', 'enlace', 'Ficha completa  →');
    det.type = 'button';
    det.addEventListener('click', function () { irA('conjuntos', id); });
    cab.appendChild(det);

    var borrar = el('button', 'discreto', 'Eliminar');
    borrar.type = 'button';
    borrar.setAttribute('aria-label', 'Eliminar ' + id);
    borrar.addEventListener('click', function () {
      if ((c.title.trim() || c.description.trim()) &&
          !confirm('¿Eliminar ' + id + (c.title ? ' · ' + c.title : '') + '?')) { return; }
      doc.dmp.dataset.splice(i, 1);
      cambiado(true);
    });
    cab.appendChild(borrar);
    caja.appendChild(cab);

    caja.appendChild(campoLibre('Nombre del conjunto', 'text', c.title,
      'Cuaderno de recogida, extracción de historia clínica, base de análisis…',
      function (v) { c.title = v; cambiado(); }));
    caja.appendChild(campoLibre('Qué contiene', 'textarea', c.description,
      'Qué hay dentro y de dónde sale, nombrando las variables o los grupos de variables. «Datos clínicos» no describe nada.',
      function (v) { c.description = v; cambiado(); }));

    var d = el('div', 'campos dos');
    d.style.marginTop = '13px';
    d.appendChild(selectLibre('¿Contiene datos de personas?', c.personal_data, Modelo.TRES,
      'Si hay duda, la respuesta es que sí.',
      function (v) { c.personal_data = v; cambiado(); }));
    d.appendChild(selectLibre('¿Son de categoría especial?', c.sensitive_data, Modelo.TRES,
      'Los de salud lo son. También los genéticos y los biométricos.',
      function (v) { c.sensitive_data = v; cambiado(); }));
    caja.appendChild(d);

    var resto = [2, 3, 4].reduce(function (n, k) { return n + Modelo.nivelHecho(c, k).hechos; }, 0);
    if (resto) {
      caja.appendChild(el('p', 'menor mt', resto + ' campos más rellenos en la ficha completa.'));
    }
    return caja;
  }

  /* --- 2 · conjuntos · detalle progresivo ------------------------------ */
  function panelConjunto(p) {
    var c = null;
    doc.dmp.dataset.forEach(function (x) {
      if (x.dataset_id.identifier === vista.conjunto) { c = x; }
    });
    if (!c) { return irA('conjuntos', null); }
    var id = c.dataset_id.identifier;

    p.appendChild(cabecera(null, id + (c.title ? ' · ' + c.title : ''), true));
    p.appendChild(pista('La ficha tiene cuatro niveles. El primero basta para que el conjunto exista; los demás se abren cuando hay algo que decir. No hace falta llenarlos todos hoy.'));

    Modelo.NIVELES.forEach(function (n) {
      p.appendChild(nivelCaja(c, n));
    });

    var a = bloqueAvisos(avisosDe('conjuntos', id), 'Qué falta en ' + id);
    if (a) { p.appendChild(a); }

    var nav = el('div', 'entre-conjuntos');
    var idx = doc.dmp.dataset.indexOf(c);
    if (idx > 0) {
      var ant = el('button', null, '←  ' + doc.dmp.dataset[idx - 1].dataset_id.identifier);
      ant.type = 'button';
      ant.addEventListener('click', function () { irA('conjuntos', doc.dmp.dataset[idx - 1].dataset_id.identifier); });
      nav.appendChild(ant);
    }
    if (idx < doc.dmp.dataset.length - 1) {
      var sig = el('button', null, doc.dmp.dataset[idx + 1].dataset_id.identifier + '  →');
      sig.type = 'button';
      sig.style.marginLeft = 'auto';
      sig.addEventListener('click', function () { irA('conjuntos', doc.dmp.dataset[idx + 1].dataset_id.identifier); });
      nav.appendChild(sig);
    }
    if (nav.childNodes.length) { p.appendChild(nav); }
  }

  function nivelCaja(c, n) {
    var caja = el('section', 'nivel' + (niveles[n.id] ? ' abierto' : ''));
    var estado = Modelo.nivelHecho(c, n.id);

    var cab = el('button', 'nivel-cab');
    cab.type = 'button';
    cab.setAttribute('aria-expanded', niveles[n.id] ? 'true' : 'false');
    cab.appendChild(el('span', 'flecha', niveles[n.id] ? '▾' : '▸'));
    cab.appendChild(el('span', 'nivel-n', String(n.id)));
    cab.appendChild(el('span', 'nivel-t', n.titulo));
    var marca = el('span', 'nivel-estado' + (estado.hechos === estado.total ? ' completo' : ''),
      estado.hechos + ' de ' + estado.total);
    cab.appendChild(marca);
    cab.addEventListener('click', function () {
      niveles[n.id] = !niveles[n.id];
      guardarBorrador();
      pintarPanel();
    });
    caja.appendChild(cab);

    if (!niveles[n.id]) { return caja; }

    var cuerpo = el('div', 'nivel-cuerpo');
    cuerpo.appendChild(pista(n.pista));

    if (n.id === 1) {
      cuerpo.appendChild(campoLibre('Nombre del conjunto', 'text', c.title,
        'Cuaderno de recogida, extracción de historia clínica, base de análisis…',
        function (v) { c.title = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Qué contiene', 'textarea', c.description,
        'Qué hay dentro y de dónde sale, nombrando las variables o los grupos de variables.',
        function (v) { c.description = v; cambiado(); }));
      var d1 = el('div', 'campos dos'); d1.style.marginTop = '13px';
      d1.appendChild(selectLibre('¿Contiene datos de personas?', c.personal_data, Modelo.TRES,
        'Si hay duda, la respuesta es que sí.',
        function (v) { c.personal_data = v; cambiado(); }));
      d1.appendChild(selectLibre('¿Son de categoría especial?', c.sensitive_data, Modelo.TRES,
        'Los de salud lo son.',
        function (v) { c.sensitive_data = v; cambiado(); }));
      cuerpo.appendChild(d1);
    }

    if (n.id === 2) {
      cuerpo.appendChild(selectLibre('Origen', c.x_origen, Modelo.ORIGEN,
        'Un dato preexistente arrastra su propio circuito de autorizaciones, y son gestiones de meses.',
        function (v) { c.x_origen = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Sistema de origen', 'text', c.x_sistema,
        'El nombre del sistema concreto donde se genera o del que se extrae.',
        function (v) { c.x_sistema = v; cambiado(); }));
      var d2 = el('div', 'campos dos'); d2.style.marginTop = '13px';
      d2.appendChild(campoLibre('Formato', 'text', c.x_formato, 'CSV, DICOM, VCF…',
        function (v) { c.x_formato = v; cambiado(); }));
      d2.appendChild(campoLibre('Volumen estimado', 'text', c.x_volumen, '300 sujetos · unos 120 GB',
        function (v) { c.x_volumen = v; cambiado(); }));
      cuerpo.appendChild(d2);
    }

    if (n.id === 3) {
      cuerpo.appendChild(selectLibre('Nivel de identificabilidad', c.x_identificabilidad, Modelo.IDENTIFICABILIDAD,
        'Quitar el nombre no anonimiza: seudonimiza. Mientras exista la clave en algún sitio, siguen siendo datos personales.',
        function (v) { c.x_identificabilidad = v; cambiado(true); }));

      if (c.x_identificabilidad === 'no-personal') {
        cuerpo.appendChild(destacado('Agregar no es un peldaño de la escala',
          'Un conjunto agregado no se sitúa en la escala: se declara que lo es y se indica qué se ha comprobado para que no permita reidentificar. Una celda con uno o dos casos, en una cohorte de una enfermedad poco frecuente, señala a una persona igual de bien que una fila con su nombre.'));
      }
      if (c.x_identificabilidad === 'anonimo') {
        cuerpo.appendChild(destacado('Conviene comprobarlo',
          'Un conjunto anónimo sale del ámbito del RGPD, y por eso se declara así con demasiada facilidad. Si existe una clave en algún lugar —aunque la guarde otro servicio y esté bajo llave— el dato es seudonimizado, no anónimo.'));
      }

      cuerpo.appendChild(campoLibre('Identificabilidad intrínseca', 'textarea', c.x_intrinseca,
        'Genómica, imagen craneal, series muy pequeñas, enfermedades raras o fechas exactas. Si la hay, el destino queda decidido desde el principio. Si no, se escribe que no.',
        function (v) { c.x_intrinseca = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Quién custodia la clave', 'textarea', c.x_seudonimizacion,
        'Cómo se genera el código, quién guarda la correspondencia, dónde vive y en qué supuestos se puede deshacer. Es la primera pregunta de cualquier comité.',
        function (v) { c.x_seudonimizacion = v; cambiado(); }));
    }

    if (n.id === 4) {
      cuerpo.appendChild(campoLibre('Persona responsable', 'text', c.x_responsable,
        'Un nombre. No un servicio, no un departamento, no «el equipo investigador».',
        function (v) { c.x_responsable = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Palabras clave', 'text', (c.keyword || []).join(', '),
        'Tres o cuatro términos por los que alguien buscaría estos datos, separados por comas.',
        function (v) {
          c.keyword = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          cambiado();
        }));
      cuerpo.appendChild(campoLibre('Aseguramiento de la calidad', 'textarea', c.data_quality_assurance,
        'Validaciones en la recogida, doble entrada, monitorización, controles de rango. Es de los pocos sitios donde el plan habla de la calidad del dato y no solo de su custodia.',
        function (v) { c.data_quality_assurance = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Utilidad fuera del proyecto', 'textarea', c.x_utilidad,
        'A quién podrían servirle estos datos y para qué. Es lo que justifica el esfuerzo de compartir.',
        function (v) { c.x_utilidad = v; cambiado(); }));
    }

    caja.appendChild(cuerpo);
    return caja;
  }

  /* --- revisión y exportación ------------------------------------------ */
  function panelRevision(p) {
    p.appendChild(destacado('El criterio de suficiencia',
      'Un párrafo del plan está bien si un tercero puede comprobar que se cumple. Si nadie ajeno al proyecto puede verificar lo que dice, el párrafo no compromete a nada y sobra. Es la única regla que hace falta, y se aplica frase a frase.'));
    p.appendChild(pista('Las comprobaciones de la lista del curso que se pueden automatizar con lo que esta maqueta cubre. No impiden exportar: un plan con huecos declarados es mejor que uno que los tapa con frases genéricas.'));

    var avisos = Modelo.comprobar(doc);
    if (!avisos.length) {
      var ok = el('div', 'todo-bien');
      ok.appendChild(el('strong', null, 'Lo que esta maqueta sabe comprobar está resuelto.'));
      ok.appendChild(document.createTextNode(' Eso no quiere decir que el plan esté completo: faltan los apartados que todavía no tiene campos.'));
      p.appendChild(ok);
    } else {
      var porSeccion = {};
      avisos.forEach(function (a) { (porSeccion[a.seccion] = porSeccion[a.seccion] || []).push(a); });
      Modelo.SECCIONES.forEach(function (g) {
        g.items.forEach(function (it) {
          var lista = porSeccion[it.id];
          if (!lista) { return; }
          var d = el('div', 'avisos-bloque');
          var h = el('h3');
          var enlace = el('button', 'enlace', (it.n ? it.n + ' · ' : '') + it.titulo);
          enlace.type = 'button';
          enlace.addEventListener('click', function () { irA(it.id, null); });
          h.appendChild(enlace);
          d.appendChild(h);
          var ul = el('ul', 'avisos');
          lista.forEach(function (a) { ul.appendChild(el('li', a.grave ? 'grave' : 'leve', a.texto)); });
          d.appendChild(ul);
          p.appendChild(d);
        });
      });
    }

    var acc = el('div', 'acciones-panel');
    acc.appendChild(el('h3', null, 'Exportar'));
    acc.appendChild(el('p', 'menor', 'El PDF que sale es un documento normal y lleva el plan dentro. Para seguir otro día basta con arrastrarlo sobre esta ventana.'));

    var fila = el('div', 'fila-botones');
    var bp = el('button', 'principal', 'Exportar a PDF');
    bp.type = 'button';
    bp.id = 'exportar-pdf';
    bp.addEventListener('click', exportarPDF);
    fila.appendChild(bp);

    var bj = el('button', null, 'Guardar como JSON (RDA)');
    bj.type = 'button';
    bj.addEventListener('click', function () {
      descargar(new TextEncoder().encode(Modelo.aJSON(doc)), nombreFichero('json'), 'application/json');
      decir('JSON guardado, conforme al modelo RDA.');
    });
    fila.appendChild(bj);

    var ba = el('button', null, 'Abrir un plan anterior…');
    ba.type = 'button';
    ba.addEventListener('click', function () { $('#fichero').click(); });
    fila.appendChild(ba);
    acc.appendChild(fila);

    var bn = el('button', 'discreto', 'Empezar un plan nuevo');
    bn.type = 'button';
    bn.style.marginTop = '12px';
    bn.addEventListener('click', function () {
      if (!confirm('Se descartará el plan que hay ahora. ¿Continuar?')) { return; }
      doc = Modelo.documentoNuevo();
      irA('portada', null);
      guardarBorrador();
      decir('Plan nuevo.');
    });
    acc.appendChild(bn);
    p.appendChild(acc);
  }

  /* ================= piezas de formulario ============================ */

  function pista(t) { return el('p', 'pista', t); }

  function destacado(titulo, texto) {
    var d = el('div', 'destacado');
    d.appendChild(el('p', 'et', titulo));
    d.appendChild(el('p', null, texto));
    return d;
  }

  function grupoCampos(titulo, hijos) {
    var s = el('section', 'grupo-campos');
    if (titulo) { s.appendChild(el('h3', null, titulo)); }
    hijos.forEach(function (h) { s.appendChild(h); });
    return s;
  }

  function dos(a, b) {
    var d = el('div', 'campos dos');
    d.appendChild(a); d.appendChild(b);
    return d;
  }

  function base(etiqueta, ayuda) {
    var d = el('div', 'campo');
    var id = 'c' + Math.random().toString(36).slice(2, 9);
    var l = el('label', null, etiqueta);
    l.htmlFor = id;
    d.appendChild(l);
    d._id = id; d._ayuda = ayuda;
    return d;
  }
  function conAyuda(d, ayuda) {
    if (ayuda) { d.appendChild(el('span', 'ayuda', ayuda)); }
    return d;
  }

  /* enlazados al documento por ruta */
  function campoTexto(etiqueta, ruta, marcador, grande, ayuda) {
    var d = base(etiqueta);
    var i = el('input');
    i.type = 'text'; i.id = d._id;
    i.value = leer(doc, ruta) || '';
    if (marcador) { i.placeholder = marcador; }
    if (grande) { i.className = 'grande'; }
    i.addEventListener('input', function () { escribir(doc, ruta, i.value); cambiado(); });
    d.appendChild(i);
    return conAyuda(d, ayuda);
  }
  function campoFecha(etiqueta, ruta) {
    var d = base(etiqueta);
    var i = el('input');
    i.type = 'date'; i.id = d._id;
    i.value = leer(doc, ruta) || '';
    i.addEventListener('input', function () { escribir(doc, ruta, i.value); cambiado(); });
    d.appendChild(i);
    return d;
  }
  function campoArea(etiqueta, ruta, marcador, filas) {
    var d = base(etiqueta);
    var t = el('textarea');
    t.id = d._id; t.rows = filas || 4;
    t.value = leer(doc, ruta) || '';
    if (marcador) { t.placeholder = marcador; }
    t.addEventListener('input', function () { escribir(doc, ruta, t.value); cambiado(); });
    d.appendChild(t);
    return d;
  }
  function campoSelect(etiqueta, ruta, opciones) {
    var d = base(etiqueta);
    var s = el('select');
    s.id = d._id;
    var actual = leer(doc, ruta) || '';
    opciones.forEach(function (o) {
      var op = el('option', null, o.t);
      op.value = o.v;
      if (o.v === actual) { op.selected = true; }
      s.appendChild(op);
    });
    s.addEventListener('change', function () { escribir(doc, ruta, s.value); cambiado(); });
    d.appendChild(s);
    return d;
  }

  /* con retrollamada, para los campos de un conjunto */
  function campoLibre(etiqueta, tipo, valor, ayuda, alCambiar) {
    var d = base(etiqueta);
    var e = el(tipo === 'textarea' ? 'textarea' : 'input');
    if (tipo === 'textarea') { e.rows = 3; } else { e.type = 'text'; }
    e.id = d._id;
    e.value = valor || '';
    if (ayuda) { e.placeholder = ayuda; }
    e.addEventListener('input', function () { alCambiar(e.value); });
    d.appendChild(e);
    return d;
  }
  function selectLibre(etiqueta, valor, opciones, ayuda, alCambiar) {
    var d = base(etiqueta);
    var s = el('select');
    s.id = d._id;
    opciones.forEach(function (o) {
      var op = el('option', null, o.t);
      op.value = o.v;
      if (o.v === valor) { op.selected = true; }
      s.appendChild(op);
    });
    s.addEventListener('change', function () { alCambiar(s.value); });
    d.appendChild(s);
    return conAyuda(d, ayuda);
  }

  /* ================= ficheros y mensajes ============================= */

  var avisoTimer = null;
  function decir(txt, error) {
    var prev = $('.aviso-flotante');
    if (prev) { prev.remove(); }
    var d = el('div', 'aviso-flotante' + (error ? ' error' : ''), txt);
    d.setAttribute('role', 'status');
    document.body.appendChild(d);
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { d.remove(); }, error ? 7000 : 3800);
  }

  function descargar(bytes, nombre, tipo) {
    var url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
    var a = el('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function nombreFichero(ext) {
    var b = (doc.dmp.title || 'plan-gestion-datos').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'plan';
    return b + '_v' + (doc.x_pgd.version || '1.0') + '_' +
      (doc.x_pgd.fecha_version || Modelo.hoy()) + '.' + ext;
  }

  async function exportarPDF() {
    var b = $('#exportar-pdf');
    if (b) { b.disabled = true; b.textContent = 'Generando…'; }
    try {
      doc.x_pgd.fecha_version = doc.x_pgd.fecha_version || Modelo.hoy();
      var bytes = await PDF.exportar(doc);
      descargar(bytes, nombreFichero('pdf'), 'application/pdf');
      decir('PDF generado. Lleva el plan dentro: para seguir otro día, arrástrelo sobre esta ventana.');
    } catch (e) {
      console.error(e);
      decir('No se ha podido generar el PDF: ' + (e.message || e), true);
    } finally {
      if (b) { b.disabled = false; b.textContent = 'Exportar a PDF'; }
    }
  }

  function cargarFichero(file) {
    var lector = new FileReader();
    var esPDF = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    lector.onload = function () {
      try {
        doc = esPDF ? PDF.importar(lector.result)
                    : Modelo.desdeJSON(new TextDecoder('utf-8').decode(new Uint8Array(lector.result)));
        irA('portada', null);
        guardarBorrador();
        decir('Plan recuperado: ' + (doc.dmp.title || 'sin título') +
              ' · versión ' + doc.x_pgd.version + ' · ' + doc.dmp.dataset.length + ' conjuntos');
      } catch (e) {
        decir(e.message || 'No se ha podido leer ese fichero.', true);
      }
    };
    lector.onerror = function () { decir('No se ha podido leer ese fichero.', true); };
    lector.readAsArrayBuffer(file);
  }

  /* ================= arranque ======================================== */

  function iniciar() {
    doc = recuperarBorrador() || Modelo.documentoNuevo();
    $('#titulo-barra').textContent = doc.dmp.title || 'Plan de gestión de datos';
    $('#etiqueta-version').textContent = 'v' + (doc.x_pgd.version || '1.0');

    pintarIndice();
    pintarPanel();

    $('#menu').addEventListener('click', function () {
      document.body.classList.toggle('indice-visible');
    });

    $('#fichero').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) { cargarFichero(e.target.files[0]); }
      e.target.value = '';
    });

    var capa = $('#soltar'), profundidad = 0;
    window.addEventListener('dragenter', function (e) {
      e.preventDefault(); profundidad++; capa.classList.add('activa');
    });
    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('dragleave', function () {
      profundidad = Math.max(0, profundidad - 1);
      if (!profundidad) { capa.classList.remove('activa'); }
    });
    window.addEventListener('drop', function (e) {
      e.preventDefault(); profundidad = 0; capa.classList.remove('activa');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) { cargarFichero(e.dataTransfer.files[0]); }
    });

    window.addEventListener('beforeunload', guardarBorrador);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else { iniciar(); }
})();
