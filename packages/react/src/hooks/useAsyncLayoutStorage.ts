import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAsyncLayoutPersistence } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';

/** Options for {@link useAsyncLayoutStorage}, all optional. */
export interface IUseAsyncLayoutStorageOptions {
  /**
   * If `true`, saves `layout` (see below) whenever it changes, debounced by `debounceMs`. Default `false`. A layout you
   * just got from `load()` is saved back too unless you skip it, so prefer calling `save()` from your own change handler
   * when that matters.
   */
  autoSave?: boolean;
  /** The current layout to auto-save. Required for `autoSave` to do anything. */
  layout?: TLayout;
  /** Debounce window, in milliseconds, for `autoSave`. Default `500`. */
  debounceMs?: number;
  /** Called with whatever the store threw, in addition to it being available as `error`. */
  onError?: (error: unknown) => void;
}

export interface IUseAsyncLayoutStorageReturn {
  /** Reads the stored layout. Resolves `null`, never rejects, when nothing usable is stored or the store failed. Waits for writes already started. */
  load: () => Promise<TLayout | null>;
  /** Writes `layout`. Resolves `true` when stored, `false` if the store failed. Writes are applied in call order. */
  save: (layout: TLayout) => Promise<boolean>;
  /** Removes the stored layout. Resolves `true` on success. */
  clear: () => Promise<boolean>;
  /** Whether *anything* is stored — not whether it is valid; use `load()` for that. `false` if the store failed. */
  hasSaved: () => Promise<boolean>;
  /** `true` while a `load()` is in flight. */
  isLoading: boolean;
  /** `true` while a `save()` is in flight (including ones queued behind another). */
  isSaving: boolean;
  /** The most recent failure from the store, or `null`. Cleared when the next operation succeeds. */
  error: unknown;
}

/**
 * The asynchronous sibling of `useLayoutStorage`: persists a layout to anything that can answer with a promise — a REST API,
 * IndexedDB, a cloud document. Hand it an `IAsyncLayoutStorage`: `createHttpStorage`, `createIndexedDbStorage` and
 * `createMemoryAsyncStorage` come from `keystone-dashboard-layout-core`, or implement the three-method interface yourself.
 *
 * Nothing here rejects. A failing store is recorded in `error` (and passed to `onError`) and the method resolves `false` or
 * `null`, so a fire-and-forget `save(next)` from `onLayoutChange` never becomes an unhandled rejection. Writes are queued,
 * so a slow earlier `save()` cannot overwrite a later one, and `load()` waits for writes already started.
 *
 * Create the store once (module scope, `useMemo`, or `useRef`): a new store object every render starts a new queue.
 *
 * @example
 * ```tsx
 * const storage = createHttpStorage({ baseUrl: '/api/layouts' });
 *
 * function Dashboard() {
 *   const [layout, setLayout] = useState<TLayout>(defaultLayout);
 *   const { load, save, isLoading } = useAsyncLayoutStorage('dashboard', storage);
 *
 *   useEffect(() => {
 *     void load().then(stored => stored && setLayout(stored));
 *   }, [load]);
 *
 *   return <GridLayout layout={layout} onLayoutChange={next => { setLayout(next); void save(next); }}>...</GridLayout>;
 * }
 * ```
 *
 * @param key     Key to read and write under.
 * @param storage The store.
 * @param options See {@link IUseAsyncLayoutStorageOptions}.
 */
export function useAsyncLayoutStorage(
  key: string,
  storage: IAsyncLayoutStorage,
  options: IUseAsyncLayoutStorageOptions = {},
): IUseAsyncLayoutStorageReturn {
  const { autoSave = false, layout, debounceMs = 500, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Kept in a ref so a new `onError` closure every render does not rebuild the persistence (and with it, the write queue).
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const persistence = useMemo(
    () => createAsyncLayoutPersistence(storage, key, failure => {
      setError(failure);
      onErrorRef.current?.(failure);
    }),
    [storage, key],
  );

  // Counters, not flags: operations queue up, and the state must stay true until the last of them is done.
  const pendingLoads = useRef(0);
  const pendingSaves = useRef(0);

  const load = useCallback(async (): Promise<TLayout | null> => {
    pendingLoads.current += 1;
    setIsLoading(true);
    try {
      const stored = await persistence.load();
      if(stored !== null) {
        setError(null);
      }
      return stored;
    } finally {
      pendingLoads.current -= 1;
      setIsLoading(pendingLoads.current > 0);
    }
  }, [persistence]);

  const save = useCallback(async (layoutToSave: TLayout): Promise<boolean> => {
    pendingSaves.current += 1;
    setIsSaving(true);
    try {
      const saved = await persistence.save(layoutToSave);
      if(saved) {
        setError(null);
      }
      return saved;
    } finally {
      pendingSaves.current -= 1;
      setIsSaving(pendingSaves.current > 0);
    }
  }, [persistence]);

  const clear = useCallback(async (): Promise<boolean> => {
    const cleared = await persistence.clear();
    if(cleared) {
      setError(null);
    }
    return cleared;
  }, [persistence]);

  const hasSaved = useCallback((): Promise<boolean> => persistence.hasSaved(), [persistence]);

  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if(!autoSave || layout === undefined) {
      return undefined;
    }
    const handle = setTimeout(() => {
      void saveRef.current(layout);
    }, debounceMs);
    return (): void => clearTimeout(handle);
  }, [autoSave, layout, debounceMs]);

  return useMemo(
    () => ({ clear, error, hasSaved, isLoading, isSaving, load, save }),
    [clear, error, hasSaved, isLoading, isSaving, load, save],
  );
}
