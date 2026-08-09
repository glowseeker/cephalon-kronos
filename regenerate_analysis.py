#!/usr/bin/env python3
"""
Regenerate the remaining-EN analysis directly from locale files.
For every key in en.json's ui section (flat dotted keys), find keys whose value
in a non-EN locale still equals the EN value. Output the per-key detail dump.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

en_data = load_json('src/lib/i18n/en.json')
fr_data = load_json('src/lib/i18n/fr.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

en_ui = en_data.get('ui', {})
fr_ui = fr_data.get('ui', {})

# Collect all flat dotted keys across all locale ui sections
all_keys = set(en_ui.keys())
for lo in LOCALES:
    all_keys.update(locale_files[lo].get('ui', {}).keys())

# For each key, determine EN value, FR value, and which locales still have EN value
rows = []
for key in sorted(all_keys):
    en_val = en_ui.get(key)
    if en_val is None:
        continue
    if not isinstance(en_val, str):
        continue
    still_en = []
    for lo in LOCALES:
        ui = locale_files[lo].get('ui', {})
        current = ui.get(key)
        if current == en_val:
            still_en.append(lo)
    if still_en:
        fr_val = fr_ui.get(key, '')
        rows.append({'key': key, 'en': en_val, 'fr': fr_val, 'still_en': still_en})

print(f"Total keys still EN in at least one locale: {len(rows)}")
for r in rows:
    print(f"{r['key']}: EN={r['en']!r} FR={r['fr']!r} still_EN={r['still_en']}")
