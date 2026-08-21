import fs from 'fs';
const report = JSON.parse(fs.readFileSync('reports/mutation/mutation.json', 'utf8'));
const key = Object.keys(report.files).find(k => k.endsWith('GridLayout.tsx'));
const survived = report.files[key].mutants.filter(m => m.status === 'Survived');
fs.writeFileSync('reports/mutation/gridlayout-survived.json', JSON.stringify(survived, null, 2));
console.log(`${survived.length} survived mutants written to reports/mutation/gridlayout-survived.json`);
