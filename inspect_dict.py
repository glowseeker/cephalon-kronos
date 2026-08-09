#!/usr/bin/env python3
"""Inspect dict files and ExportMissionTypes for localization."""
import json, os

os.chdir('/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai')

# Load ExportMissionTypes
d = json.load(open('ExportMissionTypes.json', encoding='utf-8'))
print(f"Mission types: {len(d)}")
for k, v in list(d.items())[:5]:
    name = v.get('name', '')
    print(f"\n{k}: {name}")
    for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
        dict_lo = json.load(open(f'dict.{lo}.json', encoding='utf-8'))
        val = dict_lo.get(name, '[NOT FOUND]')
        print(f"  {lo}: {val}")

# Inspect dict file structure
print("\n\n=== Dict file structure ===")
dict_en = json.load(open('dict.en.json', encoding='utf-8'))
print(f"English dict: {len(dict_en)} entries")
# Show a few keys
for i, k in enumerate(list(dict_en.keys())[:10]):
    print(f"  {k}: {dict_en[k][:60] if len(str(dict_en[k]))>60 else dict_en[k]}")

# Search for specific terms
print("\n=== Searching for 'Syndicate' ===")
for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
    dict_lo = json.load(open(f'dict.{lo}.json', encoding='utf-8'))
    for dk, dv in dict_lo.items():
        if 'yndicat' in str(dv).lower() or 'yndi' in str(dv).lower():
            print(f"  {lo}: {dk} = {dv}")
            break

print("\n=== Searching for 'Infested' ===")
for lo in ['en', 'fr', 'de', 'es', 'it']:
    dict_lo = json.load(open(f'dict.{lo}.json', encoding='utf-8'))
    for dk, dv in dict_lo.items():
        if 'nfest' in str(dv).lower():
            print(f"  {lo}: {dk} = {dv}")
            break

print("\n=== Searching for 'Tenno' ===")
for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
    dict_lo = json.load(open(f'dict.{lo}.json', encoding='utf-8'))
    found = False
    for dk, dv in dict_lo.items():
        if 'tenno' in str(dv).lower():
            print(f"  {lo}: {dk} = {dv}")
            found = True
            break
    if not found:
        print(f"  {lo}: NOT FOUND")
