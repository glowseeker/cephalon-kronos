import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const res = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai';

// Load EN peely section to preserve ItemType paths
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
const enPeely = enData.peely || {};
const enItems = Object.keys(enPeely);

// Game-sourced term translations from dict files
function loadDict(loc) {
    const file = loc === 'fr' ? 'dict.fr.json' : `dict.${loc}.json`;
    try {
        return JSON.parse(fs.readFileSync(`${res}/${file}`, 'utf8'));
    } catch { return {}; }
}

const dicts = {};
for (const loc of locs) dicts[loc] = loadDict(loc);

// Helper: resolve game-sourced terms from dict
function resolveFromDict(loc, enText) {
    const dict = dicts[loc];
    // Try exact match in dict values
    for (const [k, v] of Object.entries(dict)) {
        if (v === enText) return v;
    }
    return null;
}

// Peely Pix names: most are proper nouns, keep as-is.
// But some can be translated. Descriptions contain game terms.
// Key translations for game-sourced terms used in descriptions:
const gameTermTranslations = {
    fr: {
        'Health Orbs': 'Orbes de santé',
        'Energy Orbs': 'Orbes d\'énergie',
        'Ammo': 'Munitions',
        'SporeX Charges': 'Charges SporeX',
        'Cold': 'Froid',
        'Toxin': 'Ténèbres',
        'Gas': 'Gaz',
        'Knockdown': 'Tombée',
        'Anti-Matter': 'Antimatière',
        'Null Star': 'Étoile nulle',
        'Elemental Ammo': 'Munitions élémentaires',
        'Cold Damage': 'Dégâts de Froid',
        'Strength': 'Force',
        'Secondary': 'Secondaire',
        'Primary': 'Primaire',
        'damage': 'dégâts',
        'points': 'points',
        'revive': 'revival',
        'Health': 'santé',
        'Shield': 'bouclier',
        'HP': 'PV',
        'Gravity': ' gravité',
        'Wall Latch': 'accroche murale',
        'Aim Glide': 'glisse visée',
        'Snow Globe': 'bulle de neige',
        'Eximus': 'Eximus',
        'Weakpoint': 'point faible',
        'Saryn': 'Saryn',
    },
    de: {
        'Health Orbs': 'Gesundheitskugeln',
        'Energy Orbs': 'Energiekugeln',
        'Ammo': 'Munition',
        'SporeX Charges': 'SporeX-Ladungen',
        'Cold': 'Kälte',
        'Toxin': 'Gift',
        'Gas': 'Gas',
        'Knockdown': 'Umstoßen',
        'Anti-Matter': 'Antimaterie',
        'Null Star': 'Null-Stern',
        'Elemental Ammo': 'Elementar-Munition',
        'Cold Damage': 'Kälte-Schaden',
        'Secondary': 'Sekundär',
        'Primary': 'Primär',
        'damage': 'Schaden',
        'points': 'Punkte',
        'revive': 'beleben',
        'Health': 'Gesundheit',
        'Shield': 'Schild',
        'HP': 'LP',
        'Gravity': ' Schwerkraft',
        'Wall Latch': 'Wandklemmung',
        'Aim Glide': 'Zielgleiten',
        'Snow Globe': 'Schneekugel',
        'Eximus': 'Eximus',
        'Weakpoint': 'Schwachpunkt',
        'Saryn': 'Saryn',
    },
    es: {
        'Health Orbs': 'Orbes de salud',
        'Energy Orbs': 'Orbes de energía',
        'Ammo': 'Munición',
        'SporeX Charges': 'Cargas SporeX',
        'Cold': 'Frío',
        'Toxin': 'Toxina',
        'Gas': 'Gas',
        'Knockdown': 'Derribo',
        'Anti-Matter': 'Antimateria',
        'Null Star': 'Estrella Nula',
        'Elemental Ammo': 'Munición elemental',
        'Cold Damage': 'Daño de frío',
        'Secondary': 'Secundaria',
        'Primary': 'Primaria',
        'damage': 'daño',
        'points': 'puntos',
        'revive': 'revivir',
        'Health': 'Salud',
        'Shield': 'Escudo',
        'HP': 'PV',
        'Gravity': ' gravedad',
        'Wall Latch': 'agarrarse a la pared',
        'Aim Glide': 'planar con puntería',
        'Snow Globe': 'globo de nieve',
        'Eximus': 'Eximus',
        'Weakpoint': 'punto débil',
        'Saryn': 'Saryn',
    },
};

// For each locale, translate the peely section
// Names: keep as-is (proper nouns) for most, but translate descriptions
const nameTranslations = {
    tr: {
        'Argon Combo #2': 'Argon Kombo #2',
        'Breathless': 'Nefesiz',
        'Burgerfest': 'Burger Festivali',
        'Catscratch Fever': 'Böcek Çalma Hastalığı',
        'Crushing Chills': 'Ettirip Soğutmak',
        'Doktor\'s Orders': 'Doktorun Emri',
        'Fly, Fly!': 'Uç, Uç!',
        'Going Steady': 'Kararlılık',
        'Hi-Score': 'Yüksek Skor',
        'It Sees You': 'Sizi Görüyor',
        'Old Pizza': 'Eski Pizza',
        'Only Knives': 'Yalnızca Bıçaklar',
        'Optimism': 'İyimserlik',
        'Panic Call': 'Panik Çağrısı',
        'Resolutions': 'Kararlar',
        'Reverse-O': 'Reverse-O',
        'Slippery Customer': 'Kaygan Müşteri',
        'Spinnin\' Around': 'Çevrimde Dönüyor',
        'Super Scavenger': 'Süper Toplayıcı',
        'Through My Heart': 'Kalbimin Altından',
        'Too Hot': 'Çok Sıcak',
        'Vintage Tech': 'Retro Teknoloji',
        'Wakeup Call': 'Uyanış Çağrısı',
        'Walking on Air': 'Havada Yürümek',
        'XL Frosty': 'XL Buzlu',
    },
    uk: {
        'Argon Combo #2': 'Аргонова Комбінація #2',
        'Breathless': 'Нефлеґмований',
        'Burgerfest': 'Бургерний Фестиваль',
        'Catscratch Fever': 'Котяче Піджорювання',
        'Crushing Chills': 'Ледяне Штормування',
        'Doktor\'s Orders': 'Наказ Лікаря',
        'Fly, Fly!': 'Лети, лети!',
        'Going Steady': 'Стабільність',
        'Hi-Score': 'Високий Рахунок',
        'It Sees You': 'Він бачить тебе',
        'Old Pizza': 'Стара Піца',
        'Only Knives': 'Тільки Ножі',
        'Optimism': 'Оптимізм',
        'Panic Call': 'Панічний Дзвінок',
        'Resolutions': 'Розв'язання',
        'Reverse-O': 'Reverse-O',
        'Slippery Customer': 'Слизький Клієнт',
        'Spinnin\' Around': 'Кружаться',
        'Super Scavenger': 'Супер-Збирач',
        'Through My Heart': 'Крізь Моє Серце',
        'Too Hot': 'Занадто Гарячо',
        'Vintage Tech': 'Ретро-Технології',
        'Wakeup Call': 'Пробуждаючий Дзвінок',
        'Walking on Air': 'Ходжиння повітря',
        'XL Frosty': 'XL Морозний',
    },
};

// Description translations per locale
const descTranslations = {
    // French (partially have gameTermTranslations, fill in the rest)
    fr: {
        'Argon Combo #2': "À chaque kill de point faible : chance augmentée de déposer des Orbes de santé, Orbes d'énergie, Munitions, Pheroglands ou Charges SporeX de 20%.",
        'Breathless': "Gagne 100% de résistance au Gaz et au Toxique pendant 30s. Les Orbes de santé collectées ajoutent 20s.",
        'Burgerfest': "Les ennemis ont 15% de chance de déposer des Boîtes à Burgers qui guérissent les alliés proches de 10% et les cibles de défense de 100%.",
        'Catscratch Fever': "Toutes les 20s, un ennemi dans les 30m est affecté par les Spores de Saryn.",
        'Crushing Chills': "Un Heavy Slam avec un combo x6 crée jusqu'à 3 Bulles de Neige avec un délai de 10s.",
        'Doktor\'s Orders': "Équipe un EFV-8 Mars avec +450% de dégâts comme arme secondaire.",
        'Fly, Fly!': "Les ennemis ont 15% de chance de déposer des grenades qui purifient la contamination Hell-Scrubber.",
        'Going Steady': "100% de chance de résister aux chutes.",
        'Hi-Score': "Gagne 20 points par kill, 100 par kill de point faible. Revivifications bonus à 1000, 2500, 5000 points.",
        'It Sees You': "Une goutte d'Antimatière apparaît à 25m de distance et poursuit toutes les 20s. Gagne 1 Pix Chip en cas de succès.",
        'Old Pizza': "Lors des dommages : 6% de chance de recevoir le statut Toxique. Délai de 5s. Gagne 1 Pix Chip en cas de succès.",
        'Only Knives': "Équipe des Scaldra Dual Viciss avec +450% de dégâts comme armes de mêlée.",
        'Optimism': "Génère des cumulés de Froid toutes les 8s. Congèle à 10 cumulés pendant 3s. Roule ou Void Sling pour dégeler 3 cumulés.",
        'Panic Call': "Minerva ou Velimir tenteront de vous relever. Délai de 30s.",
        'Resolutions': "Équipe un Purgator 1 avec +450% de dégâts comme arme principale.",
        'Reverse-O': "Lors d'une attaque lourde : transfère les effets de statut négatifs sur les ennemis dans les 10m.",
        'Slippery Customer': "Première fois abattu : téléporte en sécurité, revient avec 50% PV/Boucliers, invulnérable 9s.",
        'Spinnin\' Around': "Les kills de point faible génèrent 1 Étoile Nulle (max 18). Les Étoiles Nulles réduisent les dégâts de 5%.",
        'Super Scavenger': "Lors d'un kill d'Eximus : 45% de chance de déposer un pack de Munitions Élémentaires.",
        'Through My Heart': "Équipe un EFV-5 Jupiter avec +450% de dégâts comme arme principale.",
        'Too Hot': "Prendre des dommages sous 70% PV crée un clone Molt toutes les 10s.",
        'Vintage Tech': "Invoque un Nécramécan. Délai de 60s après destruction.",
        'Wakeup Call': "Un RPG Thermien chargé peut être déployé depuis la Roue d'équipement. Délai de 60s.",
        'Walking on Air': "Augmente la durée du glissage visé et de l'accroche murale de +100%. Diminue la gravité de 100%.",
        'XL Frosty': "Ajoute +30% de dégâts de Froid aux armes principales et secondaires.",
    },
    de: {
        'Argon Combo #2': "Bei Weakpoint-Treffer: Chance, dass Gesundheitskugeln, Energiekugeln, Munition, Pheroglands oder SporeX-Ladungen um 20% mehr fallen.",
        'Breathless': "Erhält 100% Widerstand gegen Gas und Gift für 30s. Gesammelte Gesundheitskugeln fügen 20s hinzu.",
        'Burgerfest': "Feinde haben 15% Chance, Argon-Burger-Boxen zu fallen zu lassen, die nahegelegte Alliierten um 10% heilen und Verteidigungsziele um 100%.",
        'Catscratch Fever': "Alle 20s wird ein Feind innerhalb von 30m von Saryns Sporen betroffen.",
        'Crushing Chills': "Schwerer Slam mit 6x-Kombo erzeugt bis zu 3 Schneekugeln mit 10s Cooldown.",
        'Doktor\'s Orders': "Rüste einen EFV-8 Mars mit +450% Schaden als Sekundärwaffe aus.",
        'Fly, Fly!': "Feinde haben 15% Chance, Granaten zu fallen zu lassen, die Hell-Scrubber-Verunreinigungen reinigen.",
        'Going Steady': "100% Chance, Umstoßen zu widerstehen.",
        'Hi-Score': "Erhält 20 Punkte pro Kill, 100 pro Weakpoint-Kill. Bonus-Behandlungen bei 1000, 2500, 5000 Punkten.",
        'It Sees You': "Ein Antimaterie-Tropfen erscheint 25m entfernt und jagt alle 20s. Erhält 1 Pix Chip bei Erfolg.",
        'Old Pizza': "Bei Schaden: 6% Chance, Gift-Status zu erhalten. Abklingzeit: 5s. Gewinnt 1 Pix Chip bei Erfolg.",
        'Only Knives': "Rüste Scaldra Dual Viciss mit +450% Schaden als Nahkampf-Waffen aus.",
        'Optimism': "Baut Kälte-Stack alle 8s auf. Einfrieren bei 10 Stacks für 3s. Rollen oder Void Sling, um 3 Stacks zu enteisen.",
        'Panic Call': "Minerva oder Velimir versuchen, dich zu beleben. 30s Abklingzeit.",
        'Resolutions': "Rüste einen Purgator 1 mit +450% Schaden als Primärwaffe aus.",
        'Reverse-O': "Bei schwerem Angriff: Überträgt negative Status-Effekte auf Feinde innerhalb von 10m.",
        'Slippery Customer': "Erster Fall gescheitert: zum Schutz teleportieren, mit 50% LP/Schilden beleben, 9s unkalkulierbar.",
        'Spinnin\' Around': "Weakpoint-Tode erzeugen 1 Null-Stern (max 18). Null-Sterne reduzieren Schaden um 5%.",
        'Super Scavenger': "Bei Eximus-Tod: 45% Chance, ein Elementar-Munitionspaket zu fallen zu lassen.",
        'Through My Heart': "Rüste einen EFV-5 Jupiter mit +450% Schaden als Primärwaffe aus.",
        'Too Hot': "Schaden unter 70% LP erzeugt alle 10s einen Molt-Klon.",
        'Vintage Tech': "beschwört einen Necramech. 60s Abklingzeit nach Zerstörung.",
        'Wakeup Call': "Ein geladener Thermian RPG kann vom Gehölzrad aus eingesetzt werden. 60s Abklingzeit.",
        'Walking on Air': "Erhöht Zielgleiten und Wandklemmung um +100%. Reduziert Schwerkraft um 100%.",
        'XL Frosty': "Fügt +30% Kälte-Schaden zu Primär- und Sekundärwaffen hinzu.",
    },
    es: {
        'Argon Combo #2': "En kill de punto débil: se aumenta en 20% la probabilidad de dropear Orbes de salud, Orbes de energía, Munición, Pheroglands o Cargas SporeX.",
        'Breathless': "Gana 100% de resistencia a Gas y Toxina durante 30s. Los Orbes de salud recolectados añaden 20s.",
        'Burgerfest': "Los enemigos tienen 15% de posibilidad de dejar caer Cajas de Hamburguesas que curan aliados cercanos en 10% y objetivos de defensa en 100%.",
        'Catscratch Fever': "Cada 20s, un enemigo dentro de 30m es afectado por Spores de Saryn.",
        'Crushing Chills': "Heavy Slam con combo x6 crea hasta 3 Globos de Nieve con cooldown de 10s.",
        'Doktor\'s Orders': "Equipa un EFV-8 Mars con +450% de daño como arma secundaria.",
        'Fly, Fly!': "Los enemigos tienen 15% de posibilidad de dropear granadas que limpian la contaminación Hell-Scrubber.",
        'Going Steady': "100% de probabilidad de resistir derribos.",
        'Hi-Score': "Gana 20 puntos por kill, 100 por kill de punto débil. Revivencias extra en 1000, 2500, 5000 puntos.",
        'It Sees You': "Una gota de Antimateria aparece a 25m de distancia y persigue cada 20s. Gana 1 Pix Chip si tiene éxito.",
        'Old Pizza': "Al recibir daño: 6% de posibilidad de recibir estado Toxina. Enfriamiento: 5s. Gana 1 Pix Chip si tiene éxito.",
        'Only Knives': "Equipa Scaldra Dual Viciss con +450% de daño como armas cuerpo a cuerpo.",
        'Optimism': "Genera acumulaciones de Frío cada 8s. Congela a 10 acumulaciones por 3s. Rodar o Void Sling para descongelar 3 acumulaciones.",
        'Panic Call': "Minerva o Velimir intentarán revivirte. Enfriamiento de 30s.",
        'Resolutions': "Equipa un Purgator 1 con +450% de daño como arma primaria.",
        'Reverse-O': "Al golpear con ataque pesado: transfiere efectos de estado negativos a enemigos en 10m.",
        'Slippery Customer': "Primera vez derribado: teletransporta a seguridad, revive con 50% PV/Escudos, invulnerable 9s.",
        'Spinnin\' Around': "Kills de punto débil generan 1 Estrella Nula (máx 18). Estrellas Nulas reducen daño en 5%.",
        'Super Scavenger': "Al matar Eximus: 45% de probabilidad de dropear un paquete de Munición Elemental.",
        'Through My Heart': "Equipa un EFV-5 Jupiter con +450% de daño como arma primaria.",
        'Too Hot': "Recibir daño por debajo del 70% de PV crea un clon Molt cada 10s.",
        'Vintage Tech': "Invoca un Necramech. Enfriamiento de 60s tras ser destruido.",
        'Wakeup Call': "Un RPG Thermiano cargado puede desplegarse desde la Rueda de Equipamiento. Enfriamiento de 60s.",
        'Walking on Air': "Aumenta duración del Aim Glide y Wall Latch +100%. Reduce gravedad en 100%.",
        'XL Frosty': "Añade +30% de daño de Frío a armas primarias y secundarias.",
    },
    it: {
        'Argon Combo #2': "Al kill del punto de colpo: chance aumentata del 20% di drop di Orbe di Salute, Orbe di Energia, Munizioni, Pheroglands o Cariche SporeX.",
        'Breathless': "Ottieni il 100% di resistenza a Gas e Tossina per 30s. Le Orbe di Salute raccolte aggiungono 20s.",
        'Burgerfest': "I nemici hanno uno 15% di possibilità di dropare Scatole di Hamburger che guariscono gli alleati vicini del 10% e le coperture difensive del 100%.",
        'Catscratch Fever': "Ogni 20s, un nemico entro 30m è colpito dalle Spore di Saryn.",
        'Crushing Chills': "Heavy Slam con combo x6 crea fino a 3 Bolla di Neve con cooldown di 10s.",
        'Doktor\'s Orders': "Attiva un EFV-8 Mars con +450% di danni come arma secondaria.",
        'Fly, Fly!': "I nemici hanno uno 15% di possibilità di dropare granate che puliscono la contaminazione Hell-Scrubber.",
        'Going Steady': "100% di probabilità di resistere agli scontri.",
        'Hi-Score': "Ottieni 20 punti per kill, 100 per kill del punto debole. Revivi bonus a 1000, 2500, 5000 punti.",
        'It Sees You': "Una goccia di Antimateria appare a 25m e insegue ogni 20s. Ottieni 1 Pix Chip in caso di successo.",
        'Old Pizza': "Quando colpito: 6% di probabilità di ricevere lo stato Tossina. Tempo di attesa: 5s. Ottieni 1 Pix Chip in caso di successo.",
        'Only Knives': "Attiva Scaldra Dual Viciss con +450% di danni come armi da mischia.",
        'Optimism': "Genera stack di Freddo ogni 8s. Congela a 10 stack per 3s. Corri o Void Sling per sciogliere 3 stack.",
        'Panic Call': "Minerva o Velimir cercano di rianimarti. Tempo di attesa: 30s.",
        'Resolutions': "Attiva un Purgator 1 con +450% di danni come arma principale.",
        'Reverse-O': "All'attacco pesante: trasferisce effetti di stato negativi su nemici entro 10m.",
        'Slippery Customer': "La prima volta sconfitto: teletrasporta alla sicurezza, rianima con 50% PF/Scudi, invulnerabile per 9s.",
        'Spinnin\' Around': "I kill del punto debole generano 1 Stella Nul (max 18). Le Stelle Nul riducono i danni del 5%.",
        'Super Scavenger': "Al kill di Eximus: 45% di possibilità di dropare un Pacchetto di Munizioni Elementali.",
        'Through My Heart': "Attiva un EFV-5 Jupiter con +450% di danni come arma principale.",
        'Too Hot': "Subire danni sotto il 70% di PF crea un clone Molt ogni 10s.",
        'Vintage Tech': "Evoca un Necramech. Tempo di attesa di 60s dopo la distruzione.",
        'Wakeup Call': "Un RPG Thermiano carico può essere distribuito dal Rotante dell'Equipaggiamento. Tempo di attesa: 60s.",
        'Walking on Air': "Aumenta la durata di Aim Glide e Wall Latch del +100%. Riduce la gravità del 100%.",
        'XL Frosty': "Aggiunge +30% di danni da Freddo alle armi principali e secondarie.",
    },
};

// For locales without specific translations, use the French as fallback base
// but this is not ideal. Let me do proper translations for all.

const descTranslationsFull = {
    ja: {
        'Argon Combo #2': "弱点撃殺時：ヘルスオーブ、エネルギーオーブ、弾薬、フェログラン、スポーレックスチャージのドロップ率が20%上昇",
        'Breathless': "30秒間ガスと毒への100%抵抗を獲得。回収したヘルスオーブで20秒追加",
        'Burgerfest': "敵が15%の確率で、近隣の味方を10%、防衛目標を100%治癒するアルゴンバーガーボックスをドロップ",
        'Catscratch Fever': "20秒ごとに、30m以内の敵がサリンのスポアの影響を受ける",
        'Crushing Chills': "6連続コンボのヘビースラムで10秒冷却で最大3つのスノーグローブを生成",
        'Doktor\'s Orders': "EFV-8マルスを二次武器として+450%ダメージで装備",
        'Fly, Fly!': "敵が15%の確率でヘル-スクランバー汚染を消去する手榴弾をドロップ",
        'Going Steady': "転倒耐性100%",
        'Hi-Score': "キルにつき20ポイント、weakpointキルにつき100ポイント。1000、2500、5000ポイントで追加リザレクト",
        'It Sees You': "25m先にアンチマターデロップが現れ、20秒ごとに追跑。成功時1ピクチップ獲得",
        'Old Pizza': "ダメージ時：6%の確率で毒ステータスを獲得。クールダウン：5秒。成功時1ピクチップ",
        'Only Knives': "スカルドラデュアルヴィシスを近接武器として+450%ダメージで装備",
        'Optimism': "8秒ごとにクールスタックを蓄積。10スタックで3秒間凍結。3スタックを溶解するにはロールまたはVoid Sling",
        'Panic Call': "MinervaまたはVelimirが蘇生を試みる。30秒クールダウン",
        'Resolutions': "Purgator 1を主要武器として+450%ダメージで装備",
        'Reverse-O': "重攻撃命中時：10m以内の敵に负面ステータス効果を移動",
        'Slippery Customer': "初回降伏時：安全にテレポート、50%HP/シールドで蘇生、9秒間無敵",
        'Spinnin\' Around': "Weakpointキルで1つのNull Starを生成（最大18）。Null Starで5%ダメージ軽減",
        'Super Scavenger': "Eximusキル時：45%の確率でElemental Ammo Packをドロップ",
        'Through My Heart': "EFV-5ジュピターを主要武器として+450%ダメージで装備",
        'Too Hot': "70%以下のHPでダメージを受けると10秒ごとにMoltクローンを生成",
        'Vintage Tech': "Necramechを召喚。破壊後60秒クールダウン",
        'Wakeup Call': "装備ホイールからロードされたThermian RPGを展開可能。60秒クールダウン",
        'Walking on Air': "Aim GlideとWall Latchの持続時間を+100%増加。重力を100%軽減",
        'XL Frosty': "主要および二次武器に+30%クールダメージを追加",
    },
    ko: {
        'Argon Combo #2': "약점 킬 시: 체력 구슬, 에너지 구슬, 탄약, 페로글랜드, 스포어X 충전의 드롭률이 20% 증가",
        'Breathless': "30초간 가스와 독성에 대한 100% 저항력 획득. 수집한 체력 구슬은 20초 추가",
        'Burgerfest': "적 15% 확률로, 근처의 동료에게 10% 치유 및 방어 대상에게 100% 치유하는 아르곤 버거 상자 드롭",
        'Catscratch Fever': "20초마다, 30m 내 적이 Saryn의 스포어에 영향을 받음",
        'Crushing Chills': "6배 콤보의 Heavy Slam으로 10초 쿨타임으로 최대 3개의 눈 보 Globe 생성",
        'Doktor\'s Orders': "EFV-8 마르스를 보조 무기로 +450% 데미지로 장착",
        'Fly, Fly!': "적 15% 확률로, 헬-스크런버 오염을 청소하는 수류탄 드롭",
        'Going Steady': "취약 상태(knockdown)에 대한 100% 저항",
        'Hi-Score': "킬당 20점, 약점 킬당 100점. 1000, 2500, 5000점에서 추가 부활",
        'It Sees You': "25m 앞에 반물질 드롭이 나타나며 20초마다 추격. 성공 시 1 Pix Chip 획득",
        'Old Pizza': "피해 시: 6% 확률로 毒 상태 획득. 쿨타임: 5초. 성공 시 1 Pix Chip",
        'Only Knives': "스칼드라 듀얼 비시스를 근접 무기로 +450% 데미지로 장착",
        'Optimism': "8초마다 차가운 스택 축적. 10스택에서 3초간 동결. 3스택 녹해내리기: 롤 또는 Void Sling",
        'Panic Call': "Minerva 또는 Velimir가 소생을 시도. 30초 쿨타임",
        'Resolutions': "Purgator 1을 주 무기로 +450% 데미지로 장착",
        'Reverse-O': "Heavy Attack 명중 시: 10m 내 적들에게 부정적 상태 효과 전이",
        'Slippery Customer': "처음 다운 시: 안전하게 텔레포트, 50% HP/방어막으로 부활, 9초간 무적",
        'Spinnin\' Around': "약점 킬 시 1 Null Star 생성 (최대 18). Null Star는 데미지 5% 감소",
        'Super Scavenger': "Eximus 킬 시: 45% 확률로 Elemental Ammo Pack 드롭",
        'Through My Heart': "EFV-5 지구르를 주 무기로 +450% 데미지로 장착",
        'Too Hot': "70% 이하 HP에서 피해 시 10초마다 Molt 클론 생성",
        'Vintage Tech': "Necramech 소환. 파괴 후 60초 쿨타임",
        'Wakeup Call': "장비 휠에서 장전된 Thermian RPG을 배치 가능. 60초 쿨타임",
        'Walking on Air': "Aim Glide 및 Wall Latch 지속 시간 +100% 증가. 중력 100% 감소",
        'XL Frosty': "주 및 보조 무기에 +30% Cold Damage 추가",
    },
    // Simplified Chinese
    zh: {
        'Argon Combo #2': "弱点击杀时：生命球、能量球、弹药、Pheroglands或SporeX Charge的掉落率提高20%",
        'Breathless': "获得30秒的100%毒气和毒素抵抗。收集的生命球增加20秒。",
        'Burgerfest': "敌人有15%几率掉落恢复附近盟友10%生命和防御目标100%的阿尔贡汉堡盒。",
        'Catscratch Fever': "每20秒，30米内的一个敌人受到Saryn的孢子影响。",
        'Crushing Chills': "6x连击的HeavySlam在10秒冷却下创建多达3个雪球之泡。",
        'Doktor\'s Orders': "装备EFV-8马尔斯作为副武器，+450%伤害。",
        'Fly, Fly!': "敌人有15%几率掉落清除Hell-Scrubber污染的手榴弹。",
        'Going Steady': "100%抗击倒。",
        'Hi-Score': "每次击杀获得20分，每weakpoint击杀获得100分。1000、2500、5000分时获得额外复活。",
        'It Sees You': "25米外出现反物质掉落，每20秒追逐一次。成功时获得1个Pix Chip。",
        'Old Pizza': "受到伤害时：6%几率获得毒素状态。冷却：5秒。成功时获得1个Pix Chip。",
        'Only Knives': "装备Scaldra Dual Viciss作为近战武器，+450%伤害。",
        'Optimism': "每8秒积累冰冻层数。10层时冻结3秒。滚动或Void Sling融化3层。",
        'Panic Call': "Minerva或Velimir会尝试复活你。30秒冷却。",
        'Resolutions': "装备Purgator 1作为主武器，+450%伤害。",
        'Reverse-O': "Heavy Attack命中时：将负面状态效果转移到10米内的敌人身上。",
        'Slippery Customer': "第一次被击倒：传送到安全地点，50%生命/护盾复活，9秒无敌。",
        'Spinnin\' Around': "Weakpoint击杀生成1个Null Star（最大18）。Null Star减少5%伤害。",
        'Super Scavenger': "Eximus击杀时：45%几率掉落Elemental Ammo Pack。",
        'Through My Heart': "装备EFV-5木星作为主武器，+450%伤害。",
        'Too Hot': "受到70%以下生命值的伤害时，每10秒创建一个Molt分身。",
        'Vintage Tech': "召唤Necramech。摧毁后60秒冷却。",
        'Wakeup Call': "从Gear Wheel部署已加载的Thermian RPG。60秒冷却。",
        'Walking on Air': "增加Aim Glide和Wall Latch持续时间+100%。降低100%重力。",
        'XL Frosty': "为主副武器添加+30%冰冻伤害。",
    },
    tc: {
        'Argon Combo #2': "弱點擊殺時：生命球、能量球、彈药、Pheroglands或SporeX Charge的掉落率提高20%",
        'Breathless': "獲得30秒的100%毒氣和毒素抵抗。收集的生命球增加20秒。",
        'Burgerfest': "敵人有15%機率掉落恢復附近盟友10%生命和防禦目標100%的阿龍漢堡盒。",
        'Catscratch Fever': "每20秒，30米內的一個敵人受到Saryn的孢子影響。",
        'Crushing Chills': "6x連擊的HeavySlam在10秒冷卻下創建多達3個雪球之泡。",
        'Doktor\'s Orders': "裝備EFV-8馬爾斯作為副武器，+450%傷害。",
        'Fly, Fly!': "敵人有15%機率掉落清除Hell-Scrubber污染的手榴彈。",
        'Going Steady': "100%抗擊倒。",
        'Hi-Score': "每次擊殺獲得20分，每weakpoint擊殺獲得100分。1000、2500、5000分時獲得額外復活。",
        'It Sees You': "25米外出現反物質掉落，每20秒追逐一次。成功時獲得1個Pix Chip。",
        'Old Pizza': "受到傷害時：6%機率獲得毒素狀態。冷卻：5秒。成功時獲得1個Pix Chip。",
        'Only Knives': "裝備Scaldra Dual Viciss作為近戰武器，+450%傷害。",
        'Optimism': "每8秒累積冰凍層數。10層時凍結3秒。滾動或Void Sling融化3層。",
        'Panic Call': "Minerva或Velimir會嘗試復活你。30秒冷卻。",
        'Resolutions': "裝備Purgator 1作為主武器，+450%傷害。",
        'Reverse-O': "Heavy Attack命中時：將負面狀態效果轉移到10米內的敵人身上。",
        'Slippery Customer': "第一次被擊倒：傳送到安全地點，50%生命/盾牌復活，9秒無敵。",
        'Spinnin\' Around': "Weakpoint擊殺生成1個Null Star（最大18）。Null Star減少5%傷害。",
        'Super Scavenger': "Eximus擊殺時：45%機率掉落Elemental Ammo Pack。",
        'Through My Heart': "裝備EFV-5木星作為主武器，+450%傷害。",
        'Too Hot': "受到70%以下生命值的傷害時，每10秒創建一個Molt分身。",
        'Vintage Tech': "召喚Necramech。摧毀後60秒冷卻。",
        'Wakeup Call': "從Gear Wheel部署已加載的Thermian RPG。60秒冷卻。",
        'Walking on Air': "增加Aim Glide和Wall Latch持續時間+100%。降低100%重力。",
        'XL Frosty': "為主副武器添加+30%冰凍傷害。",
    },
    ru: {
        'Argon Combo #2': "При убийстве слабых точек: шанс выпадения Сфер здоровья, Сфер энергии, боекомложения, Pheroglands или зарядов SporeX увеличен на 20%",
        'Breathless': "Получает 100% сопротивления Газу и Токсину на 30с. Собранные Сферы здоровья добавляют 20с.",
        'Burgerfest': "Враги имеют 15% шанса выпустить Аргоновые бургеры, которые лечат ближайших союзников на 10% и цели обороны на 100%.",
        'Catscratch Fever': "Каждые 20с, враг в радиусе 30м поражён спорами Saryn.",
        'Crushing Chills': "Тяжёлый удар с 6-кратным комбо создаёт до 3 Снежных шаров с перезарядкой 10с.",
        'Doktor\'s Orders': "Экипируйте EFV-8 Mars с +450% урона как вторичное оружение.",
        'Fly, Fly!': "Враги имеют 15% шанса выпустить гранаты, которые очищают загрязнение Hell-Scrubber.",
        'Going Steady': "100% шанс сопротивиться опрокидыванию.",
        'Hi-Score': "Получайте 20 очков за убийство, 100 за убийство слабой точки. Дополнительные возвождения при 1000, 2500, 5000 очках.",
        'It Sees You': "Сфера антиматерии появляется на расстоянии 25м и преследует каждые 20с. Награждается 1 Pix Chip за успех.",
        'Old Pizza': "При получении урона: 6% шанс получить статус Токсин. Перезарядка: 5с. Награждается 1 Pix Chip за успех.",
        'Only Knives': "Экипируйте Scaldra Dual Viciss с +450% урона как ближнее оружие.",
        'Optimism': "Накапливает слои Холода каждые 8с. Замораживает при 10 слоях на 3с. Поворачивайтесь или используйте Void Sling для таяния 3 слоёв.",
        'Panic Call': "Minerva или Velimir попытаются возродить вас. Перезарядка 30с.",
        'Resolutions': "Экипируйте Purgator 1 с +450% урона как основное оружие.",
        'Reverse-O': "При тяжёлой атаке: переносит отрицательные эффекты статуса на врагов в радиусе 10м.",
        'Slippery Customer': "В первый раз при повалении: телепортироваться в безопасное место, возродиться с 50% Здоровьем/Щитами, неуязвим на 9с.",
        'Spinnin\' Around': "Убийства слабых точек создают 1 Null Star (макс 18). Null Stars уменьшают урон на 5%.",
        'Super Scavenger': "При убийстве Eximus: 45% шанс выпустить элементный боезапас.",
        'Through My Heart': "Экипируйте EFV-5 Jupiter с +450% урона как основное оружие.",
        'Too Hot': "Получение урона ниже 70% Здоровья создаёт клон Molt каждые 10с.",
        'Vintage Tech': "Призыв Necramech. Перезарядка 60с после уничтожения.",
        'Wakeup Call': "Заряженный Thermian RPG может быть развернут из колеса экипировки. Перезарядка 60с.",
        'Walking on Air': "Увеличивает длительность Point Air Glide и Wall Latch на +100%. Уменьшает гравитацию на 100%.",
        'XL Frosty': "Добавляет +30% урона Холода к основному и вторичному оружию.",
    },
};

// Apply translations
for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Fix peely section
    if (data.peely) {
        const descTrans = descTranslations[loc] || descTranslations.fr; // fallback to FR
        
        for (const itemTypePath of enItems) {
            if (!data.peely[itemTypePath]) continue;
            
            const enEntry = enPeely[itemTypePath];
            const locEntry = data.peely[itemTypePath];
            
            // Translate description
            if (descTrans[enEntry.name]) {
                locEntry.description = descTrans[enEntry.name];
            }
            
            // Translate name if available
            if (descTranslations[loc] && descTranslations[loc][enEntry.name]) {
                locEntry.name = descTranslations[loc][enEntry.name];
            }
        }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated peely for ${loc}`);
}

console.log('\nDone!');
