#!/usr/bin/env python3
"""List all remaining untranslated EN values."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ['en', 'fr'] + LOCALES}
flats = {lo: flat_ui(files[lo]) for lo in ['en', 'fr'] + LOCALES}

all_keys = set(flats['en'].keys())
remaining_vals = set()
for k in sorted(all_keys):
    en_val = flats['en'].get(k, '')
    fr_val = flats['fr'].get(k, en_val)
    if fr_val == en_val:
        continue  # proper noun
    for lo in LOCALES:
        lv = flats[lo].get(k, en_val)
        if lv == en_val:
            remaining_vals.add(en_val)
            break

with open('/tmp/remaining_en_values.txt', 'w', encoding='utf-8') as f:
    for v in sorted(remaining_vals):
        f.write(v + '\n')

print(f"Total unique EN values needing translation: {len(remaining_vals)}")
