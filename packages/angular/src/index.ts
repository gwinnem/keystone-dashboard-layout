// Entry point for @keystone-dashboard-layout/angular
// Port of packages/vue/src/components/Grid (GridLayout, GridItem) to Angular.
//
// Suggested structure to mirror the Vue package:
//   src/lib/grid-layout.component.ts
//   src/lib/grid-item.component.ts
//   src/lib/directives/grid-item-drag.directive.ts
//   src/lib/directives/grid-item-resize.directive.ts
//
// The framework-agnostic algorithms (bin-packing, collision detection,
// compaction, responsive breakpoints, alignment guides/snapping,
// validators, serialization, SVG export) already exist as their own
// package — @keystone-dashboard-layout/core (see ../../core) — extracted
// from what used to be packages/vue/src/core specifically so this package
// doesn't need to duplicate or re-derive any of it. Add it as a real
// dependency and import from it directly:
//
//   import { collides, compactLayout, findOrGenerateResponsiveLayout } from '@keystone-dashboard-layout/core';
//
// See ../../PARITY_GAP_ANGULAR.md for the full scoping/roadmap this stub
// is based on — including that this package still needs a real Angular
// CLI workspace (`ng generate library`) before any component work starts.

export {};
