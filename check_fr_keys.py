#!/usr/bin/env python3
"""
Check FR locale file for the specific remaining entries that need translations.
Also check existing locale files for what's already translated.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

fr = json.load(open('src/lib/i18n/fr.json', encoding='utf-8'))
fr_ui = fr.get('ui', {})

# Check FR values for specific keys
keys_to_check = [
    'ui.elements.heat', 'ui.elements.cold', 'ui.elements.toxin',
    'ui.elements.electricity', 'ui.elements.void',
    'ui.dashboard.deimos', 'ui.dashboard.orb_vallis',
    'ui.dashboard.card_descendia', 'ui.dashboard.archimedea',
    'ui.dashboard.sp_incursions',
    'checklist.task_voca', 'checklist.task_descendia',
    'mastery.cat_necramech', 'mastery.cat_necramechs',
    'mastery.title_tiger', 'mastery.non_mastery',
    'mastery.details', 'mastery.standing',
    'mods.cat_sentinels', 'mods.sort_name',
    'inventory.set', 'filter_necramech', 'cat_necramechs',
    'riven_card.na', 'ui.riven_card.veiled',
    'badge_mod', 'ui.inventory.badge_mod',
    'settings.cursor', 'settings.updates',
    'ui.dashboard.credits', 'ui.dashboard.creds',
    'credits',
    'inventory.fetching_of',
    'ui.dashboard.darvo_deal',
    'dashboard.left', 'dashboard.remaining', 'dashboard.remaining_caps',
    'dashboard.season',
    'relics.tier_meso', 'relics.exp_ducats', 'relics.exp_plat',
    'relics.void_traces',
    'screen.dashboard',
    'toast.more',
    'nav.checklist',
    'mods.cat_stance',
]

print("FR locale file values:")
for key in keys_to_check:
    val = fr_ui.get(key, 'NOT FOUND')
    print(f"  {key}: {val!r}")
