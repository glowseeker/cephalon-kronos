#!/usr/bin/env python3
"""
FIX ALL FRENCH LEAKS (1,455 values, 179 keys).

Earlier work copied fr.json values into every locale. This script replaces
every value that EXACTLY equals the fr.json value (and differs from EN) with a
proper native translation for that locale.

Organized by EN value -> {locale: translation}. Applied only where the current
value is the French leak.

Rules:
- No emdashes anywhere.
- No copying FR text into other locales.
- Game-adjacent terms (elements, missions) use Warframe community-standard
  translations matching what the game itself shows.
- Proper nouns (names like Acrithis, Teshin, Loid) stay as-is in all locales.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

en_ui = load_json('src/lib/i18n/en.json')['ui']
fr_ui = load_json('src/lib/i18n/fr.json')['ui']
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# ── Master translation table: EN value -> per-locale translation ─────────────
# Only locales listed get replaced (where the FR leak exists).
T = {}

# Elements (game-standard translations)
T['Blast'] = {'de': 'Explosiv', 'es': 'Explosión', 'it': 'Esplosione', 'ja': '爆発',
              'ko': '폭발', 'pl': 'Wybuch', 'pt': 'Explosão', 'ru': 'Взрыв', 'tc': '爆炸',
              'th': 'การระเบิด', 'tr': 'Patlama', 'uk': 'Вибух', 'zh': '爆炸'}
T['Corrosive'] = {'de': 'Korrosion', 'es': 'Corrosivo', 'it': 'Corrosivo', 'ja': '腐食',
                  'ko': '부식', 'pl': 'Korozja', 'pt': 'Corrosivo', 'ru': 'Коррозия', 'tc': '腐蝕',
                  'th': 'การกัดกร่อน', 'tr': 'Korozyon', 'uk': 'Корозія', 'zh': '腐蚀'}
T['Gas'] = {'de': 'Gas', 'es': 'Gas', 'it': 'Gas', 'ja': 'ガス', 'ko': '가스', 'pl': 'Gaz',
            'pt': 'Gás', 'ru': 'Газ', 'tc': '氣體', 'th': 'แก๊ส', 'tr': 'Gaz', 'uk': 'Газ', 'zh': '气体'}
T['Magnetic'] = {'de': 'Magnetisch', 'es': 'Magnético', 'it': 'Magnetico', 'ja': '磁気',
                 'ko': '자기', 'pl': 'Magnetyczny', 'pt': 'Magnético', 'ru': 'Магнитный', 'tc': '磁場',
                 'th': 'แม่เหล็ก', 'tr': 'Manyetik', 'uk': 'Магнітний', 'zh': '磁场'}
T['Puncture'] = {'de': 'Durchschlag', 'es': 'Perforación', 'it': 'Perforazione', 'ja': '貫通',
                 'ko': '관통', 'pl': 'Przebicie', 'pt': 'Perfuração', 'ru': 'Пронзание', 'tc': '貫穿',
                 'th': 'ทะลุทะลวง', 'tr': 'Delme', 'uk': 'Пронизування', 'zh': '穿刺'}
T['Slash'] = {'de': 'Schnitt', 'es': 'Cortante', 'it': 'Taglio', 'ja': '斬撃', 'ko': '베기',
              'pl': 'Cięcie', 'pt': 'Corte', 'ru': 'Режущий', 'tc': '斬擊', 'th': 'ฟัน',
              'tr': 'Kesme', 'uk': 'Ріжучий', 'zh': '切割'}
T['Toxin'] = {'de': 'Gift', 'es': 'Toxina', 'it': 'Tossina', 'ja': '毒', 'ko': '독', 'pl': 'Toksyna',
              'pt': 'Toxina', 'ru': 'Токсин', 'tc': '毒素', 'th': 'พิษ', 'tr': 'Zehir', 'uk': 'Токсин', 'zh': '毒素'}
T['Impact'] = {'de': 'Einschlag', 'es': 'Impacto', 'it': 'Impatto', 'ja': '衝撃', 'ko': '충격',
               'pl': 'Obrażenia', 'pt': 'Impacto', 'ru': 'Удар', 'tc': '衝擊', 'th': 'การกระแทก',
               'tr': 'Darbe', 'uk': 'Удар', 'zh': '冲击'}
T['Radiation'] = {'de': 'Strahlung', 'es': 'Radiación', 'it': 'Radiazione', 'ja': '放射線',
                  'ko': '방사능', 'pl': 'Promieniowanie', 'pt': 'Radiação', 'ru': 'Радиация', 'tc': '輻射',
                  'th': 'รังสี', 'tr': 'Radyasyon', 'uk': 'Радіація', 'zh': '辐射'}
T['Viral'] = {'de': 'Viral', 'es': 'Viral', 'it': 'Virale', 'ja': 'ウイルス', 'ko': '바이러스',
              'pl': 'Wirusowy', 'pt': 'Viral', 'ru': 'Вирусный', 'tc': '病毒', 'th': 'ไวรัส',
              'tr': 'Viral', 'uk': 'Вірусний', 'zh': '病毒'}

# Weapon categories
T['Melee Weapons'] = {'de': 'Nahkampfwaffen', 'es': 'Armas cuerpo a cuerpo', 'it': 'Armi da mischia',
                      'ja': '近接武器', 'ko': '근접 무기', 'pl': 'Broń biała', 'pt': 'Armas corpo a corpo',
                      'ru': 'Оружие ближнего боя', 'tc': '近戰武器', 'th': 'อาวุธประชิด',
                      'tr': 'Yakın Dövüş Silahları', 'uk': 'Зброя ближнього бою', 'zh': '近战武器'}
T['Primary Weapons'] = {'de': 'Primärwaffen', 'es': 'Armas principales', 'it': 'Armi primarie',
                        'ja': '主武器', 'ko': '주무기', 'pl': 'Broń główna', 'pt': 'Armas primárias',
                        'ru': 'Основное оружие', 'tc': '主武器', 'th': 'อาวุธหลัก',
                        'tr': 'Ana Silahlar', 'uk': 'Основна зброя', 'zh': '主武器'}
T['Secondary Weapons'] = {'de': 'Sekundärwaffen', 'es': 'Armas secundarias', 'it': 'Armi secondarie',
                          'ja': '副武器', 'ko': '보조무기', 'pl': 'Broń boczna', 'pt': 'Armas secundárias',
                          'ru': 'Вторичное оружие', 'tc': '副武器', 'th': 'อาวุธรอง',
                          'tr': 'İkincil Silahlar', 'uk': 'Другорядна зброя', 'zh': '副武器'}
T['Exotic'] = {'de': 'Exotisch', 'es': 'Exótico', 'it': 'Esotico', 'ja': 'エキゾチック', 'ko': '이색',
               'pl': 'Egzotyczny', 'pt': 'Exótico', 'ru': 'Экзотический', 'tc': '異域', 'th': 'แปลกใหม่',
               'tr': 'Egzotik', 'uk': 'Екзотичний', 'zh': '异域'}
T['Melee'] = {'de': 'Nahkampf', 'es': 'Cuerpo a cuerpo', 'it': 'Mischia', 'ja': '近接', 'ko': '근접',
              'pl': 'Biała', 'pt': 'Corpo a corpo', 'ru': 'Ближний бой', 'tc': '近戰', 'th': 'ประชิด',
              'tr': 'Yakın Dövüş', 'uk': 'Ближній бій', 'zh': '近战'}
T['Pistol'] = {'de': 'Pistole', 'es': 'Pistola', 'it': 'Pistola', 'ja': 'ピストル', 'ko': '피스톨',
               'pl': 'Pistolet', 'pt': 'Pistola', 'ru': 'Пистолет', 'tc': '手槍', 'th': 'ปืนพก',
               'tr': 'Tabanca', 'uk': 'Пістолет', 'zh': '手枪'}
T['Rifle'] = {'de': 'Gewehr', 'es': 'Rifle', 'it': 'Fucile', 'ja': 'ライフル', 'ko': '소총',
              'pl': 'Karabin', 'pt': 'Rifle', 'ru': 'Винтовка', 'tc': '步槍', 'th': 'ไรเฟิล',
              'tr': 'Tüfek', 'uk': 'Гвинтівка', 'zh': '步枪'}
T['Sentinel'] = {'de': 'Sentinelle', 'es': 'Centinela', 'it': 'Sentinella', 'ja': 'センチネル',
                 'ko': '센티널', 'pl': 'Sentyndusz', 'pt': 'Centinela', 'ru': 'Сентинель', 'tc': '哨衛',
                 'th': 'เซนติเนล', 'tr': 'Sentinel', 'uk': 'Сентинель', 'zh': '哨卫'}
T['Stance'] = {'de': 'Haltung', 'es': 'Postura', 'it': 'Posizione', 'ja': '構え', 'ko': '자세',
               'pl': 'Postawa', 'pt': 'Postura', 'ru': 'Стойка', 'tc': '架式', 'th': 'ท่าทาง',
               'tr': 'Duruş', 'uk': 'Стійка', 'zh': '架势'}
T['The Steel Path'] = {'de': 'Der Steel Path', 'es': 'El Camino de Acero', 'it': 'Il Percorso d\'Acciaio',
                       'ja': 'スティールパス', 'ko': '스틸 패스', 'pl': 'Stalowa Ścieżka', 'pt': 'Trilha de Aço',
                       'ru': 'Стальной Путь', 'tc': '鋼鐵之路', 'th': 'เส้นทางเหล็กกล้า',
                       'tr': 'Çelik Yol', 'uk': 'Сталевий Шлях', 'zh': '钢铁之路'}

# Adversaries
T['Converted'] = {'de': 'Konvertiert', 'es': 'Convertido', 'it': 'Convertito', 'ja': '転向',
                  'ko': '전향', 'pl': 'Przekonwertowany', 'pt': 'Convertido', 'ru': 'Преобразованный',
                  'tc': '轉化', 'th': 'เปลี่ยนฝ่าย', 'tr': 'Dönüştürüldü', 'uk': 'Перетворений', 'zh': '转化'}
T['Traded'] = {'de': 'Gehandelt', 'es': 'Intercambiado', 'it': 'Scambiato', 'ja': '取引済み',
               'ko': '거래됨', 'pl': 'Wymieniony', 'pt': 'Trocado', 'ru': 'Проданный',
               'tc': '已交易', 'th': 'แลกเปลี่ยนแล้ว', 'tr': 'Takas Edildi', 'uk': 'Обміняний', 'zh': '已交易'}
T['Vanquished'] = {'de': 'Besiegt', 'es': 'Vencido', 'it': 'Sconfitto', 'ja': '撃破',
                   'ko': '처치됨', 'pl': 'Pokonany', 'pt': 'Vencido', 'ru': 'Побеждённый',
                   'tc': '已擊敗', 'th': 'ปราบแล้ว', 'tr': 'Yenildi', 'uk': 'Переможений', 'zh': '已击败'}

# Checklist
T['Biweekly'] = {'de': 'Alle zwei Wochen', 'es': 'Quincenal', 'it': 'Bisettimanale', 'ja': '隔週',
                 'ko': '격주', 'pl': 'Co dwa tygodnie', 'pt': 'Quinzenal', 'ru': 'Раз в две недели',
                 'tc': '雙週', 'th': 'ทุกสองสัปดาห์', 'tr': 'İki haftada bir', 'uk': 'Раз на два тижні', 'zh': '双周'}
T['Weekly'] = {'de': 'Wöchentlich', 'es': 'Semanal', 'it': 'Settimanale', 'ja': '毎週',
               'ko': '주간', 'pl': 'Tygodniowo', 'pt': 'Semanal', 'ru': 'Еженедельно',
               'tc': '每週', 'th': 'รายสัปดาห์', 'tr': 'Haftalık', 'uk': 'Щотижня', 'zh': '每周'}
T['Hide Completed'] = {'de': 'Abgeschlossene ausblenden', 'es': 'Ocultar completadas', 'it': 'Nascondi completate',
                       'ja': '完了を隠す', 'ko': '완료 숨기기', 'pl': 'Ukryj ukończone', 'pt': 'Ocultar concluídas',
                       'ru': 'Скрыть выполненные', 'tc': '隱藏已完成', 'th': 'ซ่อนที่เสร็จแล้ว',
                       'tr': 'Tamamlananları Gizle', 'uk': 'Сховати виконані', 'zh': '隐藏已完成'}
T['Show Completed'] = {'de': 'Abgeschlossene anzeigen', 'es': 'Mostrar completadas', 'it': 'Mostra completate',
                       'ja': '完了を表示', 'ko': '완료 표시', 'pl': 'Pokaż ukończone', 'pt': 'Mostrar concluídas',
                       'ru': 'Показать выполненные', 'tc': '顯示已完成', 'th': 'แสดงที่เสร็จแล้ว',
                       'tr': 'Tamamlananları Göster', 'uk': 'Показати виконані', 'zh': '显示已完成'}
T['Other (8h)'] = {'de': 'Andere (8h)', 'es': 'Otro (8h)', 'it': 'Altro (8h)', 'ja': 'その他 (8時間)',
                   'ko': '기타 (8시간)', 'pl': 'Inne (8h)', 'pt': 'Outro (8h)', 'ru': 'Другое (8 ч)',
                   'tc': '其他（8小時）', 'th': 'อื่น ๆ (8 ชม.)', 'tr': 'Diğer (8s)', 'uk': 'Інше (8 год)', 'zh': '其他（8小时）'}
T['Quest, Syndicate, and Event Progress'] = {
    'de': 'Quest-, Syndikat- und Event-Fortschritt', 'es': 'Progreso de misiones, sindicatos y eventos',
    'it': 'Avanzamento di quest, sindacati ed eventi', 'ja': 'クエスト・シンジケート・イベントの進行状況',
    'ko': '퀘스트, 신디케이트, 이벤트 진행도', 'pl': 'Postęp zadań, syndykatów i wydarzeń',
    'pt': 'Progresso de missões, sindicatos e eventos', 'ru': 'Прогресс заданий, синдикатов и событий',
    'tc': '任務、集團與活動進度', 'th': 'ความคืบหน้าของเควสต์ สหพันธ์ และอีเวนต์',
    'tr': 'Görev, Sendika ve Etkinlik İlerlemesi', 'uk': 'Прогрес завдань, синдикатів та подій', 'zh': '任务、集团与活动进度'}

# Checklist tasks (proper nouns stay; generic parts translated)
T['Acrithis Daily'] = {'de': 'Acrithis täglich', 'es': 'Acrithis diario', 'it': 'Acrithis giornaliero',
                       'ja': 'アクリシスのデイリー', 'ko': '아크리시스 일일', 'pl': 'Acrithis codziennie',
                       'pt': 'Acrithis diário', 'ru': 'Акритис ежедневно', 'tc': '阿克里提斯每日',
                       'th': 'อคริทิสรายวัน', 'tr': 'Acrithis günlük', 'uk': 'Акрітіс щодня', 'zh': '阿克里提斯每日'}
T['Acrithis Weekly'] = {'de': 'Acrithis wöchentlich', 'es': 'Acrithis semanal', 'it': 'Acrithis settimanale',
                        'ja': 'アクリシスのウィークリー', 'ko': '아크리시스 주간', 'pl': 'Acrithis tygodniowo',
                        'pt': 'Acrithis semanal', 'ru': 'Акритис еженедельно', 'tc': '阿克里提斯每週',
                        'th': 'อคริทิสรายสัปดาห์', 'tr': 'Acrithis haftalık', 'uk': 'Акрітіс щотижня', 'zh': '阿克里提斯每周'}
T['Arbitration'] = {'de': 'Arbitration', 'es': 'Arbitraje', 'it': 'Arbitrato', 'ja': 'アービトレーション',
                    'ko': '중재', 'pl': 'Arbitraż', 'pt': 'Arbitragem', 'ru': 'Арбитраж', 'tc': '仲裁',
                    'th': 'การอนุญาโตตุลาการ', 'tr': 'Tahkim', 'uk': 'Арбітраж', 'zh': '仲裁'}
T['Archon Hunt'] = {'de': 'Archon-Jagd', 'es': 'Caza de Arconte', 'it': 'Caccia all\'Archon',
                    'ja': 'アーコン狩り', 'ko': '아콘 사냥', 'pl': 'Polowanie na Archona', 'pt': 'Caça ao Archon',
                    'ru': 'Охота на Архина', 'tc': '執政官獵殺', 'th': 'ล่าอาร์คอน',
                    'tr': 'Archon Avı', 'uk': 'Полювання на Архона', 'zh': '执政官猎杀'}
T["Maroo's Ayatan Hunt"] = {'de': 'Maroos Ayatan-Jagd', 'es': 'Caza de Ayatan de Maroo', 'it': 'Caccia all\'Ayatan di Maroo',
                            'ja': 'マルーのアヤタン狩り', 'ko': '마루의 아야탄 사냥', 'pl': 'Polowanie na Ayatan Maroo',
                            'pt': 'Caça ao Ayatan da Maroo', 'ru': 'Охота за Аятанами Мару', 'tc': '瑪魯的亞坦尋寶',
                            'th': 'ล่าอายาทันของมารู', 'tr': 'Maroo Ayatan Avı', 'uk': 'Полювання на Аятани Мару', 'zh': '玛鲁的亚坦寻宝'}
T['Bird 3 Shop'] = {'de': 'Bird-3-Laden', 'es': 'Tienda de Bird 3', 'it': 'Negozio di Bird 3',
                    'ja': 'バード3のショップ', 'ko': '버드 3 상점', 'pl': 'Sklep Bird 3', 'pt': 'Loja do Bird 3',
                    'ru': 'Магазин Бёрд 3', 'tc': '鳥三商店', 'th': 'ร้านเบิร์ด 3',
                    'tr': 'Bird 3 Dükkanı', 'uk': 'Крамниця Берд 3', 'zh': '鸟三商店'}
T['1999 Calendar'] = {'de': '1999-Kalender', 'es': 'Calendario 1999', 'it': 'Calendario 1999',
                      'ja': '1999カレンダー', 'ko': '1999 달력', 'pl': 'Kalendarz 1999', 'pt': 'Calendário 1999',
                      'ru': 'Календарь 1999', 'tc': '1999 日曆', 'th': 'ปฏิทิน 1999',
                      'tr': '1999 Takvimi', 'uk': 'Календар 1999', 'zh': '1999 日历'}
T['Duviri Circuit'] = {'de': 'Duviri-Schaltung', 'es': 'Circuito de Duviri', 'it': 'Circuito di Duviri',
                       'ja': 'デュヴィリ回路', 'ko': '두비리 회로', 'pl': 'Obwód Duviri', 'pt': 'Circuito de Duviri',
                       'ru': 'Контур Дувири', 'tc': '雙衍迴圈', 'th': 'เซอร์กิตดูวิริ',
                       'tr': 'Duviri Devresi', 'uk': 'Контур Дувірі', 'zh': '双衍回环'}
T['Duviri Circuit SP'] = {'de': 'Duviri-Schaltung SP', 'es': 'Circuito de Duviri SP', 'it': 'Circuito di Duviri SP',
                          'ja': 'デュヴィリ回路 SP', 'ko': '두비리 회로 SP', 'pl': 'Obwód Duviri SP',
                          'pt': 'Circuito de Duviri SP', 'ru': 'Контур Дувири SP', 'tc': '雙衍迴圈 SP',
                          'th': 'เซอร์กิตดูวิริ SP', 'tr': 'Duviri Devresi SP', 'uk': 'Контур Дувірі SP', 'zh': '双衍回环 SP'}
T['Help Clem'] = {'de': 'Hilf Clem', 'es': 'Ayuda a Clem', 'it': 'Aiuta Clem', 'ja': 'クレムを助ける',
                  'ko': '클렘 돕기', 'pl': 'Pomóż Clemowi', 'pt': 'Ajude o Clem', 'ru': 'Помогите Клему',
                  'tc': '幫助克萊姆', 'th': 'ช่วยเคลม', 'tr': 'Clem\'e Yardım Et', 'uk': 'Допоможіть Клему', 'zh': '帮助克莱姆'}
T['Descendia SP'] = {'de': 'Descendia SP', 'es': 'Descendia SP', 'it': 'Descendia SP', 'ja': 'ディセンドリア SP',
                     'ko': '디센디아 SP', 'pl': 'Descendia SP', 'pt': 'Descendia SP', 'ru': 'Десцендия SP',
                     'tc': '深淵之旅 SP', 'th': 'ดีเซนเดีย SP', 'tr': 'Descendia SP', 'uk': 'Десцендія SP', 'zh': '深渊之旅 SP'}
T['Daily Focus Cap'] = {'de': 'Tägliches Focus-Limit', 'es': 'Límite diario de Focus', 'it': 'Limite giornaliero di Focus',
                        'ja': 'デイリーフォーカス上限', 'ko': '일일 포커스 상한', 'pl': 'Dzienny limit Focusa',
                        'pt': 'Limite diário de Focus', 'ru': 'Дневной лимит Фокуса', 'tc': '每日專注上限',
                        'th': 'ขีดจำกัดโฟกัสรายวัน', 'tr': 'Günlük Focus Limiti', 'uk': 'Денний ліміт Фокуса', 'zh': '每日专精上限'}
T['Check Foundry'] = {'de': 'Foundry prüfen', 'es': 'Revisar fundición', 'it': 'Controlla la Fonderia',
                      'ja': 'ファウンドリを確認', 'ko': '파운드리 확인', 'pl': 'Sprawdź odlewnię', 'pt': 'Verificar fundição',
                      'ru': 'Проверить Кузницу', 'tc': '檢查鑄造廠', 'th': 'ตรวจสอบโรงหลอม',
                      'tr': 'Dökümhaneyi Kontrol Et', 'uk': 'Перевірити Кузню', 'zh': '检查铸造厂'}
T["Grandmother's Tokens"] = {'de': 'Großmutters Jetons', 'es': 'Fichas de la Abuela', 'it': 'Gettoni della Nonna',
                             'ja': 'グランドマザーのトークン', 'ko': '그랜드마더 토큰', 'pl': 'Żetony Babci',
                             'pt': 'Fichas da Avó', 'ru': 'Жетоны Бабушки', 'tc': '祖母的代幣',
                             'th': 'โทเคนของคุณยาย', 'tr': 'Büyükanne Jetonları', 'uk': 'Жетони Бабусі', 'zh': '祖母的代币'}
T['Helminth Invigoration'] = {'de': 'Helminth-Invigoration', 'es': 'Invigoración del Helminth', 'it': 'Invigorazione dell\'Helminth',
                              'ja': 'ヘルミンス活力', 'ko': '헬민스 활력', 'pl': 'Wzmocnienie Helmintha',
                              'pt': 'Revigoração do Helminth', 'ru': 'Восстановление Хелминта', 'tc': 'Helminth 活化',
                              'th': 'การฟื้นฟูเฮลมินธ์', 'tr': 'Helminth Canlandırma', 'uk': 'Відновлення Гельмінта', 'zh': 'Helminth 活化'}
T['Kuva Lich'] = {'de': 'Kuva-Lich', 'es': 'Lich Kuva', 'it': 'Lich Kuva', 'ja': 'クヴァ・リッチ',
                  'ko': '쿠바 리치', 'pl': 'Lich Kuva', 'pt': 'Lich Kuva', 'ru': 'Лич Кувы',
                  'tc': '赤毒巫妖', 'th': 'ลิชคูวา', 'tr': 'Kuva Lich', 'uk': 'Ліч Куви', 'zh': '赤毒巫妖'}
T["Marie's Shop"] = {'de': 'Maries Laden', 'es': 'Tienda de Marie', 'it': 'Negozio di Marie',
                     'ja': 'マリーのショップ', 'ko': '마리 상점', 'pl': 'Sklep Marie', 'pt': 'Loja da Marie',
                     'ru': 'Магазин Мари', 'tc': '瑪麗商店', 'th': 'ร้านมารี',
                     'tr': 'Marie Dükkanı', 'uk': 'Крамниця Марі', 'zh': '玛丽商店'}
T['Help Kahl: Break Narmer'] = {'de': 'Hilf Kahl: Narmer brechen', 'es': 'Ayuda a Kahl: Romper Narmer',
                                'it': 'Aiuta Kahl: Spezza Narmer', 'ja': 'カールを助ける：ナーマーを倒せ',
                                'ko': '칼 돕기: 나머 처치', 'pl': 'Pomóż Kahlowi: Złam Narmer',
                                'pt': 'Ajude o Kahl: Destrua Narmer', 'ru': 'Помогите Калу: Сломить Нармера',
                                'tc': '幫助卡爾：擊敗納爾邁', 'th': 'ช่วยคาห์ล: ทำลายนาเมอร์',
                                'tr': 'Kahl\'a Yardım Et: Narmer\'ı Kır', 'uk': 'Допоможіть Калу: Зламати Нармера', 'zh': '帮助卡尔：击败纳尔迈'}
T['Nightcap Shop'] = {'de': 'Nightcap-Laden', 'es': 'Tienda de Nightcap', 'it': 'Negozio di Nightcap',
                      'ja': 'ナイトキャップショップ', 'ko': '나이트캡 상점', 'pl': 'Sklep Nightcap',
                      'pt': 'Loja do Nightcap', 'ru': 'Магазин Найткэп', 'tc': '夜帽商店', 'th': 'ร้านไนท์แคป',
                      'tr': 'Nightcap Dükkanı', 'uk': 'Крамниця Найткеп', 'zh': '夜帽商店'}
T['Nightwave Missions'] = {'de': 'Nightwave-Missionen', 'es': 'Misiones de Nightwave', 'it': 'Missioni Nightwave',
                           'ja': 'ナイトウェーブミッション', 'ko': '나이트웨이브 미션', 'pl': 'Misje Nightwave',
                           'pt': 'Missões Nightwave', 'ru': 'Задания Ночной волны', 'tc': '午夜電波任務',
                           'th': 'ภารกิจไนท์เวฟ', 'tr': 'Nightwave Görevleri', 'uk': 'Місії Нічної хвилі', 'zh': '午夜电波任务'}
T['Nightwave Shop'] = {'de': 'Nightwave-Laden', 'es': 'Tienda de Nightwave', 'it': 'Negozio Nightwave',
                       'ja': 'ナイトウェーブショップ', 'ko': '나이트웨이브 상점', 'pl': 'Sklep Nightwave',
                       'pt': 'Loja Nightwave', 'ru': 'Магазин Ночной волны', 'tc': '午夜電波商店',
                       'th': 'ร้านไนท์เวฟ', 'tr': 'Nightwave Dükkanı', 'uk': 'Крамниця Нічної хвилі', 'zh': '午夜电波商店'}
T["Palladino's Shop"] = {'de': 'Palladinos Laden', 'es': 'Tienda de Palladino', 'it': 'Negozio di Palladino',
                         'ja': 'パラディーノのショップ', 'ko': '팔라디노 상점', 'pl': 'Sklep Palladino',
                         'pt': 'Loja da Palladino', 'ru': 'Магазин Палладино', 'tc': '帕拉迪諾商店',
                         'th': 'ร้านพัลลาดีโน', 'tr': 'Palladino Dükkanı', 'uk': 'Крамниця Палладіно', 'zh': '帕拉迪诺商店'}
T['Pulses: Netracell & Archimedea'] = {'de': 'Pulse: Netracell & Archimedea', 'es': 'Pulsos: Netracell y Archimedea',
                                       'it': 'Impulsi: Netracell e Archimedea', 'ja': 'パルス: ネットラセル & アルキメデア',
                                       'ko': '펄스: 네트라셀 & 아르키메데아', 'pl': 'Pulses: Netracell i Archimedea',
                                       'pt': 'Pulsos: Netracell e Archimedea', 'ru': 'Импульсы: Нетрасел и Архимедея',
                                       'tc': '脈衝：虛空牢籠與阿基米德', 'th': 'พัลส์: เนทราซิลและอาร์คิมิดีอา',
                                       'tr': 'Pulses: Netracell ve Archimedea', 'uk': 'Імпульси: Нетрасел та Архімедея', 'zh': '脉冲：虚空牢笼与阿基米德'}
T['Sister Lich'] = {'de': 'Schwester-Lich', 'es': 'Lich Hermana', 'it': 'Lich Sorella', 'ja': 'シスター・リッチ',
                    'ko': '시스터 리치', 'pl': 'Lich Siostra', 'pt': 'Lich Irmã', 'ru': 'Лич Сестра',
                    'tc': '姊妹巫妖', 'th': 'ลิชน้องสาว', 'tr': 'Kız Kardeş Lich', 'uk': 'Ліч Сестра', 'zh': '姐妹巫妖'}
T['Steel Path Incursions'] = {'de': 'Steel-Path-Einfälle', 'es': 'Incursiones del Camino de Acero',
                              'it': 'Incursioni del Percorso d\'Acciaio', 'ja': 'スティールパス侵入',
                              'ko': '스틸 패스 침입', 'pl': 'Incydenty Stalowej Ścieżki',
                              'pt': 'Incursões da Trilha de Aço', 'ru': 'Рейды Стального Пути',
                              'tc': '鋼鐵之路入侵', 'th': 'การบุกเส้นทางเหล็กกล้า',
                              'tr': 'Çelik Yol Baskınları', 'uk': 'Вторгнення Сталевого Шляху', 'zh': '钢铁之路入侵'}
T['Syndicate Standing'] = {'de': 'Syndikat-Ansehen', 'es': 'Reputación de sindicato', 'it': 'Reputazione del sindacato',
                           'ja': 'シンジケート名声', 'ko': '신디케이트 평판', 'pl': 'Reputacja syndykatu',
                           'pt': 'Reputação de sindicato', 'ru': 'Репутация синдиката', 'tc': '集團聲望',
                           'th': 'ชื่อเสียงสหพันธ์', 'tr': 'Sendika İtibarı', 'uk': 'Репутація синдикату', 'zh': '集团声望'}
T['Teshin Shop'] = {'de': 'Teshins Laden', 'es': 'Tienda de Teshin', 'it': 'Negozio di Teshin',
                    'ja': 'テシンのショップ', 'ko': '테신 상점', 'pl': 'Sklep Teshina', 'pt': 'Loja do Teshin',
                    'ru': 'Магазин Тешина', 'tc': '泰辛商店', 'th': 'ร้านเทชิน',
                    'tr': 'Teshin Dükkanı', 'uk': 'Крамниця Тешина', 'zh': '泰辛商店'}
T["Ticker's Railjack Crew"] = {'de': 'Tickers Railjack-Crew', 'es': 'Tripulación de Railjack de Ticker',
                               'it': 'Equipaggio Railjack di Ticker', 'ja': 'ティッカーのレールジャッククルー',
                               'ko': '티커의 레일잭 승무원', 'pl': 'Załoga Railjacka Ticker',
                               'pt': 'Tripulação do Railjack da Ticker', 'ru': 'Экипаж Рейлджека Тиккера',
                               'tc': '提克的銳捷號船員', 'th': 'ลูกเรือเรลแจ็คของทิกเกอร์',
                               'tr': 'Ticker Railjack Mürettebatı', 'uk': 'Екіпаж Рейкоджека Тіккера', 'zh': '提克的锐捷号船员'}
T['Yonta: Daily Voidplumes'] = {'de': 'Yonta: Tägliche Voidfeder', 'es': 'Yonta: Plumas del Vacío diarias',
                                'it': 'Yonta: Piume del Vuoto giornaliere', 'ja': 'ヨンタ: デイリーヴォイドプリュム',
                                'ko': '욘타: 일일 보이드 플룸', 'pl': 'Yonta: Codzienne Pióra Pustki',
                                'pt': 'Yonta: Plumas do Vazio diárias', 'ru': 'Йонта: Ежедневные Перья Бездны',
                                'tc': '永塔：每日虛空翎羽', 'th': 'ยอนตา: ขนนกวอยด์รายวัน',
                                'tr': 'Yonta: Günlük Void Tüyleri', 'uk': 'Йонта: Щоденні Пера Порожнечі', 'zh': '永塔：每日虚空翎羽'}
T['Yonta: Weekly Shop'] = {'de': 'Yonta: Wochenladen', 'es': 'Yonta: Tienda semanal', 'it': 'Yonta: Negozio settimanale',
                           'ja': 'ヨンタ: ウィークリーショップ', 'ko': '욘타: 주간 상점', 'pl': 'Yonta: Sklep tygodniowy',
                           'pt': 'Yonta: Loja semanal', 'ru': 'Йонта: Еженедельный магазин', 'tc': '永塔：每週商店',
                           'th': 'ยอนตา: ร้านประจำสัปดาห์', 'tr': 'Yonta: Haftalık Dükkan', 'uk': 'Йонта: Тижнева крамниця', 'zh': '永塔：每周商店'}

# Collectibles
T['Areas Discovered'] = {'de': 'Entdeckte Gebiete', 'es': 'Zonas descubiertas', 'it': 'Aree scoperte',
                         'ja': '発見済みエリア', 'ko': '발견한 지역', 'pl': 'Odkryte obszary',
                         'pt': 'Áreas descobertas', 'ru': 'Обнаруженные области', 'tc': '已發現區域',
                         'th': 'พื้นที่ที่ค้นพบ', 'tr': 'Keşfedilen Alanlar', 'uk': 'Відкриті області', 'zh': '已发现区域'}
T['Caves not loaded'] = {'de': 'Höhlen nicht geladen', 'es': 'Cuevas no cargadas', 'it': 'Caverni non caricati',
                         'ja': '洞窟が読み込まれていません', 'ko': '동굴이 로드되지 않음', 'pl': 'Jaskinie niezaładowane',
                         'pt': 'Cavernas não carregadas', 'ru': 'Пещеры не загружены', 'tc': '洞穴未載入',
                         'th': 'ถ้ำยังไม่โหลด', 'tr': 'Mağaralar yüklenmedi', 'uk': 'Печери не завантажені', 'zh': '洞穴未加载'}
T['None collected'] = {'de': 'Keine gesammelt', 'es': 'Ninguno recolectado', 'it': 'Nessuno raccolto',
                       'ja': '未収集', 'ko': '수집 없음', 'pl': 'Nic nie zebrano', 'pt': 'Nenhum coletado',
                       'ru': 'Ничего не собрано', 'tc': '尚未收集', 'th': 'ยังไม่เก็บ',
                       'tr': 'Hiç toplanmadı', 'uk': 'Нічого не зібрано', 'zh': '尚未收集'}
T['None discovered'] = {'de': 'Keine entdeckt', 'es': 'Ninguno descubierto', 'it': 'Nessuno scoperto',
                        'ja': '未発見', 'ko': '발견 없음', 'pl': 'Nic nie odkryto', 'pt': 'Nenhum descoberto',
                        'ru': 'Ничего не обнаружено', 'tc': '尚未發現', 'th': 'ยังไม่ค้นพบ',
                        'tr': 'Hiç keşfedilmedi', 'uk': 'Нічого не виявлено', 'zh': '尚未发现'}
T['{area} area, cave {bit}'] = {'de': 'Bereich {area}, Höhle {bit}', 'es': 'Zona {area}, cueva {bit}',
                                'it': 'Area {area}, caverna {bit}', 'ja': '{area}エリア、洞窟{bit}',
                                'ko': '{area} 지역, 동굴 {bit}', 'pl': 'Obszar {area}, jaskinia {bit}',
                                'pt': 'Área {area}, caverna {bit}', 'ru': 'Область {area}, пещера {bit}',
                                'tc': '{area} 區域，洞穴 {bit}', 'th': 'พื้นที่ {area} ถ้ำ {bit}',
                                'tr': '{area} alanı, mağara {bit}', 'uk': 'Область {area}, печера {bit}', 'zh': '{area} 区域，洞穴 {bit}'}

# Dashboard
T['LEFT'] = {'de': 'ÜBRIG', 'es': 'RESTANTE', 'it': 'RIMANENTE', 'ja': '残り', 'ko': '남음',
             'pl': 'POZOSTAŁO', 'pt': 'RESTANTE', 'ru': 'ОСТАЛОСЬ', 'tc': '剩餘', 'th': 'เหลือ',
             'tr': 'KALAN', 'uk': 'ЗАЛИШИЛОСЯ', 'zh': '剩余'}
T['remaining'] = {'de': 'übrig', 'es': 'restante', 'it': 'rimanente', 'ja': '残り', 'ko': '남음',
                  'pl': 'pozostało', 'pt': 'restante', 'ru': 'осталось', 'tc': '剩餘', 'th': 'เหลือ',
                  'tr': 'kalan', 'uk': 'залишилось', 'zh': '剩余'}
T['REMAINING'] = {'de': 'ÜBRIG', 'es': 'RESTANTE', 'it': 'RIMANENTE', 'ja': '残り', 'ko': '남음',
                  'pl': 'POZOSTAŁO', 'pt': 'RESTANTE', 'ru': 'ОСТАЛОСЬ', 'tc': '剩餘', 'th': 'เหลือ',
                  'tr': 'KALAN', 'uk': 'ЗАЛИШИЛОСЯ', 'zh': '剩余'}
T['Season'] = {'de': 'Saison', 'es': 'Temporada', 'it': 'Stagione', 'ja': 'シーズン', 'ko': '시즌',
               'pl': 'Sezon', 'pt': 'Temporada', 'ru': 'Сезон', 'tc': '季節', 'th': 'ฤดูกาล',
               'tr': 'Sezon', 'uk': 'Сезон', 'zh': '季节'}
T['Mastered'] = {'de': 'Gemeistert', 'es': 'Dominado', 'it': 'Padroneggiato', 'ja': 'マスター済み',
                 'ko': '숙련됨', 'pl': 'Opanowany', 'pt': 'Dominado', 'ru': 'Освоено', 'tc': '已精通',
                 'th': 'เชี่ยวชาญแล้ว', 'tr': 'Ustalaşıldı', 'uk': 'Освоєно', 'zh': '已精通'}
T['Socketed'] = {'de': 'Eingesetzt', 'es': 'Enchufado', 'it': 'Innestato', 'ja': '装着済み',
                 'ko': '장착됨', 'pl': 'Zamontowany', 'pt': 'Encaixado', 'ru': 'Установлено', 'tc': '已安裝',
                 'th': 'ติดตั้งแล้ว', 'tr': 'Yuvalandı', 'uk': 'Встановлено', 'zh': '已安装'}
T['Subsumed'] = {'de': 'Absorbiert', 'es': 'Absorbido', 'it': 'Assorbito', 'ja': '吸収済み',
                 'ko': '흡수됨', 'pl': 'Wchłonięty', 'pt': 'Absorvido', 'ru': 'Поглощено', 'tc': '已吸收',
                 'th': 'ดูดซับแล้ว', 'tr': 'Özümsendi', 'uk': 'Поглинуто', 'zh': '已吸收'}
T['of'] = {'de': 'von', 'es': 'de', 'it': 'di', 'ja': '/', 'ko': '/', 'pl': 'z', 'pt': 'de',
           'ru': 'из', 'tc': '，共', 'th': 'จาก', 'tr': '/', 'uk': 'з', 'zh': '，共'}
T['Search inventory...'] = {'de': 'Inventar durchsuchen...', 'es': 'Buscar en el inventario...',
                            'it': 'Cerca nell\'inventario...', 'ja': 'インベントリを検索...',
                            'ko': '인벤토리 검색...', 'pl': 'Szukaj w ekwipunku...',
                            'pt': 'Pesquisar no inventário...', 'ru': 'Поиск по инвентарю...',
                            'tc': '搜尋倉庫...', 'th': 'ค้นหาสินค้าคงคลัง...',
                            'tr': 'Envanterde ara...', 'uk': 'Пошук в інвентарі...', 'zh': '搜索仓库...'}

# Maps
T['Adding'] = {'de': 'Hinzufügen', 'es': 'Añadiendo', 'it': 'Aggiunta', 'ja': '追加中', 'ko': '추가 중',
               'pl': 'Dodawanie', 'pt': 'Adicionando', 'ru': 'Добавление', 'tc': '新增中', 'th': 'กำลังเพิ่ม',
               'tr': 'Ekleniyor', 'uk': 'Додавання', 'zh': '添加中'}
T['Map Configuration'] = {'de': 'Kartenkonfiguration', 'es': 'Configuración del mapa', 'it': 'Configurazione mappa',
                          'ja': 'マップ設定', 'ko': '지도 구성', 'pl': 'Konfiguracja mapy', 'pt': 'Configuração do mapa',
                          'ru': 'Конфигурация карты', 'tc': '地圖配置', 'th': 'การตั้งค่าแผนที่',
                          'tr': 'Harita Yapılandırması', 'uk': 'Конфігурація карти', 'zh': '地图配置'}
T['Delete this config?'] = {'de': 'Diese Konfiguration löschen?', 'es': '¿Eliminar esta configuración?',
                            'it': 'Eliminare questa configurazione?', 'ja': 'この設定を削除しますか？',
                            'ko': '이 구성을 삭제할까요?', 'pl': 'Usunąć tę konfigurację?',
                            'pt': 'Excluir esta configuração?', 'ru': 'Удалить эту конфигурацию?',
                            'tc': '刪除此配置？', 'th': 'ลบการตั้งค่านี้หรือไม่',
                            'tr': 'Bu yapılandırma silinsin mi?', 'uk': 'Видалити цю конфігурацію?', 'zh': '删除此配置？'}
T['Game Markers'] = {'de': 'Spielmarker', 'es': 'Marcadores del juego', 'it': 'Marcatori di gioco',
                     'ja': 'ゲームマーカー', 'ko': '게임 마커', 'pl': 'Znaczniki gry', 'pt': 'Marcadores do jogo',
                     'ru': 'Игровые маркеры', 'tc': '遊戲標記', 'th': 'มาร์กเกอร์ในเกม',
                     'tr': 'Oyun İşaretleri', 'uk': 'Ігрові маркери', 'zh': '游戏标记'}
T['Hidden'] = {'de': 'Versteckt', 'es': 'Ocultos', 'it': 'Nascosti', 'ja': '非表示', 'ko': '숨김',
               'pl': 'Ukryte', 'pt': 'Ocultos', 'ru': 'Скрытые', 'tc': '已隱藏', 'th': 'ซ่อนอยู่',
               'tr': 'Gizli', 'uk': 'Приховані', 'zh': '已隐藏'}
T['Image unavailable'] = {'de': 'Bild nicht verfügbar', 'es': 'Imagen no disponible', 'it': 'Immagine non disponibile',
                          'ja': '画像を利用できません', 'ko': '이미지를 사용할 수 없음', 'pl': 'Obraz niedostępny',
                          'pt': 'Imagem indisponível', 'ru': 'Изображение недоступно', 'tc': '圖片不可用',
                          'th': 'ไม่มีรูปภาพ', 'tr': 'Görsel mevcut değil', 'uk': 'Зображення недоступне', 'zh': '图片不可用'}
T['Imported markers from'] = {'de': 'Importierte Marker von', 'es': 'Marcadores importados de', 'it': 'Marcatori importati da',
                              'ja': 'からマーカーをインポート', 'ko': '에서 마커 가져옴', 'pl': 'Znaczniki zaimportowane z',
                              'pt': 'Marcadores importados de', 'ru': 'Маркеры импортированы из', 'tc': '從以下位置匯入標記',
                              'th': 'นำเข้ามาร์กเกอร์จาก', 'tr': 'Şuradan içe aktarılan işaretler', 'uk': 'Маркери імпортовано з', 'zh': '从以下位置导入标记'}
T['Add Marker'] = {'de': 'Marker hinzufügen', 'es': 'Añadir marcador', 'it': 'Aggiungi marcatore',
                   'ja': 'マーカーを追加', 'ko': '마커 추가', 'pl': 'Dodaj znacznik', 'pt': 'Adicionar marcador',
                   'ru': 'Добавить маркер', 'tc': '新增標記', 'th': 'เพิ่มมาร์กเกอร์',
                   'tr': 'İşaret Ekle', 'uk': 'Додати маркер', 'zh': '添加标记'}
T['markers'] = {'de': 'Marker', 'es': 'marcadores', 'it': 'marcatori', 'ja': 'マーカー', 'ko': '마커',
                'pl': 'znaczniki', 'pt': 'marcadores', 'ru': 'маркеров', 'tc': '標記', 'th': 'มาร์กเกอร์',
                'tr': 'işaret', 'uk': 'маркери', 'zh': '标记'}
T['Path'] = {'de': 'Pfad', 'es': 'Trayectoria', 'it': 'Percorso', 'ja': '経路', 'ko': '경로',
             'pl': 'Ścieżka', 'pt': 'Trajeto', 'ru': 'Путь', 'tc': '路徑', 'th': 'เส้นทาง',
             'tr': 'Rota', 'uk': 'Шлях', 'zh': '路径'}
T['Paths'] = {'de': 'Pfade', 'es': 'Trayectorias', 'it': 'Percorsi', 'ja': '経路', 'ko': '경로',
              'pl': 'Ścieżki', 'pt': 'Trajetos', 'ru': 'Пути', 'tc': '路徑', 'th': 'เส้นทาง',
              'tr': 'Rotalar', 'uk': 'Шляхи', 'zh': '路径'}
T['Labeled'] = {'de': 'Beschriftet', 'es': 'Etiquetado', 'it': 'Etichettato', 'ja': 'ラベル付き',
                'ko': '레이블 표시', 'pl': 'Oznaczone', 'pt': 'Rotulado', 'ru': 'Подписанный', 'tc': '已標記',
                'th': 'ติดป้าย', 'tr': 'Etiketli', 'uk': 'Підписаний', 'zh': '已标记'}
T['Raw'] = {'de': 'Roh', 'es': 'Bruto', 'it': 'Grezzo', 'ja': '生データ', 'ko': '원본',
            'pl': 'Surowy', 'pt': 'Bruto', 'ru': 'Сырой', 'tc': '原始', 'th': 'ดิบ',
            'tr': 'Ham', 'uk': 'Сирий', 'zh': '原始'}

# Mods
T['Compositing'] = {'de': 'Zusammenfügen', 'es': 'Composición', 'it': 'Composizione', 'ja': '合成中',
                    'ko': '합성 중', 'pl': 'Komponowanie', 'pt': 'Compondo', 'ru': 'Компоновка', 'tc': '合成中',
                    'th': 'กำลังประกอบ', 'tr': 'Birleştiriliyor', 'uk': 'Компонування', 'zh': '合成中'}
T['Extracting'] = {'de': 'Extrahieren', 'es': 'Extrayendo', 'it': 'Estrazione', 'ja': '抽出中',
                   'ko': '추출 중', 'pl': 'Wyodrębnianie', 'pt': 'Extraindo', 'ru': 'Извлечение', 'tc': '提取中',
                   'th': 'กำลังแยก', 'tr': 'Çıkarılıyor', 'uk': 'Видобування', 'zh': '提取中'}
T['Fixing'] = {'de': 'Reparieren', 'es': 'Reparando', 'it': 'Riparazione', 'ja': '修正中',
               'ko': '수정 중', 'pl': 'Naprawianie', 'pt': 'Corrigindo', 'ru': 'Исправление', 'tc': '修復中',
               'th': 'กำลังซ่อมแซม', 'tr': 'Düzeltiliyor', 'uk': 'Виправлення', 'zh': '修复中'}
T['Preparing'] = {'de': 'Vorbereiten', 'es': 'Preparando', 'it': 'Preparazione', 'ja': '準備中',
                  'ko': '준비 중', 'pl': 'Przygotowywanie', 'pt': 'Preparando', 'ru': 'Подготовка', 'tc': '準備中',
                  'th': 'กำลังเตรียม', 'tr': 'Hazırlanıyor', 'uk': 'Підготовка', 'zh': '准备中'}
T['Rank'] = {'de': 'Rang', 'es': 'Rango', 'it': 'Rango', 'ja': 'ランク', 'ko': '랭크',
             'pl': 'Ranga', 'pt': 'Rank', 'ru': 'Ранг', 'tc': '等級', 'th': 'ระดับ',
             'tr': 'Seviye', 'uk': 'Ранг', 'zh': '等级'}
T['Mod collection browser'] = {'de': 'Mod-Sammlungsbrowser', 'es': 'Navegador de colección de mods',
                               'it': 'Browser della collezione di mod', 'ja': 'MODコレクションブラウザ',
                               'ko': '모드 컬렉션 브라우저', 'pl': 'Przeglądarka kolekcji modów',
                               'pt': 'Navegador de coleção de mods', 'ru': 'Обозреватель коллекции модов',
                               'tc': 'MOD 收藏瀏覽器', 'th': 'เบราว์เซอร์คอลเลกชันมอด',
                               'tr': 'Mod Koleksiyonu Tarayıcısı', 'uk': 'Переглядач колекції модів', 'zh': 'MOD 收藏浏览器'}

# Relics
T['Era:'] = {'de': 'Ära:', 'es': 'Era:', 'it': 'Era:', 'ja': '時代：', 'ko': '시대:',
             'pl': 'Era:', 'pt': 'Era:', 'ru': 'Эра:', 'tc': '時代：', 'th': 'ยุค:',
             'tr': 'Çağ:', 'uk': 'Ера:', 'zh': '时代：'}
T['EXP DUCATS'] = {'de': 'EXP DUKATEN', 'es': 'EXP DUCADOS', 'it': 'ESP DUCATI', 'ja': 'EXP ダカット',
                   'ko': 'EXP 두캇', 'pl': 'EXP DUKATY', 'pt': 'EXP DUCATS', 'ru': 'ОПЫТ ДУКАТЫ',
                   'tc': '經驗杜卡德', 'th': 'EXP ดั๊กแคต', 'tr': 'EXP DUKAT', 'uk': 'ДОСВІД ДУКАТИ', 'zh': '经验杜卡德'}
T['EXP PLAT'] = {'de': 'EXP PLATIN', 'es': 'EXP PLATINO', 'it': 'ESP PLATINO', 'ja': 'EXP プラチナ',
                 'ko': 'EXP 플래티넘', 'pl': 'EXP PLATYNA', 'pt': 'EXP PLATINA', 'ru': 'ОПЫТ ПЛАТИНА',
                 'tc': '經驗白金', 'th': 'EXP แพลตตินัม', 'tr': 'EXP PLATİN', 'uk': 'ДОСВІД ПЛАТИНА', 'zh': '经验白金'}
T['Other'] = {'de': 'Andere', 'es': 'Otro', 'it': 'Altro', 'ja': 'その他', 'ko': '기타',
              'pl': 'Inne', 'pt': 'Outro', 'ru': 'Другое', 'tc': '其他', 'th': 'อื่น ๆ',
              'tr': 'Diğer', 'uk': 'Інше', 'zh': '其他'}
T['Owned:'] = {'de': 'Besessen:', 'es': 'Poseído:', 'it': 'Posseduto:', 'ja': '所持：', 'ko': '보유:',
               'pl': 'Posiadane:', 'pt': 'Possuído:', 'ru': 'В наличии:', 'tc': '已擁有：', 'th': 'ครอบครอง:',
               'tr': 'Sahip olunan:', 'uk': 'В наявності:', 'zh': '已拥有：'}
T['Sort by'] = {'de': 'Sortieren nach', 'es': 'Ordenar por', 'it': 'Ordina per', 'ja': '並べ替え',
                'ko': '정렬 기준', 'pl': 'Sortuj według', 'pt': 'Ordenar por', 'ru': 'Сортировать по',
                'tc': '排序方式', 'th': 'เรียงตาม', 'tr': 'Sırala', 'uk': 'Сортувати за', 'zh': '排序方式'}
T['Squad'] = {'de': 'Team', 'es': 'Escuadra', 'it': 'Squadra', 'ja': '分隊', 'ko': '분대',
              'pl': 'Drużyna', 'pt': 'Esquadrão', 'ru': 'Отряд', 'tc': '小隊', 'th': 'ทีม',
              'tr': 'Takım', 'uk': 'Загін', 'zh': '小队'}
T['Target'] = {'de': 'Ziel', 'es': 'Objetivo', 'it': 'Obiettivo', 'ja': '目標', 'ko': '목표',
               'pl': 'Cel', 'pt': 'Alvo', 'ru': 'Цель', 'tc': '目標', 'th': 'เป้าหมาย',
               'tr': 'Hedef', 'uk': 'Ціль', 'zh': '目标'}

# Riven card
T['Average'] = {'de': 'Durchschnitt', 'es': 'Promedio', 'it': 'Media', 'ja': '平均', 'ko': '평균',
                'pl': 'Średnia', 'pt': 'Média', 'ru': 'Среднее', 'tc': '平均', 'th': 'ค่าเฉลี่ย',
                'tr': 'Ortalama', 'uk': 'Середнє', 'zh': '平均'}
T['Bad'] = {'de': 'Schlecht', 'es': 'Malo', 'it': 'Scarso', 'ja': '悪い', 'ko': '나쁨',
            'pl': 'Zły', 'pt': 'Ruim', 'ru': 'Плохой', 'tc': '差', 'th': 'แย่',
            'tr': 'Kötü', 'uk': 'Поганий', 'zh': '差'}
T['Good'] = {'de': 'Gut', 'es': 'Bueno', 'it': 'Buono', 'ja': '良い', 'ko': '좋음',
             'pl': 'Dobry', 'pt': 'Bom', 'ru': 'Хороший', 'tc': '好', 'th': 'ดี',
             'tr': 'İyi', 'uk': 'Добрий', 'zh': '好'}
T['Mediocre'] = {'de': 'Mittelmaß', 'es': 'Mediocre', 'it': 'Mediocre', 'ja': '平凡', 'ko': '평범',
                 'pl': 'Przeciętny', 'pt': 'Mediano', 'ru': 'Посредственный', 'tc': '平庸', 'th': 'ปานกลาง',
                 'tr': 'Vasat', 'uk': 'Посередній', 'zh': '平庸'}
T['Perfect'] = {'de': 'Perfekt', 'es': 'Perfecto', 'it': 'Perfetto', 'ja': '完璧', 'ko': '완벽',
                'pl': 'Idealny', 'pt': 'Perfeito', 'ru': 'Идеальный', 'tc': '完美', 'th': 'สมบูรณ์แบบ',
                'tr': 'Mükemmel', 'uk': 'Ідеальний', 'zh': '完美'}
T['Popular'] = {'de': 'Beliebt', 'es': 'Popular', 'it': 'Popolare', 'ja': '人気', 'ko': '인기',
                'pl': 'Popularny', 'pt': 'Popular', 'ru': 'Популярный', 'tc': '熱門', 'th': 'เป็นที่นิยม',
                'tr': 'Popüler', 'uk': 'Популярний', 'zh': '热门'}
T['Unpopular'] = {'de': 'Unbeliebt', 'es': 'Impopular', 'it': 'Impopolare', 'ja': '不人気', 'ko': '비인기',
                  'pl': 'Niepopularny', 'pt': 'Impopular', 'ru': 'Непопулярный', 'tc': '冷門', 'th': 'ไม่เป็นที่นิยม',
                  'tr': 'Popüler değil', 'uk': 'Неpopularний', 'zh': '冷门'}
T['{roll} - {tier} weapon'] = {'de': '{roll} - {tier} Waffe', 'es': 'Arma {roll} - {tier}', 'it': 'Arma {roll} - {tier}',
                               'ja': '{roll} - {tier} 武器', 'ko': '{roll} - {tier} 무기', 'pl': 'Broń {roll} - {tier}',
                               'pt': 'Arma {roll} - {tier}', 'ru': 'Оружие {roll} - {tier}',
                               'tc': '{roll} - {tier} 武器', 'th': 'อาวุธ {roll} - {tier}',
                               'tr': '{roll} - {tier} silah', 'uk': 'Зброя {roll} - {tier}', 'zh': '{roll} - {tier} 武器'}
T['Weapon Rank {rank}'] = {'de': 'Waffenrang {rank}', 'es': 'Rango de arma {rank}', 'it': 'Rango arma {rank}',
                           'ja': '武器ランク {rank}', 'ko': '무기 랭크 {rank}', 'pl': 'Ranga broni {rank}',
                           'pt': 'Rank da arma {rank}', 'ru': 'Ранг оружия {rank}', 'tc': '武器等級 {rank}',
                           'th': 'ระดับอาวุธ {rank}', 'tr': 'Silah Seviyesi {rank}', 'uk': 'Ранг зброї {rank}', 'zh': '武器等级 {rank}'}
T['All States'] = {'de': 'Alle Zustände', 'es': 'Todos los estados', 'it': 'Tutti gli stati', 'ja': 'すべての状態',
                   'ko': '모든 상태', 'pl': 'Wszystkie stany', 'pt': 'Todos os estados', 'ru': 'Все состояния',
                   'tc': '所有狀態', 'th': 'ทุกสถานะ', 'tr': 'Tüm Durumlar', 'uk': 'Всі стани', 'zh': '所有状态'}
T['Riven weapons collection'] = {'de': 'Riven-Waffenkollektion', 'es': 'Colección de armas Riven',
                                 'it': 'Collezione di armi Riven', 'ja': 'リーヴン武器コレクション',
                                 'ko': '리븐 무기 컬렉션', 'pl': 'Kolekcja broni Riven',
                                 'pt': 'Coleção de armas Riven', 'ru': 'Коллекция оружия Ривенов',
                                 'tc': '裂罅武器收藏', 'th': 'คอลเลกชันอาวุธริเวน',
                                 'tr': 'Riven Silah Koleksiyonu', 'uk': 'Колекція зброї Рівенів', 'zh': '裂罅武器收藏'}

# Sync / settings
T['Idle'] = {'de': 'Leerlauf', 'es': 'Inactivo', 'it': 'Inattivo', 'ja': '待機中', 'ko': '대기 중',
             'pl': 'Bezczynny', 'pt': 'Ocioso', 'ru': 'Ожидание', 'tc': '閒置', 'th': 'ไม่มีการใช้งาน',
             'tr': 'Boşta', 'uk': 'Очікування', 'zh': '空闲'}
T['Next attempt in {time}'] = {'de': 'Nächster Versuch in {time}', 'es': 'Próximo intento en {time}',
                               'it': 'Prossimo tentativo tra {time}', 'ja': '次回試行まで {time}',
                               'ko': '다음 시도까지 {time}', 'pl': 'Następna próba za {time}',
                               'pt': 'Próxima tentativa em {time}', 'ru': 'Следующая попытка через {time}',
                               'tc': '下次嘗試在 {time} 後', 'th': 'ลองครั้งต่อไปใน {time}',
                               'tr': 'Sonraki deneme {time} içinde', 'uk': 'Наступна спроба через {time}', 'zh': '下次尝试在 {time} 后'}
T['Next update in {time}'] = {'de': 'Nächstes Update in {time}', 'es': 'Próxima actualización en {time}',
                              'it': 'Prossimo aggiornamento tra {time}', 'ja': '次回更新まで {time}',
                              'ko': '다음 업데이트까지 {time}', 'pl': 'Następna aktualizacja za {time}',
                              'pt': 'Próxima atualização em {time}', 'ru': 'Следующее обновление через {time}',
                              'tc': '下次更新在 {time} 後', 'th': 'อัปเดตครั้งต่อไปใน {time}',
                              'tr': 'Sonraki güncelleme {time} içinde', 'uk': 'Наступне оновлення через {time}', 'zh': '下次更新在 {time} 后'}
T['Syncing'] = {'de': 'Synchronisiere', 'es': 'Sincronizando', 'it': 'Sincronizzazione', 'ja': '同期中',
                'ko': '동기화 중', 'pl': 'Synchronizacja', 'pt': 'Sincronizando', 'ru': 'Синхронизация',
                'tc': '同步中', 'th': 'กำลังซิงค์', 'tr': 'Senkronize ediliyor', 'uk': 'Синхронізація', 'zh': '同步中'}
T['Error:'] = {'de': 'Fehler:', 'es': 'Error:', 'it': 'Errore:', 'ja': 'エラー：', 'ko': '오류:',
               'pl': 'Błąd:', 'pt': 'Erro:', 'ru': 'Ошибка:', 'tc': '錯誤：', 'th': 'ข้อผิดพลาด:',
               'tr': 'Hata:', 'uk': 'Помилка:', 'zh': '错误：'}

# Dashboard misc
T['Creds'] = {'de': 'Creds', 'es': 'Créditos', 'it': 'Crediti', 'ja': 'クレジット', 'ko': '크레딧',
              'pl': 'Kredyty', 'pt': 'Créditos', 'ru': 'Кредиты', 'tc': '信用點', 'th': 'เครดิต',
              'tr': 'Krediler', 'uk': 'Кредити', 'zh': '信用点'}
T["Darvo's Deal"] = {'de': 'Darvos Angebot', 'es': 'Oferta de Darvo', 'it': 'Offerta di Darvo',
                     'ja': 'ダーヴォの取引', 'ko': '다르보의 거래', 'pl': 'Oferta Darvo',
                     'pt': 'Oferta do Darvo', 'ru': 'Сделка Дарво', 'tc': '達沃的優惠', 'th': 'ข้อเสนอของดาร์โว',
                     'tr': 'Darvo Fırsatı', 'uk': 'Пропозиція Дарво', 'zh': '达沃的优惠'}
T['Race'] = {'de': 'Rennen', 'es': 'Carrera', 'it': 'Gara', 'ja': 'レース', 'ko': '경주',
             'pl': 'Wyścig', 'pt': 'Corrida', 'ru': 'Гонка', 'tc': '競速', 'th': 'แข่ง',
             'tr': 'Yarış', 'uk': 'Гонка', 'zh': '竞速'}
T['Arbitration Drones'] = {'de': 'Arbitration-Drohnen', 'es': 'Drones de arbitraje', 'it': 'Droni dell\'arbitrato',
                           'ja': 'アービトレーションドローン', 'ko': '중재 드론', 'pl': 'Drony arbitrażu',
                           'pt': 'Drones de arbitragem', 'ru': 'Дроны арбитража', 'tc': '仲裁無人機',
                           'th': 'โดรนอนุญาโตตุลาการ', 'tr': 'Tahkim Dronları', 'uk': 'Дрони арбітражу', 'zh': '仲裁无人机'}
T['Reward'] = {'de': 'Belohnung', 'es': 'Recompensa', 'it': 'Ricompensa', 'ja': '報酬', 'ko': '보상',
               'pl': 'Nagroda', 'pt': 'Recompensa', 'ru': 'Награда', 'tc': '獎勵', 'th': 'รางวัล',
               'tr': 'Ödül', 'uk': 'Нагорода', 'zh': '奖励'}
T["Lyon's Sanctuary"] = {'de': 'Lyons Zuflucht', 'es': 'Santuario de Lyon', 'it': 'Santuario di Lyon',
                         'ja': 'ライオンの聖域', 'ko': '라이온의 성소', 'pl': 'Sanktuarium Lyona',
                         'pt': 'Santuário de Lyon', 'ru': 'Святилище Лиона', 'tc': '萊昂聖殿', 'th': 'สถานศักดิ์สิทธิ์ของไลออน',
                         'tr': 'Lyon Sığınağı', 'uk': 'Святилище Ліона', 'zh': '莱昂圣殿'}
T["Marie's Sanctuary"] = {'de': 'Maries Zuflucht', 'es': 'Santuario de Marie', 'it': 'Santuario di Marie',
                          'ja': 'マリーの聖域', 'ko': '마리의 성소', 'pl': 'Sanktuarium Marie',
                          'pt': 'Santuário da Marie', 'ru': 'Святилище Мари', 'tc': '瑪麗聖殿', 'th': 'สถานศักดิ์สิทธิ์ของมารี',
                          'tr': 'Marie Sığınağı', 'uk': 'Святилище Марі', 'zh': '玛丽圣殿'}
T['MAY'] = {'de': 'MAI', 'es': 'MAY', 'it': 'MAG', 'ja': '5月', 'ko': '5월',
            'pl': 'MAJ', 'pt': 'MAI', 'ru': 'МАЙ', 'tc': '五月', 'th': 'พ.ค.',
            'tr': 'MAYIS', 'uk': 'ТРАВЕНЬ', 'zh': '五月'}
T['NOVEMBER'] = {'de': 'NOVEMBER', 'es': 'NOVIEMBRE', 'it': 'NOVEMBRE', 'ja': '11月', 'ko': '11월',
                 'pl': 'LISTOPAD', 'pt': 'NOVEMBRO', 'ru': 'НОЯБРЬ', 'tc': '十一月', 'th': 'พ.ย.',
                 'tr': 'KASIM', 'uk': 'ЛИСТОПАД', 'zh': '十一月'}
T['Orb Vallis'] = {'de': 'Orb-Vallis', 'es': 'Vallis Orb', 'it': 'Vallis Orb', 'ja': 'オーブ・ヴァリス',
                   'ko': '오브 발리스', 'pl': 'Vallis Orb', 'pt': 'Vallis Orb', 'ru': 'Орб Валлис',
                   'tc': '奧布山谷', 'th': 'ออร์บแวลลิส', 'tr': 'Orb Vallis', 'uk': 'Орб Валліс', 'zh': '奥布山谷'}
T["Roathe's Oblivion"] = {'de': 'Roathes Vergessenheit', 'es': 'El Olvido de Roathe', 'it': 'Oblio di Roathe',
                          'ja': 'ローズの忘却', 'ko': '로스의 망각', 'pl': 'Otchłań Roathe',
                          'pt': 'Oblivion de Roathe', 'ru': 'Забвение Роата', 'tc': '羅斯的湮滅', 'th': 'การลืมเลือนของโรธ',
                          'tr': 'Roathe\'nin Unutuluşu', 'uk': 'Забуття Роата', 'zh': '罗斯的湮灭'}
T['Steel Path'] = {'de': 'Steel Path', 'es': 'Camino de Acero', 'it': 'Percorso d\'Acciaio',
                   'ja': 'スティールパス', 'ko': '스틸 패스', 'pl': 'Stalowa Ścieżka', 'pt': 'Trilha de Aço',
                   'ru': 'Стальной Путь', 'tc': '鋼鐵之路', 'th': 'เส้นทางเหล็กกล้า',
                   'tr': 'Çelik Yol', 'uk': 'Сталевий Шлях', 'zh': '钢铁之路'}
T['Day'] = {'de': 'Tag', 'es': 'Día', 'it': 'Giorno', 'ja': '昼', 'ko': '낮',
            'pl': 'Dzień', 'pt': 'Dia', 'ru': 'День', 'tc': '白天', 'th': 'กลางวัน',
            'tr': 'Gündüz', 'uk': 'День', 'zh': '白天'}
T['fri'] = {'de': 'fr', 'es': 'vie', 'it': 'ven', 'ja': '金', 'ko': '금',
            'pl': 'pt', 'ru': 'пт', 'tc': '五', 'th': 'ศ.',
            'tr': 'cum', 'uk': 'пт', 'zh': '五'}
T['mon'] = {'de': 'mo', 'es': 'lun', 'it': 'lun', 'ja': '月', 'ko': '월',
            'pl': 'pon', 'ru': 'пн', 'tc': '一', 'th': 'จ.',
            'tr': 'pzt', 'uk': 'пн', 'zh': '一'}
T['tue'] = {'de': 'di', 'es': 'mar', 'it': 'mar', 'ja': '火', 'ko': '화',
            'pl': 'wt', 'ru': 'вт', 'tc': '二', 'th': 'อ.',
            'tr': 'sal', 'uk': 'вт', 'zh': '二'}
T['wed'] = {'de': 'mi', 'es': 'mié', 'it': 'mer', 'ja': '水', 'ko': '수',
            'pl': 'śr', 'ru': 'ср', 'tc': '三', 'th': 'พ.',
            'tr': 'çar', 'uk': 'ср', 'zh': '三'}
T['Cambion Drift'] = {'de': 'Cambion-Drift', 'es': 'Dérive Cambion', 'it': 'Deriva Cambion',
                      'ja': 'デュヴィリ', 'ko': '듀비리', 'pl': 'Dryf Kambionu', 'pt': 'Deriva de Cambion',
                      'ru': 'Камбионский Дрейф', 'tc': '魔裔禁地', 'th': 'แคมบิออนดริฟต์',
                      'tr': 'Cambion Düzlüğü', 'uk': 'Кембіонська течія', 'zh': '魔胎之境'}
T['Mobile Interception'] = {'de': 'Mobile Abfangmission', 'es': 'Intercepción móvil', 'it': 'Intercettazione mobile',
                            'ja': '移動式傍受', 'ko': '이동식 감청', 'pl': 'Mobilna intercepcja',
                            'pt': 'Interceptação móvel', 'ru': 'Мобильное перехватывание', 'tc': '移動攔截',
                            'th': 'การสกัดกั้นเคลื่อนที่', 'tr': 'Mobil Önleme', 'uk': 'Мобільне перехоплення', 'zh': '移动拦截'}

# Inventory misc
T['Optimal Fill Order'] = {'de': 'Optimale Füllreihenfolge', 'es': 'Orden de llenado óptimo',
                           'it': 'Ordine di riempimento ottimale', 'ja': '最適な補充順序',
                           'ko': '최적 충전 순서', 'pl': 'Optymalna kolejność wypełniania',
                           'pt': 'Ordem de preenchimento ideal', 'ru': 'Оптимальный порядок заполнения',
                           'tc': '最佳填充順序', 'th': 'ลำดับการเติมที่เหมาะสมที่สุด',
                           'tr': 'Optimal Doldurma Sırası', 'uk': 'Оптимальний порядок заповнення', 'zh': '最佳填充顺序'}
T['Ready'] = {'de': 'Bereit', 'es': 'Listo', 'it': 'Pronto', 'ja': '準備完了', 'ko': '준비 완료',
              'pl': 'Gotowy', 'pt': 'Pronto', 'ru': 'Готово', 'tc': '就緒', 'th': 'พร้อม',
              'tr': 'Hazır', 'uk': 'Готово', 'zh': '就绪'}
T['Requires:'] = {'de': 'Benötigt:', 'es': 'Requiere:', 'it': 'Richiede:', 'ja': '必要：', 'ko': '필요:',
                  'pl': 'Wymaga:', 'pt': 'Requer:', 'ru': 'Требуется:', 'tc': '需要：', 'th': 'ต้องใช้:',
                  'tr': 'Gerektirir:', 'uk': 'Потребує:', 'zh': '需要：'}
T['Prime Sets'] = {'de': 'Prime-Sets', 'es': 'Conjuntos Prime', 'it': 'Set Prime', 'ja': 'プライムセット',
                   'ko': '프라임 세트', 'pl': 'Zestawy Prime', 'pt': 'Conjuntos Prime', 'ru': 'Наборы Прайм',
                   'tc': 'Prime 套裝', 'th': 'ชุดไพรม์', 'tr': 'Prime Setleri', 'uk': 'Набори Прайм', 'zh': 'Prime 套装'}
T['Weapons'] = {'de': 'Waffen', 'es': 'Armas', 'it': 'Armi', 'ja': '武器', 'ko': '무기',
                'pl': 'Broń', 'pt': 'Armas', 'ru': 'Оружие', 'tc': '武器', 'th': 'อาวุธ',
                'tr': 'Silahlar', 'uk': 'Зброя', 'zh': '武器'}
T['Unowned'] = {'de': 'Nicht besessen', 'es': 'No poseído', 'it': 'Non posseduto', 'ja': '未所持',
                'ko': '미보유', 'pl': 'Nieposiadany', 'pt': 'Não possuído', 'ru': 'Не в наличии',
                'tc': '未擁有', 'th': 'ยังไม่ครอบครอง', 'tr': 'Sahip olunmayan', 'uk': 'Не в наявності', 'zh': '未拥有'}

# notif mgr
T['Interval (min)'] = {'de': 'Intervall (Min.)', 'es': 'Intervalo (min)', 'it': 'Intervallo (min)',
                       'ja': '間隔（分）', 'ko': '간격 (분)', 'pl': 'Interwał (min)',
                       'pt': 'Intervalo (min)', 'ru': 'Интервал (мин)', 'tc': '間隔（分鐘）',
                       'th': 'ช่วงเวลา (นาที)', 'tr': 'Aralık (dk)', 'uk': 'Інтервал (хв)', 'zh': '间隔（分钟）'}
T['Mission Types'] = {'de': 'Missionstypen', 'es': 'Tipos de misión', 'it': 'Tipi di missione',
                      'ja': 'ミッションタイプ', 'ko': '미션 유형', 'pl': 'Typy misji',
                      'pt': 'Tipos de missão', 'ru': 'Типы миссий', 'tc': '任務類型',
                      'th': 'ประเภทภารกิจ', 'tr': 'Görev Türleri', 'uk': 'Типи місій', 'zh': '任务类型'}
T['Mastery Rank Up'] = {'de': 'Meisterschaftsrang aufsteigen', 'es': 'Subir rango de maestría',
                        'it': 'Aumento di rango maestria', 'ja': 'マスタリーランクアップ',
                        'ko': '마스터리 랭크 업', 'pl': 'Awans rangi mistrzostwa',
                        'pt': 'Aumento de rank de maestria', 'ru': 'Повышение ранга мастерства',
                        'tc': '段位升級', 'th': 'เลื่อนระดับมาสเตอร์รี',
                        'tr': 'Ustalık Seviyesi Yükselt', 'uk': 'Підвищення рангу майстерності', 'zh': '段位升级'}

# riven overlay
T['Avg Value'] = {'de': 'Ø-Wert', 'es': 'Valor medio', 'it': 'Valore medio', 'ja': '平均価値',
                  'ko': '평균 가치', 'pl': 'Średnia wartość', 'pt': 'Valor médio', 'ru': 'Средняя цена',
                  'tc': '平均價值', 'th': 'มูลค่าเฉลี่ย', 'tr': 'Ortalama Değer', 'uk': 'Середня цінність', 'zh': '平均价值'}
T['Reroll Potential'] = {'de': 'Neuroll-Potenzial', 'es': 'Potencial de reroll', 'it': 'Potenziale di reroll',
                         'ja': 'リロール潜在力', 'ko': '리롤 잠재력', 'pl': 'Potencjał rerolla',
                         'pt': 'Potencial de reroll', 'ru': 'Потенциал переброски', 'tc': '重骰潛力',
                         'th': 'ศักยภาพรีโรล', 'tr': 'Yeniden Zar Potansiyeli', 'uk': 'Потенціал перекидання', 'zh': '重掷潜力'}
T['Your Value'] = {'de': 'Dein Wert', 'es': 'Tu valor', 'it': 'Il tuo valore', 'ja': 'あなたの価値',
                   'ko': '내 가치', 'pl': 'Twoja wartość', 'pt': 'Seu valor', 'ru': 'Ваша цена',
                   'tc': '你的價值', 'th': 'มูลค่าของคุณ', 'tr': 'Senin Değerin', 'uk': 'Ваша цінність', 'zh': '你的价值'}
T['Average Value'] = {'de': 'Durchschnittswert', 'es': 'Valor promedio', 'it': 'Valore medio', 'ja': '平均価値',
                      'ko': '평균 가치', 'pl': 'Średnia wartość', 'pt': 'Valor médio', 'ru': 'Средняя цена',
                      'tc': '平均價值', 'th': 'มูลค่าเฉลี่ย', 'tr': 'Ortalama Değer', 'uk': 'Середня цінність', 'zh': '平均价值'}

# Descendia penance descriptions (special: EN text was garbled in one, FR is reference)
T['Infested Boyband.'] = {'de': 'Infested-Boyband.', 'es': 'Boyband Infestada.', 'it': 'Boyband Infested.',
                          'ja': 'インフェステッド・ボーイバンド。', 'ko': '인페스티드 보이밴드.',
                          'pl': 'Boyband Infested.', 'pt': 'Boyband infestada.', 'ru': 'Бойбенд Заражённых.',
                          'tc': '感染者男團。', 'th': 'บอยแบนด์อินเฟสเต็ด', 'tr': 'Infested Erkek Grubu.',
                          'uk': 'Бойбенд Заражених.', 'zh': '感染者男团。'}

# Remaining leaks (round 2)
T['Open source Warframe companion'] = {
    'de': 'Open-Source-Warframe-Begleiter', 'es': 'Compañero open source de Warframe',
    'it': 'Compagno open source di Warframe', 'ja': 'オープンソースのWarframeコンパニオン',
    'ko': '오픈소스 워프레임 동반자', 'pl': 'Otwartoźródłowy towarzysz Warframe',
    'pt': 'Companheiro open source de Warframe', 'ru': 'Компаньон Warframe с открытым исходным кодом',
    'tc': '開放原始碼的 Warframe 伴侶工具', 'th': 'คอมพานิออนโอเพนซอร์สของ Warframe',
    'tr': 'Açık kaynak Warframe yardımcı uygulaması', 'uk': 'Компаньйон Warframe з відкритим кодом',
    'zh': '开源的 Warframe 伴侣工具'}
T['Legendary Rank'] = {'de': 'Legendärer Rang', 'es': 'Rango legendario', 'it': 'Rango leggendario',
                       'ja': 'レジェンダリーランク', 'ko': '전설 랭크', 'pl': 'Legendarna ranga',
                       'pt': 'Rank lendário', 'ru': 'Легендарный ранг', 'tc': '傳奇段位',
                       'th': 'ระดับตำนาน', 'tr': 'Efsanevi Seviye', 'uk': 'Легендарний ранг', 'zh': '传奇段位'}
T['Non-Mastery'] = {'de': 'Keine Meisterschaft', 'es': 'Sin maestría', 'it': 'Non maestria',
                    'ja': 'マスタリー外', 'ko': '마스터리 아님', 'pl': 'Poza mistrzostwem',
                    'pt': 'Não-maestria', 'ru': 'Не мастерство', 'tc': '非段位',
                    'th': 'ไม่ใช่มาสเตอร์รี', 'tr': 'Ustalık Dışı', 'uk': 'Не майстерність', 'zh': '非段位'}
T['Welcome to Cephalon Kronos'] = {'de': 'Willkommen bei Cephalon Kronos', 'es': 'Bienvenido a Cephalon Kronos',
                                   'it': 'Benvenuto in Cephalon Kronos', 'ja': 'Cephalon Kronos へようこそ',
                                   'ko': 'Cephalon Kronos에 오신 것을 환영합니다', 'pl': 'Witaj w Cephalon Kronos',
                                   'pt': 'Bem-vindo ao Cephalon Kronos', 'ru': 'Добро пожаловать в Cephalon Kronos',
                                   'tc': '歡迎使用 Cephalon Kronos', 'th': 'ยินดีต้อนรับสู่ Cephalon Kronos',
                                   'tr': 'Cephalon Kronos\'a hoş geldiniz', 'uk': 'Ласкаво просимо до Cephalon Kronos',
                                   'zh': '欢迎使用 Cephalon Kronos'}
T['Defeat a Sister of Parvos ## 6. Docs update (readme+wiki+architecture.md+webpage) (preferably one last time after all feature issues are done)or Kuva Lich.'] = {
    'de': 'Besiege eine Schwester von Parvos oder einen Kuva-Lich.',
    'es': 'Derrota a una Hermana de Parvos o a un Lich Kuva.',
    'it': 'Sconfiggi una Sorella di Parvos o un Lich Kuva.',
    'ja': 'パルヴォスの妹かクヴァ・リッチを倒せ。',
    'ko': '파르보스의 자매 또는 쿠바 리치를 처치하세요.',
    'pl': 'Pokonaj Siostrę Parvosa lub Licha Kuva.',
    'pt': 'Derrote uma Irmã de Parvos ou um Lich Kuva.',
    'ru': 'Одержите победу над Сестрой Парвоса или Личем Кувы.',
    'tc': '擊敗帕爾沃斯的姐妹或赤毒巫妖。',
    'th': 'ปราบซิสเตอร์แห่งพาร์วอสหรือลิชคูวา',
    'tr': 'Parvos\'un Kız Kardeşini veya bir Kuva Lich\'i yen.',
    'uk': 'Переможіть Сестру Парвоса або Ліча Куви.',
    'zh': '击败帕尔沃斯的姐妹或赤毒巫妖。'}
T['Orb Vallis'] = {'de': 'Orb-Vallis', 'es': 'Vallis Orb', 'it': 'Vallis Orb', 'ja': 'オーブ・ヴァリス',
                   'ko': '오브 발리스', 'pl': 'Vallis Orb', 'pt': 'Vallis Orb', 'ru': 'Орб Валлис',
                   'tc': '奧布山谷', 'th': 'ออร์บแวลลิส', 'tr': 'Orb Vallis', 'uk': 'Орб Валліс', 'zh': '奥布山谷'}
T["Roathe's Oblivion"] = {'de': 'Roathes Vergessenheit', 'es': 'El Olvido de Roathe', 'it': 'Oblio di Roathe',
                          'ja': 'ローズの忘却', 'ko': '로스의 망각', 'pl': 'Otchłań Roathe',
                          'pt': 'Oblivion de Roathe', 'ru': 'Забвение Роата', 'tc': '羅斯的湮滅', 'th': 'การลืมเลือนของโรธ',
                          'tr': 'Roathe\'nin Unutuluşu', 'uk': 'Забуття Роата', 'zh': '罗斯的湮灭'}
T['Season'] = {'de': 'Saison', 'es': 'Temporada', 'it': 'Stagione', 'ja': 'シーズン', 'ko': '시즌',
               'pl': 'Sezon', 'pt': 'Temporada', 'ru': 'Сезон', 'tc': '季節', 'th': 'ฤดูกาล',
               'tr': 'Sezon', 'uk': 'Сезон', 'zh': '季节'}
T['of'] = {'de': 'von', 'es': 'de', 'it': 'di', 'ja': '/', 'ko': '/', 'pl': 'z', 'pt': 'de',
           'ru': 'из', 'tc': '，共', 'th': 'จาก', 'tr': '/', 'uk': 'з', 'zh': '，共'}
T['N/A'] = {'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': '該当なし', 'ko': '해당 없음',
            'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '無', 'th': 'ไม่มี',
            'tr': 'Yok', 'uk': 'Н/Д', 'zh': '无'}
T['Rank'] = {'de': 'Rang', 'es': 'Rango', 'it': 'Rango', 'ja': 'ランク', 'ko': '랭크',
             'pl': 'Ranga', 'pt': 'Rank', 'ru': 'Ранг', 'tc': '等級', 'th': 'ระดับ',
             'tr': 'Seviye', 'uk': 'Ранг', 'zh': '等级'}
T['Cambion Drift'] = {'de': 'Cambion-Drift', 'es': 'Dérive Cambion', 'it': 'Deriva Cambion',
                      'ja': 'デュヴィリ', 'ko': '듀비리', 'pl': 'Dryf Kambionu', 'pt': 'Deriva de Cambion',
                      'ru': 'Камбионский Дрейф', 'tc': '魔裔禁地', 'th': 'แคมบิออนดริฟต์',
                      'tr': 'Cambion Düzlüğü', 'uk': 'Кембіонська течія', 'zh': '魔胎之境'}
T['Gas'] = {'de': 'Gas', 'es': 'Gas', 'it': 'Gas', 'ja': 'ガス', 'ko': '가스', 'pl': 'Gaz',
            'pt': 'Gás', 'ru': 'Газ', 'tc': '氣體', 'th': 'แก๊ส', 'tr': 'Gaz', 'uk': 'Газ', 'zh': '气体'}
T['Pistol'] = {'de': 'Pistole', 'es': 'Pistola', 'it': 'Pistola', 'ja': 'ピストル', 'ko': '피스톨',
               'pl': 'Pistolet', 'pt': 'Pistola', 'ru': 'Пистолет', 'tc': '手槍', 'th': 'ปืนพก',
               'tr': 'Tabanca', 'uk': 'Пістолет', 'zh': '手枪'}
T['fri'] = {'de': 'fr', 'es': 'vie', 'it': 'ven', 'ja': '金', 'ko': '금', 'pl': 'pt', 'pt': 'sex',
            'ru': 'пт', 'tc': '五', 'th': 'ศ.', 'tr': 'cum', 'uk': 'пт', 'zh': '五'}
T['mon'] = {'de': 'mo', 'es': 'lun', 'it': 'lun', 'ja': '月', 'ko': '월', 'pl': 'pon', 'pt': 'seg',
            'ru': 'пн', 'tc': '一', 'th': 'จ.', 'tr': 'pzt', 'uk': 'пн', 'zh': '一'}
T['tue'] = {'de': 'di', 'es': 'mar', 'it': 'mar', 'ja': '火', 'ko': '화', 'pl': 'wt', 'pt': 'ter',
            'ru': 'вт', 'tc': '二', 'th': 'อ.', 'tr': 'sal', 'uk': 'вт', 'zh': '二'}
T['wed'] = {'de': 'mi', 'es': 'mié', 'it': 'mer', 'ja': '水', 'ko': '수', 'pl': 'śr', 'pt': 'qua',
            'ru': 'ср', 'tc': '三', 'th': 'พ.', 'tr': 'çar', 'uk': 'ср', 'zh': '三'}

# Apply
print("=== Applying translations where FR leak exists ===")
applied = 0
skipped_keys = []
for key in sorted(en_ui):
    en_val = en_ui[key]
    if not isinstance(en_val, str):
        continue
    fr_val = fr_ui.get(key, en_val)
    if en_val not in T:
        continue
    trans = T[en_val]
    for lo in LOCALES:
        current = locale_files[lo]['ui'].get(key)
        # only replace exact FR leaks
        if isinstance(current, str) and current == fr_val and current != en_val:
            new_val = trans.get(lo)
            if new_val is None:
                continue
            locale_files[lo]['ui'][key] = new_val
            applied += 1

print(f"Applied {applied} translation fixes")

# Save
for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print("Saved all 13 locale files.")
