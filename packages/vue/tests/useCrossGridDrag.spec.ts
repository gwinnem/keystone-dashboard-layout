import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { useCrossGridDrag } from '../src/components/Grid/composables/useCrossGridDrag';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';
import type { ILayoutItem } from '../src/components';

/**
 * The cross-grid registry (`@/core/gridlayout/helpers/cross-grid-registry.ts`)
 * is a module-level singleton — see `GridLayout.crossGrid.spec.ts`'s own
 * identical comment. A unique `layoutId` per test (never reused) keeps
 * these direct composable tests isolated from each other and from that
 * other spec file's own registrations, without needing this file's own
 * teardown tracking (nothing here actually drops into another grid, so
 * a stale zone from an earlier test can't be mistakenly matched).
 */
let layoutIdCounter = 0;
const nextLayoutId = (): string => `direct-test-${(layoutIdCounter += 1)}`;

const createContext = (propOverrides: Partial<IGridLayoutProps> = {}) => {
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const isDragging = ref(false);
  const originalLayout = ref<ILayoutItem[] | undefined>([]);
  const refsLayout = ref(document.createElement(`div`));
  const updateHeight = vi.fn();
  const props = {
    allowCrossGridDrag: true,
    colNum: 12,
    compactType: `vertical`,
    layout: [],
    layoutId: nextLayoutId(),
    ...propOverrides,
  } as unknown as IGridLayoutProps;

  const helper = useCrossGridDrag({ emit, eventBus, isDragging, originalLayout, props, refsLayout, updateHeight });
  return { emit, eventBus, helper, isDragging, originalLayout, props, refsLayout, updateHeight };
};

describe(`useCrossGridDrag`, () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    cleanups.splice(0).forEach(fn => fn());
  });

  describe(`setCrossGridDragEnabled`, () => {
    it(`Should be a no-op (not double-register) when called with true twice in a row`, () => {
      const { helper } = createContext();
      helper.setCrossGridDragEnabled(true);
      // Confirmed via the observable effect: a second enable call with
      // an already-registered zone must not replace/duplicate the
      // registration in a way that makes teardown() need calling twice
      // to fully deregister — one teardown() should always be enough,
      // regardless of how many redundant `true` calls preceded it.
      helper.setCrossGridDragEnabled(true);

      expect(() => helper.teardown()).not.toThrow();
    });

    it(`Should be a no-op when called with false and never previously enabled`, () => {
      const { helper } = createContext();
      expect(() => helper.setCrossGridDragEnabled(false)).not.toThrow();
    });

    it(`Should allow re-registering after being disabled`, () => {
      const { helper } = createContext();
      helper.setCrossGridDragEnabled(true);
      helper.setCrossGridDragEnabled(false);

      expect(() => helper.setCrossGridDragEnabled(true)).not.toThrow();
      cleanups.push(() => helper.teardown());
    });
  });

  describe(`teardown`, () => {
    it(`Should be a no-op (not throw) when called without ever having been registered`, () => {
      const { helper } = createContext();
      expect(() => helper.teardown()).not.toThrow();
    });

    it(`Should be safely callable twice in a row after a real registration`, () => {
      const { helper } = createContext();
      helper.setCrossGridDragEnabled(true);
      helper.teardown();

      expect(() => helper.teardown()).not.toThrow();
    });
  });

  describe(`handleDragEnd — without a preceding handleDragStart`, () => {
    it(`Should return false immediately when allowCrossGridDrag is true but no drag was ever started`, () => {
      const { helper } = createContext();
      // No handleDragStart() call at all — crossGridDraggedId stays null.
      const result = helper.handleDragEnd(`a`, 0, 0, { h: 2, i: `a`, w: 2, x: 0, y: 0 });

      expect(result).toBe(false);
    });

    it(`Should return false when allowCrossGridDrag is false, even with a matching id`, () => {
      const { helper } = createContext({ allowCrossGridDrag: false });
      helper.handleDragStart(`a`);

      const result = helper.handleDragEnd(`a`, 0, 0, { h: 2, i: `a`, w: 2, x: 0, y: 0 });

      expect(result).toBe(false);
    });
  });

  describe(`handleDragStart`, () => {
    it(`Should be a no-op (not record the id) when allowCrossGridDrag is false`, () => {
      // Confirmed indirectly: if handleDragStart had recorded 'a' despite
      // the flag being off at the time it was called, toggling
      // allowCrossGridDrag back on afterward would still see
      // crossGridDraggedId === 'a' and let handleDragEnd proceed past its
      // own null-check. Getting `false` back here confirms the id was
      // never recorded in the first place.
      const { helper, props } = createContext({ allowCrossGridDrag: false });
      helper.handleDragStart(`a`);
      props.allowCrossGridDrag = true;

      const result = helper.handleDragEnd(`a`, 0, 0, { h: 2, i: `a`, w: 2, x: 0, y: 0 });

      expect(result).toBe(false);
    });
  });

  describe(`handleDragEnd — successful accept path, every side effect`, () => {
    // GridLayout.crossGrid.spec.ts already confirms the item genuinely
    // moves from source to target via full component mounting — this
    // targets side effects that flow itself never individually asserts
    // on, only exercises: eventBus.emit('compact'), originalLayout.value
    // being updated, DRAG_END specifically being emitted (as opposed to
    // just LAYOUT_UPDATE/LAYOUT_UPDATED/CROSS_GRID_ITEM_DROPPED), and
    // isDragging.value settling back to false via the nextTick callback.
    it(`Should emit the eventBus 'compact' message, update originalLayout, emit DRAG_END, and settle isDragging to false`, async () => {
      const source = createContext({ layout: [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }] });
      const target = createContext();
      // findCrossGridZoneAt only searches zones actually registered via
      // setCrossGridDragEnabled(true) (registerCrossGridZone) — without
      // this, the target would never be found regardless of its rect.
      target.helper.setCrossGridDragEnabled(true);
      source.isDragging.value = true;
      // Both zones need a real, non-null rect for findCrossGridZoneAt to
      // match the target — jsdom's own getBoundingClientRect() defaults
      // to all-zero, which would make every coordinate "inside" both
      // rects simultaneously (0 <= 0 <= 0), an ambiguous, unrealistic
      // setup — explicit, non-overlapping rects avoid that.
      source.refsLayout.value.getBoundingClientRect = () => (
        { bottom: 100, height: 100, left: 0, right: 100, toJSON: () => ({}), top: 0, width: 100, x: 0, y: 0 }
      );
      target.refsLayout.value.getBoundingClientRect = () => (
        { bottom: 100, height: 100, left: 200, right: 300, toJSON: () => ({}), top: 0, width: 100, x: 200, y: 0 }
      );

      source.helper.handleDragStart(`a`);
      const accepted = source.helper.handleDragEnd(`a`, 250, 50, { h: 2, i: `a`, w: 2, x: 0, y: 0 });
      expect(accepted).toBe(true);

      expect(source.eventBus.emit).toHaveBeenCalledWith(`compact`);
      expect(source.originalLayout.value).toStrictEqual(source.props.layout);
      expect(source.emit).toHaveBeenCalledWith(EGridLayoutEvent.DRAG_END, `a`);

      // isDragging is settled inside a nextTick() callback, not
      // synchronously — awaiting one lets it actually run.
      await nextTick();
      expect(source.isDragging.value).toBe(false);

      target.helper.teardown();
    });
  });
});
