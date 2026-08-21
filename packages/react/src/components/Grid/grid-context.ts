import { createContext, useContext } from 'react';
import type { IGridAriaLabels, TLayout, TResizeHandle } from '@keystone-dashboard-layout/core';

/** The two drag/resize gesture phases `GridLayout` needs to react to — matches the native engine's own event `type` values, narrowed to the three that matter for reporting up to `GridLayout` (mid-gesture updates and the final commit are handled identically here — see `handleItemGesture` in `GridLayout.tsx`). */
export type TGridGestureEventType = `dragstart` | `dragmove` | `dragend` | `resizestart` | `resizemove` | `resizeend`;

/**
 * Shared state/callbacks every `GridItem` needs from its parent
 * `GridLayout` — the React equivalent of the Vue package's own
 * `$parent`/eventBus contract (`docs/ARCHITECTURE.md`), expressed as
 * `createContext`/`useContext` instead, since that's the idiomatic
 * React mechanism for exactly this kind of "many descendants read
 * shared ancestor state" relationship.
 *
 * `layout` here is `GridLayout`'s own live *working* copy (kept in
 * local state, synced from the `layout` prop — see `GridLayout.tsx`'s
 * own doc comment on why), not necessarily the same array reference
 * the consumer passed in as the `layout` prop — reading it through
 * this context, rather than through the `layout` prop directly, is
 * what lets a `GridItem` see its own live position/size update on
 * every `dragmove`/`resizemove` tick, before the consumer's own
 * `onLayoutChange` has even been called yet.
 */
export interface IGridContextValue {
  layout: TLayout;
  colNum: number;
  rowHeight: number;
  margin: [number, number];
  containerWidth: number;
  maxRows: number;
  isDraggable: boolean;
  isResizable: boolean;
  isBounded: boolean;
  useCssTransforms: boolean;
  preventCollision: boolean;
  resizeHandles: TResizeHandle[];
  showCloseButton: boolean;
  multiSelect: boolean;
  selectedItemIds: Set<string | number>;
  isMirrored: boolean;
  autoScroll: boolean;
  preserveAspectRatio: boolean;
  /** Compensates drag/resize pixel math for a scaled ancestor — every pointer-movement delta during an active drag/resize is divided by this before being applied. Default `1` (no compensation). */
  transformScale: number;
  /** Grid-wide master interactivity switch — `item.enableEditMode` layers a per-item override on top of this in `GridItem.tsx`. */
  enableEditMode: boolean;
  /** Grid-wide default border radius (px), applied when the resolved `useBorderRadius` is on — a per-item `ILayoutItem.borderRadiusPx` overrides this for just that item. */
  borderRadiusPx: number;
  /** Grid-wide default for whether `borderRadiusPx` is actually applied — a per-item `ILayoutItem.useBorderRadius` overrides this for just that item. */
  useBorderRadius: boolean;
  /** Grid-wide default for whether a *visible* resize-handle affordance renders — a per-item `ILayoutItem.showResizeHandles` overrides this for just that item. */
  showResizeHandles: boolean;
  /** Grid-wide default CSS color for the visible resize-handle affordance — a per-item `ILayoutItem.resizeHandleColor` overrides this for just that item. */
  resizeHandleColor: string;
  /** Already merged with the built-in English defaults (via `resolveAriaLabels`) and the grid-wide `ariaLabels` prop — `GridItem`'s own final per-item merge layers `item.ariaLabels` on top of this. */
  ariaLabels: Required<IGridAriaLabels>;
  /** Reports a drag-gesture tick for the item with the given id — `GridLayout`'s own handler resolves collisions/bounds and updates its working layout in response. `clientX`/`clientY` (viewport pixel coordinates, from the native pointer event) are only meaningfully used at `dragend`, for `allowCrossGridDrag`'s own cross-grid-zone lookup (which operates in viewport space, via `getBoundingClientRect()`) — every other event type/handler ignores them. */
  onItemDrag: (id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number, clientX?: number, clientY?: number) => void;
  /** Reports a resize-gesture tick for the item with the given id. */
  onItemResize: (id: string | number, eventType: TGridGestureEventType, x: number, y: number, w: number, h: number) => void;
  /** Reports a close-button click for the item with the given id. `undefined` when the consumer didn't provide `onItemClose` — `GridItem` simply doesn't call it in that case. */
  onItemClose?: (id: string | number) => void;
  /** Reports a click on the item's own root (`multiSelect`) — `isMultiSelectModifier` is `true` when the click carried Shift/Ctrl/Cmd, `false` for a plain click. A no-op inside `GridLayout` when `multiSelect` is off. */
  onItemClick: (id: string | number, isMultiSelectModifier: boolean) => void;
}

export const GridContext = createContext<IGridContextValue | null>(null);

/**
 * Reads the shared `GridLayout` state a `GridItem` needs. Throws with a
 * clear message rather than silently returning `undefined` fields if a
 * `GridItem` is ever rendered outside a `GridLayout` — the same
 * "reachable only in this configuration" invariant Vue's own `$parent`
 * lookup already depends on, made explicit here instead of failing
 * confusingly later when e.g. `containerWidth` turns out to be
 * `undefined`.
 */
export function useGridContext(): IGridContextValue {
  const context = useContext(GridContext);
  if(!context) {
    throw new Error(`GridItem must be rendered inside a GridLayout.`);
  }
  return context;
}
