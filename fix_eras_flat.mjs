import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// Era translations - only provide translations for keys still EN
// (committed files already have some translations we must preserve)
const eraTrans = {
    Lith: {
        de: 'Lith', es: 'Lith', it: 'Lith', pl: 'Lith', pt: 'Lith', tr: 'Lith',
        // FR: Lith stays EN (proper noun)
        // JA/KO/TC/TH/UK/ZH already translated
    },
    Meso: {
        de: 'Meso', es: 'Meso', it: 'Meso', pl: 'Meso', tr: 'Meso',
        // FR: Méso, PT: Méso already translated
        // JA/KO/TC/TH already translated
    },
    Neo: {
        de: 'Neo', es: 'Neo', it: 'Neo', pl: 'Neo', tr: 'Neo',
        // FR: Néo, PT: Néo already translated
        // JA/KO/TC/TH/UK/ZH already translated
    },
    Axi: {
        de: 'Axi', es: 'Axi', it: 'Axi', pl: 'Axi', tr: 'Axi',
        // FR/PT/etc: Axi stays EN (proper noun)
        // JA/KO/TC/TH already translated
    },
    Requiem: {
        // FR/DE/ES/IT/JA/KO/PL/PT/TC/TH/TR/ZH all have "Requiem" which IS the English
        // But "Requiem" is a Latin proper noun used in many languages
        // RU: Реквием, UK: Реквієм already translated
    },
    Omnia: {
        // All locales have "Omnia" which is a proper noun
        // RU: Омниа, UK: Омнія already translated
    },
};

for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let changes = 0;
    
    // Fix eras section - only translate keys that are still EN
    if (data.eras) {
        for (const [era, transMap] of Object.entries(eraTrans)) {
            if (data.eras[era] === enData.eras[era] && transMap[loc]) {
                data.eras[era] = transMap[loc];
                changes++;
            }
        }
    }
    
    // Add eras.* flat keys to ui section (for t('eras.Lith') lookups)
    if (!data.ui) data.ui = {};
    if (data.eras) {
        for (const era of Object.keys(data.eras)) {
            const flatKey = `eras.${era}`;
            if (!data.ui[flatKey]) {
                data.ui[flatKey] = data.eras[era];
                changes++;
            }
        }
    }
    
    if (changes > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}: ${changes} changes`);
    } else {
        console.log(`${loc}: no changes needed`);
    }
}

console.log('\nDone!');
