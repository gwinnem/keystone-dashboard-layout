// Entry point for @keystone-dashboard-layout/react
// Port of packages/vue/src/components/Grid (GridLayout, GridItem) to React.
//
// Suggested structure to mirror the Vue package:
//   src/components/GridLayout.tsx
//   src/components/GridItem.tsx
//   src/hooks/useGridItemDrag.ts
//   src/hooks/useGridItemResize.ts
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
// See ../../PARITY_GAP_REACT.md for the full scoping/roadmap this stub is
// based on.

export {};
