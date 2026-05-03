use std::fs::OpenOptions;
use std::io::Write;
use tauri::AppHandle;

pub fn log_to_disk(app: &AppHandle, message: &str) {
    // 1. Get the app's persistent data directory
    if let Some(mut path) = app.path_resolver().app_data_dir() {
        // Ensure the directory exists
        let _ = std::fs::create_dir_all(&path);
        
        path.push("overlay_debug.log");
        
        // 2. Format with local system time (MS since epoch)
        let now = match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
            Ok(d) => d.as_millis(),
            Err(_) => 0,
        };

        // 3. Append to file
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&path) 
        {
            let _ = writeln!(file, "[SystemTime: {}ms] {}", now, message);
        }
    }
}
