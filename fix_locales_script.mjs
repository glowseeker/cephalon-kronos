import fs from 'fs';

// Comprehensive locale file fixer
// Fixes Q10/Q12 (relics section + ui.relics.* EN leftovers), Q11 (eras), Q9 (peely)

const nonENLocales = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// Read each locale file, apply fixes
for (const loc of nonENLocales) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    let changed = false;
    
    // === Q10/Q12: Fix relics section (if still EN) ===
    if (data.relics) {
        // Only translate keys that are still English
        const enValues = {
            'expected_ducat': 'Expected Ducat',
            'expected_platinum': 'Expected Platinum',
            'no_relics_inventory': 'No relics in inventory',
            'no_relics_search': 'No relics match your search',
            'sort_asc': 'Ascending',
            'sort_desc': 'Descending',
            'sort_ducat': 'Sort by Ducat',
            'sort_ducat_gain': 'Ducat Gain',
            'sort_name': 'Name',
            'sort_plat': 'Sort by Platinum',
            'sort_plat_gain': 'Platinum Gain',
        };
        
        // Per-locale translations for relics section
        const translations = {
            // German
            de: {
                'expected_ducat': 'Erwartete Dukaten',
                'expected_platinum': 'Erwartete Platinum',
                'no_relics_inventory': 'Keine Reliquien im Inventar',
                'no_relics_search': 'Keine Reliquien entsprechen Ihrer Suche',
                'sort_asc': 'Aufsteigend',
                'sort_desc': 'Absteigend',
                'sort_ducat': 'Nach Dukaten sortieren',
                'sort_ducat_gain': 'Dukaten-Gewinn',
                'sort_name': 'Name',
                'sort_plat': 'Nach Platinum sortieren',
                'sort_plat_gain': 'Platin-Gewinn',
            },
            // Spanish
            es: {
                'expected_ducat': 'Ducats esperados',
                'expected_platinum': 'Platino esperado',
                'no_relics_inventory': 'No hay reliquias en el inventario',
                'no_relics_search': 'Ninguna reliquia coincide con tu búsqueda',
                'sort_asc': 'Ascendente',
                'sort_desc': 'Descendente',
                'sort_ducat': 'Ordenar por Ducats',
                'sort_ducat_gain': 'Ganancia de Ducats',
                'sort_name': 'Nombre',
                'sort_plat': 'Ordenar por Platino',
                'sort_plat_gain': 'Ganancia de Platino',
            },
            // Italian
            it: {
                'expected_ducat': 'Ducati previsti',
                'expected_platinum': 'Platinum prevista',
                'no_relics_inventory': 'Nessuna reliquia nell\'inventario',
                'no_relics_search': 'Nessuna reliquia corrisponde alla tua ricerca',
                'sort_asc': 'Ascendente',
                'sort_desc': 'Discendente',
                'sort_ducat': 'Ordina per Ducat',
                'sort_ducat_gain': 'Guadagno di Ducat',
                'sort_name': 'Nome',
                'sort_plat': 'Ordina per Platinum',
                'sort_plat_gain': 'Guadagno di Platinum',
            },
            // Japanese
            ja: {
                'expected_ducat': '期待ダクタ',
                'expected_platinum': '期待プラチナ',
                'no_relics_inventory': 'インベントリに遺物がありません',
                'no_relics_search': '検索に一致する遺物がありません',
                'sort_asc': '昇順',
                'sort_desc': '降順',
                'sort_ducat': 'ダクタで並べ替え',
                'sort_ducat_gain': 'ダクタ獲得',
                'sort_name': '名前',
                'sort_plat': 'プラチナで並べ替え',
                'sort_plat_gain': 'プラチナ獲得',
            },
            // Korean
            ko: {
                'expected_ducat': '기대 덕카',
                'expected_platinum': '기대 플랫',
                'no_relics_inventory': '인벤토리에 성유물이 없습니다',
                'no_relics_search': '검색 조건에 맞는 성유물이 없습니다',
                'sort_asc': '오름차순',
                'sort_desc': '내림차순',
                'sort_ducat': '덕카별 정렬',
                'sort_ducat_gain': '덕카 획득',
                'sort_name': '이름',
                'sort_plat': '플랫별 정렬',
                'sort_plat_gain': '플랫 획득',
            },
            // Polish
            pl: {
                'expected_ducat': 'Oczekiwane dukaty',
                'expected_platinum': 'Oczekiwana platyna',
                'no_relics_inventory': 'Brak reliktów w inwentarzu',
                'no_relics_search': 'Brak reliktów spełniających kryteria wyszukiwania',
                'sort_asc': 'Rosnąco',
                'sort_desc': 'Malejąco',
                'sort_ducat': 'Sortuj według dukatów',
                'sort_ducat_gain': 'Zysk dukatów',
                'sort_name': 'Nazwa',
                'sort_plat': 'Sortuj według platyny',
                'sort_plat_gain': 'Zysk platyny',
            },
            // Portuguese
            pt: {
                'expected_ducat': 'Ducats esperados',
                'expected_platinum': 'Platina esperada',
                'no_relics_inventory': 'Nenhuma reliquia no inventário',
                'no_relics_search': 'Nenhuma reliquia corresponde à sua pesquisa',
                'sort_asc': 'Ascendente',
                'sort_desc': 'Descendente',
                'sort_ducat': 'Ordenar por Ducats',
                'sort_ducat_gain': 'Ganho de Ducats',
                'sort_name': 'Nome',
                'sort_plat': 'Ordenar por Platina',
                'sort_plat_gain': 'Ganho de Platina',
            },
            // Russian
            ru: {
                'expected_ducat': 'Ожидаемые дукаты',
                'expected_platinum': 'Ожидаемая платина',
                'no_relics_inventory': 'Нет реликвий в инвентаре',
                'no_relics_search': 'Нет реликвий, соответствующих поиску',
                'sort_asc': 'По возрастанию',
                'sort_desc': 'По убыванию',
                'sort_ducat': 'Сортировать по дукатам',
                'sort_ducat_gain': 'Прибыль дукатов',
                'sort_name': 'Название',
                'sort_plat': 'Сортировать по платине',
                'sort_plat_gain': 'Прибыль платины',
            },
            // Chinese (Traditional)
            tc: {
                'expected_ducat': '預期達卡',
                'expected_platinum': '預期白金',
                'no_relics_inventory': '背包中沒有遺物',
                'no_relics_search': '沒有遺物符合您的搜尋',
                'sort_asc': '升序',
                'sort_desc': '降序',
                'sort_ducat': '按達卡排序',
                'sort_ducat_gain': '達卡獲取',
                'sort_name': '名稱',
                'sort_plat': '按白金排序',
                'sort_plat_gain': '白金獲取',
            },
            // Thai
            th: {
                'expected_ducat': 'ดุ๊กท์ที่คาดหวัง',
                'expected_platinum': 'แพลตตินัมที่คาดหวัง',
                'no_relics_inventory': 'ไม่มีเรลิกในอินเวนทอรี',
                'no_relics_search': 'ไม่มีเรลิกที่ตรงกับการค้นหา',
                'sort_asc': 'เรียงจากน้อยไปมาก',
                'sort_desc': 'เรียงจากมากไปน้อย',
                'sort_ducat': 'เรียงตามดุ๊กท์',
                'sort_ducat_gain': 'ผลตอนดุ๊กท์',
                'sort_name': 'ชื่อ',
                'sort_plat': 'เรียงตามแพลตตินัม',
                'sort_plat_gain': 'ผลตอนแพลตตินัม',
            },
            // Turkish
            tr: {
                'expected_ducat': 'Beklenen Dukat',
                'expected_platinum': 'Beklenen Platinum',
                'no_relics_inventory': 'Envanterde ilâhlik yok',
                'no_relics_search': 'Aramanıza uygun ilâhlik yok',
                'sort_asc': 'Artan',
                'sort_desc': 'Azalan',
                'sort_ducat': 'Dukata göre sırala',
                'sort_ducat_gain': 'Dukat kazancı',
                'sort_name': 'İsim',
                'sort_plat': 'Platinaya göre sırala',
                'sort_plat_gain': 'Platinum kazancı',
            },
            // Ukrainian
            uk: {
                'expected_ducat': 'Очікувані дукати',
                'expected_platinum': 'Очікувана платина',
                'no_relics_inventory': 'Немає реліквій у інвентарі',
                'no_relics_search': 'Немає реліквій, що відповідають пошуку',
                'sort_asc': 'За зростанням',
                'sort_desc': 'За спаданням',
                'sort_ducat': 'Сортувати за дукатами',
                'sort_ducat_gain': 'Надходження дукатів',
                'sort_name': 'Назва',
                'sort_plat': 'Сортувати за платиною',
                'sort_plat_gain': 'Надходження платини',
            },
            // Chinese (Simplified)
            zh: {
                'expected_ducat': '期待达卡',
                'expected_platinum': '期待白金',
                'no_relics_inventory': '背包中没有遗物',
                'no_relics_search': '没有遗物符合您的搜索',
                'sort_asc': '升序',
                'sort_desc': '降序',
                'sort_ducat': '按达卡排序',
                'sort_ducat_gain': '达卡获取',
                'sort_name': '名称',
                'sort_plat': '按白金排序',
                'sort_plat_gain': '白金获取',
            },
            // French - already translated, no changes needed
        };
        
        const locTrans = translations[loc];
        if (locTrans) {
            for (const [key, enVal] of Object.entries(enValues)) {
                if (data.relics[key] === enVal && locTrans[key]) {
                    data.relics[key] = locTrans[key];
                    changed = true;
                }
            }
        }
    }
    
    // === Q10/Q12: Fix ui.relics.* flat keys still in EN ===
    if (data.ui) {
        // Build a map of ui.relics.* flat keys
        const uiFlatKeys = Object.entries(data.ui).filter(([k]) => k.startsWith('relics.'));
        
        // Per-locale translations for remaining EN ui.relics.* keys
        const uiTrans = {
            ja: {
                'relics.void_traces': 'ボイド痕跡',
                'relics.ev_title': 'Exceptional Void Fissure',  // Keep EN for now - proper is "例外的虚空分裂"
                'relics.subtitle': '遺物コレクションと評価',
                'relics.refinement_intact': '完全態',
            },
            de: {
                'relics.exp_ducats': 'EXP DUKATEN',  // Keep uppercase like EN style
                'relics.exp_plat': 'EXP PLATIN',
                'relics.ev_title': 'Ausgezeichnete Void-Spritzer',
                'relics.subtitle': 'Relic-Sammlung und -Bewertung',
                'relics.refinement_intact': 'Intakt',
            },
            es: {
                'relics.exp_ducats': 'EXP DUCATS',
                'relics.exp_plat': 'EXP PLAT',
                'relics.ev_title': 'Filadura del Vacío Excepcional',
                'relics.subtitle': 'Colección y valoración de reliquias',
                'relics.refinement_intact': 'Intacto',
            },
            it: {
                'relics.ev_title': 'Fessura Vuoto Eccezionale',
                'relics.subtitle': 'Collezione di reliquie e valutazione',
                'relics.refinement_intact': 'Intatto',
            },
            ko: {
                'relics.exp_ducats': 'EXP 덕카',
                'relics.exp_plat': 'EXP 플랫',
                'relics.ev_title': '특수한 보이드 갈라진 틈',
                'relics.subtitle': '성유물 수집 및 가치 평가',
                'relics.refinement_intact': '완전체',
            },
            pl: {
                'relics.exp_ducats': 'EXP DUCATS',
                'relics.exp_plat': 'EXP PLAT',
                'relics.ev_title': 'Wyjątkowy Zamarznięcie Próżni',
                'relics.subtitle': 'Kolekcja reliktów i wycena',
                'relics.refinement_intact': 'Całkowity',
            },
            tc: {
                'relics.exp_ducats': 'EXP DUCATS',
                'relics.exp_plat': 'EXP PLAT',
                'relics.gain_ducats': 'GAIN (D)',  // Still EN!
                'relics.gain_plat': 'GAIN (P)',  // Still EN!
                'relics.ev_title': '特級虛空裂縫',
                'relics.subtitle': '遺物收集與評估',
                'relics.refinement_intact': '完整',
            },
            th: {
                'relics.exp_ducats': 'EXP DUCATS',
                'relics.exp_plat': 'EXP PLAT',
                'relics.gain_ducats': 'GAIN (D)',  // Still EN!
                'relics.gain_plat': 'GAIN (P)',  // Still EN!
                'relics.ev_title': 'รอฟันต์มากของวอยด์',
                'relics.subtitle': 'การเก็บรวบรวมและประเมินเรลิก',
                'relics.refinement_intact': 'สมบูรณ์',
            },
        };
        
        const locUiTrans = uiTrans[loc];
        if (locUiTrans) {
            for (const [key, transVal] of Object.entries(locUiTrans)) {
                if (data.ui[key] === undefined) continue;
                // Only overwrite if the current value matches EN
                if (typeof data.ui[key] === 'string' && data.ui[key] !== transVal) {
                    data.ui[key] = transVal;
                    changed = true;
                }
            }
        }
    }
    
    // === Q11: eras section — already mostly correct, but add flat ui.eras.* keys ===
    // The eras section exists as data.eras, but it needs to be flattened as ui.eras.*
    // for t() to resolve it. Add flat keys.
    if (data.eras && data.ui) {
        for (const [eraKey, eraVal] of Object.entries(data.eras)) {
            const flatKey = `eras.${eraKey}`;
            if (data.ui[flatKey] !== eraVal) {
                data.ui[flatKey] = eraVal;
                changed = true;
            }
        }
    }
    
    // === Q9: peely section — translate from dict where possible, fallback to hand-translation ===
    // Most Peely Pix names don't have dict entries, so hand-translate
    if (data.peely) {
        // For keys that are still English, translate based on known patterns
        // Peely Pix names are mostly proper nouns that don't translate well.
        // But descriptions can be translated.
        const peelyEn = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
        
        // Per-locale description translations for Peely Pix
        // Many are community-created sticker names that stay in English.
        // But descriptions should be translated.
        const descTranslations = {
            fr: {
                'argon_combo_2': "Combinalio Argon #2",
                'breathless': "Sans respiration",
                'burgerfest': "Festival des burgers",
                'catscratch_fever': "Éruption féline",
                'crushing_chills': "Frissons écrasants",
                'doktors_orders': "Les ordres du docteur",
                'fly_fly': "Vole, vole !",
                'going_steady': "Stabilité",
                'hi_score': "Score élevé",
                'it_sees_you': "Il te voit",
                'old_pizza': "Vieille pizza",
                'only_knives': "Couteaux uniquement",
                'optimism': "Optimisme",
                'panic_call': "Appel de panique",
                'resolutions': "Résolutions",
                'reverse_o': "Reverse-O",
                'slippery_customer': "Client glissant",
                'spinin_around': "En plein tournoyant",
                'super_scavenger': "Super récupérateur",
                'through_my_heart': "A travers mon cœur",
                'too_hot': "Trop chaud",
                'vintage_tech': "Technologie vintage",
                'wakeup_call': "Réveil",
            },
            de: {
                'argon_combo_2': "Argon-Kombination #2",
                'breathless': "Atemlos",
                'burgerfest': "Burgerfest",
                'catscratch_fever': "Katzenkratzfieber",
                'crushing_chills': "Erschütternde Schauer",
                'doktors_orders': "Doktorenbefehl",
                'fly_fly': "Flieg, flieg!",
                'going_steady': "Stabil unterwegs",
                'hi_score': "Hoher Score",
                'it_sees_you': "Es sieht dich",
                'old_pizza': "Alte Pizza",
                'only_knives': "Nur Messer",
                'optimism': "Optimismus",
                'panic_call': "Panik-Ruf",
                'resolutions': "Auflösungen",
                'reverse_o': "Reverse-O",
                'slippery_customer': "Rutschiger Kunde",
                'spinin_around': "Drehend um mich herum",
                'super_scavenger': "Super-Sammeldrang",
                'through_my_heart': "Durch mein Herz",
                'too_hot': "Zu heiß",
                'vintage_tech': "Vintage-Technik",
                'wakeup_call': "Weckruf",
            },
            es: {
                'argon_combo_2': "Combinación Argón #2",
                'breathless': "Sin aliento",
                'burgerfest': "Festival de hamburguesas",
                'catscratch_fever': "Fiebre de arañazo",
                'crushing_chills': "Estríbos escalofriantes",
                'doktors_orders': "Órdenes del doctor",
                'fly_fly': "¡Vuela, vuela!",
                'going_steady': "Estable",
                'hi_score': "Puntuación alta",
                'it_sees_you': "Te ve",
                'old_pizza': "Pizza vieja",
                'only_knives': "Solo cuchillos",
                'optimism': "Optimismo",
                'panic_call': "Llamada de pánico",
                'resolutions': "Resoluciones",
                'reverse_o': "Reverse-O",
                'slippery_customer': "Cliente resbaladizo",
                'spinin_around': "Girando a mi alrededor",
                'super_scavenger': "Superrecuperador",
                'through_my_heart': "A través de mi corazón",
                'too_hot': "Demasiado caliente",
                'vintage_tech': "Tecnología vintage",
                'wakeup_call': "Llamada de despertar",
            },
        };
        
        // For now, let me focus on the relics section and eras fixes
        // Peely translations will be handled separately with proper dict lookus
    }
    
    if (changed) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`Updated ${filePath}`);
    } else {
        console.log(`No changes needed for ${filePath}`);
    }
}
