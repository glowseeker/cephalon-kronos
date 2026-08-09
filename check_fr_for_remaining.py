#!/usr/bin/env python3
"""
For each EN value still untranslated in any locale, check:
1. Is it a proper noun? (should stay EN)
2. Does dict have it? (resolve from dict)
3. What does FR have? (use as reference for manual translation)
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

data = json.load(open('/tmp/tables/ui_text_to_translate.json', encoding='utf-8'))
fr = json.load(open('src/lib/i18n/fr.json', encoding='utf-8'))
en = json.load(open('src/lib/i18n/en.json', encoding='utf-8'))

fr_ui = fr.get('ui', {})
en_ui = en.get('ui', {})
locale_files = {lo: json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8')) for lo in LOCALES}

# Get unique EN values still EN in at least one locale
for item in data:
    en_val = item['en']
    key = item['key']
    fr_val = fr_ui.get(key, en_val)
    still_en_locales = []
    for lo in LOCALES:
        loc_val = locale_files[lo].get('ui', {}).get(key, en_val)
        if loc_val == en_val:
            # Check if FR has a different value
            if fr_val != en_val:
                still_en_locales.append(lo)
    
    if still_en_locales and fr_val != en_val:
        print(f"EN={en_val!r} FR={fr_val!r} key={key} | still EN in: {still_en_locales}")
