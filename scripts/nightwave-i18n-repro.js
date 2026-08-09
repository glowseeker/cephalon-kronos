// Nightwave dashboard localization repro — verifies the parser's Nightwave
// season-name extraction + localized fallback for all 15 locales against the
// real game dict labels (DE public manifest), and the dashboard i18n keys.
//
// Usage: node scripts/nightwave-i18n-repro.js
// Requires: the game dicts on disk (dict.{locale}.json) — pass the directory
// via GAME_DICT_DIR env or it defaults to the kronosresources senpai export.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const REPO = path.resolve(__dirname, '..');

// Bundle the parser so the extensionless ./warframeUtils import resolves in node.
const esbuildBin = [
  path.join(REPO, 'node_modules', '.pnpm'),
].flatMap((pnpmRoot) => {
  try {
    return readFileSync(path.join(pnpmRoot, '.modules.yaml'), 'utf8') ? [] : [];
  } catch { return []; }
});
const { execFileSync } = await import('node:child_process');

const esbuildCandidates = [];
try {
  const { readdirSync } = await import('node:fs');
  const pnpmRoot = path.join(REPO, 'node_modules', '.pnpm');
  for (const dir of readdirSync(pnpmRoot)) {
    if (dir.startsWith('esbuild@')) {
      esbuildCandidates.push(path.join(pnpmRoot, dir, 'node_modules', 'esbuild', 'bin', 'esbuild'));
    }
  }
} catch { /* no pnpm store */ }

let esbuild = esbuildCandidates[0];
if (!esbuild) {
  try { esbuild = require.resolve('esbuild/bin/esbuild'); } catch { /* not found */ }
}
if (!esbuild) {
  console.error('esbuild not found — cannot bundle parser for repro');
  process.exit(2);
}

const bundleOut = path.join('/tmp', 'ws_parser_nw.cjs');
execFileSync(esbuild, [
  path.join(REPO, 'src', 'lib', 'worldstateParser.js'),
  '--bundle', '--format=cjs', '--platform=node', `--outfile=${bundleOut}`, '--external:*.json',
], { stdio: 'pipe' });

const { extractNightwaveSeason, parseWorldstate } = require(bundleOut);

const GAME_DICT_DIR = process.env.GAME_DICT_DIR || '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai';
const LOCALES = ['en','de','fr','es','it','pt','tr','ru','uk','pl','tc','zh','ko','ja','th'];
const CREED_KEY = '/Lotus/Language/NightwaveSeasonThree/NoraIntermissionFourteenCreds';
const LEGION_KEY = '/Lotus/Language/Syndicates/RadioLegionTitle';

const dicts = {};
for (const loc of LOCALES) {
  dicts[loc] = JSON.parse(readFileSync(path.join(GAME_DICT_DIR, `dict.${loc}.json`), 'utf8'));
}

// ── 1. Season-name extraction from the real current-season cred label ──
const EXPECT_SEASON = {
  en: 'Dreams of the Dead', de: 'Träume der Toten', fr: 'Rêves des Morts',
  es: 'Sueños de los Muertos', it: 'Sogni dei Morti', pt: 'Sonhos dos Mortos',
  tr: 'Ölülerin Hayalleri', ru: 'Сны мёртвых', uk: 'Сни мерців',
  pl: 'Snów o Umarłych', tc: 'Nora 合輯之亡靈夢', zh: '亡者之梦',
  ko: '죽은 자의 꿈', ja: '死者の夢', th: 'Dreams of the Dead',
};

// ── 2. Full parseWorldstate path (SeasonInfo + cred reward) ──
const RAW = {
  SeasonInfo: {
    _id: { $oid: 'abc' }, Activation: { $date: { $numberLong: '1700000000000' } },
    Expiry: { $date: { $numberLong: '1800000000000' } },
    Season: 'Intermission14', Phase: 1, Params: {}, AffiliationTag: 'RadioLegionIntermission14Syndicate',
  },
};
const REWARDS = [{
  uniqueName: '/Lotus/Types/Items/MiscItems/NoraIntermissionFourteenCreds',
  name: '/Lotus/Language/NightwaveSeasonThree/NoraIntermissionFourteenCreds',
  itemCount: 150,
}];

let pass = 0, fail = 0;
const failures = [];

// Extraction unit checks
for (const loc of LOCALES) {
  const label = dicts[loc][CREED_KEY] || '';
  const got = extractNightwaveSeason(label, loc);
  if (got === EXPECT_SEASON[loc]) pass++;
  else { fail++; failures.push(`extract ${loc}: got "${got}", want "${EXPECT_SEASON[loc]}"`); }
}

// Full parse checks
for (const loc of LOCALES) {
  const out = parseWorldstate(RAW, {
    dict: dicts[loc], ENWRawRewards: REWARDS, locale: loc,
    EI: {}, ERg: {}, EC: {}, ExportImages: {}, nameToImage: {}, uniqueNameToName: {},
  });
  const nw = out.nightwave;
  if (nw?.name === EXPECT_SEASON[loc] && nw?.credType === REWARDS[0].uniqueName) pass++;
  else { fail++; failures.push(`parse ${loc}: name="${nw?.name}" credType="${nw?.credType}"`); }
}

// Fallback (no cred reward) — must give the localized Nightwave title
const EXPECT_FALLBACK = {
  en: 'Nightwave', de: 'Nightwave', fr: 'Ondes Nocturnes', es: 'Onda Nocturna',
  it: 'Nightwave', pt: 'Nightwave', tr: 'Nightwave', ru: 'Ночная Волна',
  uk: 'Нічна хвиля', pl: 'Gwiezdny Szlak', tc: '午夜電波', zh: '午夜电波',
  ko: '나이트웨이브', ja: 'Nightwave', th: 'Nightwave',
};
for (const loc of LOCALES) {
  const out = parseWorldstate({ SeasonInfo: RAW.SeasonInfo }, {
    dict: dicts[loc], ENWRawRewards: [], locale: loc,
    EI: {}, ERg: {}, EC: {}, ExportImages: {}, nameToImage: {}, uniqueNameToName: {},
  });
  const got = out.nightwave?.name;
  if (got === EXPECT_FALLBACK[loc]) pass++;
  else { fail++; failures.push(`fallback ${loc}: got "${got}", want "${EXPECT_FALLBACK[loc]}"`); }
}

// ── 3. Dashboard i18n keys use the game terms ──
const I18N_DIR = path.join(REPO, 'src', 'lib', 'i18n');
const EXPECT_KEYS = {
  fr: { 'ui.dashboard.nightwave': 'Ondes Nocturnes', 'ui.dashboard.creds': 'Jetons', 'ui.dashboard.nightwave_inactive': 'Ondes Nocturnes inactives…' },
  es: { 'ui.dashboard.nightwave': 'Onda Nocturna', 'ui.dashboard.creds': 'Respeto' },
  ru: { 'ui.dashboard.nightwave': 'Ночная волна', 'ui.dashboard.creds': 'Доверие' },
  pl: { 'ui.dashboard.nightwave': 'Gwiezdny Szlak', 'ui.dashboard.creds': 'Kredyty' },
  zh: { 'ui.dashboard.nightwave': '午夜电波', 'ui.dashboard.creds': '代币' },
  tc: { 'ui.dashboard.nightwave': '午夜電波', 'ui.dashboard.creds': '幣' },
};
for (const [loc, expects] of Object.entries(EXPECT_KEYS)) {
  const data = JSON.parse(readFileSync(path.join(I18N_DIR, `${loc}.json`), 'utf8'));
  for (const [k, want] of Object.entries(expects)) {
    const got = data.ui?.[k];
    if (got === want) pass++;
    else { fail++; failures.push(`i18n ${loc}.${k}: got "${got}", want "${want}"`); }
  }
}

console.log(`nightwave-i18n-repro: PASS ${pass}  FAIL ${fail}`);
if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
