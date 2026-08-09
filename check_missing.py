#!/usr/bin/env python3
"""
Add Heat, Cold, Mod and other missing simple terms.
Also resolve all remaining entries.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

# Load existing T
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path)

# Heat and Cold not added yet - check why
for term in ['Heat', 'Cold', 'Mod']:
    if term in T:
        print(f"{term} already in T: {T[term]}")
    else:
        print(f"{term} NOT in T")

# Check if 'Rifle' is in T but 'Rifles' is not
for term in ['Rifle', 'Rifles', 'Shotgun', 'Shotguns', 'Pistols', 'Melee', 'Archgun', 'Archguns']:
    if term in T:
        print(f"  {term} in T")
    else:
        print(f"  {term} NOT in T")

# Check element types
for term in ['Heat', 'Cold', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 'Gas', 'Radiation', 'Viral', 'Impact', 'Puncture', 'Slash']:
    if term in T:
        print(f"  {term} in T: {T[term]}")
    else:
        print(f"  {term} NOT in T")
