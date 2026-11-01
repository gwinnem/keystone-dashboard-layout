---
'keystone-dashboard-layout-react': patch
---

Stop the grid flashing squashed items on load. Before its container was measured, `GridLayout` laid items out at a seed width of 100px (about 5px per column in a 12-column grid), and that was what server-rendered pages showed until hydration, and for a while after it. The container is now measured in a layout effect, before the first paint, and the grid is `visibility: hidden` until that first measurement, so the first thing shown is the grid at its real width.
