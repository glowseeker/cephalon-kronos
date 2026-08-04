// Localized riven-card OCR support: stat-name aliases + card-header garbage words.
//
// Stat names are matched three ways (see foldVariants):
//   1. folded  — Unicode NFD-stripped, ß→s   ("Größe" → "grose")
//   2. expanded — umlauts→ae/oe/ue, ß→ss     ("Größe" → "groesse")
//   3. tight   — folded with all non-alnum removed ("Krit. Chance" → "kritchance")
// Aliases come from two sources: the i18n `rivenStats` table (all 15 locales,
// inverted English-key → localized-name) and GAME_STAT_ALIASES (in-game terms
// extracted from export manifests, where the table drifts).

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

// In-game stat terms extracted from ExportUpgrades_{de,fr}.json levelStats.
// The i18n `rivenStats` table drifts from the game in places ("Schlitz" vs
// game "Schnitt"; "Durchdringung" used for both Puncture and Punch Through),
// so these supplement — never replace — the table. Key: locale → term → English.
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
    'Dégâts critiques': 'Critical Damage',
    'Dégâts': 'Damage',
    'Dégâts en Mêlée': 'Melee Damage',
    'Tir Multiple': 'Multishot',
    "Vitesse d'Attaque": 'Attack Speed',
    'Cadence de Tir': 'Fire Rate',
    'Chances de Statut': 'Status Chance',
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
    "Recul de l'Arme": 'Recoil',
    "Chances de Critique pour l'Attaque Glissée": 'Slide Crit Chance',
    "Rayon d'Explosion": 'Blast Radius',
    'Zoom': 'Zoom',
    'Chances de Points de Combo': 'Combo Count Chance',
  },
  // IT: in-game stat terms (extracted from i18n table + known game lockeys)
  it: {
    'Prob. critica': 'Critical Chance',
    'Danno critico': 'Critical Damage',
    'Danno': 'Damage',
    'Danno corpo a corpo': 'Melee Damage',
    'Tiro multiplo': 'Multishot',
    'Velocità d\'attacco': 'Attack Speed',
    'Cadenza di tiro': 'Fire Rate',
    'Prob. stato': 'Status Chance',
    'Durata stato': 'Status Duration',
    'Portata': 'Range',
    'Perforazione': 'Puncture',
    'Fendente': 'Slash',
    'Impatto': 'Impact',
    'Calore': 'Heat',
    'Freddo': 'Cold',
    'Elettricità': 'Electricity',
    'Veleno': 'Toxin',
    'Velocità di ricarica': 'Reload Speed',
    'Capacità caricatore': 'Magazine Capacity',
    'Munizione max': 'Ammo Maximum',
    'Trafitto': 'Punch Through',
    'Velocità proiettili': 'Projectile Speed',
    'Combo iniziale': 'Initial Combo',
    'Durata combo': 'Combo Duration',
    'Danno finalizzatore': 'Finisher Damage',
    'Danno ai Corpus': 'Damage to Corpus',
    'Danno ai Grineer': 'Damage to Grineer',
    'Danno agli Infetti': 'Damage to Infested',
    'Ricarica': 'Recoil',
    'Prob. critica scivolata': 'Slide Crit Chance',
    'Raggio esplosione': 'Blast Radius',
    'Zoom': 'Zoom',
    'Prob. contatore combo': 'Combo Count Chance',
  },
  // ES: in-game stat terms
  es: {
    'Prob. crítico': 'Critical Chance',
    'Daño crítico': 'Critical Damage',
    'Daño': 'Damage',
    'Daño cuerpo a cuerpo': 'Melee Damage',
    'Tiro múltiple': 'Multishot',
    'Velocidad de ataque': 'Attack Speed',
    'Cadencia de fuego': 'Fire Rate',
    'Prob. Estado': 'Status Chance',
    'Duración de Estado': 'Status Duration',
    'Alcance': 'Range',
    'Perforación': 'Puncture',
    'Corte': 'Slash',
    'Impacto': 'Impact',
    'Calor': 'Heat',
    'Frío': 'Cold',
    'Electricidad': 'Electricity',
    'Veneno': 'Toxin',
    'Velocidad de recarga': 'Reload Speed',
    'Capacidad del cargador': 'Magazine Capacity',
    'Munición máxima': 'Ammo Maximum',
    'Perforación de proyectil': 'Punch Through',
    'Velocidad de proyectiles': 'Projectile Speed',
    'Combo inicial': 'Initial Combo',
    'Duración del combo': 'Combo Duration',
    'Daño de finalizador': 'Finisher Damage',
    'Daño a los Corpus': 'Damage to Corpus',
    'Daño a los Grineer': 'Damage to Grineer',
    'Daño a los Infestados': 'Damage to Infested',
    'Retroceso': 'Recoil',
    'Prob. crítica al deslizar': 'Slide Crit Chance',
    'Radio de explosión': 'Blast Radius',
    'Zoom': 'Zoom',
    'Prob. contador de combo': 'Combo Count Chance',
  },
  // PL: in-game stat terms
  pl: {
    'Szansa krytyczna': 'Critical Chance',
    'Obrażenia krytyczne': 'Critical Damage',
    'Obrażenia': 'Damage',
    'Obrażenia z bliskiego walki': 'Melee Damage',
    'Wielokrotne strzały': 'Multishot',
    'Prędkość ataku': 'Attack Speed',
    'Tempo ognia': 'Fire Rate',
    'Szansa na stan': 'Status Chance',
    'Czas trwania stanu': 'Status Duration',
    'Zasięg': 'Range',
    'Przenikanie': 'Puncture',
    'Cięcie': 'Slash',
    'Obuch': 'Impact',
    'Ciepło': 'Heat',
    'Zimno': 'Cold',
    'Elektrownia': 'Electricity',
    'Toksyna': 'Toxin',
    'Prędkość przeładowania': 'Reload Speed',
    'Pojemność magazynka': 'Magazine Capacity',
    'Maks. amunicja': 'Ammo Maximum',
    'Przenikanie': 'Punch Through',
    'Prędkość pocisków': 'Projectile Speed',
    'Początkowy combo': 'Initial Combo',
    'Czas trwania combo': 'Combo Duration',
    'Obrażenia od wymieracza': 'Finisher Damage',
    'Obrażenia wobec Corpus': 'Damage to Corpus',
    'Obrażenia wobec Grineer': 'Damage to Grineer',
    'Obrażenia wobec Infested': 'Damage to Infested',
    'Odrzut': 'Recoil',
    'Szansa krytyczna na strzał boczny': 'Slide Crit Chance',
    'Promień eksplozji': 'Blast Radius',
    'Zoom': 'Zoom',
    'Szansa na licznik combo': 'Combo Count Chance',
  },
  // UK: in-game stat terms
  uk: {
    'Шанс кріт. удару': 'Critical Chance',
    'Кріт. урон': 'Critical Damage',
    'Урон': 'Damage',
    'Урон ближнього бою': 'Melee Damage',
    'Множення куль': 'Multishot',
    'Швидкість атаки': 'Attack Speed',
    'Каденція вогню': 'Fire Rate',
    'Шанс стану': 'Status Chance',
    'Тривалість стану': 'Status Duration',
    'Дальність': 'Range',
    'Проникання': 'Puncture',
    'Різання': 'Slash',
    'Вплив': 'Impact',
    'Тепло': 'Heat',
    'Холід': 'Cold',
    'Електрика': 'Electricity',
    'Токсин': 'Toxin',
    'Швидкість перезарядки': 'Reload Speed',
    'Ємність магазину': 'Magazine Capacity',
    'Макс. боєпаливо': 'Ammo Maximum',
    'Проникання куль': 'Punch Through',
    'Швидкість снарядів': 'Projectile Speed',
    'Початковий комбо': 'Initial Combo',
    'Тривалість комбо': 'Combo Duration',
    'Урон виконавця': 'Finisher Damage',
    'Урон ворогу Corpus': 'Damage to Corpus',
    'Урон ворогу Grineer': 'Damage to Grineer',
    'Урон ворогу Infested': 'Damage to Infested',
    'Відбив': 'Recoil',
    'Шанс кріт. удару при нахилі': 'Slide Crit Chance',
    'Радіус вибуху': 'Blast Radius',
    'Zoom': 'Zoom',
    'Шанс лічильника комбо': 'Combo Count Chance',
  },
  // TR: in-game stat terms
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
    'Magazin Kapasitesi': 'Magazine Capacity',
    'Maksimum mühim': 'Ammo Maximum',
    'Delerek': 'Punch Through',
    'Mühim Hızı': 'Projectile Speed',
    'Başlangıç Kombin': 'Initial Combo',
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
  th: ['รีโซต'],
}

// Full set of garbage words per locale (drain/polarity + reroll + riven label).
export const GARBAGE_BY_LOCALE = {
  en: ['drain', 'capacity', 'polarity', 'roll', 'reroll', 'rerolls', 'counter', 'riven'],
  de: ['kapazität', 'polarität', 'neuausrichtung', 'neuausrichtungen', 'riven'],
  fr: ['capacité', 'polarité', 'relance', 'relances', 'riven'],
  es: ['capacidad', 'polaridad', 'reconfiguración', 'reconfiguraciones', 'riven'],
  it: ['capacità', 'polarità', 'reconfigura', 'riconfigura', 'riven'],
  pt: ['capacidade', 'polaridade', 'reconfiguração', 'reconfigurações', 'riven'],
  tr: ['kapasite', 'polarite', 'yeniden yapılandırma', 'yeniden yapılandırmalar', 'riven'],
  ru: ['ёмкость', 'полярность', 'перенастройка', 'перенастройки', 'клинок'],
  uk: ['ємність', 'полярність', 'переналаштування', 'рівень'],
  pl: ['pojemność', 'polarność', 'przekonfiguracja', 'przekonfiguracje', 'riven'],
  tc: ['容量', '極性', '重鑄', 'riven'],
  zh: ['容量', '极性', '重铸', 'riven'],
  ko: ['용량', '극성', '재구성', '레진'],
  ja: ['容量', '極性', '再鑑定', 'レヴン'],
  th: ['ความจุ', '극성', 'รีโซต', 'เมฆ'],
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
    if (/^[+\-xX]\s*[\d.,]+[x%]?/.test(p)) break
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
