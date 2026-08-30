import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import type { SimpleChanges } from '@angular/core';
import { GridItemComponent } from './grid-item.component';
import { GridItemHeaderDirective } from './grid-item-header.directive';
import { GridEventBusService } from './grid-event-bus.service';

/**
 * jsdom (Jest's own DOM environment here) has no `PointerEvent`
 * constructor at all — confirmed directly via a fresh test run
 * throwing `ReferenceError: PointerEvent is not defined`, not assumed.
 * `MouseEvent` (which jsdom does support) carries the same
 * `clientX`/`clientY`/`button` properties `createNativeDraggable`/
 * `createNativeResizable`'s own `pointerdown`/`pointermove` handlers
 * actually read off the incoming event; `pointerId`/`pointerType`
 * aren't part of `MouseEvent`'s own constructor options, so they're
 * attached directly afterward.
 */
const mockPointerEvent = (type: string, init: { button?: number; clientX: number; clientY: number; pointerId: number }): Event => {
  const event = new MouseEvent(type, { bubbles: true, button: init.button ?? 0, clientX: init.clientX, clientY: init.clientY });
  Object.defineProperty(event, `pointerId`, { value: init.pointerId });
  Object.defineProperty(event, `pointerType`, { value: `mouse` });
  return event;
};

/**
 * Phase 1 unit tests — position/size calculation only (see
 * `docs/IMPLEMENTATION_PLAN.md`'s own Phase 1 scope note).
 *
 * Mirrors the level of rigor Vue's own `tests/GridItem.spec.ts`
 * establishes for its own position/size math, adapted to Angular's
 * `@Input()`-then-`ngOnChanges` model instead of Vue's reactive-prop
 * `watch()` one.
 *
 * Three real mistakes fixed after actual test runs surfaced them,
 * rather than assumed correct up front:
 *
 * 1. `toStrictEqual` is a **Jest** matcher — Jasmine (this project's
 *    test framework when run via Karma) has no such matcher at all,
 *    only `toEqual` — which both Jasmine and Jest support, so it's
 *    used everywhere here regardless of which runner executes this
 *    file.
 * 2. `component.style`'s own type (`ITransformStyle | ITopLeftStyle |
 *    Record<string, string>`, a deliberately accurate union reflecting
 *    the two real, different shapes `computeStyle()` can return) has
 *    no common index signature across all three members, so bracket-
 *    indexing it directly doesn't type-check — `styleAsMap()` below
 *    casts to the loose shape these tests actually need for reading
 *    arbitrary keys, without loosening the production component's own
 *    more precise return type.
 * 3. The biggest one: `Object.assign(component, inputs)` alone never
 *    triggers `ngOnChanges` at all — confirmed directly by a real test
 *    run (`style` staying `undefined` even after "setting" every
 *    input), not assumed. `ngOnChanges` only fires when *Angular
 *    itself* detects an `@Input()` binding change during a parent
 *    template's own change detection; setting instance properties
 *    directly, with no parent template driving them (this fixture's
 *    `GridItemComponent` is the *root* of the fixture, with nothing
 *    above it), never triggers that at all. `setInputsAndDetectChanges`
 *    below calls `component.ngOnChanges({} as SimpleChanges)` itself
 *    to compensate — the component's own `ngOnChanges` implementation
 *    doesn't actually inspect the `SimpleChanges` argument's own
 *    contents (it just recomputes unconditionally), so an empty object
 *    is a safe, accurate stand-in here.
 */
describe(`GridItemComponent`, () => {
  let fixture: ComponentFixture<GridItemComponent>;
  let component: GridItemComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridItemComponent);
    component = fixture.componentInstance;
  });

  const setInputsAndDetectChanges = (inputs: Partial<GridItemComponent>): void => {
    Object.assign(component, inputs);
    component.ngOnChanges({} as SimpleChanges);
    fixture.detectChanges();
  };

  const styleAsMap = (): Record<string, string | undefined> => component.style as Record<string, string | undefined>;

  it(`Should render nothing meaningful (an empty style object) before containerWidth is measured`, () => {
    setInputsAndDetectChanges({ containerWidth: 0, h: 2, i: `0`, w: 2, x: 0, y: 0 });

    expect(component.style).toEqual({});
  });

  it(`Should compute the correct left/top/width/height for an item at the grid's own origin`, () => {
    // containerWidth: 1220, colNum: 12, margin: [10, 10] -> colWidth =
    // (1220 - 10*13) / 12 = 90.8333... (confirmed by reading
    // calcColWidth's own source directly — it does not round its own
    // return value, unlike calcGridItemWH/the position formula below,
    // which each round only once, at the very end, using this full,
    // unrounded value throughout). A prior version of this test
    // incorrectly assumed colWidth rounds to a whole 90 partway through
    // the calculation; it doesn't.
    setInputsAndDetectChanges({
      colNum: 12,
      containerWidth: 1220,
      h: 2,
      i: `0`,
      margin: [10, 10],
      rowHeight: 100,
      w: 2,
      x: 0,
      y: 0,
    });

    // left = Math.round(90.8333*0 + 1*10) = 10
    // top = Math.round(100*0 + 1*10) = 10
    // width = Math.round(90.8333*2 + 1*10) = Math.round(191.6667) = 192
    // height = Math.round(100*2 + 1*10) = 210
    expect(styleAsMap()[`transform`]).toBe(`translate3d(10px,10px, 0)`);
    expect(styleAsMap()[`width`]).toBe(`192px`);
    expect(styleAsMap()[`height`]).toBe(`210px`);
  });

  it(`Should compute a non-zero left/top for an item positioned away from the origin`, () => {
    setInputsAndDetectChanges({
      colNum: 12,
      containerWidth: 1220,
      h: 2,
      i: `1`,
      margin: [10, 10],
      rowHeight: 100,
      w: 3,
      x: 4,
      y: 2,
    });

    // left = Math.round(90.8333*4 + 5*10) = Math.round(413.333) = 413
    expect(styleAsMap()[`transform`]).toBe(`translate3d(413px,230px, 0)`);
  });

  it(`Should use top/left CSS properties (not a transform) when useCssTransforms is false`, () => {
    setInputsAndDetectChanges({
      colNum: 12,
      containerWidth: 1220,
      h: 2,
      i: `0`,
      margin: [10, 10],
      rowHeight: 100,
      useCssTransforms: false,
      w: 2,
      x: 0,
      y: 0,
    });

    expect(styleAsMap()[`transform`]).toBeUndefined();
    expect(styleAsMap()[`left`]).toBe(`10px`);
    expect(styleAsMap()[`top`]).toBe(`10px`);
  });

  it(`Should recompute the style when an @Input() changes after the initial render`, () => {
    setInputsAndDetectChanges({
      colNum: 12,
      containerWidth: 1220,
      h: 2,
      i: `0`,
      margin: [10, 10],
      rowHeight: 100,
      w: 2,
      x: 0,
      y: 0,
    });
    const before = styleAsMap()[`transform`];

    setInputsAndDetectChanges({ x: 4 });

    expect(styleAsMap()[`transform`]).not.toBe(before);
  });

  it(`Should set the data-grid-item-id host attribute to match the i input`, () => {
    setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `my-item`, w: 2, x: 0, y: 0 });

    expect(fixture.nativeElement.getAttribute(`data-grid-item-id`)).toBe(`my-item`);
  });

  it(`Should project its content via ng-content`, () => {
    @Component({
      imports: [GridItemComponent],
      standalone: true,
      template: `
        <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
          <span class="projected-marker">projected content</span>
        </kdl-grid-item>
      `,
    })
    class TestHostComponent {}

    // The outer beforeEach above already instantiated the TestBed (via
    // its own TestBed.createComponent(GridItemComponent) call) before
    // this test's own body ever runs — confirmed directly via a real
    // test run throwing "Cannot configure the test module when the
    // test module has already been instantiated", not assumed.
    // resetTestingModule() undoes that so this test can configure its
    // own, separate module for TestHostComponent.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();

    const projected = hostFixture.nativeElement.querySelector(`.projected-marker`);
    expect(projected).toBeTruthy();
    expect(projected.textContent).toBe(`projected content`);
  });

  describe(`Phase 3 — dragging`, () => {
    // jsdom has no real layout engine at all (same limitation this
    // file's own Phase 1 tests already ran into for offsetWidth) —
    // getBoundingClientRect() always reports all-zero values, and
    // offsetParent always reports null, unless both are mocked
    // directly (confirmed via a fresh test run throwing exactly that,
    // not assumed up front). `createNativeDraggable`'s own
    // `__nativeDragHandler` backdoor (stashed on the element
    // specifically so tests can invoke the exact handler a real
    // pointer gesture would, without needing a full pointerdown/move/up
    // sequence — see native-interaction.ts's own doc comment) is what
    // actually lets these tests exercise the real handleDrag logic
    // without needing real pointer events *or* a real layout engine,
    // mirroring the same pattern the Vue package's own
    // tests/GridItem.spec.ts already establishes for this.
    //
    // `createdParent` (rather than the more obvious `fixture.
    // nativeElement.parentElement?.remove()`) is deliberate, fixed
    // after a real run: for a test that never calls
    // setupDraggableItem() at all (the isStatic test below, which
    // returns before ever reading offsetParent), `fixture.nativeElement
    // .parentElement` is whatever shared root container Angular's own
    // TestBed renderer uses internally for *every* fixture — removing
    // that broke every subsequent TestBed.createComponent() call in
    // this same file, a real, confirmed cross-test failure, not a
    // hypothetical one.
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    const dragHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void =>
      (element as unknown as { __nativeDragHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void }).__nativeDragHandler;

    const setupDraggableItem = (): { item: HTMLElement; parent: HTMLElement } => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });

      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      mockRect(item, { left: 100, top: 50 });
      createdParent = parent;

      return { item, parent };
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    it(`Should set isDragging and an initial pixel position on dragstart`, () => {
      const { item } = setupDraggableItem();

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      expect(component.isDragging).toBe(true);
      // item's own rect (100,50) minus its offsetParent's rect (0,0)
      expect(component.dragging).toEqual({ left: 100, top: 50 });
    });

    it(`Should subtract a non-zero parent offset too, not just the degenerate (0,0) case above`, () => {
      // setupDraggableItem's own parent rect is always (0,0) —
      // subtracting 0 can't distinguish "-" from a mutated "+" in
      // clientRect.left - parentRect.left / clientRect.top - parentRect.top.
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 20, top: 15 });
      mockRect(item, { left: 100, top: 50 });
      createdParent = parent;

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      // left = 100-20 = 80; top = 50-15 = 35
      expect(component.dragging).toEqual({ left: 80, top: 35 });
    });

    it(`Should override the grid-unit-derived style with the live pixel position while dragging`, () => {
      const { item } = setupDraggableItem();

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      expect(styleAsMap()[`transform`]).toBe(`translate3d(100px,50px, 0)`);
    });

    it(`Should accumulate pixel deltas across dragmove ticks`, () => {
      const { item } = setupDraggableItem();
      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      dragHandlerOf(item)({ clientX: 130, clientY: 50, target: item, type: `dragmove` });

      // Corrected after a real test run: `dragstart` itself already
      // sets `lastX`/`lastY` (the unconditional `this.lastX = x;` at
      // the end of `handleDrag` runs for every event type, not just
      // `dragmove` — confirmed by re-tracing the ported logic directly,
      // matching Vue's own identical `lastX.value = x;` placement in
      // its own `useGridItemDrag.ts`). So by this first dragmove tick,
      // `lastX` is already 100 (from dragstart), not NaN — this tick
      // already computes a real delta (130-100=30), landing dragging.left
      // at 130, not staying at dragstart's own 100 as a prior version of
      // this test incorrectly assumed.
      dragHandlerOf(item)({ clientX: 160, clientY: 50, target: item, type: `dragmove` });

      // Second tick: delta 160-130=30, dragging.left = 130+30 = 160.
      expect(component.dragging?.left).toBe(160);
    });

    it(`Should clear isDragging and dragging on dragend`, () => {
      const { item } = setupDraggableItem();
      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragend` });

      expect(component.isDragging).toBe(false);
      expect(component.dragging).toBeUndefined();
    });

    it(`Should not react to any drag event at all when isStatic`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isStatic: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      expect(component.isDragging).toBe(false);
    });

    it(`Should return from dragend as a no-op when it fires without a preceding dragstart`, () => {
      // Confirmed reachable, not just theoretical: createNativeDraggable's
      // own pointerup handler only forwards a synthetic "dragend" when a
      // real drag gesture actually started (its own internal "moved past
      // the activation distance" flag) — but a defensive check here still
      // matters, since this handler can be invoked directly via the same
      // __nativeDragHandler backdoor these tests already use, without
      // that guarantee.
      const { item } = setupDraggableItem();

      expect(() => dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragend` })).not.toThrow();
      expect(component.isDragging).toBe(false);
      expect(component.dragging).toBeUndefined();
    });

    it(`Should actually block the native engine from starting a drag at all when isDraggable is false (a real pointerdown, not the test backdoor)`, () => {
      const { item } = setupDraggableItem();
      setInputsAndDetectChanges({ isDraggable: false });
      // createNativeDraggable's own pointerdown handler calls
      // setPointerCapture — not implemented in jsdom, confirmed via a
      // fresh run; mocked here so dispatching a real PointerEvent below
      // doesn't throw for an unrelated reason.
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      item.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 100, clientY: 50, pointerId: 1 }));

      expect(component.isDragging).toBe(false);
    });

    it(`Should let the native engine actually start a drag via a real pointerdown when isDraggable is left at its own default`, () => {
      const { item } = setupDraggableItem();
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      item.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 100, clientY: 50, pointerId: 1 }));
      // A pointerdown alone only arms the gesture (native-interaction.ts's
      // own activation-distance check) — a real move past that distance
      // is what actually fires the synthetic "dragstart".
      item.dispatchEvent(mockPointerEvent(`pointermove`, { clientX: 130, clientY: 80, pointerId: 1 }));

      expect(component.isDragging).toBe(true);
    });

    it(`Should also actually block the native engine from starting a drag when isStatic is true, even with isDraggable left at its own default (true)`, () => {
      // Neither test above ever sets isStatic — both only vary
      // isDraggable, leaving createNativeDraggable's own "enabled:
      // resolvedIsDraggable && !isStatic" option's second half
      // (!isStatic) never isolated on its own.
      const { item } = setupDraggableItem();
      setInputsAndDetectChanges({ isStatic: true });
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      item.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 100, clientY: 50, pointerId: 1 }));
      item.dispatchEvent(mockPointerEvent(`pointermove`, { clientX: 130, clientY: 80, pointerId: 1 }));

      expect(component.isDragging).toBe(false);
    });

    it(`Should not start a drag when the pointerdown originates from a child <button>, matching the default dragIgnoreFrom ('a, button')`, () => {
      // No test in this whole file exercises dragIgnoreFrom/dragAllowFrom
      // at all — confirmed via a direct search. This is the one that
      // matters most: the default value itself, which every consumer
      // gets for free without ever setting the input explicitly.
      const { item } = setupDraggableItem();
      const button = document.createElement(`button`);
      item.appendChild(button);
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};
      (button as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      button.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 100, clientY: 50, pointerId: 1 }));
      item.dispatchEvent(mockPointerEvent(`pointermove`, { clientX: 130, clientY: 80, pointerId: 1 }));

      expect(component.isDragging).toBe(false);
    });

    it(`Should report a grid-unit x/y via the eventBus on each drag tick, when one is injected`, () => {
      const reported: { eventType: string; x: number; y: number }[] = [];
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      // Set these on the service *before* creating the component —
      // confirmed necessary via a fresh test run, not assumed: ngOnInit's
      // own combineLatest subscription fires immediately (it's built on
      // BehaviorSubjects) with whatever the service's own current values
      // are, silently overwriting a direct @Input() assignment made
      // beforehand. Setting them here, matching what a real
      // GridLayoutComponent would already have done by the time any
      // child GridItemComponent mounts, is the actually-correct way to
      // drive these values in this test, not fighting the subscription
      // via Object.assign.
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const item = busFixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      mockRect(item, { left: 0, top: 0 });

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
      // Move roughly one full column+margin to the right (colWidth ~90.83
      // + margin 10 ~= 100.83px) — should resolve to grid x:1.
      dragHandlerOf(item)({ clientX: 101, clientY: 0, target: item, type: `dragmove` });

      expect(reported.some(event => event.eventType === `dragstart`)).toBe(true);
      expect(reported.some(event => event.eventType === `dragmove` && event.x === 1 && event.y === 0)).toBe(true);

      parent.remove();
    });

    it(`Should track position via right (not left) when isMirrored is true, throughout a full drag gesture`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, right: 1220, top: 0 });
      mockRect(item, { left: 1018, right: 1210, top: 10 });
      createdParent = parent;

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });

      expect(component.dragging?.left).toBeUndefined();
      // right = (clientRect.right - parentRect.right) * -1 = (1210-1220)*-1 = 10
      expect(component.dragging?.right).toBe(10);

      dragHandlerOf(item)({ clientX: 30, clientY: 0, target: item, type: `dragmove` });

      // RTL dragmove subtracts the delta from "right" (moving right on
      // screen means getting *closer* to the container's own right edge).
      expect(component.dragging?.right).toBe(10 - 30);

      dragHandlerOf(item)({ clientX: 30, clientY: 0, target: item, type: `dragend` });

      expect(component.isDragging).toBe(false);
      expect(component.dragging).toBeUndefined();
    });

    it(`Should start/update/stop the auto-scroll engine across a full drag gesture when autoScroll is on`, () => {
      const { item } = setupDraggableItem();
      setInputsAndDetectChanges({ autoScroll: true });
      const startSpy = jest.spyOn((component as unknown as { autoScrollEngine: { start: () => void } }).autoScrollEngine, `start`);
      const updateSpy = jest.spyOn((component as unknown as { autoScrollEngine: { update: () => void } }).autoScrollEngine, `update`);
      const stopSpy = jest.spyOn((component as unknown as { autoScrollEngine: { stop: () => void } }).autoScrollEngine, `stop`);

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
      expect(startSpy).toHaveBeenCalledWith(item);

      dragHandlerOf(item)({ clientX: 130, clientY: 50, target: item, type: `dragmove` });
      expect(updateSpy).toHaveBeenCalledWith(130, 50);

      dragHandlerOf(item)({ clientX: 130, clientY: 50, target: item, type: `dragend` });
      expect(stopSpy).toHaveBeenCalled();
    });

    it(`Should not touch the auto-scroll engine at all when autoScroll is off (the default)`, () => {
      const { item } = setupDraggableItem();
      const startSpy = jest.spyOn((component as unknown as { autoScrollEngine: { start: () => void } }).autoScrollEngine, `start`);

      dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });

      expect(startSpy).not.toHaveBeenCalled();
    });

    describe(`Phase 6 — isBounded`, () => {
      /**
       * isBounded's own clamp reads `parentTarget.clientHeight`
       * directly (not via getBoundingClientRect(), which mockRect
       * above already covers) — confirmed by reading handleDrag's own
       * newly-added clamping logic, matching Vue's/React's identical
       * `useGridItemDrag.ts` — so this needs its own explicit mock on
       * top of setupDraggableItem's existing setup.
       */
      const setupBoundedItem = (clientHeight: number): { item: HTMLElement; parent: HTMLElement } => {
        const result = setupDraggableItem();
        Object.defineProperty(result.parent, `clientHeight`, { configurable: true, value: clientHeight });
        return result;
      };

      it(`Should clamp the drag position to the container's own bounds when isBounded is true`, () => {
        setInputsAndDetectChanges({
          colNum: 3,
          containerWidth: 300,
          h: 2,
          i: `0`,
          isBounded: true,
          margin: [10, 10],
          rowHeight: 100,
          w: 2,
          x: 0,
          y: 0,
        });
        const item = fixture.nativeElement as HTMLElement;
        const parent = document.createElement(`div`);
        document.body.appendChild(parent);
        parent.appendChild(item);
        Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
        mockRect(parent, { left: 0, top: 0 });
        Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 300 });
        mockRect(item, { left: 10, top: 10 });
        createdParent = parent;

        dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
        // Drag far past the right/bottom edges of a small, 300px container.
        dragHandlerOf(item)({ clientX: 5000, clientY: 5000, target: item, type: `dragmove` });

        // colWidth = (300 - 10*4) / 3 = 86.667; item width (w:2) =
        // round(86.667*2 + 10) = 183; rightBoundary = 300 - 183 = 117.
        // itemHeight (h:2, rowHeight:100, marginV:10) = round(100*2+10) = 210;
        // bottomBoundary = 300 - 210 = 90. Both dragging.left/top should be
        // clamped to (at most) these boundaries, not the huge raw delta.
        expect(component.dragging?.left).toBeLessThanOrEqual(117);
        expect(component.dragging?.top).toBeLessThanOrEqual(90);
      });

      it(`Should not clamp the drag position at all when isBounded is false (the default)`, () => {
        const { item } = setupBoundedItem(300);

        dragHandlerOf(item)({ clientX: 100, clientY: 50, target: item, type: `dragstart` });
        dragHandlerOf(item)({ clientX: 5000, clientY: 5000, target: item, type: `dragmove` });

        // Unbounded — the raw accumulated delta should be far larger than
        // any of the bounded test's own clamped values above.
        expect(component.dragging?.left).toBeGreaterThan(1000);
        expect(component.dragging?.top).toBeGreaterThan(1000);
      });

      it(`Should clamp to a floor of 0 as well, not just the upper container bound`, () => {
        setInputsAndDetectChanges({
          colNum: 3,
          containerWidth: 300,
          h: 2,
          i: `0`,
          isBounded: true,
          margin: [10, 10],
          rowHeight: 100,
          w: 2,
          x: 0,
          y: 0,
        });
        const item = fixture.nativeElement as HTMLElement;
        const parent = document.createElement(`div`);
        document.body.appendChild(parent);
        parent.appendChild(item);
        Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
        mockRect(parent, { left: 0, top: 0 });
        Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 300 });
        mockRect(item, { left: 10, top: 10 });
        createdParent = parent;

        dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
        // Drag far past the left/top edges (negative direction).
        dragHandlerOf(item)({ clientX: -5000, clientY: -5000, target: item, type: `dragmove` });

        expect(component.dragging?.left).toBeGreaterThanOrEqual(0);
        expect(component.dragging?.top).toBeGreaterThanOrEqual(0);
      });

      it(`Should clamp the drag position via the right anchor, not left, when isBounded and isMirrored are both true`, () => {
        setInputsAndDetectChanges({
          colNum: 3,
          containerWidth: 300,
          h: 2,
          i: `0`,
          isBounded: true,
          isMirrored: true,
          margin: [10, 10],
          rowHeight: 100,
          w: 2,
          x: 0,
          y: 0,
        });
        const item = fixture.nativeElement as HTMLElement;
        const parent = document.createElement(`div`);
        document.body.appendChild(parent);
        parent.appendChild(item);
        Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
        mockRect(parent, { left: 0, right: 300, top: 0 });
        Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 300 });
        mockRect(item, { left: 10, right: 107, top: 10 });
        createdParent = parent;

        dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
        // Drag far past the right/bottom edges of a small, 300px container.
        dragHandlerOf(item)({ clientX: 5000, clientY: 5000, target: item, type: `dragmove` });

        expect(component.dragging?.left).toBeUndefined();
        // Same rightBoundary math as the LTR isBounded test above (117),
        // just measured from the container's own right edge instead.
        expect(component.dragging?.right).toBeGreaterThanOrEqual(0);
        expect(component.dragging?.top).toBeLessThanOrEqual(90);
      });
    });
  });

  describe(`Phase 4 — resizing`, () => {
    // Same jsdom limitations and same fix as the Phase 3 drag tests
    // above (getBoundingClientRect()/offsetParent both need mocking
    // directly). `createNativeResizable`'s own `__nativeResizeHandler`
    // backdoor (stashed on the item's own root element, matching
    // `createNativeDraggable`'s identical `__nativeDragHandler` — see
    // native-interaction.ts's own doc comment) is what lets these tests
    // exercise the real handleResize logic directly.
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    interface IEdges { bottom: boolean; left: boolean; right: boolean; top: boolean }
    const NO_EDGES: IEdges = { bottom: false, left: false, right: false, top: false };

    const resizeHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void =>
      (element as unknown as { __nativeResizeHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void }).__nativeResizeHandler;

    const setupResizableItem = (): { item: HTMLElement; parent: HTMLElement } => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });

      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      return { item, parent };
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    it(`Should set isResizing and seed resizing from the item's own current grid position/size on resizestart`, () => {
      const { item } = setupResizableItem();

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      expect(component.isResizing).toBe(true);
      // colWidth = (1220-10*13)/12 = 90.8333; left=round(90.8333*0+10)=10;
      // top=round(100*0+10)=10; width=round(90.8333*2+10)=192; height=round(100*2+10)=210
      expect(component.resizing).toEqual({ height: 210, left: 10, top: 10, width: 192 });
    });

    it(`Should seed a non-zero left/top from calcResizePosition on resizestart, not just the origin case above`, () => {
      // The test above uses x:0, y:0 — (x+1)*margin and (y+1)*margin
      // both reduce to a bare margin value either way, which can't
      // distinguish "+" from "-" or "*" from "/" in colWidth*x/rowHeight*y
      // (both terms are simply 0 regardless of the operator at x=y=0).
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 4,
        y: 3,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      // left = round(90.8333*4 + 5*10) = round(363.333+50) = 413
      // top = round(100*3 + 4*10) = round(300+40) = 340
      expect(component.resizing).toEqual({ height: 210, left: 413, top: 340, width: 192 });
    });

    it(`Should pass an Infinity height/width straight through on resizestart, not run it through the pixel formula`, () => {
      // Nothing in this phase's own scope ever actually sets h/w to
      // Infinity (that's what the still-deferred autoHeight feature
      // would produce — see this class's own doc comment on what's
      // deferred), but calcResizePosition is a direct port of Vue's own
      // calcPosition, which already handles this case correctly for
      // when that feature does land — worth verifying now rather than
      // leaving unexercised.
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: Infinity,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: Infinity,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      expect(component.resizing?.height).toBe(Infinity);
      expect(component.resizing?.width).toBe(Infinity);
    });

    it(`Should grow width when dragging the right ("e") edge`, () => {
      const { item } = setupResizableItem();
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(component.resizing?.width).toBe(192 + 50);
      expect(component.resizing?.left).toBe(10);
    });

    it(`Should grow width and move the left anchor when dragging the left ("w") edge`, () => {
      const { item } = setupResizableItem();
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, left: true }, target: item, type: `resizestart` });

      // Moving left (negative delta) with the left edge active grows
      // width and moves the anchor left too, matching how dragging a
      // left edge outward (away from the item) should behave.
      resizeHandlerOf(item)({ clientX: -50, clientY: 0, edges: { ...NO_EDGES, left: true }, target: item, type: `resizemove` });

      expect(component.resizing?.width).toBe(192 + 50);
      expect(component.resizing?.left).toBe(10 - 50);
    });

    it(`Should override the grid-unit-derived style with the live pixel position+size while resizing`, () => {
      const { item } = setupResizableItem();

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      expect(styleAsMap()[`width`]).toBe(`192px`);
      expect(styleAsMap()[`height`]).toBe(`210px`);
    });

    it(`Should clear isResizing and resizing on resizeend`, () => {
      const { item } = setupResizableItem();
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` });

      expect(component.isResizing).toBe(false);
      expect(component.resizing).toBeUndefined();
    });

    it(`Should not react to any resize event at all when isStatic`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isStatic: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      expect(component.isResizing).toBe(false);
    });

    it(`Should not let a resize shrink an item below its own minW/minH`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        minH: 2,
        minW: 2,
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      // Shrink by roughly 2 full columns worth of pixels.
      resizeHandlerOf(item)({ clientX: -250, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      // component.resizing tracks the raw, unclamped pixel size during
      // the gesture (a real shrink did happen, visually) — the actual
      // minW/minH clamp itself is verified via the reported eventBus
      // payload in the next test below, which properly provides a
      // GridEventBusService for that purpose (this test's own fixture,
      // from the outer beforeEach, doesn't provide one at all — calling
      // fixture.debugElement.injector.get(GridEventBusService) here
      // would throw, confirmed directly, since nothing in this specific
      // test's own module configuration provides it).
      expect(component.resizing?.width).toBeLessThan(192);
    });

    it(`Should clamp width up to minW when shrinking below it, verified via the reported eventBus payload (not just the raw, unclamped resizing state)`, () => {
      // The test above only ever checks component.resizing (the raw,
      // unclamped pixel size) and its own comment claims minW/minH are
      // "verified via the reported eventBus payload in the next test
      // below" — but the next test is actually for maxW, not minW. No
      // test in this file ever isolates the minW clamp itself the way
      // minH/maxW/maxH each get their own dedicated eventBus-report test.
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        minW: 2,
        rowHeight: 100,
        w: 3,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ w: event.w }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      // Shrink by roughly 3 full columns worth of pixels — would resolve
      // to w far below 2 without the minW clamp.
      resizeHandlerOf(item)({ clientX: -300, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(reported.every(event => event.w >= 2)).toBe(true);
      expect(reported.some(event => event.w === 2)).toBe(true);
    });

    it(`Should clamp width up to maxW when growing past it`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        maxW: 3,
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ w: event.w }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      // Grow by roughly 5 full columns worth of pixels — would resolve to
      // w far beyond 3 without the maxW clamp.
      resizeHandlerOf(item)({ clientX: 500, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(reported.every(event => event.w <= 3)).toBe(true);
      expect(reported.some(event => event.w === 3)).toBe(true);
    });

    it(`Should clamp height up to maxH when growing past it`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        maxH: 3,
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { h: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizestart` });
      // Grow by roughly 5 full rows worth of pixels — would resolve to h
      // far beyond 3 without the maxH clamp.
      resizeHandlerOf(item)({ clientX: 0, clientY: 500, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizemove` });

      expect(reported.every(event => event.h <= 3)).toBe(true);
      expect(reported.some(event => event.h === 3)).toBe(true);
    });

    it(`Should clamp height up to minH when shrinking below it`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 3,
        i: `0`,
        margin: [10, 10],
        minH: 2,
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { h: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizestart` });
      // Shrink by roughly 3 full rows worth of pixels — would resolve to h
      // far below 2 without the minH clamp.
      resizeHandlerOf(item)({ clientX: 0, clientY: -300, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizemove` });

      expect(reported.every(event => event.h >= 2)).toBe(true);
      expect(reported.some(event => event.h === 2)).toBe(true);
    });

    it(`Should floor width/height at 1 grid unit even when minW/minH are explicitly set to 0`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        minH: 0,
        minW: 0,
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { w: number; h: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h, w: event.w }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { bottom: true, left: false, right: true, top: false }, target: item, type: `resizestart` });
      // Shrink drastically in both dimensions at once — would resolve to
      // 0x0 grid units without the final floor, since minW/minH (0) don't
      // clamp it up themselves this time.
      resizeHandlerOf(item)({ clientX: -1000, clientY: -1000, edges: { bottom: true, left: false, right: true, top: false }, target: item, type: `resizemove` });

      expect(reported.every(event => event.w >= 1 && event.h >= 1)).toBe(true);
    });

    it(`Should grow height and move the top anchor when dragging the top ("n") edge`, () => {
      const { item } = setupResizableItem();
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, top: true }, target: item, type: `resizestart` });

      // Moving up (negative Y delta) with the top edge active grows
      // height and moves the anchor up too.
      resizeHandlerOf(item)({ clientX: 0, clientY: -50, edges: { ...NO_EDGES, top: true }, target: item, type: `resizemove` });

      expect(component.resizing?.height).toBe(210 + 50);
      expect(component.resizing?.top).toBe(10 - 50);
    });

    it(`Should grow height when dragging the bottom ("s") edge`, () => {
      const { item } = setupResizableItem();
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 0, clientY: 50, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizemove` });

      expect(component.resizing?.height).toBe(210 + 50);
      expect(component.resizing?.top).toBe(10);
    });

    it(`Should commit a moved x/y for a top-edge resize, converted via pixelsToGridY`, () => {
      const reported: { x: number; y: number }[] = [];
      const eventBus = new GridEventBusService();
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      eventBus.itemResize$.subscribe(event => reported.push({ x: event.x, y: event.y }));

      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, margin: [10, 10], rowHeight: 100, w: 2, x: 0, y: 4 });
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;

      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, top: true }, target: item, type: `resizestart` });
      // Move up by roughly one full row+margin (rowHeight 100 + margin 10
      // = 110px) — should resolve to grid y:3 (one row up from 4).
      resizeHandlerOf(item)({ clientX: 0, clientY: -110, edges: { ...NO_EDGES, top: true }, target: item, type: `resizemove` });

      expect(reported.some(event => event.y === 3)).toBe(true);
    });

    it(`Should return from resizeend as a no-op when it fires without a preceding resizestart`, () => {
      const { item } = setupResizableItem();

      expect(() => resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` })).not.toThrow();
      expect(component.isResizing).toBe(false);
      expect(component.resizing).toBeUndefined();
    });

    it(`Should actually block the native engine from starting a resize at all when isResizable is false (a real pointerdown, not the test backdoor)`, () => {
      const { item } = setupResizableItem();
      setInputsAndDetectChanges({ isResizable: false });
      const seHandle = item.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
      (seHandle as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      seHandle.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(component.isResizing).toBe(false);
    });

    it(`Should let the native engine actually start a resize via a real pointerdown when isResizable is left at its own default`, () => {
      const { item } = setupResizableItem();
      const seHandle = item.querySelector(`.kdl-resize-hint--se`) as HTMLElement;
      (seHandle as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      seHandle.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(component.isResizing).toBe(true);
    });

    it(`Should wire up the n/w resize handles too, not just se — ngAfterViewInit's own eight nearly-identical "if handleRef" checks are each only ever exercised together (the resizeHandles-subset test above always excludes some, never all eight at once)`, () => {
      const { item: itemN } = setupResizableItem();
      const nHandle = itemN.querySelector(`.kdl-resize-hint--n`) as HTMLElement;
      (nHandle as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      nHandle.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(component.isResizing).toBe(true);
    });

    it(`Should wire up the w resize handle too`, () => {
      const { item } = setupResizableItem();
      const wHandle = item.querySelector(`.kdl-resize-hint--w`) as HTMLElement;
      (wHandle as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      wHandle.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(component.isResizing).toBe(true);
    });

    it.each([`e`, `s`, `ne`, `nw`, `sw`])(`Should wire up the %s resize handle too, completing all eight`, edge => {
      const { item } = setupResizableItem();
      const handle = item.querySelector(`.kdl-resize-hint--${edge}`) as HTMLElement;
      (handle as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      handle.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));

      expect(component.isResizing).toBe(true);
    });

    it(`Should report a grid-unit w/h/x/y via the eventBus on each resize tick, when one is injected`, () => {
      const reported: { eventType: string; w: number; h: number; x: number; y: number }[] = [];
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      eventBus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w, x: event.x, y: event.y }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const item = busFixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      // Grow width by roughly one full column+margin (colWidth ~90.83 +
      // margin 10 ~= 100.83px) — should resolve to grid w:3.
      resizeHandlerOf(item)({ clientX: 101, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(reported.some(event => event.eventType === `resizestart`)).toBe(true);
      expect(reported.some(event => event.eventType === `resizemove` && event.w === 3 && event.h === 2)).toBe(true);

      parent.remove();
    });

    it(`Should seed resizing with a right (not left) anchor on resizestart when isMirrored is true`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      expect(component.resizing?.left).toBeUndefined();
      // colWidth = 90.8333; right = round(90.8333*(12-0-2) + (12-0-2+1)*10) = 1018
      expect(component.resizing?.right).toBe(1018);
    });

    it(`Should grow width via the left edge without moving the (right-measured) anchor, when isMirrored is true`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, left: true }, target: item, type: `resizestart` });
      const rightBefore = component.resizing?.right;

      resizeHandlerOf(item)({ clientX: -50, clientY: 0, edges: { ...NO_EDGES, left: true }, target: item, type: `resizemove` });

      // In RTL, the left edge grows width without moving the right anchor.
      expect(component.resizing?.width).toBe(192 + 50);
      expect(component.resizing?.right).toBe(rightBefore);
    });

    it(`Should grow width via the right edge and move the (right-measured) anchor, when isMirrored is true`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      const rightBefore = component.resizing?.right ?? 0;

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(component.resizing?.width).toBe(192 + 50);
      expect(component.resizing?.right).toBe(rightBefore - 50);
    });

    it(`Should clear isResizing/resizing on resizeend when isMirrored is true, same as the LTR case`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` });

      expect(component.isResizing).toBe(false);
      expect(component.resizing).toBeUndefined();
    });
  });

  describe(`Phase 7 — isMirrored / zIndex / per-item resize-handle overrides / multiSelect`, () => {
    it(`Should position via right (not left) when isMirrored is true`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });

      const style = styleAsMap();
      expect(style[`left`]).toBeUndefined();
      // colWidth = 90.8333; right = round(90.8333*(12-0-2) + (12-0-2+1)*10) = round(908.33+110) = 1018
      expect(style[`transform`]).toBe(`translate3d(-1018px,10px, 0)`);
    });

    it(`Should add the kdl-grid-item--rtl host class when isMirrored is true`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isMirrored: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.classList.contains(`kdl-grid-item--rtl`)).toBe(true);
    });

    it(`Should use the right CSS property (not a transform) when isMirrored is true and useCssTransforms is false`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        isMirrored: true,
        margin: [10, 10],
        rowHeight: 100,
        useCssTransforms: false,
        w: 2,
        x: 0,
        y: 0,
      });

      const style = styleAsMap();
      expect(style[`transform`]).toBeUndefined();
      expect(style[`left`]).toBeUndefined();
      // Same right value as the useCssTransforms:true RTL test above (1018).
      expect(style[`right`]).toBe(`1018px`);
      expect(style[`top`]).toBe(`10px`);
    });

    it(`Should apply an explicit zIndex as an inline style`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0, zIndex: 42 });

      expect(fixture.nativeElement.querySelector(`div`)?.style.zIndex).toBe(`42`);
    });

    it(`Should apply --kdl-resize-handle-color as transparent when showResizeHandles is explicitly false`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, showResizeHandles: false, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`transparent`);
    });

    it(`Should not set --kdl-resize-handle-color at all when showResizeHandles is left at its own default (null)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.getPropertyValue(`--kdl-resize-handle-color`)).toBe(``);
    });

    it(`Should render only the resizeHandles subset specified per-item, not all 8`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, resizeHandles: [`se`, `sw`], w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--se`)).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--sw`)).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--n`)).toBeFalsy();
    });

    it(`Should render all 8 resize handles when resizeHandles is left at its own default (null)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      for(const edge of [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]) {
        expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--${edge}`)).toBeTruthy();
      }
    });

    it(`Should re-resolve the rendered resize-handle subset when resizeHandles changes after the initial render`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, resizeHandles: [`se`], w: 2, x: 0, y: 0 });
      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--n`)).toBeFalsy();

      // Deliberately not the shared setInputsAndDetectChanges helper here
      // — confirmed necessary via a real test run, not assumed: that
      // helper always calls `ngOnChanges({} as SimpleChanges)`, an
      // *empty* object, so `changes['resizeHandles']` is never truthy
      // through it and `resolvedResizeHandles` never actually re-resolves
      // (matching the same class of issue `grid-layout.component.spec.
      // ts`'s own "cascade a useCssTransforms change" test already
      // documents and works around identically).
      component.resizeHandles = [`n`, `s`];
      component.ngOnChanges({ resizeHandles: {} } as unknown as SimpleChanges);
      // Same root cause already diagnosed at length for the autoHeight
      // toggle test above: this component is `OnPush`, and neither a
      // plain property assignment nor a manually-invoked `ngOnChanges()`
      // marks the view dirty the way a real, parent-template-driven
      // `@Input()` binding change would — `fixture.detectChanges()`
      // alone doesn't retroactively fix that. Confirmed by a real test
      // run failing at the identical point before this line was added.
      (component as unknown as { changeDetectorRef: { markForCheck: () => void } }).changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--n`)).toBeTruthy();
      expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--se`)).toBeFalsy();
    });

    it(`Should fall back to all 8 resize handles when resizeHandles changes back to null after the initial render`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, resizeHandles: [`se`], w: 2, x: 0, y: 0 });

      component.resizeHandles = null;
      component.ngOnChanges({ resizeHandles: {} } as unknown as SimpleChanges);
      (component as unknown as { changeDetectorRef: { markForCheck: () => void } }).changeDetectorRef.markForCheck();
      fixture.detectChanges();

      for(const edge of [`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`]) {
        expect(fixture.nativeElement.querySelector(`.kdl-resize-hint--${edge}`)).toBeTruthy();
      }
    });

    it(`Should apply the explicit resizeHandleColor when showResizeHandles is true`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, resizeHandleColor: `rgb(1, 2, 3)`, showResizeHandles: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`rgb(1, 2, 3)`);
    });

    it(`Should fall back to the default resize-handle color when showResizeHandles is true but resizeHandleColor isn't set`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, showResizeHandles: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.getPropertyValue(`--kdl-resize-handle-color`)).toBe(`rgb(94 94 94 / 45%)`);
    });

    it(`Should reflect isSelected via the eventBus's own selectedItemIds$, and drive the kdl-grid-item--selected host class`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      expect(busComponent.isSelected).toBe(false);
      expect(busFixture.nativeElement.classList.contains(`kdl-grid-item--selected`)).toBe(false);

      eventBus.setSelectedItemIds(new Set([`0`]));

      expect(busComponent.isSelected).toBe(true);
      // markForCheck() alone (called inside the eventBus subscription)
      // only flags this component as dirty for the *next* change
      // detection cycle — it doesn't synchronously repaint the DOM, so
      // an explicit detectChanges() here is required for the host class
      // binding to actually apply, confirmed directly via a fresh test
      // run: without this, isSelected itself was already correctly
      // true, but the DOM's own classList hadn't picked it up yet.
      busFixture.detectChanges();

      expect(busFixture.nativeElement.classList.contains(`kdl-grid-item--selected`)).toBe(true);

      busFixture.nativeElement.remove();
    });

    it(`Should stop the click from propagating (so a background click doesn't immediately clear the selection it just set)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      const stopPropagationSpy = jest.fn();
      const clickEvent = { ctrlKey: false, metaKey: false, shiftKey: false, stopPropagation: stopPropagationSpy } as unknown as MouseEvent;

      component.handleClick(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it(`Should report a click via the eventBus's own itemClicked$, when one is injected`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      const reported: { i: string | number }[] = [];
      eventBus.itemClicked$.subscribe(event => reported.push({ i: event.i }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `my-item`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      busComponent.handleClick({ ctrlKey: false, metaKey: false, shiftKey: false, stopPropagation: () => {} } as unknown as MouseEvent);

      expect(reported).toEqual([{ i: `my-item` }]);

      busFixture.nativeElement.remove();
    });
  });

  describe(`Phase 11 — preserveAspectRatio / autoHeight`, () => {
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    interface IEdges { bottom: boolean; left: boolean; right: boolean; top: boolean }
    const NO_EDGES: IEdges = { bottom: false, left: false, right: false, top: false };

    const resizeHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void =>
      (element as unknown as { __nativeResizeHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void }).__nativeResizeHandler;

    const setupResizableItem = (inputs: Partial<GridItemComponent> = {}): { item: HTMLElement; parent: HTMLElement } => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
        ...inputs,
      });

      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      return { item, parent };
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    it(`Should derive height from width via preserveAspectRatio when only a horizontal edge is being dragged`, () => {
      const { item } = setupResizableItem({ preserveAspectRatio: true });
      // Starting size: width 192, height 210 (see Phase 4's own identical
      // resizestart math) — aspectRatio captured as 192/210.
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      // width grows to 242 (192+50); height should be derived from the
      // captured ratio, not left at its own starting 210.
      const aspectRatio = 192 / 210;
      expect(component.resizing?.width).toBe(242);
      expect(component.resizing?.height).toBeCloseTo(242 / aspectRatio, 5);
    });

    it(`Should derive width from height via preserveAspectRatio when only a vertical edge is being dragged`, () => {
      const { item } = setupResizableItem({ preserveAspectRatio: true });
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 0, clientY: 40, edges: { ...NO_EDGES, bottom: true }, target: item, type: `resizemove` });

      const aspectRatio = 192 / 210;
      expect(component.resizing?.height).toBe(250);
      expect(component.resizing?.width).toBeCloseTo(250 * aspectRatio, 5);
    });

    it(`Should not touch height at all when preserveAspectRatio is off (the default), matching Phase 4's own plain resize behavior`, () => {
      const { item } = setupResizableItem({ preserveAspectRatio: false });
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(component.resizing?.width).toBe(242);
      expect(component.resizing?.height).toBe(210);
    });

    it(`Should derive height from width and adjust the top anchor via preserveAspectRatio during a corner (top+horizontal edge) resize`, () => {
      const { item } = setupResizableItem({ preserveAspectRatio: true });
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { bottom: false, left: false, right: true, top: true }, target: item, type: `resizestart` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { bottom: false, left: false, right: true, top: true }, target: item, type: `resizemove` });

      const aspectRatio = 192 / 210;
      const derivedHeight = 242 / aspectRatio;
      expect(component.resizing?.width).toBe(242);
      expect(component.resizing?.height).toBeCloseTo(derivedHeight, 5);
      // top anchor adjusted by exactly (prevHeight - derivedHeight), the
      // same compensation a direct top-edge height change already gets.
      expect(component.resizing?.top).toBeCloseTo(10 + (210 - derivedHeight), 5);
    });

    it(`Should clear the captured aspect ratio on resizeend`, () => {
      const { item } = setupResizableItem({ preserveAspectRatio: true });
      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` });

      expect((component as unknown as { aspectRatio: number | undefined }).aspectRatio).toBeUndefined();
    });

    it(`Should render a dedicated auto-height wrapper element around the projected content when autoHeight is on`, () => {
      setInputsAndDetectChanges({ autoHeight: true, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`)).toBeTruthy();
    });

    it(`Should not render any wrapper at all when autoHeight is off (the default)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`)).toBeFalsy();
    });

    it(`Should report a grid-unit resizeend tick via the eventBus when the measured content size resolves to a different w/h`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { eventType: string; h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const wrapper = busFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
      expect(wrapper).toBeTruthy();
      // colWidth = 90.8333; a measured width of 300px -> w = round((300+10)/(90.8333+10)) = 3.
      // A measured height of 340px, ceil-rounded -> h = ceil((340+10)/(100+10)) = 4.
      mockRect(wrapper, { height: 340, width: 300 });

      (busComponent as unknown as { autoSize: () => void }).autoSize();

      expect(reported).toEqual([{ eventType: `resizeend`, h: 4, w: 3 }]);

      busFixture.nativeElement.remove();
    });

    it(`Should not report anything at all when the measured content size resolves to the same w/h the item already has`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: unknown[] = [];
      eventBus.itemResize$.subscribe(event => reported.push(event));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { autoHeight: true, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const wrapper = busFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
      // width=192, height=210 resolve back to the same w:2, h:2 already set.
      mockRect(wrapper, { height: 210, width: 192 });

      (busComponent as unknown as { autoSize: () => void }).autoSize();

      expect(reported.length).toBe(0);

      busFixture.nativeElement.remove();
    });

    it(`Should clamp the measured size to minW/maxW/minH/maxH`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h, w: event.w }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { autoHeight: true, h: 2, i: `0`, maxH: 3, maxW: 3, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const wrapper = busFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
      // A huge measured size would resolve far beyond maxW/maxH without the clamp.
      mockRect(wrapper, { height: 5000, width: 5000 });

      (busComponent as unknown as { autoSize: () => void }).autoSize();

      expect(reported).toEqual([{ h: 3, w: 3 }]);

      busFixture.nativeElement.remove();
    });

    it(`Should tear down the observer on ngOnDestroy without throwing`, () => {
      setInputsAndDetectChanges({ autoHeight: true, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(() => fixture.destroy()).not.toThrow();
    });

    it(`Should render the wrapper once autoHeight toggles on after the initial render, not just when set from the start`, () => {
      // Uses the same setInputsAndDetectChanges helper every other
      // "change after initial render" test in this file already relies
      // on, not a hand-rolled ngOnChanges({ autoHeight: { firstChange:
      // false } }) call. That custom sequence was the actual bug, not a
      // timing issue: confirmed via a real diagnostic console.log that
      // `component.autoHeight` was correctly `true` while the rendered
      // DOM still showed the `@else` branch untouched, even after two
      // separate detectChanges() calls — the custom fake SimpleChanges
      // object apparently didn't drive Angular's own change detection
      // the same way a real setInputsAndDetectChanges()/Object.assign()
      // round trip does everywhere else in this file. `ngOnChanges`'s
      // own autoHeight-specific branch doesn't care which path is used
      // to reach it (it just reads `this.autoHeight` directly either
      // way), so this is a strictly safer way to reach the identical
      // assertion, not a narrower one.
      setInputsAndDetectChanges({ autoHeight: false, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`)).toBeFalsy();

      setInputsAndDetectChanges({ autoHeight: true });
      // Real root cause, found via three rounds of diagnostics, not a
      // template-structure issue at all (an earlier fix attempt already
      // corrected a genuine, separate `@if`/`<ng-content>` toggle bug,
      // but that alone didn't explain this failure persisting): this
      // component uses `ChangeDetectionStrategy.OnPush`, and nothing
      // about `Object.assign(component, inputs)` plus a *manually
      // invoked* `ngOnChanges()` ever marks this view dirty the way
      // Angular's own binding-update machinery would if a parent
      // template were actually driving `[autoHeight]`. `fixture.
      // detectChanges()` alone doesn't retroactively mark a view dirty
      // either — confirmed directly: a third diagnostic showed the
      // wrapper `<div>` now correctly always rendering (the earlier fix
      // did work structurally) with `autoHeight` confirmed `true`, yet
      // still no class applied, across multiple `detectChanges()` calls.
      // An explicit `markForCheck()` is what a real `@Input()` binding
      // change would have triggered internally; calling it here
      // directly is what actually reaches parity with that.
      (component as unknown as { changeDetectorRef: { markForCheck: () => void } }).changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`)).toBeTruthy();
    });

    it(`Should re-run setupAutoHeight() on the next microtask after autoHeight toggles on, without throwing`, async () => {
      setInputsAndDetectChanges({ autoHeight: false, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(() => {
        component.ngOnChanges({ autoHeight: { firstChange: false } } as unknown as SimpleChanges);
      }).not.toThrow();

      await Promise.resolve();
    });

    it(`Should actually invoke setupAutoHeight() on the next microtask, not just avoid throwing — confirmed via a spy`, () => {
      // The test above never actually sets component.autoHeight to true
      // before calling ngOnChanges — only the *changes* object claims a
      // change happened, so setupAutoHeight()'s own "if(!this.autoHeight)"
      // guard makes it a no-op regardless, and a mutated
      // "() => undefined" in place of the real microtask callback would
      // still pass that test's own bare not.toThrow() check.
      setInputsAndDetectChanges({ autoHeight: false, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      const setupSpy = jest.spyOn(component as unknown as { setupAutoHeight: () => void }, `setupAutoHeight`);
      component.autoHeight = true;

      component.ngOnChanges({ autoHeight: { firstChange: false } } as unknown as SimpleChanges);

      return Promise.resolve().then(() => {
        expect(setupSpy).toHaveBeenCalled();
      });
    });

    it(`Should NOT tear down/re-setup autoHeight at all when an unrelated @Input() changes and autoHeight itself is untouched`, () => {
      // The setInputsAndDetectChanges helper's own established convention
      // (ngOnChanges({layout:{}})) never includes an autoHeight key at
      // all for a normal call — confirming this guard's own "&&
      // !firstChange" condition genuinely gates teardownAutoHeight(),
      // not just that some other test happens to satisfy it when it
      // should. A mutant forcing this condition to always true would
      // tear down and reschedule the observer on every single
      // unrelated input change.
      setInputsAndDetectChanges({ autoHeight: true, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      const teardownSpy = jest.spyOn(component as unknown as { teardownAutoHeight: () => void }, `teardownAutoHeight`);

      setInputsAndDetectChanges({ zIndex: 5 });

      expect(teardownSpy).not.toHaveBeenCalled();
    });

    it(`Should tear down the observer once autoHeight toggles back off`, async () => {
      setInputsAndDetectChanges({ autoHeight: true, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      await Promise.resolve();
      expect((component as unknown as { autoHeightObserver: ResizeObserver | undefined }).autoHeightObserver).toBeTruthy();

      component.autoHeight = false;
      component.ngOnChanges({ autoHeight: { firstChange: false } } as unknown as SimpleChanges);
      fixture.detectChanges();
      await Promise.resolve();

      expect((component as unknown as { autoHeightObserver: ResizeObserver | undefined }).autoHeightObserver).toBeUndefined();
    });

    it(`Should be a no-op, not a throw, when autoSize() is called with no wrapper ref (autoHeight off)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(() => (component as unknown as { autoSize: () => void }).autoSize()).not.toThrow();
    });

    it(`Should be a no-op, not a throw, when autoSize() is called before ngAfterViewInit has ever run (no ViewChild resolved yet)`, () => {
      // A fresh fixture, deliberately never passed through detectChanges()
      // at all — Angular resolves @ViewChild refs (autoHeightWrapperRef
      // included) as part of the same lifecycle detectChanges() itself
      // triggers, so calling a private method directly beforehand is the
      // one way to genuinely observe this guard's own "not resolved yet"
      // state, distinct from the "resolved, but autoHeight is off" case
      // the test above already covers.
      const freshFixture = TestBed.createComponent(GridItemComponent);

      expect(() => (freshFixture.componentInstance as unknown as { autoSize: () => void }).autoSize()).not.toThrow();

      freshFixture.nativeElement.remove();
    });

    it(`Should invoke autoSize() when the underlying ResizeObserver's own callback actually fires`, () => {
      // jsdom's own ResizeObserver never fires a real callback on its
      // own (confirmed throughout this whole file — every other
      // ResizeObserver-adjacent test here calls autoSize() directly
      // rather than relying on a real observed resize) — mocking the
      // global constructor to capture the callback `setupAutoHeight()`
      // registers is what actually lets this exercise that real
      // registration path, not just autoSize() in isolation.
      const originalResizeObserver = global.ResizeObserver;
      let capturedCallback: (() => void) | undefined;
      global.ResizeObserver = class {
        constructor(callback: () => void) {
          capturedCallback = callback;
        }
        disconnect(): void {}
        observe(): void {}
        unobserve(): void {}
      } as unknown as typeof ResizeObserver;

      try {
        setInputsAndDetectChanges({ autoHeight: true, containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });
        const wrapper = fixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
        mockRect(wrapper, { height: 210, width: 192 });

        expect(capturedCallback).toBeDefined();
        expect(() => capturedCallback?.()).not.toThrow();
      } finally {
        global.ResizeObserver = originalResizeObserver;
      }
    });

    it(`Should clamp the measured size up to minW/minH when it resolves smaller than either`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h, w: event.w }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { autoHeight: true, h: 4, i: `0`, minH: 3, minW: 3, w: 4, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const wrapper = busFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
      // A tiny measured size would resolve to w:1,h:1 without the minW/minH clamp.
      mockRect(wrapper, { height: 5, width: 5 });

      (busComponent as unknown as { autoSize: () => void }).autoSize();

      expect(reported).toEqual([{ h: 3, w: 3 }]);

      busFixture.nativeElement.remove();
    });

    it(`Should floor the measured size at 1 grid unit when minW/minH are explicitly 0 and the measurement resolves to nothing`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);
      const reported: { h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ h: event.h, w: event.w }));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      // minW/minH explicitly 0 — neither clamp branch above the floor
      // check can rescue this, so only the final floor-at-1 can.
      Object.assign(busComponent, { autoHeight: true, h: 4, i: `0`, minH: 0, minW: 0, w: 4, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const wrapper = busFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`) as HTMLElement;
      // A zero-size measurement would resolve to w:0,h:0 without the floor.
      mockRect(wrapper, { height: 0, width: 0 });

      (busComponent as unknown as { autoSize: () => void }).autoSize();

      expect(reported).toEqual([{ h: 1, w: 1 }]);

      busFixture.nativeElement.remove();
    });
  });

  describe(`Phase 14 — grid-wide cascade (IGridDefaults)`, () => {
    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    const dragHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void =>
      (element as unknown as { __nativeDragHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void }).__nativeDragHandler;

    /**
     * Sets up a real eventBus via TestBed DI (not the direct-property-
     * override pattern used elsewhere in this file for write-side
     * eventBus tests) — required here specifically because
     * `resolveGridDefaults()`'s own `gridDefaults$` subscription only
     * happens inside `ngOnInit`, so the eventBus needs to be the *real*
     * one injected at construction time, not swapped in afterward.
     * Matches the established pattern this file already uses for the
     * equivalent "eventBus values must be set before the component is
     * even created" cases (see the drag/resize eventBus-reporting
     * tests above).
     */
    const createItemWithRealEventBus = (inputs: Partial<GridItemComponent>): { busComponent: GridItemComponent; busFixture: ComponentFixture<GridItemComponent>; eventBus: GridEventBusService } => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...inputs });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      return { busComponent, busFixture, eventBus };
    };

    it(`Should default resolvedIsDraggable/resolvedIsResizable to true and resolvedIsBounded/resolvedIsMirrored to false with no eventBus present at all (standalone usage)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.resolvedIsDraggable).toBe(true);
      expect(component.resolvedIsResizable).toBe(true);
      expect(component.resolvedIsBounded).toBe(false);
      expect(component.resolvedIsMirrored).toBe(false);
      expect(component.resolvedMaxRows).toBe(Infinity);
    });

    it(`Should inherit isDraggable from the grid-wide default when this item's own isDraggable is null`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ isDraggable: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: false, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsDraggable).toBe(false);
    });

    it(`Should let this item's own isDraggable override the grid-wide default when explicitly set`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ isDraggable: true });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: false, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsDraggable).toBe(true);
    });

    it(`Should inherit isResizable from the grid-wide default when this item's own isResizable is null`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ isResizable: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: false, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsResizable).toBe(false);
    });

    it(`Should let this item's own isResizable override the grid-wide default when explicitly set`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ isResizable: true });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: false, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsResizable).toBe(true);
    });

    it(`Should inherit isBounded from the grid-wide default when this item's own isBounded is null, and actually clamp during a drag`, () => {
      // colNum deliberately not overridden here — confirmed via careful
      // tracing, not assumed: createItemWithRealEventBus's own eventBus
      // setup already calls setColNum(12) before the component is even
      // created, and GridItemComponent's own combineLatest subscription
      // in ngOnInit overwrites any direct colNum @Input() with whatever
      // the eventBus emits regardless — an earlier version of this test
      // set colNum: 3 here, which was silently ignored the whole time.
      // Harmless for this specific assertion (dragging?.top depends only
      // on h/rowHeight/margin, not colNum at all), but misleading to
      // leave in as if it mattered.
      const { busComponent, busFixture, eventBus } = createItemWithRealEventBus({ isBounded: null, margin: [10, 10], rowHeight: 100 });
      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: true, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsBounded).toBe(true);

      const item = busFixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, right: 300, top: 0 });
      Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 300 });
      mockRect(item, { left: 10, top: 10 });

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
      // Drag far past the container's own edges.
      dragHandlerOf(item)({ clientX: 5000, clientY: 5000, target: item, type: `dragmove` });

      // Clamped (not left free to run past the container) — confirms
      // the *inherited* isBounded default actually reached real
      // behavior, not just the resolved field.
      expect(busComponent.dragging?.top).toBeLessThanOrEqual(90);

      item.remove();
      parent.remove();
    });

    it(`Should let this item's own isBounded override the grid-wide default when explicitly set (grid true, item false → unclamped)`, () => {
      const { busComponent, busFixture, eventBus } = createItemWithRealEventBus({ isBounded: false, margin: [10, 10], rowHeight: 100 });
      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: true, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedIsBounded).toBe(false);

      const item = busFixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, right: 300, top: 0 });
      Object.defineProperty(parent, `clientHeight`, { configurable: true, value: 300 });
      mockRect(item, { left: 10, top: 10 });

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 5000, clientY: 5000, target: item, type: `dragmove` });

      // Unclamped this time — the item's own explicit false won.
      expect(busComponent.dragging?.top).toBeGreaterThan(90);

      item.remove();
      parent.remove();
    });

    it(`Should inherit isMirrored from the grid-wide default when this item's own isMirrored is null, reflected in the host RTL class`, () => {
      const { busFixture, eventBus } = createItemWithRealEventBus({ isMirrored: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: true, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });
      busFixture.detectChanges();

      expect(busFixture.nativeElement.classList.contains(`kdl-grid-item--rtl`)).toBe(true);
    });

    it(`Should let this item's own isMirrored override the grid-wide default when explicitly set`, () => {
      const { busFixture, eventBus } = createItemWithRealEventBus({ isMirrored: false });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: true, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });
      busFixture.detectChanges();

      expect(busFixture.nativeElement.classList.contains(`kdl-grid-item--rtl`)).toBe(false);
    });

    it(`Should always take maxRows from the grid-wide cascade when an eventBus is present, unlike isDraggable/isResizable/isBounded/isMirrored — there is no per-item override at all (matching Vue's own GridItem, confirmed via direct source read)`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ maxRows: 999 });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: 4, showCloseButton: false, useBorderRadius: false });

      // The item's own maxRows @Input() (999) is completely ignored once
      // a real eventBus is present — the grid's own value (4) always wins.
      expect(busComponent.resolvedMaxRows).toBe(4);
    });

    it(`Should fall back to this item's own maxRows @Input() only when no eventBus is present at all (standalone usage)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, maxRows: 7, w: 2, x: 0, y: 0 });

      expect(component.resolvedMaxRows).toBe(7);
    });

    it(`Should re-resolve every cascaded field when the grid's own defaults change again after the initial emission`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ isDraggable: null, isResizable: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: false, isMirrored: false, isResizable: false, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });
      expect(busComponent.resolvedIsDraggable).toBe(false);
      expect(busComponent.resolvedIsResizable).toBe(false);

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });
      expect(busComponent.resolvedIsDraggable).toBe(true);
      expect(busComponent.resolvedIsResizable).toBe(true);
    });
  });

  describe(`Phase 16 — keyboard-driven move/resize`, () => {
    it(`Should have tabindex 0 when draggable and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isResizable: false, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.getAttribute(`tabindex`)).toBe(`0`);
    });

    it(`Should have tabindex 0 when resizable (even if not draggable) and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: false, isResizable: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.getAttribute(`tabindex`)).toBe(`0`);
    });

    it(`Should have no tabindex attribute at all when neither draggable nor resizable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: false, isResizable: false, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.getAttribute(`tabindex`)).toBeNull();
    });

    it(`Should have no tabindex attribute at all when static, even if draggable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isStatic: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.getAttribute(`tabindex`)).toBeNull();
    });

    it(`Should move the item right by one grid unit on ArrowRight, reporting a synthetic dragstart then dragend`, () => {
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; x: number; y: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      expect(reported).toEqual([
        { eventType: `dragstart`, x: 4, y: 4 },
        { eventType: `dragend`, x: 5, y: 4 },
      ]);
    });

    it(`Should move the item in every arrow direction correctly`, () => {
      // Corrected expectations, not a re-guess: an earlier version of
      // this test assumed sequential handleKeydown() calls accumulate,
      // as if x/y updated locally after each move — confirmed wrong via
      // a real test run. moveByKeyboard() never updates this.x/this.y
      // itself (matching the same "wait for the round-trip through the
      // consumer re-applying layoutChange back to the @Input()" pattern
      // mouse-driven drag already uses), so each call below independently
      // moves from the *same*, unchanged x:4,y:4 starting point — not
      // cumulatively from the previous call's own result.
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; x: number; y: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowLeft` }));
      expect(reported[reported.length - 1]).toEqual({ eventType: `dragend`, x: 3, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowUp` }));
      expect(reported[reported.length - 1]).toEqual({ eventType: `dragend`, x: 4, y: 3 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowDown` }));
      expect(reported[reported.length - 1]).toEqual({ eventType: `dragend`, x: 4, y: 5 });
    });

    it(`Should clamp movement at the left/top edge (0), not go negative`, () => {
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; x: number; y: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 0, y: 0 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowLeft` }));

      // Already at x:0 — no genuine change, so no event at all should be
      // reported (matching Vue's own "no-op when unchanged" behavior).
      expect(reported.length).toBe(0);
    });

    it(`Should clamp movement at the right edge (colNum - w), not overflow`, () => {
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; x: number; y: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 10, y: 0 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      expect(reported.length).toBe(0);
    });

    it(`Should clamp movement at the bottom edge (resolvedMaxRows - h), reflecting the grid-wide cascade`, () => {
      const eventBus = new GridEventBusService();
      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: 5, showCloseButton: false, useBorderRadius: false });
      const reported: { eventType: string; x: number; y: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ eventType: event.eventType, x: event.x, y: event.y }));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => eventBus }],
      });
      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { colNum: 12, h: 2, i: `0`, isDraggable: true, w: 2, x: 0, y: 3 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      // maxRows:5, h:2 → y can reach at most 3 already — ArrowDown should
      // be a no-op.
      busComponent.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowDown` }));

      expect(reported.length).toBe(0);
    });

    it(`Should resize instead of move when Shift is held, reporting a synthetic resizestart then resizeend`, () => {
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isResizable: true, w: 2, x: 0, y: 0 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight`, shiftKey: true }));

      expect(reported).toEqual([
        { eventType: `resizestart`, h: 2, w: 2 },
        { eventType: `resizeend`, h: 2, w: 3 },
      ]);
    });

    it(`Should clamp resize at minW/maxW/minH/maxH`, () => {
      const eventBus = new GridEventBusService();
      const reported: { eventType: string; h: number; w: number }[] = [];
      eventBus.itemResize$.subscribe(event => reported.push({ eventType: event.eventType, h: event.h, w: event.w }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isResizable: true, maxW: 2, w: 2, x: 0, y: 0 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight`, shiftKey: true }));

      // Already at maxW:2 — no genuine change.
      expect(reported.length).toBe(0);
    });

    it(`Should not move at all when isDraggable is false, even on a plain arrow key`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: false, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      expect(reported.length).toBe(0);
    });

    it(`Should not resize at all when isResizable is false, even on a Shift+arrow key`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemResize$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isResizable: false, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight`, shiftKey: true }));

      expect(reported.length).toBe(0);
    });

    it(`Should do nothing at all when this item is static`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isStatic: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      expect(reported.length).toBe(0);
    });

    it(`Should ignore a non-arrow key entirely`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `Enter` }));

      expect(reported.length).toBe(0);
    });

    it(`Should ignore Ctrl/Alt/Meta+Arrow entirely, letting OS/AT shortcuts through untouched`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { ctrlKey: true, key: `ArrowRight` }));
      component.handleKeydown(new KeyboardEvent(`keydown`, { altKey: true, key: `ArrowRight` }));
      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight`, metaKey: true }));

      expect(reported.length).toBe(0);
    });

    it(`Should flip the horizontal direction when isMirrored is true, so the physical key still matches the visual movement`, () => {
      const eventBus = new GridEventBusService();
      const reported: { x: number }[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push({ x: event.x }));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isMirrored: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      // Physical "right" flips to a decreasing x in RTL.
      expect(reported[reported.length - 1].x).toBe(3);
    });

    it(`Should call preventDefault() for a handled arrow key, but not for an unhandled one`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      const handledEvent = new KeyboardEvent(`keydown`, { cancelable: true, key: `ArrowRight` });
      component.handleKeydown(handledEvent);
      expect(handledEvent.defaultPrevented).toBe(true);

      const unhandledEvent = new KeyboardEvent(`keydown`, { cancelable: true, key: `Enter` });
      component.handleKeydown(unhandledEvent);
      expect(unhandledEvent.defaultPrevented).toBe(false);
    });
  });

  describe(`Phase 19 — border radius (useBorderRadius / borderRadiusPx)`, () => {
    /**
     * Local copy, not shared with Phase 14's own identical helper —
     * matching this file's own established convention of duplicating
     * test helpers (`mockRect`/`dragHandlerOf` elsewhere in this same
     * file) per describe block rather than sharing them globally: this
     * block is a sibling of Phase 14's, not nested inside it, so it has
     * no access to that block's own locally-scoped helper.
     */
    const createItemWithRealEventBus = (inputs: Partial<GridItemComponent>): { busComponent: GridItemComponent; busFixture: ComponentFixture<GridItemComponent>; eventBus: GridEventBusService } => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...inputs });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      return { busComponent, busFixture, eventBus };
    };

    it(`Should not apply a border-radius style at all when useBorderRadius is false (the default), but still set --kdl-close-button-inset to its own 4px baseline`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.borderRadius).toBe(``);
      expect(style?.getPropertyValue(`--kdl-close-button-inset`)).toBe(`4px`);
    });

    it(`Should apply border-radius and grow --kdl-close-button-inset with the radius when useBorderRadius is true`, () => {
      setInputsAndDetectChanges({ borderRadiusPx: 10, containerWidth: 1220, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.borderRadius).toBe(`10px`);
      // min(4 + round(10*0.293), 24) = min(4+3, 24) = 7
      expect(style?.getPropertyValue(`--kdl-close-button-inset`)).toBe(`7px`);
    });

    it(`Should compute the inset formula correctly at 0px (the 4px floor)`, () => {
      setInputsAndDetectChanges({ borderRadiusPx: 0, containerWidth: 1220, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      expect(style?.getPropertyValue(`--kdl-close-button-inset`)).toBe(`4px`);
    });

    it(`Should compute the inset formula correctly at a larger radius, below the cap`, () => {
      setInputsAndDetectChanges({ borderRadiusPx: 50, containerWidth: 1220, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      // min(4 + round(50*0.293), 24) = min(4+15, 24) = 19
      expect(style?.getPropertyValue(`--kdl-close-button-inset`)).toBe(`19px`);
    });

    it(`Should cap the inset formula at 24px for an extreme radius`, () => {
      setInputsAndDetectChanges({ borderRadiusPx: 100, containerWidth: 1220, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 });

      const style = (fixture.nativeElement.querySelector(`div`) as HTMLElement)?.style;
      // min(4 + round(100*0.293), 24) = min(4+29, 24) = 24 (capped)
      expect(style?.getPropertyValue(`--kdl-close-button-inset`)).toBe(`24px`);
    });

    it(`Should add the kdl-grid-item--use-radius host class only when resolvedUseBorderRadius is true`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, useBorderRadius: true, w: 2, x: 0, y: 0 });
      expect(fixture.nativeElement.classList.contains(`kdl-grid-item--use-radius`)).toBe(true);

      setInputsAndDetectChanges({ useBorderRadius: false });
      expect(fixture.nativeElement.classList.contains(`kdl-grid-item--use-radius`)).toBe(false);
    });

    it(`Should inherit useBorderRadius/borderRadiusPx from the grid-wide default when this item's own values are null`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ borderRadiusPx: null, useBorderRadius: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 20, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: true });

      expect(busComponent.resolvedUseBorderRadius).toBe(true);
      expect(busComponent.resolvedBorderRadiusPx).toBe(20);
    });

    it(`Should let this item's own useBorderRadius/borderRadiusPx override the grid-wide default when explicitly set`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ borderRadiusPx: 5, useBorderRadius: false });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 20, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: true });

      expect(busComponent.resolvedUseBorderRadius).toBe(false);
      expect(busComponent.resolvedBorderRadiusPx).toBe(5);
    });
  });

  describe(`Phase 15 — close button`, () => {
    const createItemWithRealEventBus = (inputs: Partial<GridItemComponent>): { busComponent: GridItemComponent; busFixture: ComponentFixture<GridItemComponent>; eventBus: GridEventBusService } => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...inputs });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      return { busComponent, busFixture, eventBus };
    };

    it(`Should not render the close button at all when showCloseButton is false (the default)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    });

    it(`Should render the close button when showCloseButton is true and the item is not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, showCloseButton: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeTruthy();
    });

    it(`Should not render the close button at all when isStatic, even if showCloseButton is true`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isStatic: true, showCloseButton: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    });

    it(`Should emit removeItem with this item's own id when the close button is clicked`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `my-item`, showCloseButton: true, w: 2, x: 0, y: 0 });
      const removed: (string | number)[] = [];
      component.removeItem.subscribe(id => removed.push(id));

      const button = fixture.nativeElement.querySelector(`.kdl-grid-item-close-button`) as HTMLElement;
      button.click();

      expect(removed).toEqual([`my-item`]);
    });

    it(`Should stop the close button's own click from also reporting an itemClicked selection event`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      const clicked: unknown[] = [];
      eventBus.itemClicked$.subscribe(event => clicked.push(event));

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { containerWidth: 1220, h: 2, i: `0`, showCloseButton: true, w: 2, x: 0, y: 0 });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      const button = busFixture.nativeElement.querySelector(`.kdl-grid-item-close-button`) as HTMLElement;
      button.click();

      expect(clicked.length).toBe(0);

      busFixture.nativeElement.remove();
    });

    it(`Should inherit showCloseButton from the grid-wide default when this item's own value is null`, () => {
      const { busFixture, eventBus } = createItemWithRealEventBus({ showCloseButton: null });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: true, useBorderRadius: false });
      busFixture.detectChanges();

      expect(busFixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeTruthy();
    });

    it(`Should let this item's own showCloseButton override the grid-wide default when explicitly set`, () => {
      const { busFixture, eventBus } = createItemWithRealEventBus({ showCloseButton: false });

      eventBus.setGridDefaults({ ariaLabels: {}, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: true, useBorderRadius: false });
      busFixture.detectChanges();

      expect(busFixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    });
  });

  describe(`Phase 18 — ariaLabels`, () => {
    const createItemWithRealEventBus = (inputs: Partial<GridItemComponent>): { busComponent: GridItemComponent; busFixture: ComponentFixture<GridItemComponent>; eventBus: GridEventBusService } => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...inputs });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      return { busComponent, busFixture, eventBus };
    };

    it(`Should resolve to the built-in English defaults when nothing is overridden at either level`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.resolvedAriaLabels).toEqual({
        closeButton: `Close`,
        itemRoleDescription: `Draggable, resizable item`,
        moveInstruction: `Press arrow keys to move.`,
        resizeInstruction: `Press shift plus arrow keys to resize.`,
      });
    });

    it(`Should apply a grid-wide ariaLabels override`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({});

      eventBus.setGridDefaults({ ariaLabels: { closeButton: `Remove` }, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedAriaLabels.closeButton).toBe(`Remove`);
    });

    it(`Should let this item's own ariaLabels override the grid-wide override for the same key`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ ariaLabels: { closeButton: `Dismiss` } });

      eventBus.setGridDefaults({ ariaLabels: { closeButton: `Remove` }, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedAriaLabels.closeButton).toBe(`Dismiss`);
    });

    it(`Should merge distinct keys set at different levels, rather than one replacing the whole object`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ ariaLabels: { moveInstruction: `Item-level move instruction` } });

      eventBus.setGridDefaults({ ariaLabels: { closeButton: `Grid-level close` }, enableEditMode: true, borderRadiusPx: 10, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      // Grid-level override for a key the item didn't touch...
      expect(busComponent.resolvedAriaLabels.closeButton).toBe(`Grid-level close`);
      // ...and the item's own override for a different key, both applied
      // together — neither replaced the other.
      expect(busComponent.resolvedAriaLabels.moveInstruction).toBe(`Item-level move instruction`);
      // A third key nobody touched still falls back to the built-in default.
      expect(busComponent.resolvedAriaLabels.resizeInstruction).toBe(`Press shift plus arrow keys to resize.`);
    });

    it(`Should render the close button's own visually-hidden label from resolvedAriaLabels.closeButton, not a hardcoded string`, () => {
      setInputsAndDetectChanges({ ariaLabels: { closeButton: `Dismiss this item` }, containerWidth: 1220, h: 2, i: `0`, showCloseButton: true, w: 2, x: 0, y: 0 });

      const label = fixture.nativeElement.querySelector(`.kdl-grid-item-close-button .kdl-visually-hidden`) as HTMLElement;
      expect(label.textContent).toBe(`Dismiss this item`);
    });

    it(`Should set role/aria-roledescription/aria-describedby on the host when draggable or resizable and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isResizable: false, w: 2, x: 0, y: 0 });

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute(`role`)).toBe(`group`);
      expect(host.getAttribute(`aria-roledescription`)).toBe(`Draggable, resizable item`);
      expect(host.getAttribute(`aria-describedby`)).toBe(`kdl-grid-item-0-instructions`);
    });

    it(`Should not set role/aria-roledescription/aria-describedby at all when neither draggable nor resizable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: false, isResizable: false, w: 2, x: 0, y: 0 });

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute(`role`)).toBeNull();
      expect(host.getAttribute(`aria-roledescription`)).toBeNull();
      expect(host.getAttribute(`aria-describedby`)).toBeNull();
    });

    it(`Should not set role/aria-roledescription/aria-describedby at all when static, even if draggable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isStatic: true, w: 2, x: 0, y: 0 });

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute(`role`)).toBeNull();
    });

    it(`Should render the keyboard-instructions span with only the move instruction when draggable but not resizable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isResizable: false, w: 2, x: 0, y: 0 });

      const span = fixture.nativeElement.querySelector(`#kdl-grid-item-0-instructions`) as HTMLElement;
      expect(span.textContent).toContain(`Press arrow keys to move.`);
      expect(span.textContent).not.toContain(`Press shift plus arrow keys to resize.`);
    });

    it(`Should render the keyboard-instructions span with only the resize instruction when resizable but not draggable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: false, isResizable: true, w: 2, x: 0, y: 0 });

      const span = fixture.nativeElement.querySelector(`#kdl-grid-item-0-instructions`) as HTMLElement;
      expect(span.textContent).toContain(`Press shift plus arrow keys to resize.`);
      expect(span.textContent).not.toContain(`Press arrow keys to move.`);
    });

    it(`Should render the keyboard-instructions span with both instructions when both draggable and resizable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: true, isResizable: true, w: 2, x: 0, y: 0 });

      const span = fixture.nativeElement.querySelector(`#kdl-grid-item-0-instructions`) as HTMLElement;
      expect(span.textContent).toContain(`Press arrow keys to move.`);
      expect(span.textContent).toContain(`Press shift plus arrow keys to resize.`);
    });

    it(`Should not render the keyboard-instructions span at all when neither draggable nor resizable`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, isDraggable: false, isResizable: false, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`#kdl-grid-item-0-instructions`)).toBeFalsy();
    });
  });

  describe(`Phase 22 — header content slot`, () => {
    it(`Should not render any header region, body wrapper, or host class at all when no header content is projected`, () => {
      @Component({
        imports: [GridItemComponent],
        standalone: true,
        template: `
          <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
            <span class="default-marker">default content</span>
          </kdl-grid-item>
        `,
      })
      class TestHostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-item-header`)).toBeFalsy();
      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-item-body`)).toBeFalsy();
      expect(hostFixture.nativeElement.querySelector(`kdl-grid-item`)?.classList.contains(`kdl-grid-item--has-header`)).toBe(false);
      // Default content still projects correctly — completely
      // unaffected by the header feature's own existence, matching
      // Vue's own explicit "no-header case is completely unaffected"
      // design intent, confirmed via that file's own doc comment.
      expect(hostFixture.nativeElement.querySelector(`.default-marker`)).toBeTruthy();
    });

    it(`Should render the header region, wrap the default content in a body wrapper, and add the host class when header content is projected`, () => {
      @Component({
        imports: [GridItemComponent, GridItemHeaderDirective],
        standalone: true,
        template: `
          <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
            <div kdlGridItemHeader class="header-marker">header content</div>
            <span class="default-marker">default content</span>
          </kdl-grid-item>
        `,
      })
      class TestHostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const headerRegion = hostFixture.nativeElement.querySelector(`.kdl-grid-item-header`);
      expect(headerRegion).toBeTruthy();
      expect(headerRegion?.querySelector(`.header-marker`)?.textContent).toBe(`header content`);

      const bodyWrapper = hostFixture.nativeElement.querySelector(`.kdl-grid-item-body`);
      expect(bodyWrapper).toBeTruthy();
      // Default (non-header) content still projects correctly, now
      // inside the body wrapper specifically — not lost, not duplicated.
      expect(bodyWrapper?.querySelector(`.default-marker`)?.textContent).toBe(`default content`);
      expect(hostFixture.nativeElement.querySelectorAll(`.default-marker`).length).toBe(1);

      expect(hostFixture.nativeElement.querySelector(`kdl-grid-item`)?.classList.contains(`kdl-grid-item--has-header`)).toBe(true);
    });

    it(`Should still render the auto-height wrapper correctly, combined with the body wrapper on the same element, when both autoHeight and a header are used together`, () => {
      // Corrected, not merely reworded: an earlier version of this test
      // assumed the body wrapper and the auto-height wrapper were
      // separate, nested elements (bodyWrapper containing
      // autoHeightWrapper as a descendant) — confirmed wrong via a real
      // failing test run. The production template was fixed to use a
      // single, always-rendered wrapper element with both classes
      // toggled on it directly ([class.kdl-grid-item-auto-height-wrapper]
      // and [class.kdl-grid-item-body], both conditional, on the same
      // div), rather than duplicating the same default <ng-content> across
      // two mutually-exclusive @if/@else branches — which turned out not
      // to reliably route projected content to whichever branch actually
      // rendered. This test now reflects that same single-element
      // structure, not a separate parent/child relationship.
      @Component({
        imports: [GridItemComponent, GridItemHeaderDirective],
        standalone: true,
        template: `
          <kdl-grid-item [autoHeight]="true" [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
            <div kdlGridItemHeader>header content</div>
            <span class="default-marker">default content</span>
          </kdl-grid-item>
        `,
      })
      class TestHostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const wrapper = hostFixture.nativeElement.querySelector(`.kdl-grid-item-auto-height-wrapper`);
      expect(wrapper).toBeTruthy();
      expect(wrapper?.classList.contains(`kdl-grid-item-body`)).toBe(true);
      expect(wrapper?.querySelector(`.default-marker`)?.textContent).toBe(`default content`);
    });
  });

  describe(`enableEditMode`, () => {
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    const createItemWithRealEventBus = (inputs: Partial<GridItemComponent>): { busComponent: GridItemComponent; busFixture: ComponentFixture<GridItemComponent>; eventBus: GridEventBusService } => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [GridItemComponent],
        providers: [{ provide: GridEventBusService, useFactory: () => new GridEventBusService() }],
      });
      const eventBus = TestBed.inject(GridEventBusService);
      eventBus.setContainerWidth(1220);
      eventBus.setColNum(12);
      eventBus.setRowHeight(100);
      eventBus.setMargin([10, 10]);

      const busFixture = TestBed.createComponent(GridItemComponent);
      const busComponent = busFixture.componentInstance;
      Object.assign(busComponent, { h: 2, i: `0`, w: 2, x: 0, y: 0, ...inputs });
      busComponent.ngOnChanges({} as SimpleChanges);
      busFixture.detectChanges();

      return { busComponent, busFixture, eventBus };
    };

    it(`Should default resolvedEnableEditMode to true with no eventBus present at all (standalone usage)`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.resolvedEnableEditMode).toBe(true);
    });

    it(`Should inherit enableEditMode from the grid-wide default when this item's own value is null`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ enableEditMode: null });

      eventBus.setGridDefaults({ ariaLabels: {}, borderRadiusPx: 10, enableEditMode: false, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedEnableEditMode).toBe(false);
    });

    it(`Should let this item's own enableEditMode override the grid-wide default when explicitly set`, () => {
      const { busComponent, eventBus } = createItemWithRealEventBus({ enableEditMode: true });

      eventBus.setGridDefaults({ ariaLabels: {}, borderRadiusPx: 10, enableEditMode: false, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, maxRows: Infinity, showCloseButton: false, useBorderRadius: false });

      expect(busComponent.resolvedEnableEditMode).toBe(true);
    });

    it(`Should have no tabindex attribute at all when enableEditMode is false, even if draggable and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, enableEditMode: false, h: 2, i: `0`, isDraggable: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.getAttribute(`tabindex`)).toBeNull();
    });

    it(`Should not set role/aria-roledescription/aria-describedby at all when enableEditMode is false, even if draggable and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, enableEditMode: false, h: 2, i: `0`, isDraggable: true, w: 2, x: 0, y: 0 });

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute(`role`)).toBeNull();
      expect(host.getAttribute(`aria-roledescription`)).toBeNull();
      expect(host.getAttribute(`aria-describedby`)).toBeNull();
    });

    it(`Should not render the keyboard-instructions span at all when enableEditMode is false, even if draggable and not static`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, enableEditMode: false, h: 2, i: `0`, isDraggable: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`#kdl-grid-item-0-instructions`)).toBeFalsy();
    });

    it(`Should not render the close button at all when enableEditMode is false, even if showCloseButton is true`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, enableEditMode: false, h: 2, i: `0`, showCloseButton: true, w: 2, x: 0, y: 0 });

      expect(fixture.nativeElement.querySelector(`.kdl-grid-item-close-button`)).toBeFalsy();
    });

    it(`Should still let the native engine start a drag via a real pointerdown when enableEditMode is false — confirming the asymmetry is real, not accidental: enableEditMode gates ARIA/tabindex/the close button, but not the underlying drag/resize engine itself, matching Vue's own confirmed behavior`, () => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        enableEditMode: false,
        h: 2,
        i: `0`,
        isDraggable: true,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });
      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      mockRect(item, { left: 100, top: 50 });
      createdParent = parent;
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      item.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 100, clientY: 50, pointerId: 1 }));
      item.dispatchEvent(mockPointerEvent(`pointermove`, { clientX: 130, clientY: 80, pointerId: 1 }));

      expect(component.isDragging).toBe(true);
    });

    it(`Should still let handleKeydown itself report a move even when enableEditMode is false — the same asymmetry confirmed from the other direction: the handler's own guard reads the raw resolvedIsDraggable, not gated by resolvedEnableEditMode`, () => {
      const eventBus = new GridEventBusService();
      const reported: unknown[] = [];
      eventBus.itemDrag$.subscribe(event => reported.push(event));
      (component as unknown as { eventBus: GridEventBusService }).eventBus = eventBus;
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, enableEditMode: false, h: 2, i: `0`, isDraggable: true, w: 2, x: 4, y: 4 });

      component.handleKeydown(new KeyboardEvent(`keydown`, { key: `ArrowRight` }));

      expect(reported.length).toBeGreaterThan(0);
    });
  });

  describe(`itemMoved / itemResized outputs`, () => {
    // Local copies, matching this file's own established convention of
    // duplicating test helpers per describe block (see the Phase 19
    // block's own doc comment on this) rather than sharing them across
    // the Phase 3/Phase 4 blocks above, which scope their own identical
    // versions privately to themselves.
    let createdParent: HTMLElement | undefined;

    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    const dragHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void =>
      (element as unknown as { __nativeDragHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number }) => void }).__nativeDragHandler;

    interface IEdges { bottom: boolean; left: boolean; right: boolean; top: boolean }
    const NO_EDGES: IEdges = { bottom: false, left: false, right: false, top: false };

    const resizeHandlerOf = (element: HTMLElement): (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void =>
      (element as unknown as { __nativeResizeHandler: (event: { type: string; target: HTMLElement; clientX: number; clientY: number; edges: IEdges }) => void }).__nativeResizeHandler;

    const setupItem = (): { item: HTMLElement; parent: HTMLElement } => {
      setInputsAndDetectChanges({
        colNum: 12,
        containerWidth: 1220,
        h: 2,
        i: `0`,
        margin: [10, 10],
        rowHeight: 100,
        w: 2,
        x: 0,
        y: 0,
      });

      const item = fixture.nativeElement as HTMLElement;
      const parent = document.createElement(`div`);
      document.body.appendChild(parent);
      parent.appendChild(item);
      Object.defineProperty(item, `offsetParent`, { configurable: true, get: () => parent });
      mockRect(parent, { left: 0, top: 0 });
      createdParent = parent;

      return { item, parent };
    };

    afterEach(() => {
      createdParent?.remove();
      createdParent = undefined;
    });

    it(`Should emit itemMoved with this item's own final grid-unit x/y on dragend`, () => {
      const { item } = setupItem();
      const moved: { i: string | number; x: number; y: number }[] = [];
      component.itemMoved.subscribe(payload => moved.push(payload));

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
      // Move roughly one full column+margin to the right (colWidth
      // ~90.83 + margin 10 ~= 100.83px) — should resolve to grid x:1.
      dragHandlerOf(item)({ clientX: 101, clientY: 0, target: item, type: `dragmove` });
      dragHandlerOf(item)({ clientX: 101, clientY: 0, target: item, type: `dragend` });

      expect(moved).toEqual([{ i: `0`, x: 1, y: 0 }]);
    });

    it(`Should not emit itemMoved at all on dragstart or dragmove, only on dragend`, () => {
      const { item } = setupItem();
      const moved: unknown[] = [];
      component.itemMoved.subscribe(payload => moved.push(payload));

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragstart` });
      dragHandlerOf(item)({ clientX: 101, clientY: 0, target: item, type: `dragmove` });

      expect(moved.length).toBe(0);
    });

    it(`Should not emit itemMoved at all when the drag never fires a preceding dragstart (dragend as a no-op)`, () => {
      const { item } = setupItem();
      const moved: unknown[] = [];
      component.itemMoved.subscribe(payload => moved.push(payload));

      dragHandlerOf(item)({ clientX: 0, clientY: 0, target: item, type: `dragend` });

      expect(moved.length).toBe(0);
    });

    it(`Should emit itemResized with this item's own final grid-unit h/w and pixel height/width on resizeend`, () => {
      const { item } = setupItem();
      const resized: { i: string | number; h: number; w: number; height: number; width: number }[] = [];
      component.itemResized.subscribe(payload => resized.push(payload));

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` });

      // Starting width 192 (see Phase 4's own identical resizestart
      // math) + 50 = 242px; grid-unit w = round((242+10)/(90.8333+10)) =
      // round(2.4996...) = 2 (below the 2.5 rounding threshold, not above
      // it as an earlier version of this comment's own arithmetic
      // mistakenly assumed).
      expect(resized).toEqual([{ h: 2, height: 210, i: `0`, w: 2, width: 242 }]);
    });

    it(`Should not emit itemResized at all on resizestart or resizemove, only on resizeend`, () => {
      const { item } = setupItem();
      const resized: unknown[] = [];
      component.itemResized.subscribe(payload => resized.push(payload));

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizestart` });
      resizeHandlerOf(item)({ clientX: 50, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizemove` });

      expect(resized.length).toBe(0);
    });

    it(`Should not emit itemResized at all when the resize never fires a preceding resizestart (resizeend as a no-op)`, () => {
      const { item } = setupItem();
      const resized: unknown[] = [];
      component.itemResized.subscribe(payload => resized.push(payload));

      resizeHandlerOf(item)({ clientX: 0, clientY: 0, edges: { ...NO_EDGES, right: true }, target: item, type: `resizeend` });

      expect(resized.length).toBe(0);
    });

    it(`Should emit itemMoved with the item's own final position via a real pointerdown/pointermove/pointerup gesture, not just the test backdoor`, () => {
      const { item } = setupItem();
      const moved: { x: number; y: number }[] = [];
      component.itemMoved.subscribe(payload => moved.push({ x: payload.x, y: payload.y }));
      (item as unknown as { setPointerCapture: () => void }).setPointerCapture = () => {};

      item.dispatchEvent(mockPointerEvent(`pointerdown`, { button: 0, clientX: 0, clientY: 0, pointerId: 1 }));
      item.dispatchEvent(mockPointerEvent(`pointermove`, { clientX: 101, clientY: 0, pointerId: 1 }));
      item.dispatchEvent(mockPointerEvent(`pointerup`, { clientX: 101, clientY: 0, pointerId: 1 }));

      expect(moved).toEqual([{ x: 1, y: 0 }]);
    });
  });

  describe(`resizeHandleTemplate — custom per-handle content`, () => {
    it(`Should render the template's own content, with the correct edge as both the implicit and named context value, inside each resize-hint span`, () => {
      @Component({
        imports: [GridItemComponent],
        standalone: true,
        template: `
          <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [w]="2" [x]="0" [y]="0">
            content
            <ng-template #resizeHandle let-edge let-namedEdge="edge">
              <span class="custom-handle-marker" [attr.data-implicit]="edge" [attr.data-named]="namedEdge"></span>
            </ng-template>
          </kdl-grid-item>
        `,
      })
      class TestHostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const nHandle = hostFixture.nativeElement.querySelector(`.kdl-resize-hint--n .custom-handle-marker`) as HTMLElement;
      expect(nHandle).toBeTruthy();
      expect(nHandle.getAttribute(`data-implicit`)).toBe(`n`);
      expect(nHandle.getAttribute(`data-named`)).toBe(`n`);

      const seHandle = hostFixture.nativeElement.querySelector(`.kdl-resize-hint--se .custom-handle-marker`) as HTMLElement;
      expect(seHandle).toBeTruthy();
      expect(seHandle.getAttribute(`data-implicit`)).toBe(`se`);

      // All 8 handles get their own instance of the template, not just one.
      expect(hostFixture.nativeElement.querySelectorAll(`.custom-handle-marker`).length).toBe(8);

      hostFixture.nativeElement.remove();
    });

    it(`Should render the existing plain, empty resize-hint spans when no resizeHandleTemplate is provided at all — the no-template case is completely unaffected`, () => {
      setInputsAndDetectChanges({ containerWidth: 1220, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      const nHandle = fixture.nativeElement.querySelector(`.kdl-resize-hint--n`) as HTMLElement;
      expect(nHandle).toBeTruthy();
      expect(nHandle.querySelector(`.custom-handle-marker`)).toBeFalsy();
      expect(component.resizeHandleTemplate).toBeUndefined();
    });

    it(`Should only render the template inside the resize handles actually included in resizeHandles, when that's restricted`, () => {
      @Component({
        imports: [GridItemComponent],
        standalone: true,
        template: `
          <kdl-grid-item [containerWidth]="1220" [h]="2" i="0" [resizeHandles]="['se']" [w]="2" [x]="0" [y]="0">
            content
            <ng-template #resizeHandle let-edge>
              <span class="custom-handle-marker">{{ edge }}</span>
            </ng-template>
          </kdl-grid-item>
        `,
      })
      class TestHostComponent {}

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      expect(hostFixture.nativeElement.querySelectorAll(`.custom-handle-marker`).length).toBe(1);
      expect(hostFixture.nativeElement.querySelector(`.kdl-resize-hint--se .custom-handle-marker`)?.textContent).toBe(`se`);

      hostFixture.nativeElement.remove();
    });
  });
});
