import { describe, expect, it } from 'vitest';
import { keysValidator } from '../src/validators/keys-validator';

describe(`keysValidator`, () => {
  it(`Should return true when propsKeys exactly matches requiredKeys`, () => {
    expect(keysValidator([`a`, `b`], [`a`, `b`])).toBe(true);
  });

  it(`Should return true when propsKeys has every required key plus extras`, () => {
    expect(keysValidator([`a`, `b`], [`a`, `b`, `c`])).toBe(true);
  });

  it(`Should return false when propsKeys is the same length as requiredKeys but is missing one of them (an unrelated extra key in its place)`, () => {
    // Same overall length (2 === 2), so this isolates the coincidence
    // check specifically — the length pre-check alone would incorrectly
    // pass this case if it were the only thing being checked.
    expect(keysValidator([`a`, `b`], [`a`, `c`])).toBe(false);
  });

  it(`Should return false when propsKeys is missing a required key with no extras to compensate`, () => {
    expect(keysValidator([`a`, `b`], [`a`])).toBe(false);
  });

  it(`Should return true for two empty arrays (vacuously, nothing required and nothing present)`, () => {
    expect(keysValidator([], [])).toBe(true);
  });
});
