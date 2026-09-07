# Docs-site infrastructure gap: implementation plan

**Prepared:** this session, as a companion to
`astro-docs/DOCUMENTATION_PARITY_GAP.md`/
`DOCUMENTATION_PARITY_IMPLEMENTATION_PLAN.md`. Those two cover *content*
parity across Vue/React/Angular. This one covers *infrastructure* —
the pieces a session working on `keystone-chartjs-wrappers`' own docs
site (Astro + Starlight, same stack) found genuinely missing or broken
there, checked directly against this repo's own `astro-docs` rather
than assumed to apply here too.

**Net finding, stated up front so the rest of this reads correctly**:
`astro-docs` is *already ahead* of where `keystone-chartjs-wrappers`'
docs site started in several respects — confirmed by direct reads, not
assumed:

- **OG images**: per-page, dynamically generated via `astro-og-canvas`
  (`src/pages/og/[...slug].ts`) — a real generation pipeline, not a
  handful of static PNGs.
- **JSON-LD**: `TechArticle` + `BreadcrumbList` on every page, plus
  `SoftwareSourceCode` on each framework's own home page (via
  `src/components/overrides/Head.astro`) — broader coverage than a
  TechArticle-or-SoftwareSourceCode-only setup.
- **Landing page**: already accurate — its own script comment states
  directly "all three frameworks are LIVE now ... no status badge
  remains anywhere on this page," confirmed true by reading the
  rendered picker markup itself (three `is-live` cards, no
  `is-planned`/"coming soon" language anywhere).
- **`robots.txt`**: exists, correctly formatted, points at
  `sitemap-index.xml`.

None of the above needs redoing. What follows is five gaps that
*do* apply, each verified directly against this repo before being
listed — not carried over from the other project's own checklist on
the assumption it'd match.

---

## 1. Sitemap doesn't actually exist — confirmed, not assumed

`astro.config.mjs`'s own comment claims: *"Starlight has built-in
sitemap support with no separate config option or integration package
needed; it activates the moment `site` is set, producing
sitemap-index.xml at build time."*

**This is wrong**, checked directly against this repo's own build
output: `astro-docs/dist/` (a real, already-built copy present in this
repo) contains no `sitemap-index.xml`, `sitemap-0.xml`, or any file
matching `sitemap*` anywhere in the tree. `site` is set
(`https://kdl.winnem.tech`), canonical URLs and `og:url` both work
correctly (confirmed via that comment's own accurately-cited Starlight
PR #3496 fix) — but sitemap generation was never actually part of what
setting `site` unlocks. `robots.txt` currently points at a URL that
404s in production.

This is the exact same incorrect assumption `keystone-chartjs-wrappers`'
own docs site comment made before its own fix — Starlight does *not*
generate a sitemap on its own; the separate `@astrojs/sitemap`
integration is required.

### Fix

```
pnpm add @astrojs/sitemap
```

In `astro.config.mjs`:

```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://kdl.winnem.tech',
  integrations: [
    vue(),
    react(),
    sitemap(),
    starlight({ /* ...unchanged... */ }),
  ],
});
```

Order matters less than presence here, but placing it before
`starlight()` matches the working pattern already confirmed in
`keystone-chartjs-wrappers`. After adding it, rebuild and confirm
`dist/sitemap-index.xml` (and at least one `dist/sitemap-*.xml`) exist
before considering this closed — the same verification step that
caught the original bug should catch a broken fix too.

Also worth a one-line correction to `astro.config.mjs`'s own comment
once this is fixed, so a future reader doesn't reintroduce the same
wrong assumption.

---

## 2. No auto-generated API reference — everything is hand-written

Checked directly: `core/api/index.mdx` (12.4 KB) and every
`{vue,react,angular}/api/**/*.mdx` page are hand-authored prose/tables,
not generated from the actual exported TypeScript source. This carries
the same staleness risk `keystone-chartjs-wrappers` had before adding
one: a hand-written interface page silently drifts from the real
exported shape the moment a prop/field is added, renamed, or removed
in `src/`, with nothing to catch the mismatch.

Given the scale here (four packages' worth of API surface, versus
`keystone-chartjs-wrappers`' single `core` package), auto-generating
*everything* in one pass is a bigger undertaking than is realistic to
scope in one plan. Recommended order:

1. **`core` first.** It's the framework-agnostic engine every other
   package depends on, has the most reused shared-type surface (`TLayout`,
   `ILayoutItem`, `ICompactor`, the event-payload interfaces — several
   of which `DOCUMENTATION_PARITY_IMPLEMENTATION_PLAN.md` §3 above
   already flags as duplicated by hand across Vue/React/Angular's own
   API pages today), and is the smallest, most self-contained place to
   prove the approach out.
2. **Vue/React/Angular's own component-level API** (props/events/
   slots/inputs-outputs) can stay hand-written for now — those pages
   already read more like curated guides than raw reference dumps
   (see `vue/components/grid-layout/props.mdx`'s own prose-heavy
   style), and a generated dump would likely read worse, not better,
   for that specific content. Revisit only if hand-maintenance there
   is confirmed to be causing real drift, not preemptively.

### Concrete mechanism to reuse, not reinvent

`keystone-chartjs-wrappers/docs/site/scripts/generate-typedoc.mjs`
already solves the real problems this will hit again here — copy and
adapt it rather than starting from `starlight-typedoc` fresh:

- Calls `typedoc` + `typedoc-plugin-markdown` directly, **not** via
  `starlight-typedoc` — that package has confirmed bugs at the version
  compatible with Starlight 0.30.x (emits `.html` files, silently drops
  sidebar injection). Given `astro-docs` is also on
  `@astrojs/starlight@0.30.6` (confirmed via `package.json`), this
  exact incompatibility applies here too.
- Post-processing passes worth porting as-is: rewriting relative
  `.html` cross-links to real Starlight routes, renaming `.html` →
  `.md`, adding `noindex` to thin-content pages, injecting
  `title`/`description` frontmatter from each export's own JSDoc
  summary.
- Wire as `predev`/`prebuild` in `package.json`, output to
  `src/content/docs/core/api/reference/`, sidebar entry via
  Starlight's native `autogenerate: { directory: 'core/api/reference' }`
  — same pattern, new directory.

Since `core/api/index.mdx` already exists as a curated overview page,
keep it as the landing page for that section and let the generated
`reference/` subtree sit underneath it (`core/api/reference/`) rather
than replacing it outright — the overview's own prose (what this
package is for, who needs it) isn't something generation should
produce or should try to replace.

---

## 3. No genuine migration guide — confirmed distinct from what exists

`{vue,react,angular}/guide/project/comparison-alternatives.mdx` already
exists and is substantial (6.99 KB for Vue's own, read in full) — but
it is a **feature/positioning comparison** (a table of "does X have
feature Y", aimed at someone deciding *whether* to switch), not a
**migration guide** (concrete before/after code showing *how* to
convert an existing `vue-grid-layout`/`react-grid-layout` integration
to this library's own API). These are genuinely different documents
with different jobs — confirmed by reading the actual content, not
inferred from the filename.

### Fix

One new page per framework, reusing the comparison page's own
already-researched competitor list rather than researching from
scratch:

- `vue/guide/migrating-from-vue-grid-layout.mdx` (covering both
  `vue-grid-layout` and `grid-layout-plus`, per
  `comparison-alternatives.mdx`'s own note that the latter is "a
  faithful Vue 3 port ... its own feature set matches the original
  almost exactly" — meaning one migration narrative likely covers
  both with minor callouts, not two separate pages).
- `react/guide/migrating-from-react-grid-layout.mdx`.
- `angular/guide/migrating-from-angular-gridster.mdx` (or whichever
  Angular grid library the Angular comparison page names — confirm its
  own equivalent competitor list before writing this one; not
  independently checked as part of this pass).

Content shape, matching what worked in `keystone-chartjs-wrappers`'
own `vue/guide/migrating-from-vue-chartjs.mdx`: prop-for-prop mapping
table, event-for-event mapping table, a real before/after code pair for
the common case, and a short section on behavioral differences a
straight prop-rename wouldn't catch (e.g. this library's own
compaction/collision defaults if they differ from the source library's
own).

Link from `comparison-alternatives.mdx`'s own existing "Bottom line"
section once written, so someone convinced by the comparison has an
immediate next click.

---

## 4. No recipes page — likely lower priority than it would be elsewhere

Searched, confirmed absent: no `recipes.mdx` or equivalent under any of
the four sections.

Worth flagging as **lower priority here specifically** — unlike
`keystone-chartjs-wrappers` (which had no comparable content at all),
this site's own 53-example gallery per framework already covers most
of what a "recipes" page would otherwise exist to demonstrate (real-time
updates, persistence, responsive sizing, and more are each already a
dedicated, live, interactive example — see example #19
"save/load layout," #7 "responsive breakpoints," etc.). A recipes page
here would mostly duplicate the gallery's own job in a less interactive
form.

If pursued anyway, scope it narrowly to task framing the example
gallery doesn't already provide directly — e.g. "I want X, which
example(s) get me there and what do I still need to wire up myself" —
rather than re-explaining what each example already shows in place.

---

## 5. No troubleshooting/FAQ page

Searched, confirmed absent: no `troubleshooting.mdx`/`faq.mdx` or
equivalent under any of the four sections. Unlike the recipes gap
above, this one doesn't have a substitute already covering the same
ground — the example gallery shows working code, not common failure
modes.

### Fix

One page per framework (`{vue,react,angular}/guide/troubleshooting.mdx`),
seeded from whatever real, recurring issues are already known from this
project's own issue tracker/support history — not invented
speculatively. If no such history exists yet to draw from, a reasonable
starting set based on this category of library generally: layout not
rendering (container has no defined height), SSR/hydration mismatches,
drag not initiating (checking `dragAllowFrom`/`dragIgnoreFrom`
interaction), and responsive breakpoints not switching (checking the
container's own `ResizeObserver` target). Verify each against this
project's own actual behavior before publishing — a guessed-at
troubleshooting entry that doesn't match this library's real failure
mode is worse than no entry at all.

---

## Summary

| Gap | Confirmed how | Fix effort |
|---|---|---|
| Sitemap doesn't generate | `dist/` has no `sitemap*` file despite `site` + `robots.txt` both configured for one | Small — one dependency, ~3 lines of config, matches a fix already proven working in `keystone-chartjs-wrappers` |
| No auto-generated API reference | `core/api/index.mdx` and all framework API pages are hand-written prose, no generation step in any `package.json` script | Medium — `core` only, by reusing (not rewriting) `keystone-chartjs-wrappers/docs/site/scripts/generate-typedoc.mjs` |
| No migration guide | `comparison-alternatives.mdx` read in full — confirmed a feature-comparison, not a code-migration doc | Medium — 2-3 new pages, content shape already proven in `keystone-chartjs-wrappers` |
| No recipes page | Searched, absent | Low priority — the 53-example gallery already covers most of what this would otherwise add |
| No troubleshooting page | Searched, absent | Medium — needs real failure modes, not invented ones; per-framework |

Not included above: anything already confirmed working (OG images,
JSON-LD, landing page accuracy, `robots.txt`) — repeating fixes already
in place elsewhere isn't useful, and this plan is scoped to genuine,
directly-verified gaps only.
