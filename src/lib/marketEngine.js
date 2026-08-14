import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const PRICE_CACHE_KEY = 'market_engine_prices';
const PRICE_TTL = 24 * 60 * 60 * 1000;
const ITEMS_CACHE_KEY = 'market_engine_items';
const ITEMS_TTL = 7 * 24 * 60 * 60 * 1000;

let cachedPriceMap = null;
let cachedItemMap = null;
let ensureInFlight = null

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadFromCache(key, ttl) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > ttl) return null;
    return data;
  } catch { return null; }
}

function saveToCache(key, data) {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function loadPriceMap() {
  if (cachedPriceMap) return cachedPriceMap;
  const data = loadFromCache(PRICE_CACHE_KEY, PRICE_TTL);
  if (data) cachedPriceMap = new Map(data);
  return cachedPriceMap;
}

function loadItemMap() {
  if (cachedItemMap) return cachedItemMap;
  const data = loadFromCache(ITEMS_CACHE_KEY, ITEMS_TTL);
  if (data) cachedItemMap = new Map(data);
  return cachedItemMap;
}

async function fetchPriceHistory(dateStr) {
  const url = `https://relics.run/history/price_history_${dateStr}.json`;
  const response = await tauriFetch(url, { method: 'GET' });
  if (!response.ok) return null;
  return await response.json();
}

async function fetchItemMap() {
  const response = await tauriFetch('https://relics.run/history/item_data/items.json', { method: 'GET' });
  if (!response.ok) return null;
  const items = await response.json();
  const map = new Map();
  for (const item of items) {
    if (item.gameRef && item.i18n?.en?.name) {
      map.set(item.gameRef, { name: item.i18n.en.name, id: item.id, slug: item.slug });
    }
  }
  return map;
}

function buildPriceMap(historyData, itemMap) {
  const priceMap = new Map();
  for (const [itemName, entries] of Object.entries(historyData)) {
    const sellEntry = entries.find(e => e.order_type === 'sell');
    if (sellEntry && sellEntry.median != null) {
      priceMap.set(itemName, sellEntry.median);
    }
  }
  if (itemMap) {
    for (const [gameRef, info] of itemMap) {
      const price = priceMap.get(info.name);
      if (price != null && price > 0) {
        priceMap.set(gameRef, price);
      }
    }
  }
  return priceMap;
}

async function ensurePriceMap() {
  if (cachedPriceMap) return cachedPriceMap;
  if (ensureInFlight) return ensureInFlight;
  ensureInFlight = _doEnsurePriceMap().finally(() => { ensureInFlight = null });
  return ensureInFlight;
}

async function _doEnsurePriceMap() {
  let priceMap = loadPriceMap();
  if (priceMap) return priceMap;

  let itemMap = loadItemMap();
  if (!itemMap) {
    try {
      itemMap = await fetchItemMap();
      if (itemMap) saveToCache(ITEMS_CACHE_KEY, [...itemMap.entries()]);
    } catch { itemMap = null; }
  }

  const today = getTodayStr();
  const dates = [today];
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }

  for (const dateStr of dates) {
    try {
      const data = await fetchPriceHistory(dateStr);
      if (data) {
        const mapData = buildPriceMap(data, itemMap);
        cachedPriceMap = mapData;
        saveToCache(PRICE_CACHE_KEY, [...mapData.entries()]);
        return mapData;
      }
    } catch {}
  }

  return new Map();
}

export async function getPricesBatch(items, onProgress) {
  const priceMap = await ensurePriceMap();
  const results = {};
  let done = 0;
  const total = items.filter(i => i.name && !/\bForma\b/.test(i.name)).length;

  for (const item of items) {
    if (item.name && /\bForma\b/.test(item.name)) {
      results[item.uniqueName] = 0;
      continue;
    }
    // Relic rewards / store items ship with a /StoreItems/ path prefix that
    // the relics.run item catalog strips (gameRefs use the /Lotus/... path),
    // so try the raw key, the normalized key, then the display name.
    let price = priceMap.get(item.uniqueName);
    if (!price && item.uniqueName?.includes('/StoreItems/')) {
      price = priceMap.get(item.uniqueName.replace('/StoreItems/', '/'));
    }
    // WFM catalog keys use Blueprint paths and standard warframe component names
    // (Neuroptics/Chassis/Systems), but the game export uses alternate names for
    // some warframe prime parts (e.g. GaussPrimeHelmetComponent). Try path
    // transformations if the raw lookup misses.
    if (!price && typeof item.uniqueName === 'string') {
      if (item.uniqueName.endsWith('Component')) {
        price = priceMap.get(item.uniqueName.slice(0, -9) + 'Blueprint');
      }
      if (!price) {
        const neuroptics = item.uniqueName.replace('HelmetComponent', 'NeuropticsComponent');
        if (neuroptics !== item.uniqueName) price = priceMap.get(neuroptics);
      }
    }
    if (!price) price = priceMap.get(item.name) ?? 0;
    results[item.uniqueName] = price;
    if (onProgress) onProgress({ current: ++done, total, label: item.name });
  }

  return { results, hadNetworkActivity: done > 0 };
}

export async function getPrice(uniqueName, itemName, _ducatValue = 0) {
  const priceMap = await ensurePriceMap();
  let price = priceMap.get(uniqueName);
  // WFM catalog keys use Blueprint paths and standard warframe component names
  // (Neuroptics/Chassis/Systems), but the game export uses alternate names for
  // some warframe prime parts (e.g. GaussPrimeHelmetComponent). Try path
  // transformations if the raw lookup misses.
  if (!price && typeof uniqueName === 'string' && uniqueName.endsWith('Component')) {
    price = priceMap.get(uniqueName.slice(0, -9) + 'Blueprint');
  }
  if (!price && typeof uniqueName === 'string') {
    // Helmet → Neuroptics (Gauss Prime Neuroptics is exported as HelmetComponent)
    const neuroptics = uniqueName.replace('HelmetComponent', 'NeuropticsComponent');
    if (neuroptics !== uniqueName) price = priceMap.get(neuroptics);
  }
  if (!price) price = priceMap.get(itemName) ?? 0;
  return price;
}
