#!/usr/bin/env python3
"""
Find element dict keys: Heat, Cold, Toxin, Electricity, etc.
Search for known element key paths.
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

# Element key paths used by Warframe
element_keys = {
    'Heat': '/Lotus/Language/Elements/Heat',
    'Cold': '/Lotus/Language/Elements/Cold',
    'Toxin': '/Lotus/Language/Elements/Toxin',
    'Electricity': '/Lotus/Language/Elements/Electricity',
    'Toxin': '/Lotus/Language/Elements/Toxin',
    'Gas': '/Lotus/Language/Elements/Gas',
    'Magnetic': '/Lotus/Language/Elements/Magnetic',
    'Radiation': '/Lotus/Language/Elements/Radiation',
    'Viral': '/Lotus/Language/Elements/Viral',
    'Corrosive': '/Lotus/Language/Elements/Corrosive',
    'Blast': '/Lotus/Language/Elements/Blast',
    'Impact': '/Lotus/Language/Elements/ImpactName',
    'Puncture': '/Lotus/Language/Elements/PunctureName',
    'Slash': '/Lotus/Language/Elements/SlashName',
    'Void': '/Lotus/Language/Elements/VoidName',
    'Poisoin': '/Lotus/Language/Elements/Poison',
}

# Also search for keys ending in 'Name' in Elements path
print("=== All element keys ===")
for key, en_val in d_en.items():
    if '/Lotus/Language/Elements/' in key:
        locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
        if any(v != en_val for v in locs.values()):
            print(f"  {key}: EN={en_val!r}")
            for lo in LOCALES:
                v = dicts[lo].get(key, en_val)
                if v != en_val:
                    print(f"    {lo}: {v!r}")

# Search for weapon types
print("\n=== Weapon type keys ===")
for key, en_val in d_en.items():
    if en_val in ['Pistol', 'Rifles', 'Pistols', 'Shotgun', 'Shotguns', 'Melee', 'Archgun', 'Archguns', 'Mods']:
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            print(f"    {lo}: {v!r}")

# Search for 'Sentinel' as standalone
print("\n=== Sentinel translations ===")
for key, en_val in d_en.items():
    if en_val.strip() == 'Sentinel':
        print(f"  {key}: EN={en_val!r}")
        for lo in LOCALES:
            v = dicts[lo].get(key, en_val)
            print(f"    {lo}: {v!r}")
