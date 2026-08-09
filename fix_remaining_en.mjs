import fs from 'fs';
const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));

// Fix the remaining EN values that my previous scripts missed
const fixes = {
    fr: {
        'ui.relics.gain_ducats': 'GAGNÉ (D)',
        'ui.relics.gain_plat': 'GAGNÉ (P)',
    },
    pl: {
        'ui.relics.exp_ducats': 'EXP DUKATY',
        'ui.relics.exp_plat': 'EXP PLATYNY',
    },
    tc: {
        'ui.relics.exp_ducats': 'EXP 達卡',
        'ui.relics.exp_plat': 'EXP 白金',
    },
};

for (const [loc, keymap] of Object.entries(fixes)) {
    const filePath = `src/lib/i18n/${loc}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.ui) data.ui = {};
    
    let changes = [];
    for (const [key, val] of Object.entries(keymap)) {
        if (data.ui[key] === enData.ui[key]) {
            data.ui[key] = val;
            changes.push(`${key} = "${val}"`);
        }
    }
    
    if (changes.length > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        console.log(`${loc}:`);
        changes.forEach(c => console.log(`  ${c}`));
    } else {
        console.log(`${loc}: no changes needed`);
    }
}

console.log('\nDone!');
