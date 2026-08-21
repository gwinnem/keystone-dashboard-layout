// Entry point for @keystone-dashboard-layout/angular
// Port of packages/vue/src/components/Grid (GridLayout, GridItem) to Angular.
//
// See docs/PARITY_GAP_ANGULAR.md for the architecture mapping (Vue's
// reactive refs/watchers/eventBus/defineExpose -> Angular's
// @Input()/ngOnChanges/DI-scoped service/public class members) and
// docs/IMPLEMENTATION_PLAN.md for the phase-by-phase build order this
// follows. Phase 1 (basic position/size rendering, no drag/resize/
// compaction yet) is implemented; everything else is still pending.
//
// The framework-agnostic algorithms (bin-packing, collision detection,
// compaction, responsive breakpoints, alignment guides/snapping,
// validators, serialization, SVG export, and the Pointer-Events-based
// drag/resize/auto-scroll engine) already exist as their own package,
// @keystone-dashboard-layout/core (see ../../core) — this package
// imports from it directly rather than duplicating or re-deriving any
// of it:
//
//   import { calcColWidth, calcGridItemWH, setTransform } from '@keystone-dashboard-layout/core';

export { GridLayoutComponent } from './lib/grid-layout.component';
export { GridItemComponent } from './lib/grid-item.component';
