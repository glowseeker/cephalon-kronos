//! Localized weapon-name map for OCR riven matching.
//!
//! Chain: wfcd-combined.json (English names + uniqueName) →
//! ExportWeapons.json (uniqueName → dict key) → dict.json (localized name).
//!
//! The map is restricted to the pricer vocabulary (`items_data.json` keys) so
//! that resolving a localized OCR string always lands on a priceable weapon.
//! Weapons absent from wfcd-combined.json (brand-new releases) self-map to
//! their English name; kitgun chamber names are proper nouns and stay English
//! in every locale.
//!
//! Results are cached per locale; only the first call for a locale pays the
//! 31MB wfcd-combined.json parse.

use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

#[derive(Debug, Clone, serde::Serialize)]
pub struct WeaponNamePair {
    pub english: String,
    pub localized: String,
}

static CACHE: LazyLock<Mutex<HashMap<String, Vec<WeaponNamePair>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

const WEAPON_CATEGORIES: &[&str] = &[
    "Primary",
    "Secondary",
    "Melee",
    "Arch-Gun",
    "Arch-Melee",
    "SentinelWeapons",
];

fn read_json_file(path: &std::path::Path) -> Option<serde_json::Value> {
    let raw = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

fn resolve_file(app: &tauri::AppHandle, relative: &str) -> Option<std::path::PathBuf> {
    let path = crate::resolve_path(relative);
    if path.exists() {
        return Some(path);
    }
    crate::resolve_bundled_path(app, relative).filter(|p| p.exists())
}

/// English weapon names from wfcd-combined.json (weapon categories plus kitgun
/// chambers), mapped to their uniqueName.
fn wfcd_vocab_weapons(app: &tauri::AppHandle) -> HashMap<String, String> {
    let mut map: HashMap<String, String> = HashMap::new();
    let Some(wfcd_path) = resolve_file(app, "data/assets/wfcd/wfcd-combined.json") else {
        elog!("[WEAPON-I18N] wfcd-combined.json not found");
        return map;
    };
    let Some(wfcd) = read_json_file(&wfcd_path) else {
        elog!("[WEAPON-I18N] wfcd-combined.json unreadable");
        return map;
    };

    for cat in WEAPON_CATEGORIES {
        let Some(items) = wfcd.get(*cat).and_then(|v| v.as_array()) else {
            continue;
        };
        for item in items {
            let (Some(name), Some(unique_name)) = (
                item.get("name").and_then(|v| v.as_str()),
                item.get("uniqueName").and_then(|v| v.as_str()),
            ) else {
                continue;
            };
            map.entry(name.to_string()).or_insert_with(|| unique_name.to_string());
        }
    }

    // Kitgun chamber names (proper nouns  -  same in every locale).
    let Some(misc) = wfcd.get("Misc").and_then(|v| v.as_array()) else {
        return map;
    };
    for item in misc {
        let (Some(name), Some(unique_name)) = (
            item.get("name").and_then(|v| v.as_str()),
            item.get("uniqueName").and_then(|v| v.as_str()),
        ) else {
            continue;
        };
        let is_kitgun = unique_name.contains("KitGun") || unique_name.contains("ModularSecondary");
        if is_kitgun {
            map.entry(name.to_string()).or_insert_with(|| unique_name.to_string());
        }
    }

    map
}

/// Build the localized→English pairs for one locale.
fn build_map(app: &tauri::AppHandle, locale: &str) -> Vec<WeaponNamePair> {
    let vocab_path = resolve_file(app, "data/bin/pricer-models/items_data.json");
    let vocab: Vec<String> = match vocab_path.and_then(|p| read_json_file(&p)) {
        Some(serde_json::Value::Object(obj)) => obj.keys().cloned().collect(),
        _ => {
            elog!("[WEAPON-I18N] items_data.json missing; no pricer vocab");
            return Vec::new();
        }
    };

    let wfcd_names = wfcd_vocab_weapons(app);

    // Per-locale name resolution. For `en` the localized name is the English
    // name itself; otherwise resolve ExportWeapons dict keys through dict.json
    // (the actively-synced locale dict), falling back to English.
    let mut dict: Option<serde_json::Value> = None;
    let mut weapons: Option<serde_json::Value> = None;
    if locale != "en" {
        dict = resolve_file(app, "data/export/dict.json").and_then(|p| read_json_file(&p));
        weapons = resolve_file(app, "data/export/ExportWeapons.json")
            .and_then(|p| read_json_file(&p));
    }

    let mut pairs: Vec<WeaponNamePair> = Vec::with_capacity(vocab.len());
    for english in vocab {
        let localized = match (&dict, &weapons) {
            (Some(dict), Some(weapons)) => {
                match wfcd_names.get(&english).and_then(|un| weapons.get(un)) {
                    Some(entry) => {
                        let name_key = entry.get("name").and_then(|v| v.as_str());
                        match name_key.and_then(|k| dict.get(k)).and_then(|v| v.as_str()) {
                            Some(loc) if !loc.is_empty() => loc.to_string(),
                            _ => english.clone(),
                        }
                    }
                    None => english.clone(),
                }
            }
            _ => english.clone(),
        };
        pairs.push(WeaponNamePair {
            english: english.clone(),
            localized,
        });
    }

    pairs
}

/// Return the localized→English weapon map for `locale`, cached per locale.
pub fn localized_weapon_names(app: &tauri::AppHandle, locale: &str) -> Vec<WeaponNamePair> {
    {
        if let Ok(guard) = CACHE.lock() {
            if let Some(hit) = guard.get(locale) {
                return hit.clone();
            }
        }
    }

    let pairs = build_map(app, locale);
    if let Ok(mut guard) = CACHE.lock() {
        guard.insert(locale.to_string(), pairs.clone());
    }
    pairs
}
