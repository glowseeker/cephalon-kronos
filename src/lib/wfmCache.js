/**
 * Warframe Market Cache (v0.4.2)
 * Features: WFM API v2, Throttled fetching, Tiered TTL caching.
 */

const CACHE_KEY = 'wfm_price_cache';
const RATE_LIMIT_MS = 350; // ~3 requests per second
let lastFetchTime = 0;

/**
 * Tiered TTL logic based on item rarity (Ducats as baseline)
 */
function getTTL(ducatValue = 0) {
  if (ducatValue >= 45) return 8 * 60 * 60 * 1000; // 8h for Rares
  if (ducatValue >= 15) return 24 * 60 * 60 * 1000; // 24h for Uncommons
  return 72 * 60 * 60 * 1000; // 72h for Commons
}

export async function getPrice(itemUniqueName, itemName, ducatValue = 0) {
  if (!itemName || itemName.includes('Forma')) return 0;

  const cache = loadCache();
  const cached = cache[itemUniqueName];
  const ttl = getTTL(ducatValue);

  if (cached && (Date.now() - cached.lastUpdated < ttl)) {
    return cached.plat;
  }

  // Throttling
  const now = Date.now();
  const timeSinceLast = now - lastFetchTime;
  if (timeSinceLast < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - timeSinceLast));
  }

  const slug = toWfmSlug(itemName);
  const plat = await fetchWfmPrice(slug);

  if (plat !== null) {
    saveToCache(itemUniqueName, plat);
    return plat;
  }

  return cached ? cached.plat : 0;
}

/**
 * Bulk fetch prices for a list of items.
 * Useful for Relics page initialization.
 */
export async function getPricesBatch(items) {
  const results = {};
  for (const item of items) {
    results[item.uniqueName] = await getPrice(item.uniqueName, item.name, item.ducats);
  }
  return results;
}

function toWfmSlug(itemName) {
  return itemName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/_blueprints$/, '_blueprint')
    .replace(/_blueprint_blueprint$/, '_blueprint');
}

async function fetchWfmPrice(slug) {
  lastFetchTime = Date.now();
  try {
    const url = `https://api.warframe.market/v2/items/${slug}/orders`;
    const response = await fetch(url, {
      headers: {
        'Platform': 'pc',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) return 0;
      return null;
    }

    const data = await response.json();
    const orders = data.data?.orders || data.orders; // Handle variations in V2 structure
    if (!orders) return null;

    // Filter: "sell" orders from active users
    const sells = orders
      .filter(o => o.order_type === 'sell' && (o.user.status === 'ingame' || o.user.status === 'online'))
      .sort((a, b) => a.platinum - b.platinum);

    if (sells.length === 0) return 0;

    // Use median of top 3 to avoid outliers/bait orders
    const top3 = sells.slice(0, 3);
    const sum = top3.reduce((acc, o) => acc + o.platinum, 0);
    return Math.round(sum / top3.length);

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
