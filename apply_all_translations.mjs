import fs from 'fs';

const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
const trSection = JSON.parse(fs.readFileSync('/tmp/translations_relics_section.json', 'utf8'));
const trUi = JSON.parse(fs.readFileSync('/tmp/translations_ui_relics.json', 'utf8'));
const trPeely = JSON.parse(fs.readFileSync('/tmp/translations_peely.json', 'utf8'));

for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // === 1. Translate relics.* SECTION keys (only if currently matching EN) ===
    for (const [key, translations] of Object.entries(trSection.relicsSection)) {
        if (translations[loc] && data.relics && data.relics[key] === enData.relics[key]) {
            data.relics[key] = translations[loc];
        }
    }

    // === 2. Translate ui.relics.* FLAT keys (only if currently matching EN) ===
    for (const [flatKey, translations] of Object.entries(trUi.uiRelicsKeys)) {
        if (translations[loc] && data.ui && data.ui[flatKey] === enData.ui[flatKey]) {
            data.ui[flatKey] = translations[loc];
        }
    }

    // === 3. Add eras.* FLAT keys to ui section (copy from eras section) ===
    if (data.eras) {
        if (!data.ui) data.ui = {};
        for (const [eraName, eraVal] of Object.entries(data.eras)) {
            data.ui['eras.' + eraName] = eraVal;
        }
    }

    // === 4. Translate peely names/descriptions ===
    for (const [pkey, ptr] of Object.entries(trPeely.peely)) {
        if (ptr[loc]) {
            if (!data.peely) data.peely = {};
            data.peely[pkey] = ptr[loc];
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

// === Add eras.* flat keys to EN file ===
if (enData.eras) {
    if (!enData.ui) enData.ui = {};
    for (const [eraName, eraVal] of Object.entries(enData.eras)) {
        enData.ui['eras.' + eraName] = eraVal;
    }
}
fs.writeFileSync('src/lib/i18n/en.json', JSON.stringify(enData, null, 2) + '\n');

console.log('All translations applied successfully!');
