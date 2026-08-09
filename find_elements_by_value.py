#!/usr/bin/env python3
"""
Search dict files for all keys with EN values matching element names.
Search all locales for their translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en', 'fr']}
d_en = dicts['en']

# Elements to search for
elements = ['Heat', 'Cold', 'Toxin', 'Electricity', 'Gas', 'Magnetic', 'Radiation', 'Viral', 'Corrosive', 'Blast']

for elem in elements:
    print(f"\n=== {elem} ===")
    for key, en_val in d_en.items():
        if en_val.strip() == elem:
            locs = {}
            for lo in LOCALES + ['fr']:
                v = dicts[lo].get(key, en_val)
                if v != en_val:
                    locs[lo] = v
            if locs:
                print(f"  key: {key}")
                for lo, v in locs.items():
                    print(f"    {lo}: {v!r}")
            break

# Also search for "Heat" in all dict values
print("\n=== Search for 'Chaleur' in DE dict ===")
d_de = dicts['de']
for key, val in d_de.items():
    if val == 'Chaleur':
        en_val = d_en.get(key, '?')
        print(f"  key: {key}, EN: {en_val!r}")
        break

# Search for 'Heat' in FR dict to find the key
print("\n=== Search for 'Calor' in ES dict ===")
d_es = dicts['es']
for key, val in d_es.items():
    if val == 'Calor':
        en_val = d_en.get(key, '?')
        print(f"  key: {key}, EN: {en_val!r}")
        locs = {}
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                locs[lo] = v
        print(f"  All translations: {locs}")
        break
