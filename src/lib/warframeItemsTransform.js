/**
 * Transforms warframe-items npm-package data into lookup maps
 * compatible with inventoryParser.js's export-table format.
 *
 * Each warframe-items entry has `name` and `description` already resolved
 * to human-readable strings, so _resolveNameInternal can return them
 * immediately without going through the dict fallback chain.
 *
 * EXPORTS:
 *   transformWarframeItems(rawData) → { maps, supplement }
 *     maps      – object keyed by WI_* export-table name
 *     supplement – { uniqueNameToName, nameToImage } for cache helpers
 */

const WI_FILES = [
  'Warframes', 'Primary', 'Secondary', 'Melee',
  'Arch-Gun', 'Arch-Melee', 'Archwing',
  'Railjack', 'SentinelWeapons',
  'Sentinels', 'Pets',
  'Mods', 'Arcanes', 'Resources', 'Relics', 'Gear', 'Misc',
  'Skins', 'Sigils', 'Glyphs', 'Fish',
]

/** Convert a warframe-items array to a uniqueName→entry map with pre-resolved fields. */
function itemsToMap(items) {
  const map = {}
  for (const item of items) {
    const un = item.uniqueName
    if (!un) continue

    map[un] = {
      uniqueName: un,
      name: item.name || '',
      description: item.description || '',
      icon: item.wikiaThumbnail || null,
      // Note: icon is an absolute https://wiki.warframe.com URL; resolveImage
      // and toBrowseWf now detect absolute URLs and return them as-is.
      category: item.category,
      type: item.type,
      productCategory: item.productCategory,
      rarity: item.rarity,
      fusionLimit: item.fusionLimit,
      levelStats: item.levelStats,
      polarity: item.polarity,
      baseDrain: item.baseDrain,
      compatName: item.compatName,
      omegaAttenuation: item.omegaAttenuation,
      masteryReq: item.masteryReq,
      excludeFromCodex: item.excludeFromCodex,
      variantType: item.isPrime ? 'VT_PRIME' : undefined,
      vaulted: typeof item.vaulted === 'boolean' ? item.vaulted : (Array.isArray(item.tags) && item.tags.includes('Vaulted')),
      vaultDate: item.vaultDate,
      estimatedVaultDate: item.estimatedVaultDate,
      primeSellingPrice: item.primeSellingPrice,
      quality: item.quality,
      rewards: item.rewards,
      locations: item.locations,
      components: item.components,
      drops: item.drops,
      buildPrice: item.buildPrice,
      buildTime: item.buildTime,
      skipBuildTimePrice: item.skipBuildTimePrice,
      buildQuantity: item.buildQuantity,
      consumeOnBuild: item.consumeOnBuild,
      marketCost: item.marketCost,
      bpCost: item.bpCost,
      modSet: item.modSet,
    }
  }
  return map
}

/** Merge multiple uniqueName maps, earlier maps win. */
function mergeMaps(...maps) {
  const merged = {}
  for (const map of maps) {
    if (!map) continue
    for (const [key, val] of Object.entries(map)) {
      if (!merged[key]) merged[key] = { ...val }
    }
  }
  return merged
}

export function transformWarframeItems(rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return { maps: {}, supplement: { uniqueNameToName: {}, nameToImage: {} } }
  }

  const loaded = {}
  for (const key of Object.keys(rawData)) {
    const data = rawData[key]
    if (Array.isArray(data)) {
      loaded[key] = itemsToMap(data)
    }
  }

  const weapons = mergeMaps(
    loaded.Primary, loaded.Secondary, loaded.Melee,
    loaded['Arch-Gun'], loaded['Arch-Melee'], loaded.Archwing,
    loaded.Railjack, loaded.SentinelWeapons,
  )

  const sentinels = mergeMaps(loaded.Sentinels, loaded.Pets)

  const maps = {
    WI_Warframes: loaded.Warframes || {},
    WI_Weapons: weapons,
    WI_Sentinels: sentinels,
    WI_Upgrades: loaded.Mods || {},
    WI_Arcanes: loaded.Arcanes || {},
    WI_Resources: loaded.Resources || {},
    WI_Relics: loaded.Relics || {},
    WI_Gear: loaded.Gear || {},
    WI_Customs: loaded.Misc || {},
    WI_Skins: loaded.Skins || {},
    WI_Sigils: loaded.Sigils || {},
    WI_Glyphs: loaded.Glyphs || {},
    WI_Fish: loaded.Fish || {},
  }

  // Build supplement maps for caching (used by worldstateParser UI helpers)
  const uniqueNameToName = {}
  const nameToImage = {}

  for (const [, map] of Object.entries(maps)) {
    for (const [un, entry] of Object.entries(map)) {
      const n = entry.name
      if (n && typeof n === 'string' && !n.startsWith('/Lotus/')) {
        uniqueNameToName[un] = n
      }
      // Index wikiaThumbnails into nameToImage for resolveAnyImage fallback
      if (entry.icon && n && typeof n === 'string') {
        nameToImage[n.toLowerCase()] = entry.icon
        // Also key by uniqueName (lowered) for direct path lookups
        nameToImage[un.toLowerCase()] = entry.icon
      }
    }
  }

  return { maps, supplement: { uniqueNameToName, nameToImage } }
}

export { WI_FILES, itemsToMap, mergeMaps }
