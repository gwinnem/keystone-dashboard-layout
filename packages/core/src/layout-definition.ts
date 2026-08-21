/**
 * The grid-position/size fields every layout item must have, regardless of
 * its interactivity settings.
 */
import type { IGridAriaLabels } from '@/core/common/interfaces/aria-labels.interface';
import type { TDragActivationDistance, TResizeHandle } from '@/core/helpers/native-interaction';

export interface ILayoutItemRequired {
  /** Unique identifier, matched against a `GridItem`'s `i` prop. */
  i: string | number;
  /** Height, in grid row units. */
  h: number;
  /** Width, in grid column units. */
  w: number;
  /** Horizontal position, in grid column units. */
  x: number;
  /** Vertical position, in grid row units. */
  y: number;
}

/**
 * One entry in a `GridLayout`'s `layout` array. The optional fields here
 * mirror the corresponding `GridItem` props (`isDraggable`, `minH`, etc.)
 * — set them on the layout item to configure a `GridItem` from data rather
 * than from template props directly.
 *
 * `TMeta` (default `unknown`) types the optional `data` field — attach
 * whatever payload your item needs (a widget's config, a chart's dataset
 * reference, anything) directly on the layout item, instead of
 * maintaining a parallel array keyed by `i` to look it up separately.
 * Every existing usage of `ILayoutItem` (or `TLayout`) without a type
 * argument keeps working unchanged — the default only matters if you
 * actually read `.data` and want it typed as something more specific
 * than `unknown`.
 */
export interface ILayoutItem<TMeta = unknown> extends ILayoutItemRequired {
  isDraggable?: boolean;
  isResizable?: boolean;
  /** Excludes this item from dragging, resizing, and collision cascades. */
  isStatic?: boolean;
  maxH?: number;
  maxW?: number;
  minH?: number;
  minW?: number;
  /**
   * CSS `z-index` override for this item, always winning over the
   * static/dragging/resizing CSS-class-based defaults when set.
   * `null`/unset defers to those defaults. Optional and purely
   * additive — the Vue package's own `GridItem` has an equivalent
   * `zIndex` prop, but as a separate component prop rather than a
   * layout-item field (Vue's `GridItem` takes many per-item settings
   * as props directly, unlike the React package's `GridItem`, which
   * only takes `i` and reads everything else from here — see that
   * package's own `grid-item-props.interface.ts` for why). Vue does
   * not read this field; adding it here doesn't change Vue's own
   * behavior at all.
   */
  zIndex?: number | null;
  /**
   * Per-item override for whether a close button renders —
   * `undefined` defers to the grid-wide `showCloseButton` default. Same
   * "Vue has an equivalent prop, not a layout-item field" note as
   * `zIndex` above applies here too.
   */
  showCloseButton?: boolean;
  /**
   * Per-item override for whether native auto-scroll runs near a
   * container edge during this item's own drag/resize — `undefined`
   * defers to the grid-wide `autoScroll` default. Same "Vue has an
   * equivalent prop, not a layout-item field" note as `zIndex` above
   * applies here too (Vue's own `autoScroll` is a `GridItem` prop, not
   * read from the layout item).
   */
  autoScroll?: boolean;
  /**
   * Per-item override for whether resizing this item preserves its
   * current width/height ratio (deriving the undriven dimension from
   * the driven one) — `undefined` defers to the grid-wide
   * `preserveAspectRatio` default. Same "Vue has an equivalent prop,
   * not a layout-item field" note as `zIndex` above applies here too.
   */
  preserveAspectRatio?: boolean;
  /**
   * Per-item override merged over the grid-wide `ariaLabels` prop (and
   * that, in turn, over the built-in English defaults) — see
   * `resolveAriaLabels` for the exact three-layer merge. Same "Vue has
   * an equivalent prop, not a layout-item field" note as `zIndex`
   * above applies here too (Vue's own `GridItem` takes `ariaLabels` as
   * a direct component prop).
   */
  ariaLabels?: IGridAriaLabels;
  /**
   * CSS selector restricting which descendant elements can start a
   * drag. `null`/unset (the default) allows dragging from anywhere on
   * the item except `dragIgnoreFrom` matches. Same "Vue has an
   * equivalent prop, not a layout-item field" note as `zIndex` above
   * applies here too. Forwarded straight to `core`'s own
   * `createNativeDraggable` (`allowFrom`), which already implements the
   * actual selector check.
   */
  dragAllowFrom?: string | null;
  /**
   * CSS selector for elements that should *not* start a drag (e.g.
   * buttons/links inside the item) — has no effect at all when
   * `dragAllowFrom` is also set, since an explicit allow-list already
   * restricts the surface to exactly one handle (see
   * `createNativeDraggable`'s own `passesDragFilters` for why checking
   * both together wouldn't make sense). `undefined` (the default, when
   * this field itself is left unset on the layout item) resolves to
   * `` `a, button` `` in `GridItem.tsx` — matching Vue's own default —
   * rather than "no restriction at all"; set this to an empty string
   * explicitly if you genuinely want every descendant to be able to
   * start a drag.
   */
  dragIgnoreFrom?: string;
  /**
   * CSS selector for elements that should *not* start a resize —
   * the resize counterpart to `dragIgnoreFrom` above, for a custom
   * `renderResizeHandle` render prop's own interactive content (an
   * icon with its own click handler, say). `null`/unset (the default)
   * means no restriction — resize only ever starts from the dedicated
   * resize-hint spans regardless, so there's a narrower need for this
   * than `dragIgnoreFrom`'s own "anywhere on the item" surface.
   */
  resizeIgnoreFrom?: string | null;
  /**
   * Minimum pointer movement, in pixels, before a pointerdown on this
   * item is treated as a drag rather than a click — either one fixed
   * value for every pointer type, or distinct values per
   * `mouse`/`touch`/`pen`. `null`/unset (the default) uses `core`'s own
   * fixed 3px threshold for every pointer type — unchanged from before
   * this field existed for anyone not using it. See
   * `TDragActivationDistance`'s own doc comment for the exact
   * per-pointer-type fallback behavior when only some of `mouse`/
   * `touch`/`pen` are set in the object form.
   */
  dragActivationDistance?: TDragActivationDistance | null;
  /**
   * Per-item override for whether dragging this item is restricted to
   * within the container's own bounds — `undefined`/`null` defers to
   * the grid-wide `isBounded` default. Same "Vue has an equivalent
   * prop, not a layout-item field" note as `zIndex` above applies here
   * too.
   */
  isBounded?: boolean | null;
  /**
   * Restricts which of the 8 resize-hint spans actually render/
   * activate for *this* item specifically — `undefined`/`null` defers
   * to the grid-wide `resizeHandles` default. An empty array (`[]`) is
   * a deliberate, valid "no handle-driven resize for this item at all"
   * value, distinct from `isResizable: false` (which also disables
   * keyboard-driven arrow-key resize; an empty `resizeHandles` here
   * does not). Same "Vue has an equivalent prop, not a layout-item
   * field" note as `zIndex` above applies here too.
   */
  resizeHandles?: TResizeHandle[] | null;
  /**
   * Whether this item participates in the parent grid's own
   * `isMirrored` (RTL) setting. Default `true` (participate) — set to
   * `false` to keep just this one item rendering left-to-right while
   * the rest of the grid mirrors. Has no effect at all when the grid's
   * own `isMirrored` is off, since there's nothing to opt out of. Same
   * "Vue has an equivalent prop, not a layout-item field" note as
   * `zIndex` above applies here too.
   */
  isMirrored?: boolean;
  /**
   * Per-item override for the master interactivity switch —
   * `undefined` defers to the grid-wide `enableEditMode` default
   * (itself defaulting to `true`). `false` disables dragging,
   * resizing, and the close button for just this item, regardless of
   * its own `isDraggable`/`isResizable`/`showCloseButton` values — the
   * same "view mode" toggle `GridLayout`'s own `enableEditMode` applies
   * grid-wide, scoped to one item. Same "Vue has an equivalent prop,
   * not a layout-item field" note as `zIndex` above applies here too.
   */
  enableEditMode?: boolean;
  /**
   * Per-item border radius, in pixels, applied only when
   * `useBorderRadius` is on — `undefined` defers to the grid-wide
   * `borderRadiusPx` default. Same "Vue has an equivalent prop, not a
   * layout-item field" note as `zIndex` above applies here too.
   */
  borderRadiusPx?: number;
  /**
   * Per-item override for whether `borderRadiusPx` is actually applied
   * as a real border radius — `undefined` defers to the grid-wide
   * `useBorderRadius` default. Same "Vue has an equivalent prop, not a
   * layout-item field" note as `zIndex` above applies here too.
   */
  useBorderRadius?: boolean;
  /**
   * Per-item override for whether a *visible* resize-handle affordance
   * (a small triangle/bar per edge/corner) renders, instead of the
   * default invisible hit-zone-only styling (a cursor change on hover
   * is the only feedback otherwise) — `undefined` defers to the
   * grid-wide `showResizeHandles` default. Same "Vue has an equivalent
   * prop, not a layout-item field" note as `zIndex` above applies here
   * too.
   */
  showResizeHandles?: boolean;
  /**
   * Per-item CSS color for the visible resize-handle affordance, when
   * the resolved `showResizeHandles` is on — `undefined` defers to the
   * grid-wide `resizeHandleColor` default. Has no effect at all when
   * `showResizeHandles` resolves to `false`, since there's nothing
   * visible to color. Same "Vue has an equivalent prop, not a
   * layout-item field" note as `zIndex` above applies here too.
   */
  resizeHandleColor?: string;
  /**
   * Automatically re-runs this item's own height/width measurement
   * whenever its own rendered content changes size (a chart rendering
   * taller with more data points, for instance) — independent of the
   * whole grid being `autoSize`d/`heightMode`'d. Backed by a
   * `ResizeObserver` on a dedicated wrapper `GridItem.tsx` renders
   * around its own `children` only when this is `true` (`height: auto`
   * so it can actually grow past the item's own current fixed height,
   * unlike the item's own root element). No grid-wide default — Vue's
   * own version has none either, only a per-item `GridItem` prop.
   * Default `false`.
   */
  autoHeight?: boolean;
  /**
   * Set internally by the compaction/collision helpers (`utils.ts`,
   * `move-helper.ts`) to short-circuit infinite loops when cascading moves
   * — not meant to be set by consumers.
   */
  moved?: boolean;
  /**
   * Optional, consumer-defined payload — never read or written by the
   * library itself (confirmed: no internal code references `.data` on a
   * layout item), so its presence is purely additive and doesn't change
   * any existing behavior. Round-trips through `serializeLayout`/
   * `deserializeLayout` like any other field, as long as it's
   * JSON-serializable.
   */
  data?: TMeta;
}

/**
 * Structurally identical to `ILayoutItem`. Both exist in the codebase;
 * prefer `ILayoutItem` for new code — `TLayoutItem` is kept for backwards
 * compatibility with existing consumer type annotations.
 */
export type TLayoutItem<TMeta = unknown> = ILayoutItemRequired & {
  isDraggable?: boolean;
  isResizable?: boolean;
  isStatic?: boolean;
  maxH?: number;
  maxW?: number;
  minH?: number;
  minW?: number;
  zIndex?: number | null;
  showCloseButton?: boolean;
  autoScroll?: boolean;
  preserveAspectRatio?: boolean;
  ariaLabels?: IGridAriaLabels;
  dragAllowFrom?: string | null;
  dragIgnoreFrom?: string;
  resizeIgnoreFrom?: string | null;
  dragActivationDistance?: TDragActivationDistance | null;
  isBounded?: boolean | null;
  resizeHandles?: TResizeHandle[] | null;
  isMirrored?: boolean;
  enableEditMode?: boolean;
  borderRadiusPx?: number;
  useBorderRadius?: boolean;
  showResizeHandles?: boolean;
  resizeHandleColor?: string;
  autoHeight?: boolean;
  moved?: boolean;
  data?: TMeta;
};

/** The full layout for a `GridLayout` — one `ILayoutItem` per rendered `GridItem`. See `ILayoutItem`'s own doc comment for what `TMeta` is for; the default keeps every existing non-generic usage of `TLayout` working unchanged. */
export type TLayout<TMeta = unknown> = ILayoutItem<TMeta>[];

/**
 * Pre-defined layouts keyed by breakpoint name, for the `GridLayout`
 * `responsiveLayouts` prop. Every key is optional — breakpoints without an
 * explicit entry get an auto-generated layout the first time they're
 * entered (see `findOrGenerateResponsiveLayout` in
 * `core/gridlayout/helpers/responsive-helper.ts`).
 *
 * The 7 standard keys are kept as named, autocomplete-friendly
 * properties, but the type also accepts any other string key — matching
 * the Vue package's own `responsiveLayouts?: { [key: string]: TLayout }`
 * typing (a Phase 20 parity-gap fix, see `docs/PARITY_GAP_IMPLEMENTATION_PLAN.md`).
 * Purely additive: a `TResponsiveLayout` built from only the 7 standard
 * keys keeps compiling exactly as before. Worth knowing before reaching
 * for a custom key, though: `getBreakpointFromWidth` (this package's own
 * breakpoint-resolution function, shared with `GridLayout`'s own
 * `breakpoints`/`cols` props — themselves fixed to the same 7 names,
 * confirmed by reading `IBreakpoints`/`IColumns` directly) can only ever
 * resolve to one of those 7 standard names. A `responsiveLayouts` entry
 * under any other key type-checks, but is never actually looked up by
 * the normal breakpoint-resolution path on either the Vue or React side
 * — it's accepted for type-level parity with Vue's own declared shape,
 * not because there's a working runtime path that reaches it.
 */
export type TResponsiveLayout = {
  xxl?: TLayout;
  xl?: TLayout;
  lg?: TLayout;
  md?: TLayout;
  sm?: TLayout;
  xs?: TLayout;
  xxs?: TLayout;
  [key: string]: TLayout | undefined;
};

/** A breakpoint name, e.g. `'lg'`, `'md'`, `'xs'`. Not restricted to the built-in set, since `breakpoints`/`cols` can define custom names. */
export type TBreakpoint = string;

/**
 * Container-width thresholds per breakpoint name. Structurally identical
 * to `IBreakpoints` (`grid-layout-props.interface.ts`); both exist in the
 * codebase and are used in different places — prefer `IBreakpoints` for
 * new code involving `GridLayout` props specifically.
 */
export type TBreakpoints = {
  xxl?: number;
  xl?: number;
  lg?: number;
  md?: number;
  sm?: number;
  xs?: number;
  xxs?: number;
};
