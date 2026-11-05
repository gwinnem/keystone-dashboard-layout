import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `useIsomorphicLayoutEffect` is chosen once, when the module loads, so each test loads a fresh copy of the module (and of React,
 * so the identity check compares against the same instance the hook was built from).
 */
describe(`useIsomorphicLayoutEffect`, () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it(`Should be useLayoutEffect where there is a window`, async () => {
    const react = await import(`react`);
    const { useIsomorphicLayoutEffect } = await import(`../hooks/useIsomorphicLayoutEffect`);

    expect(useIsomorphicLayoutEffect).toBe(react.useLayoutEffect);
  });

  it(`Should be useEffect where there is no window (server rendering)`, async () => {
    vi.stubGlobal(`window`, undefined);
    const react = await import(`react`);
    const { useIsomorphicLayoutEffect } = await import(`../hooks/useIsomorphicLayoutEffect`);

    expect(useIsomorphicLayoutEffect).toBe(react.useEffect);
  });
});
