import { useState } from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { PageLayout, Input, Card, Tabs } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem']
const QUALITY_ORDER = ['Intact', 'Exceptional', 'Flawless', 'Radiant']

export default function Relics() {
  const { inventoryData } = useMonitoring()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeEra, setActiveEra] = useState('All')
  const [activeQuality, setActiveQuality] = useState('All')

  const relics = inventoryData?.relics ?? []

  const baseFiltered = relics.filter(r => {
    const matchEra = activeEra === 'All' || r.name.startsWith(activeEra)
    if (!matchEra) return false

    const search = searchQuery.toLowerCase()
    if (!search) return true

    const matchName = r.name.toLowerCase().includes(search)
    const matchRewards = r.rewards?.some(rw => rw.name.toLowerCase().includes(search))
    
    return matchName || matchRewards
  })

  const allGroups = baseFiltered.reduce((acc, relic) => {
    const era = ERA_ORDER.find(e => relic.name.startsWith(e)) ?? 'Other'
    if (!acc[era]) acc[era] = []
    
    const baseName = relic.name.split(' (')[0].replace(era, '').replace('Relic', '').trim();
    let group = acc[era].find(g => g.baseName === baseName);
    if (!group) {
      group = {
        baseName,
        era,
        image: relic.image,
        totalCount: 0,
        items: [], 
        refinements: {},
        rewards: relic.rewards || []
      };
      acc[era].push(group);
    }
    
    group.totalCount += relic.count;
    group.refinements[relic.refinement] = (group.refinements[relic.refinement] || 0) + relic.count;
    group.items.push(relic);

    return acc
  }, {})

  const grouped = Object.entries(allGroups).reduce((acc, [era, groups]) => {
    const filtered = groups.filter(g => 
      activeQuality === 'All' || (g.refinements[activeQuality] || 0) > 0
    );
    if (filtered.length > 0) acc[era] = filtered;
    return acc
  }, {});

  const totalFilteredGroups = Object.values(grouped).reduce((s, g) => s + g.length, 0);
  const totalFilteredItems = Object.values(grouped).flat().reduce((s, g) => s + g.totalCount, 0);

  const eraTabs = ['All', ...ERA_ORDER, 'Other']
    .filter(e => e === 'All' || relics.some(r => r.name.startsWith(e)))
    .map(e => ({ id: e, label: e }))
    
  const qualityTabs = ['All', ...QUALITY_ORDER].map(q => ({ id: q, label: q }))

  return (
    <PageLayout title="Void Relics">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim" size={20} />
            <Input
              placeholder="Search relics or rewards…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-8">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Era</p>
            <Tabs tabs={eraTabs} activeTab={activeEra} onChange={setActiveEra} />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">Refinement</p>
            <Tabs tabs={qualityTabs} activeTab={activeQuality} onChange={setActiveQuality} />
          </div>
        </div>

        {!inventoryData ? (
          <Card glow>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-kronos-accent mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold mb-2">No Data</h3>
              <p className="text-kronos-dim">Start monitoring to load relics</p>
            </div>
          </Card>
        ) : totalFilteredGroups === 0 ? (
          <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">
                {relics.length === 0 ? 'No relics found in inventory' : 'No relics match your search'}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-end px-1">
              <p className="text-sm text-kronos-dim">
                Showing {totalFilteredGroups} relic types · {totalFilteredItems} total
              </p>
              {inventoryData?.account && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest mb-1">Void Traces</p>
                  <p className="text-sm font-black text-kronos-text">
                    {inventoryData.account.void_traces}
                    <span className="text-kronos-dim mx-1">/</span>
                    <span className="text-kronos-dim text-xs">{inventoryData.account.void_traces_max}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-12">
              {Object.entries(grouped).sort(([a], [b]) => ERA_ORDER.indexOf(a) - ERA_ORDER.indexOf(b)).map(([era, eraRelics]) => (
                <div key={era} className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-kronos-accent border-b border-kronos-accent/20 pb-1 ml-1">{era} Era</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {eraRelics.map((group, idx) => (
                      <Card key={idx} glow className="p-2.5 flex gap-3 items-stretch min-h-[100px] bg-kronos-panel/10 hover:bg-kronos-panel/20 transition-colors">
                        
                        {/* COL 1: Image + Name */}
                        <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center text-center gap-1">
                          <img
                            src={group.image || 'https://browse.wf/Lotus/Interface/Icons/Relics/RelicLithA.png'}
                            alt=""
                            className="w-30 h-30 object-contain drop-shadow-[0_0_8px_rgba(85,144,171,0.3)]"
                            loading="lazy"
                          />
                          <p className="text-[20px] font-black uppercase text-kronos-text leading-tight tracking-tight break-words w-full">
                            {group.baseName}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="w-px bg-kronos-panel/20 self-stretch flex-shrink-0" />

                        {/* COL 2: Refinement + Quantity */}
                        <div className="w-24 flex-shrink-0 flex flex-col justify-center gap-0.5">
                          {QUALITY_ORDER.filter(q => (group.refinements[q] || 0) > 0).map(q => (
                            <div key={q} className="flex items-center justify-between">
                              <span className="text-[15px] font-black uppercase text-kronos-accent/70 tracking-tight">{q}</span>
                              <span className="text-[15px] font-black text-kronos-text leading-none ml-2">{group.refinements[q]}</span>
                            </div>
                          ))}
                        </div>

                        {/* Divider */}
                        <div className="w-px bg-kronos-panel/20 self-stretch flex-shrink-0" />

                        {/* COL 3: Rewards */}
                        <div className="flex-1 flex flex-col justify-center gap-0 min-w-0">
                          {group.rewards.sort((a, b) => a.tier - b.tier).map((rw, i) => {
                            const isMatch = searchQuery && rw.name.toLowerCase().includes(searchQuery.toLowerCase())
                            const colorClass = rw.tier === 2 ? 'text-yellow-400' :
                                               rw.tier === 1 ? 'text-gray-300' :
                                                               'text-orange-700/70';
                            return (
                              <p key={i} className={`text-[14px] font-bold uppercase leading-[1.1] truncate flex items-center ${colorClass}`}>
                                {isMatch && <span className="text-kronos-accent mr-0.5">[</span>}
                                <span className="truncate">{rw.name}</span>
                                {isMatch && <span className="text-kronos-accent ml-0.5">]</span>}
                              </p>
                            )
                          })}
                        </div>

                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  )
}