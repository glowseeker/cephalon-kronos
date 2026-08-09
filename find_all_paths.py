#!/usr/bin/env python3
"""
Find exact dict paths for the specific mission types our locale files use:
Extermination, Capture, Interception, Sabotage, Excavation, Mobile Interception,
plus Descendia-specific ones (Unique, Volatile, Normal, Missions, Sources, Optimal...)
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

mt = load_json(f'{RESOURCES}/ExportMissionTypes.json')
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en']}
d_en = dicts['en']

# All mission type paths
paths = {key: val['name'] for key, val in mt.items() if isinstance(val, dict) and 'name' in val}

# EN values we care about
targets = ['Extermination', 'Capture', 'Interception', 'Sabotage', 'Excavation',
           'Mobile Interception', 'Interception', 'Volatile', 'Unique', 'Normal',
           'Missions', 'Sources', 'Optimal', 'Standard', 'Aura', 'Umbra', 'Incarnon',
           'Prime', 'Fissures', 'Nightwave', 'Sorties', 'Circuit', 'The Circuit',
           'Cetus', 'Duviri', 'Zariman', 'Fortuna', 'Cavia', 'Hex', 'Nexus 1999',
           'Infested Salvage', 'Mobile Defense', 'Spy', 'Disruption', 'Void Cascade',
           'Void Flood', 'Void Armageddon']

print("=== Mission type paths matching our targets ===")
for mkey, path in sorted(paths.items()):
    en_val = d_en.get(path, '')
    if en_val in targets or en_val.strip().upper() in [t.upper() for t in targets]:
        print(f"{mkey}: {path}  EN={en_val!r}")

print("\n=== Search dict for Mobile Interception / Volatile / other misc ===")
for term in ['Mobile Interception', 'Volatile', 'Unique', 'Optimal', 'Sources', 'Missions',
             'Visible', 'Standard', 'Version', 'Meta', 'Niche']:
    hits = []
    for key, val in d_en.items():
        if isinstance(val, str) and val.strip().lower() == term.lower():
            hits.append(key)
    print(f"\n{term!r}: {len(hits)} keys")
    for k in hits[:10]:
        print(f"  {k}")
