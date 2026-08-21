/**
 * `vue-ts-responsive-grid-layout/core` — the pure grid-layout math this
 * library's own Vue and React components are both built on, with zero
 * framework dependency for the vast majority of it (every function
 * takes plain data in, returns plain data out, no live DOM/browser
 * requirement). Usable standalone too: validating a layout
 * server-side, computing collisions/compaction for a batch job, or
 * building an entirely different UI layer on top of the same
 * algorithms, without installing Vue, React, or mounting any component
 * at all.
 *
 * Every export here is re-exported from every other file that already
 * imported it before this entry point existed — this file adds a new
 * *public* door into code that was already internally shared and
 * already framework-free, not new logic. See `docs/REFACTORING.md` for
 * the import-path audit that confirmed nothing in this dependency
 * graph reaches into `@/components`'s own Vue component code (every
 * import of a layout/breakpoint type goes directly to its defining
 * file, e.g. `@/components/Grid/layout-definition`, never through the
 * main barrel) — the thing that would otherwise silently pull the
 * entire component tree into what's supposed to be a framework-free
 * bundle.
 *
 * One deliberate exception to the "no live browser needed" promise
 * above: `createNativeDraggable`/`createNativeResizable`/
 * `createNativeAutoScroll` (from `native-interaction.ts`) need a real
 * DOM to do anything at all — kept here rather than duplicated into
 * each framework package specifically because they're genuinely
 * framework-agnostic (built on the plain Pointer Events API, no
 * Vue/React-specific code whatsoever), so both packages share this one
 * implementation. Still excludes what's tied to a *component's own*
 * lifecycle rather than being reusable as-is: DOM measurement
 * (`DOM.ts`), and the cross-grid registry (a runtime coordination
 * singleton tied to component mount/unmount, not a pure calculation).
 */

// Layout data shapes — re-exported here so `/core` is usable without
// also importing from the main component entry point.
export type {
  ILayoutItem,
  ILayoutItemRequired,
  TLayout,
  TResponsiveLayout,
  TBreakpoint,
  TBreakpoints,
} from './layout-definition';
export type { IBreakpoints, IColumns } from './breakpoints.interfaces';

// Collision detection.
export { collides, getAllCollisions, getFirstCollision } from '@/core/gridlayout/helpers/collision-helper';
export { findFirstFitSlot } from '@/core/gridlayout/helpers/bin-pack-helper';

// Movement — resolving a target position/size against collisions and
// grid bounds.
export { moveToCorrectPlace, moveElement, moveElementAwayFromCollision } from '@/core/gridlayout/helpers/move-helper';

// Compaction, cloning, and pixel-position style generation.
export {
  cloneLayoutItem,
  cloneLayout,
  compactItem,
  compactLayout,
  compactItemHorizontal,
  compactLayoutHorizontal,
  compactLayoutOverlapVertical,
  compactLayoutOverlapHorizontal,
  getLayoutItem,
  setTransform,
  setTransformRtl,
  setTopLeft,
  setTopRight,
} from '@/core/helpers/utils';
export { getBottomYCoordinate } from '@/core/gridlayout/helpers/grid-layout-helper';

// Pluggable compaction — the same interface `GridLayout`'s own
// `compactor` prop takes, plus the five built-in strategies its
// default (`null`) falls back to (matching `compactType`'s own
// `ECompactType` values), and a `getCompactor()` factory to look one
// up by that enum directly.
export type { ICompactor, ICompactorContext } from '@/core/gridlayout/helpers/compactor';
export {
  verticalCompactor,
  horizontalCompactor,
  noCompactor,
  verticalOverlapCompactor,
  horizontalOverlapCompactor,
  getCompactor,
} from '@/core/gridlayout/helpers/compactor';
export { ECompactType } from '@/core/gridlayout/enums/ECompactType';

// Grid-unit <-> pixel math.
export { calcXY } from '@/core/helpers/calculate-utils';
export { clamp, calcGridItemWH, calcColWidth } from '@/core/griditem/helpers/grid-item-calculate-helper';

// Raw pointer-event -> grid-unit conversion helpers behind `calcXY`/
// `calcPosition`/`calcWH` in both the Vue and React packages' own drag/
// resize hooks — genuinely framework-agnostic (plain DOM event reads and
// arithmetic), so shared here rather than duplicated.
export { offsetXYFromParentOf, createCoreData } from '@/core/helpers/draggable-utils';
export type { IDraggableCoreData } from '@/core/helpers/draggable-utils';
export type { IPoint } from '@/core/helpers/point.interface';

// The 8 resize-handle identifiers (`resizeHandles` prop), the
// `dragActivationDistance` value shape, and the native pointer-driven
// drag/resize/auto-scroll engine itself — genuinely framework-agnostic
// (built on the plain Pointer Events API, zero Vue-specific code), so
// both the Vue and React packages share this one implementation rather
// than each maintaining their own copy. The one exception to this
// file's own "usable in Node/SSR, no live browser needed" promise
// (documented at the top of this file) — these three factory
// functions need a live DOM (`addEventListener`, `PointerEvent`,
// `requestAnimationFrame`) to do anything at all, unlike everything
// else exported here.
export type { TDragActivationDistance, TResizeHandle } from '@/core/helpers/native-interaction';
export { RESIZE_EDGE_MAP } from '@/core/helpers/native-interaction';
export type {
  INativeAutoScroll,
  INativeDragEvent,
  INativeDraggableOptions,
  INativeResizeEvent,
  INativeResizableOptions,
} from '@/core/helpers/native-interaction';
export {
  createNativeAutoScroll,
  createNativeDraggable,
  createNativeResizable,
} from '@/core/helpers/native-interaction';

// Ordering, static/non-static partitioning, and bounds correction.
export { sortLayoutItemsByRowCol, sortLayoutItemsByColRow } from '@/core/gridlayout/helpers/sort-helper';
export { getAllStaticGridItems, getAllNonStaticGridItems } from '@/core/common/helpers/grid-item-type-helpers';
export { correctBounds } from '@/core/helpers/responsive-utils';

// Alignment guides / magnetic snapping / spacing indicators.
export type { IAlignmentGuide } from '@/core/gridlayout/helpers/alignment-helper';
export type { ISpacingIndicator } from '@/core/gridlayout/helpers/alignment-helper';
export { findAlignmentGuides, findSnapAdjustment, findSpacingIndicators } from '@/core/gridlayout/helpers/alignment-helper';

// multiSelect align/distribute commands — pure position-adjustment
// computation, mirroring the same "pure function in /core, wiring in
// GridLayout.vue" split every other command-style feature here uses.
export type { TAlignEdge, TDistributeAxis } from '@/core/gridlayout/helpers/align-distribute-helper';
export { computeAlignAdjustments, computeDistributeAdjustments } from '@/core/gridlayout/helpers/align-distribute-helper';

// Responsive breakpoints.
export { findOrGenerateResponsiveLayout } from '@/core/gridlayout/helpers/responsive-helper';
export {
  sortBreakpoints,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
} from '@/core/common/helpers/breakpoints-helper';

// Serialization, SVG export, and the outside-drop payload helper.
export { serializeLayout, deserializeLayout } from '@/core/helpers/layout-storage';
export type { IExportLayoutAsSvgOptions } from '@/core/gridlayout/helpers/export-svg';
export { exportLayoutAsSvg } from '@/core/gridlayout/helpers/export-svg';
export { readOutsideDropPayload } from '@/core/gridlayout/helpers/outside-drop-payload';

// Localizable UI/ARIA strings — the close button's own label, the
// item's aria-roledescription, and the keyboard move/resize
// instructions read via aria-describedby. `resolveAriaLabels` merges
// three layers (built-in English defaults <- grid-wide override <-
// per-item override), the same resolution `GridItem.vue` already does
// internally — exposed here so the React package's own `GridItem` can
// reuse the identical merge logic instead of re-deriving it.
export type { IGridAriaLabels } from '@/core/common/interfaces/aria-labels.interface';
export { DEFAULT_ARIA_LABELS, resolveAriaLabels } from '@/core/common/interfaces/aria-labels.interface';

// Validators — the same ones GridLayout/GridItem use internally for
// prop validation, reachable standalone (e.g. validating a layout
// that came from an API response before ever handing it to the grid).
export { breakpointsValidator } from '@/core/validators/breakpoint-validator';
export { keysValidator, validateLayoutItemRequiredKeys } from '@/core/validators/keys-validator';
export { layoutValidator } from '@/core/validators/layout-validator';
export { marginValidator } from '@/core/validators/margin-validator';

// Shared enums/types small helpers above take or return.
export { EMovingDirections } from '@/core/common/enums/EMovingDirections';
export type { TMovingDirection } from '@/core/common/types/TMovingDirections';
export type {
  ITransformStyle,
  ITopLeftStyle,
  ITopRightStyle,
} from '@/core/common/interfaces/transform-style.interfaces';
export type { ICalcXy, ICalcWh, IGridItemPosition, IGridItemWidthHeight, IInteractEdges } from '@/core/griditem/interfaces/grid-item.interfaces';
