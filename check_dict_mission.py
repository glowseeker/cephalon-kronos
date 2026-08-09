#!/usr/bin/env python3
"""
Check if the dict files contain mission type / element translations that my
value-lookup missed. Search for known EN mission-type values.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

d_en = load_json(f'{RESOURCES}/dict.en.json')

# Search all dict keys whose EN value is exactly one of these
targets = ['Extermination', 'Capture', 'Interception', 'Sabotage', 'Excavation',
           'Mobile Interception', 'Normal', 'Unique', 'Volatile', 'Missions',
           'Sources', 'Optimal', 'Standard', 'Version', 'Visible', 'Meta', 'Niche',
           'Disciple', 'Dragon', 'Novice', 'Sage', 'Tiger', 'Amp', 'Endo', 'MOA',
           'Archwing', 'K-Drive', 'Kitgun', 'Railjack', 'Parazon', 'Exilus', 'Aura']

print("=== Searching dict.en.json for exact EN values ===")
found = {}
for key, val in d_en.items():
    if isinstance(val, str) and val.strip() in targets:
        found.setdefault(val, []).append(key)

for t in targets:
    keys = found.get(t)
    if keys:
        print(f"\n{t!r}: {len(keys)} dict keys")
        for k in keys[:5]:
            print(f"  {k}")
    else:
        print(f"\n{t!r}: NOT FOUND as exact EN value")
