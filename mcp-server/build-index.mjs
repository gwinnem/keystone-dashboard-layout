// Builds examples-index.json — the data file the PHP MCP server
// (mcp.php) reads at request time. Run this locally (or in CI)
// whenever an example changes, then upload the resulting JSON
// alongside mcp.php to your PHP host. Not run on the PHP host itself —
// PHP hosting can't run this, it only ever reads the JSON output.
//
// Vue/React examples live as astro-docs .mdx pages that import their
// own real source via a `?raw` Vite import — this script resolves
// that import to the actual component file rather than guessing a
// naming convention, so it can never drift out of sync with what the
// docs site itself actually renders. Angular's 53 examples are NOT
// astro-docs pages at all (they live in the separate, standalone
// angular-examples-app — see astro-docs/astro.config.mjs's own
// comment for why), so they're indexed directly from that app's own
// source instead, with no frontmatter to draw a description from.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

function parseFrontmatter(raw) {
  // Strip a leading UTF-8 BOM — confirmed present on some .mdx files
  // in this repo (e.g. react/examples/add-remove-items.mdx) and fatal
  // to a naive `startsWith('---')` check otherwise.
  const content = raw.replace(/^﻿/, '');
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { title: null, description: null, body: content };
  const fm = match[1];
  const title = fm.match(/^title:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim() ?? null;
  return { title, description, body: content.slice(match[0].length) };
}

function indexAstroFramework(framework, examplesDir, componentsDir) {
  const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.mdx'));
  const entries = [];

  for (const file of files) {
    const mdxPath = path.join(examplesDir, file);
    const raw = fs.readFileSync(mdxPath, 'utf8');
    const { title, description, body } = parseFrontmatter(raw);

    // Matches e.g. `import FooSource from '../../../../components/examples/10-foo.vue?raw';`
    // — capturing the real relative import path rather than assuming
    // a filename convention, so a renamed/moved component file can't
    // silently produce a stale or missing index entry.
    const importMatch = body.match(/import\s+\w+Source\s+from\s+['"]([^'"]+)\?raw['"]/);
    if (!importMatch) {
      console.warn(`[build-index] ${framework}/${file}: no ?raw source import found, skipping`);
      continue;
    }
    const sourcePath = path.resolve(path.dirname(mdxPath), importMatch[1]);
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[build-index] ${framework}/${file}: resolved source ${sourcePath} doesn't exist, skipping`);
      continue;
    }

    entries.push({
      framework,
      slug: file.replace(/\.mdx$/, ''),
      title: title ?? file,
      description: description ?? '',
      filename: path.basename(sourcePath),
      code: fs.readFileSync(sourcePath, 'utf8'),
      docsUrl: `https://kdl.winnem.tech/${framework}/examples/${file.replace(/\.mdx$/, '')}/`,
    });
  }

  return entries;
}

function indexAngular(examplesDir) {
  const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.component.ts'));
  return files.map((file) => {
    // Filenames are `NN-slug.component.ts` — the same `NN-slug` the
    // deployed angular-examples-app uses in its own /examples/NN-slug
    // route (confirmed directly against that app's own routing, not
    // assumed), so the docs URL is derived, not guessed.
    const slug = file.replace(/\.component\.ts$/, '');
    return {
      framework: 'angular',
      slug,
      // No frontmatter to draw a title from (plain .ts, not an .mdx
      // page) — title-cased from the slug's own words instead. Good
      // enough for a search index; the real, human-written title
      // lives in the deployed app's own sidebar, not duplicated here.
      title: slug.replace(/^\d+-/, '').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
      description: '',
      filename: file,
      code: fs.readFileSync(path.join(examplesDir, file), 'utf8'),
      docsUrl: `https://kdla.winnem.tech/examples/${slug}`,
    };
  });
}

const entries = [
  ...indexAstroFramework(
    'vue',
    path.join(repoRoot, 'astro-docs/src/content/docs/vue/examples'),
    path.join(repoRoot, 'astro-docs/src/components/examples'),
  ),
  ...indexAstroFramework(
    'react',
    path.join(repoRoot, 'astro-docs/src/content/docs/react/examples'),
    path.join(repoRoot, 'astro-docs/src/components/examples-react'),
  ),
  ...indexAngular(path.join(repoRoot, 'angular-examples-app/src/app/examples')),
];

fs.writeFileSync(path.join(here, 'examples-index.json'), JSON.stringify(entries, null, 2), 'utf8');
console.log(`[build-index] wrote ${entries.length} examples to mcp-server/examples-index.json`);
