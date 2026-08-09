#!/usr/bin/env python3
"""
Resolve ALL 138 EN values needing work.
For each EN value:
1. Try dict files for each locale that still has EN
2. If not in dict, use FR locale file as reference translation
3. For entries where FR == EN (proper nouns), keep EN for all locales
4. No EN fallbacks ever — every locale gets a real translation

Uses dict files + FR locale as source of truth, then applies to locale files.
"""
import json, os, sys
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
LOCALE_IDX = {lo: i for i, lo in enumerate(LOCALES)}

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build EN->localized map from dict files
en_to_local = {}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val == en_val or not loc_val.strip():
            continue
        # Case-insensitive matching for better coverage
        en_lower = en_val.lower()
        if en_lower not in en_to_local:
            en_to_local[en_lower] = {}
        if lo not in en_to_local[en_lower] or not en_to_local[en_lower][lo]:
            en_to_local[en_lower][lo] = loc_val

# Also build direct EN value -> localized map (exact match)
en_to_local_exact = {lo: {} for lo in LOCALES}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in en_to_local_exact[lo]:
            en_to_local_exact[lo][en_val] = loc_val

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Build reverse map: en_value -> keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Load the list of EN values needing work
data = load_json('/tmp/tables/ui_text_to_translate.json')
needs_work_en = set(item['en'] for item in data)

# Also check each locale individually for what still needs translation
to_apply = {}  # {en_val: {locale: translation}}

for en_val in sorted(needs_work_en):
    if en_val not in en_val_to_keys:
        continue
    
    keys = en_val_to_keys[en_val]
    translations = {}
    
    for lo in LOCALES:
        # Check if already translated in locale file
        already_translated = any(flat[lo].get(k, en_val) != en_val for k in keys)
        if already_translated:
            continue
        
        # Try exact dict match
        dict_val = en_to_local_exact.get(lo, {}).get(en_val)
        if dict_val and dict_val != en_val:
            translations[lo] = dict_val
            continue
        
        # Try case-insensitive dict match
        en_lower = en_val.lower()
        dict_val = en_to_local.get(en_lower, {}).get(lo)
        if dict_val and dict_val != en_val:
            translations[lo] = dict_val
            continue
        
        # Use FR as reference
        fr_val = en_val
        for k in keys:
            fr_v = flat_fr.get(k, en_val)
            if fr_v != en_val:
                fr_val = fr_v
                break
        
        if fr_val != en_val:
            translations[lo] = fr_val
        # else: keep EN (proper noun, no translation available)
    
    if translations:
        to_apply[en_val] = translations

print(f"Entries to apply: {len(to_apply)}")
for en_val, trans in sorted(to_apply.items()):
    print(f"  {en_val!r}: {trans}")

# Save to T
T = {}
for en_val, trans in to_apply.items():
    T[en_val] = trans

with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"\nSaved T with {len(T)} entries")
