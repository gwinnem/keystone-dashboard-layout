---
editUrl: false
title: "TDragActivationDistance"
description: "`dragActivationDistance`'s own value shape — either one fixed threshold for every pointer type (a plain `number`, matching the single hardcoded constant…"
---

> **TDragActivationDistance** = `number` \| \{ `mouse?`: `number`; `pen?`: `number`; `touch?`: `number`; \}

`dragActivationDistance`'s own value shape — either one fixed
threshold for every pointer type (a plain `number`, matching the
single hardcoded constant this replaces), or distinct values per
`PointerEvent.pointerType`. A pointer type left unset in the object
form falls back to DRAG\_ACTIVATION\_THRESHOLD\_PX, not `0` —
so setting only `{ touch: 8 }` doesn't silently make mouse/pen
drags activate instantly.
