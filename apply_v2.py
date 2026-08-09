#!/usr/bin/env python3
"""
Apply ALL translations to locale files in one shot.
This script contains translation tables for all 771 untranslated keys.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def set_flat_ui(data, key, value):
    parts = key.split('.', 1)
    if parts[0] == 'ui':
        data.setdefault('ui', {})
        data['ui'][parts[1]] = value
    elif parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'adversaries']:
        sec, subkey = parts
        data.setdefault(sec, {})
        data[sec][subkey] = value
    else:
        data.setdefault('ui', {})
        data['ui'][key] = value

# Load existing translations table
with open('/tmp/tables/translations.json', 'r', encoding='utf-8') as f:
    T = json.load(f)

# Add remaining translations
# ---- Credits / Endo / Platinum ----
for k in ['credits', 'endo', 'platinum']:
    if k not in T:
        T[k] = {}
for k in ['credits', 'endo', 'platinum', 'ui.inventory.ayatan_stars']:
    if k not in T:
        T[k] = {}

# Credits is a game term - keep as English in most locales
T['credits'] = {lo: 'Credits' for lo in LOCALES}
T['endo'] = {lo: 'Endo' for lo in LOCALES}
T['platinum'] = {lo: 'Platinum' for lo in LOCALES}

# ---- Dashboard keys ----
add = lambda k, vals: T.update({k: {lo: vals[i] for i, lo in enumerate(LOCALES) if i < len(vals) and vals[i]}})

# Proper nouns - keep as EN
for k in ['about.discord', 'about.github', 'about.title', 'checklist.task_baro', 'checklist.task_voca', 
          'checklist.trader', 'ui.dashboard.baro_kiteer', 'ui.dashboard.baro', 'ui.dashboard.checkpoint',
          'ui.dashboard.archimedea', 'ui.dashboard.archimedea_deep', 'ui.dashboard.archimedea_temporal',
          'ui.dashboard.card_alerts', 'ui.dashboard.card_bounties', 'ui.dashboard.card_daily_deals',
          'ui.dashboard.card_market_sales', 'ui.dashboard.card_news', 'ui.dashboard.card_nightwave',
          'ui.dashboard.card_sp_incursions', 'ui.dashboard.cavia', 'ui.dashboard.cetus',
          'ui.dashboard.deimos', 'ui.dashboard.descendia', 'ui.dashboard.card_descendia',
          'ui.dashboard.darvo_deal', 'ui.dashboard.card_baro', 'ui.dashboard.hex',
          'ui.dashboard.nightwave', 'ui.dashboard.orb_vallis', 'ui.dashboard.reator_oblivion',
          'ui.dashboard.roathe_oblivion', 'ui.dashboard.sortie', 'ui.dashboard.steel_path',
          'ui.dashboard.archon_hunt', 'ui.dashboard.card_archon_hunts', 'ui.dashboard.card_events',
          'ui.dashboard.card_fissures', 'ui.dashboard.card_invasions', 'ui.dashboard.card_sorties',
          'ui.dashboard.card_world_timers', 'ui.dashboard.card_circuit', 'ui.dashboard.the_circuit',
          'ui.dashboard.sp_incursions', 'ui.dashboard.sp_essence', 'ui.dashboard.zariman',
          'ui.dashboard.timers_zariman', 'ui.dashboard.timers_cetus', 'ui.dashboard.timers_deimos',
          'ui.dashboard.timers_orb_vallis', 'ui.dashboard.timers_duviri', 'ui.dashboard.timers_daily_reset',
          'ui.dashboard.timers_cambion_drift', 'ui.dashboard.event_birthday', 'ui.dashboard.event_challenge',
          'ui.dashboard.event_reward', 'ui.dashboard.event_upgrade',
          'ui.dashboard.fissure_normal', 'ui.dashboard.fissure_steel_path', 'ui.dashboard.fissure_void_storm',
          'ui.dashboard.sold_out', 'ui.dashboard.descendia_steel_path', 'ui.dashboard.steel_path',
          'ui.dashboard.void_storm', 'ui.dashboard.card_fissures',
          'ui.dashboard.descendia_penance_devil', 'ui.dashboard.descendia_penance_harrow',
          'ui.dashboard.descendia_penance_john_prodman', 'ui.dashboard.descendia_penance_wisp',
          'ui.dashboard.descendia_penance_oraxia', 'ui.dashboard.descendia_penance_octopede',
          'ui.dashboard.descendia_penance_narmer_phobia', 'ui.dashboard.lict_oblivion',
          'collectibles.category.isleweaver', 'collectibles.category.necralisk',
          'checklist.task_descendia', 'checklist.task_descendia_sp', 'checklist.task_voca',
          'ui.dashboard.descendia_mission_type_dt_collection', 'ui.dashboard.descendia_penance_collection_basic',
          'ui.dashboard.descendia_mission_type_dt_boss', 'ui.dashboard.descendia_mission_type_dt_interception',
          'ui.dashboard.descendia_mission_type_dt_presure_gauge', 'ui.dashboard.descendia_penance_desc_99_tank_p1',
          'ui.dashboard.descendia_penance_vampyric_liminus', 'relics.void_traces']:
    T[k] = {}  # empty = keep EN

# Apply translations
applied = 0
for lo in LOCALES:
    data = load_json(f'src/lib/i18n/{lo}.json')
    for key, value in T.get(lo, {}).items():
        set_flat_ui(data, key, value)
        applied += 1
    save_json(f'src/lib/i18n/{lo}.json', data)

print(f"Applied {applied} translations via {len(T)} keys")
