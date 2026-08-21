import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { useLayoutPresets } from '../../../hooks/useLayoutPresets';

/** A minimal in-memory Storage implementation, so these tests exercise the custom-`storage` option explicitly rather than only ever going through jsdom's own localStorage. Mirrors the Vue package's own identical test double. */
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

describe(`useLayoutPresets`, () => {
  afterEach(() => {
    localStorage.clear();
  });

  it(`Should save and load a named preset`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));
    const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

    result.current.savePreset(`compact`, layout);
    const loaded = result.current.loadPreset(`compact`);

    expect(loaded).toStrictEqual(layout);
  });

  it(`Should support multiple distinct named presets independently`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    result.current.savePreset(`detailed`, [{ h: 6, i: `0`, w: 6, x: 0, y: 0 }]);

    expect(result.current.loadPreset(`compact`)?.[0].w).toBe(2);
    expect(result.current.loadPreset(`detailed`)?.[0].w).toBe(6);
  });

  it(`Should return null when loading a preset that doesn't exist`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(result.current.loadPreset(`does-not-exist`)).toBeNull();
  });

  it(`Should list every saved preset name`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(result.current.listPresets()).toStrictEqual([]);

    result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    result.current.savePreset(`detailed`, [{ h: 6, i: `0`, w: 6, x: 0, y: 0 }]);

    expect(result.current.listPresets()).toStrictEqual([`compact`, `detailed`]);
  });

  it(`Should report hasPreset correctly`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(result.current.hasPreset(`compact`)).toBe(false);
    result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    expect(result.current.hasPreset(`compact`)).toBe(true);
  });

  it(`Should delete a preset, after which it's no longer listed or loadable`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    result.current.deletePreset(`compact`);

    expect(result.current.listPresets()).toStrictEqual([]);
    expect(result.current.loadPreset(`compact`)).toBeNull();
  });

  it(`Should not throw deleting a preset that doesn't exist`, () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(() => result.current.deletePreset(`does-not-exist`)).not.toThrow();
  });

  it(`Should keep presets for different keys fully independent`, () => {
    const storage = new MemoryStorage();
    const { result: presetsA } = renderHook(() => useLayoutPresets(`dashboard-a`, { storage }));
    const { result: presetsB } = renderHook(() => useLayoutPresets(`dashboard-b`, { storage }));

    presetsA.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    presetsB.current.savePreset(`compact`, [{ h: 4, i: `0`, w: 4, x: 0, y: 0 }]);

    expect(presetsA.current.listPresets()).toStrictEqual([`compact`]);
    expect(presetsB.current.listPresets()).toStrictEqual([`compact`]);

    presetsA.current.deletePreset(`compact`);
    expect(presetsA.current.listPresets()).toStrictEqual([]);
    expect(presetsB.current.listPresets()).toStrictEqual([`compact`]);
  });

  it(`Should not throw and should no-op when localStorage doesn't exist at all (e.g. SSR)`, () => {
    vi.stubGlobal(`localStorage`, undefined);
    const { result } = renderHook(() => useLayoutPresets(`dashboard`));

    expect(() => result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }])).not.toThrow();
    expect(result.current.loadPreset(`compact`)).toBeNull();
    expect(result.current.listPresets()).toStrictEqual([]);
    expect(result.current.hasPreset(`compact`)).toBe(false);
    expect(() => result.current.deletePreset(`compact`)).not.toThrow();

    vi.unstubAllGlobals();
  });

  it(`Should default to window.localStorage when no custom storage option is provided`, () => {
    // Every other test in this file passes an explicit MemoryStorage —
    // this is the one exercising the actual default path (hasWindow()
    // true, no storage option), previously never covered.
    const { result } = renderHook(() => useLayoutPresets(`dashboard-default-storage`));

    result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
    expect(result.current.hasPreset(`compact`)).toBe(true);
    expect(window.localStorage.getItem(`dashboard-default-storage`)).not.toBeNull();

    expect(result.current.loadPreset(`compact`)).toStrictEqual([{ h: 2, i: `0`, w: 2, x: 0, y: 0 }]);
  });

  it(`Should treat entirely invalid JSON in the presets storage key as "no presets" rather than throwing`, () => {
    const storage = new MemoryStorage();
    storage.setItem(`dashboard`, `this is not valid json {{{`);
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(() => result.current.listPresets()).not.toThrow();
    expect(result.current.listPresets()).toStrictEqual([]);
    expect(result.current.loadPreset(`compact`)).toBeNull();
    expect(result.current.hasPreset(`compact`)).toBe(false);
  });

  it(`Should treat valid JSON that isn't a plain object (an array, a number, a string) as "no presets" rather than throwing`, () => {
    for(const corruptValue of [`[1,2,3]`, `42`, `"just a string"`, `null`]) {
      const storage = new MemoryStorage();
      storage.setItem(`dashboard`, corruptValue);
      const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

      expect(result.current.listPresets()).toStrictEqual([]);
    }
  });

  it(`Should return null, not throw, when a specific saved preset's own stored value is a malformed layout`, () => {
    const storage = new MemoryStorage();
    // A well-formed presets object, but the "compact" entry's own value
    // isn't a serialized layout at all — simulating storage corruption
    // affecting one preset without affecting the whole blob's own JSON
    // validity.
    storage.setItem(`dashboard`, JSON.stringify({ compact: `not a serialized layout` }));
    const { result } = renderHook(() => useLayoutPresets(`dashboard`, { storage }));

    expect(result.current.hasPreset(`compact`)).toBe(true);
    expect(result.current.loadPreset(`compact`)).toBeNull();
  });

  it(`Should fall back to null when window itself doesn't exist at all (not just localStorage being unavailable while window still exists)`, () => {
    // Confirmed gap via a fresh coverage report: every other SSR-style
    // test in this file (and this hook's own "localStorage doesn't
    // exist" test) uses `vi.stubGlobal('localStorage', undefined)` —
    // which stubs *localStorage specifically*, while jsdom's own
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
    // own logic. The returned functions (`savePreset`/`loadPreset`/
    // etc.) are already-memoized plain closures by the time this runs
    // them, though — calling them doesn't trigger a further React
    // render, so deleting `window` *after* the initial render and
    // *before* calling them is what actually isolates this hook's own
    // `hasWindow()` check without touching the render itself.
    const { result } = renderHook(() => useLayoutPresets(`dashboard`));

    const originalWindow = globalThis.window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;

    try {
      expect(() => result.current.savePreset(`compact`, [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }])).not.toThrow();
      expect(result.current.loadPreset(`compact`)).toBeNull();
      expect(result.current.listPresets()).toStrictEqual([]);
      expect(result.current.hasPreset(`compact`)).toBe(false);
    } finally {
      globalThis.window = originalWindow;
    }
  });
});
