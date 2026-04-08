import { useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { Bell, Zap, Star } from 'lucide-react'

const TOAST_MS  = 5000   // visible duration
const EXIT_MS   = 350    // exit animation duration — matches CSS

// Fixed geometry of a single toast card (must match CSS / w-72).
const TOAST_W   = 288    // w-72 = 18rem = 288px
const TOAST_H   = 88     // approximate height incl. padding
const TOAST_GAP = 12     // gap-3

// Relic banner fixed dimensions (full-width estimate).
const RELIC_W   = 560
const RELIC_H   = 220

const RARITY_COLOR = {
  Rare:     'text-orange-400',
  Uncommon: 'text-slate-200',
  Common:   'text-kronos-dim',
}

// ─── pre-calculate toast stack size ──────────────────────────────────────────

function stackBounds(count) {
  if (count === 0) return { w: 0, h: 0 }
  return {
    w: TOAST_W,
    h: count * TOAST_H + Math.max(0, count - 1) * TOAST_GAP,
  }
}

// ─── resize + reposition the overlay window ───────────────────────────────────
// We call this *before* updating React state so the Tauri window is already
// the correct size when WebKit renders the new content.

async function applyBounds(w, h, pos) {
  if (w < 1 || h < 1) {
    return invoke('hide_overlay').catch(() => {})
  }
  return invoke('update_overlay_bounds', {
    width:    Math.ceil(w),
    height:   Math.ceil(h),
    position: pos,
  }).catch(e => console.warn('update_overlay_bounds:', e))
}

// ─── component ───────────────────────────────────────────────────────────────

export default function NotificationOverlay() {
  const [toasts,    setToasts]    = useState([])
  const [relicData, setRelicData] = useState(null)
  const posRef = useRef(localStorage.getItem('notif_position') || 'top-right')
  const [, forceRerender] = useState(0)

  const setPos = (p) => { posRef.current = p; forceRerender(n => n + 1) }

  // Live refs — declared first so useEffect closures can safely reference them.
  const liveCount     = useRef(0)
  const relicRef      = useRef(null)
  const relicTimerRef = useRef(null)

  const closeRelic = () => {
    if (relicTimerRef.current) { clearTimeout(relicTimerRef.current); relicTimerRef.current = null }
    relicRef.current = null
    setRelicData(null)
    invoke('hide_overlay').catch(() => {})
  }

  // ── sync position from main window ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'notif_position' && e.newValue) setPos(e.newValue) }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // ── Tauri event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const subs = []

    subs.push(listen('new-notification', async (e) => {
      const pos = e.payload.position || posRef.current
      setPos(pos)

      // 1. Calculate the NEW stack size (current + 1).
      //    We snapshot toasts *outside* setState so we can use it synchronously.
      const id = Date.now() + Math.random()

      // setToasts is async so we can't reliably read prev here;
      // instead we keep a local live ref for the count.
      liveCount.current += 1
      const count = liveCount.current
      const { w, h } = stackBounds(count)

      // 2. Resize the window FIRST.
      await applyBounds(w, h, pos)

      // 3. Now render the toast.
      setToasts(prev => [...prev, { id, exiting: false, ...e.payload }])

      // 4. Schedule exit.
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
        setTimeout(() => {
          liveCount.current = Math.max(0, liveCount.current - 1)
          setToasts(prev => {
            const next = prev.filter(t => t.id !== id)
            const { w: nw, h: nh } = stackBounds(next.length)
            // If relic is still showing and toasts hit zero, keep relic at bottom.
            if (relicRef.current && next.length === 0) {
              applyBounds(RELIC_W, RELIC_H, 'bottom-center')
            } else {
              applyBounds(nw, nh, posRef.current)
            }
            return next
          })
        }, EXIT_MS)
      }, TOAST_MS)
    }))

    subs.push(listen('show-relic-rewards', async (e) => {
      // Relic banner ALWAYS anchors to the bottom-center, ignore notification position
      await applyBounds(RELIC_W, RELIC_H, 'bottom-center')
      relicRef.current = e.payload
      setRelicData(e.payload)

      // Auto-dismiss after 15 seconds
      if (relicTimerRef.current) clearTimeout(relicTimerRef.current)
      relicTimerRef.current = setTimeout(() => {
        closeRelic()
      }, 15000)
    }))

    subs.push(listen('hide-overlay', () => {
      liveCount.current = 0
      relicRef.current  = null
      setToasts([])
      setRelicData(null)
      invoke('hide_overlay').catch(() => {})
    }))

    return () => subs.forEach(p => p.then(f => f()))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const pos = posRef.current

  const slideIn =
    pos === 'top-left'   ? 'notif-slide-left'  :
    pos === 'top-center' ? 'notif-slide-top'   :
  /* top-right */          'notif-slide-right'

  return (
    <div className="fixed inset-0 pointer-events-none overflow-visible">

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="flex flex-col gap-3">
          {toasts.map(t => (
            <ToastCard key={t.id} toast={t} slideIn={slideIn} />
          ))}
        </div>
      )}

      {relicData && (
        <RelicBanner data={relicData} onClose={closeRelic} />
      )}

    </div>
  )
}

// ── Toast card ───────────────────────────────────────────────────────────────

function ToastCard({ toast, slideIn }) {
  return (
    <div
      className={`w-72 flex gap-3 items-start p-4 rounded-xl pointer-events-auto ${toast.exiting ? 'notif-exit' : slideIn}`}
      style={{
        background: 'var(--color-panel)',
        color: 'var(--color-text)',
        border: '1px solid rgba(var(--color-accent-rgb),0.25)',
        borderLeft: '3px solid var(--color-accent)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.85)',
        willChange: 'transform,opacity',
        overflow: 'hidden',
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(var(--color-accent-rgb),0.12)' }}
      >
        {toast.image
          ? <img src={toast.image} alt="" className="w-full h-full object-contain p-0.5" />
          : <Bell size={16} style={{ color: 'var(--color-accent)' }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5"
          style={{ color: 'var(--color-accent)' }}>
          {toast.title}
        </p>
        <p className="text-[12px] font-medium leading-snug"
          style={{ color: 'var(--color-text)' }}>
          {toast.message}
        </p>
      </div>
    </div>
  )
}

// ── Relic banner ─────────────────────────────────────────────────────────────

function RelicBanner({ data, onClose }) {
  const rewards = data?.rewards ?? []

  return (
    <div
      className="pointer-events-auto notif-slide-bottom"
      style={{
        background:   'var(--color-panel)',
        borderTop:    '2px solid rgba(var(--color-accent-rgb),0.35)',
        boxShadow:    '0 -8px 40px rgba(0,0,0,0.8)',
        borderRadius: '12px',
        width:        `${RELIC_W}px`,
      }}
    >
      <div className="flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid rgba(var(--color-accent-rgb),0.1)' }}>
        <div className="flex items-center gap-2">
          <Zap size={13} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}>
            Relic Rewards
          </span>
        </div>
        <button onClick={onClose}
          className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity">
          ×
        </button>
      </div>

      <div className="flex gap-6 px-6 py-5 justify-center">
        {rewards.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2 w-32">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center p-2"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {item.image
                ? <img src={item.image} alt="" className="w-full h-full object-contain drop-shadow-lg" />
                : <Star size={28} style={{ color: 'var(--color-accent)' }} />
              }
            </div>
            <p className={`text-[10px] font-black uppercase tracking-wide text-center leading-tight line-clamp-2 w-full
              ${RARITY_COLOR[item.rarity] || ''}`}
              style={!RARITY_COLOR[item.rarity] ? { color: 'var(--color-text-dim)' } : undefined}>
              {item.name}
            </p>
            <div className="flex items-center gap-1.5">
              {item.price != null && (
                <span className="text-xs font-black" style={{ color: 'var(--color-accent)' }}>
                  {item.price}p
                </span>
              )}
              {item.owned > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-dim)' }}>
                  ×{item.owned}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}