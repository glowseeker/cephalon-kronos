#!/usr/bin/env python3
"""
Apply translations from /tmp/tables/translation_table.json to all 13 locale files.
For each untranslated key:
- Look up EN value
- If in translation table: apply the per-locale translation
- Else: if FR == EN, keep EN (proper noun); otherwise use FR as fallback
"""
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

def get_val(data, key):
    parts = key.split('.', 1)
    if parts[0] == 'ui':
        return data.get('ui', {}).get(parts[1])
    elif parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        sec, subkey = parts
        return data.get(sec, {}).get(subkey)
    else:
        return data.get('ui', {}).get(key)

def set_val(data, key, value):
    parts = key.split('.', 1)
    if parts[0] == 'ui':
        data.setdefault('ui', {})
        data['ui'][parts[1]] = value
    elif parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        sec, subkey = parts
        data.setdefault(sec, {})
        data[sec][subkey] = value
    else:
        data.setdefault('ui', {})
        data['ui'][key] = value

# Load translation table
T = json.load(open('/tmp/tables/translation_table.json', encoding='utf-8'))

# Load all locale files
all_files = {}
for lo in ['en', 'fr'] + LOCALES:
    all_files[lo] = load_json(f'src/lib/i18n/{lo}.json')

flat = {lo: flat_ui(all_files[lo]) for lo in ['en', 'fr'] + LOCALES}

# Find untranslated keys (DE == EN)
untranslated = sorted([k for k in flat['en'] if flat['de'].get(k) == flat['en'][k]])

applied = 0
untranslated_not_in_table = []
for k in untranslated:
    en_val = flat['en'][k]
    fr_val = flat['fr'].get(k, en_val)
    is_proper_noun = (fr_val == en_val)

    new_vals = {}
    for lo in LOCALES:
        if en_val in T:
            idx = LOCALES.index(lo)
            new_vals[lo] = T[en_val][idx] if idx < len(T[en_val]) else en_val
        elif is_proper_noun:
            new_vals[lo] = en_val
        else:
            new_vals[lo] = fr_val

    for lo in LOCALES:
        data = all_files[lo]
        old = get_val(data, k)
        if old == en_val:
            set_val(data, k, new_vals[lo])
            applied += 1

    if en_val not in T and not is_proper_noun:
        untranslated_not_in_table.append((k, en_val, fr_val))

# Save locale files
for lo in LOCALES:
    save_json(f'src/lib/i18n/{lo}.json', all_files[lo])

print(f"Processed {len(untranslated)} untranslated keys")
print(f"Applied {applied} translations across {len(LOCALES)} locales")
if untranslated_not_in_table:
    print(f"\n{len(untranslated_not_in_table)} EN values not in table and not proper nouns:")
    for k, en, fr in untranslated_not_in_table:
        print(f"  {k}: EN={en!r}, FR={fr!r}")
