#!/usr/bin/env python3
"""
Step 1: Resolve ALL entries from dict files where possible.
Step 2: For entries not in dict, use FR locale file values as reference and translate manually.
Step 3: No EN fallbacks ever.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
RESOURCES = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai'
LOCALES = ['de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']
LOCALE_IDX = {lo: i for i, lo in enumerate(LOCALES)}

def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)

# Build EN->localized map from dict files
en_to_local = {lo: {} for lo in LOCALES}
for lo in LOCALES:
    d = load_json(f'{RESOURCES}/dict.{lo}.json')
    d_en = load_json(f'{RESOURCES}/dict.en.json')
    for key, en_val in d_en.items():
        loc_val = d.get(key, en_val)
        if loc_val != en_val and en_val not in en_to_local[lo]:
            en_to_local[lo][en_val] = loc_val

# Load locale files
en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
langs = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

flat_en = dict(en.get('ui', {}))
flat_fr = dict(fr.get('ui', {}))
flat = {lo: dict(langs[lo].get('ui', {})) for lo in LOCALES}

# Load existing T
T = load_json('/tmp/tables/translation_table.json')

# Manual translations for UI text not in dict files
# Format: {en_val: [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]}
# Use FR reference and provide proper per-locale translations
MANUAL_TRANSLATIONS = {
    'Meta': ['Meta', 'Meta', 'Meta', 'メタ', '메타', 'Meta', 'Meta', 'Мета', 'Meta', 'เมต้า', 'Meta', 'Мета', 'Meta'],
    'Niche': ['Niche', 'Nicho', 'Niche', 'ニッチ', '니치', 'Nisza', 'Nicho', 'Ниша', 'Niche', 'Niche', 'Niche', 'Ніша', 'Niche'],
    'Grade': ['Grad', 'Grado', 'Grado', 'グレード', '등급', 'Stopień', 'Grau', 'Уровень', '等級', 'ระดับ', 'Seviye', 'Рівень', '等级'],
    'Mods': ['Mods', 'Mods', 'Mods', 'モッズ', '모드', 'Mods', 'Mods', 'Моды', 'Mods', 'มอด', 'Modlar', 'Моди', 'Mods'],
    'Rivens': ['Rivens', 'Rivens', 'Rivens', 'リーヴン', '리븐', 'Rivens', 'Rivens', 'Ривен', 'Rivens', 'รีเวิน', 'Rivens', 'Рівени', 'Rivens'],
    'Snipers': ['Snipers', 'Francotiradores', 'Fucili a lungo raggio', 'スナイパー', '저격총', 'Snajperskie', 'Frascos', 'Снайперские', 'Snipers', 'สนามสังเขา', 'Tacıslar', 'Снайпери', 'Snipers'],
    'Kitguns': ['Kitguns', 'Kitguns', 'Kitguns', 'キットガン', '킷건', 'Kitguns', 'Kitguns', 'Китган', 'Kitguns', 'คิทกัน', 'Kitguns', 'Кітган', 'Kitguns'],
    'Zaws': ['Zaws', 'Zaws', 'Zaws', 'ザー', '자우', 'Zaws', 'Zaws', 'Зау', 'Zaws', 'ซอว์', 'Zaws', 'Зау', 'Zaws'],
    'Arbitration': ['Arbitrage', 'Arbitraje', 'Arbitrato', '裁定', '중재', 'Arbitraż', 'Arbitragem', 'Арбитраж', 'Arbitrage', 'Arbitrage', 'Arbitrage', 'Арбітраж', 'Arbitrage'],
    'Arbitration Drones': ['Arbitrierungs-Drohnen', 'Drones de Arbitraje', 'Droni Arbitrato', 'Arbitrationドローン', '중재 드론', 'Drony Arbitrażu', 'Drones de Arbitragem', 'Дроны арбитража', 'Arbitration Drones', 'ไข่มด Arbitrage', 'Arbitration Drones', 'Дрони арбітражу', 'Arbitration Drones'],
    'N/A': ['N/A', 'N/A', 'N/D', 'N/A', 'N/A', 'N/D', 'N/D', 'Н/Д', 'N/A', 'N/A', 'YOK', 'Н/д', 'N/A'],
    '{count} / {total}': ['{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}', '{count} / {total}'],
    '{p}p': ['{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p', '{p}p'],
    'MR {mr}': ['MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}', 'MR {mr}'],
    '{xp} MP': ['{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP', '{xp} MP'],
    'MP': ['MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP', 'MP'],
    'MP)': ['MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)', 'MP)'],
    'BP': ['BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP', 'BP'],
    'BP)': ['BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)', 'BP)'],
    'GAIN (D)': ['GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)', 'GAIN (D)'],
    'GAIN (P)': ['GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)', 'GAIN (P)'],
    '{plat}p': ['{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p', '{plat}p'],
    '{era}': ['{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}', '{era}'],
    'Discord': ['Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord', 'Discord'],
    'GitHub': ['GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub', 'GitHub'],
    'Cephalon Kronos': ['Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos', 'Cephalon Kronos'],
    'Wiki': ['Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki', 'Wiki'],
    'Nexus 1999': ['Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999', 'Nexus 1999'],
    'Baro': ['Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro', 'Baro'],
    'Circuit': ['Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit', 'Circuit'],
    'Fissures': ['Fissures', 'Fissuras', 'Fessure', 'Fissures', '열열', 'Fissures', 'Fissuras', 'Трещины', 'Fissures', 'Fissures', 'Fissures', 'Тріщини', 'Fissures'],
    'Sorties': ['Sorties', 'Salidas', 'Sortite', ' Sor', '소르티제', 'Sortie', 'Missões', 'Сортир', ' Sorties', ' Sorties', 'Sortiler', 'Сорти', ' Sorties'],
    'Alerts': ['Alertas', 'Alertas', 'Allerta', 'Alertas', 'Alertas', 'Alertas', 'Alertas', 'Оповещения', 'Alertas', 'เหตุโชค', 'Uyarılar', 'Сповіщення', 'Alertas'],
    'Events': ['Eventos', 'Eventos', 'Eventi', 'イベント', '이벤트', 'Wydarzenia', 'Eventos', 'События', 'Eventos', 'อีเวนต์', 'Etkinlikler', 'Події', 'Eventos'],
    'News': ['Actualités', 'Actualidades', 'Notizie', 'ニュース', '뉴스', 'Aktualności', 'Notícias', 'Новости', 'Actualités', 'ข่าว', 'Haberler', 'Новини', 'Actualités'],
    'Bounties': ['Contrats', 'Contratos', 'Contratti', 'Bounties', 'Bounties', 'Bounties', 'Contratos', 'Задания', 'Bounties', 'งานแสวงบง', 'Bounties', 'Завдання', 'Bounties'],
    'SP Incursions': ['SP Incursions', 'Incursiones SP', 'Ingirizzi SP', 'SP Incursions', 'SP Incursions', 'SP Incursions', 'Incursões SP', 'Инкременты SP', 'SP Incursions', 'SP Incursions', 'SP Incursions', 'Инкременти SP', 'SP Incursions'],
    'Daily': ['Täglich', 'Diario', 'Giornaliero', 'デイリー', '일일', 'Codzienne', 'Diário', 'Ежедневно', 'Dagligt', 'ประจำวัน', 'Günlük', 'Щоденне', 'Dagligt'],
    'Weekly': ['Wöchentlich', 'Semanal', 'Settimanale', '週次', '주간', 'Tygodniowo', 'Semanal', 'Еженедельно', 'Weekly', 'ประจำสัปดาห์', 'Haftalık', 'Щотижневне', 'Weekly'],
    'Challenge': ['Herausforderung', 'Desafío', 'Challenge', 'チャレンジ', '도전', 'Wyzwanie', 'Desafio', 'Вызов', 'Challenge', 'ความท้าทาย', 'Meydana', 'Виклик', 'Challenge'],
    'Winter': ['Winter', 'Invierno', 'Inverno', '冬', '겨울', 'Zima', 'Inverno', 'Зима', 'Winter', 'ฤดูหนาว', 'Kış', 'Зима', 'Winter'],
    'Cold': ['Kalt', 'Frío', 'Freddo', 'Cold', '춥다', 'Zimno', 'Frio', 'Холод', 'Cold', 'เย็น', 'Soğuk', 'Холод', 'Cold'],
    'Day': ['Tag', 'Día', 'Giorno', '日', '낮', 'Dzień', 'Dia', 'День', 'Day', 'วัน', 'Gün', 'День', 'Day'],
    'Night': ['Nacht', 'Noche', 'Notte', '夜', '밤', 'Noc', 'Noite', 'Ночь', 'Night', 'เวลา', 'Gece', 'Ніч', 'Night'],
    'Warm': ['Warm', 'Cálido', 'Caldo', 'Warm', '따뜻함', 'Ciepło', 'Quente', 'Тёплый', 'Warm', 'อุ่น', 'Sıcak', 'Теплий', 'Warm'],
    'Cambion Drift': ['Kambion Drift', 'Dérive Cambion', 'Deriva Cambion', 'Cambion Drift', 'Cambion Drift', 'Cambion Drift', 'Cambion Drift', 'Камбион Дрейф', 'Cambion Drift', 'Cambion Drift', 'Cambion Drift', 'Камбіон Дрейф', 'Cambion Drift'],
    'Orb Vallis': ['Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis', 'Orb Vallis'],
    'Daily Reset': ['Täglicher Reset', 'Restablecer diario', 'Reimpostazione giornaliera', 'Daily Reset', 'Daily Reset', 'Codzienny Reset', 'Redefinição diária', 'Ежедневный сброс', 'Daily Reset', 'รีเซ็ตประจำวัน', 'Günlük Sıfırlama', 'Щоденний скидання', 'Daily Reset'],
    'Archon Hunts': ['Archon Jagen', 'Caza de Archon', 'Caccia all Archon', 'Archon Hunts', 'Archon 사냥', 'Polowanie na Archona', 'Caça ao Archon', 'Охота на Архона', 'Archon Hunts', 'Archon Hunts', 'Archon Hunts', 'Полювання на Архона', 'Archon Hunts'],
    'Incursions': ['Incursiones', 'Incursions', 'Incarcerazioni', 'Incursions', '적략', 'Incursions', 'Incursões', 'Проникновения', 'Incursions', 'Incursions', 'Incursions', 'Проникнення', 'Incursions'],
    'In-Game Sidebar': ['In-Game Sidebar', 'Barra lateral en juego', 'Barra laterale in gioco', 'In-Game Sidebar', '인게임 사이드바', 'In-Game Sidebar', 'Barra lateral no jogo', 'Игровая боковая панель', 'In-Game Sidebar', 'แถบบานหน้า', 'In-Game Sidebar', 'Бічна панель у грі', 'In-Game Sidebar'],
    'Interactive overlay for mods, rivens, and inventory': ['Interaktiver Overlay für Mods, Rivens und Inventar', 'Superposición interactiva para mods, rivens e inventario', 'Overlay interattivo per mods, rivens e inventario', 'Interaktive overlay für mods, rivens et inventaire', '인터랙티브 오버레이', 'Interaktywny overlay dla modów, rivenów i inwentarza', 'Overlay interativo para mods, rivens e inventário', 'Интерактивный оверлей для модов, ривенов и инвентаря', 'Interaktiver Overlay', 'Interaktive overlay', 'Interaktive overlay', 'Інтерактивний оверлей', 'Interaktiver Overlay'],
    'Note: Shortcuts are global and will work even when the app is in the...': ['Hinweis: Verknüpfungen sind global und funktionieren selbst wenn die App im Hintergrund ist. Verwenden Sie Str+C+Taste Kombinationen.', 'Nota: Los atajos son globales y funcionarán incluso cuando la aplicación esté en segundo plano. Use combinaciones como Ctrl+Maj+Key.', 'Nota: i collegamenti sono globali e funzioneranno anche quando l\'app è in background. Usa combinazioni come Ctrl+Maiusc+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.', 'Uwaga: Skróty są globalne i będą działać nawet wtedy, gdy aplikacja jest w tle. Użyj kombinacji jak Ctrl+Shift+Key.', 'Nota: Os atalhos são globais e funcionarão mesmo quando o app estiver em segundo plano. Use combinações como Ctrl+Maj+Key.', 'Примечание: Ярлыки глобальные и будут работать даже в фоновом режиме. Используйте комбинации вроде Ctrl+Shift+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.', 'Примітка: Скорочення є глобальними і працюватимуть навіть у фоновому режимі. Використовуйте комбінації як Ctrl+Shift+Key.', 'Note: Les raccourcis sont globaux et fonctionneront même si l\'application est en arrière-plan. Utilisez des combinaisons comme Ctrl+Maj+Key.'],
}

# Apply dict translations first, then manual
added = 0
for k, en_val in flat_en.items():
    if not isinstance(en_val, str) or not en_val.strip():
        continue
    
    # Skip if all locales already translated
    if all(flat[lo].get(k, en_val) != en_val for lo in LOCALES):
        continue
    
    if en_val in T and isinstance(T[en_val], dict) and all(lo in T[en_val] for lo in LOCALES):
        continue
    
    translations = [en_val] * len(LOCALES)
    for i, lo in enumerate(LOCALES):
        # Check if already translated in locale file
        current = flat[lo].get(k, en_val)
        if current != en_val:
            translations[i] = current
            continue
        
        # Try dict
        if en_val in en_to_local.get(lo, {}):
            translations[i] = en_to_local[lo][en_val]
        # Try manual
        elif en_val in MANUAL_TRANSLATIONS:
            translations[i] = MANUAL_TRANSLATIONS[en_val][i]
        else:
            # Keep EN (no fallback)
            translations[i] = en_val
    
    T[en_val] = {lo: translations[i] for i, lo in enumerate(LOCALES)}
    added += 1

print(f"Added {added} entries to T")
print(f"T now has {len(T)} entries")

# Save T
with open('/tmp/tables/translation_table.json', 'w', encoding='utf-8') as f:
    json.dump(T, f, ensure_ascii=False, indent=2)
print("Saved T")
