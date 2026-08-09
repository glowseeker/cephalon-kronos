#!/usr/bin/env python3
"""
FINAL approach: Resolve all remaining translations properly.
1. Write translations data to JSON file with proper translations for all 13 locales.
2. Merge into T.
3. Apply to locale files with fixed apply script.
4. Build + verify.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load all dict files
dicts = {}
for lo in LOCALES + ['fr', 'en']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')

# Search dict for a term (case-insensitive) across all keys
def search_dict(lo, term):
    """Search dict for a term, case-insensitive."""
    d = dicts.get(lo, {})
    # Direct key match
    if term in d:
        return d[term]
    # Case-insensitive value search
    term_lower = term.lower()
    for key, val in d.items():
        if val.lower() == term_lower:
            return val
    # Partial value search for phrases
    for key, val in d.items():
        if term_lower in val.lower() and len(val) > len(term):
            return val
    return None

# Get FR value for an EN value from the locale file
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')

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

def fr_for_en(en_val):
    """Find the FR locale value corresponding to an EN value."""
    for k, v in flat_en.items():
        if v == en_val:
            return flat_fr.get(k, en_val)
    return en_val

# The 33 unique remaining EN values
remaining = [
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
    "All enemies are larger and faster than normal.",
    "Enemies are invisible and release a damaging blast on death.",
]

# Check game term resolution
for term in ['Infestation', 'Infested', 'Archguns', 'Rockets', 'Eximus', 'Necramech',
             'Parvos', 'Balloon', 'Scaldura', 'Liminus', 'Vitoplast', 'Amphors',
             'Tumors', 'Hives', 'protoframe', 'mimics', 'Rollers']:
    en_result = search_dict('en', term)
    fr_result = search_dict('fr', term)
    if en_result and fr_result and en_result != fr_result:
        print(f"  {term}: EN={en_result!r}, FR={fr_result!r}")
    elif en_result:
        print(f"  {term}: EN={en_result!r} (FR same)")
    else:
        pass  # not found

print(f"\nTotal remaining: {len(remaining)}")

# Merge into T
T = load_json('/tmp/tables/translation_table.json')
print(f"\nT has {len(T)} entries")
