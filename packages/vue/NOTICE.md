# Third-Party Notices

This package's own runtime dependency is
`@keystone-dashboard-layout/core` — a sibling package in this same
family (installed as a normal dependency, not vendored or bundled into
this package's own `dist/` output).

**No other third-party code is bundled.** Notably,
[`interact.js`](https://interactjs.io/) was used for drag/resize in an
earlier version of this package and has since been fully replaced by a
native, dependency-free drag/resize engine (built on the plain Pointer
Events API, now living in `@keystone-dashboard-layout/core`) — it is
**not** a runtime dependency of the current version, despite possibly
appearing in older discussions or search results about this project.

Build-time-only tooling (Vite, Vitest, Playwright, ESLint, Stryker, and
so on, listed under `devDependencies` in `package.json`) is not
included in the published package and is not redistributed — it's used
only to build and test this package during development, under each
tool's own license.
