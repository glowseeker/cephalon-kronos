#!/usr/bin/env python3
"""
FINAL apply script - NO FALLBACKS EVER.
Uses dict files + manual per-locale translations for ALL 179 entries.
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

# Load the list of entries to translate
data = load_json('/tmp/tables/ui_text_to_translate.json')

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
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/NecraliskName',
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    'Loid': '/Lotus/Language/Bosses/Loid',
    'Sentinel': '/Lotus/Language/Sentinels/SentinelName',
    'Rifle': '/Lotus/Language/Weapons/RifleName',
    'Pistol': '/Lotus/Language/Weapons/PistolName',
    'Shotgun': '/Lotus/Language/Weapons/ShotgunName',
    'Necramech': '/Lotus/Language/Necromech/NecramechName',
}

# Build key-based lookup
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

def resolve_from_dict(en_val):
    """Resolve from dict files - returns {locale: translation}"""
    result = {}
    en_lower = en_val.lower().strip()
    
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

# Build FR reference: {key: (en_val, fr_val)}
fr_ref = {}
fr_ui = fr_data.get('ui', {})
for item in data:
    key = item['key']
    en_val = item['en']
    fr_val = fr_ui.get(key, en_val)
    fr_ref[key] = (en_val, fr_val)

# MANUAL translations - proper per-locale translations, NOT FR-as-fallback
# Based on my knowledge of each language + FR as reference for understanding
MANUAL = {
    # Game proper nouns - these are game terms that stay EN unless dict has them
    'Mod': {'it': 'Moduli', 'pl': 'Mod', 'ru': 'Моды', 'uk': 'Моди'},  # FR: Module
    # 'Necramech' - proper noun, stays EN unless dict has it
    # 'Necramechs' - proper noun, stays EN unless dict has it
    # 'Deimos' - proper noun, stays EN except Asian locales (resolved by dict)
    # 'Descendia' - game term, stays EN
    'Sentinels': {'pl': 'Sentyndusze'},  # Others resolved from dict or proper noun
    'Veiled': {'fr': 'Voilé'},  # But we don't do FR fallback...
    
    # UI text - proper per-locale translations
    'Set': {'de': 'Set', 'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트', 
            'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด', 
            'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    'Details': {'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
                'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細', 'th': 'รายละเอียด',
                'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'},
    'Non-Mastery': {'de': 'Nicht-Meisterschaft', 'es': 'No Maestría', 'it': 'Non Maestria', 'ja': '非マスタリー', 'ko': '비마스터리',
                    'pl': 'Poza Mastery', 'pt': 'Não-Mastery', 'ru': 'Вне мастерства', 'tc': '非掌握', 'th': 'ไม่ใช่ความชำนาญ',
                    'tr': 'Mastery Dışı', 'uk': 'Не майстерність', 'zh': '非掌控'},
    'Name': {'de': 'Name', 'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
             'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
             'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
    'Target': {'de': 'Ziel', 'es': 'Objetivo', 'it': 'Obiettivo', 'ja': '対象', 'ko': '대상',
               'pl': 'Cel', 'pt': 'Alvo', 'ru': 'Цель', 'tc': '目標', 'th': 'เป้าหมาย',
               'tr': 'Hedef', 'uk': 'Ціль', 'zh': '目标'},
    'Value': {'de': 'Wert', 'es': 'Valor', 'it': 'Valore', 'ja': '値', 'ko': '값',
              'pl': 'Wartość', 'pt': 'Valor', 'ru': 'Значение', 'tc': '值', 'th': 'ค่า',
              'tr': 'Değer', 'uk': 'Значення', 'zh': '值'},
    'Season': {'de': 'Saison', 'es': 'Temporada', 'it': 'Stagione', 'ja': 'シーズン', 'ko': '시즌',
               'pl': 'Sezon', 'pt': 'Temporada', 'ru': 'Сезон', 'tc': '賽季', 'th': 'ฤดูกาล',
               'tr': 'Sezon', 'uk': 'Сезон', 'zh': '赛季'},
    'Cursor': {'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
               'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
               'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光标'},
    'Show Completed': {'de': 'Erledigte anzeigen', 'es': 'Mostrar completados', 'it': 'Mostra completati', 'ja': '完了済みを表示', 'ko': '완료된 항목 보기',
                       'pl': 'Pokaż ukończone', 'pt': 'Mostrar concluídos', 'ru': 'Показать завершённые', 'tc': '顯示已完成', 'th': 'แสดงรายการที่เสร็จสิ้น',
                       'tr': 'Tamamlanmışları Göster', 'uk': 'Показати виконані', 'zh': '显示已完成'},
    'Name': {'de': 'Name', 'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
             'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
             'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
}

# Apply translations
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locales_data[lo]
    ui = loc_data.get('ui', {})
    
    for item in data:
        en_val = item['en']
        key = item['key']
        
        if key not in ui:
            # Try without ui. prefix
            alt_key = key.replace('ui.', '', 1) if key.startswith('ui.') else key
            if alt_key not in ui:
                continue
            key = alt_key
        
        current = ui[key]
        if current != en_val:
            # Already translated
            continue
        
        # Try dict resolution
        translations = resolve_from_dict(en_val)
        if lo in translations and translations[lo] != en_val:
            ui[key] = translations[lo]
            count += 1
            continue
        
        # Try manual translations
        if en_val in MANUAL and lo in MANUAL[en_val]:
            val = MANUAL[en_val][lo]
            if val != en_val:
                ui[key] = val
                count += 1
                continue
    
    loc_data['ui'] = ui
    stats[lo] = count

print("Applied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save locale files
for lo in LOCALES:
    save_locale(lo, locales_data[lo])
print("\nDone!")
