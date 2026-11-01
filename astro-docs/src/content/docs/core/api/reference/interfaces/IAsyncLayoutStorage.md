---
editUrl: false
title: "IAsyncLayoutStorage"
description: "An asynchronous key/value store for serialized layouts — `Storage`, but every method returns a promise. Implement it to persist layouts anywhere: a REST…"
---

An asynchronous key/value store for serialized layouts — `Storage`, but every method returns a promise. Implement it to
persist layouts anywhere: a REST API, IndexedDB, a cloud document, a native bridge. Values are the JSON strings
`serializeLayout` produces, so an implementation never needs to know what a layout looks like.

## Methods

### getItem()

> **getItem**(`key`): `Promise`\<`string` \| `null`\>

The value stored under `key`, or `null` if there is none.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

***

### removeItem()

> **removeItem**(`key`): `Promise`\<`void`\>

Removes whatever is stored under `key`. Removing a missing key is not an error.

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`void`\>

***

### setItem()

> **setItem**(`key`, `value`): `Promise`\<`void`\>

Stores `value` under `key`, replacing whatever was there.

#### Parameters

##### key

`string`

##### value

`string`

#### Returns

`Promise`\<`void`\>
