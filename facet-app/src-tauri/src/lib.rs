use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::thread;

use include_dir::{include_dir, Dir};
use tauri::{Emitter, Manager};

// The default curriculum, embedded into the binary at compile time. On first run
// it's extracted into the user's editable app-data folder; after that the app
// only ever reads from disk, so editing the folder needs no rebuild.
static CURRICULUM_SEED: Dir = include_dir!("$CARGO_MANIFEST_DIR/curriculum-seed");

#[derive(serde::Serialize)]
struct CurriculumFile {
    /// Path relative to the curriculum folder, always forward-slashed.
    path: String,
    content: String,
}

// Write the embedded seed tree out to `base` (recursively).
fn extract_seed(dir: &Dir, base: &Path) -> std::io::Result<()> {
    for entry in dir.entries() {
        match entry {
            include_dir::DirEntry::Dir(d) => extract_seed(d, base)?,
            include_dir::DirEntry::File(f) => {
                let out = base.join(f.path());
                if let Some(parent) = out.parent() {
                    fs::create_dir_all(parent)?;
                }
                fs::write(out, f.contents())?;
            }
        }
    }
    Ok(())
}

// The user-editable curriculum folder: <app_data_dir>/curriculum. Seeded on first
// access so the folder always exists with the default content.
fn ensure_curriculum_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("curriculum");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        extract_seed(&CURRICULUM_SEED, &dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

// Recursively collect .json / .md files under `dir` as {path, content}.
fn collect_files(root: &Path, dir: &Path, out: &mut Vec<CurriculumFile>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect_files(root, &path, out)?;
        } else if matches!(path.extension().and_then(|e| e.to_str()), Some("json") | Some("md")) {
            let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            if let Ok(content) = fs::read_to_string(&path) {
                out.push(CurriculumFile { path: rel, content });
            }
        }
    }
    Ok(())
}

// Returns every curriculum file so the frontend can assemble the skill tree.
#[tauri::command]
fn load_curriculum(app: tauri::AppHandle) -> Result<Vec<CurriculumFile>, String> {
    let dir = ensure_curriculum_dir(&app)?;
    let mut out = Vec::new();
    collect_files(&dir, &dir, &mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

// The absolute path of the editable folder (for "open folder" / display in the UI).
#[tauri::command]
fn curriculum_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(ensure_curriculum_dir(&app)?.to_string_lossy().to_string())
}

// Write a file into the editable curriculum folder (used by the in-app New Node form).
// `rel_path` must stay inside the folder — reject absolute paths and any `..` component.
#[tauri::command]
fn write_curriculum_file(app: tauri::AppHandle, rel_path: String, content: String) -> Result<String, String> {
    let rel = Path::new(&rel_path);
    if rel.is_absolute() || rel.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err("invalid path".into());
    }
    if rel.extension().and_then(|e| e.to_str()) != Some("md") && rel.extension().and_then(|e| e.to_str()) != Some("json") {
        return Err("only .md/.json files may be written".into());
    }
    let full = ensure_curriculum_dir(&app)?.join(rel);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, content).map_err(|e| e.to_string())?;
    Ok(full.to_string_lossy().to_string())
}

// ── per-Study file tree ──────────────────────────────────────────────────────
// Each Study gets a real directory on disk: <app_data_dir>/studies/<study_id>/,
// holding the study's source files in nested folders. The frontend owns the study
// index (names, active ids, chats, notes) in its store; only file CONTENT lives
// here so the user can organize a genuine multi-file project.

#[derive(serde::Serialize)]
struct StudyFile {
    /// Path relative to the study folder, always forward-slashed.
    path: String,
    content: String,
}

// The directory for one study, created on demand. `study_id` must be a single,
// harmless path segment (no separators, no `..`).
fn study_dir(app: &tauri::AppHandle, study_id: &str) -> Result<PathBuf, String> {
    if study_id.is_empty()
        || study_id.contains('/')
        || study_id.contains('\\')
        || study_id.contains("..")
        || Path::new(study_id).components().count() != 1
    {
        return Err("invalid study id".into());
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("studies")
        .join(study_id);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

// Resolve a caller-supplied relative path, guaranteeing it stays inside `base`.
fn safe_join(base: &Path, rel_path: &str) -> Result<PathBuf, String> {
    let rel = Path::new(rel_path);
    if rel.is_absolute() || rel.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err("invalid path".into());
    }
    Ok(base.join(rel))
}

fn collect_study_files(root: &Path, dir: &Path, out: &mut Vec<StudyFile>) -> std::io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect_study_files(root, &path, out)?;
        } else if let Ok(content) = fs::read_to_string(&path) {
            let rel = path.strip_prefix(root).unwrap_or(&path).to_string_lossy().replace('\\', "/");
            out.push(StudyFile { path: rel, content });
        }
    }
    Ok(())
}

#[tauri::command]
fn list_study_files(app: tauri::AppHandle, study_id: String) -> Result<Vec<StudyFile>, String> {
    let dir = study_dir(&app, &study_id)?;
    let mut out = Vec::new();
    collect_study_files(&dir, &dir, &mut out).map_err(|e| e.to_string())?;
    out.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(out)
}

#[tauri::command]
fn write_study_file(app: tauri::AppHandle, study_id: String, rel_path: String, content: String) -> Result<(), String> {
    let full = safe_join(&study_dir(&app, &study_id)?, &rel_path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_study_path(app: tauri::AppHandle, study_id: String, rel_path: String) -> Result<(), String> {
    let full = safe_join(&study_dir(&app, &study_id)?, &rel_path)?;
    if full.is_dir() {
        fs::remove_dir_all(&full).map_err(|e| e.to_string())?;
    } else if full.exists() {
        fs::remove_file(&full).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn rename_study_path(app: tauri::AppHandle, study_id: String, from: String, to: String) -> Result<(), String> {
    let dir = study_dir(&app, &study_id)?;
    let src = safe_join(&dir, &from)?;
    let dst = safe_join(&dir, &to)?;
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn create_study_folder(app: tauri::AppHandle, study_id: String, rel_path: String) -> Result<(), String> {
    let full = safe_join(&study_dir(&app, &study_id)?, &rel_path)?;
    fs::create_dir_all(&full).map_err(|e| e.to_string())?;
    Ok(())
}

// Remove a whole study directory (called when a study is deleted in the UI).
#[tauri::command]
fn delete_study(app: tauri::AppHandle, study_id: String) -> Result<(), String> {
    let dir = study_dir(&app, &study_id)?;
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Ensure the bundled engine binary is marked executable — Linux .deb/AppImage
// resource copies can drop the +x bit, which would make spawn() fail with EACCES.
#[cfg(unix)]
fn ensure_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Ok(meta) = fs::metadata(path) {
        let mut perm = meta.permissions();
        if perm.mode() & 0o111 == 0 {
            perm.set_mode(0o755);
            let _ = fs::set_permissions(path, perm);
        }
    }
}
#[cfg(not(unix))]
fn ensure_executable(_path: &Path) {}

// Build the command that runs the C# engine. In a bundled app the engine ships as
// a self-contained binary under the resource dir; in dev we fall back to `dotnet
// run` on the source project, resolved by an ABSOLUTE compile-time path so it never
// depends on the process's working directory (the old relative `current_dir` bug).
fn engine_command(app: &tauri::AppHandle) -> Result<Command, String> {
    if let Ok(res) = app.path().resource_dir() {
        // Try the destinations the bundler may produce for the published engine.
        for rel in ["engine/facet-engine", "engine/linux-x64/facet-engine"] {
            let bin = res.join(rel);
            if bin.exists() {
                ensure_executable(&bin);
                return Ok(Command::new(bin));
            }
        }
    }
    // Dev fallback: run the source project via the dotnet SDK, absolute path.
    let project = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../facet-engine");
    let mut cmd = Command::new("dotnet");
    cmd.arg("run").arg("--project").arg(project);
    Ok(cmd)
}

#[tauri::command]
async fn execute_csharp(app: tauri::AppHandle, code: String) -> Result<String, String> {
    let mut child = engine_command(&app)?
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

// ── interactive (live-terminal) runs ─────────────────────────────────────────
// A running program kept alive so the frontend can stream its output and feed it
// live stdin. Output is pushed to the UI via Tauri events; input comes back
// through send_interactive_input.

struct ProcHandle {
    child: Child,
    stdin: Option<ChildStdin>,
}

#[derive(Default)]
struct Interactive {
    procs: Mutex<HashMap<u32, ProcHandle>>,
    next_id: AtomicU32,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct InteractiveOutput {
    run_id: u32,
    text: String,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct InteractiveExit {
    run_id: u32,
    code: i32,
}

// Stream a pipe to the UI in raw chunks so prompts written without a trailing
// newline still show before the program blocks on input.
fn pump_output(app: tauri::AppHandle, run_id: u32, mut pipe: impl Read + Send + 'static) {
    thread::spawn(move || {
        let mut buf = [0u8; 2048];
        loop {
            match pipe.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let _ = app.emit(
                        "interactive-output",
                        InteractiveOutput { run_id, text: String::from_utf8_lossy(&buf[..n]).to_string() },
                    );
                }
            }
        }
    });
}

// Start a program in interactive mode. The code is written to a temp file (so the
// engine's stdin stays free for the user's input) and run via `--exec`. The handle
// stays in the map for the whole run so input/kill work; it's reaped when stdout
// closes (the program exited), which also emits the exit code.
#[tauri::command]
fn start_interactive(app: tauri::AppHandle, state: tauri::State<Interactive>, code: String) -> Result<u32, String> {
    let dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let id = state.next_id.fetch_add(1, Ordering::SeqCst) + 1;
    let src_path = dir.join(format!("interactive-{id}.csx"));
    fs::write(&src_path, code).map_err(|e| e.to_string())?;

    let mut cmd = engine_command(&app)?;
    cmd.arg("--exec").arg(&src_path);
    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let stdin = child.stdin.take();

    state.procs.lock().unwrap().insert(id, ProcHandle { child, stdin });

    if let Some(err) = stderr {
        pump_output(app.clone(), id, err);
    }

    // The stdout pump doubles as the reaper: on EOF the program has exited, so we
    // remove the handle, close stdin, collect the exit code, and clean the temp file.
    let app_out = app.clone();
    if let Some(mut out) = stdout {
        thread::spawn(move || {
            let mut buf = [0u8; 2048];
            loop {
                match out.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let _ = app_out.emit(
                            "interactive-output",
                            InteractiveOutput { run_id: id, text: String::from_utf8_lossy(&buf[..n]).to_string() },
                        );
                    }
                }
            }
            let handle = app_out.state::<Interactive>().procs.lock().unwrap().remove(&id);
            let code = match handle {
                Some(ProcHandle { mut child, stdin }) => {
                    drop(stdin); // unblock any pending ReadLine so wait() returns
                    child.wait().ok().and_then(|s| s.code()).unwrap_or(-1)
                }
                None => -1,
            };
            let _ = fs::remove_file(&src_path);
            let _ = app_out.emit("interactive-exit", InteractiveExit { run_id: id, code });
        });
    }

    Ok(id)
}

#[tauri::command]
fn send_interactive_input(state: tauri::State<Interactive>, run_id: u32, text: String) -> Result<(), String> {
    let mut procs = state.procs.lock().unwrap();
    let h = procs.get_mut(&run_id).ok_or("no such run")?;
    let stdin = h.stdin.as_mut().ok_or("stdin closed")?;
    stdin.write_all(text.as_bytes()).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn kill_interactive(state: tauri::State<Interactive>, run_id: u32) -> Result<(), String> {
    if let Some(h) = state.procs.lock().unwrap().get_mut(&run_id) {
        let _ = h.child.kill();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(Interactive::default())
        .invoke_handler(tauri::generate_handler![
            execute_csharp,
            load_curriculum,
            curriculum_path,
            write_curriculum_file,
            list_study_files,
            write_study_file,
            delete_study_path,
            rename_study_path,
            create_study_folder,
            delete_study,
            start_interactive,
            send_interactive_input,
            kill_interactive
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
