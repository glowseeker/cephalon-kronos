#!/usr/bin/env python3
"""Add batch 2 of translations."""
import json

T = json.load(open('/tmp/tables/translation_table.json', encoding='utf-8'))
add_count = 0

def add(en, vals):
    global add_count
    if en not in T:
        if len(vals) != 13:
            raise ValueError(f"Key '{en}' has {len(vals)} values, expected 13")
        T[en] = list(vals)
        add_count += 1

# Proper nouns that stay EN (13 entries each, all same as EN)
# These are game-specific terms, weapon names, character names, etc.
EN13 = ["EN13"] * 0  # placeholder
def en13():
    """Return 13 copies of 'EN' for proper nouns."""
    return ["EN"] * 13

# Actually, for proper nouns, the EN value itself should be used.
# We handle these by NOT adding them to T (so apply_v3 keeps them as EN).
# So we only add TRANSLATABLE entries here.

# === Batch 2: Game mechanics, mission modifiers, etc. ===
add("Affect Shield", ["Schild verletzen", "Afectar escudo", "Colpisce scudo", "盾に影響", "Shield Affect", "Obraża tarczę", "Afectar escudo", "Влияние на щит", "Affect Shield", "Affect Shield", "Kalkan etkisi", "Вплив на щит", "Affect Shield"])
add("All damage", ["Alle Schäden", "Todos los daños", "Tutti i danni", "全ダメージ", "모든 데미지", "All damage", "Todos os danos", "Все урон", "All damage", "All damage", "Tüm hasar", "All damage", "All damage"])
add("Alchemy", ["Alchemie", "Alquimia", "Alchimia", "Alchimie", "Alchimie", "Alchemia", "Alquimia", "Алхимия", "Alchemy", "Alchemy", "Alkimya", "Алхімія", "Alchemy"])
add("Assassination", ["Attentat", "Asesinato", "Assassinio", "暗殺", "암살", "Zamach", "Assassinato", "Убийство", "Assassination", "Assassination", "Suikast", "Вбивство", "Assassination"])
add("Balloon Party", ["Ballon-Party", "Fiesta de globos", "Festa dei palloncini", "Balloon Party", "Balloon Party", "Balloon Party", "Festa de balões", "Баллон пати", "Balloon Party", "Balloon Party", "Balon Partisi", "Balloon Party", "Balloon Party"])
add("Basic Loot", ["Grund-Beute", "Botín básico", "Merce basica", "Basic Loot", "Basic Loot", "Basic Loot", "Botín básico", "Базовый добыча", "Basic Loot", "Basic Loot", "Basic Loot", "Basic Loot", "Basic Loot"])
add("Basic Race", ["Grund-Rasse", "Raza básica", "Razza base", "Basic Race", "Basic Race", "Basic Race", "Raça básica", "Базовая раса", "Basic Race", "Basic Race", "Basic Race", "Basic Race", "Basic Race"])
add("Birthday", ["Geburtstag", "Cumpleaños", "Compleanno", "誕生日", "생일", "Urodziny", "Aniversário", "День рождения", "Birthday", "วันเกิด", "Doğum günü", "День народження", "Birthday"])
add("Blast", ["Explosiv", "Explosión", "Esplosivo", "爆破", "폭발", "Rozbiń", "Explosão", "Взрыв", "Blast", "Blast", "Blast", "Вибух", "Blast"])
add("Blitz Leech", ["Blitz-Leiche", "Sanguijuela relámpago", "Vermefulmine", "Blitz Leech", "Blitz Leech", "Blitz Leech", "Blitz Leech", "Блитз-паразайт", "Blitz Leech", "Blitz Leech", "Blitz Leech", "Blitz Leech", "Blitz Leech"])
add("Bomb Defusal", ["Bombe Entschärfung", "Desactivación de bomba", "Disinnesco bomba", "Bomb Defusal", "폭탄 해제", "Rozbrojenie bomby", "Desativação de bomba", "Обезвреживание бомбы", "Bomb Defusal", "Bomb Defusal", "Bomb Defusal", "Bomb Defusal", "Bomb Defusal"])
add("Capture the target.", ["Ziele fangen.", "Capturar al objetivo.", "Cattura l'obiettivo.", "Capture the target.", "Capture the target.", "Capture the target.", "Capturar o alvo.", "Поймать цель.", "Capture the target.", "Capture the target.", "Capture the target.", "Capture the target.", "Capture the target."])
add("Catalysts", ["Katalysatoren", "Catalizadores", "Catalizzatori", "Catalysts", "Catalysts", "Catalysts", "Catalisadores", "Катализаторы", "Catalysts", "Catalysts", "Catalysts", "Катализатори", "Catalysts"])
add("Cephalon Fragments", ["Cephalon-Fragmente", "Fragmentos de Cephalon", "Frammenti di Cephalon", "Cephalon Fragments", "Cephalon Fragments", "Cephalon Fragments", "Fragmentos de Cephalon", "Фрагменты Кефалона", "Cephalon Fragments", "Cephalon Fragments", "Cephalon Fragments", "Фрагменти Кефалона", "Cephalon Fragments"])
add("Chemical Warfare", ["Chemiewaffen", "Guerra química", "Guerra chimica", "Chemical Warfare", "화학전", "Chemical Warfare", "Guerra química", "Химическая война", "Chemical Warfare", "สงครามเคมี", "Kimyasal Savaş", "Хімічна війна", "Chemical Warfare"])
add("Cleanse nodes of Infestation to power a Vaporizer.", ["Reinige Knoten von Infektion, um einen Dampfer zu aktivieren.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer.", "Cleanse nodes of Infestation to power a Vaporizer."])
add("Collect Vitoplast.", ["Sammle Vitoplast.", "Recolectar Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Собирать Витопласт.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast.", "Collect Vitoplast."])
add("Converted", ["Umgewandelt", "Convertido", "Convertito", "转换的", "변환됨", "Przekonwertowano", "Convertido", "Преобразованный", "Converted", "Converted", "Converted", "Конвертовано", "Converted"])
add("Corrosive", ["Reizend", "Corrosivo", "Corrosivo", "腐食", "식해성", "Corozyjny", "Corrosivo", "Коррозионный", "Corrosive", "Corrosive", "Corrosive", "Корозійний", "Corrosive"])
add("Credit Booster", ["Credit-Booster", "Multiplicador de créditos", "Booter crediti", "Credit Booster", "크레딧 부스터", "Credit Booster", "Multiplicador de créditos", "Бустер кредитов", "Credit Booster", "Credit Booster", "Credit Booster", "Бустер кредитів", "Credit Booster"])
add("Daily Deals", ["Tägliche Angebote", "Ofertas diarias", "Offerte giornaliere", "Daily Deals", "일일 거래", "Codzienne oferty", "Ofertas diárias", "Ежедневные сделки", "Daily Deals", "Daily Deals", "Daily Deals", "Щоденні пропозиції", "Daily Deals"])
add("Defense", ["Verteidigung", "Defensa", "Difesa", "防御", "방어", "Obrona", "Defesa", "Оборона", "Defense", "Defense", "Defense", "Захист", "Defense"])
add("Deimos", ["Deimos", "Deimos", "Deimos", "デミオス", "디모스", "Deimos", "Deimos", "Деймос", "Deimos", "Deimos", "Deimos", "Деймос", "Deimos"])
add("Descendia", ["Descendia", "Descendia", "Descendia", "ディセンドリア", "Descendia", "Descendia", "Descendia", "Десцендия", "Descendia", "Descendia", "Descendia", "Десцендія", "Descendia"])
add("Destroy Hologlobes", ["Hologlobe aus vernichten", "Destruir hologlobos", "Distruggi ologlobi", "Destroy Hologlobes", "Destroy Hologlobes", "Destroy Hologlobes", "Destruir hologlobos", "Уничтожить гологлобы", "Destroy Hologlobes", "Destroy Hologlobes", "Destroy Hologlobes", "Destroy Hologlobes", "Destroy Hologlobes"])
add("Details", ["Details", "Detalles", "Dettagli", "詳細", "세부 정보", "Szczegóły", "Detalhes", "Подробности", "Details", "รายละเอียด", "Detaylar", "Деталі", "Details"])
add("Difficulty", ["Schwierigkeit", "Dificultad", "Difficoltà", "Difficulty", "Difficulty", "Trudność", "Dificuldade", "Сложность", "Difficulty", "ระดับความยาก", "Difficulty", "Складність", "Difficulty"])
add("Disruption", ["Störung", "Interrupción", "Interruzione", "Disruption", "Disruption", "Zakłócenie", "Interrupção", "Нарушение", "Disruption", "Disruption", "Disruption", "Disruption", "Disruption"])
add("Double Affinity", ["Doppelte Affinität", "Doble afinidad", "Doppia affinità", "Double Affinity", "Double Affinity", "Double Affinity", "Dupla afinidade", "Удвоенная аффинитет", "Double Affinity", "Double Affinity", "Double Affinity", "Double Affinity", "Double Affinity"])
add("Double Credits", ["Doppelte Credits", "Dobles créditos", "Doppi crediti", "Double Credits", "Double Credits", "Double Credits", "Duplos créditos", "Удвоенные кредиты", "Double Credits", "Double Credits", "Double Credits", "Double Credits", "Double Credits"])
add("Drifter Intrinsic", ["Drifter-Intrinsic", "Intrínseca Drifter", "Drifter Intrinseca", "Drifter Intrinsic", "Drifter Intrinsic", "Drifter Intrinsic", "Drifter Intrinsic", "Внутреннее Drifter", "Drifter Intrinsic", "Drifter Intrinsic", "Drifter Intrinsic", "Drifter Intrinsic", "Drifter Intrinsic"])
add("Elite Weekly", ["Elite Wöchentlich", "Semanal élite", "Settimanale elite", "Elite Weekly", "Elite Weekly", "Elite Weekly", "Semanal élite", "Элитный еженедельный", "Elite Weekly", "Elite Weekly", "Elite Weekly", "Elite Weekly", "Elite Weekly"])
add("Extermination", ["Ausrottung", "Exterminación", "St eradicate", "滅殺", "절멸", "Zlikwiduj", "Exterminar", "Истребитель", "Exterminate", "Exterminate", "Exterminate", "Exterminate", "Exterminate"])
add("Explosive", ["Explosiv", "Explosivo", "Esplosivo", "爆発性の", "폭발성", "Explosive", "Explosivo", "Взрывчатый", "Explosive", "Explosive", "Explosive", "Вибухонебезпечний", "Explosive"])
add("Extended", ["Erweitert", "Extendido", "Esteso", "Extended", "Extended", "Extended", "Extensão", "Расширенный", "Extended", "Extended", "Extended", "Extended", "Extended"])
add("Faction", ["Fraktion", "Facción", "Fazione", "ファクション", "팩션", "Frakcja", "Fração", "Фракция", "Faction", "Facti...", "Faction", "Фракція", "Faction"])
add("Ferrox", ["Ferrox", "Ferrox", "Ferrox", "フェルロックス", "Ferrox", "Ferrox", "Ferrox", "Феррокс", "Ferrox", "Ferrox", "Ferrox", "Феррокс", "Ferrox"])
add("Ferry", ["Fähr", "Transbordo", "Traghetto", "Ferry", "Ferry", "Prom", "Ferry", "Паром", "Ferry", "Ferry", "Ferry", "Ferry", "Ferry"])
add("Fissure", ["Fissur", "Fisura", "Fessura", "裂開", "균열", "Fazura", "Fissura", "Разлом", "Fissure", "Fissure", "Fissure", "Fissure", "Fissure"])
add("Fissures", ["Fissuren", "Fisuras", "Fessure", "裂開", "균열", "Fazury", "Fissuras", "Разломы", "Fissures", "Fissures", "Fissures", "Fissures", "Fissures"])
add("Fissure Sync", ["Fissur-Synchronisation", "Sync de fisura", "Sincronizza fessura", "Fissure Sync", "Fissure Sync", "Fissure Sync", "Sync de fissura", "Синхронизация разлома", "Fissure Sync", "Fissure Sync", "Fissure Sync", "Fissure Sync", "Fissure Sync"])
add("Flawless", ["Makellos", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless"])
add("Flash", ["Blitz", "Flash", "Flash", "閃光", "섬광", "Migotanie", "Flash", "Вспышка", "Flash", "Flash", "Flash", "Flash", "Flash"])
add("Flawless", ["Makellos", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless", "Flawless"])
add("Fleet", ["Flotte", "Flota", "Flotta", "Fleet", "Fleet", "Flota", "Frota", "Флот", "Fleet", "Fleet", "Fleet", "Флот", "Fleet"])
add("Flesh", ["Fleisch", "Carne", "Carne", "肉", "육체", "Meat", "Carne", "Мясо", "Flesh", "Flesh", "Flesh", "Meat", "Flesh"])
add("Flow", ["Fluss", "Flujo", "Flusso", "Flow", "Flow", "Flow", "Flow", "Поток", "Flow", "Flow", "Flow", "Flow", "Flow"])
add("Focus", ["Fokus", "Foco", "Focus", "Focus", "Focus", "Focus", "Foco", "Фокус", "Focus", "Focus", "Focus", "Focus", "Focus"])
add("Forced", ["Erzwungen", "Forzado", "Forzato", "Forced", "Forced", "Forced", "Forçado", "Вынужденный", "Forced", "Forced", "Forced", "Forced", "Forced"])
add("Fortress", ["Festung", "Fortaleza", "Fortezza", "Fortress", "Fortress", "Fortress", "Fortaleza", "Крепость", "Fortress", "Fortress", "Fortress", "Fortress", "Fortress"])
add("Fragile", ["Frail", "Fragile", "Fragile", "虚弱", "취약", "Kruche", "Fragil", "Хрупкий", "Fragile", "Fragile", "Fragile", "Хрупкий", "Fragile"])
add("Frenzy", ["Raserei", "Frenesí", "Rabbia", "Frenzy", "Frenzy", "Frenzy", "Frenesi", "Беспорядок", "Frenzy", "Frenzy", "Frenzy", "Frenzy", "Frenzy"])
add("Frozen", ["Frisch", "Congelado", "Congelato", "Frozen", "Frozen", "Frozen", "Congelado", "Замёрзший", "Frozen", "Frozen", "Frozen", "Заморожений", "Frozen"])
add("Fuel", ["Treibstoff", "Combustible", "Carburante", "Fuel", "Fuel", "Fuel", "Combustível", "Топливо", "Fuel", "Fuel", "Fuel", "Fuel", "Fuel"])
add("Fulmination", ["Fulmination", "Fulminación", "Fulminazione", "Fulmination", "Fulmination", "Fulmination", "Fulminação", "Fulmination", "Fulmination", "Fulmination", "Fulmination", "Fulmination", "Fulmination"])
add("Fungal", ["Pilz", "Fúngico", "Fungo", "菌", "곰팡이", "Grzyb", "Fúngico", "Грибной", "Fungal", "Fungal", "Fungal", "Грибковий", "Fungal"])
