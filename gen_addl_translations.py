#!/usr/bin/env python3
"""Add the remaining 62 EN values to the translation table."""
import json, os

LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

T = {}

def add(en_val, vals):
    T[en_val] = vals[:13] + [en_val] * (13 - len(vals))

# === Remaining EN values from the 62 not-yet-translated ===

# UI chrome (not proper nouns) - these need translation
add('Active', ['Aktiv', 'Activo', 'Attivo', 'アクティブ', '활성', 'Aktywny', 'Ativo', 'Активный', 'Active', 'Active', 'Etkin', 'Активний', 'Active'])
add('Offline', ['Offline', 'Sin conexión', 'Non in linea', 'オフライン', '오프라인', 'Offline', 'Offline', 'Офлайн', 'Offline', 'ออฟไลน์', 'Offline', 'Офлайн', 'Offline'])
add('Stale', ['Veraltet', 'Caducado', 'Obsoleto', 'ストale', '스태일', 'Stary', 'Desatualizado', 'Устаревший', 'Stale', 'เก่า', 'Eskimiş', 'Заповніт', 'Stale'])
add('Waiting', ['Warten', 'Esperando', 'In attesa', '待機中', '대기 중', 'Oczekiwanie', 'Aguardando', 'Ожидание', '等待', 'กำลังรอ', 'Bekliyor', 'Очікування', '等待'])
add('Advance', ['Erweitern', 'Avanzar', 'Avanzare', '進む', '진행', 'Do przodu', 'Avançar', 'Вперед', '前進', 'เพิ่มเติม', 'İlerle', 'Розвинути', '前进'])

# Wait, "Advance" as in notification monitor - should be "Erweitern" or "Voranschreiten"?
# Actually in context it's "Advance" (move forward), so:
T['Advance'] = ['Voranschreiten', 'Avanzar', 'Avanti', '進む', '진행', 'Do przodu', 'Avançar', 'Вперед', '前進', 'เพิ่มเติม', 'İlerle', 'Розвинути', '前进']

add('Alert before (min)', ['Alarm vor (min)', 'Alerta antes (min)', 'Avvisa prima (min)', 'アラート前 (分)', '알림 전 (분)', 'Powiadom przed (min)', 'Alerta antes (min)', 'Оповещение за (мин)', '前(min)警報', 'เตือนล่วงหน้า (分)', 'Önce uyar (dk)', 'Попередження за (хв)', '前(分钟)警报'])
add('Cooldown (min)', ['Cooldown (min)', 'Enfriamiento (min)', 'Tempo di raffreddamento (min)', 'クールダウン (分)', '쿨타임 (분)', 'Cooldown (min)', 'Recarga (min)', 'Задержка (мин)', 'Cooldown (分)', 'เวลาทํางาน (นาที)', 'Bekleme süresi (dk)', 'Cooldown (хв)', 'Cooldown (分钟)'])
add('Difficulty', ['Schwierigkeit', 'Dificultad', 'Difficoltà', '難易度', '난이도', 'Trudność', 'Dificuldade', 'Сложность', '難度', 'ความยาก', 'Zorluk', 'Складність', '难度'])
add('Interval (min)', ['Intervall (min)', 'Intervalo (min)', 'Intervallo (min)', '間隔 (分)', '간격 (분)', 'Interwał (min)', 'Intervalo (min)', 'Интервал (мин)', '間隔(分)', 'ช่วง (นาที)', 'Aralık (dk)', 'Інтервал (хв)', '间隔(分钟)'])
add('Mission Types', ['Missions-Typen', 'Tipos de misión', 'Tipi di missione', 'ミッションタイプ', '미션 타입', 'Typy misji', 'Tipos de missão', 'Типы миссий', '任务類別', 'ประเภท任�務', 'Görev tipleri', 'Типи місій', '任务类型'])
add('Syndicate', ['Syndikat', 'Sindicato', 'Sindacato', 'シンジケート', '싱다카트', 'Syndykacja', 'Sindicato', 'Синдикат', 'Sindicato', 'กลุ่มงาน', 'Sindikat', 'Синдикат', 'Sindicato'])
add('Tasks', ['Aufgaben', 'Tareas', 'Compiti', 'タスク', '태스크', 'Zadania', 'Tarefas', 'Задачи', '任務', 'งาน', 'Görevler', 'Завдання', '任务'])
add('Threshold', ['Schwellenwert', 'Umbral', 'Soglia', '閾値', '임계값', 'Próg', 'Limite', 'Порог', '閾值', 'ความเยี่ยม', 'Eşik', 'Поріг', '阈值'])
add('Tiers', ['Stufen', 'Niveles', 'Livelli', 'ティア', '티어', 'Tier', 'Níveis', 'Уровни', 'Tier', 'Tier', 'Tier', 'Tier', 'Tier'])
add('Tier', ['Stufe', 'Nivel', 'Livello', 'ティア', '티어', 'Poziom', 'Nível', 'Уровень', 'Tier', 'Tier', 'Tier', 'Позив', 'Tier'])

# Format strings with placeholders
add('In {weeks} Weeks', ['In {weeks} Wochen', 'En {weeks} semanas', 'Tra {weeks} settimane', '{weeks}週後', '{weeks}주 후', 'Za {weeks} tygodni', 'Em {weeks} semanas', 'Через {weeks} недель', '在{weeks}星期後', 'ใน {weeks} สัปดาห์', '{weeks} hafta içinde', 'Через {weeks} тижні', '在{weeks}周后'])
add('Next Week', ['Nächste Woche', 'Próxima semana', 'Settimana prossima', '来週', '다음 주', 'Przyszły tydzień', 'Próxima semana', 'Следующая неделя', '下週', 'สัปดาห์หน้า', 'Gelecek hafta', 'Наступний тиждень', '下周'])

# Inventory
add('Set', ['Set', 'Juego', 'Set', 'セット', '세트', 'Zestaw', 'Jogo', 'Сет', 'セット', 'เซ็ต', 'Set', 'Сет', '套装'])
add('Sentinel', ['Sentinel', 'Centinela', 'Sentinella', 'センチネル', '센티널', 'Centynela', 'Sentinela', 'Сентинел', 'Sentinel', 'Sentinel', 'Sentinel', 'Сентинел', 'Sentinel'])
add('Details', ['Details', 'Detalles', 'Dettagli', '詳細', '세부信息', 'Szczegóły', 'Detalhes', 'Подробности', '詳情', 'รายละเอียด', 'Detaylar', 'Деталі', '详情'])
add('Filled', ['Gefüllt', 'Lleno', 'Riempito', '満たして', '채움', 'Wypełnione', 'Preenchido', 'Заполнено', '充满', 'เติม', 'Dolgu', 'Заповнено', '装满'])
add('None Owned', ['Keine besessen', 'Ninguno poseído', 'Nessuno posseduto', '未所持', '미소유', 'Brak posiadanych', 'Nenhum em mãos', 'Нет в наличии', '未擁有', 'ไม่มีอยู่แล้ว', 'Sahip değil', 'Немає у тебе', '未拥有'])
add('Catalysts', ['Katalysatoren', 'Catalizadores', 'Catalizzatori', '触媒', '촉매', 'Katalizatory', 'Catalisadores', 'Катализаторы', '触媒', 'Catalysts', 'Katalizatörler', 'Каталізатори', '催化剂'])
add('Reactors', ['Reaktoren', 'Reactores', 'Reattori', '反応', '반응로', 'Reaktory', 'Reatores', 'Реакторы', '反応', 'เครื่องปิด', 'Reaktörler', 'Реактори', '反应堆'])
add('Incarnon Rank {level}', ['Incarnon-Rang {level}', 'Rango Incarnon {level}', 'Rango Incarnon {level}', 'インカルノンランク{level}', '인카르논 등급 {level}', 'Ranga Incarnon {level}', 'Rank Incarnon {level}', 'Ранг Инакарнона {level}', 'Incarnon 等級 {level}', 'ระดับ Incarnon {level}', 'Incarnon Seviye {level}', 'Ранг Incarnon {level}', 'Incarnon 等级 {level}'])

# Elements
add('Gas', ['Gas', 'Gas', 'Gas', 'ガス', '가스', 'Gas', 'Gas', 'Газ', 'Gas', 'Gas', 'Gas', 'Gas', 'Gas'])
add('Void', ['Void', 'Vacío', 'Vuoto', 'ヴォイド', '보이드', 'Void', 'Vazio', 'Вакуум', 'Void', 'Void', 'Void', 'Void', 'Void'])

# Dashboard
add('Arbitration', ['Arbitration', 'Arbitraje', 'Arbitrato', 'アービトレーション', '중재', 'Arbitraż', 'Arbitragem', 'Арбитраж', 'Arbitrage', 'Arbitrage', 'Arbitration', 'Арбітраж', 'Arbitrage'])
# Wait - Arbitration is a specific Warframe game mode. Let me use the dict resolution for this.
# Actually it's a proper noun game mode name. FR says "Arbitrage" but EN game says "Arbitration".
# I'll use dict resolution later. For now:
T['Arbitration'] = ['Arbitration', 'Arbitraje', 'Arbitrato', 'アービトレーション', '중재', 'Arbitraż', 'Arbitragem', 'Арбитраж', 'Arbitrage', 'Arbitrage', 'Arbitration', 'Арбітраж', 'Arbitrage']

add('Archimedea', ['Archimedea', 'Archimedea', 'Archimedea', 'アーキメデア', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea', 'Archimedea'])
add('Descendia', ['Descendia', 'Descendia', 'Descendia', 'ディセンドリア', 'Descendia', 'Descendia', 'Descendia', 'Descendia', 'Descendia', 'Descendia', 'Descendia', 'Descendia', 'Descendia'])
add('Events', ['Ereignisse', 'Eventos', 'Eventi', 'イベント', '이벤트', 'Wydarzenia', 'Eventos', 'События', '事件', 'เหตุการณ์', 'Etkinlikler', 'Події', '事件'])
add('Deimos', ['Deimos', 'Deimos', 'Deimos', 'デイモス', '디모스', 'Deimos', 'Deimos', 'Деймос', 'Deimos', 'Deimos', 'Deimos', 'Deimos', 'Deimos'])
add('Orb Vallis', ['Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'オーブヴァリス', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis'])
add('CHECKPOINT', ['CHECKPOINT', 'PUNTO DE CONTROL', 'PUNTO DI CONTROLLO', 'チェックポイント', '체크포인트', 'CHECKPOINT', 'PONTO DE CONTROLE', 'ЧЕКПОЙНТ', 'CHECKPOINT', 'จุดตรวจ', 'CHECKPOINT', 'ЧЕКПОЙНТ', 'CHECKPOINT'])
add('Winter', ['Winter', 'Invierno', 'Inverno', '冬', '겨울', 'Zima', 'Inverno', 'Зима', '冬', ' winter', 'Kış', 'Зима', '冬'])

# Hmm, "Winter" in the penance context is a season name. FR says "Hiver".
# This is a game-specific term. Let me check if it resolves from dict...
# Actually, looking at the context: ui.dashboard.season_winter - this is about the season.
# FR: Hiver, DE should be: Winter (same concept). Let me keep it as is:
T['Winter'] = ['Winter', 'Invierno', 'Inverno', '冬', '겨울', 'Zima', 'Inverno', 'Зима', '冬', ' winter', 'Kış', 'Зима', '冬']

add('Cold', ['Kalt', 'Frío', 'Freddo', '冷', '차가움', 'Zimno', 'Frio', 'Холодно', '冷', 'Cold', 'Soğuk', 'Холодно', '冷'])
add('Warm', ['Warm', 'Cálido', 'Caldo', '暖', '따뜻함', 'Ciepło', 'Quente', 'Тёплая', '暖', 'Warm', 'Sıcak', 'Теплий', '暖'])

# Checklist
add('Loid: Voca', ['Loid: Voca', 'Loid : Voca', 'Loid: Voca', 'ロイド：ヴォカ', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca', 'Loid: Voca'])
# This is a proper noun (character name + item name) - keep as EN

# Collectibles
add('Isleweaver', ['Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver', 'Isleweaver'])
add('Necralisk', ['Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk', 'Necralisk'])

# Notif mgr mission types and triggers
add('Void Flood', ['Void Flood', 'Inondation du Néant', 'Inondazione del Vuoto', 'ヴォイドフラッシュ', '보이드 홍수', 'Void Flood', 'Inundação do Vacío', 'Наводнение Бездны', 'Void Flood', 'Void Flood', 'Void Flood', 'Напоєння Бездні', 'Void Flood'])
add('Mobile Interception', ['Mobiler Interception', 'Interceptación móvil', 'Intercettazione mobile', '機動インターセプション', '기동 정찰', 'Mobilne przechwytywanie', 'Interceptação móvel', 'Мобильный перехват', 'Mobile Interception', 'Mobile Interception', 'Mobile Interception', 'Мобільний перехват', 'Mobile Interception'])
add('Void Armageddon', ['Void Armageddon', 'Armageddon du Néant', 'Armageddon del Vuoto', 'ヴォイドアマガデオン', '보이드 아마겟돈', 'Void Armageddon', 'Armageddon do Vacío', 'Армагеддон Бездны', 'Void Armageddon', 'Void Armageddon', 'Void Armageddon', 'Армагеддон Бездні', 'Void Armageddon'])
add('Void Cascade', ['Void Cascade', 'Cascade du Néant', 'Cascata del Vuoto', 'ヴォイドカスケード', '보이드 캐스케이드', 'Void Cascade', 'Cascata do Vacío', 'Каскад Бездны', 'Void Cascade', 'Void Cascade', 'Void Cascade', 'Каскад Бездні', 'Void Cascade'])
add('Void Storm', ['Void Storm', 'Tempête du Néant', 'Tempesta del Vuoto', 'ヴォイドストーム', '보이드 스톰', 'Void Storm', 'Tempestade do Vacío', 'Буря Бездны', 'Void Storm', 'Void Storm', 'Void Storm', 'Буря Бездні', 'Void Storm'])

# Notif mgr tiers
add('A-Tier', ['A-Tier', 'Rang A', 'Livello A', 'A-Tier', 'A-Tier', 'A-Tier', 'Rank A', 'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier', 'A-Tier'])
add('B-Tier', ['B-Tier', 'Rang B', 'Livello B', 'B-Tier', 'B-Tier', 'B-Tier', 'Rank B', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier'])
add('C-Tier', ['C-Tier', 'Rang C', 'Livello C', 'C-Tier', 'C-Tier', 'C-Tier', 'Rank C', 'C-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier', 'B-Tier'])
add('D-Tier', ['D-Tier', 'Rang D', 'Livello D', 'D-Tier', 'D-Tier', 'D-Tier', 'Rank D', 'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier', 'D-Tier'])
add('F-Tier', ['F-Tier', 'Rang F', 'Livello F', 'F-Tier', 'F-Tier', 'F-Tier', 'Rank F', 'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier', 'F-Tier'])
add('S-Tier', ['S-Tier', 'Rang S', 'Livello S', 'S-Tier', 'S-Tier', 'S-Tier', 'Rank S', 'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier', 'S-Tier'])

# Relic eras - proper nouns, keep as EN
add('Meso', ['Meso', 'Méso', 'Méso', 'メソ', '메소', 'Meso', 'Méso', 'Мезо', 'Méso', 'Méso', 'Meso', 'Мезо', 'Méso'])
add('Neo', ['Neo', 'Néo', 'Néo', 'ネオ', '네오', 'Neo', 'Néo', 'Нео', 'Néo', 'Néо', 'Neo', 'Нео', 'Néо'])
add('Lith', ['Lith', 'Lith', 'Lith', 'リス', '리스', 'Lith', 'Lith', 'Лит', 'Lith', 'Lith', 'Lith', 'Літ', 'Lith'])
add('Axi', ['Axi', 'Axi', 'Axi', 'アキシ', '축', 'Aks', 'Axi', 'Акси', 'Axi', 'Axi', 'Axi', 'Аксі', 'Axi'])
add('Omnia', ['Omnia', 'Omnia', 'Omnia', 'オムニア', '옴니아', 'Omnia', 'Omnia', 'Омниа', 'Omnia', 'Omnia', 'Omnia', 'Омніа', 'Omnia'])

# Notif mgr triggers
add('Chat Message', ['Chat-Nachricht', 'Mensaje de chat', 'Messaggio di chat', 'チャットメッセージ', '채팅 메시지', 'Wiadomość czatu', 'Mensagem de chat', 'Сообщение чата', '聊天信息', 'ข้อความแชต', 'Sohbet mesajı', 'Повідомлення чату', '聊天信息'])
add('Checklist Task', ['Checklisten-Aufgabe', 'Tarea de la lista', 'Compito della checklist', 'チェックリストタスク', '체크리스트 작업', 'Zadanie na liście', 'Tarefa da lista', 'Задача чеклиста', '清單任務', 'งานรายการ', 'Kontrol listesi görevi', 'Завдання чекліста', '清单任务'])
add('Mastery Rank Up', ['Meisterschafts-Rang erhöht', 'Ascenso de rango de Maestría', 'Salita del Rango di Maestria', 'マスタリー・ランクアップ', '마astery 등급 상승', 'Awans rangi Mastery', 'Ascensão de Rank de Maestria', 'Повышение ранга Мастерства', 'Mastery Rank Up', 'Mastery Rank Up', 'Mastery Rank Up', 'Mastery Rank Up', 'Mastery Rank Up'])
add('Market Sale', ['Marktverkauf', 'Oferta del mercado', 'Offerta del mercado', 'マーケットセイル', '마켓 세일', 'Wyprzedaż rynkowa', 'Oferta do mercado', 'Распродажа на рынке', 'Market Sale', 'Market Sale', 'Market Sale', 'Market Sale', 'Market Sale'])
add('Void Traces', ['Void Spuren', 'Rastro del Néant', 'Tracce del Vuoto', 'ヴォイドトレース', '보이드 트레이스', 'Void Traces', 'Traças do Vacío', 'Остатки Бездны', 'Void Traces', 'Void Traces', 'Void Traces', 'Void Traces', 'Void Traces'])

# Mastery rank titles (these should resolve from ExportMasteryRanks, but as fallback):
# "Tiger" is Mastery Rank 19 title, "Dragon" is MR 21, etc.
add('Tiger', ['Tiger', 'Tigre', 'Tigre', 'ティグル', '호랑이', 'Tiger', 'Tigre', 'Тигр', 'Tiger', 'Tiger', 'Tiger', 'Тигер', 'Tiger'])
# These are mastery rank titles - proper nouns, keep as EN

# Save
with open('/tmp/tables/translation_table_addl.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"Saved {len(T)} additional translation entries")
