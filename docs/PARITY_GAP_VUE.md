# Parity Gap: Vue package vs. Vue-ecosystem alternatives

**Package:** [`packages/vue`](./packages/vue) (`@keystone-dashboard-layout/vue`)
**Status:** Feature-complete reference implementation
**Full analysis:** [`packages/vue/COMPARISON_ALTERNATIVES.md`](./packages/vue/COMPARISON_ALTERNATIVES.md) and [`packages/vue/COMPARISON_COMMERCIAL.md`](./packages/vue/COMPARISON_COMMERCIAL.md) — this document is a condensed, root-level summary of that deeper analysis, current as of this writing.

## Comparable projects

| Project | Category | Notes |
| --- | --- | --- |
| [`jbaysolutions/vue-grid-layout`](https://github.com/jbaysolutions/vue-grid-layout) | Vue (2) | The original of this whole category. Still has **no official Vue 3 release** — last npm publish (`2.4.0`) was 4+ years ago. |
| [`qmhc/grid-layout-plus`](https://github.com/qmhc/grid-layout-plus) | Vue 3 | A faithful Vue 3 + `<script setup>` + TypeScript **port** of the original codebase. The real de-facto default by usage (~66k weekly downloads, its own VitePress docs site) — not just "one more fork." |
| [`merfais/vue-grid-layout-v3`](https://github.com/merfais/vue-grid-layout-v3) | Vue 3 | Independent community Vue 3 port, `vue-grid-layout-v3` on npm. |
| [`xhlife/vue3-grid-layout`](https://github.com/xhlife/vue3-grid-layout) | Vue 3 | Another independent community port, `vue3-grid-layout-next` on npm. |
| [`marshal-zheng/vue-grid-layout`](https://github.com/marshal-zheng/vue-grid-layout) (`@marsio/vue-grid-layout`) | Vue 3 | Small adoption but technically ambitious — grew into a dashboard-editor framework (undo/redo, worker-based engine, command layer). |
| [`react-grid-layout/react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) | React | The category's reference implementation. Recently completed a v2 rewrite (hooks API, full TypeScript, tree-shakeable). |
| [`gridstack/gridstack.js`](https://github.com/gridstack/gridstack.js) | Framework-agnostic | Vanilla-JS core with official Vue 3/React/Angular wrappers. |

## Where this package leads (no equivalent found in any alternative checked)

- Magnetic `snapToGrid` as a distinct concept from visual guides
- Visual alignment guides (`showAlignmentGuides`)
- `MOVE_BLOCKED_BY_COLLISION` feedback event
- Named layout presets (`useLayoutPresets`)
- Grid-to-SVG export (`exportLayoutAsSvg`)
- Localizable ARIA strings (`ariaLabels`)
- Live-resyncing per-item `autoHeight` (real `ResizeObserver`)
- Multi-select with group **move and resize** (most alternatives that have multi-select at all only support group move)
- Cross-grid drag (`allowCrossGridDrag`) and typed outside-drop (`allowOutsideDrop`)
- **Genuinely zero runtime dependencies** (native Pointer Events engine, `interact.js` removed at `2.0.0`; `mitt` — the last one remaining, used only for the internal `GridLayout`↔`GridItem` event bus — replaced with a small in-house typed emitter since). This claim was slightly inaccurate between those two points (`mitt` was still a real dependency despite the `2.0.0` changelog entry's wording) — now actually true.

## Where this package is behind

| Gap | Detail | Tracking |
| --- | --- | --- |
| Ecosystem size / battle-testing | `react-grid-layout` and `gridstack.js` have years more production usage | Not closeable by writing code — inherent to being newer |
| Framework breadth | `gridstack.js` covers Vue/React/Angular from one core; this package is Vue-only by design | Addressed at the monorepo level — see the React/Angular parity gap docs |
| Sub-grids / nesting | `gridstack.js` supports true grids-within-grids; this package's cross-grid drag is sibling-to-sibling only | `ROADMAP.md` — not started |
| Swap-on-drag | `gridstack.js` swaps same-size items on drop (its default `float: false` behavior); this package only compacts/pushes | `ROADMAP.md` item 8 — not started |
| Align/distribute over a multi-selection | `@marsio/vue-grid-layout` has `align`/`distribute` commands | `ROADMAP.md` item 23 — not started |
| Spacing guides with distance labels | `@marsio/vue-grid-layout` shows e.g. "2 cols" alongside alignment guides | Not started |
| Multiple persistence backends | This package: one adapter (`useLayoutStorage`, localStorage). `@marsio/vue-grid-layout`: localStorage/sessionStorage/IndexedDB/remote-HTTP | Not started |
| Worker-based layout engine for very large layouts | `@marsio/vue-grid-layout` has an opt-in Web Worker executor | Not started |
| Open compaction/position-strategy interfaces | `react-grid-layout` v2's `compactor`/`positionStrategy` props take *any* implementation; this package's `compactor` prop exists but `useCssTransforms` is still a closed on/off switch, not an open `positionStrategy` interface | `docs/REFACTORING.md` #79 — partially done |
| Multiple tree-shakeable entry points | `react-grid-layout` v2 ships `/core`, `/extras`, `/legacy` as separate entries. This package's equivalent — the framework-agnostic algorithms — now ships as an entirely separate workspace package, [`@keystone-dashboard-layout/core`](./packages/core), rather than a `/core` npm subpath (deprecated — see `packages/vue/vite.core.config.js`'s own header comment). Arguably a *cleaner* split than `react-grid-layout`'s subpath-based one, but still only one entry point on the main `@keystone-dashboard-layout/vue` package itself — no separate `/legacy` or `/extras`. | Reframed by the monorepo restructuring, not fully closed |

## Closed

| Item | How it was closed |
| --- | --- |
| Configurable resize-handle *set* (which corners/edges render) | `resizeHandles` prop added to both `GridLayout` (grid-wide default) and `GridItem` (per-item override, `null` = inherit) — matches `@marsio/vue-grid-layout`'s `resizeHandles: Array<'s'\|'w'\|...>` shape. Unit, component, and e2e tests added; demo's "Per-item overrides" view has a live checkbox control. |
| `mitt` as the last remaining runtime dependency | Replaced with a small hand-rolled typed emitter (`@keystone-dashboard-layout/core`'s `createEventEmitter()`), implementing only the narrow `on`/`off`/`emit` surface actually used — never `mitt`'s wildcard listeners or `.all` map. Not part of the public API either way (`TGridLayoutEventBus`/`TGridItemEventBus` were never exported), so a zero-risk internal change. See `NOTICE.md`. |

## Priority gap-closing roadmap

1. **Align/distribute over multi-selection** — closes a real, checked gap against `@marsio/vue-grid-layout`; natural extension of existing `multiSelect`.
2. **Swap-on-drag mode** — matches `gridstack.js` default behavior; would need to be opt-in given this package's compaction-first design.
3. **Open `positionStrategy` interface** — architectural work already half-done via the `compactor` prop; extend the same pattern.
4. **Sub-grid nesting** — largest lift, lowest near-term priority given `allowCrossGridDrag` already covers the sibling-drag use case.
