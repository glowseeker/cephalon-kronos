/**
 * inventoryParser.js
 *
 * Turns the raw API response from Warframe into structured data for
 * every screen in the app.  Nothing in here touches the network or the disk;
 * all that is handled by main.rs before this file even runs.
 *
 * DATA PIPELINE (how raw bytes become UI)
 * ─────────────────────────────────────────
 * 1. main.rs:check_exports()        – downloads / refreshes JSON export files
 * 2. main.rs:load_all_exports()     – reads them from disk into one big object
 * 3. main.rs:call_api_helper()      – scans game memory for auth token, fetches inventory
 * 4. main.rs:load_cached_inventory() – reads inventory.json from disk
 * 5. MonitoringContext.jsx          – calls (2) and (3)/(4) on startup / each scan
 * 6. parseInventory(raw, exports)   – <-- YOU ARE HERE
 *    Takes the raw inventory object and the exports bundle, returns a flat
 *    structured object consumed by Inventory.jsx, Mastery.jsx, Relics.jsx, etc.
 *
 * EXPORTS FROM THIS FILE
 * ─────────────────────────────────────────
 * parseInventory(raw, exports) → structured inventory object
 *   All other functions are internal helpers.
 */
import { BLUEPRINT_SUFFIX } from './warframeUtils'

// ─── Riven Tag Data ───────────────────────────────────────────────────────────
//
// Per-riven-type stat bases, affix syllables, and localized label keys are
// derived at parse time from ExportUpgrades' /Lotus/Upgrades/Mods/Randomized/
// entries (see buildRivenTagInfo in parseInventory) — DE's own data, verified
// byte-identical to the riven_tags.json tables this replaces. The export's
// upgradeValues[0].value, prefixTag/suffixTag, and locTag drive the stat
// formula, the constructed riven name, and the dict-resolved localized label.
// ─── Riven Display Helpers ────────────────────────────────────────────────────
//
// RIVEN_STAT_MAP  : internal tag name → English stat label, used as the English
//                   statKey for the price model (matches English keys only) and
//                   as a last-resort display fallback. The localized display
//                   name is resolved from the game dict via the export's stat
//                   locTag (see buildRivenTagInfo below), which replaces the
//                   old per-locale hand-translated rivenStats tables.

const RIVEN_STAT_MAP = {
  'WeaponMeleeDamageMod': 'Melee Damage',
  'WeaponCritChanceMod': 'Critical Chance',
  'WeaponCritDamageMod': 'Critical Damage',
  'WeaponSpeedMod': 'Attack Speed',
  'WeaponFireRateMod': 'Attack Speed',
  'WeaponStatusChanceMod': 'Status Chance',
  'WeaponStunChanceMod': 'Status Chance',
  'WeaponRangeMod': 'Range',
  'WeaponMeleeRangeIncMod': 'Range',
  'WeaponDamageAmountMod': 'Damage',
  'WeaponPunctureDamageMod': 'Puncture',
  'WeaponSlashDamageMod': 'Slash',
  'WeaponImpactDamageMod': 'Impact',
  'WeaponElectricityDamageMod': 'Electricity',
  'WeaponFireDamageMod': 'Heat',
  'WeaponFreezeDamageMod': 'Cold',
  'WeaponToxinDamageMod': 'Toxin',
  'WeaponRecoilReductionMod': 'Recoil',
  'WeaponReloadSpeedMod': 'Reload Speed',
  'WeaponClipMaxMod': 'Magazine Capacity',
  'WeaponAmmoMaxMod': 'Ammo Maximum',
  'WeaponCritFireRateBonusMod': 'Fire Rate',
  'WeaponChannelingDamageMod': 'Initial Combo',
  'WeaponMeleeComboDurationMod': 'Combo Duration',
  'WeaponMeleeComboChanceFromDot': 'Combo Count Chance',
  'WeaponMeleeFinisherDamageMod': 'Finisher Damage',
  'WeaponProjectileSpeedMod': 'Projectile Speed',
  'WeaponBeamDistanceMod': 'Beam Length',
  'WeaponMultishotMod': 'Multishot',
  'WeaponPunchThroughMod': 'Punch Through',
  'WeaponZoomFovMod': 'Zoom',
  'WeaponExplosionRadiusMod': 'Blast Radius',
  'InnateElectricityDamage': 'Electricity',
  'InnateFireDamage': 'Heat',
  'InnateFreezeDamage': 'Cold',
  'InnateToxinDamage': 'Toxin',
  'WeaponFireIterationsMod': 'Multishot',
  'WeaponArmorPiercingDamageMod': 'Puncture',
  'WeaponProcTimeMod': 'Status Duration',
  'WeaponPunctureDepthMod': 'Punch Through',
  'WeaponFactionDamageCorpus': 'Damage to Corpus',
  'WeaponFactionDamageGrineer': 'Damage to Grineer',
  'WeaponFactionDamageInfested': 'Damage to Infested',
  'WeaponMeleeFactionDamageCorpus': 'Damage to Corpus',
  'WeaponMeleeFactionDamageGrineer': 'Damage to Grineer',
  'WeaponMeleeFactionDamageInfested': 'Damage to Infested',
  'ComboDurationMod': 'Combo Duration',
  'SlideAttackCritChanceMod': 'Slide Crit Chance',
  'WeaponMeleeComboEfficiencyMod': 'Combo Efficiency',
  'WeaponMeleeComboInitialBonusMod': 'Initial Combo',
  'WeaponMeleeComboPointsOnHitMod': 'Combo Count',
  'WeaponMeleeComboBonusOnHitMod': 'Combo Count',
};

/** Clean a dict stat label for display: drop value tokens (%|val|, |STAT1|),
 *  HTML color tags, and the seconds glue DE appends (|val|sn). */
function cleanStatLabel(raw) {
  if (!raw || typeof raw !== 'string' || raw.startsWith('/Lotus/')) return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/%?\|(?:val|STAT\d+)\|(?:sn|s)?\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Rank / XP Helpers ───────────────────────────────────────────────────────

/** Return the maximum possible rank for an item (30 for most things, 40 for
 *  special cases like Necramechs, Kuva/Tenet weapons, and Paracesis). 
 *  For mods and arcanes, looks up fusionLimit or levelStats in export data. */
function getRankLimit(un, category, EM = {}, EA = {}, EW = {}) {
  if (category === 'mods') {
    return EM[un]?.fusionLimit ?? 0;
  }
  if (category === 'arcanes') {
    return EA[un]?.levelStats?.length ? EA[un].levelStats.length - 1 : 5;
  }
  if (category === 'necramechs') return 40;
  if (un?.includes('Paracesis')) return 40;
  if (un?.includes('Kuva') || un?.includes('Tenet') || un?.includes('Coda')) return 40;
  // Check export for maxLevelCap
  const exportEntry = EW[un];
  if (exportEntry?.maxLevelCap === 40) return 40;
  return 30;
}

/**
 * Calculate the current rank of an item from its cumulative affinity (XP).
 * Warframe uses: XP to reach rank R = R² × baseXPPerRank
 *   Heavy items (Warframes, companions, vehicles): baseXPPerRank = 1000
 *   Weapons and everything else:                  baseXPPerRank = 500
 * We scan upward from rank 1 until the required XP exceeds what the item has.
 *
 * @param {number} xp        Cumulative affinity earned by this item.
 * @param {string} category  Item category string (e.g. 'warframes', 'primary').
 * @param {string} un        Unique name - used only for the Paracesis/Kuva/Tenet special case.
 * @param {number} limit     Maximum rank ceiling (30 or 40).
 * @returns {number}         Correct rank (0–40).
 */
function calculateRank(xp, category, un, limit = 30) {
  if (!xp || xp <= 0) return 0;

  // Determine the XP multiplier based on item type
  const heavyCategories = [
    'warframes', 'companions', 'necramechs', 'archwings',
    'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
  ];
  const isHeavy = heavyCategories.includes(category);

  // The XP required for a given rank is: rank² * baseXPPerRank²
  // For heavy: 1000 per rank, for weapons: 500 per rank.
  const baseXPPerRank = isHeavy ? 1000 : 500;

  // Find the highest rank where cumulative required XP is <= the item's XP
  let rank = 0;
  for (let r = 1; r <= limit; r++) {
    // Cumulative XP needed to reach this rank from unranked
    const requiredXP = r * r * baseXPPerRank;
    if (xp >= requiredXP) {
      rank = r;
    } else {
      break;
    }
  }

  return rank;
}

// ─── String / Path Helpers ────────────────────────────────────────────────────

/** Strip HTML tags and trim whitespace from a display name.  Returns '' for
 *  any value that looks like an internal path (/Lotus/...). */
function cleanName(name) {
  if (!name) return '';
  if (typeof name === 'string' && name.startsWith('/Lotus/')) return '';
  return name.replace(/<[^>]*>/g, '').trim();
}

/** Split a PascalCase string into space-separated words. */
function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

/**
 * Compose a localized "Veiled <Type> Riven" display name for veiled rivens.
 * Warframe never exports a "Veiled" or "Riven" loc string in the public dict,
 * so the words are pulled from the per-locale i18n ui tables:
 *   - ui.riven_card.veiled   ("Veiled")
 *   - riven.type_<weaponType> ("Melee", "Rifles", ...)
 *   - ui.riven_card.riven_suffix ("Riven")
 * When the weapon-type label is unavailable, the raw normalized type is used.
 */
function composeVeiledRivenName(weaponType, i18nData) {
  const ui = i18nData?.ui || {}
  const veiled = ui['ui.riven_card.veiled'] || 'Veiled'
  const typeLabel = i18nData?.ui?.['rivens.type_' + weaponType] || splitPascal(weaponType)
  const suffix = ui['ui.riven_card.riven_suffix'] || 'Riven'
  return `${veiled} ${typeLabel} ${suffix}`
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


// ─── Name / Image Resolution ─────────────────────────────────────────────────

/**
 * Derive a human-readable display name from an internal asset path.
 * Used as the last-resort fallback when no export table has a localisation key.
 * Strips common suffix tokens (Suit, Blueprint, etc.) and converts PascalCase
 * to spaced words.  Also handles skin folder overrides.
 */
// Resolves a booster/blessing display name from the localisation dict.
// Store-item leaf like "AffinityBoosterThreeDayStoreItem" or "DamageBlessingStoreItem"
// maps to dict key /Lotus/Language/{Items|Items|Items|Blessings}/...{Blessing|Booster}Name
// Returns null if the dict has no entry (caller falls through to export tables).
function resolveBoosterName(leaf, dict) {
  // Blessings: no duration, path /Lotus/Language/Blessings/
  const blessings = ['Damage', 'Health', 'Shield', 'Affinity', 'Credit', 'ResourceDropChance'];
  for (const b of blessings) {
    if (leaf.startsWith(b + 'Blessing')) {
      const key = `/Lotus/Language/Blessings/${b}BlessingName`;
      const val = dict[key] || dict[key.replace(/^\//, '')];
      if (val && !val.startsWith('/Lotus/')) return cleanName(val);
    }
  }
  // Boosters: path /Lotus/Language/Items/{Type}Booster{Duration}Name
  const boosters = [
    { short: 'Affinity', game: 'AffinityBooster' },
    { short: 'Credit', game: 'CreditBooster' },
    { short: 'Damage', game: 'DamageBooster' },
    { short: 'Health', game: 'HealthBooster' },
    { short: 'Shield', game: 'ShieldBooster' },
    { short: 'ResourceAmount', game: 'ResourceAmountBooster' },
    { short: 'ResourceDropChance', game: 'ResourceDropChanceBooster' },
    { short: 'ModDropChance', game: 'ModDropChanceBooster' },
  ];
  const durations = [
    { short: 'ThreeDay', dict: 'ThreeDay' },
    { short: 'SevenDay', dict: 'SevenDay' },
    { short: 'ThirtyDay', dict: 'ThirtyDay' },
    { short: '', dict: '' },
  ];
  for (const b of boosters) {
    if (leaf.startsWith(b.short)) {
      const suffix = leaf.slice(b.short.length).replace(/StoreItem$/i, '');
      for (const d of durations) {
        if (suffix === d.short) {
          const key = `/Lotus/Language/Items/${b.game}${d.dict}Name`;
          const val = dict[key] || dict[key.replace(/^\//, '')];
          if (val && !val.startsWith('/Lotus/')) return cleanName(val);
        }
      }
    }
  }
  return null;
}


// Prime part paths end with the weapon name + part word (always English even in
// localized builds), e.g. .../WeaponParts/AfurisPrimeBarrel.  Used to separate
// prime parts from resources and to build prime-set component lists — matching
// the localized display name instead (e.g. "Afuris Prime: Lauf") would miss them.
const PRIME_PART_PATH_RE = /Prime.*?(Barrel|Receiver|Stock|Blade|Handle|Link|Gauntlet|Head|Disc|Grip|Boot|Chain|String|UpperLimb|LowerLimb|Carapace|Cerebrum|Systems|Chassis|Neuroptics|Guard|Hilt|Ornament|Stars|Holster|Pouch|Band|Blueprint)$/i;

function nameFromPath(path = '') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';


  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '');
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|KubrowPet|KavatPet|SentientPet|Pet|Suit|Blueprint)$/g, '');
  return splitPascal(stripped).trim() || leaf;
}

/**
 * Public entry point for name resolution.  Wraps the recursive internal helper
 * with a depth of 0 to prevent runaway recursion on circular references.
 * Called by: createItem, relic reward mapping, riven parsing, and most of parseInventory.
 */
function resolveName(un, dict, locale = 'en', ...tables) {
  return _resolveNameInternal(un, dict, locale, 0, ...tables);
}

/**
 * Internal recursive resolver.  Tries each export table in order:
 *  1. Direct key match (exact uniqueName or with /StoreItems/ stripped)
 *  2. Dict localisation key lookup
 *  3. Recipe resultType follow (recurse, max depth 5)
 *  4. Dictionary direct lookup on the raw path
 *  5. /Recipes/ path leaf match
 *  6. nameFromPath() fallback
 */
function _resolveNameInternal(un, dict, locale = 'en', depth, ...tables) {
  if (!un || depth > 5) return '';
  if (un.includes('DrifterPistol')) return 'Sirocco';

  // Try direct match or normalized path (stripping /StoreItems/)
  const normalized = un.replace('/StoreItems/', '/');
  for (const tbl of tables) {
    const entry = tbl?.[un] || tbl?.[normalized];
    if (!entry) continue;
    const locKey = entry.name ?? entry.displayName ?? '';
    if (locKey) {
      if (dict[locKey]) {
        const resolved = cleanName(dict[locKey]);
        if (resolved) return resolved;
      }
      if (!locKey.startsWith('/Lotus/')) {
        const cleaned = cleanName(locKey);
        if (cleaned) return cleaned;
      }
    } else if (entry.resultType) {
      // If recipe has no name, try to resolve its resultType
      let name = _resolveNameInternal(entry.resultType, dict, locale, depth + 1, ...tables);
      const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
      if (un.toLowerCase().endsWith('blueprint') && !name.toLowerCase().includes('blueprint') && !name.toLowerCase().includes(bpSuffix.trim().toLowerCase())) {
        name += bpSuffix;
      }
      return name;
    }
  }

  // Fallback: Check if the path itself is a key in the dictionary
  if (dict[un]) {
    const resolved = cleanName(dict[un]);
    if (resolved) return resolved;
  }

  // Handle Recipe paths (e.g. /Lotus/Types/Recipes/Helmets/BrawlerAltHelmetBlueprint)
  if (un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    if (FOLDER_OVERRIDES[leaf]) return FOLDER_OVERRIDES[leaf];
    // Try to find the associated item name by checking without "Blueprint"
    for (const tbl of tables) {
      if (!tbl) continue;
      const match = Object.keys(tbl).find(k => k.endsWith('/' + leaf));
      if (match && tbl[match].name) return cleanName(tbl[match].name);
    }
  }

  // Check for lore/fragment names in dict (e.g. /Lotus/Language/Fragments/{leaf}[Name])
  if (un.includes('/Fragments/')) {
    const leaf = un.split('/').pop();
    const fragName = dict['/Lotus/Language/Fragments/' + leaf + 'Name']
      || dict['/Lotus/Language/Fragments/' + leaf];
    if (fragName) return cleanName(fragName);
  }

  // Resolve booster/blessing names from dict (no hardcoded English)
  const boosterName = resolveBoosterName(un.split('/').pop(), dict);
  if (boosterName) return boosterName;

  // Cosmetics dict fallback: for market-items / StoreItem cosmetics that
  // weren't found in export tables, try a direct dict lookup on the UN path
  if (un.includes('/StoreItems/') || un.includes('/CosmeticEnhancers/')) {
    // Try dict lookup with the full path
    if (dict[un]) return cleanName(dict[un]);
    // Try dict lookup with /StoreItems/ stripped
    const strippedStore = un.replace('/StoreItems/', '/');
    if (dict[strippedStore]) return cleanName(dict[strippedStore]);
    // Try dict lookup with just the leaf name
    const leaf = un.split('/').pop();
    if (dict[leaf]) return cleanName(dict[leaf]);
    // Try common language path pattern for store items
    const langKey = '/Lotus/Language/StoreItems/' + leaf;
    if (dict[langKey]) return cleanName(dict[langKey]);
  }

  return cleanName(nameFromPath(un));
}

/**
 * Find an icon/thumbnail URL for an item by scanning export tables in order.
 * Returns a full browse.wf URL, or null if no image is found.
 * Falls back to a leaf-match search for recipe paths.
 */

const suffixIndexCache = new WeakMap()

function getSuffixIndex(tbl) {
  if (!suffixIndexCache.has(tbl)) {
    const index = new Map()
    for (const key of Object.keys(tbl)) {
      index.set(key.split('/').pop(), key)
    }
    suffixIndexCache.set(tbl, index)
  }
  return suffixIndexCache.get(tbl)
}

function resolveImage(un, ...tables) {
  // Check exact match first
  for (const tbl of tables) {
    if (!tbl) continue;
    const entry = tbl?.[un];
    if (entry && (entry.icon || entry.thumbnail)) {
      const icon = entry.icon ?? entry.thumbnail;
      if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;
      return `https://browse.wf${icon.startsWith('/') ? '' : '/'}${icon}`;
    }
  }

  // If it's a recipe, try the leaf match
  if (un && un.includes('/Recipes/')) {
    const leaf = un.split('/').pop().replace('Blueprint', '');
    for (const tbl of tables) {
      if (!tbl) continue;
      const suffixIndex = getSuffixIndex(tbl)
      const matchKey = suffixIndex.get(leaf)
      if (matchKey && (tbl[matchKey]?.icon || tbl[matchKey]?.thumbnail)) {
        const icon = tbl[matchKey].icon ?? tbl[matchKey].thumbnail;
        if (icon.startsWith('http://') || icon.startsWith('https://')) return icon;
        return `https://browse.wf${icon.startsWith('/') ? '' : '/'}${icon}`;
      }
    }
  }
  return null;
}

// ─── Modular Item Helpers ─────────────────────────────────────────────────────

/** Parse a JSON UpgradeFingerprint string safely; returns {} on failure. */
function parseFP(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * Map a riven's internal ItemType path to a broad weapon category string
 * ('melee', 'pistol', 'rifle', 'shotgun', 'archgun', 'zaw', 'kitgun', 'unknown').
 * Used to bucket rivens into sub-tabs in the Rivens screen.
 */
function rivenWeaponType(itemType = '') {
  const t = (itemType || '').toLowerCase();
  if (t.includes('modularmelee') || t.includes('zaw')) return 'zaw';
  if (t.includes('modularpistol') || t.includes('kitgun')) return 'kitgun';
  if (t.includes('melee')) return 'melee';
  if (t.includes('sniper')) return 'sniper';
  if (t.includes('shotgun')) return 'shotgun';
  if (t.includes('pistol') || t.includes('sidearm')) return 'pistol';
  if (t.includes('rifle') || t.includes('bow') || t.includes('launcher') || t.includes('speargun')) return 'rifle';
  if (t.includes('archgun')) return 'archgun';
  return 'unknown';
}

/**
 * Extract the modular component names for an Operator Amp or Zaw.
 * Some amps store components in ModularParts; others encode them in UpgradeFingerprint.
 */
function resolveAmpComponents(sourceItem, dict, locale, EW, ER) {
  const modParts = sourceItem?.ModularParts ?? [];
  if (modParts.length > 0) {
    return modParts.map(c => resolveName(c, dict, locale, EW, ER)).filter(Boolean);
  }
  if (!sourceItem?.UpgradeFingerprint) return [];
  const fp = parseFP(sourceItem.UpgradeFingerprint);
  const compPaths = Array.isArray(fp.components) && fp.components.length > 0
    ? fp.components
    : Array.isArray(fp.ModularParts) && fp.ModularParts.length > 0
      ? fp.ModularParts
      : [];
  return compPaths.map(c => resolveName(c, dict, locale, EW, ER)).filter(Boolean);
}

/** Extract component display names for a K-Drive from its ModularParts list. */
function resolveHoverboardComponents(sourceItem, dict, locale, EW) {
  const modParts = sourceItem?.ModularParts ?? [];
  return modParts.map(c => resolveName(c, dict, locale, EW)).filter(Boolean);
}

// ─── Relic Reward Resolution ──────────────────────────────────────────────────

/**
 * Main export.  Receives the raw inventory JSON (from call_api_helper via
 * main.rs) and the full exports bundle (from load_all_exports via main.rs).
 * Returns a single structured object with named arrays for every item category
 * plus account-level stats.  Consumed by Inventory.jsx, Mastery.jsx,
 * Relics.jsx, Rivens.jsx, and Dashboard.jsx.
 */
function detectModFrame(un, rarity, modName) {
  if (!un) return 'Normal Common';
  const r = (rarity ?? '').toLowerCase();
  const u = (un ?? '').toLowerCase();
  const n = (modName ?? '').toLowerCase();
  const check = (str) => u.includes(str.toLowerCase()) || n.includes(str.toLowerCase())
  if (u.includes('/fusers/')) return 'Fuser';
  // Path-based family markers (locale-independent): localized names would
  // otherwise miss the English name checks below. Verified zero collisions:
  // Galvanized = *SPMod paths, Amalgam = /DualSource/, Archon = /Kahl/,
  // Grimoire/Tome = /Grimoire/.
  if (/SPMod$/i.test(u)) return 'Galvanized';
  if (u.includes('/DualSource/')) return 'Amalgam';
  if (u.includes('/Kahl/')) return 'Archon';
  if (u.includes('/Grimoire/')) return 'Tome';
  if (check('Galvanized')) return 'Galvanized';
  if (check('Amalgam')) return 'Amalgam';
  if (check('Peculiar')) return 'Peculiar';
  if (u.includes('/immortal/antivirus')) return 'Antivirus';
  // Requiem: path contains /Immortal/ but NOT Antivirus
  if (u.includes('/immortal/') && !u.includes('/immortal/antivirus')) return 'Requiem';
  if (check('Archon')) return 'Archon';
  if (check('Grimoire')) return 'Tome';
  if (check('Tome')) return 'Tome';
  if (u.includes('/railjack/')) {
    if (r === 'uncommon') return 'Plexus Uncommon';
    if (r === 'rare') return 'Plexus Rare';
    return 'Plexus Common';
  }
  if (u.includes('/dataspike/potency/') || check('Potency')) return 'Potency';
  if (u.toLowerCase().includes('/antiques/') || u.toLowerCase().includes('/antique/') || check('Tektolyst')) return 'Tektolyst';
  if (r === 'uncommon') return 'Normal Uncommon';
  if (r === 'rare') return 'Normal Rare';
  if (r === 'legendary') return 'Normal Legendary';
  return 'Normal Common';
}

const TYPE_TO_EXPORT_CATEGORY = {
  WARFRAME: 'Warframe', PRIMARY: 'Primary', SECONDARY: 'Secondary',
  MELEE: 'Melee', STANCE: 'Stance', AURA: 'Aura', PARAZON: 'Parazon',
  SENTINEL: 'Sentinels', KAVAT: 'Beasts', KUBROW: 'Beasts', 'HELMINTH CHARGER': 'Beasts',
  'ARCH-GUN': 'Archgun', 'ARCH-MELEE': 'Archmelee', ARCHWING: 'Archgun',
}

const TYPE_TO_CATEGORY = {
  Rifle: 'Primary', Shotgun: 'Primary', Primary: 'Primary', Bows: 'Primary',
  Pistol: 'Secondary', Secondary: 'Secondary',
  Melee: 'Melee', Sword: 'Melee', Glaive: 'Melee', Heavy: 'Melee', NoFire: 'Melee',
  Warframe: 'Warframe', Avatar: 'Warframe', Necramech: 'Vehicles', Necromech: 'Vehicles',
  Sentinel: 'Sentinels', Sentinels: 'Sentinels',
  Kubrow: 'Beasts', Kavat: 'Beasts',
  Beast: 'Beasts', Beasts: 'Beasts',
  Stance: 'Stance',
  Aura: 'Aura',
  Exilus: 'Exilus',
  Railjack: 'Railjack', Avionic: 'Railjack',
  Archwing: 'Archgun', Archgun: 'Archgun',
  Archmelee: 'Archmelee',
  Parazon: 'Parazon', Hack: 'Parazon', DataSpike: 'Parazon', Nemesis: 'Parazon',
  Augment: 'Augment',
  Antique: 'Antique', Antiques: 'Antique', Immortal: 'Antique',
  KDrive: 'Vehicles', Vehicles: 'Vehicles', Hoverboard: 'Vehicles',
}

function extractModCategory(exportType, un, entry) {
  // Try path-based detection first for more specific categories
  if (un) {
    // Check for Kubrow/Kavat deeper in path (these have SENTINEL export type)
    if (un.includes('/Kubrow/') || un.includes('/Kavat/')) return 'Beasts'
    // All mods under /Immortal/ are Parazon mods (Requiem + Antivirus)
    if (un.includes('/Immortal/')) return 'Parazon'
    // Archwing melee needs explicit check before /Mods/Archwing/ matches Archwing→Archgun
    if (un.includes('/Archwing/Melee/')) return 'Archmelee'
    // Exilus mods
    if (un.includes('ExilusMod')) return 'Exilus'
    // Augment mods/cards
    if (un.includes('AugmentCard') || un.includes('AugmentMod')) return 'Augment'
    // Killswitch mods
    if (un.includes('Killswitch')) return 'Peculiar'
    // Beast stance mods - path-based before STANCE fallback
    if (un.includes('/Pets/BeastWeapons/')) return 'Beasts'
    const m2 = un.match(/\/Mods\/(?:Sets|PvPMods)\/([^/]+)/)
    if (m2 && TYPE_TO_CATEGORY[m2[1]]) return TYPE_TO_CATEGORY[m2[1]]
    const m = un.match(/\/Mods\/([^/]+)/)
    if (m && TYPE_TO_CATEGORY[m[1]]) return TYPE_TO_CATEGORY[m[1]]
  }
  // Check compatName for beast-vs-sentinel distinction
  if (entry?.compatName === 'BEAST') return 'Beasts'
  // Fall back to export type mapping
  if (exportType && exportType !== '---' && TYPE_TO_EXPORT_CATEGORY[exportType]) {
    return TYPE_TO_EXPORT_CATEGORY[exportType]
  }
  // AP_TACTIC polarity means Exilus slot mods (last resort - don't override explicit type/checks)
  if (entry?.polarity === 'AP_TACTIC') return 'Exilus'
  return null
}

function resolveArcaneDesc(levelStats, dict) {
  if (!levelStats || !Array.isArray(levelStats) || !levelStats.length) return ''
  const rankEntry = levelStats[levelStats.length - 1]
  if (!Array.isArray(rankEntry)) return ''
  const parts = rankEntry.map(statObj => {
    if (!statObj?.tag || !dict) return ''
    const tmpl = dict[statObj.tag] || dict['/' + statObj.tag] || ''
    if (!tmpl) return ''
    return tmpl.replace(/\|([^|]+)\|/g, (_, key) => {
      const val = statObj.sub?.[key]
      if (!val) return `|${key}|`
      if (typeof val === 'string') return dict[val] || dict['/' + val] || val
      if (val?.tag) {
        const vt = dict[val.tag] || dict['/' + val.tag] || ''
        if (vt) return vt.replace(/\|([^|]+)\|/g, (__, k) => val.sub?.[k] || `|${k}|`)
      }
      return String(val)
    })
  }).filter(Boolean)
  return parts.join('; ')
}

const ARCANE_CATEGORY_FOLDER = {
  Antiques: 'Antique',
  OperatorAmps: 'Amp',
  OperatorArmour: 'Operator',
  Operator: 'Operator',
  Melee: 'Melee',
  Defensive: 'Warframe',
  Support: 'Warframe',
}

const ARCANE_DISPLAY_NAME_CATEGORY = {
  'akimbo slip shot': 'Secondary',
  'arcane acceleration': 'Warframe',
  'arcane aegis': 'Warframe',
  'arcane agility': 'Warframe',
  'arcane arachne': 'Warframe',
  'arcane avenger': 'Warframe',
  'arcane awakening': 'Warframe',
  'arcane barrier': 'Warframe',
  'arcane battery': 'Warframe',
  'arcane bellicose': 'Warframe',
  'arcane blade charger': 'Warframe',
  'arcane blessing': 'Warframe',
  'arcane bodyguard': 'Warframe',
  'arcane camisado': 'Warframe',
  'arcane circumvent': 'Warframe',
  'arcane concentration': 'Warframe',
  'arcane consequence': 'Warframe',
  'arcane crepuscular': 'Warframe',
  'arcane deflection': 'Warframe',
  'arcane double back': 'Warframe',
  'arcane energize': 'Warframe',
  'arcane eruption': 'Warframe',
  'arcane escapist': 'Warframe',
  'arcane expertise': 'Warframe',
  'arcane fury': 'Warframe',
  'arcane grace': 'Warframe',
  'arcane guardian': 'Warframe',
  'arcane healing': 'Warframe',
  'arcane hot shot': 'Warframe',
  'arcane ice': 'Warframe',
  'arcane ice storm': 'Warframe',
  'arcane impetus': 'Warframe',
  'arcane intention': 'Warframe',
  'arcane momentum': 'Warframe',
  'arcane nullifier': 'Warframe',
  'arcane persistence': 'Warframe',
  'arcane phantasm': 'Warframe',
  'arcane pistoleer': 'Warframe',
  'arcane power ramp': 'Warframe',
  'arcane precision': 'Warframe',
  'arcane primary charger': 'Warframe',
  'arcane pulse': 'Warframe',
  'arcane rage': 'Warframe',
  'arcane reaper': 'Warframe',
  'arcane resistance': 'Warframe',
  'arcane rise': 'Warframe',
  'arcane steadfast': 'Warframe',
  'arcane strike': 'Warframe',
  'arcane tanker': 'Warframe',
  'arcane tempo': 'Warframe',
  'arcane trickery': 'Warframe',
  'arcane truculence': 'Warframe',
  'arcane ultimatum': 'Warframe',
  'arcane universal fallout': 'Warframe',
  'arcane velocity': 'Warframe',
  'arcane victory': 'Warframe',
  'arcane warmth': 'Warframe',
  'cascadia accuracy': 'Secondary',
  'cascadia empowered': 'Secondary',
  'cascadia flare': 'Secondary',
  'cascadia overcharge': 'Secondary',
  'conjunction voltage': 'Secondary',
  'emergence dissipate': 'Operator',
  'emergence renewed': 'Operator',
  'emergence savior': 'Operator',
  'eternal eradicate': 'Amp',
  'eternal logistics': 'Amp',
  'eternal onslaught': 'Amp',
  'exodia brave': 'Zaw',
  'exodia contagion': 'Zaw',
  'exodia epidemic': 'Zaw',
  'exodia force': 'Zaw',
  'exodia hunt': 'Zaw',
  'exodia might': 'Zaw',
  'exodia triumph': 'Zaw',
  'exodia valor': 'Zaw',
  'fractalized reset': 'Primary',
  'longbow sharpshot': 'Primary',
  'magus accelerant': 'Operator',
  'magus aggress': 'Operator',
  'magus anomaly': 'Operator',
  'magus cadence': 'Operator',
  'magus cloud': 'Operator',
  'magus destruct': 'Operator',
  'magus drive': 'Operator',
  'magus elevate': 'Operator',
  'magus firewall': 'Operator',
  'magus glitch': 'Operator',
  'magus husk': 'Operator',
  'magus lockdown': 'Operator',
  'magus melt': 'Operator',
  'magus nourish': 'Operator',
  'magus overload': 'Operator',
  'magus repair': 'Operator',
  'magus replenish': 'Operator',
  'magus revert': 'Operator',
  'magus vigor': 'Operator',
  'melee afflictions': 'Melee',
  'melee animosity': 'Melee',
  'melee careen': 'Melee',
  'melee crescendo': 'Melee',
  'melee doughty': 'Melee',
  'melee duplicate': 'Melee',
  'melee exposure': 'Melee',
  'melee fortification': 'Melee',
  'melee influence': 'Melee',
  'melee retaliation': 'Melee',
  'melee vortex': 'Melee',
  'molt augmented': 'Warframe',
  'molt efficiency': 'Warframe',
  'molt reconstruct': 'Warframe',
  'molt vigor': 'Warframe',
  'pax bolt': 'Kitgun',
  'pax charge': 'Kitgun',
  'pax seeker': 'Kitgun',
  'pax soar': 'Kitgun',
  'primary blight': 'Primary',
  'primary bulwark': 'Primary',
  'primary crux': 'Primary',
  'primary deadhead': 'Primary',
  'primary debilitate': 'Primary',
  'primary dexterity': 'Primary',
  'primary exhilarate': 'Primary',
  'primary frostbite': 'Primary',
  'primary merciless': 'Primary',
  'primary obstruct': 'Primary',
  'primary overcharge': 'Primary',
  'primary plated round': 'Primary',
  'residual boils': 'Kitgun',
  'residual malodor': 'Kitgun',
  'residual shock': 'Kitgun',
  'residual viremia': 'Kitgun',
  'secondary deadhead': 'Secondary',
  'secondary dexterity': 'Secondary',
  'secondary encumber': 'Secondary',
  'secondary enervate': 'Secondary',
  'secondary fortifier': 'Secondary',
  'secondary irradiate': 'Secondary',
  'secondary kinship': 'Secondary',
  'secondary merciless': 'Secondary',
  'secondary outburst': 'Secondary',
  'secondary shiver': 'Secondary',
  'secondary surge': 'Secondary',
  'shotgun vendetta': 'Primary',
  'theorem contagion': 'Warframe',
  'theorem demulcent': 'Warframe',
  'theorem infection': 'Warframe',
  'virtuos forge': 'Amp',
  'virtuos fury': 'Amp',
  'virtuos ghost': 'Amp',
  'virtuos null': 'Amp',
  'virtuos shadow': 'Amp',
  'virtuos spike': 'Amp',
  'virtuos strike': 'Amp',
  'virtuos surge': 'Amp',
  'virtuos tempo': 'Amp',
  'virtuos trojan': 'Amp',
  'zid-an asheir': 'Antique',
  'zid-an haras': 'Antique',
  'zid-an osbok': 'Antique',
  'zid-an sek-eel': 'Antique',
  'zid-an uskos': 'Antique',
}

function detectArcaneCategory(un, name) {
  if (!un) return 'Arcanes'
  const normalizedName = (name ?? '').toLowerCase()
  if (ARCANE_DISPLAY_NAME_CATEGORY[normalizedName]) return ARCANE_DISPLAY_NAME_CATEGORY[normalizedName]
  const m = un.match(/\/CosmeticEnhancers\/([^/]+)/)
  if (!m) return 'Arcanes'
  const folder = m[1]
  if (ARCANE_CATEGORY_FOLDER[folder]) return ARCANE_CATEGORY_FOLDER[folder]
  if (normalizedName.startsWith('primary ')) return 'Primary'
  if (normalizedName.startsWith('secondary ')) return 'Secondary'
  if (normalizedName.startsWith('melee ')) return 'Melee'
  if (normalizedName.startsWith('pax ') || normalizedName.startsWith('residual ')) return 'Kitgun'
  if (normalizedName.startsWith('exodia ')) return 'Zaw'
  if (normalizedName.startsWith('magus ') || normalizedName.startsWith('emergence ')) return 'Operator'
  if (normalizedName.startsWith('virtuos ') || normalizedName.startsWith('eternal ')) return 'Amp'
  if (normalizedName.startsWith('zid-an ') || normalizedName.startsWith('arcane ') || normalizedName.startsWith('molt ') || normalizedName.startsWith('theorem ')) return 'Warframe'
  return folder
}

export function parseInventory(raw, exports, dict, locale = 'en', i18nData = null) {
  if (!raw || typeof raw !== 'object' || !exports) return { all: [] };
  dict = (dict && Object.keys(dict).length > 0) ? dict : (exports?.['dict.en'] || exports?.dict || {})

  const toMap = (data, wrapperKey) => {
    if (!data) return {};
    let arr = data;
    if (typeof data === 'object' && !Array.isArray(data)) {
      if (wrapperKey && data[wrapperKey]) arr = data[wrapperKey];
      else {
        const keys = Object.keys(data);
        if (keys.length === 1) arr = data[keys[0]];
      }
    }
    if (Array.isArray(arr)) {
      const map = {};
      for (const item of arr) {
        const key = item.uniqueName || item.ItemType || item.name;
        if (key) map[key] = item;
      }
      return map;
    }
    return arr || {};
  };

  // ── Riven tag info (export-derived) ──
  // Per-riven-type stat bases, affix syllables, and dict lockeys, rebuilt from
  // ExportUpgrades' /Lotus/Upgrades/Mods/Randomized/<type> entries on every
  // parse (cheap: ~10ms). The old hardcoded riven_tags.json blob and
  // per-locale rivenStats tables are gone — DE's own data and dict strings
  // now drive the riven stat formula, constructed name, and labels.
  const buildRivenTagInfo = () => {
    const info = {};
    const upMap = toMap(exports.ExportUpgrades, 'ExportUpgrades');
    for (const [un, entry] of Object.entries(upMap)) {
      if (!un.includes('/Randomized/')) continue;
      const typeName = un.split('/').pop();
      const byTag = info[typeName] = info[typeName] || {};
      for (const ue of entry.upgradeEntries || []) {
        const uv = ue.upgradeValues && ue.upgradeValues[0];
        const syllable = (k) => {
          if (!k) return '';
          const v = dict[k] || dict[k.replace(/^\//, '')] || '';
          return v && !v.startsWith('/Lotus/') ? v.replace(/<[^>]*>/g, '').trim() : '';
        };
        byTag[ue.tag] = {
          value: uv?.value ?? 0.01,
          prefix: syllable(ue.prefixTag),
          suffix: syllable(ue.suffixTag),
          canBeBuff: !!ue.canBeBuff,
          canBeCurse: !!ue.canBeCurse,
          locTag: uv?.locTag || null,
        };
      }
    }
    return info;
  };
  const rivenTagInfo = buildRivenTagInfo();

  // ── warframe-items data (pre-resolved names, descriptions, images) ──
  // When WI maps are available (injected by MonitoringContext), they serve as
  // the primary lookup source.  Entries missing from WI are supplemented from
  // the original public-export-plus data.
  const useWI = !!exports.WI_Warframes;

  const mergeWithOrig = (wiMap, origKey) => {
    const map = wiMap ? { ...wiMap } : {};
    if (origKey && exports[origKey]) {
      const origMap = toMap(exports[origKey], origKey);
      for (const [un, origEntry] of Object.entries(origMap)) {
        if (map[un]) {
          // Copy the entry before mutating — map is a shallow spread of the WI
          // map, so entries are shared references; writing into them in place
          // would poison exports.WI_* with loctags for later readers (riven
          // weapon_name_en must stay English for the price model).
          map[un] = { ...map[un] };
          // Supplement WI entry with original fields it doesn't have.
          // Names: WI entries pre-resolve names to English literals, which
          // would defeat dict-based localization. When the original export
          // entry carries a dict loctag that resolves in the active locale
          // dict, prefer it so resolveName() localizes the name.
          const origName = origEntry?.name;
          const locValue = (typeof origName === 'string' && origName.startsWith('/Lotus/')) ? dict[origName] : null;
          if (locValue && !locValue.startsWith('/Lotus/')) {
            map[un].name = origName;
          }
          // Same as names: WI descriptions are pre-resolved to English literals
          // by warframe-items; when the original export carries a dict loctag that
          // resolves in the active locale dict, prefer the lockey so the desc
          // localizes (e.g. Adarza Kavat's English flavor text → Turkish).
          const origDesc = origEntry?.description;
          const descLocValue = (typeof origDesc === 'string' && origDesc.startsWith('/Lotus/')) ? dict[origDesc] : null;
          if (descLocValue && !descLocValue.startsWith('/Lotus/')) {
            map[un].description = origDesc;
          }
          for (const [k, v] of Object.entries(origEntry)) {
            if ((map[un][k] === undefined || map[un][k] === null) && v != null) {
              map[un][k] = v;
            }
          }
          // Icons: prefer the original export's INTERNAL card path
          // (/Lotus/Interface/Cards/Images/...) over warframe-items' remote
          // wikiaThumbnail. Internal paths join onto the locally-exported
          // cardImagesPath (convertFileSrc(cardImagesPath + iconPath)); the
          // remote URL only gets mangled into `card-imageshttps://...` 404s.
          const origIcon = origEntry?.icon;
          if (
            typeof origIcon === 'string' &&
            origIcon.startsWith('/Lotus/') &&
            typeof map[un].icon === 'string' &&
            /^https?:\/\//.test(map[un].icon)
          ) {
            map[un].icon = origIcon;
          }
        } else {
          // Entry only in original data
          map[un] = origEntry;
        }
      }
    }
    return map;
  };

  const EWf = useWI
    ? mergeWithOrig(exports.WI_Warframes, 'ExportWarframes')
    : toMap(exports.ExportWarframes, 'ExportWarframes');
  const EW = useWI
    ? mergeWithOrig(exports.WI_Weapons, 'ExportWeapons')
    : toMap(exports.ExportWeapons, 'ExportWeapons');
  const ES = useWI
    ? mergeWithOrig(exports.WI_Sentinels, 'ExportSentinels')
    : toMap(exports.ExportSentinels, 'ExportSentinels');
  const EM = useWI
    ? mergeWithOrig(exports.WI_Upgrades, 'ExportUpgrades')
    : toMap(exports.ExportUpgrades, 'ExportUpgrades');
  // Merge Railjack avionics into EM
  if (exports.ExportAvionics) {
    const avMap = toMap(exports.ExportAvionics, 'ExportAvionics');
    for (const [un, entry] of Object.entries(avMap)) {
      if (!EM[un]) EM[un] = entry;
    }
  }
  // If a patched ExportUpgrades file is available (with levelStats, modSet), merge its entries
  if (exports.ExportUpgradesFixed) {
    const fixedMap = toMap(exports.ExportUpgradesFixed, 'ExportUpgradesFixed');
    for (const [un, entry] of Object.entries(fixedMap)) {
      if (EM[un]) {
        if (entry.levelStats && !EM[un].levelStats) EM[un].levelStats = entry.levelStats;
        if (entry.modSet && !EM[un].modSet) EM[un].modSet = entry.modSet;
      }
    }
  }
  // Merge locale-specific ExportUpgrades from DE public manifest (localized levelStats)
  // These override the English _fixed.json stats with proper translations.
  if (exports.ExportUpgradesLocalized) {
    const locArr = exports.ExportUpgradesLocalized.ExportUpgrades || exports.ExportUpgradesLocalized;
    const locMap = toMap(locArr, 'ExportUpgrades');
    for (const [un, entry] of Object.entries(locMap)) {
      if (!EM[un]) continue;
      if (entry.levelStats) EM[un].levelStats = entry.levelStats;
      // Locale manifests (e.g. TR) ship mod/augment names as literal
      // translations. The dict only resolves these to English, so prefer the
      // manifest's literal name (non-loctag) whenever one exists.
      if (typeof entry.name === 'string' && entry.name && !entry.name.startsWith('/Lotus/')) {
        EM[un].name = entry.name;
      }
    }
  }
  // Same for patched ExportAvionics
  if (exports.ExportAvionicsFixed) {
    for (const [un, entry] of Object.entries(exports.ExportAvionicsFixed)) {
      if (EM[un]) {
        if (entry.levelStats && !EM[un].levelStats) {
          EM[un].levelStats = entry.levelStats;
        }
        if (entry.icon) {
          EM[un].icon = entry.icon;
        }
      }
    }
  }
  // Manual icon overrides for mods whose export data lacks an icon field
  // (e.g. Railjack avionics, some Antivirus/Immortal variants). An internal
  // /Lotus/... card path beats a remote wikiaThumbnail so the local export is
  // used instead of a mangled card-imageshttps://... remote URL.
  if (exports.ModIconMap) {
    for (const [un, iconPath] of Object.entries(exports.ModIconMap)) {
      if (EM[un] && (!EM[un].icon || /^https?:\/\//.test(EM[un].icon))) {
        EM[un].icon = iconPath;
      }
    }
  }
  const EA = useWI
    ? mergeWithOrig(exports.WI_Arcanes, 'ExportArcanes')
    : toMap(exports.ExportArcanes, 'ExportArcanes');
  const ER = useWI
    ? mergeWithOrig(exports.WI_Resources, 'ExportResources')
    : toMap(exports.ExportResources, 'ExportResources');
  const ERel = useWI
    ? mergeWithOrig(exports.WI_Relics, 'ExportRelics')
    : toMap(exports.ExportRelics, 'ExportRelics');
  const ERew = toMap(exports.ExportRewards, 'ExportRewards');
  const ERecipe = toMap(exports.ExportRecipes, 'ExportRecipes');
  const ECust = useWI
    ? mergeWithOrig(exports.WI_Customs, 'ExportCustoms')
    : toMap(exports.ExportCustoms, 'ExportCustoms');
  const EGear = useWI
    ? mergeWithOrig(exports.WI_Gear, 'ExportGear')
    : toMap(exports.ExportGear, 'ExportGear');
  const EB = toMap(exports.ExportBundles, 'ExportBundles');

  // ── XP lookup ──
  // inventory.XPInfo contains per-item affinity totals, referenced by ItemType.
  // We build a quick map here so createItem can look it up in O(1).
  const xpMap = {};
  (raw.XPInfo ?? []).forEach(i => {
    if (i.ItemType) xpMap[i.ItemType] = i.XP ?? 0;
  });

  // ── Owned-item index ──
  // We first group all owned instances by their ItemType (unique name) so that
  // later per-category processors can quickly check "does the player own this?"
  // without iterating the whole inventory each time.
  const ownedItems = {};
  const processList = (list) => {
    for (const item of (list ?? [])) {
      const un = item.ItemType;
      if (!un) continue;
      if (!ownedItems[un]) ownedItems[un] = [];
      ownedItems[un].push(item);
    }
  };

  [
    raw.Suits, raw.LongGuns, raw.Pistols, raw.Melee,
    raw.Sentinels, raw.KubrowPets, raw.MoaPets, raw.ZanukaPets, raw.SentinelWeapons,
    raw.SpaceMelee, raw.SpaceGuns, raw.MechSuits, raw.OperatorAmps,
    raw.SpaceSuits, raw.Hoverboards
  ].forEach(processList);

  const subsumedSet = new Set((raw.InfestedFoundry?.ConsumedSuits ?? []).map(s => s.s).filter(Boolean));
  const incarnonSet = new Set((raw.EvolutionProgress ?? []).map(e => e.ItemType).filter(Boolean));
  const evolutionLevels = new Map((raw.EvolutionProgress ?? []).filter(e => e.ItemType).map(e => [e.ItemType, e.EvolutionLevel]));

  // ── createItem ──
  // Central factory used by every category processor.
  // Resolves name, image, rank, mastery XP, and metadata for one item instance.
  const createItem = (un, category, nameTbls, imgTbls, sourceItem = null) => {
    // For un-polarized overlevelable weapons, use capped XP from xpMap
    // XPInfo caps XP at 30² × 500 = 450000 for un-polarized weapons
    const isOverlevelable = getRankLimit(un, category, EM, EA, EW) === 40;
    const hasPolarization = (sourceItem?.Polarized ?? 0) > 0;
    const useCappedXP = isOverlevelable && !hasPolarization;

    const xp = useCappedXP ? (xpMap[un] ?? 0) : (sourceItem?.XP ?? xpMap[un] ?? 0);
    const limit = getRankLimit(un, category, EM, EA, EW);

    // For mods, prioritize rank from Fingerprint or Item data over XP calculation
    const fp = sourceItem?.UpgradeFingerprint ? parseFP(sourceItem.UpgradeFingerprint) : null;
    let rank = parseInt(fp?.lvl ?? sourceItem?.UpgradeLevel ?? -1, 10);

    if (rank === -1) {
      // Cap rank at the actual achievable max for this weapon's forma count.
      // XPInfo accumulates XP across forma resets, so raw xpMap values can
      // exceed rank-40 thresholds even for a 1-forma weapon - without this
      // cap, any polarized weapon with enough accumulated XP shows as rank 40.
      const formaCount = sourceItem?.Polarized ?? 0;
      const effectiveMaxRank = isOverlevelable
        ? (hasPolarization ? 30 + Math.min(formaCount * 2, 10) : 30)
        : limit;
      rank = calculateRank(xp, category, un, effectiveMaxRank);
    }

    // Mastery XP: rank * (100 for weapons, 200 for heavy)
    // For overlevelable weapons, polarization affects mastery calculation
    const heavyCategories = [
      'warframes', 'companions', 'necramechs', 'archwings',
      'sentinels', 'moas', 'hounds', 'beasts', 'robotics', 'plexus', 'kdrives'
    ];
    const baseMasteryPerRank = heavyCategories.includes(category) ? 200 : 100;

    // Modular items (MOAs, Hounds, Zaws, Kitguns, Amps) only grant mastery when Gilded
    const modularCategories = ['moas', 'hounds', 'zaws', 'kitguns', 'amps'];
    const isModular = modularCategories.includes(category);

    // Gilding is indicated by: Features bit 0 set, or has CustomName, or Polarized > 0
    const isGilded = (sourceItem?.Features & 1) ||
      (sourceItem?.Polarized > 0) ||
      (!!sourceItem?.CustomName && !sourceItem.CustomName.startsWith('/Lotus/'));
    const grantsMastery = !isModular || isGilded;

    // Get polarization count from sourceItem
    const polarizeCount = sourceItem?.Polarized ?? 0;

    let mastery_xp, max_mastery_xp, mastered;
    const baseMasteryAtMax = limit * baseMasteryPerRank;

    if (isOverlevelable && hasPolarization) {
      // Polarized overlevelable: base is 30 * baseMasteryPerRank
      const baseXP = 30 * baseMasteryPerRank;
      if (rank <= 30) {
        // If still at or below 30, mastery is locked at base value
        mastery_xp = baseXP;
      } else {
        // Beyond 30: base + extra per rank beyond 30 (still 100 per rank)
        mastery_xp = baseXP + (rank - 30) * baseMasteryPerRank;
      }
      // Max rank depends on polarization (2 extra per forma, max 10 extra = 40)
      const effectiveMaxRank = 30 + Math.min(polarizeCount * 2, 10);
      max_mastery_xp = baseXP + Math.max(0, effectiveMaxRank - 30) * baseMasteryPerRank;
      mastered = rank >= effectiveMaxRank;
    } else if (hasPolarization) {
      // Polarized: once maxed, permanently grants max mastery
      // Forma resets rank but keeps the mastered status
      mastery_xp = baseMasteryAtMax;
      max_mastery_xp = baseMasteryAtMax;
      mastered = true;
    } else {
      // Normal weapons or un-polarized overlevelable
      // For companion types:
      // - Kubrows and Kavats: always give mastery at max rank (no gilding)
      // - MOAs, Predasites, Vulpaphylas, Hounds: need gilding to give mastery
      const isKubrow = un.includes('/KubrowPets/') || un.toLowerCase().includes('kubrow');
      const isKavat = un.includes('/Kavat/') || un.toLowerCase().includes('kavat');
      const isBeast = category === 'beasts';

      // Gilding is indicated by having a non-empty Name in Details
      const hasName = sourceItem?.Details?.Name && sourceItem.Details.Name.length > 0;
      const isGilded = hasName;

      const beastRankRaw = sourceItem?.UpgradeLevel;
      const beastRank = beastRankRaw ? parseInt(beastRankRaw, 10) : rank;
      const effectiveRank = (isBeast && beastRank > 0) ? beastRank : rank;

      if (isBeast) {
        const needsGilding = !isKubrow && !isKavat;

        if (!needsGilding || isGilded) {
          // Kubrows/Kavats always give mastery, or others if they have a name (gilded)
          mastery_xp = effectiveRank * baseMasteryPerRank;
          mastered = effectiveRank >= limit;
        } else {
          // Predasite/Vulpaphyla/Hound not gilded - no mastery
          mastery_xp = 0;
          mastered = false;
        }
      } else {
        mastery_xp = grantsMastery ? (effectiveRank * baseMasteryPerRank) : 0;

        // Correct threshold: Affinity XP needed for max rank = limit² * baseXPPerRank
        const isHeavy = heavyCategories.includes(category);
        const baseXPPerRank = isHeavy ? 1000 : 500;
        const affinityThreshold = limit * limit * baseXPPerRank;
        const lifetimeMastered = xp >= affinityThreshold;

        mastered = grantsMastery && ((sourceItem?.mastered ?? false) || lifetimeMastered);
      }
      max_mastery_xp = limit * baseMasteryPerRank;
    }

    let baseName = resolveName(un, dict, locale, ...nameTbls);
    if (un.includes('/BoardSuit')) baseName = 'Merulina';

    let name = baseName;
    let image = resolveImage(un, ...imgTbls);

    const customName = sourceItem?.ItemName || sourceItem?.CustomName || sourceItem?.Details?.Name;
    if (customName && !customName.startsWith('/Lotus/') && customName !== name) {
      name = `${customName} (${baseName})`;
    }

    // Reuse fp from rank calculation
    let components = [];

    if (category === 'amps') {
      components = resolveAmpComponents(sourceItem, dict, locale, EW, ER);
      const prismPart = sourceItem?.ModularParts?.[0] || parseFP(sourceItem.UpgradeFingerprint)?.ModularParts?.[0];
      if (prismPart) image = resolveImage(prismPart, EW, ER);
      if (un.includes('DrifterPistol')) name = 'Sirocco';
      else {
        // The game calls the weapon "Amp" in EN and most locales; FR uses
        // "Amplificateur" (dict: /Lotus/Language/Items/OperatorVoidBeam).
        const ampDictKey = '/Lotus/Language/Items/OperatorVoidBeam';
        const ampName = dict[ampDictKey] || dict['/' + ampDictKey];
        name = (ampName && !ampName.startsWith('/Lotus/')) ? cleanName(ampName) : 'Amp';
        if (customName && !customName.startsWith('/Lotus/')) name = customName;
      }
    } else {
      components = fp?.components?.map(c => resolveName(c, dict, locale, EW, ES, ER, EA)) ?? [];
    }

    if (!image && fp?.components?.length > 0) {
      for (const compUn of fp.components) {
        image = resolveImage(compUn, EW, ES, ER, EWf, EA);
        if (image) break;
      }
    }

    const entry = nameTbls[0]?.[un];
    const descLoctag = entry?.description ?? '';
    const rawDesc = descLoctag
      ? (descLoctag.startsWith('/Lotus/')
          ? (dict[descLoctag] || dict['/' + descLoctag] || '')
          : descLoctag)
      : '';
    const description = rawDesc ? rawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';

    return {
      unique_name: un,
      name,
      image,
      category,
      description,
      xp,
      rank,
      max_rank: isOverlevelable
        ? (hasPolarization ? 30 + Math.min((sourceItem?.Polarized ?? 0) * 2, 10) : 30)
        : limit,
      mastery_xp,
      max_mastery_xp,
      owned: !!sourceItem || !!xpMap[un],
      mastered,
      subsumed: subsumedSet.has(un),
      is_prime: entry?.variantType === 'VT_PRIME' || /Prime$/i.test(un.split('/').filter(Boolean).at(-1) ?? ''),
      is_incarnon: incarnonSet.has(un),
      incarnon_evolution_level: evolutionLevels.get(un) ?? -1,
      quantity: sourceItem?.ItemCount ?? (sourceItem || xpMap[un] ? 1 : 0),
      formas: sourceItem?.Polarized ?? 0,
      components,
      ...sourceItem
    };
  };

  const FOUNDER_ITEMS = new Set([
    '/Lotus/Powersuits/Excalibur/ExcaliburPrime',
    '/Lotus/Weapons/Tenno/Pistol/LatoPrime',
    '/Lotus/Weapons/Tenno/Melee/LongSword/SkanaPrime'
  ]);

  const processCategory = (map, category, nameTbls, imgTbls, filterFn = null) => {
    const results = [];
    for (const [un, entry] of Object.entries(map)) {
      if (filterFn && !filterFn(entry, un)) continue;
      const instances = ownedItems[un];
      if (!instances && FOUNDER_ITEMS.has(un)) continue;
      (instances ?? [null]).forEach(inst => results.push(createItem(un, category, nameTbls, imgTbls, inst)));
    }
    return results;
  };

  const warframes = processCategory(EWf, 'warframes', [EWf], [EWf],
    (e, un) => e.productCategory === 'Suits' && !un.includes('SpaceSuits') && !un.includes('MechSuits'));

  const weaponsRaw = processCategory(EW, 'weapons', [EW], [EW], (e) => {
    if (e.sentinel) return false;
    if (['SpaceGuns', 'SpaceMelee', 'SentinelWeapons'].includes(e.productCategory)) return false;
    // Include hidden weapons if they are known special variants
    const name = (e.name || "").toLowerCase();
    const isSpecial = name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime');
    if (e.excludeFromCodex && !isSpecial) return false;
    return true;
  });

  const primary = [], secondary = [], melee = [], kitguns = [], zaws = [];
  weaponsRaw.forEach(i => {
    const e = EW[i.unique_name];
    if (!e) return;
    const name = (e.name || "").toLowerCase();
    const un = i.unique_name;
    const isKitgun = (un.includes('ModularPistol') || un.includes('ModularPrimary')) && !un.includes('Vandal') && !un.includes('Wraith') && !un.includes('Prisma');
    const isZaw = un.includes('ModularMelee') && !un.includes('Vandal') && !un.includes('Wraith') && !un.includes('Prisma');

    if (isKitgun) {
      // Only include finished assemblies or Chambers (mastery-providing parts)
      if (!un.endsWith('Part') || un.includes('/Barrel/') || un.includes('/Barrels/')) {
        i.category = 'kitguns';
        kitguns.push(i);
      }
    } else if (isZaw) {
      // Only include finished assemblies or Strikes (mastery-providing parts)
      if (!un.endsWith('Part') || un.includes('/Tip/') || un.includes('/Tips/')) {
        i.category = 'zaws';
        zaws.push(i);
      }
    } else if (e.productCategory === 'LongGuns' && (e.noise || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'primary';
      i.weapon_type = 'primary';
      primary.push(i);
    } else if (e.productCategory === 'Pistols' && (e.noise || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'secondary';
      i.weapon_type = 'secondary';
      secondary.push(i);
    } else if (e.productCategory === 'Melee' && (e.damagePerShot || name.includes('vandal') || name.includes('wraith') || name.includes('prisma') || name.includes('prime'))) {
      i.category = 'melee';
      i.weapon_type = 'melee';
      melee.push(i);
    }
  });

  const companionsRaw = processCategory(ES, 'companions', [ES], [ES]);
  const sentinels = [], moas = [], hounds = [], beasts = [], robotics = [];

  companionsRaw.forEach(i => {
    const un = i.unique_name;
    const entry = ES[un];

    // Note: Venari and Venari Prime have productCategory 'SpecialItems' in ES
    // but the game DOES count them toward Kavat mastery. They are explicitly
    // added to beasts via the uniqueName check below (lines 750-751).

    if (entry?.productCategory === 'Sentinels') {
      const item = { ...i, category: 'sentinels' };
      sentinels.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/MoaPets/')) {
      const item = { ...i, category: 'moas' };
      moas.push(item);
      robotics.push(item);
    } else if (un.includes('/Sentinels/ZanukaPets/')) {
      const item = { ...i, category: 'hounds' };
      hounds.push(item);
      robotics.push(item);
    } else if (entry?.productCategory === 'KubrowPets' || [
      '/Lotus/Powersuits/Khora/Kavat/KhoraKavatPowerSuit',
      '/Lotus/Powersuits/Khora/Kavat/KhoraPrimeKavatPowerSuit'
    ].includes(un)) {
      const beast = { ...i, category: 'beasts' };
      // Fix name order: createItem produces "CustomName (BaseName)", we want "BaseName (CustomName)"
      const parenIdx = beast.name.indexOf(' (');
      if (parenIdx > 0 && beast.name.endsWith(')')) {
        const custom = beast.name.slice(0, parenIdx);
        const base = beast.name.slice(parenIdx + 2, -1);
        beast.name = `${base} (${custom})`;
        beast.ownedCustomName = custom;
      }
      // Deimos companions (Predasites + Vulpaphylas) require gilding through Son
      // before mastery is granted - identical rule to Kitguns/Zaws.
      if (un.includes('/Friendly/Pets/CreaturePets/')) {
        const rawInst = (ownedItems[un] ?? [])[0];
        // Gilding is indicated by having a non-empty Name in Details
        const hasName = rawInst?.Details?.Name && rawInst.Details.Name.length > 0;
        if (!hasName) {
          beast.mastery_xp = 0;
          beast.mastered = false;
        }
      }
      beasts.push(beast);
    }
  });

  const companion_weapons = processCategory(EW, 'companion_weapons', [EW], [EW], (e) => e.productCategory === 'SentinelWeapons');

  const archweapons = processCategory(EW, 'archweapons', [EW], [EW], (e) => ['SpaceGuns', 'SpaceMelee'].includes(e.productCategory))
    .map(i => { i.weapon_type = EW[i.unique_name].productCategory === 'SpaceGuns' ? 'archgun' : 'archmelee'; return i; });

  const necramechs = processCategory(EWf, 'necramechs', [EWf], [EWf], (e) => e.productCategory === 'MechSuits');

  const archwings = [], kdrives = [];
  Object.entries(EWf).filter(([, e]) => e.productCategory === 'SpaceSuits').forEach(([un]) => {
    (ownedItems[un] ?? [null]).forEach(inst => archwings.push(createItem(un, 'archwings', [EWf], [EWf], inst)));
  });
  if (raw.Hoverboards) {
    raw.Hoverboards.forEach(h => {
      const components = resolveHoverboardComponents(h, dict, locale, EW);
      // The deck/board is the mastery-granting part - find it by path, not position,
      // since ModularParts order varies and index 0 may be an engine (e.g. Hothead).
      const deckPart = (h.ModularParts ?? []).find(p => p.includes('Deck')) ?? h.ModularParts?.[0];
      const baseName = deckPart ? resolveName(deckPart, dict, locale, EW) : 'K-Drive';
      const image = deckPart ? resolveImage(deckPart, EW) : null;
      const customName = h.ItemName || h.CustomName || h.Details?.Name;
      const ownedCustomName = (customName && !customName.startsWith('/Lotus/') && customName !== baseName) ? customName : '';
      const displayName = ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName;
      const item = createItem(deckPart || h.ItemType, 'kdrives', [EW], [EW], h);
      kdrives.push({ ...item, name: displayName, ownedCustomName, image: image || item.image, components, vehicle_type: 'kdrive' });
    });
  }

  // Supplement with unowned k-drive board types from EW
  const ownedDeckPaths = new Set(kdrives.map(k => k.unique_name));
  Object.keys(EW)
    .filter(k => k.includes('/Hoverboard/') && k.includes('Deck'))
    .forEach(deckPath => {
      if (ownedDeckPaths.has(deckPath)) return;
      const xp = xpMap[deckPath] ?? 0;
      const rank = calculateRank(xp, 'kdrives', deckPath);
      const mastery_xp = rank * 200;
      kdrives.push({
        unique_name: deckPath,
        name: resolveName(deckPath, dict, locale, EW),
        image: resolveImage(deckPath, EW),
        category: 'kdrives',
        xp, rank, mastery_xp,
        owned: xp > 0,
        mastered: mastery_xp >= 6000,
        vehicle_type: 'kdrive',
        components: [],
        ownedCustomName: '',
      });
    });

  const plexus = (raw.XPInfo ?? [])
    .filter(i => i.ItemType?.includes('/RailJack/DefaultHarness'))
    .map(i => ({ ...createItem(i.ItemType, 'plexus', [EW], [EW], i), name: 'Railjack Plexus' }));

  const intrinsics = [];
  if (raw.PlayerSkills) {
    const rjKeys = ['LPS_TACTICAL', 'LPS_PILOTING', 'LPS_ENGINEERING', 'LPS_GUNNERY', 'LPS_COMMAND'];
    const driftKeys = ['LPS_DRIFT_RIDING', 'LPS_DRIFT_COMBAT', 'LPS_DRIFT_OPPORTUNITY', 'LPS_DRIFT_ENDURANCE'];

    rjKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Railjack ${k.replace('LPS_', '').charAt(0) + k.replace('LPS_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });

    driftKeys.forEach(k => {
      const rank = raw.PlayerSkills[k] ?? 0;
      intrinsics.push({
        name: `Drifter ${k.replace('LPS_DRIFT_', '').charAt(0) + k.replace('LPS_DRIFT_', '').slice(1).toLowerCase()}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      });
    });
  } else {
    const parseIntrinsicSet = (data, prefix) => {
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data).map(([key, rank]) => ({
        name: `${prefix} ${key}`,
        rank: rank,
        mastery_xp: rank * 1500,
        category: 'intrinsics',
        owned: true,
        mastered: rank >= 10
      }));
    };
    intrinsics.push(...parseIntrinsicSet(raw.PlayerIntrinsics, 'Railjack'));
    intrinsics.push(...parseIntrinsicSet(raw.ParadoxIntrinsics, 'Drifter'));
  }

  const ERegs = exports.ExportRegions ?? {};
  const missionTags = new Set((raw.Missions ?? []).map(m => m.Tag));
  const spTags = new Set((raw.Missions ?? []).filter(m => m.Tier === 1).map(m => m.Tag));

  // nodeType 0 = mission nodes, nodeType 7 = junctions (1000 XP each)
  // masteryExp field on nodeType 0 is the direct mastery XP value for that node (0 means no mastery)
  const starchartNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 0)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: v.masteryExp ?? 0,   // direct mastery XP for this node (0 = not a mastery node)
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
    }));

  // Junction nodes (nodeType 7) each grant 1000 mastery XP once completed
  const junctionNodes = Object.entries(ERegs)
    .filter(([, v]) => v.nodeType === 7)
    .map(([tag, v]) => ({
      tag,
      name: dict[v.name] || v.name?.split('/').pop() || tag,
      system: dict[v.systemName] || v.systemName?.split('/').pop() || '',
      mastery_xp: 1000,
      played: missionTags.has(tag),
      sp_played: spTags.has(tag),
      isJunction: true,
    }));

  // Only count mastery-eligible nodes (masteryExp > 0 for missions, always for junctions)
  const masteryMissionNodes = starchartNodes.filter(n => n.mastery_xp > 0);
  const allMasteryNodes = [...masteryMissionNodes, ...junctionNodes];

  const starchart = {
    nodes: [...starchartNodes, ...junctionNodes],  // all for display purposes
    masteryNodes: allMasteryNodes,                         // only mastery-eligible
    total: allMasteryNodes.length,
    origin: allMasteryNodes.filter(n => n.played).length,
    steel_path: allMasteryNodes.filter(n => n.sp_played).length,
    origin_xp: allMasteryNodes.filter(n => n.played).reduce((s, n) => s + n.mastery_xp, 0),
    steel_path_xp: allMasteryNodes.filter(n => n.sp_played).reduce((s, n) => s + n.mastery_xp, 0),
  };

  const ampMasteryItems = {};
  // Pass 1: build prismPath → highest-XP amp custom name map
  const prismCustomNameMap = {};
  (raw.OperatorAmps ?? []).forEach(a => {
    if (a.ItemType?.includes('DrifterPistol')) return;
    const parts = a.ModularParts ?? [];
    const barrel = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];
    if (!barrel) return;
    const existing = prismCustomNameMap[barrel];
    const xp = a.XP ?? 0;
    if (!existing || xp > existing.xp) {
      prismCustomNameMap[barrel] = { xp, name: a.ItemName || a.CustomName || '' };
    }
  });

  (raw.OperatorAmps ?? []).forEach(a => {
    const un = a.ItemType;
    let mKey = '';
    let mName = '';
    let prismPath = '';

    if (un?.includes('DrifterPistol')) {
      mKey = un;
      mName = 'Sirocco';
      prismPath = un;
    } else {
      const parts = a.ModularParts ?? (a.UpgradeFingerprint ? (parseFP(a.UpgradeFingerprint)?.ModularParts ?? []) : []);
      // Prism (barrel) is the part whose path contains 'barrel' (case-insensitive)
      prismPath = parts.find(p => p.toLowerCase().includes('barrel')) ?? parts[2] ?? parts[0];

      if (prismPath) {
        mKey = prismPath;
        mName = resolveName(prismPath, dict, locale, EW);
        // Training amp barrel resolves to its internal name; normalise to "Mote Amp"
        if (un?.includes('TrainingAmp')) mName = 'Mote Amp';
      } else if (un?.includes('TrainingAmp')) {
        mKey = 'mote_amp';
        mName = 'Mote Amp';
        prismPath = 'mote_amp';
      }
    }

    if (!mKey) return;

    // Prefer XPInfo (per-prism mastery XP) over the individual amp's XP
    const xp = xpMap[prismPath] ?? a.XP ?? 0;
    const rank = calculateRank(xp, 'weapons', prismPath);
    const mastery_xp = rank * 100;
    const owned = xp > 0;
    const mastered = mastery_xp >= 3000;
    const image = resolveImage(prismPath, EW) || resolveImage(un, EW, ER);
    const ownedCustomName = prismCustomNameMap[prismPath]?.name ?? '';

    if (!ampMasteryItems[mKey] || xp > (ampMasteryItems[mKey].xp ?? 0)) {
      ampMasteryItems[mKey] = {
        unique_name: mKey,
        name: ownedCustomName ? `${mName} (${ownedCustomName})` : mName,
        image, category: 'amps',
        xp, rank, mastery_xp, owned, mastered,
        ownedCustomName,
        components: resolveAmpComponents(a, dict, locale, EW, ER),
      };
    }
  });

  // Supplement with any prisms from EW not yet seen in raw.OperatorAmps
  const siroccoPath = Object.keys(EW).find(k => k.toLowerCase().includes('drifterpistol'));
  [
    ...Object.keys(EW).filter(k => k.includes('OperatorAmplif') && k.toLowerCase().includes('barrel')),
    siroccoPath,
  ].filter(Boolean).forEach(prismPath => {
    if (ampMasteryItems[prismPath]) return; // already tracked from owned amps
    let mName = resolveName(prismPath, dict, locale, EW);
    if (prismPath.includes('SentAmpTraining')) mName = 'Mote Amp';
    if (prismPath.toLowerCase().includes('drifterpistol')) mName = 'Sirocco';
    const xp = xpMap[prismPath] ?? 0;
    const rank = calculateRank(xp, 'weapons', prismPath);
    const mastery_xp = rank * 100;
    ampMasteryItems[prismPath] = {
      unique_name: prismPath,
      name: mName,
      image: resolveImage(prismPath, EW),
      category: 'amps',
      xp, rank, mastery_xp,
      owned: xp > 0,
      mastered: mastery_xp >= 3000,
      ownedCustomName: '',
      components: [],
    };
  });

  const amps = Object.values(ampMasteryItems);

  const arcanes = [], mods = [];
  const rawUpgrades = raw.RawUpgrades ?? [];
  const upgrades = raw.Upgrades ?? [];
  [...rawUpgrades, ...upgrades].forEach(u => {
    const un = u.ItemType;
    if (!un || un.includes('Randomized') || un.includes('RandomMod')) return;

    // Skip mods that were removed from the game but still sit in inventories
    const REMOVED_MOD = new Set([
      'Swift Deth', 'Tn Cross Attack', 'Boom Stick', 'Warrior',
    ]);
    if (REMOVED_MOD.has(resolveName(un, dict, locale, EA, EM) || nameFromPath(un))) return;
    const isArcane = (un.includes('CosmeticEnhancers') && !un.includes('CosmeticEnhancers/Peculiars')) || un.includes('/Arcane/') || un.toLowerCase().includes('arcane');
    if (isArcane) {
      const arcEntry = EA[un]
      const arcFP = u.UpgradeFingerprint ? parseFP(u.UpgradeFingerprint) : null
      const arcRank = arcFP?.lvl ?? 0
      const arcRankLimit = arcEntry?.levelStats?.length ? arcEntry.levelStats.length - 1 : 5
      const arcDesc = resolveArcaneDesc(arcEntry?.levelStats, dict)
      const arcCat = detectArcaneCategory(un, resolveName(un, dict, locale, EA, EM) || nameFromPath(un))
      arcanes.push({
        unique_name: un,
        name: resolveName(un, dict, locale, EA, EM) || nameFromPath(un),
        image: resolveImage(un, EA, EM),
        category: 'Arcanes',
        arcaneType: arcCat,
        quantity: u.ItemCount ?? 1,
        rank: arcRank,
        max_rank: arcRankLimit,
        owned: true,
        rarity: (arcEntry?.rarity || '').toLowerCase(),
        icon: arcEntry?.icon ?? null,
        modFrame: 'Arcanes',
        description: arcDesc,
        levelStats: arcEntry?.levelStats ?? null,
      });
    } else {
      const mod = createItem(un, 'mods', [EM], [EM], u);
      const entry = EM[un];
      mod.rarity = entry?.rarity ?? '';
      mod.polarity = entry?.polarity ?? null;
      mod.modFrame = detectModFrame(un, mod.rarity, mod.name);
      if (un.toLowerCase().includes('/fusers/')) mod.name = 'Legendary Fusion Core';
      const descLoctag = entry?.description ?? '';
      const rawDesc = descLoctag
        ? (descLoctag.startsWith('/Lotus/')
            ? (dict[descLoctag] || dict['/' + descLoctag] || '')
            : descLoctag)
        : '';
      mod.description = rawDesc ? rawDesc.replace(/\|[^|]+\|/g, '').trim() : '';
      mod.levelStats = entry?.levelStats ?? null;
      mod.category = extractModCategory(entry?.type, un, entry);
      mod.baseDrain = entry?.baseDrain ?? null;
      mod.icon = entry?.icon ?? null;
      if (!mod.icon && exports.PeelyPixMap?.[un]) {
        mod.icon = exports.PeelyPixMap[un];
      }
      if (exports.PeelyPixNames?.[un]) {
        const ppn = i18nData?.peely?.[un] ?? exports.PeelyPixNames[un];
        mod.name = ppn.name;
        mod.description = ppn.description;
        mod._isSticker = true;
      }
      let modSet = entry?.modSet;
      if (!modSet && exports.ExportUpgradesFixed) {
        const fe = exports.ExportUpgradesFixed[un];
        if (fe?.modSet) modSet = fe.modSet;
      }
      if (!modSet) {
        const m = un.match(/\/Lotus\/Upgrades\/Mods\/Sets\/([^/]+)\//);
        if (m) modSet = `/Lotus/Upgrades/Mods/Sets/${m[1]}/${m[1]}SetMod`;
      }
      mod.modSet = modSet ?? null;
      if (!mod.description && (mod.name === 'Scan Aquatic Lifeforms' || un.includes('/LocateCreaturesMod'))) {
        mod.description = 'Reveals hotspots within 100m and applies Luminous Dye to fish within 40m.';
      }
      mods.push(mod);
    }
  });

  const consumables = (raw.Consumables ?? []).map(c => {
    const cUn = c.ItemType;
    // Guild glyph consumables share the regular glyph prism export entry
    // (inventory paths carry a "Guild" prefix the export table lacks)
    const lookupUn = cUn?.includes('GuildGlyphConsumable')
      ? cUn.replace('GuildGlyphConsumable', 'GlyphConsumable')
      : cUn;
    const cEntry = EGear[lookupUn];
    const cDescLoctag = cEntry?.description ?? '';
    const cRawDesc = cDescLoctag ? (dict[cDescLoctag] || dict['/' + cDescLoctag] || '') : '';
    const cDescription = cRawDesc ? cRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
    return {
      unique_name: cUn,
      name: resolveName(lookupUn, dict, locale, EGear, ER, ERecipe) || nameFromPath(cUn),
      description: cDescription,
      image: resolveImage(lookupUn, EGear, ER, ERecipe),
      category: 'consumables',
      quantity: c.ItemCount ?? 1,
      owned: true
    };
  });

  const resources = [], prime_parts = [], primeSets = {};

  // Build owned items map for quick lookup (for prime sets)
  const primeItemCounts = new Map();
  for (const item of (raw.MiscItems ?? [])) {
    const un = item.ItemType ?? '';
    if (un.includes('/Projections/') || un.includes('/Upgrades/Relic/')) continue;
    primeItemCounts.set(un, item.ItemCount ?? 1);
  }
  for (const item of (raw.Recipes ?? [])) {
    const un = item.ItemType ?? '';
    primeItemCounts.set(un, item.ItemCount ?? 1);
  }

  // Find all prime weapon/warframe recipes and build sets
  const seenPrimeSets = new Set();
  for (const [bpKey, recipe] of Object.entries(ERecipe ?? {})) {
    if (!recipe?.resultType) continue;
    const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

    // Check if this is a prime item (but not a component blueprint)
    if (!/Prime$/i.test(resultName)) continue;
    if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') ||
      bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') ||
      bpKey.includes('WingsBlueprint') || bpKey.includes('BarrelBlueprint') ||
      bpKey.includes('ReceiverBlueprint') || bpKey.includes('StockBlueprint') ||
      bpKey.includes('BladeBlueprint') || bpKey.includes('HandleBlueprint') ||
      bpKey.includes('LinkBlueprint') || bpKey.includes('NeuropticsBlueprint') ||
      bpKey.includes('CarapaceBlueprint') || bpKey.includes('CerebrumBlueprint')) continue;

    const baseName = resultName;
    if (seenPrimeSets.has(baseName)) continue;
    seenPrimeSets.add(baseName);

    const setParts = [];
    let ownedCount = 0;
    let totalCount = 0;

    // Use the result item's image (parent item) not a component's image
    const parentImage = resolveImage(recipe.resultType, EW, EWf, ER, ES);

    // Add the main item blueprint (always include, even if not owned)
    const bpQty = primeItemCounts.get(bpKey) ?? 0;
    setParts.push({ unique_name: bpKey, name: resultName + (BLUEPRINT_SUFFIX[locale] ?? ' Blueprint'), image: parentImage, quantity: bpQty, owned: bpQty > 0, isBlueprint: true });
    if (bpQty > 0) ownedCount += bpQty;
    totalCount += 1;

    // Add prime components from recipe ingredients (exclude resources like orokin cells).
    // PRIME_PART_PATH_RE is module-scoped (see top of file).
    const isPrimeComponent = (itemType) => PRIME_PART_PATH_RE.test(itemType.split('/').pop());
    const ingredientMap = new Map();
    for (const ing of (recipe.ingredients ?? [])) {
      const ingName = resolveName(ing.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
      if (!isPrimeComponent(ing.ItemType)) continue;
      const key = ing.ItemType;
      if (ingredientMap.has(key)) {
        ingredientMap.get(key).need += ing.ItemCount ?? 1;
      } else {
        ingredientMap.set(key, { ItemType: key, name: ingName, image: resolveImage(key, EW, ER, ERel), need: ing.ItemCount ?? 1 });
      }
    }
    for (const [, data] of ingredientMap) {
      let craftedQty = 0, bpQty = 0;
      if (data.ItemType.includes('Component')) {
        const bpKey = data.ItemType.replace('Component', 'Blueprint');
        craftedQty = primeItemCounts.get(data.ItemType) ?? 0;
        bpQty = primeItemCounts.get(bpKey) ?? 0;
        if (bpQty === 0) {
          const leaf = bpKey.split('/').pop();
          for (const [key, count] of primeItemCounts) {
            if (key.endsWith('/' + leaf)) { bpQty = count; break; }
          }
        }
        setParts.push({ unique_name: data.ItemType, name: data.name, image: data.image, quantity: bpQty, crafted: craftedQty, owned: bpQty > 0 || craftedQty > 0, need: data.need });
        if (bpQty > 0 || craftedQty > 0) ownedCount += 1;
      } else {
        bpQty = primeItemCounts.get(data.ItemType) ?? 0;
        setParts.push({ unique_name: data.ItemType, name: data.name, image: data.image, quantity: bpQty, owned: bpQty > 0, need: data.need });
        if (bpQty > 0) ownedCount += 1;
      }
      totalCount += 1;
    }

    if (setParts.length > 0) {
      primeSets[baseName] = { name: baseName, parts: setParts, ownedCount, totalCount, image: parentImage, setPath: recipe.resultType };
      // Also add individual parts to prime_parts array for backwards compatibility
      setParts.forEach(p => {
        if (p.owned) prime_parts.push({ ...p, setName: baseName, category: 'prime_parts' });
      });
    }
  }

  // Add non-prime resources
  for (const item of (raw.MiscItems ?? [])) {
    const un = item.ItemType ?? '';
    if (un.includes('/Projections/') || un.includes('/Upgrades/Relic/') || un.includes('OroFusexOrnament')) continue;
    // Hidden resource — user requested it be excluded (Tethra Data Fragments)
    if (un === '/Lotus/Types/Items/SyndicateDogTags/MuseumDogTag') continue;
    const name = resolveName(un, dict, locale, ER, ERel, EW, ES);
    // Prime parts are shown in the prime-sets tab, not as resources. Match the
    // ItemType path (always English) — localized names like "Afuris Prime: Lauf"
    // don't contain the English component words.
    const isPrimePart = PRIME_PART_PATH_RE.test(un.split('/').pop());
    if (!isPrimePart) {
      const entry = ER[un];
      const resDescLoctag = entry?.description ?? '';
      const resRawDesc = resDescLoctag ? (dict[resDescLoctag] || dict['/' + resDescLoctag] || '') : '';
      const resDescription = resRawDesc ? resRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
      const obj = { unique_name: un, name, description: resDescription, image: resolveImage(un, ER, ERel, EW, ES), category: 'resources', quantity: item.ItemCount ?? 1, owned: true };
      resources.push(obj);
    }
  }

  const resolveRelicRewards = (entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew) => {
    if (!entry) return [];
    const mapReward = (r) => {
      const un = r.type || r.rewardItem;
      const norm = un ? un.replace('/StoreItems/', '/') : un;
      const recipe = ERecipe[norm] || ERecipe[un];
      const itemData = ER[norm] || ER[un] || EW[norm] || EW[un] || EWf[norm] || EWf[un];

      return {
        uniqueName: un,
        name: resolveName(un, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
        rarity: r.rarity,
        tier: r.rarity === 'COMMON' ? 0 : (r.rarity === 'UNCOMMON' ? 1 : 2),
        ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0
      };
    };

    if (entry.rewardManifest && ERew[entry.rewardManifest]) {
      const manifest = ERew[entry.rewardManifest];
      const rewardList = Array.isArray(manifest[0]) ? manifest[0] : (Array.isArray(manifest) ? manifest : []);
      return rewardList.map(mapReward);
    } else if (Array.isArray(entry.relicRewards)) {
      return entry.relicRewards.map(mapReward);
    }
    return [];
  };

  // ── Relics ──────────────────────────────────────────────────────────────────
  const relicGroups = {};
  (raw.MiscItems ?? []).filter(i => i.ItemType?.includes('/Projections/') || i.ItemType?.includes('/Upgrades/Relic/')).forEach(item => {
    const un = item.ItemType;
    if (!un) return;
    const entry = ERel[un];

    // Determine refinement level
    const qualityMap = { 'VPQ_BRONZE': 'Intact', 'VPQ_SILVER': 'Exceptional', 'VPQ_GOLD': 'Flawless', 'VPQ_PLATINUM': 'Radiant' };
    const leafQualityMap = { 'Silver': 'Exceptional', 'Gold': 'Flawless', 'Platinum': 'Radiant' };
    let refinement = 'Intact';
    if (entry?.quality && qualityMap[entry.quality]) refinement = qualityMap[entry.quality];
    else {
      const leaf = un.split('/').at(-1) ?? un;
      for (const [rawQ, cleanQ] of Object.entries(leafQualityMap)) {
        if (leaf.endsWith(rawQ)) { refinement = cleanQ; break; }
      }
    }

    // Get base name (stripping quality suffix)
    const fullName = relicNameFromPath(un, ERel);
    const era = fullName.split(' ')[0] ?? 'Other';
    const baseName = (fullName || 'Unknown Relic').replace(/\s\((Intact|Exceptional|Flawless|Radiant)\)$/, '').trim();
    const relicId = baseName;

    if (!relicGroups[relicId]) {
      const relDescLoctag = entry?.description ?? '';
      const relRawDesc = relDescLoctag ? (dict[relDescLoctag] || dict['/' + relDescLoctag] || '') : '';
      const relDescription = relRawDesc ? relRawDesc.replace(/\|[^|]+\|/g, '').replace(/<[^>]*>/g, '').trim() : '';
      relicGroups[relicId] = {
        unique_name: relicId,
        name: baseName,
        era,
        description: relDescription,
        image: resolveImage(un, ERel),
        category: 'relics',
        refinements: { Intact: 0, Exceptional: 0, Flawless: 0, Radiant: 0 },
        rewards: resolveRelicRewards(entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew),
        owned: true
      };
    } else if (relicGroups[relicId].rewards.length === 0) {
      // A previous refinement variant already created the group but had no entry;
      // try to fill in the rewards now that we have one.
      const rewards = resolveRelicRewards(entry, dict, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe, ERew);
      if (rewards.length > 0) relicGroups[relicId].rewards = rewards;
    }

    if (relicGroups[relicId].refinements[refinement] !== undefined) {
      relicGroups[relicId].refinements[refinement] += (item.ItemCount ?? 1);
    }
  });
  const relics = Object.values(relicGroups);

  const rivens = [
    ...(raw.RawUpgrades ?? []).filter(u => u.ItemType?.includes('Randomized') || u.ItemType?.includes('RandomMod')).map(u => ({
      unique_name: u.ItemType, image: null, category: 'rivens', weapon_type: rivenWeaponType(u.ItemType),
      name: composeVeiledRivenName(rivenWeaponType(u.ItemType), i18nData), veiled: true, owned: true, quantity: u.ItemCount ?? 1
    })),
    ...(raw.Upgrades ?? []).filter(u => u.ItemType?.includes('Randomized')).map(u => {
      const fp = parseFP(u.UpgradeFingerprint);
      const weaponUn = fp.compat ?? fp.challenge?.compat ?? '';
      const weaponName = weaponUn ? resolveName(weaponUn, dict, locale, EW) : 'Unknown';
      const isChallenge = !!fp.challenge;

      let challengeText = '';
      if (isChallenge) {
        const type = fp.challenge.Type || '';
        const baseKey = type.split('/').pop();
        const locKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Description`;
        const singleLocKey = `/Lotus/Language/Challenges/Challenge_${baseKey}_Single_Description`;

        let rawText = dict[locKey] || dict[singleLocKey] || baseKey;
        challengeText = rawText.replace(/\|COUNT\|/g, fp.challenge.Required || '1');

        if (fp.challenge.Complication) {
          const compBase = fp.challenge.Complication.split('/').pop();
          const compLocKey = `/Lotus/Language/Challenges/Challenge_Complication_${compBase}`;
          const compText = dict[compLocKey] || compBase;
          challengeText += ` ${compText}`;
        }

        challengeText = challengeText.replace(/<[^>]*>/g, '').trim();
      }


      // ── Riven stat formula ── (ported from calamity-inc/warframe-riven-info/RivenParser.js)
      //
      // rivenIntToFloat: maps Value ∈ [0, 0x3FFFFFFF] → [0, 1]
      // roll: lerp(0.9, 1.1, rivenIntToFloat(Value))  ← random multiplier per stat
      //
      // Buff:
      //   base * (1.5 * dispo * 10) * pow(1.25, nCurses) * roll * numBuffsAtten[nBuffs] * (lvl+1)
      //
      // Curse:
      //   base * -1 * (1.5 * dispo * 10) * roll * numBuffsCurseAtten[nBuffs] * numBuffsAtten[nCurses] * (lvl+1)
      //
      // numBuffsAtten      = [0, 1, 0.66, 0.5, 0.4, 0.35]
      // numBuffsCurseAtten = [0, 1, 0.33, 0.5, 1.25, 1.5]

      const RIVEN_INT_MAX = 0x3FFFFFFF; // 1073741823
      const numBuffsAtten = [0, 1, 0.66000003, 0.5, 0.40000001, 0.34999999];
      const numBuffsCurseAtten = [0, 1, 0.33000001, 0.5, 1.25, 1.5];

      const rivenIntToFloat = (v) => { const f = v / RIVEN_INT_MAX; return (f >= 0 && f <= 1) ? f : 0; };
      const rivenLerp = (a, b, t) => a + (b - a) * t;

      const dispo = EW[weaponUn]?.omegaAttenuation ?? 1.0;
      const lvl = parseInt(fp.lvl ?? u.UpgradeLevel ?? 0, 10);
      const nBuffs = (fp.buffs ?? []).length;
      const nCurses = (fp.curses ?? []).length;
      const attenuation = 1.5 * dispo * 10;
      const curseAtten = Math.pow(1.25, nCurses);

      // Per-type stat data from ExportUpgrades (see rivenTagInfo above),
      // keyed by riven type (last path segment).
      const rivenTypeName = u.ItemType.split('/').pop(); // e.g. LotusRifleRandomModRare
      const rivenTagList = rivenTagInfo[rivenTypeName] ?? {};
      const getBase = (tag) => rivenTagList[tag]?.value ?? 0.01;

      const formatStat = (s, pos) => {
        const tag = s.Tag.split('/').pop();
        const roll = rivenLerp(0.9, 1.1, rivenIntToFloat(s.Value));
        const base = Math.abs(getBase(tag));

        let val;
        if (pos) {
          val = base * attenuation * curseAtten * roll
            * numBuffsAtten[Math.min(nBuffs, numBuffsAtten.length - 1)]
            * (lvl + 1);
        } else {
          val = base * attenuation * roll
            * numBuffsCurseAtten[Math.min(nBuffs, numBuffsCurseAtten.length - 1)]
            * numBuffsAtten[Math.min(nCurses, numBuffsAtten.length - 1)]
            * (lvl + 1);
        }

        // Faction damage and other special stats often have different base scales or display formats.
        // User reports Aksomati curse is -0.95 (likely a multiplier display for the curse).
        const SPECIAL_FACTOR = new Set(['WeaponFactionDamageGrineer', 'WeaponFactionDamageCorpus', 'WeaponFactionDamageInfested', 'WeaponMeleeFactionDamageGrineer', 'WeaponMeleeFactionDamageCorpus', 'WeaponMeleeFactionDamageInfested']);
        const SPECIAL_ONE_DP = new Set(['WeaponMeleeComboInitialBonusMod', 'ComboDurationMod', 'WeaponMeleeRangeIncMod']);

        let displayVal;
        let finalSign = pos ? 1 : -1;

        if (SPECIAL_FACTOR.has(tag)) {
          if (!pos) {
            // Curse format: 1.0 - penalty (e.g. 1.0 - 0.05 = 0.95 multiplier)
            displayVal = 1 - (val * 1); // val is usually 0.04-0.05
            finalSign = 1; // It's shown as a positive multiplier 0.95
          } else {
            displayVal = val * 100; // Positive faction damage is usually shown as a percentage +30%
          }
        } else if (SPECIAL_ONE_DP.has(tag)) {
          displayVal = val * 10;
        } else {
          displayVal = val * 100; // standard percentage
        }
        // English statKey first — the price model matches on English keys only.
        // Display label resolves from the game dict (DE's own strings) via the
        // export's stat locTag; falls back to the per-locale i18n rivenStats
        // table, then the English key.
        const statKey = RIVEN_STAT_MAP[s.Tag] || RIVEN_STAT_MAP[tag]
          || splitPascal(tag.replace(/^(Weapon|Avatar|Innate|Player|Mod)/g, '').replace(/Mod$/g, '').replace(/Damage$/, ' Damage').replace(/Faction/, 'Faction ').replace(/Melee/, '').trim()) || tag;
        let tagName = '';
        const statLoc = rivenTagList[tag]?.locTag;
        if (statLoc) {
          tagName = cleanStatLabel(dict[statLoc] || dict[statLoc.replace(/^\//, '')]);
        }
        if (!tagName) tagName = i18nData?.rivenStats?.[statKey] ?? null;

        const isMultiplier = SPECIAL_FACTOR.has(tag) && !pos;
        let valueStr = (displayVal * finalSign).toFixed(isMultiplier ? 2 : 1);
        if (isMultiplier) valueStr = `x ${valueStr}`;

        return {
          tag: tagName,
          value: valueStr,
          positive: pos,
          rawTag: s.Tag,
          statKey,
          isPercent: !isMultiplier && !SPECIAL_ONE_DP.has(tag)
        };
      };

      const stats = [...(fp.buffs ?? []).map(b => formatStat(b, true)), ...(fp.curses ?? []).map(b => formatStat(b, false))];

      let rivenFullName = `${weaponName} Riven`;
      if (!isChallenge && (fp.buffs ?? []).length > 0) {
        const getTagEntry = (tag) => rivenTagList[tag];
        const sortedBuffs = [...(fp.buffs ?? [])].sort((a, b) => {
          if (a.Value === b.Value) {
            return (getTagEntry(a.Tag)?.value ?? 0) - (getTagEntry(b.Tag)?.value ?? 0);
          }
          return b.Value - a.Value;
        });
        let name = '';
        for (const buff of sortedBuffs) {
          const entry = getTagEntry(buff.Tag);
          if (!entry) continue;
          if (buff.Tag === sortedBuffs[sortedBuffs.length - 1].Tag) {
            name += entry.suffix ?? '';
          } else if (buff.Tag === sortedBuffs[0].Tag) {
            name += (entry.prefix ?? '').charAt(0).toUpperCase() + (entry.prefix ?? '').slice(1);
          } else {
            name += '-' + (entry.prefix ?? '');
          }
        }
        if (name) rivenFullName = `${weaponName} ${name}`;
      } else if (isChallenge) {
        rivenFullName = `${weaponName} Riven (Challenge)`;
      }

      const rivenEntry = EM[u.ItemType];

      return {
        unique_name: u.ItemType,
        image: resolveImage(weaponUn, EW),
        category: 'rivens',
        weapon_type: rivenWeaponType(weaponUn || u.ItemType),
        weapon_name: weaponName,
        // English weapon name for the price model (localized names like
        // "Скиайати" never match the model's English keys).
        weapon_name_en: exports.WI_Weapons?.[weaponUn]?.name || nameFromPath(weaponUn) || weaponName,
        name: rivenFullName,
        veiled: false,
        rank: parseInt(fp.lvl || u.UpgradeLevel || 0, 10),
        rerolls: fp.rerolls ?? u.RerollCount ?? 0,
        polarity: fp.pol ?? rivenEntry?.polarity ?? null,
        stats,
        challenge: challengeText,
        owned: true,
        mr: fp.lvlReq ?? EW[weaponUn]?.masteryReq ?? 0
      };
    })
  ];

  // ── Modular mastery components ──────────────────────────────────────────────
  // ── Owned-item lookup maps for modular components ────────────────────────────
  // Kitgun: barrel path → highest-XP build's custom name
  const kitgunBarrelToCustomName = {};
  [...(raw.Pistols ?? []), ...(raw.LongGuns ?? [])].forEach(item => {
    const barrel = item.ModularParts?.[0];
    if (!barrel || (!barrel.toLowerCase().includes('barrel'))) return;
    const existing = kitgunBarrelToCustomName[barrel];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      kitgunBarrelToCustomName[barrel] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // Zaw: tip path → highest-XP build's custom name
  const zawTipToCustomName = {};
  (raw.Melee ?? []).forEach(item => {
    const parts = item.ModularParts ?? [];
    const tip = parts.find(p => p.includes('/Tip') || p.includes('/Tips'));
    if (!tip) return;
    const existing = zawTipToCustomName[tip];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      zawTipToCustomName[tip] = { xp, name: item.ItemName || item.CustomName || '' };
    }
  });

  // MOA: head path → highest-XP pet's custom name
  const moaHeadToCustomName = {};
  (raw.MoaPets ?? []).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('MoaPetHead'));
    if (!head) return;
    const existing = moaHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      moaHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Hound: head path → highest-XP pet's custom name (pets in KubrowPets with Zanuka type)
  const houndHeadToCustomName = {};
  (raw.KubrowPets ?? []).filter(p => p.ItemType?.includes('Zanuka')).forEach(item => {
    const head = (item.ModularParts ?? []).find(p => p.includes('ZanukaPetPartHead'));
    if (!head) return;
    const existing = houndHeadToCustomName[head];
    const xp = item.XP ?? 0;
    if (!existing || xp > existing.xp) {
      houndHeadToCustomName[head] = { xp, name: item.ItemName || item.CustomName || item.Details?.Name || '' };
    }
  });

  // Kitgun: mastery is per chamber (barrel part), not per full build
  const KITGUN_BARREL_PREFIXES = [
    '/Lotus/Weapons/SolarisUnited/Secondary/SUModularSecondarySet1/Barrel/',
    '/Lotus/Weapons/Infested/Pistols/InfKitGun/Barrels/',
  ];
  const kitgunChambers = Object.entries(EW)
    .filter(([un]) => KITGUN_BARREL_PREFIXES.some(p => un.startsWith(p)) && un.endsWith('Part'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Kitguns are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = kitgunBarrelToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, locale, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'kitguns',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    });

  // Zaw: mastery is per strike (Tip part)
  const seenZawNames = new Set();
  const zawStrikes = Object.entries(EW)
    .filter(([un]) => un.includes('/Ostron/Melee/') && un.includes('/Tip') && !un.includes('PvP'))
    .map(([un]) => {
      const baseName = resolveName(un, dict, locale, EW);
      if (seenZawNames.has(baseName)) return null;
      seenZawNames.add(baseName);
      const xp = xpMap[un] ?? 0;
      // Zaws are weapons (100 mastery per rank)
      const rank = calculateRank(xp, 'weapons', un);
      const mastery_xp = rank * 100;
      const ownedCustomName = zawTipToCustomName[un]?.name || '';
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'zaws',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 3000,
        ownedCustomName,
      };
    })
    .filter(Boolean);

  // MOA: mastery is per head model
  const moaHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/MoaPetParts/MoaPetHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // MOAs are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'moas', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = moaHeadToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, locale, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'moas',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  // Hound: mastery is per head model
  const houndHeads = Object.entries(EW)
    .filter(([un]) => un.includes('/ZanukaPetParts/ZanukaPetPartHead'))
    .map(([un]) => {
      const xp = xpMap[un] ?? 0;
      // Hounds are heavy (200 mastery per rank)
      const rank = calculateRank(xp, 'hounds', un);
      const mastery_xp = rank * 200;
      const ownedCustomName = houndHeadToCustomName[un]?.name || '';
      const baseName = resolveName(un, dict, locale, EW);
      return {
        unique_name: un,
        name: ownedCustomName ? `${baseName} (${ownedCustomName})` : baseName,
        image: resolveImage(un, EW), category: 'hounds',
        xp, rank, mastery_xp, owned: xp > 0, mastered: mastery_xp >= 6000,
        ownedCustomName,
      };
    });

  const all = [...warframes, ...primary, ...secondary, ...melee, ...kitguns, ...zaws, ...sentinels, ...moas, ...hounds, ...beasts, ...archwings, ...kdrives, ...archweapons, ...necramechs, ...amps, ...arcanes, ...consumables, ...resources, ...rivens, ...prime_parts];

  const playerLevel = raw.PlayerLevel ?? 0;
  const rivenBin = raw.RandomModBin ?? { Slots: 0, Extra: 0 };

  const miscItems = raw.MiscItems ?? [];
  const voidTraces = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/VoidTearDrop')?.ItemCount ?? 0;
  const voidTracesMax = (playerLevel * 50) + 100;

  const formaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/Forma')?.ItemCount ?? 0;
  const auraFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaAura')?.ItemCount ?? 0;
  const stanceFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaStance')?.ItemCount ?? 0;
  const umbraFormaCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/FormaUmbra')?.ItemCount ?? 0;
  const reactorCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/OrokinReactor')?.ItemCount ?? 0;
  const catalystCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/MiscItems/OrokinCatalyst')?.ItemCount ?? 0;

  const cyanStarCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/FusionTreasures/OroFusexOrnamentA')?.ItemCount ?? 0;
  const amberStarCount = miscItems.find(i => i.ItemType === '/Lotus/Types/Items/FusionTreasures/OroFusexOrnamentB')?.ItemCount ?? 0;

  // Nightwave standing - find the current season affiliation
  let nightwaveStanding = 0
  let nightwaveTitle = 0
  const affiliations = raw.Affiliations ?? []
  for (const aff of affiliations) {
    if (aff.Tag && aff.Tag.includes('Intermission')) {
      nightwaveStanding = aff.Standing ?? 0
      nightwaveTitle = aff.Title ?? 0
      // Standing over 10000 should flip the level
      while (nightwaveStanding >= 10000) {
        nightwaveStanding -= 10000;
        nightwaveTitle += 1;
      }
      break
    }
  }

  // ── Reverse ingredient index ──
  // Maps each item's unique_name to the list of recipes that consume it as an
  // ingredient.  Used to surface a "Crafting Ingredient" badge in Inventory.jsx.
  // Shares the same filter logic as the craftable computation above.
  const neededForCrafting = {};
  Object.entries(ERecipe ?? {}).forEach(([bpKey, recipe]) => {
    if (!recipe || !recipe.resultType) return;
    // Skip Helminth abilities, quest items, and component BPs (same as craftable)
    if (bpKey.includes('AbilityOverride')) return;
    if (recipe.resultType?.includes('/Abilities/')) return;
    if (bpKey.includes('Quest')) return;
    if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') || bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') || bpKey.includes('WingsBlueprint')) return;
    const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
    (recipe.ingredients ?? []).forEach(ing => {
      if (!ing.ItemType) return;
      if (!neededForCrafting[ing.ItemType]) neededForCrafting[ing.ItemType] = [];
      neededForCrafting[ing.ItemType].push({
        name: resultName,
        count: ing.ItemCount ?? 1,
      });
    });
  });
  // Annotate items in the `all` array that are needed as ingredients
  all.forEach(item => {
    const details = neededForCrafting[item.unique_name];
    if (details) {
      item.needed_for_crafting = true;
      item.crafting_details = details;
    }
  });

  const wishlist = (raw.Wishlist ?? []).map(w => {
    if (typeof w === 'string') {
      const name = resolveName(w, dict, locale, EW, EWf, ES, ER, ECust, EGear, EM, EA, EB) || nameFromPath(w);
      return { unique_name: w, name };
    }
    return null;
  }).filter(Boolean);

  return {
    account: {
      mastery_rank: playerLevel,
      credits: raw.RegularCredits ?? 0,
      platinum: raw.PremiumCredits ?? 0,
      riven_capacity: 15 + playerLevel + (rivenBin.Extra ?? 0),
      void_traces: voidTraces,
      void_traces_max: voidTracesMax,
      forma: formaCount,
      aura_forma: auraFormaCount,
      stance_forma: stanceFormaCount,
      umbra_forma: umbraFormaCount,
      orokin_reactor: reactorCount,
      orokin_catalyst: catalystCount,
      nightwave_standing: nightwaveStanding,
      nightwave_title: nightwaveTitle,
      endo: raw.FusionPoints ?? 0,
    },
    wishlist,
    Affiliations: raw.Affiliations ?? [],
    SupportedSyndicate: raw.SupportedSyndicate ?? null,
    DailyFocus: raw.DailyFocus ?? 0,
    FocusXP: raw.FocusXP ?? {},
    warframes,
    weapons: weaponsRaw, // Compatibility
    primary, secondary, melee, kitguns, zaws,
    companions: companionsRaw, // Compatibility
    sentinels, moas, hounds, beasts, robotics,
    companion_weapons,
    vehicles: [...archwings, ...kdrives], // Compatibility
    archwings, kdrives,
    archweapons, necramechs, amps, mods, arcanes, relics, resources, rivens, prime_parts, primeSets, intrinsics, starchart, plexus, all,
    kitgunChambers, zawStrikes, moaHeads, houndHeads,

    // ── Ayatan / Endo ──
    fusionTreasures: raw.FusionTreasures ?? [],
    amberStarCount,
    cyanStarCount,

    // ── Collectibles ──
    collectibleSeries: raw.CollectibleSeries ?? [],
    loreFragmentScans: raw.LoreFragmentScans ?? [],
    discoveredMarkers: raw.DiscoveredMarkers ?? [],
    customMarkers: raw.CustomMarkers ?? [],
    NemesisHistory: raw.NemesisHistory ?? [],
    periodicMissionCompletions: raw.PeriodicMissionCompletions ?? [],
    // ── Craftable Items (all recipes with ingredient checks) ──
    craftable: (() => {
      const craftableItems = [];

      // Build ingredient inventory map for quick lookup
      const resourceCounts = {};

      // Count resources from raw
      (raw.Resources ?? []).forEach(r => {
        resourceCounts[r.ItemType] = (resourceCounts[r.ItemType] ?? 0) + (r.ItemCount ?? 1);
      });

      // Get player's owned blueprints from inventory (with counts)
      // Note: raw.Recipes is included in inventoryArrays below, so we use ownedItemCounts

      // Build map of all owned items (for checking components, etc.)
      const ownedItemCounts = {};
      const inventoryArrays = [
        raw.Suits, raw.LongGuns, raw.Pistols, raw.Melee,
        raw.Sentinels, raw.KubrowPets, raw.MoaPets, raw.SentinelWeapons,
        raw.SpaceMelee, raw.SpaceGuns, raw.MechSuits, raw.OperatorAmps,
        raw.SpaceSuits, raw.Hoverboards, raw.MiscItems, raw.Recipes, raw.Consumables
      ];

      for (const arr of inventoryArrays) {
        if (arr) {
          for (const item of arr) {
            const un = item.ItemType;
            if (un) {
              ownedItemCounts[un] = (ownedItemCounts[un] ?? 0) + (item.ItemCount ?? 1);
            }
          }
        }
      }

      // Also check the processed all array
      all.forEach(item => {
        if (item.owned && item.unique_name) {
          ownedItemCounts[item.unique_name] = (ownedItemCounts[item.unique_name] ?? 0) + 1;
        }
      });

      // Mastered items set
      const masteredSet = new Set(
        all.filter(i => i.mastered).map(i => i.name)
      );

      // name → item index for O(1) lookups inside the recipe loop
      const nameToItem = new Map(all.map(i => [i.name, i]));

      // Process each recipe
      Object.entries(ERecipe ?? {}).forEach(([bpKey, recipe]) => {
        if (!recipe || !recipe.resultType) return;

        const resultName = resolveName(recipe.resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

        // Skip Helminth abilities and quest items
        if (bpKey.includes('AbilityOverride')) return;
        if (recipe.resultType?.includes('/Abilities/')) return;
        if (bpKey.includes('Quest')) return;

        // Skip component blueprints (Helmet/Chassis/Systems/Wings Blueprint) - they're shown as components in main BP
        if (bpKey.includes('HelmetBlueprint') || bpKey.includes('ChassisBlueprint') || bpKey.includes('SystemsBlueprint') || bpKey.includes('HarnessBlueprint') || bpKey.includes('WingsBlueprint')) return;

        // Check if this is a main BP that could have components (warframes, archwings, etc)
        const isMainItemBP = (bpKey.includes('/Recipes/WarframeRecipes/') || bpKey.includes('/Recipes/ArchwingRecipes/')) && !bpKey.includes('Component');
        const isOwned = bpKey in ownedItemCounts;

        // Show if owned, OR if it's a main item BP with owned components
        let showBP = isOwned;

        // If it's a main BP and player doesn't own it, check if they own any component BPs for it
        if (isMainItemBP && !isOwned) {
          const base = bpKey.replace('/Lotus/Types/Recipes/WarframeRecipes/', '').replace('/Lotus/Types/Recipes/ArchwingRecipes/', '').replace('Blueprint', '');
          const prefix = bpKey.includes('ArchwingRecipes') ? '/Lotus/Types/Recipes/ArchwingRecipes/' : '/Lotus/Types/Recipes/WarframeRecipes/';
          const componentBPs = [
            `${prefix}${base}HelmetBlueprint`,
            `${prefix}${base}ChassisBlueprint`,
            `${prefix}${base}SystemsBlueprint`,
            `${prefix}${base}HarnessBlueprint`,
            `${prefix}${base}WingsBlueprint`
          ];
          showBP = componentBPs.some(cb => cb in ownedItemCounts);
        }

        if (!showBP) return;

        // Get count of this BP owned
        const bpCount = primeItemCounts.get(bpKey) ?? 0;

        const baseName = resultName.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', '').replace(' Prime', ' Prime');

        // Check if player has the full item (owned)
        const ownedItem = nameToItem.get(baseName) ?? nameToItem.get(baseName + ' Prime');
        const ownedCount = ownedItem ? (ownedItem.quantity ?? 1) : 0;
        const fullItemOwned = ownedCount > 0;

        // Check if mastered - O(1) from the name index
        const masteredEntry = (nameToItem.get(baseName) ?? nameToItem.get(baseName + ' Prime'))
          || sentinels?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || moas?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || hounds?.find(i => i.name === baseName || i.name === baseName + ' Prime')
          || beasts?.find(i => i.name === baseName || i.name === baseName + ' Prime');

        // XP is keyed by resultType (item path), not blueprint path (bpKey)
        const xp = xpMap[recipe.resultType] ?? 0;
        const isMastered = (masteredEntry?.mastered ?? false) || (xp > 0);
// Skip items that don't grant mastery — gear, resources, mods, arcanes, prime parts, etc.
        const NO_MASTERY_CATEGORIES = new Set(['resources', 'mods', 'arcanes', 'prime_parts', 'gear', 'consumables', 'keys', 'misc', 'resources_enemy']);
        let hasMastery = masteredEntry ? !NO_MASTERY_CATEGORIES.has(masteredEntry.category) : (xp > 0);

        // Modular parts mastery fix: only Strikes, Chambers, and Heads provide mastery
        if (hasMastery && (bpKey.includes('Modular') || bpKey.includes('/Ostron/Melee/') || bpKey.includes('/SolarisUnited/') || bpKey.includes('/InfKitGun/'))) {
          const isMasteryPart = bpKey.includes('/Barrel/') || bpKey.includes('/Barrels/') || bpKey.includes('/Tip/') || bpKey.includes('/Tips/') || bpKey.includes('MoaPetHead') || bpKey.includes('ZanukaPetPartHead');
          if (!isMasteryPart) hasMastery = false;
        }

        // Check all ingredients - separate crafted vs blueprints
        const ingredients = (recipe.ingredients ?? []).map(ing => {
          const ingName = resolveName(ing.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

          let have = 0;
          let bpOwned = 0;
          let bpReady = false;
          let subIngredients = null;

          // For component blueprints (Helmet/Chassis/Systems/etc), separate crafted from BPs
          const isComponent = ing.ItemType.includes('Component');
          if (isComponent) {
            // Crafted component count
            have = primeItemCounts.get(ing.ItemType) ?? 0;
            // Blueprint count (separate)
            const bpKey = ing.ItemType.replace('Component', 'Blueprint');
            bpOwned = primeItemCounts.get(bpKey) ?? 0;

            // Check if component blueprint is ready to craft
            const bpRecipe = ERecipe?.[bpKey];
            if (bpRecipe?.ingredients) {
              bpReady = bpRecipe.ingredients.every(subIng => {
                const subHave = (resourceCounts[subIng.ItemType] ?? 0) + (ownedItemCounts[subIng.ItemType] ?? 0);
                return subHave >= (subIng.ItemCount ?? 1);
              });

              // Get sub-ingredients for tooltip
              subIngredients = bpRecipe.ingredients.map(subIng => ({
                name: resolveName(subIng.ItemType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
                have: (resourceCounts[subIng.ItemType] ?? 0) + (ownedItemCounts[subIng.ItemType] ?? 0),
                need: subIng.ItemCount ?? 1,
                image: resolveImage(subIng.ItemType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe)
              }));
            }
          } else {
            // For regular resources/items - count both resources and owned items
            have = (resourceCounts[ing.ItemType] ?? 0) + (ownedItemCounts[ing.ItemType] ?? 0);
          }

          const need = ing.ItemCount ?? 1;
          const image = resolveImage(ing.ItemType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);
          return { name: ingName, have, need, itemType: ing.ItemType, image, bpOwned, isComponent, bpReady, subIngredients };
        });

        const allIngredientsMet = ingredients.every(ing => ing.have >= ing.need);

        // No separate "parts" section needed - ingredients already has everything

        craftableItems.push({
          bpName: resultName,
          baseName,
          componentBased: isMainItemBP && !isOwned,
          image: resolveImage(recipe.resultType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
          buildTime: recipe.buildTime ?? (12 * 3600),
          buildPrice: recipe.buildPrice ?? 0,
          ingredients,
          allIngredientsMet,
          bpCount,
          ownedCount,
          fullItemOwned,
          isMastered,
          hasMastery,
          uniqueName: bpKey,
          resultType: recipe.resultType
        });
      });

      return craftableItems;
    })(),

    foundry: (raw.PendingRecipes ?? []).map(p => {
      const recipe = ERecipe[p.ItemType];
      const resultType = recipe?.resultType ?? p.ItemType;
      const completionDate = p.CompletionDate?.$date?.$numberLong;
      const finishTime = completionDate ? parseInt(completionDate, 10) / 1000 : 0;

      const name = resolveName(resultType, dict, locale, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe);

      // Try to find if this is a subcomponent (Systems, Neuroptics, Chassis, Barrel, etc)
      // and find its "Parent" item.
      let parentName = name;
      if (name.includes(' Systems')) parentName = name.replace(' Systems', '');
      else if (name.includes(' Neuroptics')) parentName = name.replace(' Neuroptics', '');
      else if (name.includes(' Chassis')) parentName = name.replace(' Chassis', '');
      else if (name.includes(' Harness')) parentName = name.replace(' Harness', '');
      else if (name.includes(' Barrel')) parentName = name.replace(' Barrel', '');
      else if (name.includes(' Receiver')) parentName = name.replace(' Receiver', '');
      else if (name.includes(' Stock')) parentName = name.replace(' Stock', '');
      else if (name.includes(' Grip')) parentName = name.replace(' Grip', '');
      else if (name.includes(' String')) parentName = name.replace(' String', '');
      else if (name.includes(' Limb')) parentName = name.replace(' Limb', '');
      else if (name.includes(' Blade')) parentName = name.replace(' Blade', '');
      else if (name.includes(' Hilt')) parentName = name.replace(' Hilt', '');
      else if (name.includes(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint')) parentName = name.replace(BLUEPRINT_SUFFIX[locale] ?? ' Blueprint', '');

      // Find the parent item in 'all' items to check ownership/mastery
      const parentItem = all.find(i => i.name === parentName || i.name === (parentName + (BLUEPRINT_SUFFIX[locale] ?? ' Blueprint')));

      return {
        unique_name: p.ItemType,
        result_type: resultType,
        name,
        parentName,
        parentOwned: parentItem?.owned ?? false,
        parentMastered: parentItem?.mastered ?? false,
        image: resolveImage(resultType, EW, ES, ER, EWf, EA, EM, ECust, EGear, ERecipe),
        finishTime,
        buildTime: recipe?.buildTime ?? (12 * 3600),
        ready: finishTime > 0 && (Date.now() / 1000) > finishTime,
        ...p
      }
    }),
    globalBoosters: (raw.GlobalUpgrades || []).map(u => {
      const typeMap = {
        'GAMEPLAY_KILL_XP_AMOUNT': 'Affinity Booster',
        'GAMEPLAY_MONEY_PICKUP_AMOUNT': 'Credit Booster',
        'GAMEPLAY_PICKUP_AMOUNT': 'Resource Booster'
      }
      return {
        name: typeMap[u.UpgradeType] || splitPascal(u.UpgradeType.replace('GAMEPLAY_', '')),
        expiry: u.Expiry,
        activation: u.Activation
      }
    })
  };
}

// ─── Relic Name Helper ────────────────────────────────────────────────────────

/**
 * Derive a human-readable relic name from its internal path.
 * Tries the ExportRelics entry first (era + category + quality).
 * Falls back to parsing the leaf segment of the path (e.g. T4VoidProjectionGoldP
 * → "Axi P Relic (Radiant)").
 * Called before parseInventory groups relics by base name.
 */
function relicNameFromPath(path, ERel = {}) {
  const leaf = path.split('/').at(-1) ?? path;
  const entry = ERel[path];

  const qualityMap = {
    'Bronze': 'Intact',
    'Silver': 'Exceptional',
    'Gold': 'Flawless',
    'Platinum': 'Radiant'
  };

  const vpqMap = {
    'VPQ_BRONZE': 'Intact',
    'VPQ_SILVER': 'Exceptional',
    'VPQ_GOLD': 'Flawless',
    'VPQ_PLATINUM': 'Radiant'
  };

  if (entry) {
    const era = entry.era || 'Unknown';
    const cat = entry.category || 'Unknown';
    let quality = 'Intact';

    if (entry.quality && vpqMap[entry.quality]) {
      quality = vpqMap[entry.quality];
    } else {
      for (const [raw, clean] of Object.entries(qualityMap)) {
        if (leaf.endsWith(raw)) { quality = clean; break; }
      }
    }

    return `${era} ${cat} Relic (${quality})`;
  }

  // Fallback if no entry found
  const tierMatch = leaf.match(/^T(\d)VoidProjection/i);
  if (tierMatch) {
    const tiers = { '1': 'Lith', '2': 'Meso', '3': 'Neo', '4': 'Axi', '5': 'Requiem' };
    const era = tiers[tierMatch[1]] || 'Other';
    let rest = leaf.replace(/^T\dVoidProjection/i, '');
    let quality = '';
    for (const [raw, clean] of Object.entries(qualityMap)) {
      if (rest.endsWith(raw)) {
        rest = rest.replace(raw, '');
        quality = clean;
        break;
      }
    }
    const baseName = splitPascal(rest).replace(/Relic$/, '').trim();
    return `${era} ${baseName} Relic${quality ? ` (${quality})` : ''}`;
  }

  return splitPascal(leaf.replace(/Relic$/, ' Relic')).trim();
}