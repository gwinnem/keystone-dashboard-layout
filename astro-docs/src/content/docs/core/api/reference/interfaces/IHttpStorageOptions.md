---
editUrl: false
title: "IHttpStorageOptions"
description: "Options for createHttpStorage."
---

Options for [createHttpStorage](/core/api/reference/functions/createhttpstorage/).

## Properties

### baseUrl

> **baseUrl**: `string`

Base URL. A layout lives at `${baseUrl}/${encodeURIComponent(key)}`: `GET` reads it, `PUT` writes it, `DELETE` removes it.

***

### fetch?

> `optional` **fetch?**: \{(`input`, `init?`): `Promise`\<`Response`\>; (`input`, `init?`): `Promise`\<`Response`\>; \}

The `fetch` to use. Defaults to the global `fetch`.

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`URL` \| `RequestInfo`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

#### Call Signature

> (`input`, `init?`): `Promise`\<`Response`\>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

##### Parameters

###### input

`string` \| `URL` \| `Request`

###### init?

`RequestInit`

##### Returns

`Promise`\<`Response`\>

***

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\> \| (() => `Record`\<`string`, `string`\> \| `Promise`\<`Record`\<`string`, `string`\>\>)

Extra request headers (an auth token, say). A function is called before every request and may be async, for a token that refreshes.
