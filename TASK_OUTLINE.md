# Cephalon Kronos — remaining localization work (authoritative, v2)

Generated from live locale files: **203 keys** still contain EN values in at least one of 13 locales (de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh).

## Priority rules
1. **DE dict is authoritative** for game terms — if `dict.{locale}.json` has a per-locale value, use it (even if the FR locale file keeps EN).
2. No dict value + FR differs -> **manual per-locale translation** (FR shown only as semantic reference, NEVER copied).
3. No dict + FR keeps EN -> **universal term** (proper noun, format string, abbreviation): EN is the correct value in every locale, leave alone.

## Category A: DICT RESOLVABLE (54)
Apply dict value per locale. No manual translation needed. `(key)` = resolved by Lotus path, `(val)` = resolved by EN-value match.

### about.discord
- EN: `Discord`  FR: `Discord`
  - ko (val): `디스코드`

### cat_moas
- EN: `MOA`  FR: `MOA`
  - tc (val): `恐鳥`
  - zh (val): `恐鸟`

### checklist.task_baro
- EN: `Baro Ki'Teer`  FR: `Baro Ki'Teer`
  - ko (val): `바로 키'티어`

### checklist.trader
- EN: `Baro Ki'Teer`  FR: `Baro Ki'Teer`
  - ko (val): `바로 키'티어`

### collectibles.category.frame_fighter
- EN: `Frame Fighter`  FR: `Frame Fighter`
  - ko (val): `프레임 파이터`
  - tc (val): `戰甲快打`
  - zh (val): `战甲霸王`

### endo
- EN: `Endo`  FR: `Endo`
  - ko (val): `엔도`
  - ru (val): `Эндо`
  - tc (val): `内融核心`
  - uk (val): `Ендо`
  - zh (val): `内融核心`

### filter_kdrive
- EN: `K-Drive`  FR: `K-Drive`
  - tc (val): `K 式懸浮板`
  - zh (val): `K 式悬浮板`

### inventory.endo
- EN: `endo`  FR: `endo`
  - zh (val): `内融核心`

### mastery.cat_amp
- EN: `Amp`  FR: `Amp`
  - de (val): `Verstärker`
  - es (val): `Amplificar`
  - pl (val): `Amplifikator`
  - pt (val): `Amplificador`
  - tc (val): `增幅器`
  - uk (val): `Підсилювач`

### mastery.cat_kdrive
- EN: `K-Drive`  FR: `K-Drive`
  - tc (val): `K 式懸浮板`
  - zh (val): `K 式悬浮板`

### mastery.title_disciple
- EN: `Disciple`  FR: `Disciple`
  - tc (val): `門徒`

### mastery.title_dragon
- EN: `Dragon`  FR: `Dragon`
  - tc (val): `天龍`

### mastery.title_novice
- EN: `Novice`  FR: `Novice`
  - tc (val): `信徒`

### mastery.title_sage
- EN: `Sage`  FR: `Sage`
  - tc (val): `聖者`

### mods.cat_parazon
- EN: `Parazon`  FR: `Parazon`
  - ko (val): `파라존`
  - tc (val): `萬靈袖刃`
  - uk (val): `Паразон`

### mods.cat_railjack
- EN: `Railjack`  FR: `Railjack`
  - ko (val): `레일잭`
  - tc (val): `銳捷號`
  - uk (val): `Рейкоджек`

### ui.checklist.trader
- EN: `Baro Ki'Teer`  FR: `Baro Ki'Teer`
  - ko (val): `바로 키'티어`

### ui.comp.forma
- EN: `Forma`  FR: `Forma`
  - ko (val): `포르마`

### ui.dashboard.baro_kiteer
- EN: `Baro Ki'Teer`  FR: `Baro Ki'Teer`
  - ko (val): `바로 키'티어`

### ui.dashboard.card_nightwave
- EN: `Nightwave`  FR: `Nightwave`
  - es (val): `Onda Nocturna`
  - pl (val): `Gwiezdny Szlak`
  - tc (val): `午夜電波`

### ui.dashboard.cavia
- EN: `Cavia`  FR: `Cavia`
  - ko (val): `카비아`
  - tc (val): `參研者`

### ui.dashboard.cetus
- EN: `Cetus`  FR: `Cetus`
  - ko (val): `시터스`
  - tc (val): `希圖斯`
  - th (val): `ซีตัส`
  - zh (val): `希图斯`

### ui.dashboard.descendia_mission_type_dt_capture
- EN: `Capture`  FR: `Capture`
  - de (mission): `GEFANGENNAHME`
  - es (mission): `CAPTURA`
  - it (mission): `CATTURA`
  - ja (mission): `確保`
  - ko (mission): `생포`
  - pl (mission): `UPROWADZENIE`
  - pt (mission): `CAPTURA`
  - ru (mission): `ЗАХВАТ`
  - tc (mission): `捕獲`
  - th (mission): `จับกุม`
  - tr (mission): `ELE GEÇİRME`
  - uk (mission): `ЗАХОПЛЕННЯ`
  - zh (mission): `捕获`

### ui.dashboard.descendia_mission_type_dt_excavation
- EN: `Excavation`  FR: `Excavation`
  - de (mission): `AUSGRABUNG`
  - es (mission): `EXCAVACIÓN`
  - it (mission): `SCAVO`
  - ja (mission): `発掘`
  - ko (mission): `발굴`
  - pl (mission): `WYDOBYCIE`
  - pt (mission): `ESCAVAÇÃO`
  - ru (mission): `РАСКОПКИ`
  - tc (mission): `挖掘`
  - th (mission): `ขุดเจาะ`
  - tr (mission): `KAZI`
  - uk (mission): `ВИДОБУТОК`
  - zh (mission): `挖掘`

### ui.dashboard.descendia_mission_type_dt_presure_gauge
- EN: `Volatile`  FR: `Volatile`
  - de (val): `VOLATIL`
  - es (val): `VOLÁTIL`
  - ja (val): `揮発`
  - ko (val): `격변`
  - pt (val): `VOLÁTIL`
  - ru (val): `НАЛЁТ`
  - tc (val): `爆發`
  - th (val): `ปะทุง่าย`
  - tr (val): `İNFİLAK`
  - uk (val): `НАЛІТ`
  - zh (val): `爆发`

### ui.dashboard.descendia_mission_type_dt_unique
- EN: `Unique`  FR: `Unique`
  - de (val): `Einzigartig`
  - es (val): `Único`
  - it (val): `Unica`
  - ja (val): `スペシャル`
  - ko (val): `유니크`
  - pl (val): `Unikatowe`
  - pt (val): `Único`
  - ru (val): `Уникальный`
  - tc (val): `獨特`
  - th (val): `มีลักษณะเฉพาะ`
  - tr (val): `Eşsiz`
  - uk (val): `Неповторна зброя`
  - zh (val): `独特`

### ui.dashboard.descendia_penance_devil
- EN: `Roathe`  FR: `Roathe`
  - ko (val): `로스`
  - ru (val): `Роут`
  - tc (val): `羅瑟`
  - uk (val): `Роут`
  - zh (val): `罗瑟`

### ui.dashboard.descendia_penance_harrow
- EN: `Lyon`  FR: `Lyon`
  - ko (val): `리온`
  - pl (val): `Leon`
  - ru (val): `Лион`
  - tc (val): `里昂`
  - uk (val): `Ліон`
  - zh (val): `里昂`

### ui.dashboard.descendia_penance_oraxia
- EN: `Oraxia`  FR: `Oraxia`
  - ko (val): `오락시아`
  - ru (val): `Ораксия`
  - uk (val): `Ораксія`

### ui.dashboard.descendia_penance_wisp
- EN: `Marie`  FR: `Marie`
  - ko (val): `마리`
  - pl (val): `Maria`
  - ru (val): `Мари`
  - tc (val): `瑪麗`
  - uk (val): `Марі`
  - zh (val): `玛丽`

### ui.dashboard.nightwave
- EN: `Nightwave`  FR: `Nightwave`
  - es (val): `Onda Nocturna`
  - pl (val): `Gwiezdny Szlak`
  - tc (val): `午夜電波`

### ui.dashboard.the_circuit
- EN: `The Circuit`  FR: `The Circuit`
  - de (mission): `DER RUNDKURS`
  - tc (mission): `無盡巡迴`
  - th (mission): `เซอร์กิต`

### ui.dashboard.timer_corpus
- EN: `Corpus`  FR: `Corpus`
  - ja (val): `コーパス`
  - ko (val): `코퍼스`
  - ru (val): `Корпус`
  - uk (val): `Корпус`

### ui.dashboard.timer_fass
- EN: `Fass`  FR: `Fass`
  - ko (val): `파스`
  - ru (val): `Фэз`
  - uk (val): `Фасс`

### ui.dashboard.timer_grineer
- EN: `Grineer`  FR: `Grineer`
  - ja (val): `グリニア`
  - ko (val): `그리니어`
  - ru (val): `Гринир`
  - uk (val): `Ґрінери`

### ui.dashboard.timer_vome
- EN: `Vome`  FR: `Vome`
  - ko (val): `봄`
  - ru (val): `Воум`
  - uk (val): `Вом`

### ui.dashboard.timers_cetus
- EN: `Cetus`  FR: `Cetus`
  - ko (val): `시터스`
  - tc (val): `希圖斯`
  - th (val): `ซีตัส`
  - zh (val): `希图斯`

### ui.dashboard.timers_duviri
- EN: `Duviri`  FR: `Duviri`
  - ja (val): `デュヴィリ`
  - ko (val): `두비리`
  - ru (val): `Дувири`
  - tc (val): `渡域`
  - uk (val): `Дувірі`
  - zh (val): `双衍王境`

### ui.dashboard.timers_zariman
- EN: `Zariman`  FR: `Zariman`
  - ko (val): `자리만`
  - tc (val): `扎日曼`
  - zh (val): `扎里曼号`

### ui.dashboard.zariman
- EN: `Zariman`  FR: `Zariman`
  - ko (val): `자리만`
  - tc (val): `扎日曼`
  - zh (val): `扎里曼号`

### ui.inventory.cat_moas
- EN: `MOA`  FR: `MOA`
  - tc (val): `恐鳥`
  - zh (val): `恐鸟`

### ui.inventory.endo
- EN: `Endo`  FR: `Endo`
  - ko (val): `엔도`
  - ru (val): `Эндо`
  - tc (val): `内融核心`
  - uk (val): `Ендо`
  - zh (val): `内融核心`

### ui.inventory.filter_kdrive
- EN: `K-Drive`  FR: `K-Drive`
  - tc (val): `K 式懸浮板`
  - zh (val): `K 式悬浮板`

### ui.inventory.filter_sniper
- EN: `Sniper`  FR: `Sniper`
  - tr (val): `Keskin Nişancı`

### ui.inventory.forma
- EN: `Forma`  FR: `Forma`
  - ko (val): `포르마`

### ui.inventory.forma_umbra
- EN: `Umbra`  FR: `Umbra`
  - ko (val): `움브라`

### ui.notif_mgr.mtype_capture
- EN: `Capture`  FR: `Capture`
  - de (mission): `GEFANGENNAHME`
  - es (mission): `CAPTURA`
  - it (mission): `CATTURA`
  - ja (mission): `確保`
  - ko (mission): `생포`
  - pl (mission): `UPROWADZENIE`
  - pt (mission): `CAPTURA`
  - ru (mission): `ЗАХВАТ`
  - tc (mission): `捕獲`
  - th (mission): `จับกุม`
  - tr (mission): `ELE GEÇİRME`
  - uk (mission): `ЗАХОПЛЕННЯ`
  - zh (mission): `捕获`

### ui.notif_mgr.mtype_extermination
- EN: `Extermination`  FR: `Extermination`
  - de (mission): `AUSLÖSCHUNG`
  - es (mission): `EXTERMINIO`
  - it (mission): `STERMINIO`
  - ja (mission): `掃滅`
  - ko (mission): `섬멸`
  - pl (mission): `EKSTERMINACJA`
  - pt (mission): `EXTERMÍNIO`
  - ru (mission): `ЗАЧИСТКА`
  - tc (mission): `殲滅`
  - th (mission): `กำจัด`
  - tr (mission): `YOK ETME`
  - uk (mission): `ВИНИЩЕННЯ`
  - zh (mission): `歼灭`

### ui.notif_mgr.mtype_interception
- EN: `Interception`  FR: `Interception`
  - de (mission): `ABFANGEN`
  - es (mission): `INTERCEPTACIÓN`
  - it (mission): `INTERCETTAZIONE`
  - ja (mission): `傍受`
  - ko (mission): `감청`
  - pl (mission): `PRZEJĘCIE`
  - pt (mission): `INTERCEPTAÇÃO`
  - ru (mission): `ПЕРЕХВАТ`
  - tc (mission): `攔截`
  - th (mission): `สกัดกั้น`
  - tr (mission): `ENGELLEME`
  - uk (mission): `ПЕРЕХОПЛЕННЯ`
  - zh (mission): `拦截`

### ui.notif_mgr.mtype_sabotage
- EN: `Sabotage`  FR: `Sabotage`
  - es (mission): `SABOTAJE`
  - it (mission): `SABOTAGGIO`
  - ja (mission): `妨害`
  - ko (mission): `파괴공작`
  - pl (mission): `SABOTAŻ`
  - pt (mission): `SABOTAGEM`
  - ru (mission): `ДИВЕРСИЯ`
  - tc (mission): `破壞`
  - th (mission): `ก่อวินาศกรรม`
  - tr (mission): `SABOTAJ`
  - uk (mission): `САБОТАЖ`
  - zh (mission): `破坏`

### ui.notif_mgr.tier_axi
- EN: `Axi`  FR: `Axi`
  - ko (key): `액시`
  - ru (key): `Акси`
  - tc (key): `後紀`
  - uk (key): `Аксі`
  - zh (key): `后纪`

### ui.notif_mgr.tier_lith
- EN: `Lith`  FR: `Lith`
  - ko (key): `리스`
  - ru (key): `Лит`
  - tc (key): `古紀`
  - uk (key): `Літ`
  - zh (key): `古纪`

### ui.notif_mgr.tier_omnia
- EN: `Omnia`  FR: `Omnia`
  - ja (val): `オムニア`
  - ko (val): `옴니아`
  - pt (val): `Ômnica`
  - ru (val): `Омниа`
  - tc (val): `全紀`
  - uk (val): `Омні`
  - zh (val): `全能`

### ui.notif_mgr.tier_requiem
- EN: `Requiem`  FR: `Requiem`
  - es (val): `Réquiem`
  - ko (val): `레퀴엠`
  - pt (val): `Réquiem`
  - ru (val): `Реквием`
  - tc (val): `鎮魂`
  - uk (val): `Реквієм`
  - zh (val): `安魂`

## Category B: MANUAL TRANSLATION NEEDED (38)
No dict source. Write one native translation per locale. FR is semantic reference only.

### badge_mod
- EN: `Mod`  FR: `Module`
- still EN in: de, es, pl, pt, tr

### cat_necramechs
- EN: `Necramechs`  FR: `Nécramechs`
- still EN in: de, es, pt

### checklist.task_descendia
- EN: `Descendia`  FR: `La Descendia`
- still EN in: de, es, it, ko, pl, tc, th, tr, zh

### checklist.task_voca
- EN: `Loid: Voca`  FR: `Loid : Voca`
- still EN in: de, it, ko, pl, pt, ru, tc, th, tr, uk, zh

### collectibles.category.necralisk
- EN: `Necralisk`  FR: `Nécralisque`
- still EN in: de, es, it, pt, tr

### credits
- EN: `Credits`  FR: `Crédits`
- still EN in: de

### filter_necramech
- EN: `Necramech`  FR: `Nécramécanique`
- still EN in: de, es, it, pl, pt, tr

### inventory.set
- EN: `Set`  FR: `Ensemble`
- still EN in: de, tr

### mastery.cat_necramech
- EN: `Necramech`  FR: `Nécramécanique`
- still EN in: de, es, it, pl, pt, tr

### mastery.details
- EN: `Details`  FR: `Détails`
- still EN in: de

### mastery.title_tiger
- EN: `Tiger`  FR: `Tigre`
- still EN in: de

### mods.sort_name
- EN: `Name`  FR: `Nom`
- still EN in: de

### riven_card.na
- EN: `N/A`  FR: `N/D`
- still EN in: de, ja, ko

### rivens.sort_name
- EN: `Name`  FR: `Nom`
- still EN in: de

### settings.cursor
- EN: `Cursor`  FR: `Curseur`
- still EN in: de, es, pt

### settings.updates
- EN: `Updates`  FR: `Mises à jour`
- still EN in: de

### ui.dashboard.archimedea
- EN: `Archimedea`  FR: `Archimédée`
- still EN in: de, th

### ui.dashboard.archimedea_temporal
- EN: `Temporal Archimedea`  FR: `Archimedea Temporelle`
- still EN in: zh

### ui.dashboard.card_descendia
- EN: `Descendia`  FR: `La Descendia`
- still EN in: de, es, it, ko, pl, tc, th, tr, zh

### ui.dashboard.card_sp_incursions
- EN: `SP Incursions`  FR: `Incursions SP`
- still EN in: th

### ui.dashboard.credits
- EN: `Credits`  FR: `Crédits`
- still EN in: de

### ui.dashboard.deimos
- EN: `Deimos`  FR: `Déimos`
- still EN in: de, es, it, pl, pt, tr

### ui.dashboard.descendia_mission_type_desc_dt_loot
- EN: `Loot containers within time limit.`  FR: `Récupérez le butin.`
- still EN in: tc, th, tr, zh

### ui.dashboard.descendia_mission_type_desc_dt_netracells
- EN: `Kill marked Necramites that periodically spawn.`  FR: `Élimination ciblée - détruisez les Netracells.`
- still EN in: tc, th, tr, zh

### ui.dashboard.descendia_mission_type_desc_dt_unique
- EN: `Unique mission objective.`  FR: `Mission unique.`
- still EN in: ja, ko, tc, th, tr, zh

### ui.dashboard.descendia_mission_type_dt_interception
- EN: `Mobile Interception`  FR: `Interception mobile`
- still EN in: de

### ui.dashboard.descendia_penance_void_aberration
- EN: `Vampyric Liminus`  FR: `Liminus vampyrique`
- still EN in: tc, th, zh

### ui.dashboard.season_winter
- EN: `Winter`  FR: `Hiver`
- still EN in: de

### ui.dashboard.sp_incursions
- EN: `SP Incursions`  FR: `Incursions SP`
- still EN in: th

### ui.dashboard.timer_warm
- EN: `Warm`  FR: `Chaud`
- still EN in: de

### ui.elements.void
- EN: `Void`  FR: `Vide`
- still EN in: de, it, pt, tr

### ui.inventory.badge_mod
- EN: `Mod`  FR: `Module`
- still EN in: de, es, pl, pt, tr

### ui.inventory.cat_necramechs
- EN: `Necramechs`  FR: `Nécramechs`
- still EN in: de, es, pt

### ui.inventory.credits
- EN: `Credits`  FR: `Crédits`
- still EN in: de

### ui.inventory.filter_necramech
- EN: `Necramech`  FR: `Nécramécanique`
- still EN in: de, es, it, pl, pt, tr

### ui.inventory.sort_name
- EN: `Name`  FR: `Nom`
- still EN in: de

### ui.notif_mgr.tier_meso
- EN: `Meso`  FR: `Méso`
- still EN in: de, es, it, pt

### ui.notif_mgr.tier_neo
- EN: `Neo`  FR: `Néo`
- still EN in: de, es, it, pt

## Category C: UNIVERSAL — leave as EN (111)
FR keeps EN too and dict has nothing. Correct in all locales.

```
about.github = 'GitHub'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
about.title = 'Cephalon Kronos'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
cat_arcanes = 'Arcanes'  [still EN: de]
cat_arcwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
cat_ayatan = 'Ayatan'  [still EN: de, es, it, pl, pt, tc, tr, zh]
cat_kdrives = 'K-Drives'  [still EN: de, es, pt, tc, th, tr, zh]
cat_kits = 'Kitguns'  [still EN: de, es, pl, pt, tc, tr, zh]
cat_mods = 'Mods'  [still EN: de, es, it, pt, tc, zh]
cat_rivens = 'Rivens'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
cat_warframes = 'Warframes'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
cat_zaws = 'Zaws'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
collectibles.category.fortuna = 'Fortuna'  [still EN: de, es, it, pl, pt, tr]
collectibles.category.kuria = 'Kuria'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
collectibles.category.somachord = 'Somachord'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
collectibles.count_of_total = '{count} / {total}'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
filter_archwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
filter_incarnon = 'Incarnon'  [still EN: de, es, it, ko, pl, pt, tc, th, tr, uk, zh]
filter_prime = 'Prime'  [still EN: de, es, it, pl, pt, ru, tc, th, tr, uk, zh]
maps.visible = 'Visible'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
mastery.cat_archwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, tr, zh]
mastery.cat_kitgun = 'Kitgun'  [still EN: de, es, it, pl, pt, tc, tr]
mastery.cat_warframe = 'Warframe'  [still EN: de, es, it, ja, ko, pl, pt, tc, th, tr, uk]
mastery.cat_zaw = 'Zaw'  [still EN: de, es, it, pl, pt, tc, th, tr]
mastery.mp = 'MP'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
mastery.mp_close = 'MP)'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
mastery.mp_short = 'MP'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
mastery.mp_value = '{xp} MP'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
mods.cat_antique = 'Antique'  [still EN: tc]
mods.cat_augment = 'Augment'  [still EN: de, tc]
mods.cat_aura = 'Aura'  [still EN: de, es, it, pt, tc, tr]
mods.cat_exilus = 'Exilus'  [still EN: de, es, it, pl, pt, tc, tr]
mods.cat_warframe = 'Warframe'  [still EN: de, es, it, ja, ko, pl, pt, tc, th, tr, uk]
nav.mods = 'Mods'  [still EN: de, es, pt]
nav.rivens = 'Rivens'  [still EN: de, es, pt, tr]
nav.wiki = 'Wiki'  [still EN: de, es, it, ja, pl, pt, tc, tr, zh]
notes.lang_bash = 'Bash'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, tr, uk, zh]
notes.lang_css = 'CSS'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_html = 'HTML'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_js = 'JavaScript'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_json = 'JSON'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_jsx = 'JSX'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_py = 'Python'  [still EN: de, es, it, ja, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_rs = 'Rust'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_ts = 'TypeScript'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
notes.lang_tsx = 'TSX'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
platinum = 'Platinum'  [still EN: de]
relics.bp_close = 'BP)'  [still EN: de, es, it, ja, ko, pl, pt, tc, th, tr, uk, zh]
relics.era_label = '{era}'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
relics.gain_ducats = 'GAIN (D)'  [still EN: es, tc, th]
relics.gain_plat = 'GAIN (P)'  [still EN: es, tc, th]
relics.platinum = '{plat}p'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
riven_card.plat_short = '{p}p'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
riven_card.tier_meta = 'Meta'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
riven_card.tier_niche = 'Niche'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
rivens.sort_plat = 'Platinum'  [still EN: de]
rivens.type_kitgun = 'Kitguns'  [still EN: de, es, pl, pt, tc, tr, zh]
rivens.type_sniper = 'Snipers'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
rivens.type_zaw = 'Zaws'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
screen.mods = 'Mods'  [still EN: de, es, pt]
screen.wiki = 'Wiki'  [still EN: de, es, it, ja, pl, pt, tc, tr, zh]
settings.version = 'Version'  [still EN: de]
ui.dashboard.card_1999 = 'Nexus 1999'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.card_archimedea = 'Archimedea'  [still EN: de, th]
ui.dashboard.card_baro = 'Baro'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.card_circuit = 'Circuit'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.card_fissures = 'Fissures'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.card_sorties = 'Sorties'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.descendia = 'Descendia'  [still EN: de, es, it, ko, pl, tc, th, tr, zh]
ui.dashboard.descendia_normal = 'Normal'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.descendia_penance_heavy_weapons_only = 'Heavy Weapons Only'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.descendia_penance_john_prodman = 'John Prodman'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.descendia_penance_mech_combat_only = 'Mech Combat'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.descendia_penance_shocking_leech = 'Shocking Leech'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.ducats = 'Ducats'  [still EN: es, pt, tc]
ui.dashboard.hex = 'Hex'  [still EN: de, es, it, ko, pl, pt, tc, tr, zh]
ui.dashboard.inf = 'INF.'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.dashboard.rotation = 'Rotation {rot}'  [still EN: de]
ui.elements.impact = 'Impact'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.elements.radiation = 'Radiation'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.elements.viral = 'Viral'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.inventory.cat_arcanes = 'Arcanes'  [still EN: de]
ui.inventory.cat_archwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.cat_archwings = 'Archwings'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.cat_arcwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.cat_ayatan = 'Ayatan'  [still EN: de, es, it, pl, pt, tc, tr, zh]
ui.inventory.cat_kdrives = 'K-Drives'  [still EN: de, es, pt, tc, th, tr, zh]
ui.inventory.cat_kitguns = 'Kitguns'  [still EN: de, es, pl, pt, tc, tr, zh]
ui.inventory.cat_kits = 'Kitguns'  [still EN: de, es, pl, pt, tc, tr, zh]
ui.inventory.cat_mods = 'Mods'  [still EN: de, es, it, pt, tc, zh]
ui.inventory.cat_rivens = 'Rivens'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.cat_warframes = 'Warframes'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.cat_zaws = 'Zaws'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.filter_archwing = 'Archwing'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.filter_incarnon = 'Incarnon'  [still EN: de, es, it, ko, pl, pt, tc, th, tr]
ui.inventory.filter_kitgun = 'Kitgun'  [still EN: de, es, it, pl, pt, tc, tr, zh]
ui.inventory.filter_prime = 'Prime'  [still EN: de, es, it, pl, pt, tc, th, tr, zh]
ui.inventory.filter_zaw = 'Zaw'  [still EN: de, es, it, ja, pl, pt, tc, th, tr, zh]
ui.inventory.forma_aura = 'Aura'  [still EN: de, es, it, pt, tc, tr]
ui.inventory.forma_standard = 'Standard'  [still EN: de, it, tc]
ui.inventory.incarnon = 'Incarnon'  [still EN: de, es, it, ko, pl, pt, tc, th, tr]
ui.inventory.missions = 'Missions'  [still EN: tc]
ui.inventory.optimal = 'Optimal'  [still EN: de, tc, tr]
ui.inventory.platinum = 'Platinum'  [still EN: de]
ui.inventory.sort_xp = 'XP'  [still EN: es, it, ja, ko, pl, tc, th, tr]
ui.inventory.sources = 'Sources'  [still EN: tc]
ui.inventory.tab_ayatan = 'Ayatan'  [still EN: de, es, it, pl, pt, tc, tr]
ui.inventory.tab_warframes = 'Warframes'  [still EN: de, es, pl, pt, tc]
ui.notif_mgr.msg = 'MSG'  [still EN: es, it, pl, pt, tc, tr]
ui.notif_mgr.opt_normal = 'Normal'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, uk, zh]
ui.relic_reward.bp = 'BP'  [still EN: de, it, ja, tc, tr, uk, zh]
ui.riven_card.mr = 'MR {mr}'  [still EN: de, es, it, ja, ko, pl, pt, ru, tc, th, tr, zh]
```