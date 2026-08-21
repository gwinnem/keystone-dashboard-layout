import { useCallback, useMemo } from 'react';
import { deserializeLayout, serializeLayout } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

/** Options for {@link useLayoutPresets}, all optional. */
export interface IUseLayoutPresetsOptions {
  /**
   * Where to persist presets. Defaults to `window.localStorage`. Accepts
   * anything satisfying the standard `Storage` interface — same
   * convention as `useLayoutStorage`'s own `storage` option.
   */
  storage?: Storage;
}

export interface IUseLayoutPresetsReturn {
  /** Serializes `layout` and saves it under `name`, overwriting any existing preset with the same name. */
  savePreset: (name: string, layout: TLayout) => void;
  /**
   * Loads the preset saved under `name`. Returns `null` (never throws)
   * if no preset exists under that name, or its stored value isn't a
   * valid layout — same "nothing usable was there" convention
   * `useLayoutStorage`'s own `load()` uses. Unlike the Vue package's
   * own `loadPreset` (which mutates a `Ref<TLayout>` directly), this
   * returns the loaded layout for the caller to apply via their own
   * `setState` — the same "you own the state, this returns/accepts
   * plain values" shape `useLayoutStorage` already establishes for
   * this package, rather than Vue's own ref-mutating one.
   */
  loadPreset: (name: string) => TLayout | null;
  /** Removes the preset saved under `name`. A no-op if it doesn't exist. */
  deletePreset: (name: string) => void;
  /** Every currently-saved preset name, in the order they were first saved. */
  listPresets: () => string[];
  /** Whether a preset exists under `name`. */
  hasPreset: (name: string) => boolean;
}

const hasWindow = (): boolean => typeof window !== `undefined`;

/**
 * Named layout presets — beyond `useLayoutStorage`'s single-slot
 * persistence, a way to save and switch between several named
 * arrangements of the *same* items (e.g. a "compact view" and a
 * "detailed view" of the same dashboard widgets). Layers on top of
 * `core`'s own `serializeLayout`/`deserializeLayout` — the same
 * building blocks `useLayoutStorage` itself uses — rather than
 * replacing them; reach for `useLayoutStorage` directly for the
 * simpler single-layout case, and this when a consumer specifically
 * needs several named ones. Ported from the Vue package's own
 * `useLayoutPresets` composable, previously missing from this package
 * entirely despite full feature parity being straightforward (both
 * packages already share the same `serializeLayout`/`deserializeLayout`
 * core functions).
 *
 * Stores every preset for a given `key` together, as a single
 * `{ [name]: serializedLayoutJson }` object under one storage key — one
 * `Storage` read/write per operation, rather than one per preset, and
 * no separate index needed to know what's been saved.
 *
 * SSR-safe: every storage access is guarded behind a `typeof window`
 * check, same as `useLayoutStorage` — every method is a silent no-op
 * (returning `null`/`[]`/`false` where applicable) during a server
 * render rather than throwing.
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const [layout, setLayout] = useState<TLayout>(defaultLayout);
 *   const { savePreset, loadPreset } = useLayoutPresets('my-dashboard');
 *
 *   return (
 *     <>
 *       <button onClick={() => savePreset('compact', layout)}>Save as "compact"</button>
 *       <button onClick={() => {
 *         const loaded = loadPreset('compact');
 *         if (loaded) setLayout(loaded);
 *       }}>Load "compact"</button>
 *       <GridLayout layout={layout} onLayoutChange={setLayout}>...</GridLayout>
 *     </>
 *   );
 * }
 * ```
 *
 * @param key Storage key all of this dashboard's presets are grouped under. Use a different `key` per distinct grid/dashboard if a page has more than one.
 * @param options See {@link IUseLayoutPresetsOptions}.
 */
export function useLayoutPresets(key: string, options: IUseLayoutPresetsOptions = {}): IUseLayoutPresetsReturn {
  const { storage } = options;

  // Memoized (not re-created every render) purely so the returned
  // functions themselves can stay referentially stable via useCallback
  // below — matching `useLayoutStorage`'s own stability guarantee, so a
  // consumer can safely pass e.g. `savePreset` into another hook's own
  // dependency array without it changing on every render.
  const resolveStorage = useMemo(() => (): Storage | null => {
    if(storage) {
      return storage;
    }
    return hasWindow() ? window.localStorage : null;
  }, [storage]);

  const readAllPresets = useCallback((): Record<string, string> => {
    const target = resolveStorage();
    if(!target) {
      return {};
    }
    const raw = target.getItem(key);
    if(!raw) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if(parsed && typeof parsed === `object` && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
      return {};
    } catch{
      return {};
    }
  }, [resolveStorage, key]);

  const writeAllPresets = useCallback((presets: Record<string, string>): void => {
    resolveStorage()?.setItem(key, JSON.stringify(presets));
  }, [resolveStorage, key]);

  const savePreset = useCallback((name: string, layout: TLayout): void => {
    if(!resolveStorage()) {
      return;
    }
    const presets = readAllPresets();
    presets[name] = serializeLayout(layout);
    writeAllPresets(presets);
  }, [resolveStorage, readAllPresets, writeAllPresets]);

  const loadPreset = useCallback((name: string): TLayout | null => {
    const presets = readAllPresets();
    const raw = presets[name];
    if(!raw) {
      return null;
    }
    return deserializeLayout(raw);
  }, [readAllPresets]);

  const deletePreset = useCallback((name: string): void => {
    if(!resolveStorage()) {
      return;
    }
    const presets = readAllPresets();
    delete presets[name];
    writeAllPresets(presets);
  }, [resolveStorage, readAllPresets, writeAllPresets]);

  const listPresets = useCallback((): string[] => Object.keys(readAllPresets()), [readAllPresets]);

  const hasPreset = useCallback((name: string): boolean => name in readAllPresets(), [readAllPresets]);

  return { deletePreset, hasPreset, listPresets, loadPreset, savePreset };
}
