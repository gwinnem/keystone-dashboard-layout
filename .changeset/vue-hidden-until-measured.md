---
'keystone-dashboard-layout-vue': patch
---

Stop a server-rendered grid flashing and animating into place when it hydrates. The server markup has no item size or position, so the items showed as full-width blocks until the container was measured, and the first measured layout then ran their transition from a provisional 100px-container size to the real one. The grid root is now `visibility: hidden` until its first width measurement, and its `--grid-transition-duration` stays `0ms` until it has been painted once at that width (two animation frames), after which the configured duration applies as before.
