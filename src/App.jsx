import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { useMonitoring } from './contexts/MonitoringContext';
import { formatLastUpdate } from './lib/warframeUtils';
import { ThemeProvider } from './contexts/ThemeContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { UpdateProvider, useUpdate } from './contexts/UpdateContext';
import { Tooltip } from './components/UI';
import { UiProvider, useUi } from './contexts/UiContext';
import { AlertTriangle, FolderOpen, BarChart3 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { loadSettings, getSetting, setSetting } from './lib/settings';
import LanguagePicker from './components/LanguagePicker';

const NAV_ITEMS = [
{ id: 'dashboard', icon: 'IconDashboard.png', label: 'Dashboard' },
{ id: 'inventory', icon: 'IconInventory.png', label: 'Inventory' },
{ id: 'mods', icon: 'Mods.png', label: 'Mods' },
{ id: 'rivens', icon: 'IconRiven.png', label: 'Rivens' },
{ id: 'relics', icon: 'IconRelic.png', label: 'Relics' },
{ id: 'mastery', icon: 'IconMastery.png', label: 'Mastery' },
{ id: 'notes', icon: 'IconNotes.png', label: 'Notes' },
{ id: 'maps', icon: 'IconMap.png', label: 'Maps' },
{ id: 'collectibles', icon: 'GrimoireMarker.png', label: 'Collectibles' },
{ id: 'checklist', icon: 'IconChecklist.png', label: 'Checklist' },
{ id: 'adversaries', icon: 'Adversaries.png', label: 'Adversaries' },
{ id: 'wiki', icon: 'Wiki.png', label: 'Wiki' },
{ id: 'settings', icon: 'IconSettings.png', label: 'Settings' },
{ id: 'about', icon: 'IconInfo.png', label: 'About' },
{ id: 'history', lucide: BarChart3, label: 'History' }];


const ICON_NAMES = [...NAV_ITEMS.filter((i) => i.icon).map((i) => i.icon), 'IconKronos.png'];

function useUIIcons(iconNames) {
  const [iconCache, setIconCache] = useState({});
  useEffect(() => {
    if (!iconNames || iconNames.length === 0) return;
    let cancelled = false;
    Promise.all(iconNames.map(async (name) => {
      try {
        const bytes = await invoke('read_file_bytes', { relative: `data/assets/ui/${name}` });
        const blob = new Blob([new Uint8Array(bytes)]);
        return [name, await new Promise((r) => {
          const f = new FileReader();
          f.onload = () => r(f.result);
          f.onerror = () => r(null);
          f.readAsDataURL(blob);
        })];
      } catch {return [name, null];}
    })).then((entries) => {
      if (cancelled) return;
      const map = {};
      for (const [name, url] of entries) if (url) map[name] = url;
      setIconCache(map);
    });
    return () => {cancelled = true;};
  }, [iconNames]);
  const uiIcon = useCallback((name) => iconCache[name] || '', [iconCache]);
  return { iconCache, uiIcon };
}

// Screens (lazy-loaded, main window only)
const Dashboard = lazy(() => import('./screens/Dashboard'));
const Inventory = lazy(() => import('./screens/Inventory'));
const History = lazy(() => import('./screens/History'));
const Mastery = lazy(() => import('./screens/Mastery'));
const Notes = lazy(() => import('./screens/Notes'));
const Maps = lazy(() => import('./screens/Maps'));
const Checklist = lazy(() => import('./screens/Checklist'));
const SettingsScreen = lazy(() => import('./screens/Settings'));
const About = lazy(() => import('./screens/About'));
const Rivens = lazy(() => import('./screens/Rivens'));
const Relics = lazy(() => import('./screens/Relics'));
const Mods = lazy(() => import('./screens/Mods'));
const Collectibles = lazy(() => import('./screens/Collectibles'));
const Wiki = lazy(() => import('./screens/Wiki'));
const Adversaries = lazy(() => import('./screens/Adversaries'));
// Overlay (separate window, no monitoring context needed)
const OverlayRouter = lazy(() => import('./components/overlays/OverlayRouter'));

// ─── Overlay window ───────────────────────────────────────────────────────────
// Rendered when the window hash is #overlay.
// IMPORTANT: does NOT include MonitoringProvider - the overlay window must not
// fire Tauri startup commands (check_exports, load_all_exports, etc.).
// It only needs ThemeProvider for CSS variable access.

function OverlayApp() {
  // Transparency is set synchronously in index.html before React renders,
  // so no useEffect is needed here - eliminating the Linux first-frame black flash.
  return (
    <ThemeProvider>
      <UpdateProvider>
        <UiProvider>
          <main
            className="h-screen w-screen overflow-hidden"
            style={{ background: 'transparent' }}>
            
            <Suspense fallback={null}>
              <OverlayRouter />
            </Suspense>
          </main>
        </UiProvider>
      </UpdateProvider>
    </ThemeProvider>);

}

// ─── First-run Setup Screen ─────────────────────────────────────────────────
// Single onboarding with optional path selectors + mandatory disclaimer.

function SetupScreen() {
  const [show, setShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const [locale, setLocale] = useState('en');
  const hasStartedRef = useRef(false);
  const [cachePath, setCachePath] = useState('');
  const [ready, setReady] = useState(false);

  const { t } = useUi();

  useEffect(() => {
    if (hasStartedRef.current) return;
    loadSettings().then(async () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

      if (!getSetting('disclaimer-accepted')) {
        setShow(true);
        setCachePath(getSetting('warframe_cache_path', ''));
        setLocale(getSetting('gameLocale', 'en'));
      }


      const savedHotkeys = getSetting('hotkeys', []);
      const valid = savedHotkeys.filter((hk) => hk.shortcut && hk.action);
      if (valid.length > 0) {
        invoke('set_hotkeys', { hotkeys: valid }).
        catch((err) => console.error('Failed to register startup hotkeys:', err));
      }

      if (getSetting('fissure_overlay_enabled')) {
        invoke('start_log_scanner').catch(console.error);
      }
      setReady(true);
      emit('frontend-ready', {}).catch(() => {});
    });
  }, []);

  const handleBrowseCache = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        setCachePath(selected);
        await setSetting('warframe_cache_path', selected);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLocaleChange = async (l) => {
    setLocale(l);
    try {
      await setSetting('gameLocale', l);
      await invoke('check_exports', { locale: l, force: false });
    } catch (err) {
      console.error('Failed to switch game language:', err);
    }
    window.location.reload();
  };

  const finish = async () => {
    if (!checked) return;
    await setSetting('disclaimer-accepted', 'true');
    setShow(false);
  };

  if (!ready || !show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-kronos-bg border border-kronos-accent/20 rounded-2xl p-8 max-w-xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-black uppercase tracking-tight text-kronos-accent mb-2">{t('ui.setup.welcome')}</h2>
        <p className="text-xs text-kronos-dim mb-6">{t('setup.setup_hint')}</p>

        {/* Language */}
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-widest text-kronos-text/80 mb-2">{t('game_language')}</p>
          <LanguagePicker value={locale} onChange={handleLocaleChange} />
          <p className="mt-2 text-[10px] text-kronos-dim leading-relaxed">{t('setup.reload_info')}</p>
        </div>

        {/* Cache path */}
        <div className="mb-4">
          <p className="text-sm font-black uppercase tracking-widest text-kronos-text/80 mb-2">{t('ui.setup.game_assets')}<span className="text-kronos-dim font-normal normal-case tracking-normal">(optional)</span></p>
          <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
            <div className="flex gap-2">
              <input type="text" value={cachePath} readOnly placeholder={t('ui.setup.cache_folder_placeholder')}
              className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border" />
              <button onClick={handleBrowseCache}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all bg-kronos-accent/10 text-kronos-accent hover:bg-kronos-accent/20 border border-kronos-accent/20 shrink-0">
                <FolderOpen size={14} />{t('ui.setup.browse')}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-kronos-dim leading-relaxed">{t('setup.cache_folder_hint')}</p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-black uppercase tracking-tight text-red-400">{t('ui.setup.disclaimer_title')}</p>
              <p className="text-xs text-kronos-text/70 mt-1">{t('ui.setup.disclaimer_text')}</p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <div onClick={() => setChecked((v) => !v)}
            className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${checked ? 'bg-kronos-accent border-kronos-accent' : 'border-white/20 hover:border-white/40'}`}>
              {checked && <span className="text-kronos-bg text-xs font-black">✓</span>}
            </div>
            <span className="text-xs text-kronos-text/90">{t('ui.setup.accept_text')}</span>
          </label>
        </div>

        <button onClick={finish} disabled={!checked}
        className={`w-full py-3 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${checked ? 'bg-kronos-accent text-kronos-bg hover:brightness-110' : 'bg-white/5 text-kronos-dim cursor-not-allowed'}`}>{t('ui.setup.continue')}

        </button>
      </div>
    </div>);

}

// ─── Main app window ──────────────────────────────────────────────────────────

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarActive, setSidebarActive] = useState(false);
  const [sidebarSide, setSidebarSide] = useState('left');
  const { lastUpdate, monitorResult, isMonitoring } = useMonitoring();
  const { updateState } = useUpdate();
  const [scannerStatus, setScannerStatus] = useState('idle'); // 'idle' | 'waiting' | 'active'

  const { uiIcon } = useUIIcons(ICON_NAMES);
  const { t } = useUi();

  useEffect(() => {
    // Poll scanner status every 2s so sidebar dot stays in sync
    const checkScanner = () => {
      invoke('get_scanner_status').then(setScannerStatus).catch(() => setScannerStatus('idle'));
    };
    checkScanner();
    const iv = setInterval(checkScanner, 2000);
    return () => clearInterval(iv);
  }, []);

  // Show toast when scanner latches onto Warframe (single notification, main window only)
  useEffect(() => {
    const unsub = listen('scanner-hooked', () => {
      invoke('show_notification', {
        title: 'Scanner',
        message: 'Log scanner hooked into Warframe',
        image: '',
        position: 'top-right',
        no_focus: true,
        silent: true
      }).catch(() => {});
    });
    return () => {unsub.then((f) => f());};
  }, []);

  // Toggle .sidebar-mode on <body> when entering/exiting sidebar mode
  useEffect(() => {
    const unsub = listen('sidebar-mode-changed', (e) => {
      document.body.classList.toggle('sidebar-mode', e.payload.active);
      setSidebarActive(e.payload.active);
      if (e.payload.side) setSidebarSide(e.payload.side);
    });
    return () => {unsub.then((f) => f());};
  }, []);

  // Apply navbar position BEFORE the window reshapes - no animation, direct DOM
  const containerRef = useRef(null);
  const resizeRef = useRef(null);
  useEffect(() => {
    const unsub = listen('sidebar-prepare', (e) => {
      const side = e.payload.side;
      if (!containerRef.current) return;
      containerRef.current.classList.toggle('flex-row-reverse', side === 'right');
      const nav = containerRef.current.querySelector('nav');
      if (nav) {
        nav.classList.toggle('border-l', side === 'right');
        nav.classList.toggle('border-r', side !== 'right');
      }
      setSidebarSide(side);
    });
    return () => {unsub.then((f) => f());};
  }, []);

  const screens = {
    dashboard: <Dashboard />,
    history: <History />,
    inventory: <Inventory />,
    rivens: <Rivens />,
    relics: <Relics />,
    mods: <Mods />,
    mastery: <Mastery />,
    notes: <Notes />,
    maps: <Maps />,
    collectibles: <Collectibles />,
    checklist: <Checklist />,
    settings: <SettingsScreen />,
    about: <About />,
    wiki: <Wiki />,
    adversaries: <Adversaries />
  };

  return (
    <div ref={containerRef} className={`flex h-screen overflow-hidden ${sidebarActive && sidebarSide === 'right' ? 'flex-row-reverse' : ''}`}>
      {/* Sidebar */}
      <nav className={`glass-panel w-20 flex flex-col items-center py-6 gap-4 z-40 relative flex-shrink-0 ${sidebarActive && sidebarSide === 'right' ? 'border-l' : 'border-r'}`}>
        {/* Logo */}
        <div className="mb-4 flex-shrink-0">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden">
            <img src={uiIcon('IconKronos.png')} alt="Cephalon Kronos" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 w-full overflow-y-auto py-2 custom-scrollbar">
          <div className="flex flex-col gap-6 items-center min-h-min pb-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <div key={item.id} className="relative">
                  {item.id === 'settings' && updateState.status === 'available' &&
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full z-10 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                  }
                  <Tooltip content={t(`nav.${item.id}`)}>
                    <button
                      id={item.id === 'settings' ? 'nav-settings' : undefined}
                      onClick={() => setActiveTab(item.id)}
                      className={`
                        w-12 h-12 flex items-center justify-center rounded-lg
                        transition-all duration-200 flex-shrink-0
                        ${isActive ?
                      'bg-kronos-accent/10 text-kronos-accent shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.2)]' :
                      'text-kronos-dim hover:bg-white/5 hover:text-white'}
                      `}>
                      
                      <div
                        className="w-7 h-7 flex-shrink-0 transition-opacity duration-200"
                        style={item.lucide ? {
                          color: isActive ? 'var(--color-accent, #5590ab)' : 'currentColor',
                        } : {
                          backgroundColor: isActive ? 'var(--color-accent, #5590ab)' : 'currentColor',
                          maskImage: `url(${uiIcon(item.icon)})`,
                          WebkitMaskImage: `url(${uiIcon(item.icon)})`,
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskPosition: 'center',
                          opacity: isActive ? 1 : 0.6
                        }}>
                        {item.lucide ? (() => { const Icon = item.lucide; return <Icon size={28} /> })() : null}
                      </div>
                      
                    </button>
                  </Tooltip>
                </div>);

            })}
          </div>
        </div>
        {/* Status dots */}
        <div className="mt-auto flex-shrink-0 flex flex-col items-center gap-3 pt-4 border-t border-white/5 w-full">
          <div className="text-xs text-kronos-dim text-center leading-snug px-1">
            {t('last_update')}<br />
            {formatLastUpdate(lastUpdate)}
          </div>
          {/* API monitoring dot */}
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
            monitorResult === 'cached' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
            monitorResult === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
            'bg-gray-600'}
            `}>
            
            <div className={`absolute top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent ${sidebarActive && sidebarSide === 'right' ? 'right-full mr-3' : 'left-full ml-3'}`}>
              {monitorResult === 'success' ? t('sync.success') : monitorResult === 'cached' ? t('sync.cached') : monitorResult === 'error' ? t('sync.error') : t('sync.offline')}
            </div>
          </div>
          {/* Scanner dot */}
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 relative group
              ${scannerStatus === 'active' ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' :
            scannerStatus === 'waiting' ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse' :
            scannerStatus === 'stale_offset' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
            'bg-gray-700'}
            `
            }>
            
            <div className={`absolute top-1/2 -translate-y-1/2 px-3 py-2 glass-panel rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] shadow-2xl bg-kronos-bg border border-white/10 font-black uppercase text-[10px] tracking-widest text-kronos-accent ${sidebarActive && sidebarSide === 'right' ? 'right-full mr-3' : 'left-full ml-3'}`}>
              {scannerStatus === 'active' ? t('scanner.active') :
              scannerStatus === 'waiting' ? t('scanner.waiting') :
              scannerStatus === 'stale_offset' ? t('scanner.stale') :
              t('scanner.idle')}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-hidden bg-kronos-bg">
        <Suspense fallback={
        <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-kronos-accent/20 border-t-kronos-accent rounded-full animate-spin" />
          </div>
        }>
          {screens[activeTab]}
        </Suspense>
      </main>

      {/* ── Resize handle for sidebar mode ── */}
      {sidebarActive &&
      <div
        ref={resizeRef}
        className="fixed top-0 bottom-0 w-3 cursor-col-resize z-[9999] flex items-center justify-center hover:bg-kronos-accent/10 transition-colors group"
        style={{ [sidebarSide === 'left' ? 'right' : 'left']: '14px', touchAction: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          const startScreenX = e.screenX;
          const startW = document.documentElement.clientWidth;
          let lastW = startW;
          const el = resizeRef.current;
          if (!el) return;

          el.setPointerCapture(e.pointerId);

          const onMove = (ev) => {
            const delta = sidebarSide === 'left' ? ev.screenX - startScreenX : startScreenX - ev.screenX;
            const newW = Math.max(200, Math.min(startW + delta, window.screen.width * 0.9));
            lastW = Math.round(newW);
            invoke('set_sidebar_width', { width: lastW, side: sidebarSide, persist: false }).catch(() => {});
          };

          const onUp = () => {
            el.removeEventListener('pointermove', onMove);
            el.removeEventListener('pointerup', onUp);
            try {el.releasePointerCapture(e.pointerId);} catch {}
            invoke('set_sidebar_width', { width: lastW, side: sidebarSide, persist: true }).catch(() => {});
            setSetting('sidebar_width', lastW).catch(() => {});
          };

          el.addEventListener('pointermove', onMove);
          el.addEventListener('pointerup', onUp);
        }}>
        
          <div className={`w-[2px] h-12 rounded-full bg-white/20 group-hover:bg-kronos-accent/50 transition-colors ${sidebarSide === 'left' ? 'mr-[10px]' : 'ml-[10px]'}`} />
        </div>
      }
    </div>);

}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isOverlay = params.get('overlay') === 'true';

  if (isOverlay) {
    return (
      <ThemeProvider>
        <OverlayApp />
      </ThemeProvider>);

  }

  return (
    <ThemeProvider>
      <UiProvider>
        <MonitoringProvider>
          <UpdateProvider>
            <SetupScreen />
            <AppContent />
          </UpdateProvider>
        </MonitoringProvider>
      </UiProvider>
    </ThemeProvider>);

}