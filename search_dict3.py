#!/usr/bin/env python3
"""
Search for additional dict keys for unresolved terms.
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

EN = load_json(f'{RESOURCES}/dict.en.json')
FR = load_json(f'{RESOURCES}/dict.fr.json')
DE = load_json(f'{RESOURCES}/dict.de.json')
ES = load_json(f'{RESOURCES}/dict.es.json')
IT = load_json(f'{RESOURCES}/dict.it.json')
JA = load_json(f'{RESOURCES}/dict.ja.json')
KO = load_json(f'{RESOURCES}/dict.ko.json')
PL = load_json(f'{RESOURCES}/dict.pl.json')
PT = load_json(f'{RESOURCES}/dict.pt.json')
RU = load_json(f'{RESOURCES}/dict.ru.json')
TC = load_json(f'{RESOURCES}/dict.tc.json')
TH = load_json(f'{RESOURCES}/dict.th.json')
TR = load_json(f'{RESOURCES}/dict.tr.json')
UK = load_json(f'{RESOURCES}/dict.uk.json')
ZH = load_json(f'{RESOURCES}/dict.zh.json')

LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
dicts = {'en': EN, 'fr': FR, 'de': DE, 'es': ES, 'it': IT, 'ja': JA, 'ko': KO, 'pl': PL, 'pt': PT, 'ru': RU, 'tc': TC, 'th': TH, 'tr': TR, 'uk': UK, 'zh': ZH}

# Build reverse lookup: EN upper -> dict key
en_to_dk = {}
for dk, dv in EN.items():
    if isinstance(dv, str) and dv:
        key = dv.upper()
        if key not in en_to_dk:
            en_to_dk[key] = dk

# Remaining terms to search for (from unresolved list)
terms = [
    "Mod", "Albrecht's Notes", "Cephalon Fragments", "Eidolon Caves", "Encrypted Journals",
    "Fortuna Fragments", "Glass Shards", "Leverian Prex Cards", "Lost Islands",
    "Nakak's Keepsakes", "Partnership Fragments", "The Tenets", "Thousand-Year Fish",
    "Vallis Caves", "Drifter Intrinsic", "Railjack Intrinsic", "Sentinel Weapon",
    "Unranked", "Intact", "Radiant", "Unveiled", "Archguns", "Pistols", "Rifles",
    "Shotguns", "Incarnon Rank {level}", "Void Armageddon", "Syndicate Waste",
    "Deep Archimedea", "Temporal Archimedea",
    # Elements
    "Heat", "Cold",
    # Mission types
    "Exterminate", "Defection",
    # Others
    "Steel Path", "Void Storm", "Void Cascade", "Void Flood", "Void Fissure",
    "Manic", "Necramech", "Hologlob", "Vaporizer", "Crucible", "Amphor",
    "Protoframe", "Sister of Parvos", "Lich", "Kuva Lich",
    "Blast", "Corrosive", "Gas", "Magnetic", "Puncture", "Slash", "Toxin",
    "Mastery", "Foundry", "Market", "Inventory", "Starchart",
    "Gruzzling", "Necramite", "Kaithe", "Excavator", "Balloon",
    "Acrithis", "Baro", "Nakak", "Teshin", "Maroo", "Clem", "Bird 3",
    "Infested Boyband", "Vampyric", "Void Cascade", "Void Flood",
    "Void Armageddon", "H-09 Efervon Tank",
    # Relic tiers
    "Lith", "Meso", "Neo", "Axi", "Omnia",
    "Normal Fissure", "Exceptional Void Fissure",
    # Penance names
    "Chemical Warfare", "Bomb Defusal", "Security Spin", "Fire Chain",
    "Freeze and Shoot", "Gigantism", "Glassmaker Cephalites", "Hardshell",
    "Headshots Only", "Horde Weakpoints", "Head Stompers", "Manic Mania",
    "Minefield", "Narmer Phobia", "Spike Ceiling", "Sunlight Penance",
    "Toxic Fire", "Unseen Foes", "Very Toxic", "Fiery Trail",
    "Fiery Trail Rollers", "Blitz Leech", "Frost",  # Frost might be wrong
    "Slip and Slide", "Free", "Frictionless",
    "Sneaky Retreats", "Infested Boyband",
    # Misc
    "Gift", "Platinum", "Credits", "Endo", "Forma",
    "Alliance", "Clan", "Friends", "Ignore", "Recruit",
    "Arbitration", "Sentinel",
    "Liminus", "Vaporizer",
    "Protoframe Room", "Protoframe",
    "Balloon Party", "Basic Loot", "Basic Race",
    "Defend", "Defense", "Infested Salvage",
    "Mobile Interception", "Mobile Defense",
    "Loot", "Loot containers", "Loot storage containers",
    "Race", "Hive", "Shrine Defense",
    "Targeted Elimination", "Race through gates",
    "Defend a target", "Protect Excavators",
    "Cleanse nodes", "Kill", "Deposit",
    "Keep enemies", "Fill a", "Upon",
    "The lights", "The player", "The Fragmented",
    "Upon reaching",
    # Season names
    "Fall", "Spring", "Summer", "Winter",
    "In {weeks} Weeks", "Next Week",
    # Events
    "Birthday", "Sold Out", "SP Essence",
    "Double Affinity", "Double Credits",
    "Daily Deals", "Elite Weekly",
    "CHECKPOINT", "Reset", "Warm",
    "Mastery Rank Up", "Market Sale",
    "Advance", "Syndicate", "Threshold",
    "A-Tier", "B-Tier", "C-Tier", "D-Tier", "F-Tier", "S-Tier",
    "Challenge:", "In Stock", "LEFT", "remaining", "REMAINING",
    "Synced:", "Season", "Owned", "Primary", "Secondary", "Socketed",
    "Melee", "Game Language", "Item names", "Blueprint:", "Build time:", "Crafted:",
    "Credit cost:", "Fetching plat values", "Load More Blueprints", "No items found",
    "None Owned", "Search inventory", "Set", "Last update:", "Go to Settings",
    "Inventory Loading", "No inventory data", "Sync your inventory",
    "Processing your game", "Add configuration", "Add Marker Here", "Adding",
    "Adding markers", "Auto-connect", "Auto-path", "Color & Icon",
    "Map Configuration", "Description", "Config name", "Configuration name",
    "Confirm Delete", "Connections", "Create", "Delete this config",
    "Done", "Game Markers", "Hidden", "Image unavailable",
    "Import in-game markers", "Imported markers from", "Label", "Add Marker",
    "Marker Editor", "Optional notes", "markers", "New Configuration",
    "No configurations yet", "No other markers", "No configurations",
    "Open map configs folder", "Optional description", "Path", "Paths",
    "Reset view", "Synced",
    # About page
    "Open source Warframe companion",
    "Digital Extremes has not explicitly approved",
    "Important Disclaimer", "This app reads", "The app merely reads",
    "Track your inventory", "Use at your own risk",
    "Nemesis History", "No nemeses recorded", "Progenitor Elements",
    "Show vanquished", "No data for", "Changing language",
    # Checklist
    "Quest, Syndicate, and Event", "Auto-sync", "Auto-track",
    "Bi-weekly", "Daily:", "Daily Focus", "left",
    # Misc
    "Reward", "Upgrade", "Normal Fissure", "Steel Path",
    "Void Flood", "Void Storm", "Void Cascade", "Void Armageddon",
    "Defeat the H-09", "Defeat a", "Defeat Oraxia",
    "All enemies", "Enemies are", "Enemies are connected",
    "Enemies are invisible", "Enemies are larger",
    "Enemies are protected", "Enemies are smaller",
    "Enemies emit", "Enemies leave behind",
    "Friction", "Players glow", "Debris",
    "Poison gas", "Stasis Mines", "Void tears",
    "The lights", "Upon reaching",
    "Roathe's Oblivion", "Marie's Sanctuary", "Lyon's Sanctuary",
    "Special protoframe", "Unique mission objective",
    "Destroy floating hologlobes", "Destroy Hologlobes",
    "Destroy Infested Tumors",
    "Race through gates", "Race through gates on a Kaithe",
    "Keep enemies out", "Loot containers", "Loot storage",
    "Kill Gruzzlings", "Kill marked Necramites",
    "Kill loot creatures", "Kill a specific",
    "Some storage containers",
    # Penance titles
    "Sneaky Retreats", "Fiery Trail", "Fiery Trail Rollers",
    "Eximus Cabal", "Fire Chain", "Freeze and Shoot",
    "Gigantism", "Glassmaker Cephalites", "Hardshell",
    "Headshots Only", "Horde Weakpoints", "Horse Combat",
    "Infested Boyband", "Jade Guardian", "Head Stompers",
    "Manic Mania", "Minefield", "Narmer Phobia",
    "The Fragmented Boss", "Chemical Warfare",
    "Powerhouse", "Racing Horse", "Ranged Only",
    "Security Spin", "Sentient Incursion", "Frictionless",
    "Bomb Defusal", "Spike Ceiling",
    "Sunlight Penance", "Toxic Fire", "Unseen Foes",
    "Very Toxic", "Vampyric Liminus",
    "Balloon Party", "Basic Loot",
    "Gruzzling Plunder", "Plunder Roulette",
    "Blitz Leech", "Sol Banished",
    "Defend a target", "Capture the target", "Race",
    "Defense of a Protoframe", "Protoframe Room",
    "Mobile Interception", "Loot",
    "Targeted Elimination", "Hive", "Shrine Defense",
    "Race through gates",
    # Elements
    "Heat", "Cold", "Electricity", "Toxin", "Blast", "Corrosive",
    "Magnetic", "Gas", "Puncture", "Slash", "Void",
]

for term in terms:
    dk = en_to_dk.get(term.upper())
    if dk:
        vals = [dicts[lo].get(dk, '') for lo in ['en','fr'] + LOCALES]
        if any(v and v != term for v in vals):
            print(f"{term} -> {dk}")
            for lo in ['en','fr'] + LOCALES:
                print(f"  {lo}: {dicts[lo].get(dk, '')}")
            print()
    else:
        print(f"{term}: NOT IN DICT")
