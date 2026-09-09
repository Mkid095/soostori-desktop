// Restore customers, debts, products, sales to public
const fs = require('fs')
const path = require('path')

const SDK = 'C:/Users/Administrator/Documents/GitHub/soostori-sdk'
const pkgs = ['sales', 'products', 'customers', 'debts']

for (const pkg of pkgs) {
  const pjPath = path.join(SDK, 'packages/business/' + pkg + '/package.json')
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'))
  delete pj.private
  if (pj.description && pj.description.startsWith('[ALPHA-BLOCKED] ')) {
    pj.description = pj.description.replace('[ALPHA-BLOCKED] ', '')
  }
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n')
  console.log(`[restored] ${pj.name}: private=${pj.private ?? false}, desc=${pj.description?.slice(0, 60)}`)
}
