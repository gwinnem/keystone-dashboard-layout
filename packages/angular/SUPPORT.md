# Support

## Getting help

- **Bugs and feature requests:** [GitHub Issues](https://github.com/gwinnem/keystone-dashboard-layout/issues)
- **Questions about usage:** open a GitHub issue too — there's no
  separate discussion forum, chat, or mailing list for this project at
  this time.

Please include your package version, Angular version, and — for a bug
report — a minimal reproduction where possible; it's the single
biggest thing that speeds up a fix.

## Supported environments

- **`@angular/common` / `@angular/core`:** `^17.0.0 || ^18.0.0 || ^19.0.0`
  (peer dependencies)
- **`rxjs`:** `^7.8.0` (peer dependency)
- **Node.js:** `^18.0.0 || ^20.0.0 || >=22.0.0` (see `engines` in
  `package.json`)
- Standalone components throughout — no `NgModule` required.

## A known, open gap

This package does not yet have a real end-to-end browser test layer
the way the Vue and React packages in this family do (Karma is present
in this package but reserved for a possible future one, not currently
exercising anything). A real, extensive unit/component test suite
(Jest + `jest-preset-angular`) with Stryker mutation testing covers it
in the meantime. Stated here plainly as a genuine gap, not glossed
over.

## Versioning and maintenance model

This package follows [semantic versioning](https://semver.org/). It's
currently at `0.x` (pre-1.0) — expect the public API to still shift
between minor versions until `1.0.0`, per semver's own convention for
that range. No separate `MIGRATION.md` exists yet for the same reason;
one will be added once there's a real `0.x → 1.0` (or later) breaking
change to document.

**Maintenance is currently a single-maintainer effort** ([Geirr
Winnem](https://github.com/gwinnem)), stated here plainly rather than
left implicit. There's no committed SLA on issue response time or
release cadence. If that bus-factor matters for your use case, fork
freely (MIT-licensed) or weigh in on an issue if you'd like to help
maintain it.
