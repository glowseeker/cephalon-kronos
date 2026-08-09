#!/usr/bin/env python3
"""
Regenerate translation table from existing locale data, then add remaining translations.
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

# Pre-load all locale flats
flat = {lo: flat_ui(load_json(f'src/lib/i18n/{lo}.json')) for lo in ['en', 'fr'] + LOCALES}
en_f = flat['en']

# Step 1: Rebuild T from existing translations
T = {}
for k, en_val in en_f.items():
    if not en_val:
        continue
    vals = [flat[lo].get(k, en_val) for lo in LOCALES]
    # Only add if at least one locale has a translation
    if any(v != en_val for v in vals):
        T[en_val] = vals

print(f"Rebuilt T with {len(T)} entries from existing locale data")

# Step 2: Find missing keys (FR != EN, all 13 locales still == EN, EN not in T)
fr_f = flat['fr']
missing = []
for k in sorted(en_f):
    en_val = en_f[k]
    if not en_val or en_val in T:
        continue
    fr_val = fr_f.get(k, en_val)
    if fr_val == en_val:
        continue  # FR == EN means proper noun
    all_en = all(flat[lo].get(k, en_val) == en_val for lo in LOCALES)
    if all_en:
        missing.append((k, en_val, fr_val))

print(f"Missing (FR translated, all 13 locales still EN): {len(missing)}")
print()

# Step 3: Provide translations for the missing keys
# Using FR as reference + game knowledge + dict files

# Load dict files for game-sourced term lookups
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ['en', 'fr'] + LOCALES}

def dl(key, lo):
    return dicts.get(lo, {}).get(key, '')

# --- TRANSLATION TABLE ---
# Format: (en_value, [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh])
NEW_TRANSLATIONS = {}

def add(en, vals):
    if en not in NEW_TRANSLATIONS and len(vals) == 13:
        NEW_TRANSLATIONS[en] = list(vals)

# === ELEMENTS ===
# These come from Warframe's element dict - let's look them up
# First, find the dict keys for elements
# From FR: Cold=Froid, Heat=Chaleur, Electricity=Électricité, etc.
# Let's search the dict for element names
print("=== Searching for element dict keys ===")
for key in ['Cold', 'Heat', 'Electricity', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 'Gas', 'Radiation', 'Viral', 'Puncture', 'Slash', 'Impact']:
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv == key:
            print(f"  {key} -> {dk}")
            # Get all locale translations
            translations = []
            for lo in LOCALES:
                t = dl(dk, lo)
                translations.append(t if t else key)
            print(f"    -> {translations}")
            break

print()
