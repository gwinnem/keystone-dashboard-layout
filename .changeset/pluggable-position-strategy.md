---
'keystone-dashboard-layout-core': minor
'keystone-dashboard-layout-vue': minor
'keystone-dashboard-layout-react': minor
'keystone-dashboard-layout-angular': minor
---

Add pluggable CSS positioning. `GridLayout` accepts a new `positionStrategy` (`IPositionStrategy`) that replaces the `useCssTransforms` on/off toggle. `transformStrategy` and `topLeftStrategy` are exported as built-ins; a strategy set here takes precedence over `useCssTransforms`. Default behavior is unchanged.
