import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, render } from '@testing-library/react';
import { useGridItemResize } from '../hooks/useGridItemResize';
import type { IUseGridItemResizeOptions } from '../hooks/useGridItemResize';

/**
 * How `useGridItemResize` drives the two native engines from `keystone-dashboard-layout-core`: the auto-scroll engine and the resizable
 * that is wired onto the item's handle spans. Both factories are mocked, so these tests can count how often each is built and what is
 * called on it, which the real engines (already covered by core's own suite) would not let them do.
 *
 * `vi.hoisted`, because `vi.mock`'s factory is hoisted above every module-level declaration, the same as in `useGridItemDrag.hook.spec.tsx`.
 */
const { mockCreateNativeAutoScroll, mockCreateNativeResizable } = vi.hoisted(() => ({
  mockCreateNativeAutoScroll: vi.fn(),
  mockCreateNativeResizable: vi.fn(),
}));

vi.mock(`keystone-dashboard-layout-core`, async importOriginal => {
  const actual = await importOriginal<typeof import('keystone-dashboard-layout-core')>();
  return {
    ...actual,
    createNativeAutoScroll: mockCreateNativeAutoScroll,
    createNativeResizable: mockCreateNativeResizable,
  };
});

const defaultOptions = (overrides: Partial<IUseGridItemResizeOptions> = {}): IUseGridItemResizeOptions => ({
  autoScroll: false,
  containerWidth: 1210,
  cols: 12,
  enabled: true,
  h: 2,
  i: `item-1`,
  innerX: 0,
  innerY: 0,
  isMirrored: false,
  margin: [10, 10],
  maxH: Infinity,
  maxRows: Infinity,
  maxW: Infinity,
  minH: 1,
  minW: 1,
  onResize: vi.fn(),
  preserveAspectRatio: false,
  resizeHandles: [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`],
  rowHeight: 150,
  transformScale: 1,
  w: 2,
  ...overrides,
});

/** Renders all eight handle spans with their refs attached, as `GridItem` does: the wiring effect only attaches to spans that exist. */
function Harness({ options }: { options: IUseGridItemResizeOptions }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const result = useGridItemResize(rootRef, options);
  return (
    <div ref={rootRef}>
      <span ref={result.handleRefs.n} />
      <span ref={result.handleRefs.s} />
      <span ref={result.handleRefs.e} />
      <span ref={result.handleRefs.w} />
      <span ref={result.handleRefs.ne} />
      <span ref={result.handleRefs.nw} />
      <span ref={result.handleRefs.se} />
      <span ref={result.handleRefs.sw} />
    </div>
  );
}

const mount = (options: IUseGridItemResizeOptions) => {
  const view = render(<Harness options={options} />);
  return {
    root: view.container.firstElementChild as HTMLElement,
    rerenderWith: (next: IUseGridItemResizeOptions): void => view.rerender(<Harness options={next} />),
    unmount: view.unmount,
  };
};

/** The `handleResize` the hook handed to the (mocked) native resizable, called directly with a hand-built event. */
const fire = (root: HTMLElement, type: `resizestart` | `resizemove` | `resizeend`): void => {
  const handleResize = mockCreateNativeResizable.mock.calls.at(-1)![3] as (event: unknown) => void;
  act(() => {
    handleResize({ clientX: 0, clientY: 0, edges: { bottom: false, left: false, right: true, top: false }, target: root, type });
  });
};

describe(`useGridItemResize — the native engines it drives`, () => {
  let autoScroll: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  let destroy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    autoScroll = { start: vi.fn(), stop: vi.fn(), update: vi.fn() };
    destroy = vi.fn();
    mockCreateNativeAutoScroll.mockReset();
    mockCreateNativeAutoScroll.mockReturnValue(autoScroll);
    mockCreateNativeResizable.mockReset();
    mockCreateNativeResizable.mockReturnValue({ destroy });
  });

  describe(`the auto-scroll engine`, () => {
    it(`Should be constructed once, not again on every render`, () => {
      const view = mount(defaultOptions());
      expect(mockCreateNativeAutoScroll).toHaveBeenCalledTimes(1);

      view.rerenderWith(defaultOptions({ enabled: false }));

      expect(mockCreateNativeAutoScroll).toHaveBeenCalledTimes(1);
    });

    it(`Should be started on resizestart and given the pointer on resizemove while autoScroll is on`, () => {
      const { root } = mount(defaultOptions({ autoScroll: true }));

      fire(root, `resizestart`);
      fire(root, `resizemove`);

      expect(autoScroll.start).toHaveBeenCalledTimes(1);
      expect(autoScroll.update).toHaveBeenCalledTimes(1);
    });

    it(`Should be left alone on resizestart and resizemove while autoScroll is off`, () => {
      const { root } = mount(defaultOptions({ autoScroll: false }));

      fire(root, `resizestart`);
      fire(root, `resizemove`);

      expect(autoScroll.start).not.toHaveBeenCalled();
      expect(autoScroll.update).not.toHaveBeenCalled();
    });
  });

  describe(`the native resizable`, () => {
    it(`Should be wired again when the set of handles changes, even to a set whose names join to the same text`, () => {
      // [n, e] and [ne] are different handle sets, but joined with nothing between the names they both read "ne".
      const view = mount(defaultOptions({ resizeHandles: [`n`, `e`] }));
      expect(mockCreateNativeResizable).toHaveBeenCalledTimes(1);

      view.rerenderWith(defaultOptions({ resizeHandles: [`ne`] }));

      expect(mockCreateNativeResizable).toHaveBeenCalledTimes(2);
    });

    it(`Should not be wired again by a re-render that leaves the handle set as it was`, () => {
      const view = mount(defaultOptions({ resizeHandles: [`n`, `e`] }));

      view.rerenderWith(defaultOptions({ resizeHandles: [`n`, `e`] }));

      expect(mockCreateNativeResizable).toHaveBeenCalledTimes(1);
    });

    it(`Should be destroyed when the item unmounts`, () => {
      const view = mount(defaultOptions());
      expect(destroy).not.toHaveBeenCalled();

      view.unmount();

      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it(`Should be destroyed before a new one is wired, when the handle set changes`, () => {
      const view = mount(defaultOptions({ resizeHandles: [`n`, `e`] }));

      view.rerenderWith(defaultOptions({ resizeHandles: [`ne`] }));

      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });
});
