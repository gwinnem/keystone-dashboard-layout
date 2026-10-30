import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createMemoryAsyncStorage, serializeLayout } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';
import { useAsyncLayoutStorage } from '../../../hooks/useAsyncLayoutStorage';

const defaults = (): TLayout => [{ i: `a`, x: 0, y: 0, w: 2, h: 2 }];
const stored = (): TLayout => [{ i: `b`, x: 4, y: 0, w: 2, h: 2 }];

const failing = (error: Error, overrides: Partial<IAsyncLayoutStorage> = {}): IAsyncLayoutStorage => ({
  getItem: () => Promise.reject(error),
  removeItem: () => Promise.reject(error),
  setItem: () => Promise.reject(error),
  ...overrides,
});

describe(`useAsyncLayoutStorage`, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe(`load`, () => {
    it(`Should resolve the stored layout`, async () => {
      const storage = createMemoryAsyncStorage({ k: serializeLayout(stored()) });
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));

      let loaded: TLayout | null = null;
      await act(async () => {
        loaded = await result.current.load();
      });

      expect(loaded).toEqual(stored());
      expect(result.current.isLoading).toBe(false);
    });

    it(`Should resolve null when nothing is stored`, async () => {
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, createMemoryAsyncStorage()));

      let loaded: TLayout | null = defaults();
      await act(async () => {
        loaded = await result.current.load();
      });

      expect(loaded).toBeNull();
    });

    it(`Should be loading until the store has answered`, async () => {
      let release: (value: string | null) => void = () => undefined;
      const storage: IAsyncLayoutStorage = {
        getItem: () => new Promise<string | null>(resolve => {
          release = resolve;
        }),
        removeItem: () => Promise.resolve(),
        setItem: () => Promise.resolve(),
      };
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));

      let pending: Promise<TLayout | null> = Promise.resolve(null);
      act(() => {
        pending = result.current.load();
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        release(null);
        await pending;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it(`Should resolve null, record the error and call onError when the store fails`, async () => {
      const boom = new Error(`boom`);
      const onError = vi.fn();
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, failing(boom), { onError }));

      let loaded: TLayout | null = defaults();
      await act(async () => {
        loaded = await result.current.load();
      });

      expect(loaded).toBeNull();
      expect(result.current.error).toBe(boom);
      expect(onError).toHaveBeenCalledWith(boom);
      expect(result.current.isLoading).toBe(false);
    });

    it(`Should clear an earlier error once a load succeeds`, async () => {
      let fail = true;
      const items = new Map<string, string>([[`k`, serializeLayout(stored())]]);
      const storage: IAsyncLayoutStorage = {
        getItem: key => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve(items.get(key) ?? null)),
        removeItem: () => Promise.resolve(),
        setItem: () => Promise.resolve(),
      };
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));
      await act(async () => {
        await result.current.load();
      });
      expect(result.current.error).not.toBeNull();

      fail = false;
      await act(async () => {
        await result.current.load();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe(`save`, () => {
    it(`Should store the layout`, async () => {
      const storage = createMemoryAsyncStorage();
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));

      let saved = false;
      await act(async () => {
        saved = await result.current.save(defaults());
      });

      expect(saved).toBe(true);
      expect(await storage.getItem(`k`)).toBe(serializeLayout(defaults()));
    });

    it(`Should stay saving until the last of several queued saves is done`, async () => {
      const releases: (() => void)[] = [];
      const storage: IAsyncLayoutStorage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        setItem: () => new Promise<void>(resolve => {
          releases.push(resolve);
        }),
      };
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));

      let first: Promise<boolean> = Promise.resolve(false);
      let second: Promise<boolean> = Promise.resolve(false);
      act(() => {
        first = result.current.save(defaults());
        second = result.current.save(stored());
      });
      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        releases[0]();
        await first;
      });
      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        await waitFor(() => expect(releases.length).toBe(2));
        releases[1]();
        await second;
      });

      expect(result.current.isSaving).toBe(false);
    });

    it(`Should resolve false and record the error when the store fails, then recover`, async () => {
      let fail = true;
      const storage: IAsyncLayoutStorage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        setItem: () => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve()),
      };
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, storage));

      let saved = true;
      await act(async () => {
        saved = await result.current.save(defaults());
      });
      expect(saved).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isSaving).toBe(false);

      fail = false;
      await act(async () => {
        saved = await result.current.save(defaults());
      });

      expect(saved).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe(`clear / hasSaved`, () => {
    it(`Should report and remove what is stored`, async () => {
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, createMemoryAsyncStorage()));
      expect(await result.current.hasSaved()).toBe(false);

      await act(async () => {
        await result.current.save(defaults());
      });
      expect(await result.current.hasSaved()).toBe(true);

      let cleared = false;
      await act(async () => {
        cleared = await result.current.clear();
      });

      expect(cleared).toBe(true);
      expect(await result.current.hasSaved()).toBe(false);
    });

    it(`Should resolve false and record the error when clearing fails`, async () => {
      const { result } = renderHook(() => useAsyncLayoutStorage(`k`, failing(new Error(`down`))));

      let cleared = true;
      await act(async () => {
        cleared = await result.current.clear();
      });

      expect(cleared).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe(`identity`, () => {
    it(`Should keep the same methods across renders for the same store and key`, () => {
      const storage = createMemoryAsyncStorage();
      const { result, rerender } = renderHook(() => useAsyncLayoutStorage(`k`, storage, { onError: () => undefined }));
      const { load, save } = result.current;

      rerender();

      expect(result.current.load).toBe(load);
      expect(result.current.save).toBe(save);
    });

    it(`Should use the key it is given`, async () => {
      const storage = createMemoryAsyncStorage();
      const { result, rerender } = renderHook(({ k }) => useAsyncLayoutStorage(k, storage), { initialProps: { k: `one` } });
      await act(async () => {
        await result.current.save(defaults());
      });

      rerender({ k: `two` });
      await act(async () => {
        await result.current.save(stored());
      });

      expect(await storage.getItem(`one`)).toBe(serializeLayout(defaults()));
      expect(await storage.getItem(`two`)).toBe(serializeLayout(stored()));
    });
  });

  describe(`autoSave`, () => {
    it(`Should save after the debounce window, once, however many changes came before it`, async () => {
      vi.useFakeTimers();
      const storage = createMemoryAsyncStorage();
      const setItem = vi.spyOn(storage, `setItem`);
      const { rerender } = renderHook(
        ({ layout }) => useAsyncLayoutStorage(`k`, storage, { autoSave: true, debounceMs: 100, layout }),
        { initialProps: { layout: defaults() } },
      );

      rerender({ layout: [{ i: `a`, x: 1, y: 0, w: 2, h: 2 }] });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });
      rerender({ layout: [{ i: `a`, x: 2, y: 0, w: 2, h: 2 }] });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });
      expect(setItem).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60);
      });

      expect(setItem).toHaveBeenCalledTimes(1);
      expect(JSON.parse((await storage.getItem(`k`)) as string)[0].x).toBe(2);
    });

    it(`Should use a 500 ms debounce by default`, async () => {
      vi.useFakeTimers();
      const storage = createMemoryAsyncStorage();
      const setItem = vi.spyOn(storage, `setItem`);
      const layout = defaults();
      renderHook(() => useAsyncLayoutStorage(`k`, storage, { autoSave: true, layout }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(499);
      });
      expect(setItem).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });

      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it(`Should not save by itself when autoSave is off`, async () => {
      vi.useFakeTimers();
      const storage = createMemoryAsyncStorage();
      const setItem = vi.spyOn(storage, `setItem`);
      renderHook(() => useAsyncLayoutStorage(`k`, storage, { layout: defaults() }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(setItem).not.toHaveBeenCalled();
    });

    it(`Should not save when no layout is given`, async () => {
      vi.useFakeTimers();
      const storage = createMemoryAsyncStorage();
      const setItem = vi.spyOn(storage, `setItem`);
      renderHook(() => useAsyncLayoutStorage(`k`, storage, { autoSave: true }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });

      expect(setItem).not.toHaveBeenCalled();
    });

    it(`Should cancel a pending save on unmount`, async () => {
      vi.useFakeTimers();
      const storage = createMemoryAsyncStorage();
      const setItem = vi.spyOn(storage, `setItem`);
      const layout = defaults();
      const { unmount } = renderHook(() => useAsyncLayoutStorage(`k`, storage, { autoSave: true, debounceMs: 100, layout }));

      unmount();
      await vi.advanceTimersByTimeAsync(500);

      expect(setItem).not.toHaveBeenCalled();
    });
  });
});
