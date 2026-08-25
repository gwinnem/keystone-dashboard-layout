import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// The Jest-side equivalent of what src/test.ts (still present, used by
// Karma) does for Karma — initializes zone.js's own testing patches so
// TestBed-based specs work correctly. jest-preset-angular's own
// documented, current API for this (not the older bare `import
// 'jest-preset-angular/setup-jest'` string-import style still floating
// around in older docs/blog posts, which is for a previous major
// version of this package).
setupZoneTestEnv();

/**
 * ResizeObserver mock — confirmed necessary via a fresh Jest run
 * throwing `ReferenceError: ResizeObserver is not defined`, not
 * assumed up front. jsdom (Jest's own DOM environment here, unlike
 * Karma's real Chrome) implements no `ResizeObserver` at all.
 *
 * This is deliberately a no-op (never actually calls its own callback)
 * — jsdom also has no real layout engine at all, so even a "working"
 * ResizeObserver mock that *did* fire would only ever report `0` for
 * any element's own size, no more useful than not firing at all. Tests
 * that need `GridLayoutComponent`'s own `containerWidth` to be
 * genuinely non-zero mock `offsetWidth` directly instead (see
 * `grid-layout.component.spec.ts`'s own comment on that specific
 * test), which is the only thing that actually works for driving
 * jsdom to report a size at all. This mock's own job is narrower: stop
 * `new ResizeObserver(...)` itself from throwing, nothing more.
 */
class ResizeObserverMock {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = ResizeObserverMock;
