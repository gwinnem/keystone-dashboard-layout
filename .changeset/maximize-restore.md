---
'keystone-dashboard-layout-core': minor
'keystone-dashboard-layout-vue': minor
'keystone-dashboard-layout-react': minor
'keystone-dashboard-layout-angular': minor
---

Add maximize/restore. One item can be expanded to fill the whole grid and restored exactly, without ever changing `layout`. The grid holds the maximized item's id (Vue `v-model:maximized-item`, React `maximizedItem` with `onMaximizedItemChange`, Angular `[(maximizedItem)]`), and `maximize(id)`, `restore()` and `toggleMaximize(id)` are available on the component instance (Vue, Angular) or the imperative handle (React). `showMaximizeButton`, grid-wide with a per-item override, renders a built-in maximize/restore button labelled by the new `maximizeButton` and `restoreButton` ARIA strings. The other items are hidden but stay mounted, compaction is suspended while an item is maximized and runs once on restore, the maximized item cannot be dragged, resized or moved by keyboard (its header and close button keep working), and Escape restores. Core exports `resolveMaximizedItem`, `calcMaximizedPosition`, `IMaximizedPositionInput` and `IMaximizedState`, and `ILayoutItem` gains an optional `showMaximizeButton`.
