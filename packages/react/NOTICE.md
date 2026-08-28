# Third-Party Notices

This package's own runtime dependency is
`@keystone-dashboard-layout/core` — a sibling package in this same
family (installed as a normal dependency, not vendored or bundled into
this package's own `dist/` output).

**No other third-party code is bundled.** In particular, this package
is not built on `react-grid-layout` or any other existing grid-layout
library — it shares its own `layout`/`onLayoutChange` controlled-
component contract by convention (the idiomatic React pattern for this
kind of component), not by depending on or vendoring that project's
own code.

Build-time-only tooling (Vite, Vitest, Playwright, `@testing-library/react`,
ESLint, Stryker, and so on, listed under `devDependencies` in
`package.json`) is not included in the published package and is not
redistributed — it's used only to build and test this package during
development, under each tool's own license.
