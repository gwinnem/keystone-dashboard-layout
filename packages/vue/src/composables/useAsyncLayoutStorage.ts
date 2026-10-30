import { getCurrentInstance, onBeforeUnmount, Ref, ref, watch } from 'vue';
import { TLayout } from '@/components/Grid/layout-definition';
import { createAsyncLayoutPersistence, IAsyncLayoutStorage } from '@/core/helpers/async-layout-storage';

/** Options for {@link useAsyncLayoutStorage}, all optional. */
export interface IUseAsyncLayoutStorageOptions {
  /**
   * If `true`, starts `load()` as soon as this composable runs. Default `true`. The grid keeps whatever `layout` you gave it
   * until the stored layout arrives, then switches to it; watch `isLoading` to show a placeholder in between.
   */
  autoLoad?: boolean;
  /**
   * If `true`, watches `layout` (deep) and calls `save()` on every change, debounced by `debounceMs`. Default `false`. The
   * layout that `load()` itself puts in place is not saved straight back.
   */
  autoSave?: boolean;
  /** Debounce window, in milliseconds, for `autoSave`. Default `500`. */
  debounceMs?: number;
  /** Called with whatever the store threw, in addition to it being available as `error`. */
  onError?: (error: unknown) => void;
}

export interface IUseAsyncLayoutStorage {
  /** Writes the current `layout.value`. Resolves `true` when stored, `false` if the store failed. Writes are applied in call order. */
  save: () => Promise<boolean>;
  /**
   * Reads the stored layout and, if a valid one is found, replaces `layout.value` with it and resolves `true`. Resolves
   * `false`, leaving `layout.value` untouched, when nothing usable is stored or the store failed.
   */
  load: () => Promise<boolean>;
  /** Removes the stored layout. Does not modify `layout.value`. Resolves `true` on success. */
  clear: () => Promise<boolean>;
  /** Whether *anything* is stored — not whether it is valid; use `load()`'s result for that. `false` if the store failed. */
  hasSaved: () => Promise<boolean>;
  /** `true` while a `load()` is in flight. */
  isLoading: Ref<boolean>;
  /** `true` while a `save()` is in flight (including ones queued behind another). */
  isSaving: Ref<boolean>;
  /** The most recent failure from the store, or `null`. Cleared when the next operation succeeds. */
  error: Ref<unknown>;
}

/**
 * The asynchronous sibling of `useLayoutStorage`: persists a `v-model:layout` ref to anything that can answer with a promise
 * — a REST API, IndexedDB, a cloud document. Hand it an {@link IAsyncLayoutStorage}: `createHttpStorage`,
 * `createIndexedDbStorage` and `createMemoryAsyncStorage` are exported alongside this, or implement the three-method
 * interface yourself.
 *
 * Nothing here rejects. A failing store is recorded in `error` (and passed to `onError`) and the method resolves `false`,
 * so `@click="save()"` and `autoSave` never produce an unhandled rejection. Writes are queued, so a slow earlier `save()`
 * cannot overwrite a later one, and `load()` waits for writes already started.
 *
 * Browser-only stores are safe to create during SSR: `createIndexedDbStorage` rejects (into `error`) instead of throwing
 * when IndexedDB does not exist, and `autoLoad` simply ends with `load()` resolving `false`.
 *
 * @param key     Key to read and write under.
 * @param layout  The ref this composable reads from (on save) and writes to (on load).
 * @param storage The store.
 * @param options See {@link IUseAsyncLayoutStorageOptions}.
 */
export function useAsyncLayoutStorage(
  key: string,
  layout: Ref<TLayout>,
  storage: IAsyncLayoutStorage,
  options: IUseAsyncLayoutStorageOptions = {},
): IUseAsyncLayoutStorage {
  const { autoLoad = true, autoSave = false, debounceMs = 500, onError } = options;

  const isLoading = ref(false);
  const isSaving = ref(false);
  const error = ref<unknown>(null);

  const persistence = createAsyncLayoutPersistence(storage, key, failure => {
    error.value = failure;
    onError?.(failure);
  });

  // A counter, not a flag: saves queue up, and `isSaving` must stay true until the last of them is done.
  let pendingSaves = 0;
  let skipNextAutoSave = false;

  const save = async (): Promise<boolean> => {
    pendingSaves += 1;
    isSaving.value = true;
    try {
      const saved = await persistence.save(layout.value);
      if(saved) {
        error.value = null;
      }
      return saved;
    } finally {
      pendingSaves -= 1;
      isSaving.value = pendingSaves > 0;
    }
  };

  const load = async (): Promise<boolean> => {
    isLoading.value = true;
    try {
      const stored = await persistence.load();
      if(stored === null) {
        return false;
      }
      error.value = null;
      skipNextAutoSave = true;
      layout.value = stored;
      return true;
    } finally {
      isLoading.value = false;
    }
  };

  const clear = async (): Promise<boolean> => {
    const cleared = await persistence.clear();
    if(cleared) {
      error.value = null;
    }
    return cleared;
  };

  const hasSaved = (): Promise<boolean> => persistence.hasSaved();

  if(autoLoad) {
    void load();
  }

  if(autoSave) {
    let debounceHandle: ReturnType<typeof setTimeout> | undefined;
    watch(
      layout,
      () => {
        if(skipNextAutoSave) {
          skipNextAutoSave = false;
          return;
        }
        if(debounceHandle !== undefined) {
          clearTimeout(debounceHandle);
        }
        debounceHandle = setTimeout(() => {
          void save();
        }, debounceMs);
      },
      { deep: true },
    );
    // Only inside a component: called from a plain function (a test, a store) there is nothing to hook into.
    if(getCurrentInstance() !== null) {
      onBeforeUnmount(() => {
        if(debounceHandle !== undefined) {
          clearTimeout(debounceHandle);
        }
      });
    }
  }

  return { clear, error, hasSaved, isLoading, isSaving, load, save };
}
