---
# Documentation parity gap: implementation plan

**Prepared:** this session, as the concrete follow-up to
`astro-docs/DOCUMENTATION_PARITY_GAP.md`. That document identified
*what's* missing; this one specifies exactly what to write, with real
content outlines drawn from direct source reads (prop names, defaults,
CSS class names) — not placeholders to fill in later.

## A correction made while preparing this plan

The original gap analysis classified React's missing
`api/enums/grid-item-events.mdx`/`grid-layout-events.mdx` as **real
gaps**. Verifying that against React's actual source
(`GridLayout.tsx`) before starting this plan shows that was wrong:
React never imports or references `EGridItemEvent`/`EGridLayoutEvent`
anywhere — every event is a plain, individually-named callback prop
(`onDragStart`, `onSelectionChanged`, etc.), not a value keyed by one
of Vue's own enums. Vue uses these enums purely to name its own
`emit()` calls internally; they aren't part of the cross-framework
public API surface at all. **This is a paradigm substitution, the same
category as `eventbus.mdx`/`slots.mdx` already correctly identified as
non-gaps** — not something to write.

The same reasoning applies to Angular, confirmed via its own
`GridEventBusService`/`GridItemComponent` source: Angular's
`@Output()`s are plain typed `EventEmitter`s (`itemMoved`,
`itemResized`, etc.), never keyed by these enums either.

**Net effect: neither framework needs `grid-item-events.mdx` or
`grid-layout-events.mdx`.** React's real gap shrinks from 4 pages to
2; this is reflected in the priority lists below and should also be
corrected in `DOCUMENTATION_PARITY_GAP.md` itself the next time that
document is touched.

---

## React — 2 pages, both confirmed real

Verified directly against `packages/react/src/index.ts`: both
`GridItemCloseButton` and `GridItemDragHandle` are real, exported
components with their own prop interfaces — not hypothetical. Both are
already mentioned in passing on `react/components.mdx` (a plain-text
table row, no link), unlike `GridLayout`/`GridItem`'s own linked rows —
confirming these two are the only components in the whole package with
zero dedicated reference page.

### 1. `react/components/grid-item-close-button.mdx`

Content outline, drawn directly from `GridItemCloseButton.tsx`:

```md
---
title: GridItemCloseButton
description: The exact close button GridItem renders internally for showCloseButton — exported for standalone reuse.
---

The default close button rendered inside a `GridItem` when its own
`showCloseButton` resolves `true`. Also exported standalone, for
rendering the same button somewhere else (a custom header, say) and
wiring it to the same removal logic yourself.

\`\`\`tsx
import { GridItemCloseButton } from 'keystone-dashboard-layout-react';

function removeItem(id: string | number): void {
  setLayout((prev) => prev.filter((item) => item.i !== id));
}

<GridItemCloseButton i={item.i} onRemoveGridItem={removeItem} />
\`\`\`

## Props

| Prop | Type | Description |
|---|---|---|
| `i` | `string \| number` (required) | The id of the `GridItem` this button removes when clicked. Required — unlike Vue's own `-1` sentinel workaround, React's own type system already expresses "must be provided" directly. |
| `onRemoveGridItem` | `(id: string \| number) => void` (required) | Called with `i` when clicked. |

## Why you'd use this instead of `showCloseButton`

`showCloseButton` is the right choice for the common case. Reach for
`GridItemCloseButton` directly when you want the exact same click/
removal behavior but need to place it somewhere `GridItem`'s own
internal rendering doesn't reach — inside a custom `header`, for
instance. See [Custom drag handle & close button](/react/examples/custom-drag-handle-close-button/)
for a full working example using both `GridItemCloseButton` and
`GridItemDragHandle` together.
```

### 2. `react/components/grid-item-drag-handle.mdx`

Content outline, drawn directly from `GridItemDragHandle.tsx`:

```md
---
title: GridItemDragHandle
description: A standalone drag-handle widget, not used internally by the library — pair it with GridItem's dragAllowFrom.
---

A small drag-handle widget, for placing inside a `GridItem`'s own
`children` when you want dragging restricted to a single handle rather
than the whole item — pair it with a layout item's own `dragAllowFrom`
field so only this element starts a drag.

:::caution[The grab target is a small circle, not the visible button]
The rendered markup is a labeled `<button>` **plus a separate**, small
decorative circle element carrying the `kdl-draggable-handle` class —
confirmed directly from the component's own source. `dragAllowFrom`
matches that circle specifically, not the button/text you actually
see. Clicking the visible text does **not** start a drag; only the
small circle (rendered at the widget's own bottom-right corner, 14px
inset — offset specifically so it doesn't overlap the native resize
engine's own ~10px edge-proximity margin) does.
:::

\`\`\`tsx
import { GridItemDragHandle } from 'keystone-dashboard-layout-react';

<GridItem i={item.i} /* ...layout item fields on the matching entry, including dragAllowFrom: '.kdl-draggable-handle' */>
  <GridItemDragHandle text="⠿" />
  Item content
</GridItem>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | `'x'` | Label rendered inside the handle's own button. |

## Pairing with `resizeIgnoreFrom`

If the handle sits near a corner, it can land inside the same
edge-proximity margin the resize engine uses to detect a resize
gesture. Exclude the handle from the layout item's own
`resizeIgnoreFrom` too, so the two don't fight over the same gesture:

\`\`\`ts
{ ...item, dragAllowFrom: '.kdl-draggable-handle', resizeIgnoreFrom: '.kdl-draggable-handle' }
\`\`\`

See [Custom drag handle & close button](/react/examples/custom-drag-handle-close-button/)
for a full working example combining this with `GridItemCloseButton`.
```

### Wiring

- Add both slugs to `astro.config.mjs`'s React `Components` sidebar
  group (currently: Overview, GridLayout props, GridItem props,
  Styling).
- Update `react/components.mdx`'s own table rows for
  `GridItemCloseButton`/`GridItemDragHandle` to link to the new pages,
  matching how `GridLayout`/`GridItem`'s own rows already do.

---

## Angular — priority order, per the original gap document

### 1. Standalone component pages (fixes the confirmed overstated-claim bug)

Two new pages, mirroring Vue's own `custom-close-button.mdx`/
`custom-drag-element.mdx` split (one component per page) rather than
combining them — consistent with Vue's precedent and with the React
pages above.

**`angular/components/grid-item-close-button.mdx`** — content drawn
from `grid-item-close-button.component.ts` and its own spec file
(confirmed via source: `@Input() i: string | number`, `@Output()
removeGridItem = new EventEmitter<string | number>()`, renders a
button with `aria-label="Close"` and a separate `.kdl-custom-close-
button-icon` span):

```md
---
title: GridItemCloseButtonComponent
description: The exact close button GridItemComponent renders internally for showCloseButton — exported for standalone reuse.
---

The default close button rendered inside `GridItemComponent` when its
own `showCloseButton` resolves `true`. Also exported standalone, for
rendering the same button elsewhere and wiring it to the same removal
logic yourself.

\`\`\`html
<kdl-grid-item-close-button [i]="item.i" (removeGridItem)="onRemove($event)" />
\`\`\`

## Inputs / Outputs

| Input/Output | Type | Description |
|---|---|---|
| `i` | `string \| number` (required) | The id of the item this button removes when clicked. |
| `removeGridItem` | `EventEmitter<string \| number>` | Emits `i` when clicked. |
```

**`angular/components/grid-item-drag-handle.mdx`** — content drawn
from `grid-item-drag-handle.component.ts` (confirmed via source and
its own spec: `@Input() text = 'x'`, renders a `.kdl-drag-element-text`
wrapper containing the button and a separate `.kdl-draggable-handle`
span, matching the same "grab target is a separate circle" structure
Vue/React both have):

```md
---
title: GridItemDragHandleComponent
description: A standalone drag-handle widget, not used internally — pair it with kdlGridItemHeader/dragAllowFrom.
---

:::caution[The grab target is a small circle, not the visible button]
Same structural detail as the Vue/React ports: the actual draggable
hit-area is a separate `.kdl-draggable-handle` span, not the visible
`<button>` — confirmed directly from the component's own template.
:::

\`\`\`html
<kdl-grid-item [i]="item.i" ... [dragAllowFrom]="'.kdl-draggable-handle'">
  <kdl-grid-item-drag-handle text="⠿" />
  Item content
</kdl-grid-item>
\`\`\`

## Inputs

| Input | Type | Default | Description |
|---|---|---|---|
| `text` | `string` | `'x'` | Label rendered inside the handle's own button. |
```

Also: fix the sidebar in `astro.config.mjs` (add both slugs to
Angular's `Components` group) and double-check
`angular/api.mdx`'s own corrected caution note — once these pages
exist, that note's "the actual page still needs writing" framing is
stale and should be updated to link to them instead.

### 2. `angular/components/styling.mdx`

Real, existing CSS with zero current coverage — content drawn directly
from `packages/angular/src/styles/index.scss`. Structure it like
React's own consolidated `styling.mdx` (CSS custom properties, then key
class names), but **flag three confirmed naming differences from
React's own convention**, each verified directly against this
package's own component templates:

| Feature | Angular's own class | React's own class (for contrast) |
|---|---|---|
| `showGridLines` | `.kdl-grid-lines` | `.kdl-grid-layout--grid-lines` |
| Outside-drop placeholder | `.kdl-grid-placeholder` | `.kdl-grid-outside-drop-placeholder` |
| Close-button icon | Separate `.kdl-grid-item-close-button-icon` span (CSS-drawn ×) | Inline "×" character, no separate element |

CSS custom properties to document (all confirmed present in the real
stylesheet): `--kdl-transition-duration`, `--kdl-transition-timing`,
`--kdl-grid-line-column-size`, `--kdl-grid-line-row-size`,
`--kdl-resize-handle-color`, `--kdl-close-button-inset`. Key classes to
document: `.kdl-grid-layout`, `.kdl-grid-layout--active-drag`,
`.kdl-grid-item`, `.kdl-grid-item--draggable`/`--dragging`/`--resizing`/
`--static`/`--selected`/`--rtl`/`--has-header`/`--use-radius`,
`.kdl-grid-item-header`/`-body`/`-content`, `.kdl-resize-hint` (+ 8
edge/corner modifiers), `.kdl-grid-item-close-button`(+`-icon`),
`.kdl-grid-alignment-guide`, `.kdl-grid-spacing-indicator`, and the two
standalone-component classes (`.kdl-custom-close-button`(+`-icon`),
`.kdl-drag-element-text`/`.kdl-draggable-handle`).

Add `Styling` to Angular's `Components` sidebar group.

### 3. API pages — decision made, not left open

**Decision**: duplicate the core-shared type pages per-framework,
matching React's own approach, rather than Angular's current link-out
strategy. Rationale: two of three frameworks (Vue, React) already
duplicate; a single consistent strategy is worth more than Angular's
own reasoning for linking out (avoiding "a third, separately-maintained
copy") — the content is genuinely identical across all three either
way, so the maintenance argument cuts the same regardless of which
strategy wins, and consistency reads better to someone comparing all
three docs side by side. If this decision is revisited, do it as its
own explicit pass rather than silently drifting further apart.

Six new Angular pages, each a close copy of Vue's own equivalent (same
content — these types are genuinely shared via `core`) with only the
Angular-specific usage example swapped in:

- `angular/api/enums/compact-type.mdx` — `ECompactType`, a real, used
  `@Input()` type on `GridLayoutComponent` (confirmed:
  `compactType = ECompactType.VERTICAL` referenced directly in
  `grid-layout.component.ts`).
- `angular/api/types/layout.mdx` — `TLayout`, `TResponsiveLayout`,
  `TBreakpoint`, `TBreakpoints`.
- `angular/api/interfaces/aria-labels.mdx` — `IGridAriaLabels`, real
  and used (`ariaLabels` `@Input()` on both components).
- `angular/api/interfaces/compactor.mdx` — `ICompactor`, real and used
  (`compactor` `@Input()` on `GridLayoutComponent`).
- `angular/api/interfaces/layout.mdx` — `ILayoutItem`
  (`ILayoutItemRequired`), the core shape every layout array entry is.
- `angular/api/interfaces/svg-export-and-payload.mdx` —
  `IExportLayoutAsSvgOptions`, used by `exportLayoutAsSvg()`.

Once these exist, remove the "see the Vue package's own pages"
redirect section from `angular/api.mdx` and replace it with normal
in-package links, matching the shape `react/api.mdx` already uses.

### 4. Two deliberately-deferred, low-priority calls

Resolved with a concrete answer during this planning pass, not left
open:

- **`GridEventBusService`**: confirmed via a direct read of
  `packages/angular/src/index.ts` that it is **not exported** from the
  public entry point at all — a consumer never imports or constructs
  one directly (Angular's DI wires it up automatically for a nested
  `GridItemComponent`). **No page needed** — this resolves the
  "genuinely undecided question" from the original gap document with a
  verified answer: it's a true internal implementation detail, the
  same status as Vue's own internal eventBus.
- **The `kdlGridItemHeader` directive**: stays a subsection inside
  `grid-item/props.mdx` rather than getting its own page — it's a
  single marker directive with no inputs/outputs of its own, not a
  feature surface comparable to Vue's slots. No action needed.

---

## Summary of net-new pages

| Package | New pages | Sidebar updates needed |
|---|---|---|
| React | 2 (`grid-item-close-button.mdx`, `grid-item-drag-handle.mdx`) | Add both to Components group; fix `components.mdx`'s own table links |
| Angular | 8 (2 standalone components, 1 styling, 1 enum, 1 types, 3 interfaces) | Add all to Components/API groups; fix `api.mdx`'s stale caution note and remove the Vue-redirect section |

Not included above: writing the actual `.mdx` files themselves, which
is real content-authoring work each still needs, not just scaffolding
— the outlines above are a real head start (accurate prop
tables/defaults, drawn from source), not a substitute for writing the
surrounding prose each page still needs.
