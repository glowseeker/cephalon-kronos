#!/usr/bin/env python3
"""
Find element dict keys by searching for keys in /Lotus/Language/Elements/ path.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en']}
d_en = dicts['en']

# Find all keys in /Lotus/Language/Elements/ path
print("=== Element keys ===")
element_translations = {}
for key in sorted(d_en.keys()):
    if '/Lotus/Language/Elements/' in key:
        en_val = d_en[key]
        locs = {}
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                locs[lo] = v
        if locs:
            element_translations[en_val] = locs
            print(f"  {en_val!r} ({key}):")
            for lo, v in locs.items():
                print(f"    {lo}: {v!r}")

# Find Mod, Mods, Sentinel, Sentinels
print("\n=== Search for 'Mod' ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Mod' and 'Menu' in key:
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            print(f"    {lo}: {v!r}")
        break

print("\n=== Search for 'Sentinel' ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Sentinel':
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                print(f"    {lo}: {v!r}")
        break

# Search for Necramech
print("\n=== Search for 'Necramech' ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Necramech':
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                print(f"    {lo}: {v!r}")
        break

# Search for 'Credits' as standalone
print("\n=== Search for 'Credits' ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Credits':
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            if v != en_val:
                print(f"    {lo}: {v!r}")
        break
