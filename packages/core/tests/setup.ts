// Global Vitest setup for @keystone-dashboard-layout/core — runs once
// before each test file. Mirrors packages/vue/tests/setup.ts; kept as a
// separate copy since this package has no dependency on packages/vue
// (nor should it — the dependency direction only goes the other way).

import { vi } from 'vitest';

// jsdom does not implement ResizeObserver. Not currently used by anything
// under test in this package's own spec files, but harmless to stub
// globally in case a future core helper (or a migrated test) needs it.
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal(`ResizeObserver`, ResizeObserverMock);

// The native drag/resize engine (src/helpers/native-interaction.ts) uses
// setPointerCapture/releasePointerCapture, which jsdom doesn't implement
// at all (calling either throws "is not a function" without this stub).
if (!(`setPointerCapture` in Element.prototype)) {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
}

// createNativeAutoScroll (src/helpers/native-interaction.ts) drives its
// own polling loop via requestAnimationFrame — stubbed to a no-op rather
// than a real scheduler.
if (typeof globalThis.requestAnimationFrame !== `function`) {
  globalThis.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0) as unknown as number);
  globalThis.cancelAnimationFrame = vi.fn((handle: number) => clearTimeout(handle));
}

// jsdom doesn't implement PointerEvent at all. The native drag/resize
// engine is built on it, so tests dispatching real pointer gestures need
// a constructor to exist. A thin MouseEvent subclass carrying the one
// field actually read (pointerId) is sufficient.
if (typeof globalThis.PointerEvent === `undefined`) {
  class PointerEventPolyfill extends MouseEvent {
    public pointerId: number;

    constructor(type: string, params: MouseEventInit & { pointerId?: number } = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
