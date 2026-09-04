use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, AtomicU64};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::Emitter;
use sha2::{Digest, Sha256};

const APP_USER_AGENT: &str = "CozyPixels-Desktop/1.0 (https://cozy-pixels.vercel.app)";

fn http_client() -> &'static reqwest::Client {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .user_agent(APP_USER_AGENT)
            .connect_timeout(Duration::from_secs(10))
            .timeout(Duration::from_secs(45))
            .build()
            .expect("Failed to build HTTP client")
    })
}

static ROTATE_RUNNING: AtomicBool = AtomicBool::new(false);
static ROTATE_INTERVAL: AtomicU64 = AtomicU64::new(900000);

fn get_allowed_dirs() -> std::sync::MutexGuard<'static, std::collections::HashSet<String>> {
    static ALLOWED_LOCAL_DIRS: std::sync::OnceLock<std::sync::Mutex<std::collections::HashSet<String>>> = std::sync::OnceLock::new();
    ALLOWED_LOCAL_DIRS.get_or_init(|| std::sync::Mutex::new(std::collections::HashSet::new())).lock().unwrap()
}
#[derive(Debug, Serialize, Deserialize, Clone)]
struct WallpaperInfo {
    name: String,
    url: String,
}

#[tauri::command]
async fn set_wallpaper(app: tauri::AppHandle, url: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // When setting a static wallpaper, clean up the video wallpaper
        if let Some(video_window) = app.get_webview_window("video_bg") {
            let _ = video_window.hide();
            let _ = video_window.close();
        }
    }

    if !url.starts_with("http://") && !url.starts_with("https://") {
        set_wallpaper_os(&url)?;
        return Ok(format!("Local wallpaper set"));
    }

    let temp_dir = std::env::temp_dir();
    let filename = url
        .split('/')
        .last()
        .unwrap_or("cozy-wallpaper.jpg")
        .to_string();
    let temp_path = temp_dir.join(format!("cozypixels_{}", filename));

    if let Ok(entries) = std::fs::read_dir(&temp_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.starts_with("cozypixels_")
                    && name != format!("cozypixels_{}", filename).as_str()
                {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    let url_clone = url.clone();
    let path_clone = temp_path.clone();

    let response = http_client()
        .get(&url_clone)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;
    tokio::fs::write(&path_clone, &bytes)
        .await
        .map_err(|e| format!("Write failed: {}", e))?;

    let path_str = temp_path.to_str().ok_or("Invalid temp path")?.to_string();

    set_wallpaper_os(&path_str)?;

    Ok(format!("Wallpaper set: {}", filename))
}

fn set_wallpaper_os(path: &str) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::OsStr;
        use std::iter::once;
        use std::os::windows::ffi::OsStrExt;

        let path_str = path.replace('/', "\\");
        let wide: Vec<u16> = OsStr::new(&path_str).encode_wide().chain(once(0)).collect();

        let result = unsafe {
            winapi::um::winuser::SystemParametersInfoW(
                winapi::um::winuser::SPI_SETDESKWALLPAPER,
                0,
                wide.as_ptr() as *mut _,
                winapi::um::winuser::SPIF_UPDATEINIFILE | winapi::um::winuser::SPIF_SENDCHANGE,
            )
        };

        if result == 0 {
            return Err("SystemParametersInfoW failed".to_string());
        }
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "System Events" to set picture of every desktop to POSIX file "{}""#,
            path
        );
        let status = std::process::Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .status()
            .map_err(|e| format!("osascript failed: {}", e))?;

        if !status.success() {
            return Err("Failed to set wallpaper on macOS".to_string());
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        let gnome = std::process::Command::new("gsettings")
            .args(&[
                "set",
                "org.gnome.desktop.background",
                "picture-uri",
                &format!("file://{}", path),
            ])
            .status();

        if gnome.map_or(true, |s| !s.success()) {
            std::process::Command::new("feh")
                .args(&["--bg-scale", path])
                .status()
                .map_err(|e| format!("feh failed: {}", e))?;
        }
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("Unsupported OS".to_string())
}

#[tauri::command]
async fn set_lock_screen(url: String) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Storage::StorageFile;
        use windows::System::UserProfile::LockScreen;
        use windows::core::HSTRING;
        
        let path_str = if !url.starts_with("http") {
            // It's a local path, convert to backslashes for Windows API
            url.replace('/', "\\")
        } else {
            let temp_dir = std::env::temp_dir();
            let filename = url.split('/').last().unwrap_or("cozy-lock.jpg").to_string();
            let temp_path = temp_dir.join(format!("cozypixels_lock_{}", filename));
            let path_clone = temp_path.clone();
            
            let response = http_client().get(&url).send().await.map_err(|e| format!("Download failed: {}", e))?;
            let bytes = response.bytes().await.map_err(|e| format!("Read failed: {}", e))?;
            tokio::fs::write(&path_clone, &bytes).await.map_err(|e| format!("Write failed: {}", e))?;
            
            temp_path.to_str().ok_or("Invalid temp path")?.to_string()
        };
        
        tokio::task::spawn_blocking(move || -> Result<(), String> {
            let hstring_path = HSTRING::from(&path_str);
            let file = StorageFile::GetFileFromPathAsync(&hstring_path)
                .map_err(|e| format!("GetFileFromPathAsync failed: {}", e))?
                .get()
                .map_err(|e| format!("GetFileFromPathAsync get failed: {}", e))?;
                
            LockScreen::SetImageFileAsync(&file)
                .map_err(|e| format!("SetImageFileAsync failed: {}", e))?
                .get()
                .map_err(|e| format!("SetImageFileAsync get failed: {}", e))?;
                
            Ok(())
        }).await.map_err(|e| format!("Task error: {}", e))??;
        
        return Ok("Lock screen updated successfully".to_string());
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Lock screen setting is only supported on Windows".to_string());
    }
}

#[tauri::command]
async fn start_auto_rotate(
    window: tauri::Window,
    interval_ms: u64,
    wallpapers: Vec<WallpaperInfo>,
    start_index: Option<usize>,
    initial_delay_ms: Option<u64>,
) -> Result<(), String> {
    if wallpapers.is_empty() {
        return Err("No wallpapers provided".to_string());
    }

    ROTATE_RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
    tokio::time::sleep(Duration::from_millis(100)).await;
    ROTATE_RUNNING.store(true, std::sync::atomic::Ordering::SeqCst);

    let wallpapers = Arc::new(wallpapers);
    let index = Arc::new(Mutex::new(start_index.unwrap_or(0)));
    let initial_delay = initial_delay_ms.unwrap_or(interval_ms);
    ROTATE_INTERVAL.store(interval_ms, std::sync::atomic::Ordering::SeqCst);

    tauri::async_runtime::spawn(async move {
        let mut first_run = true;
        loop {
            if !ROTATE_RUNNING.load(std::sync::atomic::Ordering::SeqCst) {
                break;
            }

            let start_time = std::time::SystemTime::now();
            let current_target = if first_run {
                initial_delay
            } else {
                ROTATE_INTERVAL.load(std::sync::atomic::Ordering::SeqCst)
            };
            let target_duration = std::time::Duration::from_millis(current_target);

            while let Ok(elapsed) = start_time.elapsed() {
                if elapsed >= target_duration {
                    break;
                }
                if !ROTATE_RUNNING.load(std::sync::atomic::Ordering::SeqCst) {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(500)).await;
            }
            
            first_run = false;

            if !ROTATE_RUNNING.load(std::sync::atomic::Ordering::SeqCst) {
                break;
            }

            let current = {
                let mut idx = index.lock().unwrap();
                *idx = (*idx + 1) % wallpapers.len();
                wallpapers[*idx].clone()
            };

            let url = current.url.clone();
            let name = current.name.clone();

            if url.starts_with("http://") || url.starts_with("https://") {
                let temp_dir = std::env::temp_dir();
                let filename = url.split('/').last().unwrap_or("wallpaper.jpg").to_string();
                let temp_path = temp_dir.join(format!("cozypixels_{}", filename));

                if temp_path.exists() {
                    if let Some(path_str) = temp_path.to_str() {
                        let _ = set_wallpaper_os(path_str);
                        let _ = window.emit("wallpaper-changed", &name);
                    }
                } else {
                    if let Ok(response) = http_client().get(&url).send().await {
                        if let Ok(bytes) = response.bytes().await {
                            let _ = tokio::fs::write(&temp_path, &bytes).await;
                            if let Some(path_str) = temp_path.to_str() {
                                let _ = set_wallpaper_os(path_str);
                                let _ = window.emit("wallpaper-changed", &name);
                            }
                        }
                    }
                }
            } else {
                let _ = set_wallpaper_os(&url);
                let _ = window.emit("wallpaper-changed", &name);
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn stop_auto_rotate() -> Result<(), String> {
    ROTATE_RUNNING.store(false, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
fn get_rotate_status() -> bool {
    ROTATE_RUNNING.load(std::sync::atomic::Ordering::SeqCst)
}

#[tauri::command]
fn update_rotate_interval(new_interval_ms: u64) {
    ROTATE_INTERVAL.store(new_interval_ms, std::sync::atomic::Ordering::SeqCst);
}

#[tauri::command]
fn scan_local_directory(path: String) -> Result<Vec<String>, String> {
    if let Ok(canon) = std::fs::canonicalize(&path) {
        get_allowed_dirs().insert(canon.to_string_lossy().to_string());
    }
    
    let mut images = Vec::new();
    let entries = std::fs::read_dir(&path).map_err(|e| format!("Failed to read dir: {}", e))?;
    for entry in entries.flatten() {
        if let Ok(file_type) = entry.file_type() {
            if file_type.is_file() {
                if let Some(name) = entry.file_name().to_str() {
                    let name_lower = name.to_lowercase();
                    if name_lower.ends_with(".jpg") || name_lower.ends_with(".jpeg") || name_lower.ends_with(".png") || name_lower.ends_with(".webp") || name_lower.ends_with(".gif") || name_lower.ends_with(".bmp") || name_lower.ends_with(".mp4") || name_lower.ends_with(".webm") || name_lower.ends_with(".mkv") {
                        if let Some(path_str) = entry.path().to_str() {
                            images.push(path_str.to_string());
                        }
                    }
                }
            }
        }
    }
    Ok(images)
}

use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

fn is_safe_extension(path: &str) -> bool {
    let p = std::path::Path::new(path);
    if p.components().any(|c| c == std::path::Component::ParentDir) {
        return false;
    }
    let ext = p.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
    let allowed = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "mp4", "webm", "mkv"];
    allowed.contains(&ext.as_str())
}

#[tauri::command]
async fn delete_local_wallpaper(path: String) -> Result<(), String> {
    if !is_safe_extension(&path) {
        return Err("Invalid file extension or path".to_string());
    }
    
    let canon_path = std::fs::canonicalize(&path).map_err(|e| e.to_string())?;
    let canon_str = canon_path.to_string_lossy().to_string();
    
    let is_allowed = get_allowed_dirs().iter().any(|allowed_dir| canon_str.starts_with(allowed_dir));
    if !is_allowed {
        return Err("Path not in an allowed directory".to_string());
    }

    std::fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
}

#[tauri::command]
async fn download_and_save_wallpaper(url: String, path: String) -> Result<(), String> {
    if !is_safe_extension(&path) {
        return Err("Invalid file extension or path".to_string());
    }
    
    let bytes = reqwest::get(&url)
        .await
        .map_err(|e| format!("Failed to download: {}", e))?
        .bytes()
        .await
        .map_err(|e| format!("Failed to read bytes: {}", e))?
        .to_vec();
    std::fs::write(&path, bytes).map_err(|e| format!("Failed to write file: {}", e))
}

fn get_cache_dir(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to locate app cache: {}", e))?
        .join("wallpapers");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create app cache: {}", e))?;
    Ok(dir)
}

fn cache_file_path(cache_dir: &std::path::Path, url: &str) -> std::path::PathBuf {
    let digest = Sha256::digest(url.as_bytes());
    let hash = format!("{:x}", digest);
    let extension = url
        .split('?')
        .next()
        .and_then(|path| path.rsplit('/').next())
        .and_then(|name| name.rsplit_once('.'))
        .map(|(_, extension)| extension.to_lowercase())
        .filter(|extension| extension.len() <= 5)
        .unwrap_or_else(|| "jpg".to_string());
    cache_dir.join(format!("{}.{}", hash, extension))
}

#[tauri::command]
async fn get_cached_image(app: tauri::AppHandle, url: String) -> Result<String, String> {
    let cache_dir = get_cache_dir(&app)?;
    let file_path = cache_file_path(&cache_dir, &url);
    
    if file_path.exists() {
        return Ok(format!("cozy://localhost/{}", file_path.to_string_lossy().replace('\\', "/")));
    }
    
    Ok(url)
}

#[tauri::command]
async fn sync_all_wallpapers(app: tauri::AppHandle, urls: Vec<String>) -> Result<(), String> {
    let cache_dir = get_cache_dir(&app)?;
    tauri::async_runtime::spawn(async move {
        let semaphore = Arc::new(tokio::sync::Semaphore::new(8));
        let mut tasks = tokio::task::JoinSet::new();

        for url in urls {
            let semaphore = semaphore.clone();
            let cache_dir = cache_dir.clone();
            tasks.spawn(async move {
                let Ok(_permit) = semaphore.acquire_owned().await else { return };
                let file_path = cache_file_path(&cache_dir, &url);
                if file_path.exists() { return; }
                if let Ok(response) = http_client().get(&url).send().await {
                    if response.status().is_success() {
                        if let Ok(bytes) = response.bytes().await {
                            let temp_path = file_path.with_extension("download");
                            if tokio::fs::write(&temp_path, bytes).await.is_ok() {
                                let _ = tokio::fs::rename(temp_path, file_path).await;
                            }
                        }
                    }
                }
            });
        }

        while tasks.join_next().await.is_some() {}
    });
    
    Ok(())
}

#[tauri::command]
async fn delete_cached_wallpaper(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let cache_dir = get_cache_dir(&app)?;
    let file_path = cache_file_path(&cache_dir, &url);
    
    if file_path.exists() {
        std::fs::remove_file(&file_path).map_err(|e| format!("Failed to delete: {}", e))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
use winapi::shared::minwindef::{BOOL, LPARAM};
#[cfg(target_os = "windows")]
use winapi::shared::windef::HWND;
#[cfg(target_os = "windows")]
use std::ptr::null_mut;

/// Background WorkerW sits BEHIND the desktop icons.
#[cfg(target_os = "windows")]
static mut PROGMAN: winapi::shared::windef::HWND = std::ptr::null_mut();
#[cfg(target_os = "windows")]
static mut SHELLDLL_DEFVIEW: winapi::shared::windef::HWND = std::ptr::null_mut();
#[cfg(target_os = "windows")]
static mut WORKERW: winapi::shared::windef::HWND = std::ptr::null_mut();
#[cfg(target_os = "windows")]
static mut IS_RAISED_DESKTOP: bool = false;

#[cfg(target_os = "windows")]
unsafe extern "system" fn enum_windows_proc(hwnd: winapi::shared::windef::HWND, _: winapi::shared::minwindef::LPARAM) -> winapi::shared::minwindef::BOOL {
    use winapi::um::winuser::FindWindowExA;
    let p = FindWindowExA(hwnd, std::ptr::null_mut(), b"SHELLDLL_DefView\0".as_ptr() as *const i8, std::ptr::null_mut());
    if p != std::ptr::null_mut() {
        SHELLDLL_DEFVIEW = p;
        let worker = FindWindowExA(std::ptr::null_mut(), hwnd, b"WorkerW\0".as_ptr() as *const i8, std::ptr::null_mut());
        if worker != std::ptr::null_mut() {
            WORKERW = worker;
        }
    }
    1
}

/// Initialises the desktop layers and returns the WorkerW handle.
///
/// Implements full compatibility with Windows 11 "Raised Desktop" mode
/// (where the desktop is layered inside Progman with WS_EX_NOREDIRECTIONBITMAP)
/// as well as standard Windows 10 WorkerW behaviour.
#[cfg(target_os = "windows")]
pub fn get_workerw() -> HWND {
    use winapi::um::winuser::{
        EnumWindows, FindWindowA, FindWindowExA, SendMessageTimeoutA, GetWindowLongW,
        SMTO_NORMAL, GWL_EXSTYLE, WS_EX_NOREDIRECTIONBITMAP,
    };
    unsafe {
        WORKERW = null_mut();
        SHELLDLL_DEFVIEW = null_mut();
        
        let progman = FindWindowA(b"Progman\0".as_ptr() as *const i8, null_mut());
        if progman != null_mut() {
            PROGMAN = progman;

            // Windows 11 Raised Desktop detection
            let ex_style = GetWindowLongW(progman, GWL_EXSTYLE);
            IS_RAISED_DESKTOP = (ex_style & WS_EX_NOREDIRECTIONBITMAP as i32) != 0;

            let mut result: usize = 0;
            // Spawn WorkerW background layer
            SendMessageTimeoutA(
                progman,
                0x052C,
                0xD,
                0x1,
                SMTO_NORMAL,
                1000,
                &mut result,
            );
            EnumWindows(Some(enum_windows_proc), 0);

            // In raised desktop, WorkerW is a direct child of Progman, not a top-level window.
            if IS_RAISED_DESKTOP {
                let p_worker = FindWindowExA(progman, std::ptr::null_mut(), b"WorkerW\0".as_ptr() as *const i8, std::ptr::null_mut());
                if p_worker != std::ptr::null_mut() {
                    WORKERW = p_worker;
                }
            }
        }

        WORKERW
    }
}

#[tauri::command]
async fn set_video_wallpaper(
    app: tauri::AppHandle,
    url: String,
    player_url: Option<String>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let window_label = "video_bg";
        let video_url = player_url.unwrap_or_else(|| url.clone());
        
        // If the window already exists, just update the video and re-attach
        if let Some(existing) = app.get_webview_window(window_label) {
            let _ = existing.emit("change-video", &video_url);
            attach_to_workerw(&existing)?;
            return Ok(());
        }
        
        // Create the video background window.
        // CRITICAL: We create it VISIBLE but positioned OFF-SCREEN.
        // WebView2 will NOT initialize its GPU rendering surface if the window
        // is created with visible(false). By placing it at (-3000, -3000) we
        // let WebView2 initialize without the user seeing a flash.
        let encoded_url: String = url::form_urlencoded::byte_serialize(video_url.as_bytes()).collect();
        let window = tauri::WebviewWindowBuilder::new(
            &app,
            window_label,
            tauri::WebviewUrl::App(format!("/?videoUrl={}", encoded_url).parse().unwrap())
        )
        .title("CozyPixels Video Wallpaper")
        .decorations(false)
        .skip_taskbar(true)
        .inner_size(1920.0, 1080.0)
        .position(-3000.0, -3000.0)
        .build()
        .map_err(|e| e.to_string())?;
        
        let _ = window.set_ignore_cursor_events(true);
        
        // Wait for WebView2 to fully initialize, then reparent to desktop
        let app_clone = app.clone();
        let window_clone = window.clone();
        tauri::async_runtime::spawn(async move {
            // Give WebView2 enough time to load the HTML + start rendering
            tokio::time::sleep(std::time::Duration::from_millis(3000)).await;
            
            match attach_to_workerw(&window_clone) {
                Ok(_) => {
                    let _ = app_clone.emit("video-wallpaper-status", "attached");
                }
                Err(e) => {
                    eprintln!("[CozyPixels] Failed to attach to desktop: {}", e);
                    let _ = app_clone.emit("video-wallpaper-status", format!("error: {}", e));
                }
            }
        });
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        return Err("Video wallpapers are currently only supported on Windows.".to_string());
    }
    
    Ok(())
}

#[cfg(target_os = "windows")]
fn attach_to_workerw(window: &tauri::WebviewWindow) -> Result<(), String> {
    use winapi::shared::windef::HWND;
    use winapi::shared::minwindef::{TRUE, BOOL, LPARAM};
    use winapi::um::winuser::{
        GetWindowLongW, SetParent, SetWindowLongW, SetWindowPos, SetLayeredWindowAttributes,
        ShowWindow, MoveWindow, EnumChildWindows,
        GWL_STYLE, GWL_EXSTYLE,
        SWP_NOACTIVATE, SWP_SHOWWINDOW, SWP_FRAMECHANGED,
        SWP_NOSIZE, SWP_NOMOVE,
        WS_CHILD, WS_VISIBLE, WS_CLIPSIBLINGS, SW_SHOWNA,
        HWND_BOTTOM, WS_EX_LAYERED, LWA_ALPHA,
    };

    // Ensure we have initialized the handles
    get_workerw();

    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let hwnd_ptr: HWND = unsafe { std::mem::transmute(hwnd) };

    unsafe {
        use winapi::um::winuser::WS_EX_TRANSPARENT;
        let is_raised = IS_RAISED_DESKTOP;
        
        if is_raised && PROGMAN != std::ptr::null_mut() && SHELLDLL_DEFVIEW != std::ptr::null_mut() {
            // ==========================================
            // Windows 11 Raised Desktop Method
            // ==========================================
            
            // 1. Set window style to child
            SetWindowLongW(
                hwnd_ptr,
                GWL_STYLE,
                (WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS) as i32,
            );

            // 2. Apply WS_EX_LAYERED and WS_EX_TRANSPARENT so clicks pass through to the desktop
            let ex_style = GetWindowLongW(hwnd_ptr, GWL_EXSTYLE);
            SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, ex_style | WS_EX_LAYERED as i32 | WS_EX_TRANSPARENT as i32);
            SetLayeredWindowAttributes(hwnd_ptr, 0, 255, LWA_ALPHA);

            // 3. Parent directly to Progman (not WorkerW)
            SetParent(hwnd_ptr, PROGMAN);

            // 4. Force window to be inserted immediately AFTER SHELLDLL_DefView (behind icons)
            SetWindowPos(
                hwnd_ptr,
                SHELLDLL_DEFVIEW,
                0, 0, 0, 0,
                SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );

            // 5. Ensure the actual WorkerW is kept at the very bottom so it doesn't cover us
            if WORKERW != std::ptr::null_mut() {
                SetWindowPos(
                    WORKERW,
                    HWND_BOTTOM,
                    0, 0, 0, 0,
                    SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE,
                );
            }
        } else {
            // ==========================================
            // Windows 10 Classic Method
            // ==========================================
            
            if WORKERW == std::ptr::null_mut() {
                return Err("Could not find WorkerW on classic desktop.".to_string());
            }

            SetWindowLongW(
                hwnd_ptr,
                GWL_STYLE,
                (WS_CHILD | WS_VISIBLE | WS_CLIPSIBLINGS) as i32,
            );
            // Must keep WS_EX_TRANSPARENT so mouse events pass through to desktop
            let ex_style = GetWindowLongW(hwnd_ptr, GWL_EXSTYLE);
            SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, (ex_style & WS_EX_LAYERED as i32) | WS_EX_TRANSPARENT as i32);

            SetParent(hwnd_ptr, WORKERW);

            SetWindowPos(
                hwnd_ptr,
                HWND_BOTTOM,
                0, 0, 0, 0,
                SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
            );
        }
    }

    // ==========================================
    // Force absolute dimensions via Win32 Window Subclassing
    // ==========================================
    unsafe {
        use winapi::um::winuser::{GetWindowRect, SetWindowPos, SWP_NOZORDER, SWP_NOACTIVATE, SWP_FRAMECHANGED, SW_SHOWNA};
        use winapi::um::commctrl::{SetWindowSubclass, DefSubclassProc};
        use winapi::um::winuser::{WM_WINDOWPOSCHANGING, WINDOWPOS, SWP_NOMOVE, SWP_NOSIZE};
        use winapi::um::winuser::{MonitorFromWindow, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTOPRIMARY};
        use winapi::shared::minwindef::{UINT, WPARAM, LPARAM, LRESULT};

        let parent = if IS_RAISED_DESKTOP { PROGMAN } else { WORKERW };

        // 1. Target Monitor: Get exact rcMonitor for the primary display
        let hmonitor = MonitorFromWindow(parent, MONITOR_DEFAULTTOPRIMARY);
        let mut mi: MONITORINFO = std::mem::zeroed();
        mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
        GetMonitorInfoW(hmonitor, &mut mi);
        let monitor_rect = mi.rcMonitor;

        // 2. Parent Screen Rect: Get exact screen coordinates of WorkerW/Progman
        let mut worker_rect: winapi::shared::windef::RECT = std::mem::zeroed();
        GetWindowRect(parent, &mut worker_rect);

        // 3. Coordinate Conversion: Map monitor screen coords to parent child coords
        let local_x = monitor_rect.left - worker_rect.left;
        let local_y = monitor_rect.top - worker_rect.top;
        let width = monitor_rect.right - monitor_rect.left;
        let height = monitor_rect.bottom - monitor_rect.top;

        // Print Diagnostic Information as requested
        println!("\n[LIVE HWND GEOMETRY]");
        println!("Monitor:\n  HWND=HMONITOR({:?})\n  L={}\n  T={}\n  R={}\n  B={}\n  W={}\n  H={}",
            hmonitor, monitor_rect.left, monitor_rect.top, monitor_rect.right, monitor_rect.bottom, width, height);
        println!("WorkerW (Parent):\n  HWND={:?}\n  L={}\n  T={}\n  R={}\n  B={}\n  W={}\n  H={}",
            parent, worker_rect.left, worker_rect.top, worker_rect.right, worker_rect.bottom, 
            worker_rect.right - worker_rect.left, worker_rect.bottom - worker_rect.top);
        println!("Calculated child position:\n  X={}\n  Y={}\n  W={}\n  H={}\n",
            local_x, local_y, width, height);

        // Define the bounds we want to lock the window to
        struct WindowBounds { x: i32, y: i32, w: i32, h: i32 }
        let bounds = Box::new(WindowBounds {
            x: local_x,
            y: local_y,
            w: width,
            h: height,
        });

        // The Subclass procedure that will intercept winit's resize attempts
        unsafe extern "system" fn subclass_proc(
            h: HWND, msg: UINT, wp: WPARAM, lp: LPARAM, _id: usize, data: usize
        ) -> LRESULT {
            use winapi::um::winuser::WM_NCCALCSIZE;
            
            if msg == WM_NCCALCSIZE && wp != 0 {
                // Return 0 to completely eliminate the non-client area (borders/shadows)
                // This prevents Windows 10/11 from shrinking our client area by 8px!
                return 0;
            }

            if msg == WM_WINDOWPOSCHANGING && data != 0 {
                let b = &*(data as *const WindowBounds);
                let wp_struct = &mut *(lp as *mut WINDOWPOS);
                
                // Brutally override whatever dimensions winit tries to apply
                wp_struct.x = b.x;
                wp_struct.y = b.y;
                wp_struct.cx = b.w;
                wp_struct.cy = b.h;
                
                // Clear the NO_MOVE and NO_SIZE flags to ensure our overrides are applied
                wp_struct.flags &= !SWP_NOMOVE;
                wp_struct.flags &= !SWP_NOSIZE;
                
                // We modified the struct, now let the original window proc process the modified struct
                return DefSubclassProc(h, msg, wp, lp);
            }
            DefSubclassProc(h, msg, wp, lp)
        }

        // Install the subclass
        SetWindowSubclass(
            hwnd_ptr,
            Some(subclass_proc),
            1337,
            Box::into_raw(bounds) as usize,
        );

        // Sync Tauri to avoid immediate conflicts
        let _ = window.set_decorations(false);
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: width as u32,
            height: height as u32,
        }));

        // Trigger the initial size placement which will now be intercepted and locked perfectly!
        SetWindowPos(
            hwnd_ptr,
            std::ptr::null_mut(),
            local_x, local_y, width, height,
            SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED
        );

        winapi::um::winuser::ShowWindow(hwnd_ptr, SW_SHOWNA);

        // Diagnostic logging
        let mut actual_rect: winapi::shared::windef::RECT = std::mem::zeroed();
        winapi::um::winuser::GetWindowRect(hwnd_ptr, &mut actual_rect);
        println!("[LIVE HWND GEOMETRY POST-SETWINDOWPOS]");
        println!("TARGET MONITOR:\n  left={}\n  top={}\n  right={}\n  bottom={}", 
            monitor_rect.left, monitor_rect.top, monitor_rect.right, monitor_rect.bottom);
        println!("LIVE HWND:\n  left={}\n  top={}\n  right={}\n  bottom={}",
            actual_rect.left, actual_rect.top, actual_rect.right, actual_rect.bottom);
        println!("MISMATCH:\n  left: {:+2}\n  top: {:+2}\n  right: {:+2}\n  bottom: {:+2}\n",
            actual_rect.left - monitor_rect.left,
            actual_rect.top - monitor_rect.top,
            actual_rect.right - monitor_rect.right,
            actual_rect.bottom - monitor_rect.bottom);
        println!("Calculated child position: x={}, y={}, width={}, height={}", local_x, local_y, width, height);
    }

    // Optional legacy fix for Z-order just in case (moves shell to TOP)
    unsafe {
        if !IS_RAISED_DESKTOP && SHELLDLL_DEFVIEW != std::ptr::null_mut() {
            // Actually, in classic mode we used SHELLDLL_PARENT instead of SHELLDLL_DEFVIEW for SetWindowPos.
            // But we don't track SHELLDLL_PARENT anymore. HWND_BOTTOM is enough.
        }
    }

    let _ = window.show();
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // NOTE: We intentionally do NOT call SetProcessDpiAwarenessContext.
    // Tauri manages its own DPI awareness.  Overriding it caused a
    // coordinate mismatch: our Per-Monitor V2 window passed physical
    // pixels to MoveWindow, but WorkerW (system-owned, different DPI
    // context) virtualised them, shrinking the wallpaper by the DPI
    // scale factor.

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            // When a second instance is launched, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .register_uri_scheme_protocol("cozy", |_app, request| {
            let path = request.uri().path().strip_prefix('/').unwrap_or(request.uri().path());
            let decoded = percent_encoding::percent_decode_str(path).decode_utf8_lossy().to_string();
            let local_path = if cfg!(windows) && decoded.starts_with('/') {
                decoded[1..].to_string()
            } else {
                decoded
            };

            // Security: normalize path to prevent directory traversal
            let normalized = std::path::Path::new(&local_path)
                .components()
                .collect::<std::path::PathBuf>();
            
            let normalized_str = normalized.to_string_lossy().replace('\\', "/");
            let check_path = local_path.replace('\\', "/");

            if check_path != normalized_str {
                return tauri::http::Response::builder()
                    .status(400)
                    .body(Vec::new())
                    .unwrap();
            }

            let lower_path = local_path.to_lowercase();
            let is_valid_image = lower_path.ends_with(".png")
                || lower_path.ends_with(".jpg")
                || lower_path.ends_with(".jpeg")
                || lower_path.ends_with(".gif")
                || lower_path.ends_with(".webp")
                || lower_path.ends_with(".bmp")
                || lower_path.ends_with(".mp4")
                || lower_path.ends_with(".webm")
                || lower_path.ends_with(".mkv");

            if !is_valid_image {
                return tauri::http::Response::builder()
                    .status(403)
                    .body(Vec::new())
                    .unwrap();
            }

            if let Ok(metadata) = std::fs::metadata(&local_path) {
                // Increase limit to 2GB for videos
                let limit = if lower_path.ends_with(".mp4") || lower_path.ends_with(".webm") || lower_path.ends_with(".mkv") {
                    2000 * 1024 * 1024 
                } else {
                    50 * 1024 * 1024
                };
                if metadata.len() > limit {
                    return tauri::http::Response::builder()
                        .status(413)
                        .body(Vec::new())
                        .unwrap();
                }
            }

            if let Ok(mut file) = std::fs::File::open(&local_path) {
                let mime = if lower_path.ends_with(".png") {
                    "image/png"
                } else if lower_path.ends_with(".gif") {
                    "image/gif"
                } else if lower_path.ends_with(".webp") {
                    "image/webp"
                } else if lower_path.ends_with(".mp4") {
                    "video/mp4"
                } else if lower_path.ends_with(".webm") {
                    "video/webm"
                } else if lower_path.ends_with(".mkv") {
                    "video/x-matroska"
                } else {
                    "image/jpeg"
                };

                let file_len = std::fs::metadata(&local_path).map(|m| m.len()).unwrap_or(0);
                
                let mut start = 0;
                let mut end = file_len.saturating_sub(1);
                let mut is_partial = false;
                
                if let Some(range_header) = request.headers().get("Range") {
                    if let Ok(range_str) = range_header.to_str() {
                        if range_str.starts_with("bytes=") {
                            let range = &range_str[6..];
                            let parts: Vec<&str> = range.split('-').collect();
                            if !parts.is_empty() && !parts[0].is_empty() {
                                start = parts[0].parse::<u64>().unwrap_or(0);
                            }
                            if parts.len() > 1 && !parts[1].is_empty() {
                                end = parts[1].parse::<u64>().unwrap_or(file_len.saturating_sub(1));
                            }
                            is_partial = true;
                        }
                    }
                }
                
                if start > end || start >= file_len {
                    return tauri::http::Response::builder()
                        .status(416)
                        .header("Content-Range", format!("bytes */{}", file_len))
                        .body(Vec::new())
                        .unwrap();
                }
                
                use std::io::{Read, Seek, SeekFrom};
                let _ = file.seek(SeekFrom::Start(start));
                let mut chunk_size = end - start + 1;
                
                let max_chunk = 10 * 1024 * 1024;
                if chunk_size > max_chunk {
                    chunk_size = max_chunk;
                }
                
                let mut data = vec![0; chunk_size as usize];
                if let Ok(bytes_read) = file.read(&mut data) {
                    data.truncate(bytes_read);
                    let actual_chunk_size = bytes_read as u64;
                    let actual_end = start + actual_chunk_size - 1;
                    
                    let mut builder = tauri::http::Response::builder()
                        .header("Content-Type", mime)
                        .header("Accept-Ranges", "bytes");
                        
                    if is_partial {
                        builder = builder
                            .status(206)
                            .header("Content-Range", format!("bytes {}-{}/{}", start, actual_end, file_len))
                            .header("Content-Length", actual_chunk_size.to_string());
                    } else {
                        builder = builder
                            .status(200)
                            .header("Content-Length", file_len.to_string());
                    }
                    
                    return builder.body(data).unwrap();
                }
            }

            tauri::http::Response::builder()
                .status(404)
                .body(Vec::new())
                .unwrap()
        })
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show CozyPixels", true, None::<&str>)?;
            let next_i = MenuItem::with_id(app, "next", "Next Wallpaper", true, None::<&str>)?;
            let toggle_i = MenuItem::with_id(app, "toggle_rotate", "Toggle Auto-Rotate", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &next_i, &toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id("main")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "next" => {
                        let _ = app.emit("tray-next-wallpaper", "");
                    }
                    "toggle_rotate" => {
                        let _ = app.emit("tray-toggle-rotate", "");
                    }
                    _ => {}
                })
                .icon(app.default_window_icon().cloned().expect("No default window icon configured - check tauri.conf.json"))
                .tooltip("CozyPixels")
                .build(app)?;

            // Hide window on boot if started via autostart
            if std::env::args().any(|arg| arg == "--autostart") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            set_wallpaper,
            set_lock_screen,
            start_auto_rotate,
            stop_auto_rotate,
            get_rotate_status,
            update_rotate_interval,
            scan_local_directory,
            delete_local_wallpaper,
            download_and_save_wallpaper,
            get_cached_image,
            delete_cached_wallpaper,
            set_video_wallpaper,
            sync_all_wallpapers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
