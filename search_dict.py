#!/usr/bin/env python3
"""Search dict files for game terms."""
import json, os

os.chdir('/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai')

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

EN = load_json('dict.en.json')
FR = load_json('dict.fr.json')
DE = load_json('dict.de.json')

# Search for element names
terms = ['Cold', 'Heat', 'Electricity', 'Toxin', 'Blast', 'Corrosive', 'Magnetic', 
         'Gas', 'Radiation', 'Viral', 'Puncture', 'Slash', 'Impact', 'Void',
         'Syndicate', 'Infested', 'Grineer', 'Corpus', 'Sentient', 'Tenno',
         'Necramech', 'Archwing', 'Archgun', 'Mod', 'Riven', 'Relic', 'Prime',
         'Mastery', 'Foundry', 'Market', 'Inventory', 'Checklist', 'News',
         'Lith', 'Meso', 'Neo', 'Axi', 'Omnia', 'Radiant', 'Intact',
         'Exterminate', 'Sabotage', 'Rescue', 'Spy', 'Defection',
         'Incarnon', 'Forma', 'Endo', 'Credits', 'Platinum', 'Kuva',
         'Void Fissure', 'Void Storm', 'Void Cascade', 'Void Flood', 'Void Armageddon',
         'Manic', 'Liminus', 'Amphor', 'Gruzzling', 'Necramite', 'Hologlob',
         'Vaporizer', 'Crucible', 'Excavator', 'Mimic', 'Kaithe', 'Roathe',
         'Acrithis', 'Baro', 'Nakak', 'Teshin', 'Maroo', 'Clem', 'Bird 3',
         'Isleweaver', 'Lyon', 'Marie', 'Oraxia', 'Albrecht', 'Necralisk',
         'Descendia', 'Duviri', 'Steel Path', 'Void Tear', 'Nullifier',
         'Shield', 'C Shield', 'S Shield', 'B Shield',
         'Balloon', 'Scaldra', 'Techrot', 'Felarx', 'Arca Plasmor']

for term in terms:
    found_en = []
    for dk, dv in EN.items():
        if isinstance(dv, str) and dv == term:
            found_en.append(dk)
    if found_en:
        dk = found_en[0]
        print(f"\n{term} -> {dk}")
        for lo in ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']:
            d = load_json(f'dict.{lo}.json')
            val = d.get(dk, '[NOT FOUND]')
            print(f"  {lo}: {val}")
    else:
        print(f"\n{term} -> NOT FOUND in EN dict")
