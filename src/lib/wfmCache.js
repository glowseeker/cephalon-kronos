/**
 * Warframe Market Cache (v0.4.1)
 * Features: WFM API v2, Tiered TTL caching, and median pricing.
 */

const CACHE_KEY = 'wfm_price_cache';

/**
 * Tiered TTL logic based on item rarity (Ducats as baseline)
 * Rare (45+): 8h
 * Uncommon (15-44): 24h
 * Common (<15): 72h
 */
function getTTL(ducatValue = 0) {
  if (ducatValue >= 45) return 8 * 60 * 60 * 1000;
  if (ducatValue >= 15) return 24 * 60 * 60 * 1000;
  return 72 * 60 * 60 * 1000;
}

export async function getPrice(itemUniqueName, itemName, ducatValue = 0) {
  // DISABLED FOR NOW
  return 0;
}

function toWfmSlug(itemName) {
  // WFM slugs are lowercase, spaces replaced by underscores
  // Standardize: "Blueprints" -> "Blueprint"
  return itemName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint');
}

async function fetchWfmPrice(slug) {
  try {
    // WFM API v2 - Requires Platform header
    const url = `https://api.warframe.market/v2/items/${slug}/orders`;
    const response = await fetch(url, {
      headers: {
        'Platform': 'pc',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    // V2 response has 'orders' at top level
    const { orders } = await response.json();
    if (!orders) return null;

    // Filter: "sell" orders from "ingame" (priority) or "online" users
    const sells = orders
      .filter(o => o.order_type === 'sell' && (o.user.status === 'ingame' || o.user.status === 'online'))
      .sort((a, b) => a.platinum - b.platinum)
      .slice(0, 5); // Take top 5 lowest

    if (sells.length === 0) return null;

    // Calculate median of the top 5
    const medianIndex = Math.floor(sells.length / 2);
    const median = sells[medianIndex].platinum;

    return median;
  } catch (err) {
    console.error(`[WFM API] Fetch Error for ${slug}:`, err);
    return null;
  }
}

function loadCache() {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveToCache(itemUniqueName, plat) {
  const cache = loadCache();
  cache[itemUniqueName] = {
    plat,
    lastUpdated: Date.now()
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}
