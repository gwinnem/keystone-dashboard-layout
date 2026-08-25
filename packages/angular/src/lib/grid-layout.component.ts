import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  calcColWidth,
  cloneLayout,
  computeAlignAdjustments,
  computeDistributeAdjustments,
  computeRangeSelection,
  ECompactType,
  exportLayoutAsSvg as coreExportLayoutAsSvg,
  findAlignmentGuides,
  findOrGenerateResponsiveLayout,
  findSnapAdjustment,
  findSpacingIndicators,
  getAllCollisions,
  getBottomYCoordinate,
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  getCompactor,
  getLayoutItem,
  moveElement,
} from '@keystone-dashboard-layout/core';
import type {
  IAlignmentGuide,
  IBreakpoints,
  ICompactor,
  IColumns,
  IExportLayoutAsSvgOptions,
  IGridAriaLabels,
  ILayoutItem,
  ISpacingIndicator,
  TAlignEdge,
  TBreakpoint,
  TDistributeAxis,
  TLayout,
} from '@keystone-dashboard-layout/core';
import { findCrossGridZoneAt, registerCrossGridZone } from '@keystone-dashboard-layout/core/gridlayout/helpers/cross-grid-registry';
import type { ICrossGridDropRejected, ICrossGridItemDropped, ICrossGridZone } from '@keystone-dashboard-layout/core/gridlayout/interfaces/cross-grid.interfaces';
import { GridEventBusService, IGridDefaults, IItemClickedEvent, IItemDragEvent, IItemResizeEvent } from './grid-event-bus.service';

let layoutIdCounter = 0;
/** Module-level counter, matching Vue's own `generateLayoutId` — every `GridLayoutComponent` that doesn't set its own `layoutId` still gets a distinct one, needed for cross-grid drag/drop to tell grids apart in emitted event payloads even when nobody bothered to name them. */
function generateLayoutId(): string {
  layoutIdCounter += 1;
  return `grid-layout-${layoutIdCounter}`;
}

/** The grid-unit position/size of a live outside-drop or cross-grid-drag-in-progress target, for rendering a placeholder box — the Angular equivalent of Vue's own `placeholder` ref. */
interface IPlaceholder {
  h: number;
  w: number;
  x: number;
  y: number;
}

/** `heightMode`'s own four explicit values (Phase 17) — see that `@Input()`'s own doc comment for what each one does. */
type THeightMode = `auto` | `fixed` | `scroll` | `fit`;

const DEFAULT_BREAKPOINTS: IBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 };
const DEFAULT_COLS: IColumns = { lg: 12, md: 10, sm: 6, xs: 4, xxl: 12, xl: 12, xxs: 2 };

/** A single alignment-guide line, in pixels — the template-ready form of `core`'s own grid-unit `IAlignmentGuide`. */
interface IAlignmentGuideStyle {
  height: string;
  left: string;
  top: string;
  width: string;
}

/** A single spacing-indicator label, in pixels — the template-ready form of `core`'s own grid-unit `ISpacingIndicator`. */
interface ISpacingIndicatorStyle {
  label: string;
  left: string;
  top: string;
}

/**
 * Phase 1–8 of the Angular port (see `docs/IMPLEMENTATION_PLAN.md`'s own
 * scope notes for each) — a grid container supporting dragging,
 * resizing, `preventCollision`, `compactType`, a custom `compactor`,
 * `isBounded`, alignment guides/spacing indicators/`snapToGrid`,
 * `multiSelect`, `enableUndoRedo`, `responsive`/`breakpoints`/`cols`,
 * `transformScale`/`transitionDurationMs`/`transitionTimingFunction`/
 * `showResizeHandles`/`resizeHandleColor` (cascaded to every descendant
 * `GridItemComponent`), and (Phase 8, this round) `allowCrossGridDrag`
 * and `allowOutsideDrop`.
 *
 * `allowCrossGridDrag` registers this grid into `core`'s own shared,
 * module-level cross-grid registry (`registerCrossGridZone`/
 * `findCrossGridZoneAt`, reached via the same dedicated subpath export
 * React's own `useCrossGridDrag.ts` already uses — confirmed by reading
 * that file directly rather than re-deriving the mechanism, since it's
 * already a clean, framework-agnostic reference) — a plain `Set`, not
 * Angular state, since grids dragging items between each other are
 * frequently not in any component-tree relationship at all. At
 * `dragend`, before committing a normal in-grid move, this checks
 * whether the drop point (`clientX`/`clientY`, already threaded through
 * `IItemDragEvent`) lands inside another registered zone; if accepted,
 * the item is removed from *this* grid's own layout instead (the target
 * zone's own `acceptDrop` callback adds it to the target's layout
 * separately).
 *
 * `allowOutsideDrop` wires the four native HTML5 drag-and-drop events
 * (`dragenter`/`dragover`/`dragleave`/`drop`) directly onto the
 * container element, ported from Vue's own `useOutsideDrop.ts` (React
 * has no equivalent to port from) — for dragging in an element that
 * isn't a `GridItemComponent` at all (e.g. a palette/sidebar entry).
 *
 *
 * **Phase 9 (this round)**: the imperative API — `compactNow`/
 * `rearrange`, `duplicateItem`, `alignSelected`/`distributeSelected`
 * (`core`'s own `computeAlignAdjustments`/`computeDistributeAdjustments`,
 * wired in directly — pure functions, no translation needed),
 * `exportLayoutAsSvg` (same, `core`'s own `exportLayoutAsSvg`), and
 * `scrollToItem`/`focusItem` (a `data-grid-item-id` DOM lookup scoped to
 * this grid's own container).
 *
 * **Phase 12 (this round)**: `horizontalShift` (a pure pass-through to
 * `core`'s own `moveElement`, which already accepts it — no new logic
 * on this component's own side) and `restoreOnDrag` (captures every
 * item's own pre-drag x/y at `dragstart`, supplied as `context.
 * minPositions` to the compactor that runs at `dragend` — `core`'s own
 * built-in compactors already fully understand this field, see
 * `ICompactorContext.minPositions`'s own doc comment; this is purely
 * the capture/threading side).
 *
 * **Architecture note, corrected from an earlier draft of this file**:
 * this component does *not* own a `@for` loop rendering
 * `GridItemComponent` internally — the *consumer* renders each
 * `GridItemComponent` themselves (see the original Phase 1 note on
 * this, unchanged).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'handleBackgroundClick($event)',
    class: `kdl-grid-layout`,
  },
  imports: [NgStyle],
  providers: [GridEventBusService],
  selector: `kdl-grid-layout`,
  standalone: true,
  template: `
    <div #container [class.kdl-grid-lines]="showGridLines" [ngStyle]="containerStyle">
      <ng-content></ng-content>
      @if (showAlignmentGuides) {
        @for (guide of alignmentGuideStyles; track $index) {
          <div class="kdl-grid-alignment-guide" [ngStyle]="guide"></div>
        }
      }
      @if (showSpacingGuides) {
        @for (indicator of spacingIndicatorStyles; track $index) {
          <div class="kdl-grid-spacing-indicator" [ngStyle]="{ left: indicator.left, top: indicator.top }">{{ indicator.label }}</div>
        }
      }
      @if (isDragging && placeholderStyle) {
        <div class="kdl-grid-placeholder" [ngStyle]="placeholderStyle"></div>
      }
    </div>
  `,
})
export class GridLayoutComponent implements AfterViewInit, OnChanges, OnDestroy, OnInit {
  /** The layout array — used here only for `autoSize`'s own container-height calculation and as the basis for collision resolution during a drag/resize; rendering each item is the consumer's own responsibility (see this class's own doc comment). Required. */
  @Input({ required: true }) layout!: TLayout;
  /** Maximum number of columns. Ignored while `responsive` (below) is on, in favor of the resolved breakpoint's own column count. Default `12`, matching Vue/React's own default. */
  @Input() colNum = 12;
  /** Height of one grid row, in pixels. Default `150`, matching Vue/React's own default. */
  @Input() rowHeight = 150;
  /** `[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`, matching Vue/React's own default. */
  @Input() margin: [number, number] = [10, 10];
  /** Positions via CSS `transform: translate3d(...)` instead of `top`/`left`. Default `true`, matching Vue/React's own default. */
  @Input() useCssTransforms = true;
  /** Grows/shrinks the container to fit the layout's content. Default `true`, matching `autoSize`'s own default. */
  @Input() autoSize = true;
  /**
   * Overrides `autoSize`'s own binary auto/fixed choice with one of
   * four explicit modes — `'auto'` (matches `autoSize: true`),
   * `'fixed'` (matches `autoSize: false`), `'scroll'` (no explicit
   * height, but `overflow-y: auto` — for a container the *consumer*
   * gives an explicit height/max-height to via their own CSS, with
   * overflow content scrolling inside it), or `'fit'` (`height: 100%`,
   * `overflow-y: auto` — fills a parent that already constrains its own
   * height, rather than sizing to content the way `'auto'` does).
   * `null` (the default) defers entirely to `autoSize` instead —
   * `resolvedHeightMode()` below is where this precedence is actually
   * resolved, matching Vue's own identical `resolvedHeightMode`
   * computed exactly (confirmed via a direct source read, not
   * reconstructed from this comment's own description of intent).
   */
  @Input() heightMode: THeightMode | null = null;
  /** Whether a drag/resize that would collide with another item is blocked entirely rather than pushing the colliding item out of the way. Default `false`, matching Vue/React's own default. */
  @Input() preventCollision = false;
  /** Grid-wide default `isDraggable` for items that don't set their own (`null`) — Phase 14, cascaded to every descendant `GridItemComponent` via `GridEventBusService.gridDefaults$`, matching Vue's own `GridLayout`-level `isDraggable` prop (`GridItem.vue`'s own `thisLayout?.isDraggable` read). Default `true`, matching Vue/React's own default. */
  @Input() isDraggable = true;
  /** Grid-wide default `isResizable` for items that don't set their own (`null`) — same cascade as `isDraggable` above. Default `true`, matching Vue/React's own default. */
  @Input() isResizable = true;
  /** Grid-wide default `isBounded` for items that don't set their own (`null`) — same cascade as `isDraggable` above. Default `false`, matching Vue/React's own default. */
  @Input() isBounded = false;
  /** Grid-wide default `isMirrored` (RTL) for items that don't set their own (`null`) — same cascade as `isDraggable` above. Default `false`, matching Vue/React's own default. */
  @Input() isMirrored = false;
  /**
   * Maximum number of rows the layout may grow to — cascaded to every
   * descendant `GridItemComponent` via `GridEventBusService.gridDefaults$`,
   * unconditionally overriding that item's own `maxRows` `@Input()`
   * (used only when a `GridItemComponent` has no real eventBus at all,
   * e.g. constructed standalone). Confirmed via a direct read of Vue's
   * own `GridItem.vue` that this is grid-only — unlike `isDraggable`/
   * `isResizable`/`isBounded`/`isMirrored` above, Vue's own `GridItem`
   * has no per-item `maxRows` prop of its own to override this with at
   * all. Default `Infinity`, matching Vue/React's own default.
   */
  @Input() maxRows = Infinity;
  /** Grid-wide default `useBorderRadius` for items that don't set their own (`null`) — same cascade as `isDraggable` above. Default `false`, matching Vue/React's own default. */
  @Input() useBorderRadius = false;
  /** Grid-wide default `borderRadiusPx` for items that don't set their own (`null`) — same cascade as `isDraggable` above, applied only when `useBorderRadius` (above) resolves `true`. Default `10`, matching Vue/React's own default. */
  @Input() borderRadiusPx = 10;
  /** Grid-wide default `showCloseButton` for items that don't set their own (`null`) — same cascade as `isDraggable` above. Default `false`, matching Vue/React's own default. */
  @Input() showCloseButton = false;
  /**
   * Grid-wide default master interactivity switch for items that don't
   * set their own (`null`) — same cascade as `isDraggable` above.
   * Closes the TODOs left on `GridItemComponent`'s own `tabindexValue`/
   * `showCloseButton` doc comments (Phases 15/16/22): see
   * `IGridDefaults`'s own doc comment for exactly what this gates (and,
   * just as importantly, what it deliberately doesn't — the native
   * drag/resize engine itself, and `handleKeydown`'s own guard, both
   * confirmed via a direct source read to use the raw, un-gated
   * `resolvedIsDraggable`/`resolvedIsResizable` in Vue too). Default
   * `true`, matching Vue/React's own default.
   */
  @Input() enableEditMode = true;
  /** Grid-wide `ariaLabels` override (Phase 18) — merged with the built-in English defaults and any per-item override via `core`'s own `resolveAriaLabels`, read by each descendant `GridItemComponent`'s own `resolvedAriaLabels` getter. `{}` (the default) applies no grid-wide override at all, deferring entirely to the built-in defaults unless a specific item overrides a key itself. */
  @Input() ariaLabels: IGridAriaLabels = {};
  /** Whether a dragged item pushes a colliding item *sideways* (left/right, matching whichever direction the drag itself is heading) rather than only ever downward — threaded straight through to `core`'s own `moveElement` (already accepts this as its own parameter; this `@Input()` is purely a pass-through, no new logic on this component's own side). Default `false`, matching Vue/React's own default. */
  @Input() horizontalShift = false;
  /** Prevents a drag from compacting the layout any *tighter* than it already was before that drag started — every other item keeps at least its own pre-drag position as a floor during the post-drag compaction pass (via `core`'s own `ICompactorContext.minPositions`, which the built-in compactors already fully support; this `@Input()` is what actually captures and supplies that snapshot). Default `false`, matching Vue/React's own default. */
  @Input() restoreOnDrag = false;
  /** Which built-in compaction strategy `getCompactor` resolves to when `compactor` (below) is `null`. Default `ECompactType.VERTICAL`, matching Vue/React's own default. */
  @Input() compactType: ECompactType = ECompactType.VERTICAL;
  /** Replaces the built-in compaction algorithm entirely when set. `null` (the default) means "use `getCompactor(compactType)`" — purely additive. */
  @Input() compactor: ICompactor | null = null;

  /** Shows edge-alignment guide lines while dragging/resizing (Phase 7) — a no-op when off, matching Vue's own zero-cost-when-disabled behavior. Default `false`. */
  @Input() showAlignmentGuides = false;
  /** Shows nearest-neighbor gap distance labels while dragging/resizing (Phase 7) — an independently-toggleable sibling to `showAlignmentGuides`. Default `false`. */
  @Input() showSpacingGuides = false;
  /** Toggles a `kdl-grid-lines` class on the container element, for a consumer's own stylesheet to render visible grid-line guides behind every item — matching Vue's own `showGridLines` (a bare `grid` class there; renamed here to `kdl-grid-lines` for consistency with every other class this port already applies, not copied verbatim). Default `false`, matching Vue/React's own default. */
  @Input() showGridLines = false;
  /** Magnetically snaps a dragged item's edge to another item's edge, within `snapThreshold` grid units — changes where the item actually lands, unlike `showAlignmentGuides` (visual only). Default `false`. */
  @Input() snapToGrid = false;
  /** How close (in grid units) an edge needs to be to another item's edge to snap to it. Default `1`, matching Vue/React's own default. */
  @Input() snapThreshold = 1;

  /** Enables click-to-select/Shift-click-to-extend multi-selection (Phase 7) — selected item ids are exposed via `selectedItemIds` and cascaded to every descendant `GridItemComponent` (a `kdl-grid-item--selected` host class) via the eventBus. Default `false`, matching Vue/React's own default. */
  @Input() multiSelect = false;

  /** Enables `undo()`/`redo()`, tracking a snapshot of the layout before each completed drag/resize (Phase 7). Default `false`, matching Vue/React's own default. */
  @Input() enableUndoRedo = false;
  /** Maximum number of undo snapshots retained — oldest entries are discarded once exceeded. Default `50`, matching Vue/React's own default. */
  @Input() undoHistoryLimit = 50;

  /** Resolves `colNum` from the current container width against `breakpoints`/`cols` instead of the fixed `colNum` input (Phase 7). Default `false`, matching Vue/React's own default. */
  @Input() responsive = false;
  /** Container-width thresholds per breakpoint name, used when `responsive` is on. Defaults match Vue/React's own standard 7-breakpoint set. */
  @Input() breakpoints: IBreakpoints = DEFAULT_BREAKPOINTS;
  /** Column count per breakpoint name, used when `responsive` is on. Defaults match Vue/React's own standard 7-breakpoint set. */
  @Input() cols: IColumns = DEFAULT_COLS;
  /** Enforces that an item is moved all the way to the left/right edge when there's available space for it, during `responsive`'s own bounds-correction pass (`core`'s own `correctBounds`) — rather than only correcting an item that's actually overflowing the new column count. Default `false`, matching Vue/React's own default. */
  @Input() distributeEvenly = false;
  /** Seeds the per-breakpoint layout cache (exposed publicly as `layouts`) with layouts a consumer already has — e.g. persisted from a previous session. `{}` (the default) starts with an empty cache; every breakpoint not present here is generated on first visit instead (`core`'s own `findOrGenerateResponsiveLayout`, bounds-corrected and compacted from whatever layout was active just before entering it). Only read once, at `ngOnInit` — changing this `@Input()` later has no effect on the already-running cache. */
  @Input() responsiveLayouts: Record<string, TLayout> = {};

  /** CSS transform scale factor to compensate for in every descendant `GridItemComponent`'s own drag-delta math — cascaded via the eventBus (Phase 7). Default `1`, matching Vue/React's own default. */
  @Input() transformScale = 1;
  /** `--grid-transition-duration` CSS custom property, inherited naturally by every descendant item (Phase 7) — not an eventBus cascade, since CSS custom properties already inherit through the DOM. Default `200`, matching Vue/React's own default. */
  @Input() transitionDurationMs = 200;
  /** `--grid-transition-timing` CSS custom property, same inheritance note as `transitionDurationMs` above. Default `'ease'`, matching Vue/React's own default. */
  @Input() transitionTimingFunction = `ease`;
  /** Grid-wide default for whether the 8 resize-hint spans are visibly styled — applied as `--kdl-resize-handle-color`, inherited naturally; a `GridItemComponent`'s own `showResizeHandles`/`resizeHandleColor` override this locally via the same mechanism. Default `false`, matching Vue/React's own default. */
  @Input() showResizeHandles = false;
  /** Grid-wide resize-handle color, applied when `showResizeHandles` (above) is on. Default matches Vue/React's own default. */
  @Input() resizeHandleColor = `rgb(94 94 94 / 45%)`;

  /** Enables dragging an existing item out of this grid and into another `GridLayoutComponent` with `allowCrossGridDrag` also on (Phase 8). Default `false`, matching Vue/React's own default. */
  @Input() allowCrossGridDrag = false;
  /** Identifies this grid in cross-grid event payloads (`crossGridItemDropped`/`crossGridDropRejected`). `null` (the default) auto-generates one (`grid-layout-N`), matching Vue's own `generateLayoutId`. */
  @Input() layoutId: string | null = null;
  /** When `true`, this grid rejects an incoming cross-grid drop from another grid entirely (`crossGridDropRejected` fires on this grid, nothing is added). Default `false`, matching Vue/React's own default. */
  @Input() disableExternalDrop = false;
  /** Enables native HTML5 drag-and-drop from an element that isn't a `GridItemComponent` at all — e.g. a palette/sidebar entry (Phase 8). Default `false`, matching Vue/React's own default. */
  @Input() allowOutsideDrop = false;
  /** Width (in grid columns) reserved for an incoming outside-drop's own placeholder/committed item. Default `2`, matching Vue/React's own default. */
  @Input() outsideDropWidth = 2;
  /** Height (in grid rows) reserved for an incoming outside-drop's own placeholder/committed item. Default `2`, matching Vue/React's own default. */
  @Input() outsideDropHeight = 2;
  /** Called on every `dragenter`/`dragover`/`drop` to decide whether the current drag is a valid outside-drop for this grid at all — `null` (the default) accepts every drag. Return `false` to leave the browser's own "not allowed" cursor in place instead of showing this grid's own placeholder. */
  @Input() outsideDropAccept: ((dataTransfer: DataTransfer | null) => boolean) | null = null;

  /** Emits the updated layout after a drag/resize commits, or after `undo()`/`redo()` — the consumer is expected to apply this back to their own `layout` binding. */
  @Output() layoutChange = new EventEmitter<TLayout>();
  /** Emits the currently-selected item ids whenever the `multiSelect` selection changes. */
  @Output() selectionChanged = new EventEmitter<(string | number)[]>();
  /** Emits the newly-resolved breakpoint name whenever `responsive` mode resolves a different one than before. */
  @Output() breakpointChanged = new EventEmitter<TBreakpoint>();
  /** Emits this item's own id whenever `preventCollision` actually constrains a drag (blocked entirely, staying at its pre-move position) or a resize (clamped to the maximum available space against a colliding neighbor) — a direct port of Vue's own `MOVE_BLOCKED_BY_COLLISION`, including its own asymmetry between the two gestures (confirmed via a direct source read, not assumed symmetric): a blocked *drag* means "stayed exactly where it was," while a blocked *resize* can still partially grow, so this fires whenever `preventCollision` constrained the requested size at all, not only when fully rejected. */
  @Output() moveBlockedByCollision = new EventEmitter<string | number>();
  /** Emits the new `colNum` whenever that `@Input()` itself changes — a direct port of Vue's own `COLUMNS_CHANGED`, confirmed via a direct source read to watch only the raw `colNum` prop, not the responsive-resolved `effectiveColNum` (a breakpoint-driven column change is already covered separately by `breakpointChanged`). */
  @Output() columnsChanged = new EventEmitter<number>();
  /**
   * Emits once, the first time the container's own width is measured
   * (i.e. mount has settled and every descendant `GridItemComponent`
   * has had a chance to apply that width and stabilize its own size)
   * — a direct port of Vue's own `LAYOUT_READY`, including its own
   * doubly-deferred timing (`nextTick` twice: once to let the
   * `containerWidth$` eventBus update reach children, a second to let
   * their own resulting size changes settle) so a consumer's own
   * handler can reliably inspect stable item sizes, not ones still
   * mid-transition. Angular's own equivalent of Vue's `nextTick` here
   * is a plain microtask (`Promise.resolve().then(...)`, matching this
   * class's own `autoHeight`-toggle precedent elsewhere), doubled the
   * same way.
   */
  @Output() layoutReady = new EventEmitter<TLayout>();
  /** Emits this item's own id on every `dragstart` — the Angular equivalent of Vue's own granular `DRAG_START` (this class's own `layoutChange` already covers "the layout was committed"; these three re-expose the already-internal `itemDrag$` eventBus phases directly for a consumer that wants to hook into gesture *lifecycle*, not just the eventual result). */
  @Output() dragStart = new EventEmitter<string | number>();
  /** Emits this item's own id on every `dragmove` tick — see `dragStart`'s own doc comment. */
  @Output() dragMove = new EventEmitter<string | number>();
  /** Emits this item's own id on every `dragend` — see `dragStart`'s own doc comment. */
  @Output() dragEnd = new EventEmitter<string | number>();
  /** Emits on the *target* grid when it accepts an item dragged in from another `GridLayoutComponent` (`allowCrossGridDrag`). */
  @Output() crossGridItemDropped = new EventEmitter<ICrossGridItemDropped>();
  /** Emits on the *target* grid when it rejects an incoming cross-grid drop (its own `disableExternalDrop` was on). */
  @Output() crossGridDropRejected = new EventEmitter<ICrossGridDropRejected>();
  /** Emits when a native HTML5 drag-and-drop from outside this grid entirely is dropped onto it (`allowOutsideDrop`) — the consumer reads `dataTransfer` themselves (`core`'s own `readOutsideDropPayload` helper is built for exactly this) and is responsible for adding the resulting item to their own `layout`. */
  @Output() itemDroppedFromOutside = new EventEmitter<{ dataTransfer: DataTransfer | null; h: number; w: number; x: number; y: number }>();

  @ViewChild(`container`, { static: true }) private readonly containerRef!: ElementRef<HTMLDivElement>;

  /** The measured container pixel width. Public for a consumer who wants to read it directly. */
  containerWidth = 0;
  containerStyle: Record<string, string | number> = { position: `relative` };
  /** Currently-selected item ids (`multiSelect`) — a `Set` for O(1) `.has()` lookups, matching Vue's own `selectedItemIds`. Empty whenever `multiSelect` is off. */
  selectedItemIds = new Set<string | number>();
  /** Pixel-ready alignment-guide lines for the template — empty whenever `showAlignmentGuides` is off or nothing currently aligns. */
  alignmentGuideStyles: IAlignmentGuideStyle[] = [];
  /** Pixel-ready spacing-indicator labels for the template — empty whenever `showSpacingGuides` is off or nothing currently qualifies. */
  spacingIndicatorStyles: ISpacingIndicatorStyle[] = [];
  /** The breakpoint `responsive` mode most recently resolved to — `null` until the first real measurement, or whenever `responsive` is off. */
  lastBreakpoint: TBreakpoint | null = null;
  /** The per-breakpoint layout cache (`responsiveLayouts`) — exposed publicly for external inspection/persistence, matching Vue's own `defineExpose`'d `layouts`. Seeded from `responsiveLayouts` at `ngOnInit`, then kept current by `resolveResponsiveColNum` on every breakpoint entered. */
  layouts: Record<string, TLayout> = {};
  /** Whether `undo()` currently has a snapshot to revert to. */
  canUndo = false;
  /** Whether `redo()` currently has a snapshot to reapply. */
  canRedo = false;
  /** Whether a cross-grid-drag-in-progress or outside-drop-in-progress placeholder should currently render — the Angular equivalent of Vue's own `isDragging` ref (this component's *own* item drags don't use this at all; `GridItemComponent`'s own `isDragging` covers that). */
  isDragging = false;
  /** Grid-unit position/size for the placeholder box rendered while `isDragging` is true (outside-drop only, currently — see `handleOutsideDragOver`). `null` before any outside-drop has ever entered this grid. */
  placeholder: IPlaceholder | null = null;
  /** Pixel-ready placeholder style for the template, derived from `placeholder` — `null` whenever `placeholder` itself is, or before the container has been measured. */
  placeholderStyle: Record<string, string> | null = null;
  /** This grid's own resolved `layoutId` — either the `@Input()` value, or an auto-generated one (`grid-layout-N`) resolved once at `ngOnInit`. */
  resolvedLayoutId = ``;

  private resizeObserver: ResizeObserver | undefined;
  /** The internal, mutable working copy `moveElement`/the compactor actually operate on — cloned from `layout` whenever that `@Input()` reference changes. */
  private workingLayout: TLayout = [];
  /** Resolved, effective column count — `colNum` normally, or the `responsive`-resolved value once a real measurement has landed. */
  private effectiveColNum = 12;
  private undoStack: TLayout[] = [];
  private redoStack: TLayout[] = [];
  /** Captured at drag/resizestart, pushed to `undoStack` on a genuinely-completed drag/resizeend — `null` whenever no gesture is in progress or `enableUndoRedo` is off. */
  private preGestureSnapshot: TLayout | null = null;
  /**
   * `restoreOnDrag`: a snapshot of every item's own x/y taken at
   * `dragstart`, passed through as `context.minPositions` to the
   * compactor that runs once the drag ends — the built-in compactors
   * already fully understand this field (see `core`'s own
   * `ICompactorContext.minPositions` doc comment), this is purely the
   * capture/threading side. `undefined` whenever no drag is in
   * progress or `restoreOnDrag` is off.
   */
  private positionsBeforeDrag: Record<string | number, { x: number; y: number }> | undefined;
  /** `multiSelect` group-move: snapshot of every other selected item's own x/y, taken at dragstart. */
  private groupMoveStartPositions = new Map<string | number, { x: number; y: number }>();
  /** `multiSelect` group-resize: snapshot of every other selected item's own w/h, taken at resizestart. */
  private groupResizeStartSizes = new Map<string | number, { h: number; w: number }>();
  /**
   * The anchor for a future Shift-click range — the last item selected
   * without Shift (a plain click, or a Ctrl/Cmd toggle), matching the
   * standard file-explorer/spreadsheet convention (ported directly
   * from Vue's own `useMultiSelect.ts` `lastAnchorId` — see that file's
   * own doc comment for the fuller rationale, including why the anchor
   * stays fixed across repeated Shift-clicks rather than moving to the
   * previous Shift-click target). `null` until the first click of any
   * kind, reset by `clearSelection()`/`pruneSelection()` whenever the
   * anchor's own item stops existing.
   */
  private lastAnchorId: string | number | null = null;
  /** Set while `allowCrossGridDrag` is on and a drag is genuinely in progress (from `dragstart` to `dragend`) — `null` otherwise. Mirrors React's own `draggedIdRef`. */
  private draggedCrossGridId: string | number | null = null;
  /** Deregisters this grid's own cross-grid zone — called from `ngOnDestroy`/whenever `allowCrossGridDrag` toggles off. `null` whenever no zone is currently registered. */
  private deregisterCrossGridZone: (() => void) | null = null;
  /** `dragenter`/`dragleave` bubble from every descendant, firing far more often than "entered/left the grid as a whole" — a net-entry count (Vue's own approach, ported directly) avoids flickering the placeholder on/off as the pointer moves around inside the grid at any depth. */
  private dragEnterCount = 0;
  private outsideDropListenersAttached = false;
  private readonly onOutsideDragEnter = (event: DragEvent): void => this.handleOutsideDragEnter(event);
  private readonly onOutsideDragOver = (event: DragEvent): void => this.handleOutsideDragOver(event);
  private readonly onOutsideDragLeave = (event: DragEvent): void => this.handleOutsideDragLeave(event);
  private readonly onOutsideDrop = (event: DragEvent): void => this.handleOutsideDrop(event);

  constructor(
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly eventBus: GridEventBusService,
    private readonly destroyRef: DestroyRef,
  ) {}

  ngOnInit(): void {
    this.workingLayout = cloneLayout(this.layout);
    this.effectiveColNum = this.colNum;
    this.resolvedLayoutId = this.layoutId ?? generateLayoutId();
    this.layouts = Object.fromEntries(Object.entries(this.responsiveLayouts).map(([breakpoint, breakpointLayout]) => [breakpoint, cloneLayout(breakpointLayout)]));
    this.eventBus.itemDrag$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => this.handleItemDrag(event));
    this.eventBus.itemResize$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => this.handleItemResize(event));
    this.eventBus.itemClicked$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => this.handleItemClicked(event));
  }

  ngAfterViewInit(): void {
    const el = this.containerRef.nativeElement;
    const measure = (): void => {
      if(el.offsetWidth > 0 && el.offsetWidth !== this.containerWidth) {
        // Captured before the assignment below overwrites it — `0` is
        // this field's own "never measured yet" initial value (see its
        // own field declaration), the Angular equivalent of Vue's own
        // `width === null` check for the exact same "first real
        // measurement" moment.
        const isFirstMeasurement = this.containerWidth === 0;
        this.containerWidth = el.offsetWidth;
        this.eventBus.setContainerWidth(el.offsetWidth);
        this.resolveResponsiveColNum();
        this.updateContainerHeight();
        this.updatePlaceholderStyle();
        this.changeDetectorRef.markForCheck();
        if(isFirstMeasurement) {
          // Doubly-deferred, matching Vue's own nextTick-then-nextTick
          // exactly (see layoutReady's own doc comment for why): the
          // first microtask lets the containerWidth$ eventBus emission
          // just above actually reach every descendant
          // GridItemComponent; the second lets their own resulting
          // change-detection pass (and so their own final size) settle,
          // so a consumer's own handler can reliably inspect stable
          // sizes rather than ones still mid-update.
          Promise.resolve().then(() => {
            Promise.resolve().then(() => {
              this.layoutReady.emit(this.layout);
            });
          });
        }
      }
    };
    measure();
    this.resizeObserver = new ResizeObserver(measure);
    this.resizeObserver.observe(el);

    this.setCrossGridDragEnabled(this.allowCrossGridDrag);
    this.setOutsideDropEnabled(this.allowOutsideDrop);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes[`layout`] && !changes[`layout`].firstChange) {
      this.workingLayout = cloneLayout(this.layout);
      this.pruneSelection();
    }
    if(changes[`colNum`]) {
      this.effectiveColNum = this.colNum;
      this.eventBus.setColNum(this.effectiveColNum);
      // Only on a genuine, post-mount change — matching Vue's own
      // plain (non-immediate) watch(() => props.colNum, ...), which
      // likewise never fires for the prop's own initial value.
      if(!changes[`colNum`].firstChange) {
        this.columnsChanged.emit(this.colNum);
      }
    }
    if(changes[`rowHeight`]) {
      this.eventBus.setRowHeight(this.rowHeight);
    }
    if(changes[`margin`]) {
      this.eventBus.setMargin(this.margin);
    }
    if(changes[`useCssTransforms`]) {
      this.eventBus.setUseCssTransforms(this.useCssTransforms);
    }
    if(changes[`transformScale`]) {
      this.eventBus.setTransformScale(this.transformScale);
    }
    if(changes[`isDraggable`] || changes[`isResizable`] || changes[`isBounded`] || changes[`isMirrored`] || changes[`maxRows`] || changes[`useBorderRadius`] || changes[`borderRadiusPx`] || changes[`showCloseButton`] || changes[`ariaLabels`] || changes[`enableEditMode`]) {
      this.pushGridDefaults();
    }
    if((changes[`breakpoints`] || changes[`cols`] || changes[`responsive`]) && !changes[`responsive`]?.firstChange) {
      this.resolveResponsiveColNum();
    }
    if(changes[`allowCrossGridDrag`] && !changes[`allowCrossGridDrag`].firstChange) {
      this.setCrossGridDragEnabled(this.allowCrossGridDrag);
    }
    if(changes[`allowOutsideDrop`] && !changes[`allowOutsideDrop`].firstChange) {
      this.setOutsideDropEnabled(this.allowOutsideDrop);
    }
    if(changes[`layout`] || changes[`rowHeight`] || changes[`margin`] || changes[`autoSize`] || changes[`heightMode`]
      || changes[`transitionDurationMs`] || changes[`transitionTimingFunction`]
      || changes[`showResizeHandles`] || changes[`resizeHandleColor`]) {
      this.updateContainerHeight();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.deregisterCrossGridZone?.();
    this.setOutsideDropEnabled(false);
  }

  /** Pushes the current, resolved `IGridDefaults` snapshot (Phase 14) to every descendant `GridItemComponent` via `GridEventBusService.gridDefaults$` — called from `ngOnChanges` whenever any of the five contributing `@Input()`s change (including the very first, initial `ngOnChanges` call — matching the same no-`!firstChange`-guard pattern `colNum`/`rowHeight`/`margin`/etc. already use just above). */
  private pushGridDefaults(): void {
    const defaults: IGridDefaults = {
      ariaLabels: this.ariaLabels,
      borderRadiusPx: this.borderRadiusPx,
      enableEditMode: this.enableEditMode,
      isBounded: this.isBounded,
      isDraggable: this.isDraggable,
      isMirrored: this.isMirrored,
      isResizable: this.isResizable,
      maxRows: this.maxRows,
      showCloseButton: this.showCloseButton,
      useBorderRadius: this.useBorderRadius,
    };
    this.eventBus.setGridDefaults(defaults);
  }

  /** `multiSelect` — selects exactly this item, replacing any existing selection (a plain, non-modifier click). */
  selectItem(id: string | number): void {
    this.setSelection(new Set([id]));
  }

  /** `multiSelect` — removes this item from the current selection, if present. */
  deselectItem(id: string | number): void {
    if(!this.selectedItemIds.has(id)) {
      return;
    }
    const next = new Set(this.selectedItemIds);
    next.delete(id);
    this.setSelection(next);
  }

  /** `multiSelect` — adds this item to the selection if absent, removes it if present (a Ctrl/Meta-click). */
  toggleItemSelection(id: string | number): void {
    const next = new Set(this.selectedItemIds);
    if(next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.setSelection(next);
  }

  /** `multiSelect` — clears the selection entirely (clicking empty grid background). Also clears `lastAnchorId`: a range anchor pointing at an item outside the (now-empty) selection would be a confusing starting point for whatever's Shift-clicked next. */
  clearSelection(): void {
    this.lastAnchorId = null;
    if(this.selectedItemIds.size === 0) {
      return;
    }
    this.setSelection(new Set());
  }

  /**
   * Removes any selected id no longer present in `this.layout` — a
   * real, confirmed gap this port was missing (found while correcting
   * an unrelated, wrong claim about Shift-click range-selection: a
   * fresh read of Vue's own `useMultiSelect.ts` surfaced its own
   * `pruneSelection`, which this had no equivalent of at all). Without
   * this, a selected item's id lingered in `selectedItemIds`
   * indefinitely after that item was removed from the layout (closed,
   * or removed by the consumer's own code) — a dangling reference to
   * something that no longer exists, the exact bug Vue's own doc
   * comment on `pruneSelection` describes finding and fixing. Called
   * from `ngOnChanges` whenever the `layout` `@Input()` itself changes
   * (matching Vue's own `props.layout.length` watcher — broadened here
   * to any layout change, not just a length change, since an id could
   * in principle disappear via a wholesale layout replacement that
   * happens to keep the same length too). Also resets `lastAnchorId`
   * specifically when *it* no longer matches a real item — a range
   * computed from a removed anchor would silently fall back to
   * `computeRangeSelection`'s own "anchor not found" case (just the
   * target alone), which is confusing rather than useful; resetting it
   * here means the next Shift-click with no valid anchor instead falls
   * through to a plain select, the same well-defined "no anchor yet"
   * behavior a fresh grid starts with.
   */
  private pruneSelection(): void {
    if(this.lastAnchorId !== null && !this.layout.some(item => item.i === this.lastAnchorId)) {
      this.lastAnchorId = null;
    }
    if(this.selectedItemIds.size === 0) {
      return;
    }
    const currentIds = new Set(this.layout.map(item => item.i));
    const next = new Set(Array.from(this.selectedItemIds).filter(id => currentIds.has(id)));
    if(next.size !== this.selectedItemIds.size) {
      this.setSelection(next);
    }
  }

  /** Reverts to the most recently captured pre-gesture snapshot, pushing the current state onto the redo stack. A no-op when `canUndo` is `false`. */
  undo(): void {
    const previous = this.undoStack.pop();
    if(!previous) {
      return;
    }
    this.redoStack.push(cloneLayout(this.workingLayout));
    this.workingLayout = cloneLayout(previous);
    this.canUndo = this.undoStack.length > 0;
    this.canRedo = true;
    this.layoutChange.emit(this.workingLayout);
    this.changeDetectorRef.markForCheck();
  }

  /** Reapplies the most recently undone state. A no-op when `canRedo` is `false`. */
  redo(): void {
    const next = this.redoStack.pop();
    if(!next) {
      return;
    }
    this.undoStack.push(cloneLayout(this.workingLayout));
    this.workingLayout = cloneLayout(next);
    this.canUndo = true;
    this.canRedo = this.redoStack.length > 0;
    this.layoutChange.emit(this.workingLayout);
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Re-runs compaction on the current layout on demand (Phase 9) —
   * compaction already runs internally after every drag/resize commit,
   * but wasn't previously reachable for a consumer to trigger manually
   * (e.g. a "Tidy up" button, or after a bulk programmatic edit that
   * bypassed drag/resize entirely). Deliberately forces real
   * compaction even when `compactType` is `NONE` — that value only
   * governs *automatic* compaction during drag/resize; an explicit,
   * manually-triggered tidy-up should always actually tidy up,
   * matching Vue's own `compactNow()`. Respects whichever direction was
   * already chosen (`HORIZONTAL`, either `*_OVERLAP` variant) rather
   * than always forcing `VERTICAL` — only `NONE` itself needs a
   * fallback, since it has no direction of its own to respect. Has no
   * effect on `compactor` (a custom compactor, when set, always runs
   * regardless of `compactType` — see `resolveCompactor`'s own doc
   * comment).
   */
  compactNow(): void {
    const beforeCompact = cloneLayout(this.workingLayout);
    const compactTypeOverride = this.compactType === ECompactType.NONE ? ECompactType.VERTICAL : this.compactType;
    // Bug fix: this used to call `this.resolveCompactor()` with no
    // argument — that method's own (then-parameterless) implementation
    // always picked the built-in compactor via `getCompactor(this.
    // compactType)`, using the *raw, un-overridden* `compactType`
    // (still `NONE`) to decide *which built-in compactor function to
    // use at all* — entirely independent of the `compactTypeOverride`
    // computed just above, which was only ever passed through as
    // *context* to whichever compactor `resolveCompactor()` had
    // already picked. `getCompactor(ECompactType.NONE)` returns a
    // genuine no-op compactor, so the override context it received
    // was simply ignored, and `compactNow()` silently did nothing at
    // all whenever `compactType` was `NONE` — confirmed by a real
    // failing test ("force real compaction... even when compactType is
    // NONE"), not caught by inspection beforehand. `resolveCompactor`
    // now takes this override directly (see its own updated signature)
    // so it picks `getCompactor(VERTICAL)`, not `getCompactor(NONE)`,
    // in exactly this case — matching Vue's own `runCompaction`, which
    // resolves its *own* built-in compactor via the already-overridden
    // `compactType`, not `props.compactType` directly.
    const compacted = this.resolveCompactor(compactTypeOverride).compact(this.workingLayout, this.effectiveColNum, { compactType: compactTypeOverride });

    if(this.enableUndoRedo) {
      this.undoStack.push(beforeCompact);
      if(this.undoStack.length > this.undoHistoryLimit) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.canUndo = true;
      this.canRedo = false;
    }

    this.workingLayout = compacted;
    this.layoutChange.emit(compacted);
    this.changeDetectorRef.markForCheck();
  }

  /** Alias for `compactNow()` — same operation, offered under the name `docs/FEATURE_RECOMMENDATIONS.md` (Vue's own) originally suggested it under. */
  rearrange(): void {
    this.compactNow();
  }

  /**
   * Clones the item with the given id, placing the copy directly below
   * the source item (`x` unchanged, `y: source.y + source.h`) and
   * letting the next compaction pass resolve any overlap that
   * placement causes — rather than computing a collision-free spot up
   * front, which would duplicate logic the compactor already has. A
   * direct port of Vue's own `duplicateItem`. Copies every field except
   * `i` (given a new, collision-safe id below) and `moved` (compaction's
   * own bookkeeping flag, not part of the item's actual configuration).
   *
   * @return The new item's own id, or `null` if `id` doesn't match any item currently in the layout.
   */
  duplicateItem(id: string | number): string | number | null {
    const source = getLayoutItem(this.workingLayout, id);
    if(!source) {
      return null;
    }

    let suffix = 1;
    let newId = `${id}-copy`;
    const existingIds = new Set(this.workingLayout.map(item => String(item.i)));
    while(existingIds.has(newId)) {
      suffix += 1;
      newId = `${id}-copy-${suffix}`;
    }

    const { i: _unusedId, moved: _unusedMoved, ...rest } = source;
    const duplicated: ILayoutItem = { ...rest, i: newId, y: source.y + source.h };
    this.workingLayout = [...this.workingLayout, duplicated];
    this.compactNow();

    return newId;
  }

  /**
   * Aligns every currently-selected item (`multiSelect`) to the given
   * edge/center of the *anchor* — the first item the user actually
   * selected (a `Set`'s own insertion order), which itself never moves.
   * A no-op when fewer than 2 items are selected. See `core`'s own
   * `computeAlignAdjustments` for the exact per-edge/center math.
   */
  alignSelected(edge: TAlignEdge): void {
    const selectedIds = Array.from(this.selectedItemIds);
    const adjustments = computeAlignAdjustments(this.workingLayout, selectedIds, edge);
    this.applyAlignDistributeAdjustments(adjustments, selectedIds);
  }

  /**
   * Evenly spaces the currently-selected items (`multiSelect`) along
   * the given axis — the two outermost selected items (by actual
   * position, not selection order) stay exactly where they are; only
   * the ones "in between" move to close any uneven gaps. A no-op with
   * fewer than 3 items selected. See `core`'s own
   * `computeDistributeAdjustments` for the exact spacing math.
   */
  distributeSelected(axis: TDistributeAxis): void {
    const selectedIds = Array.from(this.selectedItemIds);
    const adjustments = computeDistributeAdjustments(this.workingLayout, selectedIds, axis);
    this.applyAlignDistributeAdjustments(adjustments, selectedIds);
  }

  /**
   * Renders the current layout as a standalone SVG string — a thin
   * pass-through to `core`'s own `exportLayoutAsSvg`, defaulting
   * `colNum`/`rowHeight`/`margin`/`containerWidth` to this grid's own
   * current, live values rather than requiring a consumer to pass them
   * again (the standalone function has no DOM element of its own to
   * measure, unlike this component). Every option can still be
   * overridden explicitly.
   */
  exportLayoutAsSvg(options: IExportLayoutAsSvgOptions = {}): string {
    return coreExportLayoutAsSvg(this.workingLayout, {
      colNum: this.effectiveColNum,
      containerWidth: this.containerWidth || 1200,
      margin: this.margin,
      rowHeight: this.rowHeight,
      ...options,
    });
  }

  /**
   * Scrolls the item with the given id into view, if it's currently
   * rendered (found via its own `data-grid-item-id` attribute, scoped
   * to this grid's own container rather than a global
   * `document.querySelector`, so a page with more than one
   * `GridLayoutComponent` can't accidentally match a different grid's
   * item sharing the same id). A no-op (not a throw) when the id
   * doesn't match any rendered item. `block: 'nearest'` avoids yanking
   * the whole page's scroll position for an item that's already fully
   * visible.
   */
  scrollToItem(id: string | number): void {
    this.findItemElement(id)?.scrollIntoView({ behavior: `smooth`, block: `nearest`, inline: `nearest` });
  }

  /** Moves keyboard focus to the item with the given id, if it's currently rendered and focusable (draggable/resizable/non-static items get `tabindex="0"` via `GridItemComponent`'s own host bindings). Same no-op-on-missing-id behavior as `scrollToItem`, for the same reason. */
  focusItem(id: string | number): void {
    this.findItemElement(id)?.focus();
  }

  /**
   * Applies a computed `Map<id, { x?, y? }>` of adjustments to the
   * working layout in place, then runs the same post-processing every
   * other layout-mutating public method here already does (compact,
   * emit `layoutChange`) — shared by `alignSelected`/`distributeSelected`
   * rather than duplicated between them. `preventCollision` guard: when
   * the input is on, an adjustment that would land an item on top of a
   * *non-selected* item is skipped entirely for that one item (the rest
   * of the batch still applies) — colliding with another item *also
   * being aligned/distributed* isn't treated as a collision at all
   * here, since that's frequently the whole point of the command.
   */
  private applyAlignDistributeAdjustments(adjustments: Map<string | number, { x?: number; y?: number }>, selectedIds: (string | number)[]): void {
    if(adjustments.size === 0) {
      return;
    }
    const next = cloneLayout(this.workingLayout);
    const selectedIdSet = new Set(selectedIds);

    adjustments.forEach((adjustment, id) => {
      const item = getLayoutItem(next, id);
      if(!item) {
        return;
      }
      const candidate = { ...item, ...adjustment };
      if(this.preventCollision) {
        const collisions = getAllCollisions(next, candidate).filter(layoutItem => layoutItem.i !== item.i && !selectedIdSet.has(layoutItem.i));
        if(collisions.length > 0) {
          return;
        }
      }
      if(adjustment.x !== undefined) {
        item.x = adjustment.x;
      }
      if(adjustment.y !== undefined) {
        item.y = adjustment.y;
      }
    });

    if(this.enableUndoRedo) {
      this.undoStack.push(cloneLayout(this.workingLayout));
      if(this.undoStack.length > this.undoHistoryLimit) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.canUndo = true;
      this.canRedo = false;
    }

    const compacted = this.resolveCompactor().compact(next, this.effectiveColNum, { compactType: this.compactType });
    this.workingLayout = compacted;
    this.layoutChange.emit(compacted);
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Finds the DOM element for a given item id, scoped to this grid's
   * own container rather than a global `document.querySelector` —
   * important for a page with more than one `GridLayoutComponent`.
   * Relies on `data-grid-item-id` (set on `GridItemComponent`'s own
   * host element, matching its `i` input) rather than anything derived
   * from position/index, so it keeps working regardless of layout
   * order or filtering.
   */
  private findItemElement(id: string | number): HTMLElement | null {
    const container = this.containerRef?.nativeElement;
    if(!container) {
      return null;
    }
    const idAsString = String(id);
    const candidates = container.querySelectorAll<HTMLElement>(`[data-grid-item-id]`);
    return Array.from(candidates).find(el => el.getAttribute(`data-grid-item-id`) === idAsString) ?? null;
  }

  /** `multiSelect` — clicking the grid's own background (not an item, which stops propagation via its own click binding before this ever fires) clears the current selection, matching Vue's own `backgroundClickHandler`. */
  handleBackgroundClick(_event: MouseEvent): void {
    if(this.multiSelect) {
      this.clearSelection();
    }
  }

  private setSelection(next: Set<string | number>): void {
    this.selectedItemIds = next;
    this.eventBus.setSelectedItemIds(next);
    this.selectionChanged.emit(Array.from(next));
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Shift-click range-selection: extends from `lastAnchorId` (the last
   * plain/Ctrl-click) to the clicked item, inclusive, via `core`'s own
   * `computeRangeSelection` — *replacing* the current selection with
   * that range, matching the standard desktop convention (not
   * additive; a Shift-click after an unrelated Ctrl-click selection
   * doesn't merge with it). Falls back to a plain select if there's no
   * anchor yet (the very first click on a fresh grid) — a range needs
   * two ends to mean anything, and a lone Shift-click has only one.
   * Deliberately does *not* update `lastAnchorId` on a Shift-click
   * itself, so repeated Shift-clicks keep re-anchoring to the same
   * fixed point rather than compounding from the previous Shift-click
   * target.
   *
   * Correction, not a new finding, on the comment this replaces: an
   * earlier version claimed a real Shift-click range-selection was a
   * deferred follow-up, on the (wrong) grounds that Vue's own
   * `itemClickedHandler` treats `shiftKey` identically to
   * `ctrlKey`/`metaKey` with no range logic at all. That was true of
   * Vue's own behavior *before* this same range-selection feature was
   * added there too — both this port and Vue's own `useMultiSelect.ts`
   * now implement the identical range logic described above.
   */
  private handleItemClicked(event: IItemClickedEvent): void {
    if(!this.multiSelect) {
      return;
    }
    if(event.shiftKey && this.lastAnchorId !== null) {
      const range = computeRangeSelection(this.workingLayout, this.lastAnchorId, event.i);
      this.setSelection(new Set(range));
      return;
    }
    if(event.shiftKey || event.ctrlKey || event.metaKey) {
      this.toggleItemSelection(event.i);
    } else {
      this.selectItem(event.i);
    }
    this.lastAnchorId = event.i;
  }

  /**
   * Resolves `effectiveColNum` from the current container width against
   * `breakpoints`/`cols`, and (Phase 13, this round) actually generates
   * and commits the layout for that breakpoint via `core`'s own
   * `findOrGenerateResponsiveLayout` — caching the outgoing breakpoint's
   * own current layout under its own name first (if not already cached),
   * then bounds-correcting/compacting for the new breakpoint's column
   * count (`distributeEvenly` threaded through), then caching *that*
   * result too. Matches Vue's own `responsiveGridLayout`, including
   * running this full regenerate-and-emit pass on *every* call while
   * `responsive` is on — not gated to only when the breakpoint itself
   * actually changes, the same as Vue's own real behavior (confirmed by
   * reading `useResponsiveLayout.ts` directly): a resize that stays
   * within the same breakpoint still re-runs bounds-correction/
   * compaction against the current column count, which is normally a
   * no-op against an already-correct layout, but is not specially
   * skipped.
   *
   * Bug fix (dead-code removal, not a functional change): an earlier
   * version of this method also explicitly cached `this.layouts[this.
   * lastBreakpoint]` before switching away from it, on the theory that
   * the outgoing breakpoint's own layout needed capturing before it was
   * lost. Traced carefully and confirmed unreachable: `this.layouts
   * [breakpoint] = cloneLayout(newLayout)` a few lines below already
   * runs unconditionally for *every* breakpoint this method ever
   * resolves to, and `lastBreakpoint` can only ever become some value X
   * as a direct result of this same method having resolved X as
   * `breakpoint` in an earlier call — meaning `this.layouts[X]` was
   * already written back when X was current, before any later call ever
   * gets a chance to switch away from it. The separate "cache before
   * leaving" branch could therefore never actually run against a truly
   * uncached entry. Removed rather than left in as inert insurance,
   * since dead code that looks load-bearing is worse than no code at
   * all for whoever reads this next.
   */
  private resolveResponsiveColNum(): void {
    if(!this.responsive || this.containerWidth <= 0) {
      this.effectiveColNum = this.colNum;
      return;
    }
    const breakpoint = getBreakpointFromWidth(this.breakpoints, this.containerWidth);
    const resolvedCols = getColsFromBreakpoint(breakpoint, this.cols);
    // Matches Vue's own `colsCompute`: the user-configured `colNum` acts
    // as a hard ceiling, even if the resolved breakpoint's own column
    // count would otherwise be larger.
    const colsCompute = Math.min(this.colNum, resolvedCols);
    this.effectiveColNum = colsCompute;
    this.eventBus.setColNum(colsCompute);

    const newLayout = findOrGenerateResponsiveLayout(
      this.workingLayout,
      this.layouts,
      this.breakpoints,
      breakpoint,
      this.lastBreakpoint ?? breakpoint,
      colsCompute,
      this.compactType,
      this.distributeEvenly,
    );
    this.layouts[breakpoint] = cloneLayout(newLayout);
    this.workingLayout = newLayout;
    this.layoutChange.emit(newLayout);

    if(breakpoint !== this.lastBreakpoint) {
      this.lastBreakpoint = breakpoint;
      this.breakpointChanged.emit(breakpoint);
    }
  }

  /**
   * Resolves a `GridItemComponent` descendant's own reported drag tick
   * — applies `snapToGrid` (before collision resolution, matching
   * Vue's own `applySnapToGridAdjustment` ordering), `multiSelect`
   * group-move (shifting every other selected item by the same delta),
   * resolves the primary item's own move against collisions via
   * `core`'s own `moveElement`, compacts, and emits the result via
   * `layoutChange`.
   */
  private handleItemDrag(event: IItemDragEvent): void {
    const next = cloneLayout(this.workingLayout);
    const item = getLayoutItem(next, event.i);
    if(!item) {
      return;
    }

    if(event.eventType === `dragstart`) {
      this.dragStart.emit(event.i);
      this.captureGestureStart(this.workingLayout);
      this.groupMoveStartPositions = this.snapshotGroupMovePositions(event.i);
      if(this.allowCrossGridDrag) {
        this.draggedCrossGridId = event.i;
      }
      if(this.restoreOnDrag) {
        this.positionsBeforeDrag = this.workingLayout.reduce<Record<string | number, { x: number; y: number }>>((result, layoutItem) => {
          result[layoutItem.i] = { x: layoutItem.x, y: layoutItem.y };
          return result;
        }, {});
      }
    } else if(event.eventType === `dragmove`) {
      this.dragMove.emit(event.i);
    } else if(event.eventType === `dragend`) {
      this.dragEnd.emit(event.i);
    }

    if(event.eventType === `dragend` && this.handleCrossGridDragEnd(event.i, event.clientX, event.clientY, item)) {
      // Accepted by another grid — every side effect the accept path
      // needs already ran inside handleCrossGridDragEnd/acceptDrop
      // (adding the item to the target's own layout). This grid drops
      // it from its own working layout and commits that; nothing left
      // to move or compact here, since the item no longer belongs to
      // this grid's layout at all.
      const withoutDraggedItem = next.filter(layoutItem => layoutItem.i !== event.i);
      const compacted = this.resolveCompactor().compact(withoutDraggedItem, this.effectiveColNum, { compactType: this.compactType });
      this.workingLayout = compacted;
      this.layoutChange.emit(compacted);
      this.clearGuides();
      this.commitGestureEnd();
      this.changeDetectorRef.markForCheck();
      return;
    }

    let { x: targetX, y: targetY } = event;
    if(this.snapToGrid && (event.eventType === `dragmove` || event.eventType === `dragend`)) {
      const adjustment = findSnapAdjustment(next, { h: event.h, i: event.i, w: event.w, x: targetX, y: targetY }, this.snapThreshold);
      targetX = adjustment.x ?? targetX;
      targetY = adjustment.y ?? targetY;
    }

    this.applyGroupMove(event.eventType, event.i, targetX, targetY, next);

    if(event.eventType === `dragmove` || event.eventType === `dragstart`) {
      this.updateGuides(event.i, targetX, targetY, event.w, event.h, next);
    } else {
      this.clearGuides();
    }

    const preMoveX = item.x;
    const preMoveY = item.y;
    moveElement(next, item, targetX, targetY, true, this.horizontalShift, this.preventCollision);

    // MOVE_BLOCKED_BY_COLLISION — a direct port of Vue's own condition,
    // confirmed via a direct source read, not assumed: moveElement()
    // (both here and in Vue's own core) resets an item back to its
    // pre-move x/y when preventCollision blocks it entirely, so the
    // only way to detect "blocked" after the fact is comparing against
    // what was captured just before the call. Only emitted when a move
    // was actually attempted (the snapped target genuinely differs from
    // the pre-move position) — otherwise every drag tick where the
    // pointer briefly pauses over the item's own current cell would
    // look like a blocked move too.
    if((targetX !== preMoveX || targetY !== preMoveY) && item.x === preMoveX && item.y === preMoveY) {
      this.moveBlockedByCollision.emit(event.i);
    }

    // restoreOnDrag: bug fix, not a design choice as an earlier version
    // of this comment claimed — confirmed via a real failing test
    // ("keep every other item at or above its own pre-drag position").
    // A version of this that gated the minPositions-aware compaction to
    // `dragend` only (skipping it on `dragstart`/`dragmove`) genuinely
    // breaks `restoreOnDrag`: `dragstart` itself still runs a full
    // compaction pass every tick regardless of gesture phase (nothing
    // here special-cases it away), and an *ungated* compaction pass
    // eagerly closes any pre-existing gap in the layout immediately —
    // permanently altering `workingLayout` before `dragend`'s own
    // minPositions-aware pass ever gets a chance to protect it. Traced
    // directly against `compactLayout`'s own source, then confirmed via
    // the actual failing test, not guessed at. Applying this on *every*
    // tick once `positionsBeforeDrag` exists (matching Vue's own
    // `dragEvent`, which runs this identical branch unconditionally on
    // every call, dragstart included) is what actually holds the
    // reference position stable across the whole gesture.
    let compacted: TLayout;
    if(this.restoreOnDrag && this.positionsBeforeDrag) {
      const wasStatic = item.isStatic;
      item.isStatic = true;
      compacted = this.resolveCompactor().compact(next, this.effectiveColNum, { compactType: this.compactType, minPositions: this.positionsBeforeDrag });
      const compactedItem = getLayoutItem(compacted, event.i);
      if(compactedItem) {
        compactedItem.isStatic = wasStatic;
      }
    } else {
      compacted = this.resolveCompactor().compact(next, this.effectiveColNum, { compactType: this.compactType });
    }

    this.workingLayout = compacted;
    this.layoutChange.emit(compacted);

    if(event.eventType === `dragend`) {
      this.positionsBeforeDrag = undefined;
      this.commitGestureEnd();
    }
    this.changeDetectorRef.markForCheck();
  }

  /**
   * Resolves a `GridItemComponent` descendant's own reported resize
   * tick — `multiSelect` group-resize, alignment guides, the same
   * direct size/position assignment `handleItemDrag`'s own doc comment
   * explains resize uses instead of `moveElement`, then compacts and
   * emits.
   */
  private handleItemResize(event: IItemResizeEvent): void {
    const next = cloneLayout(this.workingLayout);
    const item = getLayoutItem(next, event.i);
    if(!item) {
      return;
    }

    if(event.eventType === `resizestart`) {
      this.captureGestureStart(this.workingLayout);
      this.groupResizeStartSizes = this.snapshotGroupResizeSizes(event.i);
    }

    this.applyGroupResize(event.eventType, event.i, event.w, event.h, next);

    if(event.eventType === `resizestart` || event.eventType === `resizemove`) {
      this.updateGuides(event.i, event.x, event.y, event.w, event.h, next);
    } else {
      this.clearGuides();
    }

    item.w = event.w;
    item.h = event.h;
    item.x = event.x;
    item.y = event.y;
    this.applyResizeCollisionClamp(item, next);
    const compacted = this.resolveCompactor().compact(next, this.effectiveColNum, { compactType: this.compactType });

    this.workingLayout = compacted;
    this.layoutChange.emit(compacted);

    if(event.eventType === `resizeend`) {
      this.commitGestureEnd();
    }
    this.changeDetectorRef.markForCheck();
  }

  /**
   * `preventCollision`-aware resize clamping (Phase 21) — a direct port
   * of Vue's own `applyResizeSizeAndCollisionClamp`, adapted to this
   * method's own already-mutated-item structure (`item.w`/`item.h`/
   * `item.x`/`item.y` are already set to the full requested values by
   * the time this runs, unlike Vue's own version, which computes a
   * *candidate* against the old, not-yet-mutated item — functionally
   * equivalent, since the clamp itself only depends on colliding
   * neighbors' own positions relative to wherever the item currently
   * is, not on which specific moment its own mutation happened).
   * No-ops entirely when `preventCollision` is off, matching Vue's own
   * behavior of leaving an unclamped resize completely untouched.
   */
  private applyResizeCollisionClamp(item: ILayoutItem, next: TLayout): void {
    if(!this.preventCollision) {
      return;
    }
    const collisions = getAllCollisions(next, item).filter(layoutItem => layoutItem.i !== item.i);
    if(collisions.length === 0) {
      return;
    }

    let leastX = Infinity;
    let leastY = Infinity;
    collisions.forEach(layoutItem => {
      if(layoutItem.x > item.x) {
        leastX = Math.min(leastX, layoutItem.x);
      }
      if(layoutItem.y > item.y) {
        leastY = Math.min(leastY, layoutItem.y);
      }
    });

    if(Number.isFinite(leastX)) {
      item.w = leastX - item.x;
    }
    if(Number.isFinite(leastY)) {
      item.h = leastY - item.y;
    }
    this.moveBlockedByCollision.emit(item.i);
  }

  private captureGestureStart(layout: TLayout): void {
    if(this.enableUndoRedo) {
      this.preGestureSnapshot = cloneLayout(layout);
    }
  }

  private commitGestureEnd(): void {
    if(!this.enableUndoRedo || !this.preGestureSnapshot) {
      return;
    }
    this.undoStack.push(this.preGestureSnapshot);
    if(this.undoStack.length > this.undoHistoryLimit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.preGestureSnapshot = null;
    this.canUndo = true;
    this.canRedo = false;
  }

  private snapshotGroupMovePositions(activeId: string | number): Map<string | number, { x: number; y: number }> {
    const snapshot = new Map<string | number, { x: number; y: number }>();
    if(!this.multiSelect || !this.selectedItemIds.has(activeId) || this.selectedItemIds.size <= 1) {
      return snapshot;
    }
    this.selectedItemIds.forEach(id => {
      const found = getLayoutItem(this.workingLayout, id);
      snapshot.set(id, { x: found?.x ?? 0, y: found?.y ?? 0 });
    });
    return snapshot;
  }

  private applyGroupMove(eventType: IItemDragEvent[`eventType`], activeId: string | number, x: number, y: number, next: TLayout): void {
    if(eventType === `dragstart` || this.groupMoveStartPositions.size === 0 || !this.groupMoveStartPositions.has(activeId)) {
      return;
    }
    const anchorStart = this.groupMoveStartPositions.get(activeId)!;
    const dx = x - anchorStart.x;
    const dy = y - anchorStart.y;
    this.groupMoveStartPositions.forEach((startPos, passengerId) => {
      if(passengerId === activeId) {
        return;
      }
      const passenger = getLayoutItem(next, passengerId);
      if(passenger && !passenger.isStatic && passenger.isDraggable !== false) {
        passenger.x = Math.max(startPos.x + dx, 0);
        passenger.y = Math.max(startPos.y + dy, 0);
      }
    });
  }

  private snapshotGroupResizeSizes(activeId: string | number): Map<string | number, { h: number; w: number }> {
    const snapshot = new Map<string | number, { h: number; w: number }>();
    if(!this.multiSelect || !this.selectedItemIds.has(activeId) || this.selectedItemIds.size <= 1) {
      return snapshot;
    }
    this.selectedItemIds.forEach(id => {
      const found = getLayoutItem(this.workingLayout, id);
      snapshot.set(id, { h: found?.h ?? 1, w: found?.w ?? 1 });
    });
    return snapshot;
  }

  private applyGroupResize(eventType: IItemResizeEvent[`eventType`], activeId: string | number, w: number, h: number, next: TLayout): void {
    if(eventType === `resizestart` || this.groupResizeStartSizes.size === 0 || !this.groupResizeStartSizes.has(activeId)) {
      return;
    }
    const anchorStart = this.groupResizeStartSizes.get(activeId)!;
    const dw = w - anchorStart.w;
    const dh = h - anchorStart.h;
    this.groupResizeStartSizes.forEach((startSize, passengerId) => {
      if(passengerId === activeId) {
        return;
      }
      const passenger = getLayoutItem(next, passengerId);
      if(passenger && !passenger.isStatic && passenger.isResizable !== false) {
        passenger.w = Math.min(Math.max(startSize.w + dw, passenger.minW ?? 1), passenger.maxW ?? Infinity);
        passenger.h = Math.min(Math.max(startSize.h + dh, passenger.minH ?? 1), passenger.maxH ?? Infinity);
      }
    });
  }

  private updateGuides(id: string | number, x: number, y: number, w: number, h: number, layout: TLayout): void {
    if(this.showAlignmentGuides) {
      const guides = findAlignmentGuides(layout, { h, i: id, w, x, y });
      this.alignmentGuideStyles = this.toGuideStyles(guides);
    }
    if(this.showSpacingGuides) {
      const indicators = findSpacingIndicators(layout, { h, i: id, w, x, y });
      this.spacingIndicatorStyles = this.toIndicatorStyles(indicators, x, y, w, h);
    }
  }

  private clearGuides(): void {
    this.alignmentGuideStyles = [];
    this.spacingIndicatorStyles = [];
  }

  private toGuideStyles(guides: IAlignmentGuide[]): IAlignmentGuideStyle[] {
    if(guides.length === 0 || this.containerWidth < 1) {
      return [];
    }
    const [marginH, marginV] = this.margin;
    const colWidth = calcColWidth(this.containerWidth, marginH, this.effectiveColNum);
    return guides.map(guide => (
      guide.axis === `x`
        ? { height: `100%`, left: `${guide.position * (colWidth + marginH) + marginH}px`, top: `0`, width: `1px` }
        : { height: `1px`, left: `0`, top: `${guide.position * (this.rowHeight + marginV) + marginV}px`, width: `100%` }
    ));
  }

  private toIndicatorStyles(indicators: ISpacingIndicator[], activeX: number, activeY: number, activeW: number, activeH: number): ISpacingIndicatorStyle[] {
    if(indicators.length === 0 || this.containerWidth < 1) {
      return [];
    }
    const [marginH, marginV] = this.margin;
    const colWidth = calcColWidth(this.containerWidth, marginH, this.effectiveColNum);
    return indicators.map(indicator => {
      if(indicator.axis === `x`) {
        const startPx = indicator.gapStart * (colWidth + marginH) + marginH;
        const endPx = indicator.gapEnd * (colWidth + marginH) + marginH;
        const centerY = (activeY + activeH / 2) * (this.rowHeight + marginV) + marginV;
        return { label: `${indicator.distance} col${indicator.distance === 1 ? `` : `s`}`, left: `${(startPx + endPx) / 2}px`, top: `${centerY}px` };
      }
      const startPxY = indicator.gapStart * (this.rowHeight + marginV) + marginV;
      const endPxY = indicator.gapEnd * (this.rowHeight + marginV) + marginV;
      const centerX = (activeX + activeW / 2) * (colWidth + marginH) + marginH;
      return { label: `${indicator.distance} row${indicator.distance === 1 ? `` : `s`}`, left: `${centerX}px`, top: `${(startPxY + endPxY) / 2}px` };
    });
  }

  private resolveCompactor(compactTypeOverride?: ECompactType): ICompactor {
    return this.compactor ?? getCompactor(compactTypeOverride ?? this.compactType);
  }

  /**
   * Registers/deregisters this grid's own cross-grid zone — a direct
   * port of React's own `useCrossGridDrag.ts` effect (see this class's
   * own doc comment for why that file, not Vue's, was the reference:
   * already a clean, framework-agnostic mechanism with nothing Vue- or
   * React-specific left in it beyond the hook wrapper itself). Called
   * once from `ngAfterViewInit` for the initial `allowCrossGridDrag`
   * value, and again whenever that `@Input()` changes reactively.
   */
  private setCrossGridDragEnabled(enabled: boolean): void {
    this.deregisterCrossGridZone?.();
    this.deregisterCrossGridZone = null;
    if(!enabled) {
      return;
    }
    const zone: ICrossGridZone = {
      acceptDrop: (item, sourceLayoutId) => {
        const next = cloneLayout(this.workingLayout);
        next.push(item as ILayoutItem);
        const compacted = this.resolveCompactor().compact(next, this.effectiveColNum, { compactType: this.compactType });
        this.workingLayout = compacted;
        this.layoutChange.emit(compacted);
        this.crossGridItemDropped.emit({ item, sourceLayoutId });
        this.changeDetectorRef.markForCheck();
      },
      getRect: () => this.containerRef?.nativeElement?.getBoundingClientRect() ?? null,
      isExternalDropDisabled: () => this.disableExternalDrop,
      layoutId: this.resolvedLayoutId,
      rejectDrop: (itemId, sourceLayoutId) => {
        this.crossGridDropRejected.emit({ itemId, sourceLayoutId });
        this.changeDetectorRef.markForCheck();
      },
    };
    this.deregisterCrossGridZone = registerCrossGridZone(zone);
  }

  /**
   * Called from `handleItemDrag` at `dragend`, after the item's own
   * pre-drop state has already been read but *before* committing it as
   * a normal in-grid move — the return value decides which of the two
   * happens. Returns `true` if another registered grid accepted the
   * drop (the caller should remove the item from its own layout and
   * commit that instead of a normal move). Returns `false` for every
   * other case (`allowCrossGridDrag` off, no drag was tracked, no
   * target zone found at the drop point, or the target rejected it) —
   * the caller falls through to its own normal end-of-drag handling
   * exactly as if this method didn't exist. A direct port of React's
   * own `useCrossGridDrag.ts` `handleDragEnd`.
   */
  private handleCrossGridDragEnd(id: string | number, clientX: number | undefined, clientY: number | undefined, currentItem: ILayoutItem): boolean {
    if(!this.allowCrossGridDrag || this.draggedCrossGridId === null) {
      return false;
    }

    // Confirmed unreachable through any real call, not assumed:
    // `clientX`/`clientY` are typed `number | undefined` on this
    // method's own parameters, but `IItemDragEvent`'s own fields (the
    // only real values ever passed in, from `handleItemDrag`'s own
    // single call site) are both required `number`s — never actually
    // `undefined` in practice. The broader parameter type here is
    // defensive, not reflecting any genuine call path that omits them.
    /* istanbul ignore next -- see the comment above: clientX/clientY are never actually undefined from the one real caller (IItemDragEvent requires both as plain numbers); reaching this fallback would need a type-violating call. */
    const targetZone = findCrossGridZoneAt(clientX ?? Number.NaN, clientY ?? Number.NaN, this.resolvedLayoutId);
    this.draggedCrossGridId = null;

    if(!targetZone) {
      return false;
    }

    if(targetZone.isExternalDropDisabled()) {
      targetZone.rejectDrop(id, this.resolvedLayoutId);
      return false;
    }

    targetZone.acceptDrop({ ...currentItem }, this.resolvedLayoutId);
    return true;
  }

  /**
   * Attaches/detaches the four native HTML5 drag-and-drop listeners on
   * the container element — a direct port of Vue's own
   * `useOutsideDrop.ts` (React has no equivalent to port from). Called
   * once from `ngAfterViewInit` for the initial `allowOutsideDrop`
   * value, and again whenever that `@Input()` changes reactively.
   */
  private setOutsideDropEnabled(enabled: boolean): void {
    const el = this.containerRef?.nativeElement;
    if(!el) {
      return;
    }
    if(enabled && !this.outsideDropListenersAttached) {
      el.addEventListener(`dragenter`, this.onOutsideDragEnter);
      el.addEventListener(`dragover`, this.onOutsideDragOver);
      el.addEventListener(`dragleave`, this.onOutsideDragLeave);
      el.addEventListener(`drop`, this.onOutsideDrop);
      this.outsideDropListenersAttached = true;
    } else if(!enabled && this.outsideDropListenersAttached) {
      el.removeEventListener(`dragenter`, this.onOutsideDragEnter);
      el.removeEventListener(`dragover`, this.onOutsideDragOver);
      el.removeEventListener(`dragleave`, this.onOutsideDragLeave);
      el.removeEventListener(`drop`, this.onOutsideDrop);
      this.outsideDropListenersAttached = false;
      this.dragEnterCount = 0;
    }
  }

  private outsideDropAccepted(event: DragEvent): boolean {
    if(!this.outsideDropAccept) {
      return true;
    }
    return this.outsideDropAccept(event.dataTransfer);
  }

  private outsideDropPositionFromEvent(event: DragEvent): { x: number; y: number } {
    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const [marginH, marginV] = this.margin;
    const colWidth = calcColWidth(this.containerWidth || rect.width, marginH, this.effectiveColNum);
    const left = event.clientX - rect.left;
    const top = event.clientY - rect.top;

    let x = Math.round((left - marginH) / (colWidth + marginH));
    let y = Math.round((top - marginV) / (this.rowHeight + marginV));
    x = Math.max(Math.min(x, this.effectiveColNum - this.outsideDropWidth), 0);
    y = Math.max(y, 0);

    return { x, y };
  }

  private handleOutsideDragEnter(event: DragEvent): void {
    if(!this.outsideDropAccepted(event)) {
      // Deliberately no preventDefault() — leaving the browser's own
      // default drag-and-drop handling in place is what shows the
      // native "not allowed" cursor rather than this grid's own
      // placeholder, matching Vue's own behavior exactly.
      return;
    }
    event.preventDefault();
    this.dragEnterCount += 1;
  }

  private handleOutsideDragOver(event: DragEvent): void {
    if(!this.outsideDropAccepted(event)) {
      return;
    }
    // Required per the HTML5 drag-and-drop spec: without
    // preventDefault() here, the browser never treats this element as a
    // valid drop target, and the native `drop` event below never fires.
    event.preventDefault();
    const { x, y } = this.outsideDropPositionFromEvent(event);
    this.placeholder = { h: this.outsideDropHeight, w: this.outsideDropWidth, x, y };
    this.updatePlaceholderStyle();
    this.isDragging = true;
    this.changeDetectorRef.markForCheck();
  }

  private handleOutsideDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragEnterCount = Math.max(0, this.dragEnterCount - 1);
    if(this.dragEnterCount === 0) {
      this.isDragging = false;
      this.changeDetectorRef.markForCheck();
    }
  }

  private handleOutsideDrop(event: DragEvent): void {
    if(!this.outsideDropAccepted(event)) {
      return;
    }
    event.preventDefault();
    this.dragEnterCount = 0;
    this.isDragging = false;
    const { x, y } = this.outsideDropPositionFromEvent(event);
    this.itemDroppedFromOutside.emit({
      dataTransfer: event.dataTransfer,
      h: this.outsideDropHeight,
      w: this.outsideDropWidth,
      x,
      y,
    });
    this.changeDetectorRef.markForCheck();
  }

  private updatePlaceholderStyle(): void {
    if(!this.placeholder || this.containerWidth < 1) {
      this.placeholderStyle = null;
      return;
    }
    const [marginH, marginV] = this.margin;
    const colWidth = calcColWidth(this.containerWidth, marginH, this.effectiveColNum);
    const { h, w, x, y } = this.placeholder;
    this.placeholderStyle = {
      height: `${Math.round(this.rowHeight * h + Math.max(0, h - 1) * marginV)}px`,
      left: `${Math.round(colWidth * x + (x + 1) * marginH)}px`,
      top: `${Math.round(this.rowHeight * y + (y + 1) * marginV)}px`,
      width: `${Math.round(colWidth * w + Math.max(0, w - 1) * marginH)}px`,
    };
  }

  /**
   * `heightMode`'s own precedence rule (Phase 17), resolved once here
   * rather than repeated at every call site — a direct port of Vue's
   * own identically-named computed: an explicit `heightMode` always
   * wins outright; `null` (its own default) defers entirely to
   * `autoSize`, mapping its own two states onto the two `heightMode`
   * values that reproduce this component's own prior (pre-Phase-17)
   * behavior exactly for anyone not using `heightMode` at all.
   */
  private resolvedHeightMode(): THeightMode {
    if(this.heightMode !== null) {
      return this.heightMode;
    }
    return this.autoSize ? `auto` : `fixed`;
  }

  private updateContainerHeight(): void {
    const [, marginV] = this.margin;
    const cssVars: Record<string, string | number> = {
      '--grid-transition-duration': `${this.transitionDurationMs}ms`,
      '--grid-transition-timing': this.transitionTimingFunction,
    };
    if(this.showResizeHandles) {
      cssVars[`--kdl-resize-handle-color`] = this.resizeHandleColor;
    }
    const mode = this.resolvedHeightMode();
    // 'fixed'/'scroll' both mean "no explicit height here," differing
    // only in overflow-y below — matching Vue's own containerHeight()
    // exactly (confirmed via a direct source read: its own switch
    // statement's default case, covering both, returns an empty string).
    const height = mode === `auto`
      ? `${getBottomYCoordinate(this.layout) * (this.rowHeight + marginV) + marginV}px`
      : mode === `fit`
        ? `100%`
        : undefined;
    // Only 'scroll'/'fit' set this at all — 'auto'/'fixed' leave the
    // container's own natural overflow behavior (whatever the
    // consumer's surrounding CSS already does) completely untouched,
    // matching Vue's own containerOverflow() exactly.
    const overflowY = mode === `scroll` || mode === `fit` ? `auto` : undefined;
    this.containerStyle = {
      position: `relative`,
      ...cssVars,
      ...(height !== undefined ? { height } : {}),
      ...(overflowY !== undefined ? { 'overflow-y': overflowY } : {}),
    };
  }
}
