/* ------------------------------------------------------------------
   La aplicación: el índice, los formularios y el estado del documento.

   Índice a la izquierda y un apartado a la vez a la derecha. Lo que se
   escribe se guarda solo; el único botón de acción es el de exportar.
   La ficha de un conjunto se abre por niveles.
   ------------------------------------------------------------------ */
(function () {
  'use strict';

  var CLAVE = 'pgd-editor:borrador';
  var ABIERTOS = 'pgd-editor:niveles';

  var doc = null;
  var vista = { seccion: 'portada', conjunto: null };
  var niveles = { 1: true, 2: false, 3: false, 4: false, 5: false };
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
    var cerrada = doc.x_pgd.estado === 'cerrada';
    var ev = $('#etiqueta-version');
    ev.textContent = 'v' + (doc.x_pgd.version || '1.0') + (cerrada ? ' · cerrada' : '');
    ev.className = 'ver' + (cerrada ? ' cerrada' : '');
    ev.title = cerrada
      ? 'Esta versión se ha cerrado. Para exportar de nuevo hay que subir el número.'
      : 'Borrador: se puede reexportar con el mismo número.';
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

    var permiso = Modelo.puedeExportar(doc);

    function opcion(rotulo, detalle, cerrar) {
      var op = el('button');
      op.type = 'button';
      op.setAttribute('role', 'menuitem');
      op.appendChild(document.createTextNode(rotulo));
      op.appendChild(el('small', null, detalle));
      if (!permiso.ok) { op.disabled = true; }
      op.addEventListener('click', function () { cerrarMenus(); exportarPDF('ec', cerrar); });
      m.appendChild(op);
      return op;
    }

    opcion('PDF · borrador', 'La versión queda abierta: se puede volver a exportar con el mismo número.', false);
    opcion('PDF · versión cerrada', 'Se entrega. A partir de ahí el número solo puede subir.', true);

    if (!permiso.ok) {
      var av = el('div', 'menu-aviso', permiso.motivo);
      m.appendChild(av);
    }
    m.appendChild(el('hr'));
    var oj = el('button');
    oj.type = 'button';
    oj.setAttribute('role', 'menuitem');
    oj.appendChild(document.createTextNode('JSON · modelo RDA'));
    oj.appendChild(el('small', null, 'Para herramientas que hablen el estándar'));
    oj.addEventListener('click', function () {
      cerrarMenus();
      guardar(new TextEncoder().encode(Modelo.aJSON(doc)), nombreFichero('json'),
        'json', 'Fichero JSON', 'application/json').then(function (ruta) {
          if (ruta === null && window.__TAURI__) { return; }
          decir('JSON guardado' + (ruta ? ' en ' + soloNombre(ruta) : '') + ', conforme al modelo RDA.');
        });
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

  var PUNTOS_T = { lleno: 'Completo', parcial: 'A medias', vacio: 'Sin cumplimentar' };

  function pintarIndice() {
    var nav = $('#indice');
    nav.innerHTML = '';

    Modelo.SECCIONES.forEach(function (g) {
      if (g.grupo) {
        var eg = el('div', 'grupo t-' + g.tono);
        eg.appendChild(el('i', 'marca'));
        eg.appendChild(document.createTextNode(g.grupo));
        nav.appendChild(eg);
      }
      g.items.forEach(function (it) {
        var estado = Modelo.estadoSeccion(doc, it.id);
        var b = el('button', 'item t-' + g.tono);
        b.type = 'button';
        if (vista.seccion === it.id && !vista.conjunto) { b.setAttribute('aria-current', 'true'); }

        var p = el('span', 'punto ' + estado);
        p.title = PUNTOS_T[estado];
        p.setAttribute('aria-label', PUNTOS_T[estado]);
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
            var h = el('button', 'hijo t-' + g.tono);
            h.type = 'button';
            if (vista.conjunto === id) { h.setAttribute('aria-current', 'true'); }
            h.appendChild(el('span', 'cod', id));
            h.appendChild(el('span', 'rot', c.title || 'sin nombre'));
            h.addEventListener('click', function () { irA('conjuntos', id); });
            nav.appendChild(h);
          });
          var mas = el('button', 'hijo anadir t-' + g.tono, '+  añadir un conjunto');
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

  /* Confirmación propia. El diálogo del navegador no se muestra dentro
     de la aplicación de escritorio: confirm() devuelve falso sin
     preguntar nada, y la acción no llegaba a ejecutarse nunca. */
  function confirmar(anfitrion, mensaje, rotulo, alConfirmar) {
    var previa = anfitrion.querySelector('.confirmar');
    if (previa) { previa.remove(); }
    var caja = el('div', 'confirmar');
    caja.appendChild(el('p', null, mensaje));
    var fila = el('div', 'fila-botones');
    var si = el('button', 'peligro', rotulo);
    si.type = 'button';
    si.addEventListener('click', function () { caja.remove(); alConfirmar(); });
    var no = el('button', null, 'Cancelar');
    no.type = 'button';
    no.addEventListener('click', function () { caja.remove(); });
    fila.appendChild(si); fila.appendChild(no);
    caja.appendChild(fila);
    anfitrion.appendChild(caja);
    si.focus();
  }

  function eliminarConjunto(c, anfitrion, alTerminar) {
    var id = c.dataset_id.identifier;
    function hazlo() {
      var i = doc.dmp.dataset.indexOf(c);
      if (i >= 0) { doc.dmp.dataset.splice(i, 1); }
      delete temaAbierto[id];
      if (alTerminar) { alTerminar(); } else { cambiado(true); }
      decir(id + ' eliminado. El identificador no vuelve a asignarse.');
    }
    if (!tieneContenido(c)) { return hazlo(); }
    var n = ['x_diccionario', 'x_emplazamiento', 'x_plazo', 'x_destino']
      .filter(function (k) { return String(c[k] || '').trim(); }).length;
    confirmar(anfitrion,
      'Se eliminará ' + id + (c.title ? ' · ' + c.title : '') + ' de todos los apartados' +
      (n ? ', incluidas las decisiones tomadas en otros apartados' : '') + '.',
      'Eliminar ' + id, hazlo);
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

  function grupoDe(id) {
    var r = null;
    Modelo.SECCIONES.forEach(function (g) {
      g.items.forEach(function (x) { if (x.id === id) { r = g; } });
    });
    return r;
  }

  function pintarPanel() {
    var p = $('#panel');
    p.innerHTML = '';

    if (vista.conjunto) { return panelConjunto(p); }

    var g = grupoDe(vista.seccion);
    var it = null;
    if (g) { g.items.forEach(function (x) { if (x.id === vista.seccion) { it = x; } }); }
    if (!it) { return; }

    p.appendChild(cabecera(it.n, it.titulo, false, g));

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

    p.appendChild(pista(t.pista));

    if (t.proyecto.length) {
      var g = el('section', 'grupo-campos');
      g.appendChild(el('h3', null, t.conjunto.length ? 'Del proyecto' : 'Qué se decide aquí'));
      t.proyecto.forEach(function (f) {
        if (!Modelo.campoVisible(f, doc.x_pgd)) { return; }
        /* el desplegable del que dependen otros campos repinta el panel:
           responder «no» tiene que hacer desaparecer lo que sobra */
        var repinta = t.proyecto.some(function (o) { return o.si && o.si.k === f.k; });
        g.appendChild(campoTema(f, doc.x_pgd, function () { cambiado(repinta); }));
      });
      p.appendChild(g);
    }

    if (!t.conjunto.length) {
      var av0 = bloqueAvisos(avisosDe(it.id));
      if (av0) { p.appendChild(av0); }
      return;
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
    cab.appendChild(el('span', 'flecha'));
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
      /* y el alcance del permiso, solo si hay algo que amparar */
      if (tema === 'legal' && f.k === 'x_alcance' && c.x_base_legal === 'no-personal') { return; }
      cuerpo.appendChild(campoTema(f, c, function () { cambiado(true); }));
    });

    if (tema === 'legal' && c.x_base_legal === 'no-personal' && c.personal_data === 'yes') {
      cuerpo.appendChild(destacado('Las dos respuestas no encajan',
        'La ficha de ' + id + ' dice que contiene datos personales y aquí se declara que el régimen no le aplica. Una de las dos está mal, y conviene resolverlo ahora: todo lo que el plan decida después se apoya en esto.'));
    }

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

  /* El grupo va encima del título y en su tono. Es lo que dice, sin
     leer nada, en qué parte del documento se está trabajando. */
  function cabecera(n, titulo, vuelta, grupo) {
    var c = el('header', 'cab' + (grupo ? ' t-' + grupo.tono : ''));
    if (vuelta) {
      var v = el('button', 'volver', '←  Conjuntos de datos');
      v.type = 'button';
      v.addEventListener('click', function () { irA('conjuntos', null); });
      c.appendChild(v);
    }
    if (grupo && grupo.grupo) { c.appendChild(el('p', 'cejilla', grupo.grupo)); }
    var h = el('h2');
    if (n) { h.appendChild(el('span', 'num', n)); }
    h.appendChild(document.createTextNode(titulo));
    c.appendChild(h);
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

  /* --- 0 · portada --------------------------------------------------- */
  function panelPortada(p) {
    p.appendChild(pista('Identifica el proyecto al que corresponde el documento y a quién dirigirse. Es lo que permitirá situarlo dentro de diez años.'));

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
      pista('Una persona concreta, no un servicio ni «el equipo investigador». Es a quien se dirigirá quien tenga una consulta sobre estos datos.'),
      dos(
        campoTexto('Nombre y apellidos', 'dmp.contact.name', '', false, null, 'obligatorio'),
        campoTexto('Correo electrónico', 'dmp.contact.mbox', '', false, null, 'recomendado')
      ),
      campoTexto('ORCID', 'dmp.contact.contact_id.identifier', '0000-0000-0000-0000',
        false, 'Opcional. Es lo que permite que el conjunto de datos cuente en el currículo de quien lo produjo.')
    ]));

    p.appendChild(grupoCampos('Control del documento', [
      pista('El plan se redacta antes de comenzar, cuando parte de su contenido son estimaciones, y se corrige a medida que se concretan. Sin control de versiones no puede determinarse cuál estaba vigente en un momento dado.'),
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
    p.appendChild(pista('Media página: qué conjuntos hay, en qué sistemas residirán, quién responde de ellos y cuál será su destino al cerrar el proyecto. Es el párrafo que un evaluador lee íntegro.'));
    p.appendChild(destacado('Se escribe el último', 'Se redacta cuando el resto del documento ya está decidido. Escribirlo antes produce resúmenes que comprometen lo que los apartados siguientes acaban desmintiendo.'));
    p.appendChild(campoArea('Resumen de la gestión de datos', 'dmp.description',
      'Si este párrafo se puede pegar en otro proyecto sin cambiar nada, todavía no describe este.', 8));
    var a = bloqueAvisos(avisosDe('resumen'));
    if (a) { p.appendChild(a); }
  }

  /* --- 2 · conjuntos · lista ------------------------------------------ */
  function panelConjuntos(p) {
    p.appendChild(pista('Un proyecto no maneja «unos datos», sino varios conjuntos con orígenes, identificabilidades y destinos distintos. Desde aquí se cumplimenta lo esencial de varios a la vez; la ficha completa de cada uno se abre en su detalle.'));

    if (!doc.dmp.dataset.length) {
      var v = el('div', 'vacio');
      v.appendChild(el('p', null, 'Todavía no hay ningún conjunto de datos.'));
      var ayuda = el('p', 'menor', 'Conviene recorrer el proyecto en orden temporal: qué se recoge de nuevo, qué se extrae de sistemas preexistentes, qué producen las pruebas, qué procede de terceros y qué genera el análisis. Lo último es lo que más se omite, y con frecuencia es lo único compartible.');
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

    var esq = bloqueEsquema();
    if (esq) { esq.style.marginTop = '30px'; p.appendChild(esq); }

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
    borrar.addEventListener('click', function () { eliminarConjunto(c, caja); });
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

    var cab = cabecera(null, id + (c.title ? ' · ' + c.title : ''), true, grupoDe('conjuntos'));
    var acc = el('div', 'cab-acciones');
    var bb = el('button', 'borrar', 'Eliminar ' + id);
    bb.type = 'button';
    bb.addEventListener('click', function () {
      eliminarConjunto(c, cab, function () { irA('conjuntos', null); cambiado(); });
    });
    acc.appendChild(bb);
    cab.appendChild(acc);
    p.appendChild(cab);
    p.appendChild(pista('La ficha se organiza en niveles. El primero basta para que el conjunto quede constituido; los demás se despliegan cuando haya información que consignar, y no es necesario completarlos de una sola vez. El último, la estructura, es opcional y solo tiene sentido en conjuntos tabulares.'));

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
    cab.appendChild(el('span', 'flecha'));
    cab.appendChild(el('span', 'nivel-n', String(n.id)));
    cab.appendChild(el('span', 'nivel-t', n.titulo));
    /* La estructura es opcional, y decir «0 de 0» en un nivel que
       puede quedarse vacío con toda legitimidad solo produce alarma. */
    var rotulo = estado.hechos + ' de ' + estado.total;
    if (n.opcional) {
      rotulo = estado.total
        ? estado.total + (estado.total === 1 ? ' tabla' : ' tablas')
        : 'opcional';
    }
    var marca = el('span', 'nivel-estado' +
      (estado.total && estado.hechos === estado.total ? ' completo' : ''), rotulo);
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

    if (n.id === 5) { panelEstructura(cuerpo, c); }

    caja.appendChild(cuerpo);
    return caja;
  }

  /* ================= estructura de un conjunto tabular ================
     Se teclean las tablas y sus enlaces; el diagrama se dibuja solo a
     partir de ellos. */

  function panelEstructura(cuerpo, c) {
    if (!Array.isArray(c.x_tablas)) { c.x_tablas = []; }
    var tablas = c.x_tablas;

    if (!tablas.length) {
      var v = el('div', 'vacio');
      v.appendChild(el('p', null, 'Este conjunto todavía no describe su estructura. Es opcional: solo tiene sentido si es tabular y se quiere entrar en ese detalle.'));
      var fila0 = el('div', 'fila-botones');
      fila0.style.justifyContent = 'center';
      var b1 = el('button', null, 'Describir una tabla');
      b1.type = 'button';
      b1.addEventListener('click', function () {
        tablas.push(Modelo.tablaNueva(doc, c.title));
        cambiado(true);
      });
      var b2 = el('button', 'principal', 'Leer la cabecera de un CSV');
      b2.type = 'button';
      b2.addEventListener('click', function () { importarCabecera(c, null); });
      fila0.appendChild(b2); fila0.appendChild(b1);
      v.appendChild(fila0);
      cuerpo.appendChild(v);
      return;
    }

    tablas.forEach(function (t) { cuerpo.appendChild(cajaTabla(c, t)); });

    var fila = el('div', 'fila-botones');
    fila.style.marginTop = '10px';
    var mas = el('button', null, '+  Otra tabla');
    mas.type = 'button';
    mas.addEventListener('click', function () {
      tablas.push(Modelo.tablaNueva(doc, ''));
      cambiado(true);
    });
    fila.appendChild(mas);
    var csv = el('button', null, 'Leer la cabecera de un CSV');
    csv.type = 'button';
    csv.addEventListener('click', function () { importarCabecera(c, null); });
    fila.appendChild(csv);
    cuerpo.appendChild(fila);
  }

  function cajaTabla(c, t) {
    var caja = el('section', 'tabla-caja');

    var cab = el('div', 'tabla-cab');
    cab.appendChild(el('span', 'cod', t.id));
    var nom = el('input', 'tabla-nombre');
    nom.type = 'text';
    nom.value = t.nombre || '';
    nom.placeholder = 'Nombre de la tabla o del fichero';
    nom.setAttribute('aria-label', 'Nombre de la tabla ' + t.id);
    nom.addEventListener('input', function () { t.nombre = nom.value; cambiado(); });
    cab.appendChild(nom);
    var bq = el('button', 'borrar', 'Quitar');
    bq.type = 'button';
    bq.setAttribute('aria-label', 'Quitar la tabla ' + t.id);
    bq.addEventListener('click', function () {
      function hazlo() {
        var i = c.x_tablas.indexOf(t);
        if (i >= 0) { c.x_tablas.splice(i, 1); }
        /* y los enlaces que apuntaban a ella dejan de apuntar a nada */
        doc.dmp.dataset.forEach(function (o) {
          (o.x_tablas || []).forEach(function (u) {
            if (u.enlace && u.enlace.con === t.id) { u.enlace.con = ''; }
          });
        });
        cambiado(true);
      }
      if (!String(t.grano || '').trim() && !(t.columnas || []).length) { return hazlo(); }
      confirmar(caja, 'Se quitará la tabla ' + t.id +
        ((t.columnas || []).length ? ' y sus ' + t.columnas.length + ' columnas' : '') + '.',
        'Quitar ' + t.id, hazlo);
    });
    cab.appendChild(bq);
    caja.appendChild(cab);

    caja.appendChild(campoLibre('Qué representa una fila', 'text', t.grano,
      { req: 'obligatorio', clave: 'grano' + t.id,
        ejemplo: 'Un paciente y una visita',
        ayuda: 'La frase más útil de todo el apartado, y la que casi nunca está. Sin ella, quien reciba el fichero no sabe si tiene trescientos pacientes o mil doscientas visitas, y cualquier recuento que haga estará mal. Se escribe en singular: «un paciente», «un paciente y una visita», «una determinación».' },
      function (v) { t.grano = v; cambiado(); }));

    var d = el('div', 'campos dos');
    d.appendChild(campoLibre('Qué identifica la fila', 'text', t.clave,
      { req: 'recomendado', clave: 'clave' + t.id, ejemplo: 'id_sujeto + n_visita',
        ayuda: 'La columna o columnas cuya combinación no se repite. Si no hay ninguna, conviene decirlo: es un dato relevante sobre la calidad del conjunto.' },
      function (v) { t.clave = v; cambiado(); }));
    d.appendChild(enlaceTabla(t));
    caja.appendChild(d);

    caja.appendChild(columnasTabla(c, t));
    return caja;
  }

  /* El enlace con otra tabla: un desplegable con las demás tablas del
     plan y la columna por la que se unen. De aquí salen las flechas. */
  function enlaceTabla(t) {
    var otras = Modelo.tablasDelPlan(doc).filter(function (e) { return e.tabla.id !== t.id; });
    var d = base('Se une con', 'Por qué columna se enlaza con otra tabla, sea de este conjunto o de otro. Es lo único que hace falta para que el diagrama se dibuje solo. En la mayoría de los proyectos todo se une a la tabla de sujetos por el mismo código.',
      'enlace' + t.id, '');
    var caja = el('div', 'campos dos');

    var s = el('select');
    s.id = d._id;
    var vacia = el('option', null, '— con ninguna —');
    vacia.value = '';
    s.appendChild(vacia);
    otras.forEach(function (e) {
      var op = el('option', null, e.cod + ' · ' + (e.tabla.nombre || e.tabla.id));
      op.value = e.tabla.id;
      if (e.tabla.id === (t.enlace && t.enlace.con)) { op.selected = true; }
      s.appendChild(op);
    });
    s.addEventListener('change', function () {
      t.enlace = t.enlace || {};
      t.enlace.con = s.value;
      cambiado(true);
    });
    caja.appendChild(s);

    var i = el('input');
    i.type = 'text';
    i.value = (t.enlace && t.enlace.por) || '';
    i.placeholder = 'por la columna…';
    i.setAttribute('aria-label', 'Columna por la que se enlaza');
    i.addEventListener('input', function () {
      t.enlace = t.enlace || {};
      t.enlace.por = i.value;
      cambiado();
    });
    caja.appendChild(i);

    d.appendChild(caja);
    return conAyuda(d);
  }

  function columnasTabla(c, t) {
    if (!Array.isArray(t.columnas)) { t.columnas = []; }
    var caja = el('div', 'columnas-caja');

    var cab = el('div', 'columnas-cab');
    cab.appendChild(el('h4', null, t.columnas.length
      ? t.columnas.length + (t.columnas.length === 1 ? ' columna' : ' columnas')
      : 'Columnas'));
    cab.appendChild(el('span', 'hueco'));
    var bc = el('button', 'enlace', 'Leer de un CSV');
    bc.type = 'button';
    bc.addEventListener('click', function () { importarCabecera(c, t); });
    cab.appendChild(bc);
    var ba = el('button', 'enlace', '+ Añadir');
    ba.type = 'button';
    ba.addEventListener('click', function () {
      t.columnas.push(Modelo.columnaNueva());
      cambiado(true);
      var campos = document.querySelectorAll('#panel .columna-fila input');
      if (campos.length) { campos[campos.length - 3].focus(); }
    });
    cab.appendChild(ba);
    caja.appendChild(cab);

    if (!t.columnas.length) {
      caja.appendChild(el('p', 'menor', 'Sin columnas declaradas. Enumerarlas es opcional: el diccionario de variables vive fuera del plan, y aquí basta con las que haga falta entender para interpretar el conjunto.'));
      return caja;
    }

    var lista = el('div', 'columnas-lista');
    var enc = el('div', 'columna-fila encabezado');
    ['Columna', 'Tipo', 'Qué contiene, y en qué unidades o códigos', ''].forEach(function (x) {
      enc.appendChild(el('span', null, x));
    });
    lista.appendChild(enc);

    t.columnas.forEach(function (col, i) {
      var f = el('div', 'columna-fila');

      var n = el('input');
      n.type = 'text'; n.value = col.n || ''; n.placeholder = 'nombre';
      n.setAttribute('aria-label', 'Nombre de la columna ' + (i + 1));
      n.addEventListener('input', function () { col.n = n.value; cambiado(); });
      f.appendChild(n);

      var s = el('select');
      s.setAttribute('aria-label', 'Tipo de la columna ' + (i + 1));
      Modelo.TIPOS.forEach(function (o) {
        var op = el('option', null, o.t);
        op.value = o.v;
        if (o.v === col.tipo) { op.selected = true; }
        s.appendChild(op);
      });
      s.addEventListener('change', function () { col.tipo = s.value; cambiado(); });
      f.appendChild(s);

      var de = el('input');
      de.type = 'text'; de.value = col.d || '';
      de.placeholder = 'mg/dl · CIE-10 · 0 = no, 1 = sí';
      de.setAttribute('aria-label', 'Qué contiene la columna ' + (i + 1));
      de.addEventListener('input', function () { col.d = de.value; cambiado(); });
      f.appendChild(de);

      var x = el('button', 'quitar-col', '×');
      x.type = 'button';
      x.title = 'Quitar esta columna';
      x.setAttribute('aria-label', 'Quitar la columna ' + (col.n || i + 1));
      x.addEventListener('click', function () {
        t.columnas.splice(i, 1);
        cambiado(true);
      });
      f.appendChild(x);

      lista.appendChild(f);
    });
    caja.appendChild(lista);
    return caja;
  }

  /* --- leer la cabecera de un CSV --------------------------------------
     Se leen solo la primera línea, para los nombres, y una de muestra
     para adivinar el tipo. Ningún dato del fichero entra en el plan. */

  function separador(linea) {
    var candidatos = [',', ';', '\t', '|'];
    var mejor = ',', max = 0;
    candidatos.forEach(function (s) {
      var n = partirCSV(linea, s).length;
      if (n > max) { max = n; mejor = s; }
    });
    return mejor;
  }

  function partirCSV(linea, sep) {
    var salida = [], actual = '', comillas = false;
    for (var i = 0; i < linea.length; i++) {
      var ch = linea[i];
      if (ch === '"') {
        if (comillas && linea[i + 1] === '"') { actual += '"'; i++; }
        else { comillas = !comillas; }
      } else if (ch === sep && !comillas) {
        salida.push(actual); actual = '';
      } else { actual += ch; }
    }
    salida.push(actual);
    return salida;
  }

  function adivinarTipo(nombre, muestra) {
    var n = String(nombre || '').toLowerCase();
    var v = String(muestra == null ? '' : muestra).trim();
    if (/^(id|cod)|_(id|cod)$|codigo|nhc|identificador/.test(n)) { return 'id'; }
    if (/fecha|date|f_/.test(n) || /^\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v)) { return 'fecha'; }
    if (v && /^(0|1|s[ií]|no|true|false|v|f)$/i.test(v)) { return 'bin'; }
    if (v && /^-?\d+([.,]\d+)?$/.test(v)) { return 'num'; }
    if (v && v.length > 40) { return 'texto'; }
    return v ? 'cat' : '';
  }

  /* utf-8 si vale, y si no windows-1252, que es lo que sale de una
     exportación a CSV hecha desde una hoja de cálculo en español */
  function textoDe(bytes) {
    var t = new TextDecoder('utf-8').decode(bytes);
    if (t.indexOf('�') >= 0) {
      try { return new TextDecoder('windows-1252').decode(bytes); } catch (e) { /* nos quedamos con utf-8 */ }
    }
    return t;
  }

  function importarCabecera(c, tabla) {
    /* el campo tiene que estar en el documento: un input suelto no
       abre el diálogo del sistema dentro de la aplicación */
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.hidden = true;
    inp.accept = '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      setTimeout(function () { inp.remove(); }, 0);
      if (!f) { return; }
      var lector = new FileReader();
      lector.onload = function () {
        try {
          /* solo el principio del fichero: no hace falta más y evita
             cargar en memoria una extracción de varios cientos de MB */
          var trozo = new Uint8Array(lector.result).slice(0, 65536);
          var lineas = textoDe(trozo).split(/\r\n|\n|\r/).filter(function (l) { return l.trim(); });
          if (!lineas.length) { return decir('Ese fichero no tiene ninguna línea.', true); }
          var sep = separador(lineas[0]);
          var nombres = partirCSV(lineas[0], sep).map(function (s) {
            return s.trim().replace(/^"|"$/g, '');
          });
          if (nombres.length < 2 && !nombres[0]) { return decir('No se ha reconocido ninguna columna en la primera línea.', true); }
          var muestra = lineas[1] ? partirCSV(lineas[1], sep) : [];

          var t = tabla;
          if (!t) {
            if (!Array.isArray(c.x_tablas)) { c.x_tablas = []; }
            t = Modelo.tablaNueva(doc, f.name.replace(/\.[^.]+$/, ''));
            c.x_tablas.push(t);
          }
          t.columnas = nombres.map(function (n, i) {
            return { n: n, tipo: adivinarTipo(n, muestra[i]), d: '' };
          });
          cambiado(true);
          decir(nombres.length + ' columnas leídas de ' + f.name +
            '. Solo se han tomado los nombres y el tipo adivinado de una fila de muestra: ningún dato del fichero entra en el plan.');
        } catch (e) {
          decir('No se ha podido leer la cabecera: ' + (e.message || e), true);
        }
      };
      lector.onerror = function () { decir('No se ha podido leer ese fichero.', true); };
      lector.readAsArrayBuffer(f.slice(0, 65536));
    });
    inp.click();
  }

  /* --- el diagrama ------------------------------------------------------
     La disposición la calcula el modelo; aquí solo se dibuja. */

  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, atrib) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(atrib || {}).forEach(function (k) { n.setAttribute(k, atrib[k]); });
    return n;
  }
  function recortar(txt, max) {
    txt = String(txt || '');
    return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
  }

  function dibujoEsquema(esq) {
    var m = 10;
    var s = svg('svg', {
      viewBox: '0 0 ' + (esq.ancho + m * 2) + ' ' + (esq.alto + m * 2),
      width: '100%', height: Math.min(esq.alto + m * 2, 460),
      role: 'img', 'aria-label': 'Esquema de las tablas del plan y sus enlaces'
    });
    s.setAttribute('preserveAspectRatio', 'xMidYMin meet');

    esq.aristas.forEach(function (a) {
      var g = svg('g', { class: 'arista' });
      g.appendChild(svg('line', { x1: a.x1 + m, y1: a.y1 + m, x2: a.x2 + m, y2: a.y2 + m }));
      /* la punta de flecha, orientada según de dónde venga */
      var dx = a.x2 > a.x1 ? -1 : 1;
      g.appendChild(svg('polygon', {
        points: [(a.x2 + m) + ',' + (a.y2 + m),
          (a.x2 + m + dx * 7) + ',' + (a.y2 + m - 3.2),
          (a.x2 + m + dx * 7) + ',' + (a.y2 + m + 3.2)].join(' ')
      }));
      if (a.texto) {
        var tx = (a.x1 + a.x2) / 2 + m, ty = (a.y1 + a.y2) / 2 + m;
        var et = recortar(a.texto, 16);
        g.appendChild(svg('rect', {
          x: tx - et.length * 2.5 - 3, y: ty - 11, rx: 3,
          width: et.length * 5 + 6, height: 11, class: 'et-fondo'
        }));
        var tt = svg('text', { x: tx, y: ty - 2.5, 'text-anchor': 'middle', class: 'et' });
        tt.textContent = et;
        g.appendChild(tt);
      }
      s.appendChild(g);
    });

    esq.nodos.forEach(function (n) {
      var g = svg('g', { class: 'nodo', tabindex: '0', role: 'button' });
      var x = n.x + m, yy = n.y + m;

      /* la caja va recortada por su propio contorno redondeado, que es
         lo que deja la banda de la cabecera con las esquinas de arriba
         redondeadas y las de abajo rectas */
      var idc = 'caja-' + n.id + '-' + Math.random().toString(36).slice(2, 7);
      var clip = svg('clipPath', { id: idc });
      clip.appendChild(svg('rect', { x: x, y: yy, width: n.w, height: n.h, rx: 5 }));
      g.appendChild(clip);
      var dentro = svg('g', { 'clip-path': 'url(#' + idc + ')' });
      dentro.appendChild(svg('rect', { x: x, y: yy, width: n.w, height: n.h, class: 'cuerpo' }));
      dentro.appendChild(svg('rect', { x: x, y: yy, width: n.w, height: 19, class: 'banda' }));
      g.appendChild(dentro);

      var cod = svg('text', { x: x + 9, y: yy + 13, class: 'cod' });
      cod.textContent = n.cod;
      g.appendChild(cod);
      var nom = svg('text', { x: x + 9 + n.cod.length * 6.2 + 6, y: yy + 13, class: 'nom' });
      nom.textContent = recortar(n.nombre, 17);
      g.appendChild(nom);
      n.granoLineas.forEach(function (ln, k) {
        var gr = svg('text', { x: x + 9, y: yy + 32 + k * 10,
          class: 'gr' + (n.grano ? '' : ' falta') });
        gr.textContent = ln;
        g.appendChild(gr);
      });
      var nc = svg('text', { x: n.x + m + 9, y: n.y + m + 52, class: 'nc' });
      nc.textContent = n.columnas ? n.columnas + (n.columnas === 1 ? ' columna' : ' columnas') : 'sin columnas';
      g.appendChild(nc);

      var ir = function () {
        niveles[5] = true;
        irA('conjuntos', n.cod);
      };
      g.addEventListener('click', ir);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); }
      });
      g.appendChild(svg('rect', { x: x, y: yy, width: n.w, height: n.h, rx: 5, class: 'marco' }));
      var titulo = svg('title');
      titulo.textContent = n.cod + ' · ' + n.nombre + (n.clave ? ' · identificada por ' + n.clave : '');
      g.appendChild(titulo);
      s.appendChild(g);
    });

    var caja = el('div', 'esquema');
    caja.appendChild(s);
    return caja;
  }

  function bloqueEsquema() {
    var esq = Modelo.esquema(doc);
    if (!esq.nodos.length) { return null; }
    var d = el('section', 'grupo-campos');
    d.appendChild(el('h3', null, 'Esquema de los datos'));
    d.appendChild(pista(esq.aristas.length
      ? 'Se dibuja solo con lo que se escribe en la estructura de cada conjunto. Las flechas son los enlaces declarados, y la etiqueta, la columna por la que se unen.'
      : 'Se dibuja solo con lo que se escribe en la estructura de cada conjunto. Todavía no hay ningún enlace declarado: se indican en «Se une con», dentro de cada tabla.'));
    d.appendChild(dibujoEsquema(esq));
    return d;
  }

  /* --- revisión y exportación ------------------------------------------ */
  function panelRevision(p) {
    var leg = el('div', 'leyenda');
    var l1 = el('span'); l1.appendChild(el('i','obl')); l1.appendChild(document.createTextNode('Sin ello el apartado no dice nada'));
    var l2 = el('span'); l2.appendChild(el('i','rec')); l2.appendChild(document.createTextNode('Recomendado'));
    leg.appendChild(l1); leg.appendChild(l2);
    leg.appendChild(el('span', null, 'Las marcas aparecen junto al campo, en su apartado.'));
    p.appendChild(leg);

    p.appendChild(destacado('El criterio de suficiencia',
      'Un párrafo del plan está bien si un tercero puede comprobar que se cumple. Si nadie ajeno al proyecto puede verificar lo que dice, el párrafo no compromete a nada y sobra. Es la única regla que hace falta, y se aplica frase a frase.'));
    p.appendChild(pista('Estas comprobaciones no impiden exportar: un plan con huecos declarados es mejor que uno que los tapa con frases genéricas.'));

    var avisos = Modelo.comprobar(doc);
    if (!avisos.length) {
      var ok = el('div', 'todo-bien');
      ok.appendChild(el('strong', null, 'Lo que el editor sabe comprobar está resuelto.'));
      ok.appendChild(document.createTextNode(' Eso no quiere decir que el plan esté bien: ninguna comprobación automática puede juzgar si lo escrito se puede verificar desde fuera. Esa lectura sigue haciendo falta.'));
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
    acc.appendChild(el('p', 'menor', 'El PDF sigue la plantilla de plan de gestión de datos de Horizon Europe, con sus indicaciones literales encima de cada respuesta. Es un documento normal y lleva el plan dentro: para seguir otro día basta con arrastrarlo sobre esta ventana.'));

    /* La versión es una decisión de quien exporta, así que se toma
       aquí y no al guardar: si el cambio obliga a avisar a alguien,
       sube el primer número; si no, el segundo. */
    var ver = el('div', 'version-caja');
    ver.appendChild(el('p', 'et', 'Versión'));
    var fv = el('div', 'fila-botones');
    var va = el('span', 'version-actual' + (doc.x_pgd.estado === 'cerrada' ? ' cerrada' : ''),
      'v' + doc.x_pgd.version + (doc.x_pgd.estado === 'cerrada' ? ' · cerrada' : ' · borrador'));
    fv.appendChild(va);
    var bmen = el('button', null, '→ v' + Modelo.subirVersion(doc.x_pgd.version, false));
    bmen.type = 'button';
    bmen.title = 'Se ha rellenado un hueco o precisado una cifra, pero ninguna decisión cambia';
    bmen.addEventListener('click', function () {
      doc.x_pgd.version = Modelo.subirVersion(doc.x_pgd.version, false);
      doc.x_pgd.fecha_version = Modelo.hoy();
      doc.x_pgd.estado = 'abierta';
      doc.x_pgd.sello = '';
      cambiado(true);
    });
    fv.appendChild(bmen);
    var bmay = el('button', null, '→ v' + Modelo.subirVersion(doc.x_pgd.version, true));
    bmay.type = 'button';
    bmay.title = 'Cambia una decisión ya comunicada: hay que avisar al comité, al financiador o a los socios';
    bmay.addEventListener('click', function () {
      doc.x_pgd.version = Modelo.subirVersion(doc.x_pgd.version, true);
      doc.x_pgd.fecha_version = Modelo.hoy();
      doc.x_pgd.estado = 'abierta';
      doc.x_pgd.sello = '';
      cambiado(true);
    });
    fv.appendChild(bmay);
    ver.appendChild(fv);
    ver.appendChild(el('p', 'menor',
      'Si el cambio obliga a avisar a alguien —al comité, al financiador, a los socios— sube el primer número. Si no, el segundo.'));
    if (doc.x_pgd.minima) {
      ver.appendChild(el('p', 'menor',
        'La versión ' + doc.x_pgd.minima + ' ya se cerró, de modo que el número solo puede subir a partir de ahí.'));
    }
    acc.appendChild(ver);

    var fila = el('div', 'fila-botones');
    var bbor = el('button', 'principal', 'PDF · borrador');
    bbor.type = 'button';
    bbor.title = 'La versión queda abierta: se puede volver a exportar con el mismo número';
    bbor.addEventListener('click', function () { exportarPDF('ec', false); });
    fila.appendChild(bbor);

    var bcer = el('button', null, 'PDF · versión cerrada');
    bcer.type = 'button';
    bcer.title = 'Se entrega. A partir de ahí el número solo puede subir';
    bcer.addEventListener('click', function () { exportarPDF('ec', true); });
    fila.appendChild(bcer);

    var bj = el('button', null, 'Guardar como JSON (RDA)');
    bj.type = 'button';
    bj.addEventListener('click', function () {
      guardar(new TextEncoder().encode(Modelo.aJSON(doc)), nombreFichero('json'),
        'json', 'Fichero JSON', 'application/json').then(function (ruta) {
          if (ruta === null && window.__TAURI__) { return; }
          decir('JSON guardado' + (ruta ? ' en ' + soloNombre(ruta) : '') + ', conforme al modelo RDA.');
        });
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
      confirmar(acc, 'Se descartará el plan que hay ahora y se empezará uno vacío.',
        'Empezar de nuevo', function () {
          doc = Modelo.documentoNuevo();
          irA('portada', null);
          guardarBorrador();
          decir('Plan nuevo.');
        });
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

  /* Un campo vacío sin el que el apartado no dice nada se marca en
     rojizo; uno recomendado, en gris. Un punto junto a la etiqueta y
     una línea en el borde: suficiente para verlo de un vistazo,
     discreto para no convertir un formulario a medias en una pantalla
     de errores. */
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

  /* Guardar un fichero.

     Dentro de la aplicación de escritorio se usa el diálogo del
     sistema, que es lo que permite elegir carpeta y nombre. La página
     abierta en un navegador no puede hacerlo, y ahí se cae a la
     descarga de siempre. Devuelve la ruta elegida, o nada si se
     cancela; en el navegador, nada. */
  async function guardar(bytes, nombre, extension, descripcion, tipo) {
    var T = window.__TAURI__;
    if (T && T.core && T.core.invoke) {
      return await T.core.invoke('guardar_como', {
        nombre: nombre,
        extension: extension,
        descripcion: descripcion,
        datos: Array.from(new Uint8Array(bytes))
      });
    }
    var url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
    var a = el('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    return null;
  }

  /* Solo el nombre del fichero, para el mensaje de confirmación. */
  function soloNombre(ruta) {
    return String(ruta || '').split(/[\\/]/).pop();
  }

  function nombreFichero(ext, formato) {
    var b = (doc.dmp.title || 'plan-gestion-datos').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'plan';
    return b + '_v' + (doc.x_pgd.version || '1.0') +
      (doc.x_pgd.estado === 'cerrada' ? '' : '_borrador') +
      '_' + (doc.x_pgd.fecha_version || Modelo.hoy()) + '.' + ext;
  }

  async function exportarPDF(formato, cerrar) {
    var permiso = Modelo.puedeExportar(doc);
    if (!permiso.ok) { return decir(permiso.motivo, true); }
    try {
      doc.x_pgd.fecha_version = doc.x_pgd.fecha_version || Modelo.hoy();
      /* El sello se calcula sobre el documento tal como se va a
         imprimir, pero solo se fija si el guardado llega a ocurrir:
         cancelar el diálogo no debe cerrar la versión. */
      var copia = Modelo.desdeJSON(Modelo.aJSON(doc));
      if (cerrar) { Modelo.sellar(copia); } else { copia.x_pgd.estado = 'abierta'; }
      var bytes = await PDF.exportar(copia, { formato: formato });
      var ruta = await guardar(bytes, nombreFichero('pdf'), 'pdf',
        'Documento PDF', 'application/pdf');
      if (ruta === null && window.__TAURI__) {
        /* se canceló el diálogo: el documento no se toca */
        return;
      }
      if (cerrar) { Modelo.sellar(doc); }
      cambiado(true);
      decir(cerrar
        ? 'Versión ' + doc.x_pgd.version + ' cerrada' + (ruta ? ' en ' + soloNombre(ruta) : '') +
          '. Para seguir trabajando hay que subir el número.'
        : 'Borrador guardado' + (ruta ? ' en ' + soloNombre(ruta) : '') +
          '. Lleva el plan dentro: para seguir otro día, arrástrelo sobre esta ventana.');
    } catch (e) {
      console.error(e);
      decir('No se ha podido generar el PDF: ' + (e.message || e), true);
    }
  }

  function cargarFichero(file) {
    var lector = new FileReader();
    var esPDF = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    lector.onload = function () {
      try {
        doc = esPDF ? PDF.importar(lector.result)
                    : Modelo.desdeJSON(new TextDecoder('utf-8').decode(new Uint8Array(lector.result)));

        var sello = Modelo.selloCorrecto(doc);
        var cerrada = doc.x_pgd.estado === 'cerrada';
        if (cerrada) { doc.x_pgd.minima = doc.x_pgd.version; }

        irA('portada', null);
        guardarBorrador();

        if (sello === false) {
          decir('Atención: el contenido de este plan no coincide con su sello. Se ha modificado fuera del editor después de cerrarlo.', true);
        } else if (cerrada) {
          decir('Plan recuperado: ' + (doc.dmp.title || 'sin título') + ' · ' +
                doc.dmp.dataset.length + ' conjuntos. La versión ' + doc.x_pgd.version +
                ' está cerrada: para exportar de nuevo hay que subir el número.');
        } else {
          decir('Plan recuperado: ' + (doc.dmp.title || 'sin título') +
                ' · borrador de la versión ' + doc.x_pgd.version + ' · ' +
                doc.dmp.dataset.length + ' conjuntos');
        }
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
    $('#b-ejemplo').addEventListener('click', function () {
      function cargar() {
        doc = Modelo.desdeJSON(JSON.stringify(window.EJEMPLO));
        irA('conjuntos', null);
        guardarBorrador();
        decir('Ejemplo cargado: PREVIA, con sus siete conjuntos de datos.');
      }
      if (!doc.dmp.title && !doc.dmp.dataset.length) { return cargar(); }
      confirmar($('#panel'), 'Se descartará el plan que hay ahora y se cargará el plan de ejemplo.',
        'Cargar el ejemplo', cargar);
    });

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
