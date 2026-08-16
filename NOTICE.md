# Third-Party Notices

This project is MIT licensed (see [`LICENSE`](./LICENSE)). It bundles or
depends on the third-party software listed below, each under its own
license. This file exists for enterprise legal/procurement review; MIT
itself doesn't require a notices file, but many organizations expect one
regardless before approving a dependency.

## Runtime dependencies bundled into the shipped package

As of this writing, **there are none** — every package in this monorepo
(`@keystone-dashboard-layout/core`, `@keystone-dashboard-layout/vue`,
and the scaffolded React/Angular packages) has an empty `dependencies`
field aside from the internal workspace dependency on
`@keystone-dashboard-layout/core` itself, which isn't a separate
bundled artifact — it's this monorepo's own code, built from the same
source tree.

The last external runtime dependency, `mitt` (MIT,
<https://github.com/developit/mitt>), was removed once its only real
usage — the internal `GridLayout`↔`GridItem` pub/sub event bus — was
replaced with a small hand-rolled typed emitter
(`packages/core/src/helpers/event-emitter.ts`) implementing the exact
narrow `on`/`off`/`emit` surface actually used (no wildcard listeners,
nothing else `mitt` offered was ever called). `mitt`'s own `Emitter<T>`
type was never part of the public API (`TGridLayoutEventBus`/
`TGridItemEventBus` were never exported from either package's barrel),
so this was a zero-risk internal implementation change, not a breaking
one.

Before that, until this library's own native drag/resize engine
replaced it entirely (`native-interaction.ts` — see
`packages/vue/docs/REFACTORING.md`), `@interactjs/*` and its transitive
dependencies were bundled here too, all MIT-licensed under
`taye/interact.js`.

## Peer dependency

`vue` (`^3.0.0`) is a **peer dependency**, not bundled — the consuming
application supplies its own copy. See
[Vue's own license](https://github.com/vuejs/core/blob/main/LICENSE)
(MIT).

## Full production dependency tree (for completeness)

Running `npm run check:licenses`
(`license-checker-rseidelsohn --production`) resolves every package in
the *full* dependency graph reachable from `dependencies` — including
several transitive build-time packages (`typescript`, `postcss`,
`magic-string`, `nanoid`, and similar Vue/Rollup-internal tooling) that
license-checker reports because they're technically reachable, but
which are **not** bundled into the shipped `dist/` output (they're
compiler/tooling internals, not runtime code this library executes).
The table above is the accurate list of what's actually bundled;
this section is here only so a from-scratch license audit
(`npm run check:licenses`) doesn't appear to contradict this file.

All packages currently resolved by that command are one of: MIT,
BSD-2-Clause, BSD-3-Clause, ISC, or Apache-2.0 — the same allowlist
`scripts/check-package-install.js`'s sibling license-check CI gate
enforces (see `.github/workflows/ci.yml`). None are copyleft
(GPL/LGPL/AGPL) or otherwise restrictive.

## Keeping this file current

This file is not automatically regenerated. If a new runtime dependency
is added to `package.json`'s `dependencies` (not `devDependencies`),
update the bundled-dependencies table above in the same change —
`npm run check:licenses` will catch a *disallowed* license automatically,
but it won't catch this file simply being out of date about which
packages exist.
