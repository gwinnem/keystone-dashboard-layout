# Third-Party Notices

This package's own runtime dependencies are:

- **`@keystone-dashboard-layout/core`** — a sibling package in this
  same family (installed as a normal dependency, not vendored or
  bundled into this package's own `dist/` output).
- **[`tslib`](https://www.npmjs.com/package/tslib)** (Microsoft, MIT
  licensed) — TypeScript's own runtime helper library, a standard,
  near-universal dependency for any package built with `ng-packagr`
  (Angular's own official library-packaging tool). Not vendored —
  installed as a normal npm dependency, under its own MIT license.

Build-time-only tooling (Angular CLI, `ng-packagr`, Jest,
`jest-preset-angular`, Karma, Puppeteer, Stryker, and so on, listed
under `devDependencies` in `package.json`) is not included in the
published package and is not redistributed — it's used only to build
and test this package during development, under each tool's own
license.
