// ── Warframe Data Resolution Utilities ───────────────────────────────────────

export const GeneralOverrides = {
  // Ally agents (1999 / Hex)
  'AoiAllyAgent': 'Aoi',
  'ArthurAllyAgent': 'Arthur',
  'QuincyAllyAgent': 'Quincy',
  'EleanorAllyAgent': 'Eleanor',
  'LettieAllyAgent': 'Lettie',
  'AmirAllyAgent': 'Amir',
  // Factions
  'FC_CORPUS': 'Corpus',
  'FC_GRINEER': 'Grineer',
  'FC_INFESTATION': 'Infested',
  'FC_OROKIN': 'Orokin',
  'FC_SENTIENT': 'Sentient',
  'FC_MURMUR': 'The Murmur',
  'FC_NARMON': 'Narmer',
  'FC_NARMER': 'Narmer',
  'FC_MITW': 'The Murmur',
  'FC_TECHROT': 'Techrot',
  'FC_SCALDRA': 'Scaldra',
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
  'SORTIE_BOSS_AMAR': 'Amar',
  'SORTIE_BOSS_NIRA': 'Nira',
  'SORTIE_BOSS_BOREAL': 'Boreal',
  'SORTIE_BOSS_NIHIL': 'Nihil',
  // Sortie modifiers
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
}

const clean = (s) => {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '').replace(/\\n/g, ' ').trim()
}

export const DescriptionOverrides = {}

export function resolveNode(node, dict, ERg) {
  if (!node) return 'Unknown Node'

  // Check Description Overrides if the key looks like a description request
  const cleanKey = node.replace(/_Desc$/, '').replace(/Desc$/, '');
  if (node.endsWith('_Desc') || node.endsWith('Desc')) {
    if (DescriptionOverrides[cleanKey]) return DescriptionOverrides[cleanKey];
  }

  if (dict[node]) return clean(dict[node])
  if (dict['/' + node]) return clean(dict['/' + node])

  const entry = ERg[node]
  if (entry && entry.name) {
    const res = dict[entry.name] || dict['/' + entry.name]
    if (res) return clean(res)
  }

  const last = node.split('/').at(-1)
  if (GeneralOverrides[last]) return GeneralOverrides[last]
  if (DescriptionOverrides[last]) return DescriptionOverrides[last]
  if (MAPPING_TYPES[last]) return MAPPING_TYPES[last]
  if (dict[last]) return clean(dict[last])
  if (dict['/' + last]) return clean(dict['/' + last])

  // Fallback cleanup
  if (last.startsWith('SORTIE_MODIFIER_')) {
    return last.replace('SORTIE_MODIFIER_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
  if (last.startsWith('SORTIE_BOSS_')) {
    return last.replace('SORTIE_BOSS_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }
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

export function resolveMissionType(raw, dict, ERg) {
  if (!raw) return ''
  if (MAPPING_TYPES[raw] !== undefined) return MAPPING_TYPES[raw]
  const resolved = resolveNode(raw, dict, ERg)
  return MAPPING_TYPES[resolved] ?? resolved
}

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

export function resolveChallengeDesc(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  let res = ''

  if (entry && entry.description) {
    res = dict[entry.description] || dict['/' + entry.description] || ''
  }

  // Fallback to direct dictionary resolution if EC metadata is missing
  if (!res) {
    const last = path.split('/').at(-1)
    res = dict[path + '_Desc'] || dict['/' + path + '_Desc'] || dict[last + '_Desc'] || ''
  }

  if (res) {
    res = clean(res).replace(/\|COUNT\|/g, entry?.requiredCount || '')
    if (allyPath) {
      const allyName = resolveNode(allyPath, dict, ERg)
      res = res.replace(/\|ALLY\|\s+Bounty/gi, '')
      res = res.replace(/\|ALLY\|/g, allyName)
    }
    return res.replace(/\|[^|]*\|/g, '').replace(/\/[L|l]otus\/[^ ]*/g, '').trim()
  }

  return ''
}

export function resolveChallengeFlavour(path, dict, EC, ERg, allyPath = '') {
  if (!path) return ''
  const entry = EC[path]
  if (entry && entry.flavour) {
    let res = dict[entry.flavour] || dict['/' + entry.flavour]
    if (res) {
      res = clean(res)
      if (allyPath) {
        const allyName = resolveNode(allyPath, dict, ERg)
        res = res.replace(/\|ALLY\|/g, allyName)
      }
      return res.replace(/\|[^|]*\|/g, '').trim()
    }
  }
  return ''
}

export function resolveRewardText(reward, dict, ERg, uniqueNameToName = {}, sep = ', ') {
  if (!reward) return null
  const cItems = reward.countedItems ?? reward.CountedItems ?? []
  const rawItems = reward.items ?? reward.Items ?? []

  const resolveNameStr = (name) => {
    if (!name) return ''
    if (name.startsWith('/Lotus/')) {
      const resolved = resolveItemName(name, dict, uniqueNameToName)
      if (resolved && !resolved.startsWith('/Lotus/')) return resolved
      return resolveNode(name, dict, ERg)
    }
    return name
  }

  const parts = []
  rawItems.forEach(it => {
    const resolved = resolveNameStr(it)
    if (resolved) parts.push(resolved)
  })
  cItems.forEach(ci => {
    const name = ci.type?.name ?? ci.ItemType ?? ci.type ?? ci.key ?? ''
    const resolved = resolveNameStr(name)
    if (resolved) {
      const count = ci.count ?? ci.ItemCount ?? 1
      parts.push((count > 1 ? `${count}× ` : '') + resolved)
    }
  })

  if (parts.length > 0) return parts.join(sep)

  let fb = reward.itemString || reward.asString || null
  if (fb && fb.startsWith('/Lotus/')) {
    const resolved = resolveItemName(fb, dict, uniqueNameToName)
    if (resolved && !resolved.startsWith('/Lotus/')) return resolved
    fb = resolveNode(fb, dict, ERg)
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

function splitPascal(str) {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
}

function nameFromPath(path = '') {
  const parts = path.split('/').filter(Boolean);
  const leaf = parts.at(-1) ?? path;
  const folder = parts.at(-2) ?? '';

  if (FOLDER_OVERRIDES[folder]) {
    const suffix = leaf.match(/(Prime|Vandal|Wraith|Prisma|Kuva|Tenet|Umbra)$/i)?.[0] ?? '';
    const bp = leaf.endsWith('Blueprint') ? ' Blueprint' : '';
    return FOLDER_OVERRIDES[folder] + (suffix ? ' ' + suffix : '') + bp;
  }

  const stripped = leaf
    .replace(/(BaseSuit|PowerSuit|PrimeName|OperatorAmp|HoverboardSuit|MotorcyclePowerSuit|MoaPetPowerSuit|Blueprint)$/, '');
  const name = splitPascal(stripped).trim() || leaf;
  return leaf.endsWith('Blueprint') && !name.endsWith('Blueprint') ? name + ' Blueprint' : name;
}

export function resolveItemName(path, dict, uniqueNameToName) {
  if (!path) return ''

  // Handle StoreItem paths by trying to resolve the actual item
  let actualPath = path;
  if (path.startsWith('/Lotus/StoreItems/')) {
    actualPath = path.replace('/StoreItems/', '/');
  }

  const lookup = (p) => {
    if (!uniqueNameToName || !uniqueNameToName[p]) return null;
    const locKey = uniqueNameToName[p];
    const res = dict[locKey] || dict['/' + locKey];
    if (res && !res.startsWith('/Lotus/')) return clean(res);
    if (locKey && !locKey.startsWith('/Lotus/')) return clean(locKey);
    return null;
  };

  // 1. Try actualPath (mapped)
  const r1 = lookup(actualPath);
  if (r1) return r1;

  // 2. Try raw path
  const r2 = lookup(path);
  if (r2) return r2;

  // 3. Try dict directly
  const d1 = dict[actualPath] || dict['/' + actualPath] || dict[path] || dict['/' + path];
  if (d1 && typeof d1 === 'string' && !d1.startsWith('/Lotus/')) return clean(d1);

  // 4. nameFromPath (fallback)
  const n = nameFromPath(actualPath);
  if (n && !n.startsWith('/Lotus/')) return n;

  return clean(path);
}

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
    item = rewardOrItem.uniqueName || rewardOrItem.ItemType || rewardOrItem.StoreItem || rewardOrItem.item || '';
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
    if (p.includes('/Recipes/') || p.endsWith('Blueprint') || /(Barrel|Receiver|Stock|Handle|Grip|String|UpperLimb|LowerLimb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i.test(p)) {
      // 1. Resolve the item's display name via dict, strip suffixes, look up by name
      const locKey = uniqueNameToName[p]
      if (locKey) {
        const cleanName = locKey.replace(/\s+(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|Upper Limb|Lower Limb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i, '').trim()
        const byResolvedName = nameToImage[cleanName.toLowerCase()]
        if (byResolvedName) return byResolvedName
      }

      // 2. Use nameFromPath which splits pascal case, then strip suffixes
      const nfp = nameFromPath(p)
      const cleanNfp = nfp.replace(/\s+(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|Upper Limb|Lower Limb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i, '').trim()
      if (cleanNfp) {
        const byNfp = nameToImage[cleanNfp.toLowerCase()]
        if (byNfp) return byNfp
      }

      // 3. Try stripping suffixes from the path leaf
      const leaf = p.split('/').at(-1)?.replace(/(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|UpperLimb|LowerLimb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i, '') ?? ''
      if (leaf) {
        const byLeaf = nameToImage[leaf.toLowerCase()]
        if (byLeaf) return byLeaf
      }
      // 4. Try swapping recipe path to weapon path and strip suffixes
      const swapped = p.replace('/Types/Recipes/', '/Weapons/').replace(/(Blueprint|Barrel|Receiver|Stock|Handle|Grip|String|UpperLimb|LowerLimb|Blade|Hilt|Gauntlet|Boot|Pouch|Stars|Band|Head|Carapace|Cerebrum|Systems|Chassis|Neuroptics)$/i, '')
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

export function timeRemaining(expiry) {
  if (!expiry) return ''
  const expDate = typeof expiry === 'object' && expiry.$date ? new Date(parseInt(expiry.$date.$numberLong, 10)) : new Date(expiry)
  const diff = expDate - Date.now()
  if (diff < 0) return 'Expired'
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff % 86_400_000) / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function timeSince(date) {
  if (!date) return ''
  const d = typeof date === 'object' && date.$date ? new Date(parseInt(date.$date.$numberLong, 10)) : new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 0) return 'Just now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const day = Math.floor(h / 24)
  if (day > 0) return `${day}d ago`
  if (h > 0) return `${h}h ago`
  return `${m}m ago`
}

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