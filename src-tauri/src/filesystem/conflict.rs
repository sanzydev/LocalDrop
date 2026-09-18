use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum ConflictStrategy {
    Replace,
    KeepBoth,
    Cancel,
}

/// Resolves a file destination path based on the conflict strategy.
/// If the file does not exist, returns the original destination.
/// If strategy is KeepBoth, generates "name (1).ext", "name (2).ext", etc.
pub fn resolve_destination_path(
    dir: &Path,
    filename: &str,
    strategy: ConflictStrategy,
) -> Option<PathBuf> {
    let target = dir.join(filename);

    if !target.exists() || strategy == ConflictStrategy::Replace {
        return Some(target);
    }

    if strategy == ConflictStrategy::Cancel {
        return None;
    }

    // KeepBoth: find next available suffix
    let path = Path::new(filename);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(filename);
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");

    // Strip existing (n) if present
    let (clean_stem, mut counter) = if let Some(idx) = stem.rfind(" (") {
        if stem.ends_with(')') {
            let num_str = &stem[idx + 2..stem.len() - 1];
            if let Ok(n) = num_str.parse::<u32>() {
                (&stem[..idx], n + 1)
            } else {
                (stem, 1)
            }
        } else {
            (stem, 1)
        }
    } else {
        (stem, 1)
    };

    loop {
        let candidate_name = if ext.is_empty() {
            format!("{} ({})", clean_stem, counter)
        } else {
            format!("{} ({}).{}", clean_stem, counter, ext)
        };

        let candidate_path = dir.join(&candidate_name);
        if !candidate_path.exists() {
            return Some(candidate_path);
        }
        counter += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conflict_resolution() {
        let temp_dir = std::env::temp_dir().join("localdrop_test_conflict");
        let _ = std::fs::create_dir_all(&temp_dir);

        let file_path = temp_dir.join("test.txt");
        let _ = std::fs::write(&file_path, "hello");

        // Replace strategy
        let resolved_replace = resolve_destination_path(&temp_dir, "test.txt", ConflictStrategy::Replace);
        assert_eq!(resolved_replace, Some(file_path.clone()));

        // Cancel strategy
        let resolved_cancel = resolve_destination_path(&temp_dir, "test.txt", ConflictStrategy::Cancel);
        assert_eq!(resolved_cancel, None);

        // KeepBoth strategy
        let resolved_keep = resolve_destination_path(&temp_dir, "test.txt", ConflictStrategy::KeepBoth);
        assert_eq!(resolved_keep, Some(temp_dir.join("test (1).txt")));

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}
