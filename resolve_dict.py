#!/usr/bin/env python3
"""
Resolve game-sourced terms from DE dict files and build complete translations.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']
RESDIR = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict files
D = {}
for lo in LOCALES + ['en', 'fr']:
    D[lo] = load_json(f'{RESDIR}/dict.{lo}.json')

# Load Export files for resolution
missions = load_json(f'{RESDIR}/ExportMissionTypes.json')
upgrades = load_json(f'{RESDIR}/ExportWarframes.json')  # check
syn = load_json(f'{RESDIR}/ExportSyndicates.json')

# Build mission type dict: EN name -> {locale: translation}
# Mission types use keys like /Lotus/Language/Missions/MissionName_Assassination
MISSION_KEYS = {
    # ui.notif_mgr mission types
    'Assassination': 'MT_ASSASSINATION',
    'Extermination': 'MT_EXTERMINATION',
    'Survival': 'MT_SURVIVAL',
    'Rescue': 'MT_RESCUE',
    'Sabotage': 'MT_SABOTAGE',
    'Spy': 'MT_SPY',
    'Capture': 'MT_CAPTURE',
    'Defense': 'MT_DEFENSE',
    'Excavation': 'MT_EXCAVATION',
    'Interception': 'MT_INTERCEPTION',
    'Mobile Interception': 'MT_INTERCEPTION_MOBILE',
    'Void Flood': 'MT_VOID_FLOOD',
    'Void Cascade': 'MT_VOID_CASCADE',
    'Void Armageddon': 'MT_VOID_ARMAGEDDON',
    'Disruption': 'MT_DISRUPTION',
}

# Build mission translations
mission_translations = {}
for en_name, mt_key in MISSION_KEYS.items():
    entry = missions.get(mt_key, {})
    dict_key = entry.get('name', '')
    mission_translations[en_name] = {}
    for lo in LOCALES:
        mission_translations[en_name][lo] = D[lo].get(dict_key, en_name)

# Save
os.makedirs('/tmp/tables', exist_ok=True)
with open('/tmp/tables/mission_translations.json', 'w', encoding='utf-8') as f:
    json.dump(mission_translations, f, ensure_ascii=False, indent=2)

print(f"Mission translations saved: {len(mission_translations)} entries")
for en_name, trans in list(mission_translations.items())[:5]:
    print(f"  {en_name}:")
    for lo in LOCALES:
        print(f"    {lo}: {trans[lo]}")
