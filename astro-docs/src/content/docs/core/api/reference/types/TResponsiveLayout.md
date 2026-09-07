---
editUrl: false
title: "TResponsiveLayout"
description: "Pre-defined layouts keyed by breakpoint name, for the `GridLayout` `responsiveLayouts` prop. Every key is optional — breakpoints without an explicit entry…"
---

> **TResponsiveLayout** = `object`

Pre-defined layouts keyed by breakpoint name, for the `GridLayout`
`responsiveLayouts` prop. Every key is optional — breakpoints without an
explicit entry get an auto-generated layout the first time they're
entered (see `findOrGenerateResponsiveLayout` in
`core/gridlayout/helpers/responsive-helper.ts`).

The 7 standard keys are kept as named, autocomplete-friendly
properties, but the type also accepts any other string key — matching
the Vue package's own `responsiveLayouts?: { [key: string]: TLayout }`
typing (a Phase 20 parity-gap fix, see `docs/PARITY_GAP_IMPLEMENTATION_PLAN.md`).
Purely additive: a `TResponsiveLayout` built from only the 7 standard
keys keeps compiling exactly as before. Worth knowing before reaching
for a custom key, though: `getBreakpointFromWidth` (this package's own
breakpoint-resolution function, shared with `GridLayout`'s own
`breakpoints`/`cols` props — themselves fixed to the same 7 names,
confirmed by reading `IBreakpoints`/`IColumns` directly) can only ever
resolve to one of those 7 standard names. A `responsiveLayouts` entry
under any other key type-checks, but is never actually looked up by
the normal breakpoint-resolution path on either the Vue or React side
— it's accepted for type-level parity with Vue's own declared shape,
not because there's a working runtime path that reaches it.

## Indexable

> \[`key`: `string`\]: [`TLayout`](/core/api/reference/types/tlayout/)\<`unknown`\> \| `undefined`

## Properties

### lg?

> `optional` **lg?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### md?

> `optional` **md?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### sm?

> `optional` **sm?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### xl?

> `optional` **xl?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### xs?

> `optional` **xs?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### xxl?

> `optional` **xxl?**: [`TLayout`](/core/api/reference/types/tlayout/)

***

### xxs?

> `optional` **xxs?**: [`TLayout`](/core/api/reference/types/tlayout/)
