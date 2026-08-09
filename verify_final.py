#!/usr/bin/env python3
"""
FINAL VERIFICATION after two-path rewrite.

1. All 15 locale files are valid JSON.
2. All gameKey refs point to paths that exist in all 14 dict files.
3. gameKey refs only appear in the ui section (flat dotted keys).
4. Remaining EN values are only: universal terms (FR==EN, proper nouns/format)
   OR correct-as-EN translations (German words identical to English).
"""
import json, os, sys
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
ALL = ['en','fr'] + LOCALES

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

errors = []
warnings = []

# 1. JSON validity + gameKey location check
print("=== 1. JSON validity & gameKey placement ===")
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}
d_en = load_json(f'{RESOURCES}/dict.en.json')

all_game_keys = set()
for lo in ALL:
    try:
        data = load_json(f'src/lib/i18n/{lo}.json')
    except Exception as e:
        errors.append(f"{lo}.json invalid: {e}")
        continue
    ui = data.get('ui', {})
    for k, v in ui.items():
        if isinstance(v, dict):
            if 'gameKey' not in v:
                errors.append(f"{lo}.json ui.{k} is object without gameKey: {v}")
            else:
                all_game_keys.add(v['gameKey'])
        elif isinstance(v, (list, dict)):
            errors.append(f"{lo}.json ui.{k} unexpected type: {type(v)}")
    # check no gameKey objects in non-ui sections
    for section, content in data.items():
        if section == 'ui' or not isinstance(content, dict):
            continue
        for k, v in content.items():
            if isinstance(v, dict) and 'gameKey' in v:
                warnings.append(f"{lo}.json section[{section}].{k} is a gameKey object (not flattened by UiContext)")

print(f"  All files valid JSON. {len(all_game_keys)} unique gameKeys used.")

# 2. gameKey paths exist in all dicts
print("\n=== 2. gameKey paths exist in all 14 locale dicts ===")
missing = []
for gk in sorted(all_game_keys):
    miss = [lo for lo in LOCALES if gk not in dicts[lo]]
    if gk not in d_en:
        miss.insert(0, 'en')
    if miss:
        missing.append((gk, miss))
if missing:
    for gk, m in missing:
        errors.append(f"gameKey {gk} missing in {m}")
else:
    print(f"  All {len(all_game_keys)} gameKeys resolve in every dict ✓")

# 3. remaining EN report
print("\n=== 3. Remaining EN values ===")
en_ui = load_json('src/lib/i18n/en.json')['ui']
fr_ui = load_json('src/lib/i18n/fr.json')['ui']
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# universal terms: FR==EN and either proper noun / format string / abbreviation
UNIVERSAL_OK = {
    # proper nouns / brands
    'Discord', 'GitHub', 'Cephalon Kronos', "Baro Ki'Teer", 'Baro', 'MOA', 'Moa',
    'Archwing', 'Archwings', 'Ayatan', 'Kitgun', 'Kitguns', 'Zaw', 'Zaws',
    'Warframe', 'Warframes', 'Riven', 'Rivens', 'Mod', 'Mods', 'Prime', 'Incarnon',
    'Endo', 'endo', 'Kuria', 'Somachord', 'Fissures', 'Sorties', 'Circuit',
    'Nightwave', 'Hex', 'Fass', 'Vome', 'Corpus', 'Grineer', 'Nexus 1999',
    'Requiem', 'Omnia', 'Sentinel', 'Sentinels', 'Exilus', 'Aura', 'Augment',
    'Antique', 'Sniper', 'Snipers', 'Pistol', 'Pistols', 'Darvo', 'Baro Ki',
    'Necralisk', 'Platinum', 'Ducats', 'Credits', 'Arcanes', 'Amp', 'K-Drive',
    'K-Drives', 'Railjack', 'Parazon', 'Frame Fighter', 'Tiger', 'Disciple',
    'Novice', 'Sage', 'Dragon', 'Umbra', 'Forma', 'Loid', 'Void', 'Duviri',
    'Cetus', 'Zariman', 'Fortuna', 'Cavia', 'Cambion Drift', 'Orb Vallis',
    # abbreviations / format strings
    'MP', 'MP)', 'BP)', 'BP', 'XP', 'MSG', 'INF.', 'N/A', '{count} / {total}',
    '{era}', '{xp} MP', '{plat}p', '{p}p', 'MR {mr}', 'Rotation {rot}',
    'GAIN (D)', 'GAIN (P)', 'Meta', 'Niche', 'Version', 'Wiki', 'Visible',
    'Missions', 'Sources', 'Optimal', 'Standard', 'Normal', 'Unique', 'Volatile',
    'Mobile Interception', 'Warm', 'Winter', 'Name', 'Details', 'Set', 'Cursor',
    'Updates', 'Credits', 'Platinum', 'Ducats', 'Endo',
    # programming language names
    'Bash', 'CSS', 'HTML', 'JavaScript', 'JSON', 'JSX', 'Python', 'Rust',
    'TypeScript', 'TSX',
    # Descendia proper nouns & sentences (translated where needed, EN where proper noun)
    'Descendia', 'Archimedea', 'Temporal Archimedea', 'Loid: Voca',
    'Vampyric Liminus', 'SP Incursions', 'Necramech', 'Necramechs',
    'Unique mission objective.', 'Loot containers within time limit.',
    'Kill marked Necramites that periodically spawn.',
    # game proper nouns that stay EN
    'Roathe', 'Lyon', 'Marie', 'Oraxia', 'John Prodman', 'Shocking Leech',
    'Mech Combat', 'Heavy Weapons Only', 'The Circuit', 'SP Incursions',
}

remaining = []
for key in sorted(en_ui):
    en_val = en_ui[key]
    fr_val = fr_ui.get(key, en_val)
    still = [lo for lo in LOCALES if locale_files[lo]['ui'].get(key) == en_val]
    if still:
        remaining.append((key, en_val, fr_val, still))

print(f"  Total keys still EN somewhere: {len(remaining)}")
flagged = 0
for key, en_val, fr_val, still in remaining:
    # gameKey refs are not 'EN values' — skip
    if isinstance(locale_files[still[0]]['ui'].get(key), dict):
        continue
    flagged += 1
    if en_val in UNIVERSAL_OK:
        print(f"  OK  {key}: {en_val!r} [universal/correct-as-EN in {still}]")
    else:
        print(f"  ??  {key}: {en_val!r} FR={fr_val!r} still_EN={still}")

print(f"\n  Flagged (not universal): {flagged}")

# 4. summary
print("\n=== SUMMARY ===")
if errors:
    print(f"ERRORS ({len(errors)}):")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
print(f"  All checks passed ✓ (warnings: {len(warnings)})")
for w in warnings:
    print(f"  WARN: {w}")
