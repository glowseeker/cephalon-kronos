#!/usr/bin/env python3
"""
Inspect ExportMissionTypes.json - find mission type keys and their values per locale.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

# Load ExportMissionTypes.json - check structure first
with open(f'{RESOURCES}/ExportMissionTypes.json', encoding='utf-8') as f:
    data = json.load(f)

print(f"Type: {type(data)}")
if isinstance(data, dict):
    print(f"Top-level keys ({len(data)}): {list(data.keys())[:20]}")
    # look for mission types
    for k in list(data.keys()):
        if 'xtermin' in k.lower() or 'capture' in k.lower() or 'intercept' in k.lower():
            print(f"  FOUND: {k} = {data[k]}")
elif isinstance(data, list):
    print(f"List of {len(data)} items")
    for item in data[:3]:
        print(json.dumps(item, ensure_ascii=False)[:300])
