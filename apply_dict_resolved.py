#!/usr/bin/env python3
"""
Apply the 29 dict-resolved entries to all locale files.
Then handle remaining entries: check for proper nouns and apply manual translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict-resolved transitions
dict_resolved = load_json('/tmp/tables/dict_resolved.json')

# Load locale files
en = load_json('src/lib/i18n/en.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))

# Build reverse map: en_value -> keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Apply dict-resolved translations
for en_val, locale_trans in dict_resolved.items():
    if en_val not in en_val_to_keys:
        continue
    keys = en_val_to_keys[en_val]
    
    for lo in LOCALES:
        if lo not in locale_trans:
            continue
        trans = locale_trans[lo]
        if trans == en_val:
            continue
        
        # Check if key already translated in locale file
        for k in keys:
            if k in langs[lo].get('ui', {}):
                current = langs[lo]['ui'][k]
                if current == en_val:  # Only update if untranslated
                    langs[lo]['ui'][k] = trans
                    print(f"  {lo}: {k} -> {trans}")
            else:
                # Key with ui. prefix stored as flat key
                prefixed_key = f'ui.{k}'
                if prefixed_key in langs[lo].get('ui', {}):
                    current = langs[lo]['ui'][prefixed_key]
                    if current == en_val:
                        langs[lo]['ui'][prefixed_key] = trans
                        print(f"  {lo}: {prefixed_key} -> {trans}")

# Save
for lo in LOCALES:
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(langs[lo], f, ensure_ascii=False, indent=2)
    print(f"Saved {lo}.json")

print(f"\nApplied {len(dict_resolved)} dict-resolved entries")
