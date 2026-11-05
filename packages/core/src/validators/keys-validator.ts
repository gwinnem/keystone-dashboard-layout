/**
 * Generic key-set validator: checks that `propsKeys` contains every key in
 * `requiredKeys` (and isn't shorter than it — a quick sanity check before
 * the more expensive per-key comparison). Used by both
 * `breakpoint-validator.ts` and `layout-validator.ts` to check an object's
 * keys against an expected shape without needing a full schema library.
 *
 * @param requiredKeys Keys that must all be present.
 * @param propsKeys    Keys actually present on the object being checked.
 * @returns `true` if every required key is present.
 */
export const keysValidator = (requiredKeys: string[], propsKeys: string[]): boolean => {
  const coincidenceKeys = propsKeys.filter(k => requiredKeys.indexOf(k) >= 0);

  // Stryker disable next-line ConditionalExpression: equivalent — the second operand already implies this one (the matches cannot outnumber the keys), so forcing it true changes nothing. Split so the mutants on the second operand stay active.
  return propsKeys.length >= requiredKeys.length &&
    coincidenceKeys.length === requiredKeys.length;
};

/**
 * Checks that `value[str]` is a number `>= minValue`.
 * Used for the `h`/`w`/`x`/`y` grid-unit fields, which must be numeric and
 * non-negative (or `>= 1` for `h`/`w`, since a zero-size item makes no
 * sense).
 */
const isKeyNumericAndMinValidValue = (value: Record<string, unknown>, str: string, minValue: number): boolean => {
  const result = value[str];
  // Stryker disable next-line ConditionalExpression,BlockStatement: equivalent — `Number.isFinite` does not coerce and `===` needs matching types, so a non-number fails the check below anyway.
  if(typeof result !== 'number') {
    return false;
  }

  return result === minValue ||
    (Number.isFinite(result) &&
      // Stryker disable next-line EqualityOperator: equivalent — `result >= minValue` only differs at equality, which `result === minValue` above already accepts.
      result > minValue);
};

/**
 * Checks that a layout item object has all five required position/size keys (`i`, `h`, `w`, `x`, `y`).
 *
 * Redundant: `validateLayoutItemRequiredKeys` checks every one of these keys again, with a stricter rule, so a missing key is rejected
 * there either way. Kept as a cheap early exit; deleting it would not change any result.
 */
// Stryker disable all: equivalent — see above. No mutation of this pre-check can change what validateLayoutItemRequiredKeys returns.
const isLayoutCorrectSize = (layoutItem: Record<string, unknown>): boolean => {
  if(
    Object.hasOwn(layoutItem, 'i') &&
    Object.hasOwn(layoutItem, 'h') &&
    Object.hasOwn(layoutItem, 'w') &&
    Object.hasOwn(layoutItem, 'x') &&
    Object.hasOwn(layoutItem, 'y')
  )
    return true;

  return false;
};
// Stryker restore all

/** Checks that `value[str]` is a finite number. */
const isKeyNumeric = (value: Record<string, unknown>, str: string): boolean => {
  return Number.isFinite(value[str]);
};

/** Checks that `value.i` is a non-empty string. */
const isValidIKeyString = (value: Record<string, unknown>): boolean => {
  const result = value['i'];
  return typeof result === 'string' && result.length > 0;
};

/**
 * A layout item's `i` (id) must be *either* a number or a non-empty
 * string — never both a valid number and a valid string at once (a
 * numeric-looking value is treated as one or the other, not ambiguously
 * as both), and never neither.
 */
const isIValid = (layoutItem: Record<string, unknown>): boolean => {
  const tmpIsNumeric = isKeyNumeric(layoutItem, 'i');
  const tmpIsString = isValidIKeyString(layoutItem);
  if((!tmpIsNumeric && !tmpIsString) ||
    // Stryker disable next-line ConditionalExpression: equivalent — a value cannot be both a finite number and a string, so this operand is never true.
    (tmpIsNumeric && tmpIsString)) return false;
  return true;
};

/**
 * Validates that a single layout item object has the required keys
 * (`i`, `h`, `w`, `x`, `y`) with acceptable values: `i` is a valid id (see
 * {@link isIValid}), and `h`/`w` are `>= 1` while `x`/`y` are `>= 0`.
 *
 * @param layoutItem The candidate object to validate.
 * @returns `true` if the object satisfies every check.
 */
export const validateLayoutItemRequiredKeys = (layoutItem: Record<string, unknown>): boolean => {
  // Stryker disable next-line ConditionalExpression: equivalent — see isLayoutCorrectSize: the checks below reject a missing key anyway.
  if(!isLayoutCorrectSize(layoutItem)) return false;
  if(!isIValid(layoutItem)) return false;
  if(!isKeyNumericAndMinValidValue(layoutItem, 'h', 1)) return false;
  if(!isKeyNumericAndMinValidValue(layoutItem, 'w', 1)) return false;
  if(!isKeyNumericAndMinValidValue(layoutItem, 'x', 0)) return false;
  if(!isKeyNumericAndMinValidValue(layoutItem, 'y', 0)) return false;

  return true;
};
