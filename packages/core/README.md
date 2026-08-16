# @keystone-dashboard-layout/core

Framework-agnostic grid-layout algorithms shared by the `vue`, `react`, and
`angular` packages in this monorepo: bin-packing, collision detection,
compaction, responsive breakpoint resolution, alignment guides / magnetic
snapping, layout validators, serialization, and SVG export.

Zero framework dependency. Every function takes plain data in and returns
plain data out — no live DOM/browser requirement for the pure calculation
functions (a few helpers, like `native-interaction.ts`'s pointer-driven
drag/resize engine and `DOM.ts`'s window event listeners, do need a real
browser environment, since dragging/resizing is inherently a DOM concern —
these stay usable standalone, just not meaningfully callable outside a
browser/jsdom context).

## Origin

This package was extracted from `packages/vue/src/core`, which was Vue's
own `vue-ts-responsive-grid-layout/core` npm sub-export before this
monorepo existed. See [`../../PARITY_GAP_VUE.md`](../../PARITY_GAP_VUE.md),
[`PARITY_GAP_REACT.md`](../../PARITY_GAP_REACT.md), and
[`PARITY_GAP_ANGULAR.md`](../../PARITY_GAP_ANGULAR.md) for why a shared
core package was the first step before starting the React and Angular
ports.

## Usage

```ts
import { collides, compactLayout, findOrGenerateResponsiveLayout } from '@keystone-dashboard-layout/core';
```

See `src/index.ts` for the full public API surface.

## Status

- **Vue package:** fully depends on this package for its own internal
  logic (via a workspace dependency + build-time source alias — see
  `packages/vue`'s `tsconfig.json`/`vite.config.js` for the `@/core/*`
  alias pointing here).
- **React/Angular packages:** not wired up yet — depending on this
  package (rather than duplicating or re-deriving this logic) is the
  intended first implementation step for both ports.

## Testing

No test files have been migrated into this package yet. The ~25
pure-logic spec files that already exercise this code continue to live in
`packages/vue/tests` and run via that package's own Vitest config, thanks
to the same alias. Migrating them here — so this package gets its own
independent coverage/mutation-testing baseline rather than only being
exercised indirectly through the Vue package's test suite — is a
deliberate next step, not done as part of the initial extraction.
