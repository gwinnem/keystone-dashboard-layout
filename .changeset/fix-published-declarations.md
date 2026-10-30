---
'keystone-dashboard-layout-core': patch
'keystone-dashboard-layout-vue': patch
'keystone-dashboard-layout-react': patch
---

Fix published declarations (#2). Core adds a types-only `./types/*` subpath export (with `typesVersions`); the Vue and React builds rewrite `core/src` paths in emitted `.d.ts` files to `keystone-dashboard-layout-core/types/*`, so consumers no longer get unresolved types. The pack-install smoke tests now validate the installed `.d.ts` files, and the stale `@keystone-dashboard-layout/core` alias is removed from the Vue tsconfig.
