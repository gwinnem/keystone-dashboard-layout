---
editUrl: false
title: "getCompactor"
description: "Looks up the built-in `ICompactor` matching a given `ECompactType` — the same mapping `GridLayout` itself uses internally to pick a default when the…"
---

> **getCompactor**(`compactType`): [`ICompactor`](/core/api/reference/interfaces/icompactor/)

Looks up the built-in `ICompactor` matching a given `ECompactType` —
the same mapping `GridLayout` itself uses internally to pick a
default when the `compactor` prop isn't set, exposed for a consumer
who wants to reference (or delegate to, from their own custom
compactor) "whichever built-in strategy this enum value means"
without re-deriving that mapping themselves. Mirrors
`react-grid-layout` v2's own `getCompactor(compactType, ...)`
factory function.

## Parameters

### compactType

[`ECompactType`](/core/api/reference/enums/ecompacttype/)

## Returns

[`ICompactor`](/core/api/reference/interfaces/icompactor/)
