#!/usr/bin/env python3
"""
FINAL REWRITE — implements Claude's two-path architecture.

Path A (game-sourced):  convert locale values to {"gameKey": "/Lotus/..."} refs.
  t() resolves them at runtime from dict.{locale}.json. No manual translation,
  no fallback — missing dict key = flagged data problem.

Path B (UI-authored):   write real per-locale translations for genuinely
  translatable UI strings. Universal terms (proper nouns, format strings,
  abbreviations) stay EN — that IS the correct value in every locale.

Applies to all 15 files: en, fr, de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
ALL = ['en', 'fr'] + LOCALES

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

d_en = load_json(f'{RESOURCES}/dict.en.json')
dicts = {lo: load_json(f'{RESOURCES}/dict.{lo}.json') for lo in LOCALES}

# ── PATH A: gameKey refs ──────────────────────────────────────────────────────
# key -> Lotus dict path. Only paths verified to exist in ALL 14 locale dicts.
GAME_KEY_MAP = {
    # Locations
    'ui.dashboard.deimos': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosName',
    'ui.dashboard.cetus': '/Lotus/Language/Locations/CetusHub',
    'ui.dashboard.cavia': '/Lotus/Language/EntratiLab/EntratiGeneral/EntratiLabSyndicateName',
    'ui.dashboard.zariman': '/Lotus/Language/Zariman/ZarimanRegionName',
    'ui.dashboard.timers_cetus': '/Lotus/Language/Locations/CetusHub',
    'ui.dashboard.timers_duviri': '/Lotus/Language/Locations/Duviri',
    'ui.dashboard.timers_zariman': '/Lotus/Language/Zariman/ZarimanRegionName',
    'ui.dashboard.the_circuit': '/Lotus/Language/Missions/MissionName_EndlessDuviri',
    'ui.elements.void': '/Lotus/Language/Locations/Void',
    'collectibles.category.fortuna': '/Lotus/Language/Locations/SolarisUnitedHub',
    'collectibles.category.necralisk': '/Lotus/Language/InfestedMicroplanet/SolarMapDeimosHubName',
    # Relic eras
    'ui.notif_mgr.tier_lith': '/Lotus/Language/Relics/Era_LITH',
    'ui.notif_mgr.tier_meso': '/Lotus/Language/Relics/Era_MESO',
    'ui.notif_mgr.tier_neo': '/Lotus/Language/Relics/Era_NEO',
    'ui.notif_mgr.tier_axi': '/Lotus/Language/Relics/Era_AXI',
    'ui.notif_mgr.tier_requiem': '/Lotus/Language/Relics/Era_REQUIEM',
    'ui.notif_mgr.tier_omnia': '/Lotus/Language/Relics/Era_OMNI',
    # Mission types
    'ui.notif_mgr.mtype_capture': '/Lotus/Language/Missions/MissionName_Capture',
    'ui.notif_mgr.mtype_extermination': '/Lotus/Language/Missions/MissionName_Exterminate',
    'ui.notif_mgr.mtype_interception': '/Lotus/Language/Missions/MissionName_Territory',
    'ui.notif_mgr.mtype_sabotage': '/Lotus/Language/Missions/MissionName_Sabotage',
    'ui.dashboard.descendia_mission_type_dt_capture': '/Lotus/Language/Missions/MissionName_Capture',
    'ui.dashboard.descendia_mission_type_dt_excavation': '/Lotus/Language/Missions/MissionName_Excavation',
    # Mastery ranks
    'mastery.title_novice': '/Lotus/Language/Challenges/Challenge_PlayerRank4_Name',
    'mastery.title_disciple': '/Lotus/Language/Challenges/Challenge_PlayerRank7_Name',
    'mastery.title_tiger': '/Lotus/Language/Challenges/Challenge_PlayerRank19_Name',
    'mastery.title_dragon': '/Lotus/Language/Challenges/Challenge_PlayerRank22_Name',
    'mastery.title_sage': '/Lotus/Language/Challenges/Challenge_PlayerRank25_Name',
    # Items / currencies / vendors
    'ui.comp.forma': '/Lotus/Language/Items/Forma',
    'ui.inventory.forma': '/Lotus/Language/Items/Forma',
    'ui.inventory.forma_umbra': '/Lotus/Language/Sacrifice/UmbraAvatarName',
    'ui.inventory.endo': '/Lotus/Language/Items/FusionBundle',
    'ui.inventory.filter_sniper': '/Lotus/Language/Items/SniperCategoryName',
    'ui.dashboard.baro_kiteer': '/Lotus/Language/G1Quests/VoidTraderName',
    'checklist.task_baro': '/Lotus/Language/G1Quests/VoidTraderName',
    'checklist.trader': '/Lotus/Language/G1Quests/VoidTraderName',
    'ui.checklist.trader': '/Lotus/Language/G1Quests/VoidTraderName',
    # Category names (game-localized)
    'mastery.cat_amp': '/Lotus/Language/Items/OperatorVoidBeam',
    'mastery.cat_kdrive': '/Lotus/Language/Game/CrpHoverboardName',
    'mastery.cat_archwing': '/Lotus/Language/G1Quests/AWQName',
    'mods.cat_parazon': '/Lotus/Language/Emotes/ParazonEmoteName',
    'mods.cat_railjack': '/Lotus/Language/CrewShip/Hull_RailJack',
    'filter_kdrive': '/Lotus/Language/Game/CrpHoverboardName',
    'ui.inventory.filter_kdrive': '/Lotus/Language/Game/CrpHoverboardName',
    'ui.inventory.cat_kdrives': '/Lotus/Language/Game/CrpHoverboardName',
    'cat_kdrives': '/Lotus/Language/Game/CrpHoverboardName',
    'collectibles.category.frame_fighter': '/Lotus/Language/Menu/FighterTitle',
    # Nightwave
    'ui.dashboard.nightwave': '/Lotus/Language/Syndicates/RadioLegionTitle',
    'ui.dashboard.card_nightwave': '/Lotus/Language/Syndicates/RadioLegionTitle',
}

# Verify every gameKey path exists in all 14 dicts (data integrity gate)
print("=== gameKey path verification ===")
bad = []
for key, path in GAME_KEY_MAP.items():
    missing = [lo for lo in LOCALES if path not in dicts[lo]]
    if path not in d_en:
        missing.insert(0, 'en')
    if missing:
        bad.append((key, path, missing))
if bad:
    print("FAILED paths:")
    for k, p, m in bad:
        print(f"  {k}: {p} missing in {m}")
else:
    print(f"All {len(GAME_KEY_MAP)} gameKey paths exist in all 15 dicts ✓")

# ── PATH B: UI-authored translations ──────────────────────────────────────────
# EN value -> {locale: translation}. Applied ONLY where the locale still shows EN.
# These are real UI strings (headers, labels, sentences) with no dict source.
PATH_B = {
    'SP Incursions': {
        'de': 'SP-Einfälle', 'es': 'Incursiones SP', 'it': 'Incursioni SP',
        'ja': 'SP 侵入', 'ko': '스틸 패스 침입', 'pl': 'Incydenty SP',
        'pt': 'Incursões SP', 'ru': 'SP рейды', 'tc': 'SP 入侵',
        'th': 'การบุก SP', 'tr': 'SP Baskınları', 'uk': 'SP Вторгнення', 'zh': 'SP 入侵',
    },
    'Credits': {
        'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クレジット',
        'ko': '크레딧', 'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты',
        'tc': '現金', 'th': 'เครดิต', 'tr': 'Kredi', 'uk': 'Кредити', 'zh': '现金',
    },
    'Mod': {
        'de': 'Mod', 'es': 'Mod', 'it': 'Modulo', 'ja': 'モッド', 'ko': '모드',
        'pl': 'Mod', 'pt': 'Mod', 'ru': 'Мод', 'tc': 'MOD', 'th': 'มอด',
        'tr': 'Mod', 'uk': 'Мод', 'zh': 'MOD',
    },
    'Cursor': {
        'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore', 'ja': 'カーソル', 'ko': '커서',
        'pl': 'Kursor', 'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標', 'th': 'เคอร์เซอร์',
        'tr': 'İmleç', 'uk': 'Курсор', 'zh': '光标',
    },
    'Details': {
        'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli', 'ja': '詳細', 'ko': '세부정보',
        'pl': 'Szczegóły', 'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細', 'th': 'รายละเอียด',
        'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情',
    },
    'Name': {
        'de': 'Name', 'es': 'Nombre', 'it': 'Nome', 'ja': '名前', 'ko': '이름',
        'pl': 'Nazwa', 'pt': 'Nome', 'ru': 'Имя', 'tc': '名稱', 'th': 'ชื่อ',
        'tr': 'İsim', 'uk': "Ім'я", 'zh': '名称',
    },
    'Set': {
        'de': 'Set', 'es': 'Conjunto', 'it': 'Insieme', 'ja': 'セット', 'ko': '세트',
        'pl': 'Zestaw', 'pt': 'Conjunto', 'ru': 'Набор', 'tc': '套裝', 'th': 'ชุด',
        'tr': 'Set', 'uk': 'Набір', 'zh': '套装',
    },
    'Updates': {
        'de': 'Updates', 'es': 'Actualizaciones', 'it': 'Aggiornamenti', 'ja': '更新情報', 'ko': '업데이트',
        'pl': 'Aktualizacje', 'pt': 'Atualizações', 'ru': 'Обновления', 'tc': '更新', 'th': 'อัปเดต',
        'tr': 'Güncellemeler', 'uk': 'Оновлення', 'zh': '更新',
    },
    'Tiger': {
        'de': 'Tiger', 'es': 'Tigre', 'it': 'Tigre', 'ja': 'タイガー', 'ko': '타이거',
        'pl': 'Tygrys', 'pt': 'Tigre', 'ru': 'Тигр', 'tc': '老虎', 'th': 'เสือ',
        'tr': 'Kaplan', 'uk': 'Тигр', 'zh': '老虎',
    },
    'Warm': {
        'de': 'Warm', 'es': 'Cálido', 'it': 'Caldo', 'ja': '暖', 'ko': '따뜻',
        'pl': 'Ciepło', 'pt': 'Quente', 'ru': 'Тепло', 'tc': '溫暖', 'th': 'อุ่น',
        'tr': 'Sıcak', 'uk': 'Тепло', 'zh': '温暖',
    },
    'Winter': {
        'de': 'Winter', 'es': 'Invierno', 'it': 'Inverno', 'ja': '冬', 'ko': '겨울',
        'pl': 'Zima', 'pt': 'Inverno', 'ru': 'Зима', 'tc': '冬', 'th': 'ฤดูหนาว',
        'tr': 'Kış', 'uk': 'Зима', 'zh': '冬',
    },
    'N/A': {
        'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': '該当なし', 'ko': '해당 없음',
        'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '無', 'th': 'ไม่มี',
        'tr': 'Yok', 'uk': 'Н/Д', 'zh': '无',
    },
    'Visible': {
        'de': 'Sichtbar', 'es': 'Visible', 'it': 'Visibile', 'ja': '表示', 'ko': '표시',
        'pl': 'Widoczny', 'pt': 'Visível', 'ru': 'Видимый', 'tc': '顯示', 'th': 'แสดง',
        'tr': 'Görünür', 'uk': 'Видимий', 'zh': '显示',
    },
    'Missions': {
        'de': 'Missionen', 'es': 'Misiones', 'it': 'Missioni', 'ja': 'ミッション', 'ko': '미션',
        'pl': 'Misje', 'pt': 'Missões', 'ru': 'Миссии', 'tc': '任務', 'th': 'ภารกิจ',
        'tr': 'Görevler', 'uk': 'Місії', 'zh': '任务',
    },
    'Sources': {
        'de': 'Quellen', 'es': 'Fuentes', 'it': 'Fonti', 'ja': '入手先', 'ko': '획득처',
        'pl': 'Źródła', 'pt': 'Fontes', 'ru': 'Источники', 'tc': '來源', 'th': 'แหล่งที่มา',
        'tr': 'Kaynaklar', 'uk': 'Джерела', 'zh': '来源',
    },
    'Optimal': {
        'de': 'Optimal', 'es': 'Óptimo', 'it': 'Ottimale', 'ja': '最適', 'ko': '최적',
        'pl': 'Optymalny', 'pt': 'Ótimo', 'ru': 'Оптимальный', 'tc': '最佳', 'th': 'เหมาะสมที่สุด',
        'tr': 'Optimal', 'uk': 'Оптимальний', 'zh': '最佳',
    },
    'Standard': {
        'de': 'Standard', 'es': 'Estándar', 'it': 'Standard', 'ja': '標準', 'ko': '표준',
        'pl': 'Standardowy', 'pt': 'Padrão', 'ru': 'Стандартный', 'tc': '標準', 'th': 'มาตรฐาน',
        'tr': 'Standart', 'uk': 'Стандартний', 'zh': '标准',
    },
    'Normal': {
        'de': 'Normal', 'es': 'Normal', 'it': 'Normale', 'ja': 'ノーマル', 'ko': '노말',
        'pl': 'Normalny', 'pt': 'Normal', 'ru': 'Обычный', 'tc': '普通', 'th': 'ปกติ',
        'tr': 'Normal', 'uk': 'Звичайний', 'zh': '普通',
    },
    'Unique': {
        'de': 'Einzigartig', 'es': 'Único', 'it': 'Unico', 'ja': 'ユニーク', 'ko': '유니크',
        'pl': 'Unikalny', 'pt': 'Único', 'ru': 'Уникальный', 'tc': '獨特', 'th': 'พิเศษ',
        'tr': 'Benzersiz', 'uk': 'Унікальний', 'zh': '独特',
    },
    'Volatile': {
        'de': 'Flüchtig', 'es': 'Volátil', 'it': 'Volatile', 'ja': '揮発性', 'ko': '휘발성',
        'pl': 'Lotny', 'pt': 'Volátil', 'ru': 'Летучий', 'tc': '揮發性', 'th': 'ระเหย',
        'tr': 'Uçucu', 'uk': 'Леткий', 'zh': '易爆',
    },
    'Mobile Interception': {
        'de': 'Mobile Abfangmission', 'es': 'Intercepción móvil', 'it': 'Intercettazione mobile',
        'ja': '移動式傍受', 'ko': '이동식 감청', 'pl': 'Mobilna intercepcja', 'pt': 'Interceptação móvel',
        'ru': 'Мобильное перехватывание', 'tc': '移動攔截', 'th': 'การสกัดกั้นเคลื่อนที่',
        'tr': 'Mobil Önleme', 'uk': 'Мобільне перехоплення', 'zh': '移动拦截',
    },
    'Descendia': {
        'de': 'Descendia', 'es': 'Descendia', 'it': 'Descendia', 'ja': 'ディセンドリア',
        'ko': '디센디아', 'pl': 'Descendia', 'pt': 'Descendia', 'ru': 'Десцендия',
        'tc': '深淵之旅', 'th': 'ดีเซนเดีย', 'tr': 'Descendia', 'uk': 'Десцендія', 'zh': '深渊之旅',
    },
    'Archimedea': {
        'de': 'Archimedea', 'es': 'Archimedea', 'it': 'Archimedea', 'ja': 'アルキメデア',
        'ko': '아르키메데아', 'pl': 'Archimedea', 'pt': 'Archimedea', 'ru': 'Архимедея',
        'tc': '阿基米德', 'th': 'อาร์คิมิดีอา', 'tr': 'Archimedea', 'uk': 'Архімедея', 'zh': '阿基米德',
    },
    'Temporal Archimedea': {
        'de': 'Zeitliche Archimedea', 'es': 'Archimedea Temporal', 'it': 'Archimedea Temporale',
        'ja': '時間のアルキメデア', 'ko': '시간의 아르키메데아', 'pl': 'Czasowa Archimedea',
        'pt': 'Archimedea Temporal', 'ru': 'Временная Архимедея', 'tc': '時間阿基米德',
        'th': 'อาร์คิมิดีอาจำกัดเวลา', 'tr': 'Zamansal Archimedea', 'uk': 'Часова Архімедея', 'zh': '时间阿基米德',
    },
    'Loid: Voca': {
        'de': 'Loid: Voca', 'es': 'Loid: Voca', 'it': 'Loid: Voca', 'ja': 'ロイド: ヴォカ',
        'ko': '로이드: 보카', 'pl': 'Loid: Voca', 'pt': 'Loid: Voca', 'ru': 'Лоид: Вока',
        'tc': 'Loid：Voca', 'th': 'ลอยด์: โวคา', 'tr': 'Loid: Voca', 'uk': 'Лоїд: Вока', 'zh': 'Loid：Voca',
    },
    'Vampyric Liminus': {
        'de': 'Vampyrischer Liminus', 'es': 'Liminus vampírico', 'it': 'Liminus vampirico',
        'ja': 'ヴァンパイア・リミナス', 'ko': '흡혈 리미누스', 'pl': 'Wampiryczny Liminus',
        'pt': 'Liminus vampírico', 'ru': 'Вампирический Лиминус', 'tc': '嗜血林尼穆斯',
        'th': 'ลิมินัสแวมไพร์', 'tr': 'Vampir Liminus', 'uk': 'Вампіричний Лімінус', 'zh': '嗜血林尼穆斯',
    },
    'Unique mission objective.': {
        'de': 'Einzigartiges Missionsziel.', 'es': 'Objetivo de misión único.', 'it': 'Obiettivo di missione unico.',
        'ja': '特別なミッション目標。', 'ko': '특별한 미션 목표.', 'pl': 'Unikalny cel misji.',
        'pt': 'Objetivo de missão único.', 'ru': 'Уникальная цель миссии.', 'tc': '獨特任務目標。',
        'th': 'วัตถุประสงค์ภารกิจพิเศษ', 'tr': 'Benzersiz görev hedefi.', 'uk': 'Унікальна мета місії.', 'zh': '独特任务目标。',
    },
    'Loot containers within time limit.': {
        'de': 'Plündere Behälter innerhalb des Zeitlimits.', 'es': 'Saquea contenedores dentro del límite de tiempo.',
        'it': 'Saccheggia i contenitori entro il limite di tempo.', 'ja': '時間内にコンテナを略奪せよ。',
        'ko': '시간 제한 안에 컨테이너를 약탈하세요.', 'pl': 'Zrabuj pojemniki w limicie czasu.',
        'pt': 'Saqueeie os contêineres dentro do limite de tempo.', 'ru': 'Разграбите контейнеры за отведенное время.',
        'tc': '在時間限制內掠奪容器。', 'th': 'ปล้นภาชนะภายในเวลาที่กำหนด', 'tr': 'Süre sınırı içinde konteynerleri yağmala.',
        'uk': 'Пограбуйте контейнери за відведений час.', 'zh': '在时间限制内掠夺容器。',
    },
    'Kill marked Necramites that periodically spawn.': {
        'de': 'Töte markierte Necramiten, die regelmäßig erscheinen.', 'es': 'Mata a los Necramitas marcados que aparecen periódicamente.',
        'it': 'Uccidi i Necramiti marcati che compaiono periodicamente.', 'ja': '定期的に出現するマークされたネクラマイトを倒せ。',
        'ko': '주기적으로 나타나는 표시된 네크라마이트를 처치하세요.', 'pl': 'Zabij oznakowane Necramity, które pojawiają się okresowo.',
        'pt': 'Mate os Necramitas marcados que aparecem periodicamente.', 'ru': 'Убивайте отмеченных Некрамитов, которые периодически появляются.',
        'tc': '擊殺定期出現的標記亡骸蟲。', 'th': 'ฆ่าเนคราไมต์ที่ถูกทำเครื่องหมายซึ่งปรากฏเป็นระยะ',
        'tr': 'Periyodik olarak beliren işaretli Necramite\'ları öldür.', 'uk': 'Вбивайте позначених Некрамітів, які періодично з\'являються.',
        'zh': '击杀定期出现的标记殁世虫。',
    },
    'Necramech': {
        'de': 'Necramech', 'es': 'Necramech', 'it': 'Necramech', 'ja': 'ネクロメック',
        'ko': '네크라메크', 'pl': 'Necramech', 'pt': 'Necramech', 'ru': 'Некрамех',
        'tc': '亡骸機', 'th': 'เนคราเมค', 'tr': 'Necramech', 'uk': 'Некрамех', 'zh': '殁世机',
    },
    'Necramechs': {
        'de': 'Necramechs', 'es': 'Necramechs', 'it': 'Necramech', 'ja': 'ネクロメック',
        'ko': '네크라메크', 'pl': 'Necramechy', 'pt': 'Necramechs', 'ru': 'Некрамехи',
        'tc': '亡骸機', 'th': 'เนคราเมค', 'tr': 'Necramechler', 'uk': 'Некрамехи', 'zh': '殁世机',
    },
}

# ── Load all locale files ─────────────────────────────────────────────────────
locale_data = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in ALL}

# ── Apply Path A: gameKey refs ────────────────────────────────────────────────
print("\n=== Path A: converting to gameKey refs ===")
path_a_stats = {}
for key, path in GAME_KEY_MAP.items():
    count = 0
    for lo in ALL:
        data = locale_data[lo]
        # key may be in ui section OR a top-level flattened section (mastery., collectibles., checklist., mods.)
        ui = data.get('ui', {})
        if key in ui:
            ui[key] = {'gameKey': path}
            count += 1
        elif '.' in key:
            section, sub = key.split('.', 1)
            if section in data and isinstance(data[section], dict) and sub in data[section]:
                data[section][sub] = {'gameKey': path}
                count += 1
    path_a_stats[key] = count
    if count < 15:
        print(f"  WARN {key}: applied to {count}/15 files")

# ── Apply Path B: translations where still EN ─────────────────────────────────
print("\n=== Path B: writing translations ===")
path_b_stats = {}
for en_val, translations in PATH_B.items():
    applied = 0
    for lo in LOCALES:
        data = locale_data[lo]
        ui = data.get('ui', {})
        # top-level ui section
        for k, v in list(ui.items()):
            if v == en_val and k not in GAME_KEY_MAP:
                ui[k] = translations.get(lo, en_val)
                applied += 1
        # flattened section keys: section.key pattern
        for section in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries', 'checklist', 'mods', 'inventory', 'riven_card']:
            if section in data and isinstance(data[section], dict):
                for k, v in list(data[section].items()):
                    full = f'{section}.{k}'
                    if v == en_val and full not in GAME_KEY_MAP:
                        data[section][k] = translations.get(lo, en_val)
                        applied += 1
    path_b_stats[en_val] = applied
    print(f"  {en_val!r}: applied {applied} values")

# ── Save ──────────────────────────────────────────────────────────────────────
for lo in ALL:
    save_locale(lo, locale_data[lo])
print("\nSaved all 15 locale files.")
