#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE: Resolve ALL 249 remaining translations.
Uses:
1. Game dict files for game-sourced terms (element types, weapon types, etc.)
2. FR reference for all translations
3. Hand-translated UI text
"""
import json, os, re

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

# Load existing T
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path) if os.path.exists(T_path) else {}

# ============================================================
# PART 1: Dict-resolved translations (from dict file lookups)
# ============================================================
# These are game-sourced terms found in the dict files.
# Format: (en_value, dict_key) -> we extract translations from dicts

# Element status types - found in /Lotus/Language/Dojo/ keys
ELEMENTS = {
    'Heat': '/Lotus/Language/Dojo/HeatName',
    'Cold': '/Lotus/Language/Dojo/FreezeName',  # might not exist
    'Electricity': '/Lotus/Language/Dojo/ElectricityName',
    'Toxin': '/Lotus/Language/Dojo/ToxinName',
    'Blast': None,
    'Corrosive': None,
    'Magnetic': None,
    'Gas': None,
    'Puncture': '/Lotus/Language/CrewShip/SalvageUpgradePuncDamagePctIncrease',
    'Slash': '/Lotus/Language/CrewShip/SalvageUpgradeSlashDamagePctIncrease',
    'Impact': '/Lotus/Language/CrewShip/SalvageUpgradeImpactDamagePctIncrease',
    'Radiation': None,
    'Viral': None,
}

# Actually, let's use the patterns we discovered from the dict search
# Impact: /Lotus/Language/CrewShip/SalvageUpgradeImpactDamagePctIncrease
# The damage type names might be at different paths

# Let's search for the actual damage type keys
EN_DICT = load_json(f'{RESOURCES}/dict.en.json')
FR_DICT = load_json(f'{RESOURCES}/dict.fr.json')
LOCALES_DICT = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}

# Build a lookup: search for damage type names
for term, known_key in [('Heat', None), ('Cold', None), ('Toxin', None), ('Blast', None),
                          ('Corrosive', None), ('Magnetic', None), ('Gas', None),
                          ('Radiation', None), ('Viral', None), ('Impact', None),
                          ('Puncture', None), ('Slash', None)]:
    # Search for keys that might contain these
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str):
            # Check if the value is exactly the term (case insensitive)
            if dv.upper().strip() == term.upper():
                # Check if FR has the same key
                fr_val = FR_DICT.get(dk, '')
                if fr_val and fr_val != term:
                    print(f"  {term} -> {dk}: EN={dv}, FR={fr_val}")
                    break

print("\nDone searching.")
