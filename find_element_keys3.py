#!/usr/bin/env python3
"""
Search for element, mod, sentinel, necramech keys more broadly.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en']}
d_en = dicts['en']

# Search for any key containing 'Element' or 'Heat' or 'Cold'
print("=== Keys containing 'Element' or 'Name' in Elements path ===")
for key, en_val in d_en.items():
    if ('element' in key.lower() or 'heat' in key.lower() or 'cold' in key.lower()) and en_val.strip() in ['Heat', 'Cold', 'Heat Damage', 'Cold Damage']:
        print(f"  {key}: {en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                print(f"    {lo}: {v!r}")

# Broader search - any key in /Lotus/Language/Elements/ path
print("\n=== All keys in /Lotus/Language/Elements/ ===")
for key, en_val in sorted(d_en.items()):
    if '/Lotus/Language/Elements/' in key:
        locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
        translated = {lo: v for lo, v in locs.items() if v != en_val}
        if translated:
            print(f"  {key}: EN={en_val!r} -> {translated}")

# Search for keys containing 'Heat' in the value
print("\n=== Search for Heat translations ===")
for key, en_val in d_en.items():
    if 'heat' in en_val.lower() and en_val.lower() not in ['heat', 'heat damage']:
        if en_val.strip() in ['Heat', 'Chaleur', 'Calor', 'Calore', '热', '열']:
            print(f"  {key}: {en_val!r}")

# Just search for all keys with value 'Heat'
print("\n=== All keys with EN value 'Heat' ===")
for key, en_val in d_en.items():
    if en_val == 'Heat':
        print(f"  {key}: {en_val!r}")

# Search for /Lotus/Language/Elements/ path specifically for name translations
print("\n=== Element name keys (searching /Lotus/Language/Elements/) ===")
for key, en_val in sorted(d_en.items()):
    if '/Lotus/Language/Elements/' in key and ('Name' in key or key.endswith('/') or 'damage' in key.lower()):
        locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
        translated = {lo: v for lo, v in locs.items() if v != en_val}
        if translated:
            print(f"  {key}: EN={en_val!r} -> {translated}")
