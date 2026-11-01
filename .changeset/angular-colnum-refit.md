---
'keystone-dashboard-layout-angular': patch
---

Fix `colNum` changes leaving items outside the grid. Going from 12 to 6 columns kept items at their old `x` (for example x: 8) and drew them off the right edge, with nothing reported through `layoutChange`. A changed `colNum` now pulls items back inside the new column count and compacts the layout, whether or not `responsive` is on, and reports the result through `layoutChange` when anything moved. This is what the Vue package already did.
