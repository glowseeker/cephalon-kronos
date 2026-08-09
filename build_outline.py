#!/usr/bin/env python3
"""
Build the authoritative remaining-work report for Claude review. v2

Priority per user rules:
1. If DE dict has a per-locale translation -> USE IT (dict is authoritative for game terms,
   regardless of whether FR locale file keeps EN).
2. Else if FR differs -> MANUAL translation needed (real UI text, no dict source).
3. Else (FR == EN, no dict) -> universal term (proper noun / format string / abbreviation).
   Leave as EN - it IS the correct value in every locale.

Output: paste-ready markdown.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

en_data = load_json('src/lib/i18n/en.json')
fr_data = load_json('src/lib/i18n/fr.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
en_ui = en_data.get('ui', {})
fr_ui = fr_data.get('ui', {})

# Load dict files
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en']}
d_en = dicts['en']

# Value-based dict lookup: EN value -> {locale: translation}
val_lookup = {}
for lo in LOCALES:
    d = dicts[lo]
    for key, val in d.items():
        if not val or not isinstance(val, str) or not val.strip():
            continue
        en_ref = d_en.get(key)
        if not en_ref or not isinstance(en_ref, str) or en_ref == val:
            continue
        en_key = en_ref.strip().lower()
        if en_key not in val_lookup:
            val_lookup[en_key] = {}
        if lo not in val_lookup[en_key]:
            val_lookup[en_key][lo] = val

# Key-based dict lookup for known game terms
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

# Mission types: EN value (lowercased) -> dict path
# (dict stores them in ALL-CAPS under /Lotus/Language/Missions/MissionName_*)
mt_data = load_json(f'{RESOURCES}/ExportMissionTypes.json')
MISSION_TYPE_PATHS = {}
for mkey, val in mt_data.items():
    if isinstance(val, dict) and 'name' in val:
        path = val['name']
        en_ref = d_en.get(path)
        if en_ref and isinstance(en_ref, str):
            MISSION_TYPE_PATHS[en_ref.strip().lower()] = path
# Extra aliases for known case/word mismatches between dict and locale files
# (dict stores mission names in ALL-CAPS; locale files use Title Case)
MISSION_TYPE_PATHS['extermination'] = '/Lotus/Language/Missions/MissionName_Exterminate'
MISSION_TYPE_PATHS['capture'] = '/Lotus/Language/Missions/MissionName_Capture'
MISSION_TYPE_PATHS['interception'] = '/Lotus/Language/Missions/MissionName_Territory'
MISSION_TYPE_PATHS['excavation'] = '/Lotus/Language/Missions/MissionName_Excavation'
MISSION_TYPE_PATHS['sabotage'] = '/Lotus/Language/Missions/MissionName_Sabotage'
# NOTE: 'Mobile Interception' is NOT in the dict (Descendia-specific variant) -> manual
# NOTE: 'Volatile', 'Unique' Descendia types are not standard mission types -> check below

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

def dict_value(en_val, lo):
    """Try to get a dict translation for en_val in locale lo. Returns (source, value) or None."""
    en_lower = en_val.strip().lower()
    for term, dkey in GAME_TERM_KEYS.items():
        if en_lower == term.lower():
            v = key_lookup.get(dkey, {}).get(lo)
            if v:
                return ('key', v)
    # mission types (case-insensitive)
    mpath = MISSION_TYPE_PATHS.get(en_lower)
    if mpath:
        v = key_lookup.get(mpath, {}).get(lo)
        if v:
            return ('mission', v)
    v = val_lookup.get(en_lower, {}).get(lo)
    if v:
        return ('val', v)
    return None

# Collect all keys
all_keys = set(en_ui.keys())
for lo in LOCALES:
    all_keys.update(locale_files[lo].get('ui', {}).keys())

rows = []
for key in sorted(all_keys):
    en_val = en_ui.get(key)
    if en_val is None or not isinstance(en_val, str):
        continue
    fr_val = fr_ui.get(key, en_val)
    still_en = [lo for lo in LOCALES if locale_files[lo].get('ui', {}).get(key) == en_val]
    if not still_en:
        continue
    # per-locale dict values for still-EN locales
    dict_vals = {}
    for lo in still_en:
        dv = dict_value(en_val, lo)
        if dv and dv[1] != en_val:
            dict_vals[lo] = dv
    rows.append({
        'key': key, 'en': en_val, 'fr': fr_val, 'still_en': still_en,
        'fr_differs': fr_val != en_val,
        'dict_vals': dict_vals,
    })

# Categorize per user priority: dict > manual > universal
dict_res = [r for r in rows if r['dict_vals']]
manual = [r for r in rows if not r['dict_vals'] and r['fr_differs']]
universal = [r for r in rows if not r['dict_vals'] and not r['fr_differs']]

print(f"TOTAL keys still EN somewhere: {len(rows)}")
print(f"  DICT RESOLVABLE (dict has per-locale values): {len(dict_res)}")
print(f"  MANUAL NEEDED (no dict, FR differs): {len(manual)}")
print(f"  UNIVERSAL (no dict, FR==EN: proper nouns/format): {len(universal)} <- leave alone")
print()

out = []
out.append("# Cephalon Kronos — remaining localization work (authoritative, v2)")
out.append("")
out.append(f"Generated from live locale files: **{len(rows)} keys** still contain EN values in at least one of 13 locales (de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh).")
out.append("")
out.append("## Priority rules")
out.append("1. **DE dict is authoritative** for game terms — if `dict.{locale}.json` has a per-locale value, use it (even if the FR locale file keeps EN).")
out.append("2. No dict value + FR differs -> **manual per-locale translation** (FR shown only as semantic reference, NEVER copied).")
out.append("3. No dict + FR keeps EN -> **universal term** (proper noun, format string, abbreviation): EN is the correct value in every locale, leave alone.")
out.append("")
out.append("## Category A: DICT RESOLVABLE (%d)" % len(dict_res))
out.append("Apply dict value per locale. No manual translation needed. `(key)` = resolved by Lotus path, `(val)` = resolved by EN-value match.")
out.append("")
for r in dict_res:
    out.append(f"### {r['key']}")
    out.append(f"- EN: `{r['en']}`  FR: `{r['fr']}`")
    for lo, (src, v) in r['dict_vals'].items():
        out.append(f"  - {lo} ({src}): `{v}`")
    out.append("")
out.append("## Category B: MANUAL TRANSLATION NEEDED (%d)" % len(manual))
out.append("No dict source. Write one native translation per locale. FR is semantic reference only.")
out.append("")
for r in manual:
    out.append(f"### {r['key']}")
    out.append(f"- EN: `{r['en']}`  FR: `{r['fr']}`")
    out.append(f"- still EN in: {', '.join(r['still_en'])}")
    out.append("")
out.append("## Category C: UNIVERSAL — leave as EN (%d)" % len(universal))
out.append("FR keeps EN too and dict has nothing. Correct in all locales.")
out.append("")
out.append("```")
for r in universal:
    out.append(f"{r['key']} = {r['en']!r}  [still EN: {', '.join(r['still_en'])}]")
out.append("```")

text = '\n'.join(out)
with open('TASK_OUTLINE.md', 'w', encoding='utf-8') as f:
    f.write(text)
print(f"Wrote TASK_OUTLINE.md ({len(text)} chars)")
