import fs from 'fs';
const report = JSON.parse(fs.readFileSync('reports/mutation/mutation.json', 'utf8'));

const targets = ['useLayoutPresets.ts', 'useGridItemResize.ts', 'useGridItemDrag.ts'];

for (const target of targets) {
  const key = Object.keys(report.files).find(k => k.endsWith(target));
  if (!key) {
    console.log(`No entry found for ${target}`);
    continue;
  }
  const survived = report.files[key].mutants
    .filter(m => m.status === 'Survived' || m.status === 'NoCoverage' || m.status === 'RuntimeError' || m.status === 'CompileError')
    .map(m => ({
      location: m.location,
      mutatorName: m.mutatorName,
      replacement: m.replacement,
      status: m.status,
    }));
  const outName = target.replace('.ts', '') + '-survived.json';
  fs.writeFileSync(`reports/mutation/${outName}`, JSON.stringify(survived, null, 2));
  console.log(`${survived.length} entries written to reports/mutation/${outName}`);
}
