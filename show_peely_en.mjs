import fs from 'fs';

const enData = JSON.parse(fs.readFileSync('src/lib/i18n/en.json', 'utf8'));
console.log('=== EN peely section ===');
console.log(JSON.stringify(enData.peely, null, 2));
