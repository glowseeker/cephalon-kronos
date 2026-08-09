#!/usr/bin/env python3
"""
Check which of the 150 unique EN values are already translated per-locale.
For each EN value, list which locales still have EN (untranslated).
"""
import json, os, sys
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

en = load_json('src/lib/i18n/en.json')
flat_en = dict(en.get('ui', {}))

# Build reverse map: en_value -> list of keys
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Load locale files
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

data = load_json('/tmp/tables/ui_text_to_translate.json')
untranslated_en = set(item['en'] for item in data)

# For each EN value, find which locales still have EN
needs_work = []
for en_val in sorted(untranslated_en):
    if en_val not in en_val_to_keys:
        needs_work.append((en_val, ['???'] * len(LOCALES)))
        continue
    keys = en_val_to_keys[en_val]
    still_en = []
    for lo in LOCALES:
        # Check if ALL keys with this value are still EN in this locale
        all_en = all(flat[lo].get(k, en_val) == en_val for k in keys)
        if all_en:
            still_en.append(lo)
    if still_en:
        needs_work.append((en_val, still_en))

print(f"Total EN values needing work: {len(needs_work)}")
for en_val, locales in needs_work:
    print(f"  {en_val!r}: {locales}")
