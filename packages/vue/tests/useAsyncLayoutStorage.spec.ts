// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryAsyncStorage } from '@/core/helpers/async-layout-storage';
import { serializeLayout } from '@/core/helpers/layout-storage';
import { useAsyncLayoutStorage } from '@/composables/useAsyncLayoutStorage';

const defaults = () => [{ i: `a`, x: 0, y: 0, w: 2, h: 2 }];
const stored = () => [{ i: `b`, x: 4, y: 0, w: 2, h: 2 }];

const storageWith = (value) => createMemoryAsyncStorage(value === undefined ? {} : { k: serializeLayout(value) });

describe(`useAsyncLayoutStorage`, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe(`initial state`, () => {
    it(`Should start neither loading nor saving, with no error`, () => {
      const { error, isLoading, isSaving } = useAsyncLayoutStorage(`k`, ref(defaults()), storageWith(), { autoLoad: false });

      expect(isLoading.value).toBe(false);
      expect(isSaving.value).toBe(false);
      expect(error.value).toBeNull();
    });
  });

  describe(`load`, () => {
    it(`Should replace the layout with the stored one on creation by default`, async () => {
      const layout = ref(defaults());
      const { isLoading } = useAsyncLayoutStorage(`k`, layout, storageWith(stored()));
      expect(isLoading.value).toBe(true);

      await flushPromises();

      expect(layout.value).toEqual(stored());
      expect(isLoading.value).toBe(false);
    });

    it(`Should not load on creation when autoLoad is off`, async () => {
      const layout = ref(defaults());
      const { load } = useAsyncLayoutStorage(`k`, layout, storageWith(stored()), { autoLoad: false });
      await flushPromises();
      expect(layout.value).toEqual(defaults());

      expect(await load()).toBe(true);

      expect(layout.value).toEqual(stored());
    });

    it(`Should leave the layout alone and resolve false when nothing is stored`, async () => {
      const layout = ref(defaults());
      const { load } = useAsyncLayoutStorage(`k`, layout, storageWith(), { autoLoad: false });

      expect(await load()).toBe(false);

      expect(layout.value).toEqual(defaults());
    });

    it(`Should resolve false, and record the error, when the store fails`, async () => {
      const boom = new Error(`boom`);
      const onError = vi.fn();
      const layout = ref(defaults());
      const storage = { getItem: () => Promise.reject(boom), removeItem: () => Promise.resolve(), setItem: () => Promise.resolve() };
      const { error, isLoading, load } = useAsyncLayoutStorage(`k`, layout, storage, { autoLoad: false, onError });

      expect(await load()).toBe(false);

      expect(error.value).toBe(boom);
      expect(onError).toHaveBeenCalledWith(boom);
      expect(isLoading.value).toBe(false);
      expect(layout.value).toEqual(defaults());
    });

    it(`Should clear an earlier error once a load succeeds`, async () => {
      let fail = true;
      const items = { k: serializeLayout(stored()) };
      const storage = {
        getItem: (key) => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve(items[key] ?? null)),
        removeItem: () => Promise.resolve(),
        setItem: () => Promise.resolve(),
      };
      const layout = ref(defaults());
      const { error, load } = useAsyncLayoutStorage(`k`, layout, storage, { autoLoad: false });
      await load();
      expect(error.value).not.toBeNull();

      fail = false;
      await load();

      expect(error.value).toBeNull();
    });
  });

  describe(`save`, () => {
    it(`Should store the current layout`, async () => {
      const storage = storageWith();
      const layout = ref(defaults());
      const { save } = useAsyncLayoutStorage(`k`, layout, storage, { autoLoad: false });

      expect(await save()).toBe(true);

      expect(await storage.getItem(`k`)).toBe(serializeLayout(defaults()));
    });

    it(`Should be saving until the store has answered`, async () => {
      let release;
      const storage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        setItem: () => new Promise((resolve) => {
          release = resolve;
        }),
      };
      const { isSaving, save } = useAsyncLayoutStorage(`k`, ref(defaults()), storage, { autoLoad: false });

      const saving = save();
      expect(isSaving.value).toBe(true);
      await flushPromises();
      expect(isSaving.value).toBe(true);

      release();
      await saving;

      expect(isSaving.value).toBe(false);
    });

    it(`Should stay saving until the last of several queued saves is done`, async () => {
      const releases = [];
      const storage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        setItem: () => new Promise((resolve) => {
          releases.push(resolve);
        }),
      };
      const { isSaving, save } = useAsyncLayoutStorage(`k`, ref(defaults()), storage, { autoLoad: false });

      const first = save();
      const second = save();
      await flushPromises();
      releases[0]();
      await first;
      expect(isSaving.value).toBe(true);

      await flushPromises();
      releases[1]();
      await second;

      expect(isSaving.value).toBe(false);
    });

    it(`Should resolve false and record the error when the store fails, then recover`, async () => {
      let fail = true;
      const storage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        setItem: () => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve()),
      };
      const { error, isSaving, save } = useAsyncLayoutStorage(`k`, ref(defaults()), storage, { autoLoad: false });

      expect(await save()).toBe(false);
      expect(error.value).toBeInstanceOf(Error);
      expect(isSaving.value).toBe(false);

      fail = false;
      expect(await save()).toBe(true);
      expect(error.value).toBeNull();
    });
  });

  describe(`clear / hasSaved`, () => {
    it(`Should report and remove what is stored`, async () => {
      const layout = ref(defaults());
      const { clear, hasSaved, save } = useAsyncLayoutStorage(`k`, layout, storageWith(), { autoLoad: false });
      expect(await hasSaved()).toBe(false);

      await save();
      expect(await hasSaved()).toBe(true);

      expect(await clear()).toBe(true);
      expect(await hasSaved()).toBe(false);
    });

    it(`Should resolve false and record the error when clearing fails`, async () => {
      const storage = { getItem: () => Promise.resolve(null), removeItem: () => Promise.reject(new Error(`down`)), setItem: () => Promise.resolve() };
      const { clear, error } = useAsyncLayoutStorage(`k`, ref(defaults()), storage, { autoLoad: false });

      expect(await clear()).toBe(false);
      expect(error.value).toBeInstanceOf(Error);
    });

    it(`Should clear an earlier error once clearing succeeds`, async () => {
      let fail = true;
      const storage = {
        getItem: () => Promise.resolve(null),
        removeItem: () => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve()),
        setItem: () => Promise.resolve(),
      };
      const { clear, error } = useAsyncLayoutStorage(`k`, ref(defaults()), storage, { autoLoad: false });
      await clear();

      fail = false;
      await clear();

      expect(error.value).toBeNull();
    });
  });

  describe(`autoSave`, () => {
    it(`Should save after the debounce window, once, however many changes came before it`, async () => {
      vi.useFakeTimers();
      const base = storageWith();
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      useAsyncLayoutStorage(`k`, layout, base, { autoLoad: false, autoSave: true, debounceMs: 100 });

      layout.value[0].x = 1;
      await nextTick();
      await vi.advanceTimersByTimeAsync(60);
      layout.value[0].x = 2;
      await nextTick();
      await vi.advanceTimersByTimeAsync(60);
      expect(setItem).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(60);

      expect(setItem).toHaveBeenCalledTimes(1);
      expect(JSON.parse(await base.getItem(`k`))[0].x).toBe(2);
    });

    it(`Should use a 500 ms debounce by default`, async () => {
      vi.useFakeTimers();
      const base = storageWith();
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      useAsyncLayoutStorage(`k`, layout, base, { autoLoad: false, autoSave: true });

      layout.value[0].x = 1;
      await nextTick();
      await vi.advanceTimersByTimeAsync(499);
      expect(setItem).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);

      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it(`Should not save the layout that load itself put in place`, async () => {
      vi.useFakeTimers();
      const base = storageWith(stored());
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      useAsyncLayoutStorage(`k`, layout, base, { autoSave: true, debounceMs: 100 });

      await vi.advanceTimersByTimeAsync(0);
      await nextTick();
      await vi.advanceTimersByTimeAsync(500);

      expect(layout.value).toEqual(stored());
      expect(setItem).not.toHaveBeenCalled();
    });

    it(`Should save a change made after load`, async () => {
      vi.useFakeTimers();
      const base = storageWith(stored());
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      useAsyncLayoutStorage(`k`, layout, base, { autoSave: true, debounceMs: 100 });
      await vi.advanceTimersByTimeAsync(0);
      await nextTick();

      layout.value[0].x = 9;
      await nextTick();
      await vi.advanceTimersByTimeAsync(100);

      expect(setItem).toHaveBeenCalledTimes(1);
    });

    it(`Should cancel a pending save when the owning component unmounts`, async () => {
      vi.useFakeTimers();
      const base = storageWith();
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      const wrapper = mount(defineComponent({
        setup() {
          useAsyncLayoutStorage(`k`, layout, base, { autoLoad: false, autoSave: true, debounceMs: 100 });
          return () => null;
        },
      }));

      layout.value[0].x = 1;
      await nextTick();
      wrapper.unmount();
      await vi.advanceTimersByTimeAsync(500);

      expect(setItem).not.toHaveBeenCalled();
    });

    it(`Should unmount cleanly when no save is pending, and stop watching afterwards`, async () => {
      vi.useFakeTimers();
      const base = storageWith();
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      const wrapper = mount(defineComponent({
        setup() {
          useAsyncLayoutStorage(`k`, layout, base, { autoLoad: false, autoSave: true, debounceMs: 100 });
          return () => null;
        },
      }));

      wrapper.unmount();
      layout.value[0].x = 1;
      await nextTick();
      await vi.advanceTimersByTimeAsync(500);

      expect(setItem).not.toHaveBeenCalled();
    });

    it(`Should not warn about a missing component instance when used outside a component`, () => {
      const warn = vi.spyOn(console, `warn`).mockImplementation(() => undefined);

      useAsyncLayoutStorage(`k`, ref(defaults()), storageWith(), { autoLoad: false, autoSave: true });

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it(`Should not save by itself when autoSave is off`, async () => {
      vi.useFakeTimers();
      const base = storageWith();
      const setItem = vi.spyOn(base, `setItem`);
      const layout = ref(defaults());
      useAsyncLayoutStorage(`k`, layout, base, { autoLoad: false });

      layout.value[0].x = 1;
      await nextTick();
      await vi.advanceTimersByTimeAsync(1000);

      expect(setItem).not.toHaveBeenCalled();
    });
  });
});
