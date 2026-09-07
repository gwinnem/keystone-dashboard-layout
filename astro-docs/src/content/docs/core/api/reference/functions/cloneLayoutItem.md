---
editUrl: false
title: "cloneLayoutItem"
description: "Deep-clone a single layout item via JSON round-trip. Fast because the shape is monomorphic (every `ILayoutItem` has the same set of primitive fields) —…"
---

> **cloneLayoutItem**(`layoutItem`): [`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

Deep-clone a single layout item via JSON round-trip. Fast because the
shape is monomorphic (every `ILayoutItem` has the same set of primitive
fields) — `JSON.parse(JSON.stringify(...))` is a reasonable choice here
specifically because there's nothing non-serializable (functions,
`Date`s, etc.) on an `ILayoutItem` to worry about losing.

## Parameters

### layoutItem

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)

## Returns

[`ILayoutItem`](/core/api/reference/interfaces/ilayoutitem/)
