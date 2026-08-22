import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useUi } from '../../contexts/UiContext'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

export default function RelicPickerOverlay() {
  const { t } = useUi()
  const [relics, setRelics] = useState(null)
  const [windowVisible, setWindowVisible] = useState(false)
  const windowVisibleRef = useRef(false)

  const showWindow = useCallback(async (fromRust = false) => {
    if (windowVisibleRef.current) return
    windowVisibleRef.current = true
    setWindowVisible(true)
    if (!fromRust) {
      await invoke('show_overlay_window', { label: 'overlay-relic-picker' }).catch(console.error)
    }
  }, [])

  const hideWindow = useCallback(async () => {
    if (!windowVisibleRef.current) return
    windowVisibleRef.current = false
    setWindowVisible(false)
    setRelics(null)
    await invoke('hide_overlay_window', { label: 'overlay-relic-picker' }).catch(console.error)
  }, [])

  useEffect(() => {
    const subs = []

    subs.push(listen('relic-picker-data', (e) => {
      const data = e.payload
      if (data?.ducat_top || data?.plat_top) {
        setRelics(data)
        showWindow(true)
      }
    }))

    subs.push(listen('relic-picker-closed', () => {
      hideWindow()
    }))

    subs.push(listen('fissure-reward-closed', () => {
      hideWindow()
    }))

    return () => { subs.forEach(p => p.then(f => f())) }
  }, [])

  if (!relics) return null

  const eraSuffix = relics.era ? ` (${relics.era})` : ''

  return (
    <div className="w-full h-full bg-zinc-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[360px]">
          <div className="flex gap-3">
            <Column items={relics.ducat_top} title={`Top Ducat EV${eraSuffix}`} accent="text-amber-400" />
            <Column items={relics.plat_top} title={`Top Plat EV${eraSuffix}`} accent="text-blue-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

function Column({ items, title, accent }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`text-[10px] font-black uppercase tracking-widest text-center mb-1.5 ${accent}`}>
        {title}
      </div>
      <div className="flex flex-col gap-1">
        {items?.map((item, i) => (
          <div
            key={item.name}
            className="flex items-center justify-between px-2.5 py-1.5 rounded bg-black/40 border border-white/5"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[9px] font-black text-kronos-dim w-3 flex-shrink-0">{i + 1}.</span>
              <span className="text-[12px] font-bold text-white truncate">{item.name}{item.vaulted && <span className="text-amber-500/80 font-bold"> (V)</span>}</span>
            </div>
            <span className={`text-[10px] font-black flex-shrink-0 ml-1 ${accent}`}>
              {title.startsWith('Top Ducat') ? `${item.evDucats}` : `${item.evPlat}p`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
