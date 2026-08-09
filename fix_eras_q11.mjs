import fs from 'fs';
const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// Era translations for remaining EN values
// Format: key -> { locale -> translation }
const eraTrans = {
    Lith: {
        fr: 'Lith', de: 'Lith', es: 'Lith', it: 'Lith', ja: 'リス', ko: '리스',
        pl: 'Lith', pt: 'Lith', ru: 'Лит', tc: '利特', th: 'ลิท', tr: 'Lith',
        uk: 'Літ', zh: '利特',
    },
    Meso: {
        de: 'Meso', es: 'Meso', it: 'Meso', ja: 'メソ', ko: '메소',
        pl: 'Meso', pt: 'Méso', tc: '梅索', th: 'เมโซ', tr: 'Meso',
    },
    Neo: {
        de: 'Neo', es: 'Neo', it: 'Neo', ja: 'ネオ', ko: '네오',
        pl: 'Neo', pt: 'Néo', ru: 'Нео', tc: '神域', th: 'เนโอ', tr: 'Neo',
        uk: 'Нео', zh: '神域',
    },
    Axi: {
        fr: 'Axi', de: 'Axi', es: 'Axi', it: 'Axi', ja: 'アクシ', ko: '악시',
        pl: 'Axi', pt: 'Axi', tc: '阿克西', th: 'แอกซี', tr: 'Axi',
    },
    Requiem: {
        fr: 'Requiem', de: 'Requiem', es: 'Requiem', it: 'Requiem', ja: 'Requiem',
        ko: 'Requiem', pl: 'Requiem', pt: 'Requiem', tc: 'Requiem', th: 'Requiem',
        tr: 'Requiem', zh: 'Requiem',
    },
    Omnia: {
        fr: 'Omnia', de: 'Omnia', es: 'Omnia', it: 'Omnia', ja: 'Omnia',
        ko: 'Omnia', pl: 'Omnia', pt: 'Omnia', tc: 'Omnia', th: 'Omnia',
        tr: 'Omnia', zh: 'Omnia',
    },
};

// For era names that are proper nouns, we keep them as close to the original as possible
// but we do provide transliterations where the committed locale already has them

for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changes = 0;
    
    // Fix eras section
    if (data.eras) {
        for (const [era, transMap] of Object.entries(eraTrans)) {
            if (data.eras[era] === enData.eras[era] && transMap[loc]) {
                data.eras[era] = transMap[loc];
                changes++;
            }
        }
    }
    
    // Add eras.* flat keys to ui section
    if (!data.ui) data.ui = {};
    if (data.eras) {
        for (const [era, val] of Object.entries(data.eras || {})) {
            const flatKey = `eras.${era}`;
            if (data.ui[flatKey] === enData.ui[flatKey]) {
                // Already EN or same as EN - update from eras section
                data.ui[flatKey] = val;
                changes++;
            }
        }
    }
    
    if (changes > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}: ${changes} changes`);
    }
}
console.log('\nDone!');
