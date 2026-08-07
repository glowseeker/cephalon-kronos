// Localized riven-card OCR support: stat-name aliases + card-header garbage words.
//
// Stat names are matched three ways (see foldVariants):
//   1. folded  — Unicode NFD-stripped, ß→s   ("Größe" → "grose")
//   2. expanded — umlauts→ae/oe/ue, ß→ss     ("Größe" → "groesse")
//   3. tight   — folded with all non-alnum removed ("Krit. Chance" → "kritchance")
// Aliases come from two sources: the i18n `rivenStats` table (all 15 locales,
// inverted English-key → localized-name) and GAME_STAT_ALIASES (in-game terms
// extracted from the DE public-manifest ExportUpgrades_{locale}.json levelStats,
// where the table drifts or contains typos).

export const STAT_TO_PRICER = {
  'Critical Chance': 'critical_chance',
  'Critical Damage': 'critical_damage',
  'Damage': 'base_damage_/_melee_damage',
  'Melee Damage': 'base_damage_/_melee_damage',
  'Multishot': 'multishot',
  'Attack Speed': 'fire_rate_/_attack_speed',
  'Fire Rate': 'fire_rate_/_attack_speed',
  'Status Chance': 'status_chance',
  'Status Duration': 'status_duration',
  'Range': 'range',
  'Puncture': 'puncture_damage',
  'Slash': 'slash_damage',
  'Impact': 'impact_damage',
  'Heat': 'heat_damage',
  'Cold': 'cold_damage',
  'Electricity': 'electric_damage',
  'Toxin': 'toxin_damage',
  'Reload Speed': 'reload_speed',
  'Magazine Capacity': 'magazine_capacity',
  'Ammo Maximum': 'ammo_maximum',
  'Punch Through': 'punch_through',
  'Projectile Speed': 'projectile_speed',
  'Initial Combo': 'channeling_damage',
  'Combo Duration': 'combo_duration',
  'Finisher Damage': 'finisher_damage',
  'Damage to Corpus': 'damage_vs_corpus',
  'Damage to Grineer': 'damage_vs_grineer',
  'Damage to Infested': 'damage_vs_infested',
  'Recoil': 'recoil',
  'Slide Crit Chance': 'critical_chance_on_slide_attack',
  'Combo Efficiency': 'channeling_efficiency',
  'Zoom': 'zoom',
  'Blast Radius': 'explosion_radius',
  'Beam Length': 'beam_length',
  'Combo Count': 'chance_to_gain_combo_count',
  'Combo Count Chance': 'chance_to_gain_combo_count',
}

/**
 * Return [folded, expanded, tight] variants of a stat/weapon string.
 * All three are lowercase.
 */
export function foldVariants(str) {
  const lower = str.toLowerCase()
  const expanded = lower
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const folded = lower
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 's')
  const tight = folded.replace(/[^\p{L}\p{N}]/gu, '')
  return [folded, expanded, tight]
}

// In-game stat terms extracted from ExportUpgrades_{locale}.json levelStats
// (DE public manifest, all 15 locales). The i18n `rivenStats` table drifts from
// the game in places ("Schlitz" vs game "Schnitt"; "Durchdringung" used for
// both Puncture and Punch Through; th Puncture "ทฤษฎีบังคับ" is a typo), so
// these supplement — never replace — the table. Key: locale → term → English.
const GAME_STAT_ALIASES = {
  de: {
    'Krit. Chance': 'Critical Chance',
    'Krit. Schaden': 'Critical Damage',
    'Schaden': 'Damage',
    'Nahkampfschaden': 'Melee Damage',
    'Mehrfachschuss': 'Multishot',
    'Angriffsgeschwindigkeit': 'Attack Speed',
    'Feuerrate': 'Fire Rate',
    'Statuschance': 'Status Chance',
    'Statusdauer': 'Status Duration',
    'Reichweite': 'Range',
    'Durchschlag': 'Puncture',
    'Schnitt': 'Slash',
    'Einschlag': 'Impact',
    'Hitze': 'Heat',
    'Kälte': 'Cold',
    'Elektrizität': 'Electricity',
    'Gift': 'Toxin',
    'Nachladegeschwindigkeit': 'Reload Speed',
    'Magazingröße': 'Magazine Capacity',
    'Maximale Munition': 'Ammo Maximum',
    'Durchdringung': 'Punch Through',
    'Projektilgeschwindigkeit': 'Projectile Speed',
    'Start-Kombo': 'Initial Combo',
    'Kombo-Dauer': 'Combo Duration',
    'Todesstoß-Schaden': 'Finisher Damage',
    'Schaden an Corpus': 'Damage to Corpus',
    'Schaden an Grineer': 'Damage to Grineer',
    'Schaden an Befallenen': 'Damage to Infested',
    'Waffenrückstoss': 'Recoil',
    'Kritische Chance für Rutschangriff': 'Slide Crit Chance',
    'Explosionsradius': 'Blast Radius',
    'Zoom': 'Zoom',
    'Kombo-Zähler Chance': 'Combo Count Chance',
  },
  fr: {
    'Chance de critique': 'Critical Chance',
    'Chances de Statut': 'Status Chance',
    'Dégâts critiques': 'Critical Damage',
    'Dégâts': 'Damage',
    'Dégâts en Mêlée': 'Melee Damage',
    'Tir Multiple': 'Multishot',
    'Vitesse d\'Attaque': 'Attack Speed',
    'Cadence de Tir': 'Fire Rate',
    'Durée de Statut': 'Status Duration',
    'Portée': 'Range',
    'Perforation': 'Puncture',
    'Tranchant': 'Slash',
    'Impact': 'Impact',
    'Feu': 'Heat',
    'Glace': 'Cold',
    'Électrique': 'Electricity',
    'Poison': 'Toxin',
    'Vitesse de Recharge': 'Reload Speed',
    'Taille Du Chargeur': 'Magazine Capacity',
    'Munitions Max': 'Ammo Maximum',
    'Pénétration': 'Punch Through',
    'Vitesse des Projectiles': 'Projectile Speed',
    'Combo initial': 'Initial Combo',
    'Durée de Combo': 'Combo Duration',
    'Dégâts de Coup de Grâce': 'Finisher Damage',
    'Dégâts aux Corpus': 'Damage to Corpus',
    'Dégâts aux Grineers': 'Damage to Grineer',
    'Dégâts aux Infestés': 'Damage to Infested',
    'Recul de l\'Arme': 'Recoil',
    'Chances de Critique pour l\'Attaque Glissée': 'Slide Crit Chance',
    'Rayon d\'Explosion': 'Blast Radius',
    'Zoom': 'Zoom',
    'Chances de Points de Combo': 'Combo Count Chance',
  },
  it: {
    'Probabilità Effetto': 'Status Chance',
    'Probabilità Critico': 'Critical Chance',
    'Danno Critico': 'Critical Damage',
    'Danno': 'Damage',
    'Danno Corpo a Corpo': 'Melee Damage',
    'Sparo Multiplo': 'Multishot',
    'Velocità Di Attacco': 'Attack Speed',
    'Cadenza di Tiro': 'Fire Rate',
    'Durata Effetto': 'Status Duration',
    'Portata': 'Range',
    'Perforazione': 'Puncture',
    'Taglio': 'Slash',
    'Impatto': 'Impact',
    'Fuoco': 'Heat',
    'Ghiaccio': 'Cold',
    'Elettrico': 'Electricity',
    'Tossina': 'Toxin',
    'Velocità di ricarica': 'Reload Speed',
    'Capienza Caricatore': 'Magazine Capacity',
    'Munizioni Massime': 'Ammo Maximum',
    'Attraversamento': 'Punch Through',
    'Velocità Proiettile': 'Projectile Speed',
    'Combo Iniziale': 'Initial Combo',
    'Durata Combo': 'Combo Duration',
    'Danno Esecuzione': 'Finisher Damage',
    'Danno su Corpus': 'Damage to Corpus',
    'Danno su Grineer': 'Damage to Grineer',
    'Danno su Infested': 'Damage to Infested',
    'Rinculo': 'Recoil',
    'Probabilità Critico Scivolata': 'Slide Crit Chance',
    'Portata Esplosione': 'Blast Radius',
    'Zoom': 'Zoom',
    'Probabilità Contatore Combo': 'Combo Count Chance',
  },
  es: {
    'probabilidad de estado': 'Status Chance',
    'probabilidad crítica': 'Critical Chance',
    'daño crítico': 'Critical Damage',
    'daño': 'Damage',
    'daño cuerpo a cuerpo': 'Melee Damage',
    'multidisparo': 'Multishot',
    'velocidad de ataque': 'Attack Speed',
    'cadencia de fuego': 'Fire Rate',
    'duración de estado': 'Status Duration',
    'rango': 'Range',
    'perforación': 'Puncture',
    'cortante': 'Slash',
    'impacto': 'Impact',
    'calor': 'Heat',
    'frío': 'Cold',
    'electricidad': 'Electricity',
    'toxina': 'Toxin',
    'velocidad de recarga': 'Reload Speed',
    'capacidad de cargador': 'Magazine Capacity',
    'munición máxima': 'Ammo Maximum',
    'atravesar': 'Punch Through',
    'velocidad de proyectil': 'Projectile Speed',
    'combo inicial': 'Initial Combo',
    'duración del combo': 'Combo Duration',
    'daño al rematar': 'Finisher Damage',
    'daño a los corpus': 'Damage to Corpus',
    'daño a los grineer': 'Damage to Grineer',
    'daño a los infestados': 'Damage to Infested',
    'retroceso': 'Recoil',
    'prob. crítico al deslizar': 'Slide Crit Chance',
    'rango de explosión': 'Blast Radius',
    'zoom': 'Zoom',
    'prob. contador de combo': 'Combo Count Chance',
  },
  pl: {
    'Szansa Statusu': 'Status Chance',
    'Szansy Obrażeń Krytycznych': 'Critical Chance',
    'Obrażeń Krytycznych': 'Critical Damage',
    'Obrażeń': 'Damage',
    'Obrażeń w Walce Wręcz': 'Melee Damage',
    'wielostrzału': 'Multishot',
    'Prędkości Ataku': 'Attack Speed',
    'Szybkostrzelności': 'Fire Rate',
    'Czas Trwania Statusu': 'Status Duration',
    'Zasięg': 'Range',
    'Przebijających': 'Puncture',
    'Obrażeń Tnących': 'Slash',
    'Obr. Miażdżących': 'Impact',
    'Obrażeń Ogniowych': 'Heat',
    'Obrażeń Zimna': 'Cold',
    'Obrażeń od Elektryczności': 'Electricity',
    'Obr. od Toksyn': 'Toxin',
    'prędkości przeładowania': 'Reload Speed',
    'Pojemności Magazynka': 'Magazine Capacity',
    'Maks. Amunicji': 'Ammo Maximum',
    'Przeb. na wylot': 'Punch Through',
    'Prędkość Pocisku': 'Projectile Speed',
    'Początkowy Combo': 'Initial Combo',
    'Czas Trwania Combo': 'Combo Duration',
    'Obrażenia Dobicia': 'Finisher Damage',
    'Obrażeń zadawanych Corpus': 'Damage to Corpus',
    'Obrażeń zadawanych Grineer': 'Damage to Grineer',
    'Obrażeń zadawanych Pladze': 'Damage to Infested',
    'Odrzut Broni': 'Recoil',
    'Szansa Krytyczna podczas Ślizgu': 'Slide Crit Chance',
    'Promienia Rażenia': 'Blast Radius',
    'Przybliżenie': 'Zoom',
    'Szansa na Licznik Combo': 'Combo Count Chance',
  },
  uk: {
    'до ймовірності накладання ефекту стану': 'Status Chance',
    'до ймовірності критичної шкоди.': 'Critical Chance',
    'до критичної шкоди': 'Critical Damage',
    'до шкоди': 'Damage',
    'до шкоди від атак ближнього бою': 'Melee Damage',
    'до мультипострілу': 'Multishot',
    'до швидкості атаки': 'Attack Speed',
    'до швидкострільності': 'Fire Rate',
    'до тривалості ефекту стану': 'Status Duration',
    'до дальності': 'Range',
    'до пробивної шкоди': 'Puncture',
    'до різальної шкоди': 'Slash',
    'до ударної шкоди': 'Impact',
    'до термічної шкоди': 'Heat',
    'до крижаної шкоди': 'Cold',
    'до електричної шкоди': 'Electricity',
    'токсичної шкоди': 'Toxin',
    'до швидкості перезаряджання': 'Reload Speed',
    'до місткості магазину': 'Magazine Capacity',
    'до максимуму боєзапасу': 'Ammo Maximum',
    'до пробивання': 'Punch Through',
    'до швидкості польоту снарядів': 'Projectile Speed',
    'до початкового комбо': 'Initial Combo',
    'до тривалості комбо': 'Combo Duration',
    'до шкоди добиванням': 'Finisher Damage',
    'до завдаваної шкоди Корпусу': 'Damage to Corpus',
    'до завдаваної шкоди ґрінерам': 'Damage to Grineer',
    'до завдаваної шкоди зараженим': 'Damage to Infested',
    'до віддачі.': 'Recoil',
    'до шансу кріт. удару при ковзанні': 'Slide Crit Chance',
    'до дальності вибуху': 'Blast Radius',
    'до наближення': 'Zoom',
    'до шансу лічильника комбо': 'Combo Count Chance',
  },
  tr: {
    'Kritik Şans': 'Critical Chance',
    'Kritik Hasar': 'Critical Damage',
    'Hasar': 'Damage',
    'Yakın Hasar': 'Melee Damage',
    'Çoklu vuruş': 'Multishot',
    'Saldırı Hızı': 'Attack Speed',
    'Ateş Hızı': 'Fire Rate',
    'Durum Şansı': 'Status Chance',
    'Durum Süresi': 'Status Duration',
    'Menzil': 'Range',
    'Delme': 'Puncture',
    'Kesme': 'Slash',
    'Etki': 'Impact',
    'Isı': 'Heat',
    'Soğuk': 'Cold',
    'Elektrik': 'Electricity',
    'Zehir': 'Toxin',
    'Yeniden yükleme Hızı': 'Reload Speed',
    'Şarjör Kapasitesi': 'Magazine Capacity',
    'Maksimum mühim': 'Ammo Maximum',
    'Delip Geçme': 'Punch Through',
    'Mühim Hızı': 'Projectile Speed',
    'Birinci Kombo': 'Initial Combo',
    'Kombin Süresi': 'Combo Duration',
    'Finalizasyon Hasarı': 'Finisher Damage',
    'Corpus\'a Verilen Hasar': 'Damage to Corpus',
    'Grineer\'a Verilen Hasar': 'Damage to Grineer',
    'Enfekte\'lere Verilen Hasar': 'Damage to Infested',
    'Geri dönüş': 'Recoil',
    'Kaydırma Kritik Şans': 'Slide Crit Chance',
    'Patlama Yarıçapı': 'Blast Radius',
    'Zoom': 'Zoom',
    'Kombin Sayacı Şansı': 'Combo Count Chance',
  },
  pt: {
    'Chance de Status': 'Status Chance',
    'Chance Crítica': 'Critical Chance',
    'Dano Crítico': 'Critical Damage',
    'Dano': 'Damage',
    'Dano Corpo a Corpo': 'Melee Damage',
    'Tiro Múltiplo': 'Multishot',
    'Velocidade de Ataque': 'Attack Speed',
    'Cadência de Tiro': 'Fire Rate',
    'Duração de Status': 'Status Duration',
    'Alcance': 'Range',
    'Perfurante': 'Puncture',
    'Cortante': 'Slash',
    'Colisivo': 'Impact',
    'Ígneo': 'Heat',
    'Glacial': 'Cold',
    'Elétrico': 'Electricity',
    'Tóxico': 'Toxin',
    'Velocidade de Recarga': 'Reload Speed',
    'Capacidade do Carregador': 'Magazine Capacity',
    'Munição Máxima': 'Ammo Maximum',
    'Penetração': 'Punch Through',
    'Velocidade do Projétil': 'Projectile Speed',
    'Combo Inicial': 'Initial Combo',
    'Duração do Combo': 'Combo Duration',
    'Dano da Finalização': 'Finisher Damage',
    'Dano contra Corpus': 'Damage to Corpus',
    'Dano contra Grineer': 'Damage to Grineer',
    'Dano contra Infestados': 'Damage to Infested',
    'Recuo da Arma': 'Recoil',
    'Chance Crítica ao Deslizar': 'Slide Crit Chance',
    'Alcance da Explosão': 'Blast Radius',
    'Zoom': 'Zoom',
    'Chance de Incrementar o Combo': 'Combo Count Chance',
    'Alcance do Feixe': 'Beam Length',
    'Eficiência do Combo': 'Combo Efficiency',
  },
  ru: {
    'к шансу статуса': 'Status Chance',
    'Шанс статуса': 'Status Chance',
    'шанс крит. урона': 'Critical Chance',
    'Шанс крит. урона': 'Critical Chance',
    'крит. урона': 'Critical Damage',
    'Крит. урон': 'Critical Damage',
    'урона': 'Damage',
    'Урон': 'Damage',
    'урона в ближнем бою': 'Melee Damage',
    'Урон в ближнем бою': 'Melee Damage',
    'мультивыстрел': 'Multishot',
    'Мультивыстрел': 'Multishot',
    'к скорости атаки': 'Attack Speed',
    'Скорость атаки': 'Attack Speed',
    'к скорострельности': 'Fire Rate',
    'Скорострельность': 'Fire Rate',
    'к длительности статуса': 'Status Duration',
    'Длительность статуса': 'Status Duration',
    'дальность': 'Range',
    'Дальность': 'Range',
    'пронзающего урона': 'Puncture',
    'Пронзающий урон': 'Puncture',
    'разрезающего урона': 'Slash',
    'Разрезающий урон': 'Slash',
    'ударного урона': 'Impact',
    'Ударный урон': 'Impact',
    'урона огнем': 'Heat',
    'Урон огнем': 'Heat',
    'урона холодом': 'Cold',
    'Урон холодом': 'Cold',
    'урона электричеством': 'Electricity',
    'Урон электричеством': 'Electricity',
    'урона токсином': 'Toxin',
    'Урон токсином': 'Toxin',
    'к скорости перезарядки': 'Reload Speed',
    'Скорость перезарядки': 'Reload Speed',
    'к вместимости магазина': 'Magazine Capacity',
    'Вместимость магазина': 'Magazine Capacity',
    'максимум патронов': 'Ammo Maximum',
    'Максимум патронов': 'Ammo Maximum',
    'к пронзанию навылет': 'Punch Through',
    'Пробивание': 'Punch Through',
    'к скорости полёта снаряда': 'Projectile Speed',
    'Скорость полёта снаряда': 'Projectile Speed',
    'к стартовому счётчику комбо': 'Initial Combo',
    'Начальное комбо': 'Initial Combo',
    'к длительности комбо': 'Combo Duration',
    'Длительность комбо': 'Combo Duration',
    'урона при добивании': 'Finisher Damage',
    'Урон при добивании': 'Finisher Damage',
    'урона Корпусу': 'Damage to Corpus',
    'Урон Корпусу': 'Damage to Corpus',
    'урона Гринир': 'Damage to Grineer',
    'Урон Гринир': 'Damage to Grineer',
    'урона Заражённым': 'Damage to Infested',
    'Урон Заражённым': 'Damage to Infested',
    'к отдаче': 'Recoil',
    'Отдача': 'Recoil',
    'к шансу крит. удара при скольжении': 'Slide Crit Chance',
    'Шанс крит. удара при скольжении': 'Slide Crit Chance',
    'к радиусу взрыва': 'Blast Radius',
    'Радиус взрыва': 'Blast Radius',
    'приближение': 'Zoom',
    'Приближение': 'Zoom',
    'к шансу увеличить счётчик комбо': 'Combo Count Chance',
    'Шанс увеличить счётчик комбо': 'Combo Count Chance',
    'к дальности луча': 'Beam Length',
    'Дальность луча': 'Beam Length',
    'к эффективности комбо': 'Combo Efficiency',
    'Эффективность комбо': 'Combo Efficiency',
  },
  tc: {
    '觸發機率': 'Status Chance',
    '暴擊機率': 'Critical Chance',
    '暴擊傷害': 'Critical Damage',
    '傷害': 'Damage',
    '近戰傷害': 'Melee Damage',
    '多重射擊': 'Multishot',
    '攻擊速度': 'Attack Speed',
    '射速': 'Fire Rate',
    '狀態持續時間': 'Status Duration',
    '範圍': 'Range',
    '穿刺傷害': 'Puncture',
    '切割傷害': 'Slash',
    '衝擊傷害': 'Impact',
    '火焰傷害': 'Heat',
    '冰凍傷害': 'Cold',
    '電擊傷害': 'Electricity',
    '毒素傷害': 'Toxin',
    '裝填速度': 'Reload Speed',
    '彈匣容量': 'Magazine Capacity',
    '彈藥最大值': 'Ammo Maximum',
    '穿透': 'Punch Through',
    '投射物速度': 'Projectile Speed',
    '起始連擊數': 'Initial Combo',
    '連擊持續時間': 'Combo Duration',
    '處決傷害': 'Finisher Damage',
    '對 Corpus 傷害': 'Damage to Corpus',
    '對 Grineer 傷害': 'Damage to Grineer',
    '對 Infested 傷害': 'Damage to Infested',
    '武器後座力': 'Recoil',
    '滑行暴擊率': 'Slide Crit Chance',
    '爆炸範圍': 'Blast Radius',
    '變焦': 'Zoom',
    '連擊數機率': 'Combo Count Chance',
    '光束範圍': 'Beam Length',
    '連擊效率': 'Combo Efficiency',
  },
  zh: {
    '触发几率': 'Status Chance',
    '暴击几率': 'Critical Chance',
    '暴击伤害': 'Critical Damage',
    '伤害': 'Damage',
    '近战伤害': 'Melee Damage',
    '多重射击': 'Multishot',
    '攻击速度': 'Attack Speed',
    '射速': 'Fire Rate',
    '触发时间': 'Status Duration',
    '范围': 'Range',
    '穿刺伤害': 'Puncture',
    '切割伤害': 'Slash',
    '冲击伤害': 'Impact',
    '火焰伤害': 'Heat',
    '冰冻伤害': 'Cold',
    '电击伤害': 'Electricity',
    '毒素伤害': 'Toxin',
    '装填速度': 'Reload Speed',
    '弹匣容量': 'Magazine Capacity',
    '弹药最大值': 'Ammo Maximum',
    '穿透': 'Punch Through',
    '投射物速度': 'Projectile Speed',
    '初始连击': 'Initial Combo',
    '连击持续时间': 'Combo Duration',
    '处决伤害': 'Finisher Damage',
    '对 Corpus 的伤害': 'Damage to Corpus',
    '对 Grineer 的伤害': 'Damage to Grineer',
    '对 Infested 的伤害': 'Damage to Infested',
    '武器后坐力': 'Recoil',
    '滑行暴击率': 'Slide Crit Chance',
    '爆炸半径': 'Blast Radius',
    '变焦': 'Zoom',
    '连击数几率': 'Combo Count Chance',
    '光束范围': 'Beam Length',
    '连击效率': 'Combo Efficiency',
  },
  ko: {
    '상태 이상 확률': 'Status Chance',
    '치명타 확률': 'Critical Chance',
    '치명타 피해': 'Critical Damage',
    '피해': 'Damage',
    '근접 피해': 'Melee Damage',
    '멀티샷': 'Multishot',
    '공격 속도': 'Attack Speed',
    '연사력': 'Fire Rate',
    '상태 이상 지속 시간': 'Status Duration',
    '사거리': 'Range',
    '관통': 'Puncture',
    '베기': 'Slash',
    '충격': 'Impact',
    '화염': 'Heat',
    '냉기': 'Cold',
    '전기': 'Electricity',
    '독성': 'Toxin',
    '재장전 속도': 'Reload Speed',
    '탄창 용량': 'Magazine Capacity',
    '탄약 최대량': 'Ammo Maximum',
    '두께 꿰뚫기': 'Punch Through',
    '발사체 속도': 'Projectile Speed',
    '초기 콤보': 'Initial Combo',
    '콤보 지속시간': 'Combo Duration',
    '마무리 일격 피해': 'Finisher Damage',
    '코퍼스에 대한 피해': 'Damage to Corpus',
    '그리니어에 대한 피해': 'Damage to Grineer',
    '인페스티드에 대한 피해': 'Damage to Infested',
    '반동': 'Recoil',
    '슬라이드 치명타 확률': 'Slide Crit Chance',
    '폭발 범위': 'Blast Radius',
    '확대율 증가': 'Zoom',
    '콤보 카운트 확률': 'Combo Count Chance',
    '빔 사거리': 'Beam Length',
    '콤보 효율성': 'Combo Efficiency',
  },
  ja: {
    '状態異常確率': 'Status Chance',
    'クリティカル率': 'Critical Chance',
    'クリティカルダメージ': 'Critical Damage',
    'ダメージ': 'Damage',
    '近接ダメージ': 'Melee Damage',
    'マルチショット': 'Multishot',
    '攻撃速度': 'Attack Speed',
    '発射速度': 'Fire Rate',
    '状態異常の持続時間': 'Status Duration',
    '射程': 'Range',
    '貫通': 'Puncture',
    '切断': 'Slash',
    '衝撃': 'Impact',
    '火炎': 'Heat',
    '冷気': 'Cold',
    '電気': 'Electricity',
    '毒': 'Toxin',
    'リロード速度': 'Reload Speed',
    'マガジンサイズ': 'Magazine Capacity',
    '弾薬所持上限': 'Ammo Maximum',
    '貫通距離': 'Punch Through',
    '弾速': 'Projectile Speed',
    '初期コンボ': 'Initial Combo',
    'コンボ持続時間': 'Combo Duration',
    '追撃ダメージ': 'Finisher Damage',
    '対コーパスダメージ': 'Damage to Corpus',
    '対グリニアダメージ': 'Damage to Grineer',
    '対感染体ダメージ': 'Damage to Infested',
    'リコイル': 'Recoil',
    'スライドクリティカル率': 'Slide Crit Chance',
    '爆破範囲': 'Blast Radius',
    'ズーム': 'Zoom',
    'コンボカウント率': 'Combo Count Chance',
    'ビーム範囲': 'Beam Length',
    'コンボ効率': 'Combo Efficiency',
  },
  th: {
    'โอกาสสถานะ': 'Status Chance',
    'โอกาสคริติคอล': 'Critical Chance',
    'ความเสียหายคริติคอล': 'Critical Damage',
    'ความเสียหาย': 'Damage',
    'ความเสียหายระยะประชิด': 'Melee Damage',
    'มัลติช็อต': 'Multishot',
    'ความเร็วในการโจมตี': 'Attack Speed',
    'อัตราการยิง': 'Fire Rate',
    'ระยะเวลาของสถานะ': 'Status Duration',
    'ระยะ': 'Range',
    'การเจาะ': 'Puncture',
    'เฉือนฟัน': 'Slash',
    'การกระแทก': 'Impact',
    'ไฟ': 'Heat',
    'น้ำแข็ง': 'Cold',
    'ไฟฟ้า': 'Electricity',
    'พิษ': 'Toxin',
    'ความเร็วในการรีโหลด': 'Reload Speed',
    'ความจุแม็กกาซีน': 'Magazine Capacity',
    'กระสุนสูงสุด': 'Ammo Maximum',
    'เจาะทะลุ': 'Punch Through',
    'ความเร็วกระสุน': 'Projectile Speed',
    'คอมโบเริ่มต้น': 'Initial Combo',
    'ระยะเวลาคอมโบ': 'Combo Duration',
    'ความเสียหายจากท่าฟินิชเชอร์': 'Finisher Damage',
    'สร้างความเสียหายต่อ Corpus': 'Damage to Corpus',
    'สร้างความเสียหายต่อ Grineer': 'Damage to Grineer',
    'สร้างความเสียหายต่อ Infested': 'Damage to Infested',
    'แรงถีบของอาวุธ': 'Recoil',
    'โอกาสคริติคอลขณะไถล': 'Slide Crit Chance',
    'ระยะการระเบิด': 'Blast Radius',
    'ซูม': 'Zoom',
    'โอกาสในการนับคอมโบ': 'Combo Count Chance',
    'ระยะลำแสง': 'Beam Length',
    'ประสิทธิภาพคอมโบ': 'Combo Efficiency',
  },
}

// Card-header words to strip from OCR output (mod drain, polarity, reroll
// counter). Locale-specific words supplement the English set.
// These are the terms that appear on a riven card header and must be stripped
// before stat-name matching.

// "Reroll" words: tokens that carry a reroll-counter number (which gets
// parsed into the `rolls` field). All others (drain, capacity, polarity)
// just get dropped. "riven" is a label, not a counter.
export const REROLL_WORDS_BY_LOCALE = {
  en: ['roll', 'reroll', 'rerolls', 'counter'],
  de: ['neuausrichtung', 'neuausrichtungen'],
  fr: ['relance', 'relances'],
  es: ['reconfiguración', 'reconfiguraciones'],
  it: ['reconfigura', 'riconfigura'],
  pt: ['reconfiguração', 'reconfigurações'],
  tr: ['yeniden yapılandırma', 'yeniden yapılandırmalar'],
  ru: ['перенастройка', 'перенастройки'],
  uk: ['переналаштування'],
  pl: ['przekonfiguracja', 'przekonfiguracje'],
  tc: ['重鑄'],
  zh: ['重铸'],
  ko: ['재구성'],
  ja: ['再鑑定'],
  th: ['รีโรล'],
}

// Full set of garbage words per locale (drain/polarity + reroll + riven label).
export const GARBAGE_BY_LOCALE = {
  en: ['drain', 'capacity', 'polarity', 'roll', 'reroll', 'rerolls', 'counter', 'riven'],
  de: ['kapazität', 'polarität', 'neuausrichtung', 'neuausrichtungen', 'riven'],
  fr: ['capacité', 'polarité', 'relance', 'relances', 'riven'],
  es: ['capacidad', 'polaridad', 'reconfiguración', 'reconfiguraciones', 'riven', 'agrietado'],
  it: ['capacità', 'polarità', 'reconfigura', 'riconfigura', 'riven'],
  pt: ['capacidade', 'polaridade', 'reconfiguração', 'reconfigurações', 'riven'],
  tr: ['kapasite', 'polarite', 'yeniden yapılandırma', 'yeniden yapılandırmalar', 'riven'],
  // "riven" label terms from the game dict: ru "Разлом", uk "Розколи",
  // ko "리벤", zh/tc "裂罅" (the old клинок/рівень/레진 were wrong).
  ru: ['ёмкость', 'полярность', 'перенастройка', 'перенастройки', 'разлом'],
  uk: ['ємність', 'полярність', 'переналаштування', 'розколи'],
  pl: ['pojemność', 'polarność', 'przekonfiguracja', 'przekonfiguracje', 'riven'],
  tc: ['容量', '極性', '重鑄', '裂罅'],
  zh: ['容量', '极性', '重铸', '裂罅'],
  ko: ['용량', '극성', '재구성', '리벤'],
  ja: ['容量', '極性', '再鑑定', 'レヴン'],
  th: ['ความจุ', 'ขั้ว', 'รีโรล', 'riven'],
}

export const DEFAULT_GARBAGE_RE = /^(mod|drain|capacity|polarity|roll|reroll|counter|rerolls|riven)$/i

/**
 * Escape a term for use in a RegExp.
 */
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

/**
 * Compound garbage phrases (space-separated) per locale. These are multi-word
 * header labels like "Mod Drain" that need to be matched as a unit.
 */
const GARBAGE_COMPOUNDS_BY_LOCALE = {
  en: ['mod drain', 'roll counter', 'reroll counter'],
  de: ['mod abtrap', 'mod-abtrap'],
  fr: ['effort du mod', 'compteur de relance', 'compteur de relances'],
  es: ['consumo del mod', 'contador de reconfiguración'],
}

/**
 * Return a deduplicated, escaped list of all garbage words for a locale.
 * Compound phrases are included with the shorter word first so the regex
 * alternation prefers the longer match (e.g. "mod drain" before "drain").
 */
function garbageWords(locale) {
  const base = ['mod', 'drain', 'capacity', 'polarity', 'roll', 'reroll', 'rerolls', 'counter', 'riven']
  const extra = GARBAGE_BY_LOCALE[locale] || []
  return [...new Set([...base, ...extra])].map(escRe)
}

/**
 * Return escaped compound garbage phrases for a locale (localized).
 */
function garbageCompounds(locale) {
  return (GARBAGE_COMPOUNDS_BY_LOCALE[locale] || []).map(escRe)
}

/**
 * Return a Set of lowercase reroll-specific words for a locale (includes base EN).
 */
function rerollWordSet(locale) {
  const base = ['roll', 'reroll', 'rerolls', 'counter']
  const extra = REROLL_WORDS_BY_LOCALE[locale] || []
  return new Set([...base, ...extra].map(w => w.toLowerCase()))
}

/**
 * Build a regex matching a single header-token garbage word with optional
 * numeric suffix. Capture group 1 = the word, group 2 = optional number.
 * Compound phrases (e.g. "mod drain") are tried first, then words sorted
 * by length descending so "rerolls" beats "reroll" as a prefix.
 */
export function garbageTokenReForLocale(locale) {
  const compounds = garbageCompounds(locale)
  const words = garbageWords(locale).sort((a, b) => b.length - a.length)
  const all = [...compounds, ...words]
  return new RegExp(`^(${all.join('|')})(?:\\s+(\\d+))?$`, 'i')
}

/**
 * Build a regex matching a garbage word (or compound phrase) preceded by
 * whitespace, optionally followed by a number. Used to clean trailing garbage
 * from weapon names. Longest patterns first.
 */
export function garbageSuffixReForLocale(locale) {
  const compounds = garbageCompounds(locale)
  const words = garbageWords(locale).sort((a, b) => b.length - a.length)
  const sorted = [...compounds, ...words]
  return new RegExp(`\\s+(?:${sorted.join('|')})\\s*\\d*`, 'gi')
}

export function garbageReForLocale(locale) {
  const compounds = garbageCompounds(locale)
  const words = garbageWords(locale).sort((a, b) => b.length - a.length)
  const all = [...compounds, ...words]
  return new RegExp(`^(?:${all.join('|')})$`, 'i')
}

/**
 * Build a Map of localized stat-name variants → pricer stat value for a locale.
 * `locale` is the game locale id; `rivenStats` is the `rivenStats` section of
 * the locale's i18n JSON (English key → localized name).
 *
 * Game-manifest aliases are added last so they override table drift on
 * collision (e.g. German "Durchdringung" is Punch Through in-game, while the
 * table lists it for both Puncture and Punch Through).
 */
export function buildStatAliases(locale, rivenStats) {
  const map = new Map()
  const add = (term, englishKey) => {
    const pricerVal = STAT_TO_PRICER[englishKey]
    if (!pricerVal) return
    for (const variant of foldVariants(term)) {
      map.set(variant, pricerVal)
    }
  }

  if (rivenStats) {
    for (const [englishKey, localized] of Object.entries(rivenStats)) {
      if (typeof localized === 'string') add(localized, englishKey)
    }
  }
  const gameAliases = GAME_STAT_ALIASES[locale] || {}
  for (const [term, englishKey] of Object.entries(gameAliases)) {
    add(term, englishKey)
  }
  return map
}

/**
 * Resolve a stat name found in OCR output to the pricer's stat value.
 * `aliases` is the Map from buildStatAliases (localized → pricer value).
 */
export function cleanStatName(raw, aliases) {
  if (!raw) return ''
  const trimmed = raw.trim()

  // 0. localized alias match (OCR text in the game's language)
  if (aliases && aliases.size) {
    const [folded, expanded, tight] = foldVariants(trimmed)
    for (const variant of [folded, expanded, tight]) {
      const hit = aliases.get(variant)
      if (hit) return hit
    }
    // substring: localized alias contained in the OCR text
    for (const [key, val] of aliases) {
      if (folded.includes(key) && val) return val
    }
  }

  // 1. exact match against original
  const exact = STAT_TO_PRICER[trimmed]
  if (exact) return exact.toLowerCase().replace(/\s+/g, '_')

  // 2. case-insensitive exact match
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 3. strip common OCR noise (leading vowels 'a', 'e', etc.) and retry
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 4. substring: known stat name contained in raw, or raw contained in known name
  for (const [key, val] of Object.entries(STAT_TO_PRICER)) {
    const kl = key.toLowerCase()
    const rl = trimmed.toLowerCase()
    if (rl.includes(kl) || kl.includes(rl)) return val.toLowerCase().replace(/\s+/g, '_')
  }

  // 5. fallback: aggressively clean
  return trimmed
    .replace(/^[aAeEiIoOuU]+/, '')
    .replace(/[^a-zA-Z ]/g, '')
    .trim().toLowerCase().replace(/\s+/g, '_')
}

/// Returns a human-readable display name for a stat: localized OCR text is
/// resolved back to the English stat name when possible.
export function displayStatName(raw, aliases) {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (aliases && aliases.size) {
    const [folded, expanded, tight] = foldVariants(trimmed)
    for (const variant of [folded, expanded, tight]) {
      const hit = aliases.get(variant)
      if (hit) {
        // pricer value → English display name
        for (const [enKey, pricerVal] of Object.entries(STAT_TO_PRICER)) {
          if (pricerVal === hit) return enKey
        }
        return hit
      }
    }
  }
  // Try exact case-insensitive match and return the properly-cased key
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (trimmed.toLowerCase() === key.toLowerCase()) return key
  }
  // Try with leading vowel stripped (OCR artifact like "AHeat")
  const deNoised = trimmed.replace(/^[aAeEiIoOuU]+/, '')
  for (const key of Object.keys(STAT_TO_PRICER)) {
    if (deNoised.toLowerCase() === key.toLowerCase()) return key
  }
  // Try substring match
  for (const key of Object.keys(STAT_TO_PRICER)) {
    const kl = key.toLowerCase()
    const rl = trimmed.toLowerCase()
    if (rl.includes(kl) || kl.includes(rl)) return key
  }
  // Fallback: just clean up the raw OCR text
  return trimmed.replace(/^[aAeEiIoOuU]+/, '')
}

/**
 * Parse the raw OCR text of a riven card into { name, mr, rolls, stats }.
 * `garbageRe` matches card-header words to drop (locale-aware).
 * `locale` (optional) makes GARBAGE_TOKEN_RE and cleanup regexes locale-aware;
 * defaults to English.
 */
export function parseRivenOcr(text, garbageRe, locale = 'en') {
  const clean = text
    .replace(/^\[[^\]]*\]\s*/, '')
    .replace(/^[\dA-Z]{1,3}\s*\|\s*/, '')
  const parts = clean.split('|').map(s => s.trim()).filter(Boolean)
  if (parts.length === 0) return null

  let weaponName = ''
  let mr = ''
  let rolls = 0
  const stats = []
  let i = 0

  const GC_GARBAGE = garbageRe || garbageReForLocale(locale)
  const rerollWords = rerollWordSet(locale)

  // Header tokens: mod-drain/capacity/polarity/reroll-counter/riven-title lines,
  // each possibly carrying a number suffix ("Kapazität 18", "Neuausrichtungen 3").
  // Reroll-counter tokens set `rolls`; drain/capacity numbers do not.
  const GARBAGE_TOKEN_RE = garbageTokenReForLocale(locale)

  while (i < parts.length) {
    const p = parts[i]
    if (/^MR\s/i.test(p)) {
      mr = p.replace(/^MR\s*/i, '').trim()
      i++; continue
    }
    // Value-first stat ("+165% Schaden") or name-first stat (Thai cards:
    // "โอกาสคริติคอล +165%" — name then value) both end the header section.
    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p) || /[+\-xX]\s*[\d.,]+[x%]?$/.test(p)) break
    const gm = p.match(GARBAGE_TOKEN_RE)
    if (gm) {
      if (rerollWords.has(gm[1].toLowerCase()) && gm[2] && !rolls) rolls = parseInt(gm[2])
      i++; continue
    }
    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
    }
    if (GC_GARBAGE.test(p)) { i++; continue }
    if (weaponName) weaponName += ' ' + p
    else weaponName = p
    i++
  }

  // Clean any remaining garbage from the weapon name (e.g. "MOD DRAIN" as one part)
  weaponName = weaponName
    // Strip leading mod-drain number (e.g. "18-Aksomati" → "Aksomati")
    .replace(/^\d+\s*[-–—]\s*/, '')
    .replace(garbageSuffixReForLocale(locale), '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim()

  // Build a quick lookup of known stat names (lowercase)
  const KNOWN_STAT_NAMES = new Set(Object.keys(STAT_TO_PRICER).map(k => k.toLowerCase()))

  // Phase 2: parse stat pairs (value followed by name parts)
  let pendingValue = null

  const flushStat = () => {
    if (pendingValue !== null) {
      stats.push({ value: pendingValue, name: pendingName.replace(/\s+/g, ' ').trim() || '?' })
      pendingValue = null
    }
  }

  let pendingName = ''

  while (i < parts.length) {
    const p = parts[i]

    if (/^MR\s/i.test(p)) {
      mr = p.replace(/^MR\s*/i, '').trim()
      i++
      continue
    }

    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p)) {
      flushStat()
      const m = p.match(/^([+\-xX]\s*[\d.,]+[x%]?)\s*(.*)/)
      pendingValue = m ? m[1].replace(/\s+/g, '').replace(',', '.') : p.replace(/\s+/g, '')
      pendingName = m ? m[2].trim() : ''
      i++
      continue
    }

    // Name-first stat (Thai cards: "โอกาสคริติคอล +165%" — name then value).
    // Guards: value must be at the very end, and the name part must be non-empty.
    const nameFirst = p.match(/^(.+?)\s*([+\-xX]\s*[\d.,]+[x%]?)$/)
    if (nameFirst && nameFirst[1] && nameFirst[1].trim().length > 1 && !GC_GARBAGE.test(p)) {
      flushStat()
      pendingValue = nameFirst[2].replace(/\s+/g, '').replace(',', '.')
      pendingName = nameFirst[1].trim().replace(/[:：]\s*$/, '')
      i++
      continue
    }

    if (GC_GARBAGE.test(p)) { i++; continue }

    if (/^\(?x\d/i.test(p) || /[x×]\d/i.test(p) || /^for\s/i.test(p) || /^heavy/i.test(p)) {
      if (pendingName) pendingName += ' ' + p
      i++
      continue
    }

    if (/^\d+$/.test(p)) {
      rolls = parseInt(p)
      i++; continue
    }

    // If this part is a known stat name and we already have a stat in progress,
    // flush it so the known name starts a new stat (handles missing value separators).
    const pl = p.toLowerCase().replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, '')
    if (pl && KNOWN_STAT_NAMES.has(pl) && pendingName && pendingValue !== null) {
      flushStat()
      pendingName = p
      i++
      continue
    }

    if (pendingName) pendingName += ' ' + p
    else pendingName = p
    i++
  }

  flushStat()

  return { name: weaponName, mr, rolls, stats, raw: text }
}
