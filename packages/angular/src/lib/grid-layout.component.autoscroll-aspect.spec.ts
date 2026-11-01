import { Component } from '@angular/core';
import type { DebugElement, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridEventBusService } from './grid-event-bus.service';
import type { IGridDefaults } from './grid-event-bus.service';
import { GridItemComponent } from './grid-item.component';
import { GridLayoutComponent } from './grid-layout.component';

/**
 * Grid-wide `autoScroll` / `preserveAspectRatio` (the grid's own @Input()s, cascaded to items through `IGridDefaults`)
 * against the item-level `boolean | null` inputs: the item's own value wins, `null` defers to the grid, and a grid that
 * never set the value (or no grid at all) resolves to `false`.
 *
 * Both drag and resize feed the auto-scroll engine (as in Vue and React), so auto-scroll is observed on each gesture.
 */

type TTriState = boolean | null;

interface IEdges { bottom: boolean; left: boolean; right: boolean; top: boolean }
interface IPointerLike { clientX: number; clientY: number; edges?: IEdges; target: HTMLElement; type: string }

const NO_EDGES: IEdges = { bottom: false, left: false, right: false, top: false };

const trio = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 4, y: 0 },
  { h: 2, i: `2`, w: 2, x: 8, y: 0 },
];

@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  standalone: true,
  template: `
    <kdl-grid-layout
      [autoScroll]="gridAutoScroll"
      [colNum]="12"
      [enableEditMode]="true"
      [layout]="layout"
      [margin]="[10, 10]"
      [preserveAspectRatio]="gridPreserveAspectRatio"
      [rowHeight]="100">
      @for (entry of layout; track entry.i) {
        <kdl-grid-item
          [autoScroll]="itemAutoScroll[entry.i] ?? null"
          [h]="entry.h"
          [i]="entry.i"
          [preserveAspectRatio]="itemPreserveAspectRatio[entry.i] ?? null"
          [w]="entry.w"
          [x]="entry.x"
          [y]="entry.y">content {{ entry.i }}</kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
class HostComponent {
  gridAutoScroll = false;
  gridPreserveAspectRatio = false;
  itemAutoScroll: Record<string, TTriState> = {};
  itemPreserveAspectRatio: Record<string, TTriState> = {};
  layout: TLayout = trio();
}

describe(`Grid-wide autoScroll / preserveAspectRatio cascade (Angular)`, () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let restoreStubs: (() => void)[] = [];
  let createdParents: HTMLElement[] = [];

  /** jsdom lays nothing out, so the grid's measured width is stubbed on the prototype (as the maximize spec does). */
  const stubGetter = (prop: string, read: () => number): void => {
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: read });
    restoreStubs.push(() => {
      if(original) {
        Object.defineProperty(HTMLElement.prototype, prop, original);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
      }
    });
  };

  const unstub = (): void => {
    restoreStubs.forEach(restore => restore());
    restoreStubs = [];
  };

  const mount = (setup: (instance: HostComponent) => void = () => undefined): void => {
    unstub();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    setup(host);
    fixture.detectChanges();
    stubGetter(`offsetWidth`, () => 1200);
    stubGetter(`clientHeight`, () => 500);
    const grid = fixture.debugElement.query(By.directive(GridLayoutComponent)).componentInstance as GridLayoutComponent;
    grid.ngAfterViewInit();
    fixture.detectChanges();
  };

  const itemDebug = (id: string): DebugElement => fixture.debugElement.queryAll(By.directive(GridItemComponent)).find(entry => (entry.componentInstance as GridItemComponent).i === id)!;
  const itemOf = (id: string): GridItemComponent => itemDebug(id).componentInstance as GridItemComponent;
  const itemEl = (id: string): HTMLElement => itemDebug(id).nativeElement as HTMLElement;

  const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
    element.getBoundingClientRect = () => ({
      bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
    });
  };

  /** Gives an element a mocked offset parent (the native drag/resize handlers read it), so it can be driven through its engine handlers. */
  const arm = (element: HTMLElement): void => {
    const parent = document.createElement(`div`);
    document.body.appendChild(parent);
    Object.defineProperty(element, `offsetParent`, { configurable: true, get: () => parent });
    Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 1000 });
    mockRect(parent, { left: 0, right: 1200, top: 0 });
    mockRect(element, { left: 100, right: 300, top: 50 });
    createdParents.push(parent);
  };

  const dragHandlerOf = (element: HTMLElement): ((event: IPointerLike) => void) =>
    (element as unknown as { __nativeDragHandler: (event: IPointerLike) => void }).__nativeDragHandler;
  const resizeHandlerOf = (element: HTMLElement): ((event: IPointerLike) => void) =>
    (element as unknown as { __nativeResizeHandler: (event: IPointerLike) => void }).__nativeResizeHandler;

  type TEngine = { start: (target: HTMLElement) => void; stop: () => void; update: (x: number, y: number) => void };
  const engineOf = (component: GridItemComponent): TEngine => (component as unknown as { autoScrollEngine: TEngine }).autoScrollEngine;

  /** Replaces the engine's start/update with spies (no real scrolling in jsdom) and returns them. */
  const spyEngine = (component: GridItemComponent): { start: jest.SpyInstance; stop: jest.SpyInstance; update: jest.SpyInstance } => ({
    start: jest.spyOn(engineOf(component), `start`).mockImplementation(() => undefined),
    stop: jest.spyOn(engineOf(component), `stop`).mockImplementation(() => undefined),
    update: jest.spyOn(engineOf(component), `update`).mockImplementation(() => undefined),
  });

  /** A drag gesture's first two ticks, enough to tell whether the engine was started and then fed. */
  const dragStartAndMove = (id: string): void => {
    const element = itemEl(id);
    arm(element);
    dragHandlerOf(element)({ clientX: 100, clientY: 50, target: element, type: `dragstart` });
    dragHandlerOf(element)({ clientX: 140, clientY: 90, target: element, type: `dragmove` });
  };

  /** A full resize gesture (start, move, end) on the right edge, enough to tell whether the engine was started, fed and stopped. */
  const resizeFullGesture = (id: string): void => {
    const element = itemEl(id);
    arm(element);
    const edges = { ...NO_EDGES, right: true };
    resizeHandlerOf(element)({ clientX: 0, clientY: 0, edges, target: element, type: `resizestart` });
    resizeHandlerOf(element)({ clientX: 60, clientY: 20, edges, target: element, type: `resizemove` });
    resizeHandlerOf(element)({ clientX: 60, clientY: 20, edges, target: element, type: `resizeend` });
  };

  /** Resizes an item's right edge by 50px and returns its start and end live size (the item's own `resizing` state). */
  const resizeRightBy50 = (id: string): { end: { height: number; width: number }; start: { height: number; width: number } } => {
    const element = itemEl(id);
    arm(element);
    const edges = { ...NO_EDGES, right: true };
    resizeHandlerOf(element)({ clientX: 0, clientY: 0, edges, target: element, type: `resizestart` });
    const startState = itemOf(id).resizing!;
    const start = { height: startState.height, width: startState.width };
    resizeHandlerOf(element)({ clientX: 50, clientY: 0, edges, target: element, type: `resizemove` });
    const endState = itemOf(id).resizing!;
    return { end: { height: endState.height, width: endState.width }, start };
  };

  const expectRatioKept = (size: { end: { height: number; width: number }; start: { height: number; width: number } }): void => {
    expect(size.end.width).toBe(size.start.width + 50);
    expect(size.end.height).toBeCloseTo(size.end.width * (size.start.height / size.start.width), 5);
    expect(size.end.height).not.toBe(size.start.height);
  };

  const expectHeightUntouched = (size: { end: { height: number; width: number }; start: { height: number; width: number } }): void => {
    expect(size.end.width).toBe(size.start.width + 50);
    expect(size.end.height).toBe(size.start.height);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    createdParents.forEach(parent => parent.remove());
    createdParents = [];
    unstub();
  });

  // [grid value, item value, expected resolved value]
  const MATRIX: [boolean, TTriState, boolean][] = [
    [true, null, true],
    [false, null, false],
    [true, false, false],
    [false, true, true],
    [true, true, true],
    [false, false, false],
  ];
  const label = (value: TTriState): string => (value === null ? `null` : String(value));

  describe(`grid defaults push`, () => {
    const latestDefaults = (): IGridDefaults => {
      const bus = fixture.debugElement.query(By.directive(GridLayoutComponent)).injector.get(GridEventBusService);
      let latest: IGridDefaults | undefined;
      bus.gridDefaults$.subscribe(defaults => {
        latest = defaults;
      }).unsubscribe();
      return latest!;
    };

    it(`Should push autoScroll/preserveAspectRatio false when the grid leaves them at their defaults`, () => {
      mount();

      expect(latestDefaults().autoScroll).toBe(false);
      expect(latestDefaults().preserveAspectRatio).toBe(false);
    });

    it(`Should push the grid's own autoScroll/preserveAspectRatio values`, () => {
      mount(instance => {
        instance.gridAutoScroll = true;
        instance.gridPreserveAspectRatio = true;
      });

      expect(latestDefaults().autoScroll).toBe(true);
      expect(latestDefaults().preserveAspectRatio).toBe(true);
    });

    it(`Should push a new snapshot when only autoScroll changes, and when only preserveAspectRatio changes`, () => {
      mount();

      host.gridAutoScroll = true;
      fixture.detectChanges();
      expect(latestDefaults()).toMatchObject({ autoScroll: true, preserveAspectRatio: false });

      host.gridPreserveAspectRatio = true;
      fixture.detectChanges();
      expect(latestDefaults()).toMatchObject({ autoScroll: true, preserveAspectRatio: true });
    });
  });

  describe(`autoScroll`, () => {
    it(`Should default the item input to null and resolve false when nothing is set anywhere`, () => {
      mount();

      expect(itemOf(`0`).autoScroll).toBeNull();
      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);
    });

    MATRIX.forEach(([gridValue, itemValue, expected]) => {
      it(`Should resolve ${String(expected)} and ${expected ? `feed` : `not touch`} the auto-scroll engine on drag with grid ${String(gridValue)} / item ${label(itemValue)}`, () => {
        mount(instance => {
          instance.gridAutoScroll = gridValue;
          instance.itemAutoScroll = { 0: itemValue };
        });
        const spies = spyEngine(itemOf(`0`));

        dragStartAndMove(`0`);

        expect(itemOf(`0`).resolvedAutoScroll).toBe(expected);
        if(expected) {
          expect(spies.start).toHaveBeenCalledWith(itemEl(`0`));
          expect(spies.update).toHaveBeenCalledWith(140, 90);
        } else {
          expect(spies.start).not.toHaveBeenCalled();
          expect(spies.update).not.toHaveBeenCalled();
        }
      });
    });

    MATRIX.forEach(([gridValue, itemValue, expected]) => {
      it(`Should ${expected ? `start, update and stop` : `not start or update`} the auto-scroll engine across a resize with grid ${String(gridValue)} / item ${label(itemValue)}`, () => {
        mount(instance => {
          instance.gridAutoScroll = gridValue;
          instance.itemAutoScroll = { 0: itemValue };
        });
        const spies = spyEngine(itemOf(`0`));

        resizeFullGesture(`0`);

        if(expected) {
          expect(spies.start).toHaveBeenCalledTimes(1);
          expect(spies.start).toHaveBeenCalledWith(itemEl(`0`));
          expect(spies.update).toHaveBeenCalledTimes(1);
          expect(spies.update).toHaveBeenCalledWith(60, 20);
        } else {
          expect(spies.start).not.toHaveBeenCalled();
          expect(spies.update).not.toHaveBeenCalled();
        }
        // resizeend always calls stop (a no-op for an engine that never started), so it is called exactly once either way.
        expect(spies.stop).toHaveBeenCalledTimes(1);
      });
    });

    it(`Should start the resize engine only for the inheriting item when the grid is true and a sibling has an explicit false`, () => {
      mount(instance => {
        instance.gridAutoScroll = true;
        instance.itemAutoScroll = { 1: false };
      });
      const inheriting = spyEngine(itemOf(`0`));
      const explicit = spyEngine(itemOf(`1`));

      resizeFullGesture(`0`);
      resizeFullGesture(`1`);

      expect(inheriting.start).toHaveBeenCalledTimes(1);
      expect(explicit.start).not.toHaveBeenCalled();
      expect(explicit.update).not.toHaveBeenCalled();
    });

    it(`Should start the engine on a resize after the grid input flips to true post-init`, () => {
      mount();
      const spies = spyEngine(itemOf(`0`));

      host.gridAutoScroll = true;
      fixture.detectChanges();
      resizeFullGesture(`0`);

      expect(spies.start).toHaveBeenCalledWith(itemEl(`0`));
      expect(spies.update).toHaveBeenCalledWith(60, 20);
    });

    it(`Should start the engine for an item with no value of its own when the grid is true, while an item with an explicit false does not`, () => {
      mount(instance => {
        instance.gridAutoScroll = true;
        instance.itemAutoScroll = { 1: false };
      });
      const inheriting = spyEngine(itemOf(`0`));
      const explicit = spyEngine(itemOf(`1`));

      dragStartAndMove(`0`);
      dragStartAndMove(`1`);

      expect(inheriting.start).toHaveBeenCalledTimes(1);
      expect(explicit.start).not.toHaveBeenCalled();
    });

    it(`Should update inheriting items when the grid input changes after init, but leave items with an explicit value alone`, () => {
      mount(instance => {
        instance.itemAutoScroll = { 1: false, 2: true };
      });
      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`1`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`2`).resolvedAutoScroll).toBe(true);

      host.gridAutoScroll = true;
      fixture.detectChanges();

      expect(itemOf(`0`).resolvedAutoScroll).toBe(true);
      expect(itemOf(`1`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`2`).resolvedAutoScroll).toBe(true);

      host.gridAutoScroll = false;
      fixture.detectChanges();

      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`1`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`2`).resolvedAutoScroll).toBe(true);
    });

    it(`Should start the engine on a drag after the grid input flips to true post-init`, () => {
      mount();
      const spies = spyEngine(itemOf(`0`));

      host.gridAutoScroll = true;
      fixture.detectChanges();
      dragStartAndMove(`0`);

      expect(spies.start).toHaveBeenCalledWith(itemEl(`0`));
    });

    it(`Should re-inherit the grid value when an explicit item value is set back to null`, () => {
      mount(instance => {
        instance.gridAutoScroll = true;
        instance.itemAutoScroll = { 0: false };
      });
      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);

      host.itemAutoScroll = { 0: null };
      fixture.detectChanges();

      expect(itemOf(`0`).autoScroll).toBeNull();
      expect(itemOf(`0`).resolvedAutoScroll).toBe(true);

      host.itemAutoScroll = { 0: true };
      host.gridAutoScroll = false;
      fixture.detectChanges();
      expect(itemOf(`0`).resolvedAutoScroll).toBe(true);

      host.itemAutoScroll = { 0: null };
      fixture.detectChanges();
      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);
    });
  });

  describe(`preserveAspectRatio`, () => {
    it(`Should default the item input to null and resolve false when nothing is set anywhere`, () => {
      mount();

      expect(itemOf(`0`).preserveAspectRatio).toBeNull();
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);
    });

    MATRIX.forEach(([gridValue, itemValue, expected]) => {
      it(`Should resolve ${String(expected)} and ${expected ? `keep` : `not keep`} the aspect ratio on a right-edge resize with grid ${String(gridValue)} / item ${label(itemValue)}`, () => {
        mount(instance => {
          instance.gridPreserveAspectRatio = gridValue;
          instance.itemPreserveAspectRatio = { 0: itemValue };
        });

        const size = resizeRightBy50(`0`);

        expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(expected);
        if(expected) {
          expectRatioKept(size);
        } else {
          expectHeightUntouched(size);
        }
      });
    });

    it(`Should derive width from height on a bottom-edge resize when the grid is true and the item has no value of its own`, () => {
      mount(instance => {
        instance.gridPreserveAspectRatio = true;
      });
      const element = itemEl(`0`);
      arm(element);
      const edges = { ...NO_EDGES, bottom: true };

      resizeHandlerOf(element)({ clientX: 0, clientY: 0, edges, target: element, type: `resizestart` });
      const start = { ...itemOf(`0`).resizing! };
      resizeHandlerOf(element)({ clientX: 0, clientY: 40, edges, target: element, type: `resizemove` });
      const end = itemOf(`0`).resizing!;

      expect(end.height).toBe(start.height + 40);
      expect(end.width).toBeCloseTo(end.height * (start.width / start.height), 5);
    });

    it(`Should update inheriting items when the grid input changes after init, but leave items with an explicit value alone`, () => {
      mount(instance => {
        instance.itemPreserveAspectRatio = { 1: false, 2: true };
      });
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);

      host.gridPreserveAspectRatio = true;
      fixture.detectChanges();

      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(true);
      expect(itemOf(`1`).resolvedPreserveAspectRatio).toBe(false);
      expect(itemOf(`2`).resolvedPreserveAspectRatio).toBe(true);
      expectRatioKept(resizeRightBy50(`0`));
      expectHeightUntouched(resizeRightBy50(`1`));

      host.gridPreserveAspectRatio = false;
      fixture.detectChanges();

      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);
      expect(itemOf(`1`).resolvedPreserveAspectRatio).toBe(false);
      expect(itemOf(`2`).resolvedPreserveAspectRatio).toBe(true);
    });

    it(`Should re-inherit the grid value when an explicit item value is set back to null`, () => {
      mount(instance => {
        instance.gridPreserveAspectRatio = true;
        instance.itemPreserveAspectRatio = { 0: false };
      });
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);

      host.itemPreserveAspectRatio = { 0: null };
      fixture.detectChanges();

      expect(itemOf(`0`).preserveAspectRatio).toBeNull();
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(true);
      expectRatioKept(resizeRightBy50(`0`));

      host.itemPreserveAspectRatio = { 0: true };
      host.gridPreserveAspectRatio = false;
      fixture.detectChanges();
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(true);

      host.itemPreserveAspectRatio = { 0: null };
      fixture.detectChanges();
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);
    });

    it(`Should keep autoScroll and preserveAspectRatio independent of each other`, () => {
      mount(instance => {
        instance.gridAutoScroll = true;
      });

      expect(itemOf(`0`).resolvedAutoScroll).toBe(true);
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(false);

      host.gridAutoScroll = false;
      host.gridPreserveAspectRatio = true;
      fixture.detectChanges();

      expect(itemOf(`0`).resolvedAutoScroll).toBe(false);
      expect(itemOf(`0`).resolvedPreserveAspectRatio).toBe(true);
    });
  });

  describe(`standalone GridItemComponent (no eventBus, no parent grid)`, () => {
    let standalone: ComponentFixture<GridItemComponent>;
    let component: GridItemComponent;

    const setInputs = (inputs: Partial<GridItemComponent>): void => {
      Object.assign(component, inputs);
      component.ngOnChanges({} as SimpleChanges);
      standalone.detectChanges();
    };

    beforeEach(() => {
      standalone = TestBed.createComponent(GridItemComponent);
      component = standalone.componentInstance;
    });

    afterEach(() => {
      standalone.nativeElement.remove();
    });

    it(`Should default both inputs to null and resolve both to false`, () => {
      setInputs({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.autoScroll).toBeNull();
      expect(component.preserveAspectRatio).toBeNull();
      expect(component.resolvedAutoScroll).toBe(false);
      expect(component.resolvedPreserveAspectRatio).toBe(false);
    });

    it(`Should resolve to the item's own explicit value`, () => {
      setInputs({ autoScroll: true, containerWidth: 1220, h: 2, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 });

      expect(component.resolvedAutoScroll).toBe(true);
      expect(component.resolvedPreserveAspectRatio).toBe(true);
    });

    it(`Should resolve an explicit false to false, and fall back to false again when set back to null`, () => {
      setInputs({ autoScroll: true, containerWidth: 1220, h: 2, i: `0`, preserveAspectRatio: true, w: 2, x: 0, y: 0 });

      setInputs({ autoScroll: null, preserveAspectRatio: null });

      expect(component.resolvedAutoScroll).toBe(false);
      expect(component.resolvedPreserveAspectRatio).toBe(false);
    });

    it(`Should not start the auto-scroll engine on drag when nothing is set`, () => {
      setInputs({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      const element = standalone.nativeElement as HTMLElement;
      arm(element);
      const spies = spyEngine(component);

      dragHandlerOf(element)({ clientX: 100, clientY: 50, target: element, type: `dragstart` });
      dragHandlerOf(element)({ clientX: 140, clientY: 90, target: element, type: `dragmove` });

      expect(spies.start).not.toHaveBeenCalled();
      expect(spies.update).not.toHaveBeenCalled();
    });
  });
});
