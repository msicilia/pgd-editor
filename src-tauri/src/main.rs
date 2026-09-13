// El binario. Toda la aplicación vive en src/ como web; aquí solo se
// abre la ventana. Mantenerlo así es lo que permite que el mismo
// código se pueda abrir en un navegador o servir desde un sitio web.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pgd_editor_lib::run()
}
