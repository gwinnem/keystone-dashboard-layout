---
'keystone-dashboard-layout-vue': minor
---

Add `exportLayoutAsSvg(options?)` to the `GridLayout` instance. It renders the current layout as an SVG string using the grid's own `layout`, `colNum`, `rowHeight`, `margin` and measured width, with every option still overridable. React's imperative handle and Angular's component already had it; Vue only had the standalone function.
