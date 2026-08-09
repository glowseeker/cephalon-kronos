#!/usr/bin/env python3
"""
CLASSIFY the 203 remaining keys into Path A (game-sourced, gameKey ref) vs Path B (UI-authored, translate).
Builds a mapping of locale key -> Lotus dict path where one exists in ALL 14 dict files.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

d_en = load_json(f'{RESOURCES}/dict.en.json')
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}

# Known Lotus paths for game terms (verified to exist in dict files)
GAME_KEY_MAP = {
    # Locations
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
    'Cambion Drift': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosLandscapeName',
    'Void': '/Lotus/Language/Locations/Void',
    'Cetus': '/Lotus/Language/Locations/CetusHub',
    'Fortuna': '/Lotus/Language/Locations/SolarisUnitedHub',
    'Duviri': '/Lotus/Language/Locations/Duviri',
    'Zariman': '/Lotus/Language/Zariman/ZarimanRegionName',
    'Cavia': '/Lotus/Language/EntratiLab/EntratiGeneral/EntratiLabSyndicateName',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    # Relic eras
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Requiem': '/Lotus/Language/Relics/Era_REQUIEM',
    'Omnia': '/Lotus/Language/Relics/Era_OMNI',
    # Mastery ranks
    'Novice': '/Lotus/Language/Challenges/Challenge_PlayerRank4_Name',
    'Disciple': '/Lotus/Language/Challenges/Challenge_PlayerRank7_Name',
    'Tiger': '/Lotus/Language/Challenges/Challenge_PlayerRank19_Name',
    'Dragon': '/Lotus/Language/Challenges/Challenge_PlayerRank22_Name',
    'Sage': '/Lotus/Language/Challenges/Challenge_PlayerRank25_Name',
    # Items / currencies
    'Endo': '/Lotus/Language/Items/FusionBundle',
    'Forma': '/Lotus/Language/Items/Forma',
    'Sniper': '/Lotus/Language/Items/SniperCategoryName',
    'Amp': '/Lotus/Language/Items/OperatorVoidBeam',
    'Railjack': '/Lotus/Language/CrewShip/Hull_RailJack',
    'K-Drive': '/Lotus/Language/Game/CrpHoverboardName',
    'K-Drives': '/Lotus/Language/Game/CrpHoverboardName',
    'Parazon': '/Lotus/Language/Emotes/ParazonEmoteName',
    'Frame Fighter': '/Lotus/Language/Menu/FighterTitle',
    'Baro Ki\'Teer': '/Lotus/Language/G1Quests/VoidTraderName',
    'Loid': '/Lotus/Language/Bosses/Loid',
    'Nightwave': '/Lotus/Language/Syndicates/RadioLegionTitle',
    'Nexus 1999': None,  # check below
    'Hex': None,  # check below
    'Umbra': '/Lotus/Language/Sacrifice/UmbraAvatarName',
    'Electricity': '/Lotus/Language/Dojo/ElectricityName',
}

# Mission types via ExportMissionTypes
mt = load_json(f'{RESOURCES}/ExportMissionTypes.json')
MISSION_KEYS = {}
for mkey, val in mt.items():
    if isinstance(val, dict) and 'name' in val:
        path = val['name']
        en_ref = d_en.get(path)
        if en_ref and isinstance(en_ref, str):
            MISSION_KEYS[en_ref.strip().lower()] = path

# manual mission aliases (dict uses ALL-CAPS, locale uses Title Case)
MISSION_KEYS['extermination'] = '/Lotus/Language/Missions/MissionName_Exterminate'
MISSION_KEYS['capture'] = '/Lotus/Language/Missions/MissionName_Capture'
MISSION_KEYS['interception'] = '/Lotus/Language/Missions/MissionName_Territory'
MISSION_KEYS['excavation'] = '/Lotus/Language/Missions/MissionName_Excavation'
MISSION_KEYS['sabotage'] = '/Lotus/Language/Missions/MissionName_Sabotage'
MISSION_KEYS['mobile defense'] = '/Lotus/Language/Missions/MissionName_MobileDefense'
MISSION_KEYS['spy'] = '/Lotus/Language/Missions/MissionName_Spy'
MISSION_KEYS['disruption'] = '/Lotus/Language/Missions/MissionName_Artifact'
MISSION_KEYS['assassination'] = '/Lotus/Language/Missions/MissionName_Assassination'
MISSION_KEYS['survival'] = '/Lotus/Language/Missions/MissionName_Survival'
MISSION_KEYS['defense'] = '/Lotus/Language/Missions/MissionName_Defense'
MISSION_KEYS['rescue'] = '/Lotus/Language/Missions/MissionName_Rescue'
MISSION_KEYS['hijack'] = '/Lotus/Language/Missions/MissionName_Retrieval'
MISSION_KEYS['alchemy'] = '/Lotus/Language/Missions/MissionName_Alchemy'
MISSION_KEYS['void flood'] = '/Lotus/Language/Missions/MissionName_Corruption'
MISSION_KEYS['void cascade'] = '/Lotus/Language/Missions/MissionName_VoidCascade'
MISSION_KEYS['void armageddon'] = '/Lotus/Language/Missions/MissionName_Armageddon'
MISSION_KEYS['assault'] = '/Lotus/Language/Missions/MissionName_Assault'
MISSION_KEYS['pursuit'] = '/Lotus/Language/Missions/MissionName_Pursuit'
MISSION_KEYS['the circuit'] = '/Lotus/Language/Missions/MissionName_EndlessDuviri'
MISSION_KEYS['infested salvage'] = '/Lotus/Language/Missions/MissionName_Purify'
MISSION_KEYS['the descendia'] = '/Lotus/Language/Missions/MissionName_Descent'

def path_exists_in_all(path):
    if not path: return False
    for lo in LOCALES:
        if path not in dicts[lo]:
            return False
    return path in d_en

def resolve_game_key(en_val):
    """Return Lotus path for en_val if it exists in all dicts, else None."""
    v = en_val.strip()
    # direct map
    p = GAME_KEY_MAP.get(v)
    if p and path_exists_in_all(p):
        return p
    # mission types (case-insensitive)
    p = MISSION_KEYS.get(v.lower())
    if p and path_exists_in_all(p):
        return p
    return None

# Collect the 203 remaining keys
en_ui = load_json('src/lib/i18n/en.json')['ui']
fr_ui = load_json('src/lib/i18n/fr.json')['ui']
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

all_keys = set(en_ui.keys())
for lo in LOCALES:
    all_keys.update(locale_files[lo].get('ui', {}).keys())

rows = []
for key in sorted(all_keys):
    en_val = en_ui.get(key)
    if en_val is None or not isinstance(en_val, str):
        continue
    still_en = [lo for lo in LOCALES if locale_files[lo].get('ui', {}).get(key) == en_val]
    if not still_en:
        continue
    rows.append({'key': key, 'en': en_val, 'fr': fr_ui.get(key, en_val), 'still_en': still_en})

# Classify
path_a = []   # gameKey ref available
path_b = []   # UI-authored, needs translation
for r in rows:
    gk = resolve_game_key(r['en'])
    if gk:
        r['gameKey'] = gk
        path_a.append(r)
    else:
        path_b.append(r)

print(f"TOTAL remaining: {len(rows)}")
print(f"  Path A (gameKey ref): {len(path_a)}")
print(f"  Path B (translate): {len(path_b)}")

print("\n=== PATH A: gameKey refs ===")
for r in path_a:
    print(f"  {r['key']}: EN={r['en']!r} -> {r['gameKey']}")

print("\n=== PATH B: need translation ===")
for r in path_b:
    print(f"  {r['key']}: EN={r['en']!r} FR={r['fr']!r} still_EN={r['still_en']}")

# Save classification for later steps
with open('/tmp/kronos_classification.json', 'w', encoding='utf-8') as f:
    json.dump({'path_a': path_a, 'path_b': path_b}, f, ensure_ascii=False, indent=1)
print("\nSaved /tmp/kronos_classification.json")
