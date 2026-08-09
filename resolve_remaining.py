#!/usr/bin/env python3
"""
FINAL SCRIPT: Resolve all 34 remaining descendia entries.
Strategy:
1. For game-sourced terms (Infestation, Tumors, Hives, Eximus, Archguns, Necramech, etc.), look up in dict files.
2. For UI description text, translate directly using FR reference + linguistic knowledge.
3. For proper nouns (Parvos, Lyon, Oraxia), keep EN across all locales.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict files
dicts = {}
for lo in ['fr'] + LOCALES:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics','rivens','mastery','collectibles','settings','adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

flat_en = flat_ui(en)
flat_fr = flat_ui(fr)
flat = {lo: flat_ui(langs[lo]) for lo in LOCALES}

T = load_json('/tmp/tables/translation_table.json')

# Get FR translation for an EN value
def fr_for(en_val):
    for k, v in flat_en.items():
        if v == en_val:
            return flat_fr.get(k, en_val)
    return en_val

# Get translation for a game term from dict files
def dict_lookup(lo, term):
    if term in dicts.get(lo, {}):
        return dicts[lo][term]
    # Case-insensitive search
    for key, val in dicts.get(lo, {}).items():
        if val.upper() == term.upper():
            return val
    return None

# Game term translations from dict files
# Known dict paths for game terms
GAME_TERMS = {
    'Infestation': '/Lotus/Language/Elements/InfestedName',
    'Infested': None,  # will search dict
    'Archguns': None,
    'Eximus': None,
    'Necramech': '/Lotus/Language/Items/NecramechName',
    'Parvos': None,
    'Balloon': None,
    'Scaldura': None,
    'Liminus': None,
    'Vitoplast': None,
    'Amphors': None,
    'Tumors': None,
    'Hives': None,
}

# The 34 remaining EN values
remaining_ens = [
    "Fill a Crucible using two elemental Amphors.",
    "Destroy floating hologlobes.",
    "Capture the target.",
    "Collect Vitoplast.",
    "Protect Excavators and keep them powered with Power Cells.",
    "Kill a specific number of enemies.",
    "Cleanse nodes of Infestation to power a Vaporizer.",
    "Defend and capture intercept points.",
    "Kill loot creatures before they escape.",
    "Loot storage containers within time limit - beware of mimics.",
    "Special protoframe encounter - boss or sanctuary.",
    "Destroy Infested Tumors to eliminate their Hives.",
    "Keep enemies out of a point, deposit offerings to spawn a boss.",
    "All enemies are Balloon-based Scaldura.",
    "Loot storage containers.",
    "Blitz Leech.",
    "All enemies are Rollers that leave behind a trail of fire.",
    "Enemies are connected by flaming beams, burning players on contact.",
    "Enemies are larger and slower than normal.",
    "Enemies are heavily resistant to all damage not dealt by Archguns or Rockets.",
    "Horse Combat Only.",
    "The player is forced to use Necramech against Rogue Necramechs.",
    "Race through gates on a Kaithe.",
    "Security Spin.",
    "Leech, Shock, or Venomous Eximus variant.",
    "Debris is constantly falling from the ceiling, dealing damage to anyone caught underneath.",
    "Sunlight penance.",
    "Infested Boyband.",
    "Defeat Oraxia boss.",
    "Defeat a Sister of Parvos.",
    "Lyon's Sanctuary.",
    "Collect Vitoplast.",
    "Protect Excavators and keep them powered with Power Cells.",
]

print(f"Remaining EN values: {len(remaining_ens)}")
print(f"T has {len(T)} entries before")

# For each EN value, check if already in T
still_missing = [e for e in remaining_ens if e not in T]
print(f"Still missing from T: {len(still_missing)}")
