// Generates the auto-generated API reference under
// src/content/docs/core/api/reference/ directly from TypeDoc +
// typedoc-plugin-markdown, called directly rather than through the
// `starlight-typedoc` package.
//
// Why not `starlight-typedoc`: the only released version compatible
// with this project's own pinned Starlight (0.30.x — `starlight-
// typedoc`'s later releases require Starlight >=0.32.0, and upgrading
// Starlight itself cascaded into a deeper, unrelated Astro-core
// incompatibility) is 0.18.0, which has two real, confirmed bugs
// against the newer typedoc/typedoc-plugin-markdown versions available
// today: its own custom Starlight theme emits files named `.html`
// despite genuinely Markdown content (silently ignored by Starlight's
// own content-collection loader, which only recognizes .md/.mdx), and
// its own sidebar-group auto-injection (`typeDocSidebarGroup`) silently
// drops every generated page from the sidebar tree entirely (traced to
// its own `getSidebarGroupFromReflections`' directory-prefix check
// never matching). Calling TypeDoc directly sidesteps both: no custom
// theme at all (typedoc-plugin-markdown's own default output, which
// writes real, correctly-named `.md` files), and no custom sidebar
// injection (Starlight's own native, first-party `autogenerate`
// sidebar option — see astro.config.mjs's own Core → API section —
// handles listing every generated page automatically instead).
//
// Run before `astro dev`/`astro build` (wired as `predev`/`prebuild` in
// package.json) — this project's own docs need real, current content on
// disk before Astro's content-collection loader ever scans it; Astro
// itself doesn't run arbitrary Node scripts as part of its own config
// loading (that's exactly the "browser APIs not available on the
// server" class of failure `starlight-typedoc`'s own in-config-file
// approach hit).
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { Application, TSConfigReader, PageEvent } from 'typedoc';

const here = path.dirname(fileURLToPath(import.meta.url));
const toPosixPath = (p) => p.replaceAll('\\', '/');

const entryPoint = toPosixPath(path.resolve(here, '../../packages/core/src/index.ts'));
const tsconfig = toPosixPath(path.resolve(here, '../../packages/core/tsconfig.json'));
const outputPath = path.resolve(here, '../src/content/docs/core/api/reference');

const app = await Application.bootstrapWithPlugins({
  excludeInternal: true,
  excludePrivate: true,
  excludeProtected: true,
  githubPages: false,
  readme: 'none',
  plugin: ['typedoc-plugin-markdown'],
  // Loading the plugin alone isn't enough — confirmed directly: without
  // this, TypeDoc silently falls back to its own default HTML theme
  // (recognizable by the `assets/` folder it writes alongside the
  // pages) even with the markdown plugin loaded. `theme: 'markdown'` is
  // the plugin's own registered theme name that actually switches
  // rendering over to real Markdown output.
  theme: 'markdown',
  entryPoints: [entryPoint],
  tsconfig,
  // No "Defined in" source links at all, at your explicit request —
  // avoids the whole class of problem entirely (auto-detected local
  // git commit SHAs 404 on GitHub when unpushed; even a fixed branch
  // link can drift once code moves within a file).
  disableSources: true,
  // typedoc-plugin-markdown options — real Markdown output, Starlight
  // handles page chrome itself so this suppresses the plugin's own
  // duplicate header/breadcrumbs/title.
  fileExtension: '.md',
  entryFileName: 'index',
  hideBreadcrumbs: true,
  hidePageHeader: true,
  hidePageTitle: true,
});
app.options.addReader(new TSConfigReader());

// Real Starlight-compatible frontmatter per generated page — matching
// the same shape `starlight-typedoc`'s own (working) frontmatter
// injection used, just without its own broken custom theme alongside
// it. Also pulls a real, page-specific `description` from the actual
// JSDoc summary on each reflection (falling back to none at all when a
// reflection has no real comment of its own) — without this, every
// generated page's own meta description came out empty, since
// typedoc-plugin-markdown's own frontmatter has no `description` field
// of its own at all.
function extractSummaryText(reflection) {
  // A function reflection is a container for one or more call
  // signatures — its own real JSDoc comment lives on the first
  // signature, not on the function reflection itself. Interfaces/
  // types/variables carry their own comment directly. Try both.
  const summary = reflection?.comment?.summary ?? reflection?.signatures?.[0]?.comment?.summary;
  if (!summary || summary.length === 0) return undefined;
  const text = summary
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  // A real meta description shouldn't run past what search engines
  // actually display (~155 characters) — cut at the last real word
  // boundary within that budget rather than mid-word.
  if (text.length <= 155) return text;
  const cut = text.slice(0, 155);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : 155)}…`;
}

app.renderer.on(PageEvent.END, (event) => {
  if (!event.contents) return;
  const title = event.model?.name ?? 'API';
  const description = extractSummaryText(event.model);
  const lines = ['---', 'editUrl: false', `title: "${title.replaceAll('"', '\\"')}"`];
  if (description) {
    lines.push(`description: "${description.replaceAll('"', '\\"')}"`);
  }
  lines.push('---', '', '');
  const frontmatter = lines.join('\n');
  if (!event.contents.startsWith('---')) {
    event.contents = frontmatter + event.contents;
  }
});

const project = await app.convert();
if (!project) {
  throw new Error('TypeDoc conversion failed — no project reflection produced.');
}

fs.rmSync(outputPath, { recursive: true, force: true });
await app.generateDocs(project, outputPath);

// Direct post-processing rather than relying on `fileExtension`/
// `entryFileName` plugin options: confirmed directly across several
// attempts that this installed typedoc-plugin-markdown version keeps
// emitting real Markdown content under literal `.html`-suffixed
// filenames regardless of those options. Beyond that, its own internal
// cross-links are relative paths (`ChartConfigData.md`,
// `../types/ChartKind.md`) that Astro's content-collection rendering
// does not automatically resolve to a real route the way some other
// static-site tooling does — confirmed directly via a real, full-site
// link crawl: every relative link like this 404s in the actual
// rendered output, even though the *file* it points at exists and
// renders fine on its own. Rather than relying on Astro to resolve
// these, this computes each target's own real, final, absolute route
// directly and rewrites every link to point there — robust regardless
// of whether Astro ever adds that resolution itself.
function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

const allFiles = walk(outputPath);

// Maps each generated file's own real disk path (relative to
// outputPath, POSIX-normalized, still carrying its original `.html`
// suffix at this point) to the final, absolute, lowercased route
// Starlight will actually serve it at — matching Starlight's own real
// slug convention: `index`/`hierarchy` at the reference root map to
// `/core/api/reference/` and `/core/api/reference/hierarchy/`; every
// other file maps to `/core/api/reference/<dir>/<lowercased-name>/`.
const routeByRelPath = new Map();
for (const file of allFiles) {
  const rel = toPosixPath(path.relative(outputPath, file));
  const withoutExt = rel.replace(/\.html$/, '');
  const route =
    withoutExt === 'index'
      ? '/core/api/reference/'
      : `/core/api/reference/${withoutExt.toLowerCase()}/`;
  routeByRelPath.set(rel, route);
}

// Rewrite every internal markdown link to its own real, resolved,
// absolute route — resolving the link's own relative path against the
// *current* file's own directory first (`path.posix.resolve`), so both
// same-directory bare filenames (`ChartConfigData.md`) and
// parent-relative paths (`../types/ChartKind.md`) resolve correctly
// regardless of how deep the linking file itself is nested.
for (const file of allFiles) {
  if (!file.endsWith('.html')) continue;
  const contents = fs.readFileSync(file, 'utf8');
  const fileRelDir = path.posix.dirname(toPosixPath(path.relative(outputPath, file)));

  const rewritten = contents.replace(/\]\(([^)]*?)\.html(#[^)]*)?\)/g, (match, linkPath, anchor = '') => {
    const resolvedRel = path.posix.normalize(path.posix.join(fileRelDir, `${linkPath}.html`));
    const route = routeByRelPath.get(resolvedRel);
    if (!route) return match; // leave anything unrecognized untouched rather than guess
    return `](${route}${anchor})`;
  });

  if (rewritten !== contents) fs.writeFileSync(file, rewritten, 'utf8');
}

// Rename every `.html` file to `.md` — the links inside now point to
// real, absolute routes rather than relative filenames, so renaming
// afterward can't break anything the pass above already fixed.
for (const file of allFiles) {
  if (!file.endsWith('.html')) continue;
  fs.renameSync(file, file.slice(0, -'.html'.length) + '.md');
}

// Pass 3: real thin-content pages (a single re-exported variable, a
// single type alias with no real description of its own — genuinely
// little more than a name and a type signature) get a real `noindex`
// directive added to their own frontmatter, via Starlight's own
// supported per-page `head` frontmatter field. Not deleted or hidden —
// still fully reachable by direct navigation and internal links — just
// not worth a search engine's own crawl budget relative to the
// hand-written guide pages. Measured on each page's own real body
// length *after* its frontmatter block, not the whole file, so a
// short-looking file that's mostly frontmatter doesn't get
// miscounted.
const THIN_CONTENT_THRESHOLD = 200;

for (const file of allFiles.map((f) => (f.endsWith('.html') ? f.slice(0, -'.html'.length) + '.md' : f))) {
  if (!file.endsWith('.md')) continue;
  const contents = fs.readFileSync(file, 'utf8');
  const frontmatterMatch = contents.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) continue;
  const body = contents.slice(frontmatterMatch[0].length).trim();
  if (body.length >= THIN_CONTENT_THRESHOLD) continue;

  const existingFrontmatter = frontmatterMatch[1];
  const newFrontmatter = `${existingFrontmatter}\nhead:\n  - tag: meta\n    attrs:\n      name: robots\n      content: "noindex, follow"`;
  const rewritten = contents.replace(frontmatterMatch[0], `---\n${newFrontmatter}\n---\n`);
  fs.writeFileSync(file, rewritten, 'utf8');
}

console.log(`[generate-typedoc] wrote API reference to ${toPosixPath(path.relative(process.cwd(), outputPath))}`);
