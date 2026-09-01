// Global Vitest setup — runs once before each test file. Same set of
// jsdom gaps the Vue package's own `tests/setup.ts` works around (see
// that file's own comments for the full rationale on each) — this
// package's drag/resize engine is the exact same shared
// `keystone-dashboard-layout-core` code, so it hits the identical gaps.
import { beforeEach, vi } from 'vitest';

// Captures the callback passed to `new ResizeObserver(callback)` so a
// test can simulate a *live* resize (jsdom itself never fires one) via
// `triggerResizeObserver()` in `test-helpers.ts` — the previous version
// of this mock silently ignored the constructor argument entirely,
// meaning no test could ever simulate more than the one-time initial
// `measure()` call every consumer of `ResizeObserver` in this package
// already does synchronously on mount.
//
// Tracks every constructed instance's own callback (not just the most
// recent), in construction order — Phase 19's own `autoHeight` feature
// means a single test can now have *two* `ResizeObserver`s alive at
// once (`GridLayout`'s own container-width observer, and a
// `resolvedAutoHeight`-enabled `GridItem`'s own wrapper observer), so
// "the most recently constructed one" (this mock's own original,
// simpler assumption, back when exactly one `ResizeObserver` existed
// per test in practice) is no longer unambiguous on its own.
// `triggerResizeObserverMock()` below still operates on the *last*
// entry, preserving every existing test's own behavior unchanged;
// `triggerResizeObserverMockAt()` lets a test target a specific one by
// construction order instead, for the two-observer case.
const resizeObserverCallbacks: ResizeObserverCallback[] = [];

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallbacks.push(callback);
  }
}
vi.stubGlobal(`ResizeObserver`, ResizeObserverMock);

/** Invokes the most recently constructed `ResizeObserver`'s own callback directly — see `ResizeObserverMock`'s own comment above for why this is necessary at all. Exported from setup so `test-helpers.ts` doesn't need to duplicate the module-level callback tracking. */
export function triggerResizeObserverMock(): void {
  resizeObserverCallbacks.at(-1)?.([], {} as ResizeObserver);
}

/**
 * Invokes the `ResizeObserver` constructed at the given 0-based
 * construction-order index (e.g. `0` for whichever was constructed
 * first in a test with two, `1` for the second) — needed once a single
 * test can have more than one real `ResizeObserver` alive at once (see
 * this file's own module-level comment above).
 */
export function triggerResizeObserverMockAt(index: number): void {
  resizeObserverCallbacks[index]?.([], {} as ResizeObserver);
}

// `setupFiles` runs this whole module once per test *file*, not once
// per test — without an explicit per-test reset, `resizeObserverCallbacks`
// would otherwise keep accumulating across every `it()` block in a
// file, silently shifting what index `0`/`1` refer to for every test
// after the first (a real bug caught while writing this comment, not
// a hypothetical one: the array is module-level state, and nothing
// about `beforeEach`/`afterEach` in an individual test file would ever
// clear it on its own).
beforeEach(() => {
  resizeObserverCallbacks.length = 0;
});

if(!(`setPointerCapture` in Element.prototype)) {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
}

if(typeof globalThis.requestAnimationFrame !== `function`) {
  globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0) as unknown as number);
  globalThis.cancelAnimationFrame = vi.fn((handle: number) => clearTimeout(handle));
}

if(typeof globalThis.PointerEvent === `undefined`) {
  class PointerEventPolyfill extends MouseEvent {
    public pointerId: number;

    constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
