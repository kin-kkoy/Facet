use std::io::Write;
use std::process::{Command, Stdio};

#[tauri::command]
async fn execute_csharp(code: String) -> Result<String, String> {
    let mut child = Command::new("dotnet")
        .arg("run")
        .current_dir("../../facet-engine") // Run relative to the tauri bin folder during dev
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(code.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if let Some(idx) = stdout.find("---FACET_JSON_START---") {
        let json_str = &stdout[idx + "---FACET_JSON_START---".len()..];
        Ok(json_str.trim().to_string())
    } else {
        Err(if !stderr.is_empty() { stderr } else { stdout })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![execute_csharp])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
