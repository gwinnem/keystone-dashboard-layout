---
'keystone-dashboard-layout-core': minor
'keystone-dashboard-layout-vue': minor
'keystone-dashboard-layout-react': minor
'keystone-dashboard-layout-angular': minor
---

Add `collisionMode: 'push' | 'swap'` to the grid. With `'swap'`, dropping a dragged item onto exactly one other non-static item that fits into its starting cell trades the two places; anything else (several items, a static item, or the other item not fitting the starting cell) falls back to the usual push. Only affects dragging, and is ignored while `preventCollision` is on. Core exports `swapElement`, `createSwapDragState`, `TCollisionMode` and `ISwapDragState`.
