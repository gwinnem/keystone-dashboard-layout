import type { ReactNode } from 'react';
import type { TResizeHandle } from '@keystone-dashboard-layout/core';

/**
 * Props accepted by `GridItem`. Deliberately minimal, unlike the Vue
 * package's own `GridItem` (30+ props): every field a Vue `GridItem`
 * takes as a component prop — `isDraggable`/`isResizable`/`isStatic`/
 * `minW`/`maxW`/`minH`/`maxH` — already lives directly on the matching
 * `ILayoutItem` entry in `GridLayout`'s own `layout` array (see that
 * type's own doc comment), so a React `GridItem` only needs to know
 * *which* entry is its own. Set those fields on your layout data
 * instead of on this component.
 *
 * `header`/`renderResizeHandle` are the exception — the React render-
 * prop equivalent of Vue's own `#header`/`#resize-handle` named slots
 * (see `docs/IMPLEMENTATION_PLAN.md`'s own architecture-translation
 * note on this), which genuinely are per-component-instance content,
 * not data that belongs on a layout item.
 */
export interface IGridItemProps {
  /** Matches this item to its entry in the parent `GridLayout`'s `layout` array. Required. */
  i: string | number;
  /**
   * Optional header content, rendered above the item's own `children`
   * in a fixed-size row — `children` becomes a scrollable body below
   * it (matching Vue's own `#header` slot behavior: a header slot
   * present at all switches the item into this two-region flex
   * layout; omitting this prop entirely renders `children` exactly as
   * before, unaffected).
   */
  header?: ReactNode;
  /** The item's own content \u2014 becomes the scrollable body region when `header` is also provided. */
  children?: ReactNode;
  /**
   * Customizes a resize-hint span's own content (an icon, typically)
   * — called once per actually-rendered edge/corner (see
   * `resizeHandles`'s own doc comment on what "actually-rendered"
   * means), with that edge's own identifier. `undefined` (the default)
   * renders each span empty, exactly as before this prop existed — the
   * React render-prop equivalent of Vue's own `#resize-handle` named
   * slot (which received the same `edge` value via its own slot prop).
   */
  renderResizeHandle?: (edge: TResizeHandle) => ReactNode;
  /** Applied to the item's own root element, alongside the library's own positioning/interaction classes. */
  className?: string;
}
