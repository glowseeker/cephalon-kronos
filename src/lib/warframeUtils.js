/**
 * warframeUtils.js
 *
 * Shared lookup tables and resolution utilities imported by both
 * inventoryParser.js and worldstateParser.js.
 *
 * Nothing in this file makes network calls or reads from disk.
 * It is purely declarative data + pure functions.
 *
 * KEY EXPORTS
 * ─────────────────────────────────────────
 * GeneralOverrides   - internal key → display string (ally agents, factions, bosses, modifiers)
 * MAPPING_TYPES      - mission type code → display name
 * resolveNode        - resolve a node tag / faction / modifier key to a display string
 * resolveMissionType - resolve a raw mission type value to a display name
 * resolveChallenge   - resolve a Nightwave challenge path to a title
 * resolveChallengeDesc - resolve the body text of a Nightwave challenge
 * resolveRewardText  - turn a reward object into a human-readable string
 * resolveItemName    - resolve an item unique name to a display string
 * resolveAnyImage    - find a usable image URL for an item or reward
 * timeRemaining      - format time until an expiry date
 * timeSince          - format elapsed time since a date
 * formatLastUpdate   - format a timestamp as "today HH:MM" or "Jan 1 HH:MM"
 */

// ─── General Display Overrides ──────────────────────────────────────────
//
// Maps internal key strings (ally agents, faction codes, boss/modifier tags)
// to human-readable display names.
// Used by resolveNode() as a fallback after dictionary lookups.
//
// Groups:
//   Ally Agents (1999/Hex NPCs)
//   Factions
//   Sortie Bosses
//   Archon Hunt Bosses
//   Deep Archimedea overrides
//   Sortie / Mission Modifiers
export const GeneralOverrides = {
  // Ally agents (1999 / Hex)
  'AoiAllyAgent': 'Aoi',
  'ArthurAllyAgent': 'Arthur',
  'QuincyAllyAgent': 'Quincy',
  'EleanorAllyAgent': 'Eleanor',
  'LettieAllyAgent': 'Lettie',
  'AmirAllyAgent': 'Amir',
  // Factions  -  use DE dict paths for proper locale resolution
  'FC_CORPUS': '/Lotus/Language/Game/Faction_CorpusUC',
  'FC_GRINEER': '/Lotus/Language/Game/Faction_GrineerUC',
  'FC_INFESTATION': '/Lotus/Language/Game/Faction_InfestationUC',
  'FC_OROKIN': '/Lotus/Language/Game/Faction_OrokinUC',
  'FC_SENTIENT': '/Lotus/Language/Game/Faction_SentientUC',
  'FC_MURMUR': '/Lotus/Language/Game/Faction_MITW',
  'FC_NARMON': '/Lotus/Language/Game/Faction_NarmerUC',
  'FC_NARMER': '/Lotus/Language/Game/Faction_NarmerUC',
  'FC_MITW': '/Lotus/Language/Game/Faction_MITW',
  'FC_TECHROT': '/Lotus/Language/1999/Faction_Techrot',
  'FC_SCALDRA': '/Lotus/Language/1999/Faction_Scaldra',
  'SORTIE_BOSS_HEK': 'Vay Hek',
  'SORTIE_BOSS_RUK': 'Sargas Ruk',
  'SORTIE_BOSS_KELA': 'Kela De Thaym',
  'SORTIE_BOSS_JACKAL': 'The Jackal',
  'SORTIE_BOSS_VOR': 'Captain Vor',
  'SORTIE_BOSS_LECH_KRIL': 'Lieutenant Lech Kril',
  'SORTIE_BOSS_TYL_REGOR': 'Tyl Regor',
  'SORTIE_BOSS_ALAD_V': 'Alad V',
  'SORTIE_BOSS_MUTALIST_ALAD_V': 'Mutalist Alad V',
  'SORTIE_BOSS_NEF': 'Nef Anyo',
  'SORTIE_BOSS_NEF_ANYO': 'Nef Anyo',
  'SORTIE_BOSS_AMBULLAS': 'Ambullas',
  'SORTIE_BOSS_HYYENA_PACK': 'Hyena Pack',
  'SORTIE_BOSS_PHEVOR': 'Phorid',
  'SORTIE_BOSS_LEPHANTIS': 'Lephantis',
  'SORTIE_BOSS_ROPALOLYST': 'The Ropalolyst',
  'SORTIE_BOSS_EXPLOITER': 'Exploiter Orb',
  // Archon Hunt bosses
  SORTIE_BOSS_AMAR: 'Amar',
  SORTIE_BOSS_NIRA: 'Nira',
  SORTIE_BOSS_BOREAL: 'Boreal',
  SORTIE_BOSS_NIHIL: 'Nihil',

  // Sortie modifiers and bosses are now resolved per-locale via
  // resolveSortieKey() in sortieTranslations.js (sourced from the DE manifest).
  // The English fallbacks below are kept only as a last resort for keys
  // not yet in the translation table.
  'SORTIE_MODIFIER_POISON': 'Toxin',
  'SORTIE_MODIFIER_SLASH': 'Slash',
  'SORTIE_MODIFIER_LOW_ENERGY': 'Energy Reduction',
  'SORTIE_MODIFIER_ARMOR_REDUCTION': 'Physical Enhancement: Armor',
  'SORTIE_MODIFIER_SHIELD_REDUCTION': 'Shield Reduction',
  'SORTIE_MODIFIER_SHIELDS': 'Shield Disruption',   // seen in live worldstate
  'SORTIE_MODIFIER_ELECTRICAL': 'Electrical Hazard',
  'SORTIE_MODIFIER_FREEZE': 'Cryogenic Leak',
  'SORTIE_MODIFIER_FIRE': 'Fire Hazard',
  'SORTIE_MODIFIER_PHYSICAL_RESIST': 'Physical Resistance',
  'SORTIE_MODIFIER_ELEMENTAL_RESIST': 'Elemental Resistance',
  'SORTIE_MODIFIER_EXTRA_ARMOR': 'Augmented Enemy Armor',
  'SORTIE_MODIFIER_EXTRA_SHIELD': 'Augmented Enemy Shields',
  'SORTIE_MODIFIER_EXIMUS': 'Eximus Stronghold',
  'SORTIE_MODIFIER_HAZARD_RADIATION': 'Radiation Hazard',
  'SORTIE_MODIFIER_HAZARD_FOG': 'Dense Fog',
  'SORTIE_MODIFIER_HAZARD_COLD': 'Cryogenic Leakage',
  'SORTIE_MODIFIER_HAZARD_MAGNETIC': 'Magnetic Storm',
}

// ─── Mission Type Lookup ─────────────────────────────────────────────────
//
// Maps MT_ mission type codes to display names.
// Also includes some legacy text-key overrides (Destroy, Mobile, etc.) that
// appear in older worldstate data and the /Disruption alias for MT_ARTIFACT.
export const MAPPING_TYPES = {
  'MT_MOBILE_DEFENSE': 'Mobile Defense',
  'MT_INTEL': 'Spy',
  'MT_ASSASSINATION': 'Assassination',
  'MT_SABOTAGE': 'Sabotage',
  'MT_SURVIVAL': 'Survival',
  'MT_DEFENSE': 'Defense',
  'MT_EXTERMINATION': 'Extermination',
  'MT_RESCUE': 'Rescue',
  'MT_CAPTURE': 'Capture',
  'MT_EXCAVATION': 'Excavation',
  // Live worldstate sends MT_EXCAVATE for excavation fissures (the older
  // MT_EXCAVATION code still appears in node data).
  'MT_EXCAVATE': 'Excavation',
  'MT_HIJACK': 'Hijack',
  'MT_INTERCEPTION': 'Interception',
  'MT_ARTIFACT': 'Disruption',
  'Destroy': 'Sabotage',
  'Survivor': 'Survival',
  'Territory': 'Interception',
  'Retrieval': 'Recovery',
  'Mobile': 'Mobile Defense',
  'Vania': '',
  'Hex': '',
  '1999': '',
  'MT_ALCHEMY': 'Alchemy',
  'ALCHEMY': 'Alchemy',
  'MT_CORRUPTION': 'Corruption',
  'CORRUPTION': 'Corruption',
  'MT_EXCAVATE': 'Excavation',
  'EXCAVATE': 'Excavation',
  'MT_SURVIVAL': 'Survival',
  'SURVIVAL': 'Survival',
  'MT_VOID_FLOOD': 'Void Flood',
  'VOID_FLOOD': 'Void Flood',
  'MT_VOID_CASCADE': 'Void Cascade',
  'VOID_CASCADE': 'Void Cascade',
  'MT_VOID_ARMAGEDDON': 'Void Armageddon',
  'VOID_ARMAGEDDON': 'Void Armageddon',
  'MT_ASSAULT': 'Assault',
  'ASSAULT': 'Assault',
  'MT_PURSUIT': 'Pursuit',
  'PURSUIT': 'Pursuit',
  'MT_RUSH': 'Rush',
  'RUSH': 'Rush',
}

// Map from MAPPING_TYPES values to /Lotus/Language/Missions/MissionName_{key} dict paths
const MISSION_NAME_KEYS = {
  'Mobile Defense': 'MobileDefense',
  'Spy': 'Spy',
  'Assassination': 'Assassination',
  'Sabotage': 'Sabotage',
  'Survival': 'Survival',
  'Defense': 'Defense',
  'Extermination': 'Exterminate',
  'Rescue': 'Rescue',
  'Capture': 'Capture',
  'Excavation': 'Excavation',
  'Hijack': 'Retrieval',
  'Interception': 'Territory',
  'Disruption': 'Artifact',
  'Recovery': 'Retrieval',
  'Alchemy': 'Alchemy',
  'Corruption': 'Corruption',
  'Void Flood': 'VoidFlood',
  'Void Cascade': 'VoidCascade',
  'Void Armageddon': 'VoidArmageddon',
  'Assault': 'Assault',
  'Pursuit': 'Pursuit',
  'Rush': 'Rush',
}

// ── Sortie translations (per-locale boss/modifier strings from DE manifest) ──
import { resolveSortieKey } from './sortieTranslations.js';

const clean = (s) => {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '').replace(/\\n/g, ' ').trim()
}


// ─── Warframe Skin Folder Overrides ───────────────────────────────────
//
// Maps the parent folder name of a skin path to the Warframe it belongs to.
// Tennogen / Deluxe skin paths use designer-chosen folder names (e.g. 'Harlequin'
// for the Mirage skin), so we need this to display the correct Warframe name.
// Used by nameFromPath() in both resolveItemName() and inventoryParser.resolveName().

export const DescriptionOverrides = {
  'EMPBlackHole': 'As Rogue Arcocanids charge attacks, they pull Warframes toward them.',
}


// ─── Node / Key Resolution ────────────────────────────────────────────────────

/**
 * Resolve a node tag, faction code, boss key, or modifier identifier to a
 * human-readable display string.
 * Priority: description overrides → dict → ExportRegions → GeneralOverrides →
 *   MAPPING_TYPES → dict tail → prefix formatting → PascalCase → raw string.
 */
export function resolveNode(node, dict, ERg, locale = 'en') {
  if (!node) return 'Unknown Node'

  // Check Description Overrides if the key looks like a description request
  const cleanKey = node.replace(/_Desc$/, '').replace(/Desc$/, '');
  if (node.endsWith('_Desc') || node.endsWith('Desc')) {
    if (DescriptionOverrides[cleanKey]) return DescriptionOverrides[cleanKey];
  }

  if (dict[node]) return clean(dict[node])
  if (dict['/' + node]) return clean(dict['/' + node])

  // Sortie boss / modifier keys (SORTIE_BOSS_*, SORTIE_MODIFIER_*) are not in
  // the language dicts  -  resolve from the per-locale DE manifest table.
  const leaf = node.split('/').at(-1);
  // Archon Hunt bosses (SORTIE_BOSS_BOREAL, etc.) have localized Narmer names
  // in the dict at /Lotus/Language/Narmer/Archon{Leaf}. Prefer that over the
  // English sortie table so e.g. zh renders 执刑官诡文枭主 instead of ARCHON BOREAL.
  if (leaf.startsWith('SORTIE_BOSS_')) {
    // worldstate gives the upper-case leaf SORTIE_BOSS_BOREAL; the dict
    // Narmer key uses mixed case (ArchonBoreal), so title-case the tail.
    const archonLeaf = leaf.replace(/^SORTIE_BOSS_ARCHON_/, '').replace(/^SORTIE_BOSS_/, '');
    const archonName = archonLeaf.charAt(0).toUpperCase() + archonLeaf.slice(1).toLowerCase();
    const archonKey = '/Lotus/Language/Narmer/Archon' + archonName;
    const archonVal = dict[archonKey] || dict['/' + archonKey];
    if (archonVal && typeof archonVal === 'string' && !archonVal.startsWith('/Lotus/')) {
      return clean(archonVal);
    }
  }
  if (leaf.startsWith('SORTIE_')) {
    const translated = resolveSortieKey(leaf, locale);
    if (translated) return translated;
  }

  // AvatarImage store item glyphs (e.g. AvatarImageDogDaysErraGlyph) map to
  // /Lotus/Language/Glyphs/{Leaf}Name in the game dict (e.g.
  // DogDaysErraGlyphName → "Dog Days Erra Glyph").  Strip the "AvatarImage"
  // prefix and "Glyph" suffix to build the dict key.
  if (leaf.startsWith('AvatarImage')) {
    const stripped = leaf.replace(/^AvatarImage/, '')
      .replace(/Glyph$/, '')
      .replace(/Item$/, '');
    const glyphKey = `/Lotus/Language/Glyphs/${stripped}Name`;
    const glyphVal = dict[glyphKey] || dict['/' + glyphKey];
    if (glyphVal && typeof glyphVal === 'string' && !glyphVal.startsWith('/Lotus/')) {
      return clean(glyphVal);
    }
  }

  const entry = ERg[node]
  if (entry && entry.name) {
    const res = dict[entry.name] || dict['/' + entry.name]
    if (res) return clean(res)
  }

  const last = node.split('/').at(-1)
  // GeneralOverrides may contain either a plain label or a DE dict path.
  // If it's a dict path, resolve it through the dict for proper locale output.
  if (GeneralOverrides[last]) {
    const ov = GeneralOverrides[last]
    if (ov.startsWith('/')) return clean(dict[ov] || dict['/' + ov] || ov)
    return ov
  }
  if (DescriptionOverrides[last]) return DescriptionOverrides[last]
  if (MAPPING_TYPES[last]) return MAPPING_TYPES[last]
  if (dict[last]) return clean(dict[last])
  if (dict['/' + last]) return clean(dict['/' + last])

  // Fallback cleanup
  if (last.startsWith('MT_')) {
    return last.replace('MT_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (last.startsWith('CT_') || last.startsWith('CD_') || last.startsWith('FC_')) {
    return last.split('_').slice(1).join(' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  // Handle generic CamelCase/PascalCase if no dict entry
  if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(last)) {
    return splitPascal(last)
  }

  return clean(node)
}


/**
 * Resolve a raw mission type value (MT_ code, text alias) to a display name.
 * Wraps resolveNode() and also consults MAPPING_TYPES directly.
 */
export function resolveMissionType(raw, dict, ERg, locale = 'en') {
  if (!raw) return ''
  // The worldstate sends ALLCAPS MT_ codes (MT_SURVIVAL, MT_EXCAVATE,
  // MT_ALCHEMY, MT_CORRUPTION…) but DE ships the dict keys PascalCase
  // (MissionName_Survival, MissionName_Alchemy…). Try the PascalCase form
  // first so newer mission types (Alchemy, Corruption, Assault…) localize.
  const pascal = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
  const code = raw.replace('MT_', '')
  const pascalKey = `/Lotus/Language/Missions/MissionName_${pascal(code)}`
  if (dict[pascalKey]) return clean(dict[pascalKey])
  // Some mirrors store ALLCAPS keys  -  try the raw code form too.
  const rawKey = `/Lotus/Language/Missions/MissionName_${code}`
  if (dict[rawKey]) return clean(dict[rawKey])
  // Fallback to MAPPING_TYPES (hardcoded English) then try to resolve via MISSION_NAME_KEYS
  if (MAPPING_TYPES[raw] !== undefined) {
    const english = MAPPING_TYPES[raw]
    const mk = MISSION_NAME_KEYS[english]
    if (mk) {
      const localized = dict[`/Lotus/Language/Missions/MissionName_${mk}`]
      if (localized) return clean(localized)
    }
    return english
  }
  const resolved = resolveNode(raw, dict, ERg, locale)
  const english = MAPPING_TYPES[resolved]
  if (english !== undefined) {
    const mk = MISSION_NAME_KEYS[english]
    if (mk) {
      const localized = dict[`/Lotus/Language/Missions/MissionName_${mk}`]
      if (localized) return clean(localized)
    }
    return english
  }
  return resolved
}


// ─── Nightwave / Challenge Resolution ─────────────────────────────────

/**
 * Resolve a Nightwave challenge path to its title string.
 * Tries dict, ExportChallenges, then falls back to formatting the path leaf.
 */
export function resolveChallenge(path, dict, EC) {
  if (!path) return 'Bounty'

  if (dict[path]) return clean(dict[path])
  if (dict['/' + path]) return clean(dict['/' + path])

  const entry = EC[path]
  if (entry && entry.name) {
    const res = dict[entry.name] || dict['/' + entry.name]
    if (res) return clean(res)
  }

  const last = path.split('/').at(-1)
  if (GeneralOverrides[last]) return GeneralOverrides[last]
  return last.replace(/Challenge$/, '').replace(/([A-Z])/g, ' $1').trim()
}

// ─── Bounty Challenge Display Name ─────────────────────────────────────

// Filler words stripped from bounty challenge filenames for clean display.
// Includes path-structure-only tokens, tier/rotation markers, and abbreviations
// that don't carry meaning for the user-facing bounty name.
const BOUNTY_FILLER = new Set([
  'Bounty', 'Cap', 'Ext', 'Lib', 'Sab', 'Cache', 'Two', 'Props', 'Easy',
  'Normal', 'Hard', 'Elite', 'X', 'Tent', 'Job', 'Key', 'Pieces', 'Crp',
  'Grn', 'Endless', 'Chamber',
  // Syndicate / area prefixes
  'Vania', 'Hex', '1999', 'Venus', 'Deimos', 'Narmer', 'Cetus', 'Solaris',
])
/**
 * Strips filler words and syndicate prefixes that are meaningless to the user,
 * leaving mission-type descriptors (e.g. "Capture", "Area Defense", "Cull Resource").
 * Falls back to the cleanest available representation when everything is filler.
 */
export function cleanBountyName(path) {
  if (!path) return 'Bounty'
  const fn = path.split('/').pop()
  const words = fn.replace(/([A-Z])/g, ' $1').trim().split(/\s+/)
  const sig = words.filter(w => !BOUNTY_FILLER.has(w))
  // Deduplicate consecutive identical words (e.g. "Spy Spy" → "Spy")
  const deduped = sig.filter((w, i) => i === 0 || w !== sig[i - 1])
  if (deduped.length > 0) return deduped.join(' ')
  // All words are filler  -  fall back to first meaningful looking chunk
  return words.filter(w => w.length > 1).join(' ') || words[0] || 'Bounty'
}

// Deimos jobType leaves (e.g. DeimosExcavateBounty) abbreviate the mission
// type inside the dict key (DeimosBountyExcavName); map the few known forms.
const DEIMOS_BOUNTY_ABBR = {
  Excavate: 'Excav',
  CrpSurvivor: 'CrpSurv',
  GrnSurvivor: 'GrnSurv',
  KeyPieces: 'Keys',
  AreaDefense: 'AreaDef',
  Assassinate: 'Assass',
  Purify: 'Purify',
}

/**
 * Resolve an open-world bounty jobType path to its official localized title
 * (e.g. /Lotus/Types/Gameplay/Eidolon/Jobs/AttritionBountyExt →
 * "CULL THE ENEMY"). The game dict stores these under three different key
 * schemes per syndicate:
 *   - Cetus:    /Lotus/Language/OstronJobs/{leaf}Title
 *   - Vallis:   /Lotus/Language/SolarisJobs/{leaf minus Venus prefix}Title
 *   - Deimos:   /Lotus/Language/InfestedMicroplanet/DeimosBounty{Type}Name
 * Returns '' when the path isn't a known bounty job (caller falls back).
 */
export function resolveBountyTitle(path, dict) {
  if (!path || !dict) return ''
  const leaf = path.split('/').pop()
  if (!leaf) return ''
  // Cetus / Ostron
  let key = `/Lotus/Language/OstronJobs/${leaf}Title`
  let res = dict[key] || dict['/' + key]
  if (res && !res.startsWith('/Lotus/')) return clean(res)

  // Vallis / Solaris (leaf may be Venus{...} or NarmerVenus{...})
  const solarisLeaf = leaf.replace(/^(Narmer)?Venus/, '')
  key = `/Lotus/Language/SolarisJobs/${solarisLeaf}Title`
  res = dict[key] || dict['/' + key]
  if (!res && solarisLeaf.endsWith('s')) {
    // e.g. VenusHelpingJobCaches → HelpingJobCacheTitle (dict uses singular)
    const singular = solarisLeaf.slice(0, -1)
    key = `/Lotus/Language/SolarisJobs/${singular}Title`
    res = dict[key] || dict['/' + key]
  }
  if (res && !res.startsWith('/Lotus/')) return clean(res)

  // Deimos / Entrati
  const m = leaf.match(/^Deimos(.+)Bounty$/)
  if (m) {
    const type = DEIMOS_BOUNTY_ABBR[m[1]] ?? m[1]
    key = `/Lotus/Language/InfestedMicroplanet/DeimosBounty${type}Name`
    res = dict[key] || dict['/' + key]
    if (res && !res.startsWith('/Lotus/')) return clean(res)
  }

  return ''
}
export function resolveChallengeDesc(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  let res = ''

  // 1. Try specified description key in EC
  if (entry && entry.description) {
    res = dict[entry.description] || dict['/' + entry.description] || ''
  }

  // 2. Try replacing _Name with _Description (standard pattern)
  if (!res && entry && entry.name && entry.name.endsWith('_Name')) {
    const descKey = entry.name.replace('_Name', '_Description')
    res = dict[descKey] || dict['/' + descKey] || ''
  }

  // 3. Fallback to direct dictionary resolution based on path
  if (!res) {
    const last = path.split('/').at(-1)
    res = dict[path + '_Description'] || dict['/' + path + '_Description'] ||
          dict[path + '_Desc'] || dict['/' + path + '_Desc'] ||
          dict[last + '_Description'] || dict[last + '_Desc'] || ''
  }

  if (res) {
    // Strip OPEN_COLOR/CLOSE_COLOR marketing labels and the bare |ALLY| Bounty
    // token BEFORE clean() (which would otherwise leave stray " Bounty"/
    // "Antivirus Bounty" fragments), then substitute |COUNT| before it too.
    res = res.replace(/\|OPEN_COLOR\|.*?\|CLOSE_COLOR\|/gs, '')
    res = res.replace(/\|ALLY\|\s+Bounty/gi, '')
    if (allyPath) {
      const allyName = resolveNode(allyPath, dict, ERg) || ''
      res = res.replace(/\|ALLY\|/g, allyName)
    }
    res = res.replace(/\|COUNT\|/g, entry?.requiredCount || '')
    res = clean(res)
    return res.replace(/\|[^|]*\|/g, '').replace(/\/[L|l]otus\/[^ ]*/g, '').trim()
  }

  return ''
}


/**
 * Resolve a 1999/Hex protoframe ally agent path (e.g.
 * /Lotus/Types/Gameplay/1999Wf/ProtoframeAllies/QuincyAllyAgent) to the
 * localized messenger name (e.g. /Lotus/Language/1999/MessengerQuincyName
 * = "Квінсі"). Returns '' when the path isn't a known protoframe ally.
 */
function resolveProtoframeAllyName(allyPath, dict) {
  if (!allyPath || !dict) return ''
  const leaf = allyPath.split('/').pop() || ''
  const name = leaf.replace(/AllyAgent$/, '')
  if (!name || name === leaf) return ''
  // DE internal codenames differ from display names for some protoframes:
  // Amir is keyed "Jabir" (like Zylok → SybarisPistolName). Look up the
  // display-name key first, then the codename alias.
  const CODENAMES = { Amir: 'Jabir' }
  const dictName = CODENAMES[name] || name
  const key = `/Lotus/Language/1999/Messenger${dictName}Name`
  const val = dict[key] || dict['/' + key]
  if (val && typeof val === 'string' && !val.startsWith('/Lotus/')) return clean(val)
  return ''
}

export function resolveChallengeFlavour(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  if (entry && entry.flavour) {
    let res = dict[entry.flavour] || dict['/' + entry.flavour]
    if (res) {
      // Substitute |ALLY| BEFORE clean() strips it as markup, otherwise the
      // flavor loses its subject (e.g. "Eleanor needs sniper cover" -> bare
      // "needs sniper cover for this mission.").
      if (allyPath) {
        const allyName = resolveProtoframeAllyName(allyPath, dict) || resolveNode(allyPath, dict, ERg) || ''
        res = res.replace(/\|ALLY\|/g, allyName)
      }
      res = clean(res)
      return res.replace(/\|[^|]*\|/g, '').trim()
    }
  }
  return ''
}


// ─── Reward / Item Resolution ──────────────────────────────────────────

/**
 * Turn a Warframe reward object ({items, countedItems, itemString}) into a
 * human-readable comma-separated string (or the chosen separator).
 * Returns null if the reward object is empty / unresolvable.
 */
export function resolveRewardText(reward, dict, ERg, uniqueNameToName = {}, sep = ', ', locale = 'en') {
  if (!reward) return null
  const cItems = reward.countedItems ?? reward.CountedItems ?? []
  const rawItems = reward.items ?? reward.Items ?? []

  const resolveNameStr = (name) => {
    if (!name) return ''
    if (name.startsWith('/Lotus/')) {
      const resolved = resolveItemName(name, dict, uniqueNameToName, locale)
      if (resolved && !resolved.startsWith('/Lotus/')) return resolved
      return resolveNode(name, dict, ERg, locale)
    }
    return name
  }

  const parts = []
  rawItems.forEach(it => {
    const resolved = resolveNameStr(it)
    if (resolved) parts.push(resolved)
  })
  cItems.forEach(ci => {
    // Prefer the ItemType path (/Lotus/...) over ci.type?.name: warframestat.us
    // pre-resolves type.name to the ENGLISH display name, which would bypass
    // the localized dict lookup (e.g. "Mutalist Alad V Nav Coordinate").
    const name = ci.ItemType ?? (ci.type && typeof ci.type === 'string' ? ci.type : ci.type?.name) ?? ci.key ?? ''
    const resolved = resolveNameStr(name)
    if (resolved) {
      const count = ci.count ?? ci.ItemCount ?? 1
      parts.push((count > 1 ? `${count}× ` : '') + resolved)
    }
  })

  if (parts.length > 0) return parts.join(sep)

  let fb = reward.itemString || reward.asString || null
  if (fb && fb.startsWith('/Lotus/')) {
    const resolved = resolveItemName(fb, dict, uniqueNameToName, locale)
    if (resolved && !resolved.startsWith('/Lotus/')) return resolved
    fb = resolveNode(fb, dict, ERg, locale)
  }
  return fb
}

const FOLDER_OVERRIDES = {
  Harlequin: 'Mirage', Pirate: 'Hydroid', Tengu: 'Zephyr',
  Paladin: 'Oberon', Berserker: 'Valkyr', Priest: 'Trinity',
  Sandman: 'Equinox', Ranger: 'Ivara', AntiMatter: 'Limbo',
  Pacifist: 'Baruuk', Magician: 'Nyx', YinYang: 'Equinox',
  Trapper: 'Khora', Necro: 'Nekros', Dragon: 'Chroma',
  Brawler: 'Atlas', Cowgirl: 'Cyte-09',
  BrokenFrame: 'Broken Warframe',
  ConcreteFrame: 'Kullervo',
  Alchemist: 'Citrine', PaxDuviricus: 'Voruna',
  Infestation: 'Nidus', Geode: 'Gauss',
  IronFrame: 'Styanax', Frumentarius: 'Grendel',
  Devourer: 'Lavos', Choir: 'Octavia',
  Bard: 'Octavia', Odalisk: 'Caliban',
  Pagemaster: 'Xaku', Werewolf: 'Voruna',
  Glass: 'Gara', Temple: 'Whisper',
  Fairy: 'Wisp', Jade: 'Nyx',
};

// NAME_OVERRIDES is no longer needed  -  all previously-overridden items are
// either hidden (MuseumDogTag, TestPartItem) or resolved by the game dict.

// Riven stat name translations moved to src/lib/i18n/{locale}.json (rivenStats).
// Generation seed: scripts/riven-stat-translations.seed.json.

// Locale-aware rendering for recipe/blueprint names.
// The Warframe game dict has no standalone "Blueprint" key, so we map the
// per-locale pattern here (prefix languages: fr "Schéma de X", es "Plano de X",
// ru "Чертёж X"; suffix languages: en "X Blueprint", de "X Blaupause",
// ja "X 設計図"…). Verified against the game dict's own blueprint strings
// (e.g. /Lotus/Language/JunctionReworkChallenges/Challenge_VMPurchaseRhinoBlueprint_Name).
const BLUEPRINT_TEMPLATE = {
  en: '{name} Blueprint',
  de: '{name} Blaupause',
  fr: 'Schéma de {name}',
  es: 'Plano de {name}',
  it: 'Schema {name}',
  pt: 'Diagrama do {name}',
  tr: '{name} Kalıbı',
  ru: 'Чертёж {name}',
  uk: 'Кресленик {name}',
  pl: 'Schemat {name}',
  tc: '{name} 藍圖',
  zh: '{name} 蓝图',
  ko: '{name} 설계도',
  ja: '{name} 設計図',
  th: 'พิมพ์เขียว {name}',
}
/** Render a localized blueprint name ("Schéma de Latron Wraith", "Latron Wraith Blueprint", …). */
export function blueprintName(name, locale = 'en') {
  if (!name) return name
  return (BLUEPRINT_TEMPLATE[locale] || BLUEPRINT_TEMPLATE.en).replace('{name}', name)
}

// Legacy suffix-only map kept for inventoryParser (which appends suffixes).
// New code should use blueprintName()  -  the game uses PREFIX forms for
// fr/es/it/pt/ru/uk/pl/th ("Schéma de X", "Plano de X"…), not suffixes.
const BLUEPRINT_SUFFIX = {
  en: ' Blueprint',
  de: ' Blaupause',
  es: ' Plano',
  fr: ' Plan',
  it: ' Progetto',
  ja: ' 設計図',
  ko: ' 설계도',
  pl: ' Projekt',
  pt: ' Projeto',
  ru: ' Чертёж',
  tc: ' 藍圖',
  th: ' แบบแปลน',
  tr: ' Proje',
  uk: ' План',
  zh: ' 蓝图',
}
export { BLUEPRINT_SUFFIX };

const PART_SUFFIX_RE = /(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|Upper\s?Limb|Lower\s?Limb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i;

const BOOSTER_NAME_MAP = {
  'ResourceAmount3Day': '3 Day Resource Booster',
  'ResourceDropChance3Day': '3 Day Resource Drop Chance Booster',
  'Affinity3Day': '3 Day Affinity Booster',
  'Credit3Day': '3 Day Credit Booster',
  'ModDropChance3Day': '3 Day Mod Drop Chance Booster',
  'ResourceAmount7Day': '7 Day Resource Booster',
  'ResourceDropChance7Day': '7 Day Resource Drop Chance Booster',
  'Affinity7Day': '7 Day Affinity Booster',
  'Credit7Day': '7 Day Credit Booster',
  'ModDropChance7Day': '7 Day Mod Drop Chance Booster',
  'ResourceAmount30Day': '30 Day Resource Booster',
  'ResourceDropChance30Day': '30 Day Resource Drop Chance Booster',
  'Affinity30Day': '30 Day Affinity Booster',
  'Credit30Day': '30 Day Credit Booster',
  'ModDropChance30Day': '30 Day Mod Drop Chance Booster',
  'ResourceAmount': 'Resource Booster',
  'ResourceDropChance': 'Resource Drop Chance Booster',
  'Affinity': 'Affinity Booster',
  'Credit': 'Credit Booster',
  'ModDropChance': 'Mod Drop Chance Booster',
}

export { BOOSTER_NAME_MAP };

function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}
export { splitPascal };

function nameFromPath(path = '', locale = 'en') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';
  // NAME_OVERRIDES was removed  -  all items it covered are hidden or dict-resolved

  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    const bp = leaf.endsWith('Blueprint') ? BLUEPRINT_SUFFIX[locale] ?? ' Blueprint' : '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '') + bp;
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|MoaPetPowerSuit|Blueprint)$/, '')
    // AvatarImage store items (e.g. AvatarImageDogDaysErraGlyph) are plain
    // glyphs  -  drop the internal "AvatarImage" prefix so the display name is
    // "Dog Days Erra Glyph", not "Avatar Image Dog Days Erra Glyph".
    .replace(/^AvatarImage/, '');
  const name = splitPascal(stripped).trim() || leaf;
  return leaf.endsWith('Blueprint') && !name.endsWith('Blueprint')
    ? name + (BLUEPRINT_SUFFIX[locale] ?? ' Blueprint')
    : name;
}


/**
 * Resolve an item unique name (e.g. /Lotus/Weapons/Tenno/Rifle/Latron) to a
 * display name string.  Resolution order:
 *  1. uniqueNameToName map → dict localisation
 *  2. Direct dict lookup
 */
// Leaf name mismatches between the export uniqueName and the language dict key.
// e.g. /Lotus/Language/Items/InfestedAladNavCodeName exists in the dict but the
// export uniqueName leaf is "InfestedAladNavCoordinate" (DE abbreviates Coordinate
// to "Code" inside the loc key)  -  step-4 leaf-match misses it. Map the leaf to
// the real dict key so resolveItemName localizes the item without an EN fallback.
const ITEM_LEAF_ALIAS = {
  InfestedAladNavCoordinate: '/Lotus/Language/Items/InfestedAladNavCodeName',
  // DE's official worldState API sends "InfestedAladCoordinate" (no "Nav")  - 
  // same item, same dict key.
  InfestedAladCoordinate: '/Lotus/Language/Items/InfestedAladNavCodeName',
};

export function resolveItemName(path, dict, uniqueNameToName, locale = 'en') {
  if (!path) return ''

  const isBlueprint = path.includes('/Recipes/') || path.endsWith('Blueprint');
  const isWeaponPart = path.includes('/WeaponParts/') || PART_SUFFIX_RE.test(path.split('/').pop() || '');

  // Handle StoreItem paths by trying to resolve the actual item
  let actualPath = path;
  if (path.startsWith('/Lotus/StoreItems/')) {
    actualPath = path.replace('/StoreItems/', '/');
  }

  // wfcd names are ENGLISH display names, not dict keys. Remember them as a
  // last-resort fallback, but keep searching for a localized dict entry first.
  let englishFallback = null;
  const lookup = (p) => {
    if (!uniqueNameToName || !uniqueNameToName[p]) return null;
    const locKey = uniqueNameToName[p];
    const res = dict[locKey] || dict['/' + locKey];
    if (res && !res.startsWith('/Lotus/')) return clean(res);
    if (locKey && !locKey.startsWith('/Lotus/') && !englishFallback) englishFallback = clean(locKey);
    return null;
  };

  let resolved = null;
  // 1. Try actualPath (mapped)
  resolved = lookup(actualPath);

  // 2. Try raw path
  if (!resolved) {
    resolved = lookup(path);
  }

  // 3. Try dict directly
  if (!resolved) {
    const d1 = dict[actualPath] || dict['/' + actualPath] || dict[path] || dict['/' + path];
    if (d1 && typeof d1 === 'string' && !d1.startsWith('/Lotus/')) resolved = clean(d1);
  }

  // 3b. Weapon-part blueprints: /Lotus/Types/Recipes/Weapons/WeaponParts/XxxBarrel
  //     → /Lotus/Language/Menu/CraftingComponent_XxxBarrel (localized part name,
  //     e.g. fr "Snipetron Vandal - Canon" for SnipetronVandalBarrel). This is
  //     already the game's complete localized name  -  return it as-is, no
  //     blueprint template on top.
  if (!resolved && isWeaponPart) {
    const leaf = path.split('/').pop().replace(/StoreItem$/i, '');
    const compKey = `/Lotus/Language/Menu/CraftingComponent_${leaf}`;
    const compVal = dict[compKey] || dict['/' + compKey] || dict[compKey.replace(/^\//, '')];
    if (compVal && typeof compVal === 'string' && !compVal.startsWith('/Lotus/')) return clean(compVal);
  }

  // 4. Try matching dict keys by leaf name (for StoreItem paths that follow
  //    the pattern /Lotus/Language/{Category}/{Leaf}Name)
  if (!resolved) {
    const leaf = path.split('/').pop();
    const leafNorm = leaf.replace(/StoreItem$/i, '').replace(/Blueprint$/i, '').toLowerCase();
    for (const [key, val] of Object.entries(dict)) {
      if (typeof val !== 'string' || val.startsWith('/Lotus/')) continue;
      const keyLeaf = key.split('/').pop();
      // Prefer Name-suffixed keys, but also match bare leaf keys
      // (e.g. /Lotus/Language/Events/WaterFightBucks → "Nakak Pearls").
      const keyNorm = keyLeaf.replace(/Name$/, '').toLowerCase();
      if (keyNorm === leafNorm && (keyLeaf.endsWith('Name') || !key.includes('/Menu/CraftingComponent_'))) {
        resolved = clean(val);
        break;
      }
    }
  }

  // 4b. Fallback for known booster patterns (dict uses different naming
  //     conventions than StoreItem paths, e.g. "ThreeDay" vs "3Day")
  if (!resolved) {
    const leaf = path.split('/').pop().replace(/StoreItem$/i, '');
    if (BOOSTER_NAME_MAP[leaf]) {
      resolved = BOOSTER_NAME_MAP[leaf];
    }
    if (!resolved) {
      for (const [key, name] of Object.entries(BOOSTER_NAME_MAP)) {
        if (leaf.startsWith(key)) {
          resolved = name; break;
        }
      }
    }
  }

  // 4c. English wfcd name as fallback (only if no localized dict entry found)
  if (!resolved) {
    const leaf = path.split('/').pop().replace(/StoreItem$/i, '');
    if (ITEM_LEAF_ALIAS[leaf]) {
      const aliasKey = ITEM_LEAF_ALIAS[leaf];
      const aliasVal = dict[aliasKey] || dict['/' + aliasKey];
      if (aliasVal && typeof aliasVal === 'string' && !aliasVal.startsWith('/Lotus/')) {
        resolved = clean(aliasVal);
      }
    }
    // Focus lenses: uniqueName leaves like AttackLensGreater / WardLensOstron /
    // PowerLensLua / AttackLens map to their /Lotus/Language/{Items,Equipment}/*/LensName
    // dict keys so DE's localized lens names resolve (e.g. zh Greater Unairu Lens
    // -> 高级 Unairu 晶体) instead of falling back to the English wfcd literal.
    if (!resolved) {
      const lensM = leaf.match(/^(Attack|Defense|Power|Tactic|Ward)Lens(?:Greater|Ostron|Lua)?$/);
      if (lensM) {
        const school = lensM[1];
        const variant = leaf.slice(school.length + 4); // '' | 'Greater' | 'Ostron' | 'Lua'
        const prefix = variant === 'Lua' ? '/Lotus/Language/Equipment/Lua' : '/Lotus/Language/Items/';
        const baseName = variant === 'Ostron' ? 'Ostron' : variant === 'Greater' ? 'Greater' : '';
        const lensKey = `${prefix}${baseName}${school}LensName`;
        const lensVal = dict[lensKey] || dict['/' + lensKey];
        if (lensVal && typeof lensVal === 'string' && !lensVal.startsWith('/Lotus/')) {
          resolved = clean(lensVal);
        }
      }
    }
  }
  if (!resolved && englishFallback) resolved = englishFallback;

  // 5. nameFromPath (fallback)
  if (!resolved) {
    const n = nameFromPath(actualPath, locale);
    if (n && !n.startsWith('/Lotus/')) resolved = n;
  }

  if (!resolved) resolved = clean(path);

  // Localized blueprint rendering. The game uses per-locale patterns:
  // prefix ("Schéma de X" fr, "Plano de X" es, "Чертёж X" ru) or suffix
  // ("X Blueprint" en, "X Blaupause" de, "X 設計図" ja…). Weapon parts resolve
  // to already-localized full names (CraftingComponent_ keys)  -  skip the
  // template unless the resolved name is still the raw English blueprint form.
  if (isBlueprint) {
    const tpl = BLUEPRINT_TEMPLATE[locale] || BLUEPRINT_TEMPLATE.en;
    const marker = tpl.replace('{name}', '').trim().toLowerCase();
    const alreadyLocalized = marker
      ? resolved.toLowerCase().includes(marker)
      : resolved.toLowerCase().includes('blueprint');
    if (!alreadyLocalized) {
      // nameFromPath appends the legacy suffix map (" Latron Wraith Plan");
      // strip any legacy blueprint word before applying the per-locale
      // template so we never get "Schéma de Latron Wraith Plan".
      const legacyWords = Object.values(BLUEPRINT_SUFFIX).map(s => s.trim()).filter(Boolean);
      let base = resolved;
      for (const w of legacyWords) {
        const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\s*${esc}$`, 'i').test(base)) {
          base = base.replace(new RegExp(`\\s*${esc}$`, 'i'), '').trim();
          break;
        }
      }
      return blueprintName(base, locale);
    }
  }

  return resolved;

}


/**
 * Find a usable image URL for an item or reward object.
 * Checks EI (uniqueName → browse.wf URL), nameToImage (lowercase name → URL),
 * and falls back through recipe path → weapon path transformations.
 * Returns null if no image is found.
 */
export function resolveAnyImage(rewardOrItem, EI, nameToImage, uniqueNameToName = {}) {
  if (!rewardOrItem) return null
  const byName = (s) => {
    if (!s || typeof s !== 'string') return null
    return EI[s] ?? nameToImage[s.toLowerCase()] ?? null
  }

  let item = rewardOrItem;
  if (typeof rewardOrItem === 'string') {
    item = rewardOrItem;
  } else {
    item = rewardOrItem.uniqueName || rewardOrItem.unique_name || rewardOrItem.ItemType || rewardOrItem.StoreItem || rewardOrItem.item || '';
  }

  if (typeof item !== 'string') return null;

  // Helper: Try to resolve image for a path, with blueprint → base-item fallback
  const resolve = (p) => {
    if (!p) return null
    // Direct lookup first
    const direct = byName(p)
    if (direct) return direct
    // Blueprint path: /Lotus/Types/Recipes/.../FooBlueprint
    // EI is keyed by weapon paths, not recipe paths - look up by resolved name instead
    if (p.includes('/Recipes/') || p.endsWith('Blueprint') || PART_SUFFIX_RE.test(p)) {
      // 1. Resolve the item's display name via dict, strip suffixes, look up by name
      const locKey = uniqueNameToName[p]
      if (locKey) {
        const cleanName = locKey.replace(PART_SUFFIX_RE, '').trim()
        const byResolvedName = nameToImage[cleanName.toLowerCase()]
        if (byResolvedName) return byResolvedName
      }

      // 2. Use nameFromPath which splits pascal case, then strip suffixes
      const nfp = nameFromPath(p)
      const cleanNfp = nfp.replace(PART_SUFFIX_RE, '').trim()
      if (cleanNfp) {
        const byNfp = nameToImage[cleanNfp.toLowerCase()]
        if (byNfp) return byNfp
      }

      // 3. Try stripping suffixes from the path leaf
      const leaf = p.split('/').at(-1)?.replace(PART_SUFFIX_RE, '') ?? ''
      if (leaf) {
        const byLeaf = nameToImage[leaf.toLowerCase()]
        if (byLeaf) return byLeaf
      }
      // 4. Try swapping recipe path to weapon path and strip suffixes
      const swapped = p.replace('/Types/Recipes/', '/Weapons/').replace(PART_SUFFIX_RE, '')
      const bySwap = byName(swapped)
      if (bySwap) return bySwap
    }
    return null
  }

  // Try direct path first
  let r = resolve(item);
  if (r) return r;

  // Try StoreItem mapping
  if (item.startsWith('/Lotus/StoreItems/')) {
    r = resolve(item.replace('/StoreItems/', '/'));
    if (r) return r;
  }

  // Try case-insensitive lookup for the path itself in nameToImage if it's not a path
  if (!item.startsWith('/Lotus/')) {
    r = byName(item);
    if (r) return r;
  }

  if (typeof rewardOrItem === 'string') return null;

  const cItems = rewardOrItem.countedItems ?? rewardOrItem.CountedItems ?? []
  for (const ci of cItems) {
    const name = typeof ci.type === 'string' ? ci.type : (ci.type?.uniqueName ?? ci.ItemType ?? ci.type?.name ?? ci.key ?? '')
    const ri = resolve(name); if (ri) return ri
  }

  const itemName = rewardOrItem.item || rewardOrItem.itemString || rewardOrItem.asString || rewardOrItem.name || ''
  if (itemName && !itemName.startsWith('/Lotus/')) { const ri = byName(itemName); if (ri) return ri }

  const thumb = rewardOrItem.thumbnail || rewardOrItem.image || ''
  if (thumb && thumb.startsWith('https://browse.wf')) return thumb
  return null
}


// ─── Time Formatting Utilities ───────────────────────────────────────────

/** Format time remaining until expiry as "Xd Xh", "Xh Xm", or "Xm". */
export function timeRemaining(expiry, t) {
  if (!expiry) return ''
  const expDate = typeof expiry === 'object' && expiry.$date ? new Date(parseInt(expiry.$date.$numberLong, 10)) : new Date(expiry)
  const diff = expDate - Date.now()
  if (diff < 0) return t ? t('ui.dashboard.time_expired') : 'Expired'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}


/** Format elapsed time since a past date as "Xd ago", "Xh ago", or "Xm ago". */
export function timeSince(date, t) {
  if (!date) return ''
  const d = typeof date === 'object' && date.$date ? new Date(parseInt(date.$date.$numberLong, 10)) : new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 0) return t ? t('ui.dashboard.time_now') : 'Just now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (day > 0) return t ? t('ui.dashboard.time_ago_day', { n: day }) : `${day}d ago`
  if (h > 0) return t ? t('ui.dashboard.time_ago_hour', { n: h }) : `${h}h ago`
  return t ? t('ui.dashboard.time_ago_min', { n: m }) : `${m}m ago`
}


/** Format a raw timestamp (ms) as a short date string.
 *  If the date is today, show "HH:MM"; otherwise show "Month Day HH:MM". */
export function formatLastUpdate(ts) {
  if (!ts) return 'never'
  const date = new Date(Number(ts))
  const now = new Date()
  const isToday = date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}