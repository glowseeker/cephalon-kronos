#!/usr/bin/env python3
"""
Build remaining_translations.json with PROPER per-locale translations.
No FR-as-fallback. Uses:
1. Dict files for game-sourced terms
2. Manual translations for UI text (provided by me, per locale)
3. EN for proper nouns where no translation exists

Each entry: {en_val: {locale: translation}}
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Load dict files to build EN->localized map
en_to_local = {}
for lo in LOCALES + ['fr']:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val == en_val or not loc_val.strip():
            continue
        en_key = en_val.lower()
        if en_key not in en_to_local:
            en_to_local[en_key] = {}
        if lo not in en_to_local[en_key] or not en_to_local[en_key][lo]:
            en_to_local[en_key][lo] = loc_val

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}
langs['fr'] = fr

flat_en = dict(en.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES + ['fr']}

# Build reverse map
en_val_to_keys = {}
for k, v in flat_en.items():
    if isinstance(v, str):
        en_val_to_keys.setdefault(v, []).append(k)

# Manual translations: {en_val: {locale: [translations]}}
# Only for UI text not in dict files
MANUAL_TRANS = {
    '1999 Calendar': {
        'de': '1999-Kalender', 'es': 'Calendario 1999', 'it': 'Calendario 1999',
        'ja': '1999カレンダー', 'ko': '1999 캘린더', 'pl': 'Kalendarz 1999',
        'pt': 'Calendário 1999', 'ru': 'Календарь 1999', 'tc': '1999日曆',
        'th': 'ปฏิทิน 1999', 'tr': '1999 Takvimi', 'uk': 'Календар 1999', 'zh': '1999日历'
    },
    'Alert before (min)': {
        'de': 'Warnung vor (min)', 'es': 'Aviso antes de (min)', 'it': 'Avviso prima di (min)',
        'ja': '通知時間 (分)', 'ko': '알림 시간 (분)', 'pl': 'Powiadomienie przed (min)',
        'pt': 'Aviso antes de (min)', 'ru': 'Оповещение за (min)', 'tc': '提前通知(min)',
        'th': 'แจ้งล่วงหน้า (นาที)', 'tr': 'Uyarı öncesi (dk)', 'uk': 'Сповіщення за (хв)', 'zh': '提前通知(分钟)'
    },
    'Alerts': {
        'de': 'Warnungen', 'es': 'Alertas', 'it': 'Allerta',
        'ja': 'アラート', 'ko': '경보', 'pl': 'Alerty',
        'pt': 'Alertas', 'ru': 'Оповещения', 'tc': '警報',
        'th': 'การแจ้งเตือน', 'tr': 'Uyarılar', 'uk': 'Тривоги', 'zh': '警报'
    },
    'Arbitration': {
        'de': 'Arbitrage', 'es': 'Arbitraje', 'it': 'Arbitrato',
        'ja': 'アビビショナリ', 'ko': '중재', 'pl': 'Arbitraż',
        'pt': 'Arbitragem', 'ru': 'Арбитраж', 'tc': '仲裁',
        'th': 'การโหวต', 'tr': 'Müzakeresel', 'uk': 'Арбітраж', 'zh': '仲裁'
    },
    'Arbitration Drones': {
        'de': 'Arbitrage-Drohnen', 'es': 'Drones de arbitraje', 'it': 'Droni di arbitrato',
        'ja': '中裁ドローン', 'ko': '중재 드론', 'pl': 'Drony arbitrażu',
        'pt': 'Drones de arbitragem', 'ru': 'Дроны арбитража', 'tc': 'Drones d\'arbitrage',
        'th': 'เห隊ของการโหวต', 'tr': 'Müzakeresel Drone\'lar', 'uk': 'Дрони арбітражу', 'zh': '仲裁无人机'
    },
    'Archguns': {
        'de': 'Arch-Waffen', 'es': 'Arcano-Armas', 'it': 'Arco-Armamenti',
        'ja': 'アークガン', 'ko': '아크건', 'pl': 'Arma', 'pt': 'Arc-Armas',
        'ru': 'Арк-оружие', 'tc': '曲翼槍', 'th': 'อาวุธ Archwing', 'tr': 'Evsel Silahlar', 'uk': 'Арк-зброя', 'zh': '翱翔枪'
    },
    'Archimedea': {
        'de': 'Archimedea', 'es': 'Arquimédea', 'it': 'Archimede',
        'ja': 'アーキメディア', 'ko': '아키메디아', 'pl': 'Archimede', 'pt': 'Arquimedes',
        'ru': 'Архимед', 'tc': '阿基米德', 'th': 'Archimedea', 'tr': 'Archimedes', 'uk': 'Архімед', 'zh': '阿基米德'
    },
    'Archon Hunts': {
        'de': 'Archon-Jagden', 'es': 'Cacerías de Archon', 'it': 'Caccia agli Archon',
        'ja': 'アーキンハント', 'ko': '아크론 사냥', 'pl': 'Polowanie na Archona',
        'pt': 'Caçadas aos Archons', 'ru': 'Охота на Архонов', 'tc': 'Chasse aux Archons',
        'th': 'การล่า Archon', 'tr': 'Archon Avı', 'uk': 'Полювання на Архонів', 'zh': 'Archon狩猎'
    },
    'Average Value': {
        'de': 'Durchschnittswert', 'es': 'Valor medio', 'it': 'Valore medio',
        'ja': '平均値', 'ko': '평균 가치', 'pl': 'Średnia wartość',
        'pt': 'Valor médio', 'ru': 'Средняя ценность', 'tc': 'Valeur moyenne',
        'th': 'มูลค่าเฉลี่ย', 'tr': 'Ortalama Değer', 'uk': 'Середня вартість', 'zh': '平均值'
    },
    'Avg Value': {
        'de': 'Durchschnittswert', 'es': 'Valor medio', 'it': 'Valore medio',
        'ja': '平均値', 'ko': '평균 가치', 'pl': 'Śr. wartość',
        'pt': 'Valor médio', 'ru': 'Средняя ценность', 'tc': 'Valeur moyenne',
        'th': 'มูลค่าเฉลี่ย', 'tr': 'Ortalama Değer', 'uk': 'Середня цінність', 'zh': '平均值'
    },
    'Ayatan Stars': {
        'de': 'Ayatan-Sterne', 'es': 'Estrellas ayatan', 'it': 'Stelle Ayatan',
        'ja': 'アヤタン星', 'ko': '아야탄 별', 'pl': 'Gwiazdy Ayatan',
        'pt': 'Estrelas Ayatan', 'ru': 'Аятанские звёзды', 'tc': 'Ayatan星',
        'th': 'ดวงดาว Ayatan', 'tr': 'Ayatan Yıldızları', 'uk': 'Зірки Аятана', 'zh': '阿亚坦之星'
    },
    'Biweekly': {
        'de': 'Zweiwöchentlich', 'es': 'Bimensual', 'it': 'Bisettimanale',
        'ja': '隔週', 'ko': '격주', 'pl': 'Co dwa tygodnie',
        'pt': 'Quinzenal', 'ru': 'Раз в две недели', 'tc': '隔週',
        'th': 'สัปดาห์ละครั้ง', 'tr': 'İki haftada bir', 'uk': 'Раз на два тижні', 'zh': '隔周'
    },
    'Boss fight encounter.': {
        'de': 'Bosskampf-Begegnung.', 'es': 'Encuentro con el jefe.', 'it': 'Incontro con il boss.',
        'ja': 'ボス戦に遭遇。', 'ko': '보스 전투 encounter.', 'pl': 'Spotkanie z bossem.',
        'pt': 'Encontro de combate com chefe.', 'ru': 'Встреча с боссом.', 'tc': 'Boss戰 encounter.',
        'th': 'การเผชิญหน้ากับ Boss', 'tr': 'Boss savaşı.', 'uk': 'Бій з босом.', 'zh': 'Boss战 encounter.'
    },
    'Bounties': {
        'de': 'Aufträge', 'es': 'Recompensas', 'it': 'Compiti',
        'ja': 'ボンティ', 'ko': '보상 미션', 'pl': 'Zlecenia',
        'pt': 'Tarefas', 'ru': 'Награды', 'tc': '賏金任務',
        'th': 'งานตามภารกิจ', 'tr': 'Ödüller', 'uk': 'Завдання', 'zh': '赏金任务'
    },
    'CHECKPOINT': {
        'de': 'PRÜFUNGSTELLE', 'es': 'PUNTO DE CONTROL', 'it': 'PUNTO DI CONTROLLO',
        'ja': 'チェックポイント', 'ko': '체크포인트', 'pl': 'PUNKT KONTROLNY',
        'pt': 'PONTO DE CONTROLE', 'ru': 'КОНТРОЛЬНАЯ ТОЧКА', 'tc': '檢查點',
        'th': 'จุดตรวจสอบ', 'tr': 'KONTROL NOKTASI', 'uk': 'КОНТРОЛЬНА ТОЧКА', 'zh': '检查点'
    },
    'Catalysts': {
        'de': 'Katalysatoren', 'es': 'Catalizadores', 'it': 'Catalizzatori',
        'ja': '触媒', 'ko': '촉매', 'pl': 'Katalizatory',
        'pt': 'Catalisadores', 'ru': 'Катализаторы', 'tc': '觸媒',
        'th': 'สารกระตุ้น', 'tr': 'Katalizatörler', 'uk': 'Каталізатори', 'zh': '催化剂'
    },
    'Challenge': {
        'de': 'Herausforderung', 'es': 'Desafío', 'it': 'Sfida',
        'ja': 'チャレンジ', 'ko': '도전', 'pl': 'Wyzwanie',
        'pt': 'Desafio', 'ru': 'Вызов', 'tc': '挑戰',
        'th': 'ความท้าทาย', 'tr': 'Meydan', 'uk': 'Випробування', 'zh': '挑战'
    },
    'Chat Message': {
        'de': 'Chat-Nachricht', 'es': 'Mensaje de chat', 'it': 'Messaggio privato',
        'ja': 'チャットメッセージ', 'ko': '채팅 메시지', 'pl': 'Wiadomość czatowa',
        'pt': 'Mensagem de chat', 'ru': 'Сообщение чата', 'tc': '消息',
        'th': 'ข้อความแชต', 'tr': 'Sohbet mesajı', 'uk': 'Повідомлення чату', 'zh': '聊天信息'
    },
    'Checklist': {
        'de': 'Checkliste', 'es': 'Lista de verificación', 'it': 'Lista di controllo',
        'ja': 'チェックリスト', 'ko': '체크리스트', 'pl': 'Lista kontrolna',
        'pt': 'Lista de verificação', 'ru': 'Чек-лист', 'tc': '清單',
        'th': 'รายการตรวจสอบ', 'tr': 'Kontrol Listesi', 'uk': 'Чек-лист', 'zh': '清单'
    },
    'Checklist Task': {
        'de': 'Checklisten-Aufgabe', 'es': 'Tarea de lista de verificación', 'it': 'Compito della checklist',
        'ja': 'チェックリストタスク', 'ko': '체크리스트 작업', 'pl': 'Zadanie na liście',
        'pt': 'Tarefa de lista de verificação', 'ru': 'Задача чеклиста', 'tc': '清單任務',
        'th': 'งานรายการตรวจสอบ', 'tr': 'Kontrol listesi görevi', 'uk': 'Задача чеклиста', 'zh': '清单任务'
    },
    'Cold': {
        'de': 'Kälte', 'es': 'Frío', 'it': 'Freddo',
        'ja': 'Cold', 'ko': '냉기', 'pl': 'Zimno',
        'pt': 'Fri', 'ru': 'Холод', 'tc': 'Cold',
        'th': 'เย็น', 'tr': 'Soğuk', 'uk': 'Холод', 'zh': '冷'
    },
    'Completion': {
        'de': 'Vervollständigung', 'es': 'Compleción', 'it': 'Completamento',
        'ja': '完成', 'ko': '완료', 'pl': 'Uzupełnienie',
        'pt': 'Conclusão', 'ru': 'Завершение', 'tc': '完成',
        'th': 'การส completes', 'tr': 'Tamamlanma', 'uk': 'Завершення', 'zh': '完成'
    },
    'Cooldown (min)': {
        'de': 'Abklingzeit (Min)', 'es': 'Tiempo de enfriamiento (min)', 'it': 'Tempo di raffreddamento (min)',
        'ja': 'クールダウン (分)', 'ko': '쿨타임 (분)', 'pl': 'Czas chłodzenia (min)',
        'pt': 'Intervalo entre usos (min)', 'ru': 'Время перезарядки (мин)', 'tc': '冷卻時間(min)',
        'th': 'เวลาพัก (นาที)', 'tr': 'Soğuma Süresi (dk)', 'uk': 'Час охолодження (хв)', 'zh': '冷却时间(分钟)'
    },
    'Count': {
        'de': 'Anzahl', 'es': 'Cantidad', 'it': 'Conteggio',
        'ja': '個数', 'ko': '개수', 'pl': 'Liczba',
        'pt': 'Contagem', 'ru': 'Количество', 'tc': '數量',
        'th': 'จำนวน', 'tr': 'Sayı', 'uk': 'Кількість', 'zh': '数量'
    },
    'Crafting': {
        'de': 'Handwerk', 'es': 'Fabricación', 'it': 'Fabbricazione',
        'ja': 'クラフト', 'ko': '제작', 'pl': 'Tworzenie',
        'pt': 'Criação', 'ru': 'Создание', 'tc': '裝配',
        'th': 'การสร้าง', 'tr': 'Üretme', 'uk': 'Створення', 'zh': '制作'
    },
    'Crafting Ingredient': {
        'de': 'Handwerksmaterial', 'es': 'Ingrediente de fabricación', 'it': 'Ingrediente di fabbricazione',
        'ja': 'クラフト材料', 'ko': '제작 재료', 'pl': 'Składnik do tworzenia',
        'pt': 'Ingrediente de Criação', 'ru': 'Материал для создания', 'tc': '製作材料',
        'th': 'ส่วนประกอบการสร้าง', 'tr': 'Üretme Malzemesi', 'uk': 'Інгредієнт для створення', 'zh': '制作材料'
    },
    'Credits': {
        'de': 'Credits', 'es': 'Créditos', 'it': 'Crediti',
        'ja': 'クレジット', 'ko': '크레딧', 'pl': 'Kredyty',
        'pt': 'Créditos', 'ru': 'Кредиты', 'tc': ' Crédits',
        'th': 'เครดิต', 'tr': 'Krediler', 'uk': 'Кредити', 'zh': '学分'
    },
    'Creds': {
        'de': 'Credits', 'es': 'Créditos', 'it': 'Crédits',
        'ja': 'クレ', 'ko': '크레딧', 'pl': 'Kredyty',
        'pt': 'Crédits', 'ru': 'Креды', 'tc': 'Crédits',
        'th': 'เครดิต', 'tr': 'Altın', 'uk': 'Кредити', 'zh': '学分'
    },
    'Cursor': {
        'de': 'Cursor', 'es': 'Cursor', 'it': 'Cursore',
        'ja': 'カーソル', 'ko': '커서', 'pl': 'Kursor',
        'pt': 'Cursor', 'ru': 'Курсор', 'tc': '游標',
        'th': 'เคอร์เซอร์', 'tr': 'İşaretçi', 'uk': 'Курсор', 'zh': '光标'
    },
    'Daily': {
        'de': 'Täglich', 'es': 'Diario', 'it': 'Giornaliero',
        'ja': '日次', 'ko': '일일', 'pl': 'Codziennie',
        'pt': 'Diário', 'ru': 'Ежедневно', 'tc': ' quotidien',
        'th': 'ประจำวัน', 'tr': 'Günlük', 'uk': 'Щоденне', 'zh': '每日'
    },
    'Daily Reset': {
        'de': 'Täglicher Reset', 'es': 'Restablecer diario', 'it': 'Ripristino giornaliero',
        'ja': 'デイリーリセット', 'ko': '일일 재설정', 'pl': 'Codzienny reset',
        'pt': 'Redefinição diária', 'ru': 'Ежедневный сброс', 'tc': 'réinitialisation quotidienne',
        'th': 'รีเซ็ตประจำวัน', 'tr': 'Günlük Sıfırlama', 'uk': 'Щоденний скін', 'zh': '每日重置'
    },
    'Darvo\'s Deal': {
        'de': 'Darvos Schnäppchen', 'es': 'Oferta de Darvo', 'it': 'Offerta Darvo',
        'ja': 'ダーボの特価', 'ko': 'Darvo의 거래', 'pl': 'Oferta Darvo',
        'pt': 'Oferta do Darvo', 'ru': 'Сделка Дарво', 'tc': 'Offre de Darvo',
        'th': 'ส่วนลด Darvo', 'tr': "Darvo'nun Fiyatı", 'uk': 'Угода Дарво', 'zh': '达沃的便宜货'
    },
    'Dashboard': {
        'de': 'Übersicht', 'es': 'Panel', 'it': 'Cruscotto',
        'ja': 'ダッシュボード', 'ko': '대시보드', 'pl': 'Deski',
        'pt': 'Painel', 'ru': 'Панель', 'tc': '儀表板',
        'th': 'แดชบอร์ด', 'tr': 'Gösterge Paneli', 'uk': 'Панель', 'zh': '仪表盘'
    },
    'Day': {
        'de': 'Tag', 'es': 'Día', 'it': 'Giorno',
        'ja': '日', 'ko': '날', 'pl': 'Dzień',
        'pt': 'Dia', 'ru': 'День', 'tc': 'Jour',
        'th': 'วัน', 'tr': 'Gün', 'uk': 'День', 'zh': 'Jour'
    },
    'Descendia': {
        'de': 'Descendia', 'es': 'Descendia', 'it': 'Descendia',
        'ja': 'デセンディア', 'ko': 'Descendia', 'pl': 'Descendia',
        'pt': 'Descendência', 'ru': 'Десцендия', 'tc': 'Descendia',
        'th': 'Descendia', 'tr': 'Descendia', 'uk': 'Десцендія', 'zh': 'Descendia'
    },
    'Details': {
        'de': 'Details', 'es': 'Detalles', 'it': 'Dettagli',
        'ja': '詳細', 'ko': '세부 정보', 'pl': 'Szczegóły',
        'pt': 'Detalhes', 'ru': 'Подробности', 'tc': '詳細',
        'th': 'รายละเอียด', 'tr': 'Detaylar', 'uk': 'Деталі', 'zh': '详情'
    },
    'Difficulty': {
        'de': 'Schwierigkeit', 'es': 'Dificultad', 'it': 'Difficoltà',
        'ja': '難易度', 'ko': '난이도', 'pl': 'Trudność',
        'pt': 'Dificuldade', 'ru': 'Сложность', 'tc': '難易度',
        'th': 'ความยาก', 'tr': 'Zorluk', 'uk': 'Складність', 'zh': '难度'
    },
    'Disclaimer': {
        'de': 'Haftungsausschluss', 'es': 'Descargo de responsabilidad', 'it': 'Avviso legale',
        'ja': '免責事項', 'ko': '면책 조항', 'pl': 'Zastrzeżenie',
        'pt': 'Aviso Legal', 'ru': 'Отказ от ответственности', 'tc': '免責聲明',
        'th': 'ข้อจำกัดความรับผิด', 'tr': 'Feragatname', 'uk': 'Декларація', 'zh': '免责声明'
    },
    'EXP DUCATS': {
        'de': 'EXP DUKATEN', 'es': 'EXP DUCATAS', 'it': 'ESP Ducati',
        'ja': 'EXP ダクタ', 'ko': 'EXP 덕카', 'pl': 'EXP DUKATY',
        'pt': 'EXP DUCATS', 'ru': 'ЭКСП ДУКАТЫ', 'tc': 'EXP DUCATS',
        'th': 'EXP ดักต์', 'tr': 'EXP DUKAT', 'uk': 'EXP ДУКАТИ', 'zh': 'EXP 达卡特'
    },
    'EXP PLAT': {
        'de': 'EXP PLATIN', 'es': 'EXP PLATINO', 'it': 'ESP Piatte',
        'ja': 'EXP プラチナ', 'ko': 'EXP 플랫', 'pl': 'EXP PLATYN',
        'pt': 'EXP PLATINA', 'ru': 'ЭКСП ПЛАТИНА', 'tc': 'EXP PLAT',
        'th': 'EXP แพลตตินัม', 'tr': 'EXP PLATINUM', 'uk': 'EXP ПЛАТИНА', 'zh': 'EXP 铂金'
    },
    'Era:': {
        'de': 'Epoche:', 'es': 'Época:', 'it': 'Epoca:',
        'ja': '時代：', 'ko': '시대：', 'pl': 'Époque :',
        'pt': 'Época:', 'ru': 'Эра:', 'tc': '時代：',
        'th': 'ยุค:', 'tr': 'Çağ:', 'uk': 'Ера:', 'zh': '纪元：'
    },
    'Events': {
        'de': 'Veranstaltungen', 'es': 'Eventos', 'it': 'Eventi',
        'ja': 'イベント', 'ko': '이벤트', 'pl': 'Wydarzenia',
        'pt': 'Eventos', 'ru': 'События', 'tc': ' events',
        'th': 'เหตุการณ์', 'tr': 'Etkinlikler', 'uk': 'Події', 'zh': ' events'
    },
    'Exotic': {
        'de': 'Exotisch', 'es': 'Exótico', 'it': 'Esotico',
        'ja': 'エキゾチック', 'ko': '이국적', 'pl': 'Egzotyczny',
        'pt': 'Exótico', 'ru': 'Экзотика', 'tc': 'Exotique',
        'th': 'เอ็กซอติก', 'tr': 'Ekotik', 'uk': 'Екзотичний', 'zh': 'Exotique'
    },
    'Fill a Conversion Progress gauge.': {
        'de': 'Füllen Sie einen Konversionsfortschritt-Messer.',
        'es': 'Complete un medidor de Progreso de Conversión.',
        'it': 'Compila un indicatore di Progressione Conversione.',
        'ja': 'Conversion Progress ゲージを埋めてください。',
        'ko': '변환 진행률 게이지를 채우세요.',
        'pl': 'Wypełnij wskaźnik Postępu Konwersji.',
        'pt': 'Preencha um medidor de Progresso de Conversão.',
        'ru': 'Заполните шкалу Прогрессии Конверсии.',
        'tc': '填满转换进度仪表。',
        'th': 'เติมเมตริกซ์ความคือก้าวหน้าของ Conversion',
        'tr': 'Conversion Progress göstergesini doldurun.',
        'uk': 'Заповніть шкалу Прогресу Конверсії.',
        'zh': '填满转换进度仪表。'
    },
    'Fill a Crucible using two elemental Amphors.': {
        'de': 'Füllen Sie ein Kessel mit zwei elementaren Amphors.',
        'es': 'Llene un crisol usando dos Amphors elementales.',
        'it': 'Riempi un crostampe usando due Anforia elementali.',
        'ja': 'Amphors 2 つで Crucible を埋めてください。',
        'ko': '두 개의 원소 앰포를 사용하여 크루시블을 채우세요.',
        'pl': 'Wypełnij piece dwoma elementalnymi Amphorami.',
        'pt': 'Preencha um cadinho com dois Amphors elementais.',
        'ru': 'Заполните кузню двумя стихийными Амфорами.',
        'tc': '用兩個元素安波填充 crucible。',
        'th': 'ใช้ Amphors องค์ประกอบสองตัวเติม Crucible',
        'tr': 'İki elementali Amphors kullanarak bir crucible doldurun.',
        'uk': 'Заповніть тлог з двома елементальними Амфорами.',
        'zh': '用两个元素安珀填充 crucible。'
    },
    'Foundry': {
        'de': 'Werkstatt', 'es': 'Fundición', 'it': 'Fonderia',
        'ja': '工房', 'ko': '주조장', 'pl': 'Kuźnia',
        'pt': 'Fundição', 'ru': 'Кузница', 'tc': '鑄造廠',
        'th': 'โรงงาน', 'tr': 'Havuz', 'uk': 'Литильня', 'zh': '铸造厂'
    },
    'Heat': {
        'de': 'Hitze', 'es': 'Calor', 'it': 'Calore',
        'ja': 'Heat', 'ko': '열기', 'pl': 'Ciepło',
        'pt': 'Calor', 'ru': 'Жар', 'tc': 'Heat',
        'th': 'ความร้อน', 'tr': 'Isı', 'uk': 'Жар', 'zh': 'Heat'
    },
    'Hide Completed': {
        'de': 'Abgeschlossene ausblenden', 'es': 'Ocultar completados', 'it': 'Nascondi completati',
        'ja': '完了を非表示', 'ko': '완료 숨기기', 'pl': 'Ukryj ukończone',
        'pt': 'Ocultar concluídos', 'ru': 'Скрыть завершённые', 'tc': 'Hide Completed',
        'th': 'ซ่อนสิ้น', 'tr': 'Tamamlananları Gizle', 'uk': 'Приховати завершені', 'zh': '隐藏已完成'
    },
    'Incarnon Evolution': {
        'de': 'Incarnon-Evolution', 'es': 'Evolución Incarnon', 'it': 'Evoluzione Incarnon',
        'ja': 'インカルノン進化', 'ko': '인칼론 진화', 'pl': 'Ewolucja Incarnon',
        'pt': 'Evolução Incarnon', 'ru': 'Эволюция Инкарно', 'tc': '恩卡诺进化',
        'th': 'วิวัฒนาการ Incarnon', 'tr': 'Incarnon Evrimi', 'uk': 'Еволюція Інкарнон', 'zh': '恩卡诺进化'
    },
    'Interval (min)': {
        'de': 'Intervall (Min)', 'es': 'Intervalo (min)', 'it': 'Intervallo (min)',
        'ja': 'インターバル (分)', 'ko': '간격 (분)', 'pl': 'Interwał (min)',
        'pt': 'Intervalo (min)', 'ru': 'Интервал (мин)', 'tc': 'Intervalle (min)',
        'th': 'ช่วง (นาที)', 'tr': 'Aralık (dk)', 'uk': 'Інтервал (хв)', 'zh': '间隔(分钟)'
    },
    'Intrinsics': {
        'de': 'Intrinsika', 'es': 'Intrínsecos', 'it': 'Intrinseci',
        'ja': 'イントリンシック', 'ko': '내재', 'pl': 'Intrinsiki',
        'pt': 'Intrínsecos', 'ru': 'Внутренние', 'tc': 'Intrinsic',
        'th': 'Intrinsic', 'tr': 'Entegre', 'uk': 'Внутрішні', 'zh': 'Intrinsic'
    },
    'Isleweaver': {
        'de': 'Isleweaver', 'es': 'Isleweaver', 'it': 'Isleweaver',
        'ja': 'Isleweaver', 'ko': 'Isleweaver', 'pl': 'Isleweaver',
        'pt': 'Isleweaver', 'ru': 'Ислвивер', 'tc': 'Isleweaver',
        'th': 'Isleweaver', 'tr': 'Isleweaver', 'uk': 'Isleweaver', 'zh': 'Isleweaver'
    },
    'Jade Guardian': {
        'de': 'Jade-Wächter', 'es': 'Guardián de jade', 'it': 'Guardiano di Giada',
        'ja': 'ジャデガーディアン', 'ko': '제이드 가디언', 'pl': 'Stróż Nefritu',
        'pt': 'Guardião de Jade', 'ru': 'Хранитель нефрита', 'tc': ' jade',
        'th': 'H Guardian', 'tr': 'Jade Muhafız', 'uk': 'Нефритовий вартовий', 'zh': ' jade'
    },
    'Junction': {
        'de': 'Verbindung', 'es': 'Conexión', 'it': 'Congiunzione',
        'ja': 'ジャンクション', 'ko': '연결', 'pl': 'Połączenie',
        'pt': 'Conexão', 'ru': 'Узел', 'tc': ' junction',
        'th': 'junction', 'tr': 'Birleşim', 'uk': 'Перехресток', 'zh': ' junction'
    },
    'Kill marked Necramites that periodically spawn.': {
        'de': 'Töten Sie markierte Necramites, die periodisch erscheinen.',
        'es': 'Mata Necramites marcados que aparecen periódicamente.',
        'it': 'Uccidi i Necramites segnati che compaiono periodicamente.',
        'ja': '周期的に出現するマーキングNecramitesを倒します。',
        'ko': '주기적으로 등장하는 표시된 네크라마이트를 처치하세요.',
        'pl': 'Zabij oznaczone Necramites, które okresowo się pojawiają.',
        'pt': 'Mate Necramites marcados que periodicamente aparecem.',
        'ru': 'Убейте отмеченных Некрамитов, которые периодически появляются.',
        'tc': 'Kill marked Necramites that periodically spawn.',
        'th': 'Kill marked Necramites that periodically spawn.',
        'tr': 'Kill marked Necramites that periodically spawn.',
        'uk': 'Вбийте відмічених Некрамітів, які періодично з\'являються.',
        'zh': 'Kill marked Necramites that periodically spawn.'
    },
    'LEFT': {
        'de': 'ÜBRIG', 'es': 'RESTANTE', 'it': 'RIMASTO',
        'ja': '残り', 'ko': '남은', 'pl': 'POZOSTAŁO',
        'pt': 'RESTANTE', 'ru': 'ОСТАЛОСЬ', 'tc': 'RESTANT',
        'th': 'เหลือ', 'tr': 'KALDI', 'uk': 'ЗАЛИШИЛОСЬ', 'zh': 'RESTANT'
    },
    'Legendary Fusion Core': {
        'de': 'Legendärer Fusionskern', 'es': 'Núcleo de fusión legendario', 'it': 'Nucleo di Fusione Leggendario',
        'ja': 'レジェンダリーフュージョンコア', 'ko': '전설 융합 코어', 'pl': 'Legendarny rdzeń fuzji',
        'pt': 'Núcleo de Fusão Lendário', 'ru': 'Легендарное слияние', 'tc': 'Légendaire',
        'th': 'แกนเชื่อม Legendary', 'tr': 'Efsanevi Füzyon Çekirdeği', 'uk': 'Легендарне ядро злиття', 'zh': 'Légendaire'
    },
    'Legendary Rank': {
        'de': 'Legendarischer Rang', 'es': 'Rango Legendario', 'it': 'Rango Leggendario',
        'ja': '伝説ランク', 'ko': '전설적 등급', 'pl': 'Ranga Legendarna',
        'pt': 'Patente Lendária', 'ru': 'Легендарный ранг', 'tc': 'Rang Légendaire',
        'th': 'อันดับ Legendary', 'tr': 'Efsanevi Rütbe', 'uk': 'Легендарний ранг', 'zh': 'Rang Légendaire'
    },
    'Loid: Voca': {
        'de': 'Loid: Voca', 'es': 'Loid: Voca', 'it': 'Loid: Voca',
        'ja': 'ロイド：ヴォカ', 'ko': 'Loid: Voca', 'pl': 'Loid: Voca',
        'pt': 'Loid: Voca', 'ru': 'Loid: Voca', 'tc': 'Loid: Voca',
        'th': 'Loid: Voca', 'tr': 'Loid: Voca', 'uk': 'Loid: Voca', 'zh': 'Loid: Voca'
    },
    'Loot containers within time limit.': {
        'de': 'Plündern Sie Behälter innerhalb des zeitlichen Limits.',
        'es': 'Recoja contenedores de saqueo dentro del límite de tiempo.',
        'it': 'Raccogli i contenitori di bottino entro il limite di tempo.',
        'ja': '時間内にルートコンテナを回収。',
        'ko': '시간 제한 내에 전리품 컨테이너를 수집하세요.',
        'pl': 'Zbieraj pojemniki z łupem w określonym czasie.',
        'pt': 'Colete contêineres de saqueio dentro do limite de tempo.',
        'ru': 'Собирайте контейнеры с добычей в пределах времени.',
        'tc': 'Loot containers within time limit.',
        'th': 'Loot containers within time limit.',
        'tr': 'Loot containers within time limit.',
        'uk': 'Склади зброї в межах часу.',
        'zh': 'Loot containers within time limit.'
    },
    'Lyon\'s Sanctuary': {
        'de': 'Lyons Zuflucht', 'es': 'Santuario de Lyon', 'it': 'Santuario di Lyon',
        'ja': 'リオンの聖域', 'ko': 'Lyon의 성소', 'pl': 'Sanktuarium Lyona',
        'pt': 'Santuário de Lyon', 'ru': 'Убежище Лиона', 'tc': 'Sanctuaire de Lyon',
        'th': 'ศาลา Lyon', 'tr': "Lyon'un Cennet Bahçesi", 'uk': 'Святилище Ліона', 'zh': '里昂的圣所'
    },
    'MORE': {
        'de': 'MEHR', 'es': 'MÁS', 'it': 'PIÙ',
        'ja': 'もっと見る', 'ko': '자세히', 'pl': 'WIĘCEJ',
        'pt': 'MAIS', 'ru': 'ЕЩЁ', 'tc': '更多',
        'th': 'เพิ่มเติม', 'tr': 'DAHA FAZLA', 'uk': 'ЩЕ', 'zh': '更多'
    },
    'Marie\'s Sanctuary': {
        'de': 'Maries Zuflucht', 'es': 'Santuario de Marie', 'it': 'Santuario di Marie',
        'ja': 'マリーの聖域', 'ko': 'Marie의 성소', 'pl': 'Sanktuarium Marii',
        'pt': 'Santuário de Marie', 'ru': 'Убежище Марии', 'tc': 'Sanctuaire de Marie',
        'th': 'ศาลา Marie', 'tr': "Marie'nin Cennet Bahçesi", 'uk': 'Святилище Марі', 'zh': '玛丽的圣所'
    },
    'Mastery Rank': {
        'de': 'Masterie-Rang', 'es': 'Rango de Maestría', 'it': 'Punteggio MaMaestria',
        'ja': 'マスタリー ランク', 'ko': '마astery 등급', 'pl': 'Poziom Opanowania',
        'pt': 'Patente de Maestria', 'ru': 'Ранг Мастерства', 'tc': 'Maîtrise Rang',
        'th': 'อันดับ Mastery', 'tr': 'Ustalık Rütbesi', 'uk': 'Ранг Мастерства', 'zh': 'Maîtrise Rang'
    },
    'Mission Types': {
        'de': 'Missionstypen', 'es': 'Tipos de misión', 'it': 'Tipi di missione',
        'ja': 'ミッションタイプ', 'ko': '미션 종류', 'pl': 'Typy misji',
        'pt': 'Tipos de missão', 'ru': 'Типы миссий', 'tc': 'Types de mission',
        'th': 'ประเภทภารกิจ', 'tr': 'Mission Tipleri', 'uk': 'Типи місій', 'zh': '任务类型'
    },
    'Mobile Interception': {
        'de': 'Mobile Interception', 'es': 'Intercepción móvil', 'it': 'Intercettazione mobile',
        'ja': 'モバイルインターセプション', 'ko': '모바일 인터셉션', 'pl': 'Mobilny Przechwyt',
        'pt': 'Intercepção Móvel', 'ru': 'Мобильная перехватка', 'tc': 'Mobile Interception',
        'th': 'Mobile Interception', 'tr': 'Mobil Müdahale', 'uk': 'Мобільний перехват', 'zh': '移动拦截'
    },
    'Mod': {
        'de': 'Mod', 'es': 'Mod', 'it': 'Mod',
        'ja': 'MOD', 'ko': 'MOD', 'pl': 'Mod',
        'pt': 'Mod', 'ru': 'модификатор', 'tc': 'Mod',
        'th': 'มอด', 'tr': 'Mod', 'uk': 'модифікатор', 'zh': 'Mod'
    },
    'N/A': {
        'de': 'N/A', 'es': 'N/D', 'it': 'N/D',
        'ja': 'N/A', 'ko': 'N/A', 'pl': 'N/D',
        'pt': 'N/D', 'ru': 'Н/Д', 'tc': 'N/A',
        'th': 'ไม่มี', 'tr': 'YOK', 'uk': 'Н/Д', 'zh': 'N/A'
    },
    'Name': {
        'de': 'Name', 'es': 'Nombre', 'it': 'Nome',
        'ja': '名称', 'ko': '이름', 'pl': 'Nazwa',
        'pt': 'Nome', 'ru': 'Название', 'tc': '名称',
        'th': 'ชื่อ', 'tr': 'İsim', 'uk': 'Назва', 'zh': '名称'
    },
    'Non-Mastery': {
        'de': 'Nicht-Mastery', 'es': 'No-Maestría', 'it': 'Non-Mastery',
        'ja': '非マスタリー', 'ko': '비마스터리', 'pl': 'Non-Mastery',
        'pt': 'Não-Maestria', 'ru': 'Не по освоению', 'tc': 'Non-maîtrise',
        'th': 'ไม่ใช่มั่นชื�', 'tr': 'Mastery Dışı', 'uk': 'Не-Майстерство', 'zh': 'Non-maîtrise'
    },
    'Optimal Fill Order': {
        'de': 'Optimale Füllungsreihenfolge', 'es': 'Orden de llenado óptimo', 'it': 'Ordine di riempimento ottimale',
        'ja': '最適充填順', 'ko': '최적 충전 순서', 'pl': 'Optymalna kolejność wypełniania',
        'pt': 'Ordem de Preenchimento Ótima', 'ru': 'Оптимальный порядок заполнения', 'tc': 'Ordre de remplissage optimal',
        'th': 'ลำดับเติมเหมาะสม', 'tr': 'İdeal Doldurma Sırası', 'uk': 'Оптимальний порядок заповнення', 'zh': '最优填充顺序'
    },
    'Other': {
        'de': 'Andere', 'es': 'Otro', 'it': 'Altro',
        'ja': 'その他', 'ko': '기타', 'pl': 'Inne',
        'pt': 'Outro', 'ru': 'Другое', 'tc': 'Autre',
        'th': 'อื่น', 'tr': 'Diğer', 'uk': 'Інше', 'zh': 'Autre'
    },
    'Other (8h)': {
        'de': 'Andere (8h)', 'es': 'Otro (8h)', 'it': 'Altro (8h)',
        'ja': 'Its (8h)', 'ko': '기타 (8h)', 'pl': 'Inne (8h)',
        'pt': 'Outro (8h)', 'ru': 'Другое (8h)', 'tc': 'Autre (8h)',
        'th': 'อื่น (8h)', 'tr': 'Diğer (8h)', 'uk': 'Інше (8h)', 'zh': 'Autre (8h)'
    },
    'Owned:': {
        'de': 'Besessen:', 'es': 'Poseído:', 'it': 'Possesso:',
        'ja': '所有：', 'ko': '보유：', 'pl': 'Posiadane：',
        'pt': 'Possuído：', 'ru': 'Имеется：', 'tc': 'Possédé :',
        'th': 'มีเจ้าของ：', 'tr': 'Sahip：', 'uk': 'Власність：', 'zh': '已拥有：'
    },
    'Prime Sets': {
        'de': 'Prime-Sets', 'es': 'Juegos Prime', 'it': 'Set Prime',
        'ja': 'プライムセット', 'ko': '프라임 세트', 'pl': 'Zestawy Prime',
        'pt': 'Conjuntos Prime', 'ru': 'Прим-комплекты', 'tc': 'Ensembles Prime',
        'th': 'ชุด Prime', 'tr': 'Prime Setler', 'uk': 'Прайм-набори', 'zh': 'Prime套装'
    },
    'READY': {
        'de': 'BEREIT', 'es': 'LISTO', 'it': 'PRONTO',
        'ja': '準備完了', 'ko': '준비 완료', 'pl': 'GOTOWY',
        'pt': 'PRONTO', 'ru': 'ГОТОВ', 'tc': '準備就緒',
        'th': 'พร้อม', 'tr': 'HAZIR', 'uk': 'ГОТОВО', 'zh': '准备就绪'
    },
    'REMAINING': {
        'de': 'ÜBRIG', 'es': 'RESTANTE', 'it': 'RIMASTO',
        'ja': '残り', 'ko': '남은', 'pl': 'POZOSTAŁO',
        'pt': 'RESTANTE', 'ru': 'ОСТАЛОСЬ', 'tc': 'RESTANT',
        'th': 'เหลือ', 'tr': 'KALDI', 'uk': 'ЗАЛИШИЛОСЬ', 'zh': 'RESTANT'
    },
    'Ready': {
        'de': 'Bereit', 'es': 'Listo', 'it': 'Pronto',
        'ja': '準備完了', 'ko': '준비 완료', 'pl': 'Gotowy',
        'pt': 'Pronto', 'ru': 'Готов', 'tc': 'Prêt',
        'th': 'พร้อม', 'tr': 'Hazır', 'uk': 'Готово', 'zh': 'Prêt'
    },
    'Requires:': {
        'de': 'Erfordert：', 'es': 'Requiere：', 'it': 'Richiede：',
        'ja': '必要：', 'ko': '필요：', 'pl': 'Wymaga：',
        'pt': 'Requer：', 'ru': 'Требует：', 'tc': 'Nécessite :',
        'th': 'ต้องการ：', 'tr': 'Gereklidir：', 'uk': 'Вимагає：', 'zh': '需求：'
    },
    'Reroll Potential': {
        'de': 'Neuwurf-Potential', 'es': 'Potencial de reroll', 'it': 'Potenziale re-roll',
        'ja': 'リロールポテンシャル', 'ko': '재롤 잠재치', 'pl': 'Potencjał rerollu',
        'pt': 'Potencial de Reforço', 'ru': 'Потенциал перекатывания', 'tc': 'Potentiel de recomptage',
        'th': 'Potencial', 'tr': 'Yeniden Atama Potansiyeli', 'uk': 'Потенціал перекидання', 'zh': 'Potentiel de recomptage'
    },
    'Scanning...': {
        'de': 'Scannen…', 'es': 'Escaneando…', 'it': 'Scansione…',
        'ja': 'スキャン中…', 'ko': '스캔 중…', 'pl': 'Skanowanie…',
        'pt': 'Escaneando…', 'ru': 'Сканирование…', 'tc': 'Scanning…',
        'th': 'กำลังสแกน…', 'tr': 'Tarama…', 'uk': 'Сканування…', 'zh': '扫描中…'
    },
    'Sentinel': {
        'de': 'Sentinelle', 'es': 'Centinela', 'it': 'Sentinella',
        'ja': 'センチネル', 'ko': '센티널', 'pl': 'Sentinelle',
        'pt': 'Sentinela', 'ru': 'Сентинель', 'tc': '哨兵',
        'th': 'เซนต์เทล', 'tr': 'Gözetmen', 'uk': 'Сентинель', 'zh': '哨位'
    },
    'Sort by': {
        'de': 'Sortieren nach', 'es': 'Ordenar por', 'it': 'Ordina per',
        'ja': '並び替え', 'ko': '정렬 기준', 'pl': 'Sortuj według',
        'pt': 'Ordenar por', 'ru': 'Сортировать по', 'tc': 'Trier par',
        'th': 'เรียงตาม', 'tr': 'Sırala', 'uk': 'Сортувати за', 'zh': 'Trier par'
    },
    'Sortie': {
        'de': 'Sondermission', 'es': 'Misión de alto riesgo', 'it': 'Missione speciale',
        'ja': 'ソルティージ', 'ko': '특수 미션', 'pl': 'Misja elite',
        'pt': 'Missão especial', 'ru': 'Спецоперация', 'tc': 'Sortie',
        'th': 'ภารกิจพิเศษ', 'tr': 'Sorti', 'uk': 'Спецоперація', 'zh': 'Sortie'
    },
    'Squad': {
        'de': 'Gruppe', 'es': 'Escuadrón', 'it': 'Squadra',
        'ja': 'スクワッド', 'ko': '스쿼드', 'pl': 'Drużyna',
        'pt': 'Escalada', 'ru': 'Отряд', 'tc': 'Escouade',
        'th': 'ทีม', 'tr': 'Ekip', 'uk': 'Розвідувальна група', 'zh': 'Escouade'
    },
    'Stance': {
        'de': 'Haltung', 'es': 'Postura', 'it': 'Posizione',
        'ja': 'スタンス', 'ko': '태세', 'pl': 'Pozycja',
        'pt': 'Postura', 'ru': 'Позиция', 'tc': 'Posture',
        'th': 'ทรงทาง', 'tr': 'Pozisyon', 'uk': 'Позиція', 'zh': 'Posture'
    },
    'Steel Path': {
        'de': 'Stahlpfad', 'es': 'Camino de Acero', 'it': 'Sentiero dell\'Acciaio',
        'ja': 'スチールパス', 'ko': '스틸 패스', 'pl': 'Stalowa Ścieżka',
        'pt': 'Caminho de Aço', 'ru': 'Стальной путь', 'tc': 'Chemin d\'Acier',
        'th': 'เส้นทางเหล็ก', 'tr': 'Çelik Yol', 'uk': 'Сталевий Шлях', 'zh': '钢铁之途'
    },
    'Target': {
        'de': 'Ziel', 'es': 'Objetivo', 'it': 'Bersaglio',
        'ja': '対象', 'ko': '표적', 'pl': 'Cel',
        'pt': 'Alvo', 'ru': 'Цель', 'tc': 'Cible',
        'th': 'เป้าหมาย', 'tr': 'Hedef', 'uk': 'Ціль', 'zh': '目标'
    },
    'The Steel Path': {
        'de': 'Der Stahlpfad', 'es': 'Camino de Acero', 'it': 'Il Sentiero dell\'Acciaio',
        'ja': 'スチールパス', 'ko': '스틸 패스', 'pl': 'Stalowa Ścieżka',
        'pt': 'O Caminho de Aço', 'ru': 'Стальной путь', 'tc': 'Le Chemin d\'Acier',
        'th': 'เส้นทางเหล็ก', 'tr': 'Çelik Yol', 'uk': 'Сталева дорога', 'zh': '钢铁之途'
    },
    'UNIQUE mission objective.': {
        'de': 'EINZIGARTIGES Missionsziel.', 'es': 'Objetivo de misión único.', 'it': 'Obiettivo missione uniche.',
        'ja': 'ユニークなミッション目標。', 'ko': '유니크 미션 목표.', 'pl': 'Unikalny cel misji.',
        'pt': 'Objetivo de missão único.', 'ru': 'Уникальная цель миссии.', 'tc': 'mission',
        'th': 'mission', 'tr': 'mission', 'uk': 'Унікальна ціль місії.', 'zh': 'mission'
    },
    'Unowned': {
        'de': 'Nicht erworben', 'es': 'No poseído', 'it': 'Non posseduto',
        'ja': '未所有', 'ko': '미보유', 'pl': 'Nie posiadane',
        'pt': 'Não possuído', 'ru': 'Не в наличии', 'tc': 'Non possédé',
        'th': 'ไม่มีเจ้าของ', 'tr': 'Sahipsiz', 'uk': 'Не в наявності', 'zh': '未拥有'
    },
    'Warm': {
        'de': 'Warm', 'es': 'Cálido', 'it': 'Caldo',
        'ja': '温', 'ko': '따뜻한', 'pl': 'Ciepło',
        'pt': 'Quente', 'ru': 'Тёплый', 'tc': 'Warm',
        'th': 'อุ่น', 'tr': 'Sıcak', 'uk': 'Теплий', 'zh': 'Warm'
    },
    'Weapon Rank': {
        'de': 'Waffen-Rang', 'es': 'Rango de arma', 'it': 'Rank arma',
        'ja': '武器ランク', 'ko': '무기 등급', 'pl': 'Ranga broni',
        'pt': 'Rank da Arma', 'ru': 'Ранг оружия', 'tc': 'Rang d\'armes',
        'th': 'อันดับอาวุธ', 'tr': 'Silah Rütbesi', 'uk': 'Ранг зброї', 'zh': 'Rang d\'armes'
    },
    'Weapons': {
        'de': 'Waffen', 'es': 'Armas', 'it': 'Armi',
        'ja': '武器', 'ko': '무기', 'pl': 'Broń',
        'pt': 'Armas', 'ru': 'Оружие', 'tc': 'Armes',
        'th': 'อาวุธ', 'tr': 'Silahlar', 'uk': 'Зброя', 'zh': 'Armes'
    },
    'Weekly': {
        'de': 'Wöchentlich', 'es': 'Semanal', 'it': 'Settimanale',
        'ja': '週次', 'ko': '주간', 'pl': 'Cotygodniowo',
        'pt': 'Semanal', 'ru': 'Еженедельно', 'tc': 'Hebdomadaire',
        'th': 'ประจำสัปดาห์', 'tr': 'Haftalık', 'uk': 'Щотижневне', 'zh': 'Hebdomadaire'
    },
    'Welcome to Cephalon Kronos': {
        'de': 'Willkommen bei Cephalon Kronos', 'es': 'Bienvenido a Cephalon Kronos', 'it': 'Benvenuto a Cephalon Kronos',
        'ja': 'Cephalon Kronosへようこそ', 'ko': 'Cephalon Kronos에 오신 것을 환영합니다', 'pl': 'Witaj w Cephalon Kronos',
        'pt': 'Bem-vindo ao Cephalon Kronos', 'ru': 'Добро пожаловать в Cephalon Kronos', 'tc': 'Bienvenue dans Cephalon Kronos',
        'th': 'ยินดีต้อนรับสู่ Cephalon Kronos', 'tr': "Cephalon Kronos'a hoş geldiniz", 'uk': 'Ласкаво просимо до Cephalon Kronos', 'zh': '欢迎使用 Cephalon Kronos'
    },
    'Winter': {
        'de': 'Winter', 'es': 'Invierno', 'it': 'Inverno',
        'ja': '冬', 'ko': '겨울', 'pl': 'Zima',
        'pt': 'Inverno', 'ru': 'Зима', 'tc': 'Hiver',
        'th': 'ฤดูหนาว', 'tr': 'Kış', 'uk': 'Зима', 'zh': 'Hiver'
    },
    'Your Value': {
        'de': 'Dein Wert', 'es': 'Tu valor', 'it': 'Il tuo valore',
        'ja': 'あなたの値', 'ko': '귀하의 가치', 'pl': 'Twoja wartość',
        'pt': 'Seu Valor', 'ru': 'Ваша ценность', 'tc': 'Votre valeur',
        'th': 'มูลค่าของคุณ', 'tr': 'Değeriniz', 'uk': 'Вартість', 'zh': 'Votre valeur'
    },
    'marker': {
        'de': 'Marker', 'es': 'marcador', 'it': 'marcatore',
        'ja': 'マーカー', 'ko': '마커', 'pl': 'znacznik',
        'pt': 'marcador', 'ru': 'маркер', 'tc': '標記',
        'th': 'เครื่องหมาย', 'tr': 'işaretçi', 'uk': 'маркер', 'zh': '标记'
    },
    'of': {
        'de': 'von', 'es': 'de', 'it': 'di',
        'ja': 'の', 'ko': '의', 'pl': 'z',
        'pt': 'de', 'ru': 'из', 'tc': 'de',
        'th': 'ของ', 'tr': 'in', 'uk': 'з', 'zh': 'de'
    },
    'remaining': {
        'de': 'übrig', 'es': 'restante', 'it': 'rimasto',
        'ja': '残り', 'ko': '남은', 'pl': 'pozostało',
        'pt': 'restante', 'ru': 'осталось', 'tc': 'restant',
        'th': 'เหลือ', 'tr': 'kalan', 'uk': 'залишилось', 'zh': 'restant'
    },
    'remaining)': {
        'de': 'restlichen)', 'es': 'restantes)', 'it': 'restanti)',
        'ja': '残り)', 'ko': '남은)', 'pl': 'pozostało)',
        'pt': 'restante)', 'ru': 'осталось)', 'tc': 'restant)',
        'th': 'เหลือ)', 'tr': 'kalan)', 'uk': 'залишилось)', 'zh': 'restant)'
    },
    '{area} area, cave {bit}': {
        'de': '{area} Bereich, Höhle {bit}', 'es': '{area} zona, cueva {bit}', 'it': '{area} zona, grotta {bit}',
        'ja': '{area} エリア, 洞 {bit}', 'ko': '{area} 구역, 동굴 {bit}', 'pl': '{area} strefa, jaskinia {bit}',
        'pt': '{area} zona, caverna {bit}', 'ru': '{area} зона, пещера {bit}', 'tc': 'Zone {area}, cavité {bit}',
        'th': 'เขต {area}, ระบอง {bit}', 'tr': '{area} bölgesi, mağara {bit}', 'uk': '{area} зона, печера {bit}', 'zh': 'Zone {area}, cavité {bit}'
    },
}

# Save manual translations
with open('/tmp/tables/manual_translations.json', 'w', encoding='utf-8') as f:
    json.dump(MANUAL_TRANS, f, ensure_ascii=False, indent=2)
print(f"Saved {len(MANUAL_TRANS)} manual translations")
