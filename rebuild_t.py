#!/usr/bin/env python3
"""Rebuild T from existing locale files."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics','rivens','mastery','collectibles','settings','adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

en = load_json('src/lib/i18n/en.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ['fr'] + LOCALES}

flat_en = flat_ui(en)
flat_fr = flat_ui(langs['fr'])
flat = {lo: flat_ui(langs[lo]) for lo in LOCALES}

T = {}
for k, en_val in flat_en.items():
    has_translations = any(flat[lo].get(k, en_val) != en_val for lo in LOCALES)
    if has_translations:
        vals = [flat[lo].get(k, en_val) for lo in LOCALES]
        if any(v != en_val for v in vals):
            T[en_val] = vals

print(f"Rebuilt T with {len(T)} entries")
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print("Saved to /tmp/tables/translation_table.json")
