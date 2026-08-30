import { describe, expect, it, vi } from 'vitest';
import { useMultiSelect } from '../src/components/Grid/composables/useMultiSelect';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';
import type { ILayoutItem } from '../src/components';

const layoutOf = (ids: string[]): ILayoutItem[] => ids.map((id, index) => ({ h: 2, i: id, w: 2, x: index * 2, y: 0 }));

const createContext = (multiSelect = true, layout = layoutOf([`a`, `b`, `c`, `d`])) => {
  const emit = vi.fn();
  const props = { layout, multiSelect } as unknown as IGridLayoutProps;
  const helper = useMultiSelect({ emit, props });
  return { emit, helper, props };
};

describe(`useMultiSelect`, () => {
  describe(`selectItem`, () => {
    it(`Should replace the entire selection by default (non-additive)`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`);
      helper.selectItem(`b`);

      expect(helper.selectedItems.value).toStrictEqual([`b`]);
    });

    it(`Should add to the existing selection when additive is true`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`);
      helper.selectItem(`b`, true);

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should emit SELECTION_CHANGED with the current selection as an array`, () => {
      const { emit, helper } = createContext();
      helper.selectItem(`a`);

      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.SELECTION_CHANGED, [`a`]);
    });
  });

  describe(`deselectItem`, () => {
    it(`Should remove the item from the selection when present`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`, true);
      helper.selectItem(`b`, true);

      helper.deselectItem(`a`);

      expect(helper.selectedItems.value).toStrictEqual([`b`]);
    });

    it(`Should be a no-op (no emit) when the id isn't currently selected`, () => {
      const { emit, helper } = createContext();
      helper.selectItem(`a`);
      emit.mockClear();

      helper.deselectItem(`nonexistent`);

      expect(emit).not.toHaveBeenCalled();
      expect(helper.selectedItems.value).toStrictEqual([`a`]);
    });
  });

  describe(`toggleItemSelection`, () => {
    it(`Should select an unselected item additively`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`);

      helper.toggleItemSelection(`b`);

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should deselect an already-selected item`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`, true);
      helper.selectItem(`b`, true);

      helper.toggleItemSelection(`a`);

      expect(helper.selectedItems.value).toStrictEqual([`b`]);
    });
  });

  describe(`clearSelection`, () => {
    it(`Should empty the selection and emit SELECTION_CHANGED when something was selected`, () => {
      const { emit, helper } = createContext();
      helper.selectItem(`a`);
      emit.mockClear();

      helper.clearSelection();

      expect(helper.selectedItems.value).toStrictEqual([]);
      expect(emit).toHaveBeenCalledWith(EGridLayoutEvent.SELECTION_CHANGED, []);
    });

    it(`Should be a no-op (no emit) when nothing was selected`, () => {
      const { emit, helper } = createContext();

      helper.clearSelection();

      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should reset lastAnchorId, so a later Shift-click has no anchor to range from`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      helper.clearSelection();

      // With the anchor reset, a Shift-click now falls through to a
      // plain select (see itemClickedHandler's own fallback) rather
      // than computing a range from the old anchor.
      helper.itemClickedHandler({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value).toStrictEqual([`c`]);
    });
  });

  describe(`pruneSelection`, () => {
    it(`Should remove selected ids no longer present in props.layout`, () => {
      const { helper, props } = createContext();
      helper.selectItem(`a`, true);
      helper.selectItem(`b`, true);
      props.layout = layoutOf([`a`]); // 'b' removed from the layout

      helper.pruneSelection();

      expect(helper.selectedItems.value).toStrictEqual([`a`]);
    });

    it(`Should emit SELECTION_CHANGED only when the selection actually shrank`, () => {
      const { emit, helper, props } = createContext();
      helper.selectItem(`a`, true);
      helper.selectItem(`b`, true);
      emit.mockClear();
      props.layout = layoutOf([`a`, `b`, `c`]); // nothing removed

      helper.pruneSelection();

      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should be a no-op (no emit) when the selection is already empty`, () => {
      const { emit, helper, props } = createContext();
      props.layout = layoutOf([`a`]);

      helper.pruneSelection();

      expect(emit).not.toHaveBeenCalled();
    });

    it(`Should reset lastAnchorId when it no longer matches a real layout item`, () => {
      const { helper, props } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: false }); // anchor = 'b'
      props.layout = layoutOf([`a`, `c`, `d`]); // 'b' removed

      helper.pruneSelection();
      // With the anchor reset, a Shift-click now falls through to a
      // plain select rather than ranging from the stale 'b' anchor.
      helper.itemClickedHandler({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value).toStrictEqual([`d`]);
    });

    it(`Should leave lastAnchorId untouched when it still matches a real layout item`, () => {
      const { helper, props } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false }); // anchor = 'a'
      props.layout = layoutOf([`a`, `b`, `c`, `d`]); // unchanged

      helper.pruneSelection();
      // The anchor ('a') should still be valid, so a Shift-click to 'c'
      // should compute the real a-to-c range, not fall back to a plain select.
      helper.itemClickedHandler({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`, `c`]);
    });
  });

  describe(`itemClickedHandler`, () => {
    it(`Should be a no-op entirely when multiSelect is off`, () => {
      const { emit, helper } = createContext(false);

      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });

      expect(emit).not.toHaveBeenCalled();
      expect(helper.selectedItems.value).toStrictEqual([]);
    });

    it(`Should select just the clicked item on a plain click, replacing any prior selection`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`, true);

      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: false });

      expect(helper.selectedItems.value).toStrictEqual([`b`]);
    });

    it(`Should toggle additively on a Ctrl-click`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });

      helper.itemClickedHandler({ ctrlKey: true, i: `b`, metaKey: false, shiftKey: false });

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should toggle additively on a Meta-click`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });

      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: true, shiftKey: false });

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should compute a range on Shift-click when an anchor already exists`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false }); // anchor = 'a'

      helper.itemClickedHandler({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`, `c`]);
    });

    it(`Should REPLACE (not merge with) an existing additive selection when a range is computed`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: false }); // anchor = 'd', selection = {d}
      helper.itemClickedHandler({ ctrlKey: true, i: `a`, metaKey: false, shiftKey: false }); // ctrl-click 'a' additively -> {d, a}; anchor moves to 'a' (every non-shift click updates the anchor, including ctrl/meta — see the dedicated test below)

      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true }); // shift-click 'b', range from anchor 'a' to 'b'

      // Only the a-b range — 'd' (from the earlier additive click) is
      // NOT preserved, even though it was part of the selection just
      // before this click, confirming the range REPLACES the prior
      // selection outright rather than merging with it.
      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should fall back to a plain select on Shift-click when there's no anchor yet`, () => {
      const { helper } = createContext();

      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value).toStrictEqual([`b`]);
    });

    it(`Should NOT update lastAnchorId on a Shift-click itself`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false }); // anchor = 'a'
      helper.itemClickedHandler({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true }); // range a-c, anchor should STILL be 'a'

      // A second Shift-click to 'b' should range from the ORIGINAL
      // anchor ('a'), not from 'c' (the previous Shift-click's target) —
      // confirms the anchor stayed fixed across the first Shift-click.
      helper.itemClickedHandler({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true });

      expect(helper.selectedItems.value.sort()).toStrictEqual([`a`, `b`]);
    });

    it(`Should update lastAnchorId on a plain click`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      helper.itemClickedHandler({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: false }); // new anchor = 'c'

      helper.itemClickedHandler({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: true }); // range from 'c' (not 'a') to 'd'

      expect(helper.selectedItems.value.sort()).toStrictEqual([`c`, `d`]);
    });

    it(`Should update lastAnchorId on a Ctrl/Meta-click too`, () => {
      const { helper } = createContext();
      helper.itemClickedHandler({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      helper.itemClickedHandler({ ctrlKey: true, i: `c`, metaKey: false, shiftKey: false }); // new anchor = 'c', selection now {a, c}

      helper.itemClickedHandler({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: true }); // range from 'c' to 'd', replacing {a, c}

      expect(helper.selectedItems.value.sort()).toStrictEqual([`c`, `d`]);
    });
  });

  describe(`backgroundClickHandler`, () => {
    it(`Should clear the selection when the click landed directly on the grid's own root (target === currentTarget)`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`);
      const root = document.createElement(`div`);
      const event = new MouseEvent(`click`);
      Object.defineProperty(event, `target`, { value: root });
      Object.defineProperty(event, `currentTarget`, { value: root });

      helper.backgroundClickHandler(event);

      expect(helper.selectedItems.value).toStrictEqual([]);
    });

    it(`Should NOT clear the selection when the click bubbled up from a nested element (target !== currentTarget)`, () => {
      const { helper } = createContext();
      helper.selectItem(`a`);
      const root = document.createElement(`div`);
      const child = document.createElement(`span`);
      const event = new MouseEvent(`click`);
      Object.defineProperty(event, `target`, { value: child });
      Object.defineProperty(event, `currentTarget`, { value: root });

      helper.backgroundClickHandler(event);

      expect(helper.selectedItems.value).toStrictEqual([`a`]);
    });

    it(`Should be a no-op when multiSelect is off, even for a direct root click`, () => {
      const { helper } = createContext(false);
      const root = document.createElement(`div`);
      const event = new MouseEvent(`click`);
      Object.defineProperty(event, `target`, { value: root });
      Object.defineProperty(event, `currentTarget`, { value: root });

      expect(() => helper.backgroundClickHandler(event)).not.toThrow();
    });
  });
});
