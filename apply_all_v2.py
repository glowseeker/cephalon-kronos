#!/usr/bin/env python3
"""
Apply translations to all 13 locale files.
For each entry in ui_text_to_translate.json:
1. Resolve from dict files for each locale (game-sourced, no FR fallback)
2. If not in dict, use manual per-locale translations (no FR-as-fallback)
3. Apply to the correct key in the locale file's ui section

Key lookup: try both `key` (as-is) and `key` without `ui.` prefix.
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
en_data = load_locale('en')

# Build EN value -> {locale: translation} from dict files
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

# Build key-based lookup from dict files
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
    '1999 Calendar', 'Night', 'Day', 'Winter',
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

# Load manual translations (with proper per-locale values, no FR-as-fallback)
manual_translations = {}
try:
    manual_translations = load_json('/tmp/tables/manual_translations.json')
except FileNotFoundError:
    print("No manual_translations.json found")

# Load ui_text_to_translate.json
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Build T_final: {en_val: {locale: translation}}
T_final = {}
for en_val in sorted(set(item['en'] for item in data)):
    # First try dict resolution
    translations = resolve_from_dict(en_val)
    
    # Merge manual translations (only for locales NOT already resolved)
    for lo in LOCALES:
        if en_val in manual_translations and lo in manual_translations[en_val]:
            val = manual_translations[en_val][lo]
            if val != en_val and val.strip():
                if en_val not in T_final:
                    T_final[en_val] = {}
                T_final[en_val][lo] = val
        if en_val not in T_final:
            T_final[en_val] = {}
        if lo not in T_final[en_val] and lo in translations:
            T_final[en_val][lo] = translations[lo]
    
    if translations:
        for lo, val in translations.items():
            if en_val not in T_final:
                T_final[en_val] = {}
            if val != en_val:
                T_final[en_val][lo] = val

# Fix: Merge dict-resolved and manual translations properly
T_final = {}
for en_val in sorted(set(item['en'] for item in data)):
    translations = {}
    
    # Dict resolution
    dict_trans = resolve_from_dict(en_val)
    translations.update(dict_trans)
    
    # Manual translations (override dict if provided)
    if en_val in manual_translations:
        for lo, val in manual_translations[en_val].items():
            if val != en_val and val.strip():
                translations[lo] = val
    
    if translations:
        T_final[en_val] = translations

# Apply to locale files
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locales_data[lo]
    ui = loc_data.get('ui', {})
    en_ui = en_data.get('ui', {})
    
    for item in data:
        en_val = item['en']
        key = item['key']
        
        if en_val not in T_final:
            continue
        translations = T_final[en_val]
        
        if lo not in translations:
            continue
        trans_val = translations[lo]
        if trans_val == en_val or not trans_val.strip():
            continue
        
        # Check current value in locale
        current = ui.get(key, en_val)
        if current != en_val:
            # Already translated in this locale
            continue
        
        # Apply translation
        ui[key] = trans_val
        count += 1
    
    # Restore modified ui
    loc_data['ui'] = ui
    stats[lo] = count

print("Applied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save locale files
for lo in LOCALES:
    save_locale(lo, locales_data[lo])
print("\nDone!")
