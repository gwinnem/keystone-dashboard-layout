---
editUrl: false
title: "keysValidator"
description: "Generic key-set validator: checks that `propsKeys` contains every key in `requiredKeys` (and isn't shorter than it — a quick sanity check before the more…"
---

> **keysValidator**(`requiredKeys`, `propsKeys`): `boolean`

Generic key-set validator: checks that `propsKeys` contains every key in
`requiredKeys` (and isn't shorter than it — a quick sanity check before
the more expensive per-key comparison). Used by both
`breakpoint-validator.ts` and `layout-validator.ts` to check an object's
keys against an expected shape without needing a full schema library.

## Parameters

### requiredKeys

`string`[]

Keys that must all be present.

### propsKeys

`string`[]

Keys actually present on the object being checked.

## Returns

`boolean`

`true` if every required key is present.
