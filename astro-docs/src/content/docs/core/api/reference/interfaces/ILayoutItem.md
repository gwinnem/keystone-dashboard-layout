---
editUrl: false
title: "ILayoutItem"
description: "One entry in a `GridLayout`'s `layout` array. The optional fields here mirror the corresponding `GridItem` props (`isDraggable`, `minH`, etc.) — set them…"
---

One entry in a `GridLayout`'s `layout` array. The optional fields here
mirror the corresponding `GridItem` props (`isDraggable`, `minH`, etc.)
— set them on the layout item to configure a `GridItem` from data rather
than from template props directly.

`TMeta` (default `unknown`) types the optional `data` field — attach
whatever payload your item needs (a widget's config, a chart's dataset
reference, anything) directly on the layout item, instead of
maintaining a parallel array keyed by `i` to look it up separately.
Every existing usage of `ILayoutItem` (or `TLayout`) without a type
argument keeps working unchanged — the default only matters if you
actually read `.data` and want it typed as something more specific
than `unknown`.

## Extends

- [`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/)

## Type Parameters

### TMeta

`TMeta` = `unknown`

## Properties

### ariaLabels?

> `optional` **ariaLabels?**: [`IGridAriaLabels`](/core/api/reference/interfaces/igridarialabels/)

Per-item override merged over the grid-wide `ariaLabels` prop (and
that, in turn, over the built-in English defaults) — see
`resolveAriaLabels` for the exact three-layer merge. Same "Vue has
an equivalent prop, not a layout-item field" note as `zIndex`
above applies here too (Vue's own `GridItem` takes `ariaLabels` as
a direct component prop).

***

### autoHeight?

> `optional` **autoHeight?**: `boolean`

Automatically re-runs this item's own height/width measurement
whenever its own rendered content changes size (a chart rendering
taller with more data points, for instance) — independent of the
whole grid being `autoSize`d/`heightMode`'d. Backed by a
`ResizeObserver` on a dedicated wrapper `GridItem.tsx` renders
around its own `children` only when this is `true` (`height: auto`
so it can actually grow past the item's own current fixed height,
unlike the item's own root element). No grid-wide default — Vue's
own version has none either, only a per-item `GridItem` prop.
Default `false`.

***

### autoScroll?

> `optional` **autoScroll?**: `boolean`

Per-item override for whether native auto-scroll runs near a
container edge during this item's own drag/resize — `undefined`
defers to the grid-wide `autoScroll` default. Same "Vue has an
equivalent prop, not a layout-item field" note as `zIndex` above
applies here too (Vue's own `autoScroll` is a `GridItem` prop, not
read from the layout item).

***

### borderRadiusPx?

> `optional` **borderRadiusPx?**: `number`

Per-item border radius, in pixels, applied only when
`useBorderRadius` is on — `undefined` defers to the grid-wide
`borderRadiusPx` default. Same "Vue has an equivalent prop, not a
layout-item field" note as `zIndex` above applies here too.

***

### data?

> `optional` **data?**: `TMeta`

Optional, consumer-defined payload — never read or written by the
library itself (confirmed: no internal code references `.data` on a
layout item), so its presence is purely additive and doesn't change
any existing behavior. Round-trips through `serializeLayout`/
`deserializeLayout` like any other field, as long as it's
JSON-serializable.

***

### dragActivationDistance?

> `optional` **dragActivationDistance?**: [`TDragActivationDistance`](/core/api/reference/types/tdragactivationdistance/) \| `null`

Minimum pointer movement, in pixels, before a pointerdown on this
item is treated as a drag rather than a click — either one fixed
value for every pointer type, or distinct values per
`mouse`/`touch`/`pen`. `null`/unset (the default) uses `core`'s own
fixed 3px threshold for every pointer type — unchanged from before
this field existed for anyone not using it. See
`TDragActivationDistance`'s own doc comment for the exact
per-pointer-type fallback behavior when only some of `mouse`/
`touch`/`pen` are set in the object form.

***

### dragAllowFrom?

> `optional` **dragAllowFrom?**: `string` \| `null`

CSS selector restricting which descendant elements can start a
drag. `null`/unset (the default) allows dragging from anywhere on
the item except `dragIgnoreFrom` matches. Same "Vue has an
equivalent prop, not a layout-item field" note as `zIndex` above
applies here too. Forwarded straight to `core`'s own
`createNativeDraggable` (`allowFrom`), which already implements the
actual selector check.

***

### dragIgnoreFrom?

> `optional` **dragIgnoreFrom?**: `string`

CSS selector for elements that should *not* start a drag (e.g.
buttons/links inside the item) — has no effect at all when
`dragAllowFrom` is also set, since an explicit allow-list already
restricts the surface to exactly one handle (see
`createNativeDraggable`'s own `passesDragFilters` for why checking
both together wouldn't make sense). `undefined` (the default, when
this field itself is left unset on the layout item) resolves to
`` `a, button` `` in `GridItem.tsx` — matching Vue's own default —
rather than "no restriction at all"; set this to an empty string
explicitly if you genuinely want every descendant to be able to
start a drag.

***

### enableEditMode?

> `optional` **enableEditMode?**: `boolean`

Per-item override for the master interactivity switch —
`undefined` defers to the grid-wide `enableEditMode` default
(itself defaulting to `true`). `false` disables dragging,
resizing, and the close button for just this item, regardless of
its own `isDraggable`/`isResizable`/`showCloseButton` values — the
same "view mode" toggle `GridLayout`'s own `enableEditMode` applies
grid-wide, scoped to one item. Same "Vue has an equivalent prop,
not a layout-item field" note as `zIndex` above applies here too.

***

### h

> **h**: `number`

Height, in grid row units.

#### Inherited from

[`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/).[`h`](/core/api/reference/interfaces/ilayoutitemrequired/#h)

***

### i

> **i**: `string` \| `number`

Unique identifier, matched against a `GridItem`'s `i` prop.

#### Inherited from

[`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/).[`i`](/core/api/reference/interfaces/ilayoutitemrequired/#i)

***

### isBounded?

> `optional` **isBounded?**: `boolean` \| `null`

Per-item override for whether dragging this item is restricted to
within the container's own bounds — `undefined`/`null` defers to
the grid-wide `isBounded` default. Same "Vue has an equivalent
prop, not a layout-item field" note as `zIndex` above applies here
too.

***

### isDraggable?

> `optional` **isDraggable?**: `boolean`

***

### isMirrored?

> `optional` **isMirrored?**: `boolean`

Whether this item participates in the parent grid's own
`isMirrored` (RTL) setting. Default `true` (participate) — set to
`false` to keep just this one item rendering left-to-right while
the rest of the grid mirrors. Has no effect at all when the grid's
own `isMirrored` is off, since there's nothing to opt out of. Same
"Vue has an equivalent prop, not a layout-item field" note as
`zIndex` above applies here too.

***

### isResizable?

> `optional` **isResizable?**: `boolean`

***

### isStatic?

> `optional` **isStatic?**: `boolean`

Excludes this item from dragging, resizing, and collision cascades.

***

### maxH?

> `optional` **maxH?**: `number`

***

### maxW?

> `optional` **maxW?**: `number`

***

### minH?

> `optional` **minH?**: `number`

***

### minW?

> `optional` **minW?**: `number`

***

### moved?

> `optional` **moved?**: `boolean`

Set internally by the compaction/collision helpers (`utils.ts`,
`move-helper.ts`) to short-circuit infinite loops when cascading moves
— not meant to be set by consumers.

***

### preserveAspectRatio?

> `optional` **preserveAspectRatio?**: `boolean`

Per-item override for whether resizing this item preserves its
current width/height ratio (deriving the undriven dimension from
the driven one) — `undefined` defers to the grid-wide
`preserveAspectRatio` default. Same "Vue has an equivalent prop,
not a layout-item field" note as `zIndex` above applies here too.

***

### resizeHandleColor?

> `optional` **resizeHandleColor?**: `string`

Per-item CSS color for the visible resize-handle affordance, when
the resolved `showResizeHandles` is on — `undefined` defers to the
grid-wide `resizeHandleColor` default. Has no effect at all when
`showResizeHandles` resolves to `false`, since there's nothing
visible to color. Same "Vue has an equivalent prop, not a
layout-item field" note as `zIndex` above applies here too.

***

### resizeHandles?

> `optional` **resizeHandles?**: [`TResizeHandle`](/core/api/reference/types/tresizehandle/)[] \| `null`

Restricts which of the 8 resize-hint spans actually render/
activate for *this* item specifically — `undefined`/`null` defers
to the grid-wide `resizeHandles` default. An empty array (`[]`) is
a deliberate, valid "no handle-driven resize for this item at all"
value, distinct from `isResizable: false` (which also disables
keyboard-driven arrow-key resize; an empty `resizeHandles` here
does not). Same "Vue has an equivalent prop, not a layout-item
field" note as `zIndex` above applies here too.

***

### resizeIgnoreFrom?

> `optional` **resizeIgnoreFrom?**: `string` \| `null`

CSS selector for elements that should *not* start a resize —
the resize counterpart to `dragIgnoreFrom` above, for a custom
`renderResizeHandle` render prop's own interactive content (an
icon with its own click handler, say). `null`/unset (the default)
means no restriction — resize only ever starts from the dedicated
resize-hint spans regardless, so there's a narrower need for this
than `dragIgnoreFrom`'s own "anywhere on the item" surface.

***

### showCloseButton?

> `optional` **showCloseButton?**: `boolean`

Per-item override for whether a close button renders —
`undefined` defers to the grid-wide `showCloseButton` default. Same
"Vue has an equivalent prop, not a layout-item field" note as
`zIndex` above applies here too.

***

### showResizeHandles?

> `optional` **showResizeHandles?**: `boolean`

Per-item override for whether a *visible* resize-handle affordance
(a small triangle/bar per edge/corner) renders, instead of the
default invisible hit-zone-only styling (a cursor change on hover
is the only feedback otherwise) — `undefined` defers to the
grid-wide `showResizeHandles` default. Same "Vue has an equivalent
prop, not a layout-item field" note as `zIndex` above applies here
too.

***

### useBorderRadius?

> `optional` **useBorderRadius?**: `boolean`

Per-item override for whether `borderRadiusPx` is actually applied
as a real border radius — `undefined` defers to the grid-wide
`useBorderRadius` default. Same "Vue has an equivalent prop, not a
layout-item field" note as `zIndex` above applies here too.

***

### w

> **w**: `number`

Width, in grid column units.

#### Inherited from

[`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/).[`w`](/core/api/reference/interfaces/ilayoutitemrequired/#w)

***

### x

> **x**: `number`

Horizontal position, in grid column units.

#### Inherited from

[`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/).[`x`](/core/api/reference/interfaces/ilayoutitemrequired/#x)

***

### y

> **y**: `number`

Vertical position, in grid row units.

#### Inherited from

[`ILayoutItemRequired`](/core/api/reference/interfaces/ilayoutitemrequired/).[`y`](/core/api/reference/interfaces/ilayoutitemrequired/#y)

***

### zIndex?

> `optional` **zIndex?**: `number` \| `null`

CSS `z-index` override for this item, always winning over the
static/dragging/resizing CSS-class-based defaults when set.
`null`/unset defers to those defaults. Optional and purely
additive — the Vue package's own `GridItem` has an equivalent
`zIndex` prop, but as a separate component prop rather than a
layout-item field (Vue's `GridItem` takes many per-item settings
as props directly, unlike the React package's `GridItem`, which
only takes `i` and reads everything else from here — see that
package's own `grid-item-props.interface.ts` for why). Vue does
not read this field; adding it here doesn't change Vue's own
behavior at all.
