#!/usr/bin/env python3
"""
Check FR locale file values for all 179 entries' EN values.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

data = load_json('/tmp/tables/ui_text_to_translate.json')
fr = load_json('src/lib/i18n/fr.json')
en = load_json('src/lib/i18n/en.json')

fr_ui = fr.get('ui', {})
en_ui = en.get('ui', {})

# For each entry, show EN value and FR translation
seen = set()
for item in data:
    en_val = item['en']
    key = item['key']
    if en_val in seen:
        continue
    seen.add(en_val)
    fr_val = fr_ui.get(key, en_val)
    en_val_check = en_ui.get(key, en_val)
    if fr_val != en_val:
        print(f"{en_val!r} -> FR: {fr_val!r} (key: {key})")
