import { act } from '@testing-library/react';
import { triggerResizeObserverMock } from '../../../../tests/setup';

/**
 * jsdom performs no real layout, so `offsetWidth` is always 0 by
 * default — `GridLayout`'s own container-width state starts out at a
 * safe fallback (`100`) for exactly this reason, but that's still far
 * too narrow to produce realistic grid-unit math for tests that need
 * to assert a *specific* resulting position (as opposed to just a
 * clamped bound, which stays correct regardless of how extreme the
 * intermediate pixel math gets). Call this before rendering to
 * simulate a real, wide container — the same pattern the Vue
 * package's own `tests/helpers/mountGrid.ts` already establishes for
 * the identical reason.
 */
export function stubOffsetWidth(width: number): void {
  Object.defineProperty(HTMLElement.prototype, `offsetWidth`, {
    configurable: true,
    value: width,
  });
}

export function restoreOffsetWidth(): void {
  // @ts-expect-error -- offsetWidth isn't typed as optional/deletable on
  // HTMLElement's own DOM lib definition, but this is exactly undoing
  // the Object.defineProperty override in stubOffsetWidth() above.
  delete HTMLElement.prototype.offsetWidth;
}

/**
 * Simulates a *live* container resize — `stubOffsetWidth(width)`
 * followed by manually invoking the most recently constructed
 * `ResizeObserver`'s own callback (`triggerResizeObserverMock`, in
 * `tests/setup.ts`), since jsdom's own `ResizeObserver` mock never
 * fires on its own. `GridLayout`'s own container-width effect passes
 * its `measure` function directly as that callback, so this correctly
 * re-reads whatever `offsetWidth` is stubbed to at call time. Wrapped
 * in `act()` for the same reason `dispatchDragEvent`/
 * `dispatchResizeEvent` below are — the resulting `setContainerWidth`
 * call happens outside React's own event system.
 */
export function triggerResize(width: number): void {
  stubOffsetWidth(width);
  act(() => {
    triggerResizeObserverMock();
  });
}

/**
 * Invokes the native drag engine's own registered handler directly
 * (`handleDrag` inside `useGridItemDrag.ts`) — the same test-only
 * `__nativeDragHandler` backdoor `native-interaction.ts` stashes on the
 * element (shared, framework-agnostic code in
 * `@keystone-dashboard-layout/core`) that the Vue package's own test
 * suite already relies on for the identical reason: reaching the
 * handler without needing to simulate a full pointerdown/move/up
 * sequence (including native `setPointerCapture` semantics jsdom
 * doesn't implement) for every single assertion.
 *
 * Wrapped in `act()`: this is a *direct, synchronous function call*,
 * not a real DOM event going through React's own event system — the
 * `setState` calls inside `handleDrag` (`setIsDragging`/`setDragging`)
 * would otherwise be batched onto a microtask React schedules on its
 * own, meaning the very next line of a test (checking a CSS class that
 * depends on that state) would still see the *previous* render's DOM,
 * not the updated one. `act()` forces React to flush synchronously
 * before returning.
 */
export function dispatchDragEvent(
  target: Element,
  type: `dragstart` | `dragmove` | `dragend`,
  overrides: Record<string, unknown> = {},
): void {
  Object.defineProperty(target, `offsetParent`, { configurable: true, value: document.body });
  document.body.getBoundingClientRect = () => (
    { bottom: 0, height: 0, left: 0, right: 0, toJSON: () => ({}), top: 0, width: 0, x: 0, y: 0 }
  );
  (target as HTMLElement).getBoundingClientRect = () => (
    { bottom: 100, height: 95, left: 5, right: 100, toJSON: () => ({}), top: 5, width: 95, x: 5, y: 5 }
  );

  const handler = (target as unknown as { __nativeDragHandler: (event: unknown) => void }).__nativeDragHandler;
  act(() => {
    handler({ clientX: 0, clientY: 0, target, type, ...overrides });
  });
}

/** Resize counterpart to {@link dispatchDragEvent} — same `act()` rationale. */
export function dispatchResizeEvent(
  target: Element,
  type: `resizestart` | `resizemove` | `resizeend`,
  overrides: Record<string, unknown> = {},
): void {
  Object.defineProperty(target, `offsetParent`, { configurable: true, value: document.body });

  const handler = (target as unknown as { __nativeResizeHandler: (event: unknown) => void }).__nativeResizeHandler;
  act(() => {
    handler({
      clientX: 0,
      clientY: 0,
      edges: { bottom: true, left: false, right: true, top: false },
      target,
      type,
      ...overrides,
    });
  });
}
