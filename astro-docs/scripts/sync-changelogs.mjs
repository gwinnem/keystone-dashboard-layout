// Syncs each framework package's real CHANGELOG.md (written by
// Changesets when `pnpm version-packages` runs) into this
// site's own Changelog page for that framework — run before `astro
// dev`/`astro build` (wired as predev/prebuild in package.json,
// alongside generate-typedoc.mjs) so the page always reflects
// whatever's currently on disk, not a hand-copied snapshot that can
// drift out of sync with a real release.
//
// Core is included too: it is published independently, has its own release history, and its own Changelog page in the sidebar.
// It carries no pre-rename history, so it needs no seed file (see below).
//
// Vue carries real, hand-written pre-1.0 release history under this
// project's earlier npm name(s) — that content predates Changesets
// entirely and isn't derivable from packages/vue/CHANGELOG.md, so it's
// kept as a separate, hand-maintained seed file
// (scripts/changelog-seeds/vue.md) and appended after whatever real
// entries Changesets has produced. React/Angular have no such
// history (built from scratch inside this monorepo), so no seed file
// exists for them.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const seedsDir = path.join(here, 'changelog-seeds');

// Everything from the first `## ` heading onward is a real release
// entry; everything before it is just the `# <package name>` title
// Changesets writes at the top of every package's own CHANGELOG.md — not
// real content to show twice on this page, which already has its own
// title/intro. Matched this way (rather than hardcoding the exact title)
// so it keeps working whatever the title says. Entry headings are `## `;
// the `### Minor Changes` sub-headings inside an entry do not match, as
// `##` has to be followed by whitespace.
function extractReleaseEntries(changelogMd) {
  const match = changelogMd.match(/\n(##\s[\s\S]*)$/);
  return match ? match[1].trim() : '';
}

const PACKAGES = {
  core: {
    description: 'Release history for the shared keystone-dashboard-layout-core engine.',
    intro: `Synced directly from [\`packages/core/CHANGELOG.md\`](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/core/CHANGELOG.md)
by this site's own build process (see \`scripts/sync-changelogs.mjs\`) —
not hand-maintained on this page.

Installing Vue, React or Angular pulls this package in as a dependency,
so a change here can reach you without that framework package itself
changing — its own changelog will say so under "Updated dependencies".`,
    noReleasesYet: `There is no changelog entry yet because there has been no release yet;
this section will list real entries automatically once one has.`,
    seedFile: null,
  },
  vue: {
    description: 'Release history for Keystone Dashboard Layout for Vue.',
    intro: `:::note[Package renamed — version numbers reset]
This package publishes today as \`keystone-dashboard-layout-vue\`. Every
entry below through v2.0.0 was released under this project's previous
npm name(s) (\`vue-responsive-grid-layout\`, later
\`vue-ts-responsive-grid-layout\`) — same codebase and continuous git
history, but a different package identity as far as npm and semantic
versioning are concerned. The current package started fresh at
\`1.0.0\` under the new name, which is what \`npm view
keystone-dashboard-layout-vue version\` actually reports today — not
\`2.0.0\`. The history below is kept for context (the features and fixes
it describes are real and still present), not as a literal version
ladder leading to the current release.
:::

Synced directly from [\`packages/vue/CHANGELOG.md\`](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/vue/CHANGELOG.md)
by this site's own build process (see \`scripts/sync-changelogs.mjs\`) —
not hand-maintained on this page.`,
    noReleasesYet: `No release has run under the current package name yet — this section
will list real entries automatically once one has, with no edit needed
here.`,
    seedFile: 'vue.md',
  },
  react: {
    description: 'Release history for Keystone Dashboard Layout for React.',
    intro: `Synced directly from [\`packages/react/CHANGELOG.md\`](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/react/CHANGELOG.md)
by this site's own build process (see \`scripts/sync-changelogs.mjs\`) —
not hand-maintained on this page.`,
    noReleasesYet: `Unlike the Vue port — which carries a multi-year, pre-rename release
history under an earlier package name — this package has no prior
history to carry forward. It was built from scratch inside this
monorepo at its current name, \`keystone-dashboard-layout-react\`,
starting at \`1.0.0\`. There is no changelog entry yet because there has
been no release yet; this section will list real entries automatically
once one has.

For what's already implemented as of this snapshot, see
[Features](/react/features/) — feature-complete parity with the Vue
port, confirmed directly rather than assumed. See the
[Roadmap](/react/guide/project/roadmap/) for what still needs a fresh check.`,
    seedFile: null,
  },
  angular: {
    description: 'Release history for Keystone Dashboard Layout for Angular.',
    intro: `Synced directly from [\`packages/angular/CHANGELOG.md\`](https://github.com/gwinnem/keystone-dashboard-layout/blob/main/packages/angular/CHANGELOG.md)
by this site's own build process (see \`scripts/sync-changelogs.mjs\`) —
not hand-maintained on this page.`,
    noReleasesYet: `Unlike the Vue port — which carries a multi-year, pre-rename release
history under an earlier package name — this package has no prior
history to carry forward. It was built from scratch inside this
monorepo at its current name, \`keystone-dashboard-layout-angular\`,
starting at \`0.1.0\`. There is no changelog entry yet because there has
been no release yet; this section will list real entries automatically
once one has.

For what's already implemented as of this snapshot, see
[Features](/angular/features/). See the [Roadmap](/angular/guide/project/roadmap/)
for what's been independently re-confirmed versus what still needs a
fresh check.`,
    seedFile: null,
  },
};

for (const [pkg, config] of Object.entries(PACKAGES)) {
  const changelogPath = path.join(repoRoot, 'packages', pkg, 'CHANGELOG.md');
  const outputPath = path.join(here, `../src/content/docs/${pkg}/guide/changelog.mdx`);

  const rawChangelog = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : '';
  const entries = extractReleaseEntries(rawChangelog);

  const seed = config.seedFile
    ? fs.readFileSync(path.join(seedsDir, config.seedFile), 'utf8').trim()
    : '';

  // No wrapper heading: each entry already starts with its own `## <version>` heading, and nesting them all under a
  // "## Unreleased" heading mislabelled every released version (including dated ones) as unreleased. Changesets writes an
  // entry only when a version is cut, so there is nothing that is still "unreleased" to show here.
  const sections = [entries || config.noReleasesYet];
  if (seed) sections.push('', seed);

  const content = `---
title: Changelog
description: ${config.description}
---

${config.intro}

${sections.join('\n')}
`;

  fs.writeFileSync(outputPath, content, 'utf8');
}

console.log('[sync-changelogs] synced Vue/React/Angular changelog pages from their real packages/*/CHANGELOG.md');
