#!/usr/bin/env python3
"""
Check exactly which dict-resolved translations are still EN in locale files.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

data = load_json('/tmp/tables/ui_text_to_translate.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

for item in data:
    en_val = item['en']
    key = item['key']
    if en_val in ['Meso', 'Neo', 'Void', 'Deimos', 'Cambion Drift', 'Necralisk']:
        still_en = []
        current_vals = {}
        for lo in LOCALES:
            ui = locale_files[lo].get('ui', {})
            current = ui.get(key, en_val)
            current_vals[lo] = current
            if current == en_val:
                still_en.append(lo)
        if still_en:
            print(f"{en_val} (key={key}): still EN in {still_en}")
            print(f"  current values: {current_vals}")
