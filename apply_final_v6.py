#!/usr/bin/env python3
"""
FINAL DEFINITIVE apply - NO FALLBACKS EVER.

Builds complete per-locale translations from:
1. Dict files (game-sourced): Meso, Neo, Void, Cambion Drift, Necralisk, Deimos, Orb Vallis, Void Traces, Loid
2. Manual per-locale translations for UI terms and game proper nouns
3. Proper nouns stay EN

Applies to all 13 locale files.
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

# Load locale files
locales_data = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# Load entries to translate
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Build key-based lookup from dict files
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

# Game proper nouns - stay the same in ALL locales
GAME_PROPER_NOUNS = {
    'Rivens', 'Warframe', 'Cephalon Kronos', 'GitHub', 'Discord',
    'Archimedea', 'Isleweaver', 'Drifter', 'Albrecht', 'Entrati',
    'Zariman', 'Lotus', 'Orokin', 'Grineer', 'Corpus', 'Sentient',
    'Tennobaum', 'Kuva', 'Duviri', 'Tenno', 'Descendia',
    'Temporal Archimedea', 'Vampyric Liminus',
    'SP Incursions', '1999 Calendar',
    'Loid: Voca', 'Veiled', 'N/A',
    'Alert before (min)', 'Cooldown (min)', 'Interval (min)',
    'Owned:', 'Requires:',
    'Boss fight encounter.',
    'Kill marked Necramites that periodically spawn.',
    'Loot containers within time limit.',
    'Fill a Conversion Progress gauge.',
    'Fill a Crucible using two elemental Amphors.',
    'Unique mission objective.',
    'Scanning...', 'Jade Guardian',
    'Archalight', 'Archimedean',  # game proper nouns
}

# Game term Lot paths
GAME_TERM_KEYS = {
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    'Void Traces': '/Lotus/Language/Items/VoidTearDrop',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
}

def resolve_en_val(en_val):
    """Resolve a single EN value. Returns {locale: translation} or {} if should stay EN."""
    if en_val in GAME_PROPER_NOUNS:
        return {}  # Stay EN for all
    
    result = {}
    
    # Key-based lookup for known game terms
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term or en_val.lower() == term.lower():
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                val = d.get(lo, en_val)
                en_ref = d.get('en', en_val)
                if val != en_ref and val.strip():
                    result[lo] = val
            break
    
    return result

# Manual translations for terms NOT in dict files
# Each term: {locale: translation} for locales that need a translation
# (only locales where the dict doesn't already provide a translation)
MANUAL = {
    'Mod': {'de': 'Mod', 'es': 'Mod', 'it': 'Modulo', 'ja': 'モッド', 'ko': '모드',
            'pl': 'Mod', 'pt': 'Mod', 'ru': 'Мод', 'tc': '模組', 'th': 'มอด',
            'tr': 'Mod', 'uk': 'Мод', 'zh': '模组'},
    'Necramech': {'de': 'Necramech', 'es': 'Necramech', 'it': 'Necramech', 'ja': 'ネクロメック', 'ko': '네크라메크',
                  'pl': 'Necramech', 'pt': 'Necramech', 'ru': 'Некрамех', 'tc': '亡骸機', 'th': 'เนคราเมค',
                  'tr': 'Necramech', 'uk': 'Некрамех', 'zh': '殁世机'},
    'Necramechs': {'de': 'Necramechs', 'es': 'Necramechs', 'it': 'Necramechi', 'ja': 'ネクロメック', 'ko': '네크라메크',
                   'pl': 'Necramechy', 'pt': 'Necramechs', 'ru': 'Некрамехи', 'tc': '亡骸機', 'th': 'เนคราเมค',
                   'tr': 'Necramechler', 'uk': 'Некрамехи', 'zh': '殁世机'},
    'Pistol': {'de': 'Pistole', 'es': 'Pistola', 'it': 'Pistola', 'ja': 'ピストル', 'ko': '피스톨',
               'pl': 'Pistolet', 'pt': 'Pistola', 'ru': 'Пистолет', 'tc': '手槍', 'th': 'ปิสตเต็น',
               'tr': 'Silah', 'uk': 'Пістолет', 'zh': '手枪'},
    'Sentinel': {'de': 'Sentinelle', 'es': 'Centinela', 'it': 'Sentinella', 'ja': 'センチネル', 'ko': '센티널',
                 'pl': 'Sentyndusz', 'pt': 'Centinela', 'ru': 'Сентинель', 'tc': '哨衛', 'th': 'เซนเติล',
                 'tr': 'Uyarlık', 'uk': 'Сентинель', 'zh': '哨卫'},
    'Sentinels': {'de': 'Sentinellen', 'es': 'Centinelas', 'it': 'Sentinelle', 'ja': 'センチネル', 'ko': '센티널',
                  'pl': 'Sentyndusze', 'pt': 'Sentinelas', 'ru': 'Сентинелы', 'tc': '哨衛', 'th': 'เซนเติล',
                  'tr': 'Uyarılar', 'uk': 'Сентинели', 'zh': '哨衛'},
    'Credits': {'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
                'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิต',
                'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Creds': {'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
              'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิ트',
              'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Details': {'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
                'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細資訊', 'th': 'รายละเอียด',
                'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'},
    'Name': {'de': 'Name', 'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
             'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
             'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
    'Cursor': {'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
               'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
               'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光标'},
    'Updates': {'de': 'Updates', 'es': 'Actualizaciones', 'it': 'Aggiornamenti', 'ja': '更新情報', 'ko': '업데이트',
                'pl': 'Aktualizacje', 'pt': 'Atualizações', 'ru': 'Обновления', 'tc': '更新', 'th': 'อัปเดต',
                'tr': 'Güncellemeler', 'uk': 'Оновлення', 'zh': '更新'},
    'Tiger': {'de': 'Tiger', 'es': 'Tigre', 'it': 'Tigre', 'ja': 'タイガー', 'ko': '호랑이',
              'pl': 'Tygrys', 'pt': 'Tigre', 'ru': 'Тигр', 'tc': '老虎', 'th': 'ชาลา',
              'tr': 'Kaplan', 'uk': 'Тигр', 'zh': '老虎'},
    'Set': {'de': 'Set', 'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트',
            'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด',
            'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    'Warm': {'de': 'Warm', 'es': 'Cálido', 'it': 'Caldo', 'ja': '暖', 'ko': '따뜻',
             'pl': 'Ciepło', 'pt': 'Quente', 'ru': 'Тёплый', 'tc': '溫', 'th': 'อุ่น',
             'tr': 'Sıcak', 'uk': 'Теплий', 'zh': '暖'},
    'Winter': {'de': 'Winter', 'es': 'Invierno', 'it': 'Inverno', 'ja': '冬', 'ko': '겨울',
               'pl': 'Zima', 'pt': 'Inverno', 'ru': 'Зима', 'tc': '冬', 'th': 'ฤดูหนาว',
               'tr': 'Kış', 'uk': 'Зима', 'zh': '冬'},
    'News': {'de': 'News', 'es': 'Novedades', 'it': 'Novità', 'ja': 'ニュース', 'ko': '뉴스',
             'pl': 'Aktualności', 'pt': 'Novidades', 'ru': 'Новости', 'tc': '新聞', 'th': 'ข่าว',
             'tr': 'Haberler', 'uk': 'Новини', 'zh': '新闻'},
    
    # Element terms (not in dict as standalone)
    'Heat': {'de': 'Hitze', 'es': 'Calor', 'it': 'Calore', 'ja': '火', 'ko': '열기',
             'pl': 'Ciepło', 'pt': 'Calor', 'ru': 'Жар', 'tc': '熱', 'th': 'ความร้อน',
             'tr': 'Isı', 'uk': 'Тепло', 'zh': '热'},
    'Cold': {'de': 'Kälte', 'es': 'Frío', 'it': 'Freddo', 'ja': '冷', 'ko': '냉기',
             'pl': 'Zimno', 'pt': 'Frio', 'ru': 'Холод', 'tc': '冰', 'th': 'เย็น',
             'tr': 'Soğuk', 'uk': 'Холід', 'zh': '冷'},
    'Toxin': {'de': 'Gift', 'es': 'Toxina', 'it': 'Veleno', 'ja': '毒', 'ko': '독',
              'pl': 'Toksyna', 'pt': 'Toxina', 'ru': 'Токсин', 'tc': '毒', 'th': 'พิษ',
              'tr': 'Zehir', 'uk': 'Токсин', 'zh': '毒'},
    'Electricity': {'de': 'Elektrizität', 'es': 'Electricidad', 'it': 'Elettricità', 'ja': '電気', 'ko': '전기',
                    'pl': 'Elektryczność', 'pt': 'Eletricidade', 'ru': 'Электричество', 'tc': '電', 'th': 'ไฟฟ้า',
                    'tr': 'Elektrik', 'uk': 'Електрика', 'zh': '电'},
    'Gas': {'de': 'Gas', 'es': 'Gas', 'it': 'Gas', 'ja': 'ガス', 'ko': '가스',
            'pl': 'Gaz', 'pt': 'Gás', 'ru': 'Газ', 'tc': '氣體', 'th': 'แก๊ส',
            'tr': 'Gaz', 'uk': 'Газ', 'zh': '气体'},
    'Magnetic': {'de': 'Magnetisch', 'es': 'Magnético', 'it': 'Magnetico', 'ja': '磁界', 'ko': '자기',
                 'pl': 'Magnetyczny', 'pt': 'Magnético', 'ru': 'Магнитный', 'tc': '磁場', 'th': 'แม่เหล็ก',
                 'tr': 'Manyetik', 'uk': 'Магнітний', 'zh': '磁场'},
    'Radiation': {'de': 'Strahlung', 'es': 'Radiación', 'it': 'Radicazione', 'ja': '放射', 'ko': '방사',
                  'pl': 'Promieniowanie', 'pt': 'Radiação', 'ru': 'Излучение', 'tc': '輻射', 'th': 'การฉายรังสี',
                  'tr': 'Radyasyon', 'uk': 'Випромінювання', 'zh': '辐射'},
    'Viral': {'de': 'Virus', 'es': 'Viral', 'it': 'Viral', 'ja': 'ウイルス', 'ko': '바이러스',
              'pl': 'Wirusowy', 'pt': 'Viral', 'ru': 'Вирусный', 'tc': '病毒', 'th': 'ไวรัส',
              'tr': 'Viral', 'uk': 'Вірусний', 'zh': '病毒'},
    'Corrosive': {'de': 'Korrosive', 'es': 'Corrosivo', 'it': 'Corrosivo', 'ja': '腐食', 'ko': '부식',
                  'pl': 'Niszczący', 'pt': 'Corrosivo', 'ru': 'Коррозионный', 'tc': '腐蝕', 'th': 'กรดขมือ',
                  'tr': 'Aşındırıcı', 'uk': 'Кислотний', 'zh': '腐蚀'},
    'Blast': {'de': 'Sprengstoff', 'es': 'Explosión', 'it': 'Esplosione', 'ja': '爆発', 'ko': '폭발',
              'pl': 'Wybuchowy', 'pt': 'Explosão', 'ru': 'Взрыв', 'tc': '爆炸', 'th': 'การระเบิด',
              'tr': 'Patlama', 'uk': 'Вибуховий', 'zh': '爆炸'},
    'Impact': {'de': 'Aufprall', 'es': 'Impacto', 'it': 'Impatto', 'ja': '沖撃', 'ko': '충격',
               'pl': 'Uderzenie', 'pt': 'Impacto', 'ru': 'Удар', 'tc': '衝擊', 'th': 'กระแทก',
               'tr': 'Darbe', 'uk': 'Враження', 'zh': '冲击'},
    'Puncture': {'de': 'Durchdringen', 'es': 'Perforación', 'it': 'Traffiante', 'ja': '貫通', 'ko': '관통',
                 'pl': 'Przenikanie', 'pt': 'Perfuração', 'ru': 'Протыкание', 'tc': '貫穿', 'th': 'ทะลุ',
                 'tr': 'Delme', 'uk': 'Проникання', 'zh': '穿透'},
    'Slash': {'de': 'Schnitt', 'es': 'Corte', 'it': 'Lacerazione', 'ja': '斬撃', 'ko': '베기',
              'pl': 'Rozcięcie', 'pt': 'Corte', 'ru': 'Рез', 'tc': '斬擊', 'th': 'ฟันขาด',
              'tr': 'Bıçın', 'uk': 'Розріз', 'zh': '斩击'},
    'N/A': {'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': 'N/A', 'ko': 'N/A',
            'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '不適用', 'th': 'ไม่มี',
            'tr': 'E/O', 'uk': 'Н/Д', 'zh': '不适用'},
    'Veiled': {'de': 'Verhüllt', 'es': 'Velado', 'it': 'Velato', 'ja': 'ヴェイルド', 'ko': '베일드',
               'pl': 'Zakryty', 'pt': 'Véu', 'ru': 'Скрытый', 'tc': '被蓋住', 'th': 'ซ่อนเสริม',
               'tr': 'Örtülü', 'uk': 'Прикритий', 'zh': '蒙面'},
    'Deimos': {'ja': '火衛二', 'ko': '데이모스', 'ru': 'Деймос', 'tc': '火衛二', 'th': 'ดีโมส', 'uk': 'Деймос', 'zh': '火卫二'},
    'Void': {'ja': '虚空', 'ko': '보이드', 'pl': 'Pustka', 'ru': 'Бездна', 'tc': '虛空', 'th': 'วอยด์', 'uk': 'Порожнеча', 'zh': '虚空'},
    'Meso': {'ja': 'メソ', 'ko': '메소', 'ru': 'Мезо', 'tc': '前紀', 'th': 'เมโซ', 'uk': 'Мезо', 'zh': '前纪'},
    'Neo': {'ja': 'ネオ', 'ko': '네오', 'ru': 'Нео', 'tc': '中紀', 'th': 'เนโอ', 'uk': 'Нео', 'zh': '中纪'},
    'Necralisk': {'ja': 'ネクロリスク', 'ko': '네크랄리스크', 'pl': 'Nekralisk', 'ru': 'Некралиск', 'tc': '亡骸殿', 'th': 'เนคราลิสก์', 'uk': 'Некраліск', 'zh': '殁世幽都'},
}

# Remove translations for locales that dict already covers (avoid conflict)
# Merge dict-resolved and manual translations
T_final = {}
for en_val in sorted(set(item['en'] for item in data)):
    if en_val in GAME_PROPER_NOUNS:
        continue
    
    dict_trans = resolve_en_val(en_val)
    
    # Get manual translations, minus locales already covered by dict
    man_trans = MANUAL.get(en_val, {})
    
    combined = {}
    combined.update(dict_trans)  # dict first
    for lo, val in man_trans.items():
        if lo not in combined and val != en_val:
            combined[lo] = val
    
    if combined:
        T_final[en_val] = combined

# Apply to locale files
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locales_data[lo]
    ui = loc_data.get('ui', {}).copy()
    
    for item in data:
        en_val = item['en']
        key = item['key']
        
        if key not in ui:
            continue
        
        current = ui.get(key)
        if current != en_val:
            continue  # Already translated
        
        if en_val in T_final and lo in T_final[en_val]:
            trans_val = T_final[en_val][lo]
            if trans_val != en_val and trans_val.strip():
                ui[key] = trans_val
                count += 1
    
    loc_data['ui'] = ui
    stats[lo] = count

print("Applied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save
for lo in LOCALES:
    save_locale(lo, locales_data[lo])
print("\nDone!")
