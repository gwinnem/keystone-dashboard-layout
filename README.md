# keystone-dashboard-layout

A multi-framework monorepo for a responsive, dynamic **dashboard grid layout**
component — draggable, resizable panels with collision handling, responsive
breakpoints, and compaction. Not a data table/grid; think `react-grid-layout`
or `gridstack.js`, but implemented independently across frameworks.

## Packages

| Package | Framework | Status |
| --- | --- | --- |
| [`packages/core`](./packages/core) | None (framework-agnostic) | Extracted, in active use by the Vue package |
| [`packages/vue`](./packages/vue) | Vue 3 | Reference implementation, feature-complete |
| [`packages/react`](./packages/react) | React 18/19 | Scaffolded, implementation pending |
| [`packages/angular`](./packages/angular) | Angular 17–19 | Scaffolded, implementation pending |

`@keystone-dashboard-layout/core` holds the framework-agnostic algorithms
— bin-packing, collision detection, compaction, responsive breakpoints,
alignment guides/snapping, validators, serialization, SVG export — shared
by all three framework packages. It was extracted from what used to be
`packages/vue/src/core` (previously published as the
`vue-ts-responsive-grid-layout/core` npm sub-export) specifically so the
React and Angular ports can depend on it directly instead of duplicating
or re-deriving that logic. See
[`packages/core/README.md`](./packages/core/README.md) for details.

The Vue package is the origin of this project (formerly
`vue-responsive-grid-layout` / `vue-ts-responsive-grid-layout` on npm) and
remains the reference implementation.

Each package is compared against its own ecosystem's leading alternative(s)
in a dedicated parity-gap document:

- [`PARITY_GAP_VUE.md`](./PARITY_GAP_VUE.md) — vs. `grid-layout-plus`, `react-grid-layout`, `gridstack.js`, and others
- [`PARITY_GAP_REACT.md`](./PARITY_GAP_REACT.md) — vs. `react-grid-layout` v2
- [`PARITY_GAP_ANGULAR.md`](./PARITY_GAP_ANGULAR.md) — vs. `angular-gridster2`
- [`PARITY_GAP_VUE_COMMERCIAL_AND_CROSS_FRAMEWORK.md`](./PARITY_GAP_VUE_COMMERCIAL_AND_CROSS_FRAMEWORK.md) — the Vue package specifically vs. `react-grid-layout`, `angular-gridster2`, `gridstack.js`, and commercial products (Kendo TileLayout, DevExtreme Dashboard, Syncfusion DashboardLayout)

Separately, [`PARITY_GAP_INTERNAL.md`](./PARITY_GAP_INTERNAL.md) tracks
parity **between this monorepo's own three framework packages** — a
feature-by-feature checklist of every `GridLayout`/`GridItem` prop, event,
and composable the Vue reference implementation has, and React/Angular's
status against each one. Use that document (not the others above) to see
exactly what's left to build for either port.

## Tooling

- **Package manager:** pnpm workspaces (`pnpm-workspace.yaml`)
- **Task runner:** [Turborepo](https://turborepo.com) (`turbo.json`)
- **TypeScript:** shared base config at [`tsconfig.base.json`](./tsconfig.base.json), extended per package

## Getting started

```bash
pnpm install
pnpm build        # turbo run build, respecting package dependencies
pnpm dev          # turbo run dev
pnpm test         # turbo run test
pnpm lint
pnpm typecheck
```

Per-package commands work as usual from within a package directory, or via
pnpm's `--filter`:

```bash
pnpm --filter @keystone-dashboard-layout/vue dev
pnpm --filter @keystone-dashboard-layout/vue test:e2e
```

## Documentation

The shared VitePress documentation site lives at [`vitepress-docs/`](./vitepress-docs):

```bash
pnpm docs:dev
pnpm docs:build
```

> **Note:** `vitepress` is pinned to an exact version (`1.6.3`, no `^`) in the
> root `package.json` and should **not** be bumped. The docs site is planned
> to be rebuilt on Astro; VitePress is being kept stable/frozen in the
> meantime rather than chased through version updates.

## Repository layout

```
.
├── packages/
│   ├── core/          # framework-agnostic algorithms, shared by all three below
│   ├── vue/           # reference implementation (Vue 3)
│   ├── react/         # React port (scaffolded)
│   └── angular/       # Angular port (scaffolded)
├── vitepress-docs/    # shared documentation site
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## License

MIT — see [LICENSE](./LICENSE).
