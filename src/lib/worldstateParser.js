import {
  resolveNode,
  resolveMissionType,
  resolveRewardText,
  resolveChallenge,
  resolveChallengeDesc,
  resolveItemName
} from './warframeUtils'

/**
 * Compute which phase of an alternating A/B cycle we're currently in,
 * and how long until the next phase transition.
 * 
 * @param {number} epochSec - Known transition timestamp (start of phase A).
 * @param {number} aLenSec - Duration of phase A (seconds).
 * @param {number} bLenSec - Duration of phase B (seconds).
 * @param {string} aLabel - Label for phase A.
 * @param {string} bLabel - Label for phase B.
 */
function computeCycle(epochSec, aLenSec, bLenSec, aLabel, bLabel) {
  const totalSec = aLenSec + bLenSec
  const nowSec = Date.now() / 1000
  const elapsed = ((nowSec - epochSec) % totalSec + totalSec) % totalSec
  const inA = elapsed < aLenSec
  const remainingSec = inA ? (aLenSec - elapsed) : (totalSec - elapsed)
  return {
    state: inA ? aLabel : bLabel,
    expiry: new Date(Date.now() + remainingSec * 1000)
  }
}

function parseCetusCycle(_raw) {
  // Plains of Eidolon / Earth (Cetus): looptime 8998.874s (~150m), delaytime 3000s (50m night).
  // Wiki epoch: February 5, 2021 12:27:54 UTC (1612528074)
  // Day = 5998.874s, Night = 3000s
  return computeCycle(1612528074, 5998.874, 3000, 'Day', 'Night')
}

function parseVallisCycle(_raw) {
  // Orb Vallis: looptime 1600s, delaytime 1200s (20m cold).
  // Wiki epoch: January 9, 2021 08:13:48 UTC (1610170428)
  // Warm = 400s, Cold = 1200s
  return computeCycle(1610170428, 400, 1200, 'Warm', 'Cold')
}

function parseCambionCycle(_raw) {
  // Cambion Drift: Same cycle as Cetus, but labels are Fass/Vome.
  // Fass = 5998.874s, Vome = 3000s
  const { state, expiry } = computeCycle(1612528074, 5998.874, 3000, 'Fass', 'Vome')
  return { state, expiry, active: state === 'Fass' }
}

function parseEarthCycle(_raw) {
  // Earth (Forest): looptime 14400s (4h), delaytime 14400s (4h).
  // Epoch: June 16, 2020 00:00:00 UTC (1592265600)
  return computeCycle(1592265600, 14400, 14400, 'Day', 'Night')
}

function parseZarimanCycle(raw, bountyCycle) {
  // Zariman faction is pulled from oracle bounty-cycle API
  // Expiry is synced with HexSyndicate (1999) bounty timer
  const hex = (raw.SyndicateMissions || []).find(s => s.Tag === 'HexSyndicate')
  const expiry = hex ? (hex.Expiry?.$date?.$numberLong ? new Date(parseInt(hex.Expiry.$date.$numberLong, 10)) : new Date(hex.Expiry)) : null

  const factionRaw = bountyCycle?.zarimanFaction || 'FC_CORPUS'
  const state = factionRaw === 'FC_GRINEER' ? 'Grineer' : 'Corpus'

  return { state, expiry }
}

function parseDuviriCycle(_raw) {
  // Duviri rotates through 5 emotional states, 2h each, starting from Unix epoch 0
  const states = ['Sorrow', 'Fear', 'Joy', 'Anger', 'Envy']
  const stateLenMs = 7200000 // 2 hours
  const nowMs = Date.now()

  const idx = Math.floor(nowMs / stateLenMs)
  const currentState = states[idx % 5]
  const expiry = new Date((idx + 1) * stateLenMs)

  return {
    state: currentState,
    expiry: expiry
  }
}

/**
 * Build a short-key → value index for archimedea modifier strings from the suppDict.
 *
 * Raw worldstate values are short identifiers like "OverSensitive", "UnpoweredCapsules".
 * The oracle dict stores them as full paths like:
 *   /Lotus/Language/Conquest/PersonalMod_OverSensitive
 *   /Lotus/Language/Conquest/MissionVariant_LabConquest_UnpoweredCapsules_Desc
 *
 * Rather than hardcoding which prefix tokens to strip (which would break for other languages
 * or if DE adds new prefix groups), we index every possible underscore-suffix of the last
 * path segment. The raw worldstate key always matches one of those suffixes.
 *
 * Works for any locale - path structure under /Conquest/ is language-agnostic,
 * only the values change.
 */
function buildArchimedeaMap(dict, suppDict) {
  const map = {}
  const clean = s => s.replace(/<[^>]*>/g, '').trim()

  const processDict = (d) => {
    for (const [key, val] of Object.entries(d)) {
      if (!key.toLowerCase().includes('/conquest/')) continue
      const segment = key.split('/').at(-1) // e.g. "PersonalMod_OverSensitive_Desc"
      const parts = segment.split('_')
      // Index every suffix: "OverSensitive_Desc", "Sensitive_Desc", "Desc", etc.
      for (let i = 0; i < parts.length; i++) {
        const shortKey = parts.slice(i).join('_').toLowerCase()
        if (shortKey && !map[shortKey]) map[shortKey] = clean(val)
      }
    }
  }

  processDict(dict)
  if (suppDict) processDict(suppDict)

  return map
}

const CONQUEST_OVERRIDES = {
  'undersupplied': 'maxammo',
  'dullblades': 'combocountchance'
}

export function parseWorldstate(raw, { dict, suppDict, ERg, EC, EI, nameToImage, uniqueNameToName, bountyCycle, ES, ENW }) {
  if (!raw) return null

  const archMap = buildArchimedeaMap(dict || {}, suppDict || {})

  const clean = (s) => {
    if (!s || typeof s !== 'string') return ''
    return s.replace(/<[^>]*>/g, '').replace(/\|[^|]*\|/g, '').replace(/\\n/g, ' ').trim()
  }

  const resolvePriority = (key) => {
    if (!key) return ''
    if (suppDict) {
      if (suppDict[key]) return clean(suppDict[key])
      if (suppDict['/' + key]) return clean(suppDict['/' + key])

      // Also try resolving via ERg if the key is a solnode but we want to check suppDict for the name
      const entry = ERg[key]
      if (entry && entry.name) {
        const res = suppDict[entry.name] || suppDict['/' + entry.name]
        if (res) return clean(res)
      }
    }
    return resolveNode(key, dict, ERg)
  }

  return {
    // News (from Events)
    news: (raw.Events || [])
      .filter(e => e.Date != null)
      .map(e => {
        const raw_msg = e.Messages?.find(m => m.LanguageCode === 'en')?.Message || ''
        if (!raw_msg) return null

        const message = raw_msg.startsWith('/Lotus/Language/')
          ? (dict?.[raw_msg] || dict?.['/' + raw_msg] || null)
          : raw_msg || null
        if (!message) return null
        const ts = e.Date?.$date?.$numberLong
          ? parseInt(e.Date.$date.$numberLong, 10)
          : (e.Date ? new Date(e.Date).getTime() : 0)
        return { message, link: e.Prop, date: new Date(ts), image: e.ImageUrl, priority: e.Priority, community: !!e.Community }
      })
      .filter(Boolean)
      .sort((a, b) => b.date - a.date),

    // Incursions (Steel Path)
    incursions: raw.Incursions?.[0] ? {
      id: raw.Incursions[0]._id?.$oid || raw.Incursions[0]._id,
      activation: raw.Incursions[0].Activation,
      expiry: raw.Incursions[0].Expiry,
    } : null,
    steelPath: raw.SteelPath || null,

    // Invasions
    invasions: (raw.Invasions || []).map(i => {
      const completion = i.Count / i.Goal
      const pct = ((completion + 1) / 2) * 100

      const attFaction = resolveNode(i.AttackerMissionInfo?.faction, dict, ERg)
      const defFaction = resolveNode(i.DefenderMissionInfo?.faction, dict, ERg)
      const isInfested = attFaction === 'Infested' || defFaction === 'Infested'

      let attReward = i.AttackerReward
      let defReward = i.DefenderReward

      // Infested logic: Infested side should not have rewards. 
      // Sometimes worldstate puts the reward meant for the player on the infested side's field.
      if (isInfested) {
        if (attFaction === 'Infested' && attReward && (!defReward || (!defReward.CountedItems?.length && !defReward.Items?.length))) {
          defReward = attReward
          attReward = null
        } else if (defFaction === 'Infested' && defReward && (!attReward || (!attReward.CountedItems?.length && !attReward.Items?.length))) {
          attReward = defReward
          defReward = null
        }
      }

      return {
        id: i._id?.$oid || i._id,
        node: resolveNode(i.Node, dict, ERg),
        completed: i.Completed,
        completion: pct,
        attacker: {
          reward: attReward,
          rewardText: resolveRewardText(attReward, dict, ERg, uniqueNameToName),
          faction: attFaction
        },
        defender: {
          reward: defReward,
          rewardText: resolveRewardText(defReward, dict, ERg, uniqueNameToName),
          faction: defFaction
        }
      }
    }),

    // Fissures (from ActiveMissions)
    fissures: (raw.ActiveMissions || []).map(f => {
      const tierMap = { 'VoidT1': 'Lith', 'VoidT2': 'Meso', 'VoidT3': 'Neo', 'VoidT4': 'Axi', 'VoidT5': 'Requiem', 'VoidT6': 'Omnia' }
      return {
        id: f._id?.$oid || f._id,
        node: resolveNode(f.Node, dict, ERg),
        missionType: resolveMissionType(f.MissionType, dict, ERg),
        tier: tierMap[f.Modifier] || f.Modifier?.replace('VoidT', 'Tier ') || 'Unknown',
        tierNum: parseInt(f.Modifier?.replace('VoidT', ''), 10) || 0,
        expiry: f.Expiry,
        activation: f.Activation,
        isHard: !!f.Hard,
        isStorm: false
      }
    }),

    // Void Storms
    voidStorms: (raw.VoidStorms || []).map(s => {
      const tierMap = { 'VoidT1': 'Lith', 'VoidT2': 'Meso', 'VoidT3': 'Neo', 'VoidT4': 'Axi', 'VoidT5': 'Requiem', 'VoidT6': 'Omnia' }

      let mType = resolveMissionType(s.MissionType, dict, ERg)
      if (!mType || mType === 'Unknown Mission') {
        const nodeEntry = ERg[s.Node]
        if (nodeEntry && (nodeEntry.missionName || nodeEntry.missionType)) {
          mType = resolveMissionType(nodeEntry.missionName || nodeEntry.missionType, dict, ERg)
        }
      }

      return {
        id: s._id?.$oid || s._id,
        node: resolveNode(s.Node, dict, ERg),
        missionType: mType || 'Skirmish',
        tier: tierMap[s.ActiveMissionTier] || s.ActiveMissionTier?.replace('VoidT', 'Tier ') || 'Unknown',
        tierNum: parseInt(s.ActiveMissionTier?.replace('VoidT', ''), 10) || 0,
        expiry: s.Expiry,
        activation: s.Activation,
        isStorm: true
      }
    }),

    // 1999 Calendar (from KnownCalendarSeasons)
    calendar1999: (raw.KnownCalendarSeasons || raw.KnownCalendarSeason || []).map(s => ({
      season: s.Season,
      year: s.YearIteration,
      expiry: s.Expiry,
      activation: s.Activation,
      days: (s.Days || []).map(d => {
        const events = d.events || d.Events || [];
        const parsedEvents = events.map(ev => {
          let name = '';
          let type = ev.type || ev.Type || '';

          if (type === 'CET_CHALLENGE') {
            name = resolveChallenge(ev.challenge || ev.Challenge, dict, EC);
          } else if (type === 'CET_REWARD') {
            name = resolveRewardText(ev.reward || ev.Reward, dict, ERg, uniqueNameToName);
          } else if (type === 'CET_UPGRADE') {
            name = resolveItemName(ev.upgrade || ev.Upgrade, dict, uniqueNameToName);
          }

          return { type, name, raw: ev };
        });

        // Fallback for legacy structure if any
        let legacyChallenge = d.Challenge ? resolveChallenge(d.Challenge, dict, EC) : (d.challenge ? resolveChallenge(d.challenge, dict, EC) : null);
        let legacyReward = d.Reward ? resolveRewardText(d.Reward, dict, ERg, uniqueNameToName) : (d.reward ? resolveRewardText(d.reward, dict, ERg, uniqueNameToName) : null);

        return {
          day: d.day,
          type: d.type || d.Type, // Might be 'Birthday'
          events: parsedEvents,
          challenge: legacyChallenge,
          reward: legacyReward
        };
      })
    })),

    // Descendia (from Descents)
    descendia: (raw.Descents || []).map(d => ({
      id: d._id?.$oid || d._id,
      activation: d.Activation,
      expiry: d.Expiry,
      stages: (d.Challenges || []).map(c => ({
        type: c.Type,
        name: resolveNode(c.Challenge, dict, ERg),
        level: resolveNode(c.Level, dict, ERg)
      }))
    })),

    sortie: raw.Sorties?.[0] ? {
      id: raw.Sorties[0]._id?.$oid || raw.Sorties[0]._id,
      activation: raw.Sorties[0].Activation,
      expiry: raw.Sorties[0].Expiry,
      boss: resolveNode(raw.Sorties[0].Boss, dict, ERg),
      variants: (raw.Sorties[0].Variants || []).map(v => ({
        missionType: resolveMissionType(v.missionType, dict, ERg),
        modifier: resolveNode(v.modifierType, dict, ERg),
        node: resolveNode(v.node, dict, ERg)
      }))
    } : null,

    archonHunt: raw.LiteSorties?.[0] ? {
      id: raw.LiteSorties[0]._id?.$oid || raw.LiteSorties[0]._id,
      activation: raw.LiteSorties[0].Activation,
      expiry: raw.LiteSorties[0].Expiry,
      boss: resolveNode(raw.LiteSorties[0].Boss, dict, ERg),
      missions: (raw.LiteSorties[0].Missions || []).map(m => ({
        type: resolveMissionType(m.missionType, dict, ERg),
        node: resolveNode(m.node, dict, ERg)
      }))
    } : null,

    nightwave: raw.SeasonInfo ? {
      id: raw.SeasonInfo._id?.$oid || raw.SeasonInfo._id,
      activation: raw.SeasonInfo.Activation,
      expiry: raw.SeasonInfo.Expiry,
      season: raw.SeasonInfo.Season,
      phase: raw.SeasonInfo.Phase,
      params: raw.SeasonInfo.Params,
      affiliationTag: raw.SeasonInfo.AffiliationTag,
      rewards: (ENW || []).map(r => ({
        name: r.name ? (dict[r.name] || dict['/' + r.name] || r.name) : 'Reward',
        uniqueName: r.uniqueName,
        itemCount: r.itemCount,
        image: EI[r.uniqueName] || null
      })),
      challenges: (raw.SeasonInfo.ActiveChallenges || []).map(c => ({
        id: c._id?.$oid || c._id,
        name: resolveChallenge(c.Challenge, dict, EC),
        desc: resolveChallengeDesc(c.Challenge, dict, EC, ERg),
        expiry: c.Expiry,
        isDaily: !!c.Daily,
        xp: c.xpAmount || c.XP || 0,
        isElite: (c.xpAmount || 0) >= 7000
      }))
    } : null,

    archimedeas: (raw.Conquests || []).map(c => ({
      id: c._id?.$oid || c._id,
      activation: c.Activation,
      expiry: c.Expiry,
      type: c.Type,
      personalModifiers: (c.Variables || []).map(v => {
        const lookup = (CONQUEST_OVERRIDES[v.toLowerCase()] || v).toLowerCase()
        return {
          name: archMap[lookup] ?? resolvePriority(v),
          description: archMap[lookup + '_desc'] ?? null
        }
      }),
      missions: (c.Missions || []).map(m => {
        const diff = m.difficulties?.find(d => d.type === 'CD_HARD') || m.difficulties?.find(d => d.type === 'CD_NORMAL') || m.difficulties?.[0];
        const devLookup = diff?.deviation ? (CONQUEST_OVERRIDES[diff.deviation.toLowerCase()] || diff.deviation).toLowerCase() : null;
        return {
          missionType: resolveMissionType(m.missionType, dict, ERg),
          faction: resolveNode(m.faction, dict, ERg),
          deviation: diff?.deviation ? {
            name: archMap[devLookup] ?? resolvePriority(diff.deviation),
            description: archMap[devLookup + '_desc'] ?? null
          } : null,
          risks: (diff?.risks || []).map(r => {
            const rLookup = (CONQUEST_OVERRIDES[r.toLowerCase()] || r).toLowerCase()
            return {
              name: archMap[rLookup] ?? resolvePriority(r),
              description: archMap[rLookup + '_desc'] ?? null
            }
          })
        };
      })
    })),

    circuit: (raw.EndlessXpChoices || []).map(c => {
      const cat = (c.Category || '').toUpperCase()
      const isHard = cat.includes('HARD')
      return {
        category: isHard ? 'Steel Path' : 'Normal',
        choices: (c.Choices || []).map(choice => resolveItemName(choice, dict, uniqueNameToName))
      }
    }),

    dailyDeals: (raw.DailyDeals || []).map(d => ({
      item: resolveItemName(d.StoreItem, dict, uniqueNameToName),
      uniqueName: d.StoreItem,
      expiry: d.Expiry,
      discount: d.Discount,
      originalPrice: d.OriginalPrice,
      salePrice: d.SalePrice,
      total: d.AmountTotal,
      sold: d.AmountSold
    })),

    // Alerts
    alerts: (raw.Alerts || []).map(a => ({
      id: a._id?.$oid || a._id,
      node: resolveNode(a.MissionInfo?.location, dict, ERg),
      missionType: resolveMissionType(a.MissionInfo?.missionType, dict, ERg),
      faction: resolveNode(a.MissionInfo?.faction, dict, ERg),
      minLevel: a.MissionInfo?.minEnemyLevel,
      maxLevel: a.MissionInfo?.maxEnemyLevel,
      rewardText: resolveRewardText(a.MissionInfo?.missionReward, dict, ERg, uniqueNameToName),
      expiry: a.Expiry,
      activation: a.Activation
    })),

    // Events / Operations (from Goals)
    events: (raw.Goals || []).map(g => ({
      id: g._id?.$oid || g._id,
      name: g.Desc ? resolvePriority(g.Desc) : (g.Tag ? resolvePriority(g.Tag) : 'Operation'),
      description: g.ToolTip ? resolvePriority(g.ToolTip) : '',
      factions: (g.Factions || []).map(f => resolveNode(f, dict, ERg)),
      node: g.Node ? resolveNode(g.Node, dict, ERg) : '',
      scoreVar: g.ScoreVarName,
      targetScore: g.VictoryThreshold,
      currentScore: g.Count,
      percent: Math.min(100, Math.max(0, (g.Count / g.VictoryThreshold) * 100)),
      rewards: (g.RewardTierItems || []).map(rt => resolveRewardText(rt, dict, ERg, uniqueNameToName)),
      mainReward: resolveRewardText(g.Reward, dict, ERg, uniqueNameToName),
      expiry: g.Expiry,
      activation: g.Activation
    })),

    // Global Boosters (from GlobalUpgrades)
    globalBoosters: (raw.GlobalUpgrades || []).map(u => {
      const typeMap = {
        'GAMEPLAY_KILL_XP_AMOUNT': 'Affinity Booster',
        'GAMEPLAY_MONEY_PICKUP_AMOUNT': 'Credit Booster',
        'GAMEPLAY_PICKUP_AMOUNT': 'Resource Booster'
      }
      return {
        name: typeMap[u.UpgradeType] || splitPascal(u.UpgradeType.replace('GAMEPLAY_', '')),
        expiry: u.ExpiryDate || u.Expiry,
        activation: u.Activation
      }
    }),

    // Baro Ki'Teer (VoidTraders)
    voidTrader: (() => {
      const t = raw.VoidTraders?.[0]
      if (!t) return null
      const actMs = t.Activation?.$date?.$numberLong
        ? parseInt(t.Activation.$date.$numberLong, 10)
        : (t.Activation ? new Date(t.Activation).getTime() : 0)
      const expMs = t.Expiry?.$date?.$numberLong
        ? parseInt(t.Expiry.$date.$numberLong, 10)
        : (t.Expiry ? new Date(t.Expiry).getTime() : 0)
      return {
        node: resolveNode(t.Node, dict, ERg),
        activation: t.Activation,
        expiry: t.Expiry,
        active: actMs > 0 && Date.now() >= actMs && (expMs === 0 || Date.now() < expMs),
        inventory: (t.Manifest || []).map(item => ({
          item: resolveItemName(item.ItemType, dict, uniqueNameToName),
          uniqueName: item.ItemType,
          ducats: item.PrimePrice ?? 0,
          credits: item.RegularPrice ?? 0,
        }))
      }
    })(),

    cetusCycle: parseCetusCycle(raw),
    vallisCycle: parseVallisCycle(raw),
    cambionCycle: parseCambionCycle(raw),
    earthCycle: parseEarthCycle(raw),
    zarimanCycle: parseZarimanCycle(raw, bountyCycle),
    duviriCycle: parseDuviriCycle(raw)
  }
}