import fs from 'fs';
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// Add eras.* flat keys to EN ui section
if (enData.eras) {
    if (!enData.ui) enData.ui = {};
    for (const [era, val] of Object.entries(enData.eras)) {
        const flatKey = `eras.${era}`;
        if (!enData.ui[flatKey]) {
            enData.ui[flatKey] = val;
        }
    }
}

fs.writeFileSync('src/lib/i18n/en.json', JSON.stringify(enData, null, 2) + '\n');
console.log('EN eras.* flat keys added to ui section');
