#!/usr/bin/env python3
"""
ADD missing rivenStats keys (used by the 1999 Calendar CET_UPGRADE events).
The parser resolves these via i18nData.rivenStats[key]; when missing, English
shows. Add to all 14 locale files (en, fr, 13).
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
ALL = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

# Translations per key, per locale
NEW_STATS = {
    'Armor': {
        'en': 'Armor', 'fr': 'Armure', 'de': 'Rüstung', 'es': 'Armadura', 'it': 'Armatura',
        'ja': 'アーマー', 'ko': '아머', 'pl': 'Pancerz', 'pt': 'Armadura', 'ru': 'Броня',
        'tc': '護甲', 'th': 'เกราะ', 'tr': 'Zırh', 'uk': 'Броня', 'zh': '护甲'},
    'Melee Attack Speed': {
        'en': 'Melee Attack Speed', 'fr': "Vitesse d'attaque au corps à corps", 'de': 'Nahkampf-Angriffstempo',
        'es': 'Velocidad de ataque cuerpo a cuerpo', 'it': "Velocità d'attacco in mischia",
        'ja': '近接攻撃速度', 'ko': '근접 공격 속도', 'pl': 'Szybkość ataku wręcz',
        'pt': 'Velocidade de ataque corpo a corpo', 'ru': 'Скорость атаки ближнего боя',
        'tc': '近戰攻擊速度', 'th': 'ความเร็วโจมตีประชิด', 'tr': 'Yakın Dövüş Saldırı Hızı',
        'uk': 'Швидкість атаки ближнього бою', 'zh': '近战攻击速度'},
    'Electric Status Damage and Chance': {
        'en': 'Electric Status Damage and Chance', 'fr': 'Dégâts et chance de statut Électrique',
        'de': 'Elektrischer Status-Schaden und -Chance', 'es': 'Daño y probabilidad de estado Eléctrico',
        'it': 'Danno e probabilità di stato Elettrico', 'ja': '電気属性ダメージと状態異常確率',
        'ko': '전기 속성 피해 및 상태 이상 확률', 'pl': 'Obrażenia i szansa statusu Elektrycznego',
        'pt': 'Dano e chance de status Elétrico', 'ru': 'Урон и шанс статуса Электричества',
        'tc': '電屬性傷害與觸發機率', 'th': 'ความเสียหายและโอกาสสถานะไฟฟ้า',
        'tr': 'Elektrik Statü Hasarı ve Şansı', 'uk': 'Урон і шанс статусу Електрики', 'zh': '电属性伤害与触发几率'},
    'Gas Chance to Primary and Secondary': {
        'en': 'Gas Chance to Primary and Secondary', 'fr': 'Chance de Gaz pour armes principales et secondaires',
        'de': 'Gas-Chance für Primär- und Sekundärwaffen', 'es': 'Probabilidad de Gas para principales y secundarias',
        'it': 'Probabilità di Gas per armi primarie e secondarie', 'ja': '主武器と副武器へのガス確率',
        'ko': '주무기와 보조무기의 가스 확률', 'pl': 'Szansa na Gaz dla broni głównej i bocznej',
        'pt': 'Chance de Gás para armas primárias e secundárias', 'ru': 'Шанс Газа для основного и вторичного оружия',
        'tc': '主武器與副武器的氣體機率', 'th': 'โอกาสแก๊สสำหรับอาวุธหลักและรอง',
        'tr': 'Ana ve İkincil Silahlarda Gaz Şansı', 'uk': 'Шанс Газу для основної та другорядної зброї', 'zh': '主武器与副武器的气体几率'},
    'Companions Radiation Chance': {
        'en': 'Companions Radiation Chance', 'fr': 'Chance de Radiation des compagnons',
        'de': 'Strahlungs-Chance der Begleiter', 'es': 'Probabilidad de Radiación de los compañeros',
        'it': 'Probabilità di Radiazione dei compagni', 'ja': 'コンパニオンの放射線確率',
        'ko': '동반자의 방사능 확률', 'pl': 'Szansa na Promieniowanie towarzyszy',
        'pt': 'Chance de Radiação dos companheiros', 'ru': 'Шанс Радиации спутников',
        'tc': '同伴的輻射機率', 'th': 'โอกาสรังสีของคอมพานิออน',
        'tr': 'Yardımcıların Radyasyon Şansı', 'uk': 'Шанс Радіації супутників', 'zh': '同伴的辐射几率'},
    'Electric Damage per Distance': {
        'en': 'Electric Damage per Distance', 'fr': 'Dégâts Électriques par distance',
        'de': 'Elektrischer Schaden pro Distanz', 'es': 'Daño Eléctrico por distancia',
        'it': 'Danno Elettrico per distanza', 'ja': '距離ごとの電気ダメージ',
        'ko': '거리당 전기 피해', 'pl': 'Obrażenia Elektryczne na dystans',
        'pt': 'Dano Elétrico por distância', 'ru': 'Электрический урон за дистанцию',
        'tc': '距離電屬性傷害', 'th': 'ความเสียหายไฟฟ้าต่อระยะทาง',
        'tr': 'Mesafe Başına Elektrik Hasarı', 'uk': 'Електричний урон за дистанцію', 'zh': '距离电属性伤害'},
    'Ability Strength': {
        'en': 'Ability Strength', 'fr': 'Puissance de Pouvoir', 'de': 'Fähigkeitsstärke',
        'es': 'Fuerza de habilidad', 'it': 'Potenza abilità', 'ja': 'アビリティ強度',
        'ko': '어빌리티 위력', 'pl': 'Siła umiejętności', 'pt': 'Força de habilidade',
        'ru': 'Сила способностей', 'tc': '技能強度', 'th': 'พลังความสามารถ',
        'tr': 'Yetenek Gücü', 'uk': 'Сила здібностей', 'zh': '技能强度'},
}

count = 0
for lo in ALL:
    d = load_json(f'src/lib/i18n/{lo}.json')
    rs = d.setdefault('rivenStats', {})
    for key, trans in NEW_STATS.items():
        if key not in rs:
            rs[key] = trans[lo]
            count += 1
    save_locale(lo, d)
print(f"Added {count} rivenStats entries across {len(ALL)} files")
