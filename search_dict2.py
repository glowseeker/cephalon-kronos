#!/usr/bin/env python3
"""
Search dict more thoroughly for specific game terms.
Many terms appear in the dict under specific Lot path keys,
but the EN value might be in mixed case while the dict has uppercase.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

EN = load_json(f'{RESOURCES}/dict.en.json')
FR = load_json(f'{RESOURCES}/dict.fr.json')
DE = load_json(f'{RESOURCES}/dict.de.json')

# Search terms
search = [
    "Necralisk", "Necramech", "Sentinel", "Archgun", "Archguns", "Starchart",
    "Foundry", "Market", "Inventory", "Checklist", "News", "Syndicate",
    "Infested", "Exterminate", "Defection", "Incarnon", "Forma", "Endo",
    "Credits", "Platinum", "Kuva", "Steel Path", "Void Storm", "Void Cascade",
    "Void Flood", "Void Armageddon", "Void Fissure", "Void Tear", "Relic",
    "Mastery", "Manic", "Liminus", "Amphor", "Hologlob", "Vaporizer",
    "Crucible", "Excavator", "Mimic", "Kaithe", "Gruzzling", "Necramite",
    "Balloon", "Scaldra", "Techrot", "H-09 Efervon Tank", "Arbitration",
    "Protoframe", "Naramo", "Clem", "Acrithis", "Baro", "Teshin", "Maroo",
    "Lyon", "Marie", "Oraxia", "Albrecht", "Descendia", "Duviri", "Isleweaver",
    "Grineer", "Corpus", "Tenno", "Ostron", "Solaris", "Entrati",
    "Blast", "Corrosive", "Gas", "Magnetic", "Puncture", "Slash", "Toxin",
    "Electricity", "Heat", "Cold", "Radiation", "Viral", "Impact",
]

for term in search:
    # Search in EN dict (exact match)
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv == term:
            print(f"\n=== {term} (exact) -> {dk} ===")
            for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
                d = load_json(f'{RESOURCES}/dict.{lo}.json')
                val = d.get(dk, '')
                if val:
                    print(f"  {lo}: {val}", end='')
            print()
            break
