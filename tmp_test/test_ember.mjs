import { resolveItemName } from '../src/lib/warframeUtils.js'

const dict = {
  '/Lotus/Language/Items/EmberNobleAnims': 'Ember Noble Animation Set',
  '/Lotus/Language/Items/EmberNobleAnimsDesc': 'The Noble Animation Set for Ember.',
}

const paths = [
  '/Lotus/Types/StoreItems/Packages/EmberNobleAnims',
  '/Lotus/StoreItems/Types/StoreItems/AvatarImages/EmberNobleAnims',
  '/Lotus/StoreItems/Packages/EmberNobleAnims',
  '/Lotus/Types/StoreItems/EmberNobleAnims',
]

console.log('CASE A: locKey with Name suffix (EmberNobleAnimsName):')
const uA = {
  '/Lotus/Types/StoreItems/Packages/EmberNobleAnims': '/Lotus/Language/Items/EmberNobleAnimsName',
  '/Lotus/StoreItems/Types/StoreItems/AvatarImages/EmberNobleAnims': '/Lotus/Language/Items/EmberNobleAnimsName',
}
for (const p of paths) console.log('  ' + p + ' => ' + JSON.stringify(resolveItemName(p, dict, uA, 'en')))

console.log('\nCASE B: empty uniqueNameToName (no wfcd name map):')
for (const p of paths) console.log('  ' + p + ' => ' + JSON.stringify(resolveItemName(p, dict, {}, 'en')))

console.log('\nCASE C: locKey without Name suffix (EmberNobleAnims):')
const uC = {
  '/Lotus/Types/StoreItems/Packages/EmberNobleAnims': '/Lotus/Language/Items/EmberNobleAnims',
}
for (const p of paths) console.log('  ' + p + ' => ' + JSON.stringify(resolveItemName(p, dict, uC, 'en')))
