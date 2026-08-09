#!/usr/bin/env python3
"""
Build the final comprehensive translation table for ALL remaining entries.
Uses:
1. Dict files for game-sourced terms (Deimos, Void, Meso, Loid, Orb Vallis, etc.)
2. FR locale file as REFERENCE to understand what translations look like
3. Proper per-locale manual translations for UI text (NO FR-as-fallback)
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
    'Void': '/Lotus/Language/Locations/Void',
    'Orb Vallis': '/Lotus/Language/Locations/VenusLandscape',
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

# Game proper nouns that stay EN for all locales
PROPER_NOUNS = {
    'Rivens', 'Warframe', 'Cephalon Kronos', 'GitHub', 'Discord',
    'Archimedea', 'Isleweaver', 'Drifter', 'Albrecht', 'Entrati',
    'Zariman', 'Lotus', 'Orokin', 'Grineer', 'Corpus', 'Sentient',
    'Tennobaum', 'Loid', 'Kuva', 'Duviri', 'Tenno', 'Descendia',
    'Temporal Archimedea', 'Vampyric Liminus',
    'Mastery Rank', 'Legendary Rank', 'Legendary Fusion Core',
    'Prime Sets', 'SP Incursions',
    'Alert before (min)', 'Cooldown (min)', 'Interval (min)',
    'Owned:', 'Requires:', 'Non-Mastery',
    'Boss fight encounter.',
    'Kill marked Necramites that periodically spawn.',
    'Loot containers within time limit.',
    'Fill a Conversion Progress gauge.',
    'Fill a Crucible using two elemental Amphors.',
    'Unique mission objective.',
    'Scanning...',
    'LEFT', 'RIGHT', 'MORE', 'READY', 'REMAINING',
    'N/A',
    'Era:', 
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

# Load ui_text_to_translate.json
data = load_json('/tmp/tables/ui_text_to_translate.json')
unique_en = sorted(set(item['en'] for item in data))

# Build T_final: {en_val: {locale: translation}}
T_final = {}
for en_val in unique_en:
    translations = resolve_from_dict(en_val)
    if translations:
        T_final[en_val] = translations

# Add manual translations for UI text that wasn't in dict
# These are proper translations for each locale, NOT FR-as-fallback
MANUAL = {
    'Mod': {'ko': '모드', 'zh': 'MOD', 'tc': '模組', 'ja': 'モッド', 'th': 'มอด', 'pl': 'Mod'},
    'Necramech': {'ko': '네크라메크', 'ja': 'ネクロメック', 'tc': '亡骸機', 'zh': '殁世机', 'th': 'เนคราเมค', 'pl': 'Necramech', 'ru': 'Некрамех', 'uk': 'Некрамех', 'tr': 'Necramech'},
    'Necramechs': {'ko': '네크라메크', 'ja': 'ネクロメック', 'tc': '亡骸機', 'zh': '殁世机', 'th': 'เนคราเมค', 'pl': 'Necramechy', 'ru': 'Некрамехи', 'uk': 'Некрамехи', 'tr': 'Necramechler'},
    'Sentinels': {'de': 'Sentinelen', 'es': 'Centinelas', 'it': 'Sentinelle', 'ja': 'センチネル', 'ko': '센티널', 'pl': 'Sentynele', 'pt': 'Sentinelas', 'ru': 'Сентинелы', 'tc': '哨衛', 'th': 'เซนเติล', 'tr': 'Uyarlıklar', 'uk': 'Сентинели', 'zh': '哨卫'},
    'Show Completed': {'de': 'Erledigte anzeigen', 'es': 'Mostrar completados', 'it': 'Mostra completati', 'ja': '完了済みを表示', 'ko': '완료된 항목 보기', 'pl': 'Pokaż ukończone', 'pt': 'Mostrar concluídos', 'ru': 'Показать завершённые', 'tc': '顯示已完成', 'th': 'แสดงรายการที่เสร็จสิ้น', 'tr': 'Tamamlanmışları Göster', 'uk': 'Показати виконані', 'zh': '显示已完成'},
    'Set': {'de': 'Set', 'es': 'Conjunto', 'it': 'Set', 'ja': 'セット', 'ko': '세트', 'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด', 'tr': 'Set', 'uk': 'Набір', 'zh': '套装'},
    'Details': {'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부 정보', 'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細', 'th': 'รายละเอียด', 'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'},
    'Non-Mastery': {'de': 'Nicht-Meisterschaft', 'es': 'No maestría', 'it': 'Non Maestria', 'ja': '非マスタリー', 'ko': '비마스터리', 'pl': 'Poza Mastery', 'pt': 'Não-Mastery', 'ru': 'Вне мастерства', 'tc': '非掌握', 'th': 'ไม่ใช่ความชำนาญ', 'tr': 'Mastery Dışı', 'uk': 'Не майстерність', 'zh': '非掌控'},
    'Season': {'de': 'Saison', 'es': 'Temporada', 'it': 'Stagione', 'ja': 'シーズン', 'ko': '시즌', 'pl': 'Sezon', 'pt': 'Temporada', 'ru': 'Сезон', 'tc': '賽季', 'th': 'ฤดูกาล', 'tr': 'Sezon', 'uk': 'Сезон', 'zh': '赛季'},
    'Cursor': {'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서', 'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์', 'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光标'},
    'EXP DUCATS': {'de': 'Exp Dukaten', 'es': 'Créditos ducat', 'it': 'Punti ducat', 'ja': 'ダカット経験値', 'ko': '덕트 경험치', 'pl': 'Doświadczenie - Dukaty', 'pt': 'EXP ducats', 'ru': 'Опыт - дукаты', 'tc': 'EXP 賓士', 'th': 'ประสบภูมิ - ดุ๊ก', 'tr': 'Dukat Tecrübesi', 'uk': 'Досвід - дукати', 'zh': '经验值-达克'},
    'EXP PLAT': {'de': 'Exp Platinum', 'es': 'EXP platino', 'it': 'EXP platino', 'ja': 'プラチナ経験値', 'ko': '플래티넘 경험치', 'pl': 'Doświadczenie - Platyny', 'pt': 'EXP platina', 'ru': 'Опыт - платина', 'tc': 'EXP 白金', 'th': 'ประสบภูมิ - แพลตตินัม', 'tr': 'Platiny Tecrübesi', 'uk': 'Досвід - платина', 'zh': '经验值-白金'},
    'Value': {'de': 'Wert', 'es': 'Valor', 'it': 'Valore', 'ja': '値', 'ko': '값', 'pl': 'Wartość', 'pt': 'Valor', 'ru': 'Значение', 'tc': '值', 'th': 'ค่า', 'tr': 'Değer', 'uk': 'Значення', 'zh': '值'},
    'Name': {'de': 'Name', 'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름', 'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ', 'tr': 'İsim', 'uk': 'Ім\'я', 'zh': '名称'},
    'Target': {'de': 'Ziel', 'es': 'Objetivo', 'it': 'Obiettivo', 'ja': '対象', 'ko': '대상', 'pl': 'Cel', 'pt': 'Alvo', 'ru': 'Цель', 'tc': '目標', 'th': 'เป้าหมาย', 'tr': 'Hedef', 'uk': 'Ціль', 'zh': '目标'},
}

# Merge manual translations into T_final
for en_val, trans in MANUAL.items():
    if en_val not in T_final:
        T_final[en_val] = {}
    for lo, val in trans.items():
        if val != en_val and val.strip():
            T_final[en_val][lo] = val

# Apply to locale files
stats = {}
for lo in LOCALES:
    count = 0
    loc_data = locales_data[lo]
    ui = loc_data.get('ui', {})
    
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
        
        # Check if key exists and has EN value
        if key in ui:
            current = ui[key]
            if current == en_val:
                ui[key] = trans_val
                count += 1
    
    loc_data['ui'] = ui
    stats[lo] = count

print("Applied translations per locale:")
for lo in LOCALES:
    print(f"  {lo}: {stats[lo]} entries applied")

# Save locale files
for lo in LOCALES:
    save_locale(lo, locales_data[lo])
print("\nDone!")
