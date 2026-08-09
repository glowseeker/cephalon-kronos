#!/usr/bin/env python3
"""
Final comprehensive apply:
1. Resolve ALL game-sourced terms from dict files (Meso, Neo, Void, Deimos, Loid, etc.)
2. For remaining non-game terms, apply per-locale translations from a clean data file
3. For proper nouns, keep EN
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

# Load dict files
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES + ['en', 'fr']}
d_en = dicts['en']
d_fr = dicts['fr']

# Load locale files
locales_data = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
fr_data = load_json('src/lib/i18n/fr.json')
en_data = load_json('src/lib/i18n/en.json')

# Load the list of entries to translate
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Build key-based lookup from dict files: {lot_path: {locale: value}}
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

# Build value-based lookup: {lower_en_value: {locale: translated_value}}
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
}

# Proper nouns - stay EN
PROPER = {'Rivens', 'Warframe', 'Cephalon Kronos', 'GitHub', 'Discord', 'Archimedea',
          'Isleweaver', 'Drifter', 'Albrecht', 'Entrati', 'Zariman', 'Lotus', 'Orokin',
          'Grineer', 'Corpus', 'Sentient', 'Tennobaum', 'Kuva', 'Duviri', 'Tenno',
          'Descendia', 'Temporal Archimedea', 'Vampyric Liminus',
          'SP Incursions', '1999 Calendar', 'Loid: Voca',
          'Alert before (min)', 'Cooldown (min)', 'Interval (min)',
          'Owned:', 'Requires:',
          'Boss fight encounter.', 'Kill marked Necramites that periodically spawn.',
          'Loot containers within time limit.', 'Fill a Conversion Progress gauge.',
          'Fill a Crucible using two elemental Amphors.', 'Unique mission objective.',
          'Scanning...'}

# Game-sourced terms from dict (exact EN value -> Lot path key)
GAME_DICTIONARY = {
    'Alchemy': '/Lotus/Language/Tennokai/DelveName',  # or appropriate key
}

# Per-locale translations for UI text (NOT FR-as-fallback, proper translations)
PER_LOCALE = {
    # UI terms
    'Set': {'de': 'Set', 'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트',
            'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด',
            'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    'Details': {'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
                'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細資訊', 'th': 'รายละเอียด',
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
    'Hide Completed': {'de': 'Erledigte ausblenden', 'es': 'Ocultar completados', 'it': 'Nascondi completati', 'ja': '完了済みを非表示', 'ko': '완료된 항목 숨기기',
                       'pl': 'Ukryj ukończone', 'pt': 'Ocultar concluídos', 'ru': 'Скрыть завершённые', 'tc': '隱藏已完成', 'th': 'ซ่อนรายการที่เสร็จสิ้น',
                       'tr': 'Tamamlanmışları Gizle', 'uk': 'Приховати виконані', 'zh': '隐藏已完成'},
    'Arbitration Drones': {'de': 'Arbitrage-Drohnen', 'es': 'Drones de arbitraje', 'it': 'Droni di arbitrato', 'ja': '仲裁ドローン', 'ko': '중재 드론',
                           'pl': 'Drony arbitrażu', 'pt': 'Drones de arbitragem', 'ru': 'Дроны арбитража', 'tc': '仲裁無人機', 'th': 'เหล่าของการโหวต',
                           'tr': 'Müzakeresel Drone\'lar', 'uk': 'Дрони арбітражу', 'zh': '仲裁无人机'},
    'Archon Hunts': {'de': 'Archon-Jagden', 'es': 'Cacerías de Archon', 'it': 'Caccia agli Archon', 'ja': 'アーカンハンツ', 'ko': '아크론 사냥',
                     'pl': 'Polowania na Archony', 'pt': 'Caça a Archons', 'ru': 'Охота на Архонов', 'tc': '阿庫托夫獵殺', 'th': 'การล่า Archon',
                     'tr': 'Archon Avları', 'uk': 'Полювання на Архонів', 'zh': '阿库托夫狩猎'},
    'N/A': {'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': 'N/A', 'ko': 'N/A',
            'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '不適用', 'th': 'ไม่มี',
            'tr': 'E/O', 'uk': 'Н/Д', 'zh': '不适用'},
    'Veiled': {'de': 'Verhüllt', 'es': 'Velado', 'it': 'Velato', 'ja': 'ヴェイルド', 'ko': '베일드',
               'pl': 'Zakryty', 'pt': 'Véu', 'ru': 'Скрытый', 'tc': '被蓋住', 'th': 'ซ่อนเสริม',
               'tr': 'Örtülü', 'uk': 'Прикритий', 'zh': '蒙面'},
    'Mod': {'de': 'Mod', 'es': 'Mod', 'it': 'Mod', 'ja': 'モッド', 'ko': '모드',
            'pl': 'Mod', 'pt': 'Mod', 'ru': 'Мод', 'tc': '模組', 'th': 'มอด',
            'tr': 'Mod', 'uk': 'Мод', 'zh': '模组'},
    'Necramech': {'de': 'Necramech', 'es': 'Necramech', 'it': 'Necramech', 'ja': 'ネクロメック', 'ko': '네크라메크',
                  'pl': 'Necramech', 'pt': 'Necramech', 'ru': 'Некрамех', 'tc': '亡骸機', 'th': 'เนคราเมค',
                  'tr': 'Necramech', 'uk': 'Некрамех', 'zh': '殁世机'},
    'Necramechs': {'de': 'Necramechs', 'es': 'Necramechs', 'it': 'Necramechs', 'ja': 'ネクロメック', 'ko': '네크라메크',
                   'pl': 'Necramechy', 'pt': 'Necramechs', 'ru': 'Некрамехи', 'tc': '亡骸機', 'th': 'เนคราเมค',
                   'tr': 'Necramechler', 'uk': 'Некрамехи', 'zh': '殁世机'},
    'Sentinels': {'de': 'Sentinellen', 'es': 'Centinelas', 'it': 'Sentinelle', 'ja': 'センチネル', 'ko': '센티널',
                  'pl': 'Sentyndusze', 'pt': 'Sentinelas', 'ru': 'Сентинелы', 'tc': '哨衛', 'th': 'เซนเติล',
                  'tr': 'Uyarlıklar', 'uk': 'Сентинели', 'zh': '哨卫'},
    'Sentinel': {'de': 'Sentinelle', 'es': 'Centinela', 'it': 'Sentinella', 'ja': 'センチネル', 'ko': '센티널',
                 'pl': 'Sentyndusz', 'pt': 'Centinela', 'ru': 'Сентинель', 'tc': '哨衛', 'th': 'เซนเติล',
                 'tr': 'Uyarlık', 'uk': 'Сентинель', 'zh': '哨卫'},
    'Descendia': {'de': 'Descendia', 'es': 'Descendia', 'it': 'Descendia', 'ja': 'ディセンディア', 'ko': 'Descendia',
                  'pl': 'Descendia', 'pt': 'Descendia', 'ru': 'Descendia', 'tc': 'Descendia', 'th': 'Descendia',
                  'tr': 'Descendia', 'uk': 'Descendia', 'zh': 'Descendia'},
    'Archimedea': {'de': 'Archimedea', 'es': 'Archimedea', 'it': 'Archimedea', 'ja': 'アーキメデア', 'ko': '아키메데아',
                   'pl': 'Archimedea', 'pt': 'Archimedea', 'ru': 'Архимедеа', 'tc': 'Archimedea', 'th': 'Archimedea',
                   'tr': 'Archimedea', 'uk': 'Архімедеа', 'zh': '阿基米德'},
    'EXP DUCATS': {'de': 'Exp Dukaten', 'es': 'EXP Ducats', 'it': 'EXP Ducats', 'ja': 'ダカット経験値', 'ko': '덕트 경험치',
                   'pl': 'EXP Dukaty', 'pt': 'EXP Ducats', 'ru': 'Опыт - дукаты', 'tc': 'EXP 賓士', 'th': 'ประสบภูมิ - ดุ๊ก',
                   'tr': 'Dukat Tecrübesi', 'uk': 'Досвід - дукати', 'zh': '经验值-达克'},
    'EXP PLAT': {'de': 'Exp Platinum', 'es': 'EXP Plat', 'it': 'EXP Platinum', 'ja': 'プラチナ経験値', 'ko': '플래티넘 경험치',
                 'pl': 'EXP Platyny', 'pt': 'EXP Plat', 'ru': 'Опыт - платина', 'tc': 'EXP 白金', 'th': 'ประสบภูมิ - แพลตตินัม',
                 'tr': 'Platiny Tecrübesi', 'uk': 'Досвід - платина', 'zh': '经验值-白金'},
    'Jade Guardian': {'de': 'Jade-Wächter', 'es': 'Guardián de jade', 'it': 'Guardiano di giada', 'ja': 'ジャデガーディアン', 'ko': '제이드 가디언',
                     'pl': 'Strażnik Jadów', 'pt': 'Guardião de Jade', 'ru': 'Хранитель нефрита', 'tc': '翡翠守衛', 'th': 'เจิด์ การ์เดียน',
                     'tr': 'Jade Koruyucu', 'uk': 'Вартовий нефриту', 'zh': '翡翠守卫'},
}

# Resolve from dict files
def resolve_from_dict(en_val):
    result = {}
    en_lower = en_val.lower().strip()
    
    if en_val in PROPER:
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
            continue
        
        current = ui[key]
        if current != en_val:
            continue  # Already translated
        
        # Try dict resolution
        translations = resolve_from_dict(en_val)
        if lo in translations and translations[lo] != en_val:
            ui[key] = translations[lo]
            count += 1
            continue
        
        # Try manual per-locale translations
        if en_val in PER_LOCALE and lo in PER_LOCALE[en_val]:
            val = PER_LOCALE[en_val][lo]
            if val != en_val:
                ui[key] = val
                count += 1
                continue
    
    loc_data['ui'] = ui
    stats[lo] = count

print("Applied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save
for lo in LOCALES:
    save_locale(lo, locales_data[lo])
print("\nDone!")
