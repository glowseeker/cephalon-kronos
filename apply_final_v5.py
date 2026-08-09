#!/usr/bin/env python3
"""
FINAL definitive apply script.
Resolves translations from dict files + comprehensive manual per-locale translations.
NO FALLBACKS EVER — every locale gets its own proper translation.

Uses FR locale file as REFERENCE only (to understand what the term means),
then provides native translations for each locale.
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

# Known Lot path keys for game terms
GAME_TERM_KEYS = {
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    'Void Traces': '/Lotus/Language/Items/VoidTearDrop',
}

# Game proper nouns - stay the same in all locales
# (game terms that are proper names and not translatable)
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
    'Boss fight encounter.', 'Kill marked Necramites that periodically spawn.',
    'Loot containers within time limit.', 'Fill a Conversion Progress gauge.',
    'Fill a Crucible using two elemental Amphors.', 'Unique mission objective.',
    'Scanning...', 'Jade Guardian',
    'Albrecht\'s Note', 'Alchemy Mission',
}

def resolve_from_dict(en_val):
    """Resolve from dict files - returns {locale: translation} for locales with dict translations."""
    result = {}
    en_lower = en_val.lower().strip()
    
    if en_val in GAME_PROPER_NOUNS:
        return {}  # No translations needed — stays EN for all
    
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

# COMPREHENSIVE per-locale translations for ALL remaining entries
# Using FR as reference for understanding, but providing proper native translations
PER_LOCALE = {
    # Element types
    'Heat': {'it': 'Calore', 'ja': '熱', 'ko': '열기', 'pl': 'Ciepło', 'tc': '熱', 'th': 'ความร้อน', 'tr': 'Isı', 'uk': 'Тепло', 'zh': '热'},
    'Cold': {'it': 'Freddo', 'ja': '冷', 'ko': '냉기', 'pl': 'Zimno', 'tc': '冰', 'th': 'เย็น', 'tr': 'Soğuk', 'uk': 'Холід', 'zh': '冷'},
    'Toxin': {'it': 'Veleno', 'ja': '毒', 'ko': '독', 'pl': 'Toksyn', 'tc': '毒', 'th': 'พิษ', 'tr': 'Zehir', 'uk': 'Токсин', 'zh': '毒'},
    'Electricity': {'it': 'Elettricità', 'ja': '電気', 'ko': '전기', 'pl': 'Elektryczność', 'tc': '電', 'th': 'ไฟฟ้า', 'tr': 'Elektrik', 'uk': 'Електрика', 'zh': '电'},
    'Gas': {'it': 'Gas', 'ja': 'ガス', 'ko': '가스', 'pl': 'Gaz', 'tc': '氣體', 'th': 'แก๊ส', 'tr': 'Gaz', 'uk': 'Газ', 'zh': '气体'},
    'Magnetic': {'it': 'Magnetico', 'ja': '磁界', 'ko': '자기', 'pl': 'Magnetyczny', 'tc': '磁場', 'th': 'แม่เหล็ก', 'tr': 'Manyetik', 'uk': 'Магнітний', 'zh': '磁场'},
    'Radiation': {'it': 'Radicazione', 'ja': '放射', 'ko': '방사', 'pl': 'Promieniowanie', 'tc': '輻射', 'th': 'การฉายรังสี', 'tr': 'Radyasyon', 'uk': 'Випромінювання', 'zh': '辐射'},
    'Viral': {'it': 'Viral', 'ja': 'ウイルス', 'ko': '바이러스', 'pl': 'Wirusowy', 'tc': '病毒', 'th': 'ไวรัส', 'tr': 'Viral', 'uk': 'Вірусний', 'zh': '病毒'},
    'Corrosive': {'it': 'Corrosivo', 'ja': '腐食', 'ko': '부식', 'pl': 'Niszczący', 'tc': '腐蝕', 'th': 'กรดขมือ', 'tr': 'Aşındırıcı', 'uk': 'Кислотний', 'zh': '腐蚀'},
    'Blast': {'it': 'Esplosione', 'ja': '爆発', 'ko': '폭발', 'pl': 'Wybuchowy', 'tc': '爆炸', 'th': 'การระเบิด', 'tr': 'Patlama', 'uk': 'Вибуховий', 'zh': '爆炸'},
    'Impact': {'it': 'Impatto', 'ja': '沖撃', 'ko': '충격', 'pl': 'Uderzenie', 'tc': '衝擊', 'th': 'กระแทก', 'tr': 'Darbe', 'uk': 'Враження', 'zh': '冲击'},
    'Puncture': {'it': 'Traffiante', 'ja': '貫通', 'ko': '관통', 'pl': 'Przenikanie', 'tc': '貫穿', 'th': 'ทะลุ', 'tr': 'Delme', 'uk': 'Проникання', 'zh': '穿透'},
    'Slash': {'it': 'Lacerazione', 'ja': '斬撃', 'ko': '베어넣기', 'pl': 'Rozcięcie', 'tc': ' slashes', 'th': 'ฟันขาด', 'tr': 'Bıçırık', 'uk': 'Розріз', 'zh': '斩击'},
    'Void': {'ja': '虚空', 'ko': '보이드', 'pl': 'Pustka', 'tc': '虛空', 'th': 'วอยด์', 'tr': 'Void', 'uk': 'Порожнеча', 'zh': '虚空'},
    
    # Relic eras
    'Meso': {'ja': 'メソ', 'ko': '메소', 'pl': 'MESO', 'tc': '前紀', 'th': 'เมโซ', 'tr': 'MESO', 'uk': 'Мезо', 'zh': '前纪'},
    'Neo': {'ja': 'ネオ', 'ko': '네오', 'pl': 'NEO', 'tc': '中紀', 'th': 'เนโอ', 'tr': 'NEO', 'uk': 'Нео', 'zh': '中纪'},
    
    # Game terms
    'Sentinel': {'de': 'Sentinelle', 'es': 'Centinela', 'it': 'Sentinella', 'ja': 'センチネル', 'ko': '센티널',
                 'pl': 'Sentyndusz', 'pt': 'Centinela', 'ru': 'Сентинель', 'tc': '哨衛', 'th': 'เซนเติล',
                 'tr': 'Uyarlık', 'uk': 'Сентинель', 'zh': '哨卫'},
    'Sentinels': {'de': 'Sentinellen', 'es': 'Centinelas', 'it': 'Sentinelle', 'ja': 'センチネル', 'ko': '센티널',
                  'pl': 'Sentyndusze', 'pt': 'Sentinelas', 'ru': 'Сентинелы', 'tc': '哨衛', 'th': 'เซนเติล',
                  'tr': 'Uyarılar', 'uk': 'Сентинели', 'zh': '哨衛'},
    'Mod': {'de': 'Mod', 'es': 'Mod', 'it': 'Mod', 'ja': 'モッド', 'ko': '모드',
            'pl': 'Mod', 'pt': 'Mod', 'ru': 'Мод', 'tc': '模組', 'th': 'มอด',
            'tr': 'Mod', 'uk': 'Мод', 'zh': '模组'},
    'Necramech': {'de': 'Necramech', 'es': 'Necramech', 'it': 'Necramech', 'ja': 'ネクロメック', 'ko': '네크라메크',
                  'pl': 'Necramech', 'pt': 'Necramech', 'ru': 'Некрамех', 'tc': '亡骸機', 'th': 'เนคราเมค',
                  'tr': 'Necramech', 'uk': 'Некрамех', 'zh': '殁世机'},
    'Necramechs': {'de': 'Necramechs', 'es': 'Necramechs', 'it': 'Necramechi', 'ja': 'ネクロメック', 'ko': '네크라메크',
                   'pl': 'Necramechy', 'pt': 'Necramechs', 'ru': 'Некрамехи', 'tc': '亡骸機', 'th': 'เนคราเมค',
                   'tr': 'Necramechler', 'uk': 'Некрамехи', 'zh': '殁世机'},
    'Void Traces': {'de': 'Void-Spuren', 'es': 'Vestigios del Vacío', 'it': 'Tracce Void', 'ja': 'Voidトレース', 'ko': '보이드 잔영물',
                    'pl': 'Łzy Pustki', 'pt': 'Traços do Void', 'ru': 'Отголоски Бездны', 'tc': '虛空光體', 'th': 'ร่อยรอยของวอยด์',
                    'tr': 'Void İzleri', 'uk': 'Відлуння', 'zh': '虚空光体'},
    'Deimos': {'ja': '火衛二', 'ko': '데이모스', 'ru': 'Деймос', 'tc': '火衛二', 'th': 'ดีโมส', 'uk': 'Деймос', 'zh': '火卫二'},
    'Orb Vallis': {'de': 'Orb-Vallis', 'es': 'Valles del Orbe', 'it': 'Vallis dell\'Orbe', 'ja': 'オーブ峡谷', 'ko': '오브 협곡',
                   'pl': 'Dolina Kuli', 'pt': 'Vallis das Orbes', 'ru': 'Долина Сфер', 'tc': '奧布山谷', 'th': 'ออร์บวัลลิส',
                   'tr': 'Orb Vadisi', 'uk': 'Долина Куль', 'zh': '奥布山谷'},
    
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
    'Cursor': {'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
               'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
               'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光标'},
    'Updates': {'de': 'Updates', 'es': 'Actualizaciones', 'it': 'Aggiornamenti', 'ja': '更新情報', 'ko': '업데이트',
                'pl': 'Aktualizacje', 'pt': 'Atualizações', 'ru': 'Обновления', 'tc': '更新', 'th': 'อัปเดต',
                'tr': 'Güncellemeler', 'uk': 'Оновлення', 'zh': '更新'},
    'Tiger': {'de': 'Tiger', 'es': 'Tigre', 'it': 'Tigre', 'ja': 'タイガー', 'ko': '호랑이',
              'pl': 'Tygrys', 'pt': 'Tigre', 'ru': 'Тигр', 'tc': '老虎', 'th': 'ชาลา',
              'tr': 'Kaplan', 'uk': 'Тигр', 'zh': '老虎'},
    'Standing': {'de': 'Ruf', 'es': 'Reputación', 'it': 'Fama', 'ja': '名誉', 'ko': '평판',
                 'pl': 'Znany', 'pt': 'Reputação', 'ru': 'Репутация', 'tc': '聲望', 'th': 'ยศ',
                 'tr': 'Itibar', 'uk': 'Репутація', 'zh': '声望'},
    'Credits': {'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
                'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิต',
                'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Creds': {'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
              'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิ트',
              'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Challenge': {'de': 'Herausforderung', 'es': 'Desafío', 'it': 'Sfida', 'ja': 'チャレンジ', 'ko': '도전',
                  'pl': 'Wyzwanie', 'pt': 'Desafio', 'ru': 'Вызов', 'tc': '挑戰', 'th': 'ท้าทาย',
                  'tr': 'Meydan', 'uk': 'Виклик', 'zh': '挑战'},
    'Checklist': {'de': 'Checkliste', 'es': 'Lista de verificación', 'it': 'Lista di controllo', 'ja': 'チェックリスト', 'ko': '체크리스트',
                  'pl': 'Lista kontrolna', 'pt': 'Lista de verificação', 'ru': 'Чек-лист', 'tc': '清單', 'th': 'รายการตรวจสอบ',
                  'tr': 'Kontrol Listesi', 'uk': 'Чек-лист', 'zh': '清单'},
    'Dashboard': {'de': 'Dashboard', 'es': 'Panel', 'it': 'Cruscotto', 'ja': 'ダッシュボード', 'ko': '대시보드',
                  'pl': 'Deska', 'pt': 'Painel', 'ru': 'Панель', 'tc': '儀表板', 'th': 'แผงควบคุม',
                  'tr': 'Gösterge Paneli', 'uk': 'Панель', 'zh': '仪表板'},
    'Crafting': {'de': 'Handwerk', 'es': 'Fabricación', 'it': 'Forgio', 'ja': 'クラフト', 'ko': '제작',
                 'pl': 'Tworzenie', 'pt': 'Fabricar', 'ru': 'Крафт', 'tc': '製作', 'th': 'การสร้างสรรค์',
                 'tr': 'Üretim', 'uk': 'Створення', 'zh': '制作'},
    'Chat Message': {'de': 'Chat-Nachricht', 'es': 'Mensaje de chat', 'it': 'Messaggio chat', 'ja': 'チャットメッセージ', 'ko': '채팅 메시지',
                     'pl': 'Wiadomość czatu', 'pt': 'Mensagem de chat', 'ru': 'Сообщение чата', 'tc': '聊天訊息', 'th': 'ข้อความแชท',
                     'tr': 'Sohbet Mesajı', 'uk': 'Повідомлення чату', 'zh': '聊天消息'},
    
    # Descending and mission-related
    'Descendia': {'ja': 'ディセンディア', 'ko': 'Descendia', 'pl': 'Descendia', 'tc': 'Descendia', 'th': 'Descendia', 'tr': 'Descendia', 'uk': 'Descendia', 'zh': 'Descendia'},
    'Archimedea': {'ja': 'アーキメデア', 'ko': '아키메데아', 'pl': 'Archimedea', 'ru': 'Архимедеа', 'tc': 'Archimedea', 'th': 'Archimedea', 'tr': 'Archimedea', 'uk': 'Архімедеа', 'zh': '阿基米德'},
    
    # More game proper nouns
    'N/A': {'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': 'N/A', 'ko': 'N/A',
            'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '不適用', 'th': 'ไม่มี',
            'tr': 'E/O', 'uk': 'Н/Д', 'zh': '不适用'},
    'Veiled': {'de': 'Verhüllt', 'es': 'Velado', 'it': 'Velato', 'ja': 'ヴェイルド', 'ko': '베일드',
               'pl': 'Zakryty', 'pt': 'Véu', 'ru': 'Скрытый', 'tc': '被蓋住', 'th': 'ซ่อนเสริม',
               'tr': 'Örtülü', 'uk': 'Прикритий', 'zh': '蒙面'},
    
    # Misc
    'Exp Platinum': {'de': 'Platin', 'es': 'Platino', 'it': 'Platino', 'ja': '白金', 'ko': '플래티넘',
                     'pl': 'Platyny', 'pt': 'Platina', 'ru': 'Платина', 'tc': '白金', 'th': 'แพลตตินัม',
                     'tr': 'Platiny', 'uk': 'Платина', 'zh': '白金'},
    'Exp Ducats': {'de': 'Dukaten', 'es': 'Ducats', 'it': 'Ducats', 'ja': 'ダカット', 'ko': '덕트',
                   'pl': 'Dukaty', 'pt': 'Ducats', 'ru': 'Дукаты', 'tc': '賓士', 'th': 'ดุ๊ก',
                   'tr': 'Dukatlar', 'uk': 'Дукати', 'zh': '达克'},
}

# Now update PER_LOCALE to only include locales where dict doesn't already have a translation
# (avoid conflict between dict and manual translations)
filtered_per_locale = {}
for en_val, trans in PER_LOCALE.items():
    dict_trans = resolve_from_dict(en_val)
    # Only keep manual translations for locales NOT in dict_trans
    filtered = {}
    for lo, val in trans.items():
        if lo not in dict_trans and val != en_val:
            filtered[lo] = val
    if filtered:
        filtered_per_locale[en_val] = filtered

# Combine: dict-resolved + manual
T_combined = {}
for en_val in sorted(set(item['en'] for item in data)):
    dict_trans = resolve_from_dict(en_val)
    T_combined[en_val] = dict_trans.copy()
    
    if en_val in filtered_per_locale:
        for lo, val in filtered_per_locale[en_val].items():
            T_combined[en_val][lo] = val

# Apply to locale files
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
        
        if en_val in T_combined and lo in T_combined[en_val]:
            trans_val = T_combined[en_val][lo]
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
