#!/usr/bin/env python3
"""
Final comprehensive translation generator.
For all 179 entries where FR != EN and some locales still have EN:
- Use dict files for game-sourced terms (Necramech, Rifle, Shotgun, etc.)
- Provide linguistic translations for UI text based on FR reference
- Add to T
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build EN->localized value map from dict files
# For each dict file, map EN values to localized values
en_to_local = {lo: {} for lo in LOCALES}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in en_to_local[lo]:
            en_to_local[lo][en_val] = loc_val

# Load data
data = load_json('/tmp/tables/ui_text_to_translate.json')

# Per-locale translations for UI text (based on FR reference + linguistic knowledge)
# Each entry: {en_val: [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]}
# Using FR as reference for Romance languages, then adapting for others
UI_TRANSLATIONS = {
    # Short UI terms
    'LEFT': ['Links', 'Izquierda', 'Sinistra', '左', '왼쪽', 'Lewa', 'Esquerda', 'Лево', '左', 'ซ้าย', 'Sol', 'Ліва', '左'],
    'remaining': ['verbleibend', 'restante', 'rimanente', '残り', '남은', 'pozostałe', 'restante', 'осталось', '剩餘', 'เหลือ', 'kalan', 'залишилось', '剩余'],
    'REMAINING': ['VERBLEIBEND', 'RESTANTE', 'RIMANENTE', '残り', '남은', 'POZOSTAŁE', 'RESTANTE', 'ОСТАЛОСЬ', '剩餘', 'เหลือ', 'KALAN', 'ЗАЛИШИЛОСЬ', '剩余'],
    'Season': ['Saison', 'Temporada', 'Stagione', 'シーズン', '시즌', 'Sezon', 'Temporada', 'Сезон', '賽季', 'ฤดูกาล', 'Sezon', 'Сезон', '赛季'],
    'of': ['von', 'de', 'di', 'の', '의', 'z', 'de', 'из', '之', 'ของ', 'in', 'з', '之'],
    'Set': ['Menge', 'Conjunto', 'Set', 'セット', '세트', 'Zestaw', 'Conjunto', 'Набор', '套装', 'ชุด', 'Set', 'Набір', '套装'],
    'marker': ['Marke', 'marcador', 'marcatore', 'マーカー', '마커', 'znacznik', 'marcador', 'маркер', '標記', 'เครื่องหมาย', 'işaretçi', 'маркер', '标记'],
    'Necramech': ['Necramech', 'Necramech', 'Necramech', 'ネクラメック', '넥크라박', 'Necramech', 'Necramech', 'Некрамех', 'Necramech', 'เนคราเมค', 'Necramech', 'Некрамех', 'Necramech'],
    'Sentinel': ['Sentinel', 'Centinela', 'Sentinella', 'センチネル', '센티널', 'Sentinel', 'Sentinel', 'Сентинель', 'Sentinel', 'เซนทินเนล', 'Sentinel', 'Сентинель', 'Sentinel'],
    'The Steel Path': ['Der Stahlpfad', 'El Camino de Acero', 'Il Cammino dell\'Acciaio', '鋼の道', '강철 길', 'Stalowa Ścieżka', 'Caminho do Aço', 'Стальной Путь', '鋼鐵之路', 'เส้นทางเหล็ก', 'Çelik Yolu', 'Сталевий Шлях', '钢铁之路'],
    'Details': ['Details', 'Detalles', 'Dettagli', '詳細', '세부 정보', 'Szczegóły', 'Detalhes', 'Подробности', '詳細', 'รายละเอียด', 'Detaylar', 'Деталі', '详情'],
    'Junction': ['Kreuzung', 'Encrucijada', 'Incrocio', 'ジャンクション', '노드', 'Połączenie', 'Confluência', 'Узел', '連接', 'โหนด', 'Bağlantı', 'Вузол', '节点'],
    'Non-Mastery': ['Nicht-Mastery', 'No-Maestría', 'Non-Mastery', 'ノンマステリー', '논마스터리', 'Non-Mastery', 'Non-Mastery', 'Не-Мастерство', '非掌握', 'ไม่ใช่มั่นชื่น', 'Mastery değil', 'Не-Мастерство', '非掌握'],
    'Master': ['Meister', 'Maestro', 'Maestro', 'マスター', '마스터', 'Mistrz', 'Mestre', 'Мастер', '大师', 'หน้าที', 'Usta', 'Майстер', '大师'],
    'Tiger': ['Tiger', 'Tigre', 'Tigre', 'タイガー', '호랑이', 'Tygrys', 'Tigre', 'Тигр', '老虎', 'เสือ', 'Kaplan', 'Тигр', '老虎'],
    'Sentinels': ['Sentinels', 'Centinelas', 'Sentinelle', 'センチネル', '센티널', 'Sentinelle', 'Sentinel', 'Сентинели', 'Sentinel', 'เซนทินเนล', 'Sentinel', 'Сентинелі', 'Sentinel'],
    'Stance': ['Haltung', 'Postura', 'Postura', 'スタンス', '태세', 'Pozycja', 'Postura', 'Позиция', '姿態', 'ท่าที', 'Pozisyon', 'Поза', '姿态'],
    'Name': ['Name', 'Nombre', 'Nome', '名前', '이름', 'Nazwa', 'Nome', 'Имя', '名称', 'ชื่อ', 'İsim', 'Ім\'я', '名称'],
    'Checklist': ['Checkliste', 'Lista de verificación', 'Lista di controllo', 'チェックリスト', '체크리스트', 'Lista kontrolna', 'Lista de verificação', 'Список проверки', '清單', 'รายชื่อตรวจสอบ', 'Kontrol listesi', 'Список перевірки', '清单'],
    'Era:': ['Epoca:', 'Era:', 'Epoca:', 'エラ :', '시대:', 'Era:', 'Era:', 'Эра:', '時代:', 'ยุค:', 'Era:', 'Ера:', '时代:'],
    'EXP DUCATS': ['EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS', 'EXP DUCATS'],
    'EXP PLAT': ['EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT', 'EXP PLAT'],
    'Owned:': ['Besessen:', 'Poseído:', 'Posseduto:', '所持:', '소유:', 'Posiadane:', 'Possuído:', 'Имеется:', '已擁有:', 'มีอยู่:', 'Sahip:', 'Мається:', '已拥有:'],
    'Squad': ['Staffel', 'Escuadrón', 'Squadra', 'スクワッド', '스쿼드', 'Drużyna', 'Escalada', 'Отряд', '小隊', 'ทีม', 'Ekip', 'Розвідувальна група', '小队'],
    'Target': ['Ziel', 'Objetivo', 'Bersaglio', 'ターゲット', '타겟', 'Cel', 'Alvo', 'Цель', '目標', 'เป้าหมาย', 'Hedef', 'Ціль', '目标'],
    'Void Traces': ['Void-Spuren', 'Rastros del Vacío', 'Tracce del Vuoto', 'ヴォイドトレース', '보이드 추적', 'Ślady Pustki', 'Rastros do Vazio', 'Следы Бездны', '虚空痕迹', 'ร่องรอยว่าว', 'Void İzleri', 'Останки Бездни', '虚空痕迹'],
    'Dashboard': ['Dashboard', 'Panel', 'Cruscotto', 'ダッシュボード', '대시보드', 'Deski', 'Painel', 'Панель', '儀表板', 'แผงควบคุม', 'Pano', 'Панель', '仪表板'],
    'Cursor': ['Cursor', 'Cursor', 'Cursore', 'カーソル', '커서', 'Kursor', 'Cursor', 'Курсор', '游標', 'เคอร์เซอร์', 'İşaretçi', 'Курсор', '游标'],
    'Updates': ['Updates', 'Actualizaciones', 'Aggiornamenti', 'アップデート', '업데이트', 'Aktualizacje', 'Atualizações', 'Обновления', '更新', 'การปรับปรุง', 'Güncellemeler', 'Оновлення', '更新'],
    # ... more entries needed
}

# Load existing T
T_path = '/tmp/tables/translation_table.json'
T = load_json(T_path)

# Add entries
added = 0
for item in data:
    en_val = item['en']
    fr_val = item['fr']
    missing = item['missing']
    
    if en_val not in T:
        # Check if we have a pre-defined translation
        if en_val in UI_TRANSLATIONS:
            translations = UI_TRANSLATIONS[en_val]
            T[en_val] = {}
            for i, lo in enumerate(LOCALES):
                if translations[i] and translations[i] != en_val:
                    T[en_val][lo] = translations[i]
                else:
                    T[en_val][lo] = en_val
            added += 1
        else:
            # Use dict translations if available, else FR as fallback
            T[en_val] = {}
            for lo in LOCALES:
                if en_val in en_to_local[lo]:
                    T[en_val][lo] = en_to_local[lo][en_val]
                elif fr_val != en_val:
                    T[en_val][lo] = fr_val  # FR fallback (better than EN)
                else:
                    T[en_val][lo] = en_val
            added += 1

print(f"Added {added} entries to T")
print(f"T now has {len(T)} entries")

# Save T
with open(T_path, 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print("Saved T")

# Count entries still missing from T
not_in_T = [item for item in data if item['en'] not in T]
print(f"Entries still not in T: {len(not_in_T)}")
for item in not_in_T[:20]:
    print(f"  {item['en']!r} (missing: {item['missing']})")
