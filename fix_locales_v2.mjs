import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// Per-locale translations for ALL missing UI strings
// These are Path B (UI-authored) strings that need hand translation.
// Warframe game conventions: "Ducat" stays "Ducat" in most locales (it's a proper noun),
// "Platinum" is translated in most locales.

const translations = {
    // relics.* section translations (still EN in 13 locales)
    relics: {
        de: {
            expected_ducat: 'Erwartete Dukaten',
            expected_platinum: 'Erwartetes Platinum',
            no_relics_inventory: 'Keine Reliquien im Inventar',
            no_relics_search: 'Keine Reliquien entsprechen Ihrer Suche',
            sort_asc: 'Aufsteigend',
            sort_desc: 'Absteigend',
            sort_ducat: 'Nach Dukaten sortieren',
            sort_ducat_gain: 'Dukaten-Gewinn',
            sort_name: 'Name',
            sort_plat: 'Nach Platinum sortieren',
            sort_plat_gain: 'Platin-Gewinn',
        },
        es: {
            expected_ducat: 'Ducats esperados',
            expected_platinum: 'Platino esperado',
            no_relics_inventory: 'No hay reliquias en el inventario',
            no_relics_search: 'Ninguna reliquia coincide con tu búsqueda',
            sort_asc: 'Ascendente',
            sort_desc: 'Descendente',
            sort_ducat: 'Ordenar por Ducats',
            sort_ducat_gain: 'Ganancia de Ducats',
            sort_name: 'Nombre',
            sort_plat: 'Ordenar por Platino',
            sort_plat_gain: 'Ganancia de Platino',
        },
        it: {
            expected_ducat: 'Ducati previsti',
            expected_platinum: 'Platinum prevista',
            no_relics_inventory: 'Nessuna reliquia nell\'inventario',
            no_relics_search: 'Nessuna reliquia corrisponde alla ricerca',
            sort_asc: 'Ascendente',
            sort_desc: 'Discendente',
            sort_ducat: 'Ordina per Ducat',
            sort_ducat_gain: 'Guadagno di Ducat',
            sort_name: 'Nome',
            sort_plat: 'Ordina per Platinum',
            sort_plat_gain: 'Guadagno di Platinum',
        },
        ja: {
            expected_ducat: '期待ダクタ',
            expected_platinum: '期待プラチナ',
            no_relics_inventory: 'インベントリに遺物がありません',
            no_relics_search: '検索に一致する遺物がありません',
            sort_asc: '昇順',
            sort_desc: '降順',
            sort_ducat: 'ダクタで並び替え',
            sort_ducat_gain: 'ダクタ獲得',
            sort_name: '名前',
            sort_plat: 'プラチナで並び替え',
            sort_plat_gain: 'プラチナ獲得',
        },
        ko: {
            expected_ducat: '기대 덕카',
            expected_platinum: '기대 플랫',
            no_relics_inventory: '인벤토리에 성유물이 없습니다',
            no_relics_search: '검색 조건에 맞는 성유물이 없습니다',
            sort_asc: '오름차순',
            sort_desc: '내림차순',
            sort_ducat: '덕카별 정렬',
            sort_ducat_gain: '덕카 획득',
            sort_name: '이름',
            sort_plat: '플랫별 정렬',
            sort_plat_gain: '플랫 획득',
        },
        pl: {
            expected_ducat: 'Oczekiwane dukaty',
            expected_platinum: 'Oczekiwana platyna',
            no_relics_inventory: 'Brak reliktów w inwentarzu',
            no_relics_search: 'Brak reliktów spełniających kryteria',
            sort_asc: 'Rosnąco',
            sort_desc: 'Malejąco',
            sort_ducat: 'Sortuj według dukatów',
            sort_ducat_gain: 'Zysk dukatów',
            sort_name: 'Nazwa',
            sort_plat: 'Sortuj według platyny',
            sort_plat_gain: 'Zysk platyny',
        },
        pt: {
            expected_ducat: 'Ducats esperados',
            expected_platinum: 'Platina esperada',
            no_relics_inventory: 'Nenhuma reliquia no inventário',
            no_relics_search: 'Nenhuma reliquia corresponde à pesquisa',
            sort_asc: 'Ascendente',
            sort_desc: 'Descendente',
            sort_ducat: 'Ordenar por Ducats',
            sort_ducat_gain: 'Ganho de Ducats',
            sort_name: 'Nome',
            sort_plat: 'Ordenar por Platina',
            sort_plat_gain: 'Ganho de Platina',
        },
        ru: {
            expected_ducat: 'Ожидаемые дукаты',
            expected_platinum: 'Ожидаемая платина',
            no_relics_inventory: 'Нет реликвий в инвентаре',
            no_relics_search: 'Нет реликвий, соответствующих поиску',
            sort_asc: 'По возрастанию',
            sort_desc: 'По убыванию',
            sort_ducat: 'Сортировать по дукатам',
            sort_ducat_gain: 'Прибыль дукатов',
            sort_name: 'Название',
            sort_plat: 'Сортировать по платине',
            sort_plat_gain: 'Прибыль платины',
        },
        tc: {
            expected_ducat: '預期達卡',
            expected_platinum: '預期白金',
            no_relics_inventory: '背包中沒有遺物',
            no_relics_search: '沒有遺物符合您的搜尋',
            sort_asc: '升序',
            sort_desc: '降序',
            sort_ducat: '按達卡排序',
            sort_ducat_gain: '達卡獲取',
            sort_name: '名稱',
            sort_plat: '按白金排序',
            sort_plat_gain: '白金獲取',
        },
        th: {
            expected_ducat: 'ดุ๊กท์ที่คาดหวัง',
            expected_platinum: 'แพลตตินัมที่คาดหวัง',
            no_relics_inventory: 'ไม่มีเรลิกในอินเวนทอรี',
            no_relics_search: 'ไม่มีเรลิกที่ตรงกับการค้นหา',
            sort_asc: 'เรียงจากน้อยไปมาก',
            sort_desc: 'เรียงจากมากไปน้อย',
            sort_ducat: 'เรียงตามดุ๊กท์',
            sort_ducat_gain: 'ผลตอนดุ๊กท์',
            sort_name: 'ชื่อ',
            sort_plat: 'เรียงตามแพลตตินัม',
            sort_plat_gain: 'ผลตอนแพลตตินัม',
        },
        tr: {
            expected_ducat: 'Beklenen Dukat',
            expected_platinum: 'Beklenen Platinum',
            no_relics_inventory: 'Envanterde ilâhlik yok',
            no_relics_search: 'Aramanıza uygun ilâhlik yok',
            sort_asc: 'Artan',
            sort_desc: 'Azalan',
            sort_ducat: 'Dukata göre sırala',
            sort_ducat_gain: 'Dukat kazancı',
            sort_name: 'İsim',
            sort_plat: 'Platinaya göre sırala',
            sort_plat_gain: 'Platinum kazancı',
        },
        uk: {
            expected_ducat: 'Очікувані дукати',
            expected_platinum: 'Очікувана платина',
            no_relics_inventory: 'Немає реліквій у інвентарі',
            no_relics_search: 'Немає реліквій, що відповідають пошуку',
            sort_asc: 'За зростанням',
            sort_desc: 'За спаданням',
            sort_ducat: 'Сортувати за дукатами',
            sort_ducat_gain: 'Надходження дукатів',
            sort_name: 'Назва',
            sort_plat: 'Сортувати за платиною',
            sort_plat_gain: 'Надходження платини',
        },
        zh: {
            expected_ducat: '期待达卡',
            expected_platinum: '期待白金',
            no_relics_inventory: '背包中没有遗物',
            no_relics_search: '没有遗物符合您的搜索',
            sort_asc: '升序',
            sort_desc: '降序',
            sort_ducat: '按达卡排序',
            sort_ducat_gain: '达卡获取',
            sort_name: '名称',
            sort_plat: '按白金排序',
            sort_plat_gain: '白金获取',
        },
        fr: {
            // ALREADY TRANSLATED - skip
        },
    },
    
    // ui.relics.* flat key translations (remaining EN values)
    uiRelics: {
        de: {
            'relics.ev_title': 'Ausgezeichnete Void-Spritzer',
            'relics.subtitle': 'Relic-Sammlung und -Bewertung',
            'relics.refinement_intact': 'Intakt',
        },
        es: {
            'relics.ev_title': 'Filadura del Vacío Excepcional',
            'relics.subtitle': 'Colección y valoración de reliquias',
            'relics.refinement_intact': 'Intacto',
        },
        it: {
            'relics.ev_title': 'Fessura Vuoto Eccezionale',
            'relics.subtitle': 'Collezione di reliquie e valutazione',
            'relics.refinement_intact': 'Intatto',
        },
        ja: {
            'relics.void_traces': 'ボイド痕跡',
            'relics.ev_title': '特級虚空裂窘',
            'relics.subtitle': '遺物コレクションと評価',
            'relics.refinement_intact': '完全態',
        },
        ko: {
            'relics.ev_title': '특수한 보이드 갈라진 틈',
            'relics.subtitle': '성유물 수집 및 가치 평가',
            'relics.refinement_intact': '완전체',
        },
        pl: {
            'relics.ev_title': 'Wyjątkowy Zamarznięcie Próżni',
            'relics.subtitle': 'Kolekcja reliktów i wycena',
            'relics.refinement_intact': 'Całkowity',
        },
        tc: {
            'relics.ev_title': '特級虛空裂縫',
            'relics.subtitle': '遺物收集與評估',
            'relics.refinement_intact': '完整',
            'relics.gain_ducats': 'GAIN (D)',
            'relics.gain_plat': 'GAIN (P)',
        },
        th: {
            'relics.ev_title': 'รอฟันต์มากของวอยด์',
            'relics.subtitle': 'การเก็บรวบรวมและประเมิตเรลิก',
            'relics.refinement_intact': 'สมบูรณ์',
            'relics.gain_ducats': 'GAIN (D)',
            'relics.gain_plat': 'GAIN (P)',
        },
        tr: {
            'relics.ev_title': 'İstikrarlı Void Çatlak',
            'relics.subtitle': 'İlhâl toplama ve değerleme',
            'relics.refinement_intact': 'Bütün',
        },
        uk: {
            'relics.ev_title': 'Виняткова розрив Вакууму',
            'relics.subtitle': 'Колекція реліквій і оцінка',
            'relics.refinement_intact': 'Цілий',
        },
        zh: {
            'relics.ev_title': '卓越虚空裂隙',
            'relics.subtitle': '遗物收集与评估',
            'relics.refinement_intact': '完整',
        },
        fr: {
            'relics.ev_title': 'Fissure de Vide Exceptionnelle',
            'relics.subtitle': 'Collection de reliques et évaluation',
            'relics.refinement_intact': 'Intact',
        },
        pt: {
            'relics.ev_title': 'Fissura de Vacuidade Excepcional',
            'relics.subtitle': 'Colecção e valorização de relics',
            'relics.refinement_intact': 'Intacto',
        },
        ru: {
            'relics.ev_title': 'Исключительное разлом Бездны',
            'relics.subtitle': 'Коллекция реликвий и оценка',
            'relics.refinement_intact': 'Целостный',
        },
    },
};

// Apply translations
for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const orig = JSON.stringify(data);
    
    // Fix relics section
    if (data.relics && translations.relics[loc]) {
        for (const [key, val] of Object.entries(translations.relics[loc])) {
            if (data.relics[key] === undefined) continue;
            data.relics[key] = val;
        }
    }
    
    // Fix ui.relics.* flat keys
    if (data.ui && translations.uiRelics[loc]) {
        for (const [key, val] of Object.entries(translations.uiRelics[loc])) {
            // key is like 'relics.void_traces', stored as data.ui['relics.void_traces']
            if (data.ui[key] !== undefined) {
                data.ui[key] = val;
            }
        }
    }
    
    // Add eras flat keys (ui.eras.Lith = "...")
    if (data.eras && data.ui) {
        for (const [eraKey, eraVal] of Object.entries(data.eras)) {
            const flatKey = `eras.${eraKey}`;
            if (data.ui[flatKey] === undefined) {
                data.ui[flatKey] = eraVal;
            }
        }
    }
    
    if (JSON.stringify(data) !== orig) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes for ${filePath}`);
    }
}

console.log('\nDone!');
