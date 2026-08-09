#!/usr/bin/env python3
"""Apply translation table to locale JSON files."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

def set_flat_ui(data, key, value):
    parts = key.split('.', 1)
    if parts[0] == 'ui':
        data.setdefault('ui', {})
        data['ui'][parts[1]] = value
    elif parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'adversaries']:
        sec, subkey = parts
        data.setdefault(sec, {})
        data[sec][subkey] = value
    else:
        data.setdefault('ui', {})
        data['ui'][key] = value

# Load the translation table
# T is a dict: {key: {locale: value}}
T = json.load(open('/tmp/tables/translations.json', encoding='utf-8'))

# Restructure to {locale: {key: value}}
T_by_locale = {}
for key, locale_map in T.items():
    for lo, val in locale_map.items():
        if val:  # only non-empty translations
            T_by_locale.setdefault(lo, {})[key] = val

applied = 0
for lo in LOCALES:
    data = load_json(f'src/lib/i18n/{lo}.json')
    for key, value in T_by_locale.get(lo, {}).items():
        set_flat_ui(data, key, value)
        applied += 1
    save_json(f'src/lib/i18n/{lo}.json', data)

print(f"Applied {applied} translations across {len(LOCALES)} locales")
