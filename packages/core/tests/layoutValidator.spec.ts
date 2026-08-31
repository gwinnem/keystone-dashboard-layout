/* eslint-disable */
import { describe, expect, it } from 'vitest';
import { layoutValidator, layoutValidatorPayload } from '../src/validators/layout-validator';

describe(`layoutValidator`, () => {
  const {
    invalidOptionalLayout,
    invalidRequiredLayout,
    invalidRequiredLayoutTwo,
    validRequiredLayout,
    validOptionalLayout,
  } = layoutValidatorPayload;

  it(`Should return true (not throw) for an empty layout`, () => {
    // Behavior change (see docs/REFACTORING.md #33): an empty layout has
    // nothing in it to violate the required-keys/type checks below, so
    // it's trivially valid — a grid with no items yet (e.g. a fresh
    // cross-grid drop target) is a normal state, not an error.
    expect(layoutValidator([])).toBe(true);
  });

  it(`Should return true When layout with required keys is valid`, () => {
    const data = Array.from({ length: 5 }, () => validRequiredLayout);
    const result = layoutValidator(data);

    expect(result).toBe(true);
  });

  it(`Should return false when a required key has the wrong type (y as a string, not a number)`, () => {
    // Previously disabled with a `// TODO Fix this test it should be
    // working` note. Root cause found and fixed directly in
    // `layout-validator.ts`: its own type-check ternary tested whether
    // the *reference value* was truthy, not whether the key was
    // *present* — since the merged reference shape's own `i`/`x`/`y`
    // (among others) all resolve to `0`, their type check was silently
    // skipped for every layout item, which is exactly why `y: 'a'`
    // (a string, where every other field here is a number) went
    // undetected. Fixed to use `Object.hasOwn(...)` instead. Verified by
    // hand against every other test in this file before re-enabling —
    // none of them change outcome under the fix, since each of their own
    // affected fields either was already checked (truthy reference
    // value) or happens to share the same runtime type as the reference
    // value even where the actual value differs.
    const data = Array.from({ length: 5 }, () => invalidRequiredLayout);
    const result = layoutValidator(data);

    expect(result).toBe(false);
  });

  it(`Should return false when a required key is missing entirely (y absent, not just wrong-typed)`, () => {
    const data = Array.from({ length: 5 }, () => invalidRequiredLayoutTwo);
    const result = layoutValidator(data);

    expect(result).toBe(false);
  });

  it(`When layout with required and optional keys is valid`, () => {
    const result = layoutValidator([validRequiredLayout, validOptionalLayout]);

    expect(result).toBe(true);
  });

  it(`When layout with required keys is valid and  optional keys is invalid`, () => {
    const result = layoutValidator([validRequiredLayout, invalidOptionalLayout]);

    expect(result).toBe(true);
  });

  it(`Should accept a layout item with an arbitrary data payload (object)`, () => {
    // Regression coverage for making ILayoutItem generic over `data`
    // (ROADMAP.md #5) — data is a consumer-defined payload of any type,
    // not one of the fixed-type optional fields this validator actually
    // checks, so it should never be rejected regardless of its shape.
    const result = layoutValidator([{ ...validRequiredLayout, data: { chartId: 'revenue', refreshMs: 5000 } }]);

    expect(result).toBe(true);
  });

  it(`Should accept a layout item with a data payload of any other type (string, number, array)`, () => {
    expect(layoutValidator([{ ...validRequiredLayout, data: `a plain string` }])).toBe(true);
    expect(layoutValidator([{ ...validRequiredLayout, data: 42 }])).toBe(true);
    expect(layoutValidator([{ ...validRequiredLayout, data: [1, 2, 3] }])).toBe(true);
  });

  it(`Should accept a layout item with no data field at all (it's optional)`, () => {
    expect(layoutValidator([validRequiredLayout])).toBe(true);
  });

  it(`Should return false when an optional key is present with the WRONG type — not just a different value of the same type`, () => {
    // invalidOptionalLayout (used above) is misleadingly named: every
    // one of its fields is still the *same type* as validOptionalLayout's
    // own fields (e.g. isDraggable is still a boolean, just a different
    // one) — this validator only ever checks typeof, never the actual
    // value, so that fixture can never distinguish a real type-mismatch
    // bug from a correctly-typed one. This constructs a genuine type
    // mismatch instead: isDraggable as a string, which validLayout's own
    // typeof check should actually catch.
    const result = layoutValidator([{ ...validRequiredLayout, isDraggable: `yes` }]);

    expect(result).toBe(false);
  });
});
