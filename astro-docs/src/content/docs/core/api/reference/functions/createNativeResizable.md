---
editUrl: false
title: "createNativeResizable"
description: "Wires native pointer-driven resizing onto the 8 resize-hint spans `GridItem.vue` already renders (`.vue-resize-hint--n`/`--s`/etc) — used as the actual…"
---

> **createNativeResizable**(`root`, `handles`, `getOptions`, `onEvent`): `object`

Wires native pointer-driven resizing onto the 8 resize-hint spans
`GridItem.vue` already renders (`.vue-resize-hint--n`/`--s`/etc) —
used as the actual hit targets directly, rather than reimplementing
interact.js's own margin-based edge-proximity detection on the root
element. More precise as a result: each span's own real, visible hit
area (sized via CSS, present in the DOM whether or not
`showResizeHandles` makes it visible) is exactly what's grabbable,
with no separate proximity math to keep in sync with it.

`target` on every emitted event is always `root` (the item's own
root element), never one of the handle spans — `handleResize` (and
`offsetXYFromParentOf`, which it calls) expects the item's own root,
matching what interact.js always reported here too.

`ignoreFrom` still matters even though resize now starts from a
dedicated handle rather than edge-proximity anywhere on the item:
the `#resize-handle` slot lets a consumer put custom interactive
content (an icon with its own click handler, say) inside a handle,
and `resizeIgnoreFrom` is how they keep that from also starting a
resize.

## Parameters

### root

`HTMLElement`

### handles

`Partial`\<`Record`\<[`TResizeHandle`](/core/api/reference/types/tresizehandle/), `HTMLElement`\>\>

### getOptions

() => [`INativeResizableOptions`](/core/api/reference/interfaces/inativeresizableoptions/)

### onEvent

(`event`) => `void`

## Returns

`object`

### destroy

> **destroy**: () => `void`

#### Returns

`void`
