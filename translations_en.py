#!/usr/bin/env python3
"""Generate translation table as JSON for all 13 locales."""
import json

LOCALES = ['de', 'es', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'tc', 'th', 'tr', 'uk', 'zh']

# Translation table: EN value -> [de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
T = {}

def add(en_val, vals):
    """vals must have exactly 13 entries (or fewer -> EN used as fallback)"""
    T[en_val] = vals[:13] + [en_val] * (13 - len(vals))

# === SETTINGS ===
add('Action', ['Aktion', 'Acción', 'Azione', 'アクション', '액션', 'Akcja', 'Ação', 'Действие', 'Action', 'Action', 'Eylek', 'Дія', 'Action'])
add('Manual OCR', ['Manuelles OCR', 'OCR manual', 'OCR manuale', '手動OCR', '수동 OCR', 'Ręczny OCR', 'OCR manual', 'Ручной OCR', '手動 OCR', 'OCR ด้วยมือ', 'El OCR', 'Ручний OCR', '手动 OCR'])
add('Toggle Sidebar', ['Sidebar umschalten', 'Alternar barra lateral', 'Attiva barra laterale', 'サイドバー切替', '사이드바 토글', 'Przełącz pasek boczny', 'Alternar barra lateral', 'Переключить боковую панель', '切換側邊欄', 'สลับแถบด้านข้าง', 'Kenar çubuğunu aç/kapa', 'Перемкнути бокову панель', '切换侧栏'])
add('Add Shortcut', ['Verknüpfung hinzufügen', 'Añadir acceso directo', 'Aggiungi scorciatoia', 'ショートカット追加', '단축키 추가', 'Dodaj skrót', 'Adicionar atalho', 'Добавить ярлык', '添加捷徑', 'เพิmục tiêu', 'Kısayol ekle', 'Додати ярлик', '添加快捷方式'])
add('Cache folder...', ['Cache-Ordner...', 'Carpeta de caché...', 'Cartella cache...', 'キャッシュフォルダ...', '캐시 폴더...', 'Folder cache...', 'Pasta de cache...', 'Папка кэша...', '快取資料夾...', 'โฟลเดอร์แคช...', 'Önbellek klasörü...', 'Тека кешу...', '缓存文件夹...'])
add('Check for Update', ['Auf Update prüfen', 'Buscar actualización', 'Controlla aggiornamenti', '更新をチェック', '업데이트 확인', 'Sprawdź aktualizację', 'Verificar atualização', 'Проверить обновление', '檢查更新', 'ตรวจสอบอัปเดต', 'Güncelleme kontrolü', 'Перевірити оновлення', '检查更新'])
add('Check for Updates', ['Auf Updates prüfen', 'Buscar actualizaciones', 'Controlla aggiornamenti', '更新をチェック', '업데이트 확인', 'Sprawdź aktualizacje', 'Verificar atualizações', 'Проверить обновления', '檢查更新', 'ตรวจสอบอัปเดต', 'Güncelleme kontrolü', 'Перевірити оновлення', '检查更新'])
add('Check on Startup', ['Beim Start prüfen', 'Comprobar al iniciar', 'Controlla all avvio', '起動時にチェック', '시작 시 확인', 'Sprawdzaj przy starcie', 'Verificar ao iniciar', 'Проверять при запуске', '啟動時檢查', 'ตรวจสอบเมื่อเริ่มต้น', 'Başlangıçta kontrol et', 'Перевіряти при запуску', '启动时检查'])
add('Checking...', ['Prüfe...', 'Comprobando...', 'Controllo in corso...', '確認中...', '확인 중...', 'Sprawdzanie...', 'Verificando...', 'Проверка...', '檢查中...', 'กำลังตรวจสอบ...', 'Kontrol ediliyor...', 'Перевірка...', '检查中...'])
add('Common Linux path', ['Gängiger Linux-Pfad', 'Ruta común en Linux', 'Percorso comune Linux', '一般的なLinuxパス', '일반적인 Linux 경로', 'Typowa ścieżka Linux', 'Caminho comum Linux', 'Стандартный путь Linux', '常用 Linux 路徑', 'เส้นทาง Linux ทั่วไป', 'Yaygın Linux yolu', 'Стандартний шлях Linux', '常见的 Linux 路径'])
add('Common Windows path', ['Gängiger Windows-Pfad', 'Ruta común en Windows', 'Percorso comune Windows', '一般的なWindowsパス', '일반적인 Windows 경로', 'Typowa ścieżka Windows', 'Caminho comum Windows', 'Стандартный путь Windows', '常用 Windows 路徑', 'เส้นทาง Windows ทั่วไป', 'Yaygın Windows yolu', 'Стандартний шлях Windows', '常见的 Windows 路径'])
add('Current Theme', ['Aktuelles Thema', 'Tema actual', 'Tema attuale', '現在のテーマ', '현재 테마', 'Bieżąca nazwa', 'Tema atual', 'Текущая тема', '目前主題', 'ธีมปัจจุบัน', 'Mevcut tema', 'Поточна тема', '当前主题'])
add('Cursor', ['Cursor', 'Cursor', 'Cursore', 'カーソル', '커서', 'Kursor', 'Cursor', 'Курсор', 'Cursor', 'เคอร์เซอร์', 'İmleç', 'Курсор', '光标'])
add('Download Manually', ['Manuell herunterladen', 'Descargar manualmente', 'Scarica manualmente', '手動ダウンロード', '수동 다운로드', 'Pobierz ręcznie', 'Baixar manualmente', 'Скачать вручную', '手動下載', 'ดาวน์โหลดด้วยมือ', 'El ile indir', 'Завантажити вручну', '手动下载'])
add('Error', ['Fehler', 'Error', 'Errore', 'エラー', '오류', 'Błąd', 'Erro', 'Ошибка', '錯誤', 'ข้อผิดพลาด', 'Hata', 'Помилка', '错误'])
add('Game Assets', ['Spiel-Assets', 'Recursos del juego', 'Asset di gioco', 'ゲームアセット', '게임 에셋', 'Aktywa gry', 'Assets do jogo', 'Игровые ресурсы', '游戏資源', 'สินทรัปกระเท', 'Oyun varlıkları', 'Ігрові ресурси', '游戏资产'])
add('Global Hotkeys', ['Globale Tastenkürzel', 'Teclados globales', 'Tasti di scelta rapida globali', 'グローバルホットキー', '글로벌 핫키', 'Globalne skróty', 'Atalhos globais', 'Глобальные горячие клавиши', '全局熱鍵', 'ปุ่มลัดโกลบัล', 'Genel kısayollar', 'Глобальні скорочення', '全局热键'])
add('Global keyboard shortcuts', ['Globale Tastaturkürzel', 'Ata...[truncated]