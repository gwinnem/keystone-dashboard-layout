---
editUrl: false
title: "offsetXYFromParentOf"
description: "Get a mouse event's `{x, y}` position relative to its target's offset parent, accounting for scroll position — the first step in converting a raw browser…"
---

> **offsetXYFromParentOf**(`evt`): [`IPoint`](/core/api/reference/interfaces/ipoint/)

Get a mouse event's `{x, y}` position relative to its target's offset
parent, accounting for scroll position — the first step in converting a
raw browser mouse event into the grid-unit coordinates `calcXY` needs.

Note: the short-circuit to `{left: 0, top: 0}` only applies when the
target's *own* `offsetParent` is literally `document.body` — since
jsdom (and some real detached-from-layout elements) report `offsetParent`
as `null`, the more common path falls through to the `else` branch and
reads `document.body.getBoundingClientRect()` instead, which happens to
be equivalent in practice but isn't quite what the code appears to
optimize for. See `tests/draggable-utils.spec.ts` for both cases exercised
explicitly.

Typed to exactly the three fields actually read (`target`/`clientX`/
`clientY`), not the full `MouseEvent` shape — both a real `MouseEvent`
and the native drag/resize engine's own lightweight synthetic event
objects (`INativeDragEvent`/`INativeResizeEvent`) satisfy this without
a cast.

## Parameters

### evt

The mouse (or native drag/resize) event to read the position from.

#### clientX

`number`

#### clientY

`number`

#### target

`EventTarget` \| `null`

## Returns

[`IPoint`](/core/api/reference/interfaces/ipoint/)
