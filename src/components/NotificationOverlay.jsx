/**
 * NotificationOverlay.jsx — Multi-Window Ephemeral Strategy
 *
 * Each window (overlay-tr, overlay-tl, overlay-tc) runs an instance of this
 * component. It filters events for its specific position and hides the
 * entire window when no notifications are active.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/tauri'
import { appWindow } from '@tauri-apps/api/window'
import { Bell, Star, Zap, X } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const TOAST_DURATION = 5_000
const TOAST_EXIT_MS = 300
const RELIC_DURATION = 15_000

const RARITY = {
  Rare: { cls: 'text-amber-400', glow: 'rgba(251,191,36,0.15)' },
  Uncommon: { cls: 'text-slate-300', glow: 'rgba(255,255,255,0.07)' },
  Common: { cls: 'text-kronos-dim', glow: 'rgba(255,255,255,0.04)' },
}

const POSITION_MAP = {
  'overlay-tr': 'top-right',
  'overlay-tl': 'top-left',
  'overlay-tc': 'top-center',
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'TOAST_ADD': return { ...state, toasts: [...state.toasts, action.payload] }
    case 'TOAST_EXITING': return { ...state, toasts: state.toasts.map(t => t.id === action.id ? { ...t, exiting: true } : t) }
    case 'TOAST_REMOVE': return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'RELIC_SHOW': return { ...state, relic: action.payload }
    case 'RELIC_HIDE': return { ...state, relic: null }
    case 'CLEAR_ALL': return { toasts: [], relic: null }
    default: return state
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function NotificationOverlay() {
  const [state, dispatch] = useReducer(reducer, { toasts: [], relic: null })
  const relicTimer = useRef(null)
  const [myLabel, setMyLabel] = useState('')

  const dismissRelic = useCallback(() => {
    clearTimeout(relicTimer.current)
    relicTimer.current = null
    dispatch({ type: 'RELIC_HIDE' })
  }, [])

  // Auto-hide window when empty
  useEffect(() => {
    if (state.toasts.length === 0 && !state.relic && myLabel) {
      invoke('hide_specific_window', { label: myLabel }).catch(console.warn)
    }
  }, [state.toasts.length, state.relic, myLabel])

  useEffect(() => {
    const label = appWindow.label
    setMyLabel(label)
    const myPos = POSITION_MAP[label] ?? 'top-right'

    const subs = []

    // ── new-notification ─────────────────────────────────────────────────────
    subs.push(listen('new-notification', (e) => {
      const { id, position = 'top-right', ...rest } = e.payload

      // ONLY handle if it matches this window's designated corner
      if (position === myPos) {
        dispatch({ type: 'TOAST_ADD', payload: { id, position, exiting: false, ...rest } })

        setTimeout(() => {
          dispatch({ type: 'TOAST_EXITING', id })
          setTimeout(() => {
            dispatch({ type: 'TOAST_REMOVE', id })
          }, TOAST_EXIT_MS)
        }, TOAST_DURATION)
      }
    }))

    // ── show-relic-rewards ────────────────────────────────────────────────────
    subs.push(listen('show-relic-rewards', (e) => {
      // Relics only show on the 'top-center' window
      if (myPos === 'top-center') {
        const rewards = Array.isArray(e.payload) ? e.payload : (e.payload?.rewards ?? [])
        dispatch({ type: 'RELIC_SHOW', payload: { rewards } })
        clearTimeout(relicTimer.current)
        relicTimer.current = setTimeout(dismissRelic, RELIC_DURATION)
      }
    }))

    // ── hide-overlay ──────────────────────────────────────────────────────────
    subs.push(listen('hide-overlay', () => {
      clearTimeout(relicTimer.current)
      relicTimer.current = null
      dispatch({ type: 'CLEAR_ALL' })
    }))

    return () => {
      clearTimeout(relicTimer.current)
      subs.forEach(p => p.then(f => f()))
    }
  }, [dismissRelic])

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full flex flex-col gap-3 p-2 overflow-hidden select-none">
      {state.relic ? (
        <RelicLite data={state.relic} onClose={dismissRelic} />
      ) : (
        state.toasts.map(t => (
          <ToastCard key={t.id} toast={t} />
        ))
      )}
    </div>
  )
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function ToastCard({ toast }) {
  const animClass = toast.exiting ? 'notif-exit' : 'notif-slide-top'
  return (
    <div
      className={`flex gap-3 items-center p-3 rounded-xl ${animClass} h-full justify-center`}
      style={{
        width: '100%',
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb),0.3)',
        borderLeft: '4px solid var(--color-accent)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--color-accent-rgb),0.2)' }}>
        {toast.image ? <img src={toast.image} alt="" className="w-6 h-6 object-contain" /> : <Bell size={16} style={{ color: 'var(--color-accent)' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-accent)' }}>{toast.title}</p>
        <p className="text-[12px] font-bold leading-tight line-clamp-2" style={{ color: 'var(--color-text)' }}>{toast.message}</p>
      </div>
    </div>
  )
}

function RelicLite({ data, onClose }) {
  const rewards = data?.rewards ?? []
  return (
    <div
      className="w-full rounded-2xl overflow-hidden flex flex-col notif-slide-top h-fit"
      style={{
        background: 'var(--color-panel)',
        border: '1px solid rgba(var(--color-accent-rgb),0.3)',
        borderTop: '3px solid var(--color-accent)',
        boxShadow: '0 12px 64px rgba(0,0,0,0.95)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <Zap size={11} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--color-accent)' }}>Relic Rewards</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
          <X size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 py-3">
        {rewards.slice(0, 4).map((item, i) => {
          const rar = RARITY[item.rarity] ?? RARITY.Common
          return (
            <div key={i} className="flex items-center gap-3 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: rar.glow, border: '1px solid rgba(255,255,255,0.08)' }}>
                {item.image ? <img src={item.image} alt="" className="w-9 h-9 object-contain drop-shadow-md" /> : <Star size={20} style={{ color: 'var(--color-accent)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-black uppercase tracking-tight leading-tight line-clamp-2 ${rar.cls}`}>{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.price != null && <span className="text-[11px] text-amber-400 font-bold">{item.price}p</span>}
                  {item.owned > 0 && <span className="text-[9px] opacity-60 font-bold text-white/50">×{item.owned}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
