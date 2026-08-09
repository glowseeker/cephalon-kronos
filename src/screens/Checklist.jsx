/**
 * Checklist.jsx
 *
 * A personal task tracker for daily and weekly Warframe activities.
 *
 * DATA STORAGE
 * ─────────────────────────────────────────
 * - Task definitions are hardcoded in the `tasks` array.
 * - Completion status and visibility preferences are persisted to
 *   `localStorage`.
 * - Standing values and ranks are read from inventoryData.Affiliations.
 * - Focus is read from inventoryData.DailyFocus.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Separate sections for Daily, Weekly, and Standings.
 * - Progress counters for all categories.
 * - Ability to hide/show individual tasks.
 * - Auto-resets based on time (daily/weekly).
 */
import { useState, useEffect, useMemo } from 'react';
import { useUi } from '../contexts/UiContext'
import { resolveGameTerm } from '../lib/gameTerm'
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { PageLayout } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

const tasks = [
{ id: 'baro', label: 'Baro Ki\'Teer', labelKey: 'ui.dashboard.baro_kiteer', reset: 'baro' },
{ id: 'sortie', label: 'Sortie', labelKey: 'ui.dashboard.sortie', reset: 'daily' },
{ id: 'foundry', label: 'Check Foundry', labelKey: 'checklist.task_foundry', reset: 'daily' },
{ id: 'syndicates', label: 'Syndicate Standing', labelKey: 'checklist.task_syndicates', reset: 'daily' },
{ id: 'focus', label: 'Daily Focus Cap', labelKey: 'checklist.task_focus', reset: 'daily' },
{ id: 'steel_path', label: 'Steel Path Incursions', labelKey: 'ui.dashboard.sp_incursions', reset: 'daily' },
{ id: 'acrithis_daily', label: 'Acrithis Daily', labelKey: 'checklist.task_acrithis_daily', reset: 'daily' },
{ id: 'ticker', label: 'Ticker\'s Railjack Crew', labelKey: 'checklist.task_ticker', reset: 'daily' },
{ id: 'marie', label: 'Marie\'s Shop', labelKey: 'checklist.task_marie', reset: 'daily' },
{ id: 'grandmother', label: 'Grandmother\'s Tokens', labelKey: 'checklist.task_grandmother', reset: 'other' },
{ id: 'yonta_daily', label: 'Yonta: Daily Voidplumes', labelKey: 'checklist.task_yonta_daily', reset: 'other' },
{ id: 'voca', label: 'Loid: Voca', labelKey: 'checklist.task_voca', reset: 'other' },
{ id: 'nightwave', label: 'Nightwave Missions', labelKey: 'checklist.task_nightwave', reset: 'weekly' },
{ id: 'nightwave_spend', label: 'Nightwave Shop', labelKey: 'checklist.task_nightwave_spend', reset: 'weekly' },
{ id: 'ayatan', label: "Maroo's Ayatan Hunt", labelKey: 'checklist.task_ayatan', reset: 'weekly' },
{ id: 'clem', label: "Help Clem", labelKey: 'checklist.task_clem', reset: 'weekly' },
{ id: 'narmer', label: 'Help Kahl: Break Narmer', labelKey: 'checklist.task_narmer', reset: 'weekly' },
{ id: 'archon', label: 'Archon Hunt', labelKey: 'ui.dashboard.archon_hunt', reset: 'weekly' },
{ id: 'circuit', label: 'Duviri Circuit', labelKey: 'checklist.task_circuit', reset: 'weekly' },
{ id: 'circuit_sp', label: 'Duviri Circuit SP', labelKey: 'checklist.task_circuit_sp', reset: 'weekly' },
{ id: 'pulses', label: 'Pulses: Netracell & Archimedea', labelKey: 'checklist.task_pulses', reset: 'weekly' },
{ id: 'calendar', label: '1999 Calendar', labelKey: 'checklist.task_calendar', reset: 'weekly' },
{ id: 'invigorations', label: 'Helminth Invigoration', labelKey: 'checklist.task_invigorations', reset: 'weekly' },
{ id: 'descendia', label: 'Descendia', labelKey: 'checklist.task_descendia', reset: 'weekly' },
{ id: 'descendia_sp', label: 'Descendia SP', labelKey: 'checklist.task_descendia_sp', reset: 'weekly' },
{ id: 'palladino', label: 'Palladino\'s Shop', labelKey: 'checklist.task_palladino', reset: 'weekly' },
{ id: 'yonta_weekly', label: 'Yonta: Weekly Shop', labelKey: 'checklist.task_yonta_weekly', reset: 'weekly' },
{ id: 'acrithis_weekly', label: 'Acrithis Weekly', labelKey: 'checklist.task_acrithis_weekly', reset: 'weekly' },
{ id: 'teshin', label: 'Teshin Shop', labelKey: 'checklist.task_teshin', reset: 'weekly' },
{ id: 'bird3', label: 'Bird 3 Shop', labelKey: 'checklist.task_bird3', reset: 'weekly' },
{ id: 'nightcap', label: 'Nightcap Shop', labelKey: 'checklist.task_nightcap', reset: 'weekly' }];


const AFFILIATION_TAGS = {
  steel: 'SteelMeridianSyndicate',
  perrin: 'PerrinSyndicate',
  arbiters: 'ArbitersSyndicate',
  suda: 'CephalonSudaSyndicate',
  veil: 'RedVeilSyndicate',
  newloka: 'NewLokaSyndicate',
  simaris: 'LibrarySyndicate',
  ostron: 'CetusSyndicate',
  quills: 'QuillsSyndicate',
  solaris: 'SolarisSyndicate',
  vox: 'VoxSyndicate',
  ventkids: 'VentKidsSyndicate',
  entrati: 'EntratiSyndicate',
  necraloid: 'NecraloidSyndicate',
  cavia: 'EntratiLabSyndicate',
  holdfasts: 'ZarimanSyndicate',
  hex: 'HexSyndicate',
  conclave: 'ConclaveSyndicate',
  event: 'EventSyndicate'
};

const NO_RANK_SYNDICATES = ['simaris'];

// Maps shorthand tag → ExportSyndicates key
const TAG_TO_EXPORT_KEY = {
  steel: 'SteelMeridianSyndicate',
  perrin: 'PerrinSyndicate',
  arbiters: 'ArbitersSyndicate',
  suda: 'CephalonSudaSyndicate',
  veil: 'RedVeilSyndicate',
  newloka: 'NewLokaSyndicate',
  conclave: 'ConclaveSyndicate',
  simaris: 'LibrarySyndicate',
  ostron: 'CetusSyndicate',
  quills: 'QuillsSyndicate',
  solaris: 'SolarisSyndicate',
  vox: 'VoxSyndicate',
  ventkids: 'VentKidsSyndicate',
  entrati: 'EntratiSyndicate',
  necraloid: 'NecraloidSyndicate',
  cavia: 'EntratiLabSyndicate',
  holdfasts: 'ZarimanSyndicate',
  hex: 'HexSyndicate'
};

const toHex = (val) => '#' + val.slice(4).toLowerCase();

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function darkenBgForContrast(bg, fg, minRatio = 3.5) {
  if (contrastRatio(bg, fg) >= minRatio) return bg;
  let rgb = hexToRgb(bg);
  const fgLum = relativeLuminance(hexToRgb(fg));
  // If fg is dark, lighten bg; if fg is light, darken bg
  const step = fgLum > 0.2 ? -8 : 8;
  for (let i = 0; i < 30; i++) {
    rgb = { r: rgb.r + step, g: rgb.g + step, b: rgb.b + step };
    const candidate = rgbToHex(rgb);
    if (contrastRatio(candidate, fg) >= minRatio) return candidate;
  }
  return rgbToHex(rgb);
}

// Icons that can't be loaded from ExportTextIcons (no matching iconKey) use local PNGs
const LOCAL_ICONS = {
  ostron: 'FactionOstron.png',
  quills: 'FactionQuills.png',
  solaris: 'FactionSolarisUnited.png',
  vox: 'FactionVoxSolaris.png',
  entrati: 'FactionEntrati.png',
  necraloid: 'FactionNecraloid.png',
  cavia: 'FactionCavia.png',
  holdfasts: 'FactionHoldfasts.png',
  hex: 'FactionHex.png'
};

// Icons that load from ExportTextIcons via CDN
const CDN_ICONS = {
  steel: 'MERIDIAN',
  perrin: 'PERRIN',
  arbiters: 'HEXIS',
  suda: 'SUDA',
  veil: 'REDVEIL',
  newloka: 'LOKA',
  conclave: 'CONCLAVE',
  simaris: 'SIMARIS',
  ventkids: 'VENTKIDS'
};

// Non-syndicate entries that need manual config (focus schools etc.)
const EXTRA_CONFIG = {
  focus: { accent: 'var(--color-accent)', iconKey: 'FOCUS' },
  zenurik: { accent: 'var(--color-accent)', iconKey: 'ZENURIK_CLEAN' },
  naramon: { accent: 'var(--color-accent)', iconKey: 'NARAMON_CLEAN' },
  vazarin: { accent: 'var(--color-accent)', iconKey: 'VAZARIN_CLEAN' },
  madurai: { accent: 'var(--color-accent)', iconKey: 'MADURAI_CLEAN' },
  unairu: { accent: 'var(--color-accent)', iconKey: 'UNAIRU_CLEAN' }
};

function buildSyndicateConfig(exportSyndicates) {
  const config = { ...EXTRA_CONFIG };
  // Build exportKey → tag reverse map for alignment lookups
  const exportKeyToTag = {};
  for (const [tag, exportKey] of Object.entries(TAG_TO_EXPORT_KEY)) {
    exportKeyToTag[exportKey] = tag;
  }
  for (const [tag, exportKey] of Object.entries(TAG_TO_EXPORT_KEY)) {
    const data = exportSyndicates?.[exportKey];
    let bg = data?.backgroundColour?.value ? toHex(data.backgroundColour.value) : '#1a1a2e';
    const accent = data?.colour?.value ? toHex(data.colour.value) : '#a0a0a0';
    bg = darkenBgForContrast(bg, accent);
    // Parse alignments → { ally_tag: true, enemy_tag: true }
    const allies = {};
    const enemies = {};
    if (data?.alignments) {
      for (const [otherKey, value] of Object.entries(data.alignments)) {
        const otherTag = exportKeyToTag[otherKey];
        if (!otherTag) continue;
        if (value > 0) allies[otherTag] = true;else
        if (value < 0) enemies[otherTag] = true;
      }
    }
    config[tag] = { bg, accent, allies, enemies };
    if (LOCAL_ICONS[tag]) config[tag].localIcon = LOCAL_ICONS[tag];
    if (CDN_ICONS[tag]) config[tag].iconKey = CDN_ICONS[tag];
  }
  return config;
}

const FOCUS_SCHOOLS = [
{ id: 'zenurik', label: 'Zenurik', key: 'AP_POWER', nameKey: '/Lotus/Language/Items/OperatorPowerAbilityName' },
{ id: 'naramon', label: 'Naramon', key: 'AP_ATTACK', nameKey: '/Lotus/Language/Items/OperatorTacticAbilityName' },
{ id: 'vazarin', label: 'Vazarin', key: 'AP_WARD', nameKey: '/Lotus/Language/Items/OperatorDefenseAbilityName' },
{ id: 'madurai', label: 'Madurai', key: 'AP_TACTIC', nameKey: '/Lotus/Language/Items/OperatorAttackAbilityName' },
{ id: 'unairu', label: 'Unairu', key: 'AP_DEFENSE', nameKey: '/Lotus/Language/Items/OperatorWardAbilityName' }];


const standings = [
// Focus total
{ id: 'focus_total', label: 'Daily Focus', color: 'focus' },

// Focus schools
...FOCUS_SCHOOLS.map((s) => ({ id: s.id, label: s.label, color: s.id, focusKey: s.key, nameKey: s.nameKey })),

// Faction Syndicates
{ id: 'steel', label: 'Steel Meridian', tag: 'steel', nameKey: '/Lotus/Language/Syndicates/SteelMeridianName' },
{ id: 'perrin', label: 'Perrin Sequence', tag: 'perrin', nameKey: '/Lotus/Language/Syndicates/PerrinSequenceName' },
{ id: 'arbiters', label: 'Arbiters of Hexis', tag: 'arbiters', nameKey: '/Lotus/Language/Syndicates/ArbitersName' },
{ id: 'suda', label: 'Cephalon Suda', tag: 'suda', nameKey: '/Lotus/Language/Syndicates/CephalonSudaName' },
{ id: 'veil', label: 'Red Veil', tag: 'veil', nameKey: '/Lotus/Language/Syndicates/RedVeilName' },
{ id: 'newloka', label: 'New Loka', tag: 'newloka', nameKey: '/Lotus/Language/Syndicates/NewLokaName' },

// Cephalon Simaris
{ id: 'simaris', label: 'Cephalon Simaris', tag: 'simaris', nameKey: '/Lotus/Language/Syndicates/LibraryTitle' },

// Open World - Cetus
{ id: 'ostron', label: 'Ostron', tag: 'ostron', nameKey: '/Lotus/Language/Syndicates/CetusName' },
{ id: 'quills', label: 'The Quills', tag: 'quills', nameKey: '/Lotus/Language/Syndicates/QuillsName' },

// Open World - Fortuna
{ id: 'solaris', label: 'Solaris United', tag: 'solaris', nameKey: '/Lotus/Language/Syndicates/SolarisSecretName' },
{ id: 'vox', label: 'Vox Solaris', tag: 'vox', nameKey: '/Lotus/Language/Syndicates/VoxSolName' },
{ id: 'ventkids', label: 'Ventkids', tag: 'ventkids', nameKey: '/Lotus/Language/Syndicates/VentkidsName' },

// Open World - Necralisk
{ id: 'entrati', label: 'Entrati', tag: 'entrati', nameKey: '/Lotus/Language/InfestedMicroplanet/EntratiSyndicateName' },
{ id: 'necraloid', label: 'Necraloid', tag: 'necraloid', nameKey: '/Lotus/Language/InfestedMicroplanet/NecraloidSyndicateName' },
{ id: 'cavia', label: 'Cavia', tag: 'cavia', nameKey: '/Lotus/Language/EntratiLab/EntratiGeneral/EntratiLabSyndicateName' },

// Zariman
{ id: 'holdfasts', label: 'Holdfasts', tag: 'holdfasts', nameKey: '/Lotus/Language/Syndicates/ZarimanName' },
{ id: 'hex', label: 'The Hex', tag: 'hex', nameKey: '/Lotus/Language/1999/MessengerHexName' },

// Other
{ id: 'conclave', label: 'Conclave', tag: 'conclave', nameKey: '/Lotus/Language/Syndicates/ConclaveName' }];


const formatTimeLeft = (ms) => {
  if (!ms || ms <= 0 || isNaN(ms)) return 'Now';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor(ms % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
  const minutes = Math.floor(ms % (1000 * 60 * 60) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const TaskCard = ({ task, completed, hidden, onToggle, onHide, timeLeft, nextResetTime, t, locale }) => {
  const resetLabels = { daily: t('checklist.daily'), weekly: t('checklist.weekly'), biweekly: t('checklist.biweekly'), other: t('checklist.other_8h'), baro: resolveGameTerm('/Lotus/Language/G1Quests/VoidTraderName', locale) };
  const getIntervalMs = (resetType) => {
    if (resetType === 'daily') return 24 * 60 * 60 * 1000;
    if (resetType === 'weekly') return 7 * 24 * 60 * 60 * 1000;
    if (resetType === 'biweekly') return 14 * 24 * 60 * 60 * 1000;
    if (resetType === 'other') return 8 * 60 * 60 * 1000;
    if (resetType === 'baro') return 14 * 24 * 60 * 60 * 1000;
    return 24 * 60 * 60 * 1000;
  };
  const intervalMs = getIntervalMs(task.reset);
  const displayTime = completed && nextResetTime ?
  `next: ${formatTimeLeft(nextResetTime + intervalMs - Date.now())}` :
  timeLeft;
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${completed ?
      'bg-kronos-accent/10 border-kronos-accent/30' :
      hidden ?
      'opacity-30' :
      ''}`
      }
      style={{
        backgroundColor: completed ?
        'rgba(var(--color-accent-rgb), 0.1)' :
        hidden ?
        undefined :
        'rgba(var(--color-panel-rgb, 26, 26, 46), 0.4)',
        borderColor: completed ?
        'rgba(var(--color-accent-rgb), 0.3)' :
        hidden ?
        'rgba(255,255,255,0.05)' :
        'rgba(255,255,255,0.05)'
      }}>
      
      <div className="flex items-start justify-between mb-1">
        <span className={`text-[14px] ${completed ? 'line-through text-kronos-dim' : ''}`}>
          {task.labelKey ? (t(task.labelKey) === task.labelKey ? task.label : t(task.labelKey)) : task.label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded text-kronos-accent flex-shrink-0" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
          {resetLabels[task.reset]}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[12px] text-kronos-dim">{displayTime}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onHide}
            className="p-1 rounded hover:bg-white/10"
            title={hidden ? t('checklist.show') : t('checklist.hide')}>
            
            {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-white/10">
            
            {completed ?
            <Check className="text-kronos-accent" size={16} /> :

            <Circle className="text-kronos-dim" size={16} />
            }
          </button>
        </div>
      </div>
    </div>);

};

const ColorFilters = ({ config }) => {
  const colors = [...new Set(Object.values(config).map((c) => c.accent).filter((c) => c && !c.startsWith('var')))];
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        {colors.map((color) => {
          const { r, g, b } = hexToRgb(color);
          const rn = (r / 255).toFixed(4);
          const gn = (g / 255).toFixed(4);
          const bn = (b / 255).toFixed(4);
          const id = 'cf-' + color.slice(1);
          return (
            <filter key={id} id={id} colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" result="lum" />
              <feColorMatrix type="matrix" in="lum" values={`${rn} 0 0 0 0  ${gn} 0 0 0 0  ${bn} 0 0 0 0  0 0 0 1 0`} />
            </filter>);

        })}
      </defs>
    </svg>);

};

const TintedIcon = ({ src, size = 'w-8 h-8', accent }) => {
  if (accent?.startsWith?.('var')) {
    return <img src={src} alt="" className={`${size} object-contain flex-shrink-0`} style={{ filter: 'brightness(0) invert(1)' }} />;
  }
  const filterId = accent ? `url(#cf-${accent.slice(1)})` : undefined;
  return (
    <img
      src={src}
      alt=""
      className={`${size} object-contain flex-shrink-0`}
      style={{ filter: filterId }} />);


};
const FACTION_TAGS = new Set(['steel', 'perrin', 'arbiters', 'suda', 'veil', 'newloka']);

const StandingCard = ({ standing, affiliation, earnedStanding, rankCap, dailyCap, iconUrl, localIconUrl, supportedSyndicate, syndicateConfig, hoveredTag, onHover, dict }) => {
  const rank = affiliation?.Title ?? 0;
  const { t, locale } = useUi();
  const tagKey = standing.tag || standing.color;
  const config = syndicateConfig[tagKey] || { bg: '#1a1a2e', accent: '#a0a0a0' };
  const isNegative = rank < 0;
  const progress = isNegative ?
  Math.min(100, Math.max(0, (Math.abs(rankCap) - Math.abs(earnedStanding)) / Math.abs(rankCap) * 100)) :
  Math.min(100, earnedStanding / rankCap * 100);
  const isPledged = supportedSyndicate === AFFILIATION_TAGS[standing.tag];
  const isFaction = FACTION_TAGS.has(tagKey);
  const isAlly = hoveredTag && config.allies?.[hoveredTag];
  const isEnemy = hoveredTag && config.enemies?.[hoveredTag];
  const isDimmed = hoveredTag && tagKey !== hoveredTag && !isAlly && !isEnemy;
  const overlayBadge = isAlly ? '+' : isEnemy ? '−' : null;
  const hoverBg = isAlly ? '#166534' : isEnemy ? '#991b1b' : null;
  const iconSrc = iconUrl || localIconUrl;
  const showWasteTip = isFaction && isPledged;

  const handleMouseEnter = () => {if (isFaction) onHover?.(tagKey);};
  const handleMouseLeave = () => {if (isFaction) onHover?.(null);};

  return (
    <div
      className="rounded-lg relative transition-all duration-200 flex min-w-[280px]"
      style={{
        backgroundColor: hoverBg || config.bg,
        border: `2px solid ${config.accent}44`,
        opacity: isDimmed ? 0.3 : 1
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      
      {overlayBadge &&
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 overflow-hidden rounded-lg">
          <span className="text-[150px] font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{overlayBadge}</span>
        </div>
      }

      {/* Icon column -- full card height, tinted with accent */}
      {iconSrc &&
      <div
        className="w-24 flex-shrink-0 flex items-center justify-center p-2"
        style={{ backgroundColor: config.accent + '22', borderRight: `2px solid ${config.accent}44` }}>
        
          <TintedIcon src={iconSrc} accent={config.accent} size="w-20 h-20" />
        </div>
      }

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5 relative">
        {/* Row 1: Name -- Rank X */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-mono font-bold" style={{ color: config.accent }}>
            {(standing.nameKey && dict && dict[standing.nameKey]) ? (dict[standing.nameKey] + (isPledged ? ' ★' : '')) : (standing.label + (isPledged ? ' ★' : ''))}
          </span>
          {rank !== 0 &&
          <span className="text-[11px] flex-shrink-0 font-mono font-bold" style={{ color: config.accent, opacity: 0.6 }}>{t('ui.comp.rank')} {rank}
            </span>
          }
        </div>

        {/* Row 2: Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, backgroundColor: config.accent }} />
          
        </div>

        {/* Row 3: total / max */}
        <span className="text-[14px] font-mono font-bold" style={{ color: config.accent }}>
          {earnedStanding.toLocaleString()}
          <span style={{ opacity: 0.7 }}> / {rankCap.toLocaleString()}</span>
        </span>

        {/* Row 4: daily remaining */}
        {dailyCap > 0 &&
        <span className="text-[12px] font-mono font-bold" style={{ color: config.accent, opacity: 0.6 }}>{t('checklist.daily')} {dailyCap.toLocaleString()}
          </span>
        }

        {/* Waste tip tooltip */}
        {showWasteTip &&
        <div className="absolute bottom-2 right-2 z-50">
            <div className="group relative">
              <span className="text-base cursor-help">ⓘ</span>
              <div className="absolute right-0 bottom-full mb-2 w-72 p-4 rounded-lg bg-kronos-panel border border-white/20 text-sm text-kronos-dim opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-[100] pointer-events-none">{t('checklist.standing_warning')}

            </div>
            </div>
          </div>
        }
      </div>
    </div>);

};

export default function Checklist() {
  const { t, locale } = useUi()
  const { inventoryData, ExportTextIcons, worldState, ES, dict } = useMonitoring();
  const supportedSyndicate = inventoryData?.SupportedSyndicate || null;
  const SYNDICATE_CONFIG = useMemo(() => buildSyndicateConfig(ES), [ES]);
  const [hoveredTag, setHoveredTag] = useState(null);
  const [uiPath, setUiPath] = useState('');
  
  const resolveStandingLabel = (standing) => {
    if (standing.nameKey && dict && dict[standing.nameKey]) return dict[standing.nameKey];
    return standing.label;
  };

  useEffect(() => {invoke('get_ui_path').then(setUiPath).catch(() => {});}, []);

  const [completed, setCompleted] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('checklist_completed') || '{}');
    } catch {return {};}
  });
  const [hiddenMap, setHiddenMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('checklist_hidden') || '{}');
    } catch {return {};}
  });
  const [autoTrack, setAutoTrack] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('checklist_auto_track') || 'true');
    } catch {return true;}
  });
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);
  const [cdnBase, setCdnBase] = useState('');
  const periodicCompletions = inventoryData?.periodicMissionCompletions ?? [];

  // ── Auto-complete from inventory ──
  useEffect(() => {
    if (!autoTrack || !periodicCompletions.length) return;
    const t = new Date();
    const todayStart = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
    const lastMonday = new Date(todayStart);
    lastMonday.setUTCDate(lastMonday.getUTCDate() - (lastMonday.getUTCDay() + 6) % 7);

    const isAfter = (ts, boundary) => ts >= boundary.getTime();
    const parseTs = (entry) => new Date(entry.date?.$date?.$numberLong).getTime();

    const auto = {};
    for (const entry of periodicCompletions) {
      const tag = entry.tag;
      const ts = parseTs(entry);
      if (isNaN(ts)) continue;
      if (tag === 'GetClem' && isAfter(ts, lastMonday)) auto.clem = true;else
      if (tag?.startsWith('TreasureHunt') && isAfter(ts, lastMonday)) auto.ayatan = true;else
      if (tag?.startsWith('HardDaily') && isAfter(ts, todayStart)) auto.steel_path = true;
    }

    setCompleted((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, val] of Object.entries(auto)) {
        if (!prev[id]) {next[id] = val;changed = true;}
      }
      return changed ? next : prev;
    });
  }, [periodicCompletions, autoTrack]);
  const hasInventory = !!inventoryData;
  const [now, setNow] = useState(Date.now());
  const masteryRank = hasInventory ? inventoryData?.account?.mastery_rank || 16 : 16;
  const affiliations = hasInventory ? inventoryData?.Affiliations || [] : [];
  const focusXP = hasInventory ? inventoryData?.FocusXP || {} : {};
  const dailyFocus = hasInventory ? inventoryData?.DailyFocus || 0 : 0;
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Local storage persistence
  useEffect(() => {
    localStorage.setItem('checklist_completed', JSON.stringify(completed));
  }, [completed]);

  useEffect(() => {
    localStorage.setItem('checklist_hidden', JSON.stringify(hiddenMap));
  }, [hiddenMap]);
  useEffect(() => {
    localStorage.setItem('checklist_auto_track', JSON.stringify(autoTrack));
  }, [autoTrack]);
  useEffect(() => {
    invoke('get_cdn_base_url').then(setCdnBase).catch(() => {});
  }, []);

  const getNextReset = (taskId, resetType) => {
    if (taskId === 'baro' && worldState?.voidTrader) {
      const vt = worldState.voidTrader;
      if (vt.active && vt.expiryMs) {
        return vt.expiryMs;
      }
      if (!vt.active && vt.activationMs) {
        return vt.activationMs;
      }
      return 0;
    }
    if (taskId === 'sortie' && worldState?.sortie?.expiry) {
      const expiry = worldState.sortie.expiry;
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime();
      return 0;
    }
    if (taskId === 'steel_path' && worldState?.incursions?.expiry) {
      const expiry = worldState.incursions.expiry;
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime();
      return 0;
    }
    if (taskId === 'archon' && worldState?.archonHunt?.expiry) {
      const expiry = worldState.archonHunt.expiry;
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime();
      return 0;
    }
    if (taskId === 'nightwave' && worldState?.nightwave?.expiry) {
      const expiry = worldState.nightwave.expiry;
      if (expiry instanceof Date && !isNaN(expiry.getTime())) return expiry.getTime();
      return 0;
    }
    if (resetType === 'daily') {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow.getTime();
    }
    if (resetType === 'weekly') {
      // Weekly resets every Monday at 00:00 UTC
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(0, 0, 0, 0);
      // Day 1 = Monday
      const dayOfWeek = next.getUTCDay();
      const daysUntilMonday = (7 - dayOfWeek + 1) % 7;
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
      // If next Monday is at or before now, push to following Monday
      // Use < (strictly before) so that exactly at midnight returns current Monday
      if (next.getTime() < now.getTime()) {
        next.setUTCDate(next.getUTCDate() + 7);
      }
      return next.getTime();
    }
    if (resetType === 'biweekly') {
      // Biweekly resets every 2 weeks on Monday at 00:00 UTC
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(0, 0, 0, 0);
      const dayOfCycle = Math.floor((next.getTime() - 1709251200000) / (14 * 24 * 60 * 60 * 1000));
      const nextCycle = new Date(1709251200000 + (dayOfCycle + 1) * 14 * 24 * 60 * 60 * 1000);
      return nextCycle.getTime();
    }
    if (resetType === 'other') {
      // 8-hour resets
      const now = new Date();
      const next = new Date(now);
      next.setUTCHours(next.getUTCHours() + 8 - next.getUTCHours() % 8, 0, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setUTCHours(next.getUTCHours() + 8);
      }
      return next.getTime();
    }
    return 0;
  };

  const formatTimeLeft = (ms) => {
    if (!ms || ms <= 0 || isNaN(ms)) return 'Now';
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor(ms % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
    const minutes = Math.floor(ms % (1000 * 60 * 60) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getIconUrl = (iconKey) => {
    if (!iconKey || !ExportTextIcons || !cdnBase) return null;
    const iconData = ExportTextIcons[iconKey];
    if (!iconData) return null;
    const path = iconData.DIT_AUTO || Object.values(iconData)[0];
    if (!path) return null;
    return cdnBase + path;
  };

  const getLocalIconUrl = (iconKey, localIcon) => {
    if (!localIcon || !uiPath) return null;
    return convertFileSrc(`${uiPath}/${localIcon}`);
  };

  const getAffiliation = (tagKey) => {
    const tag = AFFILIATION_TAGS[tagKey];
    return affiliations.find((a) => a.Tag === tag);
  };

  const RANK_CAPS = {
    5: 132000, 4: 99000, 3: 70000, 2: 44000, 1: 22000, 0: 5000,
    [-1]: -22000, [-2]: -44000
  };

  const getRankCap = (rank) => RANK_CAPS[rank] ?? 22000;

  const getCumulativePreviousCaps = (rank) => {
    if (rank <= 0) return 0;
    if (rank >= 5) return 5000 + 22000 + 44000 + 70000 + 99000;
    if (rank === 4) return 5000 + 22000 + 44000 + 70000;
    if (rank === 3) return 5000 + 22000 + 44000;
    if (rank === 2) return 5000 + 22000;
    if (rank === 1) return 5000;
    return 0;
  };

  const getEarnedStanding = (totalStanding, rank) => {
    if (rank < 0) {
      return getRankCap(rank);
    }
    const previousCaps = getCumulativePreviousCaps(rank);
    return Math.max(0, totalStanding - previousCaps);
  };

  const getDailyCap = () => 16000 + masteryRank * 500;
  const getFocusDailyCap = () => 250000 + masteryRank * 5000;

  const getStandingData = (standing) => {
    if (standing.id === 'focus_total') {
      return { earned: 0, cap: 0, daily: getFocusDailyCap(), isFocusTotal: true };
    }
    if (standing.focusKey) {
      const earned = focusXP?.[standing.focusKey] || 0;
      return { earned, cap: 0, daily: 0, isFocusSchool: true };
    }
    const aff = getAffiliation(standing.tag);
    if (aff) {
      const total = aff.Standing ?? 0;
      if (NO_RANK_SYNDICATES.includes(standing.tag)) {
        return { earned: total, cap: 125000, daily: getDailyCap() };
      }
      const rank = aff.Title ?? 0;
      const earned = getEarnedStanding(total, rank);
      const cap = getRankCap(rank);
      return { earned, cap, daily: getDailyCap() };
    }
    return { earned: 0, cap: 24000, daily: getDailyCap() };
  };

  useEffect(() => {
    setHiddenMap(Object.fromEntries(tasks.map((t) => [t.id, t.hidden])));
  }, []);

  const toggleTask = (taskId) => {
    setCompleted((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const toggleHidden = (taskId) => {
    setHiddenMap((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleNotif = (taskId) => {
    setNotifMap((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const allTasks = tasks.map((task) => {
    const taskReset = getNextReset(task.id, task.reset);
    const isCompleted = completed[task.id];
    const sortReset = isCompleted ? taskReset : taskReset - now;
    return {
      ...task,
      sortReset,
      nextReset: taskReset,
      nextResetTime: taskReset,
      timeLeft: formatTimeLeft(taskReset - now)
    };
  }).sort((a, b) => a.sortReset - b.sortReset);

  const visibleTasks = allTasks.filter((t) => showHiddenTasks || !hiddenMap[t.id]);
  const completedTasks = visibleTasks.filter((t) => completed[t.id]).length;

  // Expose tasks for notification manager
  useEffect(() => {
    window.__checklistTasks = allTasks.map((t) => ({
      id: t.id,
      label: t.label,
      labelKey: t.labelKey,
      reset: t.reset,
      nextResetTime: t.nextResetTime
    }));
    // Don't delete on unmount - the notification manager reads this
    // even when the Checklist page isn't active.
  }, [allTasks]);

  return (
    <>
      <ColorFilters config={SYNDICATE_CONFIG} />
      <PageLayout titleKey="screen.checklist" subtitle={t('checklist.subtitle')}>
        {/* Focus Section - Full Width */}
        {hasInventory &&
        <div className="mb-6">
            <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
              <div className="flex items-center gap-3">
                {(() => {
                const config = SYNDICATE_CONFIG['focus'] || { accent: '#a0a0a0', iconKey: 'focus' };
                const iconUrl = getIconUrl(config.iconKey);
                return iconUrl ?
                <TintedIcon src={iconUrl} accent={config.accent} size="w-6 h-6" /> :
                null;
              })()}
                <span className="text-[18px] font-semibold text-kronos-text">{t('checklist.daily_focus')}</span>
              </div>
              <span className="text-[18px] font-mono text-kronos-accent">{dailyFocus.toLocaleString()} {t('checklist.left')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {standings.filter((s) => s.focusKey).map((standing) => {
              const { earned } = getStandingData(standing);
              const config = SYNDICATE_CONFIG[standing.color] || { accent: '#a0a0a0' };
              const iconUrl = getIconUrl(config.iconKey);
              return (
                <div key={standing.id} className="rounded-lg border overflow-hidden flex" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.2)' }}>
                    {iconUrl &&
                  <div className="w-14 flex-shrink-0 flex items-center justify-center p-1.5" style={{ borderRight: '1px solid rgba(var(--color-accent-rgb), 0.15)' }}>
                        <TintedIcon src={iconUrl} accent={config.accent} size="w-10 h-10" />
                      </div>
                  }
                    <div className="flex-1 min-w-0 p-2 flex flex-col gap-1">
                      <span className="text-[18px] font-medium truncate" style={{ color: config.accent }}>{resolveStandingLabel(standing)}</span>
                      <span className="text-[18px] font-mono" style={{ color: config.accent }}>
                        {earned.toLocaleString()}
                      </span>
                    </div>
                  </div>);

            })}
            </div>
          </div>
        }

        {/* Standings Section */}
        {hasInventory &&
        <div className="mb-6">
            <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
              <div className="flex items-center gap-3">
                {uiPath && <TintedIcon src={convertFileSrc(`${uiPath}/Syndicates.png`)} accent="var(--color-accent)" size="w-6 h-6" />}
                <span className="text-[18px] font-semibold text-kronos-text">{t('checklist.standings')}</span>
              </div>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {standings.filter((s) => !s.id.startsWith('focus') && !s.focusKey).map((standing) => {
              const { earned, cap, daily } = getStandingData(standing);
              const affiliation = getAffiliation(standing.tag);
              const config = SYNDICATE_CONFIG[standing.tag] || { bg: '#1a1a2e', accent: '#a0a0a0', iconKey: null };
              const iconUrl = getIconUrl(config.iconKey);
              const localIconUrl = getLocalIconUrl(config.iconKey, config.localIcon);
              return (
                <StandingCard
                  key={standing.id}
                  standing={standing}
                  affiliation={affiliation}
                  earnedStanding={earned}
                  rankCap={cap}
                  dailyCap={daily}
                  iconUrl={iconUrl}
                  localIconUrl={localIconUrl}
                  supportedSyndicate={supportedSyndicate}
                  syndicateConfig={SYNDICATE_CONFIG}
                  hoveredTag={hoveredTag}
                  onHover={setHoveredTag}
                  dict={dict} />);


            })}
            </div>
          </div>
        }

        {/* Tasks Section - Single Grid */}
        <div className="mb-6">
          <div className="rounded-lg p-3 border flex items-center justify-between mb-3" style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.1)', borderColor: 'rgba(var(--color-accent-rgb), 0.3)' }}>
            <div className="flex items-center gap-3">
              {uiPath && <img src={convertFileSrc(`${uiPath}/RetroChallenge.png`)} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
              <span className="text-[14px] font-semibold text-kronos-text">{t('checklist.tasks')}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[13px] text-kronos-text cursor-pointer select-none"
              title={t('checklist.auto_sync')}>
                <input
                  type="checkbox"
                  checked={autoTrack}
                  onChange={(e) => setAutoTrack(e.target.checked)}
                  className="w-3.5 h-3.5 accent-kronos-accent" />{t('checklist.auto_track')}


              </label>
              <span className="text-[18px] font-bold text-kronos-accent">
                {completedTasks}/{visibleTasks.length}
              </span>
              <button
                onClick={() => setShowHiddenTasks(!showHiddenTasks)}
                className="p-1.5 rounded hover:bg-white/10 transition-colors">
                
                {showHiddenTasks ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {visibleTasks.map((task) =>
            <TaskCard
              key={task.id}
              task={task}
              completed={completed[task.id] || false}
              hidden={hiddenMap[task.id] || false}
              onToggle={() => toggleTask(task.id)}
              onHide={() => toggleHidden(task.id)}
              timeLeft={task.timeLeft}
              nextResetTime={task.nextResetTime}
              t={t} locale={locale} />

            )}
          </div>
        </div>
      </PageLayout>
    </>);

}