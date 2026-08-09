#!/usr/bin/env python3
"""Check dict value case and resolve game terms."""
import json, os

RESDIR = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

D = {}
for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
    D[lo] = load_json(f'{RESDIR}/dict.{lo}.json')

# Check case for mission types
keys = [
    ('/Lotus/Language/Missions/MissionName_Sabotage', 'Sabotage'),
    ('/Lotus/Language/Missions/MissionName_Exterminate', 'Extermination'),
    ('/Lotus/Language/Missions/MissionName_Assassination', 'Assassination'),
    ('/Lotus/Language/Elements/ImpactName', 'Impact'),
    ('/Lotus/Language/Elements/ColdName', 'Cold'),
    ('/Lotus/Language/Elements/GasName', 'Gas'),
]

for key, en_val in keys:
    vals = {}
    for lo in ['en', 'fr', 'de', 'es']:
        vals[lo] = D[lo].get(key, 'NOT FOUND')
    print(f"{en_val}: {vals}")

# Check syndicates
print("\nSyndicates:")
syn = load_json(f'{RESDIR}/ExportSyndicates.json')
if isinstance(syn, dict):
    for k in list(syn.keys())[:3]:
        entry = syn[k]
        name_key = entry.get('nameKey', '') or entry.get('_id', '')
        print(f"  {k}: nameKey={name_key}")
        for lo in ['en', 'fr', 'de']:
            print(f"    {lo}: {D[lo].get(name_key, 'NOT FOUND')}")
