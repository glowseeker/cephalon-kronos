#!/usr/bin/env python3
"""
Resolve all 211 remaining translations.
For game-sourced terms: search dict case-insensitively, use dict results.
For UI text: use FR reference and provide translations.
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

# Try dict lookup (case-insensitive)
def find_dict_key_ci(en_val):
    en_upper = en_val.upper()
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv.upper() == en_upper:
            return dk
    return None

def dict_translate(dk):
    return {lo: dicts[lo].get(dk, '') for lo in ['en', 'fr'] + LOCALES}

# First pass: resolve from dict
new_T = {}
unresolved = []
for k, en_val, fr_val in missing:
    dk = find_dict_key_ci(en_val)
    if dk:
        d = dict_translate(dk)
        vals = [d[lo] for lo in LOCALES]
        new_T[en_val] = vals
    else:
        unresolved.append((k, en_val, fr_val))

print(f"Dict resolved: {len(new_T)}")
print(f"Unresolved: {len(unresolved)}")

# Save dict-resolved translations to T
T.update(new_T)

# Now handle unresolved - these need manual translations
# Write them to a file for manual translation
os.makedirs('/tmp/tables', exist_ok=True)
with open('/tmp/tables/unresolved.txt', 'w', encoding='utf-8') as f:
    for k, en_val, fr_val in unresolved:
        f.write(f"EN: {en_val}\nFR: {fr_val}\n\n")

# Save T
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"T now has {len(T)} entries")
