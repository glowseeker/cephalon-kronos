#!/usr/bin/env python3
"""Search for weapon category names in dict."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

ALL_LOCALES = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ALL_LOCALES}
EN_DICT = dicts['en']

# Search for weapon type names with various patterns
for term in ['Pistol', 'Rifle', 'Shotgun', 'Archgun', 'Melee', 'Secondary', 'Primary']:
    print(f"\n=== {term} ===")
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and dv.upper().strip() == term.upper():
            print(f"  {dk}")
            for lo in ALL_LOCALES:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break
    else:
        print(f"  NOT FOUND exact")
    
    # Also search with 's' (plural)  
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and dv.upper().strip() == (term + 's').upper():
            print(f"  (plural) {dk} = {dv}")
            for lo in ['en','fr','de','es','it']:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break

# Search for "Syndicate"
print("\n=== Syndicate ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'syndicate' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break

# Search for "Necralisk"
print("\n=== Necralisk ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'necralisk' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Void" as standalone
print("\n=== Void ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and dv.upper().strip() == 'VOID':
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Starchart"
print("\n=== Starchart ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'starchart' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Sentinel"
print("\n=== Sentinel ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'sentinel' in dv.lower() and len(dv) < 30:
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Railjack"
print("\n=== Railjack ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'railjack' in dv.lower() and len(dv) < 30:
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Incarnon"
print("\n=== Incarnon ===")
for dk, dv in EN_DICT.items():
    if isinstance(dv, str) and 'incarnon' in dv.lower() and len(dv) < 50:
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("NOT FOUND")

# Search for "Infested", "Corpus", "Grineer", "Orokin", "Sentient", "Tenno"
for term in ['Infested', 'Corpus', 'Grineer', 'Orokin', 'Sentient', 'Tenno']:
    print(f"\n=== {term} ===")
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and dv.upper().strip() == term.upper():
            print(f"  {dk}")
            for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break
    else:
        print("NOT FOUND exact")
        for dk, dv in EN_DICT.items():
            if isinstance(dv, str) and term.lower() in dv.lower() and len(dv) < 30:
                print(f"  Similar: {dk} = {dv}")
                for lo in ['en','fr']:
                    print(f"    {lo}: {dicts[lo].get(dk, '')}")
                break
