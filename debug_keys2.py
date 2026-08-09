#!/usr/bin/env python3
"""
Debug key lookup issues.
For each locale, for each entry in ui_text_to_translate.json, check if key exists in ui section.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

data = json.load(open('/tmp/tables/ui_text_to_translate.json', encoding='utf-8'))
for lo in ['de', 'ja']:
    d = json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8'))
    ui = d.get('ui', {})
    print(f"\n=== {lo} ===")
    for item in data:
        en_val = item['en']
        key = item['key']
        if en_val in ['Mod', 'Set', 'Details', 'Name', 'Cursor', 'Heat', 'Void', 'Meso', 'Neo', 'Deimos', 'Necramech']:
            if key in ui:
                status = 'FOUND'
            elif key.replace('ui.', '', 1) in ui:
                alt = key.replace('ui.', '', 1)
                status = f'FOUND (as {alt})'
            else:
                status = 'NOT FOUND'
            print(f"  {en_val}: key={key!r} -> {status}")
