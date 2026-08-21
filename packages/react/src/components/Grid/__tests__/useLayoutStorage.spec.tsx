import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { useLayoutStorage } from '../../../hooks/useLayoutStorage';

/** A minimal in-memory Storage implementation, so the `storage` option is exercised explicitly rather than only ever going through jsdom's own localStorage. Mirrors the Vue package's own identical test double. */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe(`useLayoutStorage`, () => {
  afterEach(() => {
    localStorage.clear();
  });

  it(`Should return null from load() when nothing is stored yet`, () => {
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));
    expect(result.current.load()).toBeNull();
  });

  it(`Should round-trip a layout through save() and load()`, () => {
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];

    result.current.save(layout);
    const loaded = result.current.load();

    expect(loaded).toStrictEqual(layout);
  });

  it(`Should strip the internal moved field when saving`, () => {
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));
    const layout: TLayout = [{ h: 2, i: `a`, moved: true, w: 2, x: 0, y: 0 }];

    result.current.save(layout);
    const loaded = result.current.load();

    expect(loaded).toStrictEqual([{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]);
  });

  it(`Should return null from load() for a corrupt (non-JSON) stored value, without throwing`, () => {
    localStorage.setItem(`kdl-test-key`, `not valid json {{{`);
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(() => result.current.load()).not.toThrow();
    expect(result.current.load()).toBeNull();
  });

  it(`Should remove the stored value via clear()`, () => {
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));
    result.current.save([{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]);

    result.current.clear();

    expect(result.current.load()).toBeNull();
  });

  it(`Should keep two different keys independent`, () => {
    const { result: first } = renderHook(() => useLayoutStorage(`kdl-key-a`));
    const { result: second } = renderHook(() => useLayoutStorage(`kdl-key-b`));

    first.current.save([{ h: 1, i: `a`, w: 1, x: 0, y: 0 }]);
    second.current.save([{ h: 2, i: `b`, w: 2, x: 1, y: 1 }]);

    expect(first.current.load()).toStrictEqual([{ h: 1, i: `a`, w: 1, x: 0, y: 0 }]);
    expect(second.current.load()).toStrictEqual([{ h: 2, i: `b`, w: 2, x: 1, y: 1 }]);
  });

  // The three tests below cover the "no `localStorage` at all" branch each
  // of load/save/clear has (e.g. server-side rendering, where the global
  // simply doesn't exist) — jsdom always provides `localStorage`, so
  // nothing above ever exercises it. `vi.stubGlobal('localStorage',
  // undefined)` makes `typeof localStorage === 'undefined'` evaluate true
  // for the duration of each test; `vi.unstubAllGlobals()` restores the
  // real jsdom `localStorage` immediately after each assertion, inside the
  // test itself, so the file's own shared `afterEach` above (`localStorage
  // .clear()`) keeps working correctly for every other test in this suite.
  it(`Should return null from load() when localStorage doesn't exist at all (e.g. SSR)`, () => {
    vi.stubGlobal(`localStorage`, undefined);
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(() => result.current.load()).not.toThrow();
    expect(result.current.load()).toBeNull();

    vi.unstubAllGlobals();
  });

  it(`Should no-op save() when localStorage doesn't exist at all (e.g. SSR)`, () => {
    vi.stubGlobal(`localStorage`, undefined);
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(() => result.current.save([{ h: 2, i: `a`, w: 2, x: 0, y: 0 }])).not.toThrow();

    vi.unstubAllGlobals();
  });

  it(`Should no-op clear() when localStorage doesn't exist at all (e.g. SSR)`, () => {
    vi.stubGlobal(`localStorage`, undefined);
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(() => result.current.clear()).not.toThrow();

    vi.unstubAllGlobals();
  });

  it(`Should accept a custom storage backend via the storage option, independent of the default localStorage`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`, { storage }));
    const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];

    result.current.save(layout);

    // Saved to the custom storage, not the real jsdom localStorage this
    // file's own afterEach clears.
    expect(storage.getItem(`kdl-test-key`)).not.toBeNull();
    expect(localStorage.getItem(`kdl-test-key`)).toBeNull();
    expect(result.current.load()).toStrictEqual(layout);
  });

  it(`Should report hasSaved correctly`, () => {
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(result.current.hasSaved()).toBe(false);
    result.current.save([{ h: 2, i: `a`, w: 2, x: 0, y: 0 }]);
    expect(result.current.hasSaved()).toBe(true);
  });

  it(`Should report hasSaved as false when localStorage doesn't exist at all (e.g. SSR)`, () => {
    vi.stubGlobal(`localStorage`, undefined);
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    expect(result.current.hasSaved()).toBe(false);

    vi.unstubAllGlobals();
  });

  describe(`autoSave`, () => {
    it(`Should automatically save the given layout, debounced, when it changes`, () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      const layoutA: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      const { rerender } = renderHook(
        ({ layout }) => useLayoutStorage(`kdl-test-key`, { autoSave: true, layout, storage }),
        { initialProps: { layout: layoutA } },
      );

      // Nothing saved yet — the debounce window hasn't elapsed.
      expect(storage.getItem(`kdl-test-key`)).toBeNull();

      vi.advanceTimersByTime(500);
      expect(JSON.parse(storage.getItem(`kdl-test-key`)!)).toStrictEqual(layoutA);

      const layoutB: TLayout = [{ h: 4, i: `a`, w: 4, x: 0, y: 0 }];
      rerender({ layout: layoutB });
      vi.advanceTimersByTime(500);
      expect(JSON.parse(storage.getItem(`kdl-test-key`)!)).toStrictEqual(layoutB);

      vi.useRealTimers();
    });

    it(`Should respect a custom debounceMs`, () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      renderHook(() => useLayoutStorage(`kdl-test-key`, { autoSave: true, debounceMs: 1000, layout, storage }));

      vi.advanceTimersByTime(500);
      expect(storage.getItem(`kdl-test-key`)).toBeNull();

      vi.advanceTimersByTime(500);
      expect(storage.getItem(`kdl-test-key`)).not.toBeNull();

      vi.useRealTimers();
    });

    it(`Should not save at all when autoSave is off (the default), even with layout provided`, () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      const layout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      renderHook(() => useLayoutStorage(`kdl-test-key`, { layout, storage }));

      vi.advanceTimersByTime(1000);
      expect(storage.getItem(`kdl-test-key`)).toBeNull();

      vi.useRealTimers();
    });

    it(`Should not save at all when autoSave is on but no layout is provided`, () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      renderHook(() => useLayoutStorage(`kdl-test-key`, { autoSave: true, storage }));

      vi.advanceTimersByTime(1000);
      expect(storage.getItem(`kdl-test-key`)).toBeNull();

      vi.useRealTimers();
    });

    it(`Should reset the debounce timer on each layout change, only saving once activity settles`, () => {
      vi.useFakeTimers();
      const storage = new MemoryStorage();
      const { rerender } = renderHook(
        ({ layout }) => useLayoutStorage(`kdl-test-key`, { autoSave: true, layout, storage }),
        { initialProps: { layout: [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }] as TLayout } },
      );

      // Two rapid changes, each well within the 500ms debounce window of
      // the previous one — only the final one should ever actually save.
      vi.advanceTimersByTime(200);
      rerender({ layout: [{ h: 3, i: `a`, w: 3, x: 0, y: 0 }] });
      vi.advanceTimersByTime(200);
      rerender({ layout: [{ h: 4, i: `a`, w: 4, x: 0, y: 0 }] });

      expect(storage.getItem(`kdl-test-key`)).toBeNull();

      vi.advanceTimersByTime(500);
      expect(JSON.parse(storage.getItem(`kdl-test-key`)!)).toStrictEqual([{ h: 4, i: `a`, w: 4, x: 0, y: 0 }]);

      vi.useRealTimers();
    });
  });

  it(`Should fall back to null when window itself doesn't exist at all (not just localStorage being unavailable while window still exists)`, () => {
    // Confirmed gap via a fresh coverage report: every other SSR-style
    // test in this file uses `vi.stubGlobal('localStorage', undefined)`
    // — which stubs *localStorage specifically*, while jsdom's own
    // `window` object still exists. `resolveStorage()`'s own
    // `hasWindow() ? window.localStorage : null` ternary has two
    // genuinely distinct false-y outcomes depending on *which* of those
    // is actually missing — the `null` branch (this one) only fires
    // when `window` itself is absent, a scenario no existing test
    // actually produced.
    //
    // `renderHook()` must run *before* deleting `window`, not after —
    // confirmed directly via a fresh test run: React DOM's own
    // reconciler (`resolveUpdatePriority`/`requestUpdateLane`) reads
    // `window` directly during the render `renderHook()` performs
    // internally, so deleting it first breaks the test harness itself
    // (`ReferenceError: window is not defined`), not just this hook's
    // own logic. The returned functions (`save`/`load`/etc.) are
    // already-memoized plain closures by the time this runs them,
    // though — calling them doesn't trigger a further React render, so
    // deleting `window` *after* the initial render and *before* calling
    // them is what actually isolates this hook's own `hasWindow()`
    // check without touching the render itself.
    const { result } = renderHook(() => useLayoutStorage(`kdl-test-key`));

    const originalWindow = globalThis.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;

    try {
      expect(() => result.current.save([{ h: 2, i: `a`, w: 2, x: 0, y: 0 }])).not.toThrow();
      expect(result.current.load()).toBeNull();
      expect(result.current.hasSaved()).toBe(false);
      expect(() => result.current.clear()).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
