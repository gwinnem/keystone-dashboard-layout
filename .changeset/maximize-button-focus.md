---
'keystone-dashboard-layout-vue': patch
'keystone-dashboard-layout-react': patch
'keystone-dashboard-layout-angular': patch
---

The built-in maximize button now takes focus when it is clicked. Safari does not focus a button on click, so after maximizing an item with the mouse the Escape key never reached the grid and did not restore it. Maximizing through `maximize()` or the `maximizedItem` prop still leaves focus where it was.
