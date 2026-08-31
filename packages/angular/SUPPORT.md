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
- **Node.js:** `>=22.0.0` (see `engines` in `package.json` — narrowed
  from an earlier, wider range once Node 18/20 both reached
  end-of-life and this project's own build tooling stopped supporting
  Node 18 outright)
- Standalone components throughout — no `NgModule` required.

## End-to-end testing

A real Playwright e2e suite now exists (`e2e/`), running against a
dedicated `e2e-fixture/` application — a genuine, separate `angular.json`
project, served via the Angular CLI's own dev-server rather than Vite
(`@analogjs/vite-plugin-angular` hit a genuinely unresolved upstream bug
for this project's Angular target, the same reason unit tests use Jest
rather than Vitest — see `package.json`'s own `_comment_scripts` field).
Karma (`angular.json`'s own separate, project-scoped `test` architect
target + `karma.conf.js`) predates this and is no longer needed for it —
still present, but not currently exercising anything.

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
