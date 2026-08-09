#!/usr/bin/env python3
"""
Debug why translations aren't being applied for "in our T but wasn't applied" entries.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load manual translations
all_T = {}
for f in ['/tmp/tables/dict_resolved.json', '/tmp/tables/manual_translations.json']:
    try:
        d = load_json(f)
        for en_val, locale_trans in d.items():
            if en_val not in all_T:
                all_T[en_val] = {}
            all_T[en_val].update(locale_trans)
    except:
        pass

# Load locale files
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
en = load_json('src/lib/i18n/en.json')
flat_en = dict(en.get('ui', {}))

# Check what's in all_T for 'Deimos'
print("all_T for 'Deimos':", all_T.get('Deimos', 'NOT FOUND'))

# Check what's in the EN flat
for k, v in flat_en.items():
    if v == 'Deimos':
        print(f"EN key: {k!r}, value: {v!r}")
        for lo in ['de', 'es', 'it']:
            ui_section = langs[lo].get('ui', {})
            print(f"  {lo} ui section has 'ui.dashboard.deimos'? {'ui.dashboard.deimos' in ui_section}")
            # Check if key with ui. prefix exists directly
            for key in ui_section:
                if key.startswith('ui.') and 'deimos' in key.lower():
                    print(f"    Found key: {key!r} = {ui_section[key]!r}")
            # Check if the bare key exists
            for key in ui_section:
                if key == k:
                    print(f"    Key '{key}' exists in {lo}: {ui_section[key]!r}")
