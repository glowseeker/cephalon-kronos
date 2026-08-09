import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// Per-locale translations for ALL remaining EN ui.relics.* keys
// These are UI-authored labels (Path B) - not game-sourced
const uiRelicsTrans = {
    fr: {
        'relics.exp_ducats': 'DUCATS GAGNÉS',
        'relics.exp_plat': 'PLATIN GAGNÉ',
        'relics.gain_ducats': 'GAIN (D)',  // These are format-style; keep format but translate
        'relics.gain_plat': 'GAIN (P)',
        'relics.era': 'Époque :',
        'relics.squad': 'Escouade',
        'relics.owned': 'Possédé :',
        'relics.target': 'Cible',
        'relics.sorting_by': 'Trier par',
        'relics.refinement_exceptional': 'Exceptionnelle',
        'relics.refinement_flawless': 'Parfaite',
        'relics.refinement_radiant': 'Radiante',
        'relics.all': 'Tous',
        'relics.other': 'Autre',
        'relics.refinement_intact': 'Intact',
    },
    de: {
        'relics.exp_ducats': 'EXP DUKATEN',
        'relics.exp_plat': 'EXP PLATIN',
        'relics.gain_ducats': 'GEWINN (D)',
        'relics.gain_plat': 'GEWINN (P)',
        'relics.era': 'Era :',
        'relics.squad': 'Squad',
        'relics.owned': 'Besessen :',
        'relics.target': 'Ziel',
        'relics.sorting_by': 'Sortiere nach',
        'relics.refinement_exceptional': 'Ausgezeichnet',
        'relics.refinement_flawless': 'Perfekt',
        'relics.refinement_radiant': 'Strahlend',
        'relics.all': 'Alle',
        'relics.other': 'Andere',
        'relics.refinement_intact': 'Intakt',
        'relics.sort_name': 'Name',  // stays same in DE
    },
    es: {
        'relics.exp_ducats': 'DUCATS EXP',
        'relics.exp_plat': 'PLAT EXP',
        'relics.gain_ducats': 'GAN (D)',
        'relics.gain_plat': 'GAN (P)',
        'relics.era': 'Época :',
        'relics.squad': 'Escuadrón',
        'relics.owned': 'Poseído :',
        'relics.target': 'Objetivo',
        'relics.sorting_by': 'Ordenar por',
        'relics.refinement_exceptional': 'Excepcional',
        'relics.refinement_flawless': 'Intacto',
        'relics.refinement_radiant': 'Radiante',
        'relics.all': 'Todos',
        'relics.other': 'Otros',
    },
    it: {
        'relics.exp_ducats': 'EXP DUCATI',
        'relics.exp_plat': 'EXP PLATINO',
        'relics.gain_ducats': 'VINCITA (D)',
        'relics.gain_plat': 'VINCITA (P)',
        'relics.era': 'Epoca :',
        'relics.squad': 'Squad',
        'relics.owned': 'Posseduto :',
        'relics.target': 'Bersaglio',
        'relics.sorting_by': 'Ordina per',
        'relics.refinement_exceptional': 'Eccezionale',
        'relics.refinement_flawless': 'Perfetto',
        'relics.refinement_radiant': 'Radianza',
        'relics.all': 'Tutti',
        'relics.other': 'Altro',
    },
    ja: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLATINUM',
        'relics.gain_ducats': 'ゲイン (D)',
        'relics.gain_plat': 'ゲイン (P)',
        'relics.era': 'エポック :',
        'relics.squad': 'スクワッド',
        'relics.owned': '所持済み :',
        'relics.target': 'ターゲット',
        'relics.sorting_by': '並び替え',
        'relics.refinement_exceptional': 'エクセプショナル',
        'relics.refinement_flawless': 'フローレス',
        'relics.refinement_radiant': 'レディアント',
        'relics.all': 'すべて',
        'relics.other': 'その他',
    },
    ko: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLATINUM',
        'relics.gain_ducats': '획득 (D)',
        'relics.gain_plat': '획득 (P)',
        'relics.era': '시대 :',
        'relics.squad': '스쿼드',
        'relics.owned': '소유 :',
        'relics.target': '대상',
        'relics.sorting_by': '정렬 방식',
        'relics.refinement_exceptional': '특수',
        'relics.refinement_flawless': '완벽',
        'relics.refinement_radiant': '방사성',
        'relics.all': '전체',
        'relics.other': '기타',
    },
    pl: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLAT',
        'relics.gain_ducats': 'ZYSK (D)',
        'relics.gain_plat': 'ZYSK (P)',
        'relics.era': 'Era :',
        'relics.squad': 'Squad',
        'relics.owned': 'Posiadany :',
        'relics.target': 'Cel',
        'relics.sorting_by': 'Sortuj według',
        'relics.refinement_exceptional': 'Wyjątkowy',
        'relics.refinement_flawless': 'Perfekcyjny',
        'relics.refinement_radiant': 'Promienny',
        'relics.all': 'Wszystkie',
        'relics.other': 'Inne',
    },
    pt: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLAT',
        'relics.gain_ducats': 'GANHO (D)',
        'relics.gain_plat': 'GANHO (P)',
        'relics.era': 'Época :',
        'relics.squad': 'Esquadrião',
        'relics.owned': 'Possuído :',
        'relics.target': 'Alvo',
        'relics.sorting_by': 'Ordenar por',
        'relics.refinement_exceptional': 'Excepcional',
        'relics.refinement_flawless': 'Perfeito',
        'relics.refinement_radiant': 'Radiante',
        'relics.all': 'Todos',
        'relics.other': 'Outros',
    },
    ru: {
        'relics.exp_ducats': 'EXP ДУКАТЫ',
        'relics.exp_plat': 'EXP ПЛАТИНА',
        'relics.gain_ducats': 'ПРИБЫЛЬ (D)',
        'relics.gain_plat': 'ПРИБЫЛЬ (P)',
        'relics.era': 'Эра :',
        'relics.squad': 'Отряд',
        'relics.owned': 'В наличии :',
        'relics.target': 'Цель',
        'relics.sorting_by': 'Сортировать по',
        'relics.refinement_exceptional': 'Исключительный',
        'relics.refinement_flawless': 'Безупречный',
        'relics.refinement_radiant': 'Лучезарный',
        'relics.all': 'Все',
        'relics.other': 'Другие',
    },
    tc: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLATINUM',
        'relics.gain_ducats': '獲取 (D)',
        'relics.gain_plat': '獲取 (P)',
        'relics.era': '時代 :',
        'relics.squad': '小隊',
        'relics.owned': '已擁有 :',
        'relics.target': '目標',
        'relics.sorting_by': '排序依據',
        'relics.refinement_exceptional': '卓越',
        'relics.refinement_flawless': '完美',
        'relics.refinement_radiant': '輻射',
        'relics.all': '全部',
        'relics.other': '其他',
    },
    th: {
        'relics.exp_ducats': 'EXP ดุ๊กท์',
        'relics.exp_plat': 'EXP แพลตตินัม',
        'relics.gain_ducats': 'ได้รับ (D)',
        'relics.gain_plat': 'ได้รับ (P)',
        'relics.era': 'สไตล์ :',
        'relics.squad': 'ทีม',
        'relics.owned': 'มีเจ้าของ :',
        'relics.target': 'เป้าหมาย',
        'relics.sorting_by': 'เรียงตาม',
        'relics.refinement_exceptional': 'เหนือกว่า',
        'relics.refinement_flawless': 'สมบูรณ์',
        'relics.refinement_radiant': 'รัศมี',
        'relics.all': 'ทั้งหมด',
        'relics.other': 'อื่นๆ',
    },
    tr: {
        'relics.exp_ducats': 'EXP DUKAT',
        'relics.exp_plat': 'EXP PLATINUM',
        'relics.gain_ducats': 'KAZAN (D)',
        'relics.gain_plat': 'KAZAN (P)',
        'relics.era': 'İhtisar :',
        'relics.squad': 'Taban',
        'relics.owned': 'Sahip :',
        'relics.target': 'Hedef',
        'relics.sorting_by': 'Sırala',
        'relics.refinement_exceptional': 'Özel',
        'relics.refinement_flawless': 'Kusursuz',
        'relics.refinement_radiant': 'Radyant',
        'relics.all': 'Tümü',
        'relics.other': 'Diğer',
    },
    uk: {
        'relics.exp_ducats': 'EXP ДУКАТИ',
        'relics.exp_plat': 'EXP ПЛАТИНА',
        'relics.gain_ducats': 'НАДХОДЖЕННЯ (D)',
        'relics.gain_plat': 'НАДХОДЖЕННЯ (P)',
        'relics.era': 'Ера :',
        'relics.squad': 'Рота',
        'relics.owned': 'Мається :',
        'relics.target': 'Ціль',
        'relics.sorting_by': 'Сортувати за',
        'relics.refinement_exceptional': 'Винятковий',
        'relics.refinement_flawless': 'Бездоганний',
        'relics.refinement_radiant': 'Промінючий',
        'relics.all': 'Усі',
        'relics.other': 'Інші',
    },
    zh: {
        'relics.exp_ducats': 'EXP DUCATS',
        'relics.exp_plat': 'EXP PLATINUM',
        'relics.gain_ducats': '获取 (D)',
        'relics.gain_plat': '获取 (P)',
        'relics.era': '时代 :',
        'relics.squad': '小队',
        'relics.owned': '已拥有 :',
        'relics.target': '目标',
        'relics.sorting_by': '排序方式',
        'relics.refinement_exceptional': '卓越',
        'relics.refinement_flawless': '完美',
        'relics.refinement_radiant': '辐射',
        'relics.all': '全部',
        'relics.other': '其他',
    },
};

// Format string values that should NOT be translated
const FORMAT_STRINGS = ['bp_close', 'era_label', 'platinum'];
// bp_close="BP)", era_label="{era}", platinum="{plat}p"

// Apply translations
for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
    
    if (!data.ui) data.ui = {};
    if (!enData.ui) enData.ui = {};
    
    // Fix ui.relics.* flat keys
    if (uiRelicsTrans[loc]) {
        for (const [key, val] of Object.entries(uiRelicsTrans[loc])) {
            if (data.ui[key] === enData.ui[key]) {
                data.ui[key] = val;
            }
        }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${loc}`);
}

console.log('\nDone!');
