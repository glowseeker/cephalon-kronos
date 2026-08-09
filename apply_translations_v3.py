#!/usr/bin/env python3
"""
Apply translations from T to all 13 locale files.
Only applies keys that ARE in T (which have per-locale translations).
For keys not in T, leaves the locale value as-is.
This ensures no English is introduced and no French is used as fallback for non-French locales.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

# Load T (translation table)
T = load_json('/tmp/tables/translation_table.json')

# Load all locale files
en = load_json('src/lib/i18n/en.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

def flat_ui(data):
    return dict(data.get('ui', {}))

def set_ui_val(data, key, val):
    ui = data.setdefault('ui', {})
    if key.startswith('ui.'):
        ui[key] = val
    else:
        # Check if 'ui.' + key exists, or just key
        if key in ui:
            ui[key] = val
        else:
            ui[f'ui.{key}'] = val

flat_en = flat_ui(en)
flat = {lo: flat_ui(langs[lo]) for lo in LOCALES}

# Count before
before = {}
for lo in LOCALES:
    before[lo] = sum(1 for k in flat_en if flat[lo].get(k, flat_en.get(k)) == flat_en.get(k))

print("Before:")
for lo in LOCALES:
    print(f"  {lo}: {before[lo]} untranslated")

# For each EN key in T, apply translations
applied = {lo: 0 for lo in LOCALES}
skipped = {lo: 0 for lo in LOCALES}

for key, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    
    # Check if en_val is in T
    if en_val not in T:
        continue
    
    # Get translation data from T
    trans_data = T[en_val]
    
    for lo in LOCALES:
        current_val = flat[lo].get(key, en_val)
        if current_val != en_val:
            # Already translated in this locale, skip
            skipped[lo] += 1
            continue
        
        # Get translation for this locale
        if isinstance(trans_data, dict):
            if lo in trans_data:
                new_val = trans_data[lo]
            else:
                skipped[lo] += 1
                continue
        elif isinstance(trans_data, list):
            idx = LOCALES.index(lo)
            if idx < len(trans_data):
                new_val = trans_data[idx]
            else:
                skipped[lo] += 1
                continue
        else:
            skipped[lo] += 1
            continue
        
        if new_val and new_val != en_val:
            set_ui_val(langs[lo], key, new_val)
            applied[lo] += 1

# Save all locale files
for lo in LOCALES:
    save_json(f'src/lib/i18n/{lo}.json', langs[lo])

print("\nAfter:")
for lo in LOCALES:
    total = len(flat_en)
    untranslated = sum(1 for k in flat_en if flat[lo].get(k, flat_en.get(k)) == flat_en.get(k))
    print(f"  {lo}: {applied[lo]} applied, {skipped[lo]} skipped, {untranslated} remaining untranslated out of {total}")

print(f"\nT has {len(T)} entries")
print(f"Total applied: {sum(applied.values())}")
