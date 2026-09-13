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
    pintarBarra();
    pintarIndice();
    if (repintarPanel) { pintarPanel(); }
  }

  /* La revisión y la exportación estaban al final del índice, y eran lo
     que más falta hace tener siempre a mano. Suben a la barra. */
  function pintarBarra() {
    $('#etiqueta-version').textContent = 'v' + (doc.x_pgd.version || '1.0');
    $('#titulo-barra').textContent = doc.dmp.title || 'Plan de gestión de datos';
    var n = Modelo.comprobar(doc).length;
    var ins = $('#insignia');
    ins.textContent = n ? String(n) : '✓';
    ins.className = 'insignia' + (n ? '' : ' limpio');
    $('#b-revision').title = n
      ? n + (n === 1 ? ' cosa por decidir' : ' cosas por decidir')
      : 'Lo que se puede comprobar está resuelto';
    $('#b-revision').setAttribute('aria-current',
      vista.seccion === 'revision' && !vista.conjunto ? 'true' : 'false');
  }

  function cerrarMenus() {
    var m = $('.menu-flotante');
    if (m) { m.remove(); }
    $('#b-exportar').setAttribute('aria-expanded', 'false');
  }

  function menuExportar() {
    if ($('.menu-flotante')) { return cerrarMenus(); }
    var b = $('#b-exportar');
    var m = el('div', 'menu-flotante');
    m.setAttribute('role', 'menu');

    Object.keys(PDF.DISPOSICIONES).forEach(function (k) {
      var op = el('button');
      op.type = 'button';
      op.setAttribute('role', 'menuitem');
      op.appendChild(document.createTextNode('PDF · ' + PDF.DISPOSICIONES[k].nombre));
      op.appendChild(el('small', null, k === 'curso'
        ? 'Por decisiones, en el orden de la plantilla del curso'
        : 'Volcado a los apartados de la plantilla europea'));
      op.addEventListener('click', function () { cerrarMenus(); exportarPDF(k, null); });
      m.appendChild(op);
    });
    m.appendChild(el('hr'));
    var oj = el('button');
    oj.type = 'button';
    oj.setAttribute('role', 'menuitem');
    oj.appendChild(document.createTextNode('JSON · modelo RDA'));
    oj.appendChild(el('small', null, 'Para herramientas que hablen el estándar'));
    oj.addEventListener('click', function () {
      cerrarMenus();
      descargar(new TextEncoder().encode(Modelo.aJSON(doc)), nombreFichero('json'), 'application/json');
      decir('JSON guardado, conforme al modelo RDA.');
    });
    m.appendChild(oj);

    document.body.appendChild(m);
    var r = b.getBoundingClientRect();
    m.style.top = (r.bottom + 5) + 'px';
    m.style.left = Math.max(8, Math.min(r.right - m.offsetWidth, window.innerWidth - m.offsetWidth - 8)) + 'px';
    b.setAttribute('aria-expanded', 'true');
    m.querySelector('button').focus();
  }

  function irA(seccion, conjunto) {
    vista = { seccion: seccion, conjunto: conjunto || null };
    cerrarMenus();
    pintarBarra();
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

  /* ¿Tiene algo escrito, en cualquier nivel o apartado? Preguntar antes
     de borrar solo cuando hay algo que perder evita el diálogo inútil
     del conjunto recién creado, y evita también borrar sin aviso uno
     que tenía media ficha rellena aunque le faltara el nombre. */
  function tieneContenido(c) {
    return Object.keys(c).some(function (k) {
      if (k === 'dataset_id') { return false; }
      var v = c[k];
      if (Array.isArray(v)) { return v.length > 0; }
      if (k === 'personal_data' || k === 'sensitive_data') { return v && v !== 'unknown'; }
      return String(v == null ? '' : v).trim() !== '';
    });
  }

  function eliminarConjunto(c, alTerminar) {
    var id = c.dataset_id.identifier;
    if (tieneContenido(c)) {
      var n = ['x_diccionario', 'x_emplazamiento', 'x_plazo', 'x_destino']
        .filter(function (k) { return String(c[k] || '').trim(); }).length;
      var extra = n ? '\n\nTiene decisiones tomadas en otros apartados, que se perderán también.' : '';
      if (!confirm('¿Eliminar ' + id + (c.title ? ' · ' + c.title : '') + '?' + extra)) { return; }
    }
    var i = doc.dmp.dataset.indexOf(c);
    if (i >= 0) { doc.dmp.dataset.splice(i, 1); }
    delete temaAbierto[id];
    if (alTerminar) { alTerminar(); } else { cambiado(true); }
    decir(id + ' eliminado. El identificador no se reutiliza.');
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
    var o = { ayuda: f.ayuda, ejemplo: f.ejemplo, clave: f.k, req: f.req };
    if (f.tipo === 'select') {
      return selectLibre(f.et, obj[f.k], Modelo[f.opciones], o, function (v) {
        obj[f.k] = v; alCambiar();
      });
    }
    return campoLibre(f.et, f.tipo, obj[f.k], o, function (v) {
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
      campoTexto('Título del proyecto', 'dmp.title', 'Tal como figura en la resolución, si ya está concedido', true, null, 'obligatorio'),
      dos(
        campoTexto('Código o expediente', 'dmp.dmp_id.identifier', 'Se deja vacío si aún no existe'),
        campoTexto('Institución responsable', 'x_pgd.institucion', 'Quien responde de los datos', false, null, 'obligatorio')
      ),
      dos(
        campoTexto('Financiador', 'dmp.project.0.funding.0.name', 'Vacío si no hay financiación externa'),
        campoSelect('Estado de la financiación', 'dmp.project.0.funding.0.funding_status', Modelo.ESTADO_FINANCIACION)
      )
    ]));

    p.appendChild(grupoCampos('Persona responsable', [
      pista('Un nombre, no un servicio ni «el equipo investigador». Es a quien se dirigirá quien tenga una pregunta sobre estos datos dentro de diez años.'),
      dos(
        campoTexto('Nombre y apellidos', 'dmp.contact.name', '', false, null, 'obligatorio'),
        campoTexto('Correo electrónico', 'dmp.contact.mbox', '', false, null, 'recomendado')
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

    var borrar = el('button', 'borrar', 'Eliminar');
    borrar.type = 'button';
    borrar.title = 'Eliminar ' + id;
    borrar.setAttribute('aria-label', 'Eliminar ' + id);
    borrar.addEventListener('click', function () { eliminarConjunto(c); });
    cab.appendChild(borrar);
    caja.appendChild(cab);

    caja.appendChild(campoLibre('Título del conjunto', 'text', c.title,
      { ejemplo: 'Cuaderno de recogida electrónico' },
      function (v) { c.title = v; cambiado(); }));
    caja.appendChild(campoLibre('Descripción y contenido', 'textarea', c.description,
      { ejemplo: 'Qué hay dentro y de dónde sale, nombrando las variables o los grupos de variables.' },
      function (v) { c.description = v; cambiado(); }));

    var d = el('div', 'campos dos');
    d.style.marginTop = '13px';
    d.appendChild(selectLibre('¿Contiene datos personales?', c.personal_data, Modelo.TRES, null,
      function (v) { c.personal_data = v; cambiado(); }));
    d.appendChild(selectLibre('¿De categoría especial?', c.sensitive_data, Modelo.TRES, null,
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

    var zona = el('div', 'zona-borrar');
    var bb = el('button', 'borrar', 'Eliminar ' + id);
    bb.type = 'button';
    bb.addEventListener('click', function () {
      eliminarConjunto(c, function () { irA('conjuntos', null); cambiado(); });
    });
    zona.appendChild(bb);
    zona.appendChild(el('span', 'menor', 'Se elimina de todos los apartados. El identificador ' + id + ' no se reutiliza.'));
    p.appendChild(zona);
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
      cuerpo.appendChild(campoLibre('Título del conjunto', 'text', c.title,
        { req: 'obligatorio', ejemplo: 'Cuaderno de recogida electrónico',
          ayuda: 'Un nombre reconocible por el equipo. Se acompañará del identificador ' + c.dataset_id.identifier + ', que es como se citará el conjunto en el resto del documento.' },
        function (v) { c.title = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Descripción y contenido', 'textarea', c.description,
        { req: 'obligatorio', ejemplo: 'Variables clínicas y desenlaces recogidos en cada visita: demográficas, antecedentes, función renal y tratamiento concomitante.',
          ayuda: 'Que alguien ajeno al proyecto entienda qué hay dentro y pueda juzgar si le sirve. Se nombran las variables o los grupos de variables: «datos clínicos» no describe nada. El error frecuente es describir el proyecto en vez del conjunto.' },
        function (v) { c.description = v; cambiado(); }));
      var d1 = el('div', 'campos dos'); d1.style.marginTop = '13px';
      d1.appendChild(selectLibre('¿Contiene datos personales?', c.personal_data, Modelo.TRES,
        { clave: 'personal_data',
          ayuda: 'Cualquier información sobre una persona identificada o identificable. Si existe duda, la respuesta es que sí: la clasificación puede revisarse después, pero tratar como no personal algo que lo es compromete todo lo que el plan decida a continuación.' },
        function (v) { c.personal_data = v; cambiado(); }));
      d1.appendChild(selectLibre('¿De categoría especial?', c.sensitive_data, Modelo.TRES,
        { clave: 'sensitive_data',
          ayuda: 'Los datos de salud lo son, y también los genéticos y los biométricos. Su tratamiento está prohibido con carácter general salvo que concurra una excepción del artículo 9 del RGPD, de modo que necesitan dos habilitaciones a la vez y no una.' },
        function (v) { c.sensitive_data = v; cambiado(); }));
      cuerpo.appendChild(d1);
    }

    if (n.id === 2) {
      cuerpo.appendChild(selectLibre('Origen', c.x_origen, Modelo.ORIGEN,
        { req: 'recomendado', clave: 'x_origen',
          ayuda: 'Determina casi todo lo demás. Un dato preexistente de origen asistencial no se puede usar sin una habilitación propia, y su obtención sigue el circuito de autorización y extracción que tenga establecido la institución, con sus plazos.' },
        function (v) { c.x_origen = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Sistema de recogida u origen', 'text', c.x_sistema,
        { req: 'recomendado', ejemplo: 'Plataforma institucional de captura de datos',
          ayuda: 'El nombre del sistema concreto donde se genera el dato o del que se extrae. Es lo que permite comprobar la extracción y volver a pedirla si hiciera falta.' },
        function (v) { c.x_sistema = v; cambiado(); }));
      var d2 = el('div', 'campos dos'); d2.style.marginTop = '13px';
      d2.appendChild(campoLibre('Formato', 'text', c.x_formato,
        { ejemplo: 'CSV', clave: 'x_formato',
          ayuda: 'El formato de los ficheros tal como salen del sistema de origen, no el que se desearía tener.' },
        function (v) { c.x_formato = v; cambiado(); }));
      d2.appendChild(campoLibre('Volumen estimado', 'text', c.x_volumen,
        { ejemplo: '300 sujetos · 3 MB', clave: 'x_volumen',
          ayuda: 'Número de sujetos y de registros, y tamaño aproximado. Es lo que hace creíble —o no— la partida de almacenamiento del apartado 10.' },
        function (v) { c.x_volumen = v; cambiado(); }));
      cuerpo.appendChild(d2);
    }

    if (n.id === 3) {
      cuerpo.appendChild(selectLibre('Nivel de identificabilidad', c.x_identificabilidad, Modelo.IDENTIFICABILIDAD,
        { req: 'obligatorio', clave: 'x_identificabilidad',
          ayuda: 'Retirar el nombre y el número de historia no anonimiza: seudonimiza. Mientras exista en algún lugar la correspondencia que permite volver a la persona, el conjunto sigue siendo dato personal y le aplica toda la normativa. La única frontera con consecuencias jurídicas está entre seudonimizado y anonimizado.' },
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
        { ejemplo: 'No la hay. Las fechas de ingreso se sustituyen por el número de días desde la inclusión.',
          clave: 'x_intrinseca',
          ayuda: 'Hay datos que identifican aunque se les retiren todas las etiquetas, porque la información en sí misma señala a una persona: secuencias genómicas, imagen craneal con reconstrucción facial posible, series de pocos casos, enfermedades poco frecuentes, fechas exactas y localización fina. No se corrige suprimiendo columnas. Si concurre, el destino del conjunto queda condicionado desde el principio; si no concurre, conviene hacerlo constar igualmente.' },
        function (v) { c.x_intrinseca = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Seudonimización y custodia de la clave', 'textarea', c.x_seudonimizacion,
        { req: 'recomendado', ejemplo: 'Código secuencial generado por el servicio de informática en el momento de la extracción. La tabla de correspondencia reside en un sistema separado bajo su custodia; el equipo investigador no tiene acceso a ella.',
          clave: 'x_seudonimizacion',
          ayuda: 'Cuatro elementos: cómo se genera el código, quién custodia la correspondencia, dónde reside y en qué supuestos previstos puede levantarse. Que un conjunto esté seudonimizado no es una propiedad del fichero, sino del conjunto formado por el fichero y quien puede deshacer la correspondencia. Es la primera cuestión que plantea un comité de ética, y el campo que con más frecuencia aparece vacío.' },
        function (v) { c.x_seudonimizacion = v; cambiado(); }));
    }

    if (n.id === 4) {
      cuerpo.appendChild(campoLibre('Persona responsable', 'text', c.x_responsable,
        { req: 'recomendado', ejemplo: 'Nombre y apellidos', clave: 'x_responsable',
          ayuda: 'Una persona concreta. No un servicio, no un departamento, no «el equipo investigador»: una tarea asignada a todos es una tarea de nadie, y eso se descubre cuando algo no se ha hecho y cada uno da por supuesto que correspondía a otro.' },
        function (v) { c.x_responsable = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Palabras clave', 'text', (c.keyword || []).join(', '),
        { ejemplo: 'enfermedad renal crónica, cohorte prospectiva, filtrado glomerular',
          clave: 'keyword',
          ayuda: 'Tres o cuatro términos por los que alguien buscaría este conjunto en un catálogo sin haber oído hablar del proyecto, separados por comas. Decidirlos ahora cuesta un minuto; improvisarlos el día del depósito es lo que produce conjuntos depositados e invisibles.' },
        function (v) {
          c.keyword = v.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          cambiado();
        }));
      cuerpo.appendChild(campoLibre('Aseguramiento de la calidad', 'textarea', c.data_quality_assurance,
        { ejemplo: 'Validación de rangos en el cuaderno de recogida y revisión mensual de valores imposibles.',
          clave: 'data_quality_assurance',
          ayuda: 'Qué se hace para que los datos sean correctos: validaciones en la recogida, doble entrada, monitorización, controles de rango. Es de los pocos lugares donde el plan trata de la calidad del dato y no solo de su custodia, y es campo propio del estándar RDA.' },
        function (v) { c.data_quality_assurance = v; cambiado(); }));
      cuerpo.appendChild(campoLibre('Utilidad fuera del proyecto', 'textarea', c.x_utilidad,
        { ejemplo: 'Validación externa de modelos de progresión renal y metaanálisis de cohortes comparables.',
          clave: 'x_utilidad',
          ayuda: 'A qué otros equipos podría servirles este conjunto y para qué. Horizon Europe lo pregunta expresamente, y es lo que justifica el esfuerzo de describir y compartir.' },
        function (v) { c.x_utilidad = v; cambiado(); }));
    }

    caja.appendChild(cuerpo);
    return caja;
  }

  /* --- revisión y exportación ------------------------------------------ */
  function panelRevision(p) {
    var leg = el('div', 'leyenda');
    var l1 = el('span'); l1.appendChild(el('i','obl')); l1.appendChild(document.createTextNode('Sin ello el apartado no dice nada'));
    var l2 = el('span'); l2.appendChild(el('i','rec')); l2.appendChild(document.createTextNode('Recomendado por el curso'));
    leg.appendChild(l1); leg.appendChild(l2);
    leg.appendChild(el('span', null, 'Las marcas aparecen junto al campo, en su apartado.'));
    p.appendChild(leg);

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

    /* La versión es una decisión de quien exporta, así que se toma
       aquí y no al guardar. La regla del curso: si el cambio obliga a
       avisar a alguien, sube el primer número; si no, el segundo. */
    var ver = el('div', 'version-caja');
    ver.appendChild(el('p', 'et', 'Versión que se va a exportar'));
    var fv = el('div', 'fila-botones');
    fv.appendChild(el('span', 'version-actual', 'v' + doc.x_pgd.version));
    var bmen = el('button', null, '→ v' + Modelo.subirVersion(doc.x_pgd.version, false));
    bmen.type = 'button';
    bmen.title = 'Se ha rellenado un hueco o precisado una cifra, pero ninguna decisión cambia';
    bmen.addEventListener('click', function () {
      doc.x_pgd.version = Modelo.subirVersion(doc.x_pgd.version, false);
      doc.x_pgd.fecha_version = Modelo.hoy();
      cambiado(true);
    });
    fv.appendChild(bmen);
    var bmay = el('button', null, '→ v' + Modelo.subirVersion(doc.x_pgd.version, true));
    bmay.type = 'button';
    bmay.title = 'Cambia una decisión ya comunicada: hay que avisar al comité, al financiador o a los socios';
    bmay.addEventListener('click', function () {
      doc.x_pgd.version = Modelo.subirVersion(doc.x_pgd.version, true);
      doc.x_pgd.fecha_version = Modelo.hoy();
      cambiado(true);
    });
    fv.appendChild(bmay);
    ver.appendChild(fv);
    ver.appendChild(el('p', 'menor', 'Si el cambio obliga a avisar a alguien —al comité, al financiador, a los socios— sube el primer número. Si no, el segundo.'));
    acc.appendChild(ver);

    var fila = el('div', 'fila-botones');
    Object.keys(PDF.DISPOSICIONES).forEach(function (k, i) {
      var b = el('button', i === 0 ? 'principal' : null,
        'PDF · ' + PDF.DISPOSICIONES[k].nombre.replace('Formato ', '').replace('del curso', 'del curso').replace('de la Comisión Europea', 'Comisión Europea'));
      b.type = 'button';
      b.dataset.formato = k;
      b.addEventListener('click', function () { exportarPDF(k, b); });
      fila.appendChild(b);
    });

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

  /* La ayuda no puede vivir en el marcador de posición: desaparece en
     cuanto se escribe la primera letra, que es justo cuando hace falta.
     Va en un botón que la despliega debajo del campo y la deja fija.

     El marcador de posición queda para lo que sirve de verdad: un
     ejemplo corto de qué se espera, no una explicación. */
  var ayudasAbiertas = {};
  var todasLasAyudas = false;

  /* Un campo vacío que el estándar exige se marca en rojizo; uno que el
     curso recomienda, en gris. Un punto junto a la etiqueta y una línea
     en el borde: suficiente para verlo de un vistazo, discreto para no
     convertir un formulario a medias en una pantalla de errores. */
  function marcaFalta(req, valor) {
    if (!req) { return ''; }
    var v = Array.isArray(valor) ? valor.length : String(valor == null ? '' : valor).trim();
    if (v && v !== 'unknown') { return ''; }
    return req === 'obligatorio' ? ' falta-obl' : ' falta-rec';
  }

  function base(etiqueta, ayuda, clave, marca) {
    var d = el('div', 'campo' + (marca || ''));
    var id = 'c' + Math.random().toString(36).slice(2, 9);
    var fila = el('div', 'campo-cab');
    var l = el('label', null, etiqueta);
    l.htmlFor = id;
    fila.appendChild(l);
    if (ayuda) {
      var k = clave || etiqueta;
      var abierta = todasLasAyudas || !!ayudasAbiertas[k];
      var b = el('button', 'ayuda-b' + (abierta ? ' activa' : ''), '?');
      b.type = 'button';
      b.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      b.setAttribute('aria-controls', id + '-ayuda');
      b.setAttribute('aria-label', 'Explicación de «' + etiqueta + '»');
      b.title = abierta ? 'Ocultar la explicación' : 'Qué se espera en este campo';
      b.addEventListener('click', function () {
        ayudasAbiertas[k] = !(todasLasAyudas || ayudasAbiertas[k]);
        if (todasLasAyudas && !ayudasAbiertas[k]) { ayudasAbiertas[k] = false; }
        pintarPanel();
      });
      fila.appendChild(b);
      d._ayudaTexto = ayuda; d._ayudaAbierta = abierta;
    }
    d.appendChild(fila);
    d._id = id;
    return d;
  }

  function conAyuda(d) {
    if (d._ayudaTexto && d._ayudaAbierta) {
      var a = el('p', 'ayuda', d._ayudaTexto);
      a.id = d._id + '-ayuda';
      d.appendChild(a);
      var campo = d.querySelector('input, textarea, select');
      if (campo) { campo.setAttribute('aria-describedby', a.id); }
    }
    return d;
  }

  /* enlazados al documento por ruta */
  function campoTexto(etiqueta, ruta, marcador, grande, ayuda, req) {
    var d = base(etiqueta, ayuda, null, marcaFalta(req, leer(doc, ruta)));
    var i = el('input');
    i.type = 'text'; i.id = d._id;
    i.value = leer(doc, ruta) || '';
    if (marcador) { i.placeholder = marcador; }
    if (grande) { i.className = 'grande'; }
    i.addEventListener('input', function () { escribir(doc, ruta, i.value); cambiado(); });
    d.appendChild(i);
    return conAyuda(d);
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
  function campoLibre(etiqueta, tipo, valor, o, alCambiar) {
    o = typeof o === 'string' ? { ayuda: o } : (o || {});
    var d = base(etiqueta, o.ayuda, o.clave, marcaFalta(o.req, valor));
    var e = el(tipo === 'textarea' ? 'textarea' : 'input');
    if (tipo === 'textarea') { e.rows = 3; } else { e.type = 'text'; }
    e.id = d._id;
    e.value = valor || '';
    if (o.ejemplo) { e.placeholder = o.ejemplo; }
    e.addEventListener('input', function () { alCambiar(e.value); });
    d.appendChild(e);
    return conAyuda(d);
  }
  function selectLibre(etiqueta, valor, opciones, o, alCambiar) {
    o = typeof o === 'string' ? { ayuda: o } : (o || {});
    var d = base(etiqueta, o.ayuda, o.clave, marcaFalta(o.req, valor));
    var s = el('select');
    s.id = d._id;
    opciones.forEach(function (op2) {
      var op = el('option', null, op2.t);
      op.value = op2.v;
      if (op2.v === valor) { op.selected = true; }
      s.appendChild(op);
    });
    s.addEventListener('change', function () { alCambiar(s.value); });
    d.appendChild(s);
    return conAyuda(d);
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

  function nombreFichero(ext, formato) {
    var b = (doc.dmp.title || 'plan-gestion-datos').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'plan';
    return b + (formato === 'ec' ? '_EC' : '') +
      '_v' + (doc.x_pgd.version || '1.0') + '_' +
      (doc.x_pgd.fecha_version || Modelo.hoy()) + '.' + ext;
  }

  async function exportarPDF(formato, b) {
    var rotulo = b ? b.textContent : '';
    if (b) { b.disabled = true; b.textContent = 'Generando…'; }
    try {
      doc.x_pgd.fecha_version = doc.x_pgd.fecha_version || Modelo.hoy();
      var bytes = await PDF.exportar(doc, { formato: formato });
      descargar(bytes, nombreFichero('pdf', formato), 'application/pdf');
      decir('PDF generado en ' + PDF.DISPOSICIONES[formato].nombre.toLowerCase() +
            '. Lleva el plan dentro: para seguir otro día, arrástrelo sobre esta ventana.');
    } catch (e) {
      console.error(e);
      decir('No se ha podido generar el PDF: ' + (e.message || e), true);
    } finally {
      if (b) { b.disabled = false; b.textContent = rotulo; }
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
    pintarBarra();
    pintarIndice();
    pintarPanel();

    $('#b-revision').addEventListener('click', function () { irA('revision', null); });
    $('#b-abrir').addEventListener('click', function () { $('#fichero').click(); });
    $('#b-exportar').addEventListener('click', function (e) { e.stopPropagation(); menuExportar(); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.menu-flotante')) { cerrarMenus(); }
    });

    $('#menu').addEventListener('click', function () {
      document.body.classList.toggle('indice-visible');
    });
    $('#velo').addEventListener('click', function () {
      document.body.classList.remove('indice-visible');
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        cerrarMenus();
        document.body.classList.remove('indice-visible');
      }
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
