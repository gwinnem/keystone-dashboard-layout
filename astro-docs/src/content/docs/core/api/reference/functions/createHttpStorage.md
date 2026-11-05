---
editUrl: false
title: "createHttpStorage"
description: "An IAsyncLayoutStorage backed by a plain REST endpoint: `GET`/`PUT`/`DELETE` on `${baseUrl}/${encodeURIComponent(key)}`. The body is the serialized layout…"
---

> **createHttpStorage**(`options`): [`IAsyncLayoutStorage`](/core/api/reference/interfaces/iasynclayoutstorage/)

An [IAsyncLayoutStorage](/core/api/reference/interfaces/iasynclayoutstorage/) backed by a plain REST endpoint: `GET`/`PUT`/`DELETE` on
`${baseUrl}/${encodeURIComponent(key)}`. The body is the serialized layout as JSON text. A `404` on `GET` means "nothing
stored" (`null`), and on `DELETE` it is fine; any other non-2xx response rejects.

## Parameters

### options

[`IHttpStorageOptions`](/core/api/reference/interfaces/ihttpstorageoptions/)

## Returns

[`IAsyncLayoutStorage`](/core/api/reference/interfaces/iasynclayoutstorage/)
