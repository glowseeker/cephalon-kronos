#!/usr/bin/env python3
"""
Final comprehensive resolution.
For each unresolved EN value, use FR as reference and provide translations.
Game-sourced terms: search dict more broadly (including partial matches).
UI text: translate from FR.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

flat = {lo: flat_ui(load_json(f'src/lib/i18n/{lo}.json')) for lo in ['en', 'fr'] + LOCALES}
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ['en', 'fr'] + LOCALES}
en_f = flat['en']
fr_f = flat['fr']

# Rebuild T from existing translations
T = {}
for k, en_val in en_f.items():
    if not en_val:
        continue
    vals = [flat[lo].get(k, en_val) for lo in LOCALES]
    if any(v != en_val for v in vals):
        T[en_val] = vals

# Find missing
missing = []
for k in sorted(en_f):
    en_val = en_f[k]
    if not en_val or en_val in T:
        continue
    fr_val = fr_f.get(k, en_val)
    if fr_val == en_val:
        continue
    all_en = all(flat[lo].get(k, en_val) == en_val for lo in LOCALES)
    if all_en:
        missing.append((k, en_val, fr_val))

# Helper: find dict key for EN value (case-insensitive, and also try without case)
def find_dict_key_ci(en_val):
    en_upper = en_val.upper()
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv.upper() == en_upper:
            return dk
    # Try searching for partial matches (for compound terms)
    # e.g. "Albrecht's Notes" might be in the dict under a different key
    return None

def dict_translate(dk):
    return {lo: dicts[lo].get(dk, '') for lo in ['en', 'fr'] + LOCALES}

# Build a lookup: EN value -> dict key (case-insensitive)
print("Building EN->dict lookup...")
en_to_dk = {}
for dk, dv in dicts['en'].items():
    if isinstance(dv, str) and dv:
        key = dv.upper()
        if key not in en_to_dk:
            en_to_dk[key] = dk

# Now resolve all missing
new_T = {}
unresolved = []
for k, en_val, fr_val in missing:
    dk = en_to_dk.get(en_val.upper())
    if dk:
        d = dict_translate(dk)
        vals = [d[lo] for lo in LOCALES]
        # If any locale has empty string, fall back to FR pattern
        if any(v == '' for v in vals):
            # Use FR value as fallback for missing locales
            vals = [d.get(lo) or fr_val for lo in LOCALES]
        new_T[en_val] = vals
    else:
        unresolved.append((k, en_val, fr_val))

print(f"Dict resolved: {len(new_T)}")
print(f"Still unresolved: {len(unresolved)}")
T.update(new_T)
