import fs from 'fs';

const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// These keys still have EN values that need translating
// Format strings: bp_close="BP)", era_label="{era}", platinum="{plat}p" — DO NOT translate
const keysToFix = [
    'relics.all',
    'relics.other',
    'relics.era',      // "Era:" - translatable in most languages
    'relics.squad',    // "Squad" - translatable in most languages  
    'relics.ev_title', // "Exceptional Void Fissure" - NOT in dict, app-authored
    'relics.subtitle', // "Relic collection and valuation" - app-authored
];

const trans = {
    fr: {
        'relics.ev_title': 'Fissure de Vide exceptionnelle',
        'relics.subtitle': 'Collection de reliques et valorisation',
        // FR already has these translated in committed state
    },
    de: {
        'relics.era': 'Ära:',
        'relics.squad': 'Gruppe',
        // ev_title and subtitle already translated by previous script
    },
    es: {
        // Already translated by previous script
    },
    it: {
        'relics.squad': 'Squad',  // "Squad" stays - common gaming term in Italian
        // ev_title already translated
    },
    ja: {
        'relics.era': 'エポック:',
        'relics.squad': 'スクワッド',
        // ev_title already translated
    },
    ko: {
        'relics.era': '시대:',
        'relics.squad': '스쿼드',
        // ev_title already translated
    },
    pl: {
        'relics.era': 'Era:',
        'relics.squad': 'Squad',
        // ev_title already translated
    },
    pt: {
        'relics.era': 'Época:',
        'relics.squad': 'Esquadrião',
        // ev_title already translated
    },
    ru: {
        'relics.era': 'Эра:',
        'relics.squad': 'Отряд',
        // ev_title already translated
    },
    tc: {
        'relics.ev_title': '特級虛空裂縫',
        'relics.subtitle': '遺物收集與評估',
    },
    th: {
        'relics.ev_title': 'รอฟันต์มากของวอยด์',
        'relics.subtitle': 'การเก็บรวบรวมและประเมิตเรลิก',
    },
    tr: {
        'relics.era': 'İhtisar:',
        'relics.squad': 'Taban',
        'relics.ev_title': 'İstikrarlı Void Çatlak',
        'relics.subtitle': 'İlhâl toplama ve değerleme',
    },
    uk: {
        'relics.era': 'Ера:',
        'relics.squad': 'Рота',
        'relics.ev_title': 'Винятковий розром Бездни',
        'relics.subtitle': 'Колекція реліквій і оцінка',
    },
    zh: {
        'relics.era': '纪元：',
        'relics.squad': '小队',
        'relics.ev_title': '卓越虚空裂隙',
        'relics.subtitle': '遗物收集与评估',
    },
};

for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const t = trans[loc] || {};
    let changes = [];
    
    // Fix ui.relics.* flat keys
    if (data.ui) {
        for (const [key, val] of Object.entries(t)) {
            if (key.startsWith('relics.')) {
                if (data.ui[key] === enData.ui[key]) {
                    data.ui[key] = val;
                    changes.push(`${key} = "${val}"`);
                }
            }
        }
    }
    
    // Fix relics section (bare keys without prefix)
    if (data.relics) {
        for (const [key, val] of Object.entries(t)) {
            if (!key.startsWith('relics.')) continue;
            const sectionKey = key.replace('relics.', '.');  // This doesn't work
        }
    }
    
    if (changes.length > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}: ${changes.length} fixes`);
        changes.forEach(c => console.log(`  ${c}`));
    }
}
