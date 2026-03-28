import { useState } from 'react'
import { Search } from 'lucide-react'
import { PageLayout, Input, Card, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'rifle', label: 'Rifle' },
  { id: 'pistol', label: 'Pistol' },
  { id: 'melee', label: 'Melee' },
  { id: 'shotgun', label: 'Shotgun' },
  { id: 'sniper', label: 'Sniper' },
  { id: 'kitgun', label: 'Kitgun' },
  { id: 'zaw', label: 'Zaw' },
  { id: 'archgun', label: 'Archgun' },
]

const STATE_TABS = [
  { id: 'all', label: 'All States' },
  { id: 'unveiled', label: 'Unveiled' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'veiled', label: 'Veiled' },
]

export default function Rivens() {
  const { inventoryData } = useMonitoring()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeState, setActiveState] = useState('all')

  const allRivens = inventoryData?.rivens ?? []

  const filtered = allRivens.filter(r => {
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchType = activeType === 'all' || (r.weapon_type && r.weapon_type.toLowerCase() === activeType.toLowerCase())

    let matchState = true
    if (activeState === 'unveiled') matchState = !r.veiled && !r.challenge
    if (activeState === 'challenge') matchState = !!r.challenge
    if (activeState === 'veiled') matchState = !!r.veiled

    return matchSearch && matchType && matchState
  })

  const unveiledCount = allRivens.filter(r => !r.veiled && !r.challenge).length
  const challengeCount = allRivens.filter(r => r.challenge).length
  const veiledCount = allRivens.filter(r => r.veiled).length
  const capacity = inventoryData?.account?.riven_capacity ?? 0

  const activeRivens = filtered.filter(r => !r.veiled)
  const veiledRivens = filtered.filter(r => r.veiled)

  return (
    <PageLayout
      title="Riven Mods"
      subtitle={`${unveiledCount} unveiled · ${challengeCount} challenge · ${veiledCount} veiled · ${unveiledCount + challengeCount}/${capacity} capacity`}
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim" size={20} />
          <Input
            placeholder="Search rivens…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-12"
          />
        </div>

        {/* Filters Flex */}
        <div className="flex flex-wrap gap-8">
          {/* State tabs */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Filter by State</p>
            <Tabs tabs={STATE_TABS} activeTab={activeState} onChange={setActiveState} />
          </div>

          {/* Type tabs */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Filter by Type</p>
            <Tabs tabs={TYPE_TABS} activeTab={activeType} onChange={setActiveType} />
          </div>
        </div>

        {!inventoryData ? (
          <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">Start monitoring to load riven mods</p>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">No rivens match your filters</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-8">
            {filtered.map((riven, idx) => (
              <Card key={idx} glow={!riven.veiled} className="relative p-0 overflow-hidden flex h-full min-h-[13rem] group border-kronos-panel/40">
                {/* Left: Image */}
                <div className="w-32 bg-kronos-panel/30 flex-shrink-0 p-2 flex items-center justify-center relative overflow-hidden border-r border-white/5">
                  <img
                    src={riven.image || 'https://browse.wf/Lotus/Interface/Cards/Images/OmegaModIndistinctUnveiled.png'}
                    alt=""
                    className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>

                {/* Right: Info */}
                <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h4 className="font-black text-sm uppercase leading-tight truncate text-kronos-text" title={riven.name}>
                      {riven.name}
                    </h4>
                  </div>

                  <p className="text-xs text-kronos-accent font-bold uppercase tracking-widest mb-2">
                    {riven.weapon_type} Riven
                  </p>

                  {!riven.veiled && (
                    <div className="flex justify-between text-xs font-bold uppercase text-kronos-dim mb-2 border-b border-white/5 pb-1">
                      <span>Rank {riven.rank}/8</span>
                      {riven.rerolls > 0 && <span>{riven.rerolls} Rolls</span>}
                    </div>
                  )}

                  {riven.veiled && riven.quantity > 1 && (
                    <div className="mb-2">
                      <span className="text-xs text-kronos-accent font-black uppercase">{riven.quantity} In Stock</span>
                    </div>
                  )}

                  {riven.challenge && (
                    <div className="mb-2 px-1">
                      <p className="text-xs text-kronos-text/80 leading-snug italic">{riven.challenge}</p>
                    </div>
                  )}

                  {riven.stats?.length > 0 && (
                    <div className="space-y-0.5">
                      {riven.stats.map((stat, si) => (
                        <div key={si} className="flex justify-between text-xs font-bold uppercase tracking-tighter leading-tight">
                          <span className="text-kronos-dim truncate mr-2">{stat.tag}</span>
                          <span className={stat.positive ? 'text-green-400' : 'text-red-400'}>
                            {stat.value > 0 ? '+' : ''}{stat.value}{stat.isPercent ? '%' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}