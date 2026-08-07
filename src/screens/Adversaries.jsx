import { useMemo, useState, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { PageLayout, Card } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { resolveItemName } from '../lib/warframeUtils';

// ── Progenitor element → warframes (base only, no primes) ──
const PROGENITOR = {
  Impact: ['Ash', 'Atlas', 'Banshee', 'Baruuk', 'Excalibur', 'Hydroid', 'Inaros', 'Khora', 'Nekros', 'Rhino', 'Styanax', 'Wukong', 'Zephyr'],
  Puncture: ['Ivara', 'Mag', 'Trinity'],
  Slash: ['Dagath', 'Garuda', 'Kullervo', 'Mesa', 'Valkyr', 'Voruna'],
  Heat: ['Ember', 'Jade', 'Nezha', 'Protea'],
  Cold: ['Chroma', 'Frost', 'Qorvex', 'Sevagoth', 'Yareli'],
  Toxin: ['Dante', 'Grendel', 'Lavos', 'Nidus', 'Saryn'],
  Electricity: ['Caliban', 'Gauss', 'Gyre', 'Volt'],
  Magnetic: ['Harrow', 'Limbo'],
  Radiation: ['Equinox', 'Gara', 'Hildryn', 'Loki', 'Mirage', 'Nova', 'Nyx', 'Oberon', 'Octavia', 'Revenant', 'Vauban', 'Wisp', 'Xaku']
};

const ELEMENT_ORDER = Object.keys(PROGENITOR);
const WF_PROGENITOR = {};
for (const [el, frames] of Object.entries(PROGENITOR)) {
  for (const f of frames) WF_PROGENITOR[f] = el;
}

// Map for resolving progenitor faction (Warframe) names through the DE dict.
// Keys: /Lotus/Language/Suits/{xxx}Name — sourced from ExportWarframes.json
const PROGENITOR_DICT_KEYS = {
  Ash: '/Lotus/Language/Suits/AshName',
  Atlas: '/Lotus/Language/Suits/AtlasName',
  Banshee: '/Lotus/Language/Suits/BansheeName',
  Baruuk: '/Lotus/Language/Suits/BaruukName',
  Excalibur: '/Lotus/Language/Suits/ExcaliburName',
  Hydroid: '/Lotus/Language/Suits/HydroidName',
  Inaros: '/Lotus/Language/Suits/InarosName',
  Khora: '/Lotus/Language/Suits/KhoraName',
  Nekros: '/Lotus/Language/Suits/NekrosName',
  Rhino: '/Lotus/Language/Suits/RhinoName',
  Styanax: '/Lotus/Language/Suits/StyanaxName',
  Wukong: '/Lotus/Language/Suits/WukongName',
  Zephyr: '/Lotus/Language/Suits/ZephyrName',
  Ivara: '/Lotus/Language/Suits/IvaraName',
  Mag: '/Lotus/Language/Suits/MagName',
  Trinity: '/Lotus/Language/Suits/TrinityName',
  Dagath: '/Lotus/Language/Suits/DagathSuitName',
  Garuda: '/Lotus/Language/Suits/GarudaName',
  Kullervo: '/Lotus/Language/Suits/PaxDuviricusFrameName',
  Mesa: '/Lotus/Language/Suits/MesaName',
  Valkyr: '/Lotus/Language/Suits/ValkyrName',
  Voruna: '/Lotus/Language/Suits/WerewolfName',
  Ember: '/Lotus/Language/Suits/EmberName',
  Jade: '/Lotus/Language/Suits/JadeName',
  Nezha: '/Lotus/Language/Suits/NezhaName',
  Protea: '/Lotus/Language/Suits/ProteanName',
  Chroma: '/Lotus/Language/Suits/ChromaName',
  Frost: '/Lotus/Language/Suits/FrostName',
  Qorvex: '/Lotus/Language/Suits/QorvexName',
  Sevagoth: '/Lotus/Language/Suits/SevagothName',
  Yareli: '/Lotus/Language/Suits/YareliName',
  Dante: '/Lotus/Language/Suits/PagemasterName',
  Grendel: '/Lotus/Language/Suits/DevourerName',
  Lavos: '/Lotus/Language/Suits/LavosName',
  Nidus: '/Lotus/Language/Suits/InfestationName',
  Saryn: '/Lotus/Language/Suits/SarynName',
  Caliban: '/Lotus/Language/Locations/Caliban',
  Gauss: '/Lotus/Language/Suits/RunnerName',
  Gyre: '/Lotus/Language/Suits/GyreFrameName',
  Harrow: '/Lotus/Language/Suits/PriestName',
  Limbo: '/Lotus/Language/Suits/LimboName',
  Equinox: '/Lotus/Language/Suits/EquinoxName',
  Gara: '/Lotus/Language/Suits/GlassName',
  Hildryn: '/Lotus/Language/Suits/IronFrameName',
  Loki: '/Lotus/Language/Suits/LokiName',
  Mirage: '/Lotus/Language/Suits/MirageName',
  Nova: '/Lotus/Language/Suits/NovaName',
  Nyx: '/Lotus/Language/Suits/NyxName',
  Oberon: '/Lotus/Language/Suits/OberonName',
  Octavia: '/Lotus/Language/Suits/BardName',
  Revenant: '/Lotus/Language/Suits/RevenantName',
  Vauban: '/Lotus/Language/Suits/VaubanName',
  Wisp: '/Lotus/Language/Suits/WispName',
  Xaku: '/Lotus/Language/Suits/XakuName',
};


// ── Element colors (from ModCard DT_COLORS) ──
const ELEMENT_COLORS = {
  Impact: '#CCCCCC',
  Puncture: '#AA8855',
  Slash: '#CC4444',
  Heat: '#FF4444',
  Cold: '#88CCFF',
  Toxin: '#44FF44',
  Electricity: '#4488FF',
  Magnetic: '#8844FF',
  Radiation: '#FFDD44'
};

function iconSrc(iconsPath, name) {
  return iconsPath ? convertFileSrc(`${iconsPath}/${name}Symbol.png`) : null;
}

function stripPrime(name) {
  return name.replace(/Prime$/, '');
}

export default function Adversaries() {
  const { t } = useUi()
  const { inventoryData, dict, uniqueNameToName } = useMonitoring();
  const [iconsPath, setIconsPath] = useState('');
  useEffect(() => {invoke('get_icons_path').then(setIconsPath).catch(() => {});}, []);
  const [showKilled, setShowKilled] = useState(false);
  const nemeses = useMemo(() => {
    if (!inventoryData?.NemesisHistory) return [];
    return inventoryData.NemesisHistory.map((n) => {
      const wfName = n.KillingSuit ? resolveItemName(n.KillingSuit, dict, uniqueNameToName) || n.KillingSuit.split('/').pop() : '?';
      const baseName = stripPrime(wfName.replace(/ Prime$/, ''));
      return { ...n, wfName, element: WF_PROGENITOR[baseName] || null };
    });
  }, [inventoryData, dict, uniqueNameToName]);

  const displayed = useMemo(() => {
    return showKilled ? nemeses : nemeses.filter((n) => !n.k);
  }, [nemeses, showKilled]);

  return (
    <PageLayout titleKey="screen.adversaries">
      <div className="space-y-6">
        {/* ── Progenitor Reference Table ── */}
        <Card glow className="p-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">{t('adversaries.progenitor_elements')}</h2>
          <div className="-mx-4 px-4">
            <div className="flex gap-6 flex-wrap">
              {ELEMENT_ORDER.map((el) =>
              <div key={el} className="flex flex-col gap-1 min-w-[90px]">
                  <div className="flex flex-col items-center gap-1 pb-1.5 border-b border-white/10 mb-1">
                    <img src={iconSrc(iconsPath, el)} className="w-5 h-5 object-contain" alt={el} />
                    <span style={{ color: ELEMENT_COLORS[el] }} className="text-[10px] font-bold uppercase tracking-wider leading-tight">{t(`ui.elements.${el.toLowerCase()}`)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    {PROGENITOR[el].map((f) =>
                  <span key={f} className="text-[11px] text-white/70 leading-tight">{PROGENITOR_DICT_KEYS[f] ? (dict[PROGENITOR_DICT_KEYS[f]] || f) : f}</span>
                  )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
        <Card glow className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">{t('adversaries.nemesis_history')}</h2>
            <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showKilled}
                onChange={(e) => setShowKilled(e.target.checked)}
                className="accent-kronos-accent" />{t('adversaries.show_vanquished')}


            </label>
          </div>

          {displayed.length === 0 ?
          <p className="text-xs text-white/40 italic">{t('adversaries.no_nemeses')}</p> :

          <div className="space-y-1 max-h-[500px] overflow-y-auto custom-scrollbar">
              {displayed.map((n, i) => {
              const d = n.d?.$date?.$numberLong ? new Date(Number(n.d.$date.$numberLong)) : null;
              return (
                <div key={n.fp || i} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-white/5 text-xs">
                    {iconsPath && n.element &&
                  <img
                    src={iconSrc(iconsPath, n.element)}
                    className="w-4 h-4 object-contain flex-shrink-0"
                    alt=""
                    onError={(e) => {e.target.style.display = 'none';}} />

                  }
                    <span className="text-white/80 min-w-[100px]">{n.wfName}</span>
                    <span className="text-white/40 min-w-[60px]">
                      {n.element ? <span style={{ color: ELEMENT_COLORS[n.element] }}>{t(`ui.elements.${n.element.toLowerCase()}`)}</span> : '—'}
                    </span>
                    <span className="text-white/40 min-w-[30px]">{t('adversaries.rank', { rank: n.Rank ?? '?' })}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  n.k ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}
                  >
                      {n.k ? t('adversaries.vanquished') : n.Traded ? t('adversaries.traded') : t('adversaries.converted')}
                    </span>
                    {d && <span className="text-white/30 ml-auto">{d.toLocaleDateString()}</span>}
                  </div>);

            })}
            </div>
          }
        </Card>
      </div>
    </PageLayout>);

}