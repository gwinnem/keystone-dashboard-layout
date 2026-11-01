---
'keystone-dashboard-layout-angular': patch
---

Stop items sliding into place when the grid first loads. Until the container is measured the items sit at provisional positions, and moving them to the measured ones ran their transition, so every item animated on load. The grid's `--grid-transition-duration` is now `0ms` until it has been painted once at its measured width (two animation frames after the first measurement), after which `transitionDurationMs` applies as before.
