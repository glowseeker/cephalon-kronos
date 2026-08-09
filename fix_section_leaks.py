#!/usr/bin/env python3
"""
FIX FR LEaks in TOP-LEVEL SECTIONS (relics, rivens, adversaries, collectibles, settings).
290 values across 23 keys. Same disease as the ui-section leaks: fr.json copied in.
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

en = load_json('src/lib/i18n/en.json')
fr = load_json('src/lib/i18n/fr.json')
locale_files = {lo: load_json(f'src/lib/i18n/{lo}.json') for lo in LOCALES}

# Translations keyed by EN value -> {locale: translation}
T = {}

T['Converted'] = {'de': 'Konvertiert', 'es': 'Convertido', 'it': 'Convertito', 'ja': '転向',
                  'ko': '전향', 'pl': 'Przekonwertowany', 'pt': 'Convertido', 'ru': 'Преобразованный',
                  'tc': '轉化', 'th': 'เปลี่ยนฝ่าย', 'tr': 'Dönüştürüldü', 'uk': 'Перетворений', 'zh': '转化'}
T['Traded'] = {'de': 'Gehandelt', 'es': 'Intercambiado', 'it': 'Scambiato', 'ja': '取引済み',
               'ko': '거래됨', 'pl': 'Wymieniony', 'pt': 'Trocado', 'ru': 'Проданный',
               'tc': '已交易', 'th': 'แลกเปลี่ยนแล้ว', 'tr': 'Takas Edildi', 'uk': 'Обміняний', 'zh': '已交易'}
T['Vanquished'] = {'de': 'Besiegt', 'es': 'Vencido', 'it': 'Sconfitto', 'ja': '撃破',
                   'ko': '처치됨', 'pl': 'Pokonany', 'pt': 'Vencido', 'ru': 'Побеждённый',
                   'tc': '已擊敗', 'th': 'ปราบแล้ว', 'tr': 'Yenildi', 'uk': 'Переможений', 'zh': '已击败'}
T['Rank {rank}'] = {'de': 'Rang {rank}', 'es': 'Rango {rank}', 'it': 'Rango {rank}', 'ja': 'ランク {rank}',
                    'ko': '랭크 {rank}', 'pl': 'Ranga {rank}', 'pt': 'Rank {rank}', 'ru': 'Ранг {rank}',
                    'tc': '等級 {rank}', 'th': 'ระดับ {rank}', 'tr': 'Seviye {rank}', 'uk': 'Ранг {rank}', 'zh': '等级 {rank}'}
T['Areas Discovered'] = {'de': 'Entdeckte Gebiete', 'es': 'Zonas descubiertas', 'it': 'Aree scoperte',
                         'ja': '発見済みエリア', 'ko': '발견한 지역', 'pl': 'Odkryte obszary',
                         'pt': 'Áreas descobertas', 'ru': 'Обнаруженные области', 'tc': '已發現區域',
                         'th': 'พื้นที่ที่ค้นพบ', 'tr': 'Keşfedilen Alanlar', 'uk': 'Відкриті області', 'zh': '已发现区域'}
T['Caves Not Loaded'] = {'de': 'Höhlen nicht geladen', 'es': 'Cuevas no cargadas', 'it': 'Caverni non caricati',
                         'ja': '洞窟が読み込まれていません', 'ko': '동굴이 로드되지 않음', 'pl': 'Jaskinie niezaładowane',
                         'pt': 'Cavernas não carregadas', 'ru': 'Пещеры не загружены', 'tc': '洞穴未載入',
                         'th': 'ถ้ำยังไม่โหลด', 'tr': 'Mağaralar yüklenmedi', 'uk': 'Печери не завантажені', 'zh': '洞穴未加载'}
T['No collectibles collected'] = {'de': 'Keine Sammelobjekte gesammelt', 'es': 'Ningún coleccionable recolectado',
                                  'it': 'Nessun collezionabile raccolto', 'ja': 'コレクティブル未収集',
                                  'ko': '수집품 없음', 'pl': 'Nie zebrano żadnych kolekcjonerek',
                                  'pt': 'Nenhum colecionável coletado', 'ru': 'Коллекционные предметы не собраны',
                                  'tc': '尚未收集收藏品', 'th': 'ยังไม่เก็บของสะสม',
                                  'tr': 'Koleksiyon öğesi toplanmadı', 'uk': 'Колекційні предмети не зібрано', 'zh': '尚未收集收藏品'}
T['No areas discovered'] = {'de': 'Keine Gebiete entdeckt', 'es': 'Ninguna zona descubierta',
                            'it': 'Nessuna area scoperta', 'ja': '未発見エリアなし', 'ko': '발견한 지역 없음',
                            'pl': 'Nie odkryto żadnych obszarów', 'pt': 'Nenhuma área descoberta',
                            'ru': 'Области не обнаружены', 'tc': '尚未發現區域', 'th': 'ยังไม่ค้นพบพื้นที่',
                            'tr': 'Alan keşfedilmedi', 'uk': 'Області не виявлено', 'zh': '尚未发现区域'}
T['Expected Ducat'] = {'de': 'Erwartete Dukaten', 'es': 'Ducados esperados', 'it': 'Ducati attesi',
                       'ja': '予想ダカット', 'ko': '예상 두캇', 'pl': 'Oczekiwane dukaty',
                       'pt': 'Ducats esperados', 'ru': 'Ожидаемые дукаты', 'tc': '預期杜卡德',
                       'th': 'ดั๊กแคตที่คาดหวัง', 'tr': 'Beklenen Dukat', 'uk': 'Очікувані дукати', 'zh': '预期杜卡德'}
T['Expected Platinum'] = {'de': 'Erwartetes Platin', 'es': 'Platino esperado', 'it': 'Platino atteso',
                          'ja': '予想プラチナ', 'ko': '예상 플래티넘', 'pl': 'Oczekiwana platyna',
                          'pt': 'Platina esperada', 'ru': 'Ожидаемая платина', 'tc': '預期白金',
                          'th': 'แพลตตินัมที่คาดหวัง', 'tr': 'Beklenen Platin', 'uk': 'Очікувана платина', 'zh': '预期白金'}
T['No relics in inventory'] = {'de': 'Keine Relikte im Inventar', 'es': 'No hay reliquias en el inventario',
                               'it': 'Nessuna reliquia nell\'inventario', 'ja': 'インベントリに遺物がありません',
                               'ko': '인벤토리에 성유물이 없음', 'pl': 'Brak reliktów w ekwipunku',
                               'pt': 'Nenhuma relíquia no inventário', 'ru': 'В инвентаре нет реликвий',
                               'tc': '倉庫中沒有遺物', 'th': 'ไม่มีรีลิกในคลัง',
                               'tr': 'Envanterde kalıntı yok', 'uk': 'У інвентарі немає реліквій', 'zh': '仓库中没有遗物'}
T['No relics match your search'] = {'de': 'Keine Relikte entsprechen deiner Suche', 'es': 'Ninguna reliquia coincide con tu búsqueda',
                                    'it': 'Nessuna reliquia corrisponde alla ricerca', 'ja': '検索に一致する遺物がありません',
                                    'ko': '검색과 일치하는 성유물 없음', 'pl': 'Żaden relikt nie pasuje do wyszukiwania',
                                    'pt': 'Nenhuma relíquia corresponde à sua pesquisa', 'ru': 'Нет реликвий по вашему запросу',
                                    'tc': '沒有符合搜尋的遺物', 'th': 'ไม่มีรีลิกที่ตรงกับการค้นหา',
                                    'tr': 'Aramanızla eşleşen kalıntı yok', 'uk': 'Немає реліквій за вашим запитом', 'zh': '没有符合搜索的遗物'}
T['Ascending'] = {'de': 'Aufsteigend', 'es': 'Ascendente', 'it': 'Crescente', 'ja': '昇順', 'ko': '오름차순',
                  'pl': 'Rosnąco', 'pt': 'Crescente', 'ru': 'По возрастанию', 'tc': '升序', 'th': 'น้อยไปมาก',
                  'tr': 'Artan', 'uk': 'За зростанням', 'zh': '升序'}
T['Descending'] = {'de': 'Absteigend', 'es': 'Descendente', 'it': 'Decrescente', 'ja': '降順', 'ko': '내림차순',
                   'pl': 'Malejąco', 'pt': 'Decrescente', 'ru': 'По убыванию', 'tc': '降序', 'th': 'มากไปน้อย',
                   'tr': 'Azalan', 'uk': 'За спаданням', 'zh': '降序'}
T['Sort by Ducat'] = {'de': 'Nach Dukaten sortieren', 'es': 'Ordenar por ducados', 'it': 'Ordina per ducati',
                      'ja': 'ダカット順', 'ko': '두캇순 정렬', 'pl': 'Sortuj według dukatów',
                      'pt': 'Ordenar por ducats', 'ru': 'Сортировать по дукатам', 'tc': '依杜卡德排序',
                      'th': 'เรียงตามดั๊กแคต', 'tr': 'Dukata göre sırala', 'uk': 'Сортувати за дукатами', 'zh': '按杜卡德排序'}
T['Ducat Gain'] = {'de': 'Dukaten-Gewinn', 'es': 'Ganancia de ducados', 'it': 'Guadagno ducati',
                   'ja': 'ダカット獲得', 'ko': '두캇 획득', 'pl': 'Zysk dukatów',
                   'pt': 'Ganho de ducats', 'ru': 'Получение дукатов', 'tc': '杜卡德收益',
                   'th': 'ดั๊กแคตที่ได้รับ', 'tr': 'Dukat Kazancı', 'uk': 'Отримання дукатів', 'zh': '杜卡德收益'}
T['Sort by Platinum'] = {'de': 'Nach Platin sortieren', 'es': 'Ordenar por platino', 'it': 'Ordina per platino',
                         'ja': 'プラチナ順', 'ko': '플래티넘순 정렬', 'pl': 'Sortuj według platyny',
                         'pt': 'Ordenar por platina', 'ru': 'Сортировать по платине', 'tc': '依白金排序',
                         'th': 'เรียงตามแพลตตินัม', 'tr': 'Platine göre sırala', 'uk': 'Сортувати за платиною', 'zh': '按白金排序'}
T['Platinum Gain'] = {'de': 'Platin-Gewinn', 'es': 'Ganancia de platino', 'it': 'Guadagno platino',
                      'ja': 'プラチナ獲得', 'ko': '플래티넘 획득', 'pl': 'Zysk platyny',
                      'pt': 'Ganho de platina', 'ru': 'Получение платины', 'tc': '白金收益',
                      'th': 'แพลตตินัมที่ได้รับ', 'tr': 'Platin Kazancı', 'uk': 'Отримання платини', 'zh': '白金收益'}
T['All States'] = {'de': 'Alle Zustände', 'es': 'Todos los estados', 'it': 'Tutti gli stati', 'ja': 'すべての状態',
                   'ko': '모든 상태', 'pl': 'Wszystkie stany', 'pt': 'Todos os estados', 'ru': 'Все состояния',
                   'tc': '所有狀態', 'th': 'ทุกสถานะ', 'tr': 'Tüm Durumlar', 'uk': 'Всі стани', 'zh': '所有状态'}
T['Riven weapons collection'] = {'de': 'Riven-Waffenkollektion', 'es': 'Colección de armas Riven',
                                 'it': 'Collezione di armi Riven', 'ja': 'リーヴン武器コレクション',
                                 'ko': '리븐 무기 컬렉션', 'pl': 'Kolekcja broni Riven',
                                 'pt': 'Coleção de armas Riven', 'ru': 'Коллекция оружия Ривенов',
                                 'tc': '裂罅武器收藏', 'th': 'คอลเลกชันอาวุธริเวน',
                                 'tr': 'Riven Silah Koleksiyonu', 'uk': 'Колекція зброї Рівенів', 'zh': '裂罅武器收藏'}
T['Refresh Monitors'] = {'de': 'Monitore aktualisieren', 'es': 'Actualizar monitores', 'it': 'Aggiorna monitor',
                         'ja': 'モニターを更新', 'ko': '모니터 새로고침', 'pl': 'Odśwież monitory',
                         'pt': 'Atualizar monitores', 'ru': 'Обновить мониторы', 'tc': '重新整理監視器',
                         'th': 'รีเฟรชมอนิเตอร์', 'tr': 'Monitörleri Yenile', 'uk': 'Оновити монітори', 'zh': '刷新监视器'}
T['Released'] = {'de': 'Veröffentlicht', 'es': 'Lanzado', 'it': 'Rilasciato', 'ja': 'リリース済み',
                 'ko': '출시됨', 'pl': 'Wydany', 'pt': 'Lançado', 'ru': 'Выпущено', 'tc': '已發布',
                 'th': 'วางจำหน่ายแล้ว', 'tr': 'Yayınlandı', 'uk': 'Випущено', 'zh': '已发布'}
T['N/A'] = {'de': 'N/A', 'es': 'N/D', 'it': 'N/D', 'ja': '該当なし', 'ko': '해당 없음',
            'pl': 'N/D', 'pt': 'N/D', 'ru': 'Н/Д', 'tc': '無', 'th': 'ไม่มี',
            'tr': 'Yok', 'uk': 'Н/Д', 'zh': '无'}

# Apply: for each section, for each key where value == fr section value (!= en), replace
SECTIONS = ['relics','rivens','mastery','collectibles','settings','adversaries','checklist','mods','inventory','riven_card','sync','about']
applied = 0
for sec in SECTIONS:
    en_sec = en.get(sec, {})
    fr_sec = fr.get(sec, {})
    if not isinstance(en_sec, dict): continue
    for k, en_val in en_sec.items():
        if not isinstance(en_val, str) or en_val not in T: continue
        fr_val = fr_sec.get(k, en_val)
        trans = T[en_val]
        for lo in LOCALES:
            loc_sec = locale_files[lo].get(sec, {})
            cur = loc_sec.get(k)
            if isinstance(cur, str) and cur == fr_val and cur != en_val:
                loc_sec[k] = trans[lo]
                applied += 1

print(f"Applied {applied} section-leak fixes")

for lo in LOCALES:
    save_locale(lo, locale_files[lo])
print("Saved.")
