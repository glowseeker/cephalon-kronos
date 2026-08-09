import fs from 'fs';
import { execSync } from 'child_process';

const res = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai';
const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
const trSection = JSON.parse(fs.readFileSync('/tmp/translations_relics_section.json', 'utf8'));
const trUi = JSON.parse(fs.readFileSync('/tmp/translations_ui_relics.json', 'utf8'));
const trPeely = JSON.parse(fs.readFileSync('/tmp/translations_peely.json', 'utf8'));

// Get committed state of each locale
function getCommitted(loc) {
    try {
        return JSON.parse(execSync(`git show HEAD:src/lib/i18n/${loc}.json`).toString());
    } catch(e) {
        return null;
    }
}

let changes = 0;

for (const loc of locs) {
    const filePath = `src/lib/i18n/${loc}.json`;
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const committed = getCommitted(loc);

    // === 1. Translate relics.* SECTION (11 keys) ===
    for (const [key, translations] of Object.entries(trSection.relicsSection)) {
        if (translations[loc] && data.relics && data.relics[key] === enData.relics[key]) {
            // Only translate if current value matches EN (and committed value is also EN)
            if (!committed || committed.relics[key] === enData.relics[key]) {
                data.relics[key] = translations[loc];
                changes++;
                // Don't log here to reduce noise
            }
        }
    }

    // === 2. Translate ui.relics.* FLAT keys ===
    for (const [flatKey, translations] of Object.entries(trUi.uiRelicsKeys)) {
        if (translations[loc] && data.ui && data.ui[flatKey] === enData.ui[flatKey]) {
            if (!committed || committed.ui[flatKey] === enData.ui[flatKey]) {
                data.ui[flatKey] = translations[loc];
                changes++;
            }
        }
    }

    // === 3. Add eras.* flat keys to ui section ===
    if (data.eras) {
        if (!data.ui) data.ui = {};
        for (const [eraName, eraVal] of Object.entries(data.eras)) {
            const flatKey = 'eras.' + eraName;
            data.ui[flatKey] = eraVal;
        }
    }

    // === 4. Translate peely names/descs ===
    for (const [pkey, ptr] of Object.entries(trPeely.peely)) {
        if (ptr[loc]) {
            if (!data.peely) data.peely = {};
            data.peely[pkey] = ptr[loc];
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

console.log(`Total changes...[truncated]`);
