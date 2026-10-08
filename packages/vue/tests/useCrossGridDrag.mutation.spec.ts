import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useCrossGridDrag } from '../src/components/Grid/composables/useCrossGridDrag';
import { EGridLayoutEvent } from '@/core/gridlayout/enums/EGridLayoutEvents';
import { findCrossGridZoneAt, registerCrossGridZone } from '@/core/gridlayout/helpers/cross-grid-registry';
import type { ICrossGridZone } from '@/core/gridlayout/interfaces/cross-grid.interfaces';
import type { IGridLayoutProps } from '../src/components/Grid/grid-layout-props.interface';
import type { ILayoutItem } from '../src/components';

/**
 * Targets mutants that survived Stryker against `useCrossGridDrag.ts`
 * (see `reports/mutation/mutation.json`). `useCrossGridDrag.spec.ts`
 * only ever registers the grid under test and never puts a second zone
 * under the drop point, so the accept / reject / "nothing there" paths
 * were never actually told apart. These tests register a real second
 * zone in the shared registry, at a point both grids' tests drop onto.
 *
 * The registry is a module-level singleton, so every layoutId is unique
 * and every registration is undone in `afterEach`.
 */
let layoutIdCounter = 0;
const nextLayoutId = (): string => `mutation-test-${(layoutIdCounter += 1)}`;

const WIDE_RECT = (): DOMRect => ({
  bottom: 1000, height: 1000, left: 0, right: 1000, toJSON: () => ({}), top: 0, width: 1000, x: 0, y: 0,
});

const createContext = (propOverrides: Partial<IGridLayoutProps> = {}) => {
  const emit = vi.fn();
  const eventBus = { emit: vi.fn(), off: vi.fn(), on: vi.fn() };
  const isDragging = ref(false);
  const originalLayout = ref<ILayoutItem[] | undefined>([]);
  const refsLayout = ref(document.createElement(`div`));
  refsLayout.value.getBoundingClientRect = WIDE_RECT;
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

const ITEM: ILayoutItem = { h: 2, i: `a`, w: 2, x: 0, y: 0 };
const DROP_POINT = { x: 500, y: 500 };

describe(`useCrossGridDrag — mutation-testing gap coverage`, () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    cleanups.splice(0).forEach(fn => fn());
  });

  /** A stand-in for another grid, registered in the shared registry and covering the drop point. */
  const registerOtherGrid = (overrides: Partial<ICrossGridZone> = {}) => {
    const zone = {
      acceptDrop: vi.fn(),
      getRect: WIDE_RECT,
      isExternalDropDisabled: () => false,
      layoutId: nextLayoutId(),
      rejectDrop: vi.fn(),
      ...overrides,
    } as unknown as ICrossGridZone & { acceptDrop: ReturnType<typeof vi.fn>; rejectDrop: ReturnType<typeof vi.fn> };
    cleanups.push(registerCrossGridZone(zone));
    return zone;
  };

  const zoneAtDropPoint = (excludeLayoutId: string) => findCrossGridZoneAt(DROP_POINT.x, DROP_POINT.y, excludeLayoutId);

  describe(`registering and unregistering this grid's own zone`, () => {
    it(`Should not register anything when asked to disable a grid that was never enabled`, () => {
      const { helper } = createContext();

      helper.setCrossGridDragEnabled(false);

      expect(zoneAtDropPoint(`someone-else`)).toBeFalsy();
    });

    it(`Should be found by other grids once enabled, and gone after a single teardown even if enabled twice`, () => {
      const { helper } = createContext();
      helper.setCrossGridDragEnabled(true);
      helper.setCrossGridDragEnabled(true);
      expect(zoneAtDropPoint(`someone-else`)).toBeTruthy();

      helper.teardown();

      expect(zoneAtDropPoint(`someone-else`)).toBeFalsy();
    });

    it(`Should never match its own zone for a drop that lands inside its own rect`, () => {
      const { helper } = createContext();
      helper.setCrossGridDragEnabled(true);
      cleanups.push(() => helper.teardown());

      helper.handleDragStart(`a`);
      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
    });
  });

  describe(`guards on handleDragStart and handleDragEnd`, () => {
    it(`Should not record a dragstart made while cross-grid dragging is off`, () => {
      const { helper, props } = createContext({ allowCrossGridDrag: false });
      const other = registerOtherGrid();

      helper.handleDragStart(`a`);
      props.allowCrossGridDrag = true;
      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
      expect(other.acceptDrop).not.toHaveBeenCalled();
    });

    it(`Should ignore a dragend with no preceding dragstart, even when another grid is right under the drop`, () => {
      const { helper } = createContext();
      const other = registerOtherGrid();

      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
      expect(other.acceptDrop).not.toHaveBeenCalled();
    });

    it(`Should ignore a dragend once cross-grid dragging has been switched off since the dragstart`, () => {
      const { helper, props } = createContext();
      const other = registerOtherGrid();
      helper.handleDragStart(`a`);

      props.allowCrossGridDrag = false;
      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
      expect(other.acceptDrop).not.toHaveBeenCalled();
    });

    it(`Should report not-accepted when no other grid is under the drop point`, () => {
      const { helper } = createContext();
      helper.handleDragStart(`a`);

      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
    });

    it(`Should report not-accepted, and tell the target grid so, when it refuses external drops`, () => {
      const { helper, props } = createContext();
      const other = registerOtherGrid({ isExternalDropDisabled: () => true });
      helper.handleDragStart(`a`);

      const accepted = helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(false);
      expect(other.rejectDrop).toHaveBeenCalledWith(`a`, props.layoutId);
      expect(other.acceptDrop).not.toHaveBeenCalled();
    });
  });

  describe(`handing an item over to another real grid`, () => {
    it(`Should add it to the target's layout, tell its consumer, and compact through the eventBus`, () => {
      const target = createContext();
      target.helper.setCrossGridDragEnabled(true);
      cleanups.push(() => target.helper.teardown());
      const source = createContext({ layout: [{ ...ITEM }] as unknown as IGridLayoutProps[`layout`] });
      source.helper.handleDragStart(`a`);

      const accepted = source.helper.handleDragEnd(`a`, DROP_POINT.x, DROP_POINT.y, ITEM);

      expect(accepted).toBe(true);
      expect(target.props.layout).toHaveLength(1);
      expect(target.props.layout[0]).toMatchObject({ i: `a`, x: 0, y: 0 });
      expect(target.emit).toHaveBeenCalledWith(EGridLayoutEvent.CROSS_GRID_ITEM_DROPPED, {
        item: expect.objectContaining({ i: `a` }),
        sourceLayoutId: source.props.layoutId,
      });
      expect(target.eventBus.emit).toHaveBeenCalledWith(`compact`);
      expect(target.updateHeight).toHaveBeenCalled();
      expect(source.props.layout).toHaveLength(0);
    });
  });
});
