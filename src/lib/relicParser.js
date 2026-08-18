/**
 * Logic for mapping Relic unique names (from logs) to game data and inventory context.
 */
import { BLUEPRINT_SUFFIX } from './warframeUtils';

// Helper: split PascalCase to spaced words
function splitPascal(str) {
  if (!str) return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

// Clean name - strip HTML tags
function cleanName(name) {
  if (!name) return '';
  return name.replace(/<[^>]*>/g, '').trim();
}

/**
 * Resolve display name from uniqueName using exportData tables
 * Same logic as inventoryParser._resolveNameInternal
 */
function resolveDisplayName(uniqueName, exportData, locale = 'en') {
  if (!uniqueName) return '';
  // Normalize path: remove /StoreItems/ from log paths to match export data keys
  const normalizedKey = uniqueName.replace('/StoreItems/', '/');

  const dict = exportData.dict || {};
  const uniqueNameToName = exportData.uniqueNameToName || {};

  // Build lookup tables
  const tables = [
    exportData.ExportItems,
    exportData.ExportWeapons,
    exportData.ExportWarframes,
    exportData.ExportSentinels,
    exportData.ExportResources,
    exportData.ExportUpgrades,
    exportData.ExportRecipes,
  ];

  // Try uniqueNameToName first
  const nameKey = uniqueNameToName[uniqueName];
  if (nameKey) {
    const fromDict = dict[nameKey] || dict['/' + nameKey];
    if (fromDict) {
      return cleanName(fromDict);
    }
    return splitPascal(nameKey);
  }

  // Try export tables
  for (const tbl of tables) {
    if (!tbl || typeof tbl !== 'object') continue;
    const entry = tbl[normalizedKey] || tbl[uniqueName];
    if (!entry) continue;

    const locKey = entry.name ?? entry.displayName ?? '';
    if (locKey) {
      if (dict[locKey]) {
        return cleanName(dict[locKey]);
      }
      if (!locKey.startsWith('/Lotus/')) {
        return cleanName(locKey);
      }
    }

    // Try resultType
    if (entry.resultType) {
      const resultName = resolveDisplayName(entry.resultType, exportData, locale);
      const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
      if (uniqueName.toLowerCase().includes('blueprint') && !resultName.toLowerCase().includes('blueprint') && !resultName.toLowerCase().includes(bpSuffix.trim().toLowerCase())) {
        return resultName + bpSuffix;
      }
      return resultName;
    }
  }

  // Fallback to dict
  if (dict[uniqueName]) {
    return cleanName(dict[uniqueName]);
  }

  // Last resort: extract from path
  const parts = uniqueName.split('/');
  return splitPascal(parts[parts.length - 1] || uniqueName);
}

/**
 * Gets all unique items that can drop from actual RELICS.
 */
export function getAllRelicRewards(exportData, locale = 'en') {
  if (!exportData || !exportData.ExportRelics || !exportData.ExportRewards) return [];

  const relicData = Array.isArray(exportData.ExportRelics) ? exportData.ExportRelics : Object.values(exportData.ExportRelics);
  const rewardsMap = Array.isArray(exportData.ExportRewards) ? {} : exportData.ExportRewards;

  // If ExportRewards is an array, we need to convert it or use it differently. 
  // Standard Warframe data has it as a Map/Object.
  let lookupTable = rewardsMap;
  if (Array.isArray(exportData.ExportRewards)) {
    exportData.ExportRewards.forEach(r => {
      if (r.uniqueName) lookupTable[r.uniqueName] = r;
    });
  }

  const seen = new Set();
  const allItems = [];
  const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';

  for (const relic of relicData) {
    const manifestPath = relic.rewardManifest;
    if (!manifestPath) continue;

    const pool = lookupTable[manifestPath];
    if (!pool) continue;

    const poolList = Array.isArray(pool) ? (Array.isArray(pool[0]) ? pool[0] : pool) : [];
    const flatPool = poolList.flat();

    for (const drop of flatPool) {
      const un = drop.type;
      if (!un || seen.has(un)) continue;
      seen.add(un);

      const norm = un.replace('/StoreItems/', '/');
      const recipe = exportData.ExportRecipes?.[norm] || exportData.ExportRecipes?.[un];
      const itemData = exportData.ExportItems?.[norm] || exportData.ExportWeapons?.[norm] ||
        exportData.ExportWarframes?.[norm] || exportData.ExportResources?.[norm] ||
        exportData.ExportItems?.[un];

      allItems.push({
        uniqueName: un,
        name: resolveDisplayName(un, exportData, locale),
        rarity: drop.rarity || 'COMMON',
        ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0,
      });
    }
  }

  // Ensure Forma is always there
  const formaUn = '/Lotus/StoreItems/Types/Items/MiscItems/FormaBlueprint';
  if (!seen.has(formaUn)) {
    allItems.push({
      uniqueName: formaUn,
      name: 'Forma' + bpSuffix,
      rarity: 'COMMON',
      ducats: 0
    });
  }

  return allItems;
}

/**
 * Extracts the 6 possible rewards for a relic.
 */
export function getRelicRewards(relicUniqueName, exportData, locale = 'en') {
  const toMap = (data) => {
    if (!data || !Array.isArray(data)) return data || {};
    const map = {};
    for (const item of data) {
      const k = item.uniqueName || item.ItemType || item.name || item.rewardManifest;
      if (k) map[k] = item;
    }
    return map;
  };

  const relics = toMap(exportData.ExportRelics);
  const rewards = toMap(exportData.ExportRewards);

  const relicEntry = relics[relicUniqueName];
  if (!relicEntry) return [];

  const manifestPath = relicEntry.rewardManifest;
  const pool = rewards[manifestPath];
  if (!pool) return [];

  const poolList = Array.isArray(pool) ? (Array.isArray(pool[0]) ? pool[0] : pool) : [];
  const flatPool = poolList.flat();

  return flatPool.map(item => {
    const un = item.type;
    const norm = un.replace('/StoreItems/', '/');
    const recipe = exportData.ExportRecipes?.[norm] || exportData.ExportRecipes?.[un];
    const itemData = exportData.ExportItems?.[norm] || exportData.ExportWeapons?.[norm] ||
      exportData.ExportWarframes?.[norm] || exportData.ExportResources?.[norm] ||
      exportData.ExportItems?.[un];

    return {
      uniqueName: un,
      name: resolveDisplayName(un, exportData, locale),
      rarity: item.rarity || 'COMMON',
      ducats: recipe?.primeSellingPrice || itemData?.primeSellingPrice || 0,
      icon: exportData.EI?.[un] || null,
      isForma: un.toLowerCase().includes('forma'),
      isPrimePart: un.includes('Prime'),
    };
  });
}

/**
 * Gets inventory and mastery context for a specific reward item.
 */
export function getRewardInventoryContext(rewardUniqueName, inventoryData, exportData, locale = 'en') {
  // Always compute parentName from item name, even without inventory
  const itemName = resolveDisplayName(rewardUniqueName, exportData, locale);
  let parentName = itemName;
  const bpSuffix = BLUEPRINT_SUFFIX[locale] ?? ' Blueprint';
  const suffixes = [
    bpSuffix, ' Neuroptics', ' Chassis', ' Systems',
    ' Barrel', ' Receiver', ' Stock', ' Grip', ' String',
    ' Limb', ' Blade', ' Hilt', ' Harness', ' Wings',
    ' Handle', ' Head', ' Link', ' Gauntlet', ' Pouch',
    ' Stars', ' Cerebrum', ' Carapace', ' Disc', ' Motor', ' Boot'
  ];
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const suffix of suffixes) {
      if (parentName.endsWith(suffix) || parentName.endsWith(suffix.toUpperCase())) {
        parentName = parentName.slice(0, -suffix.length);
        stripped = true;
      }
    }
  }

  if (!inventoryData) return {
    stock: 0,
    subcomponents: [],
    isForma: false,
    isResource: false,
    parentName
  };

  const ER = exportData.ExportResources || {};

  const isGenericResource = (un) => {
    return !!ER[un]
      && !un.includes('/WeaponParts/')
      && !un.includes('/WarframeRecipes/')
      && !un.includes('/ArchwingRecipes/')
      && !un.includes('Prime');
  };

  const isResource = isGenericResource(rewardUniqueName);
  const isForma = rewardUniqueName?.toLowerCase().includes('forma') ?? false;

  // Forma special case
  if (isForma) {
    const formaCount = inventoryData.account?.forma || 0;
    // Use craftable array - it has bpCount from ownedItemCounts which includes raw.Recipes
    const craftable = inventoryData.craftable ?? [];
    const formaEntry = craftable.find(i => i.uniqueName?.toLowerCase().includes('forma'));
    const bpStock = formaEntry?.bpCount ?? 0;

    return {
      stock: bpStock,
      blueprintCount: bpStock,
      craftedCount: formaCount,
      isOwned: formaCount > 0,
      isMastered: true,
      isForma: true,
      isResource: false,
      parentName: 'Forma',
      subcomponents: [],
    };
  }

  // Precompute reverse lookup for recipes -> bp
  let bpLookup = {};
  if (exportData.ExportRecipes) {
    for (const [rName, rData] of Object.entries(exportData.ExportRecipes)) {
      if (rData.resultType) {
        bpLookup[rData.resultType] = rName;
      }
    }
  }

  const recipe = exportData.ExportRecipes?.[rewardUniqueName];
  let actualComponent = recipe ? recipe.resultType : rewardUniqueName;

  let parentRecipe = null;
  let parentRecipeUniqueName = null;

  // Normalize for comparison
  const clean = (s) => s ? s.replace('/StoreItems/', '/').toLowerCase() : '';
  const rClean = clean(rewardUniqueName);
  const aClean = clean(actualComponent);

  // Find if actualComponent is part of another recipe
  if (exportData.ExportRecipes) {
    for (const [bpUniqueName, bpRecipe] of Object.entries(exportData.ExportRecipes)) {
      const ingredients = bpRecipe.ingredients || [];
      // Pass 1: True reverse ingredient lookup
      if (ingredients.some(ing => {
        const iClean = clean(ing.ItemType);
        return iClean === aClean || iClean === rClean;
      })) {
        parentRecipe = bpRecipe;
        parentName = resolveDisplayName(bpRecipe.resultType, exportData, locale).replace(new RegExp(bpSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&') + '$'), '').trim();
        break;
      }
      // Pass 2: Fallback to string matching the result type
      const resName = resolveDisplayName(bpRecipe.resultType, exportData, locale).replace(new RegExp(bpSuffix.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&') + '$'), '').trim();
      if (resName === parentName) {
        parentRecipe = bpRecipe;
        parentRecipeUniqueName = bpUniqueName;
      }
    }
  }

  const subcomponents = (parentRecipe?.ingredients || []).map(ing => {
    const ingName = resolveDisplayName(ing.ItemType, exportData, locale);
    const ingBpUniqueName = bpLookup[ing.ItemType];
    const compIsResource = isGenericResource(ing.ItemType);

    const haveCrafted = inventoryData.all?.find(i => i.unique_name === ing.ItemType)?.quantity
      || inventoryData.prime_parts?.find(i => i.unique_name === ing.ItemType)?.quantity
      || inventoryData.resources?.find(i => i.unique_name === ing.ItemType)?.quantity
      || 0;

    const bpCount = ingBpUniqueName
      ? (inventoryData.prime_parts?.find(i => i.unique_name === ingBpUniqueName)?.quantity || 0)
      : 0;
    const isMatch = (ingUn) => {
      if (!ingUn || !rewardUniqueName) return false;

      // 1. Path normalization match
      const clean = (s) => s.replace('/StoreItems/', '/').replace(/Blueprint$/i, '').replace(/Recipe$/i, '').toLowerCase();
      if (clean(ingUn) === clean(rewardUniqueName)) return true;
      if (clean(ingUn) === clean(actualComponent)) return true;

      // 2. Name-based match (very robust for Warframe parts)
      const ingNameClean = ingName.toLowerCase().replace('blueprint', '').trim();
      const rewardNameClean = itemName.toLowerCase().replace('blueprint', '').trim();
      if (ingNameClean === rewardNameClean) return true;

      return false;
    };

    return {
      name: ingName,
      uniqueName: ing.ItemType,
      have: haveCrafted,
      need: ing.ItemCount ?? 1,
      bpCount: compIsResource ? 0 : bpCount,
      hasBlueprint: !compIsResource && !!ingBpUniqueName,
      isResource: compIsResource,
      isDroppedReward: isMatch(ing.ItemType)
    };
  }).filter(c => c.need > 0);

  // Now determine the item's own counts - with path normalization for /StoreItems/ prefix
  const normalizeUN = (s) => s ? s.replace('/StoreItems/', '/').toLowerCase() : '';
  const rNorm = normalizeUN(rewardUniqueName);
  const findInInventory = (arr) => arr?.find(i => normalizeUN(i.unique_name) === rNorm);
  let rewardEntry = findInInventory(inventoryData.all)
    || findInInventory(inventoryData.prime_parts)
    || findInInventory(inventoryData.mods)
    || findInInventory(inventoryData.resources);

  // Fallback: if not found by uniqueName, search by display name (handles synthetic
  // short uniqueNames from OCR, e.g. "Lohk" → /Lotus/Upgrades/Mods/Requiem/Lohk)
  if (!rewardEntry && inventoryData.mods) {
    rewardEntry = inventoryData.mods.find(m => m.name?.toLowerCase() === rewardUniqueName?.toLowerCase());
  }

  const stock = rewardEntry?.quantity ?? 0;

  const aNorm = normalizeUN(actualComponent);
  const findInInventorySimple = (arr) => arr?.find(i => normalizeUN(i.unique_name) === aNorm);
  let craftedEntry = findInInventorySimple(inventoryData.all)
    || findInInventorySimple(inventoryData.prime_parts)
    || findInInventorySimple(inventoryData.resources);

  // Fallback: search by name in mods (handles short OCR uniqueNames like "Lohk")
  if (!craftedEntry && inventoryData.mods) {
    craftedEntry = inventoryData.mods.find(m => m.name?.toLowerCase() === rewardUniqueName?.toLowerCase());
  }

  const craftedCount = craftedEntry?.quantity ?? 0;
  const isMastered = craftedEntry?.mastered ?? false;

  let parentBpCount = 0;
  let parentCraftedCount = 0;
  let parentIsMastered = false;

  if (parentRecipe && parentRecipeUniqueName) {
    const pNorm = normalizeUN(parentRecipeUniqueName);
    parentBpCount = inventoryData.prime_parts?.find(i => normalizeUN(i.unique_name) === pNorm)?.quantity ?? 0;
    const prNorm = normalizeUN(parentRecipe.resultType);
    const pCrafted = (inventoryData.all?.find(i => normalizeUN(i.unique_name) === prNorm))
      || (inventoryData.prime_parts?.find(i => normalizeUN(i.unique_name) === prNorm));
    parentCraftedCount = pCrafted?.quantity ?? 0;
    parentIsMastered = pCrafted?.mastered ?? false;
  } else {
    parentBpCount = recipe ? stock : 0;
    parentCraftedCount = craftedCount;
    parentIsMastered = isMastered;
  }

  return {
    stock,
    blueprintCount: parentBpCount,
    craftedCount: parentCraftedCount,
    parentName,
    isOwned: parentCraftedCount > 0,
    isMastered: parentIsMastered,
    isForma,
    isResource,
    vaulted: !!(inventoryData.primeSets?.[parentName]?.vaulted),
    subcomponents,
  };
}

/**
 * Drop probabilities for each refinement level.
 * Common: 3 items, Uncommon: 2 items, Rare: 1 item.
 * [Common_Individual, Uncommon_Individual, Rare_Individual]
 */
const DROP_CHANCES = {
  'Intact': [0.2533, 0.11, 0.02],
  'Exceptional': [0.2333, 0.13, 0.04],
  'Flawless': [0.20, 0.17, 0.06],
  'Radiant': [0.1667, 0.20, 0.10]
};

/**
 * Calculates the Expected Value (EV) of picking the best reward in a squad.
 * @param {Array} rewards - List of 6 reward items with 'plat' or 'ducats' values.
 * @param {string} refinement - 'Intact', 'Exceptional', 'Flawless', or 'Radiant'.
 * @param {number} squadSize - Number of identical relics (1-4).
 * @param {string} valueKey - 'plat' or 'ducats'.
 */
export function getRelicEV(rewards, refinement, squadSize = 1, valueKey = 'plat') {
  if (!rewards || rewards.length === 0) return 0;
  const chances = DROP_CHANCES[refinement] || DROP_CHANCES['Intact'];

  // Map rewards to their values and individual probabilities
  const items = rewards.map(r => {
    let p = 0;
    if (r.rarity === 'COMMON') p = chances[0];
    else if (r.rarity === 'UNCOMMON') p = chances[1];
    else if (r.rarity === 'RARE') p = chances[2];
    return { val: r[valueKey] || 0, p };
  });

  // Requiem relics have a flat drop table - each of the 8 mods has equal probability (12.5%)
  if (rewards.length >= 7) {
    const isRequiem = rewards.every(r => r.rarity === 'COMMON');
    if (isRequiem) {
      const flatP = 1 / rewards.length;
      const itemsFlat = items.map(i => ({ ...i, p: flatP }));
      // Re-sort by value descending (should already be sorted)
      itemsFlat.sort((a, b) => b.val - a.val);
      let ev = 0;
      let cum = 0;
      for (let i = 0; i < itemsFlat.length; i++) {
        const item = itemsFlat[i];
        const nextCum = 1 - Math.pow(1 - (cum + item.p), squadSize);
        const probBest = nextCum - (1 - Math.pow(1 - cum, squadSize));
        ev += item.val * probBest;
        cum += item.p;
      }
      return ev;
    }
  }

  // Sort by value descending to calculate "probability this is the best item available"
  items.sort((a, b) => b.val - a.val);

  let expectedValue = 0;
  let cumulativeProb = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    // Probability that AT LEAST ONE of the top i+1 items drops:
    // 1 - (1 - sum(p_0...p_i))^N
    const nextCumulativeProb = 1 - Math.pow(1 - (cumulativeProb + item.p), squadSize);

    // Probability that item i is the BEST item in the result set:
    // P(at least one of 0...i) - P(at least one of 0...i-1)
    const probThisIsBest = nextCumulativeProb - (1 - Math.pow(1 - cumulativeProb, squadSize));

    expectedValue += item.val * probThisIsBest;
    cumulativeProb += item.p;
  }

  return expectedValue;
}

export function parseRelicName(uniqueName) {
  const parts = uniqueName.split('/');
  const rawName = parts[parts.length - 1];

  let era = "Unknown";
  if (rawName.includes("T1")) era = "Lith";
  else if (rawName.includes("T2")) era = "Meso";
  else if (rawName.includes("T3")) era = "Neo";
  else if (rawName.includes("T4")) era = "Axi";
  else if (rawName.includes("T5")) era = "Requiem";

  let refinement = "Intact";
  if (rawName.endsWith("Silver")) refinement = "Exceptional";
  else if (rawName.endsWith("Gold")) refinement = "Flawless";
  else if (rawName.endsWith("Platinum")) refinement = "Radiant";

  let name = rawName
    .replace(/^T\dVoidProjection/, '')
    .replace(/(Bronze|Silver|Gold|Platinum)$/, '');

  return { era, refinement, name };
}

/**
 * Calculates the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) { tmp[i] = [i]; }
  for (let j = 0; j <= b.length; j++) { tmp[0][j] = j; }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

/**
 * Performs a fuzzy match of an OCR string against a list of candidate items.
 * Returns the best matching item if the similarity is above the threshold.
 */
export function fuzzyMatchReward(ocrText, candidates, threshold = 0.5) {
  if (!ocrText || !candidates || candidates.length === 0) return null;

  const clean = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  // Use the existing splitPascal helper to dynamically separate merged words
  const ocrClean = clean(splitPascal(ocrText));

  if (ocrClean.length < 3) return null;

  const ocrWords = ocrClean.split(' ');
  let bestMatch = null;
  let bestScore = -1;

  for (const item of candidates) {
    if (!item || !item.name) continue;

    const itemClean = clean(item.name);
    if (!itemClean) continue;
    const itemWords = itemClean.split(' ');

    // 1. Exact or subset match (high priority)
    if (ocrClean === itemClean || itemClean.includes(ocrClean) || ocrClean.includes(itemClean)) {
      return item;
    }

    // 2. Word-by-word similarity
    let totalSim = 0;
    let totalWeight = 0;

    for (let i = 0; i < itemWords.length; i++) {
      const iw = itemWords[i];
      let bestWordSim = 0;
      for (const ow of ocrWords) {
        // Direct containment check (catches PZEXO -> EXO)
        if (ow.includes(iw) || iw.includes(ow)) {
          bestWordSim = Math.max(bestWordSim, 0.9);
        }
        // Levenshtein similarity
        const d = levenshteinDistance(ow, iw);
        const maxL = Math.max(ow.length, iw.length);
        const s = 1.0 - (d / maxL);
        if (s > bestWordSim) bestWordSim = s;
      }

      const weight = i === 0 ? 2.0 : 1.0; // Boost weight of the first word (item name)
      totalSim += (bestWordSim * weight);
      totalWeight += weight;
    }

    const finalScoreWordBased = totalSim / totalWeight;

    // Incorporate full-string similarity to penalize length mismatches
    const fullDist = levenshteinDistance(ocrClean, itemClean);
    const fullMaxL = Math.max(ocrClean.length, itemClean.length);
    const fullSim = 1.0 - (fullDist / (fullMaxL || 1));

    // Combine scores: 70% word-based, 30% full-string
    const combinedScore = (finalScoreWordBased * 0.7) + (fullSim * 0.3);

    if (combinedScore > bestScore && combinedScore >= threshold) {
      bestScore = combinedScore;
      bestMatch = item;
    }
  }

  return bestMatch;
}