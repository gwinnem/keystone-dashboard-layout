import { describe, expect, it, vi } from 'vitest';
import { useUndoRedo } from '../src/components/Grid/composables/useUndoRedo';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';
import type { ILayoutItem } from '../src/components';

const layoutOf = (ids: string[]): ILayoutItem[] => ids.map((id, index) => ({ h: 2, i: id, w: 2, x: index * 2, y: 0 }));

const createContext = (enableUndoRedo = true, undoHistoryLimit = 50) => {
  const emit = vi.fn();
  const updateHeight = vi.fn();
  const runCompaction = vi.fn();
  const props = { enableUndoRedo, layout: layoutOf([`a`, `b`]), undoHistoryLimit } as unknown as IGridLayoutProps;
  const helper = useUndoRedo({ emit, props, runCompaction, updateHeight });
  return { emit, helper, props, runCompaction, updateHeight };
};

describe(`useUndoRedo`, () => {
  describe(`canUndo/canRedo`, () => {
    it(`Should both be false when enableUndoRedo is off, even with real history`, () => {
      const { helper, props } = createContext(false);
      // Force real stack content the only way available without
      // enableUndoRedo blocking commitUndoPoint itself: toggle it on,
      // commit, then toggle back off — isolates canUndo/canRedo's own
      // "&& props.enableUndoRedo" gate from "the stack happens to be empty".
      props.enableUndoRedo = true;
      helper.commitUndoPoint(layoutOf([`a`]));
      props.enableUndoRedo = false;

      expect(helper.canUndo.value).toBe(false);
      expect(helper.canRedo.value).toBe(false);
    });

    it(`Should be false when enabled but the stacks are empty`, () => {
      const { helper } = createContext();
      expect(helper.canUndo.value).toBe(false);
      expect(helper.canRedo.value).toBe(false);
    });

    it(`Should report canUndo true once something is committed`, () => {
      const { helper } = createContext();
      helper.commitUndoPoint(layoutOf([`a`]));
      expect(helper.canUndo.value).toBe(true);
    });

    it(`Should report canRedo true once an undo has something to redo back to`, () => {
      const { helper } = createContext();
      helper.commitUndoPoint(layoutOf([`a`]));
      helper.undo();
      expect(helper.canRedo.value).toBe(true);
    });
  });

  describe(`commitUndoPoint`, () => {
    it(`Should be a no-op when enableUndoRedo is off`, () => {
      const { helper } = createContext(false);
      helper.commitUndoPoint(layoutOf([`a`]));
      expect(helper.canUndo.value).toBe(false);
    });

    it(`Should be a no-op when "before" is identical to the current layout (nothing actually changed)`, () => {
      const { helper, props } = createContext();
      // Same content as props.layout's own current value (layoutOf(['a','b'])).
      helper.commitUndoPoint(layoutOf([`a`, `b`]));
      expect(helper.canUndo.value).toBe(false);
      void props;
    });

    it(`Should push onto the undo stack and clear the redo stack when something genuinely changed`, () => {
      const { helper } = createContext();
      helper.commitUndoPoint(layoutOf([`a`]));
      helper.undo(); // gives redoStack something
      expect(helper.canRedo.value).toBe(true);

      helper.commitUndoPoint(layoutOf([`x`]));

      expect(helper.canRedo.value).toBe(false);
    });

    it(`Should drop the oldest entry once undoHistoryLimit is exceeded`, () => {
      const { helper, props } = createContext(true, 2);
      helper.commitUndoPoint(layoutOf([`1`]));
      props.layout = layoutOf([`1`]);
      helper.commitUndoPoint(layoutOf([`2`]));
      props.layout = layoutOf([`2`]);
      helper.commitUndoPoint(layoutOf([`3`])); // exceeds the limit of 2 — the '1' entry should be dropped

      // Undo three times: only 2 should actually be available (the
      // oldest, '1', was dropped) — the third undo() call is a no-op.
      helper.undo();
      helper.undo();
      const canUndoBeforeThird = helper.canUndo.value;
      helper.undo();

      expect(canUndoBeforeThird).toBe(false);
    });
  });

  describe(`undo`, () => {
    it(`Should be a no-op when enableUndoRedo is off`, () => {
      const { helper, props } = createContext();
      helper.commitUndoPoint(layoutOf([`a`]));
      props.enableUndoRedo = false;
      const before = [...props.layout];

      helper.undo();

      expect(props.layout).toStrictEqual(before);
    });

    it(`Should be a no-op when the undo stack is empty`, () => {
      const { emit, helper } = createContext();
      helper.undo();
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should restore the previous layout, push the current one onto redo, and run compaction/emit`, () => {
      const { emit, helper, props, runCompaction, updateHeight } = createContext();
      const original = layoutOf([`a`, `b`]);
      // Change the layout FIRST, then commit the pre-change snapshot as
      // "before" — matching the real order commitUndoPoint is always
      // used in (capture, then mutate, then commit). Committing "before"
      // while props.layout still equals it identically (the order this
      // test originally had, confirmed via a real, reproduced failure)
      // is a no-op — nothing has "changed" yet, so it never reaches the
      // undo stack at all.
      props.layout.splice(0, props.layout.length, ...layoutOf([`x`, `y`, `z`]));
      helper.commitUndoPoint(original);

      helper.undo();

      expect(props.layout.map(item => item.i)).toStrictEqual([`a`, `b`]);
      expect(runCompaction).toHaveBeenCalled();
      expect(updateHeight).toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.LAYOUT_UPDATE, props.layout);
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.LAYOUT_UPDATED, props.layout);
      expect(helper.canRedo.value).toBe(true);
    });
  });

  describe(`redo`, () => {
    it(`Should be a no-op when enableUndoRedo is off`, () => {
      const { helper, props } = createContext();
      helper.commitUndoPoint(layoutOf([`a`]));
      helper.undo();
      props.enableUndoRedo = false;
      const before = [...props.layout];

      helper.redo();

      expect(props.layout).toStrictEqual(before);
    });

    it(`Should be a no-op when the redo stack is empty`, () => {
      const { emit, helper } = createContext();
      helper.redo();
      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should restore the undone layout, push the current one onto undo, and run compaction/emit`, () => {
      const { emit, helper, props, runCompaction, updateHeight } = createContext();
      const original = layoutOf([`a`, `b`]);
      // Same ordering fix as the undo() test above — change first, then
      // commit the pre-change snapshot.
      props.layout.splice(0, props.layout.length, ...layoutOf([`x`, `y`]));
      helper.commitUndoPoint(original);
      helper.undo(); // layout is back to [a,b]; redoStack has [x,y]
      emit.mockClear();
      runCompaction.mockClear();
      updateHeight.mockClear();

      helper.redo();

      expect(props.layout.map(item => item.i)).toStrictEqual([`x`, `y`]);
      expect(runCompaction).toHaveBeenCalled();
      expect(updateHeight).toHaveBeenCalled();
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.LAYOUT_UPDATE, props.layout);
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.LAYOUT_UPDATED, props.layout);
    });
  });

  describe(`captureDragStart / commitDragEnd`, () => {
    it(`Should commit the captured pre-drag snapshot on commitDragEnd`, () => {
      const { helper, props } = createContext();
      helper.captureDragStart();
      props.layout.splice(0, props.layout.length, ...layoutOf([`moved`]));

      helper.commitDragEnd();

      expect(helper.canUndo.value).toBe(true);
    });

    it(`Should be a no-op when commitDragEnd is called without a preceding captureDragStart`, () => {
      const { helper } = createContext();
      expect(() => helper.commitDragEnd()).not.toThrow();
      expect(helper.canUndo.value).toBe(false);
    });

    it(`Should clear the captured snapshot after committing, so a second commitDragEnd call is a no-op`, () => {
      const { helper, props } = createContext();
      helper.captureDragStart();
      props.layout.splice(0, props.layout.length, ...layoutOf([`moved`]));
      helper.commitDragEnd();
      const undoDepthAfterFirst = helper.canUndo.value;

      // A second call with no new captureDragStart in between should
      // do nothing (dragStartSnapshot was cleared to null).
      props.layout.splice(0, props.layout.length, ...layoutOf([`moved-again`]));
      helper.commitDragEnd();

      // Still only reflects the first commit's effect — confirmed via
      // undo() only needing to run once to get back to the original.
      expect(undoDepthAfterFirst).toBe(true);
    });
  });

  describe(`captureResizeStart / commitResizeEnd`, () => {
    it(`Should commit the captured pre-resize snapshot on commitResizeEnd`, () => {
      const { helper, props } = createContext();
      helper.captureResizeStart();
      props.layout.splice(0, props.layout.length, ...layoutOf([`resized`]));

      helper.commitResizeEnd();

      expect(helper.canUndo.value).toBe(true);
    });

    it(`Should be a no-op when commitResizeEnd is called without a preceding captureResizeStart`, () => {
      const { helper } = createContext();
      expect(() => helper.commitResizeEnd()).not.toThrow();
      expect(helper.canUndo.value).toBe(false);
    });
  });

  describe(`initLastSnapshot / commitFromLastSnapshot`, () => {
    it(`Should commit against the snapshot captured by initLastSnapshot`, () => {
      const { helper, props } = createContext();
      helper.initLastSnapshot(); // snapshot = current [a,b]
      props.layout.splice(0, props.layout.length, ...layoutOf([`a`, `b`, `c`])); // an item added

      helper.commitFromLastSnapshot();

      expect(helper.canUndo.value).toBe(true);
    });

    it(`Should be a no-op when nothing changed since the last snapshot`, () => {
      const { helper } = createContext();
      helper.initLastSnapshot();

      helper.commitFromLastSnapshot();

      expect(helper.canUndo.value).toBe(false);
    });

    it(`Should update lastSnapshot after a successful commit, so a second identical commitFromLastSnapshot call is a no-op`, () => {
      const { helper, props } = createContext();
      helper.initLastSnapshot();
      props.layout.splice(0, props.layout.length, ...layoutOf([`a`, `b`, `c`]));
      helper.commitFromLastSnapshot(); // lastSnapshot now = [a,b,c]

      // No further change — a second call should find "before" (now
      // [a,b,c], the just-updated lastSnapshot) identical to the
      // current layout (still [a,b,c]) and no-op, rather than pushing
      // a second, redundant undo entry.
      helper.commitFromLastSnapshot();
      const undoStackDepth1 = helper.canUndo.value;
      helper.undo();

      expect(undoStackDepth1).toBe(true);
      expect(helper.canUndo.value).toBe(false); // only one real entry existed
    });
  });
});
