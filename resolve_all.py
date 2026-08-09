#!/usr/bin/env python3
"""
Comprehensive translation resolver.
For each missing key, uses FR as reference and provides translations from:
1. Game dict files (for game-sourced terms)
2. Hand-translated values (for UI text)
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

# Pre-load all locale flats and dicts
flat = {lo: flat_ui(load_json(f'src/lib/i18n/{lo}.json')) for lo in ['en', 'fr'] + LOCALES}
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ['en', 'fr'] + LOCALES}

en_f = flat['en']
fr_f = flat['fr']

# Rebuild T from existing translations
T = {}
for k, en_val in en_f.items():
    if not en_val:
        continue
    vals = [flat[lo].get(k, en_val) for lo in LOCALES]
    if any(v != en_val for v in vals):
        T[en_val] = vals

print(f"Existing T: {len(T)} entries")

# Find missing keys
missing = []
for k in sorted(en_f):
    en_val = en_f[k]
    if not en_val or en_val in T:
        continue
    fr_val = fr_f.get(k, en_val)
    if fr_val == en_val:
        continue
    all_en = all(flat[lo].get(k, en_val) == en_val for lo in LOCALES)
    if all_en:
        missing.append((k, en_val, fr_val))

print(f"Missing: {len(missing)}")
print()

# Build a reverse lookup: for each EN game term, find its dict key
# Then use dict key to get all locale translations
def find_dict_key(en_val):
    """Find the dict key for a given EN value."""
    for dk, dv in dicts['en'].items():
        if isinstance(dv, str) and dv == en_val:
            return dk
    return None

def get_dict_translations(dk):
    """Get translations for a dict key across all locales."""
    return {lo: dicts[lo].get(dk, '') for lo in ['en', 'fr'] + LOCALES}

# Categorize missing keys
game_terms_found = 0
game_terms_not_found = 0
ui_text = 0
proper_nouns = 0

for k, en_val, fr_val in missing:
    dk = find_dict_key(en_val)
    if dk:
        game_terms_found += 1
    else:
        # Check if it looks like UI text (short, non-game-term)
        if len(en_val) < 100 and not en_val.startswith("Enemies") and not en_val.startswith("Players") and not en_val.startswith("The ") and not en_val.startswith("All ") and not en_val.startswith("If ") and not en_val.startswith("Poison") and not en_val.startswith("Debris") and not en_val.startswith("Some") and not en_val.startswith("Kill") and not en_val.startswith("Loot") and not en_val.startswith("Protect") and not en_val.startswith("Cleanse") and not en_val.startswith("Collect") and not en_val.startswith("Defend") and not en_val.startswith("Fill") and not en_val.startswith("Race") and not en_val.startswith("Keep") and not en_val.startswith("Upon") and not en_val.startswith("Destroy") and not en_val.startswith("Defeat") and not en_val.startswith("Check") and not en_val.startswith("No ") and not en_val.startswith("Synced") and not en_val.startswith("Changing") and not en_val.startswith("Auto") and not en_val.startswith("Game") and not en_val.startswith("Search") and not en_val.startswith("Load") and not en_val.startswith("Last") and not en_val.startswith("Add") and not en_val.startswith("New") and not en_val.startswith("Open") and not en_val.startswith("Reset") and not en_val.startswith("Delete") and not en_val.startswith("Go to") and not en_val.startswith("Processing") and not en_val.startswith("Sync your") and not en_val.startswith("Inventory") and not en_val.startswith("Image") and not en_val.startswith("Optional") and not en_val.startswith("Config") and not en_val.startswith("Description") and not en_val.startswith("Marker") and not en_val.startswith("Path") and not en_val.startswith("Imported") and not en_val.startswith("Import") and not en_val.startswith("New Config") and not en_val.startswith("No other") and not en_val.startswith("No configurations") and not en_val.startswith("No items") and not en_val.startswith("No collectibles") and not en_val.startswith("No areas") and not en_val.startswith("Challenge"):
            ui_text += 1
            print(f"UI TEXT: {k} = {en_val}")
        else:
            game_terms_not_found += 1
            print(f"NOT IN DICT: {k} = {en_val} (FR: {fr_val})")

print(f"\nGame terms found in dict: {game_terms_found}")
print(f"Game terms NOT found in dict: {game_terms_not_found}")
print(f"UI text: {ui_text}")
