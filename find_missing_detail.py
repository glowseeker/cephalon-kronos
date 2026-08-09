#!/usr/bin/env python3
"""
Identify what's still missing after applying translations.
For each locale, list entries still in EN and check if they're in manual translations,
dict files, or need new translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load manual translations and dict-resolved
manual_T = load_json('/tmp/tables/manual_translations.json')
dict_T = load_json('/tmp/tables/dict_resolved.json')

# Merge for lookup
all_T = {}
for en_val, locale_trans in dict_T.items():
    if en_val not in all_T:
        all_T[en_val] = {}
    all_T[en_val].update(locale_trans)
for en_val, locale_trans in manual_T.items():
    if en_val not in all_T:
        all_T[en_val] = {}
    all_T[en_val].update(locale_trans)

# Load locale files and find remaining EN values
data = load_json('/tmp/tables/ui_text_to_translate.json')
en_vals_to_check = set(item['en'] for item in data)

langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
en = load_json('src/lib/i18n/en.json')
flat_en = dict(en.get('ui', {}))

# Build reverse map
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# For each locale, check what's still missing and whether we have translations
print("=== Entries still EN per locale and whether we have translations ===")
for lo in LOCALES:
    flat = dict(langs[lo].get('ui', {}))
    missing = set()
    for k, v in flat.items():
        if v in en_vals_to_check:
            missing.add(v)
    
    # Categorize
    in_our_T = [v for v in missing if v in all_T and lo in all_T[v]]
    not_in_T_at_all = [v for v in missing if v not in all_T]
    in_T_but_no_locale = [v for v in missing if v in all_T and lo not in all_T[v]]
    
    if missing:
        print(f"\n{lo}: {len(missing)} still EN")
        print(f"  In our T but wasn't applied: {in_T_but_no_locale}")
        print(f"  Not in T at all (need new): {not_in_T_at_all}")
