#!/usr/bin/env python3
"""
FINAL comprehensive apply.
For each of the 30 remaining EN values, build a complete per-locale translation table.
Apply only where locale currently has EN and the translation differs from EN.

Uses:
- Dict files for game-sourced terms
- FR locale file as REFERENCE for understanding (never as source)
- Native translations for each locale
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

# Build key-based lookup from dict files
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

# Build value-based lookup
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

# Game term dict keys
GAME_TERM_KEYS = {
    'Meso': '/Lotus/Language/Relics/Era_MESO',
    'Neo': '/Lotus/Language/Relics/Era_NEO',
    'Lith': '/Lotus/Language/Relics/Era_LITH',
    'Axi': '/Lotus/Language/Relics/Era_AXI',
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
    'Deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'Necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
    'Cambion Drift': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosLandscapeName',
    'Void Traces': '/Lotus/Language/Items/VoidTearDrop',
}

def dict_resolve(en_val):
    """Resolve from dict files."""
    result = {}
    en_lower = en_val.lower().strip()
    
    # Key-based lookup
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term or en_val.lower() == term.lower():
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                val = d.get(lo, en_val)
                en_ref = d.get('en', en_val)
                if val != en_ref and val.strip():
                    result[lo] = val
            break
    
    # Value-based lookup (fallback)
    if en_lower in val_lookup:
        for lo in LOCALES:
            if lo not in result and lo in val_lookup[en_lower]:
                result[lo] = val_lookup[en_lower][lo]
    
    return result

# The 30 remaining EN values that need translations
# For each, provide complete per-locale translations where they differ from EN
# (dict-resolved values are applied first, then manual fills gaps)

# Manual translations for non-game, non-dict-resolved terms
# ONLY for locales where the translation differs from EN
MANUAL = {
    # N/A - standard abbreviation
    'N/A': {'es': 'N/D', 'it': 'N/D', 'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '不適用', 'th': 'ไม่มี', 'tr': 'E/O', 'uk': 'Н/Д', 'zh': '不适用'},
    
    # Mod - gaming UI term
    'Mod': {'it': 'Modulo', 'ja': 'モッド', 'ko': '모드', 'ru': 'Мод', 'tc': '模組', 'th': 'มอด', 'uk': 'Мод', 'zh': '模组'},
    
    # Necramech - game proper noun, but Asian locales have transliterations
    'Necramech': {'ja': 'ネクロメック', 'ko': '네크라메크', 'tc': '亡骸機', 'th': 'เนคราเมค', 'zh': '殁世机'},
    'Necramechs': {'ja': 'ネクロメック', 'ko': '네크라메크', 'tc': '亡骸機', 'th': 'เน크라메크', 'zh': '殁世机'},
    
    # Credits - UI term
    'Credits': {'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
                'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิ트',
                'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Creds': {'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
              'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิ트',
              'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    
    # Details - UI term
    'Details': {'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
                'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細資訊', 'th': 'รายละเอียด',
                'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'},
    
    # Name - UI term
    'Name': {'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
             'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
             'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
    
    # Set - UI term
    'Set': {'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트',
            'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด',
            'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    
    # Cursor - UI term
    'Cursor': {'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
               'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
               'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光標'},
    
    # Updates - UI term
    'Updates': {'es': 'Actualizaciones', 'it': 'Aggiornamenti', 'ja': '更新情報', 'ko': '업데이트',
                'pl': 'Aktualizacje', 'pt': 'Atualizações', 'ru': 'Обновления', 'tc': '更新', 'th': 'อัปเดต',
                'tr': 'Güncellemeler', 'uk': 'Оновлення', 'zh': '更新'},
    
    # Tiger - game term
    'Tiger': {'es': 'Tigre', 'it': 'Tigre', 'ja': 'タイガー', 'ko': '호랑이',
              'pl': 'Tygrys', 'pt': 'Tigre', 'ru': 'Тигр', 'tc': '老虎', 'th': 'ชาลา',
              'tr': 'Kaplan', 'uk': 'Тигр', 'zh': '老虎'},
    
    # Warm - UI/weather term
    'Warm': {'es': 'Cálido', 'it': 'Caldo', 'ja': '暖', 'ko': '따뜻',
             'pl': 'Ciepło', 'pt': 'Quente', 'ru': 'Тёплый', 'tc': '溫', 'th': 'อุ่น',
             'tr': 'Sıcak', 'uk': 'Теплий', 'zh': '暖'},
    
    # Winter - season
    'Winter': {'es': 'Invierno', 'it': 'Inverno', 'ja': '冬', 'ko': '겨울',
               'pl': 'Zima', 'pt': 'Inverno', 'ru': 'Зима', 'tc': '冬', 'th': 'ฤดูหนาว',
               'tr': 'Kış', 'uk': 'Зима', 'zh': '冬'},
}

# Build complete translation table for ALL 30 remaining EN values
T = {}
remaining_en = ['Archimedea', 'Cambion Drift', 'Credits', 'Cursor', 'Deimos', 'Descendia', 
                'Details', 'Isleweaver', 'Kill marked Necramites that periodically spawn.',
                'Loid: Voca', 'Loot containers within time limit.', 'Meso', 'Mobile Interception',
                'Mod', 'N/A', 'Name', 'Necralisk', 'Necramech', 'Necramechs', 'Neo',
                'SP Incursions', 'Set', 'Temporal Archimedea', 'Tiger', 'Unique mission objective.',
                'Updates', 'Vampyric Liminus', 'Void', 'Warm', 'Winter']

for en_val in remaining_en:
    # Start with dict resolution
    translations = dict_resolve(en_val)
    
    # Add manual translations for locales not covered by dict
    if en_val in MANUAL:
        for lo, val in MANUAL[en_val].items():
            if lo not in translations and val != en_val:
                translations[lo] = val
    
    T[en_val] = translations

# Show what we have for each
print("=== Translation coverage for remaining EN values ===")
for en_val in remaining_en:
    trans = T.get(en_val, {})
    covered = [lo for lo in LOCALES if lo in trans]
    missing = [lo for lo in LOCALES if lo not in trans]
    print(f"  {en_val!r}: covered={covered} missing={missing}")

# Load locale files and apply
data = load_json('/tmp/tables/ui_text_to_translate.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locale_files[lo]
    ui = loc_data.get('ui', {})
    
    for item in data:
        en_val = item['en']
        key = item['key']
        
        if key not in ui:
            continue
        
        current = ui.get(key)
        if current != en_val:
            continue  # Already translated
        
        if en_val in T and lo in T[en_val]:
            trans_val = T[en_val][lo]
            if trans_val != en_val and trans_val.strip():
                ui[key] = trans_val
                count += 1
    
    loc_data['ui'] = ui
    stats[lo] = count

print("\nApplied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save
for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print("\nDone!")
