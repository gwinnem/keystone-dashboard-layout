---
editUrl: false
title: "IAsyncLayoutPersistence"
description: "What createAsyncLayoutPersistence returns. None of the methods ever reject: a failure goes to `onError` and shows up in the result."
---

What [createAsyncLayoutPersistence](/core/api/reference/functions/createasynclayoutpersistence/) returns. None of the methods ever reject: a failure goes to `onError` and shows up in the result.

## Methods

### clear()

> **clear**(): `Promise`\<`boolean`\>

Removes the stored layout. Resolves `true` on success, `false` on failure.

#### Returns

`Promise`\<`boolean`\>

***

### hasSaved()

> **hasSaved**(): `Promise`\<`boolean`\>

Whether *anything* is stored under the key (not whether it is valid; use `load()` for that). `false` on failure.

#### Returns

`Promise`\<`boolean`\>

***

### load()

> **load**(): `Promise`\<[`TLayout`](/core/api/reference/types/tlayout/) \| `null`\>

Reads the layout. Resolves `null` when nothing usable is stored (nothing there, not valid JSON, not a valid layout) or the store failed. Waits for writes already queued.

#### Returns

`Promise`\<[`TLayout`](/core/api/reference/types/tlayout/) \| `null`\>

***

### save()

> **save**(`layout`): `Promise`\<`boolean`\>

Writes `layout`. Resolves `true` when it was stored, `false` when the store failed. Writes run one after another, in call order.

#### Parameters

##### layout

[`TLayout`](/core/api/reference/types/tlayout/)

#### Returns

`Promise`\<`boolean`\>
