import { describe, expect, it } from 'vitest';
import { validateLayoutItemRequiredKeys } from '../src/validators/keys-validator';

describe('validateLayoutItemRequiredKeys', () => {
  it('Should return true when all required keys are passed, and the values are valid', () => {
    const keys = {
      i: 5,
      x: 1,
      y: 1,
      h: 1,
      w: 1,
    };
    const result = validateLayoutItemRequiredKeys(keys);
    return expect(result).toBe(true);
  });

  it('Should return false when not all required keys are passed, and the values are valid', () => {
    const keys = {
      i: 5,
      x: 1,
      h: 1,
      w: 1,
    };
    const result = validateLayoutItemRequiredKeys(keys);
    return expect(result).toBe(false);
  });

  it('Should return false if i is not valid', () => {
    const keys = {
      i: true,
      x: 1,
      y: 1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return true when i is a non-empty string', () => {
    const keys = {
      i: `widget-1`,
      x: 1,
      y: 1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(true);
  });

  it('Should return false when i is an empty string', () => {
    const keys = {
      i: ``,
      x: 1,
      y: 1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if x is less then min value', () => {
    const keys = {
      i: 1,
      x: -1,
      y: 1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if x is not a number', () => {
    const keys = {
      i: 1,
      x: '',
      y: 1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if y is less then min value', () => {
    const keys = {
      i: 1,
      x: 1,
      y: -1,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if y is not a number', () => {
    const keys = {
      i: 1,
      x: 1,
      y: '',
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if h is less then min value', () => {
    const keys = {
      i: 1,
      x: 1,
      y: 1,
      h: 0,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if h is not a number', () => {
    const keys = {
      i: 1,
      x: 1,
      y: 1,
      h: '',
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if w is less then min value', () => {
    const keys = {
      i: 1,
      x: 1,
      y: 1,
      h: 1,
      w: 0,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false if w is not a number', () => {
    const keys = {
      i: 1,
      x: 1,
      y: 1,
      h: 1,
      w: '',
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return true when x and y are exactly at their own minimum (0), not just above it', () => {
    // The existing "all valid" test above already exercises h/w at
    // exactly their own minimum (1), but never x/y at theirs (0) —
    // isKeyNumericAndMinValidValue's own "result === minValue" branch
    // (separate from "result > minValue") was never isolated for x/y
    // specifically.
    const keys = {
      i: 1,
      x: 0,
      y: 0,
      h: 1,
      w: 1,
    };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(true);
  });

  // isLayoutCorrectSize chains Object.hasOwn(...) && for all five keys —
  // only 'y' missing was tested above ("not all required keys are
  // passed"), which can't distinguish removing any of the OTHER four
  // checks (a mutant dropping the 'i'/'h'/'w'/'x' check specifically
  // would still correctly fail via the untouched 'y' check in that one
  // test, masking it). Each of the four below is missing exactly one
  // different key.
  it('Should return false when i is missing (h/w/x/y all present)', () => {
    const keys = { h: 1, w: 1, x: 1, y: 1 };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false when h is missing (i/w/x/y all present)', () => {
    const keys = { i: 1, w: 1, x: 1, y: 1 };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false when w is missing (i/h/x/y all present)', () => {
    const keys = { i: 1, h: 1, x: 1, y: 1 };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });

  it('Should return false when x is missing (i/h/w/y all present)', () => {
    const keys = { i: 1, h: 1, w: 1, y: 1 };
    expect(validateLayoutItemRequiredKeys(keys)).toBe(false);
  });
});
