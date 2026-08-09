#!/usr/bin/env python3
"""Search dict for element names and other missing terms."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

EN = load_json(f'{RESOURCES}/dict.en.json')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
dicts = {'en': EN, 'fr': load_json(f'{RESOURCES}/dict.fr.json'), **{lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}}

# Search for element names - they might be under different keys
# e.g. "Heat" might be "HEAT" or "Fire"
for term in ['Heat', 'Cold', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 'Gas', 'Puncture', 'Slash', 'Impact', 'Radiation', 'Viral']:
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv.upper() == term.upper():
            print(f"{term} -> {dk}")
            for lo in ['en','fr'] + LOCALES:
                d = load_json(f'{RESOURCES}/dict.{lo}.json')
                val = d.get(dk, '')
                print(f"  {lo}: {val}")
            print()
            break

# Also search for "Mod" - it might be "MOD" under a different key
print("\n=== Searching for MOD ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and dv.upper() == 'MOD':
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
            d = load_json(f'{RESOURCES}/dict.{lo}.json')
            print(f"    {lo}: {d.get(dk, '')}")
        break

# Search for "Syndicate"
print("\n=== Searching for Syndicate ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and dv.upper() == 'SYNDICATE':
        print(f"  {dk} = {dv}")
        for lo in LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break

# Search for category names like "Cephalon Fragments", "Eidolon Caves"
# These might be under /Lotus/Language/Items/ or /Lotus/Language/Game/
print("\n=== Searching for Cephalon, Eidolon, Fortuna, etc ===")
for term in ['Cephalon', 'Cephalon Fragments', 'Eidolon', 'Eidolon Caves',
             'Fortuna', 'Fortuna Fragments', 'Glass Shards', 'Leverian', 'Prex',
             'Lost Islands', 'Thousand-Year Fish', 'Partnership Fragments',
             'Vallis', 'Vallis Caves', 'Encrypted Journals', 'Nakak',
             'Albrecht', 'Albrecht Notes', 'The Tenets', 'Tenets']:
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv.upper() == term.upper():
            print(f"\n{term} -> {dk}")
            for lo in ['en','fr'] + LOCALES:
                print(f"  {lo}: {dicts[lo].get(dk, '')}")
            break
    else:
        print(f"\n{term}: NOT FOUND")

# Search for "Necramech" (not just "Necralisk")
print("\n=== Searching for Necramech, Archgun, Archguns ===")
for term in ['Necramech', 'Necramechs', 'Archgun', 'Archguns', 'Arch-Gun', 'Arch-Guns']:
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv.upper() == term.upper():
            print(f"\n{term} -> {dk}")
            for lo in ['en','fr'] + LOCALES:
                print(f"  {lo}: {dicts[lo].get(dk, '')}")
            break
    else:
        print(f"\n{term}: NOT FOUND")

# Search for "Incarnon"
print("\n=== Searching for Incarnon ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and 'INCARNON' in dv.upper():
        print(f"  {dk} = {dv}")
        for lo in ['en','fr'] + LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
