#!/usr/bin/env python3
"""
Apply translations from /tmp/tables/remaining_translations.json to locale files.
Uses per-locale translations — NO FR-as-fallback.
Each entry in the file has {locale: translation} for all 13 locales.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load remaining translations
T = load_json('/tmp/tables/remaining_translations.json')

# Load locale files
en = load_json('src/lib/i18n/en.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))

# Build reverse map: en_value -> keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

count = 0
for en_val, locale_trans in T.items():
    if en_val not in en_val_to_keys:
        continue
    keys = en_val_to_keys[en_val]
    
    for lo in LOCALES:
        if lo not in locale_trans:
            continue
        trans = locale_trans[lo]
        if trans == en_val:
            continue
        
        for k in keys:
            # Key might be stored as flat dotted key inside ui section
            if k in langs[lo].get('ui', {}):
                current = langs[lo]['ui'][k]
                if current == en_val:  # Only update if untranslated
                    langs[lo]['ui'][k] = trans
                    count += 1
            # Key with ui. prefix (flat key in ui section)
            prefixed = f'ui.{k}'
            if prefixed in langs[lo].get('ui', {}):
                current = langs[lo]['ui'][prefixed]
                if current == en_val:
                    langs[lo]['ui'][prefixed] = trans
                    count += 1

# Save all locale files
for lo in LOCALES:
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(langs[lo], f, ensure_ascii=False, indent=2)
    print(f"Saved {lo}.json")

print(f"\nApplied {count} translations")
