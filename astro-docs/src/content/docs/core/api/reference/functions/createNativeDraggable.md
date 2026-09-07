---
editUrl: false
title: "createNativeDraggable"
description: "Wires native pointer-driven dragging onto `el` (the item's own root element — the whole item is the drag handle, matching interact.js's prior…"
---

> **createNativeDraggable**(`el`, `getOptions`, `onEvent`): `object`

Wires native pointer-driven dragging onto `el` (the item's own root
element — the whole item is the drag handle, matching interact.js's
prior configuration). `getOptions()` is called fresh on every
`pointerdown` so a consumer's live prop changes (`isDraggable`
toggled off mid-session, `dragAllowFrom` changed, etc.) are always
respected without needing to re-attach anything.

## Parameters

### el

`HTMLElement`

### getOptions

() => [`INativeDraggableOptions`](/core/api/reference/interfaces/inativedraggableoptions/)

### onEvent

(`event`) => `void`

## Returns

`object`

### destroy

> **destroy**: () => `void`

#### Returns

`void`
