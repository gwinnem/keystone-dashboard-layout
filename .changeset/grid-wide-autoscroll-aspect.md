---
'keystone-dashboard-layout-vue': minor
'keystone-dashboard-layout-angular': minor
'keystone-dashboard-layout-core': patch
---

`GridLayout` now accepts grid-wide `autoScroll` and `preserveAspectRatio` defaults (as the React package already did). Items inherit them unless they set their own, and an item's own `autoScroll`/`preserveAspectRatio` now defaults to `null` instead of `false`. Angular items now also auto-scroll while resizing, as Vue and React do.
