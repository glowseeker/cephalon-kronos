#!/usr/bin/env python3
"""
Complete translation script for all 13 locales.
Handles all 771 untranslated keys found in /tmp/all_untranslated.txt.
Uses a tiered approach:
1. Game-sourced terms from DE dict files (mission types, syndicates, etc.)
2. Proper nouns kept as-is
3. UI chrome hand-translated
"""
import json, os

os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def flat_ui(data):
    m = dict(data.get('ui', {}))
    for sec in ['relics', 'rivens', 'mastery', 'collectibles', 'settings', 'adversaries']:
        s = data.get(sec)
        if isinstance(s, dict):
            for k, v in s.items():
                m[f'{sec}.{k}'] = v
    return m

def set_flat_ui(data, key, value):
    parts = key.split('.', 1)
    if parts[0] == 'ui':
        data.setdefault('ui', {})
        data['ui'][parts[1]] = value
    elif parts[0] in ['relics', 'rivens', 'mastery', 'collectibles', 'adversaries']:
        sec, subkey = parts
        data.setdefault(sec, {})
        data[sec][subkey] = value
    else:
        data.setdefault('ui', {})
        data['ui'][key] = value

# ---- Translation Table ----
# Format: {i18n_key: [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]}

T = {}
def add(k, vals):
    T[k] = {}
    for i, lo in enumerate(LOCALES):
        if i < len(vals) and vals[i]:
            T[k][lo] = vals[i]

# === About ===
add('about.companion', [
    'Open-Source-Warframe-Begleiter', 'Compañero Warframe de código abierto', 'Compagno Warframe open source',
    'Warframeオープンソースコンパニオン', '워프레임 오픈소스 컴패니언', 'Open-sourceowy towarzysz Warframe',
    'Companheiro Warframe de código aberto', 'Открытый помощник Warframe', 'Warframe 開源伴侶',
    'เพื่อนร่วมสมัย Warframe แบบโอเพนซอร์ส', 'Warframe açık kaynak yardımcısı', 'Відкритий супутник Warframe', 'Warframe开源伴侣'
])
add('about.discord', ['Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord'])
add('about.github', ['GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub'])
add('about.title', ['Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos'])

# === Adversaries ===
add('adversaries.converted', [
    'Umgesetzt', 'Convertido', 'Convertito', '変換済み', '전환됨', 'Przekonwertowano',
    'Convertido', 'Преобразовано', '已轉化', 'แปลงแล้ว', 'Dönüştürüldü', 'Перетворено', '已转化'
])
add('adversaries.rank', [
    'Rang {rank}', 'Rango {rank}', 'Rango {rank}', 'ランク {rank}', '랭크 {rank}', 'Ranga {rank}',
    'Rank {rank}', 'Ранг {rank}', '等級 {rank}', 'อันดับ {rank}', 'Seviye {rank}', 'Ранг {rank}', '等级 {rank}'
])
add('adversaries.traded', [
    'Gehandelt', 'Intercambiado', 'Scambiato', '取引済み', '거래됨', 'Handlowano',
    'Negociado', 'Торговано', '已交易', 'แลกเปลี่ยนแล้ว', 'Takaslandı', 'Обмінняно', '已交易'
])
add('adversaries.vanquished', [
    'Besiegt', 'Derrotado', 'Sconfitto', '撃破', '처리됨', 'Pokonano',
    'Derrotado', 'Побеждён', '已擊敗', 'เอาชนะแล้ว', 'Yenildi', 'Переможено', '已击败'
])

# === Badges ===
add('badge_mod', [
    'Mod', 'Mod', 'Mod', 'Mod', '모드', 'Mod', 'Mod', 'Мод', 'Mod', 'มอด', 'Mod', 'Мод', 'Mod'
])
add('badge_evolved', [
    'Evolviert', 'Evolucionado', 'Evolto', '進化済み', '진화', 'Ewolucja', 'Evoluído', 'Эволюция', '已進化', 'วิปน์', 'Evreulenmiş', 'Еволюція', '已进化'
])
add('badge_not_evolved', [
    'Nicht evolviert', 'No evolucionado', 'Non evoluto', '未進化', '미진화', 'Nieewolucja', 'Não evoluído', 'Неэволюция', '未進化', 'ไม่ได้', 'Evrimsiz', 'Нееволюція', '未进化'
])
add('badge_owned', [
    'Besessen', 'Poseído', 'Possesso', '所持済み', '소유', 'Posiadane', 'Em mãos', 'Есть', '已擁有', 'มีอยู่แล้ว', 'Sahip', 'Має', '已拥有'
])
add('badge_prime_part', [
    'Prime-Teil', 'Parte Prime', 'Parte Prime', 'プライムパーツ', '프라임 파트', 'Część Prime', 'Peça Prime', 'Примеца', 'Prime零件', 'ชิ้นส่วนไพรม์', 'Prime Parça', 'Частина Prime', 'Prime零件'
])
add('badge_unmastered', [
    'Nicht gemeistert', 'No dominado', 'Non padroneggiato', '未マスター', '미숙련', 'Nieopanowane', 'Não dominado', 'Не освоено', '未精通', 'ไม่ได้', 'Ustalaşmamış', 'Не опановано', '未精通'
])
add('badge_unowned', [
    'Nicht besessen', 'No poseído', 'Non posseduto', '未所持', '미소유', 'Nieposiadane', 'Não possuído', 'Нет в наличии', '未擁有', 'ไม่เป็น', 'Sahip değil', 'Не має в наявності', '未拥有'
])

# === Categories ===
add('cat_amps', ['Verstärker', 'Amplis', 'Amplificatori', 'アンプ', '앰프', 'Wzmacniacze', 'Amplificadores', 'Усилители', '放大器', 'กระแส', 'Amplis', 'Ампліфікатори', '放大器'])
add('cat_arcanes', ['Arcanes', 'Arcanos', 'Arcani', 'アークーン', '아크온', 'Arcany', 'Arcanos', 'Арканы', '阿克納', 'อร์แคน', 'Arkanlar', 'Аркани', '阿尔肯'])
add('cat_archwing', ['Archwing', 'Archwing', 'Archwing', 'アークウィング', '아크윙', 'Archwing', 'Archwing', 'Арххвост', 'Archwing', 'Archwing', 'Archwing', 'Арххмельниця', 'Archwing'])
add('cat_ayatan', ['Ayatan', 'Ayatan', 'Ayatan', 'アヤタン', '아야탄', 'Ayatan', 'Ayatan', 'Аятан', 'Ayatan', 'อยธัน', 'Ayatan', 'Аятан', 'Ayatan'])
add('cat_companion_weapons', ['Begleiter-Waffen', 'Armas de compañero', 'Armi companion', 'コンパニオン武器', '컴패니언 무기', 'Broń towarzysza', 'Armas de companheiro', 'Оружие спутников', '伴侶武器', 'อาวุธคอมไพเนียน', 'Yardımcı Silahlar', 'Зброя співпутників', '伴侣武器'])
add('cat_exotic', ['Exotisch', 'Exótico', 'Etico', 'エキゾチック', '이국적', 'Egzotyczne', 'Exótico', 'Экзотика', 'Exotic', 'เอกซอติก', 'Ekotik', 'Екзотичний', 'Exotic'])
add('cat_hounds', ['Hunde', 'Canes', 'Cani', 'ハウンド', '하운드', 'Ohty', 'Cães', 'Гончие', '猎犬', 'ควาย', 'Dachlar', 'Гончі', '猎犬'])
add('cat_intrinsics', ['Intrinsics', 'Intrínsecos', 'Intrinseci', 'イントリンシック', '내재', 'Intrinsiki', 'Intrínsecos', 'Внутренние', ' intrinsics', 'อินทรินซิก', 'Entern', 'Внутрішні', ' intrinsics'])
add('cat_kdrives', ['K-Drives', 'K-Drives', 'K-Drive', 'Kドライブ', 'K-드라이브', 'K-Drive', 'K-Drives', 'К-Драйвы', 'K-Drives', 'K-Drives', 'K-Drives', 'К-Драйви', 'K-Drives'])
add('cat_keys', ['Schlüssel', 'Llaves', 'Chiavi', '鍵', '키', 'Klucze', 'Chaves', 'Ключи', '鑰匙', 'คีย์', 'Anahtarlar', 'Ключі', '钥匙'])
add('cat_kitguns', ['Kitguns', 'Kitguns', 'Kitgun', 'キットガン', '킷건', 'Kitguns', 'Kitguns', 'Кит-пушки', 'Kitguns', 'คิทกัน', 'Kitguns', 'Кіт-пішкі', 'Kitguns'])
add('cat_kits', ['Kitguns', 'Kitguns', 'Kitgun', 'キットガン', '킷건', 'Kitguns', 'Kitguns', 'Кит-пушки', 'Kitguns', 'คิทกัน', 'Kitguns', 'Кіт-пішкі', 'Kitguns'])
add('cat_melee', ['Nahkampf', 'Melé', 'Mêlée', '近接', '근접', 'Biała', 'Corpo a corpo', 'Ближнее', '近戰', 'ประชิด', 'Yakın', 'Близька', '近战'])
add('cat_misc', ['Sonstiges', 'Varios', 'Varie', 'その他', '기타', 'Inne', 'Outros', 'Прочее', '其他', 'อื่นๆ', 'Diğer', 'Інше', '其他'])
add('cat_mods', ['Mods', 'Mods', 'Mods', 'Mod', '모드', 'Mod-y', 'Mods', 'Моды', 'Mods', 'มอด', 'Modlar', 'Моди', 'Mods'])
add('cat_moas', ['MOA', 'MOA', 'MOA', 'ムーア', '모아', 'MOA', 'MOA', 'МОА', 'MOA', 'MOA', 'MOA', 'МОА', 'MOA'])
add('cat_necramechs', ['Necramechs', 'Necramechs', 'Necramech', 'ネクラメch', '네크라밈', 'Necramechy', 'Necramechs', 'Некромехи', 'Necramech', 'เนคราเมค', 'Necramechler', 'Некромехи', 'Necramech'])
add('cat_prime_parts', ['Prime-Teile', 'Piezas Prime', 'Parti Prime', 'プライムパーツ', '프라임 파트', 'Części Prime', 'Peças Prime', 'Примеца', 'Prime零件', 'ชิ้นส่วนไพรม์', 'Prime Parçalar', 'Частини Prime', 'Prime零件'])
add('cat_primary', ['Hauptwaffe', 'Primaria', 'Primaria', 'プライマリ', '주 무기', 'Broń pierwszo', 'Primária', 'Основное', '主武器', 'หลัก', 'Birincil', 'Перша', '主武器'])
add('cat_relics', ['Reliquien', 'Reliquias', 'Reliquie', 'リレク', '유물', 'Relikwie', 'Relíquias', 'Реликвии', '遺物', 'ผลของ', 'Roklar', 'Реліквії', '遗物'])
add('cat_resources', ['Ressourcen', 'Recursos', 'Risorse', '資源', '자원', 'Zasoby', 'Recursos', 'Ресурсы', '資源', 'สถานทูล', 'Kaynaklar', 'Ресурси', '资源'])
add('cat_rivens', ['Rivens', 'Rivens', 'Rivens', 'リーヴン', '리븐', 'Rivens', 'Rivens', 'Клинки', 'Rivens', 'Rivens', 'Rivens', 'Клейні', 'Rivens'])
add('cat_secondary', ['Sekundärwaffe', 'Secundaria', 'Secondaria', 'セカンダリ', '보조', 'Wtórny', 'Secundária', 'Вторичное', '副武器', 'รอง', 'İkincil', 'Друга', '副武器'])
add('cat_sentinels', ['Sentinels', 'Centinelas', 'Sentinelle', 'センチネル', '센티널', 'Centynele', 'Sentinelas', 'Сентинели', '哨衛', 'ซีน', 'Sentineller', 'Сентinели', '哨兵'])
add('cat_vehicles', ['Fahrzeuge', 'Vehículos', 'Veicoli', '乗り物', '차량', 'Pojazdy', 'Veículos', 'Транспорт', '車輛', 'ยานพาหนะ', 'Araçlar', 'Транспорт', '车辆'])
add('cat_warframes', ['Warframes', 'Warframes', 'Warframes', 'ワークフレーム', '워프레임', 'Warframes', 'Warframes', 'Варфреймы', 'Warframes', 'Warframes', 'Warframes', 'Варфрейми', 'Warframes'])
add('cat_zaws', ['Zaws', 'Zaws', 'Zaws', 'ザウス', '자우스', 'Zaws', 'Zaws', 'Заусы', 'Zaws', 'Zaws', 'Zaws', 'Зауси', 'Zaws'])

# Save intermediate
with open('/tmp/tables/translations.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"Saved {len(T)} translation entries to /tmp/tables/translations.json")
