#!/usr/bin/env python3
"""
FIX mods.cat_* values across all 13 locales.
The ModCard now renders category via t(`mods.cat_${cat.toLowerCase()}`), so these
keys must be correct. Also fixes wrong TR values ('Sebat', 'Arkap').
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# Category translations per locale (UI labels for mod categories)
# Uses vocabulary consistent with ui.inventory.cat_* where possible
CATS = {
    'primary': {'de': 'Primär', 'es': 'Principal', 'it': 'Primaria', 'ja': '主武器',
                'ko': '주무기', 'pl': 'Główna', 'pt': 'Primária', 'ru': 'Основное',
                'tc': '主武器', 'th': 'อาวุธหลัก', 'tr': 'Birincil', 'uk': 'Основна', 'zh': '主武器'},
    'secondary': {'de': 'Sekundär', 'es': 'Secundaria', 'it': 'Secondaria', 'ja': '副武器',
                  'ko': '보조무기', 'pl': 'Boczna', 'pt': 'Secundária', 'ru': 'Вторичное',
                  'tc': '副武器', 'th': 'อาวุธรอง', 'tr': 'İkincil', 'uk': 'Другорядна', 'zh': '副武器'},
    'melee': {'de': 'Nahkampf', 'es': 'Cuerpo a cuerpo', 'it': 'Mischia', 'ja': '近接',
              'ko': '근접', 'pl': 'Walka wręcz', 'pt': 'Corpo a corpo', 'ru': 'Ближний бой',
              'tc': '近戰', 'th': 'ประชิด', 'tr': 'Yakın Dövüş', 'uk': 'Ближній бій', 'zh': '近战'},
    'warframe': {'de': 'Warframe', 'es': 'Warframe', 'it': 'Warframe', 'ja': 'Warframe',
                 'ko': '워프레임', 'pl': 'Warframe', 'pt': 'Warframe', 'ru': 'Варфрейм',
                 'tc': 'Warframe', 'th': 'วอร์เฟรม', 'tr': 'Warframe', 'uk': 'Варфрейм', 'zh': '战甲'},
    'sentinels': {'de': 'Sentinelen', 'es': 'Centinelas', 'it': 'Sentinelle', 'ja': 'センチネル',
                  'ko': '센티널', 'pl': 'Sentyndusze', 'pt': 'Sentinelas', 'ru': 'Сентинелы',
                  'tc': '哨衛', 'th': 'เซนติเนล', 'tr': 'Sentineller', 'uk': 'Сентинели', 'zh': '哨卫'},
    'beasts': {'de': 'Bestien', 'es': 'Bestias', 'it': 'Bestie', 'ja': 'ビースト',
               'ko': '야수', 'pl': 'Bestie', 'pt': 'Bestas', 'ru': 'Звери',
               'tc': '野獸', 'th': 'สัตว์', 'tr': 'Yaratıklar', 'uk': 'Звірі', 'zh': '野兽'},
    'stance': {'de': 'Haltung', 'es': 'Postura', 'it': 'Posizione', 'ja': '構え',
               'ko': '자세', 'pl': 'Postawa', 'pt': 'Postura', 'ru': 'Стойка',
               'tc': '架式', 'th': 'ท่าทาง', 'tr': 'Duruş', 'uk': 'Стійка', 'zh': '架势'},
    'aura': {'de': 'Aura', 'es': 'Aura', 'it': 'Aura', 'ja': 'オーラ',
             'ko': '아우라', 'pl': 'Aura', 'pt': 'Aura', 'ru': 'Аура',
             'tc': '光環', 'th': 'ออร่า', 'tr': 'Aura', 'uk': 'Аура', 'zh': '光环'},
    'exilus': {'de': 'Exilus', 'es': 'Exilus', 'it': 'Exilus', 'ja': 'エクシラス',
               'ko': '엑실루스', 'pl': 'Exilus', 'pt': 'Exilus', 'ru': 'Эксилус',
               'tc': 'Exilus', 'th': 'เอกซิลัส', 'tr': 'Exilus', 'uk': 'Ексілюс', 'zh': '埃克赛斯'},
    'railjack': {'de': 'Railjack', 'es': 'Railjack', 'it': 'Railjack', 'ja': 'レールジャック',
                 'ko': '레일잭', 'pl': 'Railjack', 'pt': 'Railjack', 'ru': 'Рейлджек',
                 'tc': '銳捷號', 'th': 'เรลแจ็ค', 'tr': 'Railjack', 'uk': 'Рейкоджек', 'zh': '锐捷号'},
    'archgun': {'de': 'Archkanone', 'es': 'Archcañón', 'it': 'Archsparo', 'ja': 'アークガン',
                'ko': '아크건', 'pl': 'Archgun', 'pt': 'Archgun', 'ru': 'Аркган',
                'tc': '空戰主武器', 'th': 'อาร์คกัน', 'tr': 'Archgun', 'uk': 'Аркган', 'zh': '空战主武器'},
    'archmelee': {'de': 'Arch-Nahkampf', 'es': 'Archcuerpo a cuerpo', 'it': 'Archmischia', 'ja': 'アーク近接',
                  'ko': '아크 근접', 'pl': 'Archbroń biała', 'pt': 'Archcorpo a corpo', 'ru': 'Арк-ближний бой',
                  'tc': '空戰近戰', 'th': 'อาร์คประชิด', 'tr': 'Arch Yakın Dövüş', 'uk': 'Арк-ближній бій', 'zh': '空战近战'},
    'parazon': {'de': 'Parazon', 'es': 'Parazón', 'it': 'Parazon', 'ja': 'パラゾン',
                'ko': '파라존', 'pl': 'Parazon', 'pt': 'Parazon', 'ru': 'Паразон',
                'tc': '萬靈袖刃', 'th': 'พาราซอน', 'tr': 'Parazon', 'uk': 'Паразон', 'zh': '万灵袖刃'},
    'augment': {'de': 'Augment', 'es': 'Mejora', 'it': 'Potenziamento', 'ja': 'オーグメント',
                'ko': '증강', 'pl': 'Wzmocnienie', 'pt': 'Aprimoramento', 'ru': 'Улучшение',
                'tc': '強化', 'th': 'เสริม', 'tr': 'Artırım', 'uk': 'Аугмент', 'zh': '增强'},
    'antique': {'de': 'Antik', 'es': 'Antiguo', 'it': 'Antico', 'ja': 'アンティーク',
                'ko': '고대', 'pl': 'Antyk', 'pt': 'Antigo', 'ru': 'Антикварный',
                'tc': '古物', 'th': 'โบราณ', 'tr': 'Antik', 'uk': 'Антикваріат', 'zh': '古董'},
    'vehicles': {'de': 'Fahrzeuge', 'es': 'Vehículos', 'it': 'Veicoli', 'ja': '乗り物',
                 'ko': '차량', 'pl': 'Pojazdy', 'pt': 'Veículos', 'ru': 'Транспорт',
                 'tc': '載具', 'th': 'ยานพาหนะ', 'tr': 'Araçlar', 'uk': 'Транспорт', 'zh': '载具'},
    'arcanes': {'de': 'Arkanen', 'es': 'Arcanos', 'it': 'Arcani', 'ja': 'アルケイン',
                'ko': '아케인', 'pl': 'Arkany', 'pt': 'Arcanos', 'ru': 'Арканы',
                'tc': '賦能', 'th': 'อาร์เคน', 'tr': 'Arkanlar', 'uk': 'Аркани', 'zh': '赋能'},
    'peculiar': {'de': 'Sonderbar', 'es': 'Peculiar', 'it': 'Peculiare', 'ja': 'ペキュリア',
                 'ko': '기이한', 'pl': 'Osobliwy', 'pt': 'Peculiar', 'ru': 'Особый',
                 'tc': '奇特', 'th': 'แปลกประหลาด', 'tr': 'Tuhaf', 'uk': 'Особливий', 'zh': '奇特'},
}

applied = 0
for lo in LOCALES:
    ui = locale_files[lo]['ui']
    for cat, trans in CATS.items():
        key = f'mods.cat_{cat}'
        if cat == 'railjack' or cat == 'parazon':
            continue  # gameKey refs, leave as-is
        ui[key] = trans[lo]
        applied += 1

for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print(f"Applied {applied} mods.cat_* fixes")
