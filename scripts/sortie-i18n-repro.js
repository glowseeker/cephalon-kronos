#!/usr/bin/env node
// ── Sortie + Bossi18n repro ──────────────────────────────────────────────
// Verifies that sortie bosses and modifiers resolve from per-locale
// translation tables (sortieTranslations.js) instead of English-only
// GeneralOverrides.  Uses real game dict files + live worldstate.
//
// Run: node scripts/sortie-i18n-repro.js
import fs from 'node:fs';
import path from 'node:path';
import { resolveNode, resolveRewardText } from '../src/lib/warframeUtils.js';

const RES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai';
const LOCALES = ['en','de','fr','es','it','pt','tr','ru','uk','pl','tc','zh','ko','ja','th'];

let PASS = 0, FAIL = 0;
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (ok) { PASS++; }
  else { FAIL++; console.log(`  FAIL: ${label}\n    got:      ${JSON.stringify(actual)}\n    expected: ${JSON.stringify(expected)}`); }
};

// ── 1. Sortie bosses resolve per-locale ─────────────────────────────────
const bossKey = 'SORTIE_BOSS_CORRUPTED_VOR';
const bossEn = resolveNode(bossKey, {}, {}, 'en');
const bossFr = resolveNode(bossKey, {}, {}, 'fr');
check('sortie boss EN', bossEn, 'Captain Vor');
check('sortie boss FR', bossFr, 'Vor Corrompu');

// Verify the full boss list translates for FR (game expects "Capitaine Vor")
const frBosses = {
  SORTIE_BOSS_VOR: 'Capitaine Vor',
  SORTIE_BOSS_HEK: "Councilor Vay Hek",
  SORTIE_BOSS_RUK: 'General Sargas Ruk',
  SORTIE_BOSS_KELA: 'Kela De Thaym',
  SORTIE_BOSS_JACKAL: 'Jackal',
  SORTIE_BOSS_KRIL: 'Lech Kril',
  SORTIE_BOSS_TYL: 'Tyl Regor',
  SORTIE_KRIL: 'Lech Kril',
};
check('boss vor FR matches game', resolveNode('SORTIE_BOSS_VOR', {}, {}, 'fr'), 'Capitaine Vor');
check('boss hek FR (no game loc)', resolveNode('SORTIE_BOSS_HEK', {}, {}, 'fr'), 'Councilor Vay Hek');
check('boss corrupted vor FR matches dict', resolveNode('SORTIE_BOSS_CORRUPTED_VOR', {}, {}, 'fr'), 'Vor Corrompu');

// ── 2. Sortie modifiers resolve per-locale ─────────────────────────────
const modEn = resolveNode('SORTIE_MODIFIER_LOW_ENERGY', {}, {}, 'en');
const modFr = resolveNode('SORTIE_MODIFIER_LOW_ENERGY', {}, {}, 'fr');
check('sortie modifier EN', modEn, 'Energy Reduction');
check('sortie modifier FR', modFr, "Réduction d'énergie");

check('modifier eximus FR', resolveNode('SORTIE_MODIFIER_EXIMUS', {}, {}, 'fr'), 'Forteresse Eximus');
check('modifier bow FR', resolveNode('SORTIE_MODIFIER_BOW_ONLY', {}, {}, 'fr'), "Restriction d'arme: Arcs uniquement");
check('modifier shields FR', resolveNode('SORTIE_MODIFIER_SHIELDS', {}, {}, 'fr'), 'Boucliers ennemis augmentés');
check('modifier poison FR', resolveNode('SORTIE_MODIFIER_POISON', {}, {}, 'fr'), "Amélioration élémentaire des ennemis: Poison");
check('modifier hazard_fire FR', resolveNode('SORTIE_MODIFIER_HAZARD_FIRE', {}, {}, 'fr'), 'Danger environnemental: Feu');
check('modifier hazard_magnetic FR', resolveNode('SORTIE_MODIFIER_HAZARD_MAGNETIC', {}, {}, 'fr'), 'Danger environnemental: Anomalies électromagnétiques');

// ── 3. All 30 modifiers + 20 bosses have a translation for every locale ──
const allModKeys = [
  'SORTIE_MODIFIER_LOW_ENERGY','SORTIE_MODIFIER_IMPACT','SORTIE_MODIFIER_SLASH','SORTIE_MODIFIER_PUNCTURE','SORTIE_MODIFIER_EXIMUS',
  'SORTIE_MODIFIER_MAGNETIC','SORTIE_MODIFIER_CORROSIVE','SORTIE_MODIFIER_VIRAL','SORTIE_MODIFIER_ELECTRICITY','SORTIE_MODIFIER_RADIATION',
  'SORTIE_MODIFIER_GAS','SORTIE_MODIFIER_FIRE','SORTIE_MODIFIER_EXPLOSION','SORTIE_MODIFIER_FREEZE','SORTIE_MODIFIER_TOXIN',
  'SORTIE_MODIFIER_POISON','SORTIE_MODIFIER_HAZARD_RADIATION','SORTIE_MODIFIER_HAZARD_MAGNETIC','SORTIE_MODIFIER_HAZARD_FOG','SORTIE_MODIFIER_HAZARD_FIRE',
  'SORTIE_MODIFIER_HAZARD_ICE','SORTIE_MODIFIER_HAZARD_COLD','SORTIE_MODIFIER_ARMOR','SORTIE_MODIFIER_SHIELDS','SORTIE_MODIFIER_SECONDARY_ONLY',
  'SORTIE_MODIFIER_SHOTGUN_ONLY','SORTIE_MODIFIER_SNIPER_ONLY','SORTIE_MODIFIER_RIFLE_ONLY','SORTIE_MODIFIER_MELEE_ONLY','SORTIE_MODIFIER_BOW_ONLY',
];
const allBossKeys = [
  'SORTIE_BOSS_VOR','SORTIE_BOSS_HEK','SORTIE_BOSS_RUK','SORTIE_BOSS_KELA','SORTIE_BOSS_JACKAL','SORTIE_BOSS_KRIL','SORTIE_BOSS_TYL',
  'SORTIE_BOSS_ALAD','SORTIE_BOSS_AMBULAS','SORTIE_BOSS_NEF','SORTIE_BOSS_RAPTOR','SORTIE_BOSS_PHORID','SORTIE_BOSS_LEPHANTIS',
  'SORTIE_BOSS_INFALAD','SORTIE_BOSS_HYENA','SORTIE_BOSS_CORRUPTED_VOR','SORTIE_BOSS_BOREAL','SORTIE_BOSS_AMAR','SORTIE_BOSS_NIRA','SORTIE_BOSS_PAAZUL',
];

let missing = 0;
for (const loc of LOCALES) {
  for (const k of allModKeys) {
    const r = resolveNode(k, {}, {}, loc);
    if (!r || r === k) { missing++; if (missing <= 5) console.log(`  MISSING: ${loc} ${k}`); }
  }
  for (const k of allBossKeys) {
    const r = resolveNode(k, {}, {}, loc);
    if (!r || r === k) { missing++; if (missing <= 5) console.log(`  MISSING: ${loc} ${k}`); }
  }
}
check('all sortie keys have translations (missing count)', missing, 0);

// ── 4. Invasion blueprints resolve via BLUEPRINT_TEMPLATE ───────────────
const dict = {
  ...jsonLoad('dict.fr.json'),
  '/Lotus/Language/Weapons/LatronWraithName': 'Latron Wraith',
  '/Lotus/Language/Weapons/SnipetronVandalName': 'Snipetron Vandal',
  '/Lotus/Language/events/WaterFightBucks': 'Perles de Nakak',
};
const rewardBp = {
  items: ['/Lotus/Weapons/Grineer/Rifles/RifleKuva/LatronWraith_BP'],
};
check('Latron Wraith BP FR', resolveRewardText(rewardBp, dict, {}, {}, ', ', 'fr'), 'Schéma de Latron Wraith');

const rewardSnip = {
  items: ['/Lotus/Weapons/Corpus/Rifles/Snipetron/SnipetronVandal_BP'],
};
check('Snipetron Vandal BP FR', resolveRewardText(rewardSnip, dict, {}, {}, ', ', 'fr'), 'Schéma de Snipetron Vandal');

const rewardPearls = {
  countedItems: [{ ItemType: '/Lotus/Types/Items/MiscItems/WaterFightBucks', ItemCount: 75 }],
};
check('Nakak Pearls FR', resolveRewardText(rewardPearls, dict, {}, {}, ', ', 'fr'), '75× Perles de Nakak');

// ── 5. Event glyph resolves via AvatarImage path ───────────────────────
const rewardGlyph = {
  items: ['/Lotus/StoreItems/Types/StoreItems/AvatarImages/AvatarImageDogDaysErraGlyph'],
};
check('Dog Days Erra Glyph (no dict key)', resolveRewardText(rewardGlyph, dict, {}, {}, ', ', 'fr'), 'Dog Days Erra Glyph');

// ── 6. Nightwave still works (regression) ──────────────────────────────
// Already covered by nightwave-i18n-repro.js, quick sanity:
const dictFr = jsonLoad('dict.fr.json');
check('Nightwave FR season', resolveNode('/Lotus/Language/Syndicates/RadioLegionTitle', dictFr, {}, 'fr'), 'Ondes Nocturnes');

console.log(`\n${PASS} passed, ${FAIL} failed`);
process.exit(FAIL > 0 ? 1 : 0);

// ── helpers ────────────────────────────────────────────────────────────
function jsonLoad(rel) {
  return JSON.parse(fs.readFileSync(path.join(RES, rel), 'utf8'));
}
