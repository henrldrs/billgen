// Hide the extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{Manager, State};

/// Holds the spawned API sidecar and its discovered base URL.
struct SidecarState {
    child: Mutex<Option<Child>>,
    base_url: Mutex<Option<String>>,
}

/// Frontend calls this (via `invoke("api_base_url")`) to learn where the local
/// API is listening.
#[tauri::command]
fn api_base_url(state: State<SidecarState>) -> Option<String> {
    state.base_url.lock().unwrap().clone()
}

/// The Python runtime the installer carries: an embeddable CPython plus the
/// application tree, assembled by `scripts/build_sidecar_runtime.py` and
/// bundled as a Tauri resource (T-20).
///
/// Emilia's laptop has no Python, so a packaged build cannot rely on one being
/// on PATH. A development build has no `runtime/` directory and falls through
/// to the interpreter that is.
struct BundledRuntime {
    python: PathBuf,
    app_dir: PathBuf,
}

fn bundled_runtime(resource_dir: Option<&Path>) -> Option<BundledRuntime> {
    let runtime = resource_dir?.join("runtime");
    let python = runtime.join("python").join("python.exe");
    let app_dir = runtime.join("app");
    // Both halves or neither: a runtime with an interpreter and no application
    // would fail deeper in, with an ImportError nobody can act on.
    if python.is_file() && app_dir.is_dir() {
        Some(BundledRuntime { python, app_dir })
    } else {
        None
    }
}

/// Repo root that contains the `desktop` package. Dev cwd is `src-tauri/`, so we
/// walk up two levels; `BILLGEN_ROOT` overrides for packaged builds.
fn repo_root() -> PathBuf {
    if let Ok(root) = std::env::var("BILLGEN_ROOT") {
        return PathBuf::from(root);
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    cwd.parent()
        .and_then(|p| p.parent())
        .map(PathBuf::from)
        .unwrap_or(cwd)
}

/// Start `python -m desktop.bootstrap` and read its `BILLGEN_SIDECAR port=N`
/// line to learn the port. A drain thread keeps the child's stdout pipe from
/// filling once uvicorn starts logging.
///
/// Which interpreter, in order: `BILLGEN_PYTHON` if set (the override a
/// developer uses to point at anything), then the bundled runtime, then
/// whatever "python" resolves to on PATH.
fn spawn_sidecar(runtime: Option<&BundledRuntime>) -> std::io::Result<(Child, String)> {
    let (python, working_dir) = match (std::env::var("BILLGEN_PYTHON"), runtime) {
        (Ok(override_path), _) => (PathBuf::from(override_path), repo_root()),
        (Err(_), Some(bundled)) => (bundled.python.clone(), bundled.app_dir.clone()),
        (Err(_), None) => (PathBuf::from("python"), repo_root()),
    };

    let mut command = Command::new(python);
    command
        .args(["-m", "desktop.bootstrap"])
        .current_dir(working_dir)
        .stdout(Stdio::piped());

    // Without this the sidecar flashes a console window on every launch: the
    // app itself is a GUI subsystem binary, but a child console process gets
    // its own window regardless.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command.spawn()?;

    let stdout = child.stdout.take().expect("sidecar stdout is piped");
    let mut reader = BufReader::new(stdout);

    let mut port: Option<u16> = None;
    let mut line = String::new();
    while reader.read_line(&mut line)? > 0 {
        if let Some(rest) = line.trim().strip_prefix("BILLGEN_SIDECAR port=") {
            if let Ok(parsed) = rest.parse::<u16>() {
                port = Some(parsed);
                break;
            }
        }
        line.clear();
    }

    // Keep draining stdout so the pipe never blocks the child.
    thread::spawn(move || {
        let mut sink = String::new();
        while reader.read_line(&mut sink).unwrap_or(0) > 0 {
            sink.clear();
        }
    });

    let port = port.ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::Other,
            "sidecar did not report a port",
        )
    })?;
    Ok((child, format!("http://127.0.0.1:{port}")))
}

/// Poll the TCP port until the sidecar accepts connections (best effort).
fn wait_until_listening(base_url: &str) {
    let addr = base_url.trim_start_matches("http://");
    for _ in 0..50 {
        if std::net::TcpStream::connect(addr).is_ok() {
            return;
        }
        thread::sleep(Duration::from_millis(200));
    }
}

fn main() {
    tauri::Builder::default()
        .manage(SidecarState {
            child: Mutex::new(None),
            base_url: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![api_base_url])
        .setup(|app| {
            // The resource directory is only knowable from an AppHandle, which
            // is why the sidecar starts here rather than before the builder.
            let resource_dir = app.path().resource_dir().ok();
            let handle = app.handle().clone();

            // On its own thread so the window paints immediately. It used to
            // block for as long as migrations took, showing nothing; the
            // frontend already polls `api_base_url` and is built for the wait.
            thread::spawn(move || {
                let runtime = bundled_runtime(resource_dir.as_deref());
                match spawn_sidecar(runtime.as_ref()) {
                    Ok((child, url)) => {
                        wait_until_listening(&url);
                        let state = handle.state::<SidecarState>();
                        *state.child.lock().unwrap() = Some(child);
                        *state.base_url.lock().unwrap() = Some(url);
                    }
                    Err(err) => eprintln!("failed to start API sidecar: {err}"),
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the BillGen desktop app")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<SidecarState>();
                // Take the child in its own statement so the MutexGuard drops
                // before the block ends (avoids E0597 on `state`).
                let child = state.child.lock().unwrap().take();
                if let Some(mut child) = child {
                    let _ = child.kill();
                }
            }
        });
}
