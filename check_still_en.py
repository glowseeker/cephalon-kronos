#!/usr/bin/env python3
"""
Check which of the 179 entries still have EN values in each locale.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

data = json.load(open('/tmp/tables/ui_text_to_translate.json', encoding='utf-8'))
locale_files = {lo: json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8')) for lo in LOCALES}

for lo in LOCALES:
    ui = locale_files[lo].get('ui', {})
    still_en = []
    for item in data:
        key = item['key']
        en_val = item['en']
        current = ui.get(key, en_val)
        if current == en_val:
            still_en.append((en_val, key))
    if still_en:
        print(f"\n{lo}: {len(still_en)} still EN")
        for en_val, key in still_en[:5]:
            print(f"  {key} = {en_val!r}")
