# Documentation parity gap: React and Angular vs Vue

**Prepared:** this session, via a direct page-by-page and file-count
comparison of all three frameworks' `astro-docs/src/content/docs/`
trees — not estimated or assumed. Vue is the baseline: it's the most
mature, most-iterated-on docs site of the three, and every page it has
was checked for a Vue-equivalent existing (by any name) in React and
Angular.

**Scope note, per explicit direction**: Angular's examples are
maintained in a standalone application (`angular-examples-app`), not
as `astro-docs` `.mdx` pages the way Vue's and React's 52-per-framework
example pages are — a deliberate architectural choice, not a
documentation gap. **Examples pages are excluded from every count and
comparison in this document** as a result; the numbers below compare
non-example documentation only.

**Methodology note, matching this project's own documentation
standard:** a missing file isn't automatically a real gap. Several
Vue-only files reflect genuine framework differences (Vue's own
internal `eventBus`/slot-reactivity implementation details, Options-API-
style docs that have no React/Angular equivalent to write) rather than
missing content. Each section below says explicitly which missing
items are **real content gaps** versus **legitimate paradigm
substitutions**, and flags the handful that are genuinely unclear.

## Headline numbers (non-example documentation only)

| | Vue (baseline) | React | Angular |
|---|---|---|---|
| Total non-example content pages | 39 | 36 | **19** |
| Gap vs Vue | — | 2 pages (corrected — see below) | **20 pages** |
| Components pages | 14 | 4 | 3 |
| API pages | 13 | 10 | 4 |
| Project-level guide pages | 10 | 10 (full parity) | 10 (full parity) |
| Top-level pages (index, features) | 2 | 2 (full parity) | 2 (full parity) |

React is effectively at parity, with its own small gap already partly
self-documented (see React section below). Angular's remaining gap —
20 pages, all in Components and API — is real but far more modest than
it first appeared once examples (a deliberate non-gap) are set aside.

---

## React vs Vue

### Real content gaps

- **`components/custom-close-button.mdx`** and
  **`components/custom-drag-element.mdx`** — Vue has dedicated pages
  for `CustomCloseButton`/`CustomDragElement`. React doesn't, despite
  exporting comparable standalone utility pieces — confirmed via a
  direct read of `packages/react/src/index.ts`: `GridItemCloseButton`
  and `GridItemDragHandle` are both real, exported components with
  their own prop interfaces. Genuine gaps, not paradigm substitutions.

### Correction (found while preparing the follow-up implementation plan)

The two enum pages originally listed here as real gaps
(`api/enums/grid-item-events.mdx`/`grid-layout-events.mdx`) are not.
Confirmed via a direct read of `GridLayout.tsx`: React never imports
or references `EGridItemEvent`/`EGridLayoutEvent` at all — every event
is an individually-named callback prop (`onDragStart`,
`onSelectionChanged`, etc.), not a value keyed by one of Vue's own
enums. Those enums exist purely to name Vue's own internal `emit()`
calls; they were never part of the cross-framework public API surface.
**This belongs in the paradigm-substitutions list below, not here** —
see [`DOCUMENTATION_PARITY_IMPLEMENTATION_PLAN.md`](./DOCUMENTATION_PARITY_IMPLEMENTATION_PLAN.md)
for the full correction and its knock-on effect on the headline count.

### Legitimate paradigm substitutions (not gaps)

- **`api/interfaces/eventbus.mdx`** (Vue) has no React file — but this
  documents Vue's own internal Provide/Inject event-bus wiring between
  `GridItem`/`GridLayout`, an implementation detail specific to Vue's
  own architecture. React's `imperative-handle.mdx` covers different,
  genuinely-equivalent ground to Vue's `exposed-state.mdx`
  (`compactNow`, `duplicateItem`, selection, undo/redo, SVG export —
  confirmed via a direct read of both files, same shape, same
  members). Not a gap.
- **`components/grid-item/slots.mdx`** / **`grid-layout/slots.mdx`**
  (Vue) have no React equivalent — React uses `children`/render props,
  not slots; this is architecture, not missing content.
- **`components/styling/` as three files** (Vue: `css-grid-item.mdx`,
  `css-grid-layout.mdx`, `css-variables.mdx`) vs **React's single
  `styling.mdx`** — confirmed via a direct read: React's one file
  covers the same ground (custom properties, class names, border
  radius) as Vue's three combined. A reasonable consolidation, not a
  content gap — React's styling model (runtime CSS custom properties
  throughout) is architecturally simpler to document than Vue's
  (mostly compile-time SCSS variables), so fewer pages is expected, not
  suspicious.
- **`api/enums/grid-item-events.mdx`/`grid-layout-events.mdx`** — see
  the correction above. Confirmed via source: not part of React's own
  public API surface at all.

### Already self-documented, not new

React's own [`roadmap.mdx`](../src/content/docs/react/guide/project/roadmap.mdx)
already names the Components/API count gap explicitly and — after this
pass — now distinguishes the real gaps above from the paradigm
substitutions precisely, rather than leaving it an open question.

**React's real, net-new action items from this pass**: the two
standalone-component pages (`GridItemCloseButton`/`GridItemDragHandle`,
both confirmed real gaps) — not the enum pages, per the correction
above.

---

## Angular vs Vue

### Components: missing content, and one overstated claim (fixed)

Angular has 3 Components pages (`components.mdx`,
`grid-item/props.mdx`, `grid-layout/props.mdx`) against Vue's 14.

- **No dedicated `GridItemDragHandleComponent`/
  `GridItemCloseButtonComponent` page exists** — Angular's own
  `api.mdx` used to directly claim otherwise (*"see Components for
  full documentation, including the standalone
  `GridItemDragHandleComponent`/`GridItemCloseButtonComponent` utility
  components"*) — confirmed via a direct check that no such page
  exists, and that overstated claim has since been corrected in place
  on that page. The actual page still needs writing.
- **No styling documentation at all** — not even a single consolidated
  page the way React has. This is a genuine gap, not a paradigm
  difference: Angular's own `index.scss` is real, substantial, and
  uses the same `--kdl-*` CSS custom property convention React
  documents (confirmed directly from this session's own CSS work on
  that exact file) — there's real, documentable content here that
  currently has zero coverage.
- **No header-content-directive-as-its-own-topic page** — `kdlGridItemHeader`
  is currently documented only as a subsection inside `grid-item/props.mdx`,
  not as its own page the way Vue's slots get their own files. Possibly
  fine as a subsection given it's a single directive, not a full
  feature surface — worth a deliberate call rather than treating as an
  automatic gap.
- **No eventbus-equivalent page** — Angular has a real
  `GridEventBusService` (confirmed from this project's own architecture
  docs), the same general role as Vue's internal eventBus. Whether this
  warrants its own public-facing doc page (the way Vue's does) or
  should stay an internal implementation detail undocumented at the
  public API level is a real, undecided question, not an assumed gap
  either way.

### API: missing enums entirely, and a to-revisit design choice

Angular has 4 API pages (`api.mdx` + 3 interface pages: `event-payloads`,
`layout-persistence`, `public-members`) against Vue's 13.

- **No `api/enums/` directory at all** — Vue has 3 enum pages, React
  has 1. Angular has 0, and no redirect-to-Vue note for this category
  the way it has for other core-shared types (see below).
- **No `api/types/` directory at all** — Vue and React both have
  `types/layout.mdx`. Angular has none.
- **Missing interfaces**: `aria-labels`, `compactor`, `layout`,
  `svg-export-and-payload` all exist in Vue (and mostly in React) but
  not in Angular.
- **A deliberate, stated design choice worth revisiting**: Angular's own
  `api.mdx` explains directly that rather than duplicating these
  core-shared type docs, it links out to Vue's own pages instead
  ("rather than a third, separately-maintained copy of the same
  reference here, see the Vue package's own pages"). This is a
  **real, acknowledged inconsistency across the three frameworks**:
  React duplicates these pages per-framework (even though the content
  is identical to Vue's); Angular links out instead. Neither approach
  is wrong, but having two different strategies for the same problem,
  chosen independently rather than deliberately, is itself worth a
  single, consistent decision — not a silent gap, but not fully
  resolved either.

### Angular's real, net-new action items from this pass

In priority order:

1. **Write the standalone drag-handle/close-button components page**
   — the one place an actual documentation bug (an overstated
   coverage claim) existed until this pass; now corrected, but the
   real page still doesn't exist.
2. **Write a styling reference page** — real, existing CSS content
   with zero current coverage.
3. **Decide the core-shared-types strategy** (duplicate-per-framework
   like React, or link-out like Angular currently does) and apply it
   consistently — then fill in whichever pages that decision requires
   (enums, types, the four missing interfaces).
4. **Decide whether `GridEventBusService` and the header directive
   warrant their own pages** — lower priority, genuinely ambiguous
   calls rather than clear gaps.

---

## What this document is not

Not a claim that Angular's actual *feature* parity is behind — this
session's own [Features](../src/content/docs/angular/features.mdx) and
[Production readiness](../src/content/docs/angular/guide/project/production-readiness.mdx)
pages already establish real feature/test parity independently, backed
by a passing e2e suite. This is specifically about **published,
non-example documentation coverage** — a different, narrower question,
and the one this document answers.
