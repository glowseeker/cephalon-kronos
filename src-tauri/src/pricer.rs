use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use tract_onnx::prelude::*;

static PRICER: OnceLock<Option<RivenPricer>> = OnceLock::new();

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RivenInput {
    pub weapon_name: String,
    pub re_rolls: u32,
    pub positive1: Option<String>,
    pub positive2: Option<String>,
    pub positive3: Option<String>,
    pub negative: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RivenFullEstimate {
    pub price: f32,
    pub grade: String,
    pub cdf_percentile: f32,
    pub expected_value: f32,
    pub expected_on_reroll: f32,
    pub probability_stagnant: f32,
    pub weapon_rank: Option<i32>,
    pub total_weapons: i32,
}

struct WeaponRankData {
    rank: i32,
    expected_value: f64,
    price_distribution: Vec<(f64, f64)>, // sorted (price, frequency)
}

type TractModel = SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>;

pub struct RivenPricer {
    model: Mutex<TractModel>,
    weapon_vocab: HashMap<String, i32>,
    attr_vocab: HashMap<String, i32>,
    weapon_name_to_url: HashMap<String, String>,
    attr_shortcuts: HashMap<String, String>,
    mask_index: i32,
    weapon_rankings: HashMap<String, WeaponRankData>,
}

pub fn get_models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("pricer-models")
}

pub fn ensure_loaded() {
    get_pricer();
}

pub fn get_weapon_names() -> Vec<String> {
    get_pricer()
        .map(|p| p.weapon_name_to_url.keys().cloned().collect())
        .unwrap_or_default()
}

fn grade_from_cdf(cdf: f32) -> &'static str {
    if cdf >= 0.95 { "S" }
    else if cdf >= 0.80 { "A" }
    else if cdf >= 0.60 { "B" }
    else if cdf >= 0.40 { "C" }
    else if cdf >= 0.20 { "D" }
    else { "F" }
}

fn parse_price_distribution(val: &serde_json::Value) -> Vec<(f64, f64)> {
    let mut pairs: Vec<(f64, f64)> = Vec::new();
    if let Some(obj) = val.as_object() {
        for (price_str, freq_val) in obj {
            let price: f64 = price_str.parse().unwrap_or(0.0);
            let freq: f64 = freq_val.as_f64().unwrap_or(0.0);
            if freq > 0.0 {
                pairs.push((price, freq));
            }
        }
    }
    pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    pairs
}

fn init_pricer_inner() -> Option<RivenPricer> {
    let dir = get_models_dir();
    let onnx_path = dir.join("price_model.onnx");
    let weapon_vocab_path = dir.join("weapon_vocab.json");
    let attr_vocab_path = dir.join("attr_vocab.json");
    let items_path = dir.join("items_data.json");
    let shortcuts_path = dir.join("attribute_name_shortcuts.json");
    let effect_map_path = dir.join("effect_to_url_name.json");
    let ranking_path = dir.join("weapon_ranking_information.json");

    if !dir.exists() || !onnx_path.exists() || !weapon_vocab_path.exists() || !attr_vocab_path.exists() {
        elog!("[PRICER] model files not yet available (download may still be in progress)");
        return None;
    }

    elog!("[PRICER] dir exists: {}", dir.exists());
    elog!("[PRICER] onnx_path: {:?}", onnx_path);

    let onnx_t0 = std::time::Instant::now();
    let raw = match tract_onnx::onnx().model_for_path(&onnx_path) {
        Ok(m) => m,
        Err(e) => { elog!("[PRICER] model_for_path failed: {e:?}"); return None; }
    };
    elog!("[PRICER] ONNX model loaded in {:?} ms", onnx_t0.elapsed().as_millis());

    let with_shapes = raw
        .with_input_fact(0, InferenceFact::dt_shape(i32::datum_type(), tvec![1, 1]))
        .and_then(|m| m.with_input_fact(1, InferenceFact::dt_shape(f32::datum_type(), tvec![1, 1])))
        .and_then(|m| m.with_input_fact(2, InferenceFact::dt_shape(i32::datum_type(), tvec![1, 4])));

    let typed = match with_shapes {
        Ok(m) => match m.into_optimized() {
            Ok(t) => t,
            Err(e) => {
                elog!("[PRICER] into_optimized failed: {e:?}, trying into_typed");
                match tract_onnx::onnx()
                    .model_for_path(&onnx_path)
                    .and_then(|m| m.with_input_fact(0, InferenceFact::dt_shape(i32::datum_type(), tvec![1, 1])))
                    .and_then(|m| m.with_input_fact(1, InferenceFact::dt_shape(f32::datum_type(), tvec![1, 1])))
                    .and_then(|m| m.with_input_fact(2, InferenceFact::dt_shape(i32::datum_type(), tvec![1, 4])))
                    .and_then(|m| m.into_typed())
                {
                    Ok(t) => t,
                    Err(e) => { elog!("[PRICER] into_typed on retry failed: {e:?}"); return None; }
                }
            }
        },
        Err(e) => {
            elog!("[PRICER] set_input_fact failed: {e:?}, trying without input facts");
            match tract_onnx::onnx()
                .model_for_path(&onnx_path)
                .and_then(|m| m.into_optimized())
            {
                Ok(t) => t,
                Err(e) => { elog!("[PRICER] into_optimized (w/o facts) failed: {e:?}"); return None; }
            }
        }
    };

    let model = match typed.into_runnable() {
        Ok(m) => m,
        Err(e) => { elog!("[PRICER] into_runnable failed: {e:?}"); return None; }
    };

    let weapon_vocab: Vec<String> = match serde_json::from_reader(
        std::fs::File::open(&weapon_vocab_path).ok()?
    ) {
        Ok(v) => v,
        Err(_) => return None,
    };

    let attr_vocab: Vec<String> = match serde_json::from_reader(
        std::fs::File::open(&attr_vocab_path).ok()?
    ) {
        Ok(v) => v,
        Err(_) => return None,
    };

    let items_data: HashMap<String, serde_json::Value> = match serde_json::from_reader(
        std::fs::File::open(&items_path).ok()?
    ) {
        Ok(v) => v,
        Err(_) => return None,
    };

    let shortcuts: HashMap<String, String> = match serde_json::from_reader(
        std::fs::File::open(&shortcuts_path).ok()?
    ) {
        Ok(v) => v,
        Err(_) => return None,
    };

    let effect_map: HashMap<String, String> = serde_json::from_reader(
        std::fs::File::open(&effect_map_path).ok()?
    ).unwrap_or_default();

    let mut weapon_name_to_url = HashMap::new();
    for (_key, val) in &items_data {
        if let (Some(item_name), Some(url_name)) = (
            val.get("item_name").and_then(|v| v.as_str()),
            val.get("url_name").and_then(|v| v.as_str()),
        ) {
            weapon_name_to_url.insert(item_name.to_lowercase(), url_name.to_string());
            weapon_name_to_url.insert(url_name.to_string(), url_name.to_string());
        }
    }

    let weapon_map: HashMap<String, i32> = weapon_vocab.into_iter().enumerate()
        .map(|(i, s)| (s, i as i32)).collect();
    let mask_index = *weapon_map.get("<NONE>").unwrap_or(&0);

    let attr_map: HashMap<String, i32> = attr_vocab.into_iter().enumerate()
        .map(|(i, s)| (s, i as i32)).collect();

    let mut attr_shortcuts = shortcuts;
    let identity: Vec<(String, String)> = attr_shortcuts.iter()
        .map(|(_, v)| (v.clone(), v.clone())).collect();
    for (k, v) in identity {
        attr_shortcuts.entry(k).or_insert(v);
    }
    for (display_name, url_name) in &effect_map {
        attr_shortcuts.entry(display_name.to_lowercase()).or_insert(url_name.clone());
    }

    let weapon_rankings: HashMap<String, WeaponRankData> = {
        let mut name_to_url: HashMap<String, String> = HashMap::new();
        for (_key, val) in &items_data {
            if let (Some(iname), Some(url_name)) = (
                val.get("item_name").and_then(|v| v.as_str()),
                val.get("url_name").and_then(|v| v.as_str()),
            ) {
                name_to_url.entry(iname.to_lowercase()).or_insert_with(|| url_name.to_lowercase());
            }
        }

        let file = std::fs::File::open(&ranking_path);
        match file {
            Ok(f) => {
                let json: HashMap<String, serde_json::Value> = serde_json::from_reader(f).unwrap_or_default();
                let mut rankings = HashMap::new();
                for (key, val) in json {
                    let rank = match val.get("rank").and_then(|v| v.as_i64()) {
                      Some(r) => r as i32,
                      None => continue,
                    };
                    let expected_value = match val.get("expected_value").and_then(|v| v.as_f64()) {
                      Some(e) => e,
                      None => continue,
                    };
                    let dist = match val.get("price_distribution") {
                      Some(d) => parse_price_distribution(d),
                      None => continue,
                    };
                    let item_lower = key.to_lowercase();
                    if let Some(url_lower) = name_to_url.get(&item_lower) {
                        rankings.entry(url_lower.clone()).or_insert(WeaponRankData { rank, expected_value, price_distribution: dist.clone() });
                    }
                    rankings.entry(item_lower.clone()).or_insert(WeaponRankData { rank, expected_value, price_distribution: dist });
                }
                rankings
            }
            Err(_) => HashMap::new()
        }
    };

    elog!("[PRICER INIT] weapon_rankings loaded: {} entries", weapon_rankings.len());

    Some(RivenPricer {
        model: Mutex::new(model),
        weapon_vocab: weapon_map,
        attr_vocab: attr_map,
        weapon_name_to_url,
        attr_shortcuts,
        mask_index,
        weapon_rankings,
    })
}

// The ONNX model load + optimization is expensive (~10-20s in a debug
// build). Use get_or_init FIRST so concurrent callers (e.g. the
// RivenOverlay's get_localized_weapon_names + get_known_weapon_names
// firing in parallel on mount) block on the OnceLock rather than each
// running init_pricer_inner() and thrashing the blocking pool.
fn get_pricer() -> Option<&'static RivenPricer> {
    elog!("[PRICER] get_pricer called");
    let opt = PRICER.get_or_init(|| {
        elog!("[PRICER] init_pricer_inner starting...");
        let r = init_pricer_inner();
        match &r {
            Some(p) => elog!("[PRICER] init_pricer_inner: pricer loaded, {} weapons in vocab", p.weapon_vocab.len()),
            None => elog!("[PRICER] init_pricer_inner: FAILED to load pricer"),
        }
        r
    });
    elog!("[PRICER] get_pricer: pricer is {}", if opt.is_some() { "Some" } else { "None" });
    opt.as_ref()
}

pub fn estimate_price(input: &RivenInput) -> Option<f32> {
    let pricer = get_pricer()?;
    run_inference(pricer, input).map(|(price, _)| price)
}

pub fn estimate_full(input: &RivenInput) -> Option<RivenFullEstimate> {
    elog!("[PRICER] input weapon_name='{}' positive1={:?} positive2={:?} positive3={:?} negative={:?}", 
    input.weapon_name, input.positive1, input.positive2, input.positive3, input.negative);
    let pricer = get_pricer()?;
    let (price, _) = run_inference(pricer, input)?;

    let key = input.weapon_name.to_lowercase();
    let url_name = pricer.weapon_name_to_url.get(&key)
        .map(|s| s.as_str())
        .unwrap_or(&key);

    let rank_entry = pricer.weapon_rankings.get(url_name);
    elog!("[PRICER] weapon='{}' url='{}' rank_found={}", input.weapon_name, url_name, rank_entry.is_some());
    let rank_data = rank_entry;

    let expected_value = rank_data.map(|r| r.expected_value as f32).unwrap_or(price);
    let weapon_rank = rank_data.map(|r| r.rank);

    let mut cdf_percentile = 50.0;
    let grade = if let Some(rd) = rank_data {
        let dist = &rd.price_distribution;
        let total_freq: f64 = dist.iter().map(|(_, f)| f).sum();
        if total_freq > 0.0 {
            let mut cum: f64 = 0.0;
            for (p, f) in dist {
                if *p <= price as f64 {
                    cum += f;
                } else {
                    break;
                }
            }
            let cdf = (cum / total_freq) as f32;
            cdf_percentile = cdf * 100.0;
            grade_from_cdf(cdf).to_string()
        } else {
            String::from("N/A")
        }
    } else {
        String::from("N/A")
    };

    let probability_stagnant = cdf_percentile / 100.0;
    let expected_on_reroll = expected_value;

    Some(RivenFullEstimate {
        price,
        grade,
        cdf_percentile,
        expected_value,
        expected_on_reroll,
        probability_stagnant,
        weapon_rank,
        total_weapons: pricer.weapon_rankings.len() as i32,
    })
}

pub fn estimate_full_batch(inputs: &[RivenInput]) -> Vec<Option<RivenFullEstimate>> {
    let _pricer = get_pricer();
    let results: Vec<Option<RivenFullEstimate>> = inputs.iter().map(|i| {
        estimate_full(i)
    }).collect();
    elog!("[PRICER BATCH] done {}", results.len());
    results
}

fn run_inference(pricer: &RivenPricer, input: &RivenInput) -> Option<(f32, f32)> {
    let key = input.weapon_name.to_lowercase();
    let url_name = pricer.weapon_name_to_url.get(&key)
        .map(|s| s.as_str())
        .unwrap_or(&key);
    let weapon_idx = match pricer.weapon_vocab.get(url_name) {
        Some(idx) => *idx,
        // Unknown weapon (localized name, typo, or a model-unknown item):
        // do NOT fall back to the <NONE> mask  -  that slot makes the model
        // emit a population-average price with no weapon_rank, which the UI
        // shows as a fake value with "weapon rank n/a". Report nothing.
        None => {
            elog!("[PRICER] unknown weapon '{}' (url '{}')  -  no estimate", input.weapon_name, url_name);
            return None;
        }
    };

    let attr_slots = [&input.positive1, &input.positive2, &input.positive3, &input.negative];
    let mut attr_indices = [pricer.mask_index; 4];
    for (i, attr_opt) in attr_slots.iter().enumerate() {
        if let Some(attr) = attr_opt {
            let key = attr.to_lowercase();
            let url = pricer.attr_shortcuts.get(&key)
                .map(|s| s.as_str())
                .unwrap_or(&key);
            attr_indices[i] = *pricer.attr_vocab.get(url)
                .unwrap_or(&pricer.mask_index);
            elog!("[PRICER] attr[{}] = '{}' -> url '{}' -> idx {}", i, attr, url, attr_indices[i]);
        } else {
            elog!("[PRICER] attr[{}] = None (mask)", i);
        }
    }

    let re_rolled: f32 = if input.re_rolls > 0 { 1.0 } else { 0.0 };
    elog!("[PRICER] re_rolled={}", re_rolled);

    // Build input tensors for tract
    // weapon_idx: shape [1, 1] int32
    let weapon_tensor: Tensor = tract_ndarray::arr2(&[[weapon_idx]])
        .into_tensor();
    // re_rolled: shape [1, 1] f32
    let re_rolled_tensor: Tensor = tract_ndarray::arr2(&[[re_rolled]])
        .into_tensor();
    // attr_indices: shape [1, 4] int32
    let attr_tensor: Tensor = tract_ndarray::arr2(&[[
        attr_indices[0], attr_indices[1], attr_indices[2], attr_indices[3]
    ]]).into_tensor();
    elog!("[PRICER] input tensors: weapon_idx={}, re_rolled={}, attrs=[{}, {}, {}, {}]",
        weapon_idx, re_rolled, attr_indices[0], attr_indices[1], attr_indices[2], attr_indices[3]);

    elog!("[PRICER] acquiring model mutex...");
    let model_guard = match pricer.model.lock() {
        Ok(g) => g,
        Err(e) => {
            elog!("[PRICER] model mutex POISONED: {:?}", e);
            return None;
        }
    };
    elog!("[PRICER] model mutex acquired, running inference...");

    // tract takes inputs positionally in the order the ONNX model declares them:
    // weapon_idx, re_rolled, attr_indices
    let outputs = match model_guard.run(tvec![
        weapon_tensor.into(),
        re_rolled_tensor.into(),
        attr_tensor.into(),
    ]) {
        Ok(o) => {
            elog!("[PRICER] model.run() succeeded");
            o
        }
        Err(e) => {
            elog!("[PRICER] model.run() FAILED: {:?}", e);
            return None;
        }
    };

    let output = match outputs[0].to_array_view::<f32>() {
        Ok(v) => v,
        Err(e) => {
            elog!("[PRICER] to_array_view FAILED: {:?}", e);
            return None;
        }
    };
    let log_price = output[[0, 0]];
    elog!("[PRICER] model output: log_price={}", log_price);
    Some((log_price.exp() - 1.0, log_price))
}