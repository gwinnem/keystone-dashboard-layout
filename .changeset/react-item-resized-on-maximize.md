---
'keystone-dashboard-layout-react': minor
---

`GridItem`'s `onItemResized` now also reports the new pixel size when maximizing or restoring changes it, as the Vue (`container-resized`) and Angular (`itemResized`) packages already did. It fires with the same `{ i, h, w, height, width }` payload when the item becomes maximized, when it is restored, and while it is maximized and the grid's height or width changes. Items that stay hidden report nothing. A grid that was never maximized behaves exactly as before.
