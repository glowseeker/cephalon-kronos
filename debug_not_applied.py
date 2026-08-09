#!/usr/bin/env python3
"""
For entries in our T but not applied, find the actual key path where they appear.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load T
all_T = {}
for f in ['/tmp/tables/dict_resolved.json', '/tmp/tables/manual_translations.json']:
    try:
        d = load_json(f)
        for en_val, locale_trans in d.items():
            if en_val not in all_T:
                all_T[en_val] = {}
            all_T[en_val].update(locale_trans)
    except:
        pass

# Entries in T but weren't applied
not_applied = ['Deimos', 'Neo', 'Meso', 'Void', 'Void Traces', 'Orb Vallis']

# Load locale files
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
en = load_json('src/lib/i18n/en.json')
flat_en = dict(en.get('ui', {}))

# Find where these EN values appear as keys
for en_val in not_applied:
    keys_in_en = [k for k, v in flat_en.items() if v == en_val]
    print(f"\n{en_val!r}: found in EN at keys: {keys_in_en}")
    for k in keys_in_en:
        print(f"  Key '{k}' in locale files:")
        for lo in LOCALES[:3]:
            val = langs[lo].get('ui', {}).get(k, 'NOT FOUND')
            print(f"    {lo}: {val!r}")
