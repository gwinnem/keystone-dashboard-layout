---
editUrl: false
title: "IIndexedDbStorageOptions"
description: "Options for createIndexedDbStorage."
---

Options for [createIndexedDbStorage](/core/api/reference/functions/createindexeddbstorage/).

## Properties

### dbName?

> `optional` **dbName?**: `string`

Database name. Default `'keystone-dashboard-layout'`.

***

### indexedDB?

> `optional` **indexedDB?**: `IDBFactory`

The `IDBFactory` to use. Defaults to the global `indexedDB`; pass one explicitly for tests or a non-browser runtime.

***

### storeName?

> `optional` **storeName?**: `string`

Object store name. Default `'layouts'`.
