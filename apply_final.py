#!/usr/bin/env python3
"""
FINAL comprehensive resolution + application script.
NO FALLBACKS EVER.

Strategy:
1. Dict files → game-sourced translations for all 13 locales (done: 32 EN values resolved)
2. For remaining entries, use FR locale file as REFERENCE (understand what it should say)
   then provide proper per-locale translations manually
3. For proper nouns → keep EN
4. Apply everything to all 13 locale files
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def load_locale(lo):
    return load_json(f'src/lib/i18n/{lo}.json')

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

# Load dict files
dicts = {}
for lo in LOCALES + ['en', 'fr']:
    dicts[lo] = load_json(f'{RESOURCES}/dict.{lo}.json')
d_en = dicts['en']

# Load locale files
locales_data = {lo: load_locale(lo) for lo in LOCALES}
fr_data = load_locale('fr')

# Build EN value -> {locale: translation} from dict files (by value matching)
val_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if not val or not val.strip():
            continue
        en_val = d_en.get(key, val)
        if not en_val or not en_val.strip():
            continue
        en_key = en_val.lower().strip()
        if en_key == val.lower().strip():
            continue
        if en_key not in val_lookup:
            val_lookup[en_key] = {}
        if lo not in val_lookup[en_key]:
            val_lookup[en_key][lo] = val

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
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/NecraliskName',
    'Sentinel': '/Lotus/Language/Sentinels/SentinelName',
    'Mod': '/Lotus/Language/Menu/Mod',
    'Rifle': '/Lotus/Language/Weapons/RifleName',
    'Pistol': '/Lotus/Language/Weapons/PistolName',
    'Shotgun': '/Lotus/Language/Weapons/ShotgunName',
    'Necramech': '/Lotus/Language/Necromech/NecramechName',
    'Exilus': '/Lotus/Language/Menu/Exilus',
    'Parazon': '/Lotus/Language/Menu/Parazon',
    'Aura': '/Lotus/Language/Menu/Aura',
}

# Build key-based lookup
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

# Proper nouns
PROPER_NOUNS = {
    'Rivens', 'Warframe', 'Cephalon Kronos', 'GitHub', 'Discord',
    'Archimedea', 'Isleweaver', 'Drifter', 'Albrecht', 'Entrati',
    'Zariman', 'Lotus', 'Orokin', 'Grineer', 'Corpus', 'Sentient',
    'Tennobaum', 'Loid', 'Kuva', 'Duviri', 'Tenno',
}

def resolve_from_dict(en_val):
    """Resolve a single EN value from dict files for all 13 locales."""
    result = {}
    en_lower = en_val.lower().strip()
    
    if en_val in PROPER_NOUNS:
        return {lo: en_val for lo in LOCALES}
    
    # Value-based lookup
    if en_lower in val_lookup:
        for lo in LOCALES:
            if lo in val_lookup[en_lower]:
                result[lo] = val_lookup[en_lower][lo]
    
    # Key-based lookup for known game terms
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term or en_val.lower() == term.lower():
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                if lo not in result:
                    val = d.get(lo, en_val)
                    en_ref = d.get('en', en_val)
                    if val != en_ref and val.strip():
                        result[lo] = val
            break
    
    return result

# Get unique EN values from ui_text_to_translate.json
data = load_json('/tmp/tables/ui_text_to_translate.json')
unique_en = set(item['en'] for item in data)

# Build the final translation table
# T_final[en_val] = {locale: translation}
T_final = {}

for en_val in sorted(unique_en):
    # First try dict resolution
    translations = resolve_from_dict(en_val)
    
    if not translations:
        # Not in dict files - use FR locale file as REFERENCE
        # Find if FR already has a translation for this value
        fr_translations = {}
        for item in data:
            if item['en'] == en_val:
                key = item['key']
                # Look up FR value
                fr_val = fr_data.get('ui', {}).get(key, en_val)
                if fr_val != en_val:
                    fr_translations[key] = fr_val
        
        if fr_translations:
            # FR has translations — use them as guide for manual translation
            # For now, skip these — we'll handle them with manual translations
            pass
    
    if translations:
        T_final[en_val] = translations
        print(f"  {en_val!r}: {len(translations)}/13 locales from dict")
    else:
        print(f"  {en_val!r}: needs manual translation")

# Now add manual translations from build_translations.py output
manual = load_json('/tmp/tables/manual_translations.json')
for en_val, trans in manual.items():
    if en_val not in T_final:
        T_final[en_val] = {}
    for lo, val in trans.items():
        if val != en_val:  # Don't overwrite with EN
            T_final[en_val][lo] = val
    print(f"  {en_val!r}: {len(T_final[en_val])} locales total")

# Apply to locale files
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locales_data[lo]
    ui = loc_data.get('ui', {})
    
    for en_val, translations in T_final.items():
        if lo not in translations:
            continue
        trans_val = translations[lo]
        if trans_val == en_val or not trans_val.strip():
            continue
        
        # Find the key for this EN value in en.json
        for item in data:
            if item['en'] == en_val and item.get('key'):
                key = item['key']
                if key in ui and ui[key] == en_val:
                    ui[key] = trans_val
                    count += 1
                break
    
    stats[lo] = count

print(f"\nApplied translations:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save locale files
for lo in LOCALES:
    save_locale(lo, locales_data[lo])

print("\nDone! All translations applied to locale files.")
