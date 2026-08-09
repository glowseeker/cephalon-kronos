#!/usr/bin/env python3
"""
For each EN value still in a locale, check if we CAN provide a translation that differs from EN.
This tells us exactly what work remains.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en', 'fr']}
d_en = dicts['en']
data = load_json('/tmp/tables/ui_text_to_translate.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# Build key-based lookup
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

GAME_TERM_KEYS = {
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
}

def dict_resolve(en_val):
    result = {}
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term:
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                val = d.get(lo, en_val)
                en_ref = d.get('en', en_val)
                if val != en_ref and val.strip():
                    result[lo] = val
            break
    return result

# For each EN value still EN in at least one locale, check what we can provide
still_en_en_vals = set()
for lo in LOCALES:
    ui = locale_files[lo].get('ui', {})
    for item in data:
        en_val = item['en']
        key = item['key']
        current = ui.get(key, en_val)
        if current == en_val:
            still_en_en_vals.add(en_val)

print(f"Unique EN values still EN in at least one locale: {len(still_en_en_vals)}")
print(f"EN values: {sorted(still_en_en_vals)}")

# For each, check what dict gives us
print("\n=== Dict resolution for remaining EN values ===")
for en_val in sorted(still_en_en_vals):
    dict_trans = dict_resolve(en_val)
    if dict_trans:
        print(f"  {en_val}: dict has -> {dict_trans}")
    else:
        # Check if it's a proper noun
        if en_val in ['Meso', 'Neo', 'Lith', 'Void', 'Deimos', 'Orb Vallis', 'Void Traces',
                       'Necralisk', 'Archimedea', 'Descendia', 'SP Incursions', 'Loid: Voca',
                       'Veiled', 'N/A', 'Rivens', 'Warframe', 'Sentinel', 'Necramech', 'Necramechs',
                       'Mod', 'Pistol', 'Credits', 'Creds', 'Name', 'Details', 'Set', 'Tiger',
                       'Cursor', 'Updates', 'Warm', 'Winter', 'News', 'Sentinels', 'Mobile Interception',
                       'Unique mission objective.', 'Kill marked Necramites that periodically spawn.',
                       'Loot containers within time limit.', 'Isleweaver', 'Vampyric Liminus',
                       'Temporal Archimedea', 'Scan', 'Scanning...']:
            print(f"  {en_val}: PROPER NOUN (stays EN)")
        else:
            print(f"  {en_val!r}: UNKNOWN - needs check")
