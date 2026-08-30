const fs = require('fs');
const report = JSON.parse(fs.readFileSync('reports/mutation/mutation.json', 'utf8'));

const rows = [];
for (const [path, fileData] of Object.entries(report.files)) {
  const mutants = fileData.mutants;
  if (!mutants || mutants.length === 0) continue;
  const counts = { Survived: 0, Killed: 0, Timeout: 0, NoCoverage: 0, RuntimeError: 0, CompileError: 0, Ignored: 0, Pending: 0 };
  for (const m of mutants) {
    counts[m.status] = (counts[m.status] || 0) + 1;
  }
  const total = mutants.length;
  const killedLike = counts.Killed + counts.Timeout;
  const score = total > 0 ? ((killedLike / total) * 100).toFixed(2) : 'N/A';
  const shortPath = path.replace(/^.*[\\/]src[\\/]/, '');
  rows.push({ shortPath, total, killed: counts.Killed, timeout: counts.Timeout, survived: counts.Survived, noCoverage: counts.NoCoverage, errors: counts.RuntimeError + counts.CompileError, score: parseFloat(score) });
}

rows.sort((a, b) => a.score - b.score);

let out = 'File'.padEnd(45) + 'Score'.padStart(8) + 'Total'.padStart(7) + 'Killed'.padStart(8) + 'Timeout'.padStart(9) + 'Survived'.padStart(10) + 'NoCov'.padStart(7) + 'Errors'.padStart(8) + '\n';
out += '-'.repeat(100) + '\n';
let totalMutants = 0, totalKilledLike = 0;
for (const r of rows) {
  out += r.shortPath.padEnd(45) + `${r.score}%`.padStart(8) + `${r.total}`.padStart(7) + `${r.killed}`.padStart(8) + `${r.timeout}`.padStart(9) + `${r.survived}`.padStart(10) + `${r.noCoverage}`.padStart(7) + `${r.errors}`.padStart(8) + '\n';
  totalMutants += r.total;
  totalKilledLike += r.killed + r.timeout;
}
out += '-'.repeat(100) + '\n';
const overallScore = totalMutants > 0 ? ((totalKilledLike / totalMutants) * 100).toFixed(2) : 'N/A';
out += `OVERALL: ${overallScore}% (${totalKilledLike}/${totalMutants} killed+timeout)\n`;

fs.writeFileSync('reports/mutation/summary.txt', out);
console.log(out);

const target = 'grid-layout.component.ts';
const key = Object.keys(report.files).find(k => k.endsWith(target));
if (key) {
  const survived = report.files[key].mutants
    .filter(m => m.status === 'Survived' || m.status === 'NoCoverage' || m.status === 'RuntimeError' || m.status === 'CompileError')
    .map(m => ({ location: m.location, mutatorName: m.mutatorName, replacement: m.replacement, status: m.status }));
  fs.writeFileSync('reports/mutation/grid-layout-component-survived.json', JSON.stringify(survived, null, 2));
  console.log(`${target}: ${survived.length} entries written`);
}
