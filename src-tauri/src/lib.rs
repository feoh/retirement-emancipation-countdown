#[cfg(target_os = "linux")]
fn prefers_wayland(backend: Option<&str>) -> bool {
    match backend {
        Some(backends) => matches!(
            backends.split(',').next().map(str::trim),
            Some("wayland") | Some("*") | Some("")
        ),
        None => true,
    }
}

#[cfg(target_os = "linux")]
fn configure_webkit_renderer() {
    let wayland_session = std::env::var_os("WAYLAND_DISPLAY").is_some()
        || std::env::var_os("WAYLAND_SOCKET").is_some()
        || std::env::var("XDG_SESSION_TYPE").as_deref() == Ok("wayland");
    let gdk_prefers_wayland = prefers_wayland(std::env::var("GDK_BACKEND").ok().as_deref());
    let nvidia_driver_loaded = std::path::Path::new("/sys/module/nvidia_drm").exists();

    // GTK3/WebKitGTK can violate Wayland's explicit-sync protocol with the
    // proprietary NVIDIA driver, causing KWin to terminate the application.
    // Let an explicit user setting win so the workaround remains overridable.
    if wayland_session
        && gdk_prefers_wayland
        && nvidia_driver_loaded
        && std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none()
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    configure_webkit_renderer();

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(mobile)]
    let builder = builder.plugin(tauri_plugin_haptics::init());

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::prefers_wayland;

    #[test]
    fn detects_the_first_requested_gdk_backend() {
        assert!(prefers_wayland(None));
        assert!(prefers_wayland(Some("wayland")));
        assert!(prefers_wayland(Some("wayland,x11")));
        assert!(prefers_wayland(Some(" wayland , x11")));
        assert!(prefers_wayland(Some("*")));
        assert!(!prefers_wayland(Some("x11")));
        assert!(!prefers_wayland(Some("x11,wayland")));
    }
}
