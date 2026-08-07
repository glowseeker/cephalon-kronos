import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useUi } from '../contexts/UiContext'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'
import { PageLayout } from '../components/UI'
import { useMonitoring } from '../contexts/MonitoringContext'

const CATEGORIES = [
  // Series
  { type: 'series', key: '/Lotus/Objects/Orokin/Props/CollectibleSeriesOne', labelKey: 'collectibles.category.kuria', icon: 'IconOrokitty.png', color: '#d4a843' },
  { type: 'series', key: '/Lotus/Types/Lore/Fragments/DuviriFragments/DuviriCollectibleDeco', labelKey: 'collectibles.category.lost_islands', icon: 'DuviriFragment.png', color: '#7ec8e3' },
  { type: 'series', key: '/Lotus/Types/Lore/Fragments/DuviriMITWFragments/DuviriMITWCollectibleDeco', labelKey: 'collectibles.category.isleweaver', icon: 'IsleweaverFragment.png', color: '#c084fc' },

  // Open World
  { type: 'marker', key: 'EidolonPlainsDiscoverable', labelKey: 'collectibles.category.eidolon_caves', icon: 'IconPlainsOfEidolon.png', color: '#4ade80' },
  { type: 'marker', key: 'OrbVallisCaveDiscoverable', labelKey: 'collectibles.category.vallis_caves', icon: 'VallisLandscape.png', color: '#60a5fa' },
  { type: 'marker', key: 'FortunaMarker', labelKey: 'collectibles.category.fortuna', icon: 'FortunaTown.png', color: '#fbbf24' },
  { type: 'marker', key: 'NecraliskMarker', labelKey: 'collectibles.category.necralisk', icon: 'IconNecralisk.png', color: '#c084fc' },

  // Lore Fragments
  { type: 'fragment', labelKey: 'collectibles.category.somachord', wikiTotal: 55, icon: 'IconSomachord.png', color: '#f472b6', match: (type) => type.includes('/MusicFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.frame_fighter', wikiTotal: 42, icon: 'IconFrameFighter.png', color: '#fb923c', match: (type) => type.includes('/FrameFighterFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.cephalon', wikiTotal: 43, icon: 'IconCephalonFragment.png', color: '#60a5fa', match: (type) => type.startsWith('/Lotus/Types/Lore/Fragments/') && !type.includes('/Eidolon') && !type.includes('/Music') && !type.includes('/FrameFighter') && !type.includes('/LoreCard') && !type.includes('/Solaris') && !type.includes('/GrineerGhoul') && !type.includes('/Albrect') && !type.includes('/Revenant') && !type.includes('/CorpusRelief') && !type.includes('/GasCity') && !type.includes('/GlassFragments') },
  { type: 'fragment', labelKey: 'collectibles.category.leverian_prex', wikiTotal: 50, icon: 'IconTarotCards.png', color: '#a78bfa', match: (type) => type.includes('/LoreCardFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.thousand_year_fish', wikiTotal: 20, icon: 'GlassFish.png', color: '#34d399', match: (type) => type.includes('/EidolonFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.encrypted_journal', wikiTotal: 13, icon: 'GhoulDataFragment.png', color: '#a3e635', match: (type) => type.includes('/GrineerGhoulFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.glass_shard', wikiTotal: 5, icon: 'GlassFragment.png', color: '#6ee7b7', match: (type) => type.includes('/GlassFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.fortuna_fragments', wikiTotal: 35, icon: 'DebtTokenD.png', color: '#facc15', match: (type) => type.includes('/SolarisFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.albrechts_notes', wikiTotal: 23, icon: 'Grimoire.png', color: '#818cf8', match: (type) => type.includes('/AlbrectFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.nakak', wikiTotal: 3, icon: 'RevenantQuestKeyChain.png', color: '#c084fc', match: (type) => type.includes('/RevenantFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.the_tenets', wikiTotal: 11, icon: 'IconCorpusRelief.png', color: '#67e8f9', match: (type) => type.includes('/CorpusReliefFragments/') },
  { type: 'fragment', labelKey: 'collectibles.category.partnership', wikiTotal: 8, icon: 'IconGasCityLoreFragment.png', color: '#22d3ee', match: (type) => type.includes('/GasCityFragments/') },
]

function countBits(n) {
  let c = 0
  while (n) { c += n & 1; n >>>= 1 }
  return c
}

function Subpanel({ cat, items, onClose, t }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (cat) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [cat])

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${cat ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        className={`relative w-full max-w-lg bg-[var(--color-panel)] border-l border-white/10 h-full overflow-y-auto custom-scrollbar transition-transform duration-300 ${cat ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {cat && (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-4 px-5 py-4 bg-[var(--color-panel)] border-b border-white/10">
              {cat.icon && <img src={cat.icon} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{(cat.label || t(cat.labelKey))}</p>
                <p className="text-sm" style={{ color: cat.color }}>{t('collectibles.count_of_total', { count: cat.count, total: cat.total })}</p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {items.map((item, i) => (
                <div key={item.key ?? i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.found ? 'bg-emerald-400' : 'bg-white/10'}`} />
                  {item.icon && <img src={item.icon} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />}
                  <span className="text-sm text-white/80 truncate flex-1">{item.name}</span>
                  {item.found && (
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProgressCard({ icon, label, subtitle, count, total, color, onClick, t }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div
      className={`glass-panel rounded-[18px] overflow-hidden flex h-32 ${onClick ? 'cursor-pointer hover:brightness-110' : ''}`}
      onClick={onClick}
    >
      <div className="flex-shrink-0 w-32 h-full overflow-hidden">
        {icon ? (
          <img src={icon} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
            <span style={{ color, fontWeight: 'bold', fontSize: '28px' }}>{label?.[0] || '?'}</span>
          </div>
        )}
      </div>
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, var(--color-panel) 40px)` }} />
        <div className="relative z-10 h-full flex flex-col justify-center px-3 py-2 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{label}</p>
          {subtitle && <p className="text-[10px] text-kronos-dim leading-tight">{subtitle}</p>}
          {total > 0 && (
            <>
              <p className="text-xs font-bold mt-1" style={{ color }}>{t('collectibles.count_of_total', { count, total })}</p>
              <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}66` }} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Collectibles() {
  const { t } = useUi()
  const { inventoryData, dict } = useMonitoring()
  const [uiPath, setUiPath] = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  const [subpanelItems, setSubpanelItems] = useState([])
  useEffect(() => {
    invoke('get_ui_path').then(setUiPath).catch(() => { })
  }, [])

  const collectibleSeries = inventoryData?.collectibleSeries ?? []
  const discoveredMarkers = inventoryData?.discoveredMarkers ?? []
  const loreFragmentScans = inventoryData?.loreFragmentScans ?? []

  const fragName = useCallback((type) => {
    const leaf = type.split('/').pop()
    return dict['/Lotus/Language/Fragments/' + leaf + 'Name']
      || dict['/Lotus/Language/Fragments/' + leaf]
      || leaf.replace(/(Fragment|Name)$/i, '').replace(/([a-z])([A-Z])/g, '$1 $2').trim()
  }, [dict])

  const openSubpanel = useCallback((cardCat, buildItems) => {
    setSelectedCat(cardCat)
    setSubpanelItems(buildItems())
  }, [])

  const closeSubpanel = useCallback(() => {
    setSelectedCat(null)
    setSubpanelItems([])
  }, [])

  const seriesCards = useMemo(() => CATEGORIES.filter(c => c.type === 'series').map((cat) => {
    const cs = collectibleSeries.find(s => s.CollectibleType === cat.key)
    const card = {
      key: cat.key,
      icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
      label: cat.label || t(cat.labelKey),
      color: cat.color,
      count: cs?.Count ?? 0,
      total: cs?.ReqScans ?? 0,
    }
    return {
      ...card,
      onClick: () => openSubpanel(card, () => [
        { key: 'placeholder', name: t('collectibles.found_of_total', { found: card.count, total: card.total }), found: true },
      ]),
    }
  }), [collectibleSeries, uiPath, openSubpanel])

  const markerCards = useMemo(() => CATEGORIES.filter(c => c.type === 'marker').map((cat) => {
    const m = discoveredMarkers.find(m => m.tag === cat.key)
    const total = m ? (m.discoveryState || []).length * 32 : 0
    const card = {
      key: cat.key,
      icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
      label: cat.label || t(cat.labelKey),
      subtitle: t('collectibles.areas_discovered'),
      color: cat.color,
      count: m ? (m.discoveryState || []).reduce((s, v) => s + countBits(v), 0) : 0,
      total,
    }
    return {
      ...card,
      onClick: () => openSubpanel(card, () => {
        if (!m || !m.discoveryState) return [{ key: 'placeholder', name: t('collectibles.caves_not_loaded'), found: false }]
        const items = []
        m.discoveryState.forEach((bits, areaIdx) => {
          for (let bit = 0; bit < 32; bit++) {
            if (bits & (1 << bit)) items.push({ key: `area${areaIdx}_bit${bit}`, name: t('collectibles.area_bit', { area: areaIdx + 1, bit: bit + 1 }), found: true })
          }
        })
        return items.length ? items : [{ key: 'placeholder', name: t('collectibles.none_discovered'), found: false }]
      }),
    }
  }), [discoveredMarkers, uiPath, openSubpanel])

  const fragmentCards = useMemo(() => {
    const cats = CATEGORIES.filter(c => c.type === 'fragment').map((cat) => ({ ...cat, found: 0 }))
    for (const f of loreFragmentScans) {
      const type = f.ItemType || ''
      const cat = cats.find((c) => c.match(type))
      if (cat) cat.found += f.Progress > 0 ? 1 : 0
    }
    return cats.map((cat) => {
      const card = {
        key: cat.labelKey || cat.label,
        icon: cat.icon && uiPath ? convertFileSrc(`${uiPath}/${cat.icon}`) : null,
        label: cat.label || t(cat.labelKey),
        color: cat.color,
        count: cat.found,
        total: cat.wikiTotal,
      }
      return {
        ...card,
        onClick: () => openSubpanel(card, () => {
          const items = []
          for (const f of loreFragmentScans) {
            const type = f.ItemType || ''
            if (cat.match(type) && f.Progress > 0) {
              items.push({
                key: type,
                name: fragName(type),
                found: true,
              })
            }
          }
          return items.length ? items : [{ key: 'placeholder', name: t('collectibles.none_collected'), found: false }]
        }),
      }
    })
  }, [loreFragmentScans, uiPath, openSubpanel])

  return (
    <PageLayout titleKey="screen.collectibles">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4">
        {seriesCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} t={t} />)}
        {markerCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} t={t} />)}
        {fragmentCards.map(({ key, ...card }) => <ProgressCard key={key} {...card} t={t} />)}
      </div>
      <Subpanel cat={selectedCat} items={subpanelItems} onClose={closeSubpanel} t={t} />
    </PageLayout>
  )
}
