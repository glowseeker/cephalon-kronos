import { useRef, useEffect, useCallback, useState } from 'react';
import { useUi } from '../contexts/UiContext'
import { PageLayout, Card, Tabs, Modal, Button, Input } from '../components/UI';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { useMonitoring } from '../contexts/MonitoringContext';
import { parseCustomMarkers } from '../lib/customMarkers';
import { MapPin, Plus, Trash, Link2, Crosshair, Eye, EyeOff, Edit3, X, Layers, Check, Navigation, Skull, Shield, Star, Diamond } from 'lucide-react';


const ICONS = {
  MapPin: MapPin,
  Skull: Skull,
  Shield: Shield,
  Star: Star,
  Diamond: Diamond
};

const MAPS = [
{ name: 'Plains of Eidolon', nameKey: 'maps.name_poe', raw: 'poe_full.png', labeled: 'PlainsofEidolon_4k_Map.png' },
{ name: 'Orb Vallis', nameKey: 'maps.name_vallis', raw: 'venus_full.png', labeled: 'OrbVallis4kMap-min.png' },
{ name: 'Cambion Drift', nameKey: 'maps.name_deimos', raw: 'deimos_full.png', labeled: 'CambianDrift4kMap.png' },
{ name: 'Duviri', nameKey: 'maps.name_duviri', raw: 'Duviri_map_with_caves.png', labeled: 'Duviri_map_with_caves.png' }];


const placeholderSvg = (text) => `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect fill="#0b0b0b" width="100%" height="100%"/><text x="50%" y="50%" fill="#cccccc" font-size="20" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`
)}`;

const MIN_FIT_FRACTION = 1.0;
const MAX_SCALE = 8;
const MIN_VISIBLE = 100;

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#eab308'];

const genId = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

const MAP_CONFIG_DIR = 'data/user/map-configs';

function configFilename(tabId) {
  const map = MAPS[parseInt(tabId)];
  if (!map) return `${tabId}.json`;
  return map.name.toLowerCase().replace(/\s+/g, '-') + '.json';
}

async function loadMapConfigs() {
  try {
    const files = await invoke('list_map_configs');
    const configs = {};
    for (const filename of files) {
      try {
        const text = await invoke('read_map_config', { filename });
        const parsed = JSON.parse(text);
        if (parsed?.tabId != null && Array.isArray(parsed.configs)) {
          configs[parsed.tabId] = parsed.configs;
        }
      } catch (e) {console.warn('Failed to load map config', filename, e);}
    }
    return configs;
  } catch {return {};}
}

async function saveMapConfigs(configs) {
  try {
    for (const [tabId, configList] of Object.entries(configs)) {
      const filename = configFilename(tabId);
      const content = JSON.stringify({ tabId, configs: configList });
      await invoke('write_map_config', { filename, content });
    }
  } catch (e) {console.error('Failed to save map configs:', e);}
}

function parsePathTargets(text, currentLabelNum) {
  if (!text || !text.trim()) return [];
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
  const nums = [];
  for (const p of parts) {
    const n = parseInt(p, 10);
    if (!isNaN(n) && n > 0 && n !== currentLabelNum) nums.push(n);
  }
  return nums;
}

export default function Maps() {
  const { t } = useUi()
  const [activeTab, setActiveTab] = useState('0');
  const [mapsPath, setMapsPath] = useState('');
  const [allConfigs, setAllConfigs] = useState({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState('view');
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [addingMarker, setAddingMarker] = useState(null);
  const [configToEdit, setConfigToEdit] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgNatural, setImgNatural] = useState({ w: 800, h: 600 });
  const [markerLabelEdit, setMarkerLabelEdit] = useState('');
  const [markerPathEnabled, setMarkerPathEnabled] = useState(false);
  const [markerPathText, setMarkerPathText] = useState('');
  const [markerNotesEdit, setMarkerNotesEdit] = useState('');
  const [pendingConfigId, setPendingConfigId] = useState(null);
  const [contextMenu, setContextMenuState] = useState(null);
  const setContextMenu = useCallback((val) => {
    contextMenuRef.current = val;
    setContextMenuState(val);
  }, []);

  const xfRef = useRef({ x: 0, y: 0, scale: 1 });
  const autoPathRef = useRef(false);
  const contextMenuRef = useRef(null);
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const transformRef = useRef(null);
  const rafRef = useRef(null);
  const panning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0, moved: false });
  const selectedMarkerPos = useRef({ x: 0, y: 0 });
  const fitScaleRef = useRef(1);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTime = useRef(0);
  const inertiaRaf = useRef(null);
  const pointerMoveHandler = useRef(null);
  const pointerUpHandler = useRef(null);

  useEffect(() => {
    invoke('get_maps_path').then(setMapsPath).catch(console.error);
    loadMapConfigs().then(setAllConfigs).catch(console.error);
  }, []);


  const [useRawMap, setUseRawMap] = useState(false);
  const activeMap = MAPS[parseInt(activeTab)];
  const mapFilename = useRawMap ? activeMap?.raw : activeMap?.labeled;
  const { worldState, inventoryData } = useMonitoring();
  const duviriCycle = worldState?.duviriCycle;
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!duviriCycle) return;
    const tick = () => {
      const ms = duviriCycle.expiry - Date.now();
      if (ms <= 0) {setTimeLeft('expired');return;}
      const m = Math.floor(ms / 60000);
      const s = Math.floor(ms % 60000 / 1000);
      setTimeLeft(`${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [duviriCycle]);

  const applyTransform = useCallback(() => {
    if (!transformRef.current) return;
    const { x, y, scale } = xfRef.current;
    transformRef.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;

    const invScale = 1 / scale;
    const markers = transformRef.current.querySelectorAll('.map-marker-container');
    for (let i = 0; i < markers.length; i++) {
      markers[i].style.transform = `translate(-50%, -50%) scale(${invScale})`;
    }
    const paths = transformRef.current.querySelectorAll('.map-path');
    for (let i = 0; i < paths.length; i++) {
      paths[i].setAttribute('stroke-width', (0.35 * invScale).toString());
    }
  }, []);

  const clamp = useCallback((xf) => {
    if (!wrapRef.current) return xf;
    const cw = wrapRef.current.offsetWidth;
    const ch = wrapRef.current.offsetHeight;
    const iw = imgNatural.w;
    const ih = imgNatural.h;
    const s = xf.scale;
    const hw = iw * s / 2;
    const hh = ih * s / 2;

    let x = xf.x;
    if (hw * 2 >= cw) {
      const maxX = hw - cw / 2;
      const minX = cw / 2 - hw;
      x = Math.min(maxX, Math.max(minX, x));
    } else {
      x = 0;
    }

    let y = xf.y;
    if (hh * 2 >= ch) {
      const maxY = hh - ch / 2;
      const minY = ch / 2 - hh;
      y = Math.min(maxY, Math.max(minY, y));
    } else {
      y = 0;
    }

    return { scale: s, x, y };
  }, [imgNatural]);

  const resetTransform = useCallback(() => {
    if (!wrapRef.current) return;
    const cw = wrapRef.current.offsetWidth;
    const ch = wrapRef.current.offsetHeight;
    const nw = imgNatural.w;
    const nh = imgNatural.h;
    const s = Math.min(cw / nw, ch / nh, 1);
    fitScaleRef.current = s;
    xfRef.current = { x: 0, y: 0, scale: s };
    requestAnimationFrame(applyTransform);
  }, [applyTransform, imgNatural]);

  const onWheel = useCallback((e) => {
    e.preventDefault();

    // Support trackpad panning (non-zero deltaX = horizontal swipe, tiny deltaY = smooth scroll)
    if (!e.ctrlKey && (e.deltaX !== 0 || e.deltaMode === 0 && Math.abs(e.deltaY) < 5)) {
      const { x, y, scale } = xfRef.current;
      xfRef.current = clamp({ x: x - e.deltaX, y: y - e.deltaY, scale });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyTransform);
      return;
    }

    const { x, y, scale } = xfRef.current;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newScale = Math.min(MAX_SCALE, Math.max(fitScaleRef.current * MIN_FIT_FRACTION, scale * factor));
    if (newScale === scale) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width / 2;
    const cy = e.clientY - rect.top - rect.height / 2;
    const imageX = (cx - x) / scale;
    const imageY = (cy - y) / scale;
    const newX = cx - imageX * newScale;
    const newY = cy - imageY * newScale;
    xfRef.current = clamp({ x: newX, y: newY, scale: newScale });
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(applyTransform);
  }, [applyTransform, clamp]);

  const stopPan = useCallback((e) => {
    if (!panning.current) return;
    panning.current = false;
    if (wrapRef.current) wrapRef.current.style.cursor = 'grab';
    if (pointerMoveHandler.current) {document.removeEventListener('mousemove', pointerMoveHandler.current);document.removeEventListener('pointermove', pointerMoveHandler.current);pointerMoveHandler.current = null;}
    if (pointerUpHandler.current) {document.removeEventListener('mouseup', pointerUpHandler.current);document.removeEventListener('pointerup', pointerUpHandler.current);document.removeEventListener('pointercancel', pointerUpHandler.current);pointerUpHandler.current = null;}

    if (performance.now() - lastMoveTime.current > 50) {
      velocityRef.current = { x: 0, y: 0 };
    }

    // Place marker on clean click (no drag)
    if (!pointerStart.current.moved && mode === 'addMarker' && pendingConfigId) {
      const rect = imgRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
        setAddingMarker({ x: nx, y: ny, configId: pendingConfigId });
        addMarkerToConfig(pendingConfigId, nx, ny);
      }
      velocityRef.current = { x: 0, y: 0 };
      return;
    }

    // Launch inertia scroll if the pointer was moving fast enough
    if (pointerStart.current.moved) {
      const startInertia = () => {
        const v = velocityRef.current;
        if (Math.abs(v.x) < 0.3 && Math.abs(v.y) < 0.3) {
          inertiaRaf.current = null;
          return;
        }
        velocityRef.current = { x: v.x * 0.88, y: v.y * 0.88 };
        xfRef.current = clamp({ ...xfRef.current, x: xfRef.current.x + v.x, y: xfRef.current.y + v.y });
        applyTransform();
        inertiaRaf.current = requestAnimationFrame(startInertia);
      };
      inertiaRaf.current = requestAnimationFrame(startInertia);
    }
  }, [mode, pendingConfigId, applyTransform, clamp]);

  const onPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (contextMenuRef.current) {setContextMenu(null);return;}
    if (e.target.closest('[data-marker-id]') || e.target.closest('[data-float-panel]')) return;
    if (panning.current) return;
    e.preventDefault();
    if (inertiaRaf.current) {cancelAnimationFrame(inertiaRaf.current);inertiaRaf.current = null;}
    velocityRef.current = { x: 0, y: 0 };
    panning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    lastMoveTime.current = performance.now();
    pointerStart.current = { x: e.clientX, y: e.clientY, moved: false };
    if (wrapRef.current) wrapRef.current.style.cursor = 'grabbing';

    const onMove = (ev) => {
      if (!panning.current) return;
      const dx = ev.clientX - lastPos.current.x;
      const dy = ev.clientY - lastPos.current.y;
      if (Math.abs(ev.clientX - pointerStart.current.x) > 3 || Math.abs(ev.clientY - pointerStart.current.y) > 3) {
        pointerStart.current.moved = true;
      }
      const now = performance.now();
      const dt = now - lastMoveTime.current;
      if (dt > 0 && dt < 64) {
        const alpha = 0.6;
        velocityRef.current = {
          x: velocityRef.current.x * (1 - alpha) + dx / dt * 16 * alpha,
          y: velocityRef.current.y * (1 - alpha) + dy / dt * 16 * alpha
        };
      }
      lastMoveTime.current = now;
      lastPos.current = { x: ev.clientX, y: ev.clientY };
      const { x, y, scale } = xfRef.current;
      xfRef.current = clamp({ x: x + dx, y: y + dy, scale });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(applyTransform);
    };
    const onUp = (ev) => stopPan(ev);

    pointerMoveHandler.current = onMove;
    pointerUpHandler.current = onUp;

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [applyTransform, clamp, stopPan]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const switchTab = useCallback((id) => {
    setActiveTab(id);
    setImageLoaded(false);
    setSelectedMarker(null);
    setMode('view');
    setPendingConfigId(null);
    xfRef.current = { x: 0, y: 0, scale: 1 };
    requestAnimationFrame(applyTransform);
  }, [applyTransform]);

  const onImgLoad = useCallback(() => {
    if (!imgRef.current) return;
    const nw = imgRef.current.naturalWidth || 800;
    const nh = imgRef.current.naturalHeight || 600;
    setImgNatural({ w: nw, h: nh });
    setImageLoaded(true);
    if (transformRef.current) {
      transformRef.current.style.width = nw + 'px';
      transformRef.current.style.height = nh + 'px';
    }
    if (wrapRef.current) {
      const cw = wrapRef.current.offsetWidth;
      const ch = wrapRef.current.offsetHeight;
      const s = Math.min(cw / nw, ch / nh, 1);

      fitScaleRef.current = s;
      xfRef.current = { x: 0, y: 0, scale: s };
    }
    requestAnimationFrame(applyTransform);
  }, [applyTransform]);

  const configsForCurrentMap = allConfigs[activeTab] || [];

  const updateConfigs = useCallback((newConfigs) => {
    setAllConfigs((prev) => {
      const updated = { ...prev, [activeTab]: newConfigs };
      saveMapConfigs(updated);
      return updated;
    });
  }, [activeTab]);

  const addConfig = useCallback((name, description) => {
    const newConfig = { id: genId(), name: name || t('maps.new_config').replace(/^./, s => s.toUpperCase()), description: description || '', enabled: true, markers: [], paths: [] };
    updateConfigs([...configsForCurrentMap, newConfig]);
  }, [configsForCurrentMap, updateConfigs]);

  const updateConfig = useCallback((configId, updates) => {
    updateConfigs(configsForCurrentMap.map((c) => c.id === configId ? { ...c, ...updates } : c));
  }, [configsForCurrentMap, updateConfigs]);


  const deleteConfig = useCallback((configId) => {
    updateConfigs(configsForCurrentMap.filter((c) => c.id !== configId));
  }, [configsForCurrentMap, updateConfigs]);

  const getNextLabelNum = useCallback((markers) => {
    let max = 0;
    for (const m of markers) {
      const match = m.label?.match(/^#(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
    return max + 1;
  }, []);

  const [autoPath, setAutoPath] = useState(false);
  const toggleAutoPath = useCallback(() => {
    autoPathRef.current = !autoPathRef.current;
    setAutoPath(autoPathRef.current);
  }, []);

  const addMarkerToConfig = useCallback((configId, x, y) => {
    setAllConfigs((prev) => {
      const configs = prev[activeTab] || [];
      const config = configs.find((c) => c.id === configId);
      if (!config) return prev;
      const num = getNextLabelNum(config.markers);
      const newMarker = { id: genId(), label: `#${num}`, x, y, color: COLORS[(num - 1) % COLORS.length], icon: 'MapPin', notes: '' };
      let paths = config.paths;
      if (autoPathRef.current && config.markers.length > 0) {
        const prev = config.markers[config.markers.length - 1];
        paths = [...paths, { id: genId(), fromMarkerId: prev.id, toMarkerId: newMarker.id, color: newMarker.color }];
      }
      const updated = configs.map((c) =>
      c.id === configId ? { ...c, markers: [...c.markers, newMarker], paths } : c
      );
      saveMapConfigs({ ...prev, [activeTab]: updated });
      return { ...prev, [activeTab]: updated };
    });
  }, [activeTab, getNextLabelNum]);

  const updateMarker = useCallback((configId, markerId, updates) => {
    updateConfigs(configsForCurrentMap.map((c) =>
    c.id === configId ? { ...c, markers: c.markers.map((m) => m.id === markerId ? { ...m, ...updates } : m) } : c
    ));
  }, [configsForCurrentMap, updateConfigs]);

  const deleteMarker = useCallback((configId, markerId) => {
    updateConfigs(configsForCurrentMap.map((c) =>
    c.id === configId ? {
      ...c,
      markers: c.markers.filter((m) => m.id !== markerId),
      paths: c.paths.filter((p) => p.fromMarkerId !== markerId && p.toMarkerId !== markerId)
    } : c
    ));
  }, [configsForCurrentMap, updateConfigs]);

  const togglePath = useCallback((configId, fromId, toId, color) => {
    const config = configsForCurrentMap.find((c) => c.id === configId);
    if (!config) return;
    const exists = config.paths.find((p) => p.fromMarkerId === fromId && p.toMarkerId === toId);
    if (exists) {
      updateConfigs(configsForCurrentMap.map((c) => c.id === configId ? { ...c, paths: c.paths.filter((p) => p.id !== exists.id) } : c));
    } else {
      updateConfigs(configsForCurrentMap.map((c) => c.id === configId ? { ...c, paths: [...c.paths, { id: genId(), fromMarkerId: fromId, toMarkerId: toId, color }] } : c));
    }
  }, [configsForCurrentMap, updateConfigs]);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    if (!activeTab || !configsForCurrentMap.length) return;
    const configId = pendingConfigId || configsForCurrentMap.find((c) => c.enabled)?.id || configsForCurrentMap[0].id;
    const rect = imgRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
      setContextMenu({ x: e.clientX, y: e.clientY, nx, ny, configId });
    }
  }, [configsForCurrentMap, activeTab, pendingConfigId]);

  const selectMarkerHandler = useCallback((configId, marker) => {
    const num = parseInt(marker.label?.replace('#', '') || '0', 10);
    setSelectedMarker({ configId, ...marker });
    setMarkerLabelEdit(marker.label);
    setMarkerNotesEdit(marker.notes || '');
    const rect = imgRef.current?.getBoundingClientRect?.();
    if (rect) {
      selectedMarkerPos.current = { x: marker.x * rect.width + rect.left, y: marker.y * rect.height + rect.top };
    }
  }, []);

  const closeMarkerPanel = useCallback(() => {
    setSelectedMarker(null);
    setMarkerLabelEdit('');
    setMarkerNotesEdit('');
  }, []);

  const zoomToMarker = useCallback((marker) => {
    if (!wrapRef.current) return;
    if (inertiaRaf.current) {cancelAnimationFrame(inertiaRaf.current);inertiaRaf.current = null;}
    const scale = xfRef.current.scale;
    const imgY = (marker.y - 0.5) * imgNatural.h * scale;
    xfRef.current = clamp({ x: -imgX, y: -imgY, scale });
    requestAnimationFrame(applyTransform);
  }, [applyTransform, clamp, imgNatural]);

  const mapTabs = MAPS.map((m, i) => ({ id: i.toString(), label: m.nameKey ? (t(m.nameKey) !== m.nameKey ? t(m.nameKey) : m.name) : m.name }));

  const importCustomMarkersFromGame = useCallback(() => {
    if (!inventoryData?.customMarkers?.length) return;
    const parsed = parseCustomMarkers(inventoryData.customMarkers);
    const mapKeys = ['poe', 'venus', 'deimos'];
    for (const [mapKey, markers] of Object.entries(parsed)) {
      if (!markers?.length) continue;
      const ti = mapKeys.indexOf(mapKey);
      if (ti === -1) continue;
      const tabId = ti.toString();
      setAllConfigs((prev) => {
        const current = prev[tabId] || [];
        let config = current.find((c) => c.name === t('maps.game_markers'));
        let next;
        if (!config) {
          config = { id: genId(), name: t('maps.game_markers'), description: t('maps.imported_markers_desc'), enabled: true, markers: [], paths: [] };
          next = [...current, config];
        } else {
          next = current;
        }
        const existing = new Set(config.markers.map((m) => `${m.label}_${Math.round(m.x * 100)}_${Math.round(m.y * 100)}`));
        const newOnes = markers.filter((m) => !existing.has(`${m.label}_${Math.round(m.x * 100)}_${Math.round(m.y * 100)}`));
        if (newOnes.length === 0) return prev;
        const updatedConfig = { ...config, markers: [...config.markers, ...newOnes] };
        const updated = { ...prev, [tabId]: next.map((c) => c.id === config.id ? updatedConfig : c) };
        saveMapConfigs(updated);
        return updated;
      });
    }
  }, [inventoryData]);
  const selectedMarkerConfig = selectedMarker ? configsForCurrentMap.find((c) => c.id === selectedMarker.configId) : null;
  const nextMarkerNum = selectedMarkerConfig ? getNextLabelNum(selectedMarkerConfig.markers) : 1;
  return (
    <PageLayout titleKey="screen.maps">
      <div className="absolute inset-0 flex flex-col">
        <div className="flex flex-1 min-h-0 gap-2 px-8 pb-8">
          <div className="flex-1 min-h-0 relative">
            <Card className="glass-panel rounded-lg overflow-hidden p-0 relative min-h-0 bg-black/40 h-full w-full">
              <div className="absolute top-4 left-4 z-10 max-w-[calc(100%-300px)] flex items-center gap-2">
                <Tabs tabs={mapTabs} activeTab={activeTab} onChange={switchTab} />
                {activeTab === '3' && duviriCycle &&
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur border border-white/5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-kronos-accent">{t(`ui.dashboard.duviri_state.${duviriCycle.state}`)}</span>
                    <span className="text-[11px] text-kronos-dim font-mono">{timeLeft}</span>
                  </div>
                }
              </div>

              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <ZoomBadge xfRef={xfRef} />
                <button onClick={() => setUseRawMap((v) => !v)}
                className={`p-2 rounded-lg transition-colors ${useRawMap ? 'bg-kronos-accent/20 text-kronos-accent border border-kronos-accent/30' : 'bg-kronos-bg/80 backdrop-blur text-kronos-dim hover:text-kronos-text border border-white/5'}`}
                title={useRawMap ? t('maps.switch_labeled') : t('maps.switch_raw')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                    <line x1="8" y1="2" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="22" />
                  </svg>
                </button>
                <button onClick={() => {setPanelOpen(!panelOpen);setMode('view');setPendingConfigId(null);}}
                className={`p-2 rounded-lg transition-colors ${panelOpen ? 'bg-kronos-accent text-kronos-bg' : 'bg-kronos-bg/80 backdrop-blur text-kronos-dim hover:text-kronos-text border border-white/5'}`}
                title={t('maps.configurations')}>
                  <Layers size={16} />
                </button>
              </div>

              {mode === 'addMarker' && pendingConfigId &&
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-kronos-accent px-4 py-2 rounded-lg text-sm text-kronos-bg font-bold shadow-lg flex items-center gap-2">
                  <Crosshair size={16} /> {t('maps.adding_markers', { name: configsForCurrentMap.find((c) => c.id === pendingConfigId)?.name || '...' })}
                  <button
                  onClick={toggleAutoPath}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-colors ${autoPath ? 'bg-white/20 text-white' : 'bg-black/20 text-kronos-bg/70 hover:bg-black/30'}`}
                  title={t('maps.auto_connect')}>
                    <Link2 size={12} />{t('maps.auto_path')}
                </button>
                  <button onClick={() => {setMode('view');setPendingConfigId(null);}} className="ml-1 p-0.5 hover:bg-white/20 rounded"><X size={16} /></button>
                </div>
              }

              <button onClick={resetTransform}
              className="absolute bottom-4 right-4 z-10 bg-kronos-bg/80 backdrop-blur px-3 py-1.5 rounded-md text-sm text-kronos-dim font-bold shadow-lg border border-white/5 hover:text-kronos-text transition-colors">{t('maps.reset_view')}

              </button>

              {selectedMarker &&
              <div data-float-panel="true"
              className="absolute top-16 right-4 z-20 bg-kronos-panel border border-white/10 rounded-xl p-4 shadow-2xl w-72"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-kronos-text uppercase tracking-wider">{t('maps.marker_editor')}</span>
                    <button onClick={closeMarkerPanel} className="p-1 rounded-lg hover:bg-white/5 text-kronos-dim hover:text-kronos-text transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('maps.label')}</label>
                      <input
                      value={markerLabelEdit}
                      onChange={(e) => {
                        setMarkerLabelEdit(e.target.value);
                        updateMarker(selectedMarker.configId, selectedMarker.id, { label: e.target.value });
                      }}
                      className="w-full bg-kronos-panel border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-kronos-text placeholder-kronos-dim outline-none focus:border-kronos-accent/50" />
                    
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('maps.color_icon')}</label>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        {COLORS.map((c) =>
                      <button key={c}
                      onClick={() => updateMarker(selectedMarker.configId, selectedMarker.id, { color: c })}
                      className={`w-6 h-6 rounded-full transition-all ${selectedMarker.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-kronos-bg scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }} />

                      )}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {Object.keys(ICONS).map((iconName) => {
                        const IconComp = ICONS[iconName];
                        return (
                          <button key={iconName}
                          onClick={() => updateMarker(selectedMarker.configId, selectedMarker.id, { icon: iconName })}
                          className={`p-1.5 rounded transition-colors ${selectedMarker.icon === iconName || !selectedMarker.icon && iconName === 'MapPin' ? 'bg-kronos-accent text-kronos-bg' : 'text-kronos-dim hover:text-kronos-text hover:bg-white/10'}`}>
                            
                              <IconComp size={16} />
                            </button>);

                      })}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <label className="text-[11px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('maps.connections')}</label>
                      <div className="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {configsForCurrentMap.find((c) => c.id === selectedMarker.configId)?.markers.
                      filter((m) => m.id !== selectedMarker.id).
                      map((otherMarker) => {
                        const hasPath = configsForCurrentMap.find((c) => c.id === selectedMarker.configId)?.paths.some((p) => p.fromMarkerId === selectedMarker.id && p.toMarkerId === otherMarker.id);
                        return (
                          <button key={otherMarker.id}
                          onClick={() => togglePath(selectedMarker.configId, selectedMarker.id, otherMarker.id, selectedMarker.color)}
                          className="flex items-center justify-between px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs text-kronos-text">
                            
                                <span className="font-bold flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: otherMarker.color }}></div>
                                  {otherMarker.label}
                                </span>
                                {hasPath && <Check size={14} className="text-kronos-accent" />}
                              </button>);

                      })
                      }
                        {configsForCurrentMap.find((c) => c.id === selectedMarker.configId)?.markers.length <= 1 &&
                      <div className="text-xs text-kronos-dim py-1 px-1">{t('maps.no_connections')}</div>
                      }
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('nav.notes')}</label>
                      <textarea
                      value={markerNotesEdit}
                      onChange={(e) => {
                        setMarkerNotesEdit(e.target.value);
                        updateMarker(selectedMarker.configId, selectedMarker.id, { notes: e.target.value });
                      }}
                      rows={3}
                      className="w-full bg-kronos-panel border border-white/10 rounded-lg px-3 py-2 text-xs text-kronos-text placeholder-kronos-dim outline-none focus:border-kronos-accent/50 resize-none mt-1"
                      placeholder={t('maps.marker_notes')} />
                    
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      <button
                      onClick={() => zoomToMarker(selectedMarker)}
                      className="p-2 rounded-lg hover:bg-white/5 text-kronos-dim hover:text-kronos-accent transition-colors flex-shrink-0"
                      title={t('maps.zoom_to_marker')}>
                        <Navigation size={14} />
                      </button>
                      <Button variant="ghost" className="flex-1 text-xs"
                    onClick={() => {
                      deleteMarker(selectedMarker.configId, selectedMarker.id);
                      closeMarkerPanel();
                    }}>
                        <Trash size={12} className="mr-1" />{t('notes.delete')}
                    </Button>
                      <Button variant="primary" className="flex-1 text-xs"
                    onClick={closeMarkerPanel}>{t('maps.done')}

                    </Button>
                    </div>
                  </div>
                </div>
              }

              <div ref={wrapRef} className="w-full h-full overflow-hidden"
              style={{ cursor: mode === 'addMarker' && pendingConfigId ? 'crosshair' : 'grab', position: 'relative', userSelect: 'none', touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onMouseDown={onPointerDown}
              onContextMenu={onContextMenu}>
                
                <div ref={transformRef} style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%) scale(1)',
                  willChange: 'transform',
                  transformOrigin: 'center center'
                }}>
                  <img
                    ref={imgRef}
                    src={mapsPath ? convertFileSrc(`${mapsPath}/${mapFilename}`) : placeholderSvg(t('maps.image_unavailable'))}
                    alt={MAPS[parseInt(activeTab)].nameKey ? (t(MAPS[parseInt(activeTab)].nameKey) !== MAPS[parseInt(activeTab)].nameKey ? t(MAPS[parseInt(activeTab)].nameKey) : MAPS[parseInt(activeTab)].name) : MAPS[parseInt(activeTab)].name}
                    onLoad={onImgLoad}
                    onError={(e) => {e.currentTarget.onerror = null;e.currentTarget.src = placeholderSvg(t('maps.image_unavailable'));}}
                    style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none', maxWidth: 'none', maxHeight: 'none' }}
                    draggable={false} />
                  
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
                      {imageLoaded && configsForCurrentMap.filter((c) => c.enabled).map((config) =>
                      config.paths.map((path) => {
                        const fromM = config.markers.find((m) => m.id === path.fromMarkerId);
                        const toM = config.markers.find((m) => m.id === path.toMarkerId);
                        if (!fromM || !toM) return null;
                        const from = { x: fromM.x * 100, y: fromM.y * 100 };
                        const to = { x: toM.x * 100, y: toM.y * 100 };
                        return (
                          <g key={path.id}>
                              <path className="map-path" d={`M ${from.x},${from.y} L ${to.x},${to.y}`} fill="none" stroke={path.color} strokeWidth={0.35 / xfRef.current.scale} opacity="0.75" strokeLinecap="round" />
                            </g>);

                      })
                      )}
                    </svg>
                    {imageLoaded && configsForCurrentMap.filter((c) => c.enabled).map((config) =>
                    config.markers.map((marker) => {
                      const isSelected = selectedMarker?.id === marker.id && selectedMarker?.configId === config.id;
                      const IconComp = ICONS[marker.icon] || MapPin;
                      return (
                        <div key={marker.id}
                        className="map-marker-container"
                        data-marker-id={marker.id}
                        style={{
                          position: 'absolute', left: `${marker.x * 100}%`, top: `${marker.y * 100}%`,
                          transform: `translate(-50%, -50%) scale(${1 / xfRef.current.scale})`,
                          pointerEvents: mode === 'addMarker' && pendingConfigId ? 'none' : 'auto',
                          cursor: 'pointer',
                          zIndex: 10
                        }}
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.stopPropagation();
                          const el = e.currentTarget;
                          el.setPointerCapture(e.pointerId);
                          const startX = e.clientX,startY = e.clientY;
                          const startPctX = parseFloat(el.style.left);
                          const startPctY = parseFloat(el.style.top);
                          let didMove = false;
                          const rect = imgRef.current?.getBoundingClientRect();
                          const imgW = rect?.width || 1;
                          const imgH = rect?.height || 1;

                          const onMove = (ev) => {
                            const dx = (ev.clientX - startX) / imgW * 100;
                            const dy = (ev.clientY - startY) / imgH * 100;
                            if (Math.abs(ev.clientX - startX) > 2 || Math.abs(ev.clientY - startY) > 2) didMove = true;
                            el.style.left = `${Math.max(0, Math.min(100, startPctX + dx))}%`;
                            el.style.top = `${Math.max(0, Math.min(100, startPctY + dy))}%`;
                          };
                          const onUp = () => {
                            el.releasePointerCapture(e.pointerId);
                            el.removeEventListener('pointermove', onMove);
                            el.removeEventListener('pointerup', onUp);
                            if (!didMove) {
                              selectMarkerHandler(config.id, marker);
                            } else {
                              const nx = parseFloat(el.style.left) / 100;
                              const ny = parseFloat(el.style.top) / 100;
                              updateMarker(config.id, marker.id, { x: nx, y: ny });
                            }
                          };
                          el.addEventListener('pointermove', onMove);
                          el.addEventListener('pointerup', onUp);
                        }}>
                          
                            <div className={`relative ${isSelected ? 'scale-125' : 'group-hover:scale-110'} transition-transform`}>
                              <IconComp size={24} color={marker.color} fill={marker.color} fillOpacity="0.25" strokeWidth="2" />
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-0.5 whitespace-nowrap">
                              <span className="text-xs font-bold uppercase tracking-wider bg-kronos-bg/80 backdrop-blur px-1.5 py-0.5 rounded border border-white/10 text-kronos-text cursor-grab active:cursor-grabbing select-none">
                                {marker.label}
                              </span>
                            </div>
                            {marker.notes &&
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
                                <div className="bg-kronos-bg/95 backdrop-blur border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-kronos-text max-w-[200px] whitespace-normal shadow-xl">
                                  {marker.notes}
                                </div>
                              </div>
                          }
                          </div>);

                    })
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {panelOpen &&
          <div className="w-80 flex-shrink-0 glass-panel rounded-lg p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-kronos-accent">{t('maps.configurations')}</h3>
                <div className="flex items-center gap-1">
                  {inventoryData?.customMarkers?.length &&
                <button onClick={importCustomMarkersFromGame}
                className="p-1.5 rounded-lg bg-kronos-accent/20 text-kronos-accent hover:bg-kronos-accent/40 transition-colors"
                title={t('maps.import_markers')}>
                      <MapPin size={14} />
                    </button>
                }
                  <button onClick={() => invoke('open_map_configs_folder')}
                className="p-1.5 rounded-lg bg-kronos-accent/20 text-kronos-accent hover:bg-kronos-accent/40 transition-colors"
                title={t('maps.open_configs')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  <button onClick={() => setConfigToEdit({ name: `Config ${configsForCurrentMap.length + 1}`, description: '' })}
                className="p-1.5 rounded-lg bg-kronos-accent/20 text-kronos-accent hover:bg-kronos-accent/40 transition-colors"
                title={t('maps.add_config')}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {configsForCurrentMap.length === 0 &&
            <p className="text-sm text-kronos-dim text-center py-6">{t('maps.no_configs')}</p>
            }

              <div className="flex flex-col gap-2">
                {configsForCurrentMap.map((config) => {
                const isAdding = pendingConfigId === config.id;
                return (
                  <div key={config.id}
                  className={`rounded-lg border ${isAdding ? 'border-kronos-accent bg-kronos-accent/5' : 'border-white/5 bg-white/[0.02]'} p-3`}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateConfig(config.id, { enabled: !config.enabled })}
                      className={`p-1 rounded transition-colors flex-shrink-0 ${config.enabled ? 'text-kronos-accent' : 'text-kronos-dim hover:text-kronos-text'}`}
                      title={config.enabled ? t('maps.visible') : t('maps.hidden')}>
                          {config.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <input
                          value={config.name}
                          onChange={(e) => updateConfig(config.id, { name: e.target.value })}
                          className="w-full bg-transparent text-sm font-bold text-kronos-text outline-none truncate placeholder-kronos-dim"
                          placeholder={t('maps.config_name')} />
                        
                          <input
                          value={config.description || ''}
                          onChange={(e) => updateConfig(config.id, { description: e.target.value })}
                          className="w-full bg-transparent text-xs text-kronos-dim outline-none truncate mt-0.5 placeholder-kronos-dim"
                          placeholder={t('maps.config_desc')} />
                        
                          <div className="text-[11px] text-kronos-dim mt-0.5 font-medium">
                            {config.markers.length} {config.markers.length === 1 ? t('maps.marker') : t('maps.marker_plural')}
                            {config.paths.length > 0 && ` · ${config.paths.length} ${config.paths.length === 1 ? t('maps.path') : t('maps.path_plural')}`}
                          </div>
                        </div>
                        <button onClick={() => setDeleteConfirm({ type: 'config', id: config.id, name: config.name })}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-kronos-dim hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                        <button
                        onClick={() => {
                          if (isAdding) {setMode('view');setPendingConfigId(null);} else
                          {setMode('addMarker');setPendingConfigId(config.id);setSelectedMarker(null);closeMarkerPanel();}
                        }}
                        className={`flex-1 text-xs py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${isAdding ? 'bg-kronos-accent text-kronos-bg font-black' : 'hover:bg-white/5 text-kronos-dim hover:text-kronos-text'}`}>
                          <MapPin size={12} /> {isAdding ? t('maps.adding') : t('maps.marker_btn')}
                        </button>
                      </div>
                    </div>);

              })}
              </div>
            </div>
          }
        </div>
      </div>

      {configToEdit &&
      <Modal isOpen={true} onClose={() => setConfigToEdit(null)} title={t('maps.new_config')} maxWidth="max-w-sm">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-black text-kronos-accent uppercase tracking-widest px-1">{t('ui.inventory.sort_name')}</label>
              <Input value={configToEdit.name}
            onChange={(e) => setConfigToEdit((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('maps.config_name_field')}
            onKeyDown={(e) => {if (e.key === 'Enter') {addConfig(configToEdit.name, configToEdit.description);setConfigToEdit(null);}}} />
            
            </div>
            <div>
              <label className="text-xs font-black text-kronos-accent uppercase tracking-widest px-1">{t('maps.description')}</label>
              <Input value={configToEdit.description}
            onChange={(e) => setConfigToEdit((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t('maps.optional_description')} />
            
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setConfigToEdit(null)}>{t('notes.cancel')}</Button>
              <Button variant="primary" className="flex-1 text-xs"
            onClick={() => {addConfig(configToEdit.name, configToEdit.description);setConfigToEdit(null);}}>{t('maps.create')}

            </Button>
            </div>
          </div>
        </Modal>
      }

      {deleteConfirm &&
      <Modal isOpen={true} onClose={() => setDeleteConfirm(null)} title={t('maps.confirm_delete')} maxWidth="max-w-sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-kronos-dim">{t('notes.delete')}
            <span className="text-kronos-text font-bold">{deleteConfirm.name}</span>?
              {deleteConfirm.type === 'config' && t('maps.delete_config_warning')}
            </p>
            <div className="flex gap-2 pt-2 border-t border-white/5">
              <Button variant="ghost" className="flex-1 text-xs" onClick={() => setDeleteConfirm(null)}>{t('notes.cancel')}</Button>
              <Button variant="primary" className="flex-1 text-xs bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-red-500/50"
            onClick={() => {
              const deletedId = deleteConfirm.id;
              if (deleteConfirm.type === 'config') deleteConfig(deletedId);
              setDeleteConfirm(null);
              if (pendingConfigId === deletedId) {
                setMode('view');
                setPendingConfigId(null);
              }
              if (selectedMarker) {
                const deletedConfig = configsForCurrentMap.find((c) => c.id === deletedId);
                if (deletedConfig?.markers.some((m) => m.id === selectedMarker.id)) {
                  closeMarkerPanel();
                }
              }
            }}>
                <Trash size={12} className="mr-1" />{t('notes.delete')}
            </Button>
            </div>
          </div>
        </Modal>
      }

      {contextMenu &&
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        onClick={() => setContextMenu(null)}
        onPointerDown={() => setContextMenu(null)}
        onContextMenu={(e) => {e.preventDefault();setContextMenu(null);}}>
        
          <div
          className="absolute bg-kronos-panel border border-white/10 rounded-lg shadow-2xl py-1 w-48 pointer-events-auto"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 192),
            top: Math.min(contextMenu.y, window.innerHeight - 80)
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}>
          
            <button
            className="w-full text-left px-3 py-2 text-sm text-kronos-text hover:bg-white/10 transition-colors flex items-center gap-2 font-bold"
            onClick={() => {
              addMarkerToConfig(contextMenu.configId, contextMenu.nx, contextMenu.ny);
              setContextMenu(null);
            }}>
            
              <MapPin size={14} className="text-kronos-accent" />{t('maps.add_marker_here')}

          </button>
            <div className="px-3 py-1 text-[10px] text-kronos-dim uppercase tracking-wider border-t border-white/5 mt-1 pt-2">{t('maps.to')}
            {configsForCurrentMap.find((c) => c.id === contextMenu.configId)?.name || t('maps.config')}
            </div>
          </div>
        </div>
      }
    </PageLayout>);

}

function ZoomBadge({ xfRef }) {
  const [label, setLabel] = useState('100%');
  useEffect(() => {
    const id = setInterval(() => setLabel(`${Math.round(xfRef.current.scale * 100)}%`), 120);
    return () => clearInterval(id);
  }, [xfRef]);
  return (
    <div className="bg-kronos-bg/80 backdrop-blur px-3 py-1.5 rounded-md text-sm text-kronos-text font-mono font-bold shadow-lg border border-white/5 pointer-events-none">
      {label}
    </div>);

}