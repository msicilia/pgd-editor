# Editor de planes de gestión de datos · maqueta

Maqueta de trabajo del editor de PGD que acompaña al curso C1.

Cubre los apartados 0, 1, 2, 5, 7, 8 y 9 de la plantilla del curso. Quedan
pendientes los de muestras biológicas, otros resultados, marco legal y
responsabilidades, que están en el índice y explican qué irá en ellos. La
**estructura de los conjuntos** —qué tablas hay, qué representa una fila, cómo
se enlazan— queda deliberadamente fuera por ahora.

## Probarla ahora mismo

```
open src/index.html
```

Funciona con doble clic, sin instalar nada y sin conexión. Es la misma forma de
distribución que el ZIP de revisión del curso.

> Si el navegador bloquea algo al abrir desde `file://`, se sirve en local con
> `npm run web` y se abre `http://localhost:8080`.

## Cómo está pensada

**Índice a la izquierda, una sección a la vez a la derecha.** Siempre abierto,
sin plegar: nada queda escondido tras un triángulo. Los apartados se agrupan por
la pregunta que responden —*qué datos hay*, *dónde viven*, *con quién*— y cada
uno lleva un punto de estado.

**El orden es el de las decisiones, no el de las letras FAIR**, igual que la
plantilla del curso y por el mismo motivo que argumenta D8·01: nadie se sienta a
decidir «cómo hago mis datos interoperables», sino qué formato usa y con qué
codifica los diagnósticos. La estructura de la Comisión Europea se obtendrá al
exportar.

**No hay botón de guardar.** Se guarda solo mientras se escribe. El botón que sí
existe es *exportar*, porque exportar sí es una decisión que toma una persona.

**Lo que falta sale donde se arregla**, al pie de cada apartado, y agrupado en
la sección final de revisión. Nunca como una pantalla de errores al final.

## Lo que se decide por conjunto, y por qué importa

Cuatro apartados —documentación, almacenamiento, conservación y compartición— no
son del proyecto: son **de cada conjunto**. Es la razón de que el modelo RDA sea
*dataset*-céntrico, con sus `distribution`, `metadata` y `security_and_privacy`
colgando de cada uno.

Cada uno de esos apartados tiene la misma forma: los campos de proyecto arriba,
después **una tabla que pone a todos los conjuntos juntos**, y debajo un bloque
plegable por conjunto para rellenarlos.

La tabla no es decoración. La tesis del curso es que las columnas no coinciden
—en PREVIA, CD2 no se comparte y CD7 es abierto—, y eso solo se ve poniéndolas
una al lado de otra. Un formulario por conjunto lo escondería.

## La ficha de un conjunto, por niveles

La ficha tiene catorce campos, y pedirlos de golpe la primera vez es la forma
más segura de que no se rellene ninguno. Van en cuatro niveles, y cada uno dice
*3 de 4* con el nivel cerrado:

| | Nivel | Qué contiene |
|---|---|---|
| 1 | Lo esencial | Nombre, qué contiene, datos de personas, categoría especial |
| 2 | De dónde sale y qué forma tiene | Origen, sistema, formato, volumen |
| 3 | Identificabilidad | Nivel, identificabilidad intrínseca, custodia de la clave |
| 4 | Para quién sirve | Palabras clave, calidad, utilidad fuera del proyecto, responsable |

La ficha describe **qué es** el conjunto. **Qué se hace con él** se decide en los
apartados 7, 8 y 9, por lo dicho arriba.

## Coherencia con el curso

No es un adorno: si la app y el curso dicen cosas distintas, el curso pierde.

- Cada apartado remite a la unidad didáctica que lo explica.
- Las palabras son las del curso: *conjunto de datos*, no *dataset*; la escala de
  identificabilidad de D6·02; los tres destinos de D13·01, que son los tres
  valores de `data_access` del estándar.
- Las palabras que el criterio de suficiencia persigue —*adecuado*, *apropiado*,
  *pertinente*, *vigente*, *necesario*, *periódico*— son las mismas que enumera
  D15·03.
- Al marcar un conjunto como **anónimo**, la app recuerda que si existe la clave
  en algún sitio es seudonimizado. Al marcarlo **no personal**, que agregar no es
  un peldaño de la escala y hay que decir qué se comprobó. Al marcarlo **no se
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
maqueta ya pide los cuatro: identificador, título, si contiene datos personales
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
  app.css        un tema, claro y oscuro, con los tokens del curso
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
la vía de reparto es la misma que la del curso: la carpeta `src/` abierta con
doble clic.

## Lo que falta, por orden de utilidad

1. **Exportar al formato de la Comisión Europea**, respondiendo a sus apartados
   por título y no por número, porque la Comisión los renumera al revisar la
   plantilla. Un exportador por plantilla, sin tocar el modelo.
2. **Los cuatro apartados que quedan**: muestras biológicas, otros resultados,
   marco legal y responsabilidades. El legal es mixto, como los cuatro de arriba.
3. **Las comprobaciones que cruzan apartados**, que son las que más valen: que lo
   prometido en compartición sea compatible con lo declarado en el marco legal.
4. **El PDF con los apartados nuevos**: ahora solo imprime identificación,
   resumen y conjuntos.
5. **Estructura y granularidad**, que es lo que esta versión deja fuera.

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
