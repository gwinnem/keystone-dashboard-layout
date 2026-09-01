import { useCallback, useEffect, useMemo, useRef } from 'react';
import { deserializeLayout, serializeLayout } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

/** Options for {@link useLayoutStorage}, all optional. */
export interface IUseLayoutStorageOptions {
  /**
   * Where to persist the layout. Defaults to `window.localStorage`.
   * Accepts anything satisfying the standard `Storage` interface
   * (`localStorage`, `sessionStorage`, or a custom implementation) —
   * pass one explicitly to use `sessionStorage` instead, or a test
   * double in a unit test. Matches the Vue package's own identical
   * option — previously missing from this hook entirely (confirmed via
   * a direct comparison against `useLayoutStorage.ts`'s own Vue
   * counterpart, not assumed).
   */
  storage?: Storage;
  /**
   * If provided (alongside `layout` below), automatically calls
   * `save()` whenever `layout` changes, debounced by `debounceMs`.
   * Default `false` — an explicit `save()` call (e.g. on a "Save
   * layout" button, or a specific `onDragEnd`/`onResizeEnd` handler) is
   * the safer default, since a grid actively being dragged changes
   * `layout` continuously and an un-debounced or overly-eager auto-save
   * would write far more often than actually needed. Matches the Vue
   * package's own `autoSave` option; unlike Vue's `watch(layout, ...,
   * { deep: true })` (reactive on its own), this needs the *current*
   * `layout` value passed in explicitly on every render (see `layout`
   * below) — a plain `useEffect` dependency, not a deep-reactive
   * subscription, is the idiomatic React equivalent.
   */
  autoSave?: boolean;
  /**
   * The current layout value to auto-save when it changes — required
   * for `autoSave` to do anything at all; ignored otherwise. Pass
   * whatever `TLayout` state your own component already holds (e.g.
   * the same value given to `GridLayout`'s own `layout` prop).
   */
  layout?: TLayout;
  /**
   * Debounce window, in milliseconds, for `autoSave`. Only relevant
   * when `autoSave` is `true`. Default `500`.
   */
  debounceMs?: number;
}

export interface IUseLayoutStorageReturn {
  /**
   * Reads and parses whatever's currently stored under `key` via
   * `core`'s own `deserializeLayout` — the same validated-shape
   * guarantee `GridLayout` itself would apply. Returns `null` (never
   * throws) when nothing's stored yet, the stored value isn't valid
   * JSON, or it doesn't parse into a valid layout shape — the same
   * "nothing usable was there" cases `deserializeLayout` itself
   * defines. Also returns `null` when `localStorage` doesn't exist at
   * all (a non-browser environment, e.g. server-side rendering),
   * rather than throwing on that access.
   */
  load: () => TLayout | null;
  /**
   * Serializes `layout` via `core`'s own `serializeLayout` (stripping
   * the internal `moved` field first) and writes it to `localStorage`
   * under `key`. A no-op when `localStorage` doesn't exist at all
   * (e.g. server-side rendering) — not an error in that case, since
   * there's nothing meaningful to persist to.
   */
  save: (layout: TLayout) => void;
  /** Removes whatever's stored under `key`, if anything. Same non-browser-environment no-op as `save`. */
  clear: () => void;
  /**
   * Whether storage currently holds *anything* under `key` — not
   * whether it's valid; use `load()`'s own return value (`null` vs. a
   * real layout) to check that. Matches the Vue package's own
   * `hasSaved()` — previously missing from this hook entirely.
   */
  hasSaved: () => boolean;
}

const hasWindow = (): boolean => typeof window !== `undefined`;

/**
 * A thin `localStorage`-backed convenience wrapper around `core`'s own
 * `serializeLayout`/`deserializeLayout` — the common "persist my
 * dashboard layout across sessions" pattern, without a consumer needing
 * to hand-roll the same few lines (`JSON.stringify`/`parse`, stripping
 * the internal `moved` field, guarding against a missing/corrupt stored
 * value) themselves every time. Genuinely small, since the actual
 * serialization logic already lives in `core` — this only adds the
 * `localStorage` read/write plumbing and a stable set of callbacks a
 * component can wire directly into `GridLayout`'s own `layout`/
 * `onLayoutChange` props.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { load, save } = useLayoutStorage('my-dashboard-layout');
 *   const [layout, setLayout] = useState<TLayout>(() => load() ?? defaultLayout);
 *
 *   const handleLayoutChange = (next: TLayout) => {
 *     setLayout(next);
 *     save(next);
 *   };
 *
 *   return <GridLayout layout={layout} onLayoutChange={handleLayoutChange}>...</GridLayout>;
 * }
 * ```
 *
 * @example
 * With `autoSave` instead of an explicit `save()` call on every change:
 * ```tsx
 * function Dashboard() {
 *   const [layout, setLayout] = useState<TLayout>(defaultLayout);
 *   const { load } = useLayoutStorage('my-dashboard-layout', { autoSave: true, layout });
 *   // ...
 * }
 * ```
 *
 * @param key The `localStorage` key to read/write under.
 * @param options See {@link IUseLayoutStorageOptions}.
 */
export function useLayoutStorage(key: string, options: IUseLayoutStorageOptions = {}): IUseLayoutStorageReturn {
  const { storage, autoSave = false, layout, debounceMs = 500 } = options;

  const resolveStorage = useCallback((): Storage | null => {
    if(storage) {
      return storage;
    }
    return hasWindow() ? window.localStorage : null;
  }, [storage]);

  const load = useCallback((): TLayout | null => {
    const target = resolveStorage();
    if(!target) {
      return null;
    }
    return deserializeLayout(target.getItem(key));
  }, [resolveStorage, key]);

  const save = useCallback((layoutToSave: TLayout): void => {
    const target = resolveStorage();
    if(!target) {
      return;
    }
    target.setItem(key, serializeLayout(layoutToSave));
  }, [resolveStorage, key]);

  const clear = useCallback((): void => {
    resolveStorage()?.removeItem(key);
  }, [resolveStorage]);

  const hasSaved = useCallback((): boolean => {
    const target = resolveStorage();
    // Deliberately `!target` (a general falsy check), not `target !==
    // null` — confirmed gap via a fresh test run, not assumed:
    // `resolveStorage()` can also return `undefined` specifically (not
    // just `null`) when `localStorage` itself is stubbed/deleted while
    // `window` still exists (e.g. `vi.stubGlobal('localStorage',
    // undefined)` in a test, or a real environment that defines
    // `window` but not `localStorage`) — a strict `!== null` check lets
    // that case slip through and call `.getItem()` on `undefined`,
    // throwing. Every other method here (`load`/`save`/`clear`) already
    // uses this same general falsy check; this one just hadn't matched
    // them.
    if(!target) {
      return false;
    }
    return target.getItem(key) !== null;
  }, [resolveStorage, key]);

  // `autoSave` — debounced, matching the Vue package's own
  // `watch(layout, ..., { deep: true })` + `setTimeout(save,
  // debounceMs)` behavior, adapted to React's own dependency-array
  // reactivity: this effect re-runs whenever `layout` itself changes
  // (a new reference, e.g. from GridLayout's own `onLayoutChange`), not
  // on every render. `saveRef` (kept in sync below, same pattern this
  // package's own `GridLayout.tsx` uses for `onSelectionChanged`/
  // `onColumnsChanged`) avoids needing `save` itself in this effect's
  // own dependency array — `save`'s reference is already stable via
  // `useCallback` above, so this isn't strictly required for
  // correctness here, but keeps the pattern consistent with the rest
  // of this package and avoids any future fragility if `save`'s own
  // dependencies ever change.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if(!autoSave || layout === undefined) {
      return undefined;
    }
    const handle = setTimeout(() => {
      saveRef.current(layout);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [autoSave, layout, debounceMs]);

  return useMemo(() => ({ clear, hasSaved, load, save }), [clear, hasSaved, load, save]);
}
