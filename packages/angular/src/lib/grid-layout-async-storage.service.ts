import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { createAsyncLayoutPersistence } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutPersistence, IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';

/** A failure reported by {@link GridLayoutAsyncStorageService.errors$}. */
export interface IAsyncLayoutStorageError {
  /** The key the failing operation was working on. */
  key: string;
  /** Whatever the store threw. */
  error: unknown;
}

/**
 * The asynchronous sibling of `GridLayoutStorageService`: persists a layout to anything that can answer with a promise — a
 * REST API, IndexedDB, a cloud document. Pass an `IAsyncLayoutStorage` to every call: `createHttpStorage`,
 * `createIndexedDbStorage` and `createMemoryAsyncStorage` come from `keystone-dashboard-layout-core`, or implement the
 * three-method interface yourself.
 *
 * Like its synchronous sibling it is stateless from the consumer's side: `save()` takes a plain `TLayout` and `load()`
 * returns one, so the consumer stays the owner of the layout (this port's grid is a controlled component).
 *
 * Nothing here rejects. A failing store resolves `false` / `null` and is reported on {@link errors$}, so a fire-and-forget
 * `save()` from a `(layoutChange)` handler never becomes an unhandled rejection. Writes to one (store, key) pair are
 * queued, so a slow earlier `save()` cannot overwrite a later one, and `load()` waits for writes already started.
 *
 * @example
 * ```ts
 * private readonly storage = createHttpStorage({ baseUrl: '/api/layouts' });
 * private readonly persistence = inject(GridLayoutAsyncStorageService);
 *
 * async ngOnInit() {
 *   this.layout = (await this.persistence.load('dashboard', this.storage)) ?? this.layout;
 * }
 * onLayoutChange(next: TLayout) {
 *   this.layout = next;
 *   void this.persistence.save('dashboard', next, this.storage);
 * }
 * ```
 */
@Injectable({ providedIn: `root` })
export class GridLayoutAsyncStorageService {
  private readonly errorSubject = new Subject<IAsyncLayoutStorageError>();

  /**
   * Emits every store failure. Subscribe to show a message or log it; without a subscriber failures are silent (the method
   * that hit them still resolves `false` / `null`).
   */
  readonly errors$: Observable<IAsyncLayoutStorageError> = this.errorSubject.asObservable();

  // One persistence per (store, key): that is what makes the write queue span separate calls. WeakMap, so a discarded store is collectable.
  private readonly persistences = new WeakMap<IAsyncLayoutStorage, Map<string, IAsyncLayoutPersistence>>();

  /** Writes `layout` under `key`. Resolves `true` when stored, `false` if the store failed. */
  save(key: string, layout: TLayout, storage: IAsyncLayoutStorage): Promise<boolean> {
    return this.persistenceFor(key, storage).save(layout);
  }

  /** Reads the layout under `key`. Resolves `null` when nothing usable is stored or the store failed. */
  load(key: string, storage: IAsyncLayoutStorage): Promise<TLayout | null> {
    return this.persistenceFor(key, storage).load();
  }

  /** Removes whatever is stored under `key`. Resolves `true` on success. */
  clear(key: string, storage: IAsyncLayoutStorage): Promise<boolean> {
    return this.persistenceFor(key, storage).clear();
  }

  /** Whether *anything* is stored under `key` — not whether it is valid; call `load()` and check for `null` for that. `false` if the store failed. */
  hasSaved(key: string, storage: IAsyncLayoutStorage): Promise<boolean> {
    return this.persistenceFor(key, storage).hasSaved();
  }

  private persistenceFor(key: string, storage: IAsyncLayoutStorage): IAsyncLayoutPersistence {
    let byKey = this.persistences.get(storage);
    if(byKey === undefined) {
      byKey = new Map<string, IAsyncLayoutPersistence>();
      this.persistences.set(storage, byKey);
    }
    let persistence = byKey.get(key);
    if(persistence === undefined) {
      persistence = createAsyncLayoutPersistence(storage, key, error => this.errorSubject.next({ error, key }));
      byKey.set(key, persistence);
    }
    return persistence;
  }
}
