import { convertFileSrc } from '@tauri-apps/api/core';
import { useUi } from '../contexts/UiContext'
import { useState, useCallback, useRef } from 'react';

const CARD_RATIO = 290 / 409;
const CANVAS_W = 290;
const CANVAS_H = 409;

const POLARITY_FILES = {
  'AP_ATTACK': 'PolarityTriangle.png',
  'AP_DEFENSE': 'PolarityPoint.png',
  'AP_TACTIC': 'PolarityCircle.png',
  'AP_POWER': 'PolarityMark.png',
  'AP_PRECEPT': 'PolarityPrecept.png',
  'AP_FUSION': 'PolarityAura.png',
  'AP_WARD': 'PolarityWard.png',
  'AP_UMBRA': 'PolarityUmbra.png',
  'AP_ANY': 'PolarityUniversal.png',
  'AP_UNIVERSAL': 'PolarityUniversal.png'
};

function u(base, folder, file) {
  return base ? convertFileSrc(`${base}/${folder}/${file}`) : null;
}

function SafeImg({ src, className, style, onError }) {
  if (!src) return null;
  return <img src={src} className={className} style={{ ...style, opacity: 0, transition: 'opacity 0.15s' }} alt="" loading="lazy" onLoad={(e) => e.target.style.opacity = 1} onError={(e) => {e.target.style.display = 'none';onError?.();}} />;
}

export default function RivenCard({ riven, framesPath, iconsPath, width = 180, estimate }) {
  const { t } = useUi()
  const cardScale = width / 180;
  const mf = 'Riven';
  const cardRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!cardRef.current || !estimate) return;
    const rect = cardRef.current.getBoundingClientRect();
    setTooltipPos({
      left: rect.left + rect.width / 2,
      top: rect.top
    });
    setShowTooltip(true);
  }, [estimate]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const f = (file) => u(framesPath, mf, file);
  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;
  const bg = f('Background.png') || f('SilverBackground.png');
  const ft = f('FrameTop.png') || f('RivenFrameTop.png');
  const fb = f('FrameBottom.png');
  const sl = f('SideLight.png');
  const bk = f('RightBacker.png');
  const lt = f('LowerTab.png');
  const cl = f('CornerLights.png');

  const rank = riven.rank ?? 0;
  const maxRank = 8;
  const baseDrain = 18;
  const currentDrain = 10 + rank;

  const statsText = riven.stats?.map((s) => {
    const sign = s.positive ? '+' : '-';
    // s.value may already include a trailing "%" for OCR-parsed stats
    // (rivenOcrI18n captures "+139.4%" as the value). Avoid double-rendering
    // the unit as "+139.4% %" in that case.
    const pct = s.isPercent && !/\s*%\s*$/.test(s.value) ? '%' : '';
    const val = s.positive ? s.value : s.value.replace(/^-/, '');
    return `${sign}${val}${pct} ${s.tag}`;
  }).join('\n') || '';

  const polarity = riven.polarity || null;
  const weaponImg = riven.image || 'https://browse.wf/Lotus/Interface/Cards/Images/OmegaModIndistinctUnveiled.png';

  return (
    <div ref={cardRef} className="relative flex-shrink-0 select-none" style={{ width, aspectRatio: String(CARD_RATIO) }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {bg && <SafeImg src={bg} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 1 }} />}

      {sl && <><SafeImg src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <SafeImg src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} /></>}
      {ft && <SafeImg src={ft} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {fb && <SafeImg src={fb} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {!riven.veiled && !riven.challenge && bk && <SafeImg src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {lt && <SafeImg src={lt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />}
      {cl && <><SafeImg src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <SafeImg src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} /></>}

      {polarity && POLARITY_FILES[polarity] &&
      <SafeImg src={u(iconsPath, '', POLARITY_FILES[polarity])} style={{
        position: 'absolute', top: `${69 / CANVAS_H * 100}%`, right: `${30 / CANVAS_W * 100}%`,
        width: `${19 / CANVAS_W * 100}%`, zIndex: 4, pointerEvents: 'none',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
      }} />
      }

      {!riven.veiled && !riven.challenge &&
      <span className="absolute font-bold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{
        top: `${70 / CANVAS_H * 100}%`, right: `${47 / CANVAS_W * 100}%`,
        zIndex: 4, color: '#AC83D5', fontFamily: 'Outfit, sans-serif',
        fontSize: `${11 * cardScale}px`, lineHeight: 1, textAlign: 'right'
      }}>
          {currentDrain}
        </span>
      }

      <div className="absolute flex flex-col" style={{
        top: `${55 / CANVAS_H * 100}%`,
        left: `${26 / CANVAS_W * 100}%`,
        right: `${26 / CANVAS_W * 100}%`,
        bottom: `${65 / CANVAS_H * 100}%`,
        zIndex: 2
      }}>
        <div className="flex-1 overflow-hidden flex items-start justify-center">
          <SafeImg src={weaponImg} className="w-full h-full object-contain" />
        </div>
        <div className="flex-shrink-0 text-center" style={{ padding: `${4 * cardScale}px ${4 * cardScale}px ${8 * cardScale}px` }}>
          <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${14 * cardScale}px` }}>
            {riven.name}
          </p>
          {!riven.veiled && !riven.challenge && statsText &&
          <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${13 * cardScale}px`, whiteSpace: 'pre-line' }}>
              {statsText}
            </p>
          }
          {riven.challenge && !riven.veiled &&
          <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${13 * cardScale}px`, lineHeight: '1.25' }}>
              {riven.challenge}
            </p>
          }
        </div>
      </div>

      {!riven.veiled && !riven.challenge &&
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '0%', zIndex: 5 }}>
          {rank >= maxRank && f('RankCompleteLine.png') &&
        <img src={f('RankCompleteLine.png')} className="absolute inset-x-0" style={{ bottom: '0%', width: '100%' }} alt="" />
        }
          <div className="flex items-center justify-center" style={{ gap: Math.round(1.5 * cardScale), height: Math.round(14 * cardScale) }}>
            {Array.from({ length: Math.min(maxRank, 10) }, (_, i) => {
            const p = i < rank ? 'RankSlotActive' : 'RankSlotEmpty';
            const src = u(framesPath, mf, `${p}.png`);
            const s = Math.max(4, Math.round(7 * cardScale));
            return src ? <img key={i} src={src} style={{ width: s, height: s }} className="object-contain flex-shrink-0" alt="" onError={(e) => e.target.style.display = 'none'} /> : null;
          })}
          </div>
        </div>
      }

      {riven.veiled &&
      <div className="absolute text-center pointer-events-none flex items-center justify-center" style={{ left: 0, right: 0, bottom: `${44 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <span className="font-black uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>{t('ui.riven_card.veiled')}

        </span>
          {riven.quantity > 1 &&
        <span className="ml-2 font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${9 * cardScale}px` }}>
              x{riven.quantity}
            </span>
        }
        </div>
      }

      {riven.challenge && !riven.veiled &&
      <div className="absolute flex items-center justify-center pointer-events-none" style={{ left: 0, right: 0, bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <span className="font-black uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>{t('ui.dashboard.cet_challenge')}

        </span>
          {riven.rerolls > 0 &&
        <div className="absolute flex items-center pointer-events-none gap-0.5" style={{ right: '20%', bottom: 0, zIndex: 4 }}>
              {f('Reset.png') && <img src={f('Reset.png')} style={{ width: `${9 * cardScale}px`, height: `${9 * cardScale}px` }} className="object-contain" alt="" />}
              <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
                {riven.rerolls}
              </span>
            </div>
        }
        </div>
      }

      {!riven.veiled && !riven.challenge &&
      <>
          <div className="absolute flex items-center pointer-events-none gap-1" style={{ left: '20%', bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
            <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
              {t('ui.riven_card.mr', { mr: riven.mr ?? '?' })}
            </span>
          </div>
          {riven.rerolls > 0 &&
        <div className="absolute flex items-center pointer-events-none gap-0.5" style={{ right: '20%', bottom: `${43 / CANVAS_H * 100}%`, zIndex: 4 }}>
              {f('Reset.png') && <img src={f('Reset.png')} style={{ width: `${10 * cardScale}px`, height: `${10 * cardScale}px` }} className="object-contain" alt="" />}
              <span className="font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#AC83D5', fontSize: `${10 * cardScale}px` }}>
                {riven.rerolls}
              </span>
            </div>
        }
        </>
      }

      {estimate && !riven.veiled && !riven.challenge &&
      <div className="absolute top-1 left-1" style={{ zIndex: 10 }}>
          <span className={`text-[11px] font-black px-1.5 py-0.5 rounded shadow-sm ${estimate.grade === 'S' ? 'bg-yellow-400 text-black' :
        estimate.grade === 'A' ? 'bg-green-500 text-white' :
        estimate.grade === 'B' ? 'bg-blue-500 text-white' :
        estimate.grade === 'C' ? 'bg-zinc-500 text-white' :
        'bg-red-500 text-white'}`
        }>{estimate.grade}</span>
        </div>
      }

      {estimate && !riven.veiled && !riven.challenge && estimate.price != null &&
      <div className="absolute top-1 right-1" style={{ zIndex: 10 }}>
          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">
            {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3 h-3 object-contain" alt="" />}
            {t('riven_card.plat_short', { p: Math.round(estimate.price) })}
          </span>
        </div>
      }

      {showTooltip && tooltipPos && estimate && !riven.veiled && !riven.challenge &&
      <div className="fixed pointer-events-none z-[9999]" style={{
        left: tooltipPos.left,
        top: tooltipPos.top - 8,
        transform: 'translate(-50%, -100%)'
      }}>
          <div className="w-72 p-3 bg-kronos-panel border border-white/10 rounded-lg shadow-2xl text-[10px] leading-tight">
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="text-kronos-dim text-center font-bold uppercase tracking-wider">{t('ui.riven_card.weapon_rank')}</div>
              <div className="text-kronos-dim text-center font-bold uppercase tracking-wider">{t('ui.riven_card.avg_value')}</div>
              <div className="text-kronos-dim text-center font-bold uppercase tracking-wider">{t('ui.riven_card.your_value')}</div>
              <div className="text-kronos-dim text-center font-bold uppercase tracking-wider">{t('ui.riven_card.reroll_potential')}</div>
              <div className="text-center font-bold">{estimate.weapon_rank != null ? `#${estimate.weapon_rank}/${estimate.total_weapons ?? '?'}` : t('riven_card.na')}</div>
              <div className="text-center font-bold">{t('riven_card.plat_short', { p: Math.round(estimate.expected_value) })}</div>
              <div className="text-center font-bold text-yellow-400">{t('riven_card.plat_short', { p: Math.round(estimate.price) })}</div>
              <div className={`text-center font-bold ${(1 - (estimate.probability_stagnant ?? 0.5)) * 100 > 50 ? 'text-green-400' : 'text-red-400'}`}>
                {Math.round((1 - (estimate.probability_stagnant ?? 0.5)) * 100)}%
              </div>
            </div>
            {(() => {
            const wr = estimate.weapon_rank ?? 999;
            const total = estimate.total_weapons ?? 1;
            const tier = wr <= total * 0.2 ? t('riven_card.tier_meta') : wr <= total * 0.5 ? t('riven_card.tier_popular') : wr <= total * 0.7 ? t('riven_card.tier_average') : wr <= total * 0.9 ? t('riven_card.tier_niche') : t('riven_card.tier_unpopular');
            const roll = estimate.grade === 'S' ? t('riven_card.roll_perfect') : estimate.grade === 'A' ? t('riven_card.roll_good') : estimate.grade === 'B' ? t('riven_card.roll_average') : estimate.grade === 'C' ? t('riven_card.roll_mediocre') : t('riven_card.roll_bad');
            return <div className="text-center text-[11px] font-bold text-kronos-accent leading-snug">{t('riven_card.tier_label', { tier, roll })}</div>;
          })()}
          </div>
        </div>
      }
    </div>);

}