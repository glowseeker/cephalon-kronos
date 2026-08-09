import fs from 'fs';
const locs = ['fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// For each locale, sync the relics section values from the ui.relics.* flat keys
// (the ui.* keys have the translated values; relics section has EN that overwrites them)
let totalChanges = 0;
for (const loc of locs) {
    const path = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const ui = data.ui || {};
    const relics = data.relics || {};
    
    const uiRelicsKeys = Object.keys(ui).filter(k => k.startsWith('relics.'));
    let changes = 0;
    
    for (const flatKey of uiRelicsKeys) {
        const baseKey = flatKey.replace('relics.', '');
        const uiVal = ui[flatKey];
        const secVal = relics[baseKey];
        
        if (uiVal !== secVal) {
            relics[baseKey] = uiVal;
            changes++;
        }
    }
    
    if (changes > 0) {
        fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`${loc}.json: synced ${changes} relics section values from ui.relics.* translations`);
        totalChanges += changes;
    }
}

console.log(`\nTotal: ${totalChanges} values synced across ${locs.length} locales`);
