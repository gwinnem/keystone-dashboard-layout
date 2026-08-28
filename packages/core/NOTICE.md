# Third-Party Notices

This package has **no runtime dependencies** and bundles no third-party
code. Everything in the published `dist/` output is this package's own
source, compiled by Vite/`vite-plugin-dts`.

Build-time-only tooling (Vite, Vitest, TypeScript, ESLint, and so on,
listed under `devDependencies` in `package.json`) is not included in
the published package and is not redistributed — it's used only to
build and test this package during development, under each tool's own
license.
