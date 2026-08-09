#!/usr/bin/env python3
"""
FIX remaining English relics/rivens section values in TC/TH/TR/ZH/JA/KO/PL.
These sections are flattened by UiContext, so t() resolves them directly.
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

# relics section translations (EN -> per-locale)
RELICS = {
    'sorting_by': {'de': 'Sortieren nach', 'es': 'Ordenar por', 'it': 'Ordina per', 'ja': '並び替え',
                   'ko': '정렬 기준', 'pl': 'Sortuj według', 'pt': 'Ordenar por', 'ru': 'Сортировка',
                   'tc': '排序方式', 'th': 'เรียงตาม', 'tr': 'Sıralama', 'uk': 'Сортування', 'zh': '排序方式'},
    'target': {'de': 'Ziel', 'es': 'Objetivo', 'it': 'Obiettivo', 'ja': '目標',
               'ko': '목표', 'pl': 'Cel', 'pt': 'Objetivo', 'ru': 'Цель',
               'tc': '目標', 'th': 'เป้าหมาย', 'tr': 'Hedef', 'uk': 'Ціль', 'zh': '目标'},
    'owned': {'de': 'Besessen:', 'es': 'En posesión:', 'it': 'Possesso:', 'ja': '所持:',
              'ko': '보유:', 'pl': 'Posiadany:', 'pt': 'Possuído:', 'ru': 'В наличии:',
              'tc': '持有:', 'th': 'เป็นเจ้าของ:', 'tr': 'Sahip olunan:', 'uk': 'У володінні:', 'zh': '持有:'},
    'other': {'de': 'Sonstiges', 'es': 'Otros', 'it': 'Altro', 'ja': 'その他',
              'ko': '기타', 'pl': 'Inne', 'pt': 'Outros', 'ru': 'Другое',
              'tc': '其他', 'th': 'อื่นๆ', 'tr': 'Diğer', 'uk': 'Інше', 'zh': '其他'},
    'squad': {'de': 'Gruppe', 'es': 'Escuadrón', 'it': 'Squad', 'ja': '分隊',
              'ko': '분대', 'pl': 'Squad', 'pt': 'Esquadrilha', 'ru': 'Отряд',
              'tc': '小隊', 'th': 'หน่วย', 'tr': 'Tabur', 'uk': 'Загін', 'zh': '小队'},
    'era': {'de': 'Epoche:', 'es': 'Época:', 'it': 'Epoca:', 'ja': '時代:',
            'ko': '시대:', 'pl': 'Era:', 'pt': 'Era:', 'ru': 'Эра:',
            'tc': '時代:', 'th': 'ยุค:', 'tr': 'Çağ:', 'uk': 'Ера:', 'zh': '时代:'},
    'subtitle': {'de': 'Relikt-Sammlung und Bewertung', 'es': 'Colección y valoración de reliquias',
                 'it': 'Collezione e valutazione di reliqui', 'ja': '遺物コレクションと評価',
                 'ko': '성유물 컬렉션 및 평가', 'pl': 'Kolekcja i wycena reliktów',
                 'pt': 'Coleção e avaliação de relíquias', 'ru': 'Коллекция реликвий и оценка',
                 'tc': '遺物收藏與估值', 'th': 'คอลเลกชันรีลิกและการประเมิน',
                 'tr': 'Kalıntı koleksiyonu ve değerleme', 'uk': 'Колекція реліквій та оцінка', 'zh': '遗物收藏与估值'},
}

# rivens section translations
RIVENS = {
    'state_veiled': {'de': 'Verhüllt', 'es': 'Velado', 'it': 'Velato', 'ja': 'ベール付き',
                     'ko': '베일', 'pl': 'Zasłonięty', 'pt': 'Velado', 'ru': 'Завуалированный',
                     'tc': '未揭曉', 'th': 'คลุม', 'tr': 'Gizli', 'uk': 'Завуальований', 'zh': '未揭晓'},
    'state_challenge': {'de': 'Herausforderung', 'es': 'Desafío', 'it': 'Sfida', 'ja': 'チャレンジ',
                        'ko': '도전', 'pl': 'Wyzwanie', 'pt': 'Desafio', 'ru': 'Испытание',
                        'tc': '挑戰', 'th': 'ความท้าทาย', 'tr': 'Meydan Okuma', 'uk': 'Випробування', 'zh': '挑战'},
    'sort_grade': {'de': 'Note', 'es': 'Nota', 'it': 'Voto', 'ja': '評価',
                   'ko': '등급', 'pl': 'Notatka', 'pt': 'Nota', 'ru': 'Оценка',
                   'tc': '等級', 'th': 'เกรด', 'tr': 'Not', 'uk': 'Оцінка', 'zh': '等级'},
    'state_unveiled': {'de': 'Entschleiert', 'es': 'Revelado', 'it': 'Svelato', 'ja': 'ベール解除',
                       'ko': '베일 해제', 'pl': 'Odsłonięty', 'pt': 'Revelado', 'ru': 'Раскрытый',
                       'tc': '已揭曉', 'th': 'เปิดเผยแล้ว', 'tr': 'Açık', 'uk': 'Розкритий', 'zh': '已揭晓'},
}

applied = 0
for lo in LOCALES:
    # relics
    rel = locale_files[lo].setdefault('relics', {})
    for k, trans in RELICS.items():
        # only replace if still English (ascii only)
        cur = rel.get(k)
        if isinstance(cur, str) and cur and all(ord(c) < 128 for c in cur):
            rel[k] = trans[lo]
            applied += 1
    # rivens
    riv = locale_files[lo].setdefault('rivens', {})
    for k, trans in RIVENS.items():
        cur = riv.get(k)
        if isinstance(cur, str) and cur and all(ord(c) < 128 for c in cur):
            riv[k] = trans[lo]
            applied += 1

for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print(f"Applied {applied} section fixes")
