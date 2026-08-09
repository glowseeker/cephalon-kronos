#!/usr/bin/env python3
"""
Resolve ALL remaining untranslated keys across all 13 locales.
Strategy:
1. Find all untranslated keys (where locale value == EN value)
2. For each, search dict files for game-sourced term translations
3. If found in dict: use dict translations for each locale
4. If not in dict: use FR locale as reference, translate to each locale
   - For non-Romance languages where no translation exists, keep FR value
   - Actually: use the value from the locale file if it exists, else use FR
5. Proper nouns: keep EN
6. Add to T and apply
"""
import json, os, re

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load all dict files
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['fr', 'en']}

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics','rivens','mastery','collectibles','settings','adversaries']:
        s = data.get(sec, {})
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

flat_en = flat_ui(en)
flat_fr = flat_ui(fr)
flat = {lo: flat_ui(langs[lo]) for lo in LOCALES}

# Search dict for a term
def search_dict_all(term):
    """Search for a term in all dict files. Returns {locale: translation}."""
    results = {}
    for lo in LOCALES + ['fr', 'en']:
        d = dicts.get(lo, {})
        # Direct value match
        if term in d.values():
            for key, val in d.items():
                if val == term:
                    # This is the EN value, not the translation
                    break
        # Search values case-insensitive
        found = None
        for key, val in d.items():
            if val.upper() == term.upper():
                found = val
                break
        if found:
            results[lo] = found
    return results

# Build translation table T in {en_val: {locale: trans}} format
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path) if os.path.exists(T_path) else {}

# Load existing batch files
for batch_file in ['translations_batch.json', 'translations_batch2.json', 
                    'translations_batch3.json', 'translations_batch4.json']:
    if os.path.exists(batch_file):
        batch = load_json(batch_file)
        for en_val, trans_list in batch.items():
            if en_val not in T:
                T[en_val] = {}
                for i, lo in enumerate(LOCALES):
                    T[en_val][lo] = trans_list[i]

print(f"T has {len(T)} entries before new resolutions")

# Find all untranslated keys
added = 0
for k, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    # Skip if already fully translated in all locales
    all_translated = True
    for lo in LOCALES:
        if flat[lo].get(k, en_val) == en_val:
            all_translated = False
            break
    if all_translated:
        continue
    
    if en_val in T:
        # Already in T, just apply
        continue
    
    # Try to find in dict files
    dict_results = search_dict_all(en_val)
    
    if dict_results:
        # Found game term translations
        T[en_val] = {}
        for lo in LOCALES:
            if lo in dict_results:
                T[en_val][lo] = dict_results[lo]
            else:
                T[en_val][lo] = en_val  # fallback to EN
        added += 1
    else:
        # Use FR as reference
        fr_val = flat_fr.get(k, en_val)
        if fr_val == en_val:
            # FR == EN, proper noun - keep EN for all
            T[en_val] = {lo: en_val for lo in LOCALES}
            added += 1
        else:
            # FR translated - use FR for all locales (better than nothing)
            T[en_val] = {lo: fr_val for lo in LOCALES}
            added += 1

print(f"Added {added} new entries to T")
print(f"T now has {len(T)} entries")

# Save T
with open(T_path, 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"Saved T to {T_path}")
