use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub struct TempManager {
    base_dir: PathBuf,
}

impl TempManager {
    pub fn new() -> Self {
        let base_dir = std::env::temp_dir().join("LocalDrop_Temp");
        let _ = fs::create_dir_all(&base_dir);
        Self { base_dir }
    }

    /// Creates a temporary file path with a unique UUID
    pub fn create_temp_path(&self, extension: Option<&str>) -> (String, PathBuf) {
        let id = Uuid::new_v4().to_string();
        let file_name = match extension {
            Some(ext) => format!("{}.{}", id, ext.trim_start_matches('.')),
            None => format!("{}.tmp", id),
        };
        let path = self.base_dir.join(file_name);
        (id, path)
    }

    /// Removes a temporary file safely
    pub fn remove_file(path: &Path) {
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    /// Cleans up any remaining temporary files in the temp directory
    pub fn clean_all(&self) {
        if let Ok(entries) = fs::read_dir(&self.base_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = fs::remove_file(path);
                }
            }
        }
    }
}

impl Drop for TempManager {
    fn drop(&mut self) {
        self.clean_all();
    }
}
