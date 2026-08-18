/**
 * Dashboard.jsx
 *
 * The primary landing screen. Displays live worldstate data including fissures,
 * open-world cycles, sorties, events, and the 1999 calendar.
 *
 * DATA SOURCES
 * ─────────────────────────────────────────
 * 1. MonitoringContext (useMonitoring):
 *    - dict/suppDict: Localisation
 *    - ERg/EC: Static game data (Regions, Challenges)
 *    - spIncursions/arbys: Fetched by backend from browse.wf
 * 2. Oracle API (fetch):
 *    - worldState.json: Raw live game state
 *    - location-bounties: Open-world bounty rotations
 *    - bounty-cycle: Zariman/1999 faction state
 *
 * PROCESSING
 * ─────────────────────────────────────────
 * Raw worldstate JSON is passed to parseWorldstate() from worldstateParser.js.
 * Cycle timers are computed locally in worldstateParser.js.
 * Arbitration and Incursion logic (epoch-based rotation) is handled by local
 * helpers in this file.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUi } from '../contexts/UiContext'
import { resolveGameTerm } from '../lib/gameTerm'
import { PageLayout, Card, Button, CardHeader, Tabs, Modal, Tooltip } from '../components/UI';
import ModCard from '../components/ModCard';
import {
  Package, DollarSign, RefreshCw,
  ShoppingBag,
  Calendar, ChevronDown, ChevronUp, X,
  Settings, Check } from
'lucide-react';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import {
  resolveNode,
  resolveMissionType,
  resolveRewardText,
  resolveAnyImage,
  resolveChallenge,
  cleanBountyName,
  resolveChallengeDesc,
  resolveChallengeFlavour,
  resolveBountyTitle,
  resolveItemName,
  timeRemaining,
  timeSince } from
'../lib/warframeUtils';

const LOCATION_BOUNTIES_API = 'https://oracle.browse.wf/location-bounties';
const BOUNTY_CYCLE_API = 'https://oracle.browse.wf/bounty-cycle';

// ── arbys.txt helpers ──────────────────────────────────────────────────────────
function parseArbyLine(line, ERg, dict) {
  const parts = line.split(',');
  if (parts.length < 2) return null;
  const tsSec = parseInt(parts[0], 10);
  const nodeKey = parts[1].trim();
  const entry = ERg[nodeKey];

  return {
    ts: tsSec * 1000,
    node: nodeKey,
    type: entry?.missionName || entry?.missionType || 'Unknown Mission'
  };
}

function getCurrentArby(arbys, ERg, dict) {
  if (!arbys) return null;
  const now = Date.now();
  const lines = arbys.split('\n').map((l) => l.trim()).filter(Boolean);
  let best = null;
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict);
    if (!entry || isNaN(entry.ts)) continue;
    const GRACE_PERIOD = 300000; // 5 minutes
    if (entry.ts <= now + GRACE_PERIOD) best = entry;else
    break;
  }
  return best;
}

function getUpcomingArbies(arbys, ERg, dict, arbyTiers, count = 5) {
  if (!arbys) return [];
  const now = Date.now();
  const lines = arbys.split('\n').map((l) => l.trim()).filter(Boolean);
  const results = [];
  for (const line of lines) {
    const entry = parseArbyLine(line, ERg, dict);
    if (entry && !isNaN(entry.ts) && entry.ts > now) {
      entry.grade = arbyTiers?.[entry.node] || 'F';
      results.push(entry);
      if (results.length >= count) break;
    }
  }
  return results;
}

// ── sp-incursions.txt helpers ──────────────────────────────────────────────────
function getSpIncursionNodes(spIncursions) {
  if (!spIncursions) return [];

  const lines = spIncursions.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // browse.wf logic:
  // today = Math.trunc(Date.now() / 86400000) * 86400
  // index = (today - epochDay) / 86400
  const todaySec = Math.floor(Date.now() / 86400000) * 86400;
  const firstLineParts = lines[0].split(';');
  const epochDay = parseInt(firstLineParts[0], 10);

  const index = Math.floor((todaySec - epochDay) / 86400);

  if (index >= 0 && index < lines.length) {
    const match = lines[index];
    const nodesPart = match.includes(';') ? match.split(';')[1] : match.split(',').slice(1).join(',');
    return nodesPart.split(',').map((n) => n.trim()).filter(Boolean);
  }

  return [];
}


function GradeBadge({ grade, className = "" }) {
  const colors = {
    S: 'bg-yellow-400 text-black',
    A: 'bg-green-500 text-white',
    B: 'bg-blue-500 text-white',
    C: 'bg-zinc-500 text-white',
    D: 'bg-red-500 text-white',
    F: 'bg-red-900 text-white'
  };
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${colors[grade] || colors.F} ${className}`}>
      {grade}
    </span>);

}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, locale } = useUi()
  const {
    exportData, worldState, spIncursions, arbys, archonModifiers, arbitrationModifiers,
    dict, suppDict, EC, ERg, EI, nameToImage, uniqueNameToName, arbyTiers,
    rawInventory, inventoryData, ES, ENWRawRewards, ExportImages, ExportTextIcons,
    cardImagesPath
  } = useMonitoring();
  const [worldstate, setWorldstate] = useState(null);
  const [locationBounties, setLocationBounties] = useState(null);
  const [bountyCycle, setBountyCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [fissureTab, setFissureTab] = useState('normal');
  const [archimedeaTab, setArchimedeaTab] = useState('deep');
  const [bountyTab, setBountyTab] = useState('holdfasts');
  const [showBaroModal, setShowBaroModal] = useState(false);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [iconsPath, setIconsPath] = useState('');
  const [framesPath, setFramesPath] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date(1999, 11, 1)); // Default to Dec 1999
  const [selected1999Month, setSelected1999Month] = useState(0);
  const [selected1999Day, setSelected1999Day] = useState(-1);
  const [initialized1999, setInitialized1999] = useState(false);
  const [hiddenCards, setHiddenCards] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_hidden_cards');
      return saved ? JSON.parse(saved) : [];
    } catch {return [];}
  });
  const [descendiaTab, setDescendiaTab] = useState('normal');

  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;

  useEffect(() => {invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_mod_frames_path').then((p) => setFramesPath(p)).catch(() => {});}, []);

  useEffect(() => {
    localStorage.setItem('dashboard_hidden_cards', JSON.stringify(hiddenCards));
  }, [hiddenCards]);

  useEffect(() => {
    if (!initialized1999 && worldstate?.calendar1999?.length > 0) {
      const cal = worldstate.calendar1999.find((s) => {
        const now = Date.now();
        const start = s.activation instanceof Date ? s.activation.getTime() : new Date(s.activation).getTime();
        const end = s.expiry instanceof Date ? s.expiry.getTime() : new Date(s.expiry).getTime();
        return now >= start && now < end;
      }) || worldstate.calendar1999[0];

      const year = new Date().getFullYear();
      const jan1 = new Date(year, 0, 1);
      const allDays = (cal.days || []).map((d) => {
        const dDate = new Date(jan1);
        dDate.setDate(d.day);
        const mName = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][dDate.getMonth()].toUpperCase();
        return { ...d, date: dDate, monthName: mName };
      }).sort((a, b) => a.day - b.day);

      const seasonMonths = [...new Set(allDays.map((d) => d.monthName))];

      const firstEventIdx = allDays.findIndex((d) => d.events?.length > 0);
      if (firstEventIdx !== -1) {
        setSelected1999Day(firstEventIdx);
        const eventMonth = allDays[firstEventIdx].monthName;
        const mIdx = seasonMonths.indexOf(eventMonth);
        if (mIdx !== -1) {
          setSelected1999Month(mIdx);
        }
      } else {
        // Fallback to current month if no events found at all
        const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
        const mIdx = seasonMonths.indexOf(currentMonthName);
        if (mIdx !== -1) {
          setSelected1999Month(mIdx);
        } else if (seasonMonths.length > 0) {
          setSelected1999Month(0);
        }
      }

      setInitialized1999(true);
    }
  }, [worldstate, initialized1999]);

  const toggleCard = (id) => {
    setHiddenCards((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const isVisible = (id) => !hiddenCards.includes(id);




  // Use pre-parsed worldState from monitoring context
  useEffect(() => {
    if (worldState) {
      setWorldstate(worldState);
      setLoading(false);
    }
  }, [worldState]);

  // Fetch bounty-cycle and location-bounties (not mirrored from context)
  const fetchBounties = useCallback(async () => {
    try {
      const [loc, cycle] = await Promise.all([
      fetch(LOCATION_BOUNTIES_API).then((r) => r.ok ? r.json() : null),
      fetch(BOUNTY_CYCLE_API).then((r) => r.ok ? r.json() : null)]
      );
      if (loc) setLocationBounties(loc);
      if (cycle) setBountyCycle(cycle);
      setLastFetch(Date.now());
    } catch {}
  }, []);

  useEffect(() => {
    fetchBounties();
    const iv = setInterval(fetchBounties, 120_000);
    return () => clearInterval(iv);
  }, [fetchBounties]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const currentArbyRaw = useMemo(() => getCurrentArby(arbys, ERg, dict), [arbys, ERg, dict]);
  const currentArby = useMemo(() => currentArbyRaw ? { ...currentArbyRaw, grade: arbyTiers?.[currentArbyRaw.node] || 'F' } : null, [currentArbyRaw, arbyTiers]);
  const upcomingArbies = useMemo(() => getUpcomingArbies(arbys, ERg, dict, arbyTiers, 5), [arbys, ERg, dict, arbyTiers]);

  // ── Timers (world-state cycles) ──────────────────────────────────────────────
  // State labels come from the worldstate API as EN enums (Day/Night/Warm/Cold/
  // Fass/Vome, Zariman factions, Duviri emotions).  The game dicts don't ship
  // these strings, so we map them through i18n keys.
  const timerStates = {
    Day: t('ui.dashboard.timer_day'),
    Night: t('ui.dashboard.timer_night'),
    Warm: t('ui.dashboard.timer_warm'),
    Cold: t('ui.dashboard.timer_cold'),
    Fass: t('ui.dashboard.timer_fass'),
    Vome: t('ui.dashboard.timer_vome'),
    Sorrow: t('ui.dashboard.timer_sorrow'),
    Fear: t('ui.dashboard.timer_fear'),
    Joy: t('ui.dashboard.timer_joy'),
    Anger: t('ui.dashboard.timer_anger'),
    Envy: t('ui.dashboard.timer_envy'),
    Corpus: resolveGameTerm('/Lotus/Language/Game/Faction_CorpusUC', locale),
    Grineer: resolveGameTerm('/Lotus/Language/Game/Faction_GrineerUC', locale),
    Reset: t('ui.dashboard.timer_reset'),
  }
  const localizeTimerState = (raw) => timerStates[raw] ?? raw
  const timers = [
  { label: resolveGameTerm('/Lotus/Language/Locations/CetusHub', locale), data: worldstate?.cetusCycle, getState: (d) => localizeTimerState(d.state) },
  { label: resolveGameTerm('/Lotus/Language/Locations/VenusLandscape', locale), data: worldstate?.vallisCycle, getState: (d) => localizeTimerState(d.state) },
  {
    label: resolveGameTerm('/Lotus/Language/InfestedMicroplanet/SolarMapDeimosLandscapeName', locale), data: worldstate?.cambionCycle, getState: (d) =>
    typeof d.active === 'boolean' ? (d.active ? localizeTimerState('Fass') : localizeTimerState('Vome')) : localizeTimerState(d.active || d.state || '?')
  },
  { label: resolveGameTerm('/Lotus/Language/Zariman/ZarimanRegionName', locale), data: worldstate?.zarimanCycle, getState: (d) => localizeTimerState(d.state) },
  { label: resolveGameTerm('/Lotus/Language/Duviri/Duviri', locale), data: worldstate?.duviriCycle, getState: (d) => localizeTimerState(d.state) },
  { label: t('ui.dashboard.timers_daily_reset'), data: { expiry: new Date(new Date().setUTCHours(24, 0, 0, 0)) }, getState: () => localizeTimerState('Reset') }].
  filter((t) => t.data);

  const spIncursionNodes = useMemo(() => {
    return getSpIncursionNodes(spIncursions);
  }, [spIncursions]);

  const fissureTabs = [
  { id: 'normal', label: t('ui.dashboard.fissure_normal') },
  { id: 'steel', label: t('ui.dashboard.fissure_steel_path') },
  { id: 'storm', label: t('ui.dashboard.fissure_void_storm') }];


  const visibleFissures = useMemo(() => {
    if (!worldstate?.fissures && !worldstate?.voidStorms) return [];
    const now = new Date();
    const all = [...(worldstate?.fissures || []), ...(worldstate?.voidStorms || [])];
    return all.
    filter((f) => {
      const exp = f.expiry?.$date?.$numberLong ?
      new Date(parseInt(f.expiry.$date.$numberLong, 10)) :
      new Date(f.expiry);
      if (exp <= now) return false;
      if (fissureTab === 'normal') return !f.isStorm && !f.isHard;
      if (fissureTab === 'steel') return f.isHard && !f.isStorm;
      if (fissureTab === 'storm') return f.isStorm;
      return false;
    }).
    sort((a, b) => a.tierNum - b.tierNum);
  }, [worldstate, fissureTab]);

  const archimedeaTabs = [
  { id: 'deep', label: t('ui.dashboard.archimedea_deep') },
  { id: 'temporal', label: t('ui.dashboard.archimedea_temporal') }];


  const bountyTabs = useMemo(() => [
  { id: 'holdfasts', label: dict?.['/Lotus/Language/Syndicates/ZarimanName'] || 'Holdfasts', icon: iconSrc('MiniMapZariman') },
  { id: 'cavia', label: dict?.['/Lotus/Language/EntratiLab/EntratiGeneral/EntratiLabSyndicateName'] || 'Cavia', icon: iconSrc('MiniMapCaviaHubSyndicate') },
  { id: 'hex', label: dict?.['/Lotus/Language/1999/MessengerHexName'] || 'Hex', icon: iconSrc('MiniMapMarkersJobBoard') },
  { id: 'cetus', label: dict?.['/Lotus/Language/Syndicates/CetusName'] || 'Cetus', icon: iconSrc('MiniMapEidolonCetusElder') },
  { id: 'deimos', label: dict?.['/Lotus/Language/InfestedMicroplanet/EntratiSyndicateName'] || 'Deimos', icon: iconSrc('MiniMapDeimosGrandmother') },
  { id: 'vallis', label: dict?.['/Lotus/Language/Syndicates/SolarisSecretName'] || 'Vallis', icon: iconSrc('MiniMapHubFortuna') }],
  [iconsPath, locale, dict]);

  // ── Owned-item lookup for the market sales card ─────────────────────────────
  // A shop item counts as owned when its resolved display name matches an item
  // the account owns. Two cheap O(1) sets:
  //   names  - normalized names of owned items from the parsed inventory.
  //   leaves - normalized path leaves of every /Lotus path in the raw inventory
  //            dump (decorations, cosmetics, emotes, song items, syandanas,
  //            ship decos, ...). Just string ops - no dict resolution.
  const ownedMarketNames = useMemo(() => {
    const names = new Set()
    const leaves = new Set()
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    const leaf = (p) => (p || '').split('/').pop()
    for (const it of (inventoryData?.all ?? [])) {
      if (it.owned) {
        names.add(norm(it.name))
        leaves.add(norm(leaf(it.unique_name)))
      }
    }
    if (rawInventory) {
      const walk = (node) => {
        if (Array.isArray(node)) { for (const v of node) walk(v) }
        else if (node && typeof node === 'object') { for (const v of Object.values(node)) walk(v) }
        else if (typeof node === 'string' && node.startsWith('/Lotus')) leaves.add(norm(leaf(node)))
      }
      walk(rawInventory)
    }
    return { names, leaves }
  }, [rawInventory, inventoryData]);

  const isMarketSaleOwned = (sale) => {
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
    if (ownedMarketNames.names.has(norm(sale?.item))) return true
    return ownedMarketNames.leaves.has(norm((sale?.uniqueName || '').split('/').pop()))
  };

  const renderBounties = () => {
    if (!locationBounties || !bountyCycle) {
      return <div className="min-h-[80px] flex items-center justify-center"><p className="text-xs text-kronos-dim italic">{t('ui.dashboard.loading_bounties')}</p></div>;
    }

    // Build a lookup from jobType path → level range + reward text from worldstate
    // SyndicateMissions jobs. Used for Cetus/Vallis/Deimos to show enemy levels.
    const wsBountyMap = new Map();
    for (const b of (worldstate?.bounties || [])) {
      if (b.jobType) wsBountyMap.set(b.jobType, b);
    }
    const lookupWsBounty = (jobPath) => wsBountyMap.get(jobPath) || null;

    let items = [];

    if (bountyTab === 'holdfasts' || bountyTab === 'cavia') {
      const key = bountyTab === 'holdfasts' ? 'ZarimanSyndicate' : 'EntratiLabSyndicate';
      const data = bountyCycle.bounties?.[key] || [];
      items = data.map((b) => {
        return {
          name: b.challenge ? resolveChallenge(b.challenge, dict, EC) : 'Unknown Bounty',
          desc: b.challenge ? resolveChallengeFlavour(b.challenge, dict, EC, ERg) : '',
          obj: b.challenge ? resolveChallengeDesc(b.challenge, dict, EC, ERg) : '',
          tier: b.rot ? `Rotation ${b.rot}` : ''
        };
      });
    } else if (bountyTab === 'hex') {
      const data = bountyCycle.bounties?.HexSyndicate || [];
      items = data.map((b) => {
        const flavour = b.challenge ? resolveChallengeFlavour(b.challenge, dict, EC, ERg, b.ally) : '';
        const obj = b.challenge ? resolveChallengeDesc(b.challenge, dict, EC, ERg, b.ally) : '';
        // Bounty card art lives in assets/ui/Bounty{Ally}.png; Lich bounties
        // have no ally so they get the Techrot art.
        const allyLeaf = b.ally ? b.ally.split('/').pop().replace(/AllyAgent$/, '') : '';
        const img = allyLeaf ? `Bounty${allyLeaf}` : 'BountyTechrot';
        return {
          name: b.challenge ? resolveChallenge(b.challenge, dict, EC) : 'Unknown Bounty',
          desc: flavour,
          obj,
          tier: b.rot ? `Rotation ${b.rot}` : '',
          img
        };
      });
    } else if (bountyTab === 'cetus') {
      const data = locationBounties.CetusSyndicate || {};
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const wsBounty = lookupWsBounty(list[0]);
          const level = wsBounty?.minLevel && wsBounty?.maxLevel ? `${wsBounty.minLevel}-${wsBounty.maxLevel}` : '';
          const main = list[0] ? resolveBountyTitle(list[0], dict) || cleanBountyName(list[0]) : 'Bounty';
          const stages = list.map((p) => resolveBountyTitle(p, dict) || resolveChallenge(p, dict, EC).replace(/^Cetus\s+/i, '')).join('\n');
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Tent', 'Pool '), level });
        }
      });
    } else if (bountyTab === 'deimos') {
      const data = locationBounties.EntratiSyndicate || {};
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const wsBounty = lookupWsBounty(list[0]);
          const level = wsBounty?.minLevel && wsBounty?.maxLevel ? `${wsBounty.minLevel}-${wsBounty.maxLevel}` : '';
          const main = list[0] ? resolveBountyTitle(list[0], dict) || cleanBountyName(list[0]) : 'Bounty';
          const stages = list.map((p) => resolveBountyTitle(p, dict) || resolveChallenge(p, dict, EC).replace(/^Deimos\s+/i, '')).join('\n');
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Chamber', 'Vault ').replace('Tent', 'Pool '), level });
        }
      });
    } else if (bountyTab === 'vallis') {
      const data = locationBounties.SolarisSyndicate || {};
      Object.entries(data).forEach(([key, list]) => {
        if (Array.isArray(list)) {
          const wsBounty = lookupWsBounty(list[0]);
          const level = wsBounty?.minLevel && wsBounty?.maxLevel ? `${wsBounty.minLevel}-${wsBounty.maxLevel}` : '';
          const main = list[0] ? resolveBountyTitle(list[0], dict) || cleanBountyName(list[0]) : 'Bounty';
          const stages = list.map((p) => resolveBountyTitle(p, dict) || resolveChallenge(p, dict, EC).replace(/^Venus\s+/i, '').replace(/^Solaris\s+/i, '')).join('\n');
          items.push({ name: main, desc: '', obj: stages, node: '', tier: key.replace('Bounty', '').replace(/([A-Z])/g, ' $1').trim(), level });
        }
      });
    }
    if (items.length === 0) return <div className="min-h-[80px] flex items-center justify-center"><p className="text-xs text-kronos-dim italic">{t('ui.dashboard.no_bounties')}</p></div>;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
        {items.map((it, idx) =>
        <div
          key={`${it.name}-${idx}`}
          className="relative rounded-lg border border-transparent hover:border-kronos-accent/30 transition-all group overflow-hidden min-h-[140px]">
          
            {/* Bounty art  -  character portrait sits on the right; the left ~40% is transparent whitespace */}
            {it.img && iconsPath &&
          <img
            src={convertFileSrc(`${iconsPath}/${it.img}.png`)}
            alt={it.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ objectPosition: 'right top' }}
            onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />

          }
            {/* Darken the left transparent zone so overlaid text stays legible; the portrait is right/top anchored */}
            <div className="absolute inset-0 left-0 right-[10%] bg-gradient-to-r from-black/65 via-black/40 to-transparent" />
            {/* Text spans the transparent-left width; stops short of the portrait */}
            <div className="absolute inset-0 left-0 right-[20%] flex flex-col justify-between p-3 z-10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-black text-white uppercase leading-tight flex-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{it.name}</p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {it.level && <span className="text-[10px] font-bold text-kronos-text/60 uppercase bg-black/20 px-1.5 rounded">{it.level}</span>}
                  {it.tier && <span className="text-[10px] font-bold text-kronos-accent uppercase bg-kronos-panel/70 px-1.5 rounded">{it.tier}</span>}
                </div>
              </div>
              {it.desc && <p className="text-xs text-kronos-text/90 leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{it.desc}</p>}
              {it.obj &&
            <p className="text-xs font-medium text-kronos-accent mt-auto leading-tight break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]">{t('dashboard.challenge')} {it.obj}
                </p>
            }
            </div>
          </div>
        )}
      </div>);

  };

  const renderArchimedea = () => {
    if (!worldstate?.archimedeas) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_archimedea')}</p>;
    const typeKey = archimedeaTab === 'deep' ? 'CT_LAB' : 'CT_HEX';
    const data = worldstate.archimedeas.find((a) => a.type === typeKey) || worldstate.archimedeas[0];
    if (!data) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_data_for_type')}</p>;

    return (
      <div className="space-y-4 mt-2">
        <div className="space-y-1.5">
          {data.missions.map((m, idx) =>
          <div key={idx} className="bg-kronos-panel/40 p-3 rounded-lg text-center w-full">
              {/* Mission type + deviation single line */}
              <p className="text-[12px] font-black uppercase mb-2 leading-tight tracking-wide">
                <span className="text-kronos-accent">
                  {m.missionType}
                </span>
                {m.deviation &&
              <>
                    <span className="text-kronos-dim/50 font-normal mx-2">-</span>
                    <span className="relative group/devtip font-bold normal-case text-kronos-text cursor-help">
                      {m.deviation.name}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/devtip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block font-normal text-left">
                        <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{m.deviation.name}</span>
                        <span className="text-kronos-text leading-relaxed block">{m.deviation.description}</span>
                      </span>
                    </span>
                  </>
              }
              </p>
              {/* Risks - 2-column grid for better space usage */}
              <div className="grid grid-cols-2 gap-1.5">
                {m.risks?.map((r, ri) =>
              <div
                key={ri}
                className={`relative group/risktip text-[12px] text-kronos-dim bg-black/30 px-3 py-1.5 rounded-md cursor-help border border-white/5 hover:border-kronos-accent/30 transition-colors ${m.risks.length === 3 && ri === 2 ? 'col-span-2' : ''}`}>
                
                    <span className="font-bold text-kronos-text/90 uppercase tracking-tight">{r.name}</span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/risktip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block text-left">
                      <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{r.name}</span>
                      <span className="text-kronos-text leading-relaxed block">{r.description}</span>
                    </span>
                  </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Personal Modifiers - 2-column grid */}
        {data.personalModifiers?.length > 0 &&
        <div className="pt-2 border-t border-white/5">
            <p className="text-[10px] text-kronos-dim uppercase font-bold mb-3 tracking-widest text-center">{t('ui.dashboard.personal_modifiers')}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {data.personalModifiers.map((pm, pi) =>
            <div key={pi} className="relative group/pmtip text-[11px] text-kronos-text text-center p-2.5 cursor-help block bg-black/20 rounded-lg border border-white/5 hover:border-kronos-accent/30 transition-colors">
                  <span className="font-bold uppercase tracking-wide">{pm.name}</span>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-kronos-panel rounded-lg text-[12px] opacity-0 group-hover/pmtip:opacity-100 transition-opacity z-50 shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none block text-left font-normal">
                    <span className="font-bold text-kronos-accent uppercase block mb-1.5 border-b border-white/5 pb-1">{pm.name}</span>
                    <span className="text-kronos-text leading-relaxed block">{pm.description}</span>
                  </span>
                </div>
            )}
            </div>
          </div>
        }
      </div>);

  };

  const renderNightwave = () => {
    const nw = worldstate?.nightwave;
    if (!nw) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.nightwave_inactive')}</p>;

    const affiliationTag = nw.affiliationTag || '';
    const hasInventory = rawInventory !== null && Object.keys(rawInventory || {}).length > 0;
    const affiliations = hasInventory ? rawInventory?.Affiliations || [] : [];
    const nwAffiliation = affiliations.find((a) => a.Tag === affiliationTag);
    const nwStandingTotal = nwAffiliation?.Standing ?? 0;
    const currentRank = nwAffiliation?.Title ?? nw.phase ?? 0;
    const miscItems = hasInventory ? rawInventory?.MiscItems || [] : [];
    const credCount = hasInventory ? miscItems.find((i) => i.ItemType === nw.credType)?.ItemCount ?? 0 : 0;
    const STANDING_PER_LEVEL = 10000;
    const standingInLevelRaw = hasInventory ? Math.max(0, nwStandingTotal - currentRank * STANDING_PER_LEVEL) : 0;
    // Handle overflow - if standing exceeds per-level max, flip to next rank
    const effectiveRank = currentRank + Math.floor(standingInLevelRaw / STANDING_PER_LEVEL);
    const standingInLevel = standingInLevelRaw % STANDING_PER_LEVEL;
    const categories = ['Daily', 'Weekly', 'Elite Weekly'];
    const categoryLabel = (cat) => ({
      Daily: t('ui.dashboard.challenge_daily'),
      Weekly: t('ui.dashboard.challenge_weekly'),
      'Elite Weekly': t('ui.dashboard.challenge_elite_weekly'),
    }[cat] || cat);
    const grouped = (nw.challenges || []).reduce((acc, c) => {
      let cat = 'Daily';
      if (c.isElite || c.xp >= 7000) cat = 'Elite Weekly';else
      if (c.xp >= 4500) cat = 'Weekly';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(c);
      return acc;
    }, {});

    const rewardTiers = nw.rewards || [];
    const progressPercent = Math.min(100, standingInLevel / STANDING_PER_LEVEL * 100);
    const rankToDisplay = hasInventory ? effectiveRank : -1;

    return (
      <div className="space-y-3">
        {/* Top section: Status + Rewards in 2 columns */}
        <div className="flex gap-3">
          {/* Left: Status info */}
          <div className="w-1/4 bg-kronos-panel/40 p-3 rounded-lg border border-white/5 flex flex-col">
            <p className="text-sm font-bold text-kronos-accent uppercase tracking-tight text-center mb-3">{nw.name}</p>
            <div className="flex-1 flex flex-col justify-between">
              {hasInventory ?
              <>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">{t('ui.dashboard.ends')}</span>
                    <span className="text-[14px] text-kronos-text">{timeRemaining(nw.expiry, t)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">{t('ui.dashboard.creds')}</span>
                    <span className="text-[14px] font-bold text-kronos-text">{credCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">{t('ui.dashboard.standing')}</span>
                    <span className="text-[14px] font-black text-kronos-accent">{standingInLevel.toLocaleString()} / {STANDING_PER_LEVEL.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-kronos-dim uppercase">{t('ui.dashboard.rank')}</span>
                    <span className="text-[14px] font-black text-kronos-accent">{currentRank}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-kronos-text">{currentRank}</span>
                    <div className="relative flex-1 h-3 bg-black/40 rounded overflow-hidden">
                      <div
                      className="absolute top-0 left-0 bottom-0 bg-kronos-accent"
                      style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-[11px] font-black text-kronos-dim">{currentRank + 1}</span>
                  </div>
                </> :

              <div className="flex flex-col items-center justify-center flex-1">
                  <p className="text-[12px] text-kronos-dim uppercase mb-1">{t('ui.dashboard.ends_in')}</p>
                  <p className="text-lg font-black text-kronos-text">{timeRemaining(nw.expiry, t)}</p>
                </div>
              }
            </div>
          </div>

          {/* Right: Rewards scrollable */}
          {rewardTiers.length > 0 &&
          <div className="flex-1 bg-kronos-panel/20 p-3 rounded-lg border border-white/5 overflow-hidden">
              <div
              className="h-[220px] overflow-x-auto custom-scrollbar"
              onWheel={(e) => {
                e.stopPropagation();
                e.currentTarget.scrollLeft += e.deltaY;
              }}>
              
                <div className="flex gap-6 items-stretch pb-2 h-full">
                  {rewardTiers.map((r, ri) => {
                  const isUnlocked = ri < rankToDisplay;
                  const isCurrent = ri === rankToDisplay;
                  return (
                    <div
                      key={ri}
                      className={`relative flex-shrink-0 transition-all flex flex-col items-center ${isCurrent ? 'ring-2 ring-kronos-accent rounded p-1 m-1' : ''}`}>
                      
                        <span className={`text-[9px] font-black uppercase mb-1 ${isCurrent ? 'text-kronos-accent' : 'text-kronos-dim/60'}`}>{ri + 1}</span>
                        <div className={`w-36 h-full flex items-center justify-center ${isUnlocked ? 'grayscale opacity-60' : ''}`}>
                          {r.modFrame ?
                        <ModCard
                          mod={{
                            name: r.name,
                            modFrame: r.modFrame,
                            icon: r.iconPath,
                            image: r.image,
                            description: r.description,
                            levelStats: r.levelStats,
                            category: r.modFrame,
                            max_rank: 3,
                            baseDrain: r.baseDrain,
                          }}
                          framesPath={framesPath}
                          cardImagesPath={cardImagesPath}
                          iconsPath={iconsPath}
                          exportTextIcons={ExportTextIcons}
                          width={136}
                          hideCategory /> :


                        <img
                          src={r.image}
                          alt={r.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />

                        }
                        </div>
                        {!r.modFrame &&
                      <p className="text-[9px] font-bold text-kronos-text uppercase leading-tight text-center mt-2 max-w-[120px] whitespace-normal break-words">{r.name}</p>
                      }
                      </div>);

                })}
                </div>
              </div>
            </div>
          }
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {categories.flatMap((cat) =>
          (grouped[cat] || []).map((c, idx) =>
          <div key={`${cat}-${idx}`} className="bg-kronos-panel/40 p-2 rounded border border-white/5 hover:border-kronos-accent/20 transition-all">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${cat === 'Elite Weekly' ? 'bg-yellow-500/20 text-yellow-400' : cat === 'Weekly' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {categoryLabel(cat)}
                  </span>
                  <span className="text-[10px] text-kronos-accent font-black">{c.xp.toLocaleString()}{t('ui.inventory.sort_xp')}</span>
                </div>
                <p className="text-sm font-bold text-kronos-text leading-tight mb-1.5">{c.name}</p>
                <p className="text-xs text-kronos-dim/80 leading-relaxed">{c.desc}</p>
              </div>
          )
          )}
        </div>
      </div>);

  };

  const renderCircuit = () => {
    if (!worldstate?.circuit?.length) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_circuit')}</p>;

    const groups = worldstate.circuit.reduce((acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(...c.choices);
      return acc;
    }, {});

    const getCircuitImage = (ch) => {
      // 1. Try resolveAnyImage (checks EI by uniqueName + nameToImage by lowered uniqueName from warframe-items)
      const byUnique = resolveAnyImage(ch.uniqueName, EI, nameToImage);
      if (byUnique) return byUnique;
      // 2. Try by display name (locale-dependent fallback  -  both nameToImage and ch.name are in same locale)
      const byName = nameToImage[ch.name.toLowerCase()];
      if (byName) return byName;
      const normalize = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
      const partialMatch = Object.entries(nameToImage).find(([k]) => normalize(k).includes(normalize(ch.name)));
      return partialMatch ? partialMatch[1] : null;
    };

    const isRewardOwned = (ch, cat) => {
      if (!inventoryData) return false;

      const choiceName = ch.name.replace(/ Incarnon Genesis$/, '').trim();

      const isSameFamily = (itemName, familyName) => {
        if (!itemName || !familyName) return false;
        const lowerItem = itemName.toLowerCase();
        const lowerFamily = familyName.toLowerCase();
        const isComponent = lowerItem.includes(' barrel') || lowerItem.includes(' receiver') || lowerItem.includes(' stock') || lowerItem.includes(' blueprint') || lowerItem.includes(' link') || lowerItem.includes(' lower limb') || lowerItem.includes(' upper limb') || lowerItem.includes(' string') || lowerItem.includes(' grip') || lowerItem.includes(' handle') || lowerItem.includes(' hilt') || lowerItem.includes(' blade');
        if (isComponent) return false;
        return lowerItem === lowerFamily || lowerItem.startsWith(lowerFamily + ' ');
      };

      if (cat === 'Normal') {
        return (inventoryData.warframes || []).some((wf) =>
        wf.owned && isSameFamily(wf.name, choiceName)
        );
      }

      if (cat === 'Steel Path') {
        // Owned if the weapon in inventory has the incarnon adapter installed
        return (inventoryData.all || []).some((item) =>
        item.is_incarnon && item.owned && isSameFamily(item.name, choiceName)
        );
      }
      return false;
    };

    return (
      <div className="space-y-4 mt-2">
        {Object.entries(groups).map(([cat, choices], idx) =>
        <div key={idx} className="bg-kronos-panel/40 p-2.5 rounded border border-transparent hover:border-kronos-accent/20 transition-all">
            <p className="text-[11px] font-black text-kronos-accent uppercase mb-2 tracking-widest text-center">{cat === 'Steel Path' ? t('ui.dashboard.fissure_steel_path') : t('ui.dashboard.fissure_normal')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {choices.map((ch, ci) => {
              const img = getCircuitImage(ch);
              const owned = isRewardOwned(ch, cat);
              return (
                <div key={ci} className="bg-black/20 p-3 rounded flex flex-col items-center gap-2 text-center min-h-[90px] w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] relative overflow-hidden group">
                    {owned &&
                  <div className="absolute top-1 right-1 z-20 bg-blue-500 text-kronos-bg rounded-full p-0.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                        <Check size={10} strokeWidth={4} />
                      </div>
                  }
                    <div className="w-14 h-14 flex items-center justify-center">
                      {img ?
                    <img
                      src={img}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} /> :


                    <div className="w-full h-full bg-kronos-panel/40 rounded flex items-center justify-center">
                          <Package size={20} className="text-kronos-dim/30" />
                        </div>
                    }
                    </div>
                    <span className="text-xs text-kronos-text font-medium leading-tight">{ch.name}</span>
                  </div>);

            })}
            </div>
          </div>
        )}
      </div>);

  };

  const render1999 = () => {
    const seasonsArr = worldstate?.calendar1999 || [];
    const now = Date.now();
    const cal = seasonsArr.find((s) => {
      const start = s.activation instanceof Date ? s.activation.getTime() : new Date(s.activation).getTime();
      const end = s.expiry instanceof Date ? s.expiry.getTime() : new Date(s.expiry).getTime();
      return now >= start && now < end;
    }) || seasonsArr[0];

    if (!cal) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_1999')}</p>;

    const seasonMap = {
      'CST_WINTER': { color: 'text-blue-300' },
      'CST_SPRING': { color: 'text-green-300' },
      'CST_SUMMER': { color: 'text-yellow-300' },
      'CST_FALL': { color: 'text-orange-300' }
    };
    const seasonLabels = {
      'CST_WINTER': t('ui.dashboard.season_winter'),
      'CST_SPRING': t('ui.dashboard.season_spring'),
      'CST_SUMMER': t('ui.dashboard.season_summer'),
      'CST_FALL': t('ui.dashboard.season_fall')
    };
    const seasonInfo = seasonMap[cal.season] || { color: 'text-kronos-accent' };
    const seasonName = seasonLabels[cal.season] || cal.season;

    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);

    const allDays = (cal.days || []).map((d) => {
      const dDate = new Date(jan1);
      dDate.setDate(d.day);
      const mName = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'][dDate.getMonth()].toUpperCase();
      return { ...d, date: dDate, monthName: mName };
    }).sort((a, b) => a.day - b.day);

    // Dynamically derive months from the days in this season
    const seasonMonths = [...new Set(allDays.map((d) => d.monthName))];

    const nextExpiry = cal.expiry instanceof Date ? cal.expiry : new Date(cal.expiry);

    const typeColors = {
      'CET_CHALLENGE': 'bg-orange-400',
      'CET_REWARD': 'bg-green-400',
      'CET_UPGRADE': 'bg-blue-400',
      'CET_BIRTHDAY': 'bg-pink-400'
    };
    const borderColors = {
      'CET_CHALLENGE': 'border-orange-400 text-orange-300',
      'CET_REWARD': 'border-green-400  text-green-300',
      'CET_UPGRADE': 'border-blue-400   text-blue-300',
      'CET_BIRTHDAY': 'border-pink-400   text-pink-300'
    };
    const fillColors = {
      'CET_CHALLENGE': 'bg-orange-400 border-orange-400 text-kronos-bg',
      'CET_REWARD': 'bg-green-400  border-green-400  text-kronos-bg',
      'CET_UPGRADE': 'bg-blue-400   border-blue-400   text-kronos-bg',
      'CET_BIRTHDAY': 'bg-pink-400   border-pink-400   text-kronos-bg'
    };
    const typeLabels = {
      'CET_CHALLENGE': t('ui.dashboard.event_challenge'),
      'CET_REWARD': t('ui.dashboard.event_reward'),
      'CET_UPGRADE': t('ui.dashboard.event_upgrade'),
      'CET_BIRTHDAY': t('ui.dashboard.event_birthday')
    };
    const goToMonth = (idx) => {
      setSelected1999Month(idx);
      const targetMonth = seasonMonths[idx];
      const targetIdx = allDays.findIndex((d) => d.monthName === targetMonth);
      setSelected1999Day(targetIdx !== -1 ? targetIdx : -1);
    };

    const displayMonth = seasonMonths[selected1999Month] || '';
    const monthDays = allDays.filter((d) => d.monthName === displayMonth);
    const selectedDay = selected1999Day >= 0 ? allDays[selected1999Day] : null;

    const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const monthIndex = MONTH_NAMES.indexOf(displayMonth);
    const firstOfMonth = monthIndex >= 0 ? new Date(year, monthIndex, 1) : null;
    const startOffset = firstOfMonth ? (firstOfMonth.getDay() + 6) % 7 : 0;
    const daysInMonth = firstOfMonth ? new Date(year, monthIndex + 1, 0).getDate() : 0;

    const dayByDom = {};
    for (const d of monthDays) dayByDom[d.date.getDate()] = d;

    const todayDom = new Date().getMonth() === monthIndex ? new Date().getDate() : -1;

    return (
      <div className="space-y-3 mt-1">
        {/* Season header */}
        <div className="flex items-center justify-between px-1">
          <p className={`text-sm font-black uppercase tracking-widest ${seasonInfo.color}`}>{seasonName}</p>
          <p className="text-[10px] text-kronos-dim font-mono">{timeRemaining(nextExpiry, t)}{t('ui.dashboard.darvo_left')}</p>
        </div>

        {/* Month tabs */}
        <div className="flex gap-1.5">
          {seasonMonths.map((m, idx) =>
          <button
            key={m}
            onClick={() => goToMonth(idx)}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${selected1999Month === idx ?
            'bg-kronos-accent text-kronos-bg' :
            'text-kronos-dim hover:text-kronos-text bg-kronos-panel/40 hover:bg-kronos-panel/70'}`
            }>
            
              {t(`ui.dashboard.month_${m.toLowerCase()}`)}
            </button>
          )}
        </div>

        {/* Grid + Detail side-by-side */}
        <div className="flex gap-3">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-7 mb-2 bg-zinc-800/50 rounded px-1 py-2">
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d, i) =>
              <div key={i} className="text-center text-[9px] font-black uppercase text-kronos-dim/50 py-1">{t(`ui.dashboard.weekday_short_${d}`).substring(0, 1)}</div>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) =>
              <div key={`blank-${i}`} />
              )}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dom = i + 1;
                const dayData = dayByDom[dom];
                const isToday = dom === todayDom;
                const isSelected = selectedDay && selectedDay.date.getDate() === dom && selectedDay.monthName === displayMonth;
                const hasEvents = !!dayData?.events?.length;

                const eventType = dayData?.events?.[0]?.type;
                const bc = borderColors[eventType] || 'border-kronos-dim/40 text-kronos-text';
                const fc = fillColors[eventType] || 'bg-kronos-accent border-kronos-accent text-kronos-bg';
                return hasEvents ?
                <button
                  key={dom}
                  onClick={() => setSelected1999Day(allDays.indexOf(dayData))}
                  className="aspect-square flex items-center justify-center cursor-pointer">
                  
                    <div className={`w-4 h-4 flex items-center justify-center rounded text-[11px] font-bold transition-all border ${isSelected ? fc : bc}`}>
                      {dom}
                    </div>
                  </button> :

                <div key={dom} className="aspect-square flex items-center justify-center text-kronos-dim/30 text-[11px] font-bold">{dom}</div>;

              })}
            </div>
          </div>

          {/* Detail panel */}
          <div className="w-44 flex-shrink-0">
            {selectedDay && selectedDay.monthName === displayMonth ? (() => {
              const grouped = selectedDay.events.reduce((acc, ev) => {
                const type = ev.type;
                if (!acc[type]) acc[type] = [];
                acc[type].push(ev);
                return acc;
              }, {});

              return (
                <div className="space-y-2">
                  <div className="bg-kronos-panel/40 rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
                    <p className="text-xl font-black text-kronos-accent leading-none">
                      {selectedDay.date.getDate()}
                    </p>
                    <p className="text-[9px] text-kronos-dim uppercase tracking-widest leading-none pt-0.5">
                      {t(`ui.dashboard.weekday_${selectedDay.date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()}`)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(grouped).map(([type, events]) =>
                    <div key={type} className="bg-kronos-panel/40 rounded-lg p-2 border border-white/5">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeColors[type] || 'bg-kronos-accent'}`} />
                          <span className="text-[9px] font-black uppercase tracking-wider text-kronos-dim">{typeLabels[type] || type}</span>
                        </div>
                        <div className="space-y-1 pl-1">
                          {events.map((ev, ei) =>
                        <div key={ei} className="min-w-0">
                              <p className="text-[12px] font-bold text-kronos-text leading-tight">{ev.name}</p>
                              {ev.description &&
                          <p className="text-[12px] text-kronos-dim/70 leading-tight mt-0.5">{ev.description}</p>
                          }
                            </div>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>);

            })() :
            <div className="h-full flex items-center justify-center">
                <p className="text-[10px] text-kronos-dim/40 italic text-center">{t('ui.dashboard.select_a')}<br />{t('ui.dashboard.day')}</p>
              </div>
            }
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-1 pt-1 border-t border-white/5">
          {Object.entries(typeLabels).map(([k, label]) =>
          <div key={k} className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${typeColors[k]}`} />
              <span className="text-[9px] text-kronos-dim uppercase tracking-wider">{label}</span>
            </div>
          )}
        </div>
      </div>);

  };

  const [showDescendiaModal, setShowDescendiaModal] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState(0);

  // Prefer the per-locale i18n description (game terms); fall back to the
  // English desc shipped in descendia.txt, then to the short label.
  const penanceDesc = (s) => (s.penanceDescI18nKey ? t(`ui.dashboard.${s.penanceDescI18nKey}`) : s.penanceDesc) || s.penance;
  const missionTypeDesc = (s) => (s.missionTypeDescI18nKey ? t(`ui.dashboard.${s.missionTypeDescI18nKey}`) : s.missionTypeDesc) || s.missionType;

  const renderDescendia = () => {
    if (!worldstate?.descendia?.length) return <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_descendia')}</p>;
    const current = worldstate.descendia[0];

    return (
      <div className="mt-2">
        <div className="mb-2">
          <Tabs tabs={[{ id: 'normal', label: t('ui.dashboard.descendia_normal') }, { id: 'steelpath', label: t('ui.dashboard.descendia_steel_path') }]} activeTab={descendiaTab} onChange={setDescendiaTab} fullWidth />
        </div>
        <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
          {current.stages.map((s) => {
            const isSpecial = s.isMarie || s.isLyon || s.isBoss;

            if (s.isMarie) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">{t('ui.dashboard.marie_sanctuary')}</p>
                    <Tooltip content={penanceDesc(s)} position="top">
                      <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penanceI18nKey ? t(`ui.dashboard.${s.penanceI18nKey}`) : s.penance}</p>
                    </Tooltip>
                  </div>
                </div>);

            }
            if (s.isLyon) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">{t('ui.dashboard.lyon_sanctuary')}</p>
                    <Tooltip content={penanceDesc(s)} position="top">
                      <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penanceI18nKey ? t(`ui.dashboard.${s.penanceI18nKey}`) : s.penance}</p>
                    </Tooltip>
                  </div>
                </div>);

            }
            if (s.isBoss) {
              return (
                <div key={s.index} className="p-2 rounded bg-kronos-accent/15 border border-kronos-accent/25 flex items-center gap-2">
                  <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-kronos-accent uppercase">{resolveGameTerm('/Lotus/Language/CircleOfHell/CoHProtoframeDevil', locale)}</p>
                    <Tooltip content={penanceDesc(s)} position="top">
                      <p className="text-[9px] text-kronos-dim uppercase truncate">{s.penanceI18nKey ? t(`ui.dashboard.${s.penanceI18nKey}`) : s.penance}</p>
                    </Tooltip>
                  </div>
                </div>);

            }

            return (
              <div key={s.index} className="p-1.5 rounded bg-kronos-panel/30 flex items-center gap-1.5">
                <span className="text-[9px] font-black text-kronos-dim bg-kronos-panel/60 px-1.5 py-0.5 rounded w-6 text-center flex-shrink-0">{s.index}</span>
                <div className="flex-1 min-w-0 p-1 rounded bg-kronos-panel/40">
                  <Tooltip content={missionTypeDesc(s)} position="top">
                    <p className="text-[10px] font-bold text-kronos-text uppercase">{s.missionTypeI18nKey ? t(`ui.dashboard.${s.missionTypeI18nKey}`) : s.missionType}</p>
                  </Tooltip>
                </div>
                <div className="flex-1 min-w-0 p-1 rounded bg-kronos-panel/20">
                  <Tooltip content={penanceDesc(s)} position="top">
                    <p className="text-[10px] text-kronos-dim uppercase">{s.penanceI18nKey ? t(`ui.dashboard.${s.penanceI18nKey}`) : s.penance}</p>
                  </Tooltip>
                </div>
              </div>);

          })}
        </div>
        <p className="text-[10px] text-kronos-dim font-mono mt-2 text-right">{timeRemaining(current.expiry, t)}{t('ui.dashboard.darvo_left')}</p>
      </div>);

  };

  const DescendiaModal = () => {
    if (!worldstate?.descendia?.length) return null;
    const upcoming = worldstate.descendia.slice(1, 5);

    return (
      <Modal
        isOpen={showDescendiaModal}
        onClose={() => setShowDescendiaModal(false)}
        title={t('ui.dashboard.upcoming_rotations')}
        maxWidth="max-w-md">
        
        <div className="space-y-2">
          {upcoming.map((set, setIdx) => {
            const isExpanded = expandedWeek === setIdx;
            const label = setIdx === 0 ? t('ui.dashboard.next_week') : t('ui.dashboard.in_weeks', { weeks: setIdx + 1 });

            return (
              <div key={setIdx} className="bg-kronos-panel/20 rounded-lg border border-transparent hover:border-kronos-accent/10 transition-all overflow-hidden">
                <button
                  onClick={() => setExpandedWeek(isExpanded ? -1 : setIdx)}
                  className="w-full flex items-center justify-between p-3 transition-colors hover:bg-kronos-accent/5">
                  
                  <div className="text-left">
                    <p className="text-[10px] font-black text-kronos-accent uppercase tracking-widest">{label}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-kronos-dim" /> : <ChevronDown size={16} className="text-kronos-dim" />}
                </button>

                {isExpanded &&
                <div className="px-3 pb-3 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    {set.stages.map((s) =>
                  <div key={s.index} className={`p-2 rounded flex justify-between items-center gap-2 ${s.isCheckpoint ? 'bg-kronos-accent/10 border border-kronos-accent/20' : 'bg-black/20'}`}>
                        <div className="min-w-0">
                          <Tooltip content={missionTypeDesc(s)} position="top">
                            <p className="text-[10px] font-bold text-kronos-text uppercase truncate">{s.missionTypeI18nKey ? t(`ui.dashboard.${s.missionTypeI18nKey}`) : s.missionType}{s.isBoss ? ` - ${resolveGameTerm('/Lotus/Language/CircleOfHell/CoHProtoframeDevil', locale)}` : ''}</p>
                          </Tooltip>
                          <Tooltip content={penanceDesc(s)} position="bottom">
                            <p className="text-[9px] text-kronos-dim truncate uppercase">{s.penanceI18nKey ? t(`ui.dashboard.${s.penanceI18nKey}`) : s.penance}</p>
                          </Tooltip>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${s.isCheckpoint ? 'text-kronos-accent bg-kronos-accent/20' : 'text-kronos-dim bg-kronos-panel/40'}`}>
                          {s.isCheckpoint ? `${t('ui.dashboard.checkpoint')} ${s.index}` : `${t('ui.dashboard.inf')} ${s.index}`}
                        </span>
                      </div>
                  )}
                  </div>
                }
              </div>);

          })}
        </div>
        <div className="p-3 mt-4 bg-kronos-panel/10 text-center rounded border border-white/5">
          <p className="text-[9px] text-kronos-dim uppercase font-bold tracking-widest">{t('ui.dashboard.rotations_update_weekly')}</p>
        </div>
      </Modal>);

  };

  const renderAlerts = () => {
    if (!worldstate?.alerts?.length) return (
      <Card glow className="p-3">
        <CardHeader imageSrc={iconSrc('Alert')} title={t('ui.dashboard.alerts')} />
        <p className="text-xs text-kronos-dim italic text-center py-4">{t('ui.dashboard.no_active_alerts')}</p>
      </Card>);

    return (
      <Card glow className="p-3">
        <CardHeader imageSrc={iconSrc('Alert')} title={t('ui.dashboard.alerts')} />
        <div className="space-y-1.5">
          {worldstate.alerts.map((a, idx) =>
          <div key={idx} className="bg-kronos-panel/40 rounded p-2 border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-black text-kronos-accent uppercase tracking-wider">{a.missionType}</span>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(a.expiry, t)}</span>
              </div>
              <p className="text-[11px] font-bold text-kronos-text uppercase leading-none mb-1">{a.node}</p>
              <div className="flex justify-between items-end">
                <span className="text-[9px] text-kronos-dim uppercase font-bold">{a.faction} (Lv {a.minLevel}-{a.maxLevel})</span>
                <span className="text-[10px] text-blue-400 font-bold uppercase">{a.rewardText}</span>
              </div>
            </div>
          )}
        </div>
      </Card>);

  };

  const renderBaro = () => {
    const vt = worldstate?.voidTrader;
    if (!vt) return null;
    const baroIcon = iconsPath ? convertFileSrc(`${iconsPath}/BaroKiTeerFlat.png`) : null;

    return (
      <Card glow className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {baroIcon ? <img src={baroIcon} className="w-5 h-5 object-contain" alt="" /> : <ShoppingBag size={16} className="text-kronos-accent flex-shrink-0" />}
            <p className="font-bold text-sm uppercase">{resolveGameTerm('/Lotus/Language/G1Quests/VoidTraderName', locale)}</p>
          </div>
          {vt.active && vt.inventory?.length > 0 ?
          <button
            onClick={() => setShowBaroModal(true)}
            className="text-[10px] bg-kronos-accent/20 text-kronos-accent font-bold px-2 py-0.5 rounded uppercase hover:bg-kronos-accent/30 transition-colors">{t('nav.inventory')}


          </button> :
          null}
        </div>
        <div className="bg-kronos-panel/40 rounded p-2">
          <p className="text-sm font-bold text-kronos-text uppercase">{vt.node}</p>
          <p className="text-xs text-kronos-dim mt-0.5 font-mono">
            {vt.active ? t('ui.dashboard.baro_departing', { time: timeRemaining(vt.expiry, t) }) : t('ui.dashboard.baro_arriving', { time: timeRemaining(vt.activation, t) })}
          </p>
        </div>
      </Card>);

  };

  const BaroModal = () => {
    const vt = worldstate?.voidTrader;
    const inventory = vt?.inventory;

    return (
      <Modal
        isOpen={showBaroModal}
        onClose={() => setShowBaroModal(false)}
        title={t('ui.dashboard.baro_inventory')}>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inventory?.map((item, idx) =>
          <div key={idx} className="bg-kronos-panel/40 p-2 rounded flex items-center gap-3 border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="w-12 h-12 bg-black/40 rounded flex items-center justify-center p-1 flex-shrink-0">
                <img src={resolveAnyImage(item, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-kronos-text uppercase truncate" title={item.item}>{item.item}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] flex items-center gap-1 font-bold text-yellow-400">
                    {iconSrc('Ducats') && <img src={iconSrc('Ducats')} className="w-3.5 h-3.5 object-contain" alt="" />}
                    {item.ducats} <span className="text-kronos-dim text-[8px] uppercase">{t('ui.dashboard.ducats')}</span>
                  </span>
                  <span className="text-[10px] flex items-center gap-1 font-bold text-blue-400">
                    {iconSrc('Credits') && <img src={iconSrc('Credits')} className="w-3.5 h-3.5 object-contain" alt="" />}
                    {item.credits.toLocaleString()} <span className="text-kronos-dim text-[8px] uppercase">{t('ui.dashboard.credits')}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>);

  };

  const WishlistModal = () => {
    const wishlist = inventoryData?.wishlist ?? [];
    return (
      <Modal
        isOpen={showWishlistModal}
        onClose={() => setShowWishlistModal(false)}
        title={t('ui.dashboard.wishlist')}>
        
        {wishlist.length === 0 ?
        <p className="text-xs text-kronos-dim italic text-center py-8">{t('ui.dashboard.no_wishlist_items')}</p> :

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wishlist.map((item, idx) =>
          <div key={idx} className="bg-kronos-panel/40 p-3 rounded flex items-center gap-4 border border-transparent hover:border-kronos-accent/20 transition-all">
                <div className="w-16 h-16 bg-black/40 rounded flex items-center justify-center p-1 flex-shrink-0">
                  <img src={resolveAnyImage(item, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-kronos-text uppercase" title={item.name}>{item.name}</p>
                </div>
              </div>
          )}
          </div>
        }
      </Modal>);

  };

  const renderEvents = () => {
    if (!worldstate?.events?.length && !worldstate?.globalBoosters?.length) return null;
    return (
      <Card glow className="p-3 border-kronos-accent/30">
        <CardHeader imageSrc={iconSrc('EventNotificationIcon')} title={t('ui.dashboard.events')} />
        <div className="space-y-2.5">
          {/* Global Boosters */}
          {worldstate?.globalBoosters?.map((b, idx) =>
          <div key={`booster-${idx}`} className="space-y-1 pb-2 border-kronos-panel/40 last:border-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-kronos-accent uppercase tracking-widest">{b.nameI18nKey ? t(b.nameI18nKey) : b.name}</p>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(b.expiry, t)}{t('ui.dashboard.darvo_left')}</span>
              </div>
            </div>
          )}

          {/* Regular Events */}
          {worldstate.events.map((e, idx) =>
          <div key={idx} className="space-y-1 pb-2 border-b border-kronos-panel/40 last:border-0">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-kronos-accent uppercase tracking-widest">{e.name}</p>
                <span className="text-[10px] text-kronos-dim font-mono">{timeRemaining(e.expiry, t)}{t('ui.dashboard.darvo_left')}</span>
              </div>

              {(e.rewards?.length > 0 || e.mainReward) &&
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {e.rewards?.map((r, ri) =>
              <span key={ri} className="text-[9px] text-kronos-accent font-bold uppercase">{r}</span>
              )}
                  {e.mainReward &&
              <span className="text-[9px] text-blue-400 font-bold uppercase">{e.mainReward}</span>
              }
                </div>
            }
            </div>
          )}
        </div>
      </Card>);

  };

  const renderSPIncursions = () => {
    const incursions = worldstate?.incursions || worldstate?.steelPath?.incursions;
    // Fallback expiry: Next day 00:00 UTC
    const todaySec = Math.floor(Date.now() / 86400000) * 86400;
    const nextReset = (todaySec + 86400) * 1000;
    const expiry = incursions?.expiry || nextReset;

    if (spIncursionNodes.length === 0) {
      return <p className="text-xs text-kronos-dim italic">{t('ui.dashboard.no_incursions_today')}</p>;
    }
    return (
      <div className="space-y-1.5">
        {spIncursionNodes.map((n, idx) => {
          const entry = ERg[n];
          const nodeName = resolveNode(n, dict, ERg, locale);
          const mType = entry ? resolveMissionType(entry.missionName || entry.missionType, dict, ERg, locale) : 'Unknown Mission';
          const faction = entry ? resolveNode(entry.faction, dict, ERg, locale) : 'Unknown Faction';
          const planet = entry ? resolveNode(entry.regionName || entry.systemName, dict, ERg, locale) : '';
          const planetStr = planet && planet !== 'Unknown Node' ? `, ${planet}` : '';

          return (
            <div key={idx} className="bg-kronos-panel/40 rounded p-2 flex justify-between items-center group border border-transparent hover:border-kronos-accent/20 transition-all">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-0.5 flex-wrap">
                  <span className="text-[11px] font-black text-kronos-accent uppercase tracking-wider leading-none">
                    {mType}
                  </span>
                  <span className="text-[11px] text-kronos-dim font-bold uppercase leading-none">
                    - {faction}
                  </span>
                </div>
                <div className="text-[10px] text-kronos-text uppercase mt-1 opacity-80 flex items-center gap-1">
                  <span className="text-kronos-accent/60">@</span>
                  <span className="truncate">{nodeName}{planetStr}</span>
                </div>
              </div>
              <div className="flex flex-col items-end flex-shrink-0 ml-2">
                <span className="text-[10px] text-kronos-accent font-black px-2 py-0.5 bg-kronos-accent/10 rounded-full">
                  5 {t('ui.dashboard.sp_essence')}
                </span>
              </div>
            </div>);

        })}
        {expiry &&
        <p className="text-[10px] text-kronos-dim mt-2 text-right font-mono tracking-tighter">{t('ui.dashboard.rotates_in').replace('{time}', timeRemaining(expiry, t).toUpperCase())}
          </p>
        }
      </div>);

  };

  if (loading && !worldstate) {
    return (
      <PageLayout
        titleKey="screen.dashboard"
        extra={
        <Button variant="ghost" onClick={fetchBounties} disabled={loading} className="h-12 w-12 !p-0 !px-0 !py-0">
            <RefreshCw size={28} strokeWidth={3} className="animate-spin text-kronos-accent" />
          </Button>
        }>
        
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <RefreshCw size={64} strokeWidth={2} className="text-kronos-accent animate-spin" />
          <p className="text-kronos-dim font-medium">{t('ui.dashboard.loading_worldstate')}</p>
        </div>
      </PageLayout>);

  }

  return (
    <PageLayout
      titleKey="screen.dashboard"
      extra={
      <div className="flex items-center gap-3 relative">
          <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-full transition-all border ${showSettings ?
          'bg-kronos-accent/20 border-kronos-accent text-kronos-accent shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' :
          'bg-kronos-panel/40 border-white/5 text-kronos-text hover:border-kronos-accent/30'}`
          }
          title={t('ui.dashboard.settings_title')}>
          
            <Settings size={18} className={showSettings ? 'animate-spin-slow' : ''} />
          </button>

          {showSettings &&
        <div className="absolute top-full right-0 mt-2 w-64 glass-panel border border-kronos-accent/20 rounded-lg p-4 z-[110] shadow-2xl">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-kronos-accent/10">
                <span className="text-xs font-bold uppercase tracking-wider text-kronos-accent">{t('ui.dashboard.visible_cards')}</span>
                <button onClick={() => setShowSettings(false)} className="text-kronos-dim hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {[
            { id: 'bounty', label: t('ui.dashboard.card_bounties') },
            { id: 'news', label: t('ui.dashboard.card_news') },
            { id: 'timers', label: t('ui.dashboard.card_world_timers') },
            { id: 'arb', label: t('ui.dashboard.card_arbitration') },
            { id: 'nightwave', label: t('ui.dashboard.card_nightwave') },
            { id: 'inv', label: t('ui.dashboard.card_invasions') },
            { id: 'fiss', label: t('ui.dashboard.card_fissures') },
            { id: 'baro', label: t('ui.dashboard.card_baro') },
            { id: 'arch', label: t('ui.dashboard.card_archimedea') },
            { id: '1999', label: t('ui.dashboard.card_1999') },
            { id: 'inf', label: t('ui.dashboard.card_sp_incursions') },
            { id: 'desc', label: t('ui.dashboard.card_descendia') },
            { id: 'sortie', label: t('ui.dashboard.card_sorties') },
            { id: 'hunt', label: t('ui.dashboard.card_archon_hunts') },
            { id: 'circuit', label: t('ui.dashboard.card_circuit') },
            { id: 'deal', label: t('ui.dashboard.card_daily_deals') },
            { id: 'sales', label: t('ui.dashboard.card_market_sales') },
            { id: 'alerts', label: t('ui.dashboard.card_alerts') },
            { id: 'event', label: t('ui.dashboard.card_events') }].
            map((card) =>
            <label key={card.id} className="flex items-center justify-between group cursor-pointer">
                    <span className="text-xs text-kronos-dim group-hover:text-kronos-text transition-colors">{card.label}</span>
                    <input
                type="checkbox"
                checked={isVisible(card.id)}
                onChange={() => toggleCard(card.id)}
                className="accent-kronos-accent w-3 h-3 cursor-pointer" />
              
                  </label>
            )}
              </div>
            </div>
        }

          {lastFetch &&
        <span className="text-[10px] text-kronos-dim uppercase font-bold tracking-tighter">{t('dashboard.synced')}
          {new Date(lastFetch).toLocaleTimeString()}
            </span>
        }
          <Button
          variant="ghost"
          onClick={fetchBounties}
          disabled={loading}
          className="h-9 w-9 !p-0 hover:bg-kronos-accent/10 transition-colors">
          
            <RefreshCw
            size={18}
            strokeWidth={3}
            className={`${loading ? 'animate-spin' : ''} text-kronos-accent`} />
          
          </Button>
        </div>
      }>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-4">
        {/* Bounties - Full Width */}
        {isVisible('bounty') &&
        <div className="lg:col-span-3">
            <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('MiniMapBountySource')} title={t('ui.dashboard.bounties')} />
              <Tabs tabs={bountyTabs} activeTab={bountyTab} onChange={setBountyTab} className="mb-2" fullWidth />
              {renderBounties()}
            </Card>
          </div>
        }

        {/* Nightwave - Spans Full Width */}
        {isVisible('nightwave') &&
        <div className="lg:col-span-3">
            <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('NightwaveIconSimple')} title={t('ui.dashboard.nightwave')} />
              {renderNightwave()}
            </Card>
          </div>
        }

        {/* ── Col 1 ── */}
        <div className="space-y-4">
          {isVisible('alerts') && renderAlerts()}

          {/* World Timers */}
          {isVisible('timers') && timers.length > 0 &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('DailyTimerIcon')} title={t('ui.dashboard.world_timers')} />
              <div className="grid grid-cols-2 gap-2">
                {timers.map(({ label, data, getState }) =>
              <div key={label} className="bg-kronos-panel/40 rounded p-2 flex flex-col gap-0.5">
                    <p className="text-[10px] text-kronos-dim uppercase tracking-wider leading-none">{label}</p>
                    <p className="text-sm font-bold uppercase text-kronos-accent leading-tight">{getState(data)}</p>
                    <p className="text-xs text-kronos-dim font-mono">{timeRemaining(data.expiry, t)}</p>
                  </div>
              )}
              </div>
            </Card>
          }

          {isVisible('baro') && renderBaro()}

          {/* Arbitration */}
          {isVisible('arb') &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('EliteAlertIconSimple')} title={t('ui.dashboard.arbitration')} />
              {currentArby ?
            <div className="space-y-2">
                  <div className="bg-kronos-panel/40 rounded p-2 flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-kronos-dim uppercase mb-0.5">{t('ui.dashboard.current')}</p>
                      <p className="text-sm font-bold text-kronos-accent truncate">{resolveNode(currentArby.type, dict, ERg, locale)}</p>
                      <p className="text-sm font-bold truncate">{resolveNode(currentArby.node, dict, ERg, locale)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                      <span className="text-[12px] text-kronos-dim font-mono">
                        {timeRemaining(currentArby.ts + 3600000, t)}
                      </span>
                      <GradeBadge grade={currentArby.grade} />
                    </div>
                  </div>
                  {upcomingArbies.length > 0 &&
              <div>
                      <p className="text-[10px] text-kronos-dim uppercase font-bold mb-1">{t('ui.dashboard.upcoming')}</p>
                      <div className="space-y-1">
                        {upcomingArbies.map((a, i) =>
                  <div key={i} className="bg-kronos-panel/40 rounded p-1.5 flex justify-between items-center text-xs uppercase">
                            <span className="font-bold truncate">{resolveNode(a.type, dict, ERg, locale)} - {resolveNode(a.node, dict, ERg, locale)}</span>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                              <span className="text-kronos-dim font-mono">
                                {new Date(a.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <GradeBadge grade={a.grade} />
                            </div>
                          </div>
                  )}
                      </div>
                    </div>
              }
                  {arbitrationModifiers &&
              <div className="pt-2 border-t border-kronos-divider/30">
                      <p className="text-xs font-bold text-kronos-accent mb-1 uppercase tracking-wide">{t('ui.dashboard.personal_bonuses')}</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-2 bg-kronos-panel/40 rounded px-2 py-1.5">
                          <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                            <img src={resolveAnyImage(arbitrationModifiers.suitType, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                          </div>
                          <span className="text-xs text-kronos-text leading-tight ">{resolveItemName(arbitrationModifiers.suitType, dict, uniqueNameToName)}</span>
                        </div>
                        {(arbitrationModifiers.wepTypes || []).map((w, i) =>
                  <div key={i} className="flex items-center gap-2 bg-kronos-panel/40 rounded px-2 py-1.5">
                            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                              <img src={resolveAnyImage(w, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                            </div>
                            <span className="text-xs text-kronos-text leading-tight ">{resolveItemName(w, dict, uniqueNameToName)}</span>
                          </div>
                  )}
                      </div>
                    </div>
              }
                </div> :
            <p className="text-xs text-kronos-dim italic">{t('ui.dashboard.loading_data')}</p>}
            </Card>
          }

          {isVisible('deal') && worldstate?.dailyDeals?.[0] && (() => {
            const deal = worldstate.dailyDeals[0];
            const left = Math.max(0, deal.total - deal.sold);
            const isSoldOut = left === 0;
            const darvoIcon = iconsPath ? convertFileSrc(`${iconsPath}/DarvoIcon.png`) : null;
            return (
              <Card glow className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {darvoIcon ? <img src={darvoIcon} className="w-5 h-5 object-contain" alt="" /> : <DollarSign size={16} className="text-kronos-accent flex-shrink-0" />}
                  <p className="font-bold text-sm uppercase">{t('ui.dashboard.darvo_deal')}</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-14 h-14 bg-kronos-panel/40 rounded flex items-center justify-center p-1 border border-kronos-panel flex-shrink-0">
                    <img
                      src={resolveAnyImage(deal, EI, nameToImage)}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                    
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold leading-tight text-sm text-kronos-text truncate" title={deal.item}>
                      {deal.item}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm text-kronos-dim line-through decoration-red-500/50">{deal.originalPrice}</span>
                      <span className="text-sm text-kronos-accent font-black">{deal.salePrice}</span>
                      <span className="flex items-center gap-1 text-sm font-bold text-kronos-text">
                        {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-4 h-4 object-contain" alt="" />}{t('ui.dashboard.platinum')}

                      </span>
                      <span className="text-sm text-kronos-dim">(-{deal.discount}%)</span>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-kronos-dim font-bold uppercase tracking-wider">
                        {left}/{deal.total}{isSoldOut && <span className="text-red-500 font-black ml-1">({t('ui.dashboard.sold_out')})</span>}
                      </span>
                      <span className="text-[10px] text-kronos-dim font-mono uppercase">{timeRemaining(deal.expiry, t)}{t('ui.dashboard.darvo_left')}</span>
                    </div>
                  </div>
                </div>
              </Card>);

          })()}

          {/* Market Sales */}
          {isVisible('sales') && worldstate?.flashSales?.length > 0 &&
          <Card glow className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-kronos-accent flex-shrink-0" />
                  <p className="font-bold text-sm uppercase">{t('ui.dashboard.market_sales')}</p>
                </div>
                <button
                onClick={() => setShowWishlistModal(true)}
                className="text-[10px] bg-kronos-accent/20 text-kronos-accent font-bold px-2 py-0.5 rounded uppercase hover:bg-kronos-accent/30 transition-colors">{t('ui.dashboard.wishlist')}


              </button>
              </div>
              <div className="space-y-1.5">
                {worldstate.flashSales.map((sale, idx) => {
                const saleOwned = isMarketSaleOwned(sale)
                return (
              <div key={idx} className={`flex items-center gap-3 bg-kronos-panel/40 rounded p-2.5 ${saleOwned ? 'opacity-80' : ''}`}>
                    <div className="w-14 h-14 bg-black/40 rounded flex items-center justify-center p-1 flex-shrink-0">
                      <img src={resolveAnyImage(sale, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-kronos-text uppercase truncate" title={sale.item}>{sale.item}</p>
                        {saleOwned &&
                          <span className="flex items-center gap-0.5 text-[9px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/30 rounded px-1 py-0.5 flex-shrink-0">
                            <Check size={9} />{t('ui.inventory.badge_owned')}
                          </span>
                        }
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-kronos-dim line-through decoration-red-500/50">{sale.originalPrice}</span>
                        <span className="flex items-center gap-1 text-sm text-kronos-accent font-black">
                          {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-4 h-4 object-contain" alt="" />}
                          {sale.salePrice}
                        </span>
                      </div>
                    </div>
                  </div>
              )
            })}
              </div>
            </Card>
          }
        </div>

        {/* ── Col 2 ── */}
        <div className="space-y-4">
          {isVisible('event') && renderEvents()}
          {/* SP Incursions */}
          {isVisible('inf') &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('Difficulty2')} title={t('ui.dashboard.sp_incursions')} />
              {isVisible('inf') && renderSPIncursions()}
            </Card>
          }

          {/* Sortie */}
          {isVisible('sortie') && worldstate?.sortie &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('Sortie')} title={t('ui.dashboard.sortie')} />
              <p className="text-sm font-bold text-kronos-accent mb-2 uppercase">{worldstate.sortie.boss}</p>
              <div className="space-y-1.5">
                {worldstate.sortie.variants.map((v, idx) =>
              <div key={idx} className="bg-kronos-panel/40 rounded p-2">
                    <p className="text-sm font-bold text-kronos-text uppercase">{v.node}</p>
                    <p className="text-xs text-kronos-dim mt-0.5">{v.missionType} - {v.modifier}</p>
                  </div>
              )}
              </div>
              <p className="text-xs text-kronos-dim mt-2 text-right">{timeRemaining(worldstate.sortie.expiry, t)}</p>
            </Card>
          }

          {/* Archon Hunt */}
          {isVisible('hunt') && worldstate?.archonHunt &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('FactionNarmer')} title={t('ui.dashboard.archon_hunt')} />
              <div className="flex items-center gap-2 mb-2">
                {iconSrc(`Archon${worldstate.archonHunt.bossKey?.split('/').pop()?.replace('SORTIE_BOSS_', '').replace(/^Archon/, '').replace(/^(\w)(\w+)/, (m, f, r) => f + r.toLowerCase())}Icon`) &&
              <img src={iconSrc(`Archon${worldstate.archonHunt.bossKey?.split('/').pop()?.replace('SORTIE_BOSS_', '').replace(/^Archon/, '').replace(/^(\w)(\w+)/, (m, f, r) => f + r.toLowerCase())}Icon`)} className="w-5 h-5 object-contain" alt="" />
              }
                <p className="text-sm font-bold text-red-400 uppercase">{worldstate.archonHunt.boss}</p>
              </div>
              <div className="space-y-1.5">
                {worldstate.archonHunt.missions.map((m, idx) =>
              <div key={idx} className="bg-kronos-panel/40 rounded p-2">
                    <p className="text-sm font-bold text-kronos-text uppercase">{m.node}</p>
                    <p className="text-xs text-kronos-dim mt-0.5">{m.type}</p>
                  </div>
              )}
              </div>
              {archonModifiers &&
            <div className="mt-2 pt-2 border-t border-kronos-divider/30">
                  <p className="text-xs font-bold text-kronos-accent mb-1 uppercase tracking-wide">{t('ui.dashboard.personal_bonuses')}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-2 bg-kronos-panel/40 rounded px-2 py-1.5">
                      <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                        <img src={resolveAnyImage(archonModifiers.suitType, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                      </div>
                      <span className="text-xs text-kronos-text leading-tight ">{resolveItemName(archonModifiers.suitType, dict, uniqueNameToName)}</span>
                    </div>
                    {(archonModifiers.wepTypes || []).map((w, i) =>
                <div key={i} className="flex items-center gap-2 bg-kronos-panel/40 rounded px-2 py-1.5">
                        <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                          <img src={resolveAnyImage(w, EI, nameToImage)} alt="" className="max-w-full max-h-full object-contain" onError={(e) => {e.target.style.display = 'none';e.target.onerror = null;}} />
                        </div>
                        <span className="text-xs text-kronos-text leading-tight ">{resolveItemName(w, dict, uniqueNameToName)}</span>
                      </div>
                )}
                  </div>
                </div>
            }
              <p className="text-xs text-kronos-dim mt-2 text-right">{timeRemaining(worldstate.archonHunt.expiry, t)}</p>
            </Card>
          }

          {/* Archimedea */}
          {isVisible('arch') &&
          <Card glow className="p-3 border-kronos-accent/30">
              <CardHeader imageSrc={iconSrc('ConquestHardModeIcon')} title={t('ui.dashboard.archimedea')} />
              <Tabs tabs={archimedeaTabs} activeTab={archimedeaTab} onChange={setArchimedeaTab} className="mb-2" fullWidth />
              {renderArchimedea()}
            </Card>
          }

          {/* Descendia */}
          {isVisible('desc') &&
          <Card glow className="p-3">
              <CardHeader
              imageSrc={iconSrc('MiniMapRoathe')}
              title={t('ui.dashboard.descendia')}
              action={
              <button
                onClick={() => setShowDescendiaModal(true)}
                className="p-1 hover:bg-kronos-accent/10 rounded transition-colors text-kronos-dim hover:text-kronos-accent"
                title={t('ui.dashboard.preview_upcoming_rotations')}>
                
                    <Calendar size={16} />
                  </button>
              } />
            
              {renderDescendia()}
            </Card>
          }
        </div>

        {/* ── Col 3 ── */}
        <div className="space-y-4">
          {/* Duviri Circuit */}
          {isVisible('circuit') &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('DuviriMiniMapThrax')} title={resolveGameTerm('/Lotus/Language/Duviri/MapNodeEndless', locale)} />
              {renderCircuit()}
            </Card>
          }

          {/* 1999 Calendar */}
          {isVisible('1999') &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('RetroTaskbarCalendarLg')} title={t('ui.dashboard.calendar_1999')} />
              {render1999()}
            </Card>
          }

          {/* Void Fissures */}
          {isVisible('fiss') &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('VoidTearIcon')} title={t('ui.dashboard.void_fissures')} />
              <Tabs tabs={fissureTabs} activeTab={fissureTab} onChange={setFissureTab} className="mb-2" fullWidth />
              <div className="space-y-1">
                {visibleFissures.map((f, idx) =>
              <div key={idx} className="bg-kronos-panel/40 rounded p-1.5 flex justify-between items-center uppercase">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{f.tier} - {f.missionType}</span>
                      <span className="text-[10px] text-kronos-dim leading-none mt-0.5">{f.node}</span>
                    </div>
                    <span className="text-xs text-kronos-dim font-mono">{timeRemaining(f.expiry, t)}</span>
                  </div>
              )}
              </div>
            </Card>
          }

          {/* Invasions */}
          {isVisible('inv') && worldstate?.invasions?.length > 0 &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('Invasion')} title={t('ui.dashboard.invasions')} />
              <div className="space-y-4 mt-4">
                {worldstate.invasions.filter((i) => !i.completed).slice(0, 5).map((inv, idx) => {
                const completionPercentage = Math.max(0, Math.min(100, inv.completion));

                return (
                  <div key={idx} className="relative group/inv">

                      {/* Line 1: Factions & Node */}
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold text-blue-400 uppercase w-[30%] text-left truncate tracking-wider">
                          {inv.attacker.faction}
                        </span>
                        <div className="w-[40%] text-center truncate">
                          <span className="text-[10px] font-bold text-white/90 tracking-wide">{inv.node}</span>
                          {inv.planet && <span className="text-[10px] text-white/50 ml-1 uppercase">• {inv.planet}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-red-400 uppercase w-[30%] text-right truncate tracking-wider">
                          {inv.defender.faction}
                        </span>
                      </div>

                      {/* Line 2: Reward Titles */}
                      <div className="flex justify-between mb-1">
                        <span className="text-[12px] text-white/80 w-1/2 text-left pr-2" title={inv.attacker.rewardText}>
                          {inv.attacker.rewardText || '\u00A0'}
                        </span>
                        <span className="text-[12px] text-white/80 w-1/2 text-right pl-2" title={inv.defender.rewardText}>
                          {inv.defender.rewardText || '\u00A0'}
                        </span>
                      </div>

                      {/* Line 3: Icons & Progress Bar */}
                      <div className="flex items-center gap-3">
                        {/* Attacker Icon */}
                        <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                          {inv.attacker.reward &&
                        <img
                          src={resolveAnyImage(inv.attacker.reward, EI, nameToImage)}
                          alt="" />

                        }
                        </div>

                        {/* Progress Bar */}
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
                          <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${completionPercentage}%` }} />
                        
                          <div
                          className="h-full bg-red-500 transition-all duration-500"
                          style={{ width: `${100 - completionPercentage}%` }} />
                        
                        </div>

                        {/* Defender Icon */}
                        <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                          {inv.defender.reward &&
                        <img
                          src={resolveAnyImage(inv.defender.reward, EI, nameToImage)}
                          alt="" />

                        }
                        </div>
                      </div>

                      {/* Divider */}
                      {idx < 4 && <div className="mt-3 h-px bg-white/5 w-full" />}
                    </div>);

              })}
              </div>
            </Card>
          }

          {/* Latest News */}
          {isVisible('news') && worldstate?.news &&
          <Card glow className="p-3">
              <CardHeader imageSrc={iconSrc('News')} title={t('ui.dashboard.latest_news')} />
              <div className="space-y-2">
                {worldstate.news.slice(0, 3).map((item, idx) =>
              <div key={idx} className="text-xs">
                    {item.link ?
                <button
                  onClick={() => {invoke('open_url', { url: item.link }).catch(console.error);}}
                  className="font-bold hover:text-kronos-accent transition-colors block leading-tight text-left w-full cursor-pointer">
                  
                        {item.message}
                      </button> :

                <p className="font-bold leading-tight">{item.message}</p>
                }
                    <p className="text-[10px] text-kronos-dim mt-0.5 font-mono">{timeSince(item.date, t)}</p>
                  </div>
              )}
              </div>
            </Card>
          }
        </div>
      </div>
      <DescendiaModal />
      <BaroModal />
      <WishlistModal />
    </PageLayout>);

}