#!/usr/bin/env python3
"""Generate the complete translation table for all 13 locales and write to /tmp/tables/translations.json"""
import json, os

os.makedirs('/tmp/tables', exist_ok=True)

LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

# Translation table: EN_key -> {locale: translated_value}
# Only keys that need translation are included.
# Keys not in this table are kept as EN (proper nouns).
T = {}

# Format: key: [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
# Empty string means no translation for that locale (keep EN)
def add(k, vals):
    """vals: list of 13 values in order of LOCALES"""
    T[k] = {}
    for i, lo in enumerate(LOCALES):
        if i < len(vals) and vals[i]:
            T[k][lo] = vals[i]

# === Badge/status terms ===
add('adversaries.rank', [
    'Rang {rank}',                          # de
    'Rango {rank}',                          # es
    'Rango {rank}',                          # it
    'ランク {rank}',                          # ja
    '랭크 {rank}',                           # ko
    'Ranga {rank}',                          # pl
    'Rank {rank}',                          # pt
    'Ранг {rank}',                          # ru
    '等級 {rank}',                           # tc
    'อันดับ {rank}',                        # th
    'Seviye {rank}',                         # tr
    'Ранг {rank}',                          # uk
    '等级 {rank}',                           # zh
])

add('badge_evolved', [
    'Evolviert', 'Evolucionado', 'Evolto', '進化済', '진화', 'Ewolucja', 'Evoluído',
    'Эволюция', '已進化', 'วิปน์', 'Evreulenmiş', 'Еволюція', '已进化'
])
add('badge_mod', [
    'Mod', 'Mod', 'Mod', 'Mod', '모드', 'Mod', 'Mod',
    'Мод', 'Mod', 'มอด', 'Mod', 'Мод', 'Mod'
])
add('badge_not_evolved', [
    'Nicht evolviert', 'No evolucionado', 'Non evoluto', '未進化', '미진화', 'Nieewolucja',
    'Não evoluído', 'Неэволюция', '未進化', 'ไม่ได้', 'Evrimsiz', 'Нееволюція', '未进化'
])
add('badge_owned', [
    'Besessen', 'Poseído', 'Possesso', '所持済', '소유', 'Posiadane',
    'Em mãos', 'Есть', '已擁有', 'มีอยู่แล้ว', 'Sahip', 'Має', '已拥有'
])
add('badge_prime_part', [
    'Prime-Teil', 'Parte Prime', 'Parte Prime', 'プライムパーツ', '프라임 파트', 'Część Prime',
    'Peça Prime', 'Примеча', 'Prime零件', 'ชิ้นส่วนไพรม์', 'Prime Parça', 'Частина Prime', 'Prime零件'
])
add('badge_unmastered', [
    'Nicht gemeistert', 'No dominado', 'Non padroneggiato', '未マスター', '미숙련', 'Nieopanowane',
    'Não dominado', 'Не освоено', '未精通', 'ไม่ได้', 'Ustalaşmamış', 'Не опановано', '未精通'
])
add('badge_unowned', [
    'Nicht besessen', 'No poseído', 'Non posseduto', '未所持', '미소유', 'Nieposiadane',
    'Não possuído', 'Нет в наличии', '未擁有', 'ไม่เป็น', 'Sahip değil', 'Не має в наявності', '未拥有'
])

# === Categories ===
add('cat_arcanes', [
    'Arcanes', 'Arcanos', 'Arcani', 'アークーン', '아크온', 'Arcany',
    'Arcanos', 'Арканы', '阿克納', 'อร์แคน', 'Arkanlar', 'Аркани', '阿尔肯'
])
add('cat_archweapons', [
    'Arch-Waffen', 'Armas de Arch', 'Armi Arch', 'Archウェポン', '아크 무기', 'Broń Arch',
    'Armas de Arch', 'Архоружения', 'Arch武器', 'อาวุธ Arch', 'Arch Silahları', 'Архзброя', 'Arch武器'
])
add('cat_beasts', [
    'Bestien', 'Bestias', 'Bestie', 'ビースト', '야수', 'Bestie',
    'Bestas', 'Звери', '野獸', 'สัตว์', 'Canavarlar', 'Звірі', '野兽'
])
add('cat_companions', [
    'Begleiter', 'Compañeros', 'Compagni', 'コンパニオン', '컴패니언', 'Towarzysze',
    'Companheiros', 'Спутники', '伴侶', 'คอมไพเนียน', 'Yardımcılar', 'Співпутники', '伴侣'
])
add('cat_consumables', [
    'Verbrauchbar', 'Consumibles', 'Consumabili', '消耗品', '소모품', 'Zużyciel',
    'Consumíveis', 'Расходники', '消耗品', 'ของใช้', 'Tüketilebilir', 'Розходники', '消耗品'
])
add('cat_exotic', [
    'Exotisch', 'Exótico', 'Esotico', 'エキゾチック', '이국적', 'Egzotyczne',
    'Exótico', 'Экзотика', 'Exotic', 'เอกซอติก', 'Ekotik', 'Екзотичний', 'Exotic'
])
add('cat_hounds', [
    'Hunde', 'Canes', 'Cani', 'ハウンド', '하운드', 'Ohty',
    'Cães', 'Гончие', '猎犬', 'ควาย', 'Dachlar', 'Гончі', '猎犬'
])
add('cat_necramechs', [
    'Necramechs', 'Necramechs', 'Necramech', 'Necramech', '네크라밈', 'Necramechy',
    'Necramechs', 'Некромехи', 'Necramech', 'เนคราเมค', 'Necramechler', 'Некромехи', 'Necramech'
])
add('cat_prime_parts', [
    'Prime-Teile', 'Piezas Prime', 'Parti Prime', 'プライムパーツ', '프라임 파트', 'Części Prime',
    'Peças Prime', 'Примеца', 'Prime零件', 'ชิ้นส่วนไพรม์', 'Prime Parçalar', 'Частини Prime', 'Prime零件'
])
add('cat_relics', [
    'Reliquien', 'Reliquias', 'Reliquie', 'リレク', '유물', 'Relikwie',
    'Relíquias', 'Реликвии', '遺物', 'ผลของ', 'Roklar', 'Реліквії', '遗物'
])
add('cat_resources', [
    'Ressourcen', 'Recursos', 'Risorse', '資源', '자원', 'Zasoby',
    'Recursos', 'Ресурсы', '資源', 'สถานทูล', 'Kaynaklar', 'Ресурси', '资源'
])
add('cat_sentinels', [
    'Sentinels', 'Centinelas', 'Sentinelle', 'センチネル', '센티널', 'Centynele',
    'Sentinelas', 'Сентинели', '哨衛', 'ซีน', 'Sentineller', 'Сентinели', '哨兵'
])
add('cat_vehicles', [
    'Fahrzeuge', 'Vehículos', 'Veicoli', '乗り物', '차량', 'Pojazdy',
    'Veículos', 'Транспорт', '車輛', 'ยานพาหนะ', 'Araçlar', 'Транспорт', '车辆'
])

# === Catalysts / Credits / Reactors ===
add('catalysts', [
    'Katalysatoren', 'Catalizadores', 'Catalizzatori', '触媒', '촉매', 'Katalizatory',
    'Catalisadores', 'Катализаторы', '觸媒', 'ปลั๊ก', 'Katalizatörler', 'Каталізатори', '催化剂'
])
add('credits', [
    'Credits', 'Créditos', 'Crediti', 'クレジット', '크레딧', 'Crédity',
    'Créditos', 'Кредиты', '信用點', 'เครดิต', 'Krediler', 'Кредити', '信用点'
])
add('reactors', [
    'Reaktoren', 'Reactores', 'Reattori', '反応器', '반응기', 'Reaktory',
    'Reatores', 'Реакторы', '反應器', 'รีเฟกเตอร์', 'Reatorler', 'Реактори', '反应堆'
])

# === None owned / filled ===
add('none_owned', [
    'Keine besessen', 'Ninguno poseído', 'Nessuno posseduto', '所有なし', '미소유', 'Brak posiadanych',
    'Nenhum em mãos', 'Нет в наличии', '未擁有', 'ไม่มีเจ้าของ', 'Sahip yok', 'Немає в наявності', '未拥有'
])
add('filled', [
    'Gefüllt', 'Lleno', 'Pieno', '満たされ', '채워짐', 'Wypełnione',
    'Preenchido', 'Заполнено', '填滿', 'เติม', 'Dolduruldu', 'Заповнено', '已填充'
])

# === Checklist tasks ===
add('checklist.task_arbitration', [
    'Arbitra', 'Arbitraje', 'Arbitrato', '裁決', '재판', 'Arbitraż',
    'Arbitragem', 'Арбитраж', '仲裁', 'การชำระ', 'İcraat', 'Арбітраж', '仲裁'
])
add('checklist.task_descendia', [
    'Die Descendia', 'La Descendia', 'La Descendia', 'ディセンドリア', '디센드리아', 'Descendia',
    'A Descendia', 'Десцендия', 'Descendia', 'Descendia', 'Descendia', 'Десцендія', 'Descendia'
])
add('checklist.task_descendia_sp', [
    'Die Descendia SP', 'La Descendia SP', 'La Descendia SP', 'ディセンドリアSP', '디센드리아SP', 'Descendia SP',
    'A Descendia SP', 'Десцендия SP', 'Descendia SP', 'Descendia SP', 'Descendia SP', 'Десцендія SP', 'Descendia SP'
])
add('checklist.task_pulses', [
    'Pulse: Netracell & Archimedea', 'Pulsos: Netracell & Archimedea', 'Impulsi: Netracell & Archimedea',
    'パルス:Netracell & Archimedea', '펄스:Netracell & Archimedea', 'Puls: Netracell & Archimedea',
    'Pulsos: Netracell & Archimedea', 'Импульсы: Netracell & Archimedea', 'Pulse: Netracell & Archimedea',
    'Pulse: Netracell & Archimedea', 'Pulse: Netracell & Archimedea', 'Impulse: Netracell & Archimedea', 'Pulse: Netracell & Archimedea'
])
add('checklist.task_voca', [
    'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca',
    'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca'
])

# === Collectibles ===
add('collectibles.area_bit', [
    '{area} Zone, Höhle {bit}', 'Zona {area}, cueva {bit}', 'Zona {area}, grotta {bit}',
    '{area}エリア、洞 {bit}', '{area} 구역, 동굴 {bit}', '{area} strefa, jaskinia {bit}',
    'Zona {area}, caverna {bit}', 'Зона {area}, пещера {bit}', '{area}區域, 洞 {bit}',
    'พื้นที่ {area} ระบบ, ระเบียง {bit}', '{area} bölge, mağara {bit}', 'Зона {area}, печера {bit}',
    '{area}区域, 洞 {bit}'
])
add('collectibles.category.cephalon', [
    'Cephalon-Fragmente', 'Fragmentos Cephalon', 'Frammenti Cephalon', 'セファロンフラグメント',
    '셀레론 조각', 'Fragmenty Cephalon', 'Fragmentos Cephalon', 'Фрагменты Сефиранса',
    'Cephalon Fragment', 'ชิ้นส่วน Cephalon', 'Cephalon Parçacıkları', 'Фрагменти Сефалона', 'Cephalon Fragment'
])
add('collectibles.category.isleweaver', [
    'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver',
    'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver'
])
add('collectibles.category.necralisk', [
    'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk',
    'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk'
])
add('collectibles.found_of_total', [
    '{found} von {total} gefunden', '{found} de {total} encontrados', '{found} di {total} trovati',
    '{found}/{total} 発見', '{total}개 중 {found}개 발견', '{found} z {total} znalezionych',
    '{found} de {total} encontrados', '{found} из {total} найдено', '{found}/{total} 已找到',
    '{found} ของ {total} พบ', '{found} / {total} bulundu', '{found} з {total} знайдено',
    '{found}/{total} 已找到'
])

# === Filter terms ===
add('filter_mastered', [
    'Gemeistert', 'Dominado', 'Padroneggiato', 'マスター済み', '숙련완료', 'Opanowane',
    'Dominado', 'Освоено', '已精通', 'เรียน', 'Ustalaştırıldı', 'Опановано', '已精通'
])
add('filter_melee', [
    'Nahkampf', 'Melé', 'Mêlée', '近接', '근접', 'Biała',
    'Corpo a corpo', 'Ближнее', '近戰', 'ประชิด', 'Yakın', 'Близька', '近战'
])
add('filter_necramech', [
    'Necramech', 'Necramech', 'Necramech', 'Necramech', '네크라밈', 'Necramech',
    'Necramech', 'Некромех', 'Necramech', 'เนคราเมค', 'Necramech', 'Некромех', 'Necramech'
])
add('filter_owned', [
    'Besessen', 'Poseído', 'Possesso', '所持', '소유', 'Posiadane',
    'Em mãos', 'Есть', '已擁有', 'มีอยู่แล้ว', 'Sahip', 'Має', '已拥有'
])
add('filter_primary', [
    'Hauptwaffe', 'Primaria', 'Primaria', 'プライマリ', '주 무기', 'Broń pierwszo',
    'Primária', 'Основное', '主武器', 'หลัก', 'Birincil', 'Перша', '主武器'
])
add('filter_secondary', [
    'Sekundärwaffe', 'Secundaria', 'Secondaria', 'セカンダリ', '보조', 'Wtórna',
    'Secundária', 'Вторичное', '副武器', 'รอง', 'İkincil', 'Друга', '副武器'
])
add('filter_socketed', [
    'Eingesteckt', 'Encastrado', 'Inserito', '装着', '장착', 'Wsunięte',
    'Encaixado', 'Вставлен', '插入', 'หลีก', 'Takılmış', 'Вставлено', '已插入'
])
add('filter_subsumed', [
    'Eingebunden', 'Subsumido', 'Sostituito', '吸収済み', '흡수됨', 'Wchłonięty',
    'Subsumido', 'Поглощён', '已吸收', 'ดูดซ์', 'Absorbe', 'Поглинути', '已吸收'
])

# === Inventory ===
add('inventory.filled', [
    'Gefüllt', 'Lleno', 'Pieno', '満たされ', '채워짐', 'Wypełnione',
    'Preenchido', 'Заполнено', '填滿', 'เติม', 'Dolduruldu', 'Заповнено', '已填充'
])
add('inventory.none_owned', [
    'Keine besessen', 'Ninguno poseído', 'Nessuno posseduto', '所有なし', '미소유', 'Brak posiadanych',
    'Nenhum em mãos', 'Нет в наличии', '未擁有', 'ไม่มีเจ้าของ', 'Sahip yok', 'Немає в наявності', '未拥有'
])

# === Maps ===
add('maps.adding', [
    'Hinzufügen', 'Añadiendo', 'Aggiungendo', '追加', '추가', 'Dodawanie',
    'Adicionando', 'Добавление', '新增中', 'กำลังเพิ่ม', 'Ekleniyor', 'Додавання', '添加中'
])
add('maps.game_markers', [
    'Spielmarker', 'Marcadores del juego', 'Marker del gioco', 'ゲームマーカー', ' 게임 마커', 'Markery gry',
    'Marcadores do jogo', 'Маркеры игры', '遊戲標記', 'เครื่องหมายเกม', 'Oyun işaretçileri', 'Маркери гри', '游戏标记'
])
add('maps.hidden', [
    'Versteckt', 'Oculto', 'Nascosto', '非表示', '숨기', 'Ukryte',
    'Oculto', 'Скрыто', '隱藏', 'ซ่อน', 'Gizli', 'Приховано', '隐藏'
])
add('maps.marker_plural', [
    'Marker', 'marcadores', 'marker', 'マーカー', '마커', 'markery',
    'marcadores', 'маркера', '標記', 'เครื่องหมาย', 'işaretçi', 'маркери', '标记'
])
add('maps.path', [
    'Pfad', 'Camino', 'Percorso', 'パス', '경로', 'Ścieżka',
    'Caminho', 'Путь', '路徑', 'เส้นทาง', 'Yol', 'Шлях', '路径'
])
add('maps.path_plural', [
    'Pfade', 'Caminos', 'percorsi', 'パス', '경로', 'Ścieżki',
    'Caminhos', 'Пути', '路徑', 'เส้นทาง', 'Yollar', 'Шляхи', '路径'
])
add('maps.switch_labeled', [
    'Beschriftet', 'Etiquetado', 'Etichettato', 'ラベル済み', '라벨 있음', 'Etykietowane',
    'Rotulado', 'Помечен', '已標籤', 'มีป้ายกำกับ', 'Etiketli', 'Позначені', '已标记'
])
add('maps.switch_raw', [
    'Roh', 'Sin procesar', 'Raw', 'Raw', 'Raw', 'Suh',
    'Raw', 'Сырой', 'Raw', 'Raw', 'Raw', 'Raw', 'Raw'
])

# === Notes ===
add('notes.name_exists', [
    'Ein Notiz mit diesem Namen existiert bereits', 'Ya existe una nota con ese nombre',
    'Esiste già una nota con questo nome', 'この名前のメモは既に存在します', '이름이 같은 노트가 이미 존재합니다',
    'Notatka o tej nazwie już istnieje', 'Já existe uma nota com este nome',
    'Записка с таким именем уже существует', '已有同名記事', 'มีบันทึกชื่อนี้อยู่แล้ว',
    'Bu ada sahip not defteri zaten var', 'Нотатка з таким іменем вже існує', '已有同名記事'
])

# === Relic sorts ===
add('relics.sort_name', [
    'Name', 'Nombre', 'Nome', '名', '이름', 'Nazwa',
    'Nome', 'Название', '名稱', 'ชื่อ', 'Ad', 'Назва', '名称'
])

# === Riven card ===
add('riven_card.na', [
    'N/A', 'N/D', 'N/D', 'N/A', 'N/A', 'N/D',
    'N/D', 'Н/Д', 'N/A', 'N/A', 'YOK', 'Н/Д', 'N/A'
])
add('riven_card.roll_average', [
    'Durchschnittlich', 'Media', 'Media', '平均', '평균', 'Średnia',
    'Médio', 'Средний', '平均', 'เฉลี่ย', 'Ortalama', 'Середній', '平均'
])
add('riven_card.roll_bad', [
    'Schlecht', 'Mal', 'Male', '悪い', '나쁨', 'Złe',
    'Ruim', 'Плохой', '糟糕', 'เลว', 'Kötü', 'Погано', '糟糕'
])
add('riven_card.roll_good', [
    'Gut', 'Bueno', 'Buono', '良い', '좋음', 'Dobre',
    'Bom', 'Хороший', '良好', 'ดี', 'İyi', 'Добрий', '良好'
])
add('riven_card.roll_mediocre', [
    'Mäßig', 'Mediocre', 'Mediocre', '普通', '보통', 'Przeciętne',
    'Mediano', 'Средний', '普通', 'กลาง', 'Orta', 'Середній', '普通'
])
add('riven_card.roll_perfect', [
    'Perfekt', 'Perfecto', 'Perfetto', '完璧', '완벽', 'Perfekcyjne',
    'Perfeito', 'Идеальный', '完美', 'สมบูรณ์', 'Mükemmel', 'Ідеальний', '完美'
])
add('riven_card.tier_average', [
    'Durchschnittlich', 'Media', 'Media', '平均', '평균', 'Średnia',
    'Médio', 'Средний', '平均', 'เฉลี่ย', 'Ortalama', 'Середній', '平均'
])
add('riven_card.tier_label', [
    '{roll} - {tier} Waffe', '{roll} - arma {tierra}', "roll} - arma {tier}", '{roll} - {tier} 武器',
    '{roll} - {tier} 무기', '{roll} - broń {tierra}', '{roll} - arma {tier}', '{roll} - {tier} оружие',
    '{roll} - {tier} 武器', '{roll} - อาวุธ {tierra}', '{roll} - {tierra} silah', '{roll} - {tierra} зброя',
    '{roll} - {tierra} 武器'
])
add('riven_card.tier_popular', [
    'Beliebt', 'Popular', 'Popolare', '人気', '인기', 'Popularne',
    'Popular', 'Популярный', 'Popular', 'เป็นยอดนิยม', 'Popüler', 'Популярний', 'Popular'
])
add('riven_card.tier_unpopular', [
    'Unbeliebt', 'Poco popular', 'Impopolare', '人気なし', '인기 없음', 'Niepopularne',
    'Pouco popular', 'Непопулярный', 'Unpopular', 'ไม่นิยม', 'Popüler değil', 'Непопулярний', 'Unpopular'
])
add('riven_card.weapon_rank', [
    'Waffenrang {rank}', 'Rango de arma {rank}', "Rango dell'arma {rank}", '武器ランク {rank}',
    '무기 등급 {rank}', 'Ranga broni {rank}', 'Rank da Arma {rank}', 'Ранг оружия {rank}',
    '武器等級 {rank}', 'ระดับอาวุธ {rank}', 'Silah Seviyesi {rank}', 'Ранг зброї {rank}', '武器等级 {rank}'
])
add('rivens.sort_name', [
    'Name', 'Nombre', 'Nome', '名', '이름', 'Nazwa',
    'Nome', 'Название', '名稱', 'ชื่อ', 'Ad', 'Назва', '名称'
])
add('rivens.type_all', [
    'Alle', 'Todos', 'Tutti', 'すべて', '전체', 'Wszystkie',
    'Todos', 'Все', '全部', 'ทั้งหมด', 'Tümü', 'Всі', '全部'
])
add('rivens.type_archgun', [
    'Arch-Guns', 'Armas de Arch', 'Armi Arch', 'Archガン', '아크건', 'Broń Arch',
    'Armas de Arch', 'Архоружия', 'Arch槍', 'อาวุธ Arch', 'Arch Silahı', 'Архзброя', 'Arch槍'
])
add('rivens.type_melee', [
    'Nahkampf', 'Melé', 'Mêlée', '近接', '근접', 'Biała',
    'Corpo a corpo', 'Ближнее', '近戰', 'ประชิด', 'Yakın', 'Близька', '近战'
])

# === Settings (batch 1) ===
add('settings.action_manual_ocr', [
    'Manuelles OCR', 'OCR manual', 'OCR manuale', '手動OCR', '수동 OCR', 'Ręczne OCR',
    'OCR manual', 'Ручной OCR', '手動OCR', 'OCR ด้วยตนเอง', 'Elli OCR', 'Ручний OCR', '手动OCR'
])
add('settings.action_toggle_sidebar', [
    'Seitenleiste umschalten', 'Alternar barra lateral', 'Attiva barra laterale', 'サイドバー切替',
    '사이드바 전환', 'Przełącz pasek boczny', 'Alternar barra lateral', 'Переключить боковую панель',
    '切換側邊欄', '切換側邊欄', 'Kenar çubuğunu değiştir', 'Перемкнути бокову панель', '切换侧边栏'
])
add('settings.add_shortcut', [
    'Tastenkürzel hinzufügen', 'Añadir atajo', 'Aggiungi scorciatoia', 'ショートカット追加',
    '단축키 추가', 'Dodaj skrót', 'Adicionar atalho', 'Добавить ярлык', '新增快捷方式',
    'เพิ่มทางลัด', 'Kısayol ekle', 'Додати скорочення', '添加快捷方式'
])
add('settings.cache_folder_placeholder', [
    'Cache-Ordner...', 'Carpeta de caché...', 'Cartella cache...', 'キャッシュフォルダ...',
    '캐시 폴더...', 'Folder pamięci podręcznej...', 'Pasta de cache...', 'Папка кэша...',
    'Cache資料夾...', 'โฟลเดอร์แคช...', 'Önbellek klasörü...', 'Папка кешу...', '缓存文件夹...'
])
add('settings.check_for_update', [
    'Auf Update prüfen', 'Comprobar actualización', 'Controlla aggiornamenti', 'アップデート確認中',
    '업데이트 확인', 'Sprawdź aktualizację', 'Verificar atualização', 'Проверить обновление',
    '檢查更新', 'ตรวจสอบอัปเดต', 'Güncelleme kontrolü', 'Перевірити оновлення', '检查更新'
])
add('settings.check_for_updates', [
    'Auf Updates prüfen', 'Comprobar actualizaciones', 'Controlla aggiornamenti', 'アップデート確認中',
    '업데이트 확인', 'Sprawdź aktualizacje', 'Verificar atualizações', 'Проверить обновления',
    '檢查更新', 'ตรวจสอบอัปเดต', 'Güncelleme kontrolü', 'Перевірити оновлення', '检查更新'
])
add('settings.check_on_startup', [
    'Beim Start prüfen', 'Comprobar al inicio', 'Controlla all\'avvio', '起動時に確認',
    '시작 시 확인', 'Sprawdzaj przy starcie', 'Verificar na inicialização', 'Проверять при запуске',
    '啟動時檢查', 'ตรวจสอบเมื่อเริ่มต้น', 'Başlangıçta kontrol et', 'Перевіряти при запуску', '启动时检查'
])
add('settings.checking', [
    'Prüfe...', 'Comprobando...', 'Controllo...', '確認中...', '확인 중...', 'Sprawdzanie...',
    'Verificando...', 'Проверка...', '檢查中...', 'กำลังตรวจสอบ...', 'Kontrol ediliyor...', 'Перевірка...', '检查中...'
])
add('settings.common_linux_path', [
    'Gewöhnlicher Linux-Pfad', 'Ruta Linux común', 'Percorso Linux comune', '一般的なLinuxパス',
    '일반적인 Linux 경로', 'Typowa ścieżka Linux', 'Caminho Linux comum', 'Стандартный путь Linux',
    '一般Linux路徑', 'เส้นทาง Linux ทั่วไป', 'Yaygın Linux yolu', 'Звичайний шлях Linux', '常见Linux路径'
])
add('settings.common_windows_path', [
    'Gewöhnlicher Windows-Pfad', 'Ruta Windows común', 'Percorso Windows comune', '一般的なWindowsパス',
    '일반적인 Windows 경로', 'Typowa ścieżka Windows', 'Caminho Windows comum', 'Стандартный путь Windows',
    '一般Windows路徑', 'เส้นทาง Windows ทั่วไป', 'Yaygın Windows yolu', 'Звичайний шлях Windows', '常见Windows路径'
])
add('settings.current_theme', [
    'Aktuelles Thema', 'Tema actual', 'Tema attuale', '現在のテーマ', '현재 테마', 'Aktualny motyw',
    'Tema atual', 'Текущая тема', '目前主題', 'ธีมปัจจุบัน', 'Mevcut tema', 'Поточна тема', '当前主题'
])
add('settings.cursor', [
    'Cursor', 'Cursor', 'Cursore', 'カーソル', '커서', 'Kursor',
    'Cursor', 'Курсор', '游標', 'เคอร์เซอร์', 'İmleç', 'Курсор', '游标'
])
add('settings.download_manually', [
    'Manuell herunterladen', 'Descargar manualmente', 'Scarica manualmente', '手動ダウンロード',
    '수동 다운로드', 'Pobierz ręcznie', 'Baixar manualmente', 'Скачать вручную', '手動下載',
    'ดาวน์โหลดด้วยตนเอง', 'Manuel indir', 'Завантажити вручну', '手动下载'
])
add('settings.error', [
    'Fehler', 'Error', 'Errore', 'エラー', '에러', 'Błąd',
    'Erro', 'Ошибка', '錯誤', 'ข้อผิดพลาด', 'Hata', 'Помилка', '错误'
])
add('settings.game_assets', [
    'Spiel-Assets', 'Assets del juego', 'Risorse di gioco', 'ゲームアセット', '게임 에셋', 'Zasoby gry',
    'Recursos do jogo', 'Игровые ресурсы', '遊戲資源', 'เกมอัสเซ็ต', 'Oyun varlıkları', 'Ігрові ресурси', '游戏资源'
])
add('settings.global_hotkeys', [
    'Globale Tastenkürzel', 'Atajos globales', 'Scorciatoie globali', 'グローバルホットキー',
    '글로벌 핫키', 'Globalne skróty', 'Atalhos globais', 'Глобальные горячие клавиши',
    '全局熱鍵', 'ทางลัดโกลบอล', 'Küresel kısayollar', 'Глобальні скорочення', '全局热键'
])
add('settings.global_hotkeys_desc', [
    'Globale Tastaturbelegungen', 'Atajos de teclado globales', 'Scorciatoie di tastiera globali',
    'グローバルキーボードショートカット', '글로벌 키보드 단축키', 'Globalne skróty klawiaturowe',
    'Atalhos de teclado global', 'Глобальные клавиатурные сокращения', '全局鍵盤快捷鍵',
    'ทางลัดคีย์บอร์ดโกลบอล', 'Küresel klavye kısayolları', 'Глобальні скорочення клавіатури', '全局键盘快捷键'
])
add('settings.hide_sidebar', [
    'Seitenleiste ausblenden', 'Ocultar barra lateral', 'Nascondi barra laterale', 'サイドバーを非表示',
    '사이드바 숨기기', 'Ukryj pasek boczny', 'Ocultar barra lateral', 'Скрыть боковую панель',
    '隱藏側邊欄', 'ซ่อนแถบด้านข้าง', 'Kenar çubuğunu gizle', 'Приховати бокову панель', '隐藏侧边栏'
])
add('settings.install_update', [
    'Update installieren', 'Instalar actualización', 'Installa aggiornamento', 'アップデートインストール',
    '업데이트 설치', 'Zainstaluj aktualizację', 'Instalar atualização', 'Установить обновление',
    '安裝更新', 'ติดตั้งอัปเดต', 'Güncelleme kur', 'Встановити оновлення', '安装更新'
])
add('settings.installing', [
    'Installiere...', 'Instalando...', 'Installazione in corso...', 'インストール中...',
    '설치 중...', 'Instalowanie...', 'Instalando...', 'Установка...', '安裝中...',
    'กำลังติดตั้ง...', 'Yükleniyor...', 'Встановлення...', '安装中...'
])
add('settings.last_fetched', [
    'Zuletzt abgerufen', 'Última actualización', 'Ultima richiesta', '最後取得', '마지막 가져오기',
    'Ostatnie pobranie', 'Última busca', 'Последнее обновление', '最近更新', 'คำขอล่าสุด',
    'Son getirme', 'Останнє оновлення', '最近获取'
])
add('settings.log_scanner', [
    'Log-Scanner', 'Escáner de logs', 'Scanner di log', 'ログスキャナー', '로그 스캐너',
    'Skaner logów', 'Scanner de logs', 'Сканер логов', 'Log掃描', 'สเกนเลอร์ log', 'Günlük tarayıcı', 'Сканер логів', '日志扫描'
])
add('settings.log_scanner_desc', [
    'Warframe-Logdateien scannen', 'Escanear archivos de log de Warframe', 'Scansiona i file di log di Warframe',
    'Warframeのログファイルをスキャン', 'Warframe 로그 파일 스캔', 'Skanuj pliki logów Warframe',
    'Digitalizar arquivos de log de Warframe', 'Сканировать файлы логов Warframe',
    '掃描Warframe日誌文件', 'สแกนไฟล์ log ของ Warframe', 'Warframe günlük dosyalarını tarayın',
    'Сканувати файли логів Warframe', '扫描Warframe日志文件'
])
add('settings.manual_refresh', [
    'Manueller Refresh', 'Actualización manual', 'Aggiornamento manuale', '手動更新',
    '수동 새로 고침', 'Ręczne odświeżenie', 'Atualização manual', 'Ручное обновление',
    '手動刷新', 'รีเฟรชด้วยตนเอง', 'El ile yenile', 'Ручне оновлення', '手动刷新'
])
add('settings.market_prices', [
    'Marktpreise', 'Precios del mercado', 'Prezzi del mercato', '市場価格', '시장 가격',
    'Ceny rynkowe', 'Preços do mercado', 'Рыночные цены', '市場價格', 'ราคาตลาด',
    'Pazar fiyatları', 'Ринкові ціни', '市场价格'
])
add('settings.no_release_notes', [
    'Keine Versionshinweise verfügbar', 'No hay notas de versión disponibles',
    'Nessuna nota di rilascio disponibile', 'リリースノートはありません', '릴리스 노트를 사용할 수 없습니다',
    'Brak dostępnych notatek wydania', 'Não há notas de versão disponíveis',
    'Примечания к выпуску недоступны', '沒有發行說明可用', 'ไม่มีบันทึกปล่อยที่ใช้ได้',
    'Yayın notları mevcut değil', 'Недоступні зауваження до випуску', '没有可用的发行说明'
])
add('settings.none', [
    'Keine', 'Ninguno', 'Nessuno', '無し', '없음', 'Brak', 'Nenhum', 'Нет', '無', 'ไม่มี', 'Yok', 'Немає', '无'
])
add('settings.not_fetched', [
    'Nicht abgerufen', 'No actualizado', 'Non richiesto', '未取得', '가져오지 않음', 'Niepobrane',
    'Não buscado', 'Не получено', '未取得', 'ไม่ได้รับ', 'Alındı değil', 'Не отримано', '未获取'
])

# === Settings (batch 2: notifications, scanner, sidebar, etc.) ===
add('settings.notification_monitor', [
    'Benachrichtigungs-Monitor', 'Monitor de notificaciones', 'Monitor di notifiche',
    '通知モニター', '알림 모니터', 'Monitor powiadomień', 'Monitor de Notificações',
    'Монитор уведомлений', '通知監控', 'การตรวจจับการแจ้งเตือน', 'Bildirim monitörü', 'Монітор сповіщень', '通知监控'
])
add('settings.notification_monitor_desc', [
    'In-spiel-Benachrichtigungen überwachen', 'Monitorizar notificaciones en juego',
    'Monitorizza notifiche in-game', 'ゲーム内通知を監視', '인게임 알림 모니터링', 'Monitoruj powiadomienia w grze',
    'Monitorar notificações no jogo', 'Отслеживание уведомлений в игре', '監控遊戲內通知',
    'ตรวจจับการแจ้งเตือนในเกม', 'Oyun içi bildirimleri izle', 'Відстежувати сповіщення в грі', '监控游戏内通知'
])
add('settings.notification_sound', [
    'Benachrichtigungs-Sound', 'Sonido de notificación', 'Suono di notifica', '通知サウンド',
    '알림 소리', 'Dźwięk powiadomienia', 'Som de notificação', 'Звук уведомления', '通知音',
    'เสียงการแจ้งเตือน', 'Bildirim sesi', 'Звук сповіщення', '通知声'
])
add('settings.notification_triggers', [
    'Benachrichtigungs-Auslöser', 'Disparadores de notificación', 'Trigger di notifica',
    '通知トリガー', '알림 트리거', 'Wyzwalacze powiadomień', 'Gatilhos de notificação',
    'Триггеры уведомлений', '通知觸發', 'ทริกเกอร์การแจ้งเตือน', 'Bildirim tetikleyicileri', 'Тригери сповіщень', '通知触发'
])
add('settings.price_cache', [
    'Preiscache', 'Caché de precios', 'Cache dei prezzi', '価格キャッシュ', '가격 캐시',
    'Cache cen', 'Cache de preços', 'Кэш цен', '價格快取', 'แคชราคา', 'Fiyat önbelleği', 'Кеш цін', '价格缓存'
])
add('settings.price_cache_desc', [
    'Marktpreise cachen', 'Almacenar precios del mercado en caché',
    'Metti in cache i prezzi del mercato', 'マーケット価格をキャッシュ', '마켓 가격 캐시',
    'Cacheuj ceny rynkowe', 'Armazenar preços do mercado em cache', 'Кэшировать рыночные цены',
    '快取市場價格', 'แคชราคาของตลาด', 'Pazar fiyatlarını önbelleğe al', 'Кешувати ринкові ціни', '缓存市场价格'
])
add('settings.primary_monitor', [
    'Primärer Monitor', 'Monitor principal', 'Monitor principale', 'プライマリモニター',
    '기본 모니터', 'Monitor główny', 'Monitor principal', 'Первичный монитор', '主監控',
    'หน้าจอหลัก', 'Birincil monitör', 'Перший монітор', '主显示器'
])
add('settings.recording', [
    'Aufnahme', 'Grabación', 'Registrazione', '録画', '녹화', 'Nagrywanie',
    'Gravação', 'Запись', '录制', 'บันทึก', 'Kayıt', 'Запис', '录制'
])
add('settings.refresh_prices', [
    'Preise aktualisieren', 'Actualizar precios', 'Aggiorna prezzi', '価格更新',
    '가격 새로 고침', 'Odśwież ceny', 'Atualizar preços', 'Обновить цены', '刷新價格',
    'รีเฟรชราคา', 'Fiyatları yenile', 'Оновити ціни', '刷新价格'
])
add('settings.refreshing', [
    'Aktualisiere...', 'Actualizando...', 'Aggiornamento...', '更新中...', '새로 고침...',
    'Odświeżanie...', 'Atualizando...', 'Обновление...', '刷新中...', 'กำลังรีเฟรช...', 'Yenileniyor...',
    'Оновлення...', '刷新中...'
])
add('settings.remove_hotkey', [
    'Tastenkürzel entfernen', 'Eliminar atajo', 'Rimuovi scorciatoia', 'ショートカット削除',
    '단축키 제거', 'Usuń skrót', 'Remover atalho', 'Удалить ярлык', '移除快捷方式', 'ลบทางลัด',
    'Kısayolu kaldır', 'Видалити скорочення', '移除快捷方式'
])
add('settings.scanner.active', [
    'Aktiv', 'Activo', 'Attivo', 'アクティブ', '활성', 'Aktywny', 'Ativo', 'Активен', '活動',
    'เปิดใช้งาน', 'Etkin', 'Активний', '活跃'
])
add('settings.scanner.offline', [
    'Offline', 'Sin conexión', 'Offline', 'オフライン', '오프라인', 'Offline', 'Offline',
    'Офлайн', '離線', 'ออฟไลน์', 'Çevrim dışı', 'Офлайн', '离线'
])
add('settings.scanner.stale', [
    'Veraltet', 'Caducado', 'Obsoleto', '古い', '오래된', 'Przestarzały', 'Desatualizado',
    'Устаревший', '過期', 'ทิ้งทิว', 'Eski', 'Застарілий', '陈旧'
])
add('settings.scanner.waiting', [
    'Warten', 'Esperando', 'In attesa', '待機中', '대기', 'Oczekujący', 'À espera',
    'Ожидание', '等待', 'รอ', 'Bekleniyor', 'Очікування', '等待'
])
add('settings.select_action', [
    'Aktion auswählen', 'Seleccionar acción', 'Seleziona azione', 'アクション選択',
    '작업 선택', 'Wybierz akcję', 'Selecionar ação', 'Выбрать действие', '選擇操作',
    'เลือกการดำเนินการ', 'Eylem seç', 'Вибір дії', '选择操作'
])
add('settings.shortcut', [
    'Tastenkürzel', 'Atajo', 'Scorciatoia', 'ショートカット', '단축키', 'Skrót',
    'Atalho', 'Ярлык', '快捷方式', 'ทางลัด', 'Kısayol', 'Скорочення', '快捷方式'
])
add('settings.shortcut_note', [
    'Tastenkürzelhinweis', 'Nota de atajo', 'Nota di scorciatoia', 'ショートカットノート',
    '단축키 메모', 'Notatka skrótu', 'Nota de atalho', 'Заметка о ярлыке', '快捷方式說明',
    'บันทึกทางลัด', 'Kısayol notu', 'Примітка скорочення', '快捷方式说明'
])
add('settings.sidebar', [
    'Seitenleiste', 'Barra lateral', 'Barra laterale', 'サイドバー', '사이드바', 'Pasek boczny',
    'Barra lateral', 'Боковая панель', '側邊欄', 'แถบด้านข้าง', 'Kenar çubuğu', 'Бокова панель', '侧边栏'
])
add('settings.sidebar_desc', [
    'Seitenleisteneinstellungen', 'Configuración de la barra lateral', 'Impostazioni barra laterale',
    'サイドバー設定', '사이드바 설정', 'Ustawienia paska bocznego', 'Configuração da barra lateral',
    'Настройки боковой панели', '側邊欄設置', 'การตั้งค่าแถบด้านข้าง', 'Kenar çubuğu ayarları',
    'Налаштування бокової панелі', '侧边栏设置'
])
add('settings.sidebar_left', [
    'Links', 'Izquierda', 'Sinistra', '左', '왼쪽', 'Lewa', 'Esquerda', 'Слева', '左',
    'ซ้าย', 'Sol', 'Ліва', '左'
])
add('settings.sidebar_right', [
    'Rechts', 'Derecha', 'Destra', '右', '오른쪽', 'Prawa', 'Direita', 'Справа', '右',
    'ขวา', 'Sağ', 'Права', '右'
])
add('settings.sidebar_show', [
    'Seitenleiste anzeigen', 'Mostrar barra lateral', 'Mostra barra laterale', 'サイドバーを表示',
    '사이드바 표시', 'Pokaż pasek boczny', 'Mostrar barra lateral', 'Показать боковую панель',
    '顯示側邊欄', 'แสดงแถบด้านข้าง', 'Kenar çubuğunu göster', 'Показати бокову панель', '显示侧边栏'
])
add('settings.sidebar_side', [
    'Seitenleisten-Seite', 'Lado de la barra lateral', 'Lato barra laterale', 'サイドバー側',
    '사이드바 측면', 'Strona paska bocznego', 'Lado da barra lateral', 'Сторона боковой панели',
    '側邊欄位置', 'ด้านของแถบด้านข้าง', 'Kenar çubuğu tarafı', 'Бік бокової панелі', '侧边栏位置'
])
add('settings.show_release_notes', [
    'Versionshinweise anzeigen', 'Mostrar notas de versión', 'Mostra note di rilascio',
    'リリースノートを表示', '릴리스 노트 보기', 'Pokaż notatki wydania', 'Mostrar notas de versão',
    'Показать примечания к выпуску', '顯示發行說明', 'แสดงบันทึกปล่อย', 'Sürüm notlarını göster',
    'Показати зауваження до випуску', '显示发行说明'
])

# === Settings (batch 3: setup, theme, toast, ui_scale, updates, etc.) ===
add('settings.setup_hint', [
    'Lassen Sie uns loslegen. Wählen Sie unten Ihre Sprache aus; die Pfade werden automatisch erkannt.',
    'Comencemos. Elija su idioma a continuación; las rutas se detectarán automáticamente.',
    'Iniziamo. Scegli la tua lingua qui sotto; i percorsi saranno rilevati automaticamente.',
    '始めましょう。以下から言語を選択してください。パスは自動検出されます。',
    '시작하겠습니다. 아래에서 언어를 선택하세요. 경로는 자동으로 감지됩니다.',
    'Zaczynamy. Wybierz język poniżej; ścieżki zostaną wykryte automatycznie.',
    'Vamos começar. Escolha seu idioma abaixo; os caminhos serão detectados automaticamente.',
    'Начнём. Выберите язык ниже; пути будут автоматически определены.',
    '讓我們開始吧。以下選擇你的語言；路徑將自動檢測。',
    'เริ่มต้นด้วยการเลือกภาษาด้านล่าง',
    'Başlayalım. Aşağıda dilinizi seçin; yollar otomatik olarak algılanacaktır.',
    'Розпочнемо. Виберіть мову нижче; шляхи будуть автоматично визначені.',
    '让我们开始吧。以下选择您的语言；路径将自动检测。'
])
add('settings.cache_folder_hint', [
    'Cache-Ordner', 'Carpeta de caché', 'Cartella cache', 'キャッシュフォルダ', '캐시 폴더',
    'Folder pamięci podręcznej', 'Pasta de cache', 'Папка кэша', 'Cache資料夾', 'โฟลเดอร์แคช',
    'Önbellek klasörü', 'Папка кешу', '缓存文件夹'
])
add('settings.lang_selection_title', [
    'Sprachauswahl', 'Selección de idioma', 'Selezione lingua', '言語選択', '언어 선택',
    'Wybór języka', 'Seleção de idioma', 'Выбор языка', '語言選擇', 'การเลือกภาษา',
    'Dil seçimi', 'Вибір мови', '语言选择'
])
add('settings.lang_selection_desc', [
    'Wählen Sie Ihre Sprache aus.', 'Elija su idioma.', 'Scegli la tua lingua.', '言語を選択してください。',
    '언어를 선택하세요.', 'Wybierz swój język.', 'Escolha seu idioma.', 'Выберите язык.',
    '選擇您的語言。', 'เลือกภาษาของคุณ', 'Dilinizi seçin.', 'Виберіть мову.', '选择您的语言。'
])
add('settings.theme_selection_title', [
    'Themenauswahl', 'Selección de tema', 'Selezione tema', 'テーマ選択', '테마 선택',
    'Wybór motywu', 'Seleção de tema', 'Выбор темы', '主題選擇', 'การเลือกธีม',
    'Tema seçimi', 'Вибір теми', '主题选择'
])
add('settings.theme_selection_desc', [
    'Wählen Sie Ihr Farbschema aus.', 'Elija su esquema de color.', 'Scegli il tuo schema colori.',
    'カラースキームを選択してください。', '색상 모드를 선택하세요.', 'Wybierz swój schemat kolorów.',
    'Escolha seu esquema de cores.', 'Выберите цветовую схему.', '選擇您的配色方案。',
    'เลือกสคีมสีของคุณ', 'Renk şemanı seçin.', 'Виберіть кольорову схему.', '选择您的配色方案。'
])
add('settings.reload_needed', [
    'Neu laden erforderlich', 'Recarga necesaria', 'Ricarica necessaria', '再読み込み必要',
    '새로 고침 필요', 'Wymagane ponowne załadowanie', 'Recarregamento necessário', 'Требуется перезагрузка',
    '需要重新載入', 'ต้องการการโหลดซ้ำ', 'Yeniden yükleme gerekiyor', 'Потрібна перезагрузка', '需要重新加载'
])
add('settings.reload_needed_hint', [
    'Installieren Sie die neue Sprache neu, um die Änderungen zu übernehmen.',
    'Recargue para aplicar los cambios de idioma.', "Ricarica per applicare le modifiche alla lingua.",
    '言語の変更を適用するには再読み込みを行います。', '언어 변경 사항을 적용하려면 새로 고치세요.',
    'Przeładuj, aby zastosować zmiany języka.', 'Recarregue para aplicar as alterações de idioma.',
    'Перезагрузите, чтобы применить изменения языка.', '重新載入以套用語言變更。',
    'โหลดซ้ำเพื่อปรับปรุงการเปลี่ยนแปลงภาษา', 'Dil değişikliklerini uygulamak için yeniden yükleyin.',
    'Перезавантажте, щоб застосувати зміни мови.', '重新加载以应用语言更改。'
])
add('settings.session', [
    'Sitzung', 'Sesión', 'Sessione', 'セッション', '세션', 'Sesja', 'Sessão', 'Сессия', '會話',
    'เซสชัน', 'Oturum', 'Сесія', '会话'
])
add('settings.sound_1', [
    'Sound 1', 'Sonido 1', 'Suono 1', 'サウンド1', '사운드 1', 'Dźwięk 1', 'Som 1', 'Звук 1', 'Sound 1',
    'เสียง 1', 'Ses 1', 'Звук 1', 'Sound 1'
])
add('settings.sound_2', [
    'Sound 2', 'Sonido 2', 'Suono 2', 'サウンド2', '사운드 2', 'Dźwięk 2', 'Som 2', 'Звук 2', 'Sound 2',
    'เสียง 2', 'Ses 2', 'Звук 2', 'Sound 2'
])
add('settings.spawn_active_monitor', [
    'Auf aktivem Monitor erscheinen', 'Aparecer en el monitor activo', 'Apparire sul monitor attivo',
    'アクティブモニターに表示', '활성 모니터에 나타내기', 'Pojawiaj na aktywnym monitorze',
    'Aparecer no monitor ativo', 'Отображать на активном мониторе', '在活動顯示器上顯示',
    'ปรากฏบนหน้าจอที่ใช้งานอยู่', 'Etkin monitörde göster', 'Відображати на активному моніторі', '在活动显示器上显示'
])
add('settings.spawn_active_monitor_hint', [
    'Auf dem aktiven Monitor erscheinen lassen', 'Aparecer en el monitor activo',
    'Mostra sul monitor attivo', 'アクティブモニターに表示', '활성 모니터에 나타내기',
    'Pojawiaj na aktywnym monitorze', 'Aparecer no monitor ativo', 'Отображать на активном мониторе',
    '在活動顯示器上顯示', 'ปรากฏบนหน้าจอที่ใช้งานอยู่', 'Etkin monitörde göster', 'Відображати на активному моніторі', '在活动显示器上显示'
])
add('settings.spawn_monitor', [
    'Ererscheinungs-Monitor', 'Monitor de aparición', 'Monitor di apparizione', '出現モニター',
    '출현 모니터', 'Monitor pojawiania', 'Monitor de aparição', 'Монитор появы', '出現監控',
    'หน้าจอการแสดง', 'Görüntüleme monitörü', 'Монітор виходу', '出现监控'
])
add('settings.sync_inventory', [
    'Inventar synchronisieren', 'Sincronizar inventario', 'Sincronizza inventario', 'インベントリ同期',
    '인벤토리 동기화', 'Synchronizuj inwentarz', 'Sincronizar inventário', 'Синхронизировать инвентарь',
    '同步庫存', 'ซิงค์อินวเทอร์', 'Envanter senk', 'Синхронізувати інвентар', '同步库存'
])
add('settings.test_buttons', [
    'Test-Schaltflächen', 'Botones de prueba', 'Bottoni di test', 'テストボタン', '테스트 버튼',
    'Przyciski testowe', 'Botões de teste', 'Тестовые кнопки', '測試按鈕', 'ปุ่มทดสอบ',
    'Test butonları', 'Тестові кнопки', '测试按钮'
])
add('settings.test_foundry_complete', [
    'Fonderie fertig', 'Fundición completa', 'Fucina completa', 'ファウンドリー完了', '팜토리 완료',
    'Funderia kompletny', 'Fundição completa', 'Фаундри завершена', '熔鋼廠完成', 'ฐานะ Foundry สมบูรณ์',
    'Havuz tamam', 'Фаундрі завершена', '熔钢厂完成'
])
add('settings.test_foundry_msg', [
    'Test Foundry-Benachrichtigung', 'Notificación de fundición de prueba', 'Notifica di fucina di prova',
    'テストファウンドリー通知', '테스트 팜토리 알림', 'Powiadomienie Foundry testu', 'Notificação de fundição de teste',
    'Тестовое уведомление Foundry', '測試 Foundry 通知', 'การแจ้งเตือน Foundry ทดสอบ', 'Test Foundry bildirimi',
    'Тестове сповіщення Foundry', '测试 Foundry 通知'
])
add('settings.test_notification', [
    'Test-Benachrichtigung', 'Notificación de prueba', 'Notifica di prova', 'テスト通知', '테스트 알림',
    'Powiadomienie testowe', 'Notificação de teste', 'Тестовое уведомление', '測試通知',
    'การแจ้งเตือนทดสอบ', 'Test bildirimi', 'Тестове сповіщення', '测试通知'
])
add('settings.test_notification_delayed', [
    'Verzögerter Test', 'Prueba diferida', 'Test ritardato', '遅延テスト', '지연 테스트',
    'Opóźniony test', 'Teste atrasado', 'Отложенный тест', '延遲測試', 'ทดสอบล่วงหน้า',
    'Gecikmeli test', 'Відкладений тест', '延迟测试'
])
add('settings.test_relic_overlay', [
    'Reliquien-Overlay', 'Superposición de reliquias', 'Sovrapposizione reliquie',
    'リレクオーバーレイ', '유물 오버레이', 'Overlay relikwii', 'Sobreposição de relicários',
    'Наложение реликвий', '遺物覆蓋', 'การวางผลของ', 'Rok Katmanı', 'Накладення реліквій', '遗物覆盖'
])
add('settings.theme', [
    'Thema', 'Tema', 'Tema', 'テーマ', '테마', 'Motyw', 'Tema', 'Тема', '主題', 'ธีม', 'Tema', 'Тема', '主题'
])
add('settings.tint_with_theme', [
    'Mit Thema tönen', 'Teñir con el tema', 'Tingi con il tema', 'テーマでティント', '테마 색조',
    'Cieniuj motywem', 'Tomar cor do tema', 'Оттенение темой', '主題著色', 'สีจากธีม',
    'Temayla tonal', 'Відтінок темою', '主题着色'
])
add('settings.toast_position', [
    'Toast-Position', 'Posición del toast', 'Posizione toast', 'トースト位置', '토스트 위치',
    'Pozycja toastu', 'Posição do toast', 'Позиция тоста', '吐司位置', 'ตำแหน่งทางเลือก',
    'Toast konumu', 'Позиція toast', '吐司位置'
])
add('settings.top_center', [
    'Oben zentriert', 'Centro superior', 'Centro superiore', '上中', '상중', 'Góra środkowo',
    'Centro superior', 'Верх по центру', '頂部居中', 'กลางด้านบน', 'Üst merkez', 'Верх центр', '顶部居中'
])
add('settings.top_left', [
    'Oben links', 'Arriba a la izquierda', 'In alto a sinistra', '左上', '왼쪽 위', 'Lewy górny',
    'Superior esquerdo', 'Слева сверху', '頂部左', 'ซ้ายบน', 'Sol üst', 'Верх ліва', '左上'
])
add('settings.top_right', [
    'Oben rechts', 'Arriba a la derecha', 'In alto a destra', '右上', '오른쪽 위', 'Prawy górny',
    'Superior direito', 'Справа сверху', '頂部右', 'ขวาบน', 'Sağ üst', 'Верх права', '右上'
])
add('settings.ui_scale', [
    'Benutzeroberfläche-Skala', 'Escala de interfaz', 'Scala interfaccia', 'UIスケール',
    'UI 확대/축소', 'Skala UI', 'Escala da interface', 'Масштаб UI', '界面縮放', 'สเกล UI',
    'Arayüz ölçeği', 'Масштаб інтерфейсу', '界面缩放'
])
add('settings.ui_scale_hint', [
    'Benutzeroberfläche-Skala anpassen', 'Ajustar escala de interfaz', 'Regola scala interfaccia',
    'UIスケールを調整', 'UI 확대/축소 조정', 'Dostosuj skalę UI', 'Ajustar escala da interface',
    'Настроить масштаб UI', '調整界面縮放', 'ปรับสเกล UI', 'Arayüz ölçeğini ayarla',
    'Налаштувати масштаб інтерфейсу', '调整界面缩放'
])
add('settings.up_to_date', [
    'Aktuell', 'Actualizado', 'Aggiornato', '最新', '최신', 'Aktualizowany', 'Atualizado',
    'Актуальна', '最新', 'เป็นประกาศ', 'Güncel', 'Оновлений', '最新'
])
add('settings.update_available', [
    'Update verfügbar', 'Actualización disponible', 'Aggiornamento disponibile', 'アップデート利用可能',
    '업데이트 사용 가능', 'Aktualizacja dostępna', 'Atualização disponível', 'Обновление доступно',
    '可用更新', 'มีการอัปเดตพร้อมใช้งาน', 'Güncelleme mevcut', 'Оновлення доступне', '可用的更新'
])
add('settings.updates', [
    'Updates', 'Actualizaciones', 'Aggiornamenti', 'アップデート', '업데이트', 'Aktualizacje',
    'Atualizações', 'Обновления', '更新', 'อัปเดต', 'Güncellemler', 'Оновлення', '更新'
])

# === Sync ===
add('sync.next_attempt', [
    'Nächste Versuch in {time}', 'Próximo intento en {time}', 'Prossimo tentativo tra {time}',
    '次回試行まで {time}', '다음 시도까지 {time}', 'Następna próba za {time}',
    'Próxima tentativa em {time}', 'Следующая попытка через {time}', '下次尝试在 {time}',
    'ลองใหม่ใน {time}', 'Bir sonraki deneme {time}', 'Наступна спроба через {time}', '下次尝试在 {time}'
])
add('sync.next_update', [
    'Nächste Update in {time}', 'Próxima actualización en {time}', 'Prossimo aggiornamento tra {time}',
    '次回更新まで {time}', '다음 업데이트까지 {time}', 'Następna aktualizacja za {time}',
    'Próxima atualização em {time}', 'Следующее обновление через {time}', '下次更新在 {time}',
    'อัปเดตครั้งต่อไปใน {time}', 'Bir sonraki güncelleme {time}', 'Наступне оновлення через {time}', '下次更新在 {time}'
])
add('sync.waiting', [
    'Warten', 'Esperando', 'In attesa', '待機中', '대기', 'Oczekujący', 'À espera',
    'Ожидание', '等待', 'รอ', 'Bekleniyor', 'Очікування', '等待'
])

# === Dashboard ===
add('ui.dashboard.card_arbitration', [
    'Arbitration', 'Arbitraje', 'Arbitrato', '裁決', '재판', 'Arbitraż',
    'Arbitragem', 'Арбитраж', '仲裁', 'การชำระ', 'İcraat', 'Арбітраж', '仲裁'
])
add('ui.dashboard.card_descendia', [
    'Descendia', 'Descendia', 'Descendia', 'ディセンドリア', '디센드리아', 'Descendia',
    'Descendia', 'Десцендия', 'Descendia', 'Descendia', 'Descendia', 'Десцендія', 'Descendia'
])
add('ui.dashboard.card_events', [
    'Ereignisse', 'Eventos', 'Eventi', 'イベント', '이벤트', 'Wydarzenia',
    'Eventos', 'События', '活動', 'อีเวนต์', 'Etkinlikler', 'Події', '活动'
])
add('ui.dashboard.checkpoint', [
    'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT',
    'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT', 'CHECKPOINT'
])
add('ui.dashboard.descendia_mission_type_dt_collection', [
    'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood',
    'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood',
    'Void Flood', 'Void Flood', 'Void Flood'
])
add('ui.dashboard.descendia_mission_type_dt_interception', [
    'Mobile Interception', 'Intercepción móvil', 'Intercettazione mobile',
    'モバイルインターセプション', '모바일 인터셉션', 'Intercpecja mobilna',
    'Interceptação móvel', 'Мобильный перехват', 'Mobile Interception',
    'การจับจระเบียนเคลื่อนที่', 'Mobil müdahale', 'Мобільний перехват', 'Mobile Interception'
])
add('ui.dashboard.descendia_penance_collection_basic', [
    'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood',
    'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood', 'Void Flood',
    'Void Flood', 'Void Flood', 'Void Flood'
])
add('ui.dashboard.descendia_steel_path', [
    'Steel Path', 'Camino de Acero', 'Sentiero d\'Acciaio', 'スチールパス',
    '강철길', 'Stalowa Ścieżka', 'Caminho de Aço', 'Стальной путь', 'Steel Path',
    'เส้นทางแสง', 'Çelik Yolu', 'Сталева дорога', 'Steel Path'
])
add('ui.dashboard.fissure_void_storm', [
    'Void Storm', 'Tormenta del Vacío', 'Tempesta del Vuoto', 'Void Storm',
    'Void Storm', 'Błąsea Pustki', 'Tempestade do Vazio', 'Буря Пустоты', 'Void Storm',
    'พายพาการ', 'Void Storm', 'Буря Пустоти', 'Void Storm'
])
add('ui.dashboard.in_weeks', [
    'In {weeks} Weeks', 'En {weeks} semanas', 'Tra {weeks} settimane', '{weeks}週後',
    '{weeks}주 후', 'Za {weeks} tygodnie', 'Em {weeks} semanas', 'Через {weeks} недель',
    '在{weeks}週後', 'ใน {weeks} สัปดาห์', '{weeks} hafta içinde', 'Через {weeks} тижні', '在{weeks}周后'
])
add('ui.dashboard.next_week', [
    'Nächste Woche', 'Próxima semana', 'Settimana prossima', '来週', '다음 주',
    'Przyszły tydzień', 'Próxima semana', 'Следующая неделя', '下週', 'สัปดาห์หน้า',
    'Gelecek hafta', 'Наступний тиждень', '下周'
])
add('ui.dashboard.season_winter', [
    'Winter', 'Invierno', 'Inverno', '冬', '겨울', 'Zima', 'Inverno', 'Зима',
    '冬', 'Winter', 'Kış', 'Зима', 'Winter'
])
add('ui.dashboard.timer_cold', ['Kalt', 'Frío', 'Freddo', 'Cold', '콜드', 'Cold', 'Frio', 'Холод', 'Cold', 'เย็น', 'Cold', 'Холод', 'Cold'])
add('ui.dashboard.timer_warm', [
    'Warm', 'Cálido', 'Caldo', 'Warm', '웜', 'Warm', 'Quente', 'Тёплый', 'Warm', 'อุ่น', 'Warm', 'Теплий', 'Warm'
])

# === Elements ===
add('ui.elements.gas', [
    'Gas', 'Gas', 'Gas', 'ガス', '가스', 'Gas', 'Gas', 'Газ', 'Gas', 'แก๊ส', 'Gas', 'Газ', 'Gas'
])
add('ui.elements.void', [
    'Void', 'Vacío', 'Vuoto', 'Void', 'Void', 'Próchnica', 'Vazio', 'Пустота',
    'Void', 'ปลอดภูมิ', 'Void', 'Пустота', 'Void'
])

# === Inventory badges (mirror top-level badge keys) ===
add('ui.inventory.badge_evolved', ['Evolviert', 'Evolucionado', 'Evolto', '進化済', '진화', 'Ewolucja', 'Evoluído', 'Эволюция', '已進化', 'วิปน์', 'Evreulenmiş', 'Еволюція', '已进化'])
add('ui.inventory.badge_mod', ['Mod', 'Mod', 'Mod', 'Mod', '모드', 'Mod', 'Mod', 'Мод', 'Mod', 'มอด', 'Mod', 'Мод', 'Mod'])
add('ui.inventory.badge_not_evolved', ['Nicht evolviert', 'No evolucionado', 'Non evoluto', '未進化', '미진화', 'Nieewolucja', 'Não evoluído', 'Неэволюция', '未進化', 'ไม่ได้', 'Evrimsiz', 'Нееволюція', '未進化'])
add('ui.inventory.badge_owned', ['Besessen', 'Poseído', 'Possesso', '所持済', '소유', 'Posiadane', 'Em mãos', 'Есть', '已擁有', 'มีอยู่แล้ว', 'Sahip', 'Має', '已拥有'])
add('ui.inventory.badge_prime_part', ['Prime-Teil', 'Parte Prime', 'Parte Prime', 'プライムパーツ', '프라임 파트', 'Część Prime', 'Peça Prime', 'Примеца', 'Prime零件', 'ชิ้นส่วนไพรม์', 'Prime Parça', 'Частина Prime', 'Prime零件'])
add('ui.inventory.badge_unmastered', ['Nicht gemeistert', 'No dominado', 'Non padroneggiato', '未マスター', '미숙련', 'Nieopanowane', 'Não dominado', 'Не освоено', '未精通', 'ไม่ได้', 'Ustalaşmamış', 'Не опановано', '未精通'])
add('ui.inventory.badge_unowned', ['Nicht besessen', 'No poseído', 'Non posseduto', '未所持', '미소유', 'Nieposiadane', 'Não possuído', 'Нет в наличии', '未擁有', 'ไม่เป็น', 'Sahip değil', 'Не має в наявності', '未拥有'])

# === Inventory catalyst/reactors/credits ===
add('ui.inventory.catalysts', ['Katalysatoren', 'Catalizadores', 'Catalizzatori', '触媒', '촉매', 'Katalizatory', 'Catalisadores', 'Катализаторы', '觸媒', 'ปลั๊ก', 'Katalizatörler', 'Каталізатори', '催化剂'])
add('ui.inventory.credits', ['Credits', 'Créditos', 'Crediti', 'クレジット', '크레딧', 'Crédity', 'Créditos', 'Кредиты', '信用點', 'เครดิต', 'Krediler', 'Кредити', '信用点'])
add('ui.inventory.reactors', ['Reaktoren', 'Reactores', 'Reattori', '反応器', '반응기', 'Reaktory', 'Reatores', 'Реакторы', '反應器', 'รีเฟกเตอร์', 'Reatorler', 'Реактори', '反应堆'])

# === Notif Mgr columns ===
add('ui.notif_mgr.col_advance', [
    'Fortschritt', 'Progreso', 'Progresso', '進行', '진행', 'Postęp',
    'Progresso', 'Продвижение', '進度', 'ขั้นตอน', 'İlerleme', 'Прогрес', '进度'
])
add('ui.notif_mgr.col_alert_before', [
    'Alarm vor (min)', 'Alerta antes (min)', 'Avviso prima (min)', 'アラート前(分)',
    '알림 전(min)', 'Alert przed (min)', 'Alerta antes (min)', 'Уведомление за (мин)',
    '提前警告(分)', 'แจ้งล่วงหน้า (นาที)', 'Önce bildir (dk)', 'Сповіщення за (хв)', '提前警告(分钟)'
])
add('ui.notif_mgr.col_cooldown', [
    'Abklingzeit (min)', 'Tiempo de reutilización (min)', 'Tempo di raffreddamento (min)',
    'クールダウン(分)', '쿨타임(min)', 'Czas odnowienia (min)', 'Tempo de recarga (min)',
    'Время перезарядки (мин)', '冷卻時間(分)', 'เวลาทําซ้ำ (นาที)', 'Bekleme süresi (dk)', 'Час перезарядки (хв)', '冷却时间(分钟)'
])
add('ui.notif_mgr.col_difficulty', [
    'Schwierigkeit', 'Dificultad', 'Difficoltà', '難易度', '난이도', 'Trudność', 'Dificuldade',
    'Сложность', '難度', 'ความยาก', 'Zorluk', 'Складність', '难度'
])
add('ui.notif_mgr.col_interval', [
    'Intervall (min)', 'Intervalo (min)', 'Intervallo (min)', 'インターバル(分)',
    '간격(min)', 'Interwał (min)', 'Intervalo (min)', 'Интервал (мин)', '間隔(分)', 'ช่วง (นาที)',
    'Aralık (dk)', 'Інтервал (хв)', '间隔(分钟)'
])
add('ui.notif_mgr.col_mission_types', [
    'Operationsarten', 'Tipos de misión', 'Tipi di missione', 'ミッションタイプ',
    '미션 타입', 'Typy misji', 'Tipos de missão', 'Типы миссий', '任務類型',
    'ประเภทภารกิจ', 'Görev türleri', 'Типи місій', '任务类型'
])
add('ui.notif_mgr.col_syndicate', [
    'Syndikat', 'Sindicato', 'Sindacato', 'シンダイカート', '싱다이케', 'Syndykat',
    'Sindicato', 'Синдикат', 'Syndicate', 'สยส์Dicate', 'Sindikat', 'Синдикат', 'Syndicate'
])
add('ui.notif_mgr.col_tasks', [
    'Aufgaben', 'Tareas', 'Compiti', 'タスク', '태스크', 'Zadania',
    'Tarefas', 'Задачи', '任務', 'งาน', 'Görevler', 'Завдання', '任务'
])
add('ui.notif_mgr.col_threshold', [
    'Schwelle', 'Umbral', 'Soglia', 'しきい値', '임계값', 'Próg',
    'Limiar', 'Порог', '閾值', 'ค่าขาดเสียง', 'Eşik', 'Поріг', '阈值'
])
add('ui.notif_mgr.col_tiers', [
    'Paliers', 'Tierras', 'Tier', 'ティア', '티어', 'Tiers',
    'Tiers', 'Палицы', 'Tier', 'Tier', 'Tier', 'Палії', 'Tier'
])
add('ui.notif_mgr.mtype_void_armageddon', [
    'Void Armageddon', 'Armageddón del Vacío', 'Armageddon del Vuoto', 'Void Armageddon',
    'Void Armageddon', 'Armageddon z Próchnicy', 'Armageddon do Vazio', 'Армагеддон Пустоты',
    'Void Armageddon', 'Void Armageddon', 'Void Armageddon', 'Армагеддон Пустоти', 'Void Armageddon'
])
add('ui.notif_mgr.mtype_void_cascade', [
    'Void Cascade', 'Cascada del Vacío', 'Cascata del Vuoto', 'Void Cascade', 'Void Cascade',
    'Kaskada Próchnicy', 'Cascata do Vazio', 'Каскад Пустоты', 'Void Cascade', 'Void Cascade',
    'Void Cascade', 'Каскад Пустоти', 'Void Cascade'
])
add('ui.notif_mgr.mtype_void_flood', [
    'Void Flood', 'Inundación del Vacío', 'Inondation du Vide', 'Void Flood', 'Void Flood',
    'Zalanie Próchnicy', 'Inundou o Vazio', 'Наводнение Пустоты', 'Void Flood', 'Void Flood',
    'Void Flood', 'Наводнення Пустоти', 'Void Flood'
])
add('ui.notif_mgr.opt_a_tier', [
    'A-Tier', 'Rango A', 'Tier A', 'A-Tier', 'A-Tier', 'Rang A', 'Tier A',
    'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier'
])
add('ui.notif_mgr.opt_b_tier', [
    'B-Tier', 'Rango B', 'Tier B', 'B-Tier', 'B-Tier', 'Rang B', 'Tier B',
    'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier'
])
add('ui.notif_mgr.opt_c_tier', [
    'C-Tier', 'Rango C', 'Tier C', 'C-Tier', 'C-Tier', 'Rang C', 'Tier C',
    'C-Tier', 'C-Tier', 'C-Tier', 'C-Tier', 'C-Tier', 'C-Tier'
])
add('ui.notif_mgr.opt_d_tier', [
    'D-Tier', 'Rango D', 'Tier D', 'D-Tier', 'D-Tier', 'Rang D', 'Tier D',
    'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier'
])
add('ui.notif_mgr.opt_f_tier', [
    'F-Tier', 'Rango F', 'Tier F', 'F-Tier', 'F-Tier', 'Rang F', 'Tier F',
    'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier'
])
add('ui.notif_mgr.opt_s_tier', [
    'S-Tier', 'Rango S', 'Tier S', 'S-Tier', 'S-Tier', 'Rang S', 'Tier S',
    'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier'
])
add('ui.notif_mgr.tier_meso', ['Méso', 'Méso', 'Méso', 'Méso', 'Méso', 'Méso', 'Méso', 'Мео', 'Méso', 'Méso', 'Méso', 'Méso', 'Méso'])
add('ui.notif_mgr.tier_neo', ['Néo', 'Néo', 'Néo', 'Néo', 'Néо', 'Néо', 'Néо', 'Нео', 'Néо', 'Néо', 'Néо', 'Нео', 'Néо'])
add('ui.notif_mgr.trig_chat', [
    'Chat-Nachricht', 'Mensaje de chat', 'Messaggio chat', 'チャットメッセージ', '채팅 메시지',
    'Wiadomość czatowa', 'Mensagem de chat', 'Сообщение чата', '聊天消息', 'ข้อความแชต',
    'Sohbet mesajı', 'Повідомлення чату', '聊天消息'
])
add('ui.notif_mgr.trig_checklist', [
    'Checklisten-Aufgabe', 'Tarea de la lista', 'Compito della checklist', 'チェックリストタスク',
    '체크리스트 태스크', 'Zadanie na liście', 'Tarefa da lista', 'Задача из чек-листа', '清單任務',
    'งานรายชื่อ', 'Kontrol listesi görevi', 'Задача з чек-листа', '清单任务'
])
add('ui.notif_mgr.trig_foundry', [
    'Fonderie fertig', 'Fundición completa', 'Fucina completa', 'ファウンドリー完了',
    '팜토리 완료', 'Funderia kompletny', 'Fundição completa', 'Фаундри завершена', '熔鋼廠完成',
    'ฐานะ Foundry สมบูรณ์', 'Havuz tamam', 'Фаундрі завершена', '熔钢厂完成'
])
add('ui.notif_mgr.trig_mastery', [
    'Meisterschaftsrang erhöht', 'Subida de rango de dominio', 'Aumento del rango di maestria',
    'マスタリーランクアップ', '마astery 등급 상승', 'Awans rangi mistrzostwa', 'Subida de rank de domínio',
    'Повышение уровня мастерства', '技巧等級提升', 'ระดับความชำนาญเพิ่ม',
    'Ustalık seviyesi arttı', 'Підвищення рангу майстерності', '技巧等级提升'
])
add('ui.notif_mgr.trig_sale', [
    'Markt-Sonderverkauf', 'Oferta del mercado', 'Sconto mercato', 'マーケットセール',
    '마켓 세일', 'Sprzedaż rynkowa', 'Oferta do mercado', 'Распродажа на рынке',
    '市场特卖', 'มากกว่าขาย', 'Pazar indirimi', 'Розпродажа ринку', '市场特卖'
])
add('ui.notif_mgr.trig_void_traces', [
    'Void-Spuren', 'Rastros del Vacío', 'Tracce del Vuoto', 'Void traces', 'Void traces',
    'Szlaki Próchnicy', 'Traços do Vázio', 'Следы Пустоты', 'Void traces', 'Void traces',
    'Void traces', 'Void traces', 'Void traces'
])

# === Inventory settings/filters (the rest) ===

add('ui.inventory.filter_archgun', ['Arch-Guns', 'Armas de Arch', 'Armi Arch', 'Archガン', '아크건', 'Broń Arch', 'Armas de Arch', 'Архоружения', 'Arch槍', 'อาวุธ Arch', 'Arch Silahı', 'Архзброя', 'Arch槍'])
add('ui.inventory.filter_archmelee', ['Arch-Melee', 'Armas cuerpo a cuerpo de Arch', 'Armi melee Arch', 'Arch melee', '아크 근접', 'Broń Arch', 'Armas de corpo a corpo Arch', 'Архближнее оружие', 'Arch melee', 'อาวุธ Arch ประชิด', 'Arch yakın', 'Архближнє зброя', 'Arch melee'])
add('ui.inventory.filter_melee', ['Nahkampf', 'Melé', 'Mêlée', '近接', '근접', 'Biała', 'Corpo a corpo', 'Ближнее', '近戰', 'ประชิด', 'Yakın', 'Близька', '近战'])
add('ui.inventory.filter_necramech', ['Necramechs', 'Necramechs', 'Necramech', 'Necramech', '네크라밈', 'Necramechy', 'Necramechs', 'Некромехи', 'Necramech', 'เนคราเมค', 'Necramechler', 'Некромехи', 'Necramech'])
add('ui.inventory.filter_pistol', [
    'Pistolen', 'Pistolas', 'Pistole', 'ピストル', '피스톨', 'Pistolety',
    'Pistolas', 'Пистолеты', 'Pistol', 'พิสตอล', 'Pistols', 'Пістоли', 'Pistol'
])
add('ui.inventory.filter_primary', ['Hauptwaffe', 'Primaria', 'Primaria', 'プライマリ', '주 무기', 'Broń pierwszo', 'Primária', 'Основное', '主武器', 'หลัก', 'Birincil', 'Перша', '主武器'])
add('ui.inventory.filter_rifle', ['Gewehre', 'Fusiles', 'Fucili', 'ライフル', '래스플', 'Karabiny', 'Fuzis', 'Винтовки', 'Rifle', 'ไรเฟิล', 'Tüfekler', 'Гвіздківка', 'Rifle'])
add('ui.inventory.filter_secondary', ['Sekundärwaffe', 'Secundaria', 'Secondaria', 'セカンダリ', '보조', 'Wtórna', 'Secundária', 'Вторичное', '副武器', 'รอง', 'İkincil', 'Друга', '副武器'])

add('ui.inventory.filter_shotgun', ['Schrotflinten', 'Escopetas', 'Scoppi', 'ショットガン', '샷건', 'Strzelby', 'Escopetas', 'Дробовики', 'Shotgun', 'Shotgun', 'Shotgun', 'Драбовики', 'Shotgun'])
add('ui.inventory.filter_unknown', ['Unbekannt', 'Desconocido', 'Sconosciuto', '不明', '알 수 없음', 'Nieznany', 'Desconhecido', 'Неизвестный', 'Unknown', 'ไม่ทราบ', 'Bilinmiyor', 'Невідомий', 'Unknown'])
add('ui.inventory.incarnon_rank', [
    'Incarnon-Rang {rank}', 'Rango Incarnon {rank}', 'Rango Incarnon {rank}',
    'インカルノンランク {rank}', 'Incarnon 등급 {rank}', 'Ranga Incarnon {rank}',
    'Rank Incarnon {rank}', 'Инкарнон ранг {rank}', 'Incarnon 等級 {rank}',
    'ระดับ Incarnon {rank}', 'Incarnon Seviye {rank}', 'Ranga Incarnon {rank}', 'Incarnon 等级 {rank}'
])

add('ui.inventory.mod_rarity_common', ['Gewöhnlich', 'Común', 'Comune', 'コモン', '흔함', 'Zwykłe', 'Comum', 'Обычный', '一般', 'ทั่วไป', 'Yaygın', 'Звичайний', '一般'])
add('ui.inventory.mod_rarity_rare', ['Selten', 'Raro', 'Raro', 'レア', '희귀', 'Rzadkie', 'Raro', 'Редкий', '稀有', 'หายาก', 'Nadir', 'Рідкий', '稀有'])
add('ui.inventory.mod_rarity_legendary', ['Legendarisch', 'Legendario', 'Leggendario', 'レジェンダリー', '전설', 'Legendarne', 'Lendário', 'Легендарный', '傳奇', 'ตำนาน', 'Efsanevi', 'Легендарний', '传奇'])
add('ui.inventory.mod_rarity_uncommon', ['Ungewöhnlich', 'Poco común', 'Non comune', 'アンコモン', '비흔함', 'Niecodzienne', 'Não comum', 'Необычный', '非常', 'พบได้น้อย', 'Nadir', 'Незвичайний', '非常'])
add('ui.inventory.subtitle_items', [
    'Gegenstände', 'Elementos', 'Elementi', 'アイテム', '아이템', 'Przedmioty',
    'Itens', 'Предметы', '物品', 'สิ่งของ', 'Eşyalar', 'Предмети', '物品'
])

# === Settings remaining ===
add('settings.sound', [
    'Sound', 'Sonido', 'Suono', 'サウンド', '사운드', 'Dźwięk', 'Som', 'Звук', 'Sound',
    'เสียง', 'Ses', 'Звук', 'Sound'
])
add('settings.sounds', [
    'Sounds', 'Sonidos', 'Suoni', 'サウンド', '사운드', 'Dźwięki', 'Sons', 'Звуки', 'Sounds',
    'เสียง', 'Sesler', 'Звуки', 'Sounds'
])
add('settings.notifications', [
    'Benachrichtigungen', 'Notificaciones', 'Notifiche', '通知', '알림', 'Powiadomienia',
    'Notificações', 'Уведомления', '通知', 'การแจ้งเตือน', 'Bildirimler', 'Сповіщення', '通知'
])
add('settings.version', [
    'Version', 'Versión', 'Versione', 'バージョン', '버전', 'Wersja', 'Versão', 'Версия',
    '版本', 'เวอร์ชัน', 'Versiyon', 'Версія', '版本'
])

# Save all translations to JSON file
with open('/tmp/tables/translations.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"Saved {len(T)} translation entries to /tmp/tables/translations.json")
