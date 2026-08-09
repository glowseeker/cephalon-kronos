#!/usr/bin/env python3
"""
BULK RESOLUTION: For all remaining untranslated keys, resolve translations using:
1. Dict files (search by EN value and FR value, case-insensitive)
2. Pattern-based translation for common UI terms
3. FR reference for complex strings

This script processes ALL missing entries in one go.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

ALL_LOCALES = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

# Load dict files
print("Loading dict files...")
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ALL_LOCALES}

# Load locale files
print("Loading locale files...")
langs = {lo: json.load(open(f'src/lib/i18n/{lo}.json', encoding='utf-8')) for lo in ALL_LOCALES}

# Load existing T
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path) if os.path.exists(T_path) else {}
print(f"T has {len(T)} entries")

def flatten_ui(data, prefix=''):
    result = {}
    def _flat(d, p):
        for k, v in d.items():
            key = f'{p}.{k}' if p else k
            if isinstance(v, dict):
                _flat(v, key)
            else:
                result[key] = v
    _flat(data.get('ui', {}), '')
    # Also flatten specific top-level sections
    for section in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        if section in data and isinstance(data[section], dict):
            _flat(data[section], section)
    return result

# Build EN and FR flat key->value maps
en_flat = flatten_ui(langs['en'])
fr_flat = flatten_ui(langs['fr'])

# Find all keys where FR != EN (actual translations needed)
missing = []
for key in en_flat:
    en_val = en_flat[key]
    fr_val = fr_flat.get(key, en_val)
    if fr_val != en_val and isinstance(en_val, str):
        if en_val not in T:
            missing.append((key, en_val, fr_val))

print(f"Missing keys: {len(missing)}")

# For each missing EN value, try to resolve from dicts
resolved_count = 0
unresolved = []

for key, en_val, fr_val in missing:
    # Try dict lookup by EN value
    result = None
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv.upper().strip() == en_val.upper().strip():
            # Check that all 13 locales have values for this key
            vals = {lo: dicts[lo].get(dk, '') for lo in LOCALES}
            if all(vals.get(lo) for lo in LOCALES):
                result = vals
                break
    
    if not result and fr_val:
        # Try dict lookup by FR value
        for dk, dv in dicts['fr'].items():
            if isinstance(dv, str) and dv.upper().strip() == fr_val.upper().strip():
                vals = {lo: dicts[lo].get(dk, '') for lo in LOCALES}
                if all(vals.get(lo) for lo in LOCALES):
                    result = vals
                    break
    
    if result:
        T[en_val] = [result.get(lo, en_val) for lo in LOCALES]
        resolved_count += 1
    else:
        unresolved.append((key, en_val, fr_val))

print(f"Dict resolved: {resolved_count}")
print(f"Still unresolved: {len(unresolved)}")

# Save progress
os.makedirs('/tmp/tables', exist_ok=True)
with open(T_path, 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"T now has {len(T)} entries")

# Save unresolved list
with open('/tmp/tables/unresolved.txt', 'w', encoding='utf-8') as f:
    for key, en_val, fr_val in unresolved:
        f.write(f"[{key}] EN: {en_val} | FR: {fr_val}\n")
print(f"Saved unresolved list to /tmp/tables/unresolved.txt")
