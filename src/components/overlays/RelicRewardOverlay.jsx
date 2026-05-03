import React, { useState, useEffect, useRef } from 'react'
import { Card } from '../UI'
import { Loader2 } from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { getPrice } from '../../lib/wfmCache'

const RELIC_TIMEOUT = 14500

const SLOT_WIDTHS = {
  1: 260,
  2: 500,
  3: 750,
  4: 1000
}

export default function RelicRewardOverlay() {
  const [data, setData] = useState(null)
  const [localReward, setLocalReward] = useState(null)
  const [ocrResults, setOcrResults] = useState({})
  const [isClosing, setIsClosing] = useState(false)
  const [squadSize, setSquadSize] = useState(1)
  const [prices, setPrices] = useState({})
  const [remaining, setRemaining] = useState(RELIC_TIMEOUT)
  const containerRef = useRef(null)
  const lastTick = useRef(Date.now())
  const resizeTimerRef = useRef(null)
  const triggerCount = useRef(0)
  const [triggerKey, setTriggerKey] = useState(0)

  useEffect(() => {
    // 1. Immediately request the cached session data in case the event was missed
    invoke('get_active_relic_session')
      .then(cachedData => {
        if (cachedData) {
          if (cachedData.squad_relics) {
            setData(cachedData.squad_relics)
            setSquadSize(cachedData.squad_size || 1)
            setRemaining(RELIC_TIMEOUT)
            lastTick.current = Date.now()
          }
          if (cachedData.local_reward) {
            setLocalReward(cachedData.local_reward)
            setSquadSize(cachedData.squad_size || 1)
          }
        }
      })
      .catch(err => console.error('[RelicRewardOverlay] Failed to fetch cached session:', err))

    const subs = []
    subs.push(listen('overlay-update-relics', (e) => {
      const relicsCount = e.payload.squad_relics?.length || 0
      console.log(`[RelicOverlay] EVENT: overlay-update-relics (count=${relicsCount})`, e.payload)
      setData(e.payload.squad_relics || [])
      setSquadSize(e.payload.squad_size)
      setOcrResults({})
      setLocalReward(null)
      setIsClosing(false)
      setRemaining(RELIC_TIMEOUT)
      lastTick.current = Date.now()
      triggerCount.current += 1
      setTriggerKey(triggerCount.current)
      invoke('show_overlay_window', { label: 'overlay-relic' }).catch(err => console.log(`[RelicRewardOverlay] ERROR: show failed: ${err}`))
    }))
    subs.push(listen('overlay-update-reward', (e) => {
      console.log(`[RelicRewardOverlay] EVENT: overlay-update-reward (reward=${e.payload.local_reward?.name})`)
      setLocalReward(e.payload.local_reward)
      setSquadSize(e.payload.squad_size)
    }))
    subs.push(listen('overlay-update-ocr', (e) => {
      console.log(`[RelicOverlay] EVENT: overlay-update-ocr slot=${e.payload.slot} reward=${e.payload.confirmed_reward}`, e.payload)
      const { slot, confirmed_reward, item } = e.payload
      setOcrResults(prev => ({ ...prev, [slot]: { confirmed_reward, item } }))
    }))
    subs.push(listen('overlay-squad-size', (e) => {
      console.log(`[RelicRewardOverlay] EVENT: overlay-squad-size (size=${e.payload.squad_size})`)
      setSquadSize(e.payload.squad_size)
      setData(prev => prev || []) // Ensure data is not null so it renders skeleton
    }))
    subs.push(listen('fissure-reward-closed', () => {
      console.log('[RelicRewardOverlay] EVENT: fissure-reward-closed')
      setIsClosing(true)
      setTimeout(() => {
        setData(null)
        invoke('hide_overlay_window', { label: 'overlay-relic' }).catch(() => {})
      }, 500)
    }))
    return () => { subs.forEach(p => p.then(f => f())) }
  }, [])

  // Timer & Auto-close logic
  useEffect(() => {
    if (!data || isClosing) return

    let raf
    const tick = () => {
      const now = Date.now()
      const delta = now - lastTick.current
      lastTick.current = now

      setRemaining(prev => {
        const next = Math.max(0, prev - delta)
        if (next === 0 && !isClosing) {
          setIsClosing(true)
          setTimeout(() => {
            setData(null)
            invoke('hide_overlay_window', { label: 'overlay-relic' }).catch(() => {})
          }, 500)
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }

    lastTick.current = Date.now()
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [data, isClosing])

  // Window Resize logic
  useEffect(() => {
    if (!data) return
    const width = SLOT_WIDTHS[squadSize] || 640
    
    // Cancel any pending resize before scheduling a new one
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => {
      resizeTimerRef.current = null
      invoke('resize_overlay_window', { 
        label: 'overlay-relic', 
        width: Math.round(width), 
        height: 380 
      }).catch(err => console.error('[RelicOverlay] Resize failed:', err))
    }, 50)
  }, [squadSize, triggerKey])

  // Price fetching logic
  useEffect(() => {
    const fetchAllPrices = async () => {
      const newPrices = { ...prices }
      let changed = false

      // Check local reward
      if (localReward && !newPrices[localReward.uniqueName]) {
        const p = await getPrice(localReward.uniqueName, localReward.name, localReward.ducats)
        newPrices[localReward.uniqueName] = p
        changed = true
      }

      // Check OCR results
      for (const slotIdx in ocrResults) {
        const item = ocrResults[slotIdx]?.item
        if (item && !newPrices[item.uniqueName]) {
          const p = await getPrice(item.uniqueName, item.confirmed_reward || item.name, item.ducats)
          newPrices[item.uniqueName] = p
          changed = true
        }
      }

      if (changed) setPrices(newPrices)
    }

    fetchAllPrices()
  }, [ocrResults, localReward])

  if (!data) return null

  const progress = (remaining / RELIC_TIMEOUT) * 100
  const totalWidth = SLOT_WIDTHS[squadSize] || 640

  return (
    <div
      ref={containerRef}
      className={`inline-block transition-all duration-500 ${isClosing ? 'opacity-0 scale-95 blur-sm' : 'animate-in fade-in zoom-in'}`}
      style={{ width: totalWidth }}
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-kronos-accent/20 to-kronos-accent/5 rounded-2xl blur-xl opacity-50" />
        <Card glow className="relative border-white/10 bg-kronos-bg/95 backdrop-blur-md overflow-hidden p-1.5">
          <div className="grid gap-0 mb-1.5" style={{ gridTemplateColumns: `repeat(${squadSize}, 1fr)` }}>
            {Array.from({ length: squadSize }).map((_, i) => {
              const slotIdx = i + 1
              const result = ocrResults[slotIdx]
              const isLocal = slotIdx === 1
              const confirmed = isLocal && localReward
                ? { confirmed_reward: localReward.name, item: localReward }
                : result
              return (
                <div key={i} className="flex flex-col">
                  {confirmed
                    ? <RewardSlot confirmed={confirmed} isLocal={isLocal} price={prices[confirmed.item?.uniqueName]} />
                    : <LoadingSlot />
                  }
                </div>
              )
            })}
          </div>
          <div className="h-1 bg-white/10 overflow-hidden rounded-full mx-1">
            <div
              className="h-full transition-all duration-100 ease-linear shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.6)]"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent)' }}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}

function LoadingSlot() {
  return (
    <div className="flex-1 bg-white/5 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center p-2 text-center min-h-[140px] mx-1">
      <Loader2 size={12} className="animate-spin text-kronos-accent mb-1" />
      <span className="text-[7px] font-black text-zinc-600 uppercase">Analyzing...</span>
    </div>
  )
}

function RewardSlot({ confirmed, isLocal, price }) {
  const item = confirmed?.item
  const inv = item?.inventory || {}
  const isForma = inv.isForma
  const isResource = inv.isResource
  const subcomponents = inv.subcomponents || []
  const displayName = confirmed.confirmed_reward

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col mx-1 transition-all border-white/5 bg-black/40">
      {/* Reward Name */}
      <div className="px-2.5 pt-2.5 pb-2">
        <div className="text-[11px] font-black text-white uppercase leading-tight mb-2 text-center tracking-tight">
          {displayName}
        </div>
        
        {/* Ducats + Plat badges */}
        {!isForma && (
          <div className="flex items-center gap-1.5 justify-evenly">
            <PriceBadge label="Ducats" value={`${item?.ducats ?? 0}`} color="amber" />
            <PriceBadge label="Plat" value={`${price ?? 0}p`} color="blue" />
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Parent Name - Highlighted if the main blueprint is the dropped reward */}
      <div className={`px-2.5 py-2 mb-1.5 text-center transition-all ${
        subcomponents.length > 0 && !subcomponents.some(c => c.isDroppedReward)
          ? 'bg-amber-500/10 shadow-[inner_0_0_15px_rgba(245,158,11,0.1)] border-y border-amber-500/20'
          : ''
      }`}>
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          subcomponents.length > 0 && !subcomponents.some(c => c.isDroppedReward)
            ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]'
            : 'text-kronos-dim'
        }`}>
          {inv.parentName || displayName}
        </span>
      </div>

      {/* BP + Owned + Mastery badges */}
      <div className="flex items-center gap-1.5 px-2.5 pb-2 justify-evenly">
        {!isResource && <Badge count={inv.blueprintCount} label="BP" />}
        <Badge count={inv.craftedCount} label="Owned" />
        {(!isForma && !isResource) && (
          <Badge count={0} label="Mastered" isMastered={inv.isMastered} canMastered={true} />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Component card a la foundry */}
      {subcomponents.length > 0 && (
        <div className="bg-black/20">
          <div className="divide-y divide-white/5">
            {subcomponents.map((comp, idx) => (
              <ComponentRow key={idx} comp={comp} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ label, count, isMastered, canMastered = true }) {
  const value = count ?? 0
  const mastered = canMastered && isMastered
  
  let displayValue
  let isActive = false
  let colorClass = ''
  
  if (label === 'Mastered') {
    displayValue = mastered ? 'MASTERED' : 'UNMASTERED'
    isActive = mastered
    colorClass = isActive 
      ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' 
      : 'bg-white/5 border-white/10 text-zinc-500'
  } else if (label === 'Owned') {
    displayValue = value.toString()
    isActive = value > 0
    colorClass = isActive
      ? 'bg-green-500/15 border-green-500/30 text-green-300'
      : 'bg-white/5 border-white/10 text-zinc-500'
  } else if (label === 'BP') {
    displayValue = value.toString()
    isActive = value > 0
    colorClass = isActive
      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
      : 'bg-white/5 border-white/10 text-zinc-500'
  }
  
  const showLabel = label !== 'Mastered'
  return (
    <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-black uppercase transition-all ${colorClass}`}>
      {showLabel && <span className={isActive ? 'opacity-80 text-white' : 'opacity-50'}>{label}:</span>}
      <span className={showLabel ? "text-[10px]" : ""}>{displayValue}</span>
    </div>
  )
}

function PriceBadge({ label, value, color }) {
  const styles = {
    amber: 'bg-amber-500/5 border-white/5 text-amber-500/50',
    blue: 'bg-blue-400/20 border-blue-400/50 text-blue-200 shadow-[0_0_10px_rgba(96,165,250,0.3)]',
  }
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${styles[color]}`}>
      <span className="text-[8px] font-black uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-[10px] font-bold">{value}</span>
    </div>
  )
}

function ComponentRow({ comp }) {
  const { have = 0, need = 1, bpCount = 0, isResource, isDroppedReward, name } = comp;
  const satisfied = have >= need;

  // Active glow classes if this is the component that dropped
  const rowClasses = isDroppedReward
    ? 'bg-amber-500/10 border-t border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)] relative z-10'
    : satisfied 
      ? 'bg-green-500/5 border-t border-white/5' 
      : 'bg-black/20 border-t border-white/5';

  const dotClasses = isDroppedReward
    ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
    : satisfied 
      ? 'bg-green-500' 
      : 'bg-red-500';

  const nameClasses = isDroppedReward
    ? 'text-amber-100 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]'
    : satisfied 
      ? 'text-zinc-200' 
      : 'text-zinc-500';

  const fractionalClasses = isDroppedReward
    ? 'text-amber-400 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]'
    : satisfied 
      ? 'text-green-400' 
      : 'text-red-400';

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 ${rowClasses}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClasses}`} />
      <span className={`text-[11px] font-medium flex-1 leading-tight ${nameClasses}`}>
        {name}
      </span>
      <span className={`text-[11px] font-black font-mono flex-shrink-0 ${fractionalClasses}`}>
        {have}/{need}
      </span>
      {comp.hasBlueprint && (
        <span className={`text-[9px] font-black flex-shrink-0 ${bpCount > 0 ? 'text-kronos-accent' : 'text-kronos-dim opacity-50'}`}>
          ({bpCount} BP)
        </span>
      )}
    </div>
  )
}