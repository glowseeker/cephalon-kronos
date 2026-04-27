use image::{DynamicImage, GenericImageView};
use std::path::{Path, PathBuf};

fn get_slot_coords(squad_size: usize) -> Vec<(f64, f64, f64, f64)> {
    let (bx, by, bw, bh) = match squad_size {
        2 => (719.0 / 1920.0, 409.0 / 1080.0, 481.0 / 1920.0, 51.0 / 1080.0),
        3 => (600.0 / 1920.0, 409.0 / 1080.0, 720.0 / 1920.0, 51.0 / 1080.0),
        4 => (478.0 / 1920.0, 409.0 / 1080.0, 965.0 / 1920.0, 51.0 / 1080.0),
        _ => (839.0 / 1920.0, 409.0 / 1080.0, 241.0 / 1920.0, 51.0 / 1080.0),
    };
    let slot_w = bw / squad_size as f64;
    (0..squad_size).map(|i| {
        (bx + (i as f64 * slot_w), by, slot_w, bh)
    }).collect()
}

fn save_line(img: &image::GrayImage, stem: &str, slot: usize, line: usize, out_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let pad = 30u32;
    let (uw, uh) = img.dimensions();
    let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
    padded.fill(255);
    image::imageops::overlay(&mut padded, img, pad as i64, pad as i64);
    
    let out_path = out_dir.join(format!("{}_s{}_l{}.tif", stem, slot, line));
    padded.save(out_path)?;
    
    let gt_path = out_dir.join(format!("{}_s{}_l{}.gt.txt", stem, slot, line));
    if !gt_path.exists() {
        std::fs::write(gt_path, "")?;
    }
    Ok(())
}

fn process_image(img_path: &Path, out_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let img = image::open(img_path)?;
    let (iw, ih) = img.dimensions();
    let stem = img_path.file_stem().unwrap().to_string_lossy();
    let squad_size = if stem == "test1" || stem == "test11" { 3 }
                     else if stem == "test12" { 2 }
                     else { 4 };

    let coords = get_slot_coords(squad_size);

    for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
        let full_slot_w = (*w * iw as f64) as u32;
        let full_slot_h = (*h * ih as f64) as u32;
        let full_slot_x = (*x_off * iw as f64) as u32;
        let full_slot_y = (*y_off * ih as f64) as u32;

        if full_slot_x + full_slot_w > iw || full_slot_y + full_slot_h > ih { continue; }

        let slot_crop = img.crop_imm(full_slot_x, full_slot_y, full_slot_w, full_slot_h);
        let upscaled = slot_crop.resize(full_slot_w * 4, full_slot_h * 4, image::imageops::FilterType::CatmullRom);
        
        let mut gray = upscaled.to_luma8();
        for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
        
        let blurred = image::imageops::blur(&gray, 0.5);

        // --- DYNAMIC OTSU ---
        let mut hist = [0u32; 256];
        for p in blurred.pixels() { hist[p[0] as usize] += 1; }
        let total = (blurred.width() * blurred.height()) as f64;
        let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
        for i in 0..256usize { sum += i as f64 * hist[i] as f64; }
        let mut threshold = 128u8;
        for i in 0..256usize {
            q1 += hist[i] as f64;
            if q1 == 0.0 { continue; }
            let q2 = total - q1;
            if q2 == 0.0 { break; }
            sum_b += i as f64 * hist[i] as f64;
            let m1 = sum_b / q1;
            let m2 = (sum - sum_b) / q2;
            let var_between = q1 * q2 * (m1 - m2).powi(2);
            if var_between > max_var { max_var = var_between; threshold = i as u8; }
        }

        let mut binary = blurred.clone();
        for p in binary.pixels_mut() {
            p[0] = if p[0] <= threshold { 0 } else { 255 };
        }

        let (uw, uh) = binary.dimensions();
        let midpoint = uh / 2;
        let dyn_binary = DynamicImage::ImageLuma8(binary);
        let line1 = dyn_binary.crop_imm(0, 0, uw, midpoint).to_luma8();
        let line2 = dyn_binary.crop_imm(0, midpoint, uw, uh - midpoint).to_luma8();

        save_line(&line1, &stem, i + 1, 1, out_dir)?;
        save_line(&line2, &stem, i + 1, 2, out_dir)?;
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        println!("Usage: training_extractor <input_dir> <output_dir>");
        return;
    }
    let in_dir = PathBuf::from(&args[1]);
    let out_dir = PathBuf::from(&args[2]);
    std::fs::create_dir_all(&out_dir).unwrap();
    for entry in std::fs::read_dir(in_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        if ext == "png" || ext == "jpg" || ext == "jpeg" {
            println!("Processing {:?}...", path);
            if let Err(e) = process_image(&path, &out_dir) {
                println!("  Failed: {}", e);
            }
        }
    }
}
