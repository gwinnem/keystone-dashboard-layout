import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import type { IGridAriaLabels } from 'keystone-dashboard-layout-core';

/** Phase 3's own bottom-up channel — the Angular equivalent of Vue's `dragEvent` eventBus message, reported by a `GridItemComponent` on every drag tick and consumed by its parent `GridLayoutComponent` to resolve collisions and commit the new layout. */
export interface IItemDragEvent {
  clientX: number;
  clientY: number;
  eventType: `dragstart` | `dragmove` | `dragend`;
  h: number;
  i: string | number;
  w: number;
  x: number;
  y: number;
}

/** Phase 4's own bottom-up channel — the Angular equivalent of Vue's `resizeEvent` eventBus message, reported by a `GridItemComponent` on every resize tick and consumed by its parent `GridLayoutComponent` to commit the new size (and, for a left/top-edge resize, position) into the layout. */
export interface IItemResizeEvent {
  eventType: `resizestart` | `resizemove` | `resizeend`;
  h: number;
  i: string | number;
  w: number;
  x: number;
  y: number;
}

/** A `GridItemComponent`'s own reported click, for `multiSelect` (Phase 7) — the Angular equivalent of Vue's own `itemClicked` eventBus message. */
export interface IItemClickedEvent {
  ctrlKey: boolean;
  i: string | number;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * Phase 14's own cascade of grid-wide *behavioral* defaults down to
 * every descendant `GridItemComponent` — the Angular equivalent of
 * Vue's own `thisLayout?.propName` reads (`GridItem.vue` reaching into
 * its `$parent`'s exposed props directly). Deliberately a single
 * object/subject, not one `BehaviorSubject` per field: `GridItemComponent`
 * needs to react to *any* of these changing, and one subscription
 * covers all of them at once, the same way Vue's own `thisLayout`
 * access is a single object read covering all of them too.
 *
 * Grows across phases (see `docs/IMPLEMENTATION_PLAN_PARITY_GAPS.md`)
 * — only the fields a real, wired-up `@Input()` on `GridLayoutComponent`
 * actually feeds are here; a field isn't added speculatively ahead of
 * the phase that actually implements it.
 *
 * Distinct from the *already-working* cascades
 * (`showResizeHandles`/`resizeHandleColor`/`transitionDurationMs`/
 * `transitionTimingFunction`), which use a CSS custom property set on
 * the grid container and inherited naturally by every descendant —
 * that mechanism only works for pure styling values. These five are
 * behavioral (they gate actual drag/resize logic or read into
 * calcXY/calcWH bounds), which CSS inheritance can't express at all.
 */
export interface IGridDefaults {
  /**
   * Grid-wide `ariaLabels` override (Phase 18) — unlike the other seven
   * fields on this interface, this one isn't itself "resolved" against
   * a `null`-means-inherit item-level override the same way; it's read
   * directly by `GridItemComponent`'s own `resolvedAriaLabels` getter,
   * which calls `core`'s own `resolveAriaLabels(this.latestGridDefaults.
   * ariaLabels, this.ariaLabels)` on every read — a pure merge, not a
   * cached/watched value, matching Vue's own identical choice here
   * (confirmed via that file's own doc comment: "not re-resolved via an
   * eventBus cascade the way showCloseButton/etc are — these are static
   * text, not something a consumer plausibly changes reactively after
   * mount the way a boolean toggle might"). Still threaded through this
   * same `IGridDefaults` cascade rather than a separate mechanism,
   * since `GridItemComponent` already has everything it needs to read
   * the grid's own current value this way.
   */
  ariaLabels: IGridAriaLabels;
  /** Default `borderRadiusPx` for items that don't set their own (`null`) — applied only when `useBorderRadius` (below) resolves `true`, matching Vue's own `borderRadiusStyle` computed. */
  borderRadiusPx: number;
  /**
   * Master interactivity switch (revisits the TODOs left on
   * `tabindexValue`/`showCloseButton`'s own doc comments in Phases 15/
   * 16/22, now closed). Default `enableEditMode` for items that don't
   * set their own (`null`). Confirmed via a direct source read, not
   * assumed, that this gates: `tabindexValue`/`role`/
   * `aria-roledescription`/`aria-describedby`/the keyboard-instructions
   * span (all via `isDraggableOrResizableAndNotStatic` and its two
   * siblings), and the close button's own render — but *not* the
   * native drag/resize engine's own `enabled` flag, nor
   * `handleKeydown`'s own guard, which both read the raw
   * `resolvedIsDraggable`/`resolvedIsResizable` directly. This
   * asymmetry is Vue's own actual, confirmed behavior (`GridItem.vue`'s
   * own `handleKeydown` is wired from `useGridItemKeyboard({...,
   * draggable, resizable})`, the *un*-gated refs, not the `editModeEnabled`-
   * gated `draggableAndNotStatic`/`resizableAndNotStatic` computeds) —
   * ported exactly as Vue actually behaves, not "corrected" into a
   * fully-symmetric gate Vue itself doesn't have.
   */
  enableEditMode: boolean;
  /** Default `isBounded` for items that don't set their own (`null`). */
  isBounded: boolean;
  /** Default `isDraggable` for items that don't set their own (`null`). */
  isDraggable: boolean;
  /** Default `isMirrored` for items that don't set their own (`null`). */
  isMirrored: boolean;
  /** Default `isResizable` for items that don't set their own (`null`). */
  isResizable: boolean;
  /**
   * Maximum number of rows the layout may grow to — grid-wide only,
   * confirmed via a direct read of Vue's own `GridItem.vue`
   * (`maxRows.value = thisLayout?.maxRows as number`): unlike
   * `isDraggable`/`isResizable`/`isBounded`/`isMirrored`, Vue's
   * `GridItem` has no per-item `maxRows` prop of its own to override
   * this with at all — it's always exactly whatever the parent
   * `GridLayout`'s own `maxRows` currently is. Angular's own
   * `GridItemComponent.maxRows` `@Input()` is kept (used directly by
   * anything constructing a standalone `GridItemComponent` with no
   * parent `GridLayoutComponent`/`GridEventBusService` at all), but a
   * `GridItemComponent` that *does* have a real eventBus always takes
   * this cascaded value instead of its own `@Input()`, matching Vue's
   * own "grid-only, no override" shape exactly, not the `null`-means-
   * inherit pattern the other four fields use.
   */
  maxRows: number;
  /** Default `showCloseButton` for items that don't set their own (`null`). */
  showCloseButton: boolean;
  /** Default `useBorderRadius` for items that don't set their own (`null`). */
  useBorderRadius: boolean;
}

/**
 * Phase 2/3/4 of the Angular port (see `docs/IMPLEMENTATION_PLAN.md`) —
 * the DI-scoped cascade replacing Vue's own `provide('eventBus', ...)`/
 * `inject('eventBus')` pattern (see `docs/PARITY_GAP_ANGULAR.md`'s own
 * architecture-mapping table for the full rationale on why this uses
 * RxJS rather than porting `core`'s own mitt-style `IEventEmitter`,
 * which is deliberately not part of `core`'s public API).
 *
 * Provided at the `GridLayoutComponent` level (`providers:
 * [GridEventBusService]` on that component, not `providedIn: 'root'`)
 * — Angular's DI naturally scopes it to that component's own subtree,
 * one independent instance per `GridLayout`, matching Vue's own
 * per-instance eventBus exactly rather than a single app-wide
 * singleton.
 *
 * Two directions of traffic, matching Vue's own eventBus exactly:
 * top-down (`containerWidth$`/`colNum$`/etc. — `BehaviorSubject`,
 * persistent current values a late subscriber still needs immediately)
 * and bottom-up (`itemDrag$`/`itemResize$` — plain `Subject`s, genuine
 * one-shot event streams with no "current value" concept at all,
 * matching how Vue's own `dragEvent`/`resizeEvent` messages are used).
 *
 * Narrower than Vue's own full `TGridItemEventBus` message set for
 * now, matching each phase's own stated scope — `setMirrored`/
 * `setDraggable`/`setResizable`/`itemClicked`/etc. get their own
 * subject added here as each corresponding feature is ported in a
 * later phase, not all speculatively up front.
 */
@Injectable()
export class GridEventBusService {
  private readonly containerWidthSubject = new BehaviorSubject<number>(0);
  private readonly colNumSubject = new BehaviorSubject<number>(12);
  private readonly rowHeightSubject = new BehaviorSubject<number>(150);
  private readonly marginSubject = new BehaviorSubject<[number, number]>([10, 10]);
  private readonly useCssTransformsSubject = new BehaviorSubject<boolean>(true);
  private readonly transformScaleSubject = new BehaviorSubject<number>(1);
  private readonly selectedItemIdsSubject = new BehaviorSubject<Set<string | number>>(new Set());
  private readonly gridDefaultsSubject = new BehaviorSubject<IGridDefaults>({
    ariaLabels: {},
    borderRadiusPx: 10,
    enableEditMode: true,
    isBounded: false,
    isDraggable: true,
    isMirrored: false,
    isResizable: true,
    maxRows: Infinity,
    showCloseButton: false,
    useBorderRadius: false,
  });
  private readonly itemDragSubject = new Subject<IItemDragEvent>();
  private readonly itemResizeSubject = new Subject<IItemResizeEvent>();
  private readonly itemClickedSubject = new Subject<IItemClickedEvent>();

  /** The container's last known-good measured pixel width — the Angular equivalent of Vue's own `updateWidth` eventBus message. */
  readonly containerWidth$ = this.containerWidthSubject.asObservable();
  /** Current column count — the Angular equivalent of Vue's own `setColNum` eventBus message. */
  readonly colNum$ = this.colNumSubject.asObservable();
  /** Height of one grid row, in pixels — the Angular equivalent of Vue's own `setRowHeight` eventBus message. */
  readonly rowHeight$ = this.rowHeightSubject.asObservable();
  /** `[horizontal, vertical]` spacing between items, in pixels — the Angular equivalent of Vue's own `setMargin` eventBus message. */
  readonly margin$ = this.marginSubject.asObservable();
  /** Whether items position via CSS `transform` rather than `top`/`left` — the Angular equivalent of Vue's own `setUseCssTransforms` eventBus message. */
  readonly useCssTransforms$ = this.useCssTransformsSubject.asObservable();
  /** CSS transform scale factor to compensate for in pixel math (Phase 7) — the Angular equivalent of Vue's own `setTransformScale` eventBus message. */
  readonly transformScale$ = this.transformScaleSubject.asObservable();
  /** Currently-selected item ids (`multiSelect`, Phase 7) — lets each `GridItemComponent` reflect its own selected state without needing a direct reference to `GridLayoutComponent`. */
  readonly selectedItemIds$ = this.selectedItemIdsSubject.asObservable();
  /** Grid-wide behavioral defaults (Phase 14) — see `IGridDefaults`'s own doc comment. */
  readonly gridDefaults$ = this.gridDefaultsSubject.asObservable();
  /** A `GridItemComponent`'s own reported drag tick — the Angular equivalent of Vue's own `dragEvent` eventBus message. */
  readonly itemDrag$ = this.itemDragSubject.asObservable();
  /** A `GridItemComponent`'s own reported resize tick — the Angular equivalent of Vue's own `resizeEvent` eventBus message. */
  readonly itemResize$ = this.itemResizeSubject.asObservable();
  /** A `GridItemComponent`'s own reported click, for `multiSelect` — the Angular equivalent of Vue's own `itemClicked` eventBus message. */
  readonly itemClicked$ = this.itemClickedSubject.asObservable();

  setContainerWidth(value: number): void {
    this.containerWidthSubject.next(value);
  }

  setColNum(value: number): void {
    this.colNumSubject.next(value);
  }

  setRowHeight(value: number): void {
    this.rowHeightSubject.next(value);
  }

  setMargin(value: [number, number]): void {
    this.marginSubject.next(value);
  }

  setUseCssTransforms(value: boolean): void {
    this.useCssTransformsSubject.next(value);
  }

  setTransformScale(value: number): void {
    this.transformScaleSubject.next(value);
  }

  setSelectedItemIds(value: Set<string | number>): void {
    this.selectedItemIdsSubject.next(value);
  }

  setGridDefaults(value: IGridDefaults): void {
    this.gridDefaultsSubject.next(value);
  }

  emitItemDrag(event: IItemDragEvent): void {
    this.itemDragSubject.next(event);
  }

  emitItemResize(event: IItemResizeEvent): void {
    this.itemResizeSubject.next(event);
  }

  emitItemClicked(event: IItemClickedEvent): void {
    this.itemClickedSubject.next(event);
  }
}
