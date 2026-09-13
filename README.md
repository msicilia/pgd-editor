# Editor de planes de gestión de datos

Redacta un plan de gestión de datos y lo exporta al formato de la Comisión
Europea, con el propio plan incorporado dentro del PDF para poder retomarlo.

Los once apartados tienen campos, y los conjuntos tabulares pueden describir
además su estructura.

## Probarla ahora mismo

```
open src/index.html
```

Funciona con doble clic, sin instalar nada y sin conexión.

> Si el navegador bloquea algo al abrir desde `file://`, se sirve en local con
> `npm run web` y se abre `http://localhost:8080`.

## Cómo está pensada

**Índice a la izquierda, una sección a la vez a la derecha.** Siempre abierto,
sin plegar: nada queda escondido tras un triángulo. Los apartados se agrupan por
la pregunta que responden —*qué datos hay*, *dónde viven*, *con quién*— y cada
uno lleva un punto de estado.

**El orden es el de las decisiones, no el de las letras FAIR**: nadie se sienta
a decidir «cómo hago mis datos interoperables», sino qué formato usa y con qué
codifica los diagnósticos. La estructura de la Comisión Europea se obtiene al
exportar.

**Cada grupo del índice lleva un tono**, y ese mismo color aparece en el filo
del apartado seleccionado y en la banda que encabeza el panel. Es lo único que
dice, sin leer nada, en qué parte del documento se está trabajando; el resto de
la pantalla es gris, y el verde sigue significando «esto se puede pulsar».

**Fondo oscuro y letra blanca en lo que es estructura**: la cabecera del
apartado, los rótulos de grupo, las cabeceras de tabla y la de cada caja del
diagrama. Separa de un vistazo el armazón del documento de lo que se escribe
dentro, y vale igual en la pantalla y en el PDF.

**No hay botón de guardar.** Se guarda solo mientras se escribe. El botón que sí
existe es *exportar*, porque exportar sí es una decisión que toma una persona.

**Lo que falta sale donde se arregla**, al pie de cada apartado, y agrupado en
la sección final de revisión. Nunca como una pantalla de errores al final.

**La columna de lectura la fija el relleno del panel**, no un margen automático
en cada bloque: cualquier regla con `margin` abreviado lo anula sin avisar, y
eso es lo que dejaba unos bloques centrados y otros pegados al borde.

## Lo que se decide por conjunto, y por qué importa

Cuatro apartados —documentación, almacenamiento, conservación y compartición— no
son del proyecto: son **de cada conjunto**. Es la razón de que el modelo RDA sea
*dataset*-céntrico, con sus `distribution`, `metadata` y `security_and_privacy`
colgando de cada uno.

Cada uno de esos apartados tiene la misma forma: los campos de proyecto arriba,
después **una tabla que pone a todos los conjuntos juntos**, y debajo un bloque
plegable por conjunto para rellenarlos.

La tabla no es decoración: las columnas no coinciden —en PREVIA, CD2 no se
comparte y CD7 es abierto—, y eso solo se ve poniéndolas una al lado de otra.
Un formulario por conjunto lo escondería.

Los apartados que no se deciden por conjunto —muestras biológicas, otros
resultados— tienen solo la parte de proyecto, y en muestras la primera
pregunta apaga las demás: un proyecto que no maneja ninguna lo declara y el
apartado queda resuelto.

## La estructura, sin dibujar nada

Un conjunto tabular puede describir sus tablas: **qué representa una fila**, qué
la identifica y por qué columna se une con otra. Es opcional, y en los
conjuntos que no son tabulares sobra.

**No hay editor de diagramas, y es deliberado.** Colocar cajas con el ratón no
añade una sola cosa que el plan necesite saber: lo que hace falta es la frase
del grano, y eso se teclea en un minuto. El diagrama se dibuja solo a partir de
los enlaces declarados, en la pantalla y en el PDF. `Modelo.esquema()` calcula
una única disposición que usan los dos dibujantes, de modo que no pueden
discrepar.

La frase del grano es la que casi nunca está y la que más se echa de menos: sin
ella, quien reciba el fichero no sabe si tiene trescientos pacientes o mil
doscientas visitas, y cualquier recuento que haga estará mal.

**La cabecera de un CSV se puede leer**, y es lo que evita teclear sesenta
nombres a mano —que es la razón real de que este apartado no se rellene nunca—.
Se leen solo los primeros 64 KB: la primera línea da los nombres y la segunda
sirve para adivinar el tipo. Ningún dato del fichero entra en el plan ni sale
del ordenador.

## La ficha de un conjunto, por niveles

La ficha tiene catorce campos, y pedirlos de golpe la primera vez es la forma
más segura de que no se rellene ninguno. Van por niveles, y cada uno dice
*3 de 4* con el nivel cerrado:

| | Nivel | Qué contiene |
|---|---|---|
| 1 | Lo esencial | Nombre, qué contiene, datos de personas, categoría especial |
| 2 | De dónde sale y qué forma tiene | Origen, sistema, formato, volumen |
| 3 | Identificabilidad | Nivel, identificabilidad intrínseca, custodia de la clave |
| 4 | Para quién sirve | Palabras clave, calidad, utilidad fuera del proyecto, responsable |
| 5 | Estructura | Opcional: tablas, grano, clave, enlaces y columnas |

La ficha describe **qué es** el conjunto. **Qué se hace con él** se decide en los
apartados 7, 8 y 9, por lo dicho arriba.

## Lo que la aplicación comprueba

Las comprobaciones que cruzan apartados son las que de verdad valen: cada
apartado por separado puede parecer correcto y contradecir al de al lado.

- Un conjunto **abierto** que sigue siendo dato personal: o se anonimiza de
  verdad, o el destino es acceso controlado.
- Un conjunto de **origen asistencial** amparado en el consentimiento del
  proyecto, que rara vez lo cubre.
- Un conjunto con datos personales **sin base legal** declarada.
- Las palabras que no comprometen a nada —*adecuado*, *apropiado*,
  *pertinente*, *vigente*, *necesario*, *periódico*— allí donde aparecen.

Y al escribir: marcar un conjunto como **anónimo** recuerda que si existe la
clave en algún sitio es seudonimizado; marcarlo **no personal**, que agregar no
es un peldaño de la escala y hay que decir qué se comprobó; marcarlo **no se
comparte**, pregunta si no hay una versión que sí.

## El PDF es el formato de archivo

Al exportar sale un PDF normal, legible por cualquiera, que **lleva el plan
dentro**. Para retomarlo otro día basta con arrastrarlo sobre la ventana: la
aplicación no lee el texto impreso —eso se rompería en cuanto se cambiara una
etiqueta—, sino que extrae el modelo exacto.

Va por duplicado a propósito:

| Dónde | Para qué |
|---|---|
| Adjunto del PDF, `plan-gestion-datos.json` | Es la forma estándar. Quien abra el PDF en Acrobat lo ve en el panel de adjuntos y puede sacarlo sin esta aplicación |
| En base64 en el diccionario de información, entre dos marcas | Va **sin comprimir**, y es la copia que se lee al reimportar. No depende de cómo una versión concreta de la biblioteca serialice los adjuntos |

Se usa base64 porque su alfabeto no contiene paréntesis ni barras invertidas,
que son los caracteres que el formato PDF trata de forma especial. Así el plan
sobrevive intacto sea cual sea su contenido.

Un PDF que no venga de este editor se rechaza con un mensaje que lo explica.

## El modelo

El centro es el **RDA DMP Common Standard**: un objeto `dmp` con su contacto, su
proyecto y una lista de `dataset`. Lo que el estándar no cubre vive en `x_pgd`,
con prefijo, para que el JSON siga siendo reconocible por cualquier herramienta
que hable RDA.

De los campos que el estándar marca como obligatorios en un `dataset`, la
aplicación pide los cuatro: identificador, título, si contiene datos personales
y si contiene datos sensibles. Los dos últimos admiten «todavía no lo sé», que
es un valor del propio estándar y una respuesta legítima mientras no se haya
averiguado.

Los identificadores `CD1`, `CD2`… se asignan solos y **no se reutilizan** aunque
se borre uno por el medio, porque son los que después sirven para referirse al
conjunto en todo el documento.

## Ficheros

```
src/
  index.html     la pantalla
  app.css        el tema, claro y oscuro, con un tono por grupo del índice
  modelo.js      el modelo RDA, los identificadores y las comprobaciones
  pdf.js         exportar a PDF e importar de vuelta
  app.js         la aplicación
  vendor/        pdf-lib (MIT), incorporado para funcionar sin conexión
src-tauri/       el envoltorio de escritorio
```

## La versión de escritorio

Compilada y probada con Tauri 2 sobre `aarch64-apple-darwin`. La aplicación
resultante ocupa **4,3 MB** y arranca en unos 108 MB de memoria residente. Para
comparar: el mismo programa con Electron rondaría los 120 MB solo de descarga.

```
npm install
npm run dev      # desarrollo, con recarga
npm run build    # compila y empaqueta
```

El binario queda en `src-tauri/target/release/bundle/macos/`.

Dos cosas que conviene saber:

**El DMG no se genera en un entorno sin sesión gráfica.** `bundle_dmg.sh` usa
Finder por AppleScript para colocar la ventana del disco. La `.app` sí se
construye correctamente; el DMG hay que generarlo desde una sesión de escritorio.

**`dragDropEnabled` está en `false` a propósito.** Tauri intercepta por su
cuenta el arrastrar y soltar nativo, y eso impediría que funcionara el de la
propia página, que es como se reabre un plan.

Los iconos de `src-tauri/icons/` se regeneran con
`npx tauri icon ruta/al/logo.png`. Los que hay ahora son un marcador de
posición y conviene sustituirlos.

Para distribuir fuera de la máquina donde se compila hace falta además firmar y
notarizar, que requiere cuenta de desarrollador de Apple. Mientras eso no esté,
la vía de reparto es la carpeta `src/` abierta con doble clic.

## El volcado a la plantilla europea

`src/preguntas-ec.js` **se genera leyendo el DOCX oficial de la Comisión**, no
se transcribe. Son 42 indicaciones con identificador estable, y el exportador
las recorre imprimiendo debajo lo que el plan responde. Las 42 tienen
respuesta; si la Comisión revisa la plantilla, se vuelve a generar el fichero y
se ve enseguida qué identificadores han cambiado.

Los apartados se citan **por su título y nunca por su número**, porque la
Comisión los renumera al revisar la plantilla.

## Lo que falta, por orden de utilidad

1. **Más comprobaciones cruzadas**: plazos de conservación incompatibles entre
   conjuntos que se unen, repositorios que no admiten lo que se les promete.
2. **Otras plantillas**, si hacen falta: un exportador y un fichero de
   correspondencias por cada una.
3. **Enlaces múltiples** por tabla: ahora cada una declara uno, que es lo que
   cubre el caso normal —todo se une a la tabla de sujetos por el mismo código—.

La regla que conviene no romper: cada plantilla nueva es **un exportador y un
fichero de correspondencias**. Si un campo propio de una plantilla concreta
entra en el modelo, el diseño se pierde a la tercera plantilla.

## Compilación automática

`.github/workflows/build.yml` compila en cuatro combinaciones cada vez que se
empuja algo: **macOS Apple Silicon**, **macOS Intel**, **Linux** y **Windows**.

| Qué ocurre | Resultado |
|---|---|
| Empujón a `main`, o propuesta de cambio | Se compila en las cuatro y los instaladores quedan como adjuntos de la ejecución, catorce días |
| Etiqueta `v1.2.3` | Lo mismo, y además se prepara un **borrador de publicación** con los instaladores adjuntos, para revisarlo antes de hacerlo público |

Para publicar una versión:

```
npm version 1.2.3 --no-git-tag-version   # y la misma en src-tauri/tauri.conf.json
git commit -am "Versión 1.2.3"
git tag v1.2.3
git push && git push --tags
```

No hacen falta secretos: `GITHUB_TOKEN` lo pone GitHub solo.

### Lo que no hace la compilación automática

**Firmar.** Los binarios salen sin firmar, así que macOS pedirá abrirlos la
primera vez con el botón derecho y «Abrir», y Windows mostrará el aviso de
SmartScreen. Firmar de verdad requiere cuenta de desarrollador de Apple y un
certificado de firma para Windows; cuando existan, se añaden como secretos del
repositorio y `tauri-action` los usa sin más cambios.

**Actualización automática.** Tauri la soporta, pero necesita firma. Mientras
tanto, cada versión se descarga a mano.
