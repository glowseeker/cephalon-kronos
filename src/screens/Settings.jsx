import { useState, useEffect, useRef } from 'react';
import { Palette, Bell, RefreshCw, X, FolderOpen, Keyboard, MousePointer, AlignStartVertical, AlignEndVertical, AlignVerticalJustifyStart, VolumeX, Play, PanelLeft, PanelRight } from 'lucide-react';

import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { useUpdate } from '../contexts/UpdateContext';
import { useUi } from '../contexts/UiContext';
import { getSetting, setSetting, onSettingsChanged } from '../lib/settings';
import { useTheme } from '../contexts/ThemeContext';
import { useMonitoring } from '../contexts/MonitoringContext';
import { formatLastUpdate } from '../lib/warframeUtils';
import { PageLayout, Card, Button, Toggle } from '../components/UI';
import NotificationManager from '../components/NotificationManager';
import LanguagePicker from '../components/LanguagePicker';

function HotkeyRecorder({ value, onChange, placeholder }) {
  const [recording, setRecording] = useState(false);
  const buttonRef = useRef(null);
  const { t } = useUi();

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier-only presses
      if (['Control', 'Shift', 'Alt', 'Meta', 'Command', 'CapsLock'].includes(e.key)) return;

      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('CmdOrControl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Bare keys (no modifier) can't be grabbed over a fullscreen game.
      // Reject and flash the button red.
      if (parts.length === 0) {
        const btn = buttonRef.current;
        if (btn) {
          btn.classList.add('border-red-500', 'bg-red-500/20');
          setTimeout(() => btn.classList.remove('border-red-500', 'bg-red-500/20'), 600);
        }
        return;
      }

      let key = e.key.toUpperCase();
      if (key === ' ') key = 'Space';
      if (key === 'ARROWUP') key = 'Up';
      if (key === 'ARROWDOWN') key = 'Down';
      if (key === 'ARROWLEFT') key = 'Left';
      if (key === 'ARROWRIGHT') key = 'Right';
      if (key === 'ESCAPE') key = 'Esc';

      parts.push(key);
      const shortcut = parts.join('+');
      onChange(shortcut);
      setRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, onChange]);

  return (
    <button
      ref={buttonRef}
      onClick={() => setRecording(!recording)}
      onBlur={() => setRecording(false)}
      className={`h-9 px-4 rounded-lg border text-xs font-mono transition-all ${recording ?
      'border-kronos-accent bg-kronos-accent/20 text-white animate-pulse' :
      'border-white/10 bg-black/20 text-kronos-dim hover:border-white/20'}`
      }>
      
      {recording ? t('settings.recording') : value || t('settings.none')}
    </button>);

}

export default function SettingsScreen() {
  const { theme, setTheme, themes, cursorStyle, setCursorStyle, cursorTint, setCursorTint } = useTheme();
  const { isMonitoring, startMonitoring, stopMonitoring, manualRefresh, lastUpdate, statusText, autoStart, setAutoStart, monitorResult, nextRetryAt, refreshPrices, isPriceLoading, priceFetchProgress, priceLastUpdated, retryCardImages } = useMonitoring();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scannerStatus, setScannerStatus] = useState('idle'); // 'idle' | 'waiting' | 'active'
  const [localeLoading, setLocaleLoading] = useState(false);
  const { t } = useUi();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!isMonitoring) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isMonitoring]);

  const [hotkeys, setHotkeys] = useState(
    () => getSetting('hotkeys', [{ action: 'manual_ocr', shortcut: '' }])
  );
  const [sidebarSide, setSidebarSide] = useState(
    () => getSetting('sidebar_side', 'left')
  );
  const [sidebarHideOnFocusLoss, setSidebarHideOnFocusLoss] = useState(
    () => getSetting('sidebar_hide_on_focus_loss', true)
  );

  const handleUpdateHotkeys = async (newHotkeys) => {
    setHotkeys(newHotkeys);
    await setSetting('hotkeys', newHotkeys);

    // Unregister and re-register all with Rust
    try {
      await invoke('set_hotkeys', { hotkeys: newHotkeys.filter((hk) => hk.shortcut && hk.action) });
    } catch (err) {
      console.error('Hotkey sync failed:', err);
    }
  };

  const HOTKEY_ACTIONS = [
  { id: 'manual_ocr', label: t('settings.action_manual_ocr') },
  { id: 'toggle_sidebar', label: t('settings.action_toggle_sidebar') }]


  const [version, setVersion] = useState('');
  const [updateOnStartup, setUpdateOnStartup] = useState(
    () => getSetting('update_on_startup', true)
  );

  const { updateState, checkForUpdates, installLatestUpdate } = useUpdate();

  const handleInstallUpdate = async () => {
    try {
      await installLatestUpdate();
    } catch (err) {
      console.error('Install update failed:', err);
    }
  };

  const handleDownloadUpdate = (url) => {
    if (url) {
      invoke('open_url', { url });
    }
  };

  const handleSetUpdateOnStartup = async (val) => {
    setUpdateOnStartup(val);
    await setSetting('update_on_startup', val);
  };

  // Notification settings
  const [notifPosition, setNotifPosition] = useState(
    () => getSetting('notif_position', 'top-right')
  );
  const [notifSound, setNotifSound] = useState(
    () => getSetting('notif_sound', 'notification1.wav')
  );

  const [notifArbitrationEnabled, setNotifArbitrationEnabled] = useState(
    () => getSetting('notif_arbitration_enabled', false)
  );

  const [uiPath, setUiPath] = useState('');
  useEffect(() => {invoke('get_ui_path').then(setUiPath).catch(() => {});}, []);

  const [tintedCursors, setTintedCursors] = useState({});
  useEffect(() => {
    if (!uiPath || !cursorTint) {setTintedCursors({});return;}
    const build = async () => {
      const result = {};
      for (const name of ['CursorDefault', 'CursorRetro']) {
        try {
          const src = convertFileSrc(`${uiPath}/${name}.png`);
          const resp = await fetch(src);
          const blob = await resp.blob();
          const img = await createImageBitmap(blob);
          const scale = 24 / Math.max(img.width, img.height);
          const w = Math.round(img.width * scale) || 1;
          const h = Math.round(img.height * scale) || 1;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#00aaff';
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, w, h);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(img, 0, 0, w, h);
          result[name] = canvas.toDataURL();
        } catch {

          // fallback - leave undefined
        }}
      setTintedCursors(result);
    };
    build();
  }, [cursorTint, uiPath, theme]);
  const [notifArbitrationHours, setNotifArbitrationHours] = useState(
    () => parseInt(getSetting('notif_arbitration_hours', 24))
  );
  const [notifArbitrationRemind, setNotifArbitrationRemind] = useState(
    () => parseInt(getSetting('notif_arbitration_remind', 30))
  );

  const [notifFoundryEnabled, setNotifFoundryEnabled] = useState(
    () => getSetting('notif_foundry_enabled', false)
  );
  const [notifFoundryMinutes, setNotifFoundryMinutes] = useState(
    () => parseInt(getSetting('notif_foundry_minutes', 5))
  );

  const [notifSyndicateEnabled, setNotifSyndicateEnabled] = useState(
    () => getSetting('notif_syndicate_enabled', false)
  );
  const [notifSyndicateWasteEnabled, setNotifSyndicateWasteEnabled] = useState(
    () => getSetting('notif_syndicate_waste_enabled', false)
  );

  const [notifVoidTracesEnabled, setNotifVoidTracesEnabled] = useState(
    () => getSetting('notif_void_traces_enabled', false)
  );

  const [notifMasteryEnabled, setNotifMasteryEnabled] = useState(
    () => getSetting('notif_mastery_enabled', false)
  );
  const [notifMasteryPercent, setNotifMasteryPercent] = useState(
    () => parseInt(getSetting('notif_mastery_percent', 75))
  );

  const [notifChecklistMinutes, setNotifChecklistMinutes] = useState(
    () => parseInt(getSetting('notif_checklist_minutes', 60))
  );

  // Fissure Overlay Settings
  const [fissureOverlayEnabled, setFissureOverlayEnabled] = useState(
    () => getSetting('fissure_overlay_enabled')
  );
  const [warframeCachePath, setWarframeCachePath] = useState(
    () => getSetting('warframe_cache_path', '')
  );
  const [fissureUiScale, setFissureUiScale] = useState(
    () => parseInt(getSetting('fissure_ui_scale', 100))
  );
  const [fissureTargetMonitor, setFissureTargetMonitor] = useState(
    () => getSetting('fissure_target_monitor', 'auto')
  );
  const [autoMonitor, setAutoMonitor] = useState(
    () => getSetting('fissure_target_monitor', 'auto') === 'auto'
  );
  const [availableMonitors, setAvailableMonitors] = useState([]);

  // Poll scanner status
  useEffect(() => {
    let interval;
    if (fissureOverlayEnabled) {
      const poll = () => {
        invoke('get_scanner_status').then((s) => {
          setScannerStatus((prev) => {
            if (prev === 'waiting' && s === 'idle') return prev;
            return s;
          });
        }).catch(() => setScannerStatus('idle'));
      };
      poll();
      interval = setInterval(poll, 2000);
    } else {
      setScannerStatus('idle');
    }
    return () => clearInterval(interval);
  }, [fissureOverlayEnabled]);

  // Re-read scanner settings when another window saves to disk
  useEffect(() => {
    return onSettingsChanged((settings) => {
      if (settings.fissure_overlay_enabled !== undefined) {
        setFissureOverlayEnabled(settings.fissure_overlay_enabled);
      }
    });
  }, []);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      await startMonitoring();
    } catch (err) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPosition = async (pos) => {
    setNotifPosition(pos);
    await setSetting('notif_position', pos);
  };

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion('?'));
    // Sync current sound to Rust backend on mount
    const savedSound = getSetting('notif_sound', 'notification1.wav');
    invoke('set_notification_sound', { sound: savedSound }).catch(console.error);

    // Sync current UI scale to Rust backend on mount
    const savedScale = parseInt(getSetting('fissure_ui_scale', 100));
    invoke('set_fissure_ui_scale', { scale: savedScale }).catch(console.error);

    // Fetch available monitors
    invoke('get_available_monitors').
    then(setAvailableMonitors).
    catch(console.error);

    // Sync current target monitor to Rust backend on mount
    const savedMonitor = getSetting('fissure_target_monitor', 'auto');
    invoke('set_target_monitor', { monitor: savedMonitor }).catch(console.error);

    // Sync sidebar hide-on-focus-loss to Rust backend on mount
    const savedSidebarHide = getSetting('sidebar_hide_on_focus_loss', true);
    invoke('set_sidebar_hide_on_focus_loss', { hide: savedSidebarHide }).catch(console.error);

    // Auto-check is handled by UpdateProvider
  }, []);

  const handleSetTargetMonitor = async (val) => {
    setFissureTargetMonitor(val);
    await setSetting('fissure_target_monitor', val);
    await invoke('set_target_monitor', { monitor: val }).catch(console.error);
  };

  const handleAutoMonitorToggle = async (enabled) => {
    setAutoMonitor(enabled);
    if (enabled) {
      await handleSetTargetMonitor('auto');
    } else {
      const first = availableMonitors[0];
      if (first) {
        await handleSetTargetMonitor(first.index);
      }
    }
  };

  const handleSetSound = async (sound) => {
    setNotifSound(sound);
    await setSetting('notif_sound', sound);

    // Update Rust state for ALL future notifications
    await invoke('set_notification_sound', { sound }).catch(console.error);

    // Preview sound via Rust (one-time manual play)
    if (sound !== 'none') {
      await invoke('play_notification_sound', { sound }).catch(console.error);
    }
  };

  // Arbitration settings handlers
  const handleSetArbitrationEnabled = async (val) => {
    setNotifArbitrationEnabled(val);
    await setSetting('notif_arbitration_enabled', val);
  };
  const handleSetArbitrationHours = async (val) => {
    setNotifArbitrationHours(val);
    await setSetting('notif_arbitration_hours', val);
  };
  const handleSetArbitrationRemind = async (val) => {
    setNotifArbitrationRemind(val);
    await setSetting('notif_arbitration_remind', val);
  };

  // Foundry settings handlers
  const handleSetFoundryEnabled = async (val) => {
    setNotifFoundryEnabled(val);
    await setSetting('notif_foundry_enabled', val);
  };
  const handleSetFoundryMinutes = async (val) => {
    setNotifFoundryMinutes(val);
    await setSetting('notif_foundry_minutes', val);
  };

  // Syndicate settings handlers
  const handleSetSyndicateEnabled = async (val) => {
    setNotifSyndicateEnabled(val);
    await setSetting('notif_syndicate_enabled', val);
  };
  const handleSetSyndicateWasteEnabled = async (val) => {
    setNotifSyndicateWasteEnabled(val);
    await setSetting('notif_syndicate_waste_enabled', val);
  };

  const handleSetVoidTracesEnabled = async (val) => {
    setNotifVoidTracesEnabled(val);
    await setSetting('notif_void_traces_enabled', val);
  };

  // Mastery settings handlers
  const handleSetMasteryEnabled = async (val) => {
    setNotifMasteryEnabled(val);
    await setSetting('notif_mastery_enabled', val);
  };
  const handleSetMasteryPercent = async (val) => {
    setNotifMasteryPercent(val);
    await setSetting('notif_mastery_percent', val);
  };
  const handleSetChecklistMinutes = async (val) => {
    setNotifChecklistMinutes(val);
    await setSetting('notif_checklist_minutes', val);
  };

  // Fissure Overlay handlers
  const handleSetFissureEnabled = async (val) => {
    setFissureOverlayEnabled(val);
    await setSetting('fissure_overlay_enabled', val);
    if (val) {
      setScannerStatus('waiting');
      await invoke('stop_log_scanner').catch(console.error);
      invoke('start_log_scanner').catch(console.error);
    } else {
      setScannerStatus('idle');
      invoke('stop_log_scanner').catch(console.error);
    }
  };

  const handleSetUiScale = async (val) => {
    setFissureUiScale(val);
    await setSetting('fissure_ui_scale', val);
    invoke('set_fissure_ui_scale', { scale: val }).catch(console.error);
  };

  const handleBrowseCache = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected) {
        setWarframeCachePath(selected);
        await setSetting('warframe_cache_path', selected);
        retryCardImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetSidebarSide = async (side) => {
    setSidebarSide(side);
    await setSetting('sidebar_side', side);
    const width = parseInt(getSetting('sidebar_width', 400));
    invoke('set_sidebar_width', { width, side, persist: true }).catch(() => {});
  };

  const handleSetSidebarHideOnFocusLoss = async (val) => {
    setSidebarHideOnFocusLoss(val);
    await setSetting('sidebar_hide_on_focus_loss', val);
    invoke('set_sidebar_hide_on_focus_loss', { hide: val }).catch(console.error);
  };

  const handleTestNotification = (position, delay = 0) => {
    setTimeout(() => {
      invoke('show_notification', {
        title: t('settings.test_foundry_complete'),
        message: t('settings.test_foundry_msg'),
        position
      }).catch(console.error);
    }, delay);
  };

  const handleTestRelicReward = async () => {
    const mockRelics = [
    { era: 'Lith', tier: 'T1', refinement: 'Intact', unique_name: 'Lith S9 Relic' },
    { era: 'Lith', tier: 'T1', refinement: 'Exceptional', unique_name: 'Lith B6 Relic' },
    { era: 'Meso', tier: 'T2', refinement: 'Intact', unique_name: 'Meso N16 Relic' },
    { era: 'Meso', tier: 'T2', refinement: 'Flawless', unique_name: 'Meso V9 Relic' }];

    const mockRewards = [
    'Forma Blueprint',
    'Paris Prime Blueprint',
    'Bronco Prime Barrel',
    'Vasto Prime Receiver'];

    try {
      await invoke('relay_event', {
        event: 'scanner-relic-phase-start',
        payload: { squad_size: 4 }
      });
      mockRelics.forEach((r, i) => {
        setTimeout(() => {
          invoke('relay_event', {
            event: 'overlay-update-ocr',
            payload: { slot: i + 1, confirmed_reward: mockRewards[i], item: { ...r, name: mockRewards[i], ducats: [0, 100, 45, 35][i] } }
          }).catch(() => {});
        }, i * 500);
      });
      await invoke('relay_event', {
        event: 'overlay-update-relics',
        payload: { squad_relics: mockRelics, squad_size: 4 }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return <>
    <PageLayout titleKey="screen.settings">
      <div className="space-y-6">

        {/* Theme Selector - Leaner version */}
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Palette className="text-kronos-accent" size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">{t('settings.theme')}</h2>
            </div>
            <p className="text-[10px] text-kronos-dim uppercase font-bold">{t('settings.current_theme')}
              {themes.find((t) => t.id === theme)?.name}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {themes.map((t) =>
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              data-theme={t.id}
              title={t.name}
              className={`
                  min-h-[56px] p-2 rounded-lg border transition-all duration-200 relative group flex items-center justify-center text-center
                  ${theme === t.id ?
              'border-white ring-2 ring-white/30 scale-[1.02]' :
              'border-white/5 hover:border-white/20 hover:scale-[1.01]'}
                `
              }
              style={{
                backgroundColor: 'var(--color-bg)'
              }}>
              
                <div className="absolute inset-0 rounded-lg opacity-10 group-hover:opacity-20 transition-opacity" style={{ backgroundColor: `var(--color-accent)` }} />
                <span className="relative text-xs font-bold uppercase tracking-tight leading-tight" style={{ color: 'var(--color-accent)' }}>
                  {t.name}
                </span>
              </button>
            )}
          </div>
        </Card>

        {/* Cursor Selector */}
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MousePointer className="text-kronos-accent" size={20} />
              <h2 className="text-lg font-semibold uppercase tracking-tight">{t('settings.cursor')}</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {['system', 'default', 'retro'].map((cs) =>
            <button
              key={cs}
              onClick={() => setCursorStyle(cs)}
              className={`relative p-2 rounded-lg border transition-all duration-200 flex flex-col items-center gap-1.5 ${cursorStyle === cs ?
              'border-white ring-2 ring-white/30' :
              'border-white/5 hover:border-white/20'}`
              }>
              
                <div className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-lg relative overflow-hidden">
                  {cs === 'system' ?
                <MousePointer size={18} className="text-kronos-dim" /> :
                uiPath ?
                <>
                      <img
                    src={cursorTint && tintedCursors[cs === 'default' ? 'CursorDefault' : 'CursorRetro'] ?
                    tintedCursors[cs === 'default' ? 'CursorDefault' : 'CursorRetro'] :
                    cs === 'default' ? convertFileSrc(`${uiPath}/CursorDefault.png`) : convertFileSrc(`${uiPath}/CursorRetro.png`)
                    }
                    alt={cs}
                    className="max-w-[70%] max-h-[70%] object-contain relative z-10" />
                  
                    </> :
                null}
                </div>
                <span className="text-[10px] font-black uppercase tracking-tight text-kronos-text">{cs}</span>
              </button>
            )}
            <div className="flex items-center gap-2 ml-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={cursorTint} onChange={(e) => setCursorTint(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-kronos-accent/30 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
              <span className="text-xs font-black uppercase text-kronos-dim tracking-tight">{t('settings.tint_with_theme')}</span>
            </div>
          </div>
        </Card>

        {/* Notifications & Overlays */}
        <Card glow className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Bell className="text-kronos-accent" size={24} />
            <h2 className="text-xl font-semibold uppercase tracking-tight">{t('settings.notifications')}</h2>
          </div>

          {/* Position & Sound - side by side on wide, stacked on narrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.toast_position')}</p>
              <div className="grid grid-cols-3 gap-2">
                {['top-left', 'top-center', 'top-right'].map((pos) =>
                <button
                  key={pos}
                  onClick={() => handleSetPosition(pos)}
                  className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${notifPosition === pos ?
                  'bg-kronos-accent/20 border-kronos-accent text-kronos-accent' :
                  'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'}`
                  }>
                  
                    {pos === 'top-left' && <AlignStartVertical size={14} />}
                    {pos === 'top-center' && <AlignVerticalJustifyStart size={14} />}
                    {pos === 'top-right' && <AlignEndVertical size={14} />}
                    {pos === 'top-left' ? t('settings.top_left') : pos === 'top-center' ? t('settings.top_center') : t('settings.top_right')}
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.notification_sound')}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                { label: t('settings.none'), value: 'none', icon: VolumeX },
                { label: t('settings.sound_1'), value: 'notification1.wav', icon: Play },
                { label: t('settings.sound_2'), value: 'notification2.wav', icon: Play }].map((s) => (
                <button
                  key={s.value}
                  onClick={() => handleSetSound(s.value)}
                  className={`py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${notifSound === s.value ?
                  'bg-kronos-accent/20 border-kronos-accent text-kronos-accent' :
                  'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'}`}
                  >
                  
                    <s.icon size={14} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test buttons */}
          <div className="mb-5 pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.test_buttons')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleTestNotification(notifPosition)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20">{t('settings.test_notification')}


              </button>
              <button
                onClick={() => handleTestNotification(notifPosition, 5000)}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20">{t('settings.test_notification_delayed')}


              </button>
              <button
                onClick={handleTestRelicReward}
                className="py-2 px-3 rounded-lg border text-xs font-black uppercase tracking-wider transition-all bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20">{t('settings.test_relic_overlay')}


              </button>
            </div>
          </div>

          {/* Inventory Sync + Log Scanner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-1">{t('sync.success')}</p>
              <p className="text-[10px] text-zinc-500 mb-3">{t('settings.sync_inventory')}</p>
              <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${monitorResult === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.7)]' :
                    monitorResult === 'cached' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.7)]' :
                    monitorResult === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' :
                    'bg-zinc-600'}`
                    } />
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${monitorResult === 'success' ? 'text-green-400' : monitorResult === 'cached' ? 'text-yellow-400' : monitorResult === 'error' ? 'text-red-400' : 'text-zinc-600'}`}>
                      {monitorResult === 'success' ?
                      t('sync.syncing') + (() => {
                        const ms = Math.max(0, (nextRetryAt || (lastUpdate ? parseInt(lastUpdate) + 180000 : 0)) - Date.now());
                        const m = Math.floor(ms / 60000);
                        const s = Math.floor(ms % 60000 / 1000);
                        return ms > 0 ? ' ' + t('sync.next_update', { time: m > 0 ? `${m}m ${s}s` : `${s}s` }) : '';
                      })() :
                      monitorResult === 'cached' ?
                      t('sync.waiting') + (nextRetryAt ? (() => {
                        const ms = Math.max(0, nextRetryAt - Date.now());
                        const m = Math.floor(ms / 60000);
                        const s = Math.floor(ms % 60000 / 1000);
                        return ' ' + t('sync.next_attempt', { time: m > 0 ? `${m}m ${s}s` : `${s}s` });
                      })() : '') :
                      monitorResult === 'error' ?
                      t('sync.error') :
                      t('sync.idle')}
                    </span>
                    <button onClick={manualRefresh} className="p-1 hover:bg-white/10 rounded transition-colors" title={t('settings.manual_refresh')}>
                      <RefreshCw size={10} className="text-kronos-dim" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle checked={isMonitoring} onChange={async (val) => {
                      setAutoStart(val);
                      if (val) {
                        await startMonitoring();
                      } else {
                        stopMonitoring();
                      }
                    }} />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-1">{t('settings.log_scanner')}</p>
              <p className="text-[10px] text-zinc-500 mb-3">{t('settings.log_scanner_desc')}</p>
              <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-700 ${scannerStatus === 'active' ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.9)]' :
                    scannerStatus === 'waiting' ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.7)] animate-pulse' :
                    scannerStatus === 'stale_offset' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' :
                    'bg-zinc-700'}`
                    } />
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${scannerStatus === 'active' ? 'text-green-400' :
                    scannerStatus === 'waiting' ? 'text-yellow-400' :
                    scannerStatus === 'stale_offset' ? 'text-red-400' :
                    'text-zinc-600'}`
                    }>
                      {scannerStatus === 'active' ? t('settings.scanner.active') :
                      scannerStatus === 'waiting' ? t('settings.scanner.waiting') :
                      scannerStatus === 'stale_offset' ? t('settings.scanner.stale') :
                      t('settings.scanner.offline')}
                    </span>
                  </div>
                  <Toggle checked={fissureOverlayEnabled} onChange={handleSetFissureEnabled} />
                </div>
              </div>
            </div>
          </div>

          {/* Warframe Cache Path */}
          <div className="mb-4 pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.game_assets')}</p>
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={warframeCachePath}
                    readOnly
                    placeholder={t('settings.cache_folder_placeholder')}
                    className="flex-1 glass-panel rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:glow-border" />
                  
                  <Button variant="secondary" onClick={handleBrowseCache} className="px-3">
                    <FolderOpen size={16} className="mr-2" />{t('ui.setup.browse')}

                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-4 text-[10px] text-zinc-500 uppercase leading-relaxed font-bold">
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">{t('settings.common_windows_path')}</p>
                  <p className="font-mono text-kronos-accent/70">steamapps\common\Warframe\Cache.Windows</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-1 tracking-widest">{t('settings.common_linux_path')}</p>
                  <p className="font-mono text-kronos-accent/70">.steam/steam/steamapps/common/Warframe/Cache.Windows</p>
                </div>
              </div>
            </div>
          </div>

          {/* UI Scale & Notification Monitor */}
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-kronos-text uppercase">{t('settings.ui_scale')}</p>
                  <p className="text-xs text-kronos-dim uppercase">{t('settings.ui_scale_hint')}</p>
                </div>
                <div className="relative w-28">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={fissureUiScale}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setFissureUiScale(val);
                      const parsed = parseInt(val);
                      if (!isNaN(parsed) && parsed >= 50 && parsed <= 100) {
                        setSetting('fissure_ui_scale', parsed);
                        invoke('set_fissure_ui_scale', { scale: parsed }).catch(console.error);
                      }
                    }}
                    onBlur={() => {
                      let parsed = parseInt(fissureUiScale);
                      if (isNaN(parsed)) parsed = 100;
                      const clamped = Math.max(50, Math.min(100, parsed));
                      setFissureUiScale(clamped);
                      setSetting('fissure_ui_scale', clamped);
                      invoke('set_fissure_ui_scale', { scale: clamped }).catch(console.error);
                    }}
                    className="w-full rounded-lg pl-3 pr-8 py-2 text-right text-xs font-mono font-bold focus:outline-none focus:border-white/20 bg-black/20 border border-white/10 text-white" />
                  
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-kronos-dim font-mono pointer-events-none">%</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-kronos-panel/20 rounded-lg border border-white/5">
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.notification_monitor')}</p>
              <p className="text-[10px] text-kronos-dim leading-relaxed mb-3">{t('settings.notification_monitor_desc')}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="notif-monitor"
                    checked={autoMonitor}
                    onChange={() => handleAutoMonitorToggle(true)}
                    className="w-4 h-4 accent-kronos-accent cursor-pointer shrink-0" />
                  
                  <span className="text-xs font-black uppercase text-kronos-text shrink-0">{t('settings.spawn_active_monitor')}</span>
                  <span className="text-[10px] text-kronos-dim">{t('settings.spawn_active_monitor_hint')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="notif-monitor"
                    checked={!autoMonitor}
                    onChange={() => handleAutoMonitorToggle(false)}
                    className="w-4 h-4 accent-kronos-accent cursor-pointer shrink-0" />
                  
                  <span className="text-xs font-black uppercase text-kronos-text shrink-0 whitespace-nowrap">{t('settings.spawn_monitor')}</span>
                  <select
                    value={autoMonitor ? '' : fissureTargetMonitor}
                    disabled={autoMonitor}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleSetTargetMonitor(parseInt(val));
                    }}
                    className={`w-48 kronos-select text-xs font-mono font-bold bg-black/20 border-white/10 text-white rounded-lg px-2 py-1.5 focus:outline-none ${autoMonitor ? 'opacity-40' : ''}`}>
                    
                    {availableMonitors.map((mon) =>
                    <option key={mon.index} value={mon.index}>
                        {mon.name} ({mon.width}x{mon.height}){mon.is_primary ? ` ${t('settings.primary_monitor')}` : ''}
                      </option>
                    )}
                  </select>
                  <button
                    onClick={() => invoke('get_available_monitors').then(setAvailableMonitors).catch(console.error)}
                    className={`p-1.5 rounded-lg bg-black/20 border border-white/10 text-kronos-dim hover:text-white transition-colors ${autoMonitor ? 'opacity-40' : ''}`}
                    title={t('settings.refresh_monitors')}>
                    
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Triggers */}
          <div className="pt-4 border-t border-white/5">
            <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.notification_triggers')}</p>
            <NotificationManager />
          </div>
        </Card>

        {/* Game Locale */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{t('game_language')}</h2>
              <p className="text-[10px] text-kronos-dim uppercase font-bold tracking-widest mt-0.5">
                {t('game_language_hint')}
              </p>
            </div>
          <LanguagePicker
              value={getSetting('gameLocale', 'en')}
              onChange={async (locale) => {
                if (locale === getSetting('gameLocale', 'en')) return;
                setLocaleLoading(true);
                await setSetting('gameLocale', locale);
                await invoke('check_exports', { locale, force: true });
                window.location.reload();
              }} />
            
          </div>
        </Card>

        {/* In-Game Sidebar */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <PanelLeft className="text-kronos-accent" size={28} />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{t('settings.sidebar')}</h2>
              <p className="text-[10px] text-kronos-dim uppercase font-bold tracking-widest mt-0.5">{t('settings.sidebar_desc')}

              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-kronos-dim mb-3">{t('settings.sidebar_side')}</p>
              <div className="flex gap-2">
                {['left', 'right'].map((s) =>
                <button
                  key={s}
                  onClick={() => handleSetSidebarSide(s)}
                  className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${sidebarSide === s ?
                  'bg-kronos-accent/20 border-kronos-accent text-kronos-accent' :
                  'bg-kronos-panel/20 border-white/5 text-kronos-dim hover:border-white/20'}`
                  }>
                  
                    {s === 'left' ? <PanelLeft size={16} /> : <PanelRight size={16} />}
                    {s === 'left' ? t('settings.sidebar_left') : t('settings.sidebar_right')}
                  </button>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-white/5">
              <Toggle
                checked={sidebarHideOnFocusLoss}
                onChange={handleSetSidebarHideOnFocusLoss}
                label={t('settings.hide_sidebar')} />
              
            </div>
          </div>

        </Card>

        {/* Global Hotkeys */}
        <Card glow className="p-5">
          <div className="flex items-center gap-3 mb-6">
            <Keyboard className="text-kronos-accent" size={28} />
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{t('settings.global_hotkeys')}</h2>
              <p className="text-[10px] text-kronos-dim uppercase font-bold tracking-widest mt-0.5">{t('settings.global_hotkeys_desc')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {hotkeys.map((hk, idx) =>
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-kronos-panel/20 rounded-xl border border-white/5">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-kronos-dim mb-1.5 tracking-wider">{t('settings.action')}</p>
                  <select
                  value={hk.action}
                  onChange={(e) => {
                    const next = [...hotkeys];
                    next[idx].action = e.target.value;
                    handleUpdateHotkeys(next);
                  }}
                  className="w-full kronos-select bg-black/20">
                  
                    <option value="">{t('settings.select_action')}</option>
                    {HOTKEY_ACTIONS.map((a) =>
                  <option key={a.id} value={a.id}>{a.label}</option>
                  )}
                  </select>
                </div>

                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-kronos-dim mb-1.5 tracking-wider">{t('settings.shortcut')}</p>
                  <HotkeyRecorder
                  value={hk.shortcut}
                  onChange={(val) => {
                    const next = [...hotkeys];
                    next[idx].shortcut = val;
                    handleUpdateHotkeys(next);
                  }} />
                
                </div>

                <div className="sm:self-end">
                  <button
                  onClick={() => {
                    const next = hotkeys.filter((_, i) => i !== idx);
                    handleUpdateHotkeys(next);
                  }}
                  className="p-2 text-red-400/50 hover:text-red-400 transition-colors"
                  title={t('settings.remove_hotkey')}>
                  
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => handleUpdateHotkeys([...hotkeys, { action: '', shortcut: '' }])}
              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-kronos-dim hover:border-kronos-accent/30 hover:text-kronos-accent transition-all group">
              
              <span className="flex items-center justify-center gap-2">
                <Keyboard size={12} className="group-hover:animate-bounce" />{t('settings.add_shortcut')}
              </span>
            </button>
          </div>
          <p className="text-[9px] text-zinc-600 mt-4 italic uppercase tracking-wider px-1">{t('settings.shortcut_note')}

          </p>
        </Card>

        {/* Updates & Price Cache */}
        <Card glow className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* App Updates */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="text-kronos-accent" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">{t('settings.updates')}</h2>
              </div>

              <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">{t('settings.version')} {version}</p>
                  <Toggle
                    checked={updateOnStartup}
                    onChange={handleSetUpdateOnStartup}
                    label={t('settings.check_on_startup')} />
                  
                </div>

                {updateState.status === 'idle' &&
                <p className="text-xs text-kronos-dim">{t('settings.check_for_update')}</p>
                }
                {updateState.status === 'checking' &&
                <p className="text-xs text-kronos-accent font-mono flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />{t('settings.checking')}
                </p>
                }
                {updateState.status === 'available' && updateState.manifest &&
                <div className="space-y-2">
                    <p className="text-xs text-green-400 font-mono font-bold">{t('settings.update_available')}
                    {updateState.manifest.version}
                    </p>
                    <p className="text-[10px] text-kronos-dim font-mono leading-relaxed max-h-20 overflow-y-auto">
                      {updateState.manifest.body || t('settings.no_release_notes')}
                    </p>
                    <p className="text-[10px] text-zinc-600 font-mono">{t('settings.released')}
                    {new Date(updateState.manifest.date).toLocaleDateString()}
                    </p>
                  </div>
                }
                {updateState.status === 'up-to-date' &&
                <p className="text-xs text-green-400 font-mono mt-1">{t('settings.up_to_date')}</p>
                }
                {updateState.status === 'installing' &&
                <p className="text-xs text-kronos-accent font-mono flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" />{t('settings.installing')}
                </p>
                }
                {updateState.status === 'error' &&
                <div className="space-y-1">
                    <p className="text-xs text-red-400 font-mono">{t('settings.error')}{updateState.error}</p>
                    {updateState.manifest?.downloadUrl &&
                  <button
                    onClick={() => handleDownloadUpdate(updateState.manifest.downloadUrl)}
                    className="text-xs text-blue-400 font-mono underline hover:text-blue-300">{t('settings.download_manually')}


                  </button>
                  }
                  </div>
                }

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={checkForUpdates}
                    disabled={updateState.status === 'checking' || updateState.status === 'installing'}
                    className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${updateState.status === 'checking' || updateState.status === 'installing' ?
                    'bg-kronos-panel/20 border-white/5 text-kronos-dim cursor-not-allowed' :
                    'bg-kronos-accent/20 border-kronos-accent/40 text-kronos-accent hover:bg-kronos-accent/30'}`
                    }>
                    
                    {updateState.status === 'checking' ? t('settings.checking') : t('settings.check_for_updates')}
                  </button>
                  {updateState.status === 'available' &&
                  <button
                    onClick={handleInstallUpdate}
                    className="py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border bg-green-500/20 border-green-500/40 text-green-400 hover:bg-green-500/30">{t('settings.install_update')}


                  </button>
                  }
                </div>
              </div>
            </div>

            {/* Price Cache */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <RefreshCw className="text-kronos-accent" size={24} />
                <h2 className="text-xl font-black uppercase tracking-tight">{t('settings.price_cache')}</h2>
              </div>

              <div className="bg-kronos-panel/30 rounded-xl p-4 border border-white/5 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-kronos-dim">{t('settings.market_prices')}

                </p>
                <p className="text-xs text-kronos-dim">{t('settings.price_cache_desc')}

                </p>
                {priceLastUpdated ?
                <p className="text-[10px] text-zinc-600 font-mono">{t('settings.last_fetched')}
                  {new Date(Number(priceLastUpdated)).toLocaleString()}
                  </p> :

                <p className="text-[10px] text-zinc-600 font-mono">{t('settings.not_fetched')}</p>
                }
                <div className="flex gap-2 pt-2 items-center">
                  <button
                    onClick={refreshPrices}
                    disabled={isPriceLoading}
                    className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${!isPriceLoading ?
                    'bg-kronos-accent/20 border-kronos-accent/40 text-kronos-accent hover:bg-kronos-accent/30' :
                    'bg-kronos-panel/20 border-white/5 text-kronos-dim cursor-not-allowed'}`
                    }>
                    
                    {isPriceLoading ? t('settings.refreshing') : t('settings.refresh_prices')}
                  </button>
                  {priceFetchProgress &&
                  <span className="text-[10px] font-mono text-kronos-accent/60">{priceFetchProgress.current} / {priceFetchProgress.total}</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </PageLayout>

      {/* Locale change loading overlay */}
      {localeLoading &&
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-kronos-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-bold text-white uppercase tracking-widest">{t('changing_language')}</p>
            <p className="text-xs text-kronos-dim mt-1">{t('reloading')}</p>
          </div>
        </div>
    }
    </>;

}