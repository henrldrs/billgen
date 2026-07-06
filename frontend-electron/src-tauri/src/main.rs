// Hide the extra console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
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
fn spawn_sidecar() -> std::io::Result<(Child, String)> {
    let python = std::env::var("BILLGEN_PYTHON").unwrap_or_else(|_| "python".to_string());
    let mut child = Command::new(python)
        .args(["-m", "desktop.bootstrap"])
        .current_dir(repo_root())
        .stdout(Stdio::piped())
        .spawn()?;

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
    let (child, base_url) = match spawn_sidecar() {
        Ok((child, url)) => {
            wait_until_listening(&url);
            (Some(child), Some(url))
        }
        Err(err) => {
            eprintln!("failed to start API sidecar: {err}");
            (None, None)
        }
    };

    tauri::Builder::default()
        .manage(SidecarState {
            child: Mutex::new(child),
            base_url: Mutex::new(base_url),
        })
        .invoke_handler(tauri::generate_handler![api_base_url])
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
