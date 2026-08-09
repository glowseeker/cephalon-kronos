#!/usr/bin/env python3
"""
Find ALL EN values in locale files that should be translated.
Compare FR locale file to locale files — where FR has a translation but a locale has EN,
and where both dict and FR have nothing, check if it needs manual translation.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def load_locale(lo):
    return load_json(f'src/lib/i18n/{lo}.json')

# Load all locale files
locale_data = {lo: load_locale(lo) for lo in LOCALES}
fr_data = load_locale('fr')
en_data = load_locale('en')

# Find keys where FR != EN but any locale == EN
def flatten(obj, prefix=''):
    result = {}
    if isinstance(obj, dict):
        for k, v in obj.items():
            result[f'{prefix}.{k}' if prefix else k] = v
            if isinstance(v, dict):
                result.update(flatten(v, f'{prefix}.{k}' if prefix else k))
    return result

# For each locale, find ui keys where value == EN but FR has a different value
for lo in LOCALES:
    loc_ui = locale_data[lo].get('ui', {})
    fr_ui = fr_data.get('ui', {})
    en_ui = en_data.get('ui', {})
    
    still_en = []
    in_t = set()
    # Load ui_text_to_translate keys
    ui_data = load_json('/tmp/tables/ui_text_to_translate.json')
    t_keys = set(item['key'] for item in ui_data)
    
    for key in en_ui:
        en_val = en_ui[key]
        fr_val = fr_ui.get(key, en_val)
        loc_val = loc_ui.get(key, en_val)
        
        if loc_val == en_val and fr_val != en_val:
            # This locale has EN but FR has a translation
            if key not in t_keys:
                still_en.append((key, en_val, fr_val))
    
    if still_en:
        print(f"\n{lo}: {len(still_en)} additional keys not in ui_text_to_translate")
        for key, en_val, fr_val in still_en[:10]:
            print(f"  {key}: EN={en_val!r} -> FR={fr_val!r}")
