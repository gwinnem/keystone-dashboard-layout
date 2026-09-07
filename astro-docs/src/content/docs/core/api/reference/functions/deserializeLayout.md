---
editUrl: false
title: "deserializeLayout"
description: "Parses a JSON string back into a `TLayout`, validating its shape with the same `layoutValidator` `GridLayout` itself uses at mount — so a layout that…"
---

> **deserializeLayout**(`json`): [`TLayout`](/core/api/reference/types/tlayout/) \| `null`

Parses a JSON string back into a `TLayout`, validating its shape with
the same `layoutValidator` `GridLayout` itself uses at mount — so a
layout that round-trips through this function is guaranteed to satisfy
exactly the same shape checks the library enforces elsewhere, not a
separately-maintained (and possibly inconsistent) set of checks.

Never throws: malformed JSON, a valid JSON value that isn't an array of
layout items, or an empty/whitespace-only string all return `null`
rather than propagating a `SyntaxError` or a validator exception —
deliberately, since the primary use case (reading back whatever was
last written to `localStorage`) needs a "nothing usable was there" case
to handle gracefully, not a thrown error a consumer must remember to
catch.

## Parameters

### json

`string` \| `null` \| `undefined`

A JSON string, typically one `serializeLayout` produced.

## Returns

[`TLayout`](/core/api/reference/types/tlayout/) \| `null`

The parsed, validated `TLayout`, or `null` if the string was
  empty/missing, not valid JSON, or didn't parse into a valid layout
  shape.
