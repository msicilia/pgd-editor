# Editor de planes de gestión de datos · maqueta

Maqueta de trabajo del editor de PGD que acompañaría al curso C1. Cubre, a
propósito, solo dos cosas: **la información de identificación** y **la lista de
conjuntos de datos con su descripción**. La estructura de los conjuntos —qué
tablas hay, qué representa una fila, cómo se enlazan— queda deliberadamente
fuera de esta versión.

## Probarla ahora mismo

```
open src/index.html
```

Funciona con doble clic, sin instalar nada y sin conexión. Es la misma forma de
distribución que el ZIP de revisión del curso.

> Si el navegador bloquea algo al abrir desde `file://`, se sirve en local con
> `npm run web` y se abre `http://localhost:8080`.

## Cómo está pensada

**Una sola pantalla.** Sin asistente por pasos y sin diálogos: el documento
entero se ve y se toca desde el mismo sitio.

**No hay botón de guardar.** Se guarda solo mientras se escribe. El botón que sí
existe es *exportar*, porque exportar sí es una decisión que toma una persona.

**Lo que falta se ve siempre**, en la columna de la derecha, mientras se
escribe. Nunca como una pantalla de errores al final. Son las comprobaciones
automatizables de la lista del curso, con las que esta maqueta puede aplicar.

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

1. **Los campos restantes de la ficha por conjunto**: origen, formato y volumen,
   identificabilidad y custodia de la clave, responsable con nombre, destino.
2. **Exportar al formato de la Comisión Europea**, respondiendo a sus apartados
   por título. Un exportador por plantilla, sin tocar el modelo.
3. **Las comprobaciones completas** de la lista del curso, incluidas las que
   cruzan apartados —que lo prometido en compartición sea compatible con lo
   declarado en el marco legal—.
4. **Estructura y granularidad**, que es lo que esta versión deja fuera.

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
