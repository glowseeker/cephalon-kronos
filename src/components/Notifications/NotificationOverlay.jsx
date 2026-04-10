/**
 * NotificationOverlay.jsx
 *
 * Runs inside overlay-tr, overlay-tl, overlay-tc, overlay-relic.
 *
 * APPROACH: Rust handles all window positioning and showing.
 *           JS only manages card state and calls hide when empty.
 *           No ResizeObserver feedback loop — eliminates all silent failure points.
 *
 * Cards are click-through (window has ignore_cursor_events=true).
 * Relic window has ignore_cursor_events=false so the close button works.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { Bell, Star, Zap, X } from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────

const TOAST_DURATION = 5000
const EXIT_DURATION = 300
const RELIC_DURATION = 15000
const MAX_VISIBLE = 5

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

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return { ...state, toasts: [...state.toasts, action.payload] }
    case 'PROMOTE':
      return {
        ...state, toasts: state.toasts.map(t =>
          t.id === action.id ? { ...t, status: 'showing' } : t
        )
      }
    case 'EXIT':
      return {
        ...state, toasts: state.toasts.map(t =>
          t.id === action.id ? { ...t, status: 'exiting' } : t
        )
      }
    case 'REMOVE':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'RELIC_SHOW': return { ...state, relic: action.payload }
    case 'RELIC_HIDE': return { ...state, relic: null }
    case 'WIPE': return { toasts: [], relic: null }
    default: return state
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationOverlay() {
  const [{ toasts, relic }, dispatch] = useReducer(reducer, { toasts: [], relic: null })
  const relicTimer = useRef(null)
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  // Read our position from the window label — synchronous, no state needed
  const myLabel = appWindow.label
  const myPos = LABEL_TO_POS[myLabel] ?? 'top-right'

  // ── Schedule exit for a toast ─────────────────────────────────────────────
  const scheduleExit = useCallback((id) => {
    setTimeout(() => {
      dispatchRef.current({ type: 'EXIT', id })
      setTimeout(() => dispatchRef.current({ type: 'REMOVE', id }), EXIT_DURATION)
    }, TOAST_DURATION)
  }, [])

  // ── Promote queued toasts as slots open ───────────────────────────────────
  useEffect(() => {
    const showing = toasts.filter(t => t.status === 'showing').length
    const next = toasts.find(t => t.status === 'queued')
    if (next && showing < MAX_VISIBLE) {
      dispatch({ type: 'PROMOTE', id: next.id })
      scheduleExit(next.id)
    }
  }, [toasts, scheduleExit])

  // ── Hide window when empty ────────────────────────────────────────────────
  useEffect(() => {
    const empty = toasts.length === 0 && !relic
    if (empty) {
      invoke('hide_overlay_window', { label: myLabel }).catch(() => { })
    }
  }, [toasts.length, relic, myLabel])

  // ── Tauri event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const subs = []

    subs.push(listen('new-notification', (e) => {
      const { id, position = 'top-right', ...rest } = e.payload
      if (position !== myPos) return
      // Add as queued; promotion useEffect handles showing
      dispatch({ type: 'ADD', payload: { id, status: 'queued', position, ...rest } })
    }))

    subs.push(listen('show-relic-rewards', (e) => {
      if (myPos !== 'relic') return
      const rewards = Array.isArray(e.payload) ? e.payload : (e.payload?.rewards ?? [])
      dispatch({ type: 'RELIC_SHOW', payload: { rewards } })
      clearTimeout(relicTimer.current)
      relicTimer.current = setTimeout(() => dispatchRef.current({ type: 'RELIC_HIDE' }), RELIC_DURATION)
    }))

    subs.push(listen('wipe-state', () => {
      clearTimeout(relicTimer.current)
      dispatch({ type: 'WIPE' })
    }))

    return () => {
      clearTimeout(relicTimer.current)
      subs.forEach(p => p.then(f => f()))
    }
  }, [myPos, scheduleExit])

  const dismissRelic = useCallback(() => {
    clearTimeout(relicTimer.current)
    dispatch({ type: 'RELIC_HIDE' })
    invoke('hide_overlay_window', { label: 'overlay-relic' }).catch(() => { })
  }, [])

  const visible = toasts.filter(t => t.status !== 'queued')

  // ── Render ─────────────────────────────────────────────────────────────────
  // The window is full-screen height but click-through.
  // Cards stack from the top (or bottom for relic).
  // The transparent area below cards passes all mouse events to the game.

  return (
    <div className="flex flex-col gap-2 p-3 select-none" style={{ width: '300px' }}>
      {visible.map(t => <ToastCard key={t.id} toast={t} />)}

      {relic && myPos === 'relic' && (
        <RelicCard data={relic} onClose={dismissRelic} />
      )}
    </div>
  )
}

// ─── Toast Card ───────────────────────────────────────────────────────────────

function ToastCard({ toast }) {
  const anim = toast.status === 'exiting' ? 'notif-exit' : 'notif-slide-top'
  return (
    <div
      className={`flex gap-3 items-center px-3 py-3 rounded-xl ${anim}`}
      style={{
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.25)',
        borderLeft: '3px solid var(--color-accent)',
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: 'rgba(var(--color-accent-rgb), 0.15)' }}
      >
        {toast.image
          ? <img src={toast.image} alt="" className="w-6 h-6 object-contain" />
          : <Bell size={15} style={{ color: 'var(--color-accent)' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest mb-0.5 truncate"
          style={{ color: 'var(--color-accent)' }}>
          {toast.title}
        </p>
        <p className="text-[12px] font-semibold leading-tight line-clamp-2"
          style={{ color: 'var(--color-text)' }}>
          {toast.message}
        </p>
      </div>
    </div>
  )
}

// ─── Relic Card ───────────────────────────────────────────────────────────────

function RelicCard({ data, onClose }) {
  const rewards = data?.rewards ?? []
  return (
    <div
      className="rounded-2xl overflow-hidden notif-slide-top"
      style={{
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb), 0.22)',
        borderTop: '3px solid var(--color-accent)',
        width: '560px',
      }}
    >
      <div className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <Zap size={11} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest"
            style={{ color: 'var(--color-accent)' }}>
            Relic Rewards
          </span>
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
                  style={{ color: rar.text }}>
                  {item.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.price != null && (
                    <span className="text-[10px] font-black text-amber-400">{item.price}p</span>
                  )}
                  {item.owned > 0 && (
                    <span className="text-[9px] text-white opacity-40">×{item.owned}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}