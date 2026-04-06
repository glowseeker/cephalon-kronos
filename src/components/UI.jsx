// UI primitives and shared components
import { useRef, useEffect, useState } from 'react';
import { X, AlertCircle, RefreshCw } from 'lucide-react';

// Monitor State Prompt
// Unified "No inventory data found" component.
export function MonitorState({ className = "", isLoading = false }) {
  const goToSettings = () => {
    const btn = document.getElementById('nav-settings');
    if (btn) btn.click();
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-8 bg-kronos-panel/10 rounded-xl border border-dashed border-white/10 ${className}`}>
        <RefreshCw size={48} className="text-kronos-accent animate-spin mb-4" />
        <h3 className="text-xl font-bold uppercase mb-2">Inventory Loading...</h3>
        <p className="text-sm text-kronos-dim max-w-xs uppercase font-medium">
          Processing your game collection data.
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-kronos-panel/10 rounded-xl border border-dashed border-white/10 ${className}`}>
      <AlertCircle size={48} className="text-kronos-accent/30 mb-4" />
      <h3 className="text-xl font-bold uppercase mb-2">No inventory data found.</h3>
      <p className="text-sm text-kronos-dim mb-6 max-w-xs uppercase font-medium">
        Sync your game memory to view your collection and progress.
      </p>
      <Button onClick={goToSettings} className="px-8 font-black uppercase tracking-widest">
        Go to Settings to Start Monitoring
      </Button>
    </div>
  );
}

// Card Component
// A simple panel wrapper with optional glow style.
export function Card({ children, className = '', glow = false, ...props }) {
  return (
    <div 
      className={`
        glass-panel rounded-lg p-6
        ${glow ? 'glow-hover' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

// Page Layout Component
import { useMonitoring } from '../contexts/MonitoringContext'

export function PageLayout({ title, subtitle, children, extra }) {
  const { lastUpdate } = useMonitoring() || {}

  return (
    <div className="h-full flex flex-col">
      {/* Header stays fixed at the top */}
      <div className="px-8 pt-8 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-tight">{title}</h1>
            {subtitle && <p className="text-kronos-dim mt-1">{subtitle}</p>}
          </div>
          {extra && <div className="flex items-center gap-4">{extra}</div>}
        </div>
      </div>
        {/* Actual page contant below header */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 pt-4 custom-scrollbar">
          {children}
      </div>
    </div>
  )
}

// Empty State Component
// Empty State
// Shows a friendly placeholder when a view has no data.
export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        {Icon && <Icon className="w-16 h-16 text-kronos-accent mx-auto mb-4" />}
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        {description && <p className="text-kronos-dim">{description}</p>}
      </div>
    </div>
  )
}

// Card Header Component
// Renders the standard icon + title row at the top of a Card.
// Pass `action` to render an optional right-side element (button, badge, etc.)
export function CardHeader({ icon: Icon, title, action }) {
  return (
    <div className={`flex items-center ${action ? 'justify-between' : 'gap-2'} mb-2`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-kronos-accent flex-shrink-0" />}
        <p className="font-bold text-sm uppercase">{title}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

// Button Component
export function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  ...props 
}) {
  const variants = {
    primary: 'bg-kronos-accent hover:bg-kronos-accent-secondary text-kronos-bg glow-hover',
    secondary: 'glass-panel hover:bg-kronos-panel/80 text-kronos-text',
    ghost: 'hover:bg-kronos-panel/40 text-kronos-dim hover:text-kronos-text',
  }

  return (
    <button
      className={`
        px-4 py-2.5 rounded-lg font-medium transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${variants[variant]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

// Input Component
export function Input({ className = '', ...props }) {
  return (
    <input
      className={`
        w-full glass-panel rounded-lg px-4 py-2.5
        text-kronos-text placeholder-kronos-dim
        focus:outline-none focus:glow-border
        transition-shadow duration-200
        ${className}
      `}
      {...props}
    />
  )
}

// Tab/Category/Filter Component
export function Tabs({ tabs, activeTab, onChange, className = '', fullWidth = false }) {
  return (
    <div
      className={`flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5 ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans
            ${fullWidth ? 'flex-1' : ''}
            ${(Array.isArray(activeTab) ? activeTab.includes(tab.id) : activeTab === tab.id)
              ? 'bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]'
              : 'text-kronos-dim hover:text-white hover:bg-white/5'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Modal Component
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      <div className={`relative w-full ${maxWidth} bg-kronos-bg border border-white/5 rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-kronos-dim hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </div>
      </div>
    </div>
  )
}

// Toggle Component
export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-left group"
    >
      <div>
        {label && <span className="text-sm font-medium">{label}</span>}
        {description && <p className="text-xs text-kronos-dim mt-0.5">{description}</p>}
      </div>
      <div
        className={`
          relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-kronos-accent' : 'bg-white/10'}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </div>
    </button>
  )
}

// Stat Card Component
export function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <Card glow>
      <div className="flex items-center gap-3 mb-3">
        {Icon && <Icon className="text-kronos-accent" size={24} />}
        <span className="text-sm font-medium text-kronos-dim">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtext && <div className="text-sm text-kronos-dim">{subtext}</div>}
    </Card>
  )
}

// Item Card
// Reusable card to display item details (warframes / weapons etc.).
export function ItemCard({ item }) {
  return (
    <Card glow className="p-4">
      <h3 className="font-bold mb-2">{item.display_name}</h3>
      
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-kronos-dim">Rank</span>
          <span>{item.mastery?.current_rank}/{item.mastery?.max_rank}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-kronos-dim">Mastered</span>
          <span className={item.mastery?.mastered ? 'text-green-500' : 'text-gray-500'}>
            {item.mastery?.mastered ? '✓' : '✗'}
          </span>
        </div>
        
        {item.forma_count > 0 && (
          <div className="flex justify-between">
            <span className="text-kronos-dim">Forma</span>
            <span>{item.forma_count}</span>
          </div>
        )}
        
        {item.subsumed && (
          <div className="text-purple-400 text-xs">
            ⚗️ Subsumed
          </div>
        )}
      </div>
    </Card>
  )
}
