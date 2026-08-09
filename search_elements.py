#!/usr/bin/env python3
"""Search dict for damage/element type names."""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

EN = load_json(f'{RESOURCES}/dict.en.json')
ALL_LOCALES = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ALL_LOCALES}

print("=== Searching for elements/damage types ===")
for term in ['Heat', 'Cold', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 'Gas', 'Puncture', 'Slash', 'Impact', 'Radiation', 'Viral']:
    # Search for exact match in EN values
    found_keys = []
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv.upper().strip() == term.upper():
            found_keys.append(dk)
    if not found_keys:
        # Try partial match
        for dk, dv in EN.items():
            if isinstance(dv, str) and term.lower() in dv.lower() and 'element' in dk.lower():
                found_keys.append(dk)
    if found_keys:
        for k in found_keys:
            print(f"\n{term} -> {k}")
            for lo in ALL_LOCALES:
                print(f"  {lo}: {dicts[lo].get(k, '')}")
    else:
        print(f"\n{term}: NOT FOUND (exact)")
        # Try broader search
        for dk, dv in EN.items():
            if isinstance(dv, str) and term.lower() in dv.lower():
                print(f"  Similar: {dk} = {dv}")
                for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
                    print(f"    {lo}: {dicts[lo].get(dk, '')}")
                break

# Search for "Mod"
print("\n=== Searching for Mod ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and dv.upper().strip() == 'MOD':
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND (exact)")
    # Partial search
    for dk, dv in EN.items():
        if isinstance(dv, str) and 'mod' in dv.lower() and len(dv) < 20:
            print(f"  Similar: {dk} = {dv}")
            break

# Search for "Syndicate"
print("\n=== Searching for Syndicate ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and 'syndicate' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

# Search for "Necralisk"
print("\n=== Searching for Necralisk ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and 'necralisk' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

# Search for "Archwing"
print("\n=== Searching for Archwing ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and dv.upper().strip() == 'ARCHWING':
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND (exact)")
    for dk, dv in EN.items():
        if isinstance(dv, str) and 'archwing' in dv.lower():
            print(f"  Similar: {dk} = {dv}")
            for lo in ['en','fr']:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break

# Search for "Starchart"
print("\n=== Searching for Starchart ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and 'starchart' in dv.lower():
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND")

# Search for "Sentinel"
print("\n=== Searching for Sentinel ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and dv.upper().strip() == 'SENTINEL':
        print(f"  {dk} = {dv}")
        for lo in ALL_LOCALES:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        break
else:
    print("  NOT FOUND (exact)")
    for dk, dv in EN.items():
        if isinstance(dv, str) and 'sentinel' in dv.lower() and len(dv) < 30:
            print(f"  Similar: {dk} = {dv}")
            for lo in ['en','fr']:
                print(f"    {lo}: {dicts[lo].get(dk, '')}")
            break

# Search for "Mastery" / "Mastery Rank"
print("\n=== Searching for Mastery ===")
for dk, dv in EN.items():
    if isinstance(dv, str) and 'mastery' in dv.lower() and len(dv) < 30:
        print(f"  {dk} = {dv}")
        for lo in ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']:
            print(f"    {lo}: {dicts[lo].get(dk, '')}")
        print()
