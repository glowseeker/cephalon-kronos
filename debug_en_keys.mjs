import fs from 'fs';
const locs = ['en','fr','de','es','it','ja','ko','pl','pt','ru','tc','th','tr','uk','zh'];

// Show exact ui.relics.* keys vs relics section keys for EN
const en = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
console.log('=== EN ui.* keys that start with "relics." ===');
Object.keys(en.ui || {}).filter(k => k.startsWith('relics.')).forEach(k => console.log(`  ${k}: "${en.ui[k]}"`));

console.log('\n=== EN relics section keys ===');
Object.keys(en.relics || {}).forEach(k => console.log(`  ${k}: "${en.relics[k]}"`));

// Show all ui.* keys for EN
console.log('\n=== All EN ui.* keys (sample) ===');
Object.keys(en.ui || {}).filter(k => k.startsWith('relics') || k.startsWith('exp_') || k.includes('void')).forEach(k => console.log(`  ${k}: "${en.ui[k]}"`));
