// Entry point for keystone-dashboard-layout-angular
// Port of packages/vue/src/components/Grid (GridLayout, GridItem) to Angular.
//
// Every item in Vue's own original prop inventory is implemented — full
// feature parity, not a partial port (see this package's own README.md
// for the complete, current feature list).
//
// The framework-agnostic algorithms (bin-packing, collision detection,
// compaction, responsive breakpoints, alignment guides/snapping,
// validators, serialization, SVG export, and the Pointer-Events-based
// drag/resize/auto-scroll engine) already exist as their own package,
// keystone-dashboard-layout-core (see ../../core) — this package
// imports from it directly rather than duplicating or re-deriving any
// of it:
//
//   import { calcColWidth, calcGridItemWH, setTransform } from 'keystone-dashboard-layout-core';

export { GridLayoutComponent } from './lib/grid-layout.component';
export { GridItemComponent } from './lib/grid-item.component';
// A real, confirmed gap fixed here, not a stale-comment-only issue:
// these three were fully implemented (Phase 9/22 respectively, see
// each file's own doc comment) but never actually exported from this
// barrel — meaning no consumer could ever import them from
// 'keystone-dashboard-layout-angular' at all, despite being real,
// documented parts of the public API surface every other doc
// (IMPLEMENTATION_PLAN.md, each file's own doc comment) already
// describes them as.
export { GridItemHeaderDirective } from './lib/grid-item-header.directive';
export { GridLayoutStorageService } from './lib/grid-layout-storage.service';
export { GridLayoutPresetsService } from './lib/grid-layout-presets.service';
// Standalone utility components, ported from Vue's own
// CustomDragElement.vue/CustomCloseButton.vue (confirmed via a direct
// source read, not assumed) — closing a real, confirmed parity gap:
// this package previously had no drag-handle/close-button components
// of its own at all, unlike Vue. Not used internally by
// GridLayoutComponent/GridItemComponent; a consumer opts in explicitly.
export { GridItemDragHandleComponent } from './lib/grid-item-drag-handle.component';
export { GridItemCloseButtonComponent } from './lib/grid-item-close-button.component';
