#!/usr/bin/env python3
"""
Map mission types from ExportMissionTypes.json to their dict translations.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

mt = load_json(f'{RESOURCES}/ExportMissionTypes.json')
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en']}
d_en = dicts['en']

# Get all mission type Lotus paths
paths = {}
for key, val in mt.items():
    if isinstance(val, dict) and 'name' in val:
        paths[key] = val['name']

print(f"Total mission types: {len(paths)}")

# Which mission types do we actually need? Check our locale keys
# mtype_* and descendia_mission_type_*
import glob
need_paths = {}
for lo in ['en']:
    pass

# Check dict translations for these paths
for mkey, path in sorted(paths.items()):
    en_val = d_en.get(path, '?')
    trans = {}
    for lo in LOCALES:
        v = dicts[lo].get(path)
        if v and v != en_val:
            trans[lo] = v
    if trans or mkey in ['MT_EXTERMINATION','MT_CAPTURE','MT_INTERCEPTION','MT_SABOTAGE','MT_EXCAVATE','MT_MOBILE_DEFENSE','MT_UNIQUE']:
        print(f"\n{mkey}: {path}")
        print(f"  EN: {en_val!r}")
        for lo, v in sorted(trans.items()):
            print(f"  {lo}: {v!r}")
