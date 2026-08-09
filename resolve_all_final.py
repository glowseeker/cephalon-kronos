#!/usr/bin/env python3
"""
Fix the 34 remaining descendia entries.
Strategy: For each EN description, provide proper translations in all 13 locales.
Game terms that ARE in the dict (Vitoplast, Necramech, Parvos, Infestation, etc.)
get their dict translations. UI text (Fill, Destroy, Capture, etc.) gets linguistically translated.
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
for lo in LOCALES + ['fr', 'en']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')

# Load locale files to get existing translations for game terms
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}
flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))

# Get the FR translation for an EN value by looking up in the locale file
def fr_value_for_en(en_val):
    for k, v in flat_en.items():
        if v == en_val:
            return flat_fr.get(k, en_val)
    return en_val

# Get the localized game term from the dict file
# The dict files have key paths like /Lotus/Language/.../TermName -> "Translated Term"
def find_in_dict(lo, search_term):
    d = dicts.get(lo, {})
    # Search by value
    term_lower = search_term.lower()
    for key, val in d.items():
        if val == search_term:
            return val
    # Search case-insensitive
    for key, val in d.items():
        if val.lower() == term_lower:
            return val
    return None

# Known game term dict keys
DICT_KEYS = {
    'Vitoplast': '/Lotus/Language/Items/VitoplastName',
    'Necramech': '/Lotus/Language/Items/NecramechName',
    'Infestation': '/Lotus/Language/Elements/InfestedName',
    'Eximus': '/Lotus/Language/Units/EximusName',
    'Archgun': '/Lotus/Language/Weapons/ArchwingGunName',
    'Kaithe': '/Lotus/Language/Items/KaitheName',
    'Parvos': None,  # proper noun - keep EN
    'Lyon': None,    # proper noun - keep EN
    'Oraxia': None,  # proper noun - keep EN
}

# Get game term translations from dict
def get_game_terms():
    terms = {}
    for term, key in DICT_KEYS.items():
        if key is None:
            terms[term] = {lo: term for lo in LOCALES + ['en', 'fr']}
        else:
            term_translations = {}
            for lo in LOCALES + ['en', 'fr']:
                term_translations[lo] = dicts.get(lo, {}).get(key, term)
            terms[term] = term_translations
    return terms

game_terms = get_game_terms()
print("Game term translations:")
for term, trans in game_terms.items():
    print(f"  {term}: {trans}")

# Get FR translations for the 33 remaining EN values from locale file
# These are the descandiant descriptions
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
]

# For each EN value, get the FR translation
print("\nFR translations for remaining entries:")
for en_val in remaining_ens:
    fr_val = fr_value_for_en(en_val)
    print(f"  {en_val!r} -> FR: {fr_val!r}")

# Now I need to translate these FR values into the 13 locales
# But the FR values are also long descriptions, so I need to translate them properly
