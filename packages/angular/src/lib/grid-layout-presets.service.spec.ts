import { GridLayoutPresetsService } from './grid-layout-presets.service';
import type { TLayout } from '@keystone-dashboard-layout/core';

/** Same in-memory `Storage` double as `grid-layout-storage.service.spec.ts` — see that file's own comment for why. */
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

describe(`GridLayoutPresetsService`, () => {
  let service: GridLayoutPresetsService;
  let storage: FakeStorage;

  const compactLayout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
  const detailedLayout: TLayout = [{ h: 4, i: `0`, w: 4, x: 0, y: 0 }];

  beforeEach(() => {
    service = new GridLayoutPresetsService();
    storage = new FakeStorage();
  });

  it(`Should round-trip a preset through savePreset() then loadPreset()`, () => {
    service.savePreset(`dashboard`, `compact`, compactLayout, storage);

    expect(service.loadPreset(`dashboard`, `compact`, storage)).toEqual(compactLayout);
  });

  it(`Should keep two distinctly-named presets independent of each other`, () => {
    service.savePreset(`dashboard`, `compact`, compactLayout, storage);
    service.savePreset(`dashboard`, `detailed`, detailedLayout, storage);

    expect(service.loadPreset(`dashboard`, `compact`, storage)).toEqual(compactLayout);
    expect(service.loadPreset(`dashboard`, `detailed`, storage)).toEqual(detailedLayout);
  });

  it(`Should overwrite an existing preset of the same name`, () => {
    service.savePreset(`dashboard`, `compact`, compactLayout, storage);
    service.savePreset(`dashboard`, `compact`, detailedLayout, storage);

    expect(service.loadPreset(`dashboard`, `compact`, storage)).toEqual(detailedLayout);
  });

  it(`Should return null from loadPreset() when no preset exists under that name`, () => {
    expect(service.loadPreset(`dashboard`, `does-not-exist`, storage)).toBeNull();
  });

  it(`Should remove just the named preset via deletePreset(), leaving others intact`, () => {
    service.savePreset(`dashboard`, `compact`, compactLayout, storage);
    service.savePreset(`dashboard`, `detailed`, detailedLayout, storage);

    service.deletePreset(`dashboard`, `compact`, storage);

    expect(service.loadPreset(`dashboard`, `compact`, storage)).toBeNull();
    expect(service.loadPreset(`dashboard`, `detailed`, storage)).toEqual(detailedLayout);
  });

  it(`Should list every saved preset name via listPresets()`, () => {
    service.savePreset(`dashboard`, `compact`, compactLayout, storage);
    service.savePreset(`dashboard`, `detailed`, detailedLayout, storage);

    expect(service.listPresets(`dashboard`, storage)).toEqual([`compact`, `detailed`]);
  });

  it(`Should return an empty array from listPresets() when nothing has been saved under that key`, () => {
    expect(service.listPresets(`dashboard`, storage)).toEqual([]);
  });

  it(`Should report hasPreset() correctly before and after savePreset()`, () => {
    expect(service.hasPreset(`dashboard`, `compact`, storage)).toBe(false);

    service.savePreset(`dashboard`, `compact`, compactLayout, storage);

    expect(service.hasPreset(`dashboard`, `compact`, storage)).toBe(true);
  });

  it(`Should keep presets under two distinct keys independent of each other`, () => {
    service.savePreset(`dashboard-a`, `compact`, compactLayout, storage);
    service.savePreset(`dashboard-b`, `compact`, detailedLayout, storage);

    expect(service.loadPreset(`dashboard-a`, `compact`, storage)).toEqual(compactLayout);
    expect(service.loadPreset(`dashboard-b`, `compact`, storage)).toEqual(detailedLayout);
  });

  it(`Should not throw when no storage is available at all (SSR) and should no-op gracefully`, () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- intentionally simulating an environment where this global doesn't exist at all.
    delete globalThis.window;

    expect(() => service.savePreset(`dashboard`, `compact`, compactLayout)).not.toThrow();
    expect(service.loadPreset(`dashboard`, `compact`)).toBeNull();
    expect(service.listPresets(`dashboard`)).toEqual([]);
    expect(service.hasPreset(`dashboard`, `compact`)).toBe(false);
    expect(() => service.deletePreset(`dashboard`, `compact`)).not.toThrow();

    globalThis.window = originalWindow;
  });

  it(`Should treat stored data that parses to valid JSON but isn't a plain object (e.g. an array) as if nothing were stored at all`, () => {
    // Bypasses savePreset()'s own JSON.stringify(...) entirely, injecting
    // raw, already-parseable-but-wrong-shaped data directly — the one
    // way to reach readAllPresets()'s own "valid JSON, but not an
    // object" guard, distinct from the malformed-JSON case below.
    storage.setItem(`dashboard`, JSON.stringify([1, 2, 3]));

    expect(service.listPresets(`dashboard`, storage)).toEqual([]);
    expect(service.hasPreset(`dashboard`, `compact`, storage)).toBe(false);
  });

  // The array test above isolates only the third of three chained
  // conditions (parsed && typeof parsed === 'object' &&
  // !Array.isArray(parsed)) — an array is truthy AND typeof 'object',
  // so only its own !Array.isArray check is what actually fails there.
  // Each test below isolates one of the other two instead.
  it(`Should treat stored data that parses to a falsy value (null) as if nothing were stored at all`, () => {
    // JSON.parse('null') is the JS value null — falsy, isolating the
    // first condition ("parsed &&") specifically, since typeof null is
    // 'object' (a well-known JS quirk) and Array.isArray(null) is false
    // — both of the OTHER conditions would actually pass here.
    storage.setItem(`dashboard`, `null`);

    expect(service.listPresets(`dashboard`, storage)).toEqual([]);
  });

  it(`Should treat stored data that parses to a non-object primitive (e.g. a string) as if nothing were stored at all`, () => {
    // JSON.parse('"hello"') is the string "hello" — truthy (passing the
    // first condition) but typeof 'string', not 'object', isolating the
    // second condition specifically.
    storage.setItem(`dashboard`, JSON.stringify(`hello`));

    expect(service.listPresets(`dashboard`, storage)).toEqual([]);
  });

  it(`Should treat stored data that isn't even valid JSON as if nothing were stored at all, not throw`, () => {
    storage.setItem(`dashboard`, `{not valid json`);

    expect(() => service.listPresets(`dashboard`, storage)).not.toThrow();
    expect(service.listPresets(`dashboard`, storage)).toEqual([]);
    expect(service.hasPreset(`dashboard`, `compact`, storage)).toBe(false);
  });

  it(`Should fall back to the real window.localStorage when no explicit storage argument is given at all`, () => {
    // Every other test in this file always passes the FakeStorage
    // double explicitly — resolveStorage()'s own "if(storage) return
    // storage;" guard means none of them ever actually reach its own
    // "no explicit storage, fall back to window.localStorage" branch at
    // all. jsdom (this project's own Jest test environment) already
    // provides a real, working window.localStorage implementation, so
    // simply omitting the storage argument entirely is what reaches it.
    window.localStorage.clear();

    service.savePreset(`dashboard`, `compact`, compactLayout);

    expect(service.loadPreset(`dashboard`, `compact`)).toEqual(compactLayout);

    window.localStorage.clear();
  });
});
