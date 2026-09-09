// Update each public package's license field to BSL-1.1
const fs = require('fs');
const path = require('path');

const SDK = path.resolve(__dirname, '..', '..', 'soostori-sdk');

function findAllPackages(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !['node_modules', 'dist', 'test', '.git'].includes(e.name)) {
      const pj = path.join(full, 'package.json');
      if (fs.existsSync(pj)) out.push(full);
      out.push(...findAllPackages(full));
    }
  }
  return out;
}

let modified = 0;
for (const dir of findAllPackages(path.join(SDK, 'packages'))) {
  const pjPath = path.join(dir, 'package.json');
  const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
  if (pj.private === true) continue;
  if (pj.license === 'BSL-1.1') continue;
  pj.license = 'BSL-1.1';
  fs.writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n');
  modified++;
  console.log('updated:', pj.name);
}
console.log('Total modified:', modified);
