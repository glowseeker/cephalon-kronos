#!/usr/bin/env python3
"""
Check dict files for translations of remaining EN values.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en', 'fr']}
d_en = dicts['en']

terms_to_check = ['Meso', 'Neo', 'Cambion Drift', 'Void', 'Mod', 'Necramech', 'Necramechs',
                  'Necralisk', 'Pistol', 'Sentinel', 'Credits', 'Warm', 'Winter', 'News']

for term in terms_to_check:
    found = False
    for key, en_val in d_en.items():
        if en_val.strip() == term:
            locs = {lo: dicts[lo].get(key, en_val) for lo in LOCALES if dicts[lo].get(key, en_val) != en_val}
            if locs:
                print(f"{term} ({key}): {locs}")
                found = True
    if not found:
        print(f"{term}: NOT FOUND in dict")
