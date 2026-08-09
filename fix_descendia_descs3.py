#!/usr/bin/env python3
"""
FIX all remaining descendia description issues:
- zh: 17 penance descs still 'Fill a Crucible using two elemental Amphors'
- th: 12 penance descs truncated with '...'
- tr/uk/tc/pl/pt/ru: truncated or partial descriptions
Covers every penance desc key with the correct per-locale translation.
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

# Per-key full translations for the remaining bad keys (per locale)
# Key suffix -> {locale: translation}
D = {
 'penance_desc_mine_field': {  # Stasis Mines are scattered throughout the arena.
   'tr': 'Stasis Mayınları arena boyunca dağılmıştır.',
   'th': 'ระเบิดสเตซิสกระจายอยู่ทั่วสนามประลอง',
   'zh': '静滞地雷散布在竞技场各处。'},
 'penance_desc_horde_weakpoints': {  # Enemies are heavily resistant to damage applied outside of weak spots, with horde density.
   'tr': 'Düşmanlar zayıf noktalar dışındaki hasara karşı oldukça dirençlidir, sürü yoğunluğuyla.',
   'th': 'ศัตรูทนทานต่อความเสียหายนอกจุดอ่อนอย่างมาก พร้อมความหนาแน่นของฝูง',
   'uk': 'Вороги дуже стійкі до шкоди поза слабкими місцями, з великою щільністю натовпу.',
   'zh': '敌人对弱点以外的伤害有极强抗性，且成群结队。'},
 'penance_desc_fiery_trail': {  # Enemies leave behind a trail of fire which burns Tenno and allies.
   'tr': 'Düşmanlar arkalarında Tenno\'ları ve müttefikleri yakan ateş izi bırakır.',
   'th': 'ศัตรูทิ้งเส้นไฟไว้ข้างหลังซึ่งเผาเทนโนและพันธมิตร',
   'uk': 'Вороги залишають вогняний слід, який обпалює Тенно та союзників.',
   'tc': '敵人留下火之蹤跡，灼燒Tenno與盟友。',
   'zh': '敌人留下火之踪迹，灼烧Tenno与盟友。'},
 'penance_desc_narmer_phobia': {  # Poison gas is dispersed around the arena dealing Toxin damage.
   'th': 'แก๊สพิษกระจายไปทั่วสนามประลอง สร้างความเสียหายพิษ'}, 
 'penance_desc_poison_gas': {
   'th': 'แก๊สพิษกระจายไปทั่วสนามประลอง สร้างความเสียหายพิษ'},
 'penance_desc_devil': {  # Roathe's Oblivion - Final boss fight against Roathe.
   'th': 'เอเวอร์เลสเตอร์ - การต่อสู้บอสสุดท้ายกับโรเธ่'},  # Roathe transliteration
 'penance_desc_escapist': {  # Upon reaching half health, enemies become invulnerable and teleport away.
   'th': 'เมื่อเลือดเหลือครึ่ง ศัตรูจะกลายเป็นอมตะและเทเลพอร์ตหนี'},
 'penance_desc_spicy_knife': {  # Players glow with Heat, exploding after 15 seconds. Delay by killing enemies.
   'th': 'ผู้เล่นเรืองแสงด้วยความร้อน จะระเบิดหลังจาก 15 วินาที เลื่อนเวลาโดยการฆ่าศัตรู'},
 'penance_desc_jump_smash': {  # Enemies are smaller and take massively increased damage from being jumped on.
   'th': 'ศัตรูตัวเล็กลงและรับความเสียหายเพิ่มขึ้นมากจากการถูกกระโดดทับ'},
 'penance_desc_jade_guardian': {  # Guardian, Jade Light, or Shock Eximus variant.
   'th': 'การ์เดียน แจ้ดไลต์ หรือช็อกเอ็กซิมัสสายพันธุ์'},
 'penance_desc_toxic_fire': {  # Toxic Flames variant of Eximus Cabal.
   'th': 'เปลวพิษสายพันธุ์เอ็กซิมัสคาบาล'},
 'penance_desc_sentients': {  # All enemies will be Sentients.
   'th': 'ศัตรูทั้งหมดจะกลายเป็นเซนเทียนต์'},
 'penance_desc_ranged_arcadia_only': {  # All enemies are ranged units with slow projectiles.
   'th': 'ศัตรูทั้งหมดเป็นหน่วยระยะไกลที่มีกระสุนช้า'},
 'penance_desc_giant_realm': {  # Enemies are larger and slower than normal.
   'zh': '敌人比平常更大、更慢。'},
 'penance_desc_harrow': {  # Lyon's Sanctuary.
   'zh': '莱昂圣殿。'},
 'penance_desc_collection_basic': {  # Collect Vitoplast.
   'zh': '收集维托塑胶。'},
 'penance_desc_security_spin': {  # Security Spin.
   'zh': '旋转刀刃会在场地中移动。'},
 'penance_desc_blitz_leech': {  # Blitz Leech.
   'zh': '闪电吸血。'},
 'penance_desc_basic_loot': {  # Loot storage containers.
   'zh': '掠夺储存容器。'},
 'penance_desc_fiery_trail_rollers': {  # All enemies are Rollers that leave behind a trail of fire.
   'zh': '所有敌人都会变成滚轮并留下火焰轨迹。'},
 'penance_desc_horse': {  # Horse Combat Only.
   'zh': '仅限骑乘战斗。'},
 'penance_desc_power_house': {  # Protect Excavators and keep them powered with Power Cells.
   'zh': '保护挖掘机并用能量电池维持运转。'},
 'penance_desc_fire_chain': {  # Enemies are connected by flaming beams, burning players on contact.
   'zh': '敌人以火焰光束相连，灼烧接触的玩家。'},
 'penance_desc_sunlight': {  # Sunlight penance.
   'zh': '日光苦修。'},
 'penance_desc_race_horse': {  # Race through gates on a Kaithe.
   'zh': '骑乘凯特穿越闸门。'},
 'penance_desc_spike_ceiling': {  # Debris is constantly falling from the ceiling, dealing damage to anyone caught underneath.
   'zh': '天花板不断落下碎片，伤害下方的人。'},
 'penance_desc_ballon_party': {  # All enemies are Balloon-based Scaldura.
   'zh': '所有敌人都会变成气球型斯卡尔德拉。'},
 'penance_desc_mech_combat_only': {  # The player is forced to use Necramech against Rogue Necramechs.
   'zh': '玩家被迫使用殁世机对抗叛变殁世机。'},
 'penance_desc_shocking_leech': {  # Leech, Shock, or Venomous Eximus variant.
   'zh': '寄生、电击或剧毒卓越者变体。'},
 'penance_desc_oraxia': {  # Defeat Oraxia boss.
   'zh': '击败欧拉克西亚首领。'},
 'penance_desc_heavy_weapons_only': {  # Enemies are heavily resistant to all damage not dealt by Archguns or Rockets.
   'zh': '敌人对非Archgun或火箭造成的伤害有极强抗性。'},
 'mission_type_desc_dt_defense': {  # Defend a target from waves of enemies.
   'pl': 'Broń celu przed falami wrogów.',
   'pt': 'Defenda um alvo das ondas de inimigos.',
   'ru': 'Защищайте цель от волн врагов.',
   'uk': 'Захищайте ціль від хвиль ворогів.'},
}

BAD_ANY = ['Fill a Crucible', '...']
applied = 0
for key_suffix, trans in D.items():
    for lo, val in trans.items():
        if lo not in locale_files: continue
        ui = locale_files[lo]['ui']
        # find the key
        for k, cur in ui.items():
            if k.endswith(key_suffix) and isinstance(cur, str) and any(b in cur for b in BAD_ANY):
                ui[k] = val
                applied += 1
                break

for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print(f"Applied {applied} fixes")
