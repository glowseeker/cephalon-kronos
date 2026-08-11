// Onboarding language picker: 15 game-locale flags with native labels.
// Uses country-flag-icons (ISO 3x2 SVG React components, bundled offline  -  no CDN,
// no Windows regional-indicator emoji regression). Replaces hand-rolled inline SVGs.
import React from 'react'
import { GB, DE, FR, ES, IT, PT, RU, PL, CN, KR, JP, TW, TH, TR, UA } from 'country-flag-icons/react/3x2'

const FLAG = { gb: GB, de: DE, fr: FR, es: ES, it: IT, pt: PT, ru: RU, pl: PL, zh: CN, ko: KR, ja: JP, tc: TW, th: TH, tr: TR, uk: UA }

const LOCALES = [
  { value: 'en', label: 'English', flag: 'gb' },
  { value: 'de', label: 'Deutsch', flag: 'de' },
  { value: 'fr', label: 'Français', flag: 'fr' },
  { value: 'es', label: 'Español', flag: 'es' },
  { value: 'it', label: 'Italiano', flag: 'it' },
  { value: 'pt', label: 'Português', flag: 'pt' },
  { value: 'ru', label: 'Русский', flag: 'ru' },
  { value: 'pl', label: 'Polski', flag: 'pl' },
  { value: 'zh', label: '中文', flag: 'zh' },
  { value: 'ko', label: '한국어', flag: 'ko' },
  { value: 'ja', label: '日本語', flag: 'ja' },
  { value: 'tc', label: '繁體中文', flag: 'tc' },
  { value: 'th', label: 'ไทย', flag: 'th' },
  { value: 'tr', label: 'Türkçe', flag: 'tr' },
  { value: 'uk', label: 'Українська', flag: 'uk' },
]

export default function LanguagePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {LOCALES.map(l => {
        const FlagIcon = FLAG[l.flag]
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            className={`flex flex-col items-center gap-1.5 rounded-lg border px-1 py-2 transition-all ${
              value === l.value
                ? 'border-kronos-accent bg-kronos-accent/10'
                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
            }`}
          >
            <span className="w-8 h-5 rounded-[3px] overflow-hidden shadow ring-1 ring-black/30">
              <FlagIcon className="w-full h-full" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-kronos-text/80 leading-none">
              {l.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
