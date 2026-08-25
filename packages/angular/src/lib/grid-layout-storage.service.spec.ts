import { GridLayoutStorageService } from './grid-layout-storage.service';
import type { TLayout } from '@keystone-dashboard-layout/core';

/** A minimal, in-memory `Storage` double — avoids depending on jsdom's own `localStorage` implementation (or lack thereof) for these tests, and lets each test start from a genuinely empty, isolated store. */
class FakeStorage implements Storage {
  private readonly map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe(`GridLayoutStorageService`, () => {
  let service: GridLayoutStorageService;
  let storage: FakeStorage;

  const layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];

  beforeEach(() => {
    service = new GridLayoutStorageService();
    storage = new FakeStorage();
  });

  it(`Should round-trip a layout through save() then load()`, () => {
    service.save(`my-key`, layout, storage);

    const loaded = service.load(`my-key`, storage);

    expect(loaded).toEqual(layout);
  });

  it(`Should strip the internal moved field when saving (via core's own serializeLayout)`, () => {
    const layoutWithMoved: TLayout = [{ h: 2, i: `0`, moved: true, w: 2, x: 0, y: 0 }];

    service.save(`my-key`, layoutWithMoved, storage);

    const raw = storage.getItem(`my-key`);
    expect(raw).not.toContain(`moved`);
  });

  it(`Should return null from load() when nothing is stored under that key`, () => {
    expect(service.load(`does-not-exist`, storage)).toBeNull();
  });

  it(`Should return null from load() when the stored value isn't valid JSON`, () => {
    storage.setItem(`my-key`, `not valid json{{{`);

    expect(service.load(`my-key`, storage)).toBeNull();
  });

  it(`Should remove the stored value via clear()`, () => {
    service.save(`my-key`, layout, storage);

    service.clear(`my-key`, storage);

    expect(service.load(`my-key`, storage)).toBeNull();
  });

  it(`Should report hasSaved() correctly before and after save()`, () => {
    expect(service.hasSaved(`my-key`, storage)).toBe(false);

    service.save(`my-key`, layout, storage);

    expect(service.hasSaved(`my-key`, storage)).toBe(true);
  });

  it(`Should not throw when no storage is available at all (SSR) and should no-op gracefully`, () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- intentionally simulating an environment where this global doesn't exist at all, matching the SSR case this service's own doc comment describes.
    delete globalThis.window;

    expect(() => service.save(`my-key`, layout)).not.toThrow();
    expect(service.load(`my-key`)).toBeNull();
    expect(service.hasSaved(`my-key`)).toBe(false);
    expect(() => service.clear(`my-key`)).not.toThrow();

    globalThis.window = originalWindow;
  });

  it(`Should default to window.localStorage when no explicit storage is passed`, () => {
    service.save(`kdl-storage-test`, layout);

    const loaded = service.load(`kdl-storage-test`);

    expect(loaded).toEqual(layout);
    window.localStorage.removeItem(`kdl-storage-test`);
  });
});
