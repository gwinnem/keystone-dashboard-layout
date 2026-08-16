# Parity Gap: React package vs. React-ecosystem alternatives

**Package:** [`packages/react`](./packages/react) (`@keystone-dashboard-layout/react`)
**Status:** Scaffolded only — `package.json`, `tsconfig.json`, build/test config, and a stub `src/index.ts`. **No component implementation exists yet.**
**Reference implementation to port from:** [`packages/vue`](./packages/vue) and [`packages/core`](./packages/core) (the framework-agnostic algorithms — bin-packing, collision detection, compaction, responsive breakpoints, alignment-guide math — already extracted into their own package, ready to depend on directly) — see [`PARITY_GAP_VUE.md`](./PARITY_GAP_VUE.md) for what the Vue package already achieves relative to its own ecosystem, and [`PARITY_GAP_INTERNAL.md`](./PARITY_GAP_INTERNAL.md) for the exact prop-by-prop/event-by-event checklist against Vue.

Unlike the Vue package, this isn't a "where do we lead / where are we behind" comparison yet — there's nothing built to compare. This document instead sizes the gap against the dominant competitor so the React port's scope can be planned deliberately, rather than discovered feature-by-feature during implementation.

## The dominant competitor

**[`react-grid-layout/react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout)** is the reference implementation for this entire category, and the library this project's own Vue package (and most of the wider ecosystem) explicitly took inspiration from.

- **~22,300 GitHub stars, ~2.5M weekly npm downloads** — by far the largest, most battle-tested project in this comparison across any framework.
- **Recently completed a v2 rewrite** (latest: `2.2.4`): full first-party TypeScript (no more `@types/react-grid-layout`), a **Hooks API** (`useContainerWidth`, `useGridLayout`, `useResponsiveLayout`), composable configuration objects (`gridConfig`, `dragConfig`, `resizeConfig`, `positionStrategy`, `compactor`), a tree-shakeable modular architecture (separate `/core`, `/extras`, `/legacy` entry points), and a new **constraints system** — custom validation/transformation of layout items during drag/resize, covering aspect-ratio locks, snap-to-grid, and boundary restrictions.
- 100% backwards-compatible with v1 via the `react-grid-layout/legacy` import path.
- Breaking change in v2: the grid no longer auto-measures its own width — width must be supplied explicitly or via the new `useContainerWidth` hook.

Notably, v2's constraints system means **snap-to-grid — previously a differentiator unique to this project's Vue package — now has a rough equivalent in `react-grid-layout`** via a custom constraint. Worth re-checking exactly how its snap behaves (visual guide vs. actual magnetic positioning) once the React port design work starts, rather than assuming parity or its absence.

## Secondary alternatives worth checking during design

| Project | Relevance |
| --- | --- |
| [`gridstack/gridstack.js`](https://github.com/gridstack/gridstack.js) | Framework-agnostic core with an official React wrapper — same engine already compared against in the Vue parity doc; true sub-grid nesting and swap-on-drag are its notable edges. |
| Various smaller React grid libraries (`react-mosaic`, muuri-based wrappers) | Lower adoption, not treated as primary competitors here, but worth a quick scan if a specific feature (tiling window-manager-style layouts, etc.) is in scope. |

## Target feature set

Rather than reinvent scope, the target for this package should be the **feature set the Vue package already ships**, since that's this project's own established design (see [`packages/vue/COMPARISON_ALTERNATIVES.md`](./packages/vue/COMPARISON_ALTERNATIVES.md) for the full list this compares against `react-grid-layout` v1/v2, `grid-layout-plus`, and others). In particular, the Vue package's differentiators against `react-grid-layout` specifically (per that document, still valid against v2 except where noted above):

- Pluggable compaction (`ICompactor` interface) — **partial parity already exists conceptually**, since `react-grid-layout` v2 has the same `compactor` prop pattern; port the interface shape, don't redesign it
- `MOVE_BLOCKED_BY_COLLISION` feedback event
- Named layout presets (`useLayoutPresets`)
- First-party persistence helper (`useLayoutStorage`)
- Grid-to-SVG export (`exportLayoutAsSvg`)
- Localizable ARIA strings (`ariaLabels`)
- Live-resyncing per-item `autoHeight`
- Multi-select with group move **and resize** (not confirmed either way in `react-grid-layout`'s scope — verify before assuming this is still a differentiator)
- Cross-grid drag (`allowCrossGridDrag`) and typed outside-drop (`allowOutsideDrop`) — `react-grid-layout` has a comparable `onDrop`/`isDroppable` for outside-drop, but no cross-grid equivalent

## What `@keystone-dashboard-layout/core` already covers directly

These are framework-agnostic TypeScript, already extracted into [`packages/core`](./packages/core) as a real workspace dependency (`@keystone-dashboard-layout/core`) — add it as a dependency and import from it, rather than porting or re-deriving any of this:

- Bin-packing / collision detection
- Compaction strategies (vertical/horizontal/overlap variants, `noCompactor`)
- Responsive breakpoint resolution
- Alignment-guide and snap-to-grid math

What needs a genuine React-specific rewrite: the component layer itself
(`GridLayout`/`GridItem` → React components), drag/resize interaction
wiring (React's synthetic event model differs meaningfully from Vue's
directive-based approach), and state management idioms (Vue's
`ref`/`reactive` → React hooks, watching for the classic stale-closure
pitfalls this project's monorepo has already hit once in the
`ag-charts-capabilities-backlog.md` work — see the KeystoneGrid React port
notes on the "ref holding latest callback" pattern for `onSegmentClick`,
which will likely recur here for drag/resize event handlers).

## Priority roadmap

1. Add `@keystone-dashboard-layout/core` as a real dependency (already done — see `packages/react/package.json`) and start importing from it directly
2. Build `GridLayout`/`GridItem` React components with basic drag/resize/responsive/compaction parity against `react-grid-layout` v2's core feature set
3. Add the Vue package's differentiators one at a time, in the order they'd matter most to a consumer choosing between this and `react-grid-layout`: persistence helper → named presets → SVG export → ARIA localization → multi-select group resize
4. Re-verify the snap-to-grid/constraints comparison against `react-grid-layout` v2 directly (its docs, not assumption) before claiming any Vue-parity feature as a differentiator in this package's own comparison doc
