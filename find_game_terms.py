#!/usr/bin/env python3
"""
Search dict files for exact game terms: Meso, Neo, Lith, Axi, Void, Deimos, etc.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

dicts = {}
for lo in LOCALES + ['en']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')
d_en = dicts['en']

# Known Lot path keys for relic eras
era_keys = [
    '/Lotus/Language/Relics/Era_MESO',
    '/Lotus/Language/Relics/Era_NEO',
    '/Lotus/Language/Relics/Era_LITH',
    '/Lotus/Language/Relics/Era_AXI',
]

print("=== Relic Era translations ===")
for key in era_keys:
    en_val = d_en.get(key, '?')
    print(f"\n{en_val} ({key}):")
    for lo in LOCALES:
        val = dicts[lo].get(key, en_val)
        print(f"  {lo}: {val!r}")

# Other game terms
print("\n\n=== Other game terms ===")
other_keys = [
    ('/Lotus/Language/Locations/Void', 'Void'),
    ('/Lotus/Language/Elements/Heat', 'Heat'),
    ('/Lotus/Language/Elements/Cold', 'Cold'),
    ('/Lotus/Language/Elements/Toxin', 'Toxin'),
    ('/Lotus/Language/Elements/Electricity', 'Electricity'),
]

for key, name in other_keys:
    en_val = d_en.get(key, '?')
    print(f"\n{name} ({key}): EN={en_val!r}")
    for lo in LOCALES:
        val = dicts[lo].get(key, en_val)
        print(f"  {lo}: {val!r}")
