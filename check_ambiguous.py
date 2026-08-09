#!/usr/bin/env python3
"""
Split Path B (154 keys) into:
- B-universal: proper nouns / format strings / abbreviations. FR keeps EN too -> stays EN everywhere.
- B-translate: real UI words needing native translations.
Also verify Ducats/Platinum/others against per-locale dicts.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

d_en = load_json(f'{RESOURCES}/dict.en.json')
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}

# Per-locale values for PrimeBucks (Ducats) and a few ambiguous terms
print("=== PrimeBucks (Ducats) per locale ===")
for lo in ['en'] + LOCALES:
    d = d_en if lo == 'en' else dicts[lo]
    print(f"  {lo}: {d.get('/Lotus/Language/Items/PrimeBucks')!r}")

print("\n=== Challenge_PlayerRank19_Name (Tiger) per locale ===")
for lo in ['en'] + LOCALES:
    d = d_en if lo == 'en' else dicts[lo]
    print(f"  {lo}: {d.get('/Lotus/Language/Challenges/Challenge_PlayerRank19_Name')!r}")

# Check if there are platinum-related dict keys
print("\n=== Platinum dict keys ===")
for key, val in d_en.items():
    if isinstance(val, str) and 'Platinum' in val and len(val) < 30:
        print(f"  {key} -> {val!r}")

# Check credits
print("\n=== Credits dict keys ===")
for key, val in d_en.items():
    if isinstance(val, str) and val.strip() == 'Credits':
        print(f"  {key} -> {val!r}")
