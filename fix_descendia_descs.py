#!/usr/bin/env python3
"""
FIX DESCENDIA PENANCE DESCRIPTION PLACEHOLDERS.

18 keys had 'Fill a Crucible using two elemental Amphors.' duplicated in
ja/ko/tc/th/tr/zh (and 3 keys in ru/uk). Write the correct translation of the
EN text for each locale. No emdashes. No French copying.
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

en = load_json('src/lib/i18n/en.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# EN key -> {locale: translation}
D = {
    'ui.dashboard.descendia_penance_desc_ballon_party': {
        'ja': 'すべての敵がバルーン型のスカルドラになる。',
        'ko': '모든 적이 풍선형 스칼드라가 된다.',
        'tc': '所有敵人都會變成氣球型斯卡德拉。',
        'th': 'ศัตรูทั้งหมดกลายเป็นสคัลดูราแบบบอลลูน',
        'tr': 'Tüm düşmanlar balon tabanlı Scaldura olur.',
        'zh': '所有敌人都会变成气球型斯卡尔德拉。'},
    'ui.dashboard.descendia_penance_desc_basic_loot': {
        'ja': '保管コンテナを略奪せよ。',
        'ko': '보관 컨테이너를 약탈하세요.',
        'tc': '掠奪儲存容器。',
        'th': 'ปล้นภาชนะเก็บของ',
        'tr': 'Depolama konteynerlerini yağmala.',
        'zh': '掠夺储存容器。'},
    'ui.dashboard.descendia_penance_desc_blitz_leech': {
        'ja': '高速のリミナスが味方のHPとエネルギーを吸い取る。',
        'ko': '빠른 리미누스가 아군의 체력과 에너지를 흡수한다.',
        'tc': '快速林尼穆斯會吸取隊友的體力與能量。',
        'th': 'ลิมินัสความเร็วสูงดูดเลือดและพลังงานจากพันธมิตร',
        'tr': 'Hızlı Liminus\'lar müttefiklerin canını ve enerjisini emer.',
        'zh': '快速林尼穆斯会吸取队友的生命与能量。'},
    'ui.dashboard.descendia_penance_desc_collection_basic': {
        'ja': 'ヴァイトプラストを収集せよ。',
        'ko': '바이토플라스트를 수집하세요.',
        'tc': '收集維托塑膠。',
        'th': 'เก็บไวโทพลาสต์',
        'tr': 'Vitoplast topla.',
        'zh': '收集维托塑胶。'},
    'ui.dashboard.descendia_penance_desc_fiery_trail_rollers': {
        'ja': 'すべての敵がローラーになり、炎の軌跡を残す。',
        'ko': '모든 적이 롤러가 되어 불꽃의 궤적을 남긴다.',
        'tc': '所有敵人都會變成滾輪並留下火焰軌跡。',
        'th': 'ศัตรูทั้งหมดกลายเป็นโรลเลอร์ที่ทิ้งเส้นไฟไว้',
        'tr': 'Tüm düşmanlar arkalarında ateş izi bırakan Roller olur.',
        'zh': '所有敌人都会变成滚轮并留下火焰轨迹。'},
    'ui.dashboard.descendia_penance_desc_fire_chain': {
        'ja': '敵同士が炎のビームで繋がれ、接触したプレイヤーを焼く。',
        'ko': '적들이 화염 광선으로 연결되어 접촉하는 플레이어를 태운다.',
        'tc': '敵人以火焰光束相連，接觸的玩家會被灼燒。',
        'th': 'ศัตรูเชื่อมกันด้วยลำแสงไฟ เผา玩家ที่สัมผัส',
        'tr': 'Düşmanlar alev ışınlarıyla birbirine bağlanır, temas eden oyuncuları yakar.',
        'zh': '敌人以火焰光束相连，灼烧接触的玩家。'},
    'ui.dashboard.descendia_penance_desc_giant_realm': {
        'ja': '敵が通常より大きく、遅くなる。',
        'ko': '적이 평소보다 크고 느려진다.',
        'tc': '敵人變得比平常更大且更慢。',
        'th': 'ศัตรูตัวใหญ่และช้ากว่าปกติ',
        'tr': 'Düşmanlar normalden daha büyük ve yavaştır.',
        'zh': '敌人比平常更大、更慢。'},
    'ui.dashboard.descendia_penance_desc_harrow': {
        'ja': 'ライオンの聖域。',
        'ko': '라이온의 성소.',
        'tc': '萊昂聖殿。',
        'th': 'สถานศักดิ์สิทธิ์ของไลออน',
        'tr': 'Lyon\'un Sığınağı.',
        'zh': '莱昂圣殿。'},
    'ui.dashboard.descendia_penance_desc_heavy_weapons_only': {
        'ja': 'アークガンまたはロケット以外のダメージに敵は強い耐性を持つ。',
        'ko': '적은 아크건이나 로켓이 아닌 모든 피해에 강한 저항력을 가진다.',
        'tc': '敵人對非Archgun或火箭造成的傷害有極強抗性。',
        'th': 'ศัตรูทนทานต่อความเสียหายทั้งหมดที่ไม่ได้มาจากอาร์คกันหรือจรวด',
        'tr': 'Düşmanlar Archgun veya Roket dışındaki tüm hasara karşı oldukça dirençlidir.',
        'zh': '敌人对非Archgun或火箭造成的伤害有极强抗性。'},
    'ui.dashboard.descendia_penance_desc_horse': {
        'ja': '騎乗戦闘のみ。',
        'ko': '승마 전투만 가능.',
        'tc': '僅限騎乘戰鬥。',
        'th': 'ต่อสู้บนหลังม้าเท่านั้น',
        'tr': 'Sadece atlı savaş.',
        'zh': '仅限骑乘战斗。'},
    'ui.dashboard.descendia_penance_desc_mech_combat_only': {
        'ja': 'プレイヤーはローグ・ネクロメックに対してネクロメックを使用することを強いられる。',
        'ko': '플레이어는 로그 네크라메크에 맞서 네크라메크를 사용해야 한다.',
        'tc': '玩家被迫使用亡骸機對抗叛變亡骸機。',
        'th': 'ผู้เล่นต้องใช้เนคราเมคสู้กับเนคราเมคจรจัด',
        'tr': 'Oyuncu, Rogue Necramech\'lere karşı Necramech kullanmak zorundadır.',
        'zh': '玩家被迫使用殁世机对抗叛变殁世机。'},
    'ui.dashboard.descendia_penance_desc_oraxia': {
        'ja': 'オラクシアボスを倒せ。',
        'ko': '오락시아 보스를 처치하세요.',
        'tc': '擊敗歐拉克西亞首領。',
        'th': 'ปราบบอสโอแรกเซีย',
        'tr': 'Oraxia bossunu yen.',
        'zh': '击败欧拉克西亚首领。'},
    'ui.dashboard.descendia_penance_desc_power_house': {
        'ja': '掘削機を守り、パワーセルで稼働させ続けろ。',
        'ko': '굴착기를 보호하고 파워 셀로 전력을 유지하세요.',
        'tc': '保護挖掘機並用能量電池維持運作。',
        'th': 'ปกป้องเครื่องขุดและรักษาพลังงานด้วยเซลล์พลังงาน',
        'tr': 'Kazıcıları koru ve Güç Hücreleriyle çalışır durumda tut.',
        'zh': '保护挖掘机并用能量电池维持运转。'},
    'ui.dashboard.descendia_penance_desc_race_horse': {
        'ja': 'カイテに乗ってゲートを通過せよ。',
        'ko': '카이테를 타고 게이트를 통과하세요.',
        'tc': '騎乘凱特穿越閘門。',
        'th': 'ขี่ไคเธผ่านประตู',
        'tr': 'Kaithe ile kapılardan geç.',
        'zh': '骑乘凯特穿越闸门。'},
    'ui.dashboard.descendia_penance_desc_security_spin': {
        'ja': '回転する刃がアリーナを移動する。',
        'ko': '회전하는 칼날이 경기장을 돌아다닌다.',
        'tc': '旋轉刀刃會在場地中移動。',
        'th': 'ใบมีดหมุนเคลื่อนที่ไปทั่วสนาม',
        'tr': 'Dönen bıçaklar arenada hareket eder.',
        'zh': '旋转刀刃会在场地中移动。'},
    'ui.dashboard.descendia_penance_desc_shocking_leech': {
        'ja': 'リーチ、ショック、またはベノマス・エクシムスの亜種。',
        'ko': '리치, 쇼크 또는 베노머스 엑시무스 변종.',
        'tc': '寄生、電擊或劇毒卓越者變體。',
        'th': 'เอ็กซิมัสสายลีช ช็อก หรือเวนอมัส',
        'tr': 'Leech, Shock veya Venomous Eximus varyantı.',
        'zh': '寄生、电击或剧毒卓越者变体。'},
    'ui.dashboard.descendia_penance_desc_spike_ceiling': {
        'ja': '天井から常に破片が落下し、下にいる者にダメージを与える。',
        'ko': '천장에서 파편이 끊임없이 떨어져 아래에 있는 자에게 피해를 준다.',
        'tc': '天花板不斷落下碎片，擊中下方的人。',
        'th': 'เศษซากร่วงจากเพดานตลอดเวลา สร้างความเสียหายแก่ผู้ที่อยู่ด้านล่าง',
        'tr': 'Tavandan sürekli enkaz düşer, altında kalanlara hasar verir.',
        'zh': '天花板不断落下碎片，伤害下方的人。'},
    'ui.dashboard.descendia_penance_desc_sunlight': {
        'ja': '日光のペナンス。',
        'ko': '햇빛 페넌스.',
        'tc': '日光苦修。',
        'th': 'เพนแนนซ์แสงแดด',
        'tr': 'Güneş ışığı penance.',
        'zh': '日光苦修。'},
}

# ── Apply: replace placeholders with correct translations ────────────────────
PLACEHOLDER = 'Fill a Crucible using two elemental Amphors.'
applied = 0
for key, trans in D.items():
    for lo, val in trans.items():
        if locale_files[lo]['ui'].get(key) == PLACEHOLDER:
            locale_files[lo]['ui'][key] = val
            applied += 1

# it/pt/ru/uk remaining placeholders
EXTRA = {
    'ui.dashboard.descendia_penance_desc_mech_combat_only': {
        'it': 'Il giocatore è costretto a usare il Necramech contro i Necramech Rogue.',
        'pt': 'O jogador é forçado a usar o Necramech contra Necramechs Rogue.',
        'ru': 'Игрок вынужден использовать Некрамеха против Некрамехов-изгоев.',
        'uk': 'Гравець змушений використовувати Некрамеха проти Некрамехів-втікачів.'},
    'ui.dashboard.descendia_penance_desc_race_horse': {
        'it': 'Corri attraverso i cancelli su un Kaithe.',
        'pt': 'Corra pelos portões em um Kaithe.',
        'ru': 'Проезжайте через врата верхом на Кайте.',
        'uk': 'Проїжджайте крізь ворота верхи на Кайті.'},
    'ui.dashboard.descendia_penance_desc_spike_ceiling': {
        'it': 'I detriti cadono costantemente dal soffitto, danneggiando chi si trova sotto.',
        'pt': 'Detritos caem constantemente do teto, danificando quem estiver embaixo.',
        'ru': 'Обломки постоянно падают с потолка, нанося урон тем, кто внизу.',
        'uk': 'Уламки постійно падають зі стелі, завдаючи шкоди тим, хто внизу.'},
}
for key, trans in EXTRA.items():
    for lo, val in trans.items():
        if locale_files[lo]['ui'].get(key) == PLACEHOLDER:
            locale_files[lo]['ui'][key] = val
            applied += 1

# zh: check if any placeholders remain
for lo in LOCALES:
    remaining = [k for k, v in locale_files[lo]['ui'].items() if 'descendia_penance_desc' in k and v == PLACEHOLDER]
    if remaining:
        print(f"  WARN {lo}: still {len(remaining)} placeholders: {remaining}")

print(f"Applied {applied} placeholder fixes")

for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print("Saved.")
