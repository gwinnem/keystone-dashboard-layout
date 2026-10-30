---
'keystone-dashboard-layout-core': minor
'keystone-dashboard-layout-vue': minor
---

Add `verticalFastCompactor` (and `compactLayoutFast`): a drop-in alternative to `verticalCompactor` that gives the same result in roughly O(n log n) instead of O(n²), for very large layouts. Opt in through the `compactor` prop; `compactType` is unchanged. The Vue package re-exports it; React and Angular import it from `keystone-dashboard-layout-core`.
