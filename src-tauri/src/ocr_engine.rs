use image::DynamicImage;
use ocr_rs::{OcrEngine, RecModel};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

/// Holds a loaded rec model plus its allow-list of characters (read from the
/// matching ppocr_keys_*.txt). The DET model is shared across all locales.
struct LoadedLocale {
    rec: &'static RecModel,
    pipeline: &'static OcrEngine,
    allowed_chars: Vec<char>,
}

/// Locale-keyed model cache. Models are leaked on first load so the stored
/// `&'static` refs outlive the `MutexGuard` (RecModel/OcrEngine are not Clone).
/// Each locale loads at most once for the lifetime of the process (~4-16MB per
/// locale, fine for a desktop overlay); we do *not* load all locales up front —
/// only on first OCR for that locale.
static LOCALES: OnceLock<Mutex<HashMap<String, LoadedLocale>>> = OnceLock::new();

/// Maps a gameLocale to (rec_model_file, charset_keys_file) using the PP-OCRv5
/// language models published alongside ocr-rs (see ocr-rs README "PP-OCRv5
/// Language Model Support List"). The DET model is shared by all V5 locales.
pub fn locale_model_files(locale: &str) -> (&'static str, &'static str) {
    match locale {
        "ko" => ("korean_PP-OCRv5_mobile_rec_infer.mnn", "ppocr_keys_korean.txt"),
        // eslav covers Russian, Belarusian, Ukrainian, Bulgarian, etc.
        "uk" | "ru" | "be" | "bg" | "mk" | "mn" => (
            "eslav_PP-OCRv5_mobile_rec_infer.mnn",
            "ppocr_keys_eslav.txt",
        ),
        "th" => ("th_PP-OCRv5_mobile_rec_infer.mnn", "ppocr_keys_th.txt"),
        // latin covers the diacritic Latin-script locales used by the app.
        "de" | "fr" | "es" | "pt" | "it" | "tr" | "pl" | "nl" | "sv" | "no" | "da"
        | "fi" | "cs" | "sk" | "hu" | "ro" | "el" => (
            "latin_PP-OCRv5_mobile_rec_infer.mnn",
            "ppocr_keys_latin.txt",
        ),
        // ja / zh / tc / en / others -> default (CN/EN/JP) model.
        _ => ("PP-OCRv5_mobile_rec.mnn", "ppocr_keys_v5.txt"),
    }
}

/// Load a locale's rec model + pipeline. Returns None if the files are missing
/// or unloadable (caller falls back to English).
fn load_locale(locale: &str) -> Option<LoadedLocale> {
    let models_dir = models_dir();
    let (rec_name, keys_name) = locale_model_files(locale);
    let det_path = models_dir.join("PP-OCRv5_mobile_det.mnn");
    let rec_path = models_dir.join(rec_name);
    let keys_path = models_dir.join(keys_name);
    let allowed_chars: Vec<char> = std::fs::read_to_string(&keys_path)
        .map(|s| s.chars().filter(|c| *c != '\n' && *c != '\r').collect())
        .unwrap_or_default();
    if !(det_path.exists() && rec_path.exists()) {
        return None;
    }
    let rec_model = RecModel::from_file(
        rec_path.to_string_lossy().as_ref(),
        keys_path.to_string_lossy().as_ref(),
        None,
    )
    .ok()?;
    let pipeline = OcrEngine::new(det_path, rec_path, keys_path, None).ok()?;
    // Leak so we can hand back `&'static` refs (RecModel/OcrEngine are !Clone).
    // Bounded by locales actually used in a session — acceptable for a desktop
    // overlay app (~4-16MB resident per touched locale).
    let rec_static: &'static RecModel = Box::leak(Box::new(rec_model));
    let pipe_static: &'static OcrEngine = Box::leak(Box::new(pipeline));
    Some(LoadedLocale {
        rec: rec_static,
        pipeline: pipe_static,
        allowed_chars,
    })
}

/// Ensure the locale is loaded; returns a copyable view (`&'static` refs +
/// cloned allow-list). Falls back to English if the locale's files are absent.
fn get_locale(locale: &str) -> Option<LocaleRef> {
    let mut map = LOCALES.get_or_init(|| Mutex::new(HashMap::new())).lock().unwrap();
    if let Some(e) = map.get(locale) {
        return Some(LocaleRef {
            rec: e.rec,
            pipeline: e.pipeline,
            allowed_chars: e.allowed_chars.clone(),
        });
    }
    if let Some(e) = load_locale(locale) {
        let r = LocaleRef {
            rec: e.rec,
            pipeline: e.pipeline,
            allowed_chars: e.allowed_chars.clone(),
        };
        map.insert(locale.to_string(), e);
        return Some(r);
    }
    // Fallback to English.
    if let Some(e) = map.get("en") {
        return Some(LocaleRef {
            rec: e.rec,
            pipeline: e.pipeline,
            allowed_chars: e.allowed_chars.clone(),
        });
    }
    let e = load_locale("en")?;
    let r = LocaleRef {
        rec: e.rec,
        pipeline: e.pipeline,
        allowed_chars: e.allowed_chars.clone(),
    };
    map.insert("en".to_string(), e);
    Some(r)
}

struct LocaleRef {
    rec: &'static RecModel,
    pipeline: &'static OcrEngine,
    allowed_chars: Vec<char>,
}

pub fn models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("ocr-models")
}

/// Single-line recognition (relic-rewards path). The output is filtered to the
/// locale's charset (data-driven via ppocr_keys_<lang>.txt) instead of ascii-only,
/// so Korean/Thai/Cyrillic/accented-Latin glyphs survive while OCR noise from
/// glyphs outside the locale vocab is still rejected.
pub fn recognize(gray_image: &image::GrayImage, locale: &str) -> String {
    let entry = match get_locale(locale) {
        Some(e) => e,
        None => return String::new(),
    };
    let (w, h) = gray_image.dimensions();
    if h == 0 {
        return String::new();
    }
    let target_h = 64u32;
    let target_w = (w as f32 * (target_h as f32 / h as f32)).round() as u32;
    let upscaled = image::imageops::resize(
        gray_image,
        target_w,
        target_h,
        image::imageops::FilterType::Lanczos3,
    );
    let dyn_img = DynamicImage::ImageLuma8(upscaled);
    let raw = entry
        .rec
        .recognize(&dyn_img)
        .map(|r| r.text)
        .unwrap_or_default();
    let allowed: std::collections::HashSet<char> =
        entry.allowed_chars.iter().copied().collect();
    raw.chars().filter(|c| allowed.contains(c)).collect()
}

/// Multi-line recognition (riven-card path). Uses the locale's pipeline
/// (det + locale-specific rec) so localized stat names come back in-script.
pub fn recognize_riven(text_region: &DynamicImage, locale: &str) -> Vec<String> {
    elog!("[OCR] recognize_riven START: locale={}", locale);
    let entry = match get_locale(locale) {
        Some(e) => e,
        None => {
            elog!("[OCR] recognize_riven: get_locale returned None for '{}'", locale);
            return Vec::new();
        }
    };
    elog!("[OCR] recognize_riven: locale loaded, running pipeline...");
    let results = match entry.pipeline.recognize(text_region) {
        Ok(r) => {
            elog!("[OCR] recognize_riven: pipeline returned {} results", r.len());
            r
        }
        Err(e) => {
            elog!("[OCR] recognize_riven: pipeline error: {:?}", e);
            return Vec::new();
        }
    };
    let mut sorted: Vec<_> = results
        .into_iter()
        .filter(|r| !r.text.is_empty())
        .collect();
    sorted.sort_by_key(|r| r.bbox.rect.top());
    elog!("[OCR] recognize_riven: {} results after filtering", sorted.len());
    sorted.into_iter().map(|r| {
        elog!("[OCR] recognize_riven: result='{}'", r.text);
        r.text
    }).collect()
}
