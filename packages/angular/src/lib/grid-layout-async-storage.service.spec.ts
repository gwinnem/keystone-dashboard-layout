import { createMemoryAsyncStorage, serializeLayout } from 'keystone-dashboard-layout-core';
import type { IAsyncLayoutStorage, TLayout } from 'keystone-dashboard-layout-core';
import { GridLayoutAsyncStorageService } from './grid-layout-async-storage.service';
import type { IAsyncLayoutStorageError } from './grid-layout-async-storage.service';

const defaults = (): TLayout => [{ i: `a`, x: 0, y: 0, w: 2, h: 2 }];
const stored = (): TLayout => [{ i: `b`, x: 4, y: 0, w: 2, h: 2 }];

const failing = (error: Error, overrides: Partial<IAsyncLayoutStorage> = {}): IAsyncLayoutStorage => ({
  getItem: () => Promise.reject(error),
  removeItem: () => Promise.reject(error),
  setItem: () => Promise.reject(error),
  ...overrides,
});

describe(`GridLayoutAsyncStorageService`, () => {
  let service: GridLayoutAsyncStorageService;

  beforeEach(() => {
    service = new GridLayoutAsyncStorageService();
  });

  it(`Should resolve null from load() when nothing is stored yet`, async () => {
    expect(await service.load(`k`, createMemoryAsyncStorage())).toBeNull();
  });

  it(`Should round-trip a layout through save() and load()`, async () => {
    const storage = createMemoryAsyncStorage();

    expect(await service.save(`k`, defaults(), storage)).toBe(true);

    expect(await service.load(`k`, storage)).toEqual(defaults());
  });

  it(`Should write the serialized form, without the internal moved flag`, async () => {
    const storage = createMemoryAsyncStorage();

    await service.save(`k`, [{ i: `a`, moved: true, x: 0, y: 0, w: 2, h: 2 }], storage);

    expect(await storage.getItem(`k`)).toBe(serializeLayout(defaults()));
  });

  it(`Should resolve null when the stored value is not a valid layout`, async () => {
    expect(await service.load(`k`, createMemoryAsyncStorage({ k: `not json` }))).toBeNull();
  });

  it(`Should keep different keys and different stores apart`, async () => {
    const first = createMemoryAsyncStorage();
    const second = createMemoryAsyncStorage();

    await service.save(`one`, defaults(), first);
    await service.save(`two`, stored(), first);
    await service.save(`one`, stored(), second);

    expect(await service.load(`one`, first)).toEqual(defaults());
    expect(await service.load(`two`, first)).toEqual(stored());
    expect(await service.load(`one`, second)).toEqual(stored());
  });

  it(`Should report and remove what is stored`, async () => {
    const storage = createMemoryAsyncStorage();
    expect(await service.hasSaved(`k`, storage)).toBe(false);

    await service.save(`k`, defaults(), storage);
    expect(await service.hasSaved(`k`, storage)).toBe(true);

    expect(await service.clear(`k`, storage)).toBe(true);
    expect(await service.hasSaved(`k`, storage)).toBe(false);
  });

  it(`Should apply saves in call order even when an earlier one is slower`, async () => {
    const items = new Map<string, string>();
    const releases: (() => void)[] = [];
    const storage: IAsyncLayoutStorage = {
      getItem: key => Promise.resolve(items.get(key) ?? null),
      removeItem: () => Promise.resolve(),
      setItem: (key, value) => new Promise<void>(resolve => {
        releases.push(() => {
          items.set(key, value);
          resolve();
        });
      }),
    };

    const first = service.save(`k`, defaults(), storage);
    const second = service.save(`k`, stored(), storage);
    await Promise.resolve();
    // Only the first write has reached the store: the second is queued behind it.
    expect(releases.length).toBe(1);
    releases[0]();
    await first;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    releases[1]();
    await second;

    expect(JSON.parse(items.get(`k`) as string)).toEqual(stored());
  });

  it(`Should make load() wait for a save() that was started before it`, async () => {
    const storage = createMemoryAsyncStorage();

    void service.save(`k`, stored(), storage);

    expect(await service.load(`k`, storage)).toEqual(stored());
  });

  describe(`failures`, () => {
    it(`Should resolve false from save() and emit on errors$ instead of rejecting`, async () => {
      const boom = new Error(`boom`);
      const seen: IAsyncLayoutStorageError[] = [];
      service.errors$.subscribe(entry => seen.push(entry));

      expect(await service.save(`k`, defaults(), failing(boom))).toBe(false);

      expect(seen).toEqual([{ error: boom, key: `k` }]);
    });

    it(`Should resolve null from load() when the store fails`, async () => {
      const seen: IAsyncLayoutStorageError[] = [];
      service.errors$.subscribe(entry => seen.push(entry));

      expect(await service.load(`k`, failing(new Error(`down`)))).toBeNull();

      expect(seen.length).toBe(1);
    });

    it(`Should resolve false from clear() and hasSaved() when the store fails`, async () => {
      const storage = failing(new Error(`down`));

      expect(await service.clear(`k`, storage)).toBe(false);
      expect(await service.hasSaved(`k`, storage)).toBe(false);
    });

    it(`Should stay usable after a failure`, async () => {
      let fail = true;
      const items = new Map<string, string>();
      const storage: IAsyncLayoutStorage = {
        getItem: key => Promise.resolve(items.get(key) ?? null),
        removeItem: () => Promise.resolve(),
        setItem: (key, value) => (fail ? Promise.reject(new Error(`down`)) : Promise.resolve(void items.set(key, value))),
      };

      expect(await service.save(`k`, defaults(), storage)).toBe(false);
      fail = false;

      expect(await service.save(`k`, defaults(), storage)).toBe(true);
    });

    it(`Should not need a subscriber to errors$`, async () => {
      expect(await service.save(`k`, defaults(), failing(new Error(`down`)))).toBe(false);
    });
  });
});
