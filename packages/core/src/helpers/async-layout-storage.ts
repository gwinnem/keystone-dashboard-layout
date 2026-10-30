import { TLayout } from '../layout-definition';
import { deserializeLayout, serializeLayout } from '@/core/helpers/layout-storage';

/**
 * An asynchronous key/value store for serialized layouts — `Storage`, but every method returns a promise. Implement it to
 * persist layouts anywhere: a REST API, IndexedDB, a cloud document, a native bridge. Values are the JSON strings
 * `serializeLayout` produces, so an implementation never needs to know what a layout looks like.
 */
export interface IAsyncLayoutStorage {
  /** The value stored under `key`, or `null` if there is none. */
  getItem(key: string): Promise<string | null>;
  /** Stores `value` under `key`, replacing whatever was there. */
  setItem(key: string, value: string): Promise<void>;
  /** Removes whatever is stored under `key`. Removing a missing key is not an error. */
  removeItem(key: string): Promise<void>;
}

/** Options for {@link createIndexedDbStorage}. */
export interface IIndexedDbStorageOptions {
  /** Database name. Default `'keystone-dashboard-layout'`. */
  dbName?: string;
  /** Object store name. Default `'layouts'`. */
  storeName?: string;
  /** The `IDBFactory` to use. Defaults to the global `indexedDB`; pass one explicitly for tests or a non-browser runtime. */
  indexedDB?: IDBFactory;
}

/** Options for {@link createHttpStorage}. */
export interface IHttpStorageOptions {
  /** Base URL. A layout lives at `${baseUrl}/${encodeURIComponent(key)}`: `GET` reads it, `PUT` writes it, `DELETE` removes it. */
  baseUrl: string;
  /** The `fetch` to use. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Extra request headers (an auth token, say). A function is called before every request and may be async, for a token that refreshes. */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
}

/** What {@link createAsyncLayoutPersistence} returns. None of the methods ever reject: a failure goes to `onError` and shows up in the result. */
export interface IAsyncLayoutPersistence {
  /** Writes `layout`. Resolves `true` when it was stored, `false` when the store failed. Writes run one after another, in call order. */
  save(layout: TLayout): Promise<boolean>;
  /** Reads the layout. Resolves `null` when nothing usable is stored (nothing there, not valid JSON, not a valid layout) or the store failed. Waits for writes already queued. */
  load(): Promise<TLayout | null>;
  /** Removes the stored layout. Resolves `true` on success, `false` on failure. */
  clear(): Promise<boolean>;
  /** Whether *anything* is stored under the key (not whether it is valid; use `load()` for that). `false` on failure. */
  hasSaved(): Promise<boolean>;
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });

/**
 * An {@link IAsyncLayoutStorage} backed by IndexedDB, for layouts too big or too many for `localStorage`, or for code that
 * must not block the main thread on a synchronous read. The database and object store are created on first use.
 *
 * Writes resolve once the transaction has completed, not just once the request was queued, so a resolved `setItem` is on
 * disk. Rejects (rather than throwing at creation) when IndexedDB is unavailable, so it can be created during SSR.
 */
export function createIndexedDbStorage(options: IIndexedDbStorageOptions = {}): IAsyncLayoutStorage {
  const { dbName = `keystone-dashboard-layout`, storeName = `layouts` } = options;
  let opening: Promise<IDBDatabase> | undefined;

  const open = (): Promise<IDBDatabase> => {
    if(opening === undefined) {
      const factory = options.indexedDB ?? (typeof indexedDB === `undefined` ? undefined : indexedDB);
      opening = new Promise<IDBDatabase>((resolve, reject) => {
        if(factory === undefined) {
          reject(new Error(`IndexedDB is not available`));
          return;
        }
        const request = factory.open(dbName, 1);
        request.onupgradeneeded = (): void => {
          request.result.createObjectStore(storeName);
        };
        request.onsuccess = (): void => resolve(request.result);
        request.onerror = (): void => reject(request.error);
      });
      // A failed open is not cached: the next call tries again.
      opening.catch(() => {
        opening = undefined;
      });
    }
    return opening;
  };

  const write = async (action: (store: IDBObjectStore) => void): Promise<void> => {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, `readwrite`);
      transaction.oncomplete = (): void => resolve();
      transaction.onerror = (): void => reject(transaction.error);
      transaction.onabort = (): void => reject(transaction.error);
      action(transaction.objectStore(storeName));
    });
  };

  return {
    async getItem(key: string): Promise<string | null> {
      const db = await open();
      const value: unknown = await requestToPromise(db.transaction(storeName, `readonly`).objectStore(storeName).get(key));
      return typeof value === `string` ? value : null;
    },
    removeItem: (key: string): Promise<void> => write(store => {
      store.delete(key);
    }),
    setItem: (key: string, value: string): Promise<void> => write(store => {
      store.put(value, key);
    }),
  };
}

/**
 * An {@link IAsyncLayoutStorage} backed by a plain REST endpoint: `GET`/`PUT`/`DELETE` on
 * `${baseUrl}/${encodeURIComponent(key)}`. The body is the serialized layout as JSON text. A `404` on `GET` means "nothing
 * stored" (`null`), and on `DELETE` it is fine; any other non-2xx response rejects.
 */
export function createHttpStorage(options: IHttpStorageOptions): IAsyncLayoutStorage {
  const baseUrl = options.baseUrl.replace(/\/+$/, ``);

  const send = async (key: string, method: `DELETE` | `GET` | `PUT`, body?: string): Promise<Response> => {
    const doFetch = options.fetch ?? (typeof fetch === `undefined` ? undefined : fetch);
    if(doFetch === undefined) {
      throw new Error(`fetch is not available`);
    }
    const extra = typeof options.headers === `function` ? await options.headers() : options.headers;
    const headers: Record<string, string> = { ...extra };
    if(body !== undefined) {
      headers[`Content-Type`] = `application/json`;
    }
    const url = `${baseUrl}/${encodeURIComponent(key)}`;
    const response = await doFetch(url, body === undefined ? { headers, method } : { body, headers, method });
    if(!response.ok && response.status !== 404) {
      throw new Error(`${method} ${url} failed with status ${response.status}`);
    }
    return response;
  };

  return {
    async getItem(key: string): Promise<string | null> {
      const response = await send(key, `GET`);
      return response.status === 404 ? null : response.text();
    },
    async removeItem(key: string): Promise<void> {
      await send(key, `DELETE`);
    },
    async setItem(key: string, value: string): Promise<void> {
      const response = await send(key, `PUT`, value);
      // A 404 is tolerated for GET/DELETE, but a write that hits one has not stored anything.
      if(response.status === 404) {
        throw new Error(`PUT ${baseUrl}/${encodeURIComponent(key)} failed with status 404`);
      }
    },
  };
}

/** An {@link IAsyncLayoutStorage} that keeps everything in memory — for tests and demos, or as a stand-in while a real backend is built. */
export function createMemoryAsyncStorage(initial: Record<string, string> = {}): IAsyncLayoutStorage {
  const items = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string): Promise<string | null> => Promise.resolve(items.get(key) ?? null),
    removeItem: (key: string): Promise<void> => {
      items.delete(key);
      return Promise.resolve();
    },
    setItem: (key: string, value: string): Promise<void> => {
      items.set(key, value);
      return Promise.resolve();
    },
  };
}

/**
 * Binds a layout store and a key into the four operations every framework wrapper needs, with the two things that are easy
 * to get wrong done once:
 *
 * - **Order.** Writes (`save`, `clear`) and reads go through one queue, so a slow `save` can never be overtaken by a later
 *   one (which would leave the older layout stored), and a `load` always sees the writes made before it.
 * - **Failures.** No method rejects. A failing store reports to `onError` and the method resolves `false` / `null`, so a
 *   fire-and-forget `save()` from an event handler never becomes an unhandled rejection.
 *
 * Layouts go through `serializeLayout` / `deserializeLayout`, so the internal `moved` flag is stripped on the way out and a
 * stored value that is not a valid layout comes back as `null`.
 *
 * @param storage The store.
 * @param key     The key to read and write under.
 * @param onError Called with whatever the store threw.
 */
export function createAsyncLayoutPersistence(
  storage: IAsyncLayoutStorage,
  key: string,
  onError?: (error: unknown) => void,
): IAsyncLayoutPersistence {
  let tail: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(task: () => Promise<T>, fallback: T): Promise<T> => {
    const result = tail.then(task).catch((error: unknown) => {
      onError?.(error);
      return fallback;
    });
    tail = result;
    return result;
  };

  return {
    clear: (): Promise<boolean> => enqueue(async () => {
      await storage.removeItem(key);
      return true;
    }, false),
    hasSaved: (): Promise<boolean> => enqueue(async () => (await storage.getItem(key)) !== null, false),
    load: (): Promise<TLayout | null> => enqueue(async () => deserializeLayout(await storage.getItem(key)), null),
    save: (layout: TLayout): Promise<boolean> => enqueue(async () => {
      await storage.setItem(key, serializeLayout(layout));
      return true;
    }, false),
  };
}
