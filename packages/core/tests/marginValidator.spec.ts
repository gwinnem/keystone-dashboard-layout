// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { marginValidator } from '@/core/validators/margin-validator';

export const marginValidatorPayload = {
  invalidMargin1: [0, 0, 0],
  invalidMargin2: [`0`, 0],
  invalidMargin3: [0, 0],
  validMargin: [1, 1],
};

describe(`marginValidator`, () => {

  it(`When margin are valid`, () => {
    expect(marginValidator(marginValidatorPayload.validMargin)).toBe(true);
  });

  it(`When margin are invalid 1`, () => {
    expect(marginValidator(marginValidatorPayload.invalidMargin1)).toBe(false);
  });

  it(`When margin are invalid 2`, () => {
    expect(marginValidator(marginValidatorPayload.invalidMargin2)).toBe(false);
  });

  it(`When margin are invalid 3`, () => {
    expect(marginValidator(marginValidatorPayload.invalidMargin3)).toBe(false);
  });

  // Every test above has MULTIPLE of the four && conditions failing at
  // once (e.g. invalidMargin3 [0,0] fails both value[0]>0 AND
  // value[1]>0 simultaneously) — mutating any ONE of them still leaves
  // another, unmutated condition failing, so the overall false result
  // survives regardless and never actually distinguishes the mutant.
  // Each test below isolates exactly one condition as the sole reason
  // for failure, with every other condition genuinely passing.
  it(`Should be false when only value[0] fails its own >0 check (value[1] genuinely passes)`, () => {
    expect(marginValidator([0, 1])).toBe(false);
  });

  it(`Should be false when only value[1] fails its own >0 check (value[0] genuinely passes)`, () => {
    expect(marginValidator([1, 0])).toBe(false);
  });

  it(`Should be false when only the typeof check fails — a string that would coerce to a valid positive number if the type check were bypassed`, () => {
    // '1' > 0 is true via JS's own string-to-number coercion, so this
    // specifically isolates the typeof check itself, not just "some
    // value is wrong" the way invalidMargin2 (['0', 0]) already does
    // (where value[1]'s own check ALSO independently fails).
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(marginValidator([`1`, 1])).toBe(false);
  });

  it(`Should be false when only the length check fails — both present values are otherwise genuinely valid`, () => {
    expect(marginValidator([1, 1, 1])).toBe(false);
  });
});
