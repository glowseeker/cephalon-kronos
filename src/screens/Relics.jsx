/**
 * Relics.jsx
 *
 * Displays owned Void Relics and their reward pools.
 *
 * DATA FLOW
 * ─────────────────────────────────────────
 * 1. MonitoringContext provides the parsed inventory (including relics).
 * 2. This file groups and filters the relics by Era (Lith, Meso, Neo, Axi, Requiem)
 *    and refinement quality.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Search by relic name or reward name (e.g., "Glaive prime").
 * - Filter by Era and refinement status.
 * - Displays all four refinement tiers for each relic in a single card.
 */
import { useState, useMemo, useEffect } from 'react';
import { useUi } from '../contexts/UiContext'
import { Search, AlertCircle, Users, Zap, TrendingUp, Coins, ArrowUpDown } from 'lucide-react';
import { PageLayout, Input, Card, Tabs, MonitorState, Select } from '../components/UI';
import { useMonitoring } from '../contexts/MonitoringContext';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getRelicEV } from '../lib/relicParser';

const ERA_ORDER = ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem'];
const QUALITY_ORDER = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];
const REFINEMENTS = ['Intact', 'Exceptional', 'Flawless', 'Radiant'];
const REFINEMENT_LABELS = {
  Intact: 'relics.refinement_intact',
  Exceptional: 'relics.refinement_exceptional',
  Flawless: 'relics.refinement_flawless',
  Radiant: 'relics.refinement_radiant'
};

export default function Relics() {
  const { t } = useUi()
  const { inventoryData, isInventoryLoading, allPrices, isPriceLoading, priceFetchProgress } = useMonitoring();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEra, setActiveEra] = useState('All');
  const [activeQuality, setActiveQuality] = useState('All');
  const [squadSize, setSquadSize] = useState(1);
  const [sortMode, setSortMode] = useState('name'); // 'name' | 'ducat' | 'plat'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [evRefinementOverride, setEvRefinementOverride] = useState('Intact'); // quality
  const [uiPath, setUiPath] = useState('');
  const [iconsPath, setIconsPath] = useState('');

  useEffect(() => {invoke('get_ui_path').then((p) => setUiPath(p)).catch(() => {});}, []);
  useEffect(() => {invoke('get_icons_path').then((p) => setIconsPath(p)).catch(() => {});}, []);

  const relics = inventoryData?.relics ?? [];

  const baseFiltered = relics.filter((r) => {
    const matchEra = activeEra === 'All' || r.era === activeEra;
    if (!matchEra) return false;

    const matchQuality = activeQuality === 'All' || r.refinements && r.refinements[activeQuality] > 0;
    if (!matchQuality) return false;

    const search = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    if (search.length === 0) return true;

    const matchName = search.every((word) => r.name.toLowerCase().includes(word));
    const matchRewards = r.rewards?.some((rw) =>
    search.every((word) => rw.name.toLowerCase().includes(word))
    );

    return matchName || matchRewards;
  });

  const grouped = useMemo(() => {
    // 1. Prepare data with EV for sorting
    const enriched = baseFiltered.map((relic) => {
      const sortedRewards = [...(relic.rewards || [])].sort((a, b) => a.tier - b.tier).map((r) => ({
        ...r,
        plat: allPrices[r.uniqueName] ?? 0
      }));

      const evRefinement = evRefinementOverride;

      const evPlat = getRelicEV(sortedRewards, evRefinement, squadSize, 'plat');
      const evDucats = getRelicEV(sortedRewards, evRefinement, squadSize, 'ducats');

      // Refinement Gain (Radiant - Intact)
      const evPlatIntact = getRelicEV(sortedRewards, 'Intact', squadSize, 'plat');
      const evPlatRadiant = getRelicEV(sortedRewards, 'Radiant', squadSize, 'plat');
      const evDucatsIntact = getRelicEV(sortedRewards, 'Intact', squadSize, 'ducats');
      const evDucatsRadiant = getRelicEV(sortedRewards, 'Radiant', squadSize, 'ducats');

      const platGain = evPlatRadiant - evPlatIntact;
      const ducatGain = evDucatsRadiant - evDucatsIntact;
      const relicPlat = allPrices[relic.unique_name] ?? 0;

      return { ...relic, evPlat, evDucats, platGain, ducatGain, relicPlat, sortedRewards, evRefinement };
    });

    // 2. Sort
    enriched.sort((a, b) => {
      let res = 0;
      if (sortMode === 'ducat') res = b.evDucats - a.evDucats;else
      if (sortMode === 'plat') res = b.evPlat - a.evPlat;else
      if (sortMode === 'ducat_gain') res = b.ducatGain - a.ducatGain;else
      if (sortMode === 'plat_gain') res = b.platGain - a.platGain;else
      res = a.name.localeCompare(b.name);

      return sortOrder === 'desc' ? res : -res;
    });

    // 3. Group
    if (sortMode === 'name') {
      return enriched.reduce((acc, relic) => {
        const era = relic.era || 'Other';
        if (!acc[era]) acc[era] = [];
        acc[era].push(relic);
        return acc;
      }, {});
    } else {
      const SORT_LABELS = {
        ducat: t('relics.expected_ducat'),
        plat: t('relics.expected_platinum'),
        ducat_gain: t('relics.sort_ducat_gain'),
        plat_gain: t('relics.sort_plat_gain')
      };
      const sortLabel = SORT_LABELS[sortMode] || t('relics.sort_name');
      const orderLabel = sortOrder === 'desc' ? t('relics.sort_desc') : t('relics.sort_asc');
      return { [`${t('relics.sorting_by', { label: sortLabel, order: orderLabel })}`]: enriched };
    }
  }, [baseFiltered, sortMode, allPrices, squadSize, evRefinementOverride, activeQuality]);

  const totalFilteredGroups = baseFiltered.length;
  const totalFilteredItems = baseFiltered.reduce((s, r) => s + Object.values(r.refinements || {}).reduce((a, b) => a + b, 0), 0);

  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;

  const eraTabs = ['All', ...ERA_ORDER, 'Other'].
  filter((e) => e === 'All' || relics.some((r) => r.era === e)).
  map((e) => ({
    id: e,
    label: e === 'All' ? t('relics.all') : e === 'Other' ? t('relics.other') : e,
    icon: e !== 'All' && e !== 'Other' ? iconSrc(e) : null
  }));

  const qualityTabs = ['All', ...QUALITY_ORDER].map((q) => ({ id: q, label: q === 'All' ? t('relics.all') : t(REFINEMENT_LABELS[q]) }));

  const renderHeaderPanel = () =>
  <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-kronos-dim group-focus-within:text-kronos-accent transition-colors" size={18} />
          <Input
          placeholder={t('relics.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 bg-black/20 border-white/5 h-[42px]" />
        
        </div>

        {/* Squad Size */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <div className="px-2 flex items-center gap-2 border-r border-white/5 h-6">
            <Users size={14} className="text-kronos-dim" />
            <span className="text-[10px] font-black uppercase text-kronos-dim tracking-wider">{t('relics.squad')}</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((size) =>
          <button
            key={size}
            onClick={() => setSquadSize(size)}
            className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${squadSize === size ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white'}`}>
            
                {size}
              </button>
          )}
          </div>
        </div>

        {/* Refinement Override (for EV calculation) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5 h-[42px] px-2">
          <div className="px-2 flex items-center gap-2 border-r border-white/5 h-6">
            <Zap size={14} className="text-kronos-dim" />
            <span className="text-[10px] font-black uppercase text-kronos-dim tracking-wider">{t('relics.target')}</span>
          </div>
          <div className="flex gap-1">
            {QUALITY_ORDER.map((q) =>
          <button
            key={q}
            onClick={() => setEvRefinementOverride(q)}
            className={`w-7 h-7 rounded-lg text-[10px] font-black uppercase transition-all ${evRefinementOverride === q ? 'bg-kronos-accent text-kronos-bg shadow-[0_0_10px_rgba(var(--kronos-accent-rgb),0.3)]' : 'text-kronos-dim hover:text-white'}`}
            title={t(REFINEMENT_LABELS[q])}>
            
                {q.charAt(0)}
              </button>
          )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Era Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('relics.era')}</span>
          <Tabs tabs={eraTabs} activeTab={activeEra} onChange={setActiveEra} />
        </div>

        {/* Inventory Quality Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('relics.owned')}</span>
          <Tabs tabs={qualityTabs} activeTab={activeQuality} onChange={setActiveQuality} />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-kronos-accent uppercase tracking-widest px-1">{t('relics.sort')}</span>
          <div className="flex bg-black/20 rounded-xl p-1 border border-white/5 gap-1">
            {[
            { id: 'name', label: t('relics.sort_name'), icon: null },
            { id: 'ducat', label: t('relics.sort_ducat'), icon: iconSrc('Ducats') },
            { id: 'plat', label: t('relics.sort_plat'), icon: iconSrc('Platinum') },
            { id: 'ducat_gain', label: t('relics.sort_ducat_gain'), icon: iconSrc('Ducats') },
            { id: 'plat_gain', label: t('relics.sort_plat_gain'), icon: iconSrc('Platinum') }].map((mode) => {
            const isActive = sortMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  if (isActive) {
                    setSortOrder((prev) => prev === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortMode(mode.id);
                    setSortOrder('desc');
                  }
                }}
                className={`px-4 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-all duration-300 whitespace-nowrap font-sans flex items-center gap-1.5 ${isActive ? 'bg-kronos-accent text-kronos-bg font-black shadow-[0_0_15px_rgba(var(--kronos-accent-rgb),0.4)] scale-[1.02]' : 'text-kronos-dim hover:text-white hover:bg-white/5'}`}>
                
                  {mode.icon && <img src={mode.icon} className="w-3.5 h-3.5 object-contain" alt="" />}
                  {mode.label}
                  {isActive && <ArrowUpDown size={12} className={sortOrder === 'desc' ? 'rotate-180' : ''} />}
                </button>);

          })}
          </div>
        </div>

        {/* Void Traces - Aligned Right in the same row */}
        {inventoryData?.account &&
      <div className="ml-auto flex items-center gap-3 bg-black/20 px-3 py-1 rounded-xl border border-white/5 h-[34px]">
            {uiPath && <img src={convertFileSrc(`${uiPath}/VoidTraces.png`)} alt="" className="w-7 h-7 object-contain" />}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-kronos-accent uppercase tracking-widest leading-none mb-0.5">{t('relics.void_traces')}</span>
              <span className="text-sm font-black text-kronos-text leading-none">
                {inventoryData.account.void_traces}
                <span className="text-kronos-dim text-[10px] ml-1">/ {inventoryData.account.void_traces_max}</span>
              </span>
            </div>
          </div>
      }
      </div>
    </div>;


  return (
    <PageLayout
      titleKey="screen.relics"
      subtitle={t('relics.subtitle', { groups: totalFilteredGroups, items: totalFilteredItems })}
      headerPanel={renderHeaderPanel()}>
      
      <div className="space-y-4 pt-2">
        {isInventoryLoading ?
        <MonitorState isLoading className="py-20" /> :
        !inventoryData ?
        <MonitorState className="py-20" /> :
        totalFilteredGroups === 0 ?
        <Card glow>
            <div className="text-center py-12">
              <p className="text-kronos-dim">
                {relics.length === 0 ? t('relics.no_relics_inventory') : t('relics.no_relics_search')}
              </p>
            </div>
          </Card> :

        <>
            <div className="flex justify-between items-end px-1">
              <div className="flex items-center gap-4">
                {isPriceLoading && priceFetchProgress &&
              <span className="text-[10px] font-black uppercase text-kronos-accent flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>{t('inventory.fetching_plat')}
                {priceFetchProgress.current}{t('inventory.fetching_of')}{priceFetchProgress.total}...
                  </span>
              }
                {isPriceLoading && !priceFetchProgress &&
              <span className="text-[10px] font-black uppercase text-kronos-accent flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 bg-kronos-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>{t('ui.inventory.fetching_prices')}

              </span>
              }

              </div>
            </div>

            <div className="space-y-12 pb-12">
              {Object.entries(grouped).sort(([a], [b]) => ERA_ORDER.indexOf(a) - ERA_ORDER.indexOf(b)).map(([era, eraRelics]) =>
            <div key={era} className="space-y-4">
                  <h3 className="font-black text-sm uppercase tracking-[0.2em] text-kronos-accent border-b border-kronos-accent/20 pb-1 ml-1">
                    {ERA_ORDER.includes(era) ? t('relics.era_label', { era }) : era}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {eraRelics.map((item, idx) => {
                  const refinements = item.refinements || {};
                  const activeLevels = REFINEMENTS.filter((q) => (refinements[q] || 0) > 0);

                  let countLabel = '';
                  if (activeLevels.length === 1) {
                    countLabel = `${t(REFINEMENT_LABELS[activeLevels[0]])} ${refinements[activeLevels[0]]}`;
                  } else if (activeLevels.length === 2) {
                    countLabel = `${t(REFINEMENT_LABELS[activeLevels[0]])} ${refinements[activeLevels[0]]} | ${t(REFINEMENT_LABELS[activeLevels[1]])} ${refinements[activeLevels[1]]}`;
                  } else {
                    countLabel = REFINEMENTS.map((q) => `${t(REFINEMENT_LABELS[q])} ${refinements[q] || 0}`).join(' | ');
                  }

                  const { sortedRewards, evPlat, evDucats, evRefinement, relicPlat } = item;

                  return (
                    <Card
                      key={item.unique_name + idx}
                      glow
                      className="flex group p-1 transition-all duration-300 relative overflow-hidden">
                      
                          {/* Left: Metadata Stack*/}
                          <div className="w-24 flex-shrink-0 flex flex-col items-center text-center mr-4 py-1">
                            <h4 className="font-black text-[11px] uppercase tracking-tight text-kronos-accent mb-1 truncate w-full px-1">
                              {item.name.replace(' Relic', '')}
                            </h4>

                            <div className="flex-1 flex items-center justify-center p-1 min-h-0 min-w-0">
                              {item.image &&
                          <img src={item.image} alt="" className="max-w-full max-h-[80px] object-contain grayscale-[0.2] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110" loading="lazy" />
                          }
                            </div>

                            <p className="font-black text-[9px] uppercase text-kronos-dim mt-1 whitespace-nowrap">
                              {countLabel}
                            </p>
                            {relicPlat > 0 &&
                        <p className="font-black text-[9px] text-kronos-accent mt-0.5 whitespace-nowrap">
                                {t('relics.platinum', { plat: relicPlat })}
                              </p>
                        }
                          </div>

                          {/* Divider (Minimal) */}
                          <div className="w-px bg-white/5 ml-0 mr-2 self-stretch" />

                          {/* Right: Rewards + EV Footer */}
                          <div className="flex-1 flex flex-col min-w-0 pr-1 pl-1">
                            <div className="flex-1 flex flex-col justify-center gap-0.5">
                              {sortedRewards.map((reward, ridx) => {
                            const rewardLower = reward.name.toLowerCase();
                            const cleanReward = rewardLower.replace(/[&]/g, '');
                            const searchWords = searchQuery.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
                            const isMatch = searchWords.length > 0 && searchWords.every((word) => rewardLower.includes(word) || cleanReward.includes(word));
                            const rarityColor = reward.rarity === 'COMMON' ? 'text-gray-400/80' : reward.rarity === 'UNCOMMON' ? 'text-white/90' : 'text-orange-400';
                            const plat = reward.plat;
                            return (
                              <div key={ridx} className="flex items-center justify-between gap-2 min-w-0">
                                    <p className={`text-[10px] font-bold leading-tight truncate uppercase ${rarityColor} group-hover:brightness-110 transition-all flex-1`}>
                                      {isMatch && <span className="text-kronos-accent mr-0.5">[</span>}
                                      {reward.name}
                                      {isMatch && <span className="text-kronos-accent ml-0.5">]</span>}
                                    </p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {reward.ducats > 0 &&
                                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 transition-colors tabular-nums">
                                          {iconSrc('Ducats') && <img src={iconSrc('Ducats')} className="w-3 h-3 object-contain" alt="" />}
                                          {reward.ducats}
                                        </span>
                                  }
                                      {plat > 0 &&
                                  <span className="flex items-center gap-0.5 text-[9px] font-black text-kronos-accent transition-colors tabular-nums">
                                          {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3 h-3 object-contain" alt="" />}
                                          {t('relics.platinum', { plat: plat })}
                                        </span>
                                  }
                                    </div>
                                  </div>);

                          })}
                            </div>

                            {/* Expected Value Footer */}
                            <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                {era !== 'Requiem' &&
                            <div className="flex items-center gap-1.5" title={t("relics.ev_title", { label: t("relics.exp_ducats"), refinement: evRefinement, size: squadSize })}>
                                    {iconSrc('Ducats') && <img src={iconSrc('Ducats')} className="w-3.5 h-3.5 object-contain" alt="" />}
                                    <span className="text-[12px] font-black text-kronos-dim uppercase tracking-tighter">{t('relics.exp_ducats')}</span>
                                    <span className="text-[12px] font-black text-blue-400">{Math.round(item.evDucats)}</span>
                                  </div>
                            }
                                <div className="flex items-center gap-1.5" title={t("relics.ev_title", { label: t("relics.exp_plat"), refinement: evRefinement, size: squadSize })}>
                                  {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3.5 h-3.5 object-contain" alt="" />}
                                  <span className="text-[12px] font-black text-kronos-dim uppercase tracking-tighter">{t('relics.exp_plat')}</span>
                                  <span className="text-[12px] font-black text-kronos-accent">{t('relics.platinum', { plat: Math.round(item.evPlat) })}</span>
                                </div>
                              </div>

                              {(sortMode === 'ducat_gain' || sortMode === 'plat_gain') &&
                          <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5">
                                  <div className="flex items-center gap-1.5" title={t('relics.ducats_gain')}>
                                    {iconSrc('Ducats') && <img src={iconSrc('Ducats')} className="w-3.5 h-3.5 object-contain" alt="" />}
                                    <span className="text-[12px] font-black text-kronos-accent/70 uppercase tracking-tighter">{t('relics.gain_ducats')}</span>
                                    <span className="text-[12px] font-black text-blue-400">+{Math.round(item.ducatGain)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5" title={t('relics.plat_gain')}>
                                    {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3.5 h-3.5 object-contain" alt="" />}
                                    <span className="text-[12px] font-black text-kronos-accent/70 uppercase tracking-tighter">{t('relics.gain_plat')}</span>
                                    <span className="text-[12px] font-black text-kronos-accent">+{t('relics.platinum', { plat: Math.round(item.platGain) })}</span>
                                  </div>
                                </div>
                          }
                            </div>

                          </div>
                        </Card>);

                })}
                  </div>
                </div>
            )}
            </div>
          </>
        }
      </div>
    </PageLayout>);

}