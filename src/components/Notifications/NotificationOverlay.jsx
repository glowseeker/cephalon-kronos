/**
 * NotificationOverlay.jsx
 * Runs in overlay-tr / overlay-tl / overlay-tc / overlay-relic.
 *
 * NO QUEUE: All toasts render directly. No "+X more" badge.
 * NO EXIT ANIMATION: Toasts disappear instantly to avoid ghosting.
 * NEW AT BOTTOM: New notifications appear at bottom, push older ones up.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { Bell, Star, Zap, X } from 'lucide-react'

const TOAST_MS = 5000
const RELIC_MS = 15000

const POS_ENTER_CLASS = {
  'top-right': 'notif-slide-in-right',
  'top-left': 'notif-slide-in-left',
  'top-center': 'notif-slide-top',
  'relic': 'notif-relic-enter',
}

const LABEL_TO_POS = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
  'overlay-relic': 'relic',
}

const RARITY = {
  Rare: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  Uncommon: { text: '#cbd5e1', bg: 'rgba(255,255,255,0.06)' },
  Common: { text: '#9ca3af', bg: 'rgba(255,255,255,0.03)' },
}

export default function NotificationOverlay() {
  console.log('[JS] NotificationOverlay mounted, label:', appWindow.label)
  const [toasts, setToasts] = useState([])
  const [relic, setRelic] = useState(null)
  const timers = useRef({})
  const relicTimer = useRef(null)
  const myLabel = appWindow.label
  const myPos = LABEL_TO_POS[myLabel] ?? 'top-right'
  const enterClass = POS_ENTER_CLASS[myPos] || ''

const removeToast = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // NO-OP - hiding causes webview reload which wipes state
  const hideWindow = useCallback(() => {}, [myLabel])

  useEffect(() => {
    const subs = []

    subs.push(listen('new-notification', (e) => {
      const { position = 'top-right', title = '', message = '', image = '' } = e.payload
      if (position !== myPos) return
      const uniqueId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      console.log('[JS] Adding toast:', uniqueId)
      setToasts(prev => {
        console.log('[JS] setToasts after add:', prev.length + 1)
        return [...prev, { id: uniqueId, title, message, image }]
      })
      const timerId = setTimeout(() => {
        console.log('[JS] Timer FIRED for:', uniqueId)
        try {
          delete timers.current[uniqueId]
        } catch (e) { console.log('[JS] timer delete error:', e) }
        try {
          setToasts(prev => {
            console.log('[JS] setToasts filter, was:', prev.length)
            return prev.filter(t => t.id !== uniqueId)
          })
        } catch (e) { console.log('[JS] timer filter error:', e) }
      }, TOAST_MS)
      console.log('[JS] Timer set for:', uniqueId, 'in', TOAST_MS, 'ms')
      timers.current[uniqueId] = timerId
    }))

    subs.push(listen('show-relic-rewards', (e) => {
      if (myPos !== 'relic') return
      const rewards = Array.isArray(e.payload) ? e.payload : (e.payload?.rewards ?? [])
      setRelic({ rewards })
      clearTimeout(relicTimer.current)
      relicTimer.current = setTimeout(() => setRelic(null), RELIC_MS)
    }))

    subs.push(listen('wipe-state', () => {
      console.log('[JS] WIPE STATE received! current toasts:', toasts.length)
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
      clearTimeout(relicTimer.current)
      setToasts([])
      setRelic(null)
    }))

    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      clearTimeout(relicTimer.current)
      subs.forEach(p => p.then(f => f()))
    }
  }, [myPos, hideWindow])

  const dismissRelic = useCallback(() => {
    clearTimeout(relicTimer.current)
    setRelic(null)
    invoke('hide_overlay_window', { label: 'overlay-relic' }).catch(() => { })
  }, [])

  return (
    <div className="flex flex-col gap-2 p-3 select-none" 
         style={{ width: '320px' }}>
      {toasts.slice().reverse().map(t => (
        <ToastCard key={t.id} toast={t} enterClass={enterClass} />
      ))}
      {relic && myPos === 'relic' && (
        <RelicCard data={relic} onClose={dismissRelic} />
      )}
    </div>
  )
}

function ToastCard({ toast, enterClass }) {
  return (
    <div
      className={`flex gap-3 items-center px-3 py-3 rounded-xl ${enterClass}`}
      style={{
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(var(--color-accent-rgb), 0.15)' }}>
        {toast.image
          ? <img src={toast.image} alt="" className="w-6 h-6 object-contain" />
          : <Bell size={15} style={{ color: 'var(--color-accent)' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 truncate"
          style={{ color: 'var(--color-accent)' }}>{toast.title}</p>
        <p className="text-[12px] font-semibold leading-tight line-clamp-2"
          style={{ color: 'var(--color-text)' }}>{toast.message}</p>
      </div>
    </div>
  )
}

function RelicCard({ data, onClose }) {
  const rewards = data?.rewards ?? []
  return (
    <div className="rounded-2xl overflow-hidden notif-relic-enter"
      style={{
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.22)',
        borderTop: '3px solid var(--color-accent)',
        width: '560px',
      }}>
      <div className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <Zap size={11} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}>Relic Rewards</span>
        </div>
        <button onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          style={{ color: 'var(--color-text-dim)' }}>
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        {rewards.slice(0, 4).map((item, i) => {
          const rar = RARITY[item.rarity] ?? RARITY.Common
          return (
            <div key={i} className="flex items-center gap-2 p-2 rounded-xl"
              style={{ background: rar.bg, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0,0,0,0.3)' }}>
                {item.image
                  ? <img src={item.image} alt="" className="w-8 h-8 object-contain" />
                  : <Star size={18} style={{ color: rar.text }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase leading-tight line-clamp-2"
                  style={{ color: rar.text }}>{item.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.price != null && <span className="text-[10px] font-black text-amber-400">{item.price}p</span>}
                  {item.owned > 0 && <span className="text-[9px] text-white opacity-40">×{item.owned}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}