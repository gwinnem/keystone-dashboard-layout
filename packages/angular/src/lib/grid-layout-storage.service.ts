import { Injectable } from '@angular/core';
import { deserializeLayout, serializeLayout } from 'keystone-dashboard-layout-core';
import type { TLayout } from 'keystone-dashboard-layout-core';

const hasWindow = (): boolean => typeof window !== `undefined`;

/**
 * The Angular equivalent of Vue's own `useLayoutStorage.ts` composable /
 * React's equivalent hook: persists a layout to browser storage (or any
 * `Storage`-compatible backend) and restores it later, removing the
 * boilerplate every consumer doing this by hand otherwise has to
 * reimplement themselves (stripping the internal `moved` field before
 * saving, handling a missing/malformed stored value gracefully on
 * load) — both already handled by `core`'s own `serializeLayout`/
 * `deserializeLayout`, which this is a thin wrapper around.
 *
 * **Deliberately not a ref-bound composable/hook, unlike Vue's own
 * version.** Vue's `useLayoutStorage(key, layout: Ref<TLayout>, options)`
 * reads and *writes* a reactive ref directly, including an `autoLoad`
 * (load once, immediately) and `autoSave` (watch the ref, save on every
 * change) option. This port's own `GridLayoutComponent` is a fully
 * controlled component throughout (the consumer owns `layout`,
 * `GridLayoutComponent` only ever emits `layoutChange` for the consumer
 * to apply back — see that component's own doc comment) — there is no
 * Angular-idiomatic equivalent of "a ref this service can read and
 * write on its own" to bind to without reintroducing exactly the kind
 * of implicit, framework-magic state this whole port's own `@Input()`/
 * `@Output()` convention was chosen to avoid (a deliberate, locked-in
 * design decision, not an oversight).
 * `save()`/`load()` here instead take/return a plain `TLayout` value
 * directly — the consumer calls `save(myComponent.layout)` from
 * wherever they already own that state, and applies `load()`'s return
 * value the same way they already apply `(layoutChange)`. No
 * `autoLoad`/`autoSave` for the same reason: an automatic side effect
 * tied to a value this service doesn't itself own isn't a good fit for
 * a stateless, `providedIn: 'root'` service — an explicit call site
 * (e.g. a component's own `ngOnInit`, or a debounced call from its own
 * `layoutChange` handler) is more transparent, and costs the consumer
 * only a couple of lines either way.
 *
 * SSR-safe: every storage access is guarded behind a `typeof window`
 * check, the same pattern `core`'s own browser-dependent helpers use
 * elsewhere — every method is a silent no-op (`false`, or leaving
 * storage untouched) during a server render rather than throwing.
 */
@Injectable({ providedIn: `root` })
export class GridLayoutStorageService {
  /** Serializes `layout` (via `core`'s own `serializeLayout` — stripping the internal `moved` field) and writes it to storage under `key`. A no-op if no `Storage` is available (SSR, or no `storage` override given and `window` doesn't exist). */
  save(key: string, layout: TLayout, storage?: Storage): void {
    const target = this.resolveStorage(storage);
    if(!target) {
      return;
    }
    target.setItem(key, serializeLayout(layout));
  }

  /**
   * Reads `key` from storage and returns the parsed, validated layout
   * (via `core`'s own `deserializeLayout`), or `null` if nothing was
   * stored, the stored value wasn't valid JSON, or it didn't parse into
   * a valid layout shape — the same "nothing usable was there"
   * convention `deserializeLayout` itself already establishes, not a
   * separately-maintained set of checks.
   */
  load(key: string, storage?: Storage): TLayout | null {
    const target = this.resolveStorage(storage);
    if(!target) {
      return null;
    }
    return deserializeLayout(target.getItem(key));
  }

  /** Removes `key` from storage entirely. A no-op if no `Storage` is available, or nothing was stored under `key` in the first place. */
  clear(key: string, storage?: Storage): void {
    this.resolveStorage(storage)?.removeItem(key);
  }

  /** Whether storage currently holds *anything* under `key` — not whether it's valid; call `load()` and check for `null` to confirm that. */
  hasSaved(key: string, storage?: Storage): boolean {
    const target = this.resolveStorage(storage);
    return target !== null && target.getItem(key) !== null;
  }

  private resolveStorage(storage?: Storage): Storage | null {
    if(storage) {
      return storage;
    }
    return hasWindow() ? window.localStorage : null;
  }
}
