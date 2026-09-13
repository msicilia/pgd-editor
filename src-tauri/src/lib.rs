use tauri_plugin_dialog::DialogExt;

/// Guarda un fichero preguntando antes dónde, con el diálogo del
/// sistema. Se hace desde Rust y no desde la página por dos motivos:
/// la descarga del navegador no ofrece elegir carpeta dentro de una
/// aplicación de escritorio, y así no hace falta abrir permisos de
/// escritura al sistema de ficheros: solo se escribe donde el usuario
/// acaba de señalar.
///
/// Devuelve la ruta elegida, o nada si se cancela.
#[tauri::command]
async fn guardar_como(
    app: tauri::AppHandle,
    nombre: String,
    extension: String,
    descripcion: String,
    datos: Vec<u8>,
) -> Result<Option<String>, String> {
    let elegida = app
        .dialog()
        .file()
        .set_file_name(&nombre)
        .add_filter(&descripcion, &[extension.as_str()])
        .blocking_save_file();

    match elegida {
        None => Ok(None),
        Some(ruta) => {
            let destino = ruta.into_path().map_err(|e| e.to_string())?;
            std::fs::write(&destino, &datos).map_err(|e| e.to_string())?;
            Ok(Some(destino.display().to_string()))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![guardar_como])
        .run(tauri::generate_context!())
        .expect("error al arrancar la aplicación");
}
