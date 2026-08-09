import fs from 'fs';
const locs = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

console.log('=== Verify: relics section vs ui.relics.* should now match ===');
let allGood = true;
for (const loc of locs) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/${loc}.json`, 'utf8'));
    const ui = data.ui || {};
    const relics = data.relics || {};
    const uiRelicsKeys = Object.keys(ui).filter(k => k.startsWith('relics.'));
    let conflicts = 0;
    for (const flatKey of uiRelicsKeys) {
        const baseKey = flatKey.replace('relics.', '');
        if (ui[flatKey] !== relics[baseKey]) conflicts++;
    }
    if (conflicts > 0) {
        console.log(`${loc}: ${conflicts} conflicts remain!`);
        allGood = false;
    }
}

// Check the specific user issues
console.log('\n=== Verify Q10 (void_traces) + Q12 (exp_ducats, exp_platinum) ===');
for (const loc of locs) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/${loc}.json`, 'utf8'));
    const relics = data.relics || {};
    console.log(`${loc}: void_traces="${relics.void_traces}" exp_ducats="${relics.exp_ducats}" exp_platinum="${relics.exp_platinum}"`);
}

console.log(allGood ? '\n✅ All relics section values now match ui.relics.* translations!' : '\n❌ Some conflicts remain.');
