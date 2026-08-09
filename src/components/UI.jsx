// UI primitives and shared components
import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, RefreshCw } from 'lucide-react';
import { useUi } from '../contexts/UiContext';
import { resolveGameTerm } from '../lib/gameTerm';

// Portal tooltip that follows trigger during scroll/resize
export function TooltipPortal({ children, triggerRef, visible, position = 'right' }) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!triggerRef.current || !visible) return;

    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();

      if (position === 'right') {
        setCoords({
          top: rect.top + window.scrollY + rect.height / 2,
          left: rect.right + window.scrollX + 8
        });
      } else if (position === 'top') {
        setCoords({
          top: rect.top + window.scrollY - 8,
          left: rect.left + window.scrollX + rect.width / 2
        });
      } else if (position === 'bottom') {
        setCoords({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX + rect.width / 2
        });
      }
    };

    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [triggerRef, visible, position]);

  useEffect(() => {
    if (visible) setOpacity(1);else
    setOpacity(0);
  }, [visible]);

  if (!visible && opacity === 0) return null;

  return createPortal(
    <div
      className="fixed z-[9999] pointer-events-none bg-kronos-bg border border-white/10 rounded-lg px-3 py-2 shadow-2xl glass-panel font-black uppercase text-[10px] tracking-widest text-kronos-accent whitespace-nowrap transition-opacity duration-200"
      style={{
        top: coords.top,
        left: coords.left,
        transform: position === 'right' ? 'translateY(-50%)' : 'translateX(-50%) translateY(-100%)',
        opacity
      }}>
      
      {children}
    </div>,
    document.body
  );
}

export function Tooltip({ children, content, position = 'right' }) {
  const triggerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="inline-block">
        
        {children}
      </div>
      <TooltipPortal triggerRef={triggerRef} visible={visible} position={position}>
        {content}
      </TooltipPortal>
    </>);

}

// Monitor State Prompt
// Unified "No inventory data found" component.
export function MonitorState({ className = "", isLoading = false }) {
  const { t, locale } = useUi();
  const goToSettings = () => {
    const btn = document.getElementById('nav-settings') ??
    document.querySelector('[data-nav="settings"]');
    btn?.click();
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center text-center p-8 bg-kronos-panel/10 rounded-xl border border-dashed border-white/10 ${className}`}>
        <RefreshCw size={48} className="text-kronos-accent animate-spin mb-4" />
        <h3 className="text-xl font-bold uppercase mb-2">{t('loading.inventory')}</h3>
        <p className="text-sm text-kronos-dim max-w-xs uppercase font-medium">
          {t('loading.processing')}
        </p>
      </div>);

  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-kronos-panel/10 rounded-xl border border-dashed border-white/10 ${className}`}>
      <AlertCircle size={48} className="text-kronos-accent/30 mb-4" />
      <h3 className="text-xl font-bold uppercase mb-2">{t('loading.no_data')}</h3>
      <p className="text-sm text-kronos-dim mb-6 max-w-xs uppercase font-medium">
        {t('loading.no_data_hint')}
      </p>
      <Button onClick={goToSettings} className="px-8 font-black uppercase tracking-widest">
        {t('loading.go_settings')}
      </Button>
    </div>);

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
      {...props}>
      
      {children}
    </div>);

}

// Page Layout Component
import { useMonitoring } from '../contexts/MonitoringContext';
import { ChevronUp } from 'lucide-react';

function BackToTopButton({ scrollRef }) {
  const [visible, setVisible] = useState(false);
  const { t } = useUi();

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      setVisible(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [scrollRef]);

  if (!visible) return null;

  return (
    <button
      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-kronos-accent text-kronos-bg shadow-lg hover:scale-110 transition-transform"
      title={t('ui.comp.back_to_top')}>
      
      <ChevronUp size={20} strokeWidth={2.5} />
    </button>);

}

export function PageLayout({ title, titleKey, subtitle, children, extra, headerPanel }) {
  const { t } = useUi();
  const scrollRef = useRef(null);

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Title Section */}
      <div className="relative flex-shrink-0 bg-inherit">
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tight">{titleKey ? t(titleKey) : title}</h1>
              {subtitle && <p className="text-kronos-dim mt-1 text-sm font-medium uppercase tracking-wide">{subtitle}</p>}
            </div>
            {extra && <div className="flex items-center gap-4">{extra}</div>}
          </div>
        </div>
      </div>
      
      {/* Scrollable Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 pb-8 pt-0 min-h-0 flex flex-col custom-scrollbar">
        <div className="relative flex-1 min-h-0 flex flex-col">
          {headerPanel &&
          <div className="sticky top-0 z-30 py-4 bg-kronos-bg -mx-8 px-8 border-b border-white/5 mb-6">
              {headerPanel}
            </div>
          }
          {children}
        </div>
      </div>
      <BackToTopButton scrollRef={scrollRef} />
    </div>);

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
    </div>);

}

// Card Header Component
// Renders the standard icon + title row at the top of a Card.
// Pass `action` to render an optional right-side element (button, badge, etc.)
export function CardHeader({ icon: Icon, imageSrc, title, action }) {
  return (
    <div className={`flex items-center ${action ? 'justify-between' : 'gap-2'} mb-2`}>
      <div className="flex items-center gap-2">
        {imageSrc ?
        <img src={imageSrc} className="w-5 h-5 object-contain flex-shrink-0" alt="" /> :
        Icon ?
        <Icon size={20} className="text-kronos-accent flex-shrink-0" /> :
        null}
        <p className="font-bold text-sm uppercase">{title}</p>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>);

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
    ghost: 'hover:bg-kronos-panel/40 text-kronos-dim hover:text-kronos-text'
  };

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
      {...props}>
      
      {children}
    </button>);

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
      {...props} />);


}

// Tab/Category/Filter Component
export function Tabs({ tabs, activeTab, onChange, className = '', fullWidth = false }) {
  return (
    <div
      className={`flex flex-wrap gap-1 p-1 bg-black/20 rounded-xl border border-white/5 ${className}`}>
      
          {tabs.map((tab) =>
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`
                px-4 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center justify-center gap-1.5
                ${fullWidth ? 'flex-1' : ''}
                ${(Array.isArray(activeTab) ? activeTab.includes(tab.id) : activeTab === tab.id) ?
        'bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]' :
        'text-kronos-dim hover:text-white hover:bg-white/5'}
              `
        }>
        
              {tab.icon && <img src={tab.icon} className="w-5 h-5 object-contain" alt="" />}
              {tab.label}
            </button>
      )}
    </div>);

}

// Select Component
export function Select({ options, value, onChange, label, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">{label}</span>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-kronos-panel/30 border border-white/5 rounded-xl px-4 py-2 text-sm font-bold appearance-none focus:outline-none focus:glow-border transition-all cursor-pointer text-kronos-text">
          
          {options.map((opt) =>
          <option key={opt.id} value={opt.id} className="bg-kronos-bg text-kronos-text">
              {opt.label}
            </option>
          )}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-kronos-dim">
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>);

}

// Modal Component
export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';else
    document.body.style.overflow = 'unset';
    return () => {document.body.style.overflow = 'unset';};
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="absolute inset-0"
        onClick={onClose} />
      
      <div className={`relative w-full ${maxWidth} bg-kronos-bg border border-white/5 rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-kronos-dim hover:text-white">
            
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>);

}

// Toggle Component
export function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full text-left group">
      
      <div>
        {label && <span className="text-sm font-medium">{label}</span>}
        {description && <p className="text-xs text-kronos-dim mt-0.5">{description}</p>}
      </div>
      <div
        className={`
          relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0
          ${checked ? 'bg-kronos-accent' : 'bg-white/10'}
        `}>
        
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `} />
        
      </div>
    </button>);

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
    </Card>);

}

// Item Card
// Reusable card to display item details (warframes / weapons etc.).
export function ItemCard({ item }) {
  const { t } = useUi();
  return (
    <Card glow className="p-4">
      <h3 className="font-bold mb-2">{item.display_name}</h3>

      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-kronos-dim">{t('ui.comp.rank')}</span>
          <span>{item.mastery?.current_rank}/{item.mastery?.max_rank}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-kronos-dim">{t('ui.comp.mastered')}</span>
          <span className={item.mastery?.mastered ? 'text-green-500' : 'text-gray-500'}>
            {item.mastery?.mastered ? '✓' : '✗'}
          </span>
        </div>

        {item.forma_count > 0 &&
        <div className="flex justify-between">
            <span className="text-kronos-dim">{resolveGameTerm('/Lotus/Language/Items/Forma', locale)}</span>
            <span>{item.forma_count}</span>
          </div>
        }

        {item.subsumed &&
        <div className="text-purple-400 text-xs">
            ⚗️ Subsumed
          </div>
        }
      </div>
    </Card>);

}