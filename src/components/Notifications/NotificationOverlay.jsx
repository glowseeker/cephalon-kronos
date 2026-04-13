/**
 * NotificationOverlay.jsx
 * Unified overlay for all positions (tr, tl, tc, relic).
 * Implements a Queue System to limit visible notifications.
 * Notifications are now click-through to avoid gameplay interference.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { Bell, Star, Zap } from 'lucide-react'

const TOAST_MS = 5000
const RELIC_MS = 15000

// We use items-center for ALL positions because the window itself is 
// positioned by Rust. This gives maximum shadow clearance on both sides.
const POS_CLASSES = {
  'top-right': 'items-center',
  'top-left': 'items-center',
  'top-center': 'items-center',
  'relic': 'items-center',
}

const LABEL_TO_POS = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
  'overlay-relic': 'relic',
}

// On Linux: limit every position to 1 visible notification.
// This sidesteps the WebKit timer-batching bug that causes stacks to
// disappear all at once — with max 1 per window there is never a stack.
const IS_LINUX = typeof navigator !== 'undefined' &&
  navigator.userAgent.toLowerCase().includes('linux') &&
  !navigator.userAgent.toLowerCase().includes('android')

const LIMITS = IS_LINUX
  ? { 'top-right': 1, 'top-left': 1, 'top-center': 1, 'relic': 1 }
  : { 'top-right': 3, 'top-left': 3, 'top-center': 2, 'relic': 1 }

const FIXED_WIDTHS = {
  'top-right': 440,
  'top-left': 440,
  'top-center': 440,
  'relic': 640,
}

const RARITY = {
  Rare: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  Uncommon: { text: '#cbd5e1', bg: 'rgba(255,255,255,0.06)' },
  Common: { text: '#9ca3af', bg: 'rgba(255,255,255,0.03)' },
}

export default function NotificationOverlay() {
  const [visibleToasts, setVisibleToasts] = useState([])
  const [queue, setQueue] = useState([])
  const [relic, setRelic] = useState(null)

  const containerRef = useRef(null)
  const myLabel = appWindow.label
  const myPos = LABEL_TO_POS[myLabel] ?? 'top-right'
  const myLimit = LIMITS[myPos] ?? 3
  const myWidth = FIXED_WIDTHS[myPos] ?? 440

  // ─── Queue Management ──────────────────────────────────────────────────────

  const removeToast = useCallback((id) => {
    setVisibleToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    if (visibleToasts.length < myLimit && queue.length > 0) {
      const next = queue[0]
      setQueue(prev => prev.slice(1))
      setVisibleToasts(prev => [...prev, next])
    }
  }, [visibleToasts.length, queue, myLimit])

  // ─── Window Management ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.target.scrollHeight

        if (height > 40) {
          invoke('resize_overlay_window', {
            label: myLabel,
            width: myWidth,
            height: height
          }).catch(console.error)
          invoke('set_ignore_cursor_events', { label: myLabel, ignore: true }).catch(() => { })
        } else {
          invoke('resize_overlay_window', { label: myLabel, width: myWidth, height: 0 }).catch(() => { })
        }
      }
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [myLabel, myWidth])

  // ─── Event Listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    const subs = []

    subs.push(listen('new-notification', (e) => {
      const { position = 'top-right', title = '', message = '', image = '' } = e.payload
      if (position !== myPos) return

      const newNotif = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title,
        message,
        image,
        createdAt: Date.now()
      }

      setQueue(prev => [...prev, newNotif])
    }))

    subs.push(listen('show-relic-rewards', (e) => {
      if (myPos !== 'relic') return
      const rewards = Array.isArray(e.payload) ? e.payload : (e.payload?.rewards ?? [])
      setRelic({ rewards, id: Date.now() })
    }))

    subs.push(listen('wipe-state', (e) => {
      const wipePos = e.payload
      if (wipePos === myPos || wipePos === undefined) {
        setVisibleToasts([])
        setQueue([])
        setRelic(null)
      }
    }))

    return () => {
      subs.forEach(p => p.then(f => f()))
    }
  }, [myPos])

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 p-10 select-none pointer-events-none ${POS_CLASSES[myPos]}`}
      style={{ width: `${myWidth}px` }}
    >
      {visibleToasts.map((t, index) => (
        <div key={t.id} className="relative">
          <ToastCard toast={t} onExpire={() => removeToast(t.id)} />
          
          {/* Linux Specific Badge: Only show on the topmost (index 0) notification */}
          {IS_LINUX && index === 0 && queue.length > 0 && (
            <div className="absolute -top-2 -right-2 z-50 animate-bounce">
              <div 
                className="text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border border-white/20"
                style={{ background: 'var(--color-accent)' }}
              >
                +{queue.length} MORE
              </div>
            </div>
          )}
        </div>
      ))}

      {/* For non-Linux, or if we want to keep the bottom indicator, we can keep it. 
          But the user asked for the badge logic. I'll hide the bottom one on Linux. */}
      {!IS_LINUX && queue.length > 0 && (
        <div className="notif-enter flex items-center justify-center px-4 py-1 rounded-lg bg-kronos-panel/40 border border-white/5 self-center mt-1 scale-90 opacity-60">
          <span className="text-[9px] font-black text-white uppercase tracking-[0.25em]">
            + {queue.length} More
          </span>
        </div>
      )}

      {relic && myPos === 'relic' && (
        <RelicCard key={relic.id} data={relic} onClose={() => setRelic(null)} />
      )}
    </div>
  )
}

function ToastCard({ toast, onExpire }) {
  const [remaining, setRemaining] = useState(TOAST_MS)
  const [exiting, setExiting] = useState(false)
  const lastTick = useRef(Date.now())

  useEffect(() => {
    if (exiting) return

    const timer = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTick.current
      lastTick.current = now

      setRemaining(prev => {
        const next = prev - delta
        if (next <= 0) {
          setExiting(true)
          setTimeout(onExpire, 300)
          return 0
        }
        return next
      })
    }, 50)

    lastTick.current = Date.now()
    return () => clearInterval(timer)
  }, [exiting, onExpire])

  const progress = (remaining / TOAST_MS) * 100

  return (
    <div
      className={`
        flex flex-col gap-1.5 px-3 py-3 rounded-xl flex-shrink-0
        transition-all duration-300 transform
        ${exiting ? 'notif-exit' : 'notif-enter'}
      `}
      style={{
        width: '320px',
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      <div className="flex gap-3 items-center">
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
      <div className="h-0.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-75"
          style={{
            width: `${progress}%`,
            background: 'var(--color-accent)',
            opacity: 0.5
          }} />
      </div>
    </div>
  )
}

function RelicCard({ data, onClose }) {
  const rewards = data?.rewards ?? []
  const [remaining, setRemaining] = useState(RELIC_MS)
  const [exiting, setExiting] = useState(false)
  const lastTick = useRef(Date.now())

  useEffect(() => {
    if (exiting) return

    const timer = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTick.current
      lastTick.current = now

      setRemaining(prev => {
        const next = prev - delta
        if (next <= 0) {
          setExiting(true)
          setTimeout(onClose, 300)
          return 0
        }
        return next
      })
    }, 50)

    lastTick.current = Date.now()
    return () => clearInterval(timer)
  }, [exiting, onClose])

  const progress = (remaining / RELIC_MS) * 100

  return (
    <div
      className={`
        flex flex-col gap-2 rounded-2xl flex-shrink-0
        transition-all duration-300 transform
        ${exiting ? 'notif-exit' : 'notif-relic-enter'}
      `}
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
        <div className="h-1 w-20 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${progress}%`,
              background: 'var(--color-accent)',
              opacity: 0.6
            }} />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 px-4 pb-3">
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