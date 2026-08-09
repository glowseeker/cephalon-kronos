#!/usr/bin/env python3
"""Search for all keys containing damage element names."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

ALL_LOCALES = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ALL_LOCALES}
EN_DICT = dicts['en']

# Search for keys matching damage element patterns
for term in ['Heat', 'Cold', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 'Gas',
             'Radiation', 'Viral']:
    print(f"\n=== Searching for {term} ===")
    found = False
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and len(dv) < 50 and term in dk:
            # Check if this is a simple name (not a description)
            if dv.upper() == term.upper():
                print(f"  EXACT: {dk} = {dv}")
                for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
                    print(f"    {lo}: {dicts[lo].get(dk, '')}")
                found = True
                break
    if not found:
        # Try searching values
        for dk, dv in EN_DICT.items():
            if isinstance(dv, str) and dv.upper().strip() == term.upper():
                print(f"  VALUE MATCH: {dk} = {dv}")
                found = True
                break
    if not found:
        print(f"  NOT FOUND")

# Also search for "Mod" as a standalone value
print("\n=== Searching for 'Mod' standalone ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and dv.upper().strip() == 'MOD':
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

# Search for common UI terms
print("\n=== Searching for 'Action' ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and dv.upper().strip() == 'ACTION':
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

print("\n=== Searching for 'Upgrade' ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and dv.upper().strip() == 'UPGRADE':
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

# Search for weapon types
print("\n=== Searching for 'Pistol'/'Rifle'/'Shotgun' ===")
for term in ['Pistol', 'Rifles', 'Shotguns', 'Archgun', 'Archwing']:
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and dv.upper().strip() == term.upper():
            print(f"\n  {term} -> {dk} = {dv}")
            for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break
    else:
        print(f"  {term}: NOT FOUND")
