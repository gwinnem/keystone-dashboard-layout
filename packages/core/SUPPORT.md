# Support

## Getting help

- **Bugs and feature requests:** [GitHub Issues](https://github.com/gwinnem/keystone-dashboard-layout/issues)
- **Questions about usage:** open a GitHub issue too — there's no
  separate discussion forum, chat, or mailing list for this project at
  this time.

Please include your package version, Node version, and — for a bug
report — a minimal reproduction where possible; it's the single
biggest thing that speeds up a fix.

## Supported environments

- **Node.js:** `^18.0.0 || ^20.0.0 || >=22.0.0` (see `engines` in
  `package.json`)
- No browser/DOM requirement for the vast majority of this package's
  exports (plain data in, plain data out) — the one exception is the
  native drag/resize engine (`createNativeDraggable`/
  `createNativeResizable`/`createNativeAutoScroll`), which needs a real
  DOM (`PointerEvent`, `addEventListener`) and isn't meant to be called
  outside a browser context.

## Versioning and maintenance model

This package follows [semantic versioning](https://semver.org/).
Released via [semantic-release](https://semantic-release.gitbook.io/)
from conventional commits — every published version corresponds to a
real, tagged commit in the
[repository](https://github.com/gwinnem/keystone-dashboard-layout).

**Maintenance is currently a single-maintainer effort** ([Geirr
Winnem](https://github.com/gwinnem)), stated here plainly rather than
left implicit. There's no committed SLA on issue response time or
release cadence. If that bus-factor matters for your use case, fork
freely (MIT-licensed) or weigh in on an issue if you'd like to help
maintain it.
