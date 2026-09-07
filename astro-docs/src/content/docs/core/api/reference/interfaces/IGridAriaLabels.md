---
editUrl: false
title: "IGridAriaLabels"
description: "Localizable UI/ARIA strings — every user-facing string in `GridItem` (the close button's visually-hidden label, the `aria-roledescription`, the keyboard…"
---

Localizable UI/ARIA strings — every user-facing string in `GridItem`
(the close button's visually-hidden label, the `aria-roledescription`,
the keyboard move/resize instructions read by `aria-describedby`) was
previously a hardcoded English literal. A screen-reader user on
another locale heard English regardless of the consuming app's own
language — see `ROADMAP.md`'s "Localizable UI/ARIA strings" item.

Deliberately a small, fixed set of props with the current English
text as defaults — not a full i18n system (no pluralization, no ICU
message format, no locale-negotiation). A consumer wanting genuine
i18n integration wires their own translation function's output into
these props; this just makes the strings *reachable* instead of
baked in.

## Properties

### closeButton?

> `optional` **closeButton?**: `string`

Visually-hidden label for the close button. Read by screen readers; the visible button only shows an icon. Default `'Close'`.

***

### itemRoleDescription?

> `optional` **itemRoleDescription?**: `string`

`aria-roledescription` on a draggable/resizable/static-with-neither item's root element. Default `'Draggable, resizable item'`. Only applied when the item is actually draggable or resizable (see `draggableOrResizableAndNotStatic` in `GridItem.vue`) — a purely static item has no interactive role to describe.

***

### moveInstruction?

> `optional` **moveInstruction?**: `string`

Keyboard instruction text for moving a draggable item, read via `aria-describedby`. Default `'Press arrow keys to move.'`. Only included when the item is actually draggable.

***

### resizeInstruction?

> `optional` **resizeInstruction?**: `string`

Keyboard instruction text for resizing a resizable item, read via `aria-describedby`. Default `'Press shift plus arrow keys to resize.'`. Only included when the item is actually resizable.
