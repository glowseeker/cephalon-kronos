#!/usr/bin/env python3
"""
Merge dict-resolved and manual translations, then apply to all locale files.
NO FR-as-fallback. Every locale gets its own proper translation.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict-resolved
try:
    dict_T = load_json('/tmp/tables/dict_resolved.json')
    print(f"Dict-resolved entries: {len(dict_T)}")
except:
    dict_T = {}
    print("No dict_resolved.json found")

# Load manual translations
try:
    manual_T = load_json('/tmp/tables/manual_translations.json')
    print(f"Manual entries: {len(manual_T)}")
except:
    manual_T = {}
    print("No manual_translations.json found")

# Merge: dict takes priority, manual fills gaps
T = {}
for en_val, locale_trans in dict_T.items():
    if en_val not in T:
        T[en_val] = {}
    for lo in LOCALES:
        if lo in locale_trans and locale_trans[lo] != en_val:
            if lo not in T[en_val] or not T[en_val][lo]:
                T[en_val][lo] = locale_trans[lo]

for en_val, locale_trans in manual_T.items():
    if en_val not in T:
        T[en_val] = {}
    for lo in LOCALES:
        if lo in locale_trans and locale_trans[lo] != en_val:
            if lo not in T[en_val] or not T[en_val][lo]:
                T[en_val][lo] = locale_trans[lo]

print(f"Total merged entries: {len(T)}")

# Now apply to locale files
en = load_json('src/lib/i18n/en.json')
flat_en = dict(en.get('ui', {}))

# Build reverse map: en_value -> keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Load locale files
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

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
            # Flat dotted key in ui section
            if k in langs[lo].get('ui', {}):
                current = langs[lo]['ui'][k]
                if current == en_val:
                    langs[lo]['ui'][k] = trans
                    count += 1
            # Key with ui. prefix
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

# Verify: check remaining EN values
en_vals_to_check = list(en_val_to_keys.keys())
total_en = 0
for lo in LOCALES:
    flat = dict(langs[lo].get('ui', {}))
    en_count = sum(1 for v in flat.values() if v in en_vals_to_check and isinstance(v, str))
    total_en += en_count
    print(f"  {lo}: {en_count} EN values remaining in ui section")
print(f"\nTotal EN values remaining across all locales: {total_en}")
