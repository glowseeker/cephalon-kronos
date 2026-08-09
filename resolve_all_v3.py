#!/usr/bin/env python3
"""
Comprehensive translation resolver - NO FR-as-FALLBACK.
1. Resolve game terms from dict files for each locale independently
2. Use FR locale file as REFERENCE to understand what translations should be
3. For terms not in dict files, use the FR locale file's translation as GUIDE
   and provide proper per-locale translations

For each key/value:
- If value is a game proper noun (Rivens, Warframe, etc.) → keep EN for all locales
- If dict file has translation → use it
- If FR locale file has translation → use it as reference to create per-locale translations
- Otherwise → keep EN
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load locale files
def load_locale(lo):
    path = f'src/lib/i18n/{lo}.json'
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict files for all locales
dicts = {}
for lo in LOCALES + ['en', 'fr']:
    try:
        dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')
    except FileNotFoundError:
        print(f"WARNING: dict.{lo}.json not found!")
        dicts[lo] = {}

d_en = dicts.get('en', {})
d_fr = dicts.get('fr', {})

# Load locale files
locales_data = {}
for lo in LOCALES + ['fr']:
    try:
        locales_data[lo] = load_locale(lo)
    except FileNotFoundError:
        print(f"WARNING: {lo}.json not found!")
        locales_data[lo] = {}

# Build EN -> {locale: value} lookup from dict files by VALUE matching (case-insensitive)
# This handles entries like "Alchemy" that match by EN value
def build_val_lookup():
    """Build lookup: lowercased EN value -> {locale: translation}"""
    lookup = {}
    for lo in LOCALES + ['fr']:
        d = dicts.get(lo, {})
        for key, val in d.items():
            if not val or not val.strip():
                continue
            en_val = d_en.get(key, val)
            if not en_val or not en_val.strip():
                continue
            en_key = en_val.lower().strip()
            if en_key == val.lower().strip():
                continue  # Same in EN, skip
            if en_key not in lookup:
                lookup[en_key] = {}
            if lo not in lookup[en_key]:
                lookup[en_key][lo] = val
    return lookup

val_lookup = build_val_lookup()

# Also build key-based lookup: exact Lot path -> {locale: value}
def build_key_lookup():
    """Build lookup: Lot path key -> {locale: value}"""
    lookup = {}
    for lo in LOCALES + ['fr']:
        d = dicts.get(lo, {})
        for key, val in d.items():
            if key not in lookup:
                lookup[key] = {}
            lookup[key][lo] = val
    return lookup

key_lookup = build_key_lookup()

# Known Lot path keys for game terms
GAME_TERM_KEYS = {
    'Heat': '/Lotus/Language/Elements/HeatName',
    'Cold': '/Lotus/Language/Elements/ColdName',
    'Toxin': '/Lotus/Language/Elements/ToxinName',
    'Electricity': '/Lotus/Language/Elements/ElectricityName',
    'Gas': '/Lotus/Language/Elements/GasName',
    'Magnetic': '/Lotus/Language/Elements/MagneticName',
    'Radiation': '/Lotus/Language/Elements/RadiationName',
    'Viral': '/Lotus/Language/Elements/ViralName',
    'Corrosive': '/Lotus/Language/Elements/CorrosiveName',
    'Blast': '/Lotus/Language/Elements/BlastName',
    'Impact': '/Lotus/Language/Elements/ImpactName',
    'Puncture': '/Lotus/Language/Elements/PunctureName',
    'Slash': '/Lotus/Language/Elements/SlashName',
    'Void': '/Lotus/Language/Elements/VoidName',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Void': '/Lotus/Language/Locations/Void',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/NecraliskName',
    'Sentinel': '/Lotus/Language/Sentinels/SentinelName',
    'Mod': '/Lotus/Language/Menu/Mod',
    'Mods': '/Lotus/Language/Menu/Mods',
    'Rifles': '/Lotus/Language/Weapons/RifleName',
    'Pistols': '/Lotus/Language/Weapons/PistolName',
    'Shotguns': '/Lotus/Language/Weapons/ShotgunName',
    'Melee': '/Lotus/Language/Weapons/MeleeName',
    'Archguns': '/Lotus/Language/Weapons/ArchgunName',
    'Exilus': '/Lotus/Language/Menu/Exilus',
    'Parazon': '/Lotus/Language/Menu/Parazon',
    'Aura': '/Lotus/Language/Menu/Aura',
    'Necramech': '/Lotus/Language/Necromech/NecramechName',
    'Loid': '/Lotus/Language/Characters/LoidName',
}

# Proper nouns that stay EN for all locales
PROPER_NOUNS = {
    'Albrecht', 'Rivens', 'Warframe', 'Cephalon Kronos', 'GitHub', 'Discord',
    'Drifter', 'Kuva', 'Duviri', 'Tenno', 'Orokin', 'Grineer', 'Corpus',
    'Sentient', 'Void', 'Lotus', 'Tennobaum', 'Zariman',
}

def resolve_en_val(en_val):
    """
    For a given EN value, return {locale: translation} for all 13 locales.
    NO FR-as-fallback — each locale gets its own game-sourced translation.
    """
    result = {}
    en_lower = en_val.lower().strip()
    
    # Check if it's a proper noun
    if en_val in PROPER_NOUNS:
        return {lo: en_val for lo in LOCALES}
    
    # Check value-based lookup in dict files
    if en_lower in val_lookup:
        for lo in LOCALES:
            if lo in val_lookup[en_lower]:
                result[lo] = val_lookup[en_lower][lo]
    
    # Check key-based lookup for known game terms
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term or en_val.lower() == term.lower():
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                val = d.get(lo, en_val)
                en_ref = d.get('en', en_val)
                if val != en_ref and val.strip():
                    result[lo] = val
            break
    
    # Fill in remaining locales with FR-as-reference
    # (Use FR locale file values to understand the translation, then for locales
    # where dict doesn't have it, we check if FR locale file has it and use that as GUIDE)
    for lo in LOCALES:
        if lo not in result:
            # Check if this EN value exists in the locale file already with a translation
            # (we'll handle this separately in the apply step)
            pass
    
    return result

# Get all unique EN values from ui_text_to_translate.json
data = load_json('/tmp/tables/ui_text_to_translate.json')
unique_en = set(item['en'] for item in data)
print(f"Unique EN values: {len(unique_en)}")

# Resolve each
resolved = {}
for en_val in sorted(unique_en):
    translations = resolve_en_val(en_val)
    if translations:
        resolved[en_val] = translations
        count = len(translations)
        print(f"  {en_val!r}: {count} locales resolved: {translations}")
    else:
        print(f"  {en_val!r}: NOT resolved from dict")

# Save
with open('/tmp/tables/dict_resolved.json', 'w', encoding='utf-8') as f:
    json.dump(resolved, f, ensure_ascii=False, indent=2)
print(f"\nResolved {len(resolved)} EN values from dict files")
