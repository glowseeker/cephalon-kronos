import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// === Q10/Q12: relics.* SECTION translations (11 bare keys) ===
const relicsSectionTrans = {
    expected_ducat: {
        fr: 'Ducats attendus', de: 'Erwartete Dukaten', es: 'Ducats esperados', it: 'Ducati previsti',
        ja: '期待ダクタ', ko: '기대 덕카', pl: 'Oczekiwane dukaty', pt: 'Ducats esperados',
        ru: 'Ожидаемые дукаты', tc: '預期達卡', th: 'ดุ๊กท์ที่คาดหวัง', tr: 'Beklenen Dukat',
        uk: 'Очікувані дукати', zh: '期待达卡',
    },
    expected_platinum: {
        fr: 'Platine attendue', de: 'Erwartetes Platinum', es: 'Platino esperado', it: 'Platinum prevista',
        ja: '期待プラチナ', ko: '기대 플랫', pl: 'Oczekiwana platyna', pt: 'Platina esperada',
        ru: 'Ожидаемая платина', tc: '預期白金', th: 'แพลตตินัมที่คาดหวัง', tr: 'Beklenen Platinum',
        uk: 'Очікувана платина', zh: '期待白金',
    },
    no_relics_inventory: {
        fr: 'Aucune relique dans l\'inventaire', de: 'Keine Reliquien im Inventar',
        es: 'No hay reliquias en el inventario', it: 'Nessuna reliquia nell\'inventario',
        ja: 'インベントリに遺物がありません', ko: '인벤토리에 성유물이 없습니다',
        pl: 'Brak reliktów w inwentarzu', pt: 'Nenhuma reliquia no inventário',
        ru: 'Нет реликвий в инвентаре', tc: '背包中沒有遺物', th: 'ไม่มีเรลิกในอินเวนทอรี',
        tr: 'Envanterde ilâhlik yok', uk: 'Немає реліквій у інвентарі', zh: '背包中没有遗物',
    },
    no_relics_search: {
        fr: 'Aucune relique ne correspond à votre recherche', de: 'Keine Reliquien entsprechen Ihrer Suche',
        es: 'Ninguna reliquia coincide con tu búsqueda', it: 'Nessuna reliquia corrisponde alla ricerca',
        ja: '検索に一致する遺物がありません', ko: '검색 조건에 맞는 성유물이 없습니다',
        pl: 'Brak reliktów spełniających kryteria', pt: 'Nenhuma reliquia corresponde à pesquisa',
        ru: 'Нет реликвий, соответствующих поиску', tc: '沒有遺物符合您的搜尋', th: 'ไม่มีเรลิกที่ตรงกับการค้นหา',
        tr: 'Aramanıza uygun ilâhlik yok', uk: 'Немає реліквій, що відповідають пошуку', zh: '没有遗物符合您的搜索',
    },
    sort_asc: {
        fr: 'Croissant', de: 'Aufsteigend', es: 'Ascendente', it: 'Ascendente',
        ja: '昇順', ko: '오름차순', pl: 'Rosnąco', pt: 'Ascendente',
        ru: 'По возрастанию', tc: '升序', th: 'เรียงจากน้อยไปมาก', tr: 'Artan',
        uk: 'За зростанням', zh: '升序',
    },
    sort_desc: {
        fr: 'Décroissant', de: 'Absteigend', es: 'Descendente', it: 'Discendente',
        ja: '降順', ko: '내림차순', pl: 'Malejąco', pt: 'Descendente',
        ru: 'По убыванию', tc: '降序', th: 'เรียงจากมากไปน้อย', tr: 'Azalan',
        uk: 'За спаданням', zh: '降序',
    },
    sort_ducat: {
        fr: 'Trier par Ducats', de: 'Nach Dukaten sortieren', es: 'Ordenar por Ducats',
        it: 'Ordina per Ducat', ja: 'ダクタで並び替え', ko: '덕카별 정렬',
        pl: 'Sortuj według dukatów', pt: 'Ordenar por Ducats', ru: 'Сортировать по дукатам',
        tc: '按達卡排序', th: 'เรียงตามดุ๊กท์', tr: 'Dukata göre sırala',
        uk: 'Сортувати за дукатами', zh: '按达卡排序',
    },
    sort_ducat_gain: {
        fr: 'Gain de Ducats', de: 'Dukaten-Gewinn', es: 'Ganancia de Ducats',
        it: 'Guadagno di Ducat', ja: 'ダクタ獲得', ko: '덕카 획득',
        pl: 'Zysk dukatów', pt: 'Ganho de Ducats', ru: 'Прибыль дукатов',
        tc: '達卡獲取', th: 'ผลตอนดุ๊กท์', tr: 'Dukat kazancı',
        uk: 'Надходження дукатів', zh: '达卡获取',
    },
    sort_name: {
        fr: 'Nom', de: 'Name', es: 'Nombre', it: 'Nome',
        ja: '名前', ko: '이름', pl: 'Nazwa', pt: 'Nome',
        ru: 'Название', tc: '名稱', th: 'ชื่อ', tr: 'İsim',
        uk: 'Назва', zh: '名称',
    },
    sort_plat: {
        fr: 'Trier par Platine', de: 'Nach Platinum sortieren', es: 'Ordenar por Platino',
        it: 'Ordina per Platinum', ja: 'プラチナで並び替え', ko: '플랫별 정렬',
        pl: 'Sortuj według platyny', pt: 'Ordenar por Platina', ru: 'Сортировать по платине',
        tc: '按白金排序', th: 'เรียงตามแพลตตินัม', tr: 'Platinaya göre sırala',
        uk: 'Сортувати за платиною', zh: '按白金排序',
    },
    sort_plat_gain: {
        fr: 'Gain de Platine', de: 'Platin-Gewinn', es: 'Ganancia de Platino',
        it: 'Guadagno di Platinum', ja: 'プラチナ獲得', ko: '플랫 획득',
        pl: 'Zysk platyny', pt: 'Ganho de Platina', ru: 'Прибыль платины',
        tc: '白金獲取', th: 'ผลตอนแพลตตินัม', tr: 'Platinum kazancı',
        uk: 'Надходження платини', zh: '白金获取',
    },
};

// === ui.relics.* FLAT key translations ===
const uiKeysTrans = {
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
        tc: '虛空痕跡', th: 'ร่องรอยวอยด์', tr: 'Void Traces',
        uk: 'Стежки Бездни', zh: '虚空痕迹',
    },
    'relics.ev_title': {
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
        ja: '遺物コレクションと評価', ko: '성유물 수집 및 가치 평가',
        pl: 'Kolekcja reliktów i wycena', pt: 'Coleta e valorização de relics',
        ru: 'Коллекция реликвий и оценка', tc: '遺物收集與評估', th: 'การเก็บรวบรวมและประเมิตเรลิก',
        tr: 'İlhâl toplama ve değerleme', uk: 'Колекція реліквій і оцінка',
        zh: '遗物收集与评估',
    },
    'relics.target': {
        fr: 'Cible', de: 'Ziel', es: 'Objetivo', it: 'Bersaglio',
        ja: 'ターゲット', ko: '대상', pl: 'Cel', pt: 'Alvo',
        ru: 'Цель', tc: '目標', th: 'เป้าหมาย', tr: 'Hedef',
        uk: 'Ціль', zh: '目标',
    },
    'relics.owned': {
        fr: 'Possédé :', de: 'Besessen:', es: 'Poseído:', it: 'Posseduto:',
        ja: '所持済み:', ko: '소유:', pl: 'Posiadany:', pt: 'Possuído:',
        ru: 'В наличии:', tc: '已擁有:', th: 'มีเจ้าของ:', tr: 'Sahip:',
        uk: 'Мається:', zh: '已拥有:',
    },
};

// === Peely translations ===
// Names are proper nouns — kept as-is (Per Peely Pix is community content)
// Descriptions contain game mechanics terms — translated as Path B strings
const peelyTrans = {
    // Key: sticker key name, Value: { locale: { name, description } }
    // Names stay EN (proper nouns). Descriptions translated.
    '/Lotus/Upgrades/Stickers/DropSpecialItemChanceOnWeakpointKillSticker': {
        fr: { name: 'Argon Combo #2', description: 'Lors d\'un coup à faible point: +20% de chance de déposer des Orbes de Santé, des Orbes d\'Énergie, des Munitions, des Phéroglandes ou des Charges SporeX.' },
        de: { name: 'Argon Combo #2', description: 'Bei Schwachpunkt-Treffer: +20% Chance auf Health Orbs, Energy Orbs, Ammo, Pheroglands oder SporeX-Ladungen.' },
        es: { name: 'Argon Combo #2', description: 'Al matar en punto débil: aumenta un 20% la probabilidad de dejar Orbes de Salud, Orbes de Energía, Munición, Pheroglands o Cargas SporeX.' },
        it: { name: 'Argon Combo #2', description: 'Alla kill su punto debole: +20% di chance di far cadere Health Orbs, Energy Orbs, Munizioni, Pheroglands o Cariche SporeX.' },
        ja: { name: 'Argon Combo #2', description: '弱点撃墺時: ヘルスオーブ、エナジーオーブ、弾薬、フェログランド、スポアエックスチャージのドロップ率が20%上昇' },
        ko: { name: 'Argon Combo #2', description: '약점 킬 시: 체력 구슬, 에너지 구슬, 탄약, 페로글랜드, 스포어X 충전의 드롭 확률이 20% 증가' },
        pl: { name: 'Argon Combo #2', description: 'Podczas zabicia w słaby punkt: +20% szansy na upuszczenie Orbów Zdrowia, Orbów Energii, Amunicji, Pheroglandów lub Ładunków SporeX.' },
        pt: { name: 'Argon Combo #2', description: 'Ao matar no ponto fraco: +20% de chance de dropar Health Orbs, Energy Orbs, Ammo, Pheroglands ou SporeX Charges.' },
        ru: { name: 'Argon Combo #2', description: 'При убийстве в слабую точку: шанс выпадения Health Orbs, Energy Orbs, Ammo, Pheroglands или SporeX Charges увеличен на 20%.' },
        tc: { name: 'Argon Combo #2', description: '弱點擊殺時: 掉落生命球、能量球、彈藥、Pheroglands或SporeX Charges的機率增加20%' },
        th: { name: 'Argon Combo #2', description: 'เมื่่อฆ่าที่จุดอ่อน: โชคที่จะโดรป Health Orbs, Energy Orbs, Ammo, Pheroglands หรือ SporeX Charges เพิ่มขึ้น 20%' },
        tr: { name: 'Argon Combo #2', description: 'Zayıf noktada kill: Health Orbs, Energy Orbs, Ammo, Pheroglands veya SporeX Charges düşme şansı %20 artar.' },
        uk: { name: 'Argon Combo #2', description: 'При вбивстві в слабку точку: шанс випадання Health Orbs, Energy Orbs, Ammo, Pheroglands або SporeX Charges збільшується на 20%.' },
        zh: { name: 'Argon Combo #2', description: '弱点击杀时: 生命球、能量球、弹药、Pheroglands或SporeX Charges的掉落率提高20%' },
    },
    '/Lotus/Upgrades/Stickers/ToxinGasResistanceOnHealthOrbSticker': {
        fr: { name: 'Breathless', description: 'Gagne 100% de résistance au Gaz et au Toxine pendant 30s. Les Health Orbs collectés ajoutent 20s.' },
        de: { name: 'Breathless', description: 'Erhalte 100% Gas- und Toxin-Widerstand für 30s. Gesammelte Health Orbs fügen 20s hinzu.' },
        es: { name: 'Breathless', description: 'Gana 100% de resistencia a Gas y Toxina durante 30s. Las Health Orbs recogidas añaden 20s.' },
        it: { name: 'Breathless', description: 'Ottieni il 100% di resistenza a Gas e Toxin per 30s. Le Health Orbs raccolte aggiungono 20s.' },
        ja: { name: 'Breathless', description: '30秒間ガスと毒の100%抵抗を獲得。回収したHealth Orbsで20秒追加' },
        ko: { name: 'Breathless', description: '30초간 Gas 및 Toxin 저항력 100% 획득. 수집한 Health Orbs로 20초 추가' },
        pl: { name: 'Breathless', description: 'Zdobywasz 100% odporności na Gas i Toxin na 30s. Zbierane Health Orbs dodają 20s.' },
        pt: { name: 'Breathless', description: 'Ganha 100% de resistência a Gas e Toxin por 30s. Health Orbs coletados adicionam 20s.' },
        ru: { name: 'Breathless', description: 'Получи 100% сопротивления Gas и Toxin на 30сек. Собранные Health Orbs добавляют 20сек.' },
        tc: { name: 'Breathless', description: '30秒內獲得100%的Gas和Toxin抗性。收集的Health Orbs增加20秒' },
        th: { name: 'Breathless', description: 'ได้รับความต้านทาน 100% ต่อ Gas และ Toxin เป็นเวลา 30s Health Orbs ที่เก็บได้เพิ่ม 20s' },
        tr: { name: 'Breathless', description: '30s boyunca Gas ve Toxin direnci %100 kazan. Topladığın Health Orbs 20s ekler.' },
        uk: { name: 'Breathless', description: 'Отримаєш 100% опору до Gas і Toxin на 30сек. Зібрані Health Orbs додають 20сек.' },
        zh: { name: 'Breathless', description: '获得30秒的100% Gas和Toxin抗性。收集的Health Orbs增加20秒' },
    },
    '/Lotus/Upgrades/Stickers/DropHealingBurgerChanceSticker': {
        fr: { name: 'Burgerfest', description: 'Les ennemis ont 15% de chance de déposer des Caisses Argon Burger qui peuvent soigner les alliés proches de 10% et les cibles de défense de 100%.' },
        de: { name: 'Burgerfest', description: 'Feinde haben 15% Chance, Argon Burger Boxen zu dropfen, die nahe Alliierten um 10% und Verteidigungsziele um 100% heilen können.' },
        es: { name: 'Burgerfest', description: 'Los enemigos tienen un 15% de probabilidad de dejar Cajas de Hamburguesa de Argón que pueden curar aliados cercanos en un 10% y objetivos de defensa en un 100%.' },
        it: { name: 'Burgerfest', description: 'I nemici hanno un 15% di chance di far cadere Argon Burger Boxes che possono guarire alleati vicini del 10% e obiettivi di difesa del 100%.' },
        ja: { name: 'Burgerfest', description: '敵が15%の確率でアルゴンバーガーボックスをドロップ 近くの味方を10%、防衛目標を100%回復' },
        ko: { name: 'Burgerfest', description: '적이 15% 확률로 아르곤 버거 상자를 드롭. 근처 동료 치유 10%, 방어 목표 100%' },
        pl: { name: 'Burgerfest', description: 'Wrogowie mają 15% szansy na upuszczenie Pudełek Argon Burger, które mogą leczyć najbliższych sojuszników o 10% i cele obronne o 100%.' },
        pt: { name: 'Burgerfest', description: 'Inimigos têm 15% de chance de dropar Argon Burger Boxes que podem curar aliados próximos em 10% e alvos de defesa em 100%.' },
        ru: { name: 'Burgerfest', description: 'Враги имеют 15% шанс выпустить Argon Burger Boxes, которые могут лечить ближайших союзников на 10% и цели обороны на 100%.' },
        tc: { name: 'Burgerfest', description: '敵人有15%機率掉落阿根布堡士 박스 可治療附近盟友10%和防禦目標100%' },
        th: { name: 'Burgerfest', description: 'ศัตร์มีโอกาส 15% ในการโดรป Argon Burger Boxes ที่สามารถหายให้เพื่อนร่วมทีมใกล้เคียง 10% และเป้าหมายการป้องกัน 100%' },
        tr: { name: 'Burgerfest', description: 'Düşmanların %15'i Argon Burger Kutuları bırakma şansı var, bu kutular yakındaki müttefikleri %10 ve savunma hedeflerini %100 iyileştirebilir.' },
        uk: { name: 'Burgerfest', description: 'Вороги мають 15% шанс випустити Argon Burger Boxes, які можуть лікувати найближчих союзників на 10% і цілі оборони на 100%.' },
        zh: { name: 'Burgerfest', description: '敌人有15%概率掉落阿根堡士盒子, 可治疗附近盟友10%和防御目标100%' },
    },
    '/Lotus/Upgrades/Stickers/StickerSporePrimer': {
        fr: { name: 'Catscratch Fever', description: 'Toutes les 20s, un ennemi dans les 30m est affecté par les Spores de Saryn.' },
        de: { name: 'Catscratch Fever', description: 'Jede 20s wird ein Enemy innerhalb von 30m von Saryns Sporen betroffen.' },
        es: { name: 'Catscratch Fever', description: 'Cada 20s, un enemigo dentro de 30m es afectado por las esporas de Saryn.' },
        it: { name: 'Catscratch Fever', description: 'Ogni 20s, un nemico entro 30m è colpito dalle Spore di Saryn.' },
        ja: { name: 'Catscratch Fever', description: '20秒ごとに30m以内の敵がサリンのスポアに影響を受ける' },
        ko: { name: 'Catscratch Fever', description: '20초마다 30m 내의 적이 Saryn의 Spores 영향을 받음' },
        pl: { name: 'Catscratch Fever', description: 'Co 20s, przeciwnik w odległości 30m zostaje dotknięty przez Zgrubienia Saryn.' },
        pt: { name: 'Catscratch Fever', description: 'A cada 20s, um inimigo dentro de 30m é afetado pelas Spores de Saryn.' },
        ru: { name: 'Catscratch Fever', description: 'Каждые 20сек, враг в пределах 30м поражается поражается Spores Saryn.' },
        tc: { name: 'Catscratch Fever', description: '每20秒內30m範圍的敵人被Saryn的Spores影響' },
        th: { name: 'Catscratch Fever', description: 'ทุก 20s มีศัตร์ภายใน 30m ที่ถูกสัมผัสโดยเห็ดรส of Saryn' },
        tr: { name: 'Catscratch Fever', description: 'Her 20s\'da, 30m içindeki bir düşman Saryn\'in Sporeları altında.' },
        uk: { name: 'Catscratch Fever', description: 'Кожні 20сек, ворог у межах 30м постраждає від Spores Saryn.' },
        zh: { name: 'Catscratch Fever', description: '每20秒, 30m内的敌人被Saryn的Spores影响' },
    },
    '/Lotus/Upgrades/Stickers/CreateShieldOnHeavySlamSticker': {
        fr: { name: 'Crushing Chills', description: 'Slam lourd avec un combo x6 crée jusqu\'à 3 Snow Globes sur un cooldown de 10s.' },
        de: { name: 'Crushing Chills', description: 'Schwerer Slam mit 6x Combo erzeugt bis zu 3 Snow Globes mit 10s Cooldown.' },
        es: { name: 'Crushing Chills', description: 'Slam pesado con combo x6 crea hasta 3 Snow Globes en un cooldown de 10s.' },
        it: { name: 'Crushing Chills', description: 'Heavy Slam con combo x6 crea fino a 3 Snow Globes con cooldown di 10s.' },
        ja: { name: 'Crushing Chills', description: '6コンボでヘビースラムをすると10秒クールダウンで最大3つのスノーグローブを生成' },
        ko: { name: 'Crushing Chills', description: '6x 콤보 헤비 슬램 시 10초 쿨다운으로 최대 3개의 Snow Globes 생성' },
        pl: { name: 'Crushing Chills', description: 'Ciężki Slam z 6x combo tworzy do 3 Snow Globes na 10s cooldown.' },
        pt: { name: 'Crushing Chills', description: 'Slam pesado com combo x6 cria até 3 Snow Globes no cooldown de 10s.' },
        ru: { name: 'Crushing Chills', description: 'Взрывная атака с 6x комбо создаёт до 3 Snow Globes с 10сек кулдауном.' },
        tc: { name: 'Crushing Chills', description: '6x combo Heavy Slam產生最多3個Snow Globes 10秒冷卻' },
        th: { name: 'Crushing Chills', description: 'Heavy Slam กับคอมโบ x6 สร้าง Snow Globes ได้สูงสุด 3 ลูกบนคูลดาวน์ 10s' },
        tr: { name: 'Crushing Chills', description: '6x combo ile Heavy Slam, 10s soğuma süresi ile 3 Snow Globe oluşturur.' },
        uk: { name: 'Crushing Chills', description: 'Важкий Slam з 6x комбо створює до 3 Snow Globes з 10сек кулдауном.' },
        zh: { name: 'Crushing Chills', description: '6x combo Heavy Slam生成最多3个Snow Globes, 10秒冷却' },
    },
    '/Lotus/Upgrades/Stickers/StickerEnemyShotgun': {
        fr: { name: 'Doktor\'s Orders', description: 'Équipe un EFV-8 Mars avec +450% de dégâts comme arme secondaire.' },
        de: { name: 'Doktor\'s Orders', description: 'Rüste eine EFV-8 Mars mit +450% Schaden als Sekundärwaffe aus.' },
        es: { name: 'Doktor\'s Orders', description: 'Equipa un EFV-8 Mars con +450% de daño como arma secundaria.' },
        it: { name: 'Doktor\'s Orders', description: 'Attrezza un EFV-8 Mars con +450% di danni come arma secondaria.' },
        ja: { name: 'Doktor\'s Orders', description: 'EFV-8マースを+450%ダメージで二刀武器として装備' },
        ko: { name: 'Doktor\'s Orders', description: 'EFV-8 Mars를 +450% 데미지로 보조 무기로 장착' },
        pl: { name: 'Doktor\'s Orders', description: 'Uzbroj swór EFV-8 Mars z +450% obrażeń jako broń drugorzędną.' },
        pt: { name: 'Doktor\'s Orders', description: 'Equipe um EFV-8 Mars com +450% de dano como arma secundária.' },
        ru: { name: 'Doktor\'s Orders', description: 'Экипируйте EFV-8 Mars с +450% урона как вторичное оружие.' },
        tc: { name: 'Doktor\'s Orders', description: '裝備EFV-8馬斯為+450%傷害的副武器' },
        th: { name: 'Doktor\'s Orders', description: '裝備EFV-8馬斯為副武器 +450%傷害' },
        tr: { name: 'Doktor\'s Orders', description: 'EFV-8 Mars\'ı +450% hasarla ikincil silah olarak kuşandır.' },
        uk: { name: 'Doktor\'s Orders', description: 'Екіпуйте EFV-8 Mars з +450% урону як другорядну зброю.' },
        zh: { name: 'Doktor\'s Orders', description: '装备EFV-8马斯为+450%伤害的副武器' },
    },
    '/Lotus/Upgrades/Stickers/DropEfervonGrenadeChanceSticker': {
        fr: { name: 'Fly, Fly!', description: 'Les ennemis ont 15% de chance de déposer des grenades qui éliminent la contamination Hell-Scrubber.' },
        de: { name: 'Fly, Fly!', description: 'Feinde haben 15% Chance, Granaten zu dropfen, die Hell-Scrubber-Kontamination bereinigen.' },
        es: { name: 'Fly, Fly!', description: 'Los enemigos tienen un 15% de probabilidad de dejar grenadas que limpian la contaminación Hell-Scrubber.' },
        it: { name: 'Fly, Fly!', description: 'I nemici hanno un 15% di chance di far cadere granate che puliscono la contaminazione Hell-Scrubber.' },
        ja: { name: 'Fly, Fly!', description: '敵が15%の確率でヘルスクランバー汚染をクリアするグレネードをドロップ' },
        ko: { name: 'Fly, Fly!', description: '적이 15% 확률로 Hell-Scrubber 오염을 지우는 수류탄 드롭' },
        pl: { name: 'Fly, Fly!', description: 'Wrogowie mają 15% szansy na upuszczenie granatów, które czyścią zanieczyszczenie Hell-Scrubber.' },
        pt: { name: 'Fly, Fly!', description: 'Inimigos têm 15% de chance de dropar granadas que limpam a contaminação Hell-Scrubber.' },
        ru: { name: 'Fly, Fly!', description: 'Враги имеют 15% шанс выпустить гранаты, которые очищают загрязнение Hell-Scrubber.' },
        tc: { name: 'Fly, Fly!', description: '敵人15%機率掉落清除Hell-Scrubber污染的手榴弹' },
        th: { name: 'Fly, Fly!', description: 'ศัตร์มีโอกาส 15% ในการโดรปรากวัลที่ชี้ฮิล-สเกรับเบอร์ความมืด' },
        tr: { name: 'Fly, Fly!', description: 'Düşmanların %15\'i kirliliği temizleyen Hell-Scrubber granatları bırakma şansı.' },
        uk: { name: 'Fly, Fly!', description: 'Вороги мають 15% шанс випустити гранати, які зачищують забруднення Hell-Scrubber.' },
        zh: { name: 'Fly, Fly!', description: '敌人15%概率掉落清除Hell-Scrubber污染的手榴弹' },
    },
    '/Lotus/Upgrades/Stickers/AvatarKnockdownResistanceSticker': {
        fr: { name: 'Going Steady', description: '100% de chance de résister au Knockdown.' },
        de: { name: 'Going Steady', description: '100% Chance, Knockdown zu widerstehen.' },
        es: { name: 'Going Steady', description: '100% de probabilidad de resistir Knockdown.' },
        it: { name: 'Going Steady', description: '100% di chance di resistere al Knockdown.' },
        ja: { name: 'Going Steady', description: 'ノックダウン耐性100%' },
        ko: { name: 'Going Steady', description: '넉다운 저항 100%' },
        pl: { name: 'Going Steady', description: '100% szansy na odparzenie Knockdown.' },
        pt: { name: 'Going Steady', description: '100% de chance de resistir Knockdown.' },
        ru: { name: 'Going Steady', description: '100% шанс сопротивиться Knockdown.' },
        tc: { name: 'Going Steady', description: '100%抵抗擊倒' },
        th: { name: 'Going Steady', description: '100% โอกาสต่อสู้กับ Knockdown' },
        tr: { name: 'Going Steady', description: 'Knockdown\'a karşı 100% dayanma şansı.' },
        uk: { name: 'Going Steady', description: '100% шанс опиратися Knockdown.' },
        zh: { name: 'Going Steady', description: '100%抵抗击倒' },
    },
    '/Lotus/Upgrades/Stickers/DeathPreventionOnKillsSticker': {
        fr: { name: 'Hi-Score', description: 'Gagne 20 points par kill, 100 par kill à point faible. Revifs bonus à 1000, 2500, 5000 points.' },
        de: { name: 'Hi-Score', description: 'Erhalte 20 Punkte pro Kill, 100 pro Weakpoint Kill. Bonus-Wiederbelebungen bei 1000, 2500, 5000 Punkten.' },
        es: { name: 'Hi-Score', description: 'Gana 20 puntos por kill, 100 por Weakpoint Kill. Revives bonus al alcanzar 1000, 2500, 5000 puntos.' },
        it: { name: 'Hi-Score', description: 'Ottieni 20 punti per kill, 100 per Weakpoint Kill. Revivi bonus a 1000, 2500, 5000 punti.' },
        ja: { name: 'Hi-Score', description: 'キルにつき20ポイント、Weakpoint Killにつき100ポイント 1000, 2500, 5000ポイントでボーナスリヴィブ' },
        ko: { name: 'Hi-Score', description: '킬당 20포인트, Weakpoint Kill당 100포인트. 1000, 2500, 5000포인트에서 보너스 부활' },
        pl: { name: 'Hi-Score', description: 'Zdobywasz 20 punktów za kill, 100 za Weakpoint Kill. Bonusowe odradnianie przy 1000, 2500, 5000 punktach.' },
        pt: { name: 'Hi-Score', description: 'Ganha 20 pontos por kill, 100 por Weakpoint Kill. Revives bônus em 1000, 2500, 5000 pontos.' },
        ru: { name: 'Hi-Score', description: 'Получи 20 очков за kill, 100 за Weakpoint Kill. Бонусные воскрешения при 1000, 2500, 5000 очках.' },
        tc: { name: 'Hi-Score', description: '擊殺獲得20分 弱點擊殺獲得100分 1000、2500、5000分時獲得額外復活' },
        th: { name: 'Hi-Score', description: 'ได้ 20 คะแนนต่อ kill 100 คะแนนต่อ Weakpoint Kill เพิ่มการกลับมาที่ 1000 2500 5000 คะแนน' },
        tr: { name: 'Hi-Score', description: 'Her kill için 20 puan, Weakpoint Kill için 100 puan. 1000, 2500, 5000 puanlarda bonus diriliş.' },
        uk: { name: 'Hi-Score', description: 'Отримаєш 20 очок за вбивство, 100 за Weakpoint Kill. Бонусні Воскресіння при 1000, 2500, 5000 очках.' },
        zh: { name: 'Hi-Score', description: '每次击杀获得20分, Weakpoint Kill获得100分. 1000, 2500, 5000分获得额外复活' },
    },
    '/Lotus/Upgrades/Stickers/CreateChasingAntiMatterDropSticker': {
        fr: { name: 'It Sees You', description: 'Une goutte Anti-Matter apparaît à 25m de distance et poursuit toutes les 20s. Gagne 1 Pix Chip en cas de succès.' },
        de: { name: 'It Sees You', description: 'Ein Anti-Matter-Tropfen erscheint 25m entfernt und jagt jede 20s. Erhalte 1 Pix Chip bei Erfolg.' },
        es: { name: 'It Sees You', description: 'Una gota de Anti-Matter aparece a 25m de distancia y persigue cada 20s. Gana 1 Pix Chip al tener éxito.' },
        it: { name: 'It Sees You', description: 'Una goccia di Anti-Matter appare a 25m di distanza e insegue ogni 20s. Vinci 1 Pix Chip in caso di successo.' },
        ja: { name: 'It Sees You', description: 'アンチマターディスト 25m離れた場所に出現し20秒ごとに追跡 成功でPix Chip 1個獲得' },
        ko: { name: 'It Sees You', description: 'Anti-Matter drop이 25m 거리에서 나타나 매 20초마다 추격. 성공 시 Pix Chip 1개 획득' },
        pl: { name: 'It Sees You', description: 'Kropla Anti-Matter pojawia się 25m dalej i poluje co 20s.Zdobywasz 1 Pix Chip przy sukcesie.' },
        pt: { name: 'It Sees You', description: 'Uma gota de Anti-Matter aparece a 25m de distância e persegue a cada 20s. Ganha 1 Pix Chip em caso de sucesso.' },
        ru: { name: 'It Sees You', description: 'Капля Anti-Matter появляется на расстоянии 25м и преследует каждые 20сек.Получи 1 Pix Chip при успехе.' },
        tc: { name: 'It Sees You', description: 'Anti-Matter drop出現在25m遠處每20秒追襲一次 成功獲得1 Pix Chip' },
        th: { name: 'It Sees You', description: 'Anti-Matter drop ปรากฏห่าง 25m และไล่ตามทุก 20s ได้รับ 1 Pix Chip เมื่อสำเร็จ' },
        tr: { name: 'It Sees You', description: 'Anti-Matter damlası 25m uzaklıkta belirir ve her 20s\'da bir kovalar. Başarıda 1 Pix Chip kazan.' },
        uk: { name: 'It Sees You', description: 'Крапл Anti-Matter з'являється на відстані 25м і полюбисть 20сек.Отримаєть 1 Pix Chip при успіху.' },
        zh: { name: 'It Sees You', description: 'Anti-Matter drop出现在25m远处, 每20秒追击一次, 成功获得1 Pix Chip' },
    },
    '/Lotus/Upgrades/Stickers/ToxinProcOnDamageSticker': {
        fr: { name: 'Old Pizza', description: 'Lorsque dégâté: 6% de chance de recevoir le statut Toxin. Cooldown: 5s. Gagne 1 Pix Chip en cas de succès.' },
        de: { name: 'Old Pizza', description: 'Bei Schaden: 6% Chance auf Toxin-Status. Cooldown: 5s. Erhalte 1 Pix Chip bei Erfolg.' },
        es: { name: 'Old Pizza', description: 'Al recibir daño: 6% de probabilidad de recibir el estado Toxin. Enfriamiento: 5s. Gana 1 Pix Chip con éxito.' },
        it: { name: 'Old Pizza', description: 'Quando danneggiato: 6% di chance di ricevere lo status Toxin. Cooldown: 5s. Vinci 1 Pix Chip in caso di successo.' },
        ja: { name: 'Old Pizza', description: 'ダメージを受けた時: Toxinステータスを6%の確率で受ける クールダウン: 5s 成功でPix Chip 1個獲得' },
        ko: { name: 'Old Pizza', description: '피해를 입으면: Toxin 상태이상 6% 확률. 쿨다운: 5초. 성공 시 Pix Chip 1개 획득' },
        pl: { name: 'Old Pizza', description: 'Gdy zadany obrażenie: 6% szansy na otrzymanie statusu Toxin. Cooldown: 5s. Odzyskaj 1 Pix Chip przy sukcesie.' },
        pt: { name: 'Old Pizza', description: 'Ao receber dano: 6% de chance de receber o status Toxin. Resfriamento: 5s. Ganha 1 Pix Chip com sucesso.' },
        ru: { name: 'Old Pizza', description: 'При получении урона: 6% шанс получить статус Toxin. Кулдаун: 5сек.Получи 1 Pix Chip при успехе.' },
        tc: { name: 'Old Pizza', description: '受到傷害時: 6%機率獲得Toxin狀態. 冷卻: 5秒. 成功獲得1 Pix Chip' },
        th: { name: 'Old Pizza', description: 'เมื่อได้รับความเสียหมด: 6% โอกาสได้รับสถานะ Toxin เวลาหยุด: 5s ได้รับ 1 Pix Chip เมื่อสมบูรณ์' },
        tr: { name: 'Old Pizza', description: 'Hasar alındığında: Toxin durumunu %6 şansla al. Bekleme süresi: 5s. Başarısız 1 Pix Chip kazan.' },
        uk: { name: 'Old Pizza', description: 'При пошкодженні: 6% шанс отримати статус Toxin. Відновлення: 5сек. Отримає 1 Pix Chip при успіху.' },
        zh: { name: 'Old Pizza', description: '受到伤害时: 6%几率获得Toxin状态. 冷却: 5秒. 成功获得1 Pix Chip' },
    },
    '/Lotus/Upgrades/Stickers/StickerEnemyMelee': {
        fr: { name: 'Only Knives', description: 'Équipe les Scaldra Dual Viciss avec +450% de dégâts comme armes de mêlée.' },
        de: { name: 'Only Knives', description: 'Rüste Scaldra Dual Viciss mit +450% Schaden als Nahkampfwaffen aus.' },
        es: { name: 'Only Knives', description: 'Equipa Scaldra Dual Viciss con +450% de daño como armas cuerpo a cuerpo.' },
        it: { name: 'Only Knives', description: 'Attrezza Scaldra Dual Viciss con +450% di danni come armi melee.' },
        ja: { name: 'Only Knives', description: 'Scaldra Dual Vicissを+450%ダメージで近接武器として装備' },
        ko: { name: 'Only Knives', description: 'Scaldra Dual Viciss를 +450% 데미지로 근접 무기로 장착' },
        pl: { name: 'Only Knives', description: 'Uzbroj Scaldra Dual Viciss z +450% obrażeń jako bronie białego ręcznego.' },
        pt: { name: 'Only Knives', description: 'Equipe Scaldra Dual Viciss com +450% de dano como armas corpo a corpo.' },
        ru: { name: 'Only Knives', description: 'Экипируйте Scaldra Dual Viciss с +450% урона как ближнее оружие.' },
        tc: { name: 'Only Knives', description: '裝備Scaldra Dual Viciss為+450%傷害的近戰武器' },
        th: { name: 'Only Knives', description: 'ฮีคาร์เตอร์ Scaldra Dual Viciss เป็นอาวุธประชานรูป +450% ดาเมจ' },
        tr: { name: 'Only Knives', description: 'Scaldra Dual Viciss\'ı +450% hasarla yakın tehdide silah olarak kuşandır.' },
        uk: { name: 'Only Knives', description: 'Екіпуйте Scaldra Dual Viciss з +450% урону як ближнє зброю.' },
        zh: { name: 'Only Knives', description: '装备Scaldra Dual Viciss为+450%伤害的近战武器' },
    },
    '/Lotus/Upgrades/Stickers/FreezePlayerOverTimeSticker': {
        fr: { name: 'Optimism', description: 'Génère des piles de Froid toutes les 8s. Gèle à 10 piles pour 3s. Roule ou Void Sling pour dégeler 3 piles.' },
        de: { name: 'Optimism', description: 'Erzeuge Cold-Stacks alle 8s. Gefrieren bei 10 Stacks für 3s. Rollen oder Void Sling, um 3 Stacks zum auftauen.' },
        es: { name: 'Optimism', description: 'Acumula Cold stacks cada 8s. Congela a 10 stacks por 3s. Haz roll o Void Sling para descongelar 3 stacks.' },
        it: { name: 'Optimism', description: 'Accumula Cold stack ogni 8s. Congela a 10 stack per 3s. Rolla o Void Sling per scongelare 3 stack.' },
        ja: { name: 'Optimism', description: '8秒ごとにColdスタックを蓄積 10スタックで3秒間凍結 ロールかVoid Slingで3スタック解除' },
        ko: { name: 'Optimism', description: '8초마다 Cold 스택 축적. 10스택 시 3초간 동결. 롤이나 Void Sling으로 3스택 녹화' },
        pl: { name: 'Optimism', description: 'Zbudowuje Cold Stacks co 8s. Zamarza na 10 Stacków na 3s. Rolling lub Void Sling, aby roztopić 3 Stacki.' },
        pt: { name: 'Optimism', description: 'Acumula Cold stacks a cada 8s. Congele a 10 stacks por 3s. Role ou Void Sling para descongelar 3 stacks.' },
        ru: { name: 'Optimism', description: 'Накапливает Cold стаки каждые 8сек. Замораживает на 10 стаков на 3сек. Ролл или Void Sling чтобы растопить 3 стака.' },
        tc: { name: 'Optimism', description: '每8秒積累Cold Stacks. 10 stacks凍結3秒. Roll或Void Sling解凍3 stacks' },
        th: { name: 'Optimism', description: 'สะสม Cold stacks ทุก 8s แช่เย็นที่ 10 stacks เป็นเวลา 3s Roll หรือ Void Sling เพื่อละลาย 3 stacks' },
        tr: { name: 'Optimism', description: '8s\'da bir Cold yığınları oluştur. 10 yığın için 3s don. 3 yığını eritmek için Roll veya Void Sling.' },
        uk: { name: 'Optimism', description: 'Накопичує Cold стаки кожні 8сек. Заморожує на 10 стаків на 3сек. Ролл або Void Sling, щоб розтопити 3 стаки.' },
        zh: { name: 'Optimism', description: '每8秒累积Cold Stacks. 10 stacks冰结3秒. Roll或Void Sling融化3 stacks' },
    },
    '/Lotus/Upgrades/Stickers/NPCReviveSticker': {
        fr: { name: 'Panic Call', description: 'Minerva ou Velimir vous ressusciteront. Cooldown: 30s.' },
        de: { name: 'Panic Call', description: 'Minerva oder Velimir wird dich wiederbeleben. Cooldown: 30s.' },
        es: { name: 'Panic Call', description: 'Minerva o Velimir intentarán revivirte. Cooldown: 30s.' },
        it: { name: 'Panic Call', description: 'Minerva o Velimir cercheranno di far rientrare. Cooldown: 30s.' },
        ja: { name: 'Panic Call', description: 'MinervaまたはVelimirが蘇生を試みます クールダウン: 30秒' },
        ko: { name: 'Panic Call', description: 'Minerva 또는 Velimir가 부활을 시도합니다. 쿨다운: 30초' },
        pl: { name: 'Panic Call', description: 'Minerva lub Velimir postaną cię odradzić. Cooldown: 30s.' },
        pt: { name: 'Panic Call', description: 'Minerva ou Velimir tentarão reviving voc. Resfriamento: 30s.' },
        ru: { name: 'Panic Call', description: 'Майнера или Велимир попытаются оживить вас. Кулдаун: 30сек.' },
        tc: { name: 'Panic Call', description: 'Minerva或Velimir將嘗試復活你 冷卻: 30秒' },
        th: { name: 'Panic Call', description: 'Minerva หรือ Velimir จะพยายามเกิดขึ้นใหม่ เวลาหยุด: 30s' },
        tr: { name: 'Panic Call', description: 'Minerva veya Velimir sizi diriltmeye çalışacak. Bekleme süresi: 30s.' },
        uk: { name: 'Panic Call', description: 'Мінerva або Велімір спробують вас оживити. Відновлення: 30сек.' },
        zh: { name: 'Panic Call', description: 'Minerva或Velimir将尝试复活你 冷却: 30秒' },
    },
    '/Lotus/Upgrades/Stickers/StickerEnemyRifle': {
        fr: { name: 'Resolutions', description: 'Équipe un Purgator 1 avec +450% de dégâts comme arme principale.' },
        de: { name: 'Resolutions', description: 'Rüste einen Purgator 1 mit +450% Schaden als Hauptwaffe aus.' },
        es: { name: 'Resolutions', description: 'Equipa un Purgator 1 con +450% de daño como arma principal.' },
        it: { name: 'Resolutions', description: 'Attrezza un Purgator 1 con +450% di danni come arma principale.' },
        ja: { name: 'Resolutions', description: 'Purgator 1を+450%ダメージで主武器として装備' },
        ko: { name: 'Resolutions', description: 'Purgator 1를 +450% 데미지로 주 무기로 장착' },
        pl: { name: 'Resolutions', description: 'Uzbroj Purgator 1 z +450% obrażeń jako broń główną.' },
        pt: { name: 'Resolutions', description: 'Equipe um Purgator 1 com +450% de dano como arma principal.' },
        ru: { name: 'Resolutions', description: 'Экипируйте Purgator 1 с +450% урона как основное оружие.' },
        tc: { name: 'Resolutions', description: '裝備Purgator 1為+450%傷害的主武器' },
        th: { name: 'Resolutions', description: 'ฮีคาร์เตอร์ Purgator 1 เป็นอาวุธหลัก +450% ดาเมจ' },
        tr: { name: 'Resolutions', description: 'Purgator 1\'ı +450% hasarla ana silah olarak kuşandır.' },
        uk: { name: 'Resolutions', description: 'Екіпуйте Purgator 1 з +450% урону як головну зброю.' },
        zh: { name: 'Resolutions', description: '装备Purgator 1为+450%伤害的主武器' },
    },
    '/Lotus/Upgrades/Stickers/RemoveStatusesOnHeavyAttackSticker': {
        fr: { name: 'Reverse-O', description: 'Lors d\'un coup lourd: transfère les effets de statut négatifs sur les ennemis dans les 10m.' },
        de: { name: 'Reverse-O', description: 'Bei schwerem Angriff: übertrage negative Status-Effekte auf Feinde innerhalb von 10m.' },
        es: { name: 'Reverse-O', description: 'Al golpe pesado: transfiere efectos de estado negativos a enemigos en 10m.' },
        it: { name: 'Reverse-O', description: 'All\'attacco pesante: trasferisci effetti di status negativi sugli nemici entro 10m.' },
        ja: { name: 'Reverse-O', description: 'ヘビーアタックヒット時: 10m以内の敵に負のステータス効果を転送' },
        ko: { name: 'Reverse-O', description: '헤비 어택 히트 시: 10m 이내의 적에게 부정적인 상태 효과 전이' },
        pl: { name: 'Reverse-O', description: 'Przy ciężkim ataku: przenieś ujemne efekty statusu na wrogów w odległości 10m.' },
        pt: { name: 'Reverse-O', description: 'No golpe pesado: transfira efeitos de estado negativos para inimigos dentro de 10m.' },
        ru: { name: 'Reverse-O', description: 'При тяжелой атаке: перенеси отрицательные статусы на врагов в 10м.' },
        tc: { name: 'Reverse-O', description: '重擊命中時: 將負面狀態效果傳遞給10m內的敵人' },
        th: { name: 'Reverse-O', description: 'เมื่อเลือดหนักโจมตี: โอนเอฟเฟคสถานะลบให้ศัตร์ภายใน 10m' },
        tr: { name: 'Reverse-O', description: 'Ağır saldırı geldiğinde: negatif durum etkilerini 10m içindeki düşmanlara aktar.' },
        uk: { name: 'Reverse-O', description: 'При важкій атаку: перенеси від\'ємні статуси на ворогів у 10м.' },
        zh: { name: 'Reverse-O', description: '重击命中时: 将负面状态效果传递给10m内的敌人' },
    },
    '/Lotus/Upgrades/Stickers/EjectButtonSticker': {
        fr: { name: 'Slippery Customer', description: 'La première fois que tu es au sol: téléporte-toi en sécurité, revient avec 50% HP/Boucliers, invulnérable pendant 9s.' },
        de: { name: 'Slippery Customer', description: 'Beim ersten Mal Boden: teleportiere dich ins Sichere, belebe mit 50% HP/Schilden, invulnerbar für 9s.' },
        es: { name: 'Slippery Customer', description: 'La primera vez que caes: teletransportarte a un lugar seguro, revive con 50% HP/Balas, invulnerable por 9s.' },
        it: { name: 'Slippery Customer', description: 'La prima volta che cadi: teletrasportati al sicuro, riaffiora con 50% HP/Balestre, invulnerabile per 9s.' },
        ja: { name: 'Slippery Customer', description: '初回ダウン時: 安全にテレポート 50%HP/シールドで復活 9秒間無敵' },
        ko: { name: 'Slippery Customer', description: '처음 넘어질 때: 안전하게 텔레포트 50% HP/방어막으로 부활 9초간 무적' },
        pl: { name: 'Slippery Customer', description: 'Pierwszy raz, gdy upadniesz: teleportuj się na bezpieczne miejsce, odradnij z 50% HP/Pancerzami, nietylny na 9s.' },
        pt: { name: 'Slippery Customer', description: 'A primeira vez que você cair: teleporte-se para a segurança, revive com 50% HP/Pelotas, invulnerável por 9s.' },
        ru: { name: 'Slippery Customer', description: 'При первом падении: телепорта́ться в безопасное место, оживи с 50% HP/Щитами, неуязвим на 9сек.' },
        tc: { name: 'Slippery Customer', description: '第一次擊倒時: 安全傳送 50%HP/盾牌復活 9秒無敵' },
        th: { name: 'Slippery Customer', description: 'ครั้งแรกที่คุณลง: เทเบิร์ตไปยังที่ปลอดภัย ฟื้นฟู 50% HP/盾 9 วินาที ไม่เสียหาย' },
        tr: { name: 'Slippery Customer', description: 'İlk yıkıldığında: Güvenliğe ışınla, 50% HP/Kalkanla diril, 9s boyunca ölümsüz.' },
        uk: { name: 'Slippery Customer', description: 'Перший раз при падінні: телепортуйся в безпеку, оживи з 50% HP/Бронет, незламний на 9сек.' },
        zh: { name: 'Slippery Customer', description: '第一次击倒时: 安全传送, 50%HP/盾牌复活, 9秒无敌' },
    },
    '/Lotus/Upgrades/Stickers/NullStarOnWeakpointKillSticker': {
        fr: { name: 'Spinnin\' Around', description: 'Les coups à point faible génèrent 1 Null Star (max 18). Les Null Stars réduisent les dégâts de 5%.' },
        de: { name: 'Spinnin\' Around', description: 'Weakpoint-Kills erzeugen 1 Null Star (max 18). Null Stars reduzieren Schaden um 5%.' },
        es: { name: 'Spinnin\' Around', description: 'Las Weakpoint Kills generan 1 Null Star (máx. 18). Las Null Stars reducen el daño en 5%.' },
        it: { name: 'Spinnin\' Around', description: 'Le Weakpoint Kills generano 1 Null Star (max 18). Le Null Stars riducono i danni del 5%.' },
        ja: { name: 'Spinnin\' Around', description: '弱点撃墺でNull Starを1個生成 (最大18) Null Starはダメージを5%軽減' },
        ko: { name: 'Spinnin\' Around', description: '약점 킬 시 Null Star 1개 생성 (최대 18). Null Stars가 데미지 5% 감소' },
        pl: { name: 'Spinnin\' Around', description: 'Weakpoint Kill'i generują 1 Null Star (max 18). Null Stars zmniejszają obrażenia o 5%.' },
        pt: { name: 'Spinnin\' Around', description: 'As Weakpoint Kills geram 1 Null Star (máx. 18). As Null Stars reduzem o dano em 5%.' },
        ru: { name: 'Spinnin\' Around', description: 'Weakpoint Kills генерируют 1 Null Star (max 18). Null Stars уменьшают урон на 5%.' },
        tc: { name: 'Spinnin\' Around', description: 'Weakpoint Kills產生1 Null Star (最大18) Null Stars減少5%傷害' },
        th: { name: 'Spinnin\' Around', description: 'การฆ่าที่จุดอ่อนสร้าง Null Star 1 ตัว (สูงสุด 18) Null Stars ลดความเสียหมด 5%' },
        tr: { name: 'Spinnin\' Around', description: 'Weakpoint Kills 1 Null Star üretir (max 18). Null Stars hasarı %5 azaltır.' },
        uk: { name: 'Spinnin\' Around', description: 'Weakpoint Kills створюють 1 Null Star (max 18). Null Stars зменшують урон на 5%.' },
        zh: { name: 'Spinnin\' Around', description: 'Weakpoint Kills产生1 Null Star (最大18) Null Stars减少5%伤害' },
    },
    '/Lotus/Upgrades/Stickers/ElementalAmmoChanceOnEximusKillSticker': {
        fr: { name: 'Super Scavenger', description: 'Lors d\'un kill d\'Eximus: 45% de chance de déposer un Elemental Ammo Pack.' },
        de: { name: 'Super Scavenger', description: 'Bei Eximus-Kill: 45% Chance auf Elemental Ammo Pack.' },
        es: { name: 'Super Scavenger', description: 'Al matar a un Eximus: 45% de probabilidad de dejar un Elemental Ammo Pack.' },
        it: { name: 'Super Scavenger', description: 'Alla kill di Eximus: 45% di chance di far cadere un Elemental Ammo Pack.' },
        ja: { name: 'Super Scavenger', description: 'Eximusキル時: Elemental Ammo Packが45%の確率でドロップ' },
        ko: { name: 'Super Scavenger', description: 'Eximus 킬 시: Elemental Ammo Pack 45% 확률 드롭' },
        pl: { name: 'Super Scavenger', description: 'Podczas zabicia Eximus: 45% szansy na upuszczenie Elemental Ammo Pack.' },
        pt: { name: 'Super Scavenger', description: 'Ao matar um Eximus: 45% de chance de dropar um Elemental Ammo Pack.' },
        ru: { name: 'Super Scavenger', description: 'При убийстве Eximus: 45% шанс выпадения Elemental Ammo Pack.' },
        tc: { name: 'Super Scavenger', description: '擊殺Eximus時: 45%機率掉落Elemental Ammo Pack' },
        th: { name: 'Super Scavenger', description: 'เมื่อฆ่า Eximus: 45% โอกาสได้รับ Elemental Ammo Pack' },
        tr: { name: 'Super Scavenger', description: 'Eximus öldürüldüğünde: %45 Elemental Ammo Pack düşme şansı.' },
        uk: { name: 'Super Scavenger', description: 'При вбивстві Eximus: 45% шанс випадання Elemental Ammo Pack.' },
        zh: { name: 'Super Scavenger', description: '击杀Eximus时: 45%几率掉落Elemental Ammo Pack' },
    },
    '/Lotus/Upgrades/Stickers/StickerEnemySmg': {
        fr: { name: 'Through My Heart', description: 'Équipe un EFV-5 Jupiter avec +450% de dégâts comme arme principale.' },
        de: { name: 'Through My Heart', description: 'Rüste einen EFV-5 Jupiter mit +450% Schaden als Hauptwaffe aus.' },
        es: { name: 'Through My Heart', description: 'Equipa un EFV-5 Jupiter con +450% de daño como arma principal.' },
        it: { name: 'Through My Heart', description: 'Attrezza un EFV-5 Jupiter con +450% di danni come arma principale.' },
        ja: { name: 'Through My Heart', description: 'EFV-5ジュピターを+450%ダメージで主武器として装備' },
        ko: { name: 'Through My Heart', description: 'EFV-5 Jupiter를 +450% 데미지로 주 무기로 장착' },
        pl: { name: 'Through My Heart', description: 'Uzbroj EFV-5 Jupiter z +450% obrażeń jako broń główną.' },
        pt: { name: 'Through My Heart', description: 'Equipe um EFV-5 Jupiter com +450% de dano como arma principal.' },
        ru: { name: 'Through My Heart', description: 'Экипируйте EFV-5 Jupiter с +450% урона как основное оружие.' },
        tc: { name: 'Through My Heart', description: '裝備EFV-5木星為+450%傷害的主武器' },
        th: { name: 'Through My Heart', description: 'ฮีคาร์เตอร์ EFV-5 จูเวอร์เป็นอาวุธหลัก +450% ดาเมจ' },
        tr: { name: 'Through My Heart', description: 'EFV-5 Jupiter\'ı +450% hasarla ana silah olarak kuşandır.' },
        uk: { name: 'Through My Heart', description: 'Екіпуйте EFV-5 Jupiter з +450% урону як головну зброю.' },
        zh: { name: 'Through My Heart', description: '装备EFV-5木星为+450%伤害的主武器' },
    },
    '/Lotus/Upgrades/Stickers/DecoyOnDamagedSticker': {
        fr: { name: 'Too Hot', description: 'En prenant des dégâts sous 70% de HP: crée un clone Molt toutes les 10s.' },
        de: { name: 'Too Hot', description: 'Bei Schaden unter 70% HP: erzeugt einen Molt-Klon alle 10s.' },
        es: { name: 'Too Hot', description: 'Al recibir daño por debajo del 70% HP: crea un clone de Molt cada 10s.' },
        it: { name: 'Too Hot', description: 'Quando danneggiato sotto 70% HP: crea un clone Molt ogni 10s.' },
        ja: { name: 'Too Hot', description: '70%HP未満でダメージを受けた時: 10秒ごとにMoltクローンを生成' },
        ko: { name: 'Too Hot', description: '70% HP 이하 피해 시: 10초마다 Molt 클론 생성' },
        pl: { name: 'Too Hot', description: 'Gdy otrzymasz obrażenia poniżej 70% HP: tworzy Molt klona co 10s.' },
        pt: { name: 'Too Hot', description: 'Ao receber dano abaixo de 70% HP: cria um clone Molt a cada 10s.' },
        ru: { name: 'Too Hot', description: 'При получении урона ниже 70% HP: создаёт Molt клон каждые 10сек.' },
        tc: { name: 'Too Hot', description: '受到低於70%HP傷害時: 每10秒生成Molt clone' },
        th: { name: 'Too Hot', description: 'เมื่อได้รับความเสียหมดต่ำกว่า 70% HP: สร้าง Molt clone ทุก 10s' },
        tr: { name: 'Too Hot', description: '70% HP altında hasar alındığında: 10s'de bir Molt klonu oluştur.' },
        uk: { name: 'Too Hot', description: 'При отриманні урону нижче 70% HP: створює Molt клon кожні 10сек.' },
        zh: { name: 'Too Hot', description: '受到低于70%HP伤害时: 每10秒生成Molt克隆' },
    },
    '/Lotus/Upgrades/Stickers/AllowNecramechSummonSticker': {
        fr: { name: 'Vintage Tech', description: 'Invoque un Necramech. Cooldown: 60s après destruction.' },
        de: { name: 'Vintage Tech', description: ' Beschwöre einen Necramech. Cooldown: 60s nach Zerstörung.' },
        es: { name: 'Vintage Tech', description: 'Invoca un Necramech. Cooldown: 60s tras destrucción.' },
        it: { name: 'Vintage Tech', description: 'Richiama un Necramech. Cooldown: 60s dopo distruzione.' },
        ja: { name: 'Vintage Tech', description: 'Necramechを召喚 60秒クールダウン(破壊後)' },
        ko: { name: 'Vintage Tech', description: 'Necramech 소환. 파괴 후 60초 쿨다운.' },
        pl: { name: 'Vintage Tech', description: 'Przyznaj Necramech. Cooldown: 60s po zniszczeniu.' },
        pt: { name: 'Vintage Tech', description: 'Invoca um Necramech. Resfriamento: 60s após destruição.' },
        ru: { name: 'Vintage Tech', description: 'Призови Necramech. Кулдаун: 60сек после уничтожения.' },
        tc: { name: 'Vintage Tech', description: '召喚Necramech 60秒冷卻(毀壞後)' },
        th: { name: 'Vintage Tech', description: 'เรียก Necramech เวลาหยุด: 60s หลังถูกทำลาย' },
        tr: { name: 'Vintage Tech', description: 'Necramech sümünkle. Bekleme süresi: 60s yok edildikten sonra.' },
        uk: { name: 'Vintage Tech', description: 'Призиви Necramech. Відновлення: 60сек після знищення.' },
        zh: { name: 'Vintage Tech', description: '召唤Necramech. 冷却: 60秒(毁灭后)' },
    },
    '/Lotus/Upgrades/Stickers/AllowThermianRpgSummonSticker': {
        fr: { name: 'Wakeup Call', description: 'Une Thermian RPG chargée peut être déployée depuis la Roue d\'Équipement. Cooldown: 60s.' },
        de: { name: 'Wakeup Call', description: 'Ein geladener Thermian RPG kann über das Gehilfe-Rad bereitgestellt werden. Cooldown: 60s.' },
        es: { name: 'Wakeup Call', description: 'Un Thermian RPG cargado puede ser desplegado desde la Rueda de Equipo. Cooldown: 60s.' },
        it: { name: 'Wakeup Call', description: 'Un Thermian RPG carico può essere distribuito dalla Ruota Strumenti. Cooldown: 60s.' },
        ja: { name: 'Wakeup Call', description: '装填済みThermian RPGはギアホイールから展開可能 60秒クールダウン' },
        ko: { name: 'Wakeup Call', description: '장착된 Thermian RPG는 기어 휠에서 배치 가능. 60초 쿨다운.' },
        pl: { name: 'Wakeup Call', description: 'Naładowany Thermian RPG może być użyty z Koła Sprzętu. Cooldown: 60s.' },
        pt: { name: 'Wakeup Call', description: 'Um Thermian RPG carregado pode ser implantado da Roda de Equipamento. Resfriamento: 60s.' },
        ru: { name: 'Wakeup Call', description: 'Заряженный Thermian RPG может быть использован из Меню Снаряжения. Кулдаун: 60сек.' },
        tc: { name: 'Wakeup Call', description: '裝填的Thermian RPG可從Gear Wheel部署 60秒冷卻' },
        th: { name: 'Wakeup Call', description: 'อาวุธ Thermian RPG ที่โหลดสามารถใช้จากหน้า Gear Wheel ได้ เวลาหยุด: 60s' },
        tr: { name: 'Wakeup Call', description: 'Yüklenmiş Thermian RPG, Gear Wheel'dan dağıtılabilir. Bekleme süresi: 60s.' },
        uk: { name: 'Wakeup Call', description: 'Заряджене Thermian RPG можна використати з Меню Снаряження. Відновлення: 60сек.' },
        zh: { name: 'Wakeup Call', description: '装填的Thermian RPG可从Gear Wheel部署. 60秒冷却.' },
    },
    '/Lotus/Upgrades/Stickers/SuperGlideParkourSticker': {
        fr: { name: 'Walking on Air', description: 'Augmente la durée d\'Aim Glide et Wall Latch de +100%. Diminue la gravité de 100%.' },
        de: { name: 'Walking on Air', description: 'Erhöhe Aim-Glide- und Wall-Latch-Dauer um +100%. Verringert Gravitation um 100%.' },
        es: { name: 'Walking on Air', description: 'Aumenta la duración de Aim Glide y Wall Latch en +100%. Reduce la gravedad en un 100%.' },
        it: { name: 'Walking on Air', description: 'Aumenta Aim Glide e Wall Latch durata del +100%. Riduce la gravità del 100%.' },
        ja: { name: 'Walking on Air', description: 'Aim GlideとWall Latchの持続時間を+100%アップ 重力を100%ダウン' },
        ko: { name: 'Walking on Air', description: 'Aim Glide와 Wall Latch 지속시간 +100% 증가. 중력 100% 감소.' },
        pl: { name: 'Walking on Air', description: 'Zwiększa trwanie Aim Glide i Wall Latch o +100%. Obniża grawitację o 100%.' },
        pt: { name: 'Walking on Air', description: 'Aumenta a duração de Aim Glide e Wall Latch em +100%. Reduz a gravidade em 100%.' },
        ru: { name: 'Walking on Air', description: 'Увеличивает длительность Aim Glide и Wall Latch на +100%. Уменьшает гравитацию на 100%.' },
        tc: { name: 'Walking on Air', description: '增加Aim Glide和Wall Latch持續時間+100% 減少100%重力' },
        th: { name: 'Walking on Air', description: 'เพิ่มระยะเวลา Aim Glide และ Wall Latch +100% ลดความดันดูนาน 100%' },
        tr: { name: 'Walking on Air', description: 'Aim Glide ve Wall Latch süresini +100% artır. Yerçekimini %100 azalt.' },
        uk: { name: 'Walking on Air', description: 'Збільшує тривалість Aim Glide і Wall Latch на +100%. Зменшує гравітацію на 100%.' },
        zh: { name: 'Walking on Air', description: '增加Aim Glide和Wall Latch持续时间+100% 减少100%重力' },
    },
    '/Lotus/Upgrades/Stickers/WeaponColdDamageSticker': {
        fr: { name: 'XL Frosty', description: 'Ajoute +30% de dégâts Cold aux armes primaires et secondaires.' },
        de: { name: 'XL Frosty', description: 'Füge +30% Cold-Schaden zu Primär- und Sekundärwaffen hinzu.' },
        es: { name: 'XL Frosty', description: 'Añade +30% de daño Cold a armas primarias y secundarias.' },
        it: { name: 'XL Frosty', description: 'Aggiungi +30% di danni Cold alle armi primarie e secondarie.' },
        ja: { name: 'XL Frosty', description: '主副武器にColdダメージ+30%追加' },
        ko: { name: 'XL Frosty', description: '주 부무기에 Cold 데미지 +30% 추가' },
        pl: { name: 'XL Frosty', description: 'Dodaj +30% Cold obrażeń do broni głównych i drugorzędnych.' },
        pt: { name: 'XL Frosty', description: 'Adiciona +30% de dano Cold para armas primárias e secundárias.' },
        ru: { name: 'XL Frosty', description: 'Добавь +30% Cold урона к основному и вторичному оружию.' },
        tc: { name: 'XL Frosty', description: '为主副武器添加+30% Cold傷害' },
        th: { name: 'XL Frosty', description: 'เพิ่ม +30% ดาเมจ Cold ไปยังอาวุธหลักและรอง' },
        tr: { name: 'XL Frosty', description: 'Ana ve ikincil silahlara +30% Cold hasar ekle.' },
        uk: { name: 'XL Frosty', description: 'Додай +30% Cold урону до основної та другорядної зброї.' },
        zh: { name: 'XL Frosty', description: '为主副武器添加+30% Cold伤害' },
    },
};

// === Apply all translations ===
for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changes = 0;
    
    // Fix ui.relics.* flat keys
    if (data.ui) {
        for (const [key, transMap] of Object.entries(uiKeysTrans)) {
            if (data.ui[key] === enData.ui[key] && transMap[loc]) {
                data.ui[key] = transMap[loc];
                changes++;
            }
        }
    }
    
    // Fix relics section (bare keys)
    if (data.relics) {
        for (const [key, transMap] of Object.entries(relicsSectionTrans)) {
            if (data.relics[key] === enData.relics[key] && transMap[loc]) {
                data.relics[key] = transMap[loc];
                changes++;
            }
        }
    }
    
    // Translate peely names/descriptions
    if (data.peely) {
        for (const [key, transMap] of Object.entries(peelyTrans)) {
            if (data.peely[key] && transMap[loc]) {
                const enPeely = enData.peely[key];
                if (data.peely[key].name === enPeely.name) {
                    data.peely[key].name = transMap[loc].name;
                    changes++;
                }
                if (data.peely[key].description === enPeely.description) {
                    data.peely[key].description = transMap[loc].description;
                    changes++;
                }
            }
        }
    }
    
    // Add eras.* flat keys to ui section
    if (!data.ui) data.ui = {};
    if (data.eras) {
        for (const era of Object.keys(data.eras)) {
            const flatKey = `eras.${era}`;
            if (!data.ui[flatKey]) {
                data.ui[flatKey] = data.eras[era];
                changes++;
            }
        }
    }
    
    if (changes > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}: ${changes} changes`);
    } else {
        console.log(`${loc}: no changes needed`);
    }
}

console.log('\nDone!');
