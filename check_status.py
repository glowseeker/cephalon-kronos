#!/usr/bin/env python3
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

data = load_json('/tmp/tables/ui_text_to_translate.json')
en_vals_to_check = set(item['en'] for item in data)
print('Target EN values:', len(en_vals_to_check))

langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

total = 0
for lo in LOCALES:
    flat = dict(langs[lo].get('ui', {}))
    remaining = set()
    for k, v in flat.items():
        if v in en_vals_to_check:
            remaining.add(v)
    print(f'{lo}: {len(remaining)} still EN: {sorted(remaining)}')
    total += len(remaining)
print(f'\nTotal still EN: {total}')
