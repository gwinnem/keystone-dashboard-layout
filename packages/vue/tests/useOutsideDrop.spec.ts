import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useOutsideDrop } from '../src/components/Grid/composables/useOutsideDrop';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import type { IPlaceholder } from '@/core/gridlayout/interfaces/layout-data.interface';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';

/**
 * Direct unit tests for `useOutsideDrop`. Until now it was only
 * exercised indirectly through full `GridLayout` mounts, whose fixtures
 * all use a (0, 0) container offset — which is why every `+`/`-` swap in
 * the pixel-to-grid math survived mutation testing.
 *
 * Fixture used for the numbers below: container width 1220, colNum 12,
 * margin [10, 10], rowHeight 100 -> colWidth = (1220 - 10 * 13) / 12
 * = 90.8333...
 */
const createContext = (overrides: Partial<IGridLayoutProps> = {}, rect: Partial<DOMRect> = {}) => {
  const el = document.createElement(`div`);
  el.getBoundingClientRect = () => ({
    bottom: 500, height: 500, left: 0, right: 1220, top: 0, width: 1220, x: 0, y: 0, toJSON: () => ({}), ...rect,
  });
  const emit = vi.fn();
  const placeholder = ref<IPlaceholder>({ h: 0, i: ``, w: 0, x: 0, y: 0 });
  const isDragging = ref(false);
  const props = {
    colNum: 12,
    margin: [10, 10],
    maxRows: 8,
    outsideDropHeight: 2,
    outsideDropWidth: 2,
    rowHeight: 100,
    ...overrides,
  } as unknown as IGridLayoutProps;
  const helper = useOutsideDrop({ emit, isDragging, placeholder, props, refsLayout: ref(el as HTMLElement), width: ref(1220) });
  helper.setOutsideDropEnabled(true);
  return { el, emit, helper, isDragging, placeholder, props };
};

const fire = (
  element: HTMLElement,
  type: string,
  init: { clientX?: number; clientY?: number; dataTransfer?: DataTransfer | null } = {},
): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, `clientX`, { value: init.clientX ?? 0 });
  Object.defineProperty(event, `clientY`, { value: init.clientY ?? 0 });
  Object.defineProperty(event, `dataTransfer`, { value: init.dataTransfer ?? null });
  element.dispatchEvent(event);
  return event;
};

const dataTransfer = { getData: () => `` } as unknown as DataTransfer;

describe(`useOutsideDrop`, () => {
  describe(`grid position from the drop point`, () => {
    it(`Should subtract the container's own offset and the margin on both axes`, () => {
      const { el, emit } = createContext({}, { left: 50, top: 100 });

      // left = 201.2 - 50 = 151.2 -> (151.2 - 10) / 100.8333 = 1.40 -> 1
      // top  = 264   - 100 = 164  -> (164  - 10) / 110      = 1.40 -> 1
      fire(el, `drop`, { clientX: 201.2, clientY: 264, dataTransfer });

      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.ITEM_DROPPED_FROM_OUTSIDE, expect.objectContaining({ x: 1, y: 1 }));
    });

    it(`Should cap x at the last column the dropped item still fits in`, () => {
      const { el, emit } = createContext();

      fire(el, `drop`, { clientX: 5000, clientY: 0, dataTransfer });

      // x would be 49 -> capped at colNum - outsideDropWidth = 10
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.ITEM_DROPPED_FROM_OUTSIDE, expect.objectContaining({ x: 10 }));
    });

    it(`Should cap y at maxRows minus the dropped item's own height`, () => {
      const { el, emit } = createContext();

      fire(el, `drop`, { clientX: 0, clientY: 5000, dataTransfer });

      // y would be 45 -> capped at maxRows - outsideDropHeight = 8 - 2 = 6
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.ITEM_DROPPED_FROM_OUTSIDE, expect.objectContaining({ y: 6 }));
    });

    it(`Should never produce a negative position`, () => {
      const { el, emit } = createContext();

      fire(el, `drop`, { clientX: -500, clientY: -500, dataTransfer });

      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.ITEM_DROPPED_FROM_OUTSIDE, expect.objectContaining({ x: 0, y: 0 }));
    });
  });

  describe(`the live placeholder`, () => {
    it(`Should be filled in with its own id, position and size on dragover, and mark the grid as dragging`, () => {
      const { el, isDragging, placeholder } = createContext();

      fire(el, `dragover`, { clientX: 101, clientY: 0 });

      expect(placeholder.value).toEqual({ h: 2, i: `__outside_drop_placeholder__`, w: 2, x: 1, y: 0 });
      expect(isDragging.value).toBe(true);
    });
  });

  describe(`outsideDropAccept`, () => {
    it(`Should leave a rejected dragenter to the browser, without counting it`, () => {
      let accept = false;
      const { el, isDragging } = createContext({ outsideDropAccept: () => accept });

      const rejected = fire(el, `dragenter`);
      expect(rejected.defaultPrevented).toBe(false);

      // If the rejected dragenter had still been counted, the single
      // dragleave below would leave the count at 1 and the grid would
      // wrongly stay in its dragging state.
      accept = true;
      fire(el, `dragenter`);
      fire(el, `dragover`, { clientX: 101, clientY: 0 });
      expect(isDragging.value).toBe(true);
      fire(el, `dragleave`);

      expect(isDragging.value).toBe(false);
    });

    it(`Should ignore a rejected dragover entirely`, () => {
      const { el, isDragging } = createContext({ outsideDropAccept: () => false });

      const event = fire(el, `dragover`, { clientX: 101, clientY: 0 });

      expect(event.defaultPrevented).toBe(false);
      expect(isDragging.value).toBe(false);
    });

    it(`Should ignore a rejected drop entirely`, () => {
      const { el, emit } = createContext({ outsideDropAccept: () => false });

      const event = fire(el, `drop`, { clientX: 101, clientY: 0, dataTransfer });

      expect(event.defaultPrevented).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe(`switching it off`, () => {
    it(`Should stop reacting to dragenter, dragover, dragleave and drop`, () => {
      const { el, emit, helper } = createContext();
      helper.setOutsideDropEnabled(false);

      const enter = fire(el, `dragenter`);
      const over = fire(el, `dragover`, { clientX: 101, clientY: 0 });
      const leave = fire(el, `dragleave`);
      const drop = fire(el, `drop`, { clientX: 101, clientY: 0, dataTransfer });

      expect(enter.defaultPrevented).toBe(false);
      expect(over.defaultPrevented).toBe(false);
      expect(leave.defaultPrevented).toBe(false);
      expect(drop.defaultPrevented).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });
  });
});
