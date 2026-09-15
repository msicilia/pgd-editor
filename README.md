# Editor de planes de gestión de datos

Aplicación de escritorio para redactar el plan de gestión de datos de un
proyecto de investigación y exportarlo al formato de plan de gestión de datos
de Horizon Europe.

El PDF que produce lleva el plan incorporado dentro, de modo que para retomarlo
otro día basta con arrastrar ese mismo PDF sobre la ventana.

## Instalación

Los instaladores están en la página de **[publicaciones](../../releases)**.
Descargue el que corresponda a su sistema:

| Sistema | Fichero |
|---|---|
| Windows | `.msi` |
| macOS con Apple Silicon | `.dmg` de `aarch64` |
| macOS con procesador Intel | `.dmg` de `x64` |
| Linux | `.AppImage` o `.deb` |

Los instaladores no están firmados, así que el sistema avisará la primera vez:

- **Windows** muestra un aviso de SmartScreen. Se continúa con «Más
  información» → «Ejecutar de todas formas».
- **macOS** no deja abrirla con doble clic. Hay que pulsar sobre la aplicación
  con el botón derecho y elegir «Abrir», solo la primera vez.

Firmar los instaladores requiere certificados de Apple y de Windows. Mientras
no los haya, esos avisos son inevitables.

## Cómo se usa

**El índice de la izquierda son los apartados del plan**, y a la derecha se
trabaja en uno cada vez. Cada apartado lleva un punto que indica si está sin
empezar, a medias o completo.

**No hay botón de guardar**: lo que se escribe se guarda solo. El botón que sí
existe es *Exportar*, porque exportar es una decisión.

**El botón Ejemplo** carga un plan completo de un estudio ficticio. Es la forma
más rápida de ver cómo queda un plan terminado y cómo sale el PDF. Mientras el
ejemplo está cargado, una franja lo recuerda en cada apartado y ofrece dos
salidas: **usarlo como base** y sustituir los datos por los del proyecto, o
**empezar un plan vacío**.

**El botón Nuevo** empieza un plan vacío. Si hay algo escrito, pide
confirmación antes de descartarlo.

**Revisión** enumera lo que falta y lo que no encaja: un conjunto declarado
abierto que todavía contiene datos personales, un conjunto de origen
asistencial amparado en el consentimiento del proyecto, un resumen escrito con
palabras que nadie puede comprobar.

### Los conjuntos de datos

Un proyecto no maneja «unos datos», sino varios conjuntos con orígenes,
identificabilidades y destinos distintos. La ficha de cada uno se abre por
niveles, para no pedir catorce campos de golpe.

Cuatro apartados —documentación, almacenamiento, conservación y compartición—
no se deciden para el proyecto sino **para cada conjunto**, y se presentan con
una tabla que pone a todos juntos: es la única forma de ver que las decisiones
no coinciden.

Los conjuntos tabulares pueden además describir su estructura: qué tablas hay,
qué representa una fila de cada una y por qué columna se unen. Con eso la
aplicación dibuja sola el esquema, en la pantalla y en el PDF. La cabecera de
un CSV se puede leer para no teclear los nombres de las columnas a mano: se
toman solo los nombres, y ningún dato del fichero entra en el plan.

### Versiones

Al exportar se elige entre dejar la versión **abierta**, que se puede volver a
exportar con el mismo número, o **cerrarla**, que es lo que se hace al
entregarla. Una versión cerrada que se vuelve a abrir en el editor solo admite
subir el número, para que no circulen dos documentos distintos con la misma
versión.

## Para qué sirve el PDF

Sigue la estructura de la plantilla de plan de gestión de datos de Horizon
Europe, con las indicaciones de la Comisión traducidas al castellano encima de
cada respuesta, de modo que todo el documento está en un solo idioma.

Es un documento normal, que cualquiera puede leer e imprimir, y a la vez lleva
el plan dentro en formato **RDA DMP Common Standard**. Al volver a abrirlo, la
aplicación no lee el texto impreso: extrae el modelo exacto.

Quien abra el PDF en un lector con panel de adjuntos verá además el fichero
`plan-gestion-datos.json` y podrá sacarlo sin necesidad de esta aplicación.

El plan también se puede guardar directamente como JSON, para herramientas que
hablen el estándar.

## Compilar desde el código

Hace falta [Node](https://nodejs.org) y [Rust](https://rustup.rs).

```
npm install
npm run build
```

Cada empujón compila en Windows, Linux y macOS —Apple Silicon e Intel—; una
etiqueta `v1.2.3` prepara además un borrador de publicación con los
instaladores.
