#!/usr/bin/env python3
"""
Find correct dict paths for game terms.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load all dict files
dicts = {}
for lo in LOCALES + ['en']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')
d_en = dicts['en']

# Search for keys containing "Element" or "Heat" etc
print("=== Keys containing 'Heat' or 'Element' ===")
for key, en_val in d_en.items():
    if 'heat' in key.lower() or 'element' in key.lower():
        print(f"  EN: {en_val!r} -> key: {key}")
        for lo in LOCALES[:3]:
            print(f"    {lo}: {dicts[lo].get(key, 'NOT FOUND')!r}")

# Search for Necramech, Necralisk
print("\n=== Keys containing 'Necramech' ===")
for key, en_val in d_en.items():
    if 'necramech' in en_val.lower():
        print(f"  EN: {en_val!r} -> key: {key}")
        for lo in LOCALES[:3]:
            print(f"    {lo}: {dicts[lo].get(key, 'NOT FOUND')!r}")
        if len([k for k in d_en if 'necramech' in d_en[k].lower()]) > 5:
            break

print("\n=== Keys containing 'Necralisk' ===")
for key, en_val in d_en.items():
    if 'necralisk' in en_val.lower():
        print(f"  EN: {en_val!r} -> key: {key}")
        for lo in LOCALES[:3]:
            print(f"    {lo}: {dicts[lo].get(key, 'NOT FOUND')!r}")
        if len([k for k in d_en if 'necralisk' in d_en[k].lower()]) > 5:
            break

# Search for 'Deimos' as a standalone term (not in a longer string)
print("\n=== Keys where EN value is exactly 'Deimos' ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Deimos':
        print(f"  key: {key}")
        for lo in LOCALES:
            print(f"    {lo}: {dicts[lo].get(key, 'NOT FOUND')!r}")
