---
editUrl: false
title: "serializeLayout"
description: "Serializes a layout array to a JSON string suitable for persisting (`localStorage`, a file, an API request body, anything that takes a string) — stripping…"
---

> **serializeLayout**(`layout`): `string`

Serializes a layout array to a JSON string suitable for persisting
(`localStorage`, a file, an API request body, anything that takes a
string) — stripping the internal `moved` field first, the one piece of
boilerplate every consumer doing this by hand has to remember on their
own otherwise. See
[v-model & save/load layout](https://github.com/gwinnem/vue-responsive-grid-layout/blob/main/vitepress-docs/examples/19-example.md)
for the manual pattern this replaces.

## Parameters

### layout

[`TLayout`](/core/api/reference/types/tlayout/)

The layout array to serialize.

## Returns

`string`

A JSON string. Never throws — `JSON.stringify` only throws for
  circular references or `BigInt` values, neither of which a valid
  `TLayout` can contain.
