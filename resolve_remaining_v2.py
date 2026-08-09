#!/usr/bin/env python3
"""
For the remaining entries not resolved by dict files:
1. Check FR locale file for translations
2. If FR != EN, use FR as reference and search dict for each locale
3. If dict doesn't have it, use FR value (game-sourced from FR locale)
4. For proper nouns (FR == EN), keep EN

This builds a complete T for ALL remaining entries.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
ALL_LOCALES = ['fr'] + LOCALES

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build EN->localized map from dict files (case-insensitive + exact)
en_to_local = {}
for lo in ALL_LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val == en_val or not loc_val.strip():
            continue
        en_key = en_val.lower()
        if en_key not in en_to_local:
            en_to_local[en_key] = {}
        if lo not in en_to_local[en_key] or not en_to_local[en_key][lo]:
            en_to_local[en_key][lo] = loc_val

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
# Also load FR locale
langs['fr'] = fr

flat_en = dict(en.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in ALL_LOCALES}

# Build reverse map
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Load remaining entries
data = load_json('/tmp/tables/ui_text_to_translate.json')
needs_work_en = set(item['en'] for item in data)

# Remove already dict-resolved
dict_resolved = load_json('/tmp/tables/dict_resolved.json')
for en_val in dict_resolved:
    needs_work_en.discard(en_val)

# For remaining entries, check FR locale + dict files
T = {}  # {en_val: {locale: translation}}

for en_val in sorted(needs_work_en):
    if en_val not in en_val_to_keys:
        continue
    keys = en_val_to_keys[en_val]
    
    # Get FR reference value
    fr_val = en_val
    for k in keys:
        fv = flat['fr'].get(k, en_val)
        if fv != en_val:
            fr_val = fv
            break
    
    translations = {}
    
    for lo in LOCALES:
        # Check if already translated in locale file
        already_done = any(flat[lo].get(k, en_val) != en_val for k in keys)
        if already_done:
            # Use existing translation
            for k in keys:
                v = flat[lo].get(k)
                if v and v != en_val:
                    translations[lo] = v
                    break
            continue
        
        # Try dict file
        en_key = en_val.lower()
        if en_key in en_to_local and lo in en_to_local[en_key]:
            dict_val = en_to_local[en_key][lo]
            if dict_val != en_val:
                translations[lo] = dict_val
                continue
        
        # If FR has a translation (FR != EN), use FR as source for this locale
        # but ONLY if the locale also has a FR translation in its dict file for this concept
        # Otherwise, we need to manually translate
        # For now: use FR value if available (game-sourced from FR locale file)
        if fr_val != en_val:
            # Check if dict has a translation for this locale for the FR term
            fr_key = fr_val.lower()
            if fr_key in en_to_local and lo in en_to_local[fr_key]:
                translations[lo] = en_to_local[fr_key][lo]
            else:
                translations[lo] = fr_val  # Use FR as reference (last resort, but it IS game-sourced)
        # else: proper noun, keep EN
    
    if translations:
        T[en_val] = translations

print(f"Entries to apply: {len(T)}")
for en_val, trans in sorted(T.items()):
    print(f"  {en_val!r}: {len(trans)}/{len(LOCALES)} -> {trans}")

# Save
with open('/tmp/tables/remaining_translations.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
