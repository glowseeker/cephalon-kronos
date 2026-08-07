import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useUi } from '../../contexts/UiContext';
import { loadSettings, getSetting, onSettingsChanged } from '../../lib/settings';
import { loadLocale } from '../../lib/i18n';
import {
  cleanStatName,
  displayStatName,
  parseRivenOcr,
  foldVariants,
  buildStatAliases,
  garbageReForLocale,
  garbageSuffixReForLocale } from
'../../lib/rivenOcrI18n';


export default function RivenOverlay() {
  const label = getCurrentWindow().label;
  const isNew = label === 'overlay-riven-new';
  const [visible, setVisible] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const aliveRef = useRef(true);
  const showingRef = useRef(false);
  const knownWeaponsRef = useRef([]);
  const knownWeaponsLowerRef = useRef([]);
  const localizedWeaponsRef = useRef([]);

  const [parsed, setParsed] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [rivenInfo, setRivenInfo] = useState(null);
  const [knownWeapons, setKnownWeapons] = useState([]);
  const { t } = useUi();
  // Riven cards are rendered by the game in the *game* locale, not the UI
  // locale — so the OCR stat aliases, garbage words, and parse locale must all
  // follow `gameLocale` (weapon names below already do).
  const [gameLocale, setGameLocale] = useState('en');
  const [gameI18n, setGameI18n] = useState(null);
  const statAliases = useMemo(() => buildStatAliases(gameLocale, gameI18n?.rivenStats), [gameLocale, gameI18n]);
  const garbageRe = useMemo(() => garbageReForLocale(gameLocale), [gameLocale]);

  useEffect(() => {
    let cancelled = false;
    const applyGameLocale = (gl) => {
      if (cancelled) return;
      setGameLocale(gl);
      loadLocale(gl).then((data) => { if (!cancelled) setGameI18n(data); });
      invoke('get_localized_weapon_names', { locale: gl }).then((pairs) => {
        if (!cancelled) {
          localizedWeaponsRef.current = (pairs || []).map((p) => ({
            variants: foldVariants(p.localized),
            english: p.english
          }));
        }
      }).catch(() => {});
    };
    loadSettings().then(() => {
      const gl = getSetting('gameLocale', 'en');
      applyGameLocale(gl);
      invoke('get_known_weapon_names').then((names) => {
        if (!cancelled) {
          setKnownWeapons(names);
          knownWeaponsRef.current = names;
          knownWeaponsLowerRef.current = names.map((w) => w.toLowerCase());
        }
      }).catch(() => {});
    });
    // Re-apply when the user changes the game language in Settings.
    const unsub = onSettingsChanged((s) => {
      const gl = s?.gameLocale || getSetting('gameLocale', 'en');
      applyGameLocale(gl);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  function extractWeaponName(ocrName) {
    if (!ocrName) return '';
    const known = knownWeaponsRef.current;
    const knownLower = knownWeaponsLowerRef.current;
    // Locale-aware garbage strip (drain/capacity/polarity/reroll/riven-label
    // words for the current game locale, plus the EN base set).
    let cleaned = ocrName
    .replace(garbageSuffixReForLocale(gameLocale), '')
    .replace(/\s*\(.*?\)\s*$/, '')
    .trim();
    if (!cleaned) cleaned = ocrName;
    const lower = cleaned.toLowerCase();

    // 0. localized weapon-name match (game-language OCR text → English name)
    const loc = localizedWeaponsRef.current;
    if (loc.length) {
      const [folded, expanded, tight] = foldVariants(cleaned);
      const hasVariant = (w) => w.variants.includes(folded) || w.variants.includes(expanded) || w.variants.includes(tight);
      // exact match on any variant
      for (const w of loc) {
        if (hasVariant(w)) return w.english;
      }
      // longest prefix match (folded)
      let bestLoc = '';
      for (const w of loc) {
        if (folded.startsWith(w.variants[0]) && w.english.length > bestLoc.length) bestLoc = w.english;
      }
      if (bestLoc) return bestLoc;
      // longest substring match (folded)
      bestLoc = '';
      for (const w of loc) {
        if (folded.includes(w.variants[0]) && w.english.length > bestLoc.length) bestLoc = w.english;
      }
      if (bestLoc) return bestLoc;
    }

    // Helper: try to match `lower` against known weapons, return longest match or null
    const tryMatch = (str) => {
      // 1. exact match
      for (let i = 0; i < known.length; i++) {
        if (str === knownLower[i]) return known[i];
      }
      // 2. longest prefix match
      let best = '';
      for (let i = 0; i < known.length; i++) {
        if (str.startsWith(knownLower[i]) && known[i].length > best.length) {
          best = known[i];
        }
      }
      if (best) return best;
      // 3. longest substring match
      for (let i = 0; i < known.length; i++) {
        if (str.includes(knownLower[i]) && known[i].length > best.length) {
          best = known[i];
        }
      }
      return best || null;
    };

    const direct = tryMatch(lower);
    if (direct) return direct;

    // Try with leading number+hyphen stripped (mod drain "18-" prefix)
    const noPrefix = lower.replace(/^\d+\s*[-–—]\s*/, '');
    if (noPrefix !== lower) {
      const unprefixed = tryMatch(noPrefix);
      if (unprefixed) return unprefixed;
      // Also try each known weapon without its number prefix
      for (let i = 0; i < known.length; i++) {
        const wNoPrefix = knownLower[i].replace(/^\d+\s*[-–—]\s*/, '');
        if (wNoPrefix !== knownLower[i] && noPrefix === wNoPrefix) return known[i];
      }
    }

    // 4. iterative suffix strip: keep popping words until we find a known name
    const words = cleaned.trim().split(/\s+/);
    while (words.length > 1) {
      words.pop();
      const trial = words.join(' ').toLowerCase();
      const matched = tryMatch(trial);
      if (matched) return matched;
      // Also try no-prefix variant
      const trialNoPrefix = trial.replace(/^\d+\s*[-–—]\s*/, '');
      if (trialNoPrefix !== trial) {
        const matched2 = tryMatch(trialNoPrefix);
        if (matched2) return matched2;
      }
    }
    // 5. last resort: return first word only (with number prefix stripped)
    return cleaned.trim().split(/\s+/)[0].replace(/^\d+\s*[-–—]\s*/, '') || cleaned;
  }

  const doPricing = useCallback((p) => {
    if (!p || !p.stats.length) {setEstimatedPrice(null);setRivenInfo(null);return;}
    const weaponName = extractWeaponName(p.name || '');
    const pos = p.stats.filter((s) => !s.value.startsWith('-')).map((s) => cleanStatName(s.name, statAliases));
    const neg = p.stats.filter((s) => s.value.startsWith('-') || /^x/i.test(s.value)).map((s) => cleanStatName(s.name, statAliases));

    console.log('[PRICER] weaponName:', weaponName);
    console.log('[PRICER] pos:', pos);
    console.log('[PRICER] neg:', neg);
    console.log('[PRICER] parsed.name was:', p.name);

    invoke('estimate_riven_full', {
      input: {
        weapon_name: weaponName,
        re_rolls: parseInt(p.rolls ?? 0),
        positive1: pos[0] || null,
        positive2: pos[1] || null,
        positive3: pos[2] || null,
        negative: neg[0] || null
      }
    }).then((info) => {
      if (aliveRef.current) {
        setRivenInfo(info);
        setEstimatedPrice(info?.price ?? null);
      }
    }).catch(console.error);
  }, [statAliases]);

  const doOcr = useCallback((pos) => {
    if (!aliveRef.current) return;
    setOcrLoading(true);
    setParsed(null);
    setEstimatedPrice(null);
    invoke('ocr_riven_card', { position: pos }).
    then((res) => {
      if (aliveRef.current) {
        const p = parseRivenOcr(res.text, garbageRe, gameLocale);
        setParsed(p);
        doPricing(p);
      }
    }).
    catch(() => {if (aliveRef.current) setParsed({ name: '', mr: '', stats: [], raw: '[OCR failed]' });}).
    finally(() => {if (aliveRef.current) setOcrLoading(false);});
  }, [doPricing, garbageRe, gameLocale]);

  const show = useCallback(() => {
    if (showingRef.current) return;
    showingRef.current = true;
    aliveRef.current = true;
    setVisible(true);
    setParsed(null);
    invoke('show_overlay_window', { label }).catch(() => {}).
    finally(() => {showingRef.current = false;});
  }, [label]);

  const hide = useCallback(() => {
    aliveRef.current = false;
    showingRef.current = false;
    setVisible(false);
    setParsed(null);
    setEstimatedPrice(null);
    invoke('hide_overlay_window', { label }).catch(() => {});
  }, [label]);

  useEffect(() => {
    const unsubs = [
    listen('riven-ocr-result', (e) => {
      const payload = typeof e.payload === 'string' ? e.payload : String(e.payload);
      if (aliveRef.current) {
        setVisible(true);
        setOcrLoading(false);
        const p = parseRivenOcr(payload, garbageRe, gameLocale);
        setParsed(p);
        doPricing(p);
      }
    })];


    if (isNew) {
      let timer = null;
      unsubs.push(
        listen('riven-reroll', () => {
          timer = setTimeout(() => {
            show();
            doOcr('Middle');
          }, 4000);
        }),
        listen('riven-reroll-confirmed', () => {
          if (timer) {clearTimeout(timer);timer = null;}
          timer = setTimeout(() => hide(), 2000);
        }),
        listen('riven-screen-closed', () => {
          if (timer) {clearTimeout(timer);timer = null;}
          hide();
        })
      );
      return () => {
        if (timer) clearTimeout(timer);
        unsubs.forEach((p) => p.then((f) => f()));
      };
    } else {
      let refreshTimer = null;
      unsubs.push(
        listen('riven-linked-open', () => {show();doOcr('Linked');}),
        listen('riven-screen-open', () => {
          show();
          doOcr('Middle');
        }),
        listen('riven-linked-closed', () => hide()),
        listen('riven-screen-closed', () => {
          if (refreshTimer) {clearTimeout(refreshTimer);refreshTimer = null;}
          hide();
        }),
        listen('riven-reroll-confirmed', () => {
          refreshTimer = setTimeout(() => {
            setRefreshTick((t) => t + 1);
            doOcr('Middle');
          }, 2000);
        })
      );
      return () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        unsubs.forEach((p) => p.then((f) => f()));
      };
    }
  }, [isNew, show, hide, doOcr, doPricing, label, garbageRe]);

  if (!visible) return null;

  const posClass = (v) => {
    if (!v) return 'text-kronos-text';
    // x-prefixed values (e.g. "x0.65") are negative modifiers
    if (/^x/i.test(v)) return 'text-red-400';
    const num = parseFloat(v);
    if (num > 0) return 'text-green-400';
    if (num < 0) return 'text-red-400';
    return 'text-kronos-text';
  };

  const fmtVal = (v) => {
    if (!v) return '';
    const s = String(v);
    if (s.startsWith('+') || s.startsWith('-') || /^x/i.test(s)) return s;
    return '+' + s;
  };

  return (
    <div className="w-full h-full overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.06),transparent_70%)]" />

      <div className="relative z-10 flex flex-col w-full h-full">
        {/* Header: weapon name + badge */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {parsed?.name &&
            <span className="text-[14px] font-black text-white truncate drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] tracking-tight">
                {parsed.name}
              </span>
            }
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {rivenInfo?.grade && rivenInfo.grade !== 'N/A' &&
            <span className={`text-[12px] font-black px-2 py-0.5 rounded ${
            rivenInfo.grade === 'S' ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30' :
            rivenInfo.grade === 'A' ? 'bg-green-400/20 text-green-400 border border-green-400/30' :
            rivenInfo.grade === 'B' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' :
            rivenInfo.grade === 'C' ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30' :
            'bg-red-400/20 text-red-400 border border-red-400/30'}`
            }>{rivenInfo.grade}</span>
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-3 pb-4 flex flex-col overflow-hidden">
          {ocrLoading ?
          <div className="flex items-center justify-center flex-1">
              <p className="text-[12px] text-zinc-300 uppercase tracking-widest font-bold animate-pulse">{t('ui.riven_overlay.scanning')}</p>
            </div> :
          parsed ?
          <div className="flex flex-col flex-1 overflow-hidden">
              {/* Stats */}
              {parsed.stats.length > 0 &&
            <div className="space-y-[2px]">
                  {parsed.stats.map((s, i) =>
              <div key={i} className="flex justify-between items-center px-2.5 py-1.5 rounded bg-white/[0.03]">
                      <span className="text-[12px] text-zinc-200 font-medium truncate pr-2">
                        {displayStatName(s.name, statAliases)}
                      </span>
                      <span className={`text-[13px] font-black whitespace-nowrap ${posClass(s.value)}`}>
                        {fmtVal(s.value)}
                      </span>
                    </div>
              )}
                </div>
            }

              {/* Pricing info — always shown */}
              <div className="grid grid-cols-3 gap-[1px] rounded-lg overflow-hidden mt-0.5">
                <div className="bg-white/[0.04] px-2 py-2 text-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_overlay.avg_value')}</span>
                  <span className="text-[14px] font-black text-yellow-400">{rivenInfo ? `${Math.round(rivenInfo.expected_value)}p` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_card.your_value')}</span>
                  <span className="text-[14px] font-black text-yellow-400">{rivenInfo ? `${Math.round(estimatedPrice)}p` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">{t('ui.riven_card.reroll_potential')}</span>
                  <span className="text-[14px] font-black text-zinc-500">{rivenInfo ? `${Math.round((1 - (rivenInfo.probability_stagnant ?? 0.5)) * 100)}%` : '--'}</span>
                </div>
                <div className="bg-white/[0.04] px-2 py-2 text-center col-span-3">
                  {rivenInfo ?
                (() => {
                  const wr = rivenInfo.weapon_rank ?? 999;
                  const total = rivenInfo.total_weapons ?? 1;
                  const tier = wr <= total * 0.2 ? 'Meta' : wr <= total * 0.5 ? 'Popular' : wr <= total * 0.7 ? 'Average' : wr <= total * 0.9 ? 'Niche' : 'Unpopular';
                  const roll = rivenInfo.grade === 'S' ? 'Perfect' : rivenInfo.grade === 'A' ? 'Good' : rivenInfo.grade === 'B' ? 'Average' : rivenInfo.grade === 'C' ? 'Mediocre' : 'Bad';
                  return (
                    <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                          {tier} {t('riven_card.tier_weapon')} &middot; {roll}{t('riven_card.rolls')}
                    </span>);

                })() :

                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{t('ui.riven_overlay.waiting_price')}</span>
                }
                </div>
              </div>
            </div> :

          <div className="flex items-center justify-center flex-1">
              <p className="text-[13px] text-zinc-400 uppercase tracking-widest font-bold">{t('ui.riven_overlay.waiting_card')}</p>
            </div>
          }
        </div>
      </div>
    </div>);

}