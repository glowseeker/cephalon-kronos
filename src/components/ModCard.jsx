import { convertFileSrc } from '@tauri-apps/api/core';
import { useUi } from '../contexts/UiContext'
import { Box } from 'lucide-react';
import { useState, useMemo, memo } from 'react';

const CUSTOM = new Set(['Requiem', 'Tome', 'Antivirus', 'Potency', 'Tektolyst']);
const NO_SIDE = new Set(['Amalgam', 'Peculiar']);
const CARD_RATIO = 290 / 409;
const CANVAS_W = 290;
const CANVAS_H = 409;

const TIER_COLORS = {
  'Normal Common': '#CA9A87',
  'Normal Uncommon': '#FFFFFF',
  'Normal Rare': '#FAE7BE',
  'Normal Legendary': '#FFFFFF',
  'Galvanized': '#A8D8EA',
  'Riven': '#AC83D5',
  'Amalgam': '#C0C0C0',
  'Peculiar': '#BDC3C7',
  'Plexus Common': '#CA9A87',
  'Plexus Uncommon': '#FFFFFF',
  'Plexus Rare': '#FAE7BE',
  'Requiem': '#ecdeb4',
  'Tome': '#F5D76E',
  'Archon': '#E67E22',
  'Antivirus': '#2ECC71',
  'Potency': '#C2185B',
  'Tektolyst': '#A0522D',
  'Arcanes': '#E67E22'
};

const TEKTOLYST_TEXT_COLORS = {
  'Ubri-Kaneph': '#4FC3F7',
  'Metem-Erun': '#4FC3F7',
  'Empazu-Shol': '#4FC3F7',
  'Metem-Hakh': '#4FC3F7',
  'Lashta-Vak': '#4FC3F7',
  'Esti Vel-Ikha': '#4FC3F7',
  'Sil-Tabol': '#EF5350',
  'Omn-Evi': '#EF5350',
  'Vik-Anam': '#EF5350',
  'Da-Ren': '#EF5350',
  'Kaal-zidi': '#EF5350',
  'Hayan-Dabor': '#E0E0E0',
  'Evir-Ti': '#E0E0E0',
  'Hok-Kaal': '#E0E0E0',
  'Vikla-Safor': '#E0E0E0',
  'Lorun-Tash': '#E0E0E0',
  'Talsek-An': '#E0E0E0',
  'Sey-Taph': '#E0E0E0',
  'Yar Dal': '#E0E0E0',
  'Ulashta-Shol': '#E0E0E0'
};

const TEKTOLYST_COLOR_GROUPS = {
  'Ubri-Kaneph': 'Blue',
  'Metem-Erun': 'Blue',
  'Empazu-Shol': 'Blue',
  'Metem-Hakh': 'Blue',
  'Lashta-Vak': 'Blue',
  'Esti Vel-Ikha': 'Blue',
  'Sil-Tabol': 'Red',
  'Omn-Evi': 'Red',
  'Vik-Anam': 'Red',
  'Da-Ren': 'Red',
  'Kaal-zidi': 'Red',
  'Hayan-Dabor': 'Silver',
  'Evir-Ti': 'Silver',
  'Hok-Kaal': 'Silver',
  'Vikla-Safor': 'Silver',
  'Lorun-Tash': 'Silver',
  'Talsek-An': 'Silver',
  'Sey-Taph': 'Silver',
  'Yar Dal': 'Silver',
  'Ulashta-Shol': 'Silver'
};

const DT_COLORS = {
  DT_ALERT: '#FF4444',
  DT_BLAST: '#FF8800',
  DT_CINEMATIC: '#FFFFFF',
  DT_CLONE: '#88FF88',
  DT_COLD: '#88CCFF',
  DT_CORROSIVE: '#88FF44',
  DT_ELECTRICITY: '#4488FF',
  DT_EXPLOSION: '#FF8800',
  DT_FIRE: '#FF4444',
  DT_FREEZE: '#88CCFF',
  DT_GAS: '#88FF44',
  DT_GHOST: '#FF88FF',
  DT_HEAT: '#FF4444',
  DT_IMPACT: '#CCCCCC',
  DT_LASER: '#FF4444',
  DT_MAGNETIC: '#8844FF',
  DT_POISON: '#44FF44',
  DT_PUNCTURE: '#AA8855',
  DT_RADIATION: '#FFDD44',
  DT_RADIANT: '#FFDD44',
  DT_SENTINEL: '#88CCFF',
  DT_SLASH: '#CC4444',
  DT_TOXIN: '#44FF44',
  DT_VIRAL: '#88FF88'
};

function getSetFileName(modSetPath, modName) {
  const { t } = useUi()
  if (!modSetPath) return null;
  if (SET_FILE_OVERRIDES[modSetPath]) return SET_FILE_OVERRIDES[modSetPath];
  if (modName) {
    const firstWord = modName.split(/\s+/)[0];
    return `${firstWord}Set.png`;
  }
  const dirName = modSetPath.split('/').slice(-2, -1)[0];
  return `${dirName}Set.png`;
}

const SET_FILE_OVERRIDES = {
  '/Lotus/Upgrades/Mods/Sets/Umbra/UmbraSetMod': 'UmbralSet.png',
  '/Lotus/Upgrades/Mods/Sets/Sacrifice/SacrificeSetMod': 'SacrificialSet.png',
  '/Lotus/Upgrades/Mods/Sets/Nira/NiraSetMod': 'NirasSet.png',
  '/Lotus/Upgrades/Mods/Sets/Boreal/BorealSetMod': 'BorealsSet.png',
  '/Lotus/Upgrades/Mods/Sets/Amar/AmarSetMod': 'AmarsSet.png',
  '/Lotus/Upgrades/Mods/Sets/Amar/AmarsSetMod': 'AmarsSet.png'
};

const SET_RARITY_FILTERS = {
  COMMON: 'sepia(0.6) hue-rotate(-25deg) saturate(1.4) brightness(0.65) contrast(1.2)',
  RARE: 'sepia(0.8) hue-rotate(10deg) saturate(2.5) brightness(1.1)'
};

const POLARITY_FILES = {
  'AP_ATTACK': 'PolarityTriangle.png',
  'AP_DEFENSE': 'PolarityPoint.png',
  'AP_TACTIC': 'PolarityCircle.png',
  'AP_POWER': 'PolarityMark.png',
  'AP_PRECEPT': 'PolarityPrecept.png',
  'AP_FUSION': 'PolarityAura.png',
  'AP_WARD': 'PolarityWard.png',
  'AP_UMBRA': 'PolarityUmbra.png',
  'AP_ANY': 'PolarityUniversal.png'
};

function renderDesc(text, textColor, iconsPath, tagIconMap) {
  if (!text) return null;
  const normalized = text.replace(/\r\n/g, '\n');
  const parts = normalized.split(/(<[A-Z_]+>)/);
  const elements = [];
  let currentColor = null;
  let currentTag = null;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (p.startsWith('<') && p.endsWith('>')) {
      const tagName = p.slice(1, -1);
      if (tagName === 'LINE_SEPARATOR') {
        currentColor = null;
        currentTag = null;
      } else if (tagName.startsWith('DT_')) {
        currentTag = tagName;
        currentColor = DT_COLORS[tagName] || (tagName.endsWith('_COLOR') ? DT_COLORS[tagName.replace('_COLOR', '')] : null) || textColor;
      } else {
        const iconFile = tagIconMap?.[tagName];
        if (iconFile && iconsPath) {
          elements.push(<img key={elements.length} src={u(iconsPath, '', iconFile)} style={{ width: '11px', height: '11px', display: 'inline', verticalAlign: 'middle' }} alt="" onError={(e) => e.target.style.display = 'none'} />);
        }
        currentColor = null;
        currentTag = null;
      }
    } else if (p) {
      const lines = p.split('\n');
      for (let li = 0; li < lines.length; li++) {
        if (li > 0) elements.push(<br key={`${elements.length}-br`} />);
        const line = lines[li];
        if (!line) continue;
        if (currentColor) {
          const iconFile = currentTag ? tagIconMap?.[currentTag] || (() => {
            const clean = currentTag.replace(/^DT_/, '').replace(/_COLOR$/, '');
            return clean.charAt(0) + clean.slice(1).toLowerCase() + 'Symbol.png';
          })() : null;
          const spaceIdx = line.indexOf(' ');
          const word = spaceIdx >= 0 ? line.slice(0, spaceIdx) : line;
          const rest = spaceIdx >= 0 ? line.slice(spaceIdx) : '';
          elements.push(
            <span key={`${elements.length}-color`} style={{ color: currentColor, display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
                {iconFile && iconsPath ? <img src={u(iconsPath, '', iconFile)} style={{ width: '11px', height: '11px', flexShrink: 0 }} alt="" onError={(e) => e.target.style.display = 'none'} /> : null}
                <span>{word}</span>
              </span>
          );
          if (rest) elements.push(<span key={`${elements.length}-rest`} style={{ color: textColor }}>{rest}</span>);
          currentColor = null;
          currentTag = null;
        } else {
          elements.push(<span key={`${elements.length}-text`} style={{ color: textColor }}>{line}</span>);
        }
      }
    }
  }
  return elements.length ? elements : text;
}

function u(base, folder, file) {
  return base ? convertFileSrc(`${base}/${folder}/${file}`) : null;
}

function Img({ src, className, style }) {
  return src ? <img src={src} className={className} style={{ ...style, opacity: 0, transition: 'opacity 0.15s' }} alt="" loading="lazy" onLoad={(e) => e.target.style.opacity = 1} onError={(e) => e.target.style.display = 'none'} /> : null;
}

function SafeImg({ src, className, style, alt, onError }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || error) return null;
  return <img src={src} className={className} style={{ ...style, opacity: loaded ? 1 : 0, transition: 'opacity 0.15s' }} alt={alt || ''} loading="lazy" onLoad={() => setLoaded(true)} onError={() => {setError(true);onError?.();}} />;
}

const RankPips = memo(function RankPips({ modFrame, rank, maxRank, framesPath, pipColorGroup, cardWidth }) {
  const capped = Math.min(maxRank || 0, 10);
  const scale = cardWidth ? cardWidth / 180 : 1;
  const s = Math.max(4, Math.round(7 * scale));
  if (!framesPath) return null;
  const baseGap = capped <= 3 ? 2 : capped <= 5 ? 1.5 : 1;
  const gap = Math.round(baseGap * scale);
  const h = Math.round(14 * scale);
  return (
    <div className="flex items-center justify-center" style={{ gap, height: h }}>
      {Array.from({ length: capped }, (_, i) => {
        const name = i < rank ? pipColorGroup ? `RankSlotActive${pipColorGroup}` : 'RankSlotActive' : 'RankSlotEmpty';
        const src = u(framesPath, modFrame, `${name}.png`);
        return src ? <img key={i} src={src} style={{ width: s, height: s }} className="object-contain flex-shrink-0" alt="" onError={(e) => e.target.style.display = 'none'} /> : null;
      })}
    </div>);

});

const Charges = memo(function Charges({ modFrame, rank, maxRank, framesPath, cardWidth }) {
  const capped = Math.min(maxRank || 3, 3);
  const available = Math.max(0, capped - rank);
  if (available <= 0) return null;
  const scale = cardWidth ? cardWidth / 180 : 1;
  const s = Math.round(13 * scale);
  if (!framesPath) return null;
  const gap = Math.round(3 * scale);
  const h = Math.round(16 * scale);
  return (
    <div className="flex items-center justify-center" style={{ gap, height: h }}>
      {Array.from({ length: capped }, (_, i) => {
        const active = i < available;
        const src = u(framesPath, modFrame, 'Charge.png');
        return src ? <img key={i} src={src} onError={(e) => e.target.style.display = 'none'} style={{ width: s, height: s, opacity: active ? 1 : 0.25 }} className="object-contain flex-shrink-0" alt="" /> : null;
      })}
    </div>);

});

const ModCard = memo(function ModCard({ mod, framesPath, iconsPath, cardImagesPath, width = 180, exportTextIcons, platValue, pricesLoading = false, hideCategory = false }) {
  const isSticker = mod._isSticker;
  const { t } = useUi();
  const mf = mod.modFrame || 'Normal Common';
  const custom = CUSTOM.has(mf);
  const color = mf === 'Tektolyst' ? TEKTOLYST_TEXT_COLORS[mod.name] || TIER_COLORS[mf] || '#FFFFFF' : TIER_COLORS[mf] || '#FFFFFF';
  const tektolystGroup = mf === 'Tektolyst' ? TEKTOLYST_COLOR_GROUPS[mod.name] || 'Silver' : null;
  const cardScale = width / 180;
  const iconSrc = (name) => iconsPath ? convertFileSrc(`${iconsPath}/${name}.png`) : null;

  const tagIconMap = useMemo(() => {
    if (!exportTextIcons) return {};
    const map = {};
    for (const [tag, data] of Object.entries(exportTextIcons)) {
      const path = data?.DIT_AUTO;
      if (path) map[tag] = path.split('/').pop();
    }
    return map;
  }, [exportTextIcons]);

  const deriveIcon = (src) => {
    if (!src || typeof src !== 'string') return null;
    const prefix = 'https://browse.wf';
    return src.startsWith(prefix) ? src.slice(prefix.length) : null;
  };
  const iconPath = mod.icon || deriveIcon(mod.image);
  const cdnFallback = typeof mod.image === 'string' && mod.image.startsWith('https://browse.wf') ? mod.image : null;
  const cardImageSrc = iconPath && cardImagesPath && mf !== 'Tektolyst' ?
  convertFileSrc(`${cardImagesPath}${iconPath}`) :
  null;
  const [localImageFailed, setLocalImageFailed] = useState(false);
  const finalSrc = mf === 'Requiem' && cdnFallback || !localImageFailed && cardImageSrc || cdnFallback;
  const [hovered, setHovered] = useState(false);

  if (isSticker) {
    const stickerSrc = finalSrc;
    const stickerHasImage = stickerSrc && !localImageFailed;
    return (
      <div className="relative flex-shrink-0 select-none" style={{ width, aspectRatio: String(CARD_RATIO) }}>
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-start pt-[18%] z-1">
          {stickerHasImage &&
          <SafeImg src={stickerSrc} className="w-[55%] h-auto object-contain" onError={() => setLocalImageFailed(true)} />
          }
          <div className="w-full text-center px-3 mt-3">
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#ddd', fontSize: `${14 * cardScale}px` }}>
              {mod.name}
            </p>
            {mod.description &&
            <p className="leading-tight mt-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#999', fontSize: `${10 * cardScale}px` }}>
                {mod.description}
              </p>
            }
          </div>
        </div>
        {pricesLoading ?
        <span className="absolute top-1 right-1 z-10 animate-pulse bg-white/10 rounded px-1.5 py-0.5 inline-block w-6 h-3" /> :
        platValue > 0 &&
        <span className="absolute top-1 right-1 z-10 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">
          {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3 h-3 object-contain" alt="" />}
          {platValue}p
        </span>
        }
      </div>);

  }

  if (mod.unique_name?.includes('/Fusers/')) {
    const fuserImg = iconsPath ? convertFileSrc(`${iconsPath}/LegendaryCoreModImage.png`) : null;
    return (
      <div className="relative flex-shrink-0 select-none" style={{ width, aspectRatio: String(CARD_RATIO) }}>
        {fuserImg &&
        <div className="absolute inset-0 flex items-center justify-center p-[12%]">
            <SafeImg src={fuserImg} className="w-full h-full object-contain" />
          </div>
        }
        <div className="absolute bottom-[6%] left-0 right-0 text-center px-3">
          <p className="font-bold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: '#FFD700', fontSize: `${14 * cardScale}px` }}>{t('ui.mod_card.legendary_fusion_core')}

          </p>
        </div>
        {pricesLoading ?
        <span className="absolute top-1 right-1 z-10 animate-pulse bg-white/10 rounded px-1.5 py-0.5 inline-block w-6 h-3" /> :
        platValue > 0 &&
        <span className="absolute top-1 right-1 z-10 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">
          {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3 h-3 object-contain" alt="" />}
          {platValue}p
        </span>
        }
      </div>);

  }

  if (!framesPath) {
    return (
      <div className="rounded-xl border border-white/5 bg-kronos-panel/20 p-3 flex items-center gap-3" style={{ width, minHeight: width * 1.4 }}>
        <div className="w-10 h-10 flex-shrink-0"><Box className="text-kronos-panel w-full h-full" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ fontSize: `${10 * cardScale}px` }}>{mod.name}</p>
        </div>
      </div>);

  }

  const f = (file) => u(framesPath, mf, `${file}.png`);
  const tektolystBg = mf === 'Tektolyst' && mod.name ? f(mod.name.replace(/\s+/g, '')) : null;
  const arcaneBg = mf === 'Arcanes' && mod.rarity ? f(`Arcane${mod.rarity.charAt(0).toUpperCase()}${mod.rarity.slice(1)}`) : null;
  const bg = arcaneBg || tektolystBg || f('Background');
  const ft = custom ? null : f('FrameTop');
  const fb = custom ? null : f('FrameBottom');
  const sl = custom || NO_SIDE.has(mf) ? null : f('SideLight');
  const bk = custom && mf !== 'Requiem' && mf !== 'Antivirus' && mf !== 'Potency' ? null : !mod.baseDrain ? null : f('RightBacker');
  const lt = custom || hideCategory ? null : f('LowerTab');
  const cl = custom ? null : f('CornerLights');

  const rank = mod.rank ?? 0;
  const desc = (() => {
    if (mod.description && mod.description.length > 0) return mod.description;
    if (mod.levelStats && Array.isArray(mod.levelStats)) {
      const max = mod.levelStats[mod.levelStats.length - 1];
      if (max && Array.isArray(max.stats)) {
        const joined = max.stats.map((s) => s.replace(/<LINE_SEPARATOR>[\r\n]*/g, '')).join('\n');
        // DE ships augment descriptions with a redundant "<Name> Augment: "
        // prefix baked into the localized stats; strip it (the title already
        // shows the mod name).
        return joined.replace(/^[^\n]*? Augment: /, '');
      }
    }
    return '';
  })();
  const cat = mod.category || '';
  const displayCompleteLine = mod.max_rank > 0 && rank >= mod.max_rank && mf !== 'Arcanes' && (mf === 'Tektolyst' || mf === 'Antivirus' || mf === 'Potency' || mf === 'Requiem' || mf === 'Tome' || !custom);
  const completeLine = displayCompleteLine ? u(framesPath, mf, mf === 'Tektolyst' ? `RankCompleteLine${tektolystGroup}.png` : 'RankCompleteLine.png') : null;
  const hasDesc = desc && desc.length > 0;
  const contentBottom = mf === 'Requiem' ? 80 : mf === 'Antivirus' ? 110 : mf === 'Potency' ? 45 : mf === 'Tektolyst' ? 55 + (hasDesc ? 25 : 0) : 45 + (hasDesc ? 25 : 0);

  return (
    <div className="relative flex-shrink-0 select-none" style={{
      width,
      aspectRatio: String(CARD_RATIO),
      transform: hovered ? 'scale(1.06)' : 'scale(1)',
      transition: 'transform 0.2s ease-out'
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}>
      <Img src={bg} className="absolute inset-0 w-full h-full object-contain" style={{ zIndex: 1, objectPosition: mf === 'Arcanes' ? '50% 20%' : '50% 50%' }} />

      {mod.quantity > 1 && mf === 'Arcanes' &&
      <span className="absolute font-black pointer-events-none z-20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
      style={{
        top: `${35 * cardScale}px`,
        left: `${8 * cardScale}px`,
        color,
        fontSize: `${11 * cardScale}px`,
        textShadow: '0 1px 3px rgba(0,0,0,0.9)'
      }}>
          x{mod.quantity}
        </span>
      }

      {mod.quantity > 1 && mf !== 'Arcanes' && bk &&
      <>
          <Img src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ transform: 'scaleX(-1)', zIndex: 6 }} />
          <span className="absolute font-black pointer-events-none" style={{
          top: `${66.5 / CANVAS_H * 100}%`,
          left: `${34 / CANVAS_W * 100}%`,
          zIndex: 7,
          color: color,
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          fontSize: `${9 * cardScale}px`
        }}>
            {mod.quantity}
          </span>
        </>
      }

      {mf === 'Antivirus' ?
      <div className="absolute" style={{
        top: `${55 / CANVAS_H * 100}%`,
        left: `${26 / CANVAS_W * 100}%`,
        right: `${26 / CANVAS_W * 100}%`,
        bottom: 0,
        zIndex: 2
      }}>
          <div className="absolute inset-0 flex items-start justify-center" style={{ bottom: '70px' }}>
            {rank >= mod.max_rank ?
          <SafeImg src={f('Depleted')} className="w-2/5 h-auto object-contain" style={{ marginTop: '20%' }} /> :
          finalSrc ?
          <SafeImg src={finalSrc} className="w-2/5 h-auto object-contain" style={{ marginTop: '20%' }} onError={() => setLocalImageFailed(true)} /> :
          null}
          </div>
          <div className="absolute text-center" style={{ top: `${170 / CANVAS_H * 100}%`, left: 0, right: 0, padding: `${4 * cardScale}px ${4 * cardScale}px ${2 * cardScale}px` }}>
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color, fontSize: `${15 * cardScale}px` }}>
              {mod.name}
            </p>
            {hasDesc &&
          <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: color, fontSize: `${11 * cardScale}px` }}>
                {renderDesc(desc, color, iconsPath, tagIconMap)}
              </p>
          }
          </div>
        </div> :
      mf === 'Arcanes' ?
      <div className="absolute" style={{
        top: 10, left: `0%`, right: `0%`, bottom: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
          <div style={{ flex: '4 0 0' }} />
          <div className="flex items-start justify-center" style={{ width: '65%', flex: '0 0 auto' }}>
            {finalSrc ?
          <SafeImg src={finalSrc} className="w-full h-auto object-contain" onError={() => setLocalImageFailed(true)} /> :
          null}
          </div>
          <div style={{ flex: '3 0 0' }} />
          <div className="text-center" style={{ flex: '0 0 auto', width: '100%' }}>
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color, fontSize: `${13 * cardScale}px` }}>
              {mod.name}
            </p>
            {hasDesc &&
          <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: color, fontSize: `${10 * cardScale}px` }}>
                {renderDesc(desc, color, iconsPath, tagIconMap)}
              </p>
          }
            {mod.max_rank > 0 &&
          <>
                <p className="font-semibold uppercase tracking-wider mt-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: color, fontSize: `${10 * cardScale}px` }}>
                  {mod.arcaneType || cat}
                </p>
                <div className="flex justify-center mt-0.5" style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
                  <RankPips modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} cardWidth={width} />
                </div>
              </>
          }
          </div>
          <div style={{ flex: '1 0 0' }} />
        </div> :

      <div className="absolute flex flex-col" style={{
        top: `${55 / CANVAS_H * 100}%`,
        left: `${26 / CANVAS_W * 100}%`,
        right: `${26 / CANVAS_W * 100}%`,
        bottom: `${contentBottom / CANVAS_H * 100}%`,
        zIndex: 2
      }}>
          <div className="flex-1 overflow-hidden flex items-start justify-center">
            {rank >= mod.max_rank && (mf === 'Requiem' || mf === 'Potency') ?
          <SafeImg src={f('Depleted')} className="w-full h-full object-contain" style={mf === 'Potency' ? { transform: 'scale(1.1)', transformOrigin: 'center' } : undefined} onError={() => setLocalImageFailed(true)} /> :
          finalSrc && mf !== 'Tektolyst' ?
          mf === 'Requiem' ?
          <div className="flex items-start justify-center w-full pt-1" style={{ marginTop: '7%' }}>
                  <div style={{ width: '60%', aspectRatio: '1', backgroundColor: '#CC0000', maskImage: `url(${finalSrc})`, maskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskImage: `url(${finalSrc})`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat' }} />
                </div> :
          mf === 'Potency' ?
          <div className="w-full h-full overflow-hidden flex items-start justify-center">
                  <SafeImg src={finalSrc} className="object-cover flex-shrink-0" style={{ width: '96%' }} onError={() => setLocalImageFailed(true)} />
                </div> :

          <SafeImg src={finalSrc} className="w-full h-full object-cover" onError={() => setLocalImageFailed(true)} /> :

          null}
          </div>
          <div className="flex-shrink-0 text-center" style={{ padding: `${4 * cardScale}px ${4 * cardScale}px ${2 * cardScale}px` }}>
            <p className="font-bold leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color, fontSize: `${15 * cardScale}px` }}>
              {iconsPath && mod.unique_name?.includes('/PvPMods/') &&
            <SafeImg src={convertFileSrc(`${iconsPath}/Categories/Conclave.png`)} className="inline-block w-4 h-4 align-middle mr-1" />
            }
              {mod.name}
            </p>
            {hasDesc &&
          <p className="leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Outfit, sans-serif', color: color, fontSize: `${11 * cardScale}px` }}>
                {renderDesc(desc, color, iconsPath, tagIconMap)}
              </p>
          }
          </div>
        </div>
      }

      {!custom && mf !== 'Arcanes' && <>
        <Img src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={sl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} />
        <Img src={ft} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={fb} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={bk} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={lt} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3 }} />
        <Img src={cl} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, transform: 'scaleX(-1)' }} />
      </>}

      {(() => {
        const setFile = mod.modSet ? getSetFileName(mod.modSet, mod.name) : null;
        if (!setFile) return null;
        const setBgSrc = u(framesPath, 'Sets', setFile);
        const rarityFilter = SET_RARITY_FILTERS[mod.rarity] || null;
        return <SafeImg src={setBgSrc} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 3, filter: rarityFilter }} />;
      })()}

      {!custom && mod.polarity && POLARITY_FILES[mod.polarity] &&
      <SafeImg src={u(iconsPath, '', POLARITY_FILES[mod.polarity])} style={{
        position: 'absolute', top: `${69 / CANVAS_H * 100}%`, right: `${30 / CANVAS_W * 100}%`,
        width: `${17 / CANVAS_W * 100}%`, zIndex: 4, pointerEvents: 'none',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))'
      }} />
      }

      {!custom && mod.baseDrain > 0 &&
      <span className="absolute font-bold pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" style={{
        top: `${72 / CANVAS_H * 100}%`, right: `${50 / CANVAS_W * 100}%`,
        zIndex: 4, color: color, fontFamily: 'Outfit, sans-serif',
        fontSize: `${9 * cardScale}px`, lineHeight: 1, textAlign: 'right'
      }}>
          {mod.baseDrain + rank}
        </span>
      }

      {cat && mf !== 'Arcanes' && !hideCategory &&
      <div className="absolute text-center pointer-events-none" style={{ left: 0, right: 0, bottom: mf === 'Antivirus' ? `${55 / CANVAS_H * 100}%` : mf === 'Potency' ? `${26 / CANVAS_H * 100}%` : mf === 'Tektolyst' ? `${48 / CANVAS_H * 100}%` : `${38 / CANVAS_H * 100}%`, zIndex: 4 }}>
          <p className="font-semibold uppercase tracking-wider drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" style={{ fontFamily: 'Outfit, sans-serif', color: mf === 'Potency' ? '#FFD700' : color, fontSize: `${11 * cardScale}px` }}>
            {cat}
          </p>
        </div>
      }

      <Img src={completeLine} className="absolute inset-0 w-full h-full object-contain pointer-events-none" style={{ zIndex: 4 }} />

      {pricesLoading ?
      <span className="absolute top-1 right-1 z-10 animate-pulse bg-white/10 rounded px-1.5 py-0.5 inline-block w-6 h-3" /> :
      platValue > 0 &&
      <span className="absolute top-1 right-1 z-10 flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-300">
          {iconSrc('Platinum') && <img src={iconSrc('Platinum')} className="w-3 h-3 object-contain" alt="" />}
          {platValue}p
        </span>
      }

      {mod.max_rank > 0 && !custom && mf !== 'Arcanes' &&
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '0%', zIndex: 5 }}>
          <RankPips modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} cardWidth={width} />
        </div>
      }

      {mod.max_rank > 0 && custom && (mf === 'Requiem' || mf === 'Antivirus' || mf === 'Potency') &&
      <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: mf === 'Antivirus' ? '20%' : mf === 'Potency' ? '0%' : '13.5%', zIndex: 5 }}>
          <Charges modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} cardWidth={width} />
        </div>
      }

      {mf === 'Tektolyst' &&
      <>
          {tektolystGroup &&
        <Img src={u(framesPath, mf, `${tektolystGroup}.png`)} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 4, objectFit: 'contain' }} />
        }
          {mod.max_rank > 0 &&
        <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none" style={{ bottom: '2%', zIndex: 5 }}>
              <RankPips modFrame={mf} rank={rank} maxRank={mod.max_rank} framesPath={framesPath} pipColorGroup={tektolystGroup} cardWidth={width} />
            </div>
        }
        </>
      }
    </div>);

});

export default ModCard;
