#!/usr/bin/env python3
"""
Apply ALL translations: merge existing table + remaining, apply to 13 locales.
All translation data is inline as a Python dict to avoid file path issues.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def flat_ui(data):
    """Flatten ui section + 6 flattened sections into a flat dict."""
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

def unflat_ui(data, flat):
    """Write flat keys back to their proper locations."""
    ui = data.setdefault('ui', {})
    for k, v in flat.items():
        if k.startswith(('relics.', 'rivens.', 'mastery.', 'collectibles.', 'settings.', 'adversaries.')):
            sec, key = k.split('.', 1)
            if sec in data and isinstance(data[sec], dict):
                data[sec][key] = v
        elif '.' not in k:
            # Top-level ui key
            pass
        else:
            # ui.* key (flat dotted) — set in ui section
            ui[k] = v
    return data

# Load existing locale files
files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ['en', 'fr'] + LOCALES}

# Load the translation table
T = json.load(open('/tmp/tables/translation_table.json', encoding='utf-8'))

# Load all untranslated keys
untranslated = json.load(open('/tmp/tables/remaining_categorized.json', encoding='utf-8'))

# Separate proper nouns (FR==EN) from translatable (FR!=EN)
proper_nouns = {k: v for k, v in untranslated.items() if v['category'] == 'proper_noun'}
translatable = {k: v for k, v in untranslated.items() if v['category'] == 'translatable'}

applied = 0
for key, info in untranslated.items():
    en_val = info['en']
    fr_val = info['fr']
    
    for lo in LOCALES:
        # Skip if this locale already has it translated
        file = files[lo]
        # Navigate to the key location
        parts = key.split('.', 1)
        if parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
            sec = parts[0]
            k = parts[1]
            current = file.get(sec, {}).get(k, en_val)
        elif parts[0] == 'ui':
            sec = parts[1].split('.')[0] if '.' in parts[1] else 'other'
            # Navigate the nested ui structure
            current = file.get('ui', {}).get(key, en_val)
        else:
            current = file.get('ui', {}).get(key, en_val)
        
        if current != en_val:
            continue  # Already translated
        
        # Determine translation
        if en_val in T and lo in LOCALES:
            # Use pre-defined translation
            vals = T[en_val]
            idx = LOCALES.index(lo)
            new_val = vals[idx]
        else:
            # Proper noun or unknown: keep EN
            new_val = en_val
        
        # Apply translation
        if parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
            sec = parts[0]
            k = parts[1]
            file.setdefault(sec, {})[k] = new_val
        else:
            # ui.* key
            file.setdefault('ui', {})[key] = new_val
        applied += 1

# Save all locale files
for lo in ['en', 'fr'] + LOCALES:
    outpath = f'src/lib/i18n/{lo}.json'
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(files[lo], f, ensure_ascii=False, indent=2)
    
    # Count remaining EN values
    flat = flat_ui(files[lo])
    en_flat = flat_ui(files['en'])
    remaining = sum(1 for k in flat if k in en_flat and flat[k] == en_flat[k])
    print(f"  {lo}: {remaining} EN values remaining")

print(f"\nTotal: applied {applied} translations")
