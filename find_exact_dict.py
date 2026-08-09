#!/usr/bin/env python3
"""
Find the correct dict keys for game terms: Heat, Cold, Meso, Neo, etc.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

dicts = {lo: json.load(open(f'{RESOURCES}/dict.{lo}.json', encoding='utf-8')) for lo in LOCALES + ['en']}
d_en = dicts['en']

# Search for Heat, Cold, Meso, Neo, Sentinel, Mod, Credits, etc. as exact EN values
terms = ['Heat', 'Cold', 'Meso', 'Neo', 'Lith', 'Axi', 'Sentinel', 'Sentinels', 
         'Mod', 'Necramech', 'Necramechs', 'Credits', 'Creds', 'Void', 'Deimos',
         'Relic', 'Relics', 'Void Traces']

for term in terms:
    found = False
    for key, en_val in d_en.items():
        if en_val.strip() == term:
            vals = {lo: dicts[lo].get(key, en_val) for lo in LOCALES}
            translated = {lo: v for lo, v in vals.items() if v != en_val}
            if translated:
                print(f"{term} ({key}):")
                for lo, v in translated.items():
                    print(f"  {lo}: {v!r}")
                found = True
    if not found:
        print(f"{term}: NOT FOUND as exact match")
