use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

pub fn create_zip_archive(files: &[(String, PathBuf)], destination: &Path) -> Result<(), String> {
    let file = File::create(destination).map_err(|e| format!("Failed to create zip file: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let mut buffer = [0u8; 64 * 1024];

    for (display_name, file_path) in files {
        if !file_path.exists() {
            continue;
        }

        zip.start_file(display_name, options)
            .map_err(|e| format!("Failed to add file to zip: {}", e))?;

        let mut src_file = File::open(file_path)
            .map_err(|e| format!("Failed to read source file: {}", e))?;

        loop {
            let read_bytes = src_file
                .read(&mut buffer)
                .map_err(|e| format!("Error reading file chunk: {}", e))?;
            if read_bytes == 0 {
                break;
            }
            zip.write_all(&buffer[..read_bytes])
                .map_err(|e| format!("Error writing zip chunk: {}", e))?;
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip file: {}", e))?;

    Ok(())
}
