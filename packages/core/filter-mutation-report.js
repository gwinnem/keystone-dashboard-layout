import fs from 'fs';
const report = JSON.parse(fs.readFileSync('reports/mutation/mutation.json', 'utf8'));

const targets = ['layout-validator.ts', 'breakpoint-validator.ts'];

for (const target of targets) {
  const key = Object.keys(report.files).find(k => k.endsWith(target));
  if (key) {
    const survived = report.files[key].mutants
      .filter(m => m.status === 'Survived' || m.status === 'NoCoverage' || m.status === 'RuntimeError' || m.status === 'CompileError')
      .map(m => ({ location: m.location, mutatorName: m.mutatorName, replacement: m.replacement, status: m.status }));
    const outName = target.replace('.ts', '') + '-survived.json';
    fs.writeFileSync(`reports/mutation/${outName}`, JSON.stringify(survived, null, 2));
    console.log(`${target}: ${survived.length} entries written`);
  } else {
    console.log(`${target}: not found`);
  }
}
