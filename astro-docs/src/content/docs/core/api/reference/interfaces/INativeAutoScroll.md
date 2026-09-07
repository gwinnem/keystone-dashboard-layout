---
editUrl: false
title: "INativeAutoScroll"
description: "Native replacement for interact.js's `autoScroll: { enabled: true }` — scrolls the nearest scrollable ancestor of `el` while the pointer is near its edge…"
---

Native replacement for interact.js's `autoScroll: { enabled: true }` —
scrolls the nearest scrollable ancestor of `el` while the pointer is
near its edge during a drag/resize, at a speed proportional to how
close to the edge the pointer is. Started on `dragstart`/`resizestart`,
fed the latest pointer position on every `dragmove`/`resizemove`, and
stopped on `dragend`/`resizeend` — a `requestAnimationFrame` loop, not
a one-shot check per pointer event, since the pointer can sit
stationary near an edge and scrolling should still continue.

## Properties

### start

> **start**: (`el`) => `void`

Call once, when the drag/resize starts.

#### Parameters

##### el

`HTMLElement`

#### Returns

`void`

***

### stop

> **stop**: () => `void`

Call once, when the drag/resize ends.

#### Returns

`void`

***

### update

> **update**: (`clientX`, `clientY`) => `void`

Call on every pointermove during the gesture, with the latest client coordinates.

#### Parameters

##### clientX

`number`

##### clientY

`number`

#### Returns

`void`
