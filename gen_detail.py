#!/usr/bin/env python3
"""
Generate a compact per-key detail dump for the 38 remaining keys:
key | EN | FR | locales still EN | dict resolution available per locale
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en']}
d_en = dicts['en']
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES + ['fr']}
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Key-based dict lookup: known Lotus paths for game terms
GAME_TERM_KEYS = {
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Void': '/Lotus/Language/Locations/Void',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
    'Cambion Drift': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosLandscapeName',
}

key_lookup = {}
for key in set(d_en):
    key_lookup[key] = {}
    for lo in LOCALES:
        d = dicts[lo]
        if key in d:
            val = d[key]
            en_ref = d_en.get(key, val)
            if val != en_ref and val.strip():
                key_lookup[key][lo] = val

lines = []
lines.append("# Remaining 38 keys — per-key detail (for Claude review)")
lines.append("")
lines.append("Legend: `still EN` = locales where this key's value == EN string. `dict` = per-locale value from DE dict files (only listed where it differs from EN).")
lines.append("")

for item in data:
    en_val = item['en']
    key = item['key']
    fr_val = item.get('fr', '')
    
    still_en = []
    dict_avail = {}
    for lo in LOCALES:
        ui = locale_files[lo].get('ui', {})
        current = ui.get(key, en_val)
        if current == en_val:
            still_en.append(lo)
        # dict availability for this EN value (by game term key)
        for term, dkey in GAME_TERM_KEYS.items():
            if en_val == term and lo in key_lookup.get(dkey, {}):
                dict_avail[lo] = key_lookup[dkey][lo]
    if not still_en:
        continue
    
    lines.append(f"## {key}")
    lines.append(f"- EN: `{en_val}`")
    lines.append(f"- FR: `{fr_val}`")
    lines.append(f"- still EN in: {', '.join(still_en)}")
    if dict_avail:
        dv = ', '.join(f"{lo}:`{v}`" for lo, v in dict_avail.items())
        lines.append(f"- dict has: {dv}")
    else:
        lines.append("- dict: (no key-based resolution)")
    lines.append("")

out = '\n'.join(lines)
with open('TASK_DETAIL.md', 'w', encoding='utf-8') as f:
    f.write(out)
print(f"Wrote TASK_DETAIL.md ({len(out)} chars, {out.count('## ')} keys)")
