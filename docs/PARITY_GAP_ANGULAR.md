# Parity Gap: Angular package vs. Angular-ecosystem alternatives

**Package:** [`packages/angular`](./packages/angular) (`@keystone-dashboard-layout/angular`)
**Status:** Scaffolded only — `package.json`, `tsconfig.json`, and a stub `src/index.ts`. **No Angular CLI workspace, no component implementation.** (`build`/`test`/`lint`/`dev` scripts are intentionally not yet defined — see the package's `package.json`.)
**Reference implementation to port from:** [`packages/vue`](./packages/vue) and [`packages/core`](./packages/core) (the shared framework-agnostic algorithms) — see [`PARITY_GAP_VUE.md`](./PARITY_GAP_VUE.md) and [`PARITY_GAP_REACT.md`](./PARITY_GAP_REACT.md) for the same exercise done for the other two packages, and [`PARITY_GAP_INTERNAL.md`](./PARITY_GAP_INTERNAL.md) for the exact prop-by-prop/event-by-event checklist against Vue.

As with the React package, there's no existing implementation to compare feature-by-feature yet. This document sizes the gap against the dominant Angular competitor to scope the port deliberately.

## The dominant competitor

**[`tiberiuzuld/angular-gridster2`](https://github.com/tiberiuzuld/angular-gridster2)** (npm: `angular-gridster2`) is the clear default in the Angular ecosystem for this category.

- Latest release **`22.0.0`** (June 2026), actively maintained for years, tracking Angular's own major-version cadence closely (its major version numbers correspond to supported Angular versions, going back to Angular 8).
- **Standalone components** — current usage is `import { Gridster, GridsterItem } from 'angular-gridster2'` with `standalone: true`, no `NgModule` required (a meaningful modernization from its earlier `GridsterModule`-based API, which some other forks/wrappers still use).
- **Zoneless-ready** — recent releases specifically address compatibility with Angular's zoneless change-detection model, while still supporting `NgZone.run`/`runOutsideAngular` for apps still on `zone.js`.
- The gridster API is now exposed via `initCallback` or Angular's `viewChild(Gridster)` signal-based query API — tracking Angular's own signals-first direction, not left on the older `ViewChild` decorator pattern.
- Configurable push/compaction direction, drag/resize, widgets — the standard feature set this whole category shares.
- No comparable feature set to this project's Vue package differentiators (snap-to-grid as a magnetic concept, alignment guides, named presets, SVG export, ARIA localization, cross-grid drag) has been confirmed in its docs — worth a direct doc read before the Angular port's design work starts, the same caveat `packages/vue/COMPARISON_ALTERNATIVES.md` applies to every other alternative checked there.

## Secondary alternatives worth checking during design

| Project | Relevance |
| --- | --- |
| [`gridstack/gridstack.js`](https://github.com/gridstack/gridstack.js) | Framework-agnostic core with an official Angular wrapper — same engine compared against in the Vue and React parity docs; true sub-grid nesting and swap-on-drag are its notable edges over both `angular-gridster2` and this project. |
| `angular2gridster` (and forks like `@hyperviewhq/angular2gridster`) | Older, smaller alternative (Rx.js-based, no external deps). Meaningfully behind `angular-gridster2` in adoption and modernization (standalone components, zoneless) — not a primary comparison target, but worth knowing it exists if a consumer asks "why not X." |

## Target feature set

As with the React package, the target scope should be the feature set the
Vue package already ships (see
[`packages/vue/COMPARISON_ALTERNATIVES.md`](./packages/vue/COMPARISON_ALTERNATIVES.md)),
not a fresh feature-scoping exercise. Differentiators to prioritize, pending
direct verification against `angular-gridster2`'s current docs (its feature
set moves fast — this was last checked against `v22.0.0`):

- Magnetic `snapToGrid` (distinct from any visual-guide-only behavior)
- Visual alignment guides
- `MOVE_BLOCKED_BY_COLLISION` feedback event
- Named layout presets and first-party persistence helper
- Grid-to-SVG export
- Localizable ARIA strings
- Live-resyncing per-item `autoHeight`
- Multi-select with group move and resize
- Cross-grid drag and typed outside-drop

## What `@keystone-dashboard-layout/core` already covers directly

Same as the React package — bin-packing, collision detection, compaction
strategies, responsive breakpoint resolution, and alignment/snap math are
framework-agnostic TypeScript, already extracted into
[`packages/core`](./packages/core) as a real workspace dependency
(`@keystone-dashboard-layout/core`, already added to this package's
`package.json`). Nothing to port or fork here — depend on it directly.

What needs a genuine Angular-specific build, essentially from scratch:

- **A real Angular CLI workspace.** Nothing in `packages/angular` today is
  actually buildable by Angular's own tooling (`ng build`/`ng test`) —
  the current scaffold is intentionally minimal (see the package's own
  README). This needs `ng generate library` (or equivalent manual
  `angular.json`/`ng-packagr` setup) before any component work starts.
- **Components as standalone Angular components** (`Gridster`-equivalent
  and `GridsterItem`-equivalent, matching `angular-gridster2`'s current
  API shape and Angular's own current idioms), not `NgModule`-based —
  matching where the ecosystem leader already is, not where Angular was
  several versions ago.
- **Directives for drag/resize interaction**, since Angular's interaction
  model (structural directives, `@HostListener`, Renderer2 or signal-based
  DOM updates) differs meaningfully from both Vue's directive/composition
  approach and React's synthetic-event/hook approach.
- **Zoneless compatibility from day one** — `angular-gridster2`'s recent
  major-version work specifically addressed this; building the Angular
  port assuming `zone.js` is present would be starting behind the
  ecosystem leader on a currently-active axis of its own development,
  not catching up to something already settled.

## Priority roadmap

1. Scaffold a real Angular CLI library workspace in `packages/angular`
   (`ng generate library`), wiring up `build`/`test`/`lint` scripts for
   real — currently absent by design (see the package's `package.json`).
2. Build `Gridster`/`GridsterItem`-equivalent standalone components with
   basic drag/resize/responsive/compaction parity against
   `angular-gridster2`'s current feature set, zoneless-compatible from
   the start, importing shared logic from `@keystone-dashboard-layout/core`.
3. Add the Vue package's differentiators one at a time, same order
   suggested in the React parity doc: persistence helper → named presets
   → SVG export → ARIA localization → multi-select group resize.
4. Re-verify every claimed differentiator against `angular-gridster2`'s
   *current* docs before publishing — its major-version cadence has been
   fast (v20 → v22 within about a year as of this writing), so anything
   checked here has a real chance of being stale by the time the Angular
   port actually ships.
