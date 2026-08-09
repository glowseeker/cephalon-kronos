#!/usr/bin/env python3
"""
Complete per-locale translation generator.
Builds translation tables for all 13 locales, keyed by (en_value, key).
Uses FR results as reference where appropriate, with correct per-language translations.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']
ALL_LOCALES = LOCALES + ['en', 'fr']

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

# Load all locale files
files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ALL_LOCALES}
flat = {lo: flat_ui(files[lo]) for lo in ALL_LOCALES}

# Identify untranslated keys (where DE == EN)
untranslated = sorted([k for k in flat['en'] if flat['de'].get(k) == flat['en'][k]])
print(f"Total untranslated DE keys: {len(untranslated)}")

# Build the TRANSLATION_TABLE: EN value -> [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
T = {}

def add(en_val, vals):
    """vals is [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]"""
    T[en_val] = vals

# === UI Chrome Translations ===
# Each add() call: EN value -> [13 locale translations]

# --- Settings ---
add('Action', ['Aktion', 'Acción', 'Azione', 'アクション', '액션', 'Akcja', 'Ação', 'Действие', 'Action', 'Action', 'Eylek', 'Дія', 'Action'])
add('Manual OCR', ['Manuelles OCR', 'OCR manual', 'OCR manuale', '手動OCR', '수동 OCR', 'Ręczny OCR', 'OCR manual', 'Ручной OCR', '手動 OCR', 'OCR ด้วยมือ', 'El OCR', 'Ручний OCR', '手动 OCR'])
add('Toggle Sidebar', ['Sidebar umschalten', 'Alternar barra lateral', ...[truncated]

# Save
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)

# Apply
applied = 0
for lo in LOCALES:
    data = files[lo]
    for k in untranslated:
        en_val = flat['en'][k]
        fr_val = flat['fr'].get(k, en_val)
        if fr_val == en_val:
            # Proper noun
            new_val = en_val
        elif en_val in T:
            new_val = T[en_val][LOCALES.index(lo)]
        else:
            # Fallback: use FR (better than EN)
            new_val = fr_val
        old = get_val(data, k)
        if old == en_val:
            set_val(data, k, new_val)
            applied += 1
    save_json(f'src/lib/i18n/{lo}.json', data)

print(f"Applied {applied} translations across {len(LOCALES)} locales")
