// OCR localization repro — verifies riven-card stat parsing for all 15 locales.
//
// Usage: node scripts/riven-ocr-repro.js
// Requires: nothing beyond Node 18+ (uses the bundled i18n JSON and the
// rivenOcrI18n module directly).
//
// Covers:
//   1. Alias resolution — every locale's GAME_STAT_ALIASES + i18n rivenStats
//      table resolves real in-game stat terms (from DE manifest levelStats) to
//      the correct pricer value.
//   2. End-to-end parseRivenOcr — simulated card text per locale (incl. Thai's
//      name-first "โอกาสคริติคอล +165%" format) parses to the expected stats.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..', 'src', 'lib');

// Load the module under test (ESM).
const ocr = await import(path.join(BASE, 'rivenOcrI18n.js'));

const LOCALES = ['en','de','fr','es','it','pt','tr','ru','uk','pl','tc','zh','ko','ja','th'];

const tables = {};
for (const loc of LOCALES) {
  const data = JSON.parse(readFileSync(path.join(BASE, 'i18n', `${loc}.json`), 'utf8'));
  tables[loc] = data.rivenStats || {};
}

// ── 1. Alias resolution cases (term → English stat), manifest-verified ──
// Terms are the literal strings that appear on riven-card stat lines.
const ALIAS_CASES = {
  de: [['Krit. Chance','Critical Chance'],['Nahkampfschaden','Melee Damage'],['Durchschlag','Puncture'],['Schnitt','Slash'],['Feuerrate','Fire Rate'],['Durchdringung','Punch Through'],['Kombo-Zähler Chance','Combo Count Chance']],
  fr: [['Chance de critique','Critical Chance'],['Tir Multiple','Multishot'],['Tranchant','Slash'],['Cadence de Tir','Fire Rate'],['Pénétration','Punch Through']],
  it: [['Probabilità Critico','Critical Chance'],['Danno corpo a corpo','Melee Damage'],['Cadenza di Tiro','Fire Rate'],['Attraversamento','Punch Through']],
  es: [['probabilidad crítica','Critical Chance'],['daño cuerpo a cuerpo','Melee Damage'],['cadencia de fuego','Fire Rate'],['atravesar','Punch Through']],
  pl: [['Szansa Statusu','Status Chance'],['Obrażeń w Walce Wręcz','Melee Damage'],['Szybkostrzelności','Fire Rate'],['Przeb. na wylot','Punch Through']],
  uk: [['до ймовірності накладання ефекту стану','Status Chance'],['до шкоди від атак ближнього бою','Melee Damage'],['до швидкострільності','Fire Rate'],['до пробивання','Punch Through']],
  tr: [['Kritik Şans','Critical Chance'],['Yakın Hasar','Melee Damage'],['Ateş Hızı','Fire Rate'],['Delip Geçme','Punch Through']],
  pt: [['Chance de Status','Status Chance'],['Ígneo','Heat'],['Elétrico','Electricity'],['Glacial','Cold'],['Tóxico','Toxin'],['Cortante','Slash'],['Perfurante','Puncture'],['Colisivo','Impact'],['Cadência de Tiro','Fire Rate'],['Dano da Finalização','Finisher Damage'],['Alcance da Explosão','Blast Radius'],['Penetração','Punch Through'],['Dano contra Corpus','Damage to Corpus'],['Chance de Incrementar o Combo','Combo Count Chance']],
  ru: [['к шансу статуса','Status Chance'],['урона','Damage'],['к вместимости магазина','Magazine Capacity'],['крит. урона','Critical Damage'],['урона электричеством','Electricity'],['урона огнем','Heat'],['урона токсином','Toxin'],['урона холодом','Cold'],['разрезающего урона','Slash'],['пронзающего урона','Puncture'],['ударного урона','Impact'],['к скорострельности','Fire Rate'],['шанс крит. урона','Critical Chance'],['к отдаче','Recoil'],['к стартовому счётчику комбо','Initial Combo'],['урона Корпусу','Damage to Corpus'],['урона Гринир','Damage to Grineer'],['урона Заражённым','Damage to Infested']],
  tc: [['觸發機率','Status Chance'],['傷害','Damage'],['彈匣容量','Magazine Capacity'],['暴擊傷害','Critical Damage'],['電擊傷害','Electricity'],['裝填速度','Reload Speed'],['火焰傷害','Heat'],['毒素傷害','Toxin'],['近戰傷害','Melee Damage'],['冰凍傷害','Cold'],['切割傷害','Slash'],['多重射擊','Multishot'],['穿刺傷害','Puncture'],['衝擊傷害','Impact'],['射速','Fire Rate'],['暴擊機率','Critical Chance'],['武器後座力','Recoil'],['穿透','Punch Through'],['處決傷害','Finisher Damage'],['爆炸範圍','Blast Radius'],['連擊數機率','Combo Count Chance'],['對 Corpus 傷害','Damage to Corpus'],['光束範圍','Beam Length']],
  zh: [['触发几率','Status Chance'],['伤害','Damage'],['电击伤害','Electricity'],['火焰伤害','Heat'],['毒素伤害','Toxin'],['冰冻伤害','Cold'],['切割伤害','Slash'],['穿刺伤害','Puncture'],['冲击伤害','Impact'],['射速','Fire Rate'],['暴击几率','Critical Chance'],['武器后坐力','Recoil'],['弹药最大值','Ammo Maximum'],['触发时间','Status Duration'],['处决伤害','Finisher Damage'],['爆炸半径','Blast Radius'],['连击数几率','Combo Count Chance'],['对 Corpus 的伤害','Damage to Corpus'],['光束范围','Beam Length']],
  ko: [['상태 이상 확률','Status Chance'],['피해','Damage'],['치명타 피해','Critical Damage'],['베기','Slash'],['연사력','Fire Rate'],['탄약 최대량','Ammo Maximum'],['발사체 속도','Projectile Speed'],['상태 이상 지속 시간','Status Duration'],['확대율 증가','Zoom'],['마무리 일격 피해','Finisher Damage'],['폭발 범위','Blast Radius'],['두께 꿰뚫기','Punch Through'],['콤보 카운트 확률','Combo Count Chance'],['코퍼스에 대한 피해','Damage to Corpus'],['그리니어에 대한 피해','Damage to Grineer'],['인페스티드에 대한 피해','Damage to Infested'],['빔 사거리','Beam Length']],
  ja: [['状態異常確率','Status Chance'],['ダメージ','Damage'],['マガジンサイズ','Magazine Capacity'],['火炎','Heat'],['毒','Toxin'],['冷気','Cold'],['切断','Slash'],['貫通','Puncture'],['衝撃','Impact'],['発射速度','Fire Rate'],['クリティカル率','Critical Chance'],['リコイル','Recoil'],['弾薬所持上限','Ammo Maximum'],['弾速','Projectile Speed'],['状態異常の持続時間','Status Duration'],['ズーム','Zoom'],['追撃ダメージ','Finisher Damage'],['爆破範囲','Blast Radius'],['射程','Range'],['貫通距離','Punch Through'],['コンボ持続時間','Combo Duration'],['初期コンボ','Initial Combo'],['コンボカウント率','Combo Count Chance'],['対コーパスダメージ','Damage to Corpus'],['対グリニアダメージ','Damage to Grineer'],['対感染体ダメージ','Damage to Infested'],['ビーム範囲','Beam Length']],
  th: [['โอกาสสถานะ','Status Chance'],['ความเสียหาย','Damage'],['ความจุแม็กกาซีน','Magazine Capacity'],['ความเสียหายคริติคอล','Critical Damage'],['ไฟฟ้า','Electricity'],['ความเร็วในการรีโหลด','Reload Speed'],['ไฟ','Heat'],['พิษ','Toxin'],['ความเสียหายระยะประชิด','Melee Damage'],['น้ำแข็ง','Cold'],['เฉือนฟัน','Slash'],['มัลติช็อต','Multishot'],['การเจาะ','Puncture'],['การกระแทก','Impact'],['อัตราการยิง','Fire Rate'],['โอกาสคริติคอล','Critical Chance'],['แรงถีบของอาวุธ','Recoil'],['กระสุนสูงสุด','Ammo Maximum'],['ความเร็วกระสุน','Projectile Speed'],['ระยะเวลาของสถานะ','Status Duration'],['ความเร็วในการโจมตี','Attack Speed'],['ซูม','Zoom'],['ความเสียหายจากท่าฟินิชเชอร์','Finisher Damage'],['ระยะการระเบิด','Blast Radius'],['ระยะ','Range'],['เจาะทะลุ','Punch Through'],['ระยะเวลาคอมโบ','Combo Duration'],['คอมโบเริ่มต้น','Initial Combo'],['โอกาสในการนับคอมโบ','Combo Count Chance'],['สร้างความเสียหายต่อ Corpus','Damage to Corpus'],['สร้างความเสียหายต่อ Grineer','Damage to Grineer'],['สร้างความเสียหายต่อ Infested','Damage to Infested'],['โอกาสคริติคอลขณะไถล','Slide Crit Chance'],['ระยะลำแสง','Beam Length'],['ประสิทธิภาพคอมโบ','Combo Efficiency']],
};

// ── 2. End-to-end parse cases (simulated card text per locale) ──
const CARD_CASES = {
  de:  ['| Aksomati | MR 16 | +165% Krit. Chance | +275% Schaden | -66% Waffenrückstoss |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  fr:  ['| Aksomati | MR 16 | +165% Chance de critique | +275% Dégâts | -66% Recul de l\'Arme |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  it:  ['| Aksomati | MR 16 | +165% Probabilità Critico | +275% Danno | -66% Rinculo |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  es:  ['| Aksomati | MR 16 | +165% probabilidad crítica | +275% daño | -66% retroceso |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  pl:  ['| Aksomati | MR 16 | +165% Szansy Obrażeń Krytycznych | +275% Obrażeń | -66% Odrzut Broni |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  uk:  ['| Aksomati | MR 16 | +165% до ймовірності критичної шкоди. | +275% до шкоди | -66% до віддачі. |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  tr:  ['| Aksomati | MR 16 | +165% Kritik Şans | +275% Hasar | -66% Geri dönüş |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  pt:  ['| Aksomati | MR 16 | +165% de Chance Crítica | +275% de Dano | -66% de Recuo da Arma |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  ru:  ['| Aksomati | MR 16 | +165% шанс крит. урона | +275% урона | -66% к отдаче |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  tc:  ['| Aksomati | MR 16 | +165% 暴擊機率 | +275% 傷害 | -66% 武器後座力 |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  zh:  ['| Aksomati | MR 16 | +165% 暴击几率 | +275% 伤害 | -66% 武器后坐力 |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  ko:  ['| Aksomati | MR 16 | +165% 치명타 확률 | +275% 피해 | -66% 반동 |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  ja:  ['| Aksomati | MR 16 | +165% クリティカル率 | +275% ダメージ | -66% リコイル |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
  // Thai riven cards render the stat name *before* the value.
  th:  ['| Aksomati | MR 16 | โอกาสคริติคอล +165% | ความเสียหาย +275% | แรงถีบของอาวุธ -66% |',
        ['critical_chance','base_damage_/_melee_damage','recoil']],
};

let pass = 0, fail = 0;
const failures = [];

// Alias resolution
for (const [loc, cases] of Object.entries(ALIAS_CASES)) {
  const aliases = ocr.buildStatAliases(loc, tables[loc]);
  for (const [term, expected] of cases) {
    const want = ocr.STAT_TO_PRICER[expected];
    const got = ocr.cleanStatName(term, aliases);
    if (got === want) pass++;
    else { fail++; failures.push(`alias ${loc}: "${term}" → "${got}", want "${want}"`); }
  }
}

// End-to-end parse
for (const [loc, [text, want]] of Object.entries(CARD_CASES)) {
  const aliases = ocr.buildStatAliases(loc, tables[loc]);
  const garbageRe = ocr.garbageReForLocale(loc);
  const parsed = ocr.parseRivenOcr(text, garbageRe, loc);
  const got = (parsed?.stats || []).map(s => ocr.cleanStatName(s.name, aliases));
  if (JSON.stringify(got) === JSON.stringify(want)) pass++;
  else { fail++; failures.push(`parse ${loc}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}

console.log(`riven-ocr-repro: PASS ${pass}  FAIL ${fail}`);
if (failures.length) {
  console.log(failures.join('\n'));
  process.exit(1);
}
