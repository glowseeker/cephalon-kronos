#!/usr/bin/env python3
"""
Resolve remaining EN values from dict files using improved search.
For terms not found in dict, use manual translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict files
dicts = {}
for lo in LOCALES + ['en', 'fr']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')

# Search for specific terms in dict files
terms_to_find = ['Mod', 'Necramech', 'Sentinels', 'Deimos', 'Orb Vallis', 
                 'Show Completed', 'Heat', 'Void', 'Meso', 'N/A', 'Veiled',
                 'Set', 'Details', 'Non-Mastery', 'Descendia', 'Loid',
                 'Archimedea', 'SP Incursions', 'Season', 'Cursor',
                 'EXP DUCATS', 'EXP PLAT', 'Value', 'Necramechs']

# For each term, search dict files by EN value
print("=== Dict file lookups ===")
for term in terms_to_find:
    print(f"\n{term}:")
    found = False
    for key, en_val in dicts['en'].items():
        if en_val.strip().lower() == term.lower():
            vals = {lo: dicts[lo].get(key, en_val) for lo in LOCALES + ['fr']}
            translated = {lo: v for lo, v in vals.items() if v != en_val}
            if translated:
                print(f"  Exact match in dict ({key}):")
                for lo, v in translated.items():
                    print(f"    {lo}: {v!r}")
                found = True
    if not found:
        # Try partial match
        for key, en_val in dicts['en'].items():
            if term.lower() in en_val.lower() and en_val.lower() != term.lower():
                # Check if it's a standalone term, not part of a longer description
                pass
        print(f"  Not found in dict")
