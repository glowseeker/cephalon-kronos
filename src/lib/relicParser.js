/**
 * Logic for mapping Relic unique names (from logs) to game data and inventory context.
 */

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
function resolveDisplayName(uniqueName, exportData) {
  if (!uniqueName) return '';
  // Normalize path: remove /StoreItems/ from log paths to match export data keys
  const normalizedKey = uniqueName.replace('/StoreItems/', '/');
  
  const dict = exportData['dict.en'] || {};
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
      const resultName = resolveDisplayName(entry.resultType, exportData);
      if (uniqueName.toLowerCase().includes('blueprint') && !resultName.toLowerCase().includes('blueprint')) {
        return resultName + ' Blueprint';
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
export function getAllRelicRewards(exportData) {
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
        name: resolveDisplayName(un, exportData),
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
      name: 'Forma Blueprint',
      rarity: 'COMMON',
      ducats: 0
    });
  }
  
  return allItems;
}

/**
 * Extracts the 6 possible rewards for a relic.
 */
export function getRelicRewards(relicUniqueName, exportData) {
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
      name: resolveDisplayName(un, exportData),
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
export function getRewardInventoryContext(rewardUniqueName, inventoryData, exportData) {
  if (!inventoryData) return { stock: 0, subcomponents: [], isForma: false, isResource: false };

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

  // Determine the display name (e.g. "Xaku Prime Neuroptics Blueprint" or "Zylok Prime Receiver")
  const itemName = resolveDisplayName(rewardUniqueName, exportData);
  
  // Robustly determine Parent Name by stripping suffixes rather than trusting broken export arrays
  let parentName = itemName;
  const suffixes = [
    ' Blueprint', ' Neuroptics', ' Chassis', ' Systems',
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
        parentRecipeUniqueName = bpUniqueName;
        parentName = resolveDisplayName(bpRecipe.resultType, exportData).replace(/\s*Blueprint\s*$/i, '').trim();
        break;
      }
      // Pass 2: Fallback to string matching the result type
      const resName = resolveDisplayName(bpRecipe.resultType, exportData).replace(/\s*Blueprint\s*$/i, '').trim();
      if (resName === parentName) {
        parentRecipe = bpRecipe;
        parentRecipeUniqueName = bpUniqueName;
      }
    }
  }

  const subcomponents = (parentRecipe?.ingredients || []).map(ing => {
    const ingName = resolveDisplayName(ing.ItemType, exportData);
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

  // Now determine the item's own counts
  const rewardEntry = inventoryData.all?.find(i => i.unique_name === rewardUniqueName)
      || inventoryData.prime_parts?.find(i => i.unique_name === rewardUniqueName)
      || inventoryData.mods?.find(i => i.unique_name === rewardUniqueName)
      || inventoryData.resources?.find(i => i.unique_name === rewardUniqueName);
      
  const stock = rewardEntry?.quantity ?? 0;
  
  const craftedEntry = inventoryData.all?.find(i => i.unique_name === actualComponent)
      || inventoryData.prime_parts?.find(i => i.unique_name === actualComponent)
      || inventoryData.resources?.find(i => i.unique_name === actualComponent);
      
  const craftedCount = craftedEntry?.quantity ?? 0;
  const isMastered = craftedEntry?.mastered ?? false;

  let parentBpCount = 0;
  let parentCraftedCount = 0;
  let parentIsMastered = false;

  if (parentRecipe && parentRecipeUniqueName) {
    parentBpCount = inventoryData.prime_parts?.find(i => i.unique_name === parentRecipeUniqueName)?.quantity ?? 0;
    const pCrafted = inventoryData.all?.find(i => i.unique_name === parentRecipe.resultType)
                  || inventoryData.prime_parts?.find(i => i.unique_name === parentRecipe.resultType);
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
    subcomponents,
  };
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