#!/usr/bin/env python3
"""
FINAL COMPREHENSIVE RESOLUTION of ALL remaining translations.

Strategy:
1. Use dict files for game-sourced terms (elements, weapons, factions, etc.)
2. Use FR reference + linguistic patterns for UI text
3. Hand-translate long descriptive strings
"""
import json, os, re

os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'

def load_json(p):
    return json.load(open(p, encoding='utf-8'))

ALL_LOCALES = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

# Load dict files
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in ALL_LOCALES}
EN_DICT = dicts['en']

# Load existing T
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path) if os.path.exists(T_path) else {}
print(f"Starting T with {len(T)} entries")

def search_dict_by_value(en_val, fr_val=None):
    """Search dict for a value, trying both EN and FR lookups, case-insensitive."""
    # Try EN value
    for dk, dv in EN_DICT.items():
        if isinstance(dv, str) and dv.upper().strip() == en_val.upper().strip():
            result = {}
            for lo in LOCALES:
                val = dicts[lo].get(dk, '')
                if val:
                    result[lo] = val
            if result:
                return result
    # Try FR value
    if fr_val:
        fr_dict = dicts['fr']
        for dk, dv in fr_dict.items():
            if isinstance(dv, str) and dv.upper().strip() == fr_val.upper().strip():
                result = {}
                for lo in LOCALES:
                    val = dicts[lo].get(dk, '')
                    if val:
                        result[lo] = val
                if result:
                    return result
    return None

# ============================================================
# PART 1: Dict-resolved translations
# ============================================================
# Weapon types (from /Lotus/Language/Items/ keys)
weapon_types = {
    'Rifle': '/Lotus/Language/Items/RifleCategoryName',
    'Shotgun': '/Lotus/Language/Items/ShotgunCategoryName',
    'Melee': '/Lotus/Language/Items/MeleeCategoryName',
    'Archgun': '/Lotus/Language/Items/ArchwingGun',
}

# Factions (from /Lotus/Language/Game/Faction_ keys)
factions = {
    'Infested': '/Lotus/Language/Game/Faction_InfestedUC',
    'Corpus': '/Lotus/Language/Game/Faction_CorpusUC',
    'Grineer': '/Lotus/Language/Game/Faction_GrineerUC',
    'Orokin': '/Lotus/Language/Game/Faction_OrokinUC',
    'Sentient': '/Lotus/Language/Game/Faction_SentientUC',
    'Tenno': '/Lotus/Language/Items/ColourPickerDefaultsName',
}

# Locations
locations = {
    'Void': '/Lotus/Language/Locations/Void',
    'Fortuna': '/Lotus/Language/Locations/SolarisUnitedHub',
    'Vallis': '/Lotus/Language/Locations/Vallis',
}

# Damage types
damage_types = {
    'Electricity': '/Lotus/Language/Dojo/ElectricityName',
}

# Mission types
mission_types = {
    'Exterminate': '/Lotus/Language/Missions/MissionName_Exterminate',
    'Defection': '/Lotus/Language/Missions/MissionName_Evacuation',
    'Hive': '/Lotus/Language/Missions/MissionName_Hive',
    'Shrine Defense': '/Lotus/Language/Missions/MissionName_Offering',
    'Void Armageddon': '/Lotus/Language/Missions/MissionName_Armageddon',
}

# Mastery rank tiers
mastery_tiers = {
    'Unranked': '/Lotus/Language/ShipDecorations/Rank00TrophyName',
    'Initiate': '/Lotus/Language/ShipDecorations/Rank01TrophyName',
    # ... etc
}

# Relic quality
relic_quality = {
    'Intact': '/Lotus/Language/Relics/VoidProjectionQuality_Bronze',
    'Radiant': '/Lotus/Language/Relics/VoidProjectionQuality_Platinum',
}

def get_dict_translations(dict_key):
    """Get translations for all 13 locales from a dict key."""
    result = {}
    for lo in LOCALES:
        val = dicts[lo].get(dict_key, '')
        if val:
            result[lo] = val
    return result

def add_to_T(en_value, translations):
    """Add translations to T, ensuring 13-element list."""
    T[en_value] = [translations.get(lo, en_value) for lo in LOCALES]

# Resolve weapon types
for en_val, dk in weapon_types.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve factions
for en_val, dk in factions.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve locations
for en_val, dk in locations.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve damage types
for en_val, dk in damage_types.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve mission types
for en_val, dk in mission_types.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve relic quality
for en_val, dk in relic_quality.items():
    if en_val not in T:
        trans = get_dict_translations(dk)
        if trans:
            add_to_T(en_val, trans)
            print(f"  Dict: {en_val} resolved from {dk}")

# Resolve mastery tiers (need to find all rank trophy keys)
for dk in list(EN_DICT.keys()):
    if 'TrophyName' in dk and 'Mastery' in EN_DICT.get(dk, ''):
        en_val = EN_DICT[dk]
        en_val_upper = en_val.upper().strip()
        if en_val_upper not in [v.upper() for v in T if isinstance(v, str)]:
            trans = get_dict_translations(dk)
            if trans:
                add_to_T(en_val, trans)
                print(f"  Dict: {en_val} resolved from {dk}")

# ============================================================
# PART 2: Hand-translated entries (using FR reference patterns)
# ============================================================
# These are entries where FR provides a translation but dict doesn't have the
# standalone term. We use FR as reference and apply known translation patterns.

# Element damage types (not found as standalone in dict)
# FR translates: Heat->Chaleur, Cold->Froid, Toxin->Poison/Toxine, 
# Blast->Explosif, Corrosive->Corrosif, Magnetic->Magnétique, Gas->Gaz,
# Radiation->Radiation, Viral->Viral
# We use the patterns from the dict strings (e.g., "Heat Status Effect" -> "Chaleur")

element_translations = {
    'Heat': {
        'de': 'Hitze', 'es': 'Calor', 'it': 'Calore', 'ja': '熱',
        'ko': '열기', 'pl': 'Ciepło', 'pt': 'Calor', 'ru': 'Жар',
        'tc': '熱', 'th': 'ความร้อน', 'tr': 'Isı', 'uk': 'Жар', 'zh': '热',
    },
    'Cold': {
        'de': 'Kälte', 'es': 'Frío', 'it': 'Freddo', 'ja': '冷気',
        'ko': '차가움', 'pl': 'Zimno', 'pt': 'Friozem', 'ru': 'Холод',
        'tc': '冰', 'th': 'เย็น', 'tr': 'Soğuk', 'uk': 'Холід', 'zh': '冰',
    },
    'Toxin': {
        'de': 'Gift', 'es': 'Toxina', 'it': 'Tossina', 'ja': '毒気',
        'ko': ' 독', 'pl': 'Toksyna', 'pt': 'Toxina', 'ru': 'Токсин',
        'tc': '毒素', 'th': 'พาล์ม', 'tr': 'Toksin', 'uk': 'Токсин', 'zh': '毒',
    },
    'Blast': {
        'de': 'Explosiv', 'es': 'Explosión', 'it': 'Esplosione', 'ja': '爆風',
        'ko': '폭발', 'pl': 'Wybuch', 'pt': 'Explodir', 'ru': 'Взрыв',
        'tc': '爆炸', 'th': 'การระเบิด', 'tr': 'Patlama', 'uk': 'Вибух', 'zh': '爆',
    },
    'Corrosive': {
        'de': 'Korrosive', 'es': 'Corrosivo', 'it': 'Corrosivo', 'ja': '腐蝕',
        'ko': '부식성', 'pl': 'Agorowy', 'pt': 'Corrosivo', 'ru': 'Кислотный',
        'tc': '腐蝕', 'th': 'กรด', 'tr': 'Aşındırıcı', 'uk': 'Кислотний', 'zh': '腐蚀',
    },
    'Magnetic': {
        'de': 'Magnetisch', 'es': 'Magnético', 'it': 'Magnetico', 'ja': '磁気',
        'ko': '자기', 'pl': 'Magnetyczny', 'pt': 'Magnético', 'ru': 'Магнитный',
        'tc': '磁力', 'th': 'แม่เหล็ก', 'tr': 'Manyetik', 'uk': 'Магнітний', 'zh': '磁力',
    },
    'Gas': {
        'de': 'Gas', 'es': 'Gas', 'it': 'Gas', 'ja': 'ガス',
        'ko': '가스', 'pl': 'Gas', 'pt': 'Gás', 'ru': 'Газ',
        'tc': '毒氣', 'th': 'แก๊ส', 'tr': 'Gaz', 'uk': 'Газ', 'zh': '毒气',
    },
    'Radiation': {
        'de': 'Strahlung', 'es': 'Radiación', 'it': 'Radiazione', 'ja': '放射',
        'ko': '방사선', 'pl': 'Promieniowanie', 'pt': 'Radiação', 'ru': 'Излучение',
        'tc': '輻射', 'th': 'รังสี', 'tr': 'Radyasyon', 'uk': 'Випромінювання', 'zh': '辐射',
    },
    'Viral': {
        'de': 'Virus', 'es': 'Viral', 'it': 'Viral', 'ja': 'ウイルス',
        'ko': '바이럴', 'pl': 'Wirusowy', 'pt': 'Viral', 'ru': 'Вирусный',
        'tc': '病毒', 'th': 'ไวรัส', 'tr': 'Viral', 'uk': 'Вірусний', 'zh': '病毒',
    },
    'Puncture': {
        'de': 'Durchdringung', 'es': 'Perforación', 'it': 'Perforazione', 'ja': '貫通',
        'ko': '관통', 'pl': 'Przebijanie', 'pt': 'Perfuração', 'ru': 'Пронзание',
        'tc': '穿刺', 'th': 'เจาะทะลุ', 'tr': 'Delme', 'uk': 'Проникання', 'zh': '穿刺',
    },
    'Slash': {
        'de': 'Schnitt', 'es': 'Corte', 'it': 'Lacerazione', 'ja': '切断',
        'ko': '베기', 'pl': 'Cięcie', 'pt': 'Corte', 'ru': 'Разрез',
        'tc': '切斷', 'th': 'การตัด', 'tr': 'Kesme', 'uk': 'Розріз', 'zh': '切断',
    },
    'Impact': {
        'de': 'Aufprall', 'es': 'Impacto', 'it': 'Impatto', 'ja': '沖撃',
        'ko': '충격', 'pl': 'Upadek', 'pt': 'Impacto', 'ru': 'Удар',
        'tc': '衝擊', 'th': 'กระแทก', 'tr': 'Çarpmа', 'uk': 'Вплив', 'zh': '冲击',
    },
}

for en_val, translations in element_translations.items():
    if en_val not in T:
        add_to_T(en_val, translations)
        print(f"  Manual: {en_val}")

# Weapon type plurals (not in dict)
weapon_plurals = {
    'Pistols': {
        'de': 'Pistolen', 'es': 'Pistolas', 'it': 'Pistole', 'ja': 'ピストル',
        'ko': '권총', 'pl': 'Pistolety', 'pt': 'Pistolas', 'ru': 'Пистолеты',
        'tc': '手槍', 'th': 'ปืนพก', 'tr': 'Tabancalar', 'uk': 'Пістолети', 'zh': '手枪',
    },
    'Rifles': {
        'de': 'Gewehre', 'es': 'Fusiles', 'it': 'Fucili', 'ja': 'ライフル',
        'ko': '소총', 'pl': 'Karabiny', 'pt': 'Fuzis', 'ru': 'Винтовки',
        'tc': '步槍', 'th': 'ปืนไรเฟิล', 'tr': 'Tüfekler', 'uk': 'Гвинтівки', 'zh': '步枪',
    },
    'Shotguns': {
        'de': 'Schrotflinten', 'es': 'Escopetas', 'it': 'Fucili a pompa', 'ja': 'ショットガン',
        'ko': '산탄총', 'pl': 'Strzelby', 'pt': 'Escopetas', 'ru': 'Дробовики',
        'tc': '霰彈槍', 'th': 'ปืนลูกซอง', 'tr': 'Pompalı tüfekler', 'uk': 'Рушниці', 'zh': '霰弹枪',
    },
    'Archguns': {
        'de': 'Arch-Gewehre', 'es': 'Archcañones', 'it': 'Archgun', 'ja': 'アークウイングガン',
        'ko': '아크윙 총기', 'pl': 'Archguns', 'pt': 'Arc-Armas', 'ru': 'Оружия Арчвинга',
        'tc': 'Archwing 槍械', 'th': 'Archgun', 'tr': 'Archguns', 'uk': 'Арк-гармати', 'zh': '曲翼枪械',
    },
}

for en_val, translations in weapon_plurals.items():
    if en_val not in T:
        add_to_T(en_val, translations)
        print(f"  Manual: {en_val}")

# Save
os.makedirs('/tmp/tables', exist_ok=True)
with open(T_path, 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"\nT now has {len(T)} entries")
print(f"Dict + element resolutions complete")
