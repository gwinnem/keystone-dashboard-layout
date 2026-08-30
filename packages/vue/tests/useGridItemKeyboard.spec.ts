import { describe, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import { useGridItemKeyboard } from '../src/components/Grid/composables/useGridItemKeyboard';
import { EGridItemEvent } from '@/core/griditem/enums/EGridItemEvents';
import type { IGridItemComposableContext } from '../src/components/Grid/composables/grid-item-composable-context';
import type { IGridItemProps } from '../src/components/Grid/grid-item-props.interface';

const CONTAINER_WIDTH = 1210;
const MARGIN = [10, 10];
const ROW_HEIGHT = 150;
const COLS = 12;

/** A minimal fake KeyboardEvent — only `key`/`shiftKey`/`ctrlKey`/`altKey`/`metaKey` are ever read, plus a spyable `preventDefault`. */
const keyEvent = (key: string, modifiers: Partial<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}): KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> } => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  preventDefault: vi.fn(),
  shiftKey: false,
  ...modifiers,
} as unknown as KeyboardEvent & { preventDefault: ReturnType<typeof vi.fn> });

const createContext = (propOverrides: Partial<IGridItemProps> = {}, rtl = false) => {
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const props: IGridItemProps = {
    h: 2,
    i: `item-1`,
    isStatic: false,
    maxH: Infinity,
    maxW: Infinity,
    minH: 1,
    minW: 1,
    w: 2,
    x: 4,
    y: 4,
    ...propOverrides,
  };

  const ctx: IGridItemComposableContext & { draggable: ReturnType<typeof ref<boolean | null>>; resizable: ReturnType<typeof ref<boolean | null>> } = {
    autoHeightWrapper: ref(null),
    bounded: ref(null),
    cols: ref(COLS),
    containerWidth: ref(CONTAINER_WIDTH),
    draggable: ref(true),
    editModeEnabled: ref(true),
    emit,
    eventBus,
    gridItem: ref(document.createElement(`div`)),
    innerH: ref(props.h),
    innerW: ref(props.w),
    innerX: ref(props.x),
    innerY: ref(props.y),
    margin: ref(MARGIN),
    maxRows: ref(Infinity),
    props,
    renderRtl: computed(() => rtl),
    resizable: ref(true),
    resizeHandleRefs: {
      e: ref(null), n: ref(null), ne: ref(null), nw: ref(null),
      s: ref(null), se: ref(null), sw: ref(null), w: ref(null),
    },
    resizeHandles: ref([`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]),
    rowHeight: ref(ROW_HEIGHT),
    transformScale: ref(1),
  };

  const helper = useGridItemKeyboard(ctx);
  return { ctx, emit, eventBus, helper };
};

describe(`useGridItemKeyboard`, () => {
  describe(`guards`, () => {
    it(`Should be a no-op when isStatic is true`, () => {
      const { emit, helper } = createContext({ isStatic: true });
      helper.handleKeydown(keyEvent(`ArrowRight`));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should be a no-op when editModeEnabled is false`, () => {
      const { ctx, emit, helper } = createContext();
      ctx.editModeEnabled.value = false;
      helper.handleKeydown(keyEvent(`ArrowRight`));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should not hijack Ctrl+Arrow`, () => {
      const { emit, helper } = createContext();
      const event = keyEvent(`ArrowRight`, { ctrlKey: true });
      helper.handleKeydown(event);
      expect(emit).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it(`Should not hijack Alt+Arrow`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowRight`, { altKey: true }));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should not hijack Meta+Arrow`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowRight`, { metaKey: true }));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should ignore keys other than the four arrows`, () => {
      const { emit, helper } = createContext();
      const event = keyEvent(`Enter`);
      helper.handleKeydown(event);
      expect(emit).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it(`Should not move when draggable is false`, () => {
      const { ctx, emit, helper } = createContext();
      ctx.draggable.value = false;
      const event = keyEvent(`ArrowRight`);
      helper.handleKeydown(event);
      expect(emit).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it(`Should not resize when resizable is false`, () => {
      const { ctx, emit, helper } = createContext();
      ctx.resizable.value = false;
      const event = keyEvent(`ArrowRight`, { shiftKey: true });
      helper.handleKeydown(event);
      expect(emit).not.toHaveBeenCalled();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe(`moveBy (arrow keys)`, () => {
    it(`Should move right by one grid unit on ArrowRight and call preventDefault`, () => {
      const { emit, helper } = createContext();
      const event = keyEvent(`ArrowRight`);

      helper.handleKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 5, 4);
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVED, `item-1`, 5, 4);
    });

    it(`Should move left on ArrowLeft`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowLeft`));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 3, 4);
    });

    it(`Should move up on ArrowUp`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowUp`));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 4, 3);
    });

    it(`Should move down on ArrowDown`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowDown`));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 4, 5);
    });

    it(`Should clamp movement at the left/top boundary (0)`, () => {
      const { emit, helper } = createContext({ x: 0, y: 0 });
      helper.handleKeydown(keyEvent(`ArrowLeft`));
      helper.handleKeydown(keyEvent(`ArrowUp`));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should clamp movement at the right boundary (cols - innerW)`, () => {
      const { emit, helper } = createContext({ w: 2, x: 10 }); // cols(12) - w(2) = 10, already at the max
      helper.handleKeydown(keyEvent(`ArrowRight`));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should clamp movement at the bottom boundary (maxRows - innerH)`, () => {
      const { ctx, emit, helper } = createContext({ h: 2, y: 3 });
      ctx.maxRows.value = 5; // maxRows(5) - h(2) = 3, already at the max
      helper.handleKeydown(keyEvent(`ArrowDown`));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should flip the horizontal direction under RTL`, () => {
      const { emit, helper } = createContext({}, true);
      helper.handleKeydown(keyEvent(`ArrowRight`));
      // Physical ArrowRight moves x DOWN (not up) under RTL — see the
      // composable's own doc comment on why the delta is negated.
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 3, 4);
    });

    it(`Should not flip the vertical direction under RTL`, () => {
      const { emit, helper } = createContext({}, true);
      helper.handleKeydown(keyEvent(`ArrowDown`));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.MOVE, `item-1`, 4, 5);
    });

    it(`Should emit a synthetic dragstart (at the pre-move position) followed by dragend on the eventBus`, () => {
      const { eventBus, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowRight`));

      expect(eventBus.emit).toHaveBeenNthCalledWith(1, `dragEvent`, expect.objectContaining({ eventType: `dragstart`, x: 4, y: 4 }));
      expect(eventBus.emit).toHaveBeenNthCalledWith(2, `dragEvent`, expect.objectContaining({ eventType: `dragend`, x: 5, y: 4 }));
    });
  });

  describe(`resizeBy (shift+arrow keys)`, () => {
    it(`Should grow width by one grid unit on shift+ArrowRight and call preventDefault`, () => {
      const { emit, helper } = createContext();
      const event = keyEvent(`ArrowRight`, { shiftKey: true });

      helper.handleKeydown(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 2, 3, 2, 3);
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZED, `item-1`, 2, 3, 2, 3);
    });

    it(`Should shrink width on shift+ArrowLeft`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowLeft`, { shiftKey: true }));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 2, 1, 2, 1);
    });

    it(`Should grow height on shift+ArrowDown`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowDown`, { shiftKey: true }));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 3, 2, 3, 2);
    });

    it(`Should shrink height on shift+ArrowUp`, () => {
      const { emit, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowUp`, { shiftKey: true }));
      expect(emit).toHaveBeenCalledWith(EGridItemEvent.RESIZE, `item-1`, 1, 2, 1, 2);
    });

    it(`Should clamp shrinking to minW/minH`, () => {
      const { emit, helper } = createContext({ h: 1, minH: 1, minW: 1, w: 1 });
      helper.handleKeydown(keyEvent(`ArrowLeft`, { shiftKey: true }));
      helper.handleKeydown(keyEvent(`ArrowUp`, { shiftKey: true }));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should clamp growing to maxW/maxH`, () => {
      const { emit, helper } = createContext({ h: 2, maxH: 2, maxW: 2, w: 2 });
      helper.handleKeydown(keyEvent(`ArrowRight`, { shiftKey: true }));
      helper.handleKeydown(keyEvent(`ArrowDown`, { shiftKey: true }));
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should clamp growing to the grid's own boundary (cols/maxRows) distinct from a maxW/maxH prop`, () => {
      // No maxW/maxH set (Infinity) — only running out of columns/rows
      // should stop growth here, a separate term in the same Math.min.
      const { ctx, emit, helper } = createContext({ h: 1, w: 1, x: 1, y: 1 });
      ctx.cols.value = 3; // cols(3) - innerX(1) = 2, already at that boundary after one grow
      ctx.maxRows.value = 3;
      helper.handleKeydown(keyEvent(`ArrowRight`, { shiftKey: true })); // 1 -> 2, within bounds
      helper.handleKeydown(keyEvent(`ArrowDown`, { shiftKey: true }));
      // resizeBy() only emits the new size — nothing in this isolated
      // composable test applies it back to innerW/innerH the way a real
      // GridLayout round-trip would (see useGridItemResize.spec.ts's own
      // identical explanation for the same class of gap), so the second
      // press below needs that round-trip simulated manually, or it would
      // just repeat the exact same 1->2 computation instead of genuinely
      // attempting 2->3.
      ctx.innerW.value = 2;
      ctx.innerH.value = 2;
      emit.mockClear();

      // Second press would be 2 -> 3, exceeding the grid boundary term.
      helper.handleKeydown(keyEvent(`ArrowRight`, { shiftKey: true }));
      helper.handleKeydown(keyEvent(`ArrowDown`, { shiftKey: true }));

      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should emit a synthetic resizestart (at the pre-resize position) followed by resizeend on the eventBus`, () => {
      const { eventBus, helper } = createContext();
      helper.handleKeydown(keyEvent(`ArrowRight`, { shiftKey: true }));

      expect(eventBus.emit).toHaveBeenNthCalledWith(1, `resizeEvent`, expect.objectContaining({ eventType: `resizestart`, w: 2 }));
      expect(eventBus.emit).toHaveBeenNthCalledWith(2, `resizeEvent`, expect.objectContaining({ eventType: `resizeend`, w: 3 }));
    });
  });
});
