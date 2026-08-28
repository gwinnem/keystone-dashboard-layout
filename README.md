# keystone-dashboard-layout

A multi-framework monorepo for a responsive, dynamic **dashboard grid layout**
component — draggable, resizable panels with collision handling, responsive
breakpoints, and compaction. Not a data table/grid; think `react-grid-layout`
or `gridstack.js`, but implemented as one shared engine wrapped by three
independent, idiomatic framework packages.

## Packages

| Package | Framework | Status |
| --- | --- | --- |
| [`packages/core`](./packages/core) | None (framework-agnostic) | Shared engine, in active use by all three framework packages |
| [`packages/vue`](./packages/vue) | Vue 3 | Reference implementation, feature-complete |
| [`packages/react`](./packages/react) | React 18/19 | Full feature parity with Vue |
| [`packages/angular`](./packages/angular) | Angular 17–19 | Full feature parity with Vue |

`@keystone-dashboard-layout/core` holds the framework-agnostic algorithms
— bin-packing, collision detection, compaction, responsive breakpoints,
alignment guides/snapping, validators, serialization, SVG export, and a
native Pointer-Events-based drag/resize engine — shared by all three
framework packages, so each one builds on one implementation of the
hard, easy-to-get-subtly-wrong parts rather than maintaining its own
copy. See [`packages/core/README.md`](./packages/core/README.md) for
details.

The Vue package is the origin of this project (formerly
`vue-responsive-grid-layout` / `vue-ts-responsive-grid-layout` on npm)
and remains the reference implementation each port is checked against.
See each package's own README for its full feature list and usage —
[`packages/vue/README.md`](./packages/vue/README.md),
[`packages/react/README.md`](./packages/react/README.md),
[`packages/angular/README.md`](./packages/angular/README.md).

Angular's own `PARITY_GAP_ANGULAR.md`
([`packages/angular/docs/PARITY_GAP_ANGULAR.md`](./packages/angular/docs/PARITY_GAP_ANGULAR.md))
tracks the most current, source-verified feature-by-feature comparison
against Vue for that specific port — including the narrow, genuine
gaps still open and a real behavioral bug found and fixed along the
way (`enableUndoRedo` not tracking externally-driven `layout` length
changes). No equivalent document exists yet for React specifically,
since its own parity work closed out without leaving one behind.

## Tooling

- **Package manager:** pnpm workspaces (`pnpm-workspace.yaml`) — covers
  `packages/*` only. `astro-docs/` and `angular-examples-app/` are each
  deliberately **separate, standalone projects** with their own
  `package.json`/`pnpm-workspace.yaml`, not part of this root workspace
  — see "Documentation & examples" below for why, and how to run each.
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

This covers `packages/core`, `packages/vue`, `packages/react`, and
`packages/angular` only — see "Documentation & examples" below for the
two standalone apps these commands don't reach.

Per-package commands work as usual from within a package directory, or via
pnpm's `--filter`:

```bash
pnpm --filter @keystone-dashboard-layout/vue dev
pnpm --filter @keystone-dashboard-layout/vue test:e2e
```

## Documentation & examples

The documentation site lives in [`astro-docs/`](./astro-docs) — Astro +
Starlight, with live, interactive Vue and React examples embedded
directly as Astro islands. It's a separate, standalone project (its
own `README.md`/`package.json`/`pnpm-workspace.yaml`, deliberately
outside this root workspace), so install and run it from within its
own directory:

```bash
cd astro-docs
pnpm install
pnpm dev
```

Angular's own interactive examples live in a second standalone app,
[`angular-examples-app/`](./angular-examples-app) — a real Angular CLI
project, not embedded in `astro-docs` as an Astro island. The
community `@analogjs/astro-angular` integration that would have made
that possible proved too fragile for this project's own needs (see
that app's own README for the full account of what was tried and why
it didn't work out); Angular's examples run through Angular's own
native CLI/esbuild build instead, independently:

```bash
cd angular-examples-app
pnpm install
pnpm dev
```

Neither app is currently deployed publicly — both are run locally via
the steps above.

> **Note:** this project previously used VitePress for documentation
> (`vitepress-docs/`, with `docs:dev`/`docs:build`/`docs:preview`
> scripts in the root `package.json`). That migration to Astro is now
> complete — `vitepress-docs/` no longer exists, and `vitepress` isn't
> a dependency anywhere in this repo anymore. The root `package.json`'s
> own `docs:*` scripts still reference the old, now-nonexistent
> `vitepress-docs` path and need updating to point at `astro-docs`
> instead (or removing, since `astro-docs` is a separate project run
> via its own scripts, not through the root task runner) — a real,
> confirmed leftover from that migration, not yet cleaned up.

## Repository layout

```
.
├── packages/
│   ├── core/              # framework-agnostic algorithms, shared by all three below
│   ├── vue/               # reference implementation (Vue 3)
│   ├── react/             # React port (full feature parity with Vue)
│   └── angular/           # Angular port (full feature parity with Vue)
├── astro-docs/            # documentation site (Astro + Starlight) — standalone, own workspace
├── angular-examples-app/  # Angular's own live examples — standalone, own workspace
├── pnpm-workspace.yaml    # covers packages/* only
├── turbo.json
└── tsconfig.base.json
```

## License

MIT — see [LICENSE](./LICENSE).
