#!/usr/bin/env python3
"""
Search for element name translations in dict files.
The game uses /Lotus/Language/Elements/ for element names.
Let me search for any key containing 'Element' or the element names.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en', 'fr']}
d_en = dicts['en']

# Search for keys containing 'Element' 
print("=== All keys with 'Element' in path ===")
count = 0
for key in sorted(d_en.keys()):
    if 'element' in key.lower():
        en_val = d_en[key]
        locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
        translated = {lo: v for lo, v in locs.items() if v != en_val and v.strip()}
        if translated and en_val.strip() in ['Heat', 'Cold', 'Toxin', 'Electricity', 'Gas', 'Magnetic', 'Radiation', 'Viral', 'Corrosive', 'Blast', 'Impact', 'Puncture', 'Slash']:
            print(f"  {en_val!r} ({key}): {translated}")
            count += 1
print(f"Found {count} element terms")

# Search for value 'Chaleur' (FR for Heat)
print("\n=== Search for 'Chaleur' in dict ===")
for key, en_val in d_en.items():
    # This won't work since we're searching EN dict...
    pass

# Search in FR dict
d_fr = dicts['fr']
print("\n=== Keys with 'Chaleur' in FR dict ===")
for key, val in d_fr.items():
    if val == 'Chaleur':
        en_val = d_en.get(key, '?')
        print(f"  key: {key}, EN: {en_val!r}")
        for lo in LOCALES:
            print(f"    {lo}: {dicts[lo].get(key, en_val)!r}")

# Search for element name keys
print("\n=== Keys in /Lotus/Language/Elements/ ===")
for key, en_val in d_en.items():
    if '/Lotus/Language/Elements/' in key:
        locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
        translated = {lo: v for lo, v in locs.items() if v != en_val and v.strip()}
        print(f"  {en_val!r} ({key}): {translated if translated else 'NOT TRANSLATED'}")
