#!/usr/bin/env python3
"""
Build per-locale translations for all 179 remaining entries.
For each entry:
1. If in dict with different value -> use dict translations
2. If FR != EN -> use FR as reference, provide translations for all languages
3. If FR == EN -> proper noun, keep EN
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
LOCALE_IDX = {lo: i for i, lo in enumerate(LOCALES)}

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build dict-based EN->localized map
en_to_local = {lo: {} for lo in LOCALES + ['fr']}
for lo in LOCALES + ['fr']:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in en_to_local[lo]:
            en_to_local[lo][en_val] = loc_val

data = load_json('/tmp/tables/ui_text_to_translate.json')

# Read the FR translations from the data file
# For entries where FR != EN, use FR as basis and translate
# For now, use a comprehensive translation table
# Key: en_val, Value: [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]

T = load_json('/tmp/tables/translation_table.json')

# Function to get translation for a specific locale
def get_translation(en_val, fr_val, lo):
    # Try dict first
    if en_val in en_to_local.get(lo, {}):
        return en_to_local[lo][en_val]
    # Check if T already has a good (non-EN) value
    if en_val in T:
        if isinstance(T[en_val], dict) and lo in T[en_val]:
            val = T[en_val][lo]
            if val and val != en_val:
                return val
        elif isinstance(T[en_val], list):
            idx = LOCALE_IDX[lo]
            if idx < len(T[en_val]) and T[en_val][idx] and T[en_val][idx] != en_val:
                return T[en_val][idx]
    # For now, return None (will need manual translation)
    return None

# For each entry, check what translations we have
needs_translation = []
for item in data:
    en_val = item['en']
    fr_val = item['fr']
    missing = item['missing']
    
    for lo in missing:
        trans = get_translation(en_val, fr_val, lo)
        if trans is None:
            needs_translation.append((en_val, fr_val, lo))

print(f"Entries needing manual translation: {len(needs_translation)}")
for en_val, fr_val, lo in needs_translation:
    print(f"  {lo}: EN={en_val!r}, FR={fr_val!r}")

# Save for reference
with open('/tmp/tables/needs_translation.json', 'w', encoding='utf-8') as f:
    json.dump([{k:v for k,v in x._asdict().items()} if hasattr(x,'_asdict') else {'en':en,'fr':fr,'lo':lo} for en,fr,lo in needs_translation], f, ensure_ascii=False, indent=2)
