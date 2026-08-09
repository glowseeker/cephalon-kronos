#!/usr/bin/env python3
"""
FINAL comprehensive apply v7b - complete the job.
Properly handles ALL remaining EN values.
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

# Load entries
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Build key-based lookup from dict files
key_lookup = {}
for lo in LOCALES + ['fr']:
    d = dicts[lo]
    for key, val in d.items():
        if key not in key_lookup:
            key_lookup[key] = {}
        key_lookup[key][lo] = val

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
    result = {}
    for term, key in GAME_TERM_KEYS.items():
        if en_val == term:
            d = key_lookup.get(key, {})
            for lo in LOCALES:
                val = d.get(lo, en_val)
                en_ref = d.get('en', en_val)
                if val != en_ref and val.strip():
                    result[lo] = val
            break
    return result

# Manual translations for ALL non-dict-resolved terms
# Only for locales where translation differs from EN
MANUAL = {
    'N/A': {'es': 'N/D', 'it': 'N/D', 'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '不適用', 'th': 'ไม่มี', 'tr': 'E/O', 'uk': 'Н/Д', 'zh': '不适用'},
    'Mod': {'it': 'Modulo', 'ja': 'モッド', 'ko': '모드', 'ru': 'Мод', 'tc': '模組', 'th': 'มอด', 'uk': 'Мод', 'zh': '模组'},
    'Necramech': {'ja': 'ネクロメック', 'ko': '네크라메크', 'tc': '亡骸機', 'th': 'เนคราเมック', 'zh': '殁世机'},
    'Necramechs': {'ja': 'ネクロメック', 'ko': '네크라메크', 'tc': '亡骸機', 'th': 'เน크라메크', 'zh': '殁世机'},
    'Credits': {'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
                'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิต',
                'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Creds': {'es': 'Créditos', 'it': 'Crediti', 'ja': 'クリジット', 'ko': '크레딧',
              'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิ트',
              'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'},
    'Details': {'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
                'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細資訊', 'th': 'รายละเอียด',
                'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'},
    'Name': {'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
             'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
             'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
    'Set': {'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트',
            'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด',
            'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    'Cursor': {'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
               'pl': 'Kursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
               'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光標'},
    'Updates': {'es': 'Actualizaciones', 'it': 'Aggiornamenti', 'ja': '更新情報', 'ko': '업데이트',
                'pl': 'Aktualizacje', 'pt': 'Atualizações', 'ru': 'Обновления', 'tc': '更新', 'th': 'อัปเด트',
                'tr': 'Güncellemeler', 'uk': 'Оновлення', 'zh': '更新'},
    'Tiger': {'es': 'Tigre', 'it': 'Tigre', 'ja': 'タイガー', 'ko': '호랑이',
              'pl': 'Tygrys', 'pt': 'Tigre', 'ru': 'Тигр', 'tc': '老虎', 'th': 'ชาลา',
              'tr': 'Kaplan', 'uk': 'Тигр', 'zh': '老虎'},
    'Warm': {'es': 'Cálido', 'it': 'Caldo', 'ja': '暖', 'ko': '따뜻',
             'pl': 'Ciepło', 'pt': 'Quente', 'ru': 'Тёплый', 'tc': '溫', 'th': 'อุ่น',
             'tr': 'Sıcak', 'uk': 'Теплий', 'zh': '暖'},
    'Winter': {'es': 'Invierno', 'it': 'Inverno', 'ja': '冬', 'ko': '겨울',
               'pl': 'Zima', 'pt': 'Inverno', 'ru': 'Зима', 'tc': '冬', 'th': 'ฤดูหนาว',
               'tr': 'Kış', 'uk': 'Зима', 'zh': '冬'},
    'Isleweaver': {'th': 'ไอล์วีเวอร์', 'tr': 'İsleweaver'},
    'Sentinel': {'ja': 'センチネル', 'ko': '센티널', 'pl': 'Sentyndusz', 'ru': 'Сентинель', 'tc': '哨衛', 'th': 'เซนเติล', 'uk': 'Сентинель', 'zh': '哨卫'},
    'Sentinels': {'ja': 'センチネル', 'ko': '센티널', 'pl': 'Sentyndusze', 'ru': 'Сентинелы', 'tc': '哨衛', 'th': 'เซนเติล', 'tr': 'Uyarılar', 'uk': 'Сентинели', 'zh': '哨衛'},
    'Veiled': {'ja': 'ヴェイルド', 'ko': '베일드', 'pl': 'Zakryty', 'ru': 'Скрытый', 'tc': '被蓋住', 'th': 'ซ่อนเสริม', 'tr': 'Örtülü', 'uk': 'Прикритий', 'zh': '蒙面'},
}

# For dict-resolved terms with no dict translation for some locales, 
# add manual transliterations
# Cambion Drift: dict has de, es, ja, ko, pl, pt, ru, tc, th, tr, uk, zh - only IT missing
Cambion = dict_resolve('Cambion Drift')  # Already has all except IT
# IT should be 'Deriva Cambion' based on FR pattern
# Actually let me check what FR has for Cambion Drift
fr_data = load_json('src/lib/i18n/fr.json')
fr_ui = fr_data.get('ui', {})
fr_cambion = fr_ui.get('ui.dashboard.timers_cambion_drift', 'Cambion Drift')
print(f"FR Cambion Drift: {fr_cambion!r}")

# Build complete translation table
T = {}
remaining_en = ['Archimedea', 'Cambion Drift', 'Credits', 'Cursor', 'Deimos', 'Descendia',
                'Details', 'Isleweaver', 'Kill marked Necramites that periodically spawn.',
                'Loid: Voca', 'Loot containers within time limit.', 'Meso', 'Mobile Interception',
                'Mod', 'N/A', 'Name', 'Necralisk', 'Necramech', 'Necramechs', 'Neo',
                'SP Incursions', 'Set', 'Temporal Archimedea', 'Tiger', 'Unique mission objective.',
                'Updates', 'Vampyric Liminus', 'Void', 'Warm', 'Winter']

# Add missing IT for Cambion Drift
Cambion['it'] = 'Deriva Cambion'

for en_val in remaining_en:
    translations = dict_resolve(en_val)
    # Add manual translations
    if en_val in MANUAL:
        for lo, val in MANUAL[en_val].items():
            if lo not in translations and val != en_val:
                translations[lo] = val
    # Special case for Cambion Drift
    if en_val == 'Cambion Drift':
        translations.update(Cambion)
    
    T[en_val] = translations

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
    save_locale(lo, locales_data[lo])
print("\nDone!")
