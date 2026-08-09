#!/usr/bin/env python3
"""
For each locale, show entries still in EN and whether we have a translation for them.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

data = json.load(open('/tmp/tables/ui_text_to_translate.json', encoding='utf-8'))
locale_files = {lo: json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8')) for lo in LOCALES}

# Load T_combined from the script
# Actually just check each entry
for lo in LOCALES:
    ui = locale_files[lo].get('ui', {})
    still_en = []
    for item in data:
        key = item['key']
        en_val = item['en']
        current = ui.get(key, en_val)
        if current == en_val:
            still_en.append(en_val)
    if still_en:
        print(f"{lo}: {len(still_en)} still EN: {sorted(set(still_en))}")
