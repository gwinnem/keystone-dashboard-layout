---
editUrl: false
title: "createAsyncLayoutPersistence"
description: "Binds a layout store and a key into the four operations every framework wrapper needs, with the two things that are easy to get wrong done once: -…"
---

> **createAsyncLayoutPersistence**(`storage`, `key`, `onError?`): [`IAsyncLayoutPersistence`](/core/api/reference/interfaces/iasynclayoutpersistence/)

Binds a layout store and a key into the four operations every framework wrapper needs, with the two things that are easy
to get wrong done once:

- **Order.** Writes (`save`, `clear`) and reads go through one queue, so a slow `save` can never be overtaken by a later
  one (which would leave the older layout stored), and a `load` always sees the writes made before it.
- **Failures.** No method rejects. A failing store reports to `onError` and the method resolves `false` / `null`, so a
  fire-and-forget `save()` from an event handler never becomes an unhandled rejection.

Layouts go through `serializeLayout` / `deserializeLayout`, so the internal `moved` flag is stripped on the way out and a
stored value that is not a valid layout comes back as `null`.

## Parameters

### storage

[`IAsyncLayoutStorage`](/core/api/reference/interfaces/iasynclayoutstorage/)

The store.

### key

`string`

The key to read and write under.

### onError?

(`error`) => `void`

Called with whatever the store threw.

## Returns

[`IAsyncLayoutPersistence`](/core/api/reference/interfaces/iasynclayoutpersistence/)
