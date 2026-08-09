#!/usr/bin/env python3
"""
For entries still missing per locale, check dict files for ALL locales.
Build complete translations from dict + manual per-locale translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build comprehensive EN -> {locale: translation} from dict files
en_to_local = {}
for lo in LOCALES + ['fr']:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val == en_val or not loc_val.strip():
            continue
        en_key = en_val.lower()
        if en_key not in en_to_local:
            en_to_local[en_key] = {}
        if lo not in en_to_local[en_key] or not en_to_local[en_key][lo]:
            en_to_local[en_key][lo] = loc_val

# Also try matching on partial key (e.g. "Meso Relic" -> search for "Meso")
# Build key-based lookup
key_to_en = load_json(f'{RESOURCES}/dict.en.json')
key_to_local = {}
for lo in LOCALES + ['fr']:
    key_to_local[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')

def search_dict(en_term, locales):
    """Search dict files by EN term (case-insensitive, partial match)"""
    results = {}
    en_term_lower = en_term.lower().strip()
    for lo in locales:
        d = key_to_local.get(lo, {})
        d_en = key_to_en
        for key, en_val in d_en.items():
            if en_term_lower in en_val.lower():
                loc_val = d.get(key, en_val)
                if loc_val != en_val and loc_val.strip():
                    if lo not in results or not results[lo]:
                        results[lo] = loc_val
    return results

# Test key terms
test_terms = ['Meso', 'Neo', 'Void', 'Deimos', 'Necramech', 'Necralisk', 'Rivens', 'Warframe']
for term in test_terms:
    result = search_dict(term, LOCALES)
    print(f"{term}: {result}")
