import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import type { SimpleChanges } from '@angular/core';
import { GridEventBusService } from './grid-event-bus.service';
import { GridItemHeaderDirective } from './grid-item-header.directive';
import { GridItemComponent } from './grid-item.component';

/**
 * Targets mutants that survived the Stryker run against
 * `grid-item.component.ts` (see `reports/mutation/mutation.json`).
 *
 * Several tests call private methods directly. That is deliberate: the
 * surviving arithmetic mutants sit in pure pixel<->grid conversions
 * whose results are rounded and clamped, so they only show up with
 * hand-picked inputs (a non-zero margin, a value near a rounding
 * boundary, a value far past the clamp). Driving those through a real
 * drag/resize gesture would need pointer-event plumbing the existing
 * suite already covers for the happy path.
 *
 * Fixture used for the numbers below: containerWidth 1220, colNum 12,
 * margin [10, 10], rowHeight 100 -> colWidth = (1220 - 10 * 13) / 12
 * = 90.8333...
 */
describe(`GridItemComponent — mutation-testing gap coverage`, () => {
  let fixture: ComponentFixture<GridItemComponent>;
  let component: GridItemComponent;

  type TPrivates = {
    calcResizePosition(x: number, y: number, w: number, h: number): { height: number; left?: number; right?: number; top: number; width: number };
    calcWH(height: number, width: number, autoSizeFlag?: boolean): { h: number; w: number };
    calcXY(top: number, left: number): { x: number; y: number };
    eventBus?: GridEventBusService;
    moveByKeyboard(dx: number, dy: number): void;
    pixelsToGridX(leftPx: number, newW: number): number;
    pixelsToGridY(topPx: number, newH: number): number;
    resizeByKeyboard(dw: number, dh: number): void;
    scheduleNativeResizableRewire(): void;
  };

  const privates = (): TPrivates => component as unknown as TPrivates;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GridItemComponent] }).compileComponents();
    fixture = TestBed.createComponent(GridItemComponent);
    component = fixture.componentInstance;
  });

  const setInputs = (inputs: Partial<GridItemComponent>): void => {
    Object.assign(component, inputs);
    component.ngOnChanges({} as SimpleChanges);
    fixture.detectChanges();
  };

  const baseGeometry: Partial<GridItemComponent> = { colNum: 12, containerWidth: 1220, h: 2, i: `0`, margin: [10, 10], rowHeight: 100, w: 2, x: 0, y: 0 };

  describe(`pixel <-> grid conversions`, () => {
    beforeEach(() => {
      Object.assign(component, { ...baseGeometry, h: 2, resolvedMaxRows: 8, w: 2, x: 2, y: 1 });
    });

    it(`Should convert a pixel position to grid units using the margin on both axes`, () => {
      // x: (352.8 - 10) / 100.8333 = 3.40 -> 3; y: (274 - 10) / 110 = 2.4 -> 2
      expect(privates().calcXY(274, 352.8)).toEqual({ x: 3, y: 2 });
    });

    it(`Should cap a dragged position at the right and bottom bounds`, () => {
      // x would be 49 -> capped at colNum - w = 10; y would be 45 -> capped at resolvedMaxRows - h = 6
      expect(privates().calcXY(5000, 5000)).toEqual({ x: 10, y: 6 });
    });

    it(`Should convert a pixel width to grid units, rounding to the nearest unit`, () => {
      // w: (252 + 10) / 100.8333 = 2.60 -> 3; h: (254 + 10) / 110 = 2.4 -> 2
      expect(privates().calcWH(254, 252)).toEqual({ h: 2, w: 3 });
    });

    it(`Should round a pixel height that sits just above a unit boundary up, and one below it down`, () => {
      // (276 + 10) / 110 = 2.6 -> 3, where "(height - margin)" would give 2.42 -> 2
      expect(privates().calcWH(276, 252).h).toBe(3);
    });

    it(`Should round a pixel height up rather than to the nearest unit when autoSizeFlag is set`, () => {
      // 2.4 rounds to 2 normally, ceils to 3 with the flag
      expect(privates().calcWH(254, 252, true).h).toBe(3);
      expect(privates().calcWH(254, 252, false).h).toBe(2);
    });

    it(`Should cap a measured size at the remaining columns and rows`, () => {
      // w would be 50 -> capped at colNum - x = 10; h would be 46 -> capped at resolvedMaxRows - y = 7
      expect(privates().calcWH(5000, 5000)).toEqual({ h: 7, w: 10 });
    });

    it(`Should convert a new left-edge pixel position to a grid x with the margin applied`, () => {
      expect(privates().pixelsToGridX(352.8, 3)).toBe(3);
    });

    it(`Should cap a new grid x so the item at its new width can't pass the right edge`, () => {
      expect(privates().pixelsToGridX(5000, 3)).toBe(9);
    });

    it(`Should convert a new top-edge pixel position to a grid y with the margin applied`, () => {
      expect(privates().pixelsToGridY(274, 2)).toBe(2);
    });

    it(`Should cap a new grid y so the item at its new height can't pass the bottom`, () => {
      expect(privates().pixelsToGridY(5000, 2)).toBe(6);
    });

    it(`Should seed a mirrored resize from the right edge using the item's own x, counted from the right`, () => {
      component.resolvedIsMirrored = true;

      const position = privates().calcResizePosition(2, 1, 3, 2);

      // x counts from the right under RTL: 90.8333 * 2 + 3 * 10 = 211.67 -> 212
      expect(position.right).toBe(212);
      expect(position.left).toBeUndefined();
    });

    it(`Should not let a mirrored item's width move its right anchor`, () => {
      component.resolvedIsMirrored = true;

      // Same x, three different widths: the anchor is where x puts it, whatever the item's width.
      expect(privates().calcResizePosition(2, 1, 1, 2).right).toBe(212);
      expect(privates().calcResizePosition(2, 1, 3, 2).right).toBe(212);
      expect(privates().calcResizePosition(2, 1, 6, 2).right).toBe(212);
    });
  });

  describe(`mirrored position`, () => {
    it(`Should anchor a mirrored item from the right using its own x, not just at x:0`, () => {
      setInputs({ ...baseGeometry, isMirrored: true, useCssTransforms: false, w: 3, x: 2 });

      expect((component.style as Record<string, string | undefined>)[`right`]).toBe(`212px`);
    });
  });

  describe(`keyboard resize`, () => {
    const attachBus = (): { bus: GridEventBusService; reported: { eventType: string; h: number; w: number }[] } => {
      const bus = new GridEventBusService();
      const reported: { eventType: string; h: number; w: number }[] = [];
      bus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w }));
      privates().eventBus = bus;
      return { bus, reported };
    };

    it(`Should grow the height by the requested delta and report a resizestart then resizeend`, () => {
      const { reported } = attachBus();
      setInputs({ ...baseGeometry, h: 2, w: 2, x: 2, y: 1 });
      component.resolvedMaxRows = 5;

      privates().resizeByKeyboard(0, 1);

      expect(reported).toEqual([
        { eventType: `resizestart`, h: 2, w: 2 },
        { eventType: `resizeend`, h: 3, w: 2 },
      ]);
    });

    it(`Should not report anything when growing the width would pass the right edge and so changes nothing`, () => {
      const { reported } = attachBus();
      setInputs({ ...baseGeometry, h: 2, w: 2, x: 10, y: 0 });

      privates().resizeByKeyboard(1, 0);

      expect(reported).toEqual([]);
    });

    it(`Should not report anything when growing the height would pass the bottom and so changes nothing`, () => {
      const { reported } = attachBus();
      setInputs({ ...baseGeometry, h: 2, w: 2, x: 0, y: 3 });
      component.resolvedMaxRows = 5;

      privates().resizeByKeyboard(0, 1);

      expect(reported).toEqual([]);
    });

    it(`Should not throw when moved or resized by keyboard with no event bus at all (standalone use)`, () => {
      setInputs({ ...baseGeometry, h: 2, w: 2, x: 2, y: 2 });

      expect(() => privates().moveByKeyboard(1, 0)).not.toThrow();
      expect(() => privates().resizeByKeyboard(0, 1)).not.toThrow();
    });
  });

  describe(`header content that appears after first render`, () => {
    @Component({
      imports: [GridItemComponent, GridItemHeaderDirective],
      standalone: true,
      template: `
        <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
          @if (showHeader) {
            <div kdlGridItemHeader class="header-marker">header content</div>
          }
          <span class="default-marker">default content</span>
        </kdl-grid-item>
      `,
    })
    class ToggleHostComponent {
      showHeader = false;
    }

    it(`Should add the header region when header content is projected later, and remove it again when it goes away`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [ToggleHostComponent] });
      const hostFixture = TestBed.createComponent(ToggleHostComponent);
      hostFixture.detectChanges();
      const itemEl = (): HTMLElement => hostFixture.nativeElement.querySelector(`kdl-grid-item`) as HTMLElement;
      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-item-header`)).toBeFalsy();
      expect(itemEl().classList.contains(`kdl-grid-item--has-header`)).toBe(false);

      hostFixture.componentInstance.showHeader = true;
      hostFixture.detectChanges();
      hostFixture.detectChanges();

      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-item-header`)).toBeTruthy();
      expect(itemEl().classList.contains(`kdl-grid-item--has-header`)).toBe(true);

      hostFixture.componentInstance.showHeader = false;
      hostFixture.detectChanges();
      hostFixture.detectChanges();

      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-item-header`)).toBeFalsy();
      expect(itemEl().classList.contains(`kdl-grid-item--has-header`)).toBe(false);
    });
  });

  describe(`re-wiring the native resize engine`, () => {
    const spyOnRewire = (): jest.SpyInstance => jest.spyOn(privates(), `scheduleNativeResizableRewire`).mockImplementation(() => undefined);

    it(`Should schedule exactly one re-wire on the very first ngOnChanges, for the resize-handle contents only`, () => {
      const schedule = spyOnRewire();

      // Before the view exists, `lastResizableAndNotStatic` is still
      // undefined, so only the handle-contents check may schedule.
      component.ngOnChanges({} as SimpleChanges);

      expect(schedule).toHaveBeenCalledTimes(1);
    });

    it(`Should schedule a re-wire when isResizable flips, and not again while it stays flipped`, () => {
      setInputs({ ...baseGeometry, isResizable: true });
      const schedule = spyOnRewire();

      component.isResizable = false;
      component.ngOnChanges({} as SimpleChanges);
      expect(schedule).toHaveBeenCalledTimes(1);

      component.ngOnChanges({} as SimpleChanges);
      expect(schedule).toHaveBeenCalledTimes(1);

      component.isResizable = true;
      component.ngOnChanges({} as SimpleChanges);
      expect(schedule).toHaveBeenCalledTimes(2);
    });

    it(`Should not schedule a re-wire when nothing about resizability changed`, () => {
      setInputs({ ...baseGeometry, isResizable: true });
      const schedule = spyOnRewire();

      component.ngOnChanges({} as SimpleChanges);

      expect(schedule).not.toHaveBeenCalled();
    });

    it(`Should schedule a re-wire when the resize handles change contents, and not for the same contents again`, () => {
      setInputs({ ...baseGeometry });
      const schedule = spyOnRewire();

      component.resizeHandles = [`n`, `s`];
      component.ngOnChanges({ resizeHandles: {} } as unknown as SimpleChanges);
      expect(schedule).toHaveBeenCalledTimes(1);
      expect(component.resolvedResizeHandles).toEqual([`n`, `s`]);

      component.ngOnChanges({ resizeHandles: {} } as unknown as SimpleChanges);
      expect(schedule).toHaveBeenCalledTimes(1);
    });

    it(`Should leave the resolved resize handles alone when ngOnChanges reports no resizeHandles change`, () => {
      setInputs({ ...baseGeometry });
      const before = component.resolvedResizeHandles;
      const schedule = spyOnRewire();

      component.resizeHandles = [`n`];
      component.ngOnChanges({} as SimpleChanges);

      expect(component.resolvedResizeHandles).toEqual(before);
      expect(schedule).not.toHaveBeenCalled();
    });
  });

  describe(`close button and host style`, () => {
    it(`Should not emit removeItem from handleCloseButtonClick when edit mode is off, and should when it is on`, () => {
      setInputs({ ...baseGeometry });
      const removed: (string | number)[] = [];
      component.removeItem.subscribe((id: string | number) => removed.push(id));

      component.resolvedEnableEditMode = false;
      component.handleCloseButtonClick(new MouseEvent(`click`));
      expect(removed).toEqual([]);

      component.resolvedEnableEditMode = true;
      component.handleCloseButtonClick(new MouseEvent(`click`));
      expect(removed).toEqual([`0`]);
    });

    it(`Should merge the computed position/size style into hostStyle, and only add z-index when one is set`, () => {
      setInputs({ ...baseGeometry });

      expect(Object.keys(component.hostStyle)).toEqual(expect.arrayContaining([`width`, `height`]));
      expect(`z-index` in component.hostStyle).toBe(false);

      component.zIndex = 7;
      expect(component.hostStyle[`z-index`]).toBe(7);
    });
  });

  describe(`drag handler`, () => {
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    type TDragEvent = { clientX: number; clientY: number; target: HTMLElement; type: string };
    const dragHandlerOf = (element: HTMLElement): ((event: TDragEvent) => void) =>
      (element as unknown as { __nativeDragHandler: (event: TDragEvent) => void }).__nativeDragHandler;

    /** Same jsdom workaround the main spec uses: no layout engine, so `offsetParent` and both rects are mocked by hand. */
    const setupDraggableItem = (inputs: Partial<GridItemComponent> = {}, parentRect: Partial<DOMRect> = {}, itemRect: Partial<DOMRect> = {}): HTMLElement => {
      setInputs({ ...baseGeometry, ...inputs });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 1000 });
      mockRect(parent, { left: 0, right: 1000, top: 0, ...parentRect });
      mockRect(item, { left: 100, right: 300, top: 50, ...itemRect });
      createdParent = parent;
      return item;
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    it(`Should divide the pointer delta by transformScale, not multiply it`, () => {
      const item = setupDraggableItem();
      (component as unknown as { transformScale: number }).transformScale = 2;

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 140, clientY: 90, target: item, type: `dragmove` });

      // delta (40, 40) / 2 = (20, 20) on top of the starting (100, 50)
      expect(component.dragging).toEqual({ left: 120, top: 70 });
    });

    it(`Should not throw on a dragmove that arrives before any dragstart`, () => {
      const item = setupDraggableItem();

      expect(() => dragHandlerOf(item)({ clientX: 110, clientY: 60, target: item, type: `dragmove` })).not.toThrow();
    });

    it(`Should not throw on a mirrored dragmove that arrives before any dragstart`, () => {
      const item = setupDraggableItem({ isMirrored: true });

      expect(() => dragHandlerOf(item)({ clientX: 110, clientY: 60, target: item, type: `dragmove` })).not.toThrow();
    });

    it(`Should clamp a bounded drag to the right boundary`, () => {
      const item = setupDraggableItem({ isBounded: true });

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 10100, clientY: 50, target: item, type: `dragmove` });

      // rightBoundary = containerWidth - item width = 1220 - 192 = 1028; top stays inside [0, 790]
      expect(component.dragging).toEqual({ left: 1028, top: 50 });
    });

    it(`Should clamp a bounded mirrored drag on the right edge only, leaving left unset`, () => {
      const item = setupDraggableItem({ isBounded: true, isMirrored: true });

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 10100, clientY: 50, target: item, type: `dragmove` });

      // starting right = (300 - 1000) * -1 = 700; 700 - 10000 is clamped up to 0
      expect(component.dragging?.right).toBe(0);
      expect(component.dragging?.left).toBeUndefined();
    });
  });

  describe(`resize handler`, () => {
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    type TEdges = { bottom: boolean; left: boolean; right: boolean; top: boolean };
    const NO_EDGES: TEdges = { bottom: false, left: false, right: false, top: false };
    type TResizeEvent = { clientX: number; clientY: number; edges: TEdges; target: HTMLElement; type: string };
    const resizeHandlerOf = (element: HTMLElement): ((event: TResizeEvent) => void) =>
      (element as unknown as { __nativeResizeHandler: (event: TResizeEvent) => void }).__nativeResizeHandler;

    const setupResizableItem = (inputs: Partial<GridItemComponent> = {}): HTMLElement => {
      setInputs({ ...baseGeometry, ...inputs });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;
      return item;
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    const resizeBy = (item: HTMLElement, edges: Partial<TEdges>, clientX: number, clientY: number): void => {
      const activeEdges = { ...NO_EDGES, ...edges };
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: activeEdges, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX, clientY, edges: activeEdges, target: item, type: `resizemove` });
    };

    it(`Should only grow the width, leaving height and top alone, when only the right edge is dragged`, () => {
      const item = setupResizableItem();

      resizeBy(item, { right: true }, 100, 40);

      // start: { height: 210, left: 10, top: 10, width: 192 }; dx = 100
      expect(component.resizing).toEqual({ height: 210, left: 10, top: 10, width: 292 });
    });

    it(`Should only grow the height, leaving width alone, when only the bottom edge is dragged`, () => {
      const item = setupResizableItem();

      resizeBy(item, { bottom: true }, 100, 40);

      expect(component.resizing).toEqual({ height: 250, left: 10, top: 10, width: 192 });
    });

    it(`Should only grow the height, leaving width and right anchor alone, when only the bottom edge of a mirrored item is dragged`, () => {
      const item = setupResizableItem({ isMirrored: true });

      resizeBy(item, { bottom: true }, 100, 40);

      // mirrored start, x:0 (the rightmost column): right = round(90.8333 * 0 + 1 * 10) = 10
      expect(component.resizing).toEqual({ height: 250, right: 10, top: 10, width: 192 });
    });

    it(`Should not throw on a resizemove that arrives before any resizestart`, () => {
      const item = setupResizableItem();

      expect(() => resizeHandlerOf(item)({ clientX: 10, clientY: 10, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` })).not.toThrow();
    });

    it(`Should not throw on a mirrored resizemove that arrives before any resizestart`, () => {
      const item = setupResizableItem({ isMirrored: true });

      expect(() => resizeHandlerOf(item)({ clientX: 10, clientY: 10, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` })).not.toThrow();
    });
  });

  describe(`remaining handler, lifecycle and auto-height gaps`, () => {
    type TAnyPrivates = {
      autoHeightWrapperRef: { nativeElement: HTMLElement };
      autoScrollEngine: { stop: () => void; update: (x: number, y: number) => void };
      autoSize(): void;
      nativeDraggable?: { destroy: () => void };
      nativeResizable?: { destroy: () => void } | undefined;
      teardownNativeResizable(): void;
    };
    const anyPrivates = (): TAnyPrivates => component as unknown as TAnyPrivates;

    let createdParent: HTMLElement | undefined;
    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };
    type TEdges = { bottom: boolean; left: boolean; right: boolean; top: boolean };
    const NO_EDGES: TEdges = { bottom: false, left: false, right: false, top: false };
    type TPointerEvent = { clientX: number; clientY: number; edges?: TEdges; target: HTMLElement; type: string };
    const dragHandlerOf = (element: HTMLElement): ((event: TPointerEvent) => void) =>
      (element as unknown as { __nativeDragHandler: (event: TPointerEvent) => void }).__nativeDragHandler;
    const resizeHandlerOf = (element: HTMLElement): ((event: TPointerEvent) => void) =>
      (element as unknown as { __nativeResizeHandler: (event: TPointerEvent) => void }).__nativeResizeHandler;

    const mountInParent = (inputs: Partial<GridItemComponent>, parentRect: Partial<DOMRect> = {}, itemRect: Partial<DOMRect> = {}): HTMLElement => {
      setInputs({ ...baseGeometry, ...inputs });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 1000 });
      mockRect(parent, { left: 0, right: 1000, top: 0, ...parentRect });
      mockRect(item, { left: 100, right: 300, top: 50, ...itemRect });
      createdParent = parent;
      return item;
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    const attachBus = (): { reported: { eventType: string; h: number; w: number; x: number; y: number }[] } => {
      const bus = new GridEventBusService();
      // With a bus attached the item takes its geometry from the bus, not from its own inputs
      // (the bus defaults to containerWidth 0 and rowHeight 150), so give it the same numbers
      // every expectation in this describe is computed from.
      bus.setContainerWidth(1220);
      bus.setRowHeight(100);
      bus.setMargin([10, 10]);
      bus.setColNum(12);
      const reported: { eventType: string; h: number; w: number; x: number; y: number }[] = [];
      bus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w, x: event.x, y: event.y }));
      privates().eventBus = bus;
      return { reported };
    };

    it(`Should default margin to [10, 10]`, () => {
      expect(component.margin).toEqual([10, 10]);
    });

    // The existing "blocks a drag when isDraggable is false" test only dispatches a pointerdown,
    // which never starts a drag by itself (it only arms the gesture) — so isDragging stays false
    // whether or not the engine was enabled. Moving past the activation threshold is what
    // actually tells an enabled engine from a disabled one.
    it(`Should not start a drag from a real pointer gesture past the activation distance when isDraggable is false`, () => {
      const pointerEvent = (type: string, clientX: number, clientY: number): Event => {
        const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY });
        Object.defineProperty(event, `pointerId`, { value: 1 });
        Object.defineProperty(event, `pointerType`, { value: `mouse` });
        return event;
      };
      const item = mountInParent({ isDraggable: false });
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;

      item.dispatchEvent(pointerEvent(`pointerdown`, 100, 50));
      item.dispatchEvent(pointerEvent(`pointermove`, 130, 80));

      expect(component.isDragging).toBe(false);
    });

    it(`Should keep x and grow w for a mirrored item whose left edge is dragged further left`, () => {
      const { reported } = attachBus();
      const item = mountInParent({ h: 2, isMirrored: true, w: 2, x: 4, y: 0 });
      const edges = { ...NO_EDGES, left: true };

      // Under RTL x counts from the right and the right edge is the anchor: x = 4, w = 2 -> right anchor = 90.8333 * 4 + 5 * 10 = 413.
      // Dragging the LEFT edge 100px further left leaves that anchor alone and grows the width to 292 (3 columns), so x stays 4.
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: -100, clientY: 0, edges, target: item, type: `resizemove` });

      expect(reported.at(-1)).toMatchObject({ w: 3, x: 4 });
    });

    it(`Should move x (counted from the right) when the right edge of a mirrored item is dragged`, () => {
      const { reported } = attachBus();
      const item = mountInParent({ h: 2, isMirrored: true, w: 2, x: 4, y: 0 });
      const edges = { ...NO_EDGES, right: true };

      // Anchor 413 as above. Dragging the RIGHT edge 100px left shrinks the width to 92 (1 column) and moves the anchor 100px
      // further from the right edge, to 513: x = round((513 - 10) / 100.8333) = 5.
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: -100, clientY: 0, edges, target: item, type: `resizemove` });

      expect(reported.at(-1)).toMatchObject({ w: 1, x: 5 });
    });

    it(`Should report a smaller x after a resize that grows the item leftwards`, () => {
      const { reported } = attachBus();
      const item = mountInParent({ h: 2, w: 2, x: 4, y: 0 });
      const edges = { ...NO_EDGES, left: true };

      // x = 4 -> left px = 90.8333 * 4 + 5 * 10 = 413. Pulling the left edge
      // 101px further left grows the width to 293 (3 columns) and moves the
      // left anchor to 312, which is grid x = 3.
      resizeHandlerOf(item)({ clientX: 413, clientY: 0, edges, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 312, clientY: 0, edges, target: item, type: `resizemove` });

      expect(reported.at(-1)).toMatchObject({ w: 3, x: 3 });
    });

    it(`Should keep the top anchor fixed when a preserveAspectRatio resize drives the right and bottom edges`, () => {
      const item = mountInParent({ h: 2, preserveAspectRatio: true, w: 2, x: 0, y: 0 });
      const edges = { ...NO_EDGES, bottom: true, right: true };

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 100, clientY: 40, edges, target: item, type: `resizemove` });

      // Only a top-edge gesture may shift the top anchor to compensate for the derived height.
      expect(component.resizing?.top).toBe(10);
    });

    it(`Should report the grid position of a mirrored drag from its right anchor on dragend`, () => {
      // Starts at x 5, so ending at x 7 is a real move: a drag that ended in the cell it started in reports nothing.
      const item = mountInParent({ isMirrored: true, x: 5, y: 0 }, { left: 0, right: 1000, top: 0 }, { left: 100, right: 300, top: 50 });
      const moved: { i: string | number; x: number; y: number }[] = [];
      component.itemMoved.subscribe((event: { i: string | number; x: number; y: number }) => moved.push(event));

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragmove` });
      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragend` });

      // right = (300 - 1000) * -1 = 700, and x counts from the right under RTL -> x = round((700 - 10) / 100.8333) = 7
      expect(moved).toEqual([{ i: `0`, x: 7, y: 0 }]);
    });

    it(`Should not feed the auto-scroll engine during a drag when autoScroll is off`, () => {
      const item = mountInParent({ autoScroll: false });
      const update = jest.spyOn(anyPrivates().autoScrollEngine, `update`);

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 140, clientY: 90, target: item, type: `dragmove` });

      expect(update).not.toHaveBeenCalled();
    });

    it(`Should tear down the native engines and auto-scroll when destroyed`, () => {
      setInputs({ ...baseGeometry });
      const draggableDestroy = jest.spyOn(anyPrivates().nativeDraggable!, `destroy`);
      const resizableDestroy = anyPrivates().nativeResizable ? jest.spyOn(anyPrivates().nativeResizable!, `destroy`) : undefined;
      const stop = jest.spyOn(anyPrivates().autoScrollEngine, `stop`);

      fixture.destroy();

      expect(draggableDestroy).toHaveBeenCalledTimes(1);
      expect(stop).toHaveBeenCalled();
      if(resizableDestroy) {
        expect(resizableDestroy).toHaveBeenCalledTimes(1);
      }
    });

    it(`Should destroy the current native resize engine and clear it when asked to tear it down, and tolerate there being none`, () => {
      setInputs({ ...baseGeometry });
      const destroy = jest.fn();
      anyPrivates().nativeResizable = { destroy };

      anyPrivates().teardownNativeResizable();

      expect(destroy).toHaveBeenCalledTimes(1);
      expect(anyPrivates().nativeResizable).toBeUndefined();
      expect(() => anyPrivates().teardownNativeResizable()).not.toThrow();
    });

    describe(`ResizeObserver wiring for autoHeight`, () => {
      type TObserverInstance = { callback: () => void; disconnect: jest.Mock; observe: jest.Mock };
      const installMockResizeObserver = (): { instances: TObserverInstance[]; restore: () => void } => {
        const instances: TObserverInstance[] = [];
        const original = global.ResizeObserver;
        global.ResizeObserver = class {
          callback: () => void;
          disconnect = jest.fn();
          observe = jest.fn();
          unobserve = jest.fn();
          constructor(callback: () => void) {
            this.callback = callback;
            instances.push(this as unknown as TObserverInstance);
          }
        } as unknown as typeof ResizeObserver;
        return { instances, restore: () => { global.ResizeObserver = original; } };
      };

      it(`Should observe the wrapper, run autoSize when the observer fires, and disconnect on destroy`, () => {
        const { instances, restore } = installMockResizeObserver();
        try {
          setInputs({ ...baseGeometry, autoHeight: true });
          expect(instances).toHaveLength(1);
          expect(instances[0].observe).toHaveBeenCalledWith(anyPrivates().autoHeightWrapperRef.nativeElement);
          const autoSize = jest.spyOn(anyPrivates(), `autoSize`).mockImplementation(() => undefined);

          instances[0].callback();
          expect(autoSize).toHaveBeenCalledTimes(1);

          fixture.destroy();
          expect(instances[0].disconnect).toHaveBeenCalledTimes(1);
        } finally {
          restore();
        }
      });

      it(`Should not create an observer at all when autoHeight is off`, () => {
        const { instances, restore } = installMockResizeObserver();
        try {
          setInputs({ ...baseGeometry, autoHeight: false });

          expect(instances).toHaveLength(0);
        } finally {
          restore();
        }
      });

      it(`Should not throw when autoHeight is on but the platform has no ResizeObserver`, () => {
        const original = global.ResizeObserver;
        (global as unknown as { ResizeObserver: unknown }).ResizeObserver = undefined;
        try {
          expect(() => setInputs({ ...baseGeometry, autoHeight: true })).not.toThrow();
        } finally {
          global.ResizeObserver = original;
        }
      });
    });

    describe(`autoSize reports a resize when either dimension changes on its own`, () => {
      const measure = (width: number, height: number): void => {
        mockRect(anyPrivates().autoHeightWrapperRef.nativeElement, { height, width });
        anyPrivates().autoSize();
      };

      it(`Should report a resize when only the height changed`, () => {
        const { reported } = attachBus();
        setInputs({ ...baseGeometry, h: 2, w: 2 });

        // width 192 -> 2 columns (unchanged); height 320 -> ceil(330 / 110) = 3 rows
        measure(192, 320);

        expect(reported.at(-1)).toMatchObject({ eventType: `resizeend`, h: 3, w: 2 });
      });

      it(`Should report a resize when only the width changed`, () => {
        const { reported } = attachBus();
        setInputs({ ...baseGeometry, h: 2, w: 2 });

        // width 300 -> round(310 / 100.8333) = 3 columns; height 210 -> ceil(220 / 110) = 2 rows (unchanged)
        measure(300, 210);

        expect(reported.at(-1)).toMatchObject({ eventType: `resizeend`, h: 2, w: 3 });
      });

      it(`Should report nothing when neither dimension changed`, () => {
        const { reported } = attachBus();
        setInputs({ ...baseGeometry, h: 2, w: 2 });

        measure(192, 210);

        expect(reported.filter(event => event.eventType === `resizeend`)).toEqual([]);
      });
    });

    describe(`what a gesture reports, and when`, () => {
      type TMoved = { i: string | number; x: number; y: number };
      type TResized = { h: number; height: number; i: string | number; w: number; width: number };

      const collectMoved = (): TMoved[] => {
        const moved: TMoved[] = [];
        component.itemMoved.subscribe((event: TMoved) => moved.push(event));
        return moved;
      };
      const collectResized = (): TResized[] => {
        const resized: TResized[] = [];
        component.itemResized.subscribe((event: TResized) => resized.push(event));
        return resized;
      };

      it(`Should report a move that only changed the row`, () => {
        // The item's rect starts at (100, 50): column 1, row 0. Straight down 220px lands on row 2 and leaves the column alone.
        const item = mountInParent({ x: 1, y: 0 });
        const moved = collectMoved();

        dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
        dragHandlerOf(item)({ clientX: 100, clientY: 270, target: item, type: `dragmove` });
        dragHandlerOf(item)({ clientX: 100, clientY: 270, target: item, type: `dragend` });

        expect(moved).toEqual([{ i: `0`, x: 1, y: 2 }]);
      });

      it(`Should report a resize once, when it ends, with the size it ended at`, () => {
        const item = mountInParent({ h: 2, w: 2, x: 0, y: 0 });
        const resized = collectResized();
        const edges = { ...NO_EDGES, right: true };

        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
        resizeHandlerOf(item)({ clientX: 100, clientY: 0, edges, target: item, type: `resizemove` });
        expect(resized).toEqual([]);

        resizeHandlerOf(item)({ clientX: 100, clientY: 0, edges, target: item, type: `resizeend` });

        // 192px plus the 100px dragged is 292px, which is 3 columns; the height is untouched.
        expect(resized).toEqual([{ h: 2, height: 210, i: `0`, w: 3, width: 292 }]);
      });

      it(`Should report a resize that only changed the height`, () => {
        const item = mountInParent({ h: 2, w: 2, x: 0, y: 0 });
        const resized = collectResized();
        const edges = { ...NO_EDGES, bottom: true };

        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
        resizeHandlerOf(item)({ clientX: 0, clientY: 110, edges, target: item, type: `resizemove` });
        resizeHandlerOf(item)({ clientX: 0, clientY: 110, edges, target: item, type: `resizeend` });

        // 210px plus the 110px dragged is 320px, which is 3 rows; the width is untouched.
        expect(resized).toEqual([{ h: 3, height: 320, i: `0`, w: 2, width: 192 }]);
      });

      it(`Should follow the pointer with its pixel size while a resize is running`, () => {
        const item = mountInParent({ h: 2, useCssTransforms: false, w: 2, x: 0, y: 0 });
        const edges = { ...NO_EDGES, right: true };

        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
        resizeHandlerOf(item)({ clientX: 100, clientY: 0, edges, target: item, type: `resizemove` });

        // Not the 192px of the two columns it still occupies in the layout, but the live 192 + 100.
        expect((component.style as Record<string, string | undefined>)[`width`]).toBe(`292px`);
      });

      it(`Should leave x alone when a resize does not touch the left edge, even if minW pushes the item past the right edge`, () => {
        const { reported } = attachBus();
        // x 10 + w 2 fills the last two columns; minW 4 then widens it to a size that no longer fits there from x 10.
        const item = mountInParent({ h: 2, minW: 4, w: 2, x: 10, y: 0 });
        const edges = { ...NO_EDGES, bottom: true };

        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizemove` });

        expect(reported.at(-1)).toMatchObject({ w: 4, x: 10 });
      });

      it(`Should leave y alone when a resize does not touch the top edge, even if minH pushes the item past the bottom`, () => {
        const { reported } = attachBus();
        const item = mountInParent({ h: 2, minH: 4, w: 2, x: 0, y: 4 });
        // y 4 + h 2 reaches the last row; minH 4 then makes the item taller than the rows left below y 4.
        component.resolvedMaxRows = 6;
        const edges = { ...NO_EDGES, right: true };

        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizestart` });
        resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges, target: item, type: `resizemove` });

        expect(reported.at(-1)).toMatchObject({ h: 4, y: 4 });
      });

      it(`Should still work out the pixel height of a keyboard resize in a container exactly 1px wide`, () => {
        setInputs({ ...baseGeometry, h: 2, w: 2, x: 2, y: 1 });
        // Set after the inputs: an item cannot be styled at this width, but the keyboard path only does arithmetic.
        component.containerWidth = 1;
        const resized = collectResized();

        privates().resizeByKeyboard(0, 1);

        // The height does not depend on the column width (negative here): 100 * 3 + 2 * 10.
        expect(resized.at(-1)?.height).toBe(320);
      });
    });
  });
});
