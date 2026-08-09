#!/usr/bin/env python3
"""
ADD missing about.credit_* keys to all 15 locale files.
About.jsx renders t('about.credit_*') for each credit; the keys were never
added, so every credit description rendered empty.
"""
import json, os
os.chdir('/home/emre/Downloads/cephalon-kronos')
ALL = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh']

def load_json(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)

def save_locale(lo, data):
    with open(f'src/lib/i18n/{lo}.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent='\t')

CREDITS = {
    'about.credit_browse_wf': {
        'en': 'Warframe export data mirror', 'fr': 'Miroir des données d\'export de Warframe',
        'de': 'Warframe-Exportdaten-Mirror', 'es': 'Espejo de datos de exportación de Warframe',
        'it': 'Mirror dei dati di export di Warframe', 'ja': 'Warframe エクスポートデータのミラー',
        'ko': '워프레임 내보내기 데이터 미러', 'pl': 'Mirror danych eksportu Warframe',
        'pt': 'Espelho de dados de exportação de Warframe', 'ru': 'Зеркало экспортных данных Warframe',
        'tc': 'Warframe 匯出資料鏡像', 'th': 'มิเรอร์ข้อมูลส่งออกของ Warframe',
        'tr': 'Warframe dışa aktarma veri aynası', 'uk': 'Дзеркало експортних даних Warframe', 'zh': 'Warframe 导出数据镜像'},
    'about.credit_relics_run': {
        'en': 'Relic drop tables', 'fr': 'Tables de butin des reliques',
        'de': 'Relikt-Drop-Tabellen', 'es': 'Tablas de botín de reliquias',
        'it': 'Tabelle drop delle reliquie', 'ja': '遺物のドロップテーブル',
        'ko': '성유물 드롭 테이블', 'pl': 'Tabele dropu reliktów',
        'pt': 'Tabelas de drop de relíquias', 'ru': 'Таблицы выпадения реликвий',
        'tc': '遺物掉落表', 'th': 'ตารางดรอปรีลิก',
        'tr': 'Kalıntı düşme tabloları', 'uk': 'Таблиці випадання реліквій', 'zh': '遗物掉落表'},
    'about.credit_session_token': {
        'en': 'Session token research', 'fr': 'Recherche sur les jetons de session',
        'de': 'Sitzungstoken-Forschung', 'es': 'Investigación de tokens de sesión',
        'it': 'Ricerca sui token di sessione', 'ja': 'セッショントークンの研究',
        'ko': '세션 토큰 연구', 'pl': 'Badania nad tokenami sesji',
        'pt': 'Pesquisa de tokens de sessão', 'ru': 'Исследование токенов сессии',
        'tc': '會話權杖研究', 'th': 'งานวิจัยโทเคนเซสชัน',
        'tr': 'Oturum token araştırması', 'uk': 'Дослідження токенів сесії', 'zh': '会话令牌研究'},
    'about.credit_wfcd_items': {
        'en': 'Warframe item data', 'fr': 'Données d\'objets Warframe',
        'de': 'Warframe-Gegenstandsdaten', 'es': 'Datos de objetos de Warframe',
        'it': 'Dati degli oggetti di Warframe', 'ja': 'Warframe アイテムデータ',
        'ko': '워프레임 아이템 데이터', 'pl': 'Dane przedmiotów Warframe',
        'pt': 'Dados de itens de Warframe', 'ru': 'Данные предметов Warframe',
        'tc': 'Warframe 物品資料', 'th': 'ข้อมูลไอเทมของ Warframe',
        'tr': 'Warframe eşya verileri', 'uk': 'Дані предметів Warframe', 'zh': 'Warframe 物品数据'},
    'about.credit_warframetools': {
        'en': 'Task checklist reference', 'fr': 'Référence de liste de tâches',
        'de': 'Aufgaben-Checklisten-Referenz', 'es': 'Referencia de lista de tareas',
        'it': 'Riferimento elenco attività', 'ja': 'タスクチェックリストの参考',
        'ko': '작업 체크리스트 참고', 'pl': 'Referencja listy zadań',
        'pt': 'Referência de lista de tarefas', 'ru': 'Справочник списка задач',
        'tc': '任務清單參考', 'th': 'ข้อมูลอ้างอิงรายการภารกิจ',
        'tr': 'Görev listesi referansı', 'uk': 'Довідник списку завдань', 'zh': '任务清单参考'},
    'about.credit_wiki': {
        'en': 'Warframe community wiki', 'fr': 'Wiki communautaire de Warframe',
        'de': 'Warframe-Community-Wiki', 'es': 'Wiki comunitaria de Warframe',
        'it': 'Wiki della community di Warframe', 'ja': 'Warframe コミュニティ Wiki',
        'ko': '워프레임 커뮤니티 위키', 'pl': 'Wiki społeczności Warframe',
        'pt': 'Wiki da comunidade de Warframe', 'ru': 'Вики сообщества Warframe',
        'tc': 'Warframe 社群維基', 'th': 'วิกิชุมชน Warframe',
        'tr': 'Warframe topluluk wiki', 'uk': 'Вікі спільноти Warframe', 'zh': 'Warframe 社区维基'},
    'about.credit_riven_pricer': {
        'en': 'Riven pricing model', 'fr': 'Modèle de prix des Rivens',
        'de': 'Riven-Preismodell', 'es': 'Modelo de precios de Rivens',
        'it': 'Modello di prezzi dei Riven', 'ja': 'リーヴン価格モデル',
        'ko': '리븐 가격 모델', 'pl': 'Model wyceny Rivenów',
        'pt': 'Modelo de preços de Rivens', 'ru': 'Модель цен на Ривены',
        'tc': '裂罅價格模型', 'th': 'โมเดลราคาริเวน',
        'tr': 'Riven fiyatlandırma modeli', 'uk': 'Модель цін на Рівени', 'zh': '裂罅价格模型'},
}

count = 0
for lo in ALL:
    d = load_json(f'src/lib/i18n/{lo}.json')
    ui = d['ui']
    for key, trans in CREDITS.items():
        if key not in ui:
            ui[key] = trans[lo]
            count += 1
    save_locale(lo, d)
print(f"Added {count} about.credit_* keys across {len(ALL)} files")
