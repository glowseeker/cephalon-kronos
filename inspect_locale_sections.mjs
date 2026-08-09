import fs from 'fs';
const res = '/home/emre/Downloads/kronosresources/warframe-public-export-plus-senpai';

const locs = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

console.log('=== ui.relics.* flat keys per locale ===');
for (const loc of locs) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/${loc}.json`, 'utf8'));
    const flatKeys = Object.entries(data.ui || {}).filter(([k]) => k.startsWith('relics'));
    console.log(`\n${loc}:`);
    flatKeys.slice(0, 20).forEach(([k, v]) => console.log(`  ${k} = "${typeof v === 'object' ? JSON.stringify(v) : v}"`));
}

console.log('\n\n=== eras section per locale ===');
for (const loc of locs) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/${loc}.json`, 'utf8'));
    console.log(`\n${loc}: eras = ${JSON.stringify(data.eras || 'NOT FOUND')}`);
}

console.log('\n\n=== Full relics section per locale ===');
for (const loc of locs) {
    const data = JSON.parse(fs.readFileSync(`src/lib/i18n/${loc}.json`, 'utf8'));
    console.log(`\n${loc}: relics = ${JSON.stringify(data.relics || 'NOT FOUND')}`);
}
