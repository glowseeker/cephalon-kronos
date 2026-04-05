/**
 * Mastery.jsx
 *
 * Tracks the user's Mastery Rank (MR) progress, starchart completion, and
 * equipment leveling status.
 *
 * DATA FLOW
 * ─────────────────────────────────────────
 * 1. MonitoringContext provides the full inventory and account stats.
 * 2. This file calculates cumulative Mastery XP based on item ranks and
 *    compares it against the official Warframe MR thresholds.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Real-time progress bar towards the next Mastery Rank.
 * - Breakdown of XP sources (Warframes vs Weapons vs Starchart).
 * - "Incomplete" list of items that still need to be mastered.
 * - Dynamic rank icons loaded via Tauri's `get_mastery_icons_path()`.
 */
import { useState, useEffect } from 'react'
import { PageLayout, Card, MonitorState } from '../components/UI'
import { Trophy, X, CheckCircle2, Circle } from 'lucide-react'
import { useMonitoring } from '../contexts/MonitoringContext'
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'

// Each MR1–30 rank costs a flat 75,000 XP. Cumulative at MR30 = 2,250,000.
// Legendary ranks (MR31+) each cost 147,500 XP.
// Verified: user at MR30 with 2,336,733 XP needs 60,767 → LR1 threshold = 2,397,500 ✓
const MR_RANK_COST = 75000
const LR_RANK_COST = 147500
const MR30_CUM = 30 * MR_RANK_COST   // 2,250,000

// MR title lookup - wiki Module:MasteryRank
const MR_CLASSES = ['Unranked', 'Initiate', 'Novice', 'Disciple', 'Seeker', 'Hunter', 'Eagle', 'Tiger', 'Dragon', 'Sage', 'Master']
const RANK_NAMES = [
  "Unranked", "Initiate", "SilverInitiate", "GoldInitiate",
  "Novice", "SilverNovice", "GoldNovice",
  "Disciple", "SilverDisciple", "GoldDisciple",
  "Seeker", "SilverSeeker", "GoldSeeker",
  "Hunter", "SilverHunter", "GoldHunter",
  "Eagle", "SilverEagle", "GoldEagle",
  "Tiger", "SilverTiger", "GoldTiger",
  "Dragon", "SilverDragon", "GoldDragon",
  "Sage", "SilverSage", "GoldSage",
  "Master", "MiddleMaster", "GrandMaster"
];

function getMRTitle(rank) {
  if (rank === 0) return 'Unranked'
  if (rank === 30) return 'True Master'
  if (rank < 30) return MR_CLASSES[Math.ceil(rank / 3)] ?? 'Master'
  return `Legendary ${rank - 30}`
}

function getMRIcon(rank, basePath) {
  if (!basePath) return '';
  let filename = '';
  if (rank <= 30) {
    const name = RANK_NAMES[rank] || '';
    filename = `Rank${rank.toString().padStart(2, '0')}${name}.png`;
  } else {
    filename = `Rank${rank}.png`;
  }
  return convertFileSrc(`${basePath}/${filename}`);
}

function getXPForRank(rank) {
  if (rank <= 0) return 0
  if (rank <= 30) return rank * MR_RANK_COST
  return MR30_CUM + (rank - 30) * LR_RANK_COST
}
function getXPNeededFor(rank) {
  if (rank <= 0) return 0
  if (rank <= 30) return MR_RANK_COST
  return LR_RANK_COST
}

export default function Mastery() {
  const { inventoryData } = useMonitoring()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [iconsPath, setIconsPath] = useState('');
  const [hideNonMastery, setHideNonMastery] = useState(false)

  useEffect(() => {
    invoke('get_mastery_icons_path').then(setIconsPath).catch(console.error);
  }, []);

  if (!inventoryData) {
    return (
      <PageLayout title="Mastery">
        <MonitorState className="py-20" />
      </PageLayout>
    )
  }

  const { account, intrinsics, starchart } = inventoryData

  const getStats = (cat) => {
    let items = []
    if (cat === 'archgun') {
      items = (inventoryData.archweapons ?? []).filter(i => i.weapon_type === 'archgun')
    } else if (cat === 'archmelee') {
      items = (inventoryData.archweapons ?? []).filter(i => i.weapon_type === 'archmelee')
    } else if (cat === 'kitguns') {
      items = inventoryData.kitgunChambers ?? []
    } else if (cat === 'zaws') {
      items = inventoryData.zawStrikes ?? []
    } else if (cat === 'moas') {
      items = inventoryData.moaHeads ?? []
    } else if (cat === 'hounds') {
      items = inventoryData.houndHeads ?? []
    } else if (cat === 'companion_weapons') {
      items = inventoryData.companion_weapons ?? []
    } else if (cat === 'robotics') {
      // Display-only aggregate - excluded from totalXP to avoid double-counting
      items = [
        ...(inventoryData.sentinels ?? []),
        ...(inventoryData.moaHeads ?? []),
        ...(inventoryData.houndHeads ?? []),
      ]
    } else {
      items = inventoryData[cat] ?? []
    }
    const mastered = items.filter(i => i.mastered).length
    const total = items.length
    const earnedXP = items.reduce((s, i) => s + (i.mastery_xp || 0), 0)
    return { mastered, total, earnedXP, items, catKey: cat }
  }

  const itemCompletion = [
    { label: 'Warframe', ...getStats('warframes') },
    { label: 'Primary', ...getStats('primary') },
    { label: 'Secondary', ...getStats('secondary') },
    { label: 'Melee', ...getStats('melee') },
    { label: 'Kitgun', ...getStats('kitguns') },
    { label: 'Zaw', ...getStats('zaws') },
    { label: 'Amp', ...getStats('amps') },
    { label: 'Sentinel', ...getStats('sentinels') },
    { label: 'Sentinel Weapon', ...getStats('companion_weapons') },
    { label: 'MOA', ...getStats('moas') },
    { label: 'Hound', ...getStats('hounds') },
    { label: 'Beast', ...getStats('beasts') },
    { label: 'Robotic', ...getStats('robotics'), isSummary: true },
    { label: 'Archwing', ...getStats('archwings') },
    { label: 'Archgun', ...getStats('archgun') },
    { label: 'Archmelee', ...getStats('archmelee') },
    { label: 'Necramech', ...getStats('necramechs') },
    { label: 'Plexus', ...getStats('plexus') },
    { label: 'K-Drive', ...getStats('kdrives') },
  ]

  const rjIntrinsics = (intrinsics ?? []).filter(i => i.name.startsWith('Railjack'))
  const drifterIntrinsics = (intrinsics ?? []).filter(i => i.name.startsWith('Drifter'))

  const intrinsicCompletion = [
    {
      label: 'Railjack Intrinsic',
      mastered: rjIntrinsics.reduce((s, i) => s + i.rank, 0),
      total: 50,
      earnedXP: rjIntrinsics.reduce((s, i) => s + i.mastery_xp, 0),
      items: rjIntrinsics,
      type: 'intrinsic'
    },
    {
      label: 'Drifter Intrinsic',
      mastered: drifterIntrinsics.reduce((s, i) => s + i.rank, 0),
      total: 40,
      earnedXP: drifterIntrinsics.reduce((s, i) => s + i.mastery_xp, 0),
      items: drifterIntrinsics,
      type: 'intrinsic'
    },
  ]

  const starchartData = inventoryData.starchart ?? {}
  const starchartTotal = starchartData.total ?? 0
  const starchartCompletion = [
    {
      label: 'Starchart',
      mastered: starchartData.origin ?? 0,
      total: starchartTotal,
      earnedXP: starchartData.origin_xp ?? 0,
      type: 'starchart',
      nodes: starchartData.nodes ?? [],
      nodeType: 'origin',
    },
    {
      label: 'The Steel Path',
      mastered: starchartData.steel_path ?? 0,
      total: starchartTotal,
      earnedXP: starchartData.steel_path_xp ?? 0,
      type: 'starchart',
      nodes: starchartData.nodes ?? [],
      nodeType: 'sp',
    },
  ]

  const totalXP = [
    ...itemCompletion.filter(i => !i.isSummary),  // exclude Robotic aggregate (double-count)
    ...intrinsicCompletion,
    ...starchartCompletion,
  ].reduce((s, b) => s + b.earnedXP, 0)

  const currentRank = account.mastery_rank
  const isLegendary = currentRank > 30
  const nextRank = currentRank + 1
  const xpAtCurrent = getXPForRank(currentRank)
  const xpNeeded = getXPNeededFor(nextRank)
  const xpIntoRank = Math.max(0, totalXP - xpAtCurrent)
  const xpUntilNext = Math.max(0, xpNeeded - xpIntoRank)
  const progress = xpNeeded > 0 ? Math.min(100, (xpIntoRank / xpNeeded) * 100) : 100
  const isRankUpReady = progress >= 100
  const currentTitle = getMRTitle(currentRank)
  const nextTitle = getMRTitle(nextRank)

  const Section = ({ title, items, gridCols = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-kronos-accent uppercase tracking-widest opacity-70">
        {title}
      </h3>
      <div className={`grid ${gridCols} gap-2`}>
        {items.map(item => (
          <div
            key={item.label}
            onClick={() => setSelectedCategory(item)}
            className={`rounded p-2 flex flex-col items-center justify-center text-center transition-all duration-200 hover:glow-hover cursor-pointer active:scale-95 border-2 ${item.mastered < item.total
              ? 'bg-kronos-panel/10 border-dashed border-kronos-accent opacity-100'
              : 'bg-kronos-panel border-kronos-panel/40'
              }`}
          >
            <span className="text-[10px] text-kronos-dim uppercase font-bold truncate w-full px-1">
              {item.label}
            </span>
            <span className="text-sm font-mono font-bold text-kronos-accent">
              {item.mastered}/{item.total}
            </span>
            {item.earnedXP > 0 && (
              <span className="text-[10px] text-kronos-dim uppercase font-bold truncate w-full px-1">
                ({item.earnedXP.toLocaleString()} XP)
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <PageLayout title="Mastery">
      <div className="space-y-8">
        {/* MR card */}
        <Card glow className="p-0 overflow-hidden border-kronos-accent/30 shadow-2xl">
          {/* Rank-up banner - shown when ready*/}
          {isRankUpReady && (
            <div className="flex flex-col md:flex-row relative overflow-hidden bg-gradient-to-br from-kronos-accent/20 via-kronos-accent/5 to-transparent min-h-[400px]">
              {/* Content on the left */}

              <div className="relative z-10 flex-1 p-10 flex flex-col items-start text-left">
                <div className="flex items-center gap-12 mb-8">
                  <div className="relative">
                    <img src={getMRIcon(currentRank, iconsPath)} alt="" className="w-20 h-20 opacity-40 grayscale contrast-125" />
                    <p className="text-[10px] text-kronos-dim uppercase font-black mt-2">Current: {currentRank}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-kronos-accent to-transparent mb-1" />
                    <div className="text-kronos-accent font-black text-sm">READY</div>
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-kronos-accent to-transparent mt-1" />
                  </div>

                  <div className="relative">
                    <img src={getMRIcon(nextRank, iconsPath)} alt="" className="w-32 h-32 drop-shadow-[0_0_30px_rgba(var(--color-accent-rgb),0.4)]" />
                    <p className="text-xs text-kronos-accent uppercase font-black mt-2 tracking-[0.2em]">Next: {nextRank}</p>
                  </div>
                </div>

                <h2 className="text-4xl font-black text-kronos-text uppercase tracking-tighter mb-2 max-w-lg leading-none">
                  Mastery Rank Up Available
                </h2>
                <p className="text-xl text-kronos-accent font-bold italic mb-6">
                  Advance to {nextTitle}
                </p>

                <div className="text-sm text-kronos-dim max-w-sm leading-relaxed border-t border-kronos-accent/10 pt-6">
                  You have accumulated enough mastery to qualify for the rank up test.
                  Visit Teshin at any relay to prove your worth.
                </div>
              </div>

              {/* Teshin Image on the right - transparent png */}
              <div className="relative w-full md:w-[45%] h-80 md:h-[450px] overflow-visible">
                <img
                  src="/teshin.png"
                  alt="Teshin"
                  className="absolute bottom-0 right-0 w-full h-full object-contain object-bottom pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* Progress card - visible only when NOT ready for rank up */}
          {!isRankUpReady && (
            <div className="bg-gradient-to-br from-kronos-accent/10 via-transparent to-transparent p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <img
                      src={getMRIcon(currentRank, iconsPath)}
                      alt=""
                      className="w-20 h-20 object-contain relative z-10 drop-shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.6)]"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-kronos-accent uppercase font-black tracking-[0.3em] mb-1 opacity-80">Current Rank</div>
                    <h2 className="text-4xl font-black text-kronos-text leading-none tracking-tight">
                      {isLegendary ? `Legendary ${currentRank - 30}` : `Mastery Rank ${currentRank}`}
                    </h2>
                    <p className="text-lg text-kronos-dim mt-1 font-bold italic tracking-wider flex items-center gap-2">
                      {currentTitle}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end">
                  <div className="text-[10px] text-kronos-accent uppercase font-black tracking-[0.3em] mb-2 opacity-80">Next Rank</div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-black text-kronos-accent uppercase tracking-wide leading-none">
                        {isLegendary ? `Legendary ${nextRank - 30}` : `MR ${nextRank}`}
                      </div>
                      <div className="text-[10px] text-kronos-dim uppercase font-bold tracking-tighter mt-1 opacity-60">
                        {nextTitle}
                      </div>
                    </div>
                    <img src={getMRIcon(nextRank, iconsPath)} alt="" className="w-12 h-12 drop-shadow-[0_0_10px_rgba(var(--color-accent-rgb),0.2)]" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative pt-10 pb-2">
                  {/* Floating Label (Top) */}
                  <div
                    className="absolute top-0 flex flex-col items-center -translate-x-1/2 transition-all duration-1000 ease-out"
                    style={{ left: `${progress}%` }}
                  >
                    <div className="text-xs font-black text-kronos-accent uppercase whitespace-nowrap bg-kronos-bg/80 backdrop-blur-md px-3 py-1 rounded border border-kronos-accent/30 mb-1 shadow-lg">
                      {xpIntoRank.toLocaleString()} mastery | {xpUntilNext.toLocaleString()} left
                    </div>
                    <div className="w-px h-3 bg-kronos-accent/60" />
                  </div>

                  {/* Progress Track */}
                  <div className="bg-kronos-bg/60 h-7 rounded-full border border-white/5 overflow-hidden shadow-inner relative flex items-center">
                    <div
                      className="absolute inset-y-0 left-0 bg-kronos-accent transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.5)]"
                      style={{ width: `${Math.max(0, progress)}%` }}
                    />

                    {/* Percentage Label inside Bar */}
                    <div
                      className={`absolute inset-y-0 flex items-center px-3 transition-all duration-1000 ease-out font-black text-sm pointer-events-none z-20 ${progress > 20 ? 'text-kronos-bg' : 'text-kronos-accent'
                        }`}
                      style={{
                        left: `${progress}%`,
                        transform: progress > 20 ? 'translateX(-100%)' : 'translateX(0%)'
                      }}
                    >
                      {progress.toFixed(1)}%
                    </div>

                    {/* Graduation marks */}
                    {[25, 50, 75].map(p => (
                      <div key={p} className="absolute top-0 bottom-0 w-px bg-kronos-bg/80 z-10" style={{ left: `${p}%` }} />
                    ))}
                  </div>

                  {/* Floor/Ceiling Labels */}
                  <div className="flex justify-between mt-3 px-1 items-center">
                    <span className="text-sm text-kronos-dim font-black uppercase tracking-widest opacity-60">{xpAtCurrent.toLocaleString()}</span>
                    <span className="text-sm text-kronos-dim font-black uppercase tracking-widest opacity-60">{getXPForRank(nextRank).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-8">
          <Section title="Item Completion" items={itemCompletion} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Section title="Intrinsic Completion" items={intrinsicCompletion} gridCols="grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2" />
            <Section title="Starchart Completion" items={starchartCompletion} gridCols="grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-2" />
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-kronos-bg/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedCategory(null)}
        >
          <Card
            glow
            className="w-full max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden shadow-2xl border border-kronos-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-kronos-panel flex items-center justify-between bg-kronos-panel/20">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-kronos-accent">{selectedCategory.label} Details</h3>
                <p className="text-sm text-kronos-dim">
                  {selectedCategory.mastered} / {selectedCategory.total} completed
                </p>
              </div>

              <div className="flex items-center gap-6">
                {selectedCategory.type === 'starchart' && (
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 ${hideNonMastery
                        ? 'bg-kronos-accent border-kronos-accent'
                        : 'border-kronos-dim group-hover:border-kronos-accent'
                        }`}
                      onClick={() => setHideNonMastery(!hideNonMastery)}
                    >
                      {hideNonMastery && <CheckCircle2 size={12} className="text-kronos-bg" />}
                    </div>
                    <span className="text-[10px] font-black uppercase text-kronos-dim group-hover:text-kronos-accent tracking-widest select-none">
                      Hide Non-Mastery
                    </span>
                  </label>
                )}

                <button
                  onClick={() => setSelectedCategory(null)}
                  className="p-2 hover:bg-kronos-panel rounded-full transition-colors text-kronos-dim hover:text-kronos-text"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
              {selectedCategory.type === 'starchart' ? (
                (() => {
                  let nodes = selectedCategory.nodes ?? []
                  if (hideNonMastery) {
                    nodes = nodes.filter(n => n.mastery_xp > 0)
                  }

                  if (!nodes.length) return (
                    <div className="text-center py-8 text-kronos-dim italic">
                      No mastery-eligible nodes found.
                    </div>
                  )
                  const bySystem = {}
                  nodes.forEach(n => {
                    if (!bySystem[n.system]) bySystem[n.system] = []
                    bySystem[n.system].push(n)
                  })
                  return Object.entries(bySystem).sort(([a], [b]) => a.localeCompare(b)).map(([sys, sysNodes]) => {
                    const done = selectedCategory.nodeType === 'sp'
                      ? sysNodes.filter(n => n.sp_played).length
                      : sysNodes.filter(n => n.played).length
                    return (
                      <div key={sys}>
                        <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mt-4 mb-1">
                          {sys} <span className="text-kronos-dim font-normal normal-case">({done}/{sysNodes.length})</span>
                        </p>
                        {sysNodes.sort((a, b) => a.name.localeCompare(b.name)).map(node => {
                          const completed = selectedCategory.nodeType === 'sp' ? node.sp_played : node.played
                          const hasXP = node.mastery_xp > 0
                          return (
                            <div key={node.tag} className={`flex items-center justify-between p-2 rounded bg-kronos-panel/10 border border-kronos-panel/20 mb-1 ${completed ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-2">
                                {completed
                                  ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                                  : <Circle size={14} className="text-kronos-dim flex-shrink-0" />}
                                <span className={`text-xs font-medium ${completed ? 'text-kronos-dim line-through' : 'text-kronos-text'}`}>
                                  {node.name}
                                </span>
                                {node.isJunction && (
                                  <span className="text-[8px] bg-kronos-accent/20 text-kronos-accent px-1 rounded font-black uppercase tracking-tighter">
                                    Junction
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] font-mono text-right">
                                {hasXP ? (
                                  <span className="text-kronos-accent">+{node.mastery_xp.toLocaleString()} XP</span>
                                ) : (
                                  <span className="text-kronos-dim/30 italic uppercase text-[9px]">Non-Mastery</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()
              ) : selectedCategory.items && selectedCategory.items.length > 0 ? (
                selectedCategory.items
                  .slice()
                  .sort((a, b) => (a.mastered === b.mastered ? a.name.localeCompare(b.name) : a.mastered ? 1 : -1))
                  .map((item, idx) => (
                    <div
                      key={item.unique_name || item.name || idx}
                      className={`flex items-center justify-between p-3 rounded bg-kronos-panel/10 border border-kronos-panel/20 ${item.mastered ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {item.mastered ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <Circle size={18} className="text-kronos-dim" />
                        )}
                        <span className={`font-medium ${item.mastered ? 'text-kronos-dim line-through decoration-kronos-panel' : 'text-kronos-text'}`}>
                          {item.name}
                        </span>
                      </div>
                      {/* MODIFIED: Now shows rank and XP */}
                      <div className="text-xs font-mono text-kronos-dim text-right">
                        <div>Rank {item.rank || 0}</div>
                        <div className="text-[10px] opacity-75">
                          {item.mastery_xp ? `${item.mastery_xp.toLocaleString()} XP` : '0 XP'}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-kronos-dim italic">
                  No items found in this category.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  )
}
