#!/usr/bin/env python3
"""
FIND ALL FRENCH LEAKS: values in non-FR locale files that are French text.
Detects by: value appears in fr.json for the same key, and differs from both
EN and the locale's own language. Also detects known French words in values.
"""
import json, os, re
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

en_ui = load_json('src/lib/i18n/en.json')['ui']
fr_ui = load_json('src/lib/i18n/fr.json')['ui']
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# Known French words/phrases (detect leaks even when fr.json isn't the source)
FR_WORDS = [
    'le ', 'la ', 'les ', 'des ', 'du ', 'de ', 'une ', 'un ', 'et ', 'ou ', 'en ',
    'à ', 'au ', 'aux ', 'pour ', 'avec ', 'sur ', 'dans ', 'par ', 'pas ', 'plus ',
    'mission', 'objectif', 'récompense', 'défense', 'extermination', 'interception',
    'sabotage', 'survie', 'capture', 'excavation', 'élimination', 'ciblée',
    'détruisez', 'récupérez', 'butin', 'limite', 'temps', 'conteneurs', 'unique',
    'vampyrique', 'temporelle', 'incursions', 'module', 'crédits', 'platine',
    'curseur', 'détails', 'ensemble', 'hiver', 'chaud', 'mises à jour', 'version',
    'visible', 'missions', 'sources', 'optimal', 'standard', 'normal', 'volatile',
    'toxine', 'explosif', 'corrosif', 'magnétique', 'perforation', 'tranchant',
    'gaz', 'feu', 'glace', 'électrique', 'virale', 'radiation', 'impact',
    'nécramécanique', 'nécramechs', 'nécralisque', 'déimos', 'archimédée',
    'descendia', 'loid', 'voca', 'liminus', 'récolte', 'contient', 'renferme',
    'cimetière', 'ostron', 'solaris', 'syndicat', 'rang', 'maîtrise', 'défaite',
    'guerre', 'gloire', 'niveau', 'équipement', 'inventaire', 'défense',
    'attaque', 'vitesse', 'chance', 'dégâts', 'dégât', 'armure', 'bouclier',
    'énergie', 'santé', 'vie', 'immunité', 'résistance', 'protection',
]

# For each key, for each locale: check if value looks French
print("=== FR leaks per key ===")
leaks = []
for key in sorted(en_ui):
    en_val = en_ui[key]
    if not isinstance(en_val, str):
        continue
    fr_val = fr_ui.get(key, en_val)
    for lo in LOCALES:
        val = locale_files[lo]['ui'].get(key)
        if not isinstance(val, str) or val == en_val:
            continue
        # A value is a FR leak if:
        # 1. It equals the fr.json value for this key, OR
        # 2. It contains 2+ French words and is NOT the fr.json value (fr.json may itself be wrong)
        # EXCEPT correct native words that coincidentally equal French text:
        # German "Rang"/"Saison", Spanish/Portuguese "de", N/D abbreviation,
        # Polish "Gaz"/"Pistolet", Spanish/Italian weekday abbreviations.
        CORRECT_AS_NATIVE = {
            ('dashboard.season', 'de'), ('inventory.fetching_of', 'es'), ('inventory.fetching_of', 'pt'),
            ('mods.sort_rank', 'de'), ('ui.comp.rank', 'de'), ('ui.dashboard.rank', 'de'),
            ('ui.inventory.sort_rank', 'de'),
            ('riven_card.na', 'es'), ('riven_card.na', 'it'), ('riven_card.na', 'pl'), ('riven_card.na', 'pt'),
            ('ui.dashboard.weekday_short_fri', 'it'), ('ui.dashboard.weekday_short_mon', 'es'),
            ('ui.dashboard.weekday_short_mon', 'it'), ('ui.dashboard.weekday_short_tue', 'es'),
            ('ui.dashboard.weekday_short_tue', 'it'), ('ui.dashboard.weekday_short_wed', 'it'),
            ('ui.elements.gas', 'pl'), ('ui.elements.gas', 'tr'), ('ui.inventory.filter_pistol', 'pl'),
        }
        is_fr_source = (val == fr_val and val != en_val and (key, lo) not in CORRECT_AS_NATIVE)
        fr_word_hits = [w for w in FR_WORDS if w in val.lower()]
        if is_fr_source or len(fr_word_hits) >= 2:
            leaks.append((key, lo, en_val, val, fr_val, is_fr_source, fr_word_hits[:4]))

# Dedupe & group by key
from collections import defaultdict
by_key = defaultdict(list)
for key, lo, en_val, val, fr_val, is_src, hits in leaks:
    by_key[key].append((lo, val, fr_val, is_src, hits))

print(f"Total FR-leak occurrences: {len(leaks)} across {len(by_key)} keys\n")
for key, entries in sorted(by_key.items()):
    en_val = en_ui[key]
    print(f"### {key}: EN={en_val!r}")
    for lo, val, fr_val, is_src, hits in entries:
        src = "=fr.json" if is_src else "FR-words"
        print(f"  {lo}: {val!r} [{src}] {hits}")
