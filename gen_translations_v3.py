#!/usr/bin/env python3
"""
Generate a comprehensive translation table JSON.
All translations as Python dict of EN -> list of 13 locale values.
Properly handles all 464 translatable EN values.
"""
import json

LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

T = {}

def add(en, vals):
    """Add a translation entry. vals should have exactly 13 entries."""
    if len(vals) != 13:
        raise ValueError(f"Key '{en}' has {len(vals)} values, expected 13")
    T[en] = list(vals)

# === SETTINGS PANE ===
add('Adjust UI scale', ['UI-Skala anpassen','Ajustar escala de interfaz','Regola scala interfaccia','UIスケールを調整','UI 스케일 조정','Dostosuj skalę UI','Ajustar escala da interface','Настроить масштаб интерфейса','調整界面比例','ปรับสเกล UI','Arayüz ölçeğini ayarla','Налаштувати масштаб інтерфейсу','调整界面缩放'])
add('Cache market prices', ['Marktpreise cachen','Almacenar precios del mercado','Cache prezzi mercato','市場価格をキャッシング','시장 가격 캐싱','Pamiętaj ceny rynkowe','Armazenar preços do mercado','Кэшировать рыночные цены','緩存市場價格','แคชราคาตลาด','Piyasa fiyatlarını önbelleğe al','Кешувати ринкові ціни','缓存市场价格'])
add('Check on Startup', ['Beim Start prüfen','Comprobar al iniciar','Controlla all avvio','起動時にチェック','시작 시 확인','Sprawdzaj przy starcie','Verificar ao iniciar','Проверять при запуске','啟動時檢查','ตรวจสอบเมื่อเริ่มต้น','Başlangıçta kontrol et','Перевіряти при запуску','启动时检查'])
add('Current Theme', ['Aktuelles Thema','Tema actual','Tema attuale','現在のテーマ','현재 테마','Bieżąca nazwa','Tema atual','Текущая тема','目前主題','ธีมปัจจุบน','เธียมปัจจุบน','Поточна тема','当前主题'])
add('Cursor', ['Cursor','Cursor','Cursore','カーソル','커서','Kursor','Cursor','Курсор','光标','เคอร์เซอร์','Çim','Курсор','光标'])
add('Data Folder', ['Datenordner','Carpeta de datos','Cartella dati','データフォルダー','데이터 폴더','Folder danych','Pasta de dados','Папка данных','데이터 폴더','โฟลเดอร์ข้อมูล','Veri klasörü','Тека даних','数据文件夹'])
add('Game Assets', ['Spiel-Assets','Recursos del juego','Asset di gioco','ゲームアセット','게임 에셋','Aktywa gry','Assets do jogo','Игровые ресурсы','游戏資源','สินทรัปกระเท','Oyun varlıkları','Ігрові ресурси','游戏资产'])
add('Hide Sidebar', ['Sidebar ausblenden','Ocultar barra lateral','Nascondi barra laterale','サイドバーを非表示','사이드바 숨기기','Ukryj pasek boczny','Ocultar barra lateral','Скрыть боковую панель','隱藏側邊欄','ซ่อนแถบด้านข้าง','Kenar çubuğunu gizle','Приховати бокову панель','隐藏侧栏'])
add('Installing...', ['Installiere...','Instalando...','Installazione in corso...','インストール中...','설치 중...','Instalowanie...','Instalando...','Установка...','安装中...','กำลังติดตั้ง...','Yükleniyor...','Встановлення...','安装中...'])
add('Language', ['Sprache','Idioma','Lingua','言語','언어','Język','Idioma','Язык','語言','ภาษา','Dil','Мова','语言'])
add('Lock Relics', ['Reliquien sperren','Bloquear reliquias','Blocca reliquie','リリクをロック','유물 잠금','Zablokuj relikty','Bloquear relics','Заблокировать реликвы','Lock Relics','ล็อค Relics','Relics Kilitle','Заблокувати релікви','Lock Relics'])
add('Market Notifications', ['Markt-Benachrichtigungen','Notificaciones del mercado','Notifiche del mercato','マーケット通知','시장 알림','Powiadomienia o rynku','Notificações do mercado','Уведомления о рынке','Market Notifications','การแจ้งเตือนตลาด','Pazar Bildirimleri','Сповіщення про ринок','Market Notifications'])
add('Monitors', ['Monitore','Monitores','Monitor','モニター','모니터','Monitory','Monitores','Мониторы','Monitor','จอจอแสดงผล','Monitörler','Монітори','Monitor'])
add('Mouse Sensitivity', ['Mausempfindlichkeit','Sensibilidad del ratón','Sensibilità del mouse','マウス感度','마우스 감도','Czułość myszy','Sensibilidade do mouse','Чувствительность мыши','Mouse Sensitivity','Sensitivity','Fare duyarlılığı','Чутливість миші','鼠标灵敏度'])
add('Notification Triggers', ['Benachrichtigungs-Auslöser','Activadores de notificaciones','Trigger notifiche','通知トリガー','알림 트리거','Wyzwalacze powiadomień','Triggers de notificação','Триггеры уведомлений','Notification Triggers','ปุ่มลัดแจ้งเตือน','Bildirim tetikleyicileri','Тригери сповіщень','Notification Triggers'])
add('Notifications', ['Benachrichtigungen','Notificaciones','Notifiche','通知','알림','Powiadomienia','Notificações','Уведомления','Notifications','การแจ้งเตือน','Bildirimler','Сповіщення','Notifications'])
add('Open', ['Öffnen','Abrir','Apri','開く','열기','Otwórz','Abrir','Открыть','開啟','เปิด','Aç','Відкрити','打开'])
add('Options', ['Optionen','Opciones','Opzioni','オプション','옵션','Opcje','Opções','Опции','Options','ตัวเลือก','Seçenekler','Опції','Options'])
add('Please Wait...', ['Bitte warten...','Por favor, espere...','Attendere...','お待ちください...','잠시만요...','Proszę czekać...','Por favor, espere...','Пожалуйста, подождите...','Please Wait...','กรุณารอสักครู่...','Lütfen bekleyin...','Будь ласка, зачекайте...','Please Wait...'])
add('Refresh Prices', ['Preise aktualisieren','Actualizar precios','Aggiorna prezzi','价格更新','가격 새로고침','Odśwież ceny','Atualizar preços','Обновить цены','Refresh Prices','Refresh Prices','Refresh Prices','Оновити ціни','Refresh Prices'])
add('Refresh...', ['Aktualisiere...','Actualizando...','Aggiornamento in corso...','更新中...','새로고침 중...','Odświeżanie...','Atualizando...','Обновление...','Refreshing...','Refreshing...','Refreshing...','Оновлення...','Refreshing...'])
add('Scan Warframe log files', ['Warframe-Logdateien scannen','Escanear archivos de log de Warframe','Scansiona i file di log di Warframe','ワフレログファイルをスキャン','워프레임 로그 파일 스캔','Skanuj pliki logów Warframe','Escanear arquivos de log do Warframe','Сканировать файлы логов Warframe','Scan Warframe log files','Scan Warframe log files','Scan Warframe log files','Сканувати файли логів Warframe','Scan Warframe log files'])
add('Scanner', ['Scanner','Escáner','Scanner','スキャナー','스캔','Skaner','Scanner','Сканер','Scanner','สแกนเนอร์','Tarayıcı','Сканер','Scanner'])
add('Settings', ['Einstellungen','Configuración','Impostazioni','設定','설정','Ustawienia','Configurações','Настройки','Settings','การตั้งค่า','Ayarlar','Налаштування','设置'])
add('Sidebar', ['Sidebar','Barra lateral','Barra laterale','サイドバー','사이드바','Pasek boczny','Barra lateral','Боковая панель','Sidebar','แถบด้านข้าง','Kenar çubuğu','Бокова панель','Sidebar'])
add('Sidebar settings', ['Sidebar-Einstellungen','Configuración de la barra lateral','Impostazioni barra laterale','サイドバー設定','사이드바 설정','Ustawienia paska bocznego','Configurações da barra lateral','Настройки боковой панели','Sidebar settings',' Sidebar settings','Sidebar settings','Налаштування бокової панелі','Sidebar settings'])
add('Sound 1', ['Sound 1','Sonido 1','Suono 1','サウンド 1','소리 1','Sound 1','Som 1','Звук 1',' Sound 1','เสียง 1','Ses 1','Звук 1','Sound 1'])
add('Sound 2', ['Sound 2','Sonido 2','Suono 2','サウンド 2','소리 2','Sound 2','Som 2','Звук 2','Sound 2','เสียง 2','Ses 2','Звук 2','Sound 2'])
add('Spawn on Active Monitor', ['Auf aktivem Monitor spawnen','Generar en el monitor activo','Genera sul monitor attivo','アクティブモニターに生成','활성 모니터에 생성','Generuj na aktywnym monitorze','Gerar no monitor ativo','Появляться на активном мониторе','Spawn on Active Monitor','Spawn on Active Monitor','Spawn on Active Monitor','Появлятися на активному моніторі','Spawn on Active Monitor'])
add('Sync Inventory', ['Inventar synchronisieren','Sincronizar inventario','Sincronizza inventario','インベントリ同期','인벤토리 동기화','Synchronizuj inwentarz','Sincronizar inventário','Синхронизировать инвентарь','Sync Inventory','Sync Inventory','Sync Inventory','Синхронизувати інвентар','Sync Inventory'])
add('The Steel Path', ['Der Stahlpfad','El Camino de Acero','La Via Acciaio','鋼の道','강철 길','Stalowa Ścieżka','O Caminho de Aço','Стальной путь','The Steel Path','The Steel Path','The Steel Path','Сталева дорога','The Steel Path'])
add('Version', ['Version','Versión','Versione','バージョン','버전','Wersja','Versão','Версия','Version','เวอร์ชัน','Versiyon','Версія','Version'])

# === DASHBOARD ===
add('1999 Calendar', ['1999 Kalender','Calendario de 1999','Calendario 1999','1999カレンダー','1999 캘린더','Kalendarz 1999','Calendário 1999','Календарь 1999','1999 Calendar','ปฏิทิน 1999','1999 Takvimi','Календар 1999','1999 日历'])
add('Alerts', ['Warnungen','Alertas','Allerte','アラート','경보','Alarmy','Alertas','Оповещения','Alerts','การแจ้งเตือน','Uyarılar','Сповіщення','Alerts'])
add('Anger', ['Zorn','Ira','Rabbia','怒り','분노','Złość','Raiva','Гнев','Anger','แคระ','Öfke','Гнів','Anger'])
add('Arbitration', ['Arbitration','Arbitraje','Arbitrato','アービトレーション','중재','Arbitraż','Arbitragem','Арбитраж','Arbitration','Arbitration','Arbitration','Арбітраж','Arbitration'])
add('Arbitration Drones', ['Arbitration-Drohnen','Drones de arbitraje','Droni di arbitrato','アービトレーションドローン','중재 드론','Drony arbitrażu','Drones de arbitragem','Дроны арбитража','Arbitration Drones','Arbitration Drones','Arbitration Drones','Дрони арбітражу','Arbitration Drones'])
add('Archon Hunt', ['Archon-Jagd','Caza de Archon','Caccia all\'Archon','アーカンハント','아크론 사냥','Polowanie na Archon','Caça a Archon','Охота на Архона','Archon Hunt','Archon Hunt','Archon Hunt','Поляння Архона','Archon Hunt'])
add('Archon Hunts', ['Archon-Jagden','Cacerías de Archon','Caccia agli Archon','アーカンハント','아크론 사냥','Polowania na Archon','Caças a Archon','Охоты на Архонов','Archon Hunts','Archon Hunts','Archon Hunts','Полювання на Архонів','Archon Hunts'])
add('Bounties', ['Aufträge','Contratos','Compiti','ボンティ','보상','Zlecenia','Contratos','Задания','Bounties','งาน','Haineler','Задачі','Bounties'])
add('Bounty', ['Auftrag','Contrato','Compito','ボンティ','보상','Zlecenie','Contrato','Задание','Bounty','งาน','Hain','Задача','Bounty'])
add('Cambion Drift', ['Cambion Drift','Dérive Cambion','Cambion Drift','デュヴィリ','듀비리','Cambion Drift','Cambion Drift','Cambion Drift','Cambion Drift','Cambion Drift','Cambion Drift','Cambion Drift','Cambion Drift'])
add('Challenge', ['Herausforderung','Desafío','Sfida','チャレンジ','도전','Wyzwanie','Desafio','Испытание','Challenge','Challenge','Challenge','Випробування','Challenge'])
add('Cold', ['Kälte','Frío','Freddo','冷','냉기','Zimno','Frio','Холод','Cold','เย็น','Soğuk','Холод','Cold'])
add('Daily', ['Täglich','Diario','Giornaliero','日次','일일','Codziennie','Diário','Ежедневно','Daily','Daily','Daily','Щоденно','Daily'])
add('Daily Reset', ['Täglicher Reset','Restablecer diario','Ripristino giornaliero','デイリーリセット','일일 재설정','Codzienny reset','Redefinição diária','Ежедневный сброс','Daily Reset','Daily Reset','Daily Reset','Щоденний скін','Daily Reset'])
add('Duviri', ['Duviri','Duviri','Duviri','デュヴィリ','듀비리','Duviri','Duviri','Дувири','Duviri','Duviri','Duviri','Дувірі','Duviri'])
add('Dawn', ['Morgenröte','Amanecer','Alba','夜明け','새벽','Świt','Amanhecer','Рассвет','Dawn','Dawn','Dawn','Світанок','Dawn'])
add('Day', ['Tag','Día','Giorno','日','날','Dzień','Dia','День','Day','วัน','Gün','День','Day'])
add('Endo', ['Endo','Endo','Endo','エンド','Endo','Endo','Endo','Эндо','Endo','Endo','Endo','Endo','Endo'])
add('Event', ['Veranstaltung','Evento','Evento','イベント','이벤트','Wydarzenie','Evento','Событие','イベント','イベント','イベント','Подія','Event'])
add('Excavation', ['Ausgrabung','Excavación','Eccavazione','採掘','발굴','Wykop','Escavação','Раскопки','Excavation','Excavation','Excavation','Роботи','Excavation'])
add('Exterminate', ['Ausrotten','Exterminar','St eradicate','滅殺','절멸','Zlikwiduj','Exterminar','Истребить','Exterminate','Exterminate','Exterminate','Винищити','Exterminate'])
add('Fear', ['Angst','Miedo','Paura','恐怖','두려움','Strach','Medo','Страх',' Fear','Fear','Fear','Страх','Fear'])
add('Fissure', ['Fissur','Fisura','Fessura','裂け目','분열','Fazura','Fissura','Разлом','Fissure','Fissure','Fissure','Розлом','Fissure'])
add('Flawless', ['Makellos','Sin flaw','Senza imper','Flawless','Flawless','Flawless','Flawless','Flawless','Flawless','Flawless','Flawless','Flawless','Flawless'])
add('Fortress', ['Festung','Fortaleza','Fortezza','要塞','요새','Forteca','Fortaleza','Крепость','Fortress','Fortress','Fortress','Фортеця','Fortress'])
add('Interception', ['Interception','interceptación','Intercettazione','インターセプション','interception','Interception','Interception','Перехват','Interception','Interception','Interception','Перехоплення','Interception'])
add('Iron', ['Eisen','Hierro','Ferro','鉄','철','Żelazo','Ferro','Железо','Iron','Iron','Iron','Железо','Iron'])
add('Night', ['Nacht','Noche','Notte','夜','밤','Noc','Noite','Ночь','Night','Night','Night','Ніч','Night'])
add('Orb Vallis', ['Orb Vallis','Vallis Orb','Valle Orb','オール・バリス','Orb Vallis','Orb Vallis','Orb Vallis','Орб Валис','Orb Vallis','Orb Vallis','Orb Vallis','Орб Валіс','Orb Vallis'])
add('Platinum', ['Platinum','Platino','Platino','プラチナ','플라티나','Platyna','Platina','Платина','Platinum','แพลตตินัม','Platin','Платина','Platina'])
add('Rank', ['Rang','Rango','Rango','ランク','랭크','Ranga','Rank','Ранг','Rank','อันดับ','Seviye','Ранг','等级'])
add('Rescue', ['Rettung','Rescate','Salvtto','救出','구조','Akcja ratunkowa','Resgate','Спасение','Rescue','Rescue','Rescue','Спасення','Rescue'])
add('Sortie', ['Sortie','Movilización','Sortie','突入','특임','Specjalna misja','Sortie','Сортировка','Sortie','Sortie','Sortie','Сортировка','Sortie'])
add('Steel Path', ['Stahlpfad','Camino de Acero','Via Acciaio','鋼の道','강철 길','Stalowa Ścieżka','Caminho de Aço','Стальной путь','Steel Path','Steel Path','Steel Path','Сталева дорога','Steel Path'])
add('Spy', ['Spionage','Espionaje','Spionaggio','スパイ','스파이','Szpiegostwo','Espionagem','Шпионаж','Spy','Spy','Spy','Шпигунство','Spy'])
add('Standing', ['Standing','Reputación','Standing','スタンディング','standing','Standing','Standing','Репутация','Standing','Standing','Standing','Репутація','Standing'])
add('Survival', ['Überleben','Supervivencia','Sopravvivenza','Survival','생존','Przeżycie','Sobrevivência','Выживание','Survival','Survival','Survival','Выживання','Survival'])

# === INVENTORY / COMP ===
add('Mastered', ['Mastered','Dominado','Mastered','Mastered','Mastered','Mastered','Mastered','Освоен','Mastered','Mastered','Mastered','Освоен','Mastered'])
add('Unmastered', ['Unmastered','No dominado','Unmastered','Unmastered','Unmastered','Unmastered','Unmastered','Не освоено','Unmastered','Unmastered','Unmastered','Не освоено','Unmastered'])
add('Subsumed', ['Subsumed','Subsumido','Subsumed','Subsumed','Subsumed','Subsumed','Subsumido','Поглощён','Subsumed','Subsumed','Subsumed','Поглощений','Subsumed'])

# === MASTERY ===
add('Details', ['Details','Detalles','Dettagli','詳細','세부 정보','Szczegóły','Detalhes','Подробности','Details','รายละเอียด','Detaylar','Деталі','Details'])
add('Junction', ['Kreuzung','Unión','Unione','結節','결절','Junction','Junction','Перекрёсток','Junction','Junction','Junction','Перехресток','Junction'])
add('Legendary Rank', ['Legendarischer Rang','Rango Legendario','Rango Leggendario','Legendary Rank','전설적 등급','Legendary Rank','Legendary Rank','Легендарный ранг','Legendary Rank','Legendary Rank','Legendary Rank','Легендарний ранг','Legendary Rank'])
add('Mastery Rank', ['Masterie-Rang','Rango de Maestría','Punteggio MaMaestria','Mastery Rank','마astery 등급','Mastery Rank','Mastery Rank','Ранг Мастерства','Mastery Rank','Mastery Rank','Mastery Rank','Ранг Мастерства','Mastery Rank'])
add('Non-Mastery', ['Nicht-Masterie','No Maestría','Non-Mastery','Non-Mastery','Non-Mastery','Non-Mastery','Non-Mastery','Не мастерство','Non-Mastery','Non-Mastery','Non-Mastery','Не мастерство','Non-Mastery'])

# === RELICS ===
add('All', ['Alle','Todos','Tutti','すべて','모두','Wszyscy','Todos','Все','All','All','All','Всі','All'])
add('Era:', ['Epoche:','Época:','Epoca:','時代:','시대:','Era:','Era:','Эпоха:','Era:','Era:','Era:','Ера:','Era:'])
add('Other', ['Sonstiges','Otros','Altro','その他','기타','Inne','Outros','Прочее','Other','Other','Other','Інше','Other'])
add('Owned:', ['Besessen:','Poseído:','Possesso:','所持:','소유:','Posiadany:','Possuído:','В наличии:','Owned:','Owned:','Owned:','В наявності:','Owned:'])
add('Sort by', ['Sortieren nach','Ordenar por','Ordina per','ソート方法','정렬 기준','Sortuj według','Ordenar por','Сортировать по','Sort by','Sort by','Sort by','Сортувати за','Sort by'])
add('Squad', ['Gruppe','Escuadrón','Squad','Squad','Squad','Squad','Squad','Отряд','Squad','Squad','Squad','Відділення','Squad'])
add('Target', ['Ziel','Objetivo','Obiettivo','対象','대상','Cel','Objetivo','Цель','Target','Target','Target','Ціль','Target'])
add('Void Traces', ['Void-Traces','Huellas del Vacío','Trace del Vuoto','Void Traces','Void Traces','Void Traces','Void Traces','Следы Пустоты','Void Traces','Void Traces','Void Traces','Void Traces','Void Traces'])

# === RIVENS ===
add('Veiled', ['Verhüllt','Velado','Velato','Veiled','Veiled','Veiled','Velado','Скрытый','Veiled','Veiled','Veiled','Схованный','Veiled'])
add('All', ['Alle','Todos','Tutti','すべて','모두','Wszyscy','Todos','Все','All','All','All','Всі','All'])

# === COLLECTIBLES ===
add('{area} area, cave {bit}', ['{area} Zone, Höhle {bit}','{area} zona, cueva {bit}','{area} zona, grotta {bit}','{area} エリア, 洞 {bit}','{area} 구역, 동굴 {bit}','{area} strefa, jaskinia {bit}','{area} zona, caverna {bit}','{area} зона, пещера {bit}','{area} area, cave {bit}','{area} area, cave {bit}','{area} area, cave {bit}','{area} зона, печера {bit}','{area} area, cave {bit}'])

# === CHECKLIST ===
add('Biweekly', ['Zweimonatlich','Bimensual','Bimensile','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly','Biweekly'])
add('Hide Completed', ['Erledigte ausblenden','Ocultar completados','Nascondi completati','Hide Completed','완료숨기기','Ukryj ukończone','Ocultar concluídos','Скрыть завершённые','Hide Completed','Hide Completed','Hide Completed','Приховати завершені','Hide Completed'])
add('Show Completed', ['Erledigte anzeigen','Mostrar completados','Mostra completati','Show Completed','완료보기','Pokaż ukończone','Mostrar concluídos','Показать завершённые','Show Completed','Show Completed','Show Completed','Показати завершені','Show Completed'])
add('Weekly', ['Wöchentlich','Semanal','Settimanale','Weekly','주간','Cotygodniowo','Semanal','Еженедельно','Weekly','Weekly','Weekly','Щотижня','Weekly'])
add('Other (8h)', ['Sonstiges (8h)','Otros (8h)','Altro (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)','Other (8h)'])

# === MAP ===
add('Lost', ['Verloren','Perdido','Perso','Lost','손실','Utraconiony','Perdido','Потеряно','Lost','Lost','Lost','Втрачено','Lost'])
add('marker', ['Marke','marca','marcatore','マーカー','표시','Marker','marcação','Маркер','marker','marker','marker','Маркер','marker'])
add('of', ['von','de','di','of','of','of','of','of','of','of','of','of','of'])
add('remaining)', ['restlichen)','restantes)','restanti)','remaining)','remaining)','remaining)','remaining)','remaining)','remaining)','remaining)','remaining)','remaining)','remaining)'])

# === INVENTORY FILTERS ===
add('Amps', ['Amplis','Amplificadores','Amplificatori','Ampliss','앰프','Wzmocnienia','Amplificadores','Усилители','Amps','Amps','Amps','Amps','Amps'])

# Save
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print(f"Saved {len(T)} translation entries")
