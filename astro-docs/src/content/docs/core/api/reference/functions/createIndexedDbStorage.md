---
editUrl: false
title: "createIndexedDbStorage"
description: "An IAsyncLayoutStorage backed by IndexedDB, for layouts too big or too many for `localStorage`, or for code that must not block the main thread on a…"
---

> **createIndexedDbStorage**(`options?`): [`IAsyncLayoutStorage`](/core/api/reference/interfaces/iasynclayoutstorage/)

An [IAsyncLayoutStorage](/core/api/reference/interfaces/iasynclayoutstorage/) backed by IndexedDB, for layouts too big or too many for `localStorage`, or for code that
must not block the main thread on a synchronous read. The database and object store are created on first use.

Writes resolve once the transaction has completed, not just once the request was queued, so a resolved `setItem` is on
disk. Rejects (rather than throwing at creation) when IndexedDB is unavailable, so it can be created during SSR.

## Parameters

### options?

[`IIndexedDbStorageOptions`](/core/api/reference/interfaces/iindexeddbstorageoptions/) = `{}`

## Returns

[`IAsyncLayoutStorage`](/core/api/reference/interfaces/iasynclayoutstorage/)
