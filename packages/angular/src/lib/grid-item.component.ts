import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NgStyle, NgTemplateOutlet } from '@angular/common';
import { GridItemHeaderDirective } from './grid-item-header.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import {
  calcColWidth,
  calcGridItemWH,
  clamp,
  createCoreData,
  createNativeAutoScroll,
  createNativeDraggable,
  createNativeResizable,
  offsetXYFromParentOf,
  resolveAriaLabels,
  setTopLeft,
  setTopRight,
  setTransform,
  setTransformRtl,
} from '@keystone-dashboard-layout/core';
import type {
  IGridAriaLabels,
  INativeAutoScroll,
  INativeDragEvent,
  INativeResizeEvent,
  IInteractEdges,
  ITopLeftStyle,
  ITopRightStyle,
  ITransformStyle,
  TDragActivationDistance,
  TResizeHandle,
} from '@keystone-dashboard-layout/core';
import { GridEventBusService, IGridDefaults } from './grid-event-bus.service';

/** Grid-unit x/y position — the output of {@link GridItemComponent.calcXY}, mirroring Vue's own `useGridItemDrag.ts` `ICalcXy`. */
interface ICalcXy {
  x: number;
  y: number;
}

/** Grid-unit width/height — the output of {@link GridItemComponent.calcWH}, mirroring Vue's own `useGridItemResize.ts` `ICalcWh`. */
interface ICalcWh {
  w: number;
  h: number;
}

/** Pixel position tracked during an active drag — mirrors Vue's own `IGridItemPosition`, now including the RTL `right` field (Phase 7) alongside `left`. */
interface IDragPosition {
  left?: number;
  right?: number;
  top: number;
}

/** Pixel position+size tracked during an active resize — mirrors Vue's own `IGridItemPosition`, now including the RTL `right` field (Phase 7) alongside `left`. */
interface IResizingPosition {
  height: number;
  left?: number;
  right?: number;
  top: number;
  width: number;
}

const NO_ACTIVE_EDGES: IInteractEdges = { bottom: false, left: false, right: false, top: false };
const ALL_RESIZE_HANDLES: TResizeHandle[] = [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`];

/**
 * Dragging (Phase 3), resizing (Phase 4), `isBounded` (Phase 6),
 * `isMirrored`/RTL, `zIndex`, `autoScroll`, `dragAllowFrom`/
 * `dragIgnoreFrom`/`resizeIgnoreFrom`/`dragActivationDistance`,
 * `showResizeHandles`/`resizeHandleColor`, a per-item `resizeHandles`
 * restriction (Phase 7), and (Phase 11, this round)
 * `preserveAspectRatio`/`autoHeight` — each ported from Vue's own
 * `useGridItemDrag.ts`/`useGridItemResize.ts`/`GridItem.vue` (confirmed
 * by reading directly, not re-derived from scratch).
 *
 * `preserveAspectRatio`: captures the pixel width/height ratio at
 * `resizestart`, then during `resizemove`, derives whichever dimension
 * isn't directly driven by the active edge(s) from the one that is —
 * ported line-for-line from Vue's own identical logic in `handleResize`.
 *
 * `autoHeight`: a `ResizeObserver` on a dedicated wrapper element around
 * the projected content, calling `autoSize()` whenever it actually
 * changes size. The wrapper `<div>` always renders (needed so
 * `ViewChild` can resolve it reliably); only its own
 * `kdl-grid-item-auto-height-wrapper` CSS class toggles with
 * `autoHeight`, via an ordinary property binding — **not** an `@if`/
 * `@else` structural toggle around `<ng-content>` itself, which an
 * earlier version of this template used. That version had a real,
 * confirmed bug: toggling `autoHeight` after the initial render never
 * updated the rendered DOM at all (confirmed via two separate
 * `console.log` diagnostics showing `this.autoHeight` correctly `true`
 * while the template still rendered the `@else` branch, even across
 * multiple `detectChanges()` calls and two different ways of driving
 * the change) — each `@if`/`@else` branch compiles to its own,
 * independent content-projection outlet, and Angular didn't reliably
 * re-home the projected content when swapping which one was active.
 * Keeping a single, never-toggled `<ng-content>` sidesteps that class
 * of issue entirely. `autoSize()` measures the wrapper, computes new
 * w/h (rounding height *up*, never down, so growing content is never
 * clipped by rounding), and reports a synthetic `resizeend`-equivalent
 * tick via the eventBus directly if the size genuinely changed — the
 * same shape Vue's own `autoSize()` uses, minus its own
 * component-local `RESIZE`/`RESIZED` events (this port has no
 * equivalent `@Output()`s for those yet; the eventBus message alone is
 * what actually commits the new size through `GridLayoutComponent`,
 * which is the functionally load-bearing half).
 *
 * `transformScale` is received via the eventBus and divides drag deltas
 * the same way Vue's own composable does; it is not yet applied to
 * resize deltas, matching how Phase 7's own scope prioritized drag
 * first.
 *
 * Reuses `@keystone-dashboard-layout/core`'s own `createNativeDraggable`/
 * `createNativeResizable`/`createNativeAutoScroll` directly, wired up in
 * `ngOnInit`/`ngAfterViewInit` respectively and torn down in
 * `ngOnDestroy`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'handleClick($event)',
    '(keydown)': 'handleKeydown($event)',
    '[attr.aria-describedby]': 'isDraggableOrResizableAndNotStatic ? instructionsId : null',
    '[attr.aria-roledescription]': 'isDraggableOrResizableAndNotStatic ? resolvedAriaLabels.itemRoleDescription : null',
    '[attr.data-grid-item-id]': 'i',
    '[attr.role]': 'isDraggableOrResizableAndNotStatic ? "group" : null',
    '[attr.tabindex]': 'tabindexValue',
    '[class.kdl-grid-item--dragging]': 'isDragging',
    '[class.kdl-grid-item--draggable]': 'resolvedIsDraggable && !isStatic',
    '[class.kdl-grid-item--has-header]': 'hasHeaderContent',
    '[class.kdl-grid-item--resizing]': 'isResizing',
    '[class.kdl-grid-item--rtl]': 'resolvedIsMirrored',
    '[class.kdl-grid-item--selected]': 'isSelected',
    '[class.kdl-grid-item--static]': 'isStatic',
    '[class.kdl-grid-item--use-radius]': 'resolvedUseBorderRadius',
    class: `kdl-grid-item`,
  },
  imports: [NgStyle, NgTemplateOutlet],
  selector: `kdl-grid-item`,
  standalone: true,
  template: `
    <div [ngStyle]="hostStyle">
      @if (resolvedShowCloseButton && !isStatic && resolvedEnableEditMode) {
        <button class="kdl-grid-item-close-button" type="button" (click)="handleCloseButtonClick($event)">
          <span aria-hidden="true" class="kdl-grid-item-close-button-icon"></span>
          <span class="kdl-visually-hidden">{{ resolvedAriaLabels.closeButton }}</span>
        </button>
      }
      @if (isDraggableOrResizableAndNotStatic) {
        <span [id]="instructionsId" class="kdl-visually-hidden">
          {{ isDraggableAndNotStatic ? resolvedAriaLabels.moveInstruction : '' }}
          {{ isResizableAndNotStatic ? resolvedAriaLabels.resizeInstruction : '' }}
        </span>
      }
      @if (hasHeaderContent) {
        <div class="kdl-grid-item-header">
          <ng-content select="[kdlGridItemHeader]"></ng-content>
        </div>
      }
      @if (resolvedResizeHandles.includes('n')) {
        <span #nHandle class="kdl-resize-hint kdl-resize-hint--n">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'n', edge: 'n' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('s')) {
        <span #sHandle class="kdl-resize-hint kdl-resize-hint--s">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 's', edge: 's' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('e')) {
        <span #eHandle class="kdl-resize-hint kdl-resize-hint--e">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'e', edge: 'e' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('w')) {
        <span #wHandle class="kdl-resize-hint kdl-resize-hint--w">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'w', edge: 'w' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('ne')) {
        <span #neHandle class="kdl-resize-hint kdl-resize-hint--ne">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'ne', edge: 'ne' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('nw')) {
        <span #nwHandle class="kdl-resize-hint kdl-resize-hint--nw">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'nw', edge: 'nw' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('se')) {
        <span #seHandle class="kdl-resize-hint kdl-resize-hint--se">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'se', edge: 'se' }"></ng-container>
        </span>
      }
      @if (resolvedResizeHandles.includes('sw')) {
        <span #swHandle class="kdl-resize-hint kdl-resize-hint--sw">
          <ng-container *ngTemplateOutlet="resizeHandleTemplate ?? null; context: { $implicit: 'sw', edge: 'sw' }"></ng-container>
        </span>
      }
      <div #autoHeightWrapper class="kdl-grid-item-content" [class.kdl-grid-item-auto-height-wrapper]="autoHeight" [class.kdl-grid-item-body]="hasHeaderContent">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class GridItemComponent implements AfterContentInit, AfterViewInit, OnChanges, OnDestroy, OnInit {
  /** Unique identifier matching this item's entry in the parent `GridLayout`'s `layout` array. Required. */
  @Input({ required: true }) i!: string | number;
  /** Horizontal position, in grid column units. Required. */
  @Input({ required: true }) x!: number;
  /** Vertical position, in grid row units. Required. */
  @Input({ required: true }) y!: number;
  /** Width, in grid column units. Required. */
  @Input({ required: true }) w!: number;
  /** Height, in grid row units. Required. */
  @Input({ required: true }) h!: number;
  /** Whether this item can be dragged. `null` (the default) inherits the grid-wide default cascaded via `GridEventBusService.gridDefaults$` (Phase 14) — `true` with no eventBus present (standalone usage), matching Vue/React's own ultimate default. */
  @Input() isDraggable: boolean | null = null;
  /** Whether this item can be resized. `null` (the default) — same cascade as `isDraggable` above. */
  @Input() isResizable: boolean | null = null;
  /** Whether this item is excluded from drag/resize/collision entirely. Default `false`, matching Vue/React's own default. */
  @Input() isStatic = false;
  /** Restricts dragging to within the container's own bounds. `null` (the default) inherits the grid-wide default cascaded via `GridEventBusService.gridDefaults$` (Phase 14) — `false` with no eventBus present, matching Vue/React's own ultimate default. */
  @Input() isBounded: boolean | null = null;
  /** Minimum width, in grid column units. Default `1`, matching Vue/React's own default. */
  @Input() minW = 1;
  /** Maximum width, in grid column units. Default `Infinity`, matching Vue/React's own default. */
  @Input() maxW = Infinity;
  /** Minimum height, in grid row units. Default `1`, matching Vue/React's own default. */
  @Input() minH = 1;
  /** Maximum height, in grid row units. Default `Infinity`, matching Vue/React's own default. */
  @Input() maxH = Infinity;
  /** Whether this item renders right-to-left (Phase 7) — mirrors position/size using `core`'s own `setTransformRtl`/`setTopRight`, matching Vue's own `renderRtl` behavior. `null` (the default, changed in Phase 14) inherits the grid-wide default cascaded via `GridEventBusService.gridDefaults$` — `false` with no eventBus present, matching Vue/React's own ultimate default. */
  @Input() isMirrored: boolean | null = null;
  /** Whether `borderRadiusPx` (below) is actually applied to this item. `null` (the default) inherits the grid-wide default cascaded via `GridEventBusService.gridDefaults$` (Phase 19) — `false` with no eventBus present, matching Vue/React's own ultimate default. */
  @Input() useBorderRadius: boolean | null = null;
  /** Border radius, in pixels, applied only when `useBorderRadius` (above) resolves `true`. `null` (the default) inherits the grid-wide default cascaded via `GridEventBusService.gridDefaults$` (Phase 19) — `10` with no eventBus present, matching Vue/React's own ultimate default. */
  @Input() borderRadiusPx: number | null = null;
  /**
   * Whether the built-in close button renders. `null` (the default)
   * inherits the grid-wide default cascaded via `GridEventBusService.
   * gridDefaults$` (Phase 15) — `false` with no eventBus present,
   * matching Vue/React's own ultimate default. Ignored entirely while
   * `isStatic` is `true`, matching Vue's own `v-if="closeButtonEnabled
   * && editModeEnabled && !isStatic"` — the `editModeEnabled` factor is
   * `resolvedEnableEditMode` below (its own TODO here, from Phases 15/
   * 16, is now closed).
   */
  @Input() showCloseButton: boolean | null = null;
  /**
   * Master interactivity switch. `null` (the default) inherits the
   * grid-wide default cascaded via `GridEventBusService.gridDefaults$`
   * — `true` with no eventBus present, matching Vue/React's own
   * ultimate default. See `IGridDefaults`'s own doc comment on
   * `enableEditMode` for exactly what this gates (and, just as
   * importantly, what it deliberately doesn't).
   */
  @Input() enableEditMode: boolean | null = null;
  /**
   * Per-item `ariaLabels` override (Phase 18) — merged with the
   * grid-wide override (if any) and the built-in English defaults via
   * `resolvedAriaLabels` below. `{}` (the default) applies no per-item
   * override at all. Not `null`-cascaded the way the other cascaded
   * `@Input()`s on this class are — `resolveAriaLabels` itself already
   * handles "nothing set at this level" via a plain object spread, so
   * there's no separate `null`-means-inherit state needed here.
   */
  @Input() ariaLabels: IGridAriaLabels = {};
  /**
   * Fired when the built-in close button (above) is clicked, carrying
   * this item's own `i`. A plain, local `@Output()` — confirmed via a
   * direct read of Vue's own `GridItem.vue` that `REMOVE_ITEM` is a
   * plain, local `emit()` there too, not routed through its own
   * `eventBus` at all (unlike `itemClicked`/drag/resize, which are).
   * `GridLayoutComponent` itself does nothing with removal on its own
   * (per that same read) — a consumer wires this to their own
   * layout-mutation logic (typically filtering the removed id out of
   * their own `layout` array and re-applying it), the same way they
   * already apply `layoutChange` back.
   */
  @Output() readonly removeItem = new EventEmitter<string | number>();
  /**
   * Emits this item's own final grid-unit x/y the moment its own drag
   * commits (`dragend`) — a direct per-item alternative to reading the
   * same information out of `GridLayoutComponent`'s own `layoutChange`.
   * Matches Vue's own `GridItem` `@item-moved` (`EGridItemEvent.MOVED`),
   * confirmed via a direct read of `GridItem.vue`'s own `emit()` call
   * shape, not assumed from the example site alone. Deliberately emits
   * this item's own locally-computed, pre-compaction value, matching
   * Vue's exact timing and semantics — not a "corrected" post-compaction
   * value; `GridLayoutComponent`'s own `layoutChange` remains the source
   * of truth for the fully-compacted result, and this output is a
   * convenience for "just tell me when *this* item moved," the same
   * limited scope Vue's own version has.
   */
  @Output() readonly itemMoved = new EventEmitter<{ i: string | number; x: number; y: number }>();
  /**
   * Emits this item's own final grid-unit h/w *and* pixel height/width
   * the moment its own resize commits (`resizeend`) — matches Vue's own
   * `GridItem` `@resized` (`EGridItemEvent.RESIZED`), which genuinely
   * emits both the grid-unit and pixel dimensions together (confirmed via
   * a direct read of `GridItem.vue`'s own `emit()` call shape — not the
   * `{i, h, w}`-only shape an earlier version of this port's own
   * implementation plan assumed before that direct read). See
   * `itemMoved`'s own doc comment for the same pre-compaction-value
   * timing note.
   */
  @Output() readonly itemResized = new EventEmitter<{ i: string | number; h: number; w: number; height: number; width: number }>();
  /** Explicit stacking-order override, applied as an inline `z-index` style, winning over the implicit static/dragging/resizing z-index rules a consumer's own stylesheet may define. `null` (the default) applies no override. */
  @Input() zIndex: number | null = null;
  /** Scrolls the nearest scrollable ancestor while dragging/resizing near its edge. Default `false`, matching Vue/React's own default. */
  @Input() autoScroll = false;
  /** CSS selector restricting which descendant a drag gesture may start from — `null` (the default) means anywhere on the item (subject to `dragIgnoreFrom` below still excluding matches). */
  @Input() dragAllowFrom: string | null = null;
  /** CSS selector excluding descendants a drag gesture may *not* start from. Default `'a, button'`, matching Vue/React's own default — so an interactive child inside the item's own projected content doesn't accidentally start a drag. */
  @Input() dragIgnoreFrom = `a, button`;
  /** CSS selector excluding descendants of a resize handle that shouldn't themselves start a resize (e.g. custom handle content with its own click handler). `null` (the default) excludes nothing. */
  @Input() resizeIgnoreFrom: string | null = null;
  /** Minimum pointer movement, in pixels, before a drag activates — see `core`'s own `TDragActivationDistance` for the per-pointer-type shape. `null` (the default) uses the native engine's own built-in threshold. */
  @Input() dragActivationDistance: TDragActivationDistance | null = null;
  /** Whether the 8 resize-hint spans are visibly styled (via the `--kdl-resize-handle-color` CSS custom property) rather than invisible-but-still-functional. `null` (the default) inherits whatever the surrounding stylesheet already applies; explicit `true`/`false` set the custom property directly on this item's own host. */
  @Input() showResizeHandles: boolean | null = null;
  /** The resize-hint color applied when `showResizeHandles` is (directly or by inheritance) on. `null` (the default) falls back to the same default color Vue/React both use. */
  @Input() resizeHandleColor: string | null = null;
  /** Restricts which of the 8 resize-hint spans actually render/activate. `null` (the default) renders all 8. An empty array is a deliberate "no handle-driven resize for this item" value, distinct from `isResizable: false` (this item may still be resized some other way, e.g. programmatically). */
  @Input() resizeHandles: TResizeHandle[] | null = null;
  /** Derives whichever dimension isn't directly driven by the active resize edge(s) from the one that is, using the pixel width/height ratio captured at `resizestart` (Phase 11). Default `false`, matching Vue/React's own default. */
  @Input() preserveAspectRatio = false;
  /** Automatically re-measures this item's own height/width whenever its own projected content changes size (a `ResizeObserver` on a dedicated wrapper element, only rendered when this is on — Phase 11). Default `false`, matching Vue/React's own default (no grid-wide default exists for this in Vue/React either). */
  @Input() autoHeight = false;

  /**
   * The container's measured pixel width. Only meaningful as a direct
   * `@Input()` for standalone usage with no `GridEventBusService`
   * provided (e.g. Phase 1's own unit tests) — a real consumer nested
   * inside `<kdl-grid-layout>` gets this from the injected service
   * instead, and never needs to set it directly at all.
   */
  @Input() containerWidth = 0;
  /** Number of columns in the grid. Default `12`, matching Vue/React's own default. Same standalone-usage note as `containerWidth`. */
  @Input() colNum = 12;
  /** Height of one grid row, in pixels. Default `150`, matching Vue/React's own default. Same standalone-usage note as `containerWidth`. */
  @Input() rowHeight = 150;
  /** `[horizontal, vertical]` spacing between items, in pixels. Default `[10, 10]`, matching Vue/React's own default. Same standalone-usage note as `containerWidth`. */
  @Input() margin: [number, number] = [10, 10];
  /** Positions via CSS `transform: translate3d(...)` instead of `top`/`left`. Default `true`, matching Vue/React's own default. Same standalone-usage note as `containerWidth`. */
  @Input() useCssTransforms = true;
  /** Maximum number of rows the layout may grow to — only read by `calcXY`/`calcWH`'s own y-capping; not yet a real `@Input()`/eventBus-driven value beyond `Infinity`, matching Vue's own `maxRows` default. */
  @Input() maxRows = Infinity;

  @ViewChild(`nHandle`) private readonly nHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`sHandle`) private readonly sHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`eHandle`) private readonly eHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`wHandle`) private readonly wHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`neHandle`) private readonly neHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`nwHandle`) private readonly nwHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`seHandle`) private readonly seHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`swHandle`) private readonly swHandleRef?: ElementRef<HTMLElement>;
  @ViewChild(`autoHeightWrapper`) private readonly autoHeightWrapperRef?: ElementRef<HTMLElement>;

  style: ITransformStyle | ITopLeftStyle | ITopRightStyle | Record<string, string> = {};
  /** Whether a drag is currently in progress — drives the `kdl-grid-item--dragging` host class, matching Vue's own `vue-draggable-dragging` class. */
  isDragging = false;
  /** Current pixel position while dragging; `undefined` when not dragging — mirrors Vue's own `dragging` ref. */
  dragging: IDragPosition | undefined;
  /** Whether a resize is currently in progress — drives the `kdl-grid-item--resizing` host class, and blocks `handleDrag` from running concurrently, matching Vue's own `isResizing` ref. */
  isResizing = false;
  /** Current pixel position+size while resizing; `undefined` when not resizing — mirrors Vue's own `resizing` ref. */
  resizing: IResizingPosition | undefined;
  /** `resizeHandles` (this item's own, when set) or all 8, matching Vue's own per-item-override-else-default resolution — read by the template to decide which handle spans actually render. */
  resolvedResizeHandles: TResizeHandle[] = ALL_RESIZE_HANDLES;
  /** `multiSelect` support (Phase 7) — whether this item is part of `GridLayoutComponent`'s own current selection, cascaded via the eventBus's `selectedItemIds$`; always `false` with no eventBus present. */
  isSelected = false;
  /**
   * `isDraggable`/`isResizable`/`isBounded`/`isMirrored` resolved
   * against the grid-wide cascade (Phase 14, `GridEventBusService.
   * gridDefaults$`) — this item's own `@Input()` when it's not `null`,
   * else whatever the grid's own current default for that field is
   * (or the standalone-usage default in `latestGridDefaults` below,
   * with no eventBus present at all). `resolvedMaxRows` is different:
   * per `IGridDefaults`'s own doc comment, Vue's `GridItem` has no
   * per-item `maxRows` override of its own at all, so the grid's own
   * value always wins outright when an eventBus is present, falling
   * back to this item's own `maxRows` `@Input()` only when there
   * isn't one. `resolvedIsMirrored` is `public` (not merely internal)
   * specifically because the host `[class.kdl-grid-item--rtl]` binding
   * reads it directly — Angular's own template compiler can't reach a
   * `private` field.
   */
  resolvedIsBounded = false;
  resolvedIsDraggable = true;
  resolvedIsMirrored = false;
  resolvedIsResizable = true;
  resolvedMaxRows = Infinity;
  resolvedUseBorderRadius = false;
  resolvedBorderRadiusPx = 10;
  resolvedShowCloseButton = false;
  /**
   * `enableEditMode` resolved against the grid-wide cascade, same
   * pattern as `resolvedIsDraggable`/etc. above. Read by
   * `tabindexValue`/`isDraggableOrResizableAndNotStatic`/
   * `isDraggableAndNotStatic`/`isResizableAndNotStatic`, and the close
   * button's own template gate — see `IGridDefaults`'s own doc comment
   * on `enableEditMode` for the full list of what this does and
   * doesn't affect.
   */
  resolvedEnableEditMode = true;
  /**
   * Whether header content was actually projected (Phase 22) — set
   * once, in `ngAfterContentInit`, from `headerContentQuery`'s own
   * resolved presence. The Angular equivalent of Vue's own reactive
   * `!!$slots.header` check (`GridItem.vue`'s own `v-if="$slots.
   * header"`) — Angular's named `<ng-content select="...">`
   * projection has no built-in way to ask this from within the
   * component class itself, hence `GridItemHeaderDirective`'s own
   * existence purely as a queryable marker.
   */
  hasHeaderContent = false;
  @ContentChild(GridItemHeaderDirective) private readonly headerContentQuery: GridItemHeaderDirective | undefined;
  /**
   * Optional template for fully custom per-handle content (an icon, not
   * just a color) — rendered inside the same small hit-area
   * `showResizeHandles`/`resizeHandleColor` already use. Falls back to
   * the existing plain `<span>` markup (empty, styled only via CSS) when
   * not provided — every existing consumer's rendering is completely
   * unaffected. Matches Vue's own `#resize-handle` scoped slot / React's
   * own `renderResizeHandle` render prop, expressed as Angular's own
   * template-projection idiom (`<ng-template #resizeHandle let-edge>`
   * inside a `kdl-grid-item`'s own projected content). Queried by the
   * template reference variable name `resizeHandle`, not by directive
   * type, since a plain `<ng-template>` has no component/directive of
   * its own to match against.
   */
  @ContentChild('resizeHandle', { read: TemplateRef }) resizeHandleTemplate: TemplateRef<{ $implicit: TResizeHandle; edge: TResizeHandle }> | undefined;

  private lastX = NaN;
  private lastY = NaN;
  private lastW = NaN;
  private lastH = NaN;
  private activeEdges: IInteractEdges = NO_ACTIVE_EDGES;
  private transformScale = 1;
  /** Pixel width/height ratio captured at `resizestart`, used by `preserveAspectRatio` to derive one dimension from the other during `resizemove`. `undefined` when not resizing or the starting height was 0. */
  private aspectRatio: number | undefined;
  private autoHeightObserver: ResizeObserver | undefined;
  private nativeDraggable: { destroy: () => void } | undefined;
  private nativeResizable: { destroy: () => void } | undefined;
  private readonly autoScrollEngine: INativeAutoScroll = createNativeAutoScroll();
  /** The most recently received (or, absent any eventBus, standalone-usage-default) `IGridDefaults` snapshot — kept so `resolveGridDefaults()` can be re-run from `ngOnChanges` whenever this item's own `isDraggable`/`isResizable`/`isBounded`/`isMirrored`/`maxRows` change, without needing to wait for the grid's own next emission too. */
  private latestGridDefaults: IGridDefaults = { ariaLabels: {}, borderRadiusPx: 10, enableEditMode: true, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false };

  constructor(
    @Optional() private readonly eventBus: GridEventBusService | null,
    private readonly destroyRef: DestroyRef,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngAfterContentInit(): void {
    this.hasHeaderContent = !!this.headerContentQuery;
  }

  ngOnInit(): void {
    this.resolvedResizeHandles = this.resizeHandles ?? ALL_RESIZE_HANDLES;
    this.resolveGridDefaults();

    this.nativeDraggable = createNativeDraggable(
      this.elementRef.nativeElement,
      () => ({
        activationDistance: this.dragActivationDistance,
        allowFrom: this.dragAllowFrom,
        enabled: this.resolvedIsDraggable && !this.isStatic,
        ignoreFrom: this.dragIgnoreFrom,
      }),
      event => this.handleDrag(event),
    );

    if(!this.eventBus) {
      return;
    }
    combineLatest([
      this.eventBus.containerWidth$,
      this.eventBus.colNum$,
      this.eventBus.rowHeight$,
      this.eventBus.margin$,
      this.eventBus.useCssTransforms$,
      this.eventBus.transformScale$,
    ]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([containerWidth, colNum, rowHeight, margin, useCssTransforms, transformScale]) => {
      this.containerWidth = containerWidth;
      this.colNum = colNum;
      this.rowHeight = rowHeight;
      this.margin = margin;
      this.useCssTransforms = useCssTransforms;
      this.transformScale = transformScale;
      this.style = this.computeStyle();
      this.changeDetectorRef.markForCheck();
    });

    this.eventBus.selectedItemIds$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(selectedIds => {
      this.isSelected = selectedIds.has(this.i);
      this.changeDetectorRef.markForCheck();
    });

    this.eventBus.gridDefaults$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(defaults => {
      this.latestGridDefaults = defaults;
      this.resolveGridDefaults();
      this.style = this.computeStyle();
      // Required, not optional — this component is OnPush, and a
      // subscription-driven value change (as opposed to a bound
      // @Input() changing) does not itself mark the view dirty for
      // re-render. This exact class of bug bit this file twice already
      // (the autoHeight toggle test, the resizeHandles toggle test),
      // both traced to a missing markForCheck() call — see those two
      // tests' own history in grid-item.component.spec.ts before ever
      // considering this line removable.
      this.changeDetectorRef.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    const handles: Partial<Record<`e` | `n` | `ne` | `nw` | `s` | `se` | `sw` | `w`, HTMLElement>> = {};
    if(this.nHandleRef) {
      handles.n = this.nHandleRef.nativeElement;
    }
    if(this.sHandleRef) {
      handles.s = this.sHandleRef.nativeElement;
    }
    if(this.eHandleRef) {
      handles.e = this.eHandleRef.nativeElement;
    }
    if(this.wHandleRef) {
      handles.w = this.wHandleRef.nativeElement;
    }
    if(this.neHandleRef) {
      handles.ne = this.neHandleRef.nativeElement;
    }
    if(this.nwHandleRef) {
      handles.nw = this.nwHandleRef.nativeElement;
    }
    if(this.seHandleRef) {
      handles.se = this.seHandleRef.nativeElement;
    }
    if(this.swHandleRef) {
      handles.sw = this.swHandleRef.nativeElement;
    }

    this.nativeResizable = createNativeResizable(
      this.elementRef.nativeElement,
      handles,
      () => ({
        enabled: this.resolvedIsResizable && !this.isStatic,
        ignoreFrom: this.resizeIgnoreFrom,
      }),
      event => this.handleResize(event),
    );

    this.setupAutoHeight();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes[`resizeHandles`]) {
      this.resolvedResizeHandles = this.resizeHandles ?? ALL_RESIZE_HANDLES;
    }
    // Unconditional, not gated on changes['isDraggable']/etc. being
    // truthy — a real, confirmed bug found via two separate failing
    // tests, not a stylistic choice: this whole spec file's own
    // established setInputsAndDetectChanges helper always calls
    // ngOnChanges({} as SimpleChanges), an *empty* object (see this
    // file's own top-of-file doc comment on why), so a gated check here
    // never actually fires through that helper — not on the very first
    // call (ngOnChanges runs manually, before fixture.detectChanges()
    // ever triggers the real ngOnInit() where resolveGridDefaults()
    // otherwise first runs, leaving computeStyle() below reading stale,
    // default-initialized resolved fields) and not on any later call
    // either (an isResizable/isMirrored/etc. change made *after* the
    // initial render never re-triggers resolveGridDefaults() at all).
    // Matches this method's own already-established computeStyle()
    // call below, which recomputes unconditionally for the identical
    // reason.
    this.resolveGridDefaults();
    if(changes[`autoHeight`] && !changes[`autoHeight`].firstChange) {
      this.teardownAutoHeight();
      // Deferred to the next microtask, not called synchronously here:
      // `ngOnChanges` fires *before* the template re-renders for this
      // same change-detection pass, so the `@if (autoHeight)` wrapper
      // element (and so `autoHeightWrapperRef`, a ViewChild query
      // against it) doesn't exist yet at this exact point when
      // `autoHeight` has just flipped `false` -> `true`. By the next
      // microtask, Angular's own change detection for this pass has
      // already completed and the wrapper (if now present) is queryable.
      Promise.resolve().then(() => this.setupAutoHeight());
    }
    // Always recomputes, regardless of whether a GridEventBusService
    // is present — x/y/w/h/isMirrored/zIndex (this item's own state)
    // are always direct @Input()s either way, never sourced from the
    // eventBus, so a change to any of them still needs to trigger a
    // recompute here even when the eventBus subscription above is also
    // independently driving containerWidth/colNum/etc. Both paths call
    // the same computeStyle(), which reads whatever the current state
    // of every field is at call time — no conflict between the two
    // triggers.
    this.style = this.computeStyle();
  }

  ngOnDestroy(): void {
    this.nativeDraggable?.destroy();
    this.nativeResizable?.destroy();
    this.autoScrollEngine.stop();
    this.teardownAutoHeight();
  }

  /**
   * Resolves `resolvedIsDraggable`/`resolvedIsResizable`/
   * `resolvedIsBounded`/`resolvedIsMirrored`/`resolvedMaxRows` (Phase
   * 14) against `latestGridDefaults` — called once up front in
   * `ngOnInit` (using the standalone-usage defaults, before any real
   * `gridDefaults$` emission could have arrived yet), again every time
   * that subscription actually emits, and again from `ngOnChanges`
   * whenever this item's own `isDraggable`/`isResizable`/`isBounded`/
   * `isMirrored`/`maxRows` change — the resolved value depends on
   * *both* sides, so either one changing needs a re-resolve, not just
   * the grid's own emissions.
   */
  private resolveGridDefaults(): void {
    this.resolvedIsDraggable = this.isDraggable ?? this.latestGridDefaults.isDraggable;
    this.resolvedIsResizable = this.isResizable ?? this.latestGridDefaults.isResizable;
    this.resolvedIsBounded = this.isBounded ?? this.latestGridDefaults.isBounded;
    this.resolvedIsMirrored = this.isMirrored ?? this.latestGridDefaults.isMirrored;
    this.resolvedUseBorderRadius = this.useBorderRadius ?? this.latestGridDefaults.useBorderRadius;
    this.resolvedBorderRadiusPx = this.borderRadiusPx ?? this.latestGridDefaults.borderRadiusPx;
    this.resolvedShowCloseButton = this.showCloseButton ?? this.latestGridDefaults.showCloseButton;
    this.resolvedEnableEditMode = this.enableEditMode ?? this.latestGridDefaults.enableEditMode;
    // Grid-only, no per-item override — see IGridDefaults's own doc
    // comment on why this one field resolves differently from the
    // other four above (confirmed via a direct read of Vue's own
    // GridItem.vue, not assumed symmetric with the others).
    this.resolvedMaxRows = this.eventBus ? this.latestGridDefaults.maxRows : this.maxRows;
  }

  /** `multiSelect` support (Phase 7) — reports the click up to `GridLayoutComponent` via the eventBus, matching Vue's own `itemClickedHandler`. `stopPropagation()` is required, not optional: without it, the click also bubbles to `GridLayoutComponent`'s own host `(click)` binding (`handleBackgroundClick`), which would immediately clear the very selection this same click just set. A no-op with no eventBus present (standalone usage). */
  handleClick(event: MouseEvent): void {
    event.stopPropagation();
    this.eventBus?.emitItemClicked({
      ctrlKey: event.ctrlKey,
      i: this.i,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });
  }

  /**
   * Handles a click on the built-in close button (Phase 15) — a direct
   * port of Vue's own `closeClicked`, now including its own
   * `editModeEnabled.value` defensive check. `stopPropagation()` is
   * required for the identical reason `handleClick` above needs it:
   * without it, the click also bubbles to this item's own host
   * `(click)` binding (`handleClick` itself, since the button lives
   * inside this same host element), which would needlessly also
   * report an `itemClicked` eventBus message for what's actually a
   * removal, not a selection click.
   */
  handleCloseButtonClick(event: MouseEvent): void {
    event.stopPropagation();
    // Confirmed unreachable through the button's own click, matching
    // Vue's own doc comment on this identical guard: the template's
    // own @if already excludes resolvedEnableEditMode:false from ever
    // rendering the button at all, so this can't fire false via a real
    // click. Kept as a defensive guard anyway, since this method has no
    // other call path to double-check that against directly (matching
    // Vue's own reasoning for keeping its own identical check).
    /* istanbul ignore next -- see the comment above: unreachable via the button's own click, since the template's own @if already excludes resolvedEnableEditMode:false from rendering the button at all. */
    if(!this.resolvedEnableEditMode) {
      return;
    }
    this.removeItem.emit(this.i);
  }

  /**
   * `0` when this item is genuinely operable via keyboard at all
   * (draggable or resizable, not static, and edit mode is on) —
   * `null` otherwise, which `[attr.tabindex]` then removes the
   * attribute entirely rather than setting it to a literal `"null"`
   * string. A direct port of Vue's own `draggableOrResizableAndNotStatic`
   * (`GridItem.vue`, its own `:tabindex` binding), now including its
   * own `editModeEnabled.value` factor — a TODO this doc comment used
   * to flag is now closed.
   *
   * A real, pre-existing gap this port had, discovered while starting
   * Phase 16 (keyboard-driven move/resize): no `tabindex` binding of any
   * kind existed on this component before now, despite `GridLayoutComponent`'s
   * own doc comment (`scrollToItem`/`focusItem`) already claiming
   * draggable/resizable/non-static items "get tabindex='0' via
   * GridItemComponent's own host bindings" — confirmed via a direct grep
   * of this file turning up zero matches for `tabindex` anywhere at all.
   * That comment describes what this method now actually does, not what
   * it always did; `focusItem()` calling `.focus()` on a genuinely
   * non-focusable custom element was a real, silent no-op in any actual
   * browser this whole time, whatever jsdom's own tests happened to
   * tolerate.
   */
  get tabindexValue(): number | null {
    return (this.resolvedIsDraggable || this.resolvedIsResizable) && !this.isStatic && this.resolvedEnableEditMode ? 0 : null;
  }

  /** `true` when this item is draggable or resizable (or both), not static, and edit mode is on — a direct port of Vue's own `draggableOrResizableAndNotStatic` computed, now including its own `editModeEnabled.value` factor (the TODO `tabindexValue`'s own doc comment used to flag is closed). Drives whether `role="group"`/`aria-roledescription`/`aria-describedby` apply to the host, and whether the keyboard-instructions span renders at all. */
  get isDraggableOrResizableAndNotStatic(): boolean {
    return (this.resolvedIsDraggable || this.resolvedIsResizable) && !this.isStatic && this.resolvedEnableEditMode;
  }

  /** `true` when this item is draggable, not static, and edit mode is on — gates whether `resolvedAriaLabels.moveInstruction` is included in the keyboard-instructions span, matching Vue's own `draggableAndNotStatic`. */
  get isDraggableAndNotStatic(): boolean {
    return this.resolvedIsDraggable && !this.isStatic && this.resolvedEnableEditMode;
  }

  /** `true` when this item is resizable, not static, and edit mode is on — gates whether `resolvedAriaLabels.resizeInstruction` is included in the keyboard-instructions span, matching Vue's own `resizableAndNotStatic`. */
  get isResizableAndNotStatic(): boolean {
    return this.resolvedIsResizable && !this.isStatic && this.resolvedEnableEditMode;
  }

  /**
   * The close button's own label, `aria-roledescription`, and the two
   * keyboard-instruction strings, merged from built-in English defaults
   * <- the grid-wide `ariaLabels` cascaded via `IGridDefaults` <- this
   * item's own `ariaLabels` — a direct port of Vue's own
   * `resolvedAriaLabels` computed, using `core`'s own `resolveAriaLabels`
   * (a public export, confirmed via a direct read of `core`'s own
   * `index.ts`) rather than reimplementing the merge. A getter
   * (re-evaluated on every read), not a cached/resolved field the way
   * the other seven `IGridDefaults`-backed values on this class are —
   * matching Vue's own choice here specifically: see `IGridDefaults`'s
   * own doc comment on `ariaLabels` for why this one field doesn't need
   * the same eventBus-driven re-resolution the boolean/numeric ones do.
   */
  get resolvedAriaLabels(): Required<IGridAriaLabels> {
    return resolveAriaLabels(this.latestGridDefaults.ariaLabels, this.ariaLabels);
  }

  /**
   * A stable, per-item id for the `aria-describedby`/`id` pairing
   * between the host and the keyboard-instructions span below — `this.
   * i` is already guaranteed unique within a single grid (layout items
   * always have unique ids), so reusing it directly avoids needing a
   * separate generated-uid mechanism the way Vue's own `uid` (a Vue-
   * internal component instance id) provides for free there.
   */
  get instructionsId(): string {
    return `kdl-grid-item-${this.i}-instructions`;
  }

  /**
   * Keyboard-operable alternative to mouse/touch-driven dragging/
   * resizing — a direct port of Vue's own `useGridItemKeyboard.ts`
   * `handleKeydown` (see that file's own doc comment for the full
   * rationale, including why this is deliberately scoped to
   * single-grid-unit arrow-key steps rather than a full WAI-ARIA
   * grid/application widget pattern). No-ops — and doesn't call
   * `preventDefault()` — for any key other than a plain or
   * Shift-modified arrow key, and for Ctrl/Alt/Meta+Arrow specifically
   * (OS/browser/assistive-technology shortcuts commonly use those
   * modifiers alongside an arrow key — virtual desktop switching,
   * screen-reader navigation, etc. — and this must never intercept
   * them). Arrow keys move by one grid unit if draggable; Shift+arrow
   * resizes by one grid unit if resizable. RTL-aware: `ArrowLeft`/
   * `ArrowRight` are physical directions, and `resolvedIsMirrored`
   * flips the horizontal delta so the key pressed always matches the
   * direction the item visually moves, regardless of render direction
   * (same property `calcResizePosition`'s own RTL math aims for
   * elsewhere in this file).
   */
  handleKeydown(event: KeyboardEvent): void {
    if(this.isStatic) {
      return;
    }
    if(event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const deltas: Record<string, [number, number]> = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    };
    const delta = deltas[event.key];
    if(!delta) {
      return;
    }

    const [rawDx, dy] = delta;
    const dx = this.resolvedIsMirrored ? -rawDx : rawDx;

    if(event.shiftKey) {
      if(!this.resolvedIsResizable) {
        return;
      }
      event.preventDefault();
      this.resizeByKeyboard(dx, dy);
    } else {
      if(!this.resolvedIsDraggable) {
        return;
      }
      event.preventDefault();
      this.moveByKeyboard(dx, dy);
    }
  }

  /**
   * Each keypress is treated as a single, atomic, already-"ended"
   * gesture — there's no keyboard equivalent of a continuous drag to
   * preview mid-way through — so this emits a synthetic `dragstart`
   * (at the *pre-move* position) immediately followed by `dragend` (at
   * the new one), the same `IItemDragEvent` pair a real mouse/touch
   * drag's own start-to-end round trip produces. A direct port of
   * Vue's own `moveBy`, including its own documented bug fix: an
   * earlier version emitted only a synthetic `dragend`, skipping
   * `dragstart` entirely — `GridLayoutComponent`'s own `multiSelect`
   * group-move logic snapshots every other selected item's position on
   * `dragstart` specifically, so without one, a keyboard-driven move of
   * a selected item never moved the rest of the selection along with
   * it, only a real mouse/touch drag did.
   *
   * `clientX`/`clientY` are set to `0` — there's no real pointer
   * position for a keyboard-originated move, and `IItemDragEvent`'s own
   * fields are both required, non-nullable `number`s (see
   * `handleCrossGridDragEnd`'s own doc comment on this same
   * requirement). The only place these two fields are actually read
   * downstream is `allowCrossGridDrag`'s own drop-point lookup at
   * `dragend` — meaningless for a keyboard-driven move in the first
   * place (there's no drop *point* at all, just a grid-unit delta), so
   * a fixed placeholder here is a deliberate, harmless simplification,
   * not an oversight.
   */
  private moveByKeyboard(dx: number, dy: number): void {
    const x = Math.max(Math.min(this.x + dx, this.colNum - this.w), 0);
    const y = Math.max(Math.min(this.y + dy, this.resolvedMaxRows - this.h), 0);
    if(x === this.x && y === this.y) {
      return;
    }

    this.eventBus?.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: this.h, i: this.i, w: this.w, x: this.x, y: this.y });
    this.eventBus?.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: this.h, i: this.i, w: this.w, x, y });
  }

  /** Same synthetic-start-then-end rationale as `moveByKeyboard` above, for resize — so `multiSelect` group-resize also engages correctly for a keyboard-driven resize, not just a mouse/touch one. A direct port of Vue's own `resizeBy`. */
  private resizeByKeyboard(dw: number, dh: number): void {
    let w = this.w + dw;
    let h = this.h + dh;
    w = Math.max(Math.min(w, this.colNum - this.x, this.maxW), this.minW);
    h = Math.max(Math.min(h, this.resolvedMaxRows - this.y, this.maxH), this.minH);
    if(w === this.w && h === this.h) {
      return;
    }

    this.eventBus?.emitItemResize({ eventType: `resizestart`, h: this.h, i: this.i, w: this.w, x: this.x, y: this.y });
    this.eventBus?.emitItemResize({ eventType: `resizeend`, h, i: this.i, w, x: this.x, y: this.y });
  }

  /** `zIndex`/`showResizeHandles`/`resizeHandleColor`, applied as an inline style on the projected `<div>` (not the host) so they combine cleanly with `style` (position/size) via `NgStyle`'s own object-merge, matching how Vue applies every one of these as part of the same single `:style` binding. */
  get hostStyle(): Record<string, string | number> {
    const merged: Record<string, string | number> = { ...this.style };
    if(this.zIndex !== null) {
      merged[`z-index`] = this.zIndex;
    }
    if(this.showResizeHandles === true) {
      merged[`--kdl-resize-handle-color`] = this.resizeHandleColor ?? `rgb(94 94 94 / 45%)`;
    } else if(this.showResizeHandles === false) {
      merged[`--kdl-resize-handle-color`] = `transparent`;
    }
    // Phase 19, ported from Vue's own borderRadiusStyle computed
    // (GridItem.vue) exactly, inset formula included: only applies an
    // actual border-radius style when resolvedUseBorderRadius is true,
    // but --kdl-close-button-inset is set unconditionally either way (a
    // fixed 4px baseline when useBorderRadius is off, growing with the
    // radius otherwise) — read by the close button's own position
    // (Phase 15) instead of a hardcoded 4px, so the button clears a
    // large radius's own visible curve rather than sitting on top of
    // it. The formula itself (R × (1 - cos45°), i.e. R × ~0.293, on top
    // of the 4px baseline, capped at 24px so an extreme radius can't
    // push the button off a small item entirely) is Vue's own, not
    // re-derived here — confirmed via a direct source read of that
    // computed's own doc comment, not reconstructed from a paraphrase.
    if(this.resolvedUseBorderRadius) {
      merged[`border-radius`] = `${this.resolvedBorderRadiusPx}px`;
      merged[`--kdl-close-button-inset`] = `${Math.min(4 + Math.round(this.resolvedBorderRadiusPx * 0.293), 24)}px`;
    } else {
      merged[`--kdl-close-button-inset`] = `4px`;
    }
    return merged;
  }

  /**
   * Translate x and y coordinates from pixels to grid units — a direct
   * port of Vue's own `useGridItemDrag.ts` `calcXY`, including its own
   * capping (an item can't be dragged past the grid's own right/bottom
   * bound).
   */
  private calcXY(top: number, left: number): ICalcXy {
    const colWidth = calcColWidth(this.containerWidth, this.margin[0], this.colNum);

    let x = Math.round((left - this.margin[0]) / (colWidth + this.margin[0]));
    let y = Math.round((top - this.margin[1]) / (this.rowHeight + this.margin[1]));

    x = Math.max(Math.min(x, this.colNum - this.w), 0);
    y = Math.max(Math.min(y, this.resolvedMaxRows - this.h), 0);

    return { x, y };
  }

  /**
   * Convert grid-unit x/y/w/h into pixel position+size — a direct
   * (RTL-aware since Phase 7 — see this class's own doc comment) port
   * of Vue's own `useGridItemResize.ts` `calcPosition`, used to seed
   * `resizing`'s own starting state at `resizestart`.
   */
  private calcResizePosition(x: number, y: number, w: number, h: number): IResizingPosition {
    const colWidth = calcColWidth(this.containerWidth, this.margin[0], this.colNum);
    const height = h === Infinity ? h : Math.round(this.rowHeight * h + Math.max(0, h - 1) * this.margin[1]);
    const width = w === Infinity ? w : Math.round(colWidth * w + Math.max(0, w - 1) * this.margin[0]);
    const top = Math.round(this.rowHeight * y + (y + 1) * this.margin[1]);
    if(this.resolvedIsMirrored) {
      // Mirrors the RTL anchor Vue's own calcPosition uses: `right`,
      // measured as the number of columns *after* the item's own right
      // edge to the container's own right edge.
      const right = Math.round(colWidth * (this.colNum - x - w) + (this.colNum - x - w + 1) * this.margin[0]);
      return { height, right, top, width };
    }
    const left = Math.round(colWidth * x + (x + 1) * this.margin[0]);
    return { height, left, top, width };
  }

  /** Convert a pixel height/width into grid units — a direct port of Vue's own `useGridItemResize.ts` `calcWH`, including its own capping. `autoSizeFlag` (default `false`) rounds height *up* rather than to the nearest unit — `autoHeight`'s own `autoSize()` passes `true`, so growing content is never clipped by rounding down. */
  private calcWH(height: number, width: number, autoSizeFlag = false): ICalcWh {
    const colWidth = calcColWidth(this.containerWidth, this.margin[0], this.colNum);

    let w = Math.round((width + this.margin[0]) / (colWidth + this.margin[0]));
    let h = autoSizeFlag
      ? Math.ceil((height + this.margin[1]) / (this.rowHeight + this.margin[1]))
      : Math.round((height + this.margin[1]) / (this.rowHeight + this.margin[1]));

    w = Math.max(Math.min(w, this.colNum - this.x), 0);
    h = Math.max(Math.min(h, this.resolvedMaxRows - this.y), 0);
    return { h, w };
  }

  /** Convert a new left-edge pixel position to a grid-unit x, capped so the item (at its new width `newW`) can't be pushed past the grid's own right edge — a direct port of Vue's own `useGridItemResize.ts` `pixelsToGridX`. */
  private pixelsToGridX(leftPx: number, newW: number): number {
    const colWidth = calcColWidth(this.containerWidth, this.margin[0], this.colNum);
    let gridX = Math.round((leftPx - this.margin[0]) / (colWidth + this.margin[0]));
    gridX = Math.max(Math.min(gridX, this.colNum - newW), 0);
    return gridX;
  }

  /** Top-edge counterpart to `pixelsToGridX` — a direct port of Vue's own `useGridItemResize.ts` `pixelsToGridY`. */
  private pixelsToGridY(topPx: number, newH: number): number {
    let gridY = Math.round((topPx - this.margin[1]) / (this.rowHeight + this.margin[1]));
    gridY = Math.max(Math.min(gridY, this.resolvedMaxRows - newH), 0);
    return gridY;
  }

  /**
   * Backing implementation for `autoHeight` — a `ResizeObserver` on the
   * dedicated wrapper element around the projected content (only
   * rendered in the template when `autoHeight` is on), calling
   * `autoSize()` whenever it actually changes size. A direct port of
   * Vue's own `setupAutoHeight`, using a real element reference
   * (`autoHeightWrapperRef`) throughout rather than any
   * content-projection-based lookup — Angular's own `<ng-content>`
   * doesn't expose the projected nodes' own elements the way Vue's
   * `slots.default()` attempts to (and, per that file's own doc
   * comment, unreliably) for a manually-invoked call.
   */
  private setupAutoHeight(): void {
    if(!this.autoHeight || typeof ResizeObserver === `undefined` || !this.autoHeightWrapperRef) {
      return;
    }
    this.autoHeightObserver = new ResizeObserver(() => {
      this.autoSize();
    });
    this.autoHeightObserver.observe(this.autoHeightWrapperRef.nativeElement);
  }

  private teardownAutoHeight(): void {
    this.autoHeightObserver?.disconnect();
    this.autoHeightObserver = undefined;
  }

  /**
   * Measures the `autoHeight` wrapper's own current size and, if it
   * resolves to a genuinely different grid-unit w/h than this item's
   * own current `w`/`h`, reports a synthetic `resizeend`-equivalent
   * tick via the eventBus directly — the same effect a real resize
   * gesture ending at that size would have, without an actual pointer
   * gesture ever happening. A direct port of Vue's own `autoSize()`,
   * minus its own component-local `RESIZE`/`RESIZED` events (see this
   * class's own doc comment on why those aren't ported here).
   */
  private autoSize(): void {
    if(!this.autoHeightWrapperRef) {
      return;
    }
    const rect = this.autoHeightWrapperRef.nativeElement.getBoundingClientRect();
    const pos = this.calcWH(rect.height, rect.width, true);
    if(pos.w < this.minW) {
      pos.w = this.minW;
    }
    if(pos.w > this.maxW) {
      pos.w = this.maxW;
    }
    if(pos.h < this.minH) {
      pos.h = this.minH;
    }
    if(pos.h > this.maxH) {
      pos.h = this.maxH;
    }
    // Confirmed unreachable, not assumed — matching this project's own
    // established precedent for the identical case elsewhere (Vue's own
    // autoSize() flags this exact branch the same way): calcWH's own
    // autoSizeFlag height conversion uses Math.ceil, which rounds any
    // non-negative height up to at least 1 grid unit on its own, before
    // this check ever runs — a real getBoundingClientRect() never
    // reports a negative height, so pos.h can never actually reach here
    // below 1. Left as a documented, understood gap rather than forced
    // with a manufactured negative-height double.
    /* istanbul ignore next -- see the comment above: Math.ceil already floors height to >=1 whenever it's non-negative, which a real getBoundingClientRect() always is. */
    if(pos.h < 1) {
      pos.h = 1;
    }
    if(pos.w < 1) {
      pos.w = 1;
    }

    if(this.w !== pos.w || this.h !== pos.h) {
      this.eventBus?.emitItemResize({ eventType: `resizeend`, h: pos.h, i: this.i, w: pos.w, x: this.x, y: this.y });
    }
  }

  /**
   * The native drag engine's `dragstart`/`dragmove`/`dragend` handler —
   * a direct port of Vue's own `useGridItemDrag.ts` `handleDrag`, now
   * RTL-aware (Phase 7): a mirrored item's own live pixel position is
   * tracked via `right` (distance from the container's own right edge)
   * instead of `left`, matching Vue's own `dragging.value.left` (which,
   * confusingly, Vue itself always calls `left` even in RTL — this
   * port instead uses a distinct `right` field for clarity, since
   * `computeStyle()` below already needs to branch on which one is
   * actually populated).
   */
  private handleDrag(event: INativeDragEvent): void {
    if(this.isStatic || this.isResizing) {
      return;
    }

    const position = offsetXYFromParentOf(event);
    const { x, y } = position;
    const newPosition: IDragPosition = { top: 0 };

    switch(event.type) {
      case `dragstart`: {
        const target = event.target;
        const parentTarget = target.offsetParent as HTMLElement;
        const parentRect = parentTarget.getBoundingClientRect();
        const clientRect = target.getBoundingClientRect();
        if(this.resolvedIsMirrored) {
          newPosition.right = (clientRect.right - parentRect.right) * -1;
        } else {
          newPosition.left = clientRect.left - parentRect.left;
        }
        newPosition.top = clientRect.top - parentRect.top;
        this.dragging = newPosition;
        this.isDragging = true;
        if(this.autoScroll) {
          this.autoScrollEngine.start(target);
        }
        break;
      }
      case `dragend`: {
        if(!this.isDragging) {
          return;
        }
        // Bug fix (ported from Vue's own useGridItemDrag.ts, docs/
        // REFACTORING.md #41 there): reusing `dragging`'s own
        // already-accumulated position here, rather than re-deriving
        // it from a fresh getBoundingClientRect() read, avoids a race
        // between however many dragmove ticks already ran
        // synchronously and Angular's own (asynchronous) rendering of
        // the resulting style.
        if(this.resolvedIsMirrored) {
          newPosition.right = Number(this.dragging?.right);
        } else {
          newPosition.left = Number(this.dragging?.left);
        }
        newPosition.top = Number(this.dragging?.top);
        this.dragging = undefined;
        this.isDragging = false;
        this.autoScrollEngine.stop();
        break;
      }
      case `dragmove`: {
        const coreEvent = createCoreData(this.lastX, this.lastY, x, y);
        const scaledDeltaX = coreEvent.deltaX / this.transformScale;
        const scaledDeltaY = coreEvent.deltaY / this.transformScale;
        if(this.resolvedIsMirrored) {
          newPosition.right = Number(this.dragging?.right) - scaledDeltaX;
        } else {
          newPosition.left = Number(this.dragging?.left) + scaledDeltaX;
        }
        newPosition.top = Number(this.dragging?.top) + scaledDeltaY;
        if(this.resolvedIsBounded) {
          const target = event.target;
          const parentTarget = target.offsetParent as HTMLElement;
          const bottomBoundary = parentTarget.clientHeight - calcGridItemWH(this.h, this.rowHeight, this.margin[1]);
          newPosition.top = clamp(newPosition.top, 0, bottomBoundary);
          const colWidth = calcColWidth(this.containerWidth, this.margin[0], this.colNum);
          const rightBoundary = this.containerWidth - calcGridItemWH(this.w, colWidth, this.margin[0]);
          if(this.resolvedIsMirrored && newPosition.right !== undefined) {
            newPosition.right = clamp(newPosition.right, 0, rightBoundary);
          } else if(newPosition.left !== undefined) {
            newPosition.left = clamp(newPosition.left, 0, rightBoundary);
          }
        }
        this.dragging = newPosition;
        if(this.autoScroll) {
          this.autoScrollEngine.update(event.clientX, event.clientY);
        }
        break;
      }
      // Confirmed unreachable, not assumed: event.type's own type
      // (INativeDragEvent) is a closed union of exactly dragstart/
      // dragmove/dragend, and native-interaction.ts's own pointerdown
      // handler only ever constructs one of those three literal
      // strings before calling this handler at all — there is no call
      // path that reaches this switch with any fourth value.
      /* istanbul ignore next -- see the comment above: unreachable since event.type can never be a fourth value the native handler would forward. */
      default: {
        return;
      }
    }

    // Convert whichever of left/right is currently populated back to a
    // plain "distance from the left edge" pixel value for calcXY's own
    // (LTR-only) math — RTL's own x-from-right conversion mirrors
    // Vue's own calcXY, which likewise always resolves to a plain left
    // distance internally regardless of render direction.
    const leftForCalc = this.resolvedIsMirrored
      ? this.containerWidth - Number(newPosition.right) - calcGridItemWH(this.w, calcColWidth(this.containerWidth, this.margin[0], this.colNum), this.margin[0])
      : Number(newPosition.left);
    const pos = this.calcXY(newPosition.top, leftForCalc);
    this.lastX = x;
    this.lastY = y;

    this.style = this.computeStyle();
    this.changeDetectorRef.markForCheck();

    if(event.type === `dragend`) {
      this.itemMoved.emit({ i: this.i, x: pos.x, y: pos.y });
    }

    this.eventBus?.emitItemDrag({
      clientX: event.clientX,
      clientY: event.clientY,
      eventType: event.type,
      h: this.h,
      i: this.i,
      w: this.w,
      x: pos.x,
      y: pos.y,
    });
  }

  /**
   * The native resize engine's `resizestart`/`resizemove`/`resizeend`
   * handler — a direct (non-`preserveAspectRatio`, non-`autoScroll`-
   * during-resize — see this class's own doc comment) port of Vue's
   * own `useGridItemResize.ts` `handleResize`, RTL-aware since Phase 7
   * for the left/right anchor specifically.
   */
  private handleResize(event: INativeResizeEvent): void {
    if(this.isStatic) {
      return;
    }

    const position = offsetXYFromParentOf(event);
    const { x, y } = position;
    const newSize: { height: number; horizontal?: number; top?: number; width: number } = { height: 0, width: 0 };

    switch(event.type) {
      case `resizestart`: {
        const pos = this.calcResizePosition(this.x, this.y, this.w, this.h);
        this.resizing = { ...pos };
        this.isResizing = true;
        this.activeEdges = event.edges;
        // Confirmed unreachable, not assumed — discovered while trying to
        // write a test for the false branch here and hitting a real,
        // immediate throw instead (`calcGridItemWH`'s own validation
        // rejects any `h <= 0` outright as `INVALID_GRID_UNITS`, well
        // before this line could ever run with such a value). Every
        // valid layout item's own `h` is therefore always >= 1, and
        // `calcResizePosition`'s own height formula (`rowHeight * h +
        // ...`, with `rowHeight` itself always positive) can consequently
        // never resolve to <= 0 for any real, non-throwing item — the
        // `: undefined` side of this ternary cannot be reached without
        // first constructing an already-invalid item, the same class of
        // confirmed-unreachable case this file's own `autoSize()` already
        // documents for its own height-floor check.
        /* istanbul ignore next -- see the comment above: pos.height can never be <=0 for a valid (h >= 1) item, since calcGridItemWH itself already rejects h<=0 before this could run with such a value. */
        this.aspectRatio = pos.height > 0 ? pos.width / pos.height : undefined;
        this.lastW = x;
        this.lastH = y;
        this.style = this.computeStyle();
        this.changeDetectorRef.markForCheck();
        this.eventBus?.emitItemResize({ eventType: `resizestart`, h: this.h, i: this.i, w: this.w, x: this.x, y: this.y });
        return;
      }
      case `resizemove`: {
        const coreEvent = createCoreData(this.lastW, this.lastH, x, y);
        const dx = coreEvent.deltaX;
        const dy = coreEvent.deltaY;

        const prevAnchor = this.resolvedIsMirrored ? Number(this.resizing?.right) : Number(this.resizing?.left);
        const prevTop = Number(this.resizing?.top);
        const prevWidth = Number(this.resizing?.width);
        const prevHeight = Number(this.resizing?.height);

        newSize.width = prevWidth;
        newSize.height = prevHeight;
        newSize.horizontal = prevAnchor;
        newSize.top = prevTop;

        // RTL note: this sign/edge-swap logic is ported by direct
        // analogy with the LTR case below, not verified against a real
        // browser (Vue's own equivalent test file flags its own RTL
        // resize handling the same way — "best-effort, not exhaustively
        // verified" — for the identical reason: the anchor/grow-edge
        // swap plus the sign of each delta is easy to get subtly wrong
        // and hard to verify by inspection alone).
        if(this.resolvedIsMirrored) {
          // In RTL, the left edge grows width without moving the
          // (right-measured) anchor; the right edge is what moves it.
          if(this.activeEdges.left) {
            newSize.width = prevWidth - dx;
          }
          if(this.activeEdges.right) {
            newSize.width = prevWidth + dx;
            newSize.horizontal = prevAnchor - dx;
          }
        } else {
          if(this.activeEdges.right) {
            newSize.width = prevWidth + dx;
          }
          if(this.activeEdges.left) {
            newSize.width = prevWidth - dx;
            newSize.horizontal = prevAnchor + dx;
          }
        }
        if(this.activeEdges.bottom) {
          newSize.height = prevHeight + dy;
        }
        if(this.activeEdges.top) {
          newSize.height = prevHeight - dy;
          newSize.top = prevTop + dy;
        }

        // preserveAspectRatio (Phase 11) — ported line-for-line from
        // Vue's own identical logic. Derives whichever dimension isn't
        // directly driven by the edge(s) active in this gesture from
        // the one that is, using the ratio captured at resizestart. A
        // single horizontal-only or vertical-only edge derives the
        // other dimension outright (no anchor adjustment needed, since
        // the undriven dimension's own anchor was never touched above);
        // a corner (both a horizontal and a vertical edge active)
        // derives height from width and, if the top edge is part of
        // this gesture, adjusts `top` by exactly the resulting height
        // delta — the same anchor-compensation `activeEdges.top`
        // already does for a direct height change above, just applied
        // to the derived one instead.
        if(this.preserveAspectRatio && this.aspectRatio) {
          const drivingWidth = this.activeEdges.left || this.activeEdges.right;
          const drivingHeight = this.activeEdges.top || this.activeEdges.bottom;
          if(drivingWidth && !drivingHeight) {
            newSize.height = newSize.width / this.aspectRatio;
          } else if(drivingHeight && !drivingWidth) {
            newSize.width = newSize.height * this.aspectRatio;
          } else if(drivingWidth && drivingHeight) {
            const derivedHeight = newSize.width / this.aspectRatio;
            if(this.activeEdges.top) {
              newSize.top = prevTop + (prevHeight - derivedHeight);
            }
            newSize.height = derivedHeight;
          }
        }

        this.resizing = this.resolvedIsMirrored
          ? { height: newSize.height, right: Number(newSize.horizontal), top: Number(newSize.top), width: newSize.width }
          : { height: newSize.height, left: Number(newSize.horizontal), top: Number(newSize.top), width: newSize.width };
        break;
      }
      case `resizeend`: {
        if(!this.isResizing) {
          return;
        }
        newSize.width = Number(this.resizing?.width);
        newSize.height = Number(this.resizing?.height);
        newSize.top = Number(this.resizing?.top);
        newSize.horizontal = this.resolvedIsMirrored ? Number(this.resizing?.right) : Number(this.resizing?.left);
        this.resizing = undefined;
        this.isResizing = false;
        this.aspectRatio = undefined;
        break;
      }
      // Confirmed unreachable, not assumed: event.type's own type
      // (INativeResizeEvent) is a closed union of exactly resizestart/
      // resizemove/resizeend, and native-interaction.ts's own
      // pointerdown handler only ever constructs one of those three
      // literal strings before calling this handler at all — there is
      // no call path that reaches this switch with any fourth value.
      /* istanbul ignore next -- see the comment above: unreachable since event.type can never be a fourth value the native handler would forward. */
      default: {
        return;
      }
    }

    const pos = this.calcWH(newSize.height, newSize.width);
    if(pos.w < this.minW) {
      pos.w = this.minW;
    }
    if(pos.w > this.maxW) {
      pos.w = this.maxW;
    }
    if(pos.h < this.minH) {
      pos.h = this.minH;
    }
    if(pos.h > this.maxH) {
      pos.h = this.maxH;
    }
    if(pos.h < 1) {
      pos.h = 1;
    }
    if(pos.w < 1) {
      pos.w = 1;
    }

    let newX = this.x;
    let newY = this.y;
    const anchorEdgeActive = this.resolvedIsMirrored ? this.activeEdges.right : this.activeEdges.left;
    if(anchorEdgeActive && newSize.horizontal !== undefined) {
      const anchorGridX = this.pixelsToGridX(newSize.horizontal, pos.w);
      newX = this.resolvedIsMirrored ? this.colNum - anchorGridX - pos.w : anchorGridX;
    }
    if(this.activeEdges.top && newSize.top !== undefined) {
      newY = this.pixelsToGridY(newSize.top, pos.h);
    }

    this.lastW = x;
    this.lastH = y;

    this.style = this.computeStyle();
    this.changeDetectorRef.markForCheck();

    if(event.type === `resizeend`) {
      this.itemResized.emit({ h: pos.h, height: newSize.height, i: this.i, w: pos.w, width: newSize.width });
    }

    this.eventBus?.emitItemResize({
      eventType: event.type,
      h: pos.h,
      i: this.i,
      w: pos.w,
      x: newX,
      y: newY,
    });
  }

  private computeStyle(): ITransformStyle | ITopLeftStyle | ITopRightStyle | Record<string, string> {
    // Guarded the same way Vue's/React's own equivalent calculation is
    // — `calcColWidth` throws on an unmeasured/zero container width,
    // which every instance of this component starts out as before its
    // own first real measurement arrives.
    if(!Number.isFinite(this.containerWidth) || this.containerWidth < 1) {
      return {};
    }

    let left: number | undefined;
    let right: number | undefined;
    let top: number;
    let width: number;
    let height: number;

    if(this.isResizing && this.resizing) {
      // While actively resizing, `resizing`'s own accumulated pixel
      // position+size overrides the grid-unit-derived ones entirely —
      // the item tracks the pointer smoothly, rather than snapping to
      // whichever grid cell boundary it's currently nearest, matching
      // Vue's own `createStyle()`.
      ({ left, right, top, width, height } = this.resizing);
    } else {
      const [marginH, marginV] = this.margin;
      const colWidth = calcColWidth(this.containerWidth, marginH, this.colNum);
      width = calcGridItemWH(this.w, colWidth, marginH);
      height = calcGridItemWH(this.h, this.rowHeight, marginV);

      if(this.isDragging && this.dragging) {
        // isBounded's own clamping already happened inside handleDrag's
        // own dragmove case, before dragging is ever assigned — the
        // value read here is already clamped when isBounded is true, no
        // further adjustment needed at render time.
        left = this.dragging.left;
        right = this.dragging.right;
        top = this.dragging.top;
      } else if(this.resolvedIsMirrored) {
        right = Math.round(colWidth * (this.colNum - this.x - this.w) + (this.colNum - this.x - this.w + 1) * marginH);
        top = Math.round(this.rowHeight * this.y + (this.y + 1) * marginV);
      } else {
        left = Math.round(colWidth * this.x + (this.x + 1) * marginH);
        top = Math.round(this.rowHeight * this.y + (this.y + 1) * marginV);
      }
    }

    if(this.useCssTransforms) {
      return this.resolvedIsMirrored && right !== undefined
        ? setTransformRtl(top, right, width, height)
        : setTransform(top, Number(left), width, height);
    }
    return this.resolvedIsMirrored && right !== undefined
      ? setTopRight(top, right, width, height)
      : setTopLeft(top, Number(left), width, height);
  }
}
