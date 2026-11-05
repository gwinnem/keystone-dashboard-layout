import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createAsyncLayoutPersistence,
  createHttpStorage,
  createIndexedDbStorage,
  createMemoryAsyncStorage,
  IAsyncLayoutStorage,
} from '../src/helpers/async-layout-storage';
import type { TLayout } from '../src/layout-definition';

const layout = (): TLayout => [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }, { h: 2, i: `b`, w: 2, x: 2, y: 0 }];

/** A just-enough IndexedDB: one database, one object store, requests and transactions that complete on a later tick. */
const createFakeIndexedDb = (behaviour: { abortWrites?: boolean; failOpen?: number; failReads?: boolean; failWrites?: boolean } = {}) => {
  const data = new Map<string, unknown>();
  /** `[storeName, mode]` of every transaction, in order. */
  const transactions: [string, string][] = [];
  let failOpen = behaviour.failOpen ?? 0;
  let created = false;
  const createObjectStore = vi.fn();
  const request = (compute: () => unknown) => {
    const result: { error: unknown; onerror: (() => void) | null; onsuccess: (() => void) | null; result: unknown } = { error: null, onerror: null, onsuccess: null, result: undefined };
    queueMicrotask(() => {
      if(behaviour.failReads) {
        result.error = new Error(`read failed`);
        result.onerror?.();
        return;
      }
      result.result = compute();
      result.onsuccess?.();
    });
    return result;
  };
  const database = {
    createObjectStore,
    transaction: (storeName: string, mode: string) => {
      transactions.push([storeName, mode]);
      const transaction: { error: unknown; objectStore: () => unknown; onabort: (() => void) | null; oncomplete: (() => void) | null; onerror: (() => void) | null } = {
        error: null,
        objectStore: () => ({
          delete: (key: string) => {
            data.delete(key);
            finish();
          },
          get: (key: string) => request(() => data.get(key)),
          put: (value: unknown, key: string) => {
            data.set(key, value);
            finish();
          },
        }),
        onabort: null,
        oncomplete: null,
        onerror: null,
      };
      const finish = (): void => {
        setTimeout(() => {
          if(behaviour.abortWrites) {
            transaction.error = new Error(`write aborted`);
            transaction.onabort?.();
          } else if(behaviour.failWrites) {
            transaction.error = new Error(`write failed`);
            transaction.onerror?.();
          } else {
            transaction.oncomplete?.();
          }
        }, 0);
      };
      return transaction;
    },
  };
  const open = vi.fn(() => {
    const openRequest: { error: unknown; onerror: (() => void) | null; onsuccess: (() => void) | null; onupgradeneeded: (() => void) | null; result: unknown } = {
      error: null,
      onerror: null,
      onsuccess: null,
      onupgradeneeded: null,
      result: database,
    };
    setTimeout(() => {
      if(failOpen > 0) {
        failOpen -= 1;
        openRequest.error = new Error(`open failed`);
        openRequest.onerror?.();
        return;
      }
      if(!created) {
        created = true;
        openRequest.onupgradeneeded?.();
      }
      openRequest.onsuccess?.();
    }, 0);
    return openRequest;
  });
  return { createObjectStore, data, factory: { open } as unknown as IDBFactory, open, transactions };
};

const response = (status: number, body = ``) => ({ ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) }) as unknown as Response;

describe(`async-layout-storage`, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe(`createMemoryAsyncStorage`, () => {
    it(`Should store, read and remove values`, async () => {
      const storage = createMemoryAsyncStorage();

      expect(await storage.getItem(`k`)).toBeNull();
      await storage.setItem(`k`, `v`);
      expect(await storage.getItem(`k`)).toBe(`v`);
      await storage.removeItem(`k`);
      expect(await storage.getItem(`k`)).toBeNull();
    });

    it(`Should start from the given values`, async () => {
      expect(await createMemoryAsyncStorage({ k: `v` }).getItem(`k`)).toBe(`v`);
    });
  });

  describe(`createIndexedDbStorage`, () => {
    it(`Should store, read and remove values`, async () => {
      const { factory } = createFakeIndexedDb();
      const storage = createIndexedDbStorage({ indexedDB: factory });

      expect(await storage.getItem(`k`)).toBeNull();
      await storage.setItem(`k`, `v`);
      expect(await storage.getItem(`k`)).toBe(`v`);
      await storage.removeItem(`k`);
      expect(await storage.getItem(`k`)).toBeNull();
    });

    it(`Should open the database once, creating the store with the configured names`, async () => {
      const { createObjectStore, factory, open } = createFakeIndexedDb();
      const storage = createIndexedDbStorage({ dbName: `my-db`, indexedDB: factory, storeName: `my-store` });

      await storage.setItem(`a`, `1`);
      await storage.getItem(`a`);
      await storage.removeItem(`a`);

      expect(open).toHaveBeenCalledTimes(1);
      expect(open).toHaveBeenCalledWith(`my-db`, 1);
      expect(createObjectStore).toHaveBeenCalledWith(`my-store`);
    });

    it(`Should use the default database and store names`, async () => {
      const { createObjectStore, factory, open } = createFakeIndexedDb();

      await createIndexedDbStorage({ indexedDB: factory }).getItem(`a`);

      expect(open).toHaveBeenCalledWith(`keystone-dashboard-layout`, 1);
      expect(createObjectStore).toHaveBeenCalledWith(`layouts`);
    });

    it(`Should read a stored value that is not a string as nothing`, async () => {
      const { data, factory } = createFakeIndexedDb();
      data.set(`k`, 5);

      expect(await createIndexedDbStorage({ indexedDB: factory }).getItem(`k`)).toBeNull();
    });

    it(`Should fall back to the global indexedDB`, async () => {
      const { factory } = createFakeIndexedDb();
      vi.stubGlobal(`indexedDB`, factory);
      const storage = createIndexedDbStorage();

      await storage.setItem(`k`, `v`);

      expect(await storage.getItem(`k`)).toBe(`v`);
    });

    it(`Should reject, not throw, when IndexedDB is not available`, async () => {
      vi.stubGlobal(`indexedDB`, undefined);
      const storage = createIndexedDbStorage();

      await expect(storage.getItem(`k`)).rejects.toThrow(`IndexedDB is not available`);
      await expect(storage.setItem(`k`, `v`)).rejects.toThrow(`IndexedDB is not available`);
    });

    it(`Should reject when the database cannot be opened, and try again on the next call`, async () => {
      const { factory, open } = createFakeIndexedDb({ failOpen: 1 });
      const storage = createIndexedDbStorage({ indexedDB: factory });

      await expect(storage.getItem(`k`)).rejects.toThrow(`open failed`);
      await storage.setItem(`k`, `v`);

      expect(await storage.getItem(`k`)).toBe(`v`);
      expect(open).toHaveBeenCalledTimes(2);
    });

    it(`Should reject a write whose transaction fails`, async () => {
      const { factory } = createFakeIndexedDb({ failWrites: true });

      await expect(createIndexedDbStorage({ indexedDB: factory }).setItem(`k`, `v`)).rejects.toThrow(`write failed`);
    });

    it(`Should reject a write whose transaction is aborted`, async () => {
      const { factory } = createFakeIndexedDb({ abortWrites: true });

      await expect(createIndexedDbStorage({ indexedDB: factory }).setItem(`k`, `v`)).rejects.toThrow(`write aborted`);
    });

    it(`Should reject a read that fails`, async () => {
      const { factory } = createFakeIndexedDb({ failReads: true });

      await expect(createIndexedDbStorage({ indexedDB: factory }).getItem(`k`)).rejects.toThrow(`read failed`);
    });

    it(`Should read in a readonly transaction and write in a readwrite one, on the configured store`, async () => {
      const { factory, transactions } = createFakeIndexedDb();
      const storage = createIndexedDbStorage({ indexedDB: factory, storeName: `s` });

      await storage.getItem(`k`);
      await storage.setItem(`k`, `v`);
      await storage.removeItem(`k`);

      expect(transactions).toEqual([[`s`, `readonly`], [`s`, `readwrite`], [`s`, `readwrite`]]);
    });
  });

  describe(`createHttpStorage`, () => {
    it(`Should GET the value from the key's URL`, async () => {
      const doFetch = vi.fn().mockResolvedValue(response(200, `[]`));
      const storage = createHttpStorage({ baseUrl: `https://api.test/layouts`, fetch: doFetch });

      expect(await storage.getItem(`my key/1`)).toBe(`[]`);
      expect(doFetch).toHaveBeenCalledWith(`https://api.test/layouts/my%20key%2F1`, { headers: {}, method: `GET` });
      // Strict: a request without a body must not carry a `body: undefined` key either.
      expect(doFetch.mock.calls[0][1]).toStrictEqual({ headers: {}, method: `GET` });
    });

    it(`Should read a 404 as nothing stored`, async () => {
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: vi.fn().mockResolvedValue(response(404)) });

      expect(await storage.getItem(`k`)).toBeNull();
    });

    it(`Should reject any other failed GET`, async () => {
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: vi.fn().mockResolvedValue(response(500)) });

      await expect(storage.getItem(`k`)).rejects.toThrow(`GET https://api.test/k failed with status 500`);
    });

    it(`Should PUT the value as JSON`, async () => {
      const doFetch = vi.fn().mockResolvedValue(response(204));
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: doFetch });

      await storage.setItem(`k`, `[1]`);

      expect(doFetch).toHaveBeenCalledWith(`https://api.test/k`, { body: `[1]`, headers: { 'Content-Type': `application/json` }, method: `PUT` });
    });

    it(`Should reject a failed PUT, including a 404`, async () => {
      const failing = createHttpStorage({ baseUrl: `https://api.test`, fetch: vi.fn().mockResolvedValue(response(500)) });
      const missing = createHttpStorage({ baseUrl: `https://api.test`, fetch: vi.fn().mockResolvedValue(response(404)) });

      await expect(failing.setItem(`k`, `v`)).rejects.toThrow(`PUT https://api.test/k failed with status 500`);
      await expect(missing.setItem(`k`, `v`)).rejects.toThrow(`PUT https://api.test/k failed with status 404`);
    });

    it(`Should DELETE, treating a 404 as already gone`, async () => {
      const doFetch = vi.fn().mockResolvedValueOnce(response(204)).mockResolvedValueOnce(response(404));
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: doFetch });

      await storage.removeItem(`k`);
      await storage.removeItem(`k`);

      expect(doFetch).toHaveBeenCalledWith(`https://api.test/k`, { headers: {}, method: `DELETE` });
    });

    it(`Should reject a failed DELETE`, async () => {
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: vi.fn().mockResolvedValue(response(403)) });

      await expect(storage.removeItem(`k`)).rejects.toThrow(`DELETE https://api.test/k failed with status 403`);
    });

    it(`Should ignore trailing slashes on the base URL`, async () => {
      const doFetch = vi.fn().mockResolvedValue(response(200, `x`));

      await createHttpStorage({ baseUrl: `https://api.test/layouts//`, fetch: doFetch }).getItem(`k`);

      expect(doFetch.mock.calls[0][0]).toBe(`https://api.test/layouts/k`);
    });

    it(`Should send static headers`, async () => {
      const doFetch = vi.fn().mockResolvedValue(response(200, `x`));

      await createHttpStorage({ baseUrl: `https://api.test`, fetch: doFetch, headers: { Authorization: `Bearer t` } }).getItem(`k`);

      expect(doFetch.mock.calls[0][1].headers).toEqual({ Authorization: `Bearer t` });
    });

    it(`Should call a headers function before every request, and wait for an async one`, async () => {
      const doFetch = vi.fn().mockResolvedValue(response(200, `x`));
      const headers = vi.fn().mockResolvedValueOnce({ Authorization: `one` }).mockResolvedValueOnce({ Authorization: `two` });
      const storage = createHttpStorage({ baseUrl: `https://api.test`, fetch: doFetch, headers });

      await storage.getItem(`k`);
      await storage.getItem(`k`);

      expect(doFetch.mock.calls[0][1].headers).toEqual({ Authorization: `one` });
      expect(doFetch.mock.calls[1][1].headers).toEqual({ Authorization: `two` });
    });

    it(`Should use the global fetch when none is given`, async () => {
      const globalFetch = vi.fn().mockResolvedValue(response(200, `x`));
      vi.stubGlobal(`fetch`, globalFetch);

      expect(await createHttpStorage({ baseUrl: `https://api.test` }).getItem(`k`)).toBe(`x`);
      expect(globalFetch).toHaveBeenCalledTimes(1);
    });

    it(`Should reject when there is no fetch at all`, async () => {
      vi.stubGlobal(`fetch`, undefined);

      await expect(createHttpStorage({ baseUrl: `https://api.test` }).getItem(`k`)).rejects.toThrow(`fetch is not available`);
    });
  });

  describe(`createAsyncLayoutPersistence`, () => {
    it(`Should save and load a layout`, async () => {
      const persistence = createAsyncLayoutPersistence(createMemoryAsyncStorage(), `k`);

      expect(await persistence.save(layout())).toBe(true);

      expect(await persistence.load()).toEqual(layout());
    });

    it(`Should strip the internal moved flag when saving`, async () => {
      const storage = createMemoryAsyncStorage();
      const persistence = createAsyncLayoutPersistence(storage, `k`);

      await persistence.save([{ h: 2, i: `a`, moved: true, w: 2, x: 0, y: 0 }]);

      expect(await storage.getItem(`k`)).not.toContain(`moved`);
    });

    it(`Should load nothing when nothing is stored, or what is stored is not a layout`, async () => {
      const storage = createMemoryAsyncStorage({ bad: `{not json`, wrong: `{"a":1}` });

      expect(await createAsyncLayoutPersistence(storage, `missing`).load()).toBeNull();
      expect(await createAsyncLayoutPersistence(storage, `bad`).load()).toBeNull();
      expect(await createAsyncLayoutPersistence(storage, `wrong`).load()).toBeNull();
    });

    it(`Should report whether anything is saved, and clear it`, async () => {
      const persistence = createAsyncLayoutPersistence(createMemoryAsyncStorage(), `k`);
      expect(await persistence.hasSaved()).toBe(false);

      await persistence.save(layout());
      expect(await persistence.hasSaved()).toBe(true);

      expect(await persistence.clear()).toBe(true);
      expect(await persistence.hasSaved()).toBe(false);
    });

    it(`Should report a failing store to onError and resolve false or null instead of rejecting`, async () => {
      const boom = new Error(`boom`);
      const storage: IAsyncLayoutStorage = {
        getItem: () => Promise.reject(boom),
        removeItem: () => Promise.reject(boom),
        setItem: () => Promise.reject(boom),
      };
      const onError = vi.fn();
      const persistence = createAsyncLayoutPersistence(storage, `k`, onError);

      expect(await persistence.save(layout())).toBe(false);
      expect(await persistence.load()).toBeNull();
      expect(await persistence.clear()).toBe(false);
      expect(await persistence.hasSaved()).toBe(false);

      expect(onError).toHaveBeenCalledTimes(4);
      expect(onError).toHaveBeenCalledWith(boom);
    });

    it(`Should not need an onError`, async () => {
      const storage: IAsyncLayoutStorage = {
        getItem: () => Promise.reject(new Error(`boom`)),
        removeItem: () => Promise.resolve(),
        setItem: () => Promise.resolve(),
      };

      expect(await createAsyncLayoutPersistence(storage, `k`).load()).toBeNull();
    });

    it(`Should keep working after a failure`, async () => {
      const items = new Map<string, string>();
      let fail = true;
      const storage: IAsyncLayoutStorage = {
        getItem: key => Promise.resolve(items.get(key) ?? null),
        removeItem: () => Promise.resolve(),
        setItem: (key, value) => {
          if(fail) {
            return Promise.reject(new Error(`down`));
          }
          items.set(key, value);
          return Promise.resolve();
        },
      };
      const persistence = createAsyncLayoutPersistence(storage, `k`);

      expect(await persistence.save(layout())).toBe(false);
      fail = false;

      expect(await persistence.save(layout())).toBe(true);
      expect(await persistence.load()).toEqual(layout());
    });

    it(`Should write in call order even when an earlier write is slower`, async () => {
      const items = new Map<string, string>();
      let calls = 0;
      const storage: IAsyncLayoutStorage = {
        getItem: key => Promise.resolve(items.get(key) ?? null),
        removeItem: () => Promise.resolve(),
        setItem: (key, value) => {
          calls += 1;
          const delay = calls === 1 ? 30 : 0;
          return new Promise<void>(resolve => {
            setTimeout(() => {
              items.set(key, value);
              resolve();
            }, delay);
          });
        },
      };
      const persistence = createAsyncLayoutPersistence(storage, `k`);
      const first = layout();
      const second: TLayout = [{ h: 1, i: `only`, w: 1, x: 0, y: 0 }];

      await Promise.all([persistence.save(first), persistence.save(second)]);

      expect(await persistence.load()).toEqual(second);
    });

    it(`Should let a load wait for a write started before it`, async () => {
      const items = new Map<string, string>();
      const storage: IAsyncLayoutStorage = {
        getItem: key => Promise.resolve(items.get(key) ?? null),
        removeItem: () => Promise.resolve(),
        setItem: (key, value) => new Promise<void>(resolve => {
          setTimeout(() => {
            items.set(key, value);
            resolve();
          }, 20);
        }),
      };
      const persistence = createAsyncLayoutPersistence(storage, `k`);

      const saving = persistence.save(layout());
      const loaded = await persistence.load();
      await saving;

      expect(loaded).toEqual(layout());
    });
  });
});
