#!/usr/bin/env node
// fix_i18n_v3.mjs - Comprehensive i18n fix for Q10/Q12 (relics translations)
// IMPORTANT: The ui object uses flat dotted keys like "relics.all"
// The relics section uses bare keys like "expected_ducat"
// These are SEPARATE and must be handled independently

import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// === All translations needed ===
// Format: sectionName -> { keyName (without section prefix) -> { locale -> translation } }
// For the "ui" section, keys are like "relics.all" (flat dotted)
// For the "relics" section, keys are like "expected_ducat" (bare)

const uiKeys = {
    'relics.all': {
        fr: 'Tous', de: 'Alle', es: 'Todos', it: 'Tutti', ja: 'すべて', ko: '전체',
        pl: 'Wszystkie', pt: 'Todos', ru: 'Все', tc: '全部', th: 'ทั้งหมด', tr: 'Tümü',
        uk: 'Усі', zh: '全部',
    },
    'relics.other': {
        fr: 'Autre', de: 'Andere', es: 'Otros', it: 'Altro', ja: 'その他', ko: '기타',
        pl: 'Inne', pt: 'Outros', ru: 'Другие', tc: '其他', th: 'อื่นๆ', tr: 'Diğer',
        uk: 'Інші', zh: '其他',
    },
    'relics.era': {
        fr: 'Époque :', de: 'Ära:', es: 'Época:', it: 'Epoca:', ja: 'エポック:',
        ko: '시대:', pl: 'Era:', pt: 'Época:', ru: 'Эра:', tc: '時代：', th: 'ยุค:',
        tr: 'İhtisar:', uk: 'Ера:', zh: '纪元：',
    },
    'relics.squad': {
        fr: 'Escouade', de: 'Gruppe', es: 'Escuadrón', it: 'Squadra', ja: 'スクワッド',
        ko: '스쿼드', pl: 'Squad', pt: 'Esquadrião', ru: 'Отряд', tc: '小隊', th: 'ทีม',
        tr: 'Taban', uk: 'Рота', zh: '小队',
    },
    'relics.ev_title': {
        // "Exceptional Void Fissure" - NOT in dict, app-authored
        fr: 'Fissure de Vide exceptionnelle', de: 'Ausgezeichnete Void-Spritzer',
        es: 'Filadura del Vacío Excepcional', it: 'FessuraVuoto Eccezionale',
        ja: '特級虚空裂窘', ko: '특수한 보이드 갈라진 틈', pl: 'Wyjątkowy Zamarznięcie Próżni',
        pt: 'Fissura de Vacuidade Excepcional', ru: 'Винятковий розром Бездни',
        tc: '特級虛空裂縫', th: 'รอฟันต์มากของวอยด์', tr: 'İstikrarlı Void Çatlak',
        uk: 'Винятковий розром Бездни', zh: '卓越虚空裂隙',
    },
    'relics.subtitle': {
        fr: 'Collection de reliques et valorisation', de: 'Relic-Sammlung und -Bewertung',
        es: 'Colección y valoración de reliquias', it: 'Collezione di reliquie e valutazione',
        ja: '遺物コレクションと評価', ko: '성유물 수집 및 가치 평가', pl: 'Kolekcja reliktów i wycena',
        pt: 'Colecção e valorização de relics', ru: 'Коллекция реликвий и оценка',
        tc: '遺物收集與評估', th: 'การเก็บรวบรวมและประเมิตเรลิก', tr: 'İlhâl toplama ve değerleme',
        uk: 'Колекція реліквій і оцінка', zh: '遗物收集与评估',
    },
    'relics.exp_ducats': {
        fr: 'DUCATS EXP', de: 'EXP DUKATEN', es: 'DUCATS EXP', it: 'DUCATI EXP',
        ja: 'EXP ダクタ', ko: 'EXP 덕카', pl: 'EXP DUKATY', pt: 'DUCATS EXP',
        ru: 'EXP ДУКАТЫ', tc: 'EXP 達卡', th: 'EXP ดุ๊กท์', tr: 'EXP DUKAT',
        uk: 'EXP ДУКАТИ', zh: 'EXP 达卡',
    },
    'relics.exp_plat': {
        fr: 'PLAT EXP', de: 'EXP PLATIN', es: 'PLAT EXP', it: 'PLATINO EXP',
        ja: 'EXP プラチナ', ko: 'EXP 플랫', pl: 'EXP PLATYNY', pt: 'PLAT EXP',
        ru: 'EXP ПЛАТИНА', tc: 'EXP 白金', th: 'EXP แพลตตินัม', tr: 'EXP PLATINUM',
        uk: 'EXP ПЛАТИНА', zh: 'EXP 白金',
    },
    'relics.gain_ducats': {
        fr: 'GAGNÉ (D)', de: 'GEWINN (D)', es: 'GAN (D)', it: 'VINCITA (D)',
        ja: '獲得 (D)', ko: '획득 (D)', pl: 'ZYSK (D)', pt: 'GANHO (D)',
        ru: 'ПРИБЫЛЬ (D)', tc: '獲取 (D)', th: 'ได้รับ (D)', tr: 'KAZAN (D)',
        uk: 'НАДХОДЖЕННЯ (D)', zh: '获取 (D)',
    },
    'relics.gain_plat': {
        fr: 'GAGNÉ (P)', de: 'GEWINN (P)', es: 'GAN (P)', it: 'VINCITA (P)',
        ja: '獲得 (P)', ko: '획득 (P)', pl: 'ZYSK (P)', pt: 'GANHO (P)',
        ru: 'ПРИБЫЛЬ (P)', tc: '獲取 (P)', th: 'ได้รับ (P)', tr: 'KAZAN (P)',
        uk: 'НАДХОДЖЕННЯ (P)', zh: '获取 (P)',
    },
    'relics.sorting_by': {
        fr: 'Trier par', de: 'Sortiere nach', es: 'Ordenar por', it: 'Ordina per',
        ja: '並び替え', ko: '정렬 방식', pl: 'Sortuj według', pt: 'Ordenar por',
        ru: 'Сортировать по', tc: '排序依據', th: 'เรียงตาม', tr: 'Sırala',
        uk: 'Сортувати за', zh: '排序方式',
    },
    'relics.search': {
        fr: 'Rechercher', de: 'Suche', es: 'Buscar', it: 'Cerca',
        ja: '検索', ko: '검색', pl: 'Wyszukaj', pt: 'Pesquisar',
        ru: 'Поиск', tc: '搜尋', th: 'ค้นหา', tr: 'Ara',
        uk: 'Пошук', zh: '搜索',
    },
    'relics.sort': {
        fr: 'Trier', de: 'Sortieren', es: 'Ordenar', it: 'Ordina',
        ja: 'ソート', ko: '정렬', pl: 'Sortuj', pt: 'Ordenar',
        ru: 'Сортировка', tc: '排序', th: 'เรียงลำดับ', tr: 'Sıralama',
        uk: 'Сортування', zh: '排序',
    },
    'relics.owned': {
        fr: 'Possédé :', de: 'Besessen:', es: 'Poseído:', it: 'Posseduto:',
        ja: '所持済み:', ko: '소유:', pl: 'Posiadany:', pt: 'Possuído:',
        ru: 'В наличии:', tc: '已擁有:', th: 'มีเจ้าของ:', tr: 'Sahip:',
        uk: 'Мається:', zh: '已拥有:',
    },
    'relics.target': {
        fr: 'Cible', de: 'Ziel', es: 'Objetivo', it: 'Bersaglio',
        ja: 'ターゲット', ko: '대상', pl: 'Cel', pt: 'Alvo',
        ru: 'Цель', tc: '目標', th: 'เป้าหมาย', tr: 'Hedef',
        uk: 'Ціль', zh: '目标',
    },
    'relics.refinement_intact': {
        fr: 'Intacte', de: 'Intakt', es: 'Intacto', it: 'Intatto',
        ja: '完全態', ko: '완전체', pl: 'Całkowity', pt: 'Intacto',
        ru: 'Целостный', tc: '完整', th: 'สมบูรณ์', tr: 'Bütün',
        uk: 'Цілий', zh: '完整',
    },
    'relics.refinement_exceptional': {
        fr: 'Exceptionnelle', de: 'Ausgezeichnet', es: 'Excepcional', it: 'Eccezionale',
        ja: 'エクセプショナル', ko: '특수', pl: 'Wyjątkowy', pt: 'Excepcional',
        ru: 'Исключительный', tc: '卓越', th: 'เหนือกว่า', tr: 'Özel',
        uk: 'Винятковий', zh: '卓越',
    },
    'relics.refinement_flawless': {
        fr: 'Impeccable', de: 'Perfekt', es: 'Perfecto', it: 'Perfetto',
        ja: 'フローレス', ko: '완벽', pl: 'Perfekcyjny', pt: 'Perfeito',
        ru: 'Безупречный', tc: '完美', th: 'สมบูรณ์', tr: 'Kusursuz',
        uk: 'Бездоганний', zh: '完美',
    },
    'relics.refinement_radiant': {
        fr: 'Éclatante', de: 'Strahlend', es: 'Radiante', it: 'Radianza',
        ja: 'レディアント', ko: '방사성', pl: 'Promienny', pt: 'Radiante',
        ru: 'Лучезарный', tc: '輻射', th: 'รัศี', tr: 'Radyant',
        uk: 'Промінючий', zh: '辐射',
    },
    'relics.void_traces': {
        fr: 'Traçages du Vide', de: 'Void-Spuren', es: 'Rastros del Vacío',
        it: 'Tracce del Vuoto', ja: 'ボイドトレース', ko: '보이드 트레이스',
        pl: 'Ślady Pustki', pt: 'Rastros do Vacuo', ru: 'Следы Бездны',
        tc: '虛空痕跡', th: 'ร่องรอยวอยด์', tr: 'Void Traces',  // TR keeps game terms
        uk: 'Стежки Бездни', zh: '虚空痕迹',
    },
    'relics.ducats_gain': {
        fr: 'Gain de Ducats attendu en raffinant jusqu\'au Radiant',
        de: 'Erwarteter Dukaten-Gewinn beim Verfeinern auf Radiant',
        es: 'Ganancia de Ducats esperada al refinar hasta Radiante',
        it: 'Guadagno di Ducat previsto raffinando fino a Radante',
        ja: 'ラジアントに精錬した際の期待ダクタ獲得',
        ko: '라디언트로 정련 시 기대 덕카 획득',
        pl: 'Oczekiwany zysk dukatów przy udoskonalaniu do Radiant',
        pt: 'Ganho de Ducats esperado ao refinar até Radiante',
        ru: 'Ожидаемая прибыль дукатов при расистинге до Radiant',
        tc: '精煉至Radiant期待達卡獲取',
        th: 'ผลตอนดุ๊กท์ที่คาดหวังเมื่อปลูกยัง Radiant',
        tr: 'Radyant\'a harcandığınızda beklenen Dukat kazancı',
        uk: 'Очікувана надходження дукатів при розвиткові до Radiant',
        zh: '精炼至Radiant时期待达卡获取',
    },
    'relics.plat_gain': {
        fr: 'Gain de Platine attendu en raffinant jusqu\'au Radiant',
        de: 'Erwarteter Platin-Gewinn beim Verfeinern auf Radiant',
        es: 'Ganancia de Platino esperada al refinar hasta Radiante',
        it: 'Guadagno di Platinum previsto raffinando fino a Radante',
        ja: 'ラジアントに精錬した際の期待プラチナ獲得',
        ko: '라디언트로 정련 시 기대 플랫 획득',
        pl: 'Oczekiwany zysk platyny przy udoskonalaniu do Radiant',
        pt: 'Ganho de Platina esperado ao refinar até Radiante',
        ru: 'Ожидаемая прибыль платины при расистинге до Radiant',
        tc: '精煉至Radiant期待白金獲取',
        th: 'ผลตอนแพลตตินัมที่คาดหวังเมื่อปลูกยัง Radiant',
        tr: 'Radyant\'a harcandığınızda beklenen Platinum kazancı',
        uk: 'Очікувана надходження платини при розвиткові до Radiant',
        zh: '精炼至Radiant时期待白金获取',
    },
};

// Keys that are format strings - correct to stay EN (placeholders, suffixes)
const FORMAT_STRINGS = ['bp_close', 'era_label', 'platinum'];

const relicsSectionKeys = {
    'expected_ducat': {
        fr: 'Ducat attendu', de: 'Erwartete Dukaten', es: 'Ducats esperados', it: 'Ducati previsti',
        ja: '期待ダクタ', ko: '기대 덕카', pl: 'Oczekiwane dukaty', pt: 'Ducats esperados',
        ru: 'Ожидаемые дукаты', tc: '預期達卡', th: 'ดุ๊กท์ที่คาดหวัง', tr: 'Beklenen Dukat',
        uk: 'Очікувані дукати', zh: '期待达卡',
    },
    'expected_platinum': {
        fr: 'Platine attendue', de: 'Erwartetes Platinum', es: 'Platino esperado', it: 'Platinum prevista',
        ja: '期待プラチナ', ko: '기대 플랫', pl: 'Oczekiwana platyna', pt: 'Platina esperada',
        ru: 'Ожидаемая платина', tc: '預期白金', th: 'แพลตตินัมที่คาดหวัง', tr: 'Beklenen Platinum',
        uk: 'Очікувана платина', zh: '期待白金',
    },
    'no_relics_inventory': {
        fr: 'Aucune relique dans l\'inventaire', de: 'Keine Reliquien im Inventar',
        es: 'No hay reliquias en el inventario', it: 'Nessuna reliquia nell\'inventario',
        ja: 'インベントリに遺物がありません', ko: '인벤토리에 성유물이 없습니다',
        pl: 'Brak reliktów w inwentarzu', pt: 'Nenhuma reliquia no inventário',
        ru: 'Нет реликвий в инвентаре', tc: '背包中沒有遺物', th: 'ไม่มีเรลิกในอินเวนทอรี',
        tr: 'Envanterde ilâhlik yok', uk: 'Немає реліквій у інвентарі', zh: '背包中没有遗物',
    },
    'no_relics_search': {
        fr: 'Aucune relique ne correspond à votre recherche', de: 'Keine Reliquien entsprechen Ihrer Suche',
        es: 'Ninguna reliquia coincide con tu búsqueda', it: 'Nessuna reliquia corrisponde alla ricerca',
        ja: '検索に一致する遺物がありません', ko: '검색 조건에 맞는 성유물이 없습니다',
        pl: 'Brak reliktów spełniających kryteria', pt: 'Nenhuma reliquia corresponde à pesquisa',
        ru: 'Нет реликвий, соответствующих поиску', tc: '沒有遺物符合您的搜尋', th: 'ไม่มีเรลิกที่ตรงกับการค้นหา',
        tr: 'Aramanıza uygun ilâhlik yok', uk: 'Немає реліквій, що відповідають пошуку',
        zh: '没有遗物符合您的搜索',
    },
    'sort_asc': {
        fr: 'Croissant', de: 'Aufsteigend', es: 'Ascendente', it: 'Ascendente',
        ja: '昇順', ko: '오름차순', pl: 'Rosnąco', pt: 'Ascendente',
        ru: 'По возрастанию', tc: '升序', th: 'เรียงจากน้อยไปมาก', tr: 'Artan',
        uk: 'За зростанням', zh: '升序',
    },
    'sort_desc': {
        fr: 'Décroissant', de: 'Absteigend', es: 'Descendente', it: 'Discendente',
        ja: '降順', ko: '내림차순', pl: 'Malejąco', pt: 'Descendente',
        ru: 'По убыванию', tc: '降序', th: 'เรียงจากมากไปน้อย', tr: 'Azalan',
        uk: 'За спаданням', zh: '降序',
    },
    'sort_ducat': {
        fr: 'Trier par Ducats', de: 'Nach Dukaten sortieren', es: 'Ordenar por Ducats',
        it: 'Ordina per Ducat', ja: 'ダクタで並び替え', ko: '덕카별 정렬',
        pl: 'Sortuj według dukatów', pt: 'Ordenar por Ducats', ru: 'Сортировать по дукатам',
        tc: '按達卡排序', th: 'เรียงตามดุ๊กท์', tr: 'Dukata göre sırala',
        uk: 'Сортувати за дукатами', zh: '按达卡排序',
    },
    'sort_ducat_gain': {
        fr: 'Gain de Ducats', de: 'Dukaten-Gewinn', es: 'Ganancia de Ducats',
        it: 'Guadagno di Ducat', ja: 'ダクタ獲得', ko: '덕카 획득',
        pl: 'Zysk dukatów', pt: 'Ganho de Ducats', ru: 'Прибыль дукатов',
        tc: '達卡獲取', th: 'ผลตอนดุ๊กท์', tr: 'Dukat kazancı',
        uk: 'Надходження дукатів', zh: '达卡获取',
    },
    'sort_name': {
        fr: 'Nom', de: 'Name', es: 'Nombre', it: 'Nome',
        ja: '名前', ko: '이름', pl: 'Nazwa', pt: 'Nome',
        ru: 'Название', tc: '名稱', th: 'ชื่อ', tr: 'İsim',
        uk: 'Назва', zh: '名称',
    },
    'sort_plat': {
        fr: 'Trier par Platine', de: 'Nach Platinum sortieren', es: 'Ordenar por Platino',
        it: 'Ordina per Platinum', ja: 'プラチナで並び替え', ko: '플랫별 정렬',
        pl: 'Sortuj według platyny', pt: 'Ordenar por Platina', ru: 'Сортировать по платине',
        tc: '按白金排序', th: 'เรียงตามแพลตตินัม', tr: 'Platinaya göre sırala',
        uk: 'Сортувати за платиною', zh: '按白金排序',
    },
    'sort_plat_gain': {
        fr: 'Gain de Platine', de: 'Platin-Gewinn', es: 'Ganancia de Platino',
        it: 'Guadagno di Platinum', ja: 'プラチナ獲得', ko: '플랫 획득',
        pl: 'Zysk platyny', pt: 'Ganho de Platina', ru: 'Прибыль платины',
        tc: '白金獲取', th: 'ผลตอนแพลตตินัม', tr: 'Platinum kazancı',
        uk: 'Надходження платини', zh: '白金获取',
    },
};

// Apply translations
for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changes = 0;
    
    // Fix ui.relics.* flat keys
    if (data.ui) {
        for (const [key, transMap] of Object.entries(uiKeys)) {
            if (data.ui[key] === enData.ui[key] && transMap[loc]) {
                data.ui[key] = transMap[loc];
                changes++;
            }
        }
    }
    
    // Fix relics section (bare keys)
    if (data.relics) {
        for (const [key, transMap] of Object.entries(relicsSectionKeys)) {
            if (data.relics[key] === enData.relics[key] && transMap[loc]) {
                data.relics[key] = transMap[loc];
                changes++;
            }
        }
    }
    
    if (changes > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}: ${changes} fixes applied`);
    } else {
        console.log(`${loc}: already clean`);
    }
}

console.log('\nDone!');
