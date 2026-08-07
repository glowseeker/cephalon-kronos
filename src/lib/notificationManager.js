import { resolveChallenge, resolveMissionType, resolveNode, cleanBountyName, resolveBountyTitle, MAPPING_TYPES } from './warframeUtils.js'

// Reverse map: English display name → MT_ code(s), built once at module load.
const EN_NAME_TO_CODES = {}
for (const [code, enName] of Object.entries(MAPPING_TYPES)) {
  if (!enName) continue
  if (code.startsWith('MT_') || /^[A-Z_]+$/.test(code)) {
    (EN_NAME_TO_CODES[enName.toLowerCase()] ??= []).push(code)
  }
}

/**
 * Locale-independent mission-type match. `localized` is the display name as
 * resolved through the game dict (e.g. German "Überleben"); `option` is the
 * English filter value picked in the UI (e.g. "Survival"). We also compare
 * the option against the English display names of the same MT_ codes, so a
 * filter configured in English keeps matching in any game locale.
 */
export function missionTypeMatches(localized, option, dict, ERg) {
  if (!localized || !option) return false
  const opt = option.toLowerCase()
  if (localized.toLowerCase().includes(opt)) return true
  const codes = EN_NAME_TO_CODES[opt] || []
  for (const code of codes) {
    const loc = resolveMissionType(code, dict, ERg)
    if (loc && loc.toLowerCase().includes(opt)) return true
  }
  return false
}
const TRIGGER_DEFINITIONS = [
  {
    id: 'fissure',
    label: 'Void Fissure',
    labelKey: 'ui.dashboard.void_fissures',
    columns: [
      {
        key: 'difficulties', label: 'Difficulty', labelKey: 'ui.notif_mgr.col_difficulty', type: 'multi-select', options: [
          { value: 'normal', label: 'Normal', labelKey: 'ui.notif_mgr.opt_normal' },
          { value: 'steel_path', label: 'Steel Path', labelKey: 'ui.dashboard.steel_path' },
        ]
      },
      {
        key: 'tiers', label: 'Tiers', labelKey: 'ui.notif_mgr.col_tiers', type: 'multi-select', options: [
          'Lith', 'Meso', 'Neo', 'Axi', 'Requiem', 'Omnia',
        ].map(v => ({ value: v, label: v, labelKey: `ui.notif_mgr.tier_${v.toLowerCase()}` }))
      },
      {
        key: 'missionTypes', label: 'Mission Types', labelKey: 'ui.notif_mgr.col_mission_types', type: 'multi-select', options: [
          'Extermination', 'Capture', 'Survival', 'Defense', 'Interception',
          'Sabotage', 'Rescue', 'Spy', 'Mobile Defense', 'Disruption',
          'Void Flood', 'Void Cascade', 'Void Armageddon',
        ].map(v => ({ value: v, label: v, labelKey: `ui.notif_mgr.mtype_${v.toLowerCase().replace(/[^a-z]+/g, '_')}` }))
      },
    ],
    defaultConfig: { difficulties: ['normal', 'steel_path'], tiers: [], missionTypes: [] },
  },
  {
    id: 'arbitration',
    label: 'Arbitration',
    labelKey: 'ui.dashboard.arbitration',
    columns: [
      {
        key: 'grades', label: 'Grade', labelKey: 'ui.notif_mgr.col_grade', type: 'multi-select', options: [
          { value: 'S', label: 'S-Tier', labelKey: 'ui.notif_mgr.opt_s_tier' },
          { value: 'A', label: 'A-Tier', labelKey: 'ui.notif_mgr.opt_a_tier' },
          { value: 'B', label: 'B-Tier', labelKey: 'ui.notif_mgr.opt_b_tier' },
          { value: 'C', label: 'C-Tier', labelKey: 'ui.notif_mgr.opt_c_tier' },
          { value: 'D', label: 'D-Tier', labelKey: 'ui.notif_mgr.opt_d_tier' },
          { value: 'F', label: 'F-Tier', labelKey: 'ui.notif_mgr.opt_f_tier' },
        ]
      },
      { key: 'advance', label: 'Alert before (min)', labelKey: 'ui.notif_mgr.col_alert_before', type: 'number', default: 30 },
    ],
    defaultConfig: { grades: ['S'], advance: 30 },
  },
  {
    id: 'void_traces',
    label: 'Void Traces Capped',
    labelKey: 'ui.notif_mgr.trig_void_traces',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', labelKey: 'ui.notif_mgr.col_cooldown', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'chat',
    label: 'Incoming Messages',
    labelKey: 'ui.notif_mgr.trig_chat',
    columns: [
      { key: '', label: 'Will only show notifications when Warframe is not focused.', labelKey: 'ui.notif_mgr.chat_hint' },
    ],
    defaultConfig: {},
  },
  {
    id: 'syndicate',
    label: 'Syndicate Standing Capped',
    labelKey: 'ui.notif_mgr.trig_syndicate',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', labelKey: 'ui.notif_mgr.col_cooldown', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'syndicate_waste',
    label: 'Syndicate Standing Waste',
    labelKey: 'ui.notif_mgr.trig_syndicate_waste',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', labelKey: 'ui.notif_mgr.col_cooldown', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'foundry',
    label: 'Foundry Complete',
    labelKey: 'ui.notif_mgr.trig_foundry',
    columns: [
      { key: 'advance', label: 'Notify when remaining time is (minutes)', labelKey: 'ui.notif_mgr.col_advance', type: 'number', default: 5 },
    ],
    defaultConfig: { advance: 5 },
  },
  {
    id: 'mastery',
    label: 'Mastery Progress',
    labelKey: 'ui.notif_mgr.trig_mastery',
    columns: [
      { key: 'threshold', label: 'Threshold %', labelKey: 'ui.notif_mgr.col_threshold', type: 'number', default: 75 },
    ],
    defaultConfig: { threshold: 75 },
  },
  {
    id: 'checklist',
    label: 'Checklist Reminder',
    labelKey: 'ui.notif_mgr.trig_checklist',
    columns: [
      { key: 'taskFilter', label: 'Tasks', labelKey: 'ui.notif_mgr.col_tasks', type: 'checklist-tasks', placeholder: 'Filter tasks…' },
      { key: 'interval', label: 'Interval (min)', labelKey: 'ui.notif_mgr.col_interval', type: 'number', default: 60 },
    ],
    defaultConfig: { taskFilter: [], interval: 60 },
  },
  {
    id: 'sale',
    label: 'Wishlisted Item on Sale',
    labelKey: 'ui.notif_mgr.trig_sale',
    columns: [
      { key: 'cooldown', label: 'Cooldown (min)', labelKey: 'ui.notif_mgr.col_cooldown', type: 'number', default: 180 },
    ],
    defaultConfig: { cooldown: 180 },
  },
  {
    id: 'bounty',
    label: 'Bounty Available',
    labelKey: 'ui.dashboard.bounty',
    columns: [
      {
        key: 'syndicates', label: 'Syndicate', labelKey: 'ui.notif_mgr.col_syndicate', type: 'multi-select', options: [
          { value: 'ZarimanSyndicate', label: 'Zariman', labelKey: 'ui.dashboard.zariman' },
          { value: 'EntratiLabSyndicate', label: 'Cavia', labelKey: 'ui.dashboard.cavia' },
          { value: 'HexSyndicate', label: 'Hex', labelKey: 'ui.dashboard.hex' },
          { value: 'CetusSyndicate', label: 'Cetus', labelKey: 'ui.dashboard.cetus' },
          { value: 'EntratiSyndicate', label: 'Deimos', labelKey: 'ui.dashboard.deimos' },
          { value: 'SolarisSyndicate', label: 'Vallis', labelKey: 'ui.dashboard.orb_vallis' },
        ]
      },
      {
        key: 'missionTypes', label: 'Mission Types', labelKey: 'ui.notif_mgr.col_mission_types', type: 'multi-select', options: [
          'Extermination', 'Capture', 'Survival', 'Defense', 'Interception',
          'Sabotage', 'Rescue', 'Spy', 'Mobile Defense', 'Disruption',
          'Void Flood', 'Void Cascade', 'Void Armageddon',
          'Assassination', 'Excavation',
        ].map(v => ({ value: v, label: v, labelKey: `ui.notif_mgr.mtype_${v.toLowerCase().replace(/[^a-z]+/g, '_')}` }))
      },
    ],
    defaultConfig: { syndicates: [], missionTypes: [] },
  },
]

const TRIGGER_MAP = Object.fromEntries(TRIGGER_DEFINITIONS.map(t => [t.id, t]))

export function getTriggerDef(id) {
  return TRIGGER_MAP[id] || null
}

export function getAllTriggerDefs() {
  return TRIGGER_DEFINITIONS
}

export function getDefaultNotification(triggerId) {
  const def = getTriggerDef(triggerId)
  if (!def) return null
  return {
    id: crypto.randomUUID(),
    trigger: triggerId,
    enabled: true,
    config: { ...def.defaultConfig },
  }
}

export function evaluateNotifications(notifications, state) {
  const { inventoryData, worldstate, arbys, ERg, dict, ES, bountyCycle, t } = state
  if (!inventoryData) return []

  const results = []

  for (const notif of notifications) {
    if (!notif.enabled) continue

    switch (notif.trigger) {
      case 'fissure':
        evaluateFissure(notif, worldstate, results, t)
        break
      case 'arbitration':
        evaluateArbitration(notif, arbys, ERg, dict, results, t)
        break
      case 'void_traces':
        evaluateVoidTraces(notif, inventoryData, results, t)
        break
      case 'syndicate':
        evaluateSyndicate(notif, inventoryData, results, t)
        break
      case 'syndicate_waste':
        evaluateSyndicateWaste(notif, inventoryData, ES, results, t)
        break
      case 'foundry':
        evaluateFoundry(notif, inventoryData, results, t)
        break
      case 'mastery':
        evaluateMastery(notif, inventoryData, results, t)
        break
      case 'checklist':
        evaluateChecklist(notif, inventoryData, results, t)
        break
      case 'sale':
        evaluateSale(notif, inventoryData, worldstate, results, t)
        break
      case 'bounty':
        evaluateBounty(notif, state, results, t)
    }
  }

  return results
}

// Translate a notif message key, falling back to the key itself if no
// translator was provided (e.g. called outside the React tree).
const tr = (t, key, params) => (typeof t === 'function' ? t(key, params) : key)

function evaluateFissure(notif, worldstate, results, t) {
  const fissures = worldstate?.fissures || []
  const config = notif.config || {}
  const difficulties = config.difficulties || []
  const tiers = config.tiers || []
  const missionTypes = config.missionTypes || []

  for (const f of fissures) {
    if (difficulties.length > 0) {
      const isSteelPath = f.isHard
      const matchesDifficulty = difficulties.some(d =>
        (d === 'normal' && !isSteelPath) || (d === 'steel_path' && isSteelPath)
      )
      if (!matchesDifficulty) continue
    }
    if (tiers.length > 0 && !tiers.includes(f.tier)) continue
    if (missionTypes.length > 0 && !missionTypes.some(mt => missionTypeMatches(f.missionType, mt, {}, {}) || (f.missionTypeCode && missionTypeMatches(MAPPING_TYPES[f.missionTypeCode], mt, {}, {})))) continue

    results.push({
      notifId: notif.id,
      title: tr(t, 'ui.notif_mgr.msg_fissure_title', { tier: f.tier }),
      message: tr(t, 'ui.notif_mgr.msg_fissure_body', {
        mission: f.missionType,
        node: f.node,
        sp: f.isHard ? tr(t, 'ui.notif_mgr.sp_suffix', { sp: tr(t, 'ui.dashboard.steel_path') }) : '',
      }),
      image: 'IconRelic.png',
    })
  }
}

function evaluateArbitration(notif, arbys, ERg, dict, results, t) {
  if (!arbys || !ERg || Object.keys(ERg).length === 0) return

  const { getCurrentArby, getUpcomingArbies, ARBY_TIERS, resolveNode } = window.__KRONOS_NOTIF_HELPERS || {}
  if (!getCurrentArby || !getUpcomingArbies || !ARBY_TIERS || !resolveNode) return

  const grades = (notif.config?.grades || []).length > 0 ? notif.config.grades : ['S']
  const advance = (notif.config?.advance ?? 30) * 60 * 1000

  // Current S-tier arbitration
  const current = getCurrentArby(arbys, ERg, dict)
  if (current) {
    const grade = ARBY_TIERS[current.node] || 'F'
    if (grades.includes(grade)) {
      const remaining = current.ts + 3600000 - Date.now()
      const remainingMin = Math.max(0, Math.floor(remaining / 60000))
      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.msg_arby_active_title', { grade }),
        message: tr(t, 'ui.notif_mgr.msg_arby_active_body', {
          type: resolveNode(current.type, dict, ERg),
          node: resolveNode(current.node, dict, ERg),
          min: remainingMin,
        }),
        image: 'IconDashboard.png',
      })
    }
  }

  // Upcoming arbitration - fire if starting within the advance window
  const upcoming = getUpcomingArbies(arbys, ERg, dict, ARBY_TIERS, 10)
  const now = Date.now()
  for (const slot of upcoming) {
    if (!grades.includes(slot.grade)) continue
    const timeUntil = slot.ts - now
    if (timeUntil > 0 && timeUntil <= advance) {
      const startTime = new Date(slot.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.msg_arby_soon_title', { grade: slot.grade }),
        message: tr(t, 'ui.notif_mgr.msg_arby_soon_body', {
          type: resolveNode(slot.type, dict, ERg),
          node: resolveNode(slot.node, dict, ERg),
          time: startTime,
        }),
        image: 'IconDashboard.png',
      })
    }
  }
}

function evaluateVoidTraces(notif, inventoryData, results, t) {
  const { void_traces, void_traces_max } = inventoryData.account || {}
  if (void_traces && void_traces_max && void_traces >= void_traces_max) {
    results.push({
      notifId: notif.id,
      title: tr(t, 'ui.notif_mgr.trig_void_traces'),
      message: tr(t, 'ui.notif_mgr.msg_void_traces', { max: void_traces_max }),
      image: 'IconRelic.png',
    })
  }
}

function evaluateSyndicate(notif, inventoryData, results, t) {
  const RANK_CAPS = {
    5: 132000, 4: 99000, 3: 70000, 2: 44000, 1: 22000, 0: 5000,
    [-1]: -22000, [-2]: -44000,
  }
  const getCumulativePreviousCaps = (rank) => {
    if (rank <= 0) return 0
    if (rank >= 5) return 5000 + 22000 + 44000 + 70000 + 99000
    if (rank === 4) return 5000 + 22000 + 44000 + 70000
    if (rank === 3) return 5000 + 22000 + 44000
    if (rank === 2) return 5000 + 22000
    if (rank === 1) return 5000
    return 0
  }

  const MAIN_SYNDICATE_TAGS = new Set([
    'SteelMeridianSyndicate', 'PerrinSyndicate', 'ArbitersSyndicate',
    'CephalonSudaSyndicate', 'RedVeilSyndicate', 'NewLokaSyndicate',
  ])
  const MAX_SYNDICATE_RANK = 5
  const affiliations = inventoryData.Affiliations || []

  for (const aff of affiliations) {
    if (!MAIN_SYNDICATE_TAGS.has(aff.Tag)) continue
    const rank = aff.Title ?? 0
    const total = aff.Standing ?? 0
    const cap = RANK_CAPS[rank] ?? 22000
    const previousCaps = getCumulativePreviousCaps(rank)
    const earned = Math.max(0, total - previousCaps)
    if (rank === MAX_SYNDICATE_RANK && earned >= cap && cap > 0) {
      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.msg_syndicate_capped_title'),
        message: tr(t, 'ui.notif_mgr.msg_syndicate_capped_body', { syndicate: aff.Tag.replace('Syndicate', '') }),
        image: 'IconMastery.png',
      })
    }
  }
}

function evaluateSyndicateWaste(notif, inventoryData, ES, results, t) {
  const AFFILIATION_TAGS = {
    steel: 'SteelMeridianSyndicate', perrin: 'PerrinSyndicate',
    arbiters: 'ArbitersSyndicate', suda: 'CephalonSudaSyndicate',
    veil: 'RedVeilSyndicate', newloka: 'NewLokaSyndicate',
  }
  const pledgedTag = inventoryData.SupportedSyndicate
  const pledgedShortTag = Object.entries(AFFILIATION_TAGS).find(([, v]) => v === pledgedTag)?.[0]
  if (!pledgedShortTag || !ES) return

  const pledgedExportData = ES[pledgedTag]
  if (!pledgedExportData) return

  const exportKeyToShort = Object.fromEntries(Object.entries(AFFILIATION_TAGS).map(([k, v]) => [v, k]))
  const enemyShortTags = pledgedExportData.alignments
    ? Object.entries(pledgedExportData.alignments)
      .filter(([, v]) => v < 0)
      .map(([k]) => exportKeyToShort[k])
      .filter(Boolean)
    : []

  const affiliations = inventoryData.Affiliations || []
  const enemiesWithStanding = enemyShortTags
    .map(tag => {
      const affTag = AFFILIATION_TAGS[tag]
      const aff = affiliations.find(a => a.Tag === affTag)
      return aff && (aff.Standing ?? 0) > 0 ? tag : null
    })
    .filter(Boolean)

  if (enemiesWithStanding.length > 0) {
    const names = enemiesWithStanding.join(', ')
    results.push({
      notifId: notif.id,
      title: tr(t, 'ui.notif_mgr.msg_syndicate_risk_title'),
      message: tr(t, 'ui.notif_mgr.msg_syndicate_risk_body', {
        s: enemiesWithStanding.length > 1 ? 's' : '',
        names,
      }),
      image: 'IconMastery.png',
    })
  }
}

function evaluateFoundry(notif, inventoryData, results, t) {
  const recipes = inventoryData.foundry || []
  const advance = (notif.config?.advance ?? 5) * 60 // min → seconds
  const now = Date.now() / 1000
  for (const item of recipes) {
    if (!item.finishTime || item.finishTime <= now) continue
    const remaining = item.finishTime - now
    if (remaining > 0 && remaining <= advance) {
      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.trig_foundry'),
        message: tr(t, 'ui.notif_mgr.msg_foundry', { item: item.name }),
        image: item.image || 'IconFoundry.png',
      })
    }
  }
}

function evaluateMastery(notif, inventoryData, results, t) {
  const currentRank = inventoryData.account?.mastery_rank
  if (currentRank == null) return
  const threshold = notif.config?.threshold ?? 75
  const xpPercent = inventoryData.account?.mastery_next_percent ?? 0
  if (xpPercent >= threshold) {
    results.push({
      notifId: notif.id,
      title: tr(t, 'ui.notif_mgr.trig_mastery'),
      message: tr(t, 'ui.notif_mgr.msg_mastery', { pct: Math.round(xpPercent), rank: currentRank + 1 }),
      image: 'IconMastery.png',
    })
  }
}

function evaluateSale(notif, inventoryData, worldstate, results, t) {
  const wishlist = inventoryData.wishlist ?? []
  if (wishlist.length === 0) return
  const wishlistNames = new Set(wishlist.map(w => w.name?.toLowerCase()).filter(Boolean))

  const checkItem = (item, price, original, discount) => {
    if (!item) return
    const name = item.toLowerCase()
    for (const wlName of wishlistNames) {
      if (name.includes(wlName) || wlName.includes(name)) {
        results.push({
          notifId: notif.id,
          title: tr(t, 'ui.notif_mgr.trig_sale'),
          message: tr(t, 'ui.notif_mgr.msg_sale', { item, price, original }),
        })
        break
      }
    }
  }

  // Daily Deals (Darvo)
  for (const deal of worldstate?.dailyDeals ?? []) {
    checkItem(deal.item, deal.salePrice, deal.originalPrice, deal.discount)
  }

  // Market Flash Sales
  for (const sale of worldstate?.flashSales ?? []) {
    checkItem(sale.item, sale.salePrice, sale.originalPrice, sale.discount)
  }
}

function evaluateChecklist(notif, inventoryData, results, t) {
  const tasks = window.__checklistTasks || []
  if (tasks.length === 0) return

  const selectedIds = notif.config?.taskFilter || []
  const filtered = selectedIds.length > 0
    ? tasks.filter(t => selectedIds.includes(t.id))
    : tasks

  const interval = (notif.config?.interval || 60) * 60 * 1000
  const now = Date.now()

  for (const task of filtered) {
    const timeUntilReset = task.nextResetTime - now
    if (timeUntilReset > 0 && timeUntilReset <= interval) {
      const taskLabel = task.labelKey ? tr(t, task.labelKey) : task.label
      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.msg_checklist_due_title'),
        message: tr(t, 'ui.notif_mgr.msg_checklist_due_body', { task: taskLabel }),
        image: 'IconChecklist.png',
      })
    }
  }
}
const SYNDICATE_LABELS = {
  ZarimanSyndicate: 'Zariman',
  EntratiLabSyndicate: 'Cavia',
  HexSyndicate: 'Hex',
  CetusSyndicate: 'Cetus',
  EntratiSyndicate: 'Deimos',
  SolarisSyndicate: 'Vallis',
}

// Prefixes that appear as the first camelCase word in challenge filenames
const CHALLENGE_PREFIXES = new Set(['Vania', 'Hex', '1999', 'Venus', 'Deimos', 'Narmer'])
const SYNDICATE_PREFIXES = new Set(['Vania', 'Hex', '1999', 'Venus', 'Deimos', 'Narmer', 'Cetus'])

function challengeMissionType(challenge) {
  if (!challenge) return ''
  const fn = challenge.split('/').pop()
  const words = fn.replace(/([A-Z])/g, ' $1').trim().split(/\s+/)
  return words.find(w => !CHALLENGE_PREFIXES.has(w)) || words[0] || ''
}

function evaluateBounty(notif, state, results, t) {
  const { bountyCycle, worldstate, ERg, dict, EC } = state
  const config = notif.config || {}
  const syndicates = config.syndicates || []
  const missionTypes = config.missionTypes || []
  const skipPrefix = (s) => { const ws = s.split(/\s+/); return ws.find(w => !SYNDICATE_PREFIXES.has(w)) || ws[0] || '' }

  // ── bounty-cycle data (Zariman, Cavia, Hex) ─────────────────────────────
  if (bountyCycle?.bounties) {
    for (const [key, bounties] of Object.entries(bountyCycle.bounties)) {
      if (syndicates.length > 0 && !syndicates.includes(key)) continue
      const synLabel = SYNDICATE_LABELS[key] || key

      for (const b of bounties) {
        const name = b.challenge ? resolveChallenge(b.challenge, dict, EC) : tr(t, 'ui.dashboard.bounty')

        let mType = ''
        if (b.node && ERg?.[b.node]) {
          const entry = ERg[b.node]
          mType = resolveMissionType(entry.missionName || entry.missionType || '', dict, ERg)
        }
        if (!mType) {
          mType = resolveMissionType(challengeMissionType(b.challenge), dict, ERg)
        }
        if (missionTypes.length > 0 && !missionTypes.some(mt => missionTypeMatches(mType, mt, dict, ERg))) continue

        const node = b.node ? resolveNode(b.node, dict, ERg) || '' : ''
        results.push({
          notifId: notif.id,
          title: tr(t, 'ui.notif_mgr.msg_bounty_title', { syn: synLabel }),
          message: tr(t, 'ui.notif_mgr.msg_bounty_body', {
            name,
            mtype: mType ? tr(t, 'ui.notif_mgr.msg_bounty_mtype', { mtype: mType }) : '',
            node: node ? tr(t, 'ui.notif_mgr.msg_bounty_node', { node }) : '',
          }),
          image: 'IconMission.png',
        })
      }
    }
  }

  // ── worldstate SyndicateMissions (Cetus, Deimos, Vallis) ────────────────
  if (!worldstate?.SyndicateMissions) return
  for (const sm of worldstate.SyndicateMissions) {
    if (!['CetusSyndicate', 'EntratiSyndicate', 'SolarisSyndicate'].includes(sm.Tag)) continue
    if (syndicates.length > 0 && !syndicates.includes(sm.Tag)) continue
    const synLabel = SYNDICATE_LABELS[sm.Tag] || sm.Tag

    for (const job of (sm.Jobs || [])) {
      const fn = (job.jobType || '').split('/').pop()
      if (!fn) continue
      const name = resolveBountyTitle(job.jobType, dict) || cleanBountyName(fn) || tr(t, 'ui.dashboard.bounty')
      const mType = resolveMissionType(challengeMissionType(fn), dict, ERg) || skipPrefix(name)
      if (missionTypes.length > 0 && !missionTypes.some(mt => missionTypeMatches(mType, mt, dict, ERg))) continue

      results.push({
        notifId: notif.id,
        title: tr(t, 'ui.notif_mgr.msg_bounty_title', { syn: synLabel }),
        message: tr(t, 'ui.notif_mgr.msg_bounty_body', {
          name,
          mtype: mType ? tr(t, 'ui.notif_mgr.msg_bounty_mtype', { mtype: mType }) : '',
          node: '',
        }),
        image: 'IconMission.png',
      })
    }
  }
}
