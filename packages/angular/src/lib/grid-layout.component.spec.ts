import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { GridLayoutComponent } from './grid-layout.component';
import { GridItemComponent } from './grid-item.component';
import { GridEventBusService } from './grid-event-bus.service';
import { ECompactType } from '@keystone-dashboard-layout/core';
import type { ICompactor, TLayout } from '@keystone-dashboard-layout/core';
import type { SimpleChanges } from '@angular/core';

/**
 * Phase 1/2 unit tests (see `docs/IMPLEMENTATION_PLAN.md`'s own scope
 * notes for each) — container-height computation, the
 * `ResizeObserver`-driven `containerWidth` measurement, and (Phase 2)
 * the `GridEventBusService` DI cascade into a real, nested
 * `GridItemComponent`.
 *
 * Same real mistake fixed here as in `grid-item.component.spec.ts` —
 * `component.layout = ...` alone (with no parent template driving the
 * binding) never triggers `ngOnChanges`, confirmed directly by a real
 * test run ("recompute the height when the layout input changes"
 * failing because the height genuinely never recomputed). Each input
 * change below now calls `component.ngOnChanges({} as SimpleChanges)`
 * explicitly to compensate. The first test happened to still pass
 * without this fix, purely incidentally — `ngAfterViewInit`'s own
 * `measure()` runs once, independently of `ngOnChanges`, and picked up
 * whatever `layout` value was already set at that point; it's the
 * *second* change, after the view is already initialized, that had no
 * path to ever re-run at all.
 */
describe(`GridLayoutComponent`, () => {
  let fixture: ComponentFixture<GridLayoutComponent>;
  let component: GridLayoutComponent;

  const layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 3, i: `1`, w: 2, x: 2, y: 0 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridLayoutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GridLayoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  const setInputsAndDetectChanges = (inputs: Partial<GridLayoutComponent>): void => {
    Object.assign(component, inputs);
    // Unlike GridItemComponent's own ngOnChanges (which ignores its
    // argument entirely and just recomputes unconditionally),
    // GridLayoutComponent's own ngOnChanges genuinely inspects
    // `changes['layout']`/`changes['rowHeight']`/etc. — an empty `{}`
    // object would make every one of those checks falsy, silently
    // skipping updateContainerHeight() and reproducing the exact same
    // bug this fix exists for, just for a different reason. Including
    // a `layout` key (any truthy value) is enough to satisfy the
    // condition correctly.
    component.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
    fixture.detectChanges();
  };

  it(`Should compute the auto-size container height from the tallest item's own bottom edge`, () => {
    setInputsAndDetectChanges({ autoSize: true, layout, margin: [10, 10], rowHeight: 100 });

    // Item "1" is the tallest (y:0, h:3), bottom edge at row 3.
    // height = 3 * (100 + 10) + 10 = 340
    expect(component.containerStyle[`height`]).toBe(`340px`);
  });

  it(`Should not set an explicit height at all when autoSize is false`, () => {
    setInputsAndDetectChanges({ autoSize: false, layout, margin: [10, 10], rowHeight: 100 });

    expect(component.containerStyle[`height`]).toBeUndefined();
  });

  it(`Should recompute the height when the layout input changes`, () => {
    setInputsAndDetectChanges({ autoSize: true, layout, margin: [10, 10], rowHeight: 100 });
    const before = component.containerStyle[`height`];

    setInputsAndDetectChanges({ layout: [...layout, { h: 5, i: `2`, w: 2, x: 4, y: 0 }] });

    expect(component.containerStyle[`height`]).not.toBe(before);
    // bottom edge now at row 5: 5 * 110 + 10 = 560
    expect(component.containerStyle[`height`]).toBe(`560px`);
  });

  it(`Should measure containerWidth from the inner container div's own offsetWidth once the view initializes`, () => {
    // jsdom (Jest's own DOM environment here, unlike Karma's real
    // Chrome) has no real layout engine at all — confirmed directly,
    // not assumed: `offsetWidth` stays `0` regardless of inline styles
    // or attaching the element to `document.body`, since jsdom never
    // actually computes layout. Mocking `offsetWidth` directly on the
    // inner `#container` div (the element `ngAfterViewInit`'s own
    // `measure()` actually reads from) is what genuinely works here.
    //
    // Ordering matters, and got this wrong on a first pass: `ngAfter-
    // ViewInit` only ever fires once, on the *first* `detectChanges()`
    // call — and the inner div doesn't exist in the DOM at all until
    // that same first render happens, so there's no way to mock its
    // own `offsetWidth` *before* that first call the way the naive
    // ordering would need. Calling `ngAfterViewInit()` again directly
    // (a plain method call, not going through Angular's own "once only"
    // lifecycle orchestration, which doesn't stop it being invoked
    // again by hand) after mocking is what actually re-runs its own
    // `measure()` logic against the now-mocked value.
    setInputsAndDetectChanges({ layout });

    const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
    Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 800 });

    component.ngAfterViewInit();

    expect(component.containerWidth).toBe(800);
  });

  it(`Should project content placed inside <kdl-grid-layout> via ng-content`, () => {
    setInputsAndDetectChanges({ layout });

    // GridLayoutComponent's own template has no internal loop (see its
    // own doc comment on why) — this just confirms the projection slot
    // itself exists and is reachable; a consumer's own real child
    // markup projecting through is exercised via a dedicated test host,
    // the same pattern GridItemComponent's own equivalent test uses.
    const projectionHost = fixture.nativeElement.querySelector(`div`);
    expect(projectionHost).toBeTruthy();
  });

  it(`Should provide its own GridEventBusService instance, injectable from its own subtree`, () => {
    setInputsAndDetectChanges({ layout });

    expect(fixture.debugElement.injector.get(GridEventBusService)).toBeInstanceOf(GridEventBusService);
  });

  it(`Should give two separate GridLayoutComponent instances their own, independent GridEventBusService`, () => {
    setInputsAndDetectChanges({ layout });
    const otherFixture = TestBed.createComponent(GridLayoutComponent);
    otherFixture.componentInstance.layout = layout;
    otherFixture.detectChanges();

    const busA = fixture.debugElement.injector.get(GridEventBusService);
    const busB = otherFixture.debugElement.injector.get(GridEventBusService);

    expect(busA).not.toBe(busB);
    otherFixture.nativeElement.remove();
  });

  it(`Should cascade a useCssTransforms change to the eventBus`, () => {
    setInputsAndDetectChanges({ layout, useCssTransforms: true });
    const eventBus = fixture.debugElement.injector.get(GridEventBusService);
    const seen: boolean[] = [];
    eventBus.useCssTransforms$.subscribe(value => seen.push(value));

    // Deliberately not the shared setInputsAndDetectChanges helper here
    // — confirmed necessary via a fresh test run, not assumed: that
    // helper always passes a hardcoded `{ layout: {} }` fake
    // SimpleChanges object regardless of what actually changed, so
    // `changes['useCssTransforms']` would never be truthy through it,
    // and the cascade this test exists to verify would never fire.
    // Calling ngOnChanges directly with the correct fake key (matching
    // this file's own earlier "rowHeight" cascade test, which already
    // established this exact pattern) is what actually exercises it.
    component.useCssTransforms = false;
    component.ngOnChanges({ useCssTransforms: {} } as unknown as SimpleChanges);

    expect(seen).toEqual([true, false]);
  });

  describe(`GridEventBusService DI cascade into a real, nested GridItemComponent`, () => {
    @Component({
      imports: [GridLayoutComponent, GridItemComponent],
      standalone: true,
      template: `
        <kdl-grid-layout [colNum]="6" [layout]="layout" [margin]="[20, 20]" [rowHeight]="80">
          <kdl-grid-item [h]="2" i="0" [w]="2" [x]="0" [y]="0">item content</kdl-grid-item>
        </kdl-grid-layout>
      `,
    })
    class TestHostComponent {
      layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
    }

    it(`Should have the nested GridItemComponent's own style reflect the parent's colNum/rowHeight/margin, with no direct @Input()s for any of them`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const layoutDebugEl = hostFixture.debugElement.query(el => el.componentInstance instanceof GridLayoutComponent);
      const layoutComponent = layoutDebugEl.componentInstance as GridLayoutComponent;

      // Real measurement, same jsdom limitation and same fix as this
      // file's own earlier containerWidth test — mock offsetWidth on
      // the inner container div, then call ngAfterViewInit() again
      // directly to re-run its own measure() logic against it.
      const containerDiv = layoutDebugEl.nativeElement.querySelector(`div`) as HTMLDivElement;
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 620 });
      layoutComponent.ngAfterViewInit();

      const itemDebugEl = hostFixture.debugElement.query(el => el.componentInstance instanceof GridItemComponent);
      const itemComponent = itemDebugEl.componentInstance as GridItemComponent;

      // colWidth = (620 - 20*7) / 6 = 80; left = round(80*0 + 1*20) = 20;
      // top = round(80*0 + 1*20) = 20; width = round(80*2 + 1*20) = 180;
      // height = round(80*2 + 1*20) = 180
      const style = itemComponent.style as Record<string, string | undefined>;
      expect(style[`transform`]).toBe(`translate3d(20px,20px, 0)`);
      expect(style[`width`]).toBe(`180px`);
      expect(style[`height`]).toBe(`180px`);

      hostFixture.nativeElement.remove();
    });

    it(`Should update the nested GridItemComponent's own style when the parent's rowHeight changes`, () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const layoutDebugEl = hostFixture.debugElement.query(el => el.componentInstance instanceof GridLayoutComponent);
      const layoutComponent = layoutDebugEl.componentInstance as GridLayoutComponent;
      const containerDiv = layoutDebugEl.nativeElement.querySelector(`div`) as HTMLDivElement;
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 620 });
      layoutComponent.ngAfterViewInit();

      const itemDebugEl = hostFixture.debugElement.query(el => el.componentInstance instanceof GridItemComponent);
      const itemComponent = itemDebugEl.componentInstance as GridItemComponent;
      const before = (itemComponent.style as Record<string, string | undefined>)[`height`];

      layoutComponent.rowHeight = 200;
      layoutComponent.ngOnChanges({ rowHeight: {} } as unknown as SimpleChanges);
      hostFixture.detectChanges();

      const after = (itemComponent.style as Record<string, string | undefined>)[`height`];
      expect(after).not.toBe(before);
      // height = round(200*2 + 1*20) = 420
      expect(after).toBe(`420px`);

      hostFixture.nativeElement.remove();
    });
  });

  describe(`Phase 3 — resolving a reported drag tick`, () => {
    it(`Should move the dragged item to the reported grid position when nothing collides`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 6, y: 0 });

      expect(emitted.length).toBe(1);
      const movedItem = emitted[0].find(item => item.i === `a`);
      expect(movedItem?.x).toBe(6);
    });

    it(`Should push a colliding item out of the way rather than let them overlap`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" directly onto "b"'s own position.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      const next = emitted[0];
      const itemA = next.find(item => item.i === `a`)!;
      const itemB = next.find(item => item.i === `b`)!;
      // Neither should overlap the other's own rect.
      const overlapsX = itemA.x < itemB.x + itemB.w && itemA.x + itemA.w > itemB.x;
      const overlapsY = itemA.y < itemB.y + itemB.h && itemA.y + itemA.h > itemB.y;
      expect(overlapsX && overlapsY).toBe(false);
    });

    it(`Should ignore a drag tick for an item id that doesn't exist in the current layout`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      expect(() => eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `does-not-exist`, w: 2, x: 0, y: 0 })).not.toThrow();
      expect(emitted.length).toBe(0);
    });
  });

  describe(`Phase 4 — resolving a reported resize tick`, () => {
    it(`Should commit the resized item's own new w/h`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizemove`, h: 3, i: `0`, w: 4, x: 0, y: 0 });

      expect(emitted.length).toBe(1);
      const resizedItem = emitted[0].find(item => item.i === `0`);
      expect(resizedItem?.w).toBe(4);
      expect(resizedItem?.h).toBe(3);
    });

    it(`Should commit a changed x/y too, for a left/top-edge resize that moved the item's own anchor`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `1`, w: 3, x: 1, y: 0 });

      const resizedItem = emitted[0].find(item => item.i === `1`);
      expect(resizedItem?.x).toBe(1);
      expect(resizedItem?.w).toBe(3);
    });

    it(`Should push a colliding item out of the way after a resize grows into it`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Grow "a" from w:2 to w:6 — its own new right edge (x:0 to x:6)
      // now overlaps "b" (x:4 to x:6).
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 6, x: 0, y: 0 });

      const next = emitted[0];
      const itemA = next.find(item => item.i === `a`)!;
      const itemB = next.find(item => item.i === `b`)!;
      const overlapsX = itemA.x < itemB.x + itemB.w && itemA.x + itemA.w > itemB.x;
      const overlapsY = itemA.y < itemB.y + itemB.h && itemA.y + itemA.h > itemB.y;
      expect(overlapsX && overlapsY).toBe(false);
    });

    it(`Should ignore a resize tick for an item id that doesn't exist in the current layout`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      expect(() => eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `does-not-exist`, w: 2, x: 0, y: 0 })).not.toThrow();
      expect(emitted.length).toBe(0);
    });
  });

  describe(`Phase 5 — preventCollision`, () => {
    it(`Should revert a drag to its own pre-gesture position entirely when it would collide and preventCollision is true`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, preventCollision: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" directly onto "b"'s own position.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      const itemA = emitted[0].find(item => item.i === `a`);
      // Reverted to its own original x:0 — not pushed anywhere, not
      // landed on top of "b" either.
      expect(itemA?.x).toBe(0);
    });

    it(`Should still push the colliding item aside as normal when preventCollision is false (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, preventCollision: false });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      const itemA = emitted[0].find(item => item.i === `a`);
      // Actually landed where dragged, unlike the preventCollision:true case above.
      expect(itemA?.x).toBe(4);
    });
  });

  describe(`Phase 5 — compactType`, () => {
    it(`Should not pull an item back up into a gap at all when compactType is NONE`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" down into a fresh row, leaving a real gap above it.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 4 });

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.y).toBe(4);
    });

    it(`Should pull an item back up to close a gap when compactType is VERTICAL (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.VERTICAL, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 4 });

      const itemA = emitted[0].find(item => item.i === `a`);
      // Nothing above it in that column — vertical compaction pulls it
      // straight back up to y:0.
      expect(itemA?.y).toBe(0);
    });

    it(`Should settle a resized item leftward, not just vertically, when compactType is HORIZONTAL`, () => {
      const singleItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.HORIZONTAL, layout: singleItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Grow "a" in place (no x change reported) — horizontal compaction
      // should still pull its own x back to 0, since nothing else
      // occupies that row.
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 3, x: 4, y: 0 });

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.x).toBe(0);
    });
  });

  describe(`Phase 6 — custom compactor`, () => {
    it(`Should use the custom compactor instead of the built-in compactType resolution when set`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      // A deliberately distinctive, easy-to-detect custom strategy —
      // moves every non-static item to a fixed y:9, nothing like any
      // built-in compactor would ever produce, so seeing y:9 in the
      // committed layout can only mean this custom compactor actually
      // ran instead of getCompactor(compactType).
      const markerCompactor: ICompactor = {
        compact: (currentLayout: TLayout) => currentLayout.map(item => ({ ...item, y: 9 })),
        type: `marker`,
      };
      setInputsAndDetectChanges({ colNum: 12, compactor: markerCompactor, compactType: ECompactType.VERTICAL, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 6, y: 0 });

      expect(emitted[0].every(item => item.y === 9)).toBe(true);
    });

    it(`Should fall back to getCompactor(compactType) when compactor is null (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactor: null, compactType: ECompactType.VERTICAL, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 4 });

      const itemA = emitted[0].find(item => item.i === `a`);
      // Same behavior as the existing "compactType VERTICAL" test above
      // — confirms compactor:null genuinely falls through to the
      // built-in resolution rather than, say, throwing or no-op'ing.
      expect(itemA?.y).toBe(0);
    });
  });

  describe(`Phase 7 — alignment guides / spacing indicators / snapToGrid`, () => {
    it(`Should populate alignmentGuideStyles when the dragged item's own edge lines up with another item's edge`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" so its own left edge (x:4) lines up with "b"'s own left edge (x:4).
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      expect(component.alignmentGuideStyles.length).toBeGreaterThan(0);
    });

    it(`Should populate a horizontal (Y-axis) alignment guide when the dragged item's own top/bottom edge lines up instead of left/right`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 6 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" so its own top edge (y:6) lines up with "b"'s own top
      // edge (y:6) — no x-edge match at all this time (x:0 vs x:6).
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 6 });

      expect(component.alignmentGuideStyles.length).toBeGreaterThan(0);
      // A horizontal guide line spans the full width, with no left offset.
      expect(component.alignmentGuideStyles.some(guide => guide.width === `100%` && guide.left === `0`)).toBe(true);
    });

    it(`Should clear alignmentGuideStyles once the drag ends`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });
      expect(component.alignmentGuideStyles.length).toBeGreaterThan(0);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 4, y: 0 });
      expect(component.alignmentGuideStyles.length).toBe(0);
    });

    it(`Should not populate alignmentGuideStyles at all when showAlignmentGuides is off (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showAlignmentGuides: false });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      expect(component.alignmentGuideStyles.length).toBe(0);
    });

    it(`Should not populate alignmentGuideStyles or spacingIndicatorStyles at all before the container has been measured`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 4 },
      ];
      // containerWidth deliberately left unmeasured (0) — both guide
      // computations should bail out early rather than dividing by a
      // zero/invalid column width.
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, showAlignmentGuides: true, showSpacingGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      expect(component.alignmentGuideStyles.length).toBe(0);
      expect(component.spacingIndicatorStyles.length).toBe(0);
    });

    it(`Should populate spacingIndicatorStyles with a nearest-neighbor gap while showSpacingGuides is on`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showSpacingGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(component.spacingIndicatorStyles.length).toBeGreaterThan(0);
    });

    it(`Should populate a Y-axis spacing indicator when the nearest gap is vertical rather than horizontal`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 6 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, rowHeight: 100, showSpacingGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" straight down, staying in the same column as "b" — the
      // nearest gap is now vertical (row-wise), not horizontal.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 2 });

      expect(component.spacingIndicatorStyles.length).toBeGreaterThan(0);
      expect(component.spacingIndicatorStyles.some(indicator => indicator.label.includes(`row`))).toBe(true);
    });

    it(`Should use the singular "col" (not "cols") in the label when the X-axis gap is exactly 1 unit`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 5, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, showSpacingGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // "a" dragged to x:2 (occupying 2-4); "b" at x:5 (occupying 5-7) —
      // gap is exactly 1 column, unlike the plural-gap test above.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(component.spacingIndicatorStyles.some(indicator => indicator.label === `1 col`)).toBe(true);
    });

    it(`Should use the singular "row" (not "rows") in the label when the Y-axis gap is exactly 1 unit`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 5 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, rowHeight: 100, showSpacingGuides: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 2 });

      expect(component.spacingIndicatorStyles.some(indicator => indicator.label === `1 row`)).toBe(true);
    });

    it(`Should snap a dragged item's edge to another item's edge when snapToGrid is on and within snapThreshold`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, snapThreshold: 1, snapToGrid: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" to x:7 — 1 grid unit shy of "b"'s own left edge (x:6),
      // within the snapThreshold of 1 — should snap exactly to x:6.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 7, y: 4 });

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.x).toBe(6);
    });

    it(`Should not snap at all when snapToGrid is off (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, snapToGrid: false });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 7, y: 4 });

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.x).toBe(7);
    });

    it(`Should also snap on the final dragend tick, not just during dragmove`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, snapThreshold: 1, snapToGrid: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 7, y: 4 });

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.x).toBe(6);
    });

    it(`Should leave the target position completely unchanged when snapToGrid is on but nothing is within snapThreshold at all`, () => {
      // Distinct from the "snapToGrid off" test above: snapToGrid is
      // true here, so findSnapAdjustment() genuinely runs — it just
      // returns no x/y adjustment at all (nothing within threshold),
      // exercising the "?? targetX"/"?? targetY" fallback explicitly,
      // rather than skipping the whole snap block the "off" case does.
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 10, y: 8 },
      ];
      // compactType: NONE is required, not incidental — confirmed via a
      // real failing test run, not assumed: the default vertical
      // compactor pulls "a" straight back up to y:0 after the move
      // (nothing else occupies its own column), which looked like
      // exactly the kind of bug this test is trying to rule out, but was
      // actually just an uncontrolled second variable this test's own
      // first version forgot to hold constant.
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, snapThreshold: 1, snapToGrid: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 3, y: 3 });

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.x).toBe(3);
      expect(itemA?.y).toBe(3);
    });
  });

  describe(`Phase 7 — multiSelect`, () => {
    it(`Should select exactly one item via selectItem, replacing any prior selection`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });

      component.selectItem(`0`);
      expect(component.selectedItemIds).toEqual(new Set([`0`]));

      component.selectItem(`1`);
      expect(component.selectedItemIds).toEqual(new Set([`1`]));
    });

    it(`Should add to the selection via toggleItemSelection without replacing the existing selection`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });

      component.selectItem(`0`);
      component.toggleItemSelection(`1`);

      expect(component.selectedItemIds).toEqual(new Set([`0`, `1`]));
    });

    it(`Should remove an already-selected item via toggleItemSelection`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });

      component.selectItem(`0`);
      component.toggleItemSelection(`0`);

      expect(component.selectedItemIds.size).toBe(0);
    });

    it(`Should clear the selection entirely via clearSelection`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      component.selectItem(`0`);

      component.clearSelection();

      expect(component.selectedItemIds.size).toBe(0);
    });

    it(`Should be a no-op via clearSelection() when nothing is selected`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      const selectionChanges: (string | number)[][] = [];
      component.selectionChanged.subscribe(ids => selectionChanges.push(ids));

      component.clearSelection();

      expect(selectionChanges.length).toBe(0);
    });

    it(`Should remove a single item from the selection via deselectItem, leaving the rest`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      component.selectItem(`0`);
      component.toggleItemSelection(`1`);

      component.deselectItem(`0`);

      expect(component.selectedItemIds).toEqual(new Set([`1`]));
    });

    it(`Should be a no-op via deselectItem() when the given id isn't currently selected`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      component.selectItem(`0`);
      const selectionChanges: (string | number)[][] = [];
      component.selectionChanged.subscribe(ids => selectionChanges.push(ids));

      component.deselectItem(`does-not-exist`);

      expect(selectionChanges.length).toBe(0);
      expect(component.selectedItemIds).toEqual(new Set([`0`]));
    });

    it(`Should clear the selection when the grid's own background is clicked, while multiSelect is on`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      component.selectItem(`0`);

      component.handleBackgroundClick(new MouseEvent(`click`));

      expect(component.selectedItemIds.size).toBe(0);
    });

    it(`Should not clear the selection on a background click when multiSelect is off`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: false });
      // Even with multiSelect off, selectItem() itself still works as a
      // direct API call — this confirms handleBackgroundClick's own
      // multiSelect gate specifically, not that selection is impossible.
      component.selectItem(`0`);

      component.handleBackgroundClick(new MouseEvent(`click`));

      expect(component.selectedItemIds.size).toBe(1);
    });

    it(`Should select an item via a reported itemClicked eventBus event, when multiSelect is on`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `0`, metaKey: false, shiftKey: false });

      expect(component.selectedItemIds).toEqual(new Set([`0`]));
    });

    it(`Should toggle-add via a Ctrl-clicked itemClicked event, not replace the existing selection`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `0`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: true, i: `1`, metaKey: false, shiftKey: false });

      expect(component.selectedItemIds).toEqual(new Set([`0`, `1`]));
    });

    it(`Should ignore a reported itemClicked event entirely when multiSelect is off`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: false });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `0`, metaKey: false, shiftKey: false });

      expect(component.selectedItemIds.size).toBe(0);
    });

    it(`Should compute the anchored range on a Shift-clicked itemClicked event (coincides with a plain toggle-add here, since "0"/"1" are adjacent)`, () => {
      // Corrected, not merely renamed: an earlier version of this test's
      // own comment claimed Shift-click always behaves exactly like a
      // Ctrl-click, with "no range-selection to match instead" — wrong,
      // since real range-selection is now implemented (see
      // `handleItemClicked`'s own doc comment). This test's own
      // assertion still passes unchanged, but only because "0" and "1"
      // are adjacent in `layout`'s own array order: range("0", "1") and
      // a plain toggle happen to produce the identical result here.
      // The `Phase 10 — Shift-click range-selection` suite below uses
      // enough items to actually distinguish the two.
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `0`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `1`, metaKey: false, shiftKey: true });

      expect(component.selectedItemIds).toEqual(new Set([`0`, `1`]));
    });

    it(`Should remove a selected item's own id once it's no longer present in a subsequent layout change (pruneSelection)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`]));

      // "b" removed entirely from the layout.
      setInputsAndDetectChanges({ layout: [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }] });

      expect(component.selectedItemIds).toEqual(new Set([`a`]));
    });

    it(`Should not touch the selection at all when a layout change doesn't remove any selected item`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      const selectionChanges: (string | number)[][] = [];
      component.selectionChanged.subscribe(ids => selectionChanges.push(ids));

      setInputsAndDetectChanges({ layout: [...twoItemLayout, { h: 2, i: `c`, w: 2, x: 8, y: 0 }] });

      // No further selectionChanged emission from pruneSelection itself
      // — "a" is still present, nothing needed pruning.
      expect(selectionChanges.length).toBe(0);
      expect(component.selectedItemIds).toEqual(new Set([`a`]));
    });

    it(`Should move every other selected item by the same delta when a selected item is dragged (group move)`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
        { h: 2, i: `c`, w: 2, x: 8, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: threeItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 2, y: 3 });

      const last = emitted[emitted.length - 1];
      const itemB = last.find(item => item.i === `b`)!;
      const itemC = last.find(item => item.i === `c`)!;
      // "b" (also selected) should have moved by the same (dx:2, dy:3)
      // delta as the dragged anchor "a".
      expect(itemB.x).toBe(6);
      expect(itemB.y).toBe(3);
      // "c" (not selected) should be untouched.
      expect(itemC.x).toBe(8);
      expect(itemC.y).toBe(0);
    });

    it(`Should resize every other selected item by the same delta when a selected item is resized (group resize)`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 3, i: `b`, w: 3, x: 4, y: 0 },
        { h: 2, i: `c`, w: 2, x: 8, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: threeItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizemove`, h: 4, i: `a`, w: 4, x: 0, y: 0 });

      const last = emitted[emitted.length - 1];
      const itemB = last.find(item => item.i === `b`)!;
      const itemC = last.find(item => item.i === `c`)!;
      // "b" (also selected) should have grown by the same (dw:2, dh:2)
      // delta as the resized anchor "a" (w:2->4, h:2->4).
      expect(itemB.w).toBe(5);
      expect(itemB.h).toBe(5);
      // "c" (not selected) should be untouched.
      expect(itemC.w).toBe(2);
      expect(itemC.h).toBe(2);
    });

    it(`Should clamp a group-resized passenger's own new size to its own minW/maxW/minH/maxH, independent of the anchor's own limits`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, maxW: 3, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Growing "a" by dw:6 would grow "b" to w:8 without its own maxW:3 clamp.
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 8, x: 0, y: 0 });

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.w).toBe(3);
    });

    it(`Should not throw, and should use a 0,0 default, when a selected id no longer exists in the layout during a group move`, () => {
      // Defensive guard, confirmed reachable only by deliberately
      // corrupting selectedItemIds against the layout — selectItem()/
      // toggleItemSelection() themselves never add an id that isn't
      // actually present, so this state can't arise through normal
      // public API usage at all.
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.selectedItemIds = new Set([`a`, `stale-id`]);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      expect(() => {
        eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
        eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 2, y: 0 });
      }).not.toThrow();

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.x).toBe(4);
    });

    it(`Should not throw, and should use a 1,1 default, when a selected id no longer exists in the layout during a group resize`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.selectedItemIds = new Set([`a`, `stale-id`]);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      expect(() => {
        eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
        eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 4, x: 0, y: 0 });
      }).not.toThrow();

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.w).toBe(2);
    });

    it(`Should not resize a static passenger during group resize, even though it is selected`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, isStatic: true, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizemove`, h: 4, i: `a`, w: 4, x: 0, y: 0 });

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.w).toBe(2);
      expect(itemB?.h).toBe(2);
    });
  });

  describe(`Phase 10 — Shift-click range-selection`, () => {
    // A 4-item layout is what actually distinguishes real
    // range-selection from a plain toggle — every multiSelect test
    // above only ever uses 2-3 items, most adjacent in layout order, so
    // a computed range and a plain toggle/additive select often happen
    // to produce the same result by coincidence (see this file's own
    // corrected comment on "Should compute the anchored range..."
    // above). These tests use enough items that only a genuine,
    // layout-order-based range produces the expected selection.
    const fourItemLayout: TLayout = [
      { h: 2, i: `a`, w: 2, x: 0, y: 0 },
      { h: 2, i: `b`, w: 2, x: 2, y: 0 },
      { h: 2, i: `c`, w: 2, x: 4, y: 0 },
      { h: 2, i: `d`, w: 2, x: 6, y: 0 },
    ];

    it(`Should select every item between the anchor and the Shift-clicked target, inclusive`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: true });

      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`, `c`, `d`]));
    });

    it(`Should select the same range when Shift-clicking "backwards" toward an earlier item`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `d`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: true });

      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`, `c`, `d`]));
    });

    it(`Should replace the current selection with the range, not merge into it`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Ctrl-select "d" on its own first — unrelated to the anchor this
      // Shift-click range below is about to compute.
      eventBus.emitItemClicked({ ctrlKey: true, i: `d`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true });

      // Only "a" and "b" (the computed range) — "d"'s own earlier,
      // unrelated Ctrl-selection doesn't survive.
      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`]));
    });

    it(`Should keep re-anchoring to the same fixed point across repeated Shift-clicks, not compounding from the previous Shift-click target`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      eventBus.emitItemClicked({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });
      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`, `c`]));

      // A second Shift-click, to "b" — ranges from the *original* anchor
      // "a", not from "c" (the previous Shift-click target).
      eventBus.emitItemClicked({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true });
      expect(component.selectedItemIds).toEqual(new Set([`a`, `b`]));
    });

    it(`Should fall back to a plain select when there's no anchor yet (the very first click on a fresh grid is a Shift-click)`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `b`, metaKey: false, shiftKey: true });

      expect(component.selectedItemIds).toEqual(new Set([`b`]));
    });

    it(`Should reset the anchor after clearSelection, so a later Shift-click falls back to a plain select again`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });
      component.clearSelection();

      eventBus.emitItemClicked({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });

      // No anchor survived the clear — falls back to a plain select of
      // just "c", not a range from the stale "a" anchor.
      expect(component.selectedItemIds).toEqual(new Set([`c`]));
    });

    it(`Should reset the anchor once its own item is removed from the layout (pruneSelection), so a later Shift-click falls back to a plain select`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout: fourItemLayout, multiSelect: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemClicked({ ctrlKey: false, i: `a`, metaKey: false, shiftKey: false });

      // Remove "a" (the anchor) from the layout entirely.
      setInputsAndDetectChanges({ layout: fourItemLayout.filter(item => item.i !== `a`) });

      eventBus.emitItemClicked({ ctrlKey: false, i: `c`, metaKey: false, shiftKey: true });

      expect(component.selectedItemIds).toEqual(new Set([`c`]));
    });
  });

  describe(`Phase 7 — enableUndoRedo`, () => {
    it(`Should revert to the pre-drag layout on undo() after a completed drag`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 3, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 3, y: 0 });

      expect(component.canUndo).toBe(true);
      component.undo();

      const last = emitted[emitted.length - 1];
      const itemA = last.find(item => item.i === `a`);
      expect(itemA?.x).toBe(0);
    });

    it(`Should reapply the undone state on redo()`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout: twoItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 3, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 3, y: 0 });
      component.undo();

      expect(component.canRedo).toBe(true);
      component.redo();

      const last = emitted[emitted.length - 1];
      const itemA = last.find(item => item.i === `a`);
      expect(itemA?.x).toBe(3);
    });

    it(`Should not record any undo history at all when enableUndoRedo is off (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: false, layout: twoItemLayout });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 3, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 3, y: 0 });

      expect(component.canUndo).toBe(false);
    });

    it(`Should be a no-op to call undo()/redo() with nothing to undo/redo`, () => {
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout });

      expect(() => component.undo()).not.toThrow();
      expect(() => component.redo()).not.toThrow();
      expect(component.canUndo).toBe(false);
      expect(component.canRedo).toBe(false);
    });

    it(`Should revert to the pre-resize layout on undo() after a completed resize, not just a completed drag`, () => {
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `0`, w: 4, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizeend`, h: 2, i: `0`, w: 4, x: 0, y: 0 });

      expect(component.canUndo).toBe(true);
      component.undo();

      const item0 = emitted[emitted.length - 1].find(item => item.i === `0`);
      expect(item0?.w).toBe(2);
    });

    it(`Should discard the oldest undo snapshot once undoHistoryLimit is exceeded`, () => {
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout, undoHistoryLimit: 2 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Three separate, completed drags on the same item — one more than
      // undoHistoryLimit's own cap of 2.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `0`, w: 2, x: 1, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 1, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `0`, w: 2, x: 2, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 2, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `0`, w: 2, x: 3, y: 0 });

      // Undo 3 times — with only 2 snapshots retained (the oldest, x:0,
      // discarded), the 3rd undo() call should be a no-op rather than
      // reverting all the way back to the very first pre-drag position.
      component.undo();
      component.undo();
      const canUndoAfterTwoUndos = component.canUndo;
      component.undo();

      expect(canUndoAfterTwoUndos).toBe(false);
    });
  });

  describe(`Phase 7 — responsive breakpoints`, () => {
    it(`Should resolve colNum from the matching breakpoint's own cols value once responsive and measured`, () => {
      setInputsAndDetectChanges({
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 },
        cols: { lg: 12, md: 10, sm: 6, xs: 4, xxl: 12, xl: 12, xxs: 2 },
        layout,
        responsive: true,
      });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      // getBreakpointFromWidth resolves the *highest* breakpoint whose
      // own threshold the width strictly exceeds (confirmed by reading
      // its own source directly, not assumed from the breakpoint names'
      // own apparent ranges) — 1000px exceeds "md"'s own 996 threshold
      // but not "lg"'s own 1200, landing on "md" unambiguously. An
      // earlier version of this test used 800px assuming it fell within
      // "md"'s own range starting at 768 — confirmed wrong via a real
      // run: 800 only exceeds "sm"'s own 768 threshold, not "md"'s own
      // 996, so it actually resolves to "sm" instead.
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1000 });

      component.ngAfterViewInit();

      expect(component.lastBreakpoint).toBe(`md`);
    });

    it(`Should emit breakpointChanged only when the resolved breakpoint actually changes`, () => {
      setInputsAndDetectChanges({ layout, responsive: true });
      const emittedBreakpoints: string[] = [];
      component.breakpointChanged.subscribe(bp => emittedBreakpoints.push(bp));
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      // Both comfortably within "md"'s own (996, 1200] range — see the
      // test above for why 800/850 don't actually work for this.
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1000 });
      component.ngAfterViewInit();
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1050 });
      component.ngAfterViewInit();

      // Both 1000 and 1050 resolve to "md" — only one emission expected,
      // not two, confirming the "only on genuine change" guard.
      expect(emittedBreakpoints).toEqual([`md`]);
    });

    it(`Should re-resolve the effective colNum when breakpoints/cols change after the initial render, without responsive itself changing`, () => {
      setInputsAndDetectChanges({
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 },
        cols: { lg: 12, md: 10, sm: 6, xs: 4, xxl: 12, xl: 12, xxs: 2 },
        layout,
        responsive: true,
      });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1000 });
      component.ngAfterViewInit();
      expect(component.lastBreakpoint).toBe(`md`);

      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      // Corrected, not merely reworded: an earlier version of this test
      // subscribed to layoutChange *after* this same call, and also
      // followed it with a redundant ngAfterViewInit() — confirmed via a
      // real trace that `resolveResponsiveColNum()` lives inside
      // `ngOnChanges` itself (the actual line this test targets), not
      // `ngAfterViewInit`'s own `measure()`, and runs synchronously as
      // part of this one call. Subscribing afterward would have missed
      // the very emission this test exists to confirm, and the trailing
      // ngAfterViewInit() call would have been a no-op regardless (its
      // own guard only re-measures when offsetWidth genuinely changes,
      // which it hasn't here).
      component.cols = { lg: 12, md: 7, sm: 6, xs: 4, xxl: 12, xl: 12, xxs: 2 };
      component.ngOnChanges({ cols: {} } as unknown as SimpleChanges);

      expect(emitted.length).toBeGreaterThan(0);
    });

    it(`Should shrink an item that overflows the new, narrower breakpoint's own column count`, () => {
      const wideItemLayout: TLayout = [{ h: 2, i: `a`, w: 8, x: 0, y: 0 }];
      setInputsAndDetectChanges({
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 },
        cols: { lg: 12, md: 4, sm: 4, xs: 4, xxl: 12, xl: 12, xxs: 2 },
        layout: wideItemLayout,
        responsive: true,
      });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      // 900px resolves to "md" (4 cols) — the item's own w:8 overflows that
      // entirely.
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 900 });

      component.ngAfterViewInit();

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.w).toBeLessThanOrEqual(4);
    });

    it(`Should produce a different bounds-correction outcome for an overflowing item when distributeEvenly is on, versus the default (moveToCorrectPlace's own new-row placement vs a simple same-row clamp)`, () => {
      // Corrected premise, not merely reworded: an earlier version of
      // this test used a non-overflowing item, on the wrong assumption
      // that distributeEvenly redistributes any item with "available
      // space" — confirmed wrong by reading `correctBounds`'s own source
      // directly: *both* branches (`distributeEvenly` on or off) are
      // gated on the exact same overflow condition
      // (`l.x + l.w > bounds.cols`); a non-overflowing item is left
      // completely untouched either way, so the two branches could never
      // have produced different output for it. The genuine difference
      // is *how* an overflowing item gets corrected: the plain path
      // clamps it left in the same row (`x = cols - w`); `moveToCorrectPlace`
      // (distributeEvenly) instead resets it to a new row entirely
      // (`x = 0, y += 1`) and resolves collisions from there — read
      // directly from `move-helper.ts`, not guessed at this time.
      //
      // Real test bug fixed, not just this comment: an earlier version
      // reused the *same* fixture/component for both the "without" and
      // "with" halves, setting offsetWidth to the identical 900 value
      // both times. Confirmed via a real run: `ngAfterViewInit`'s own
      // `measure()` only calls `resolveResponsiveColNum()` when
      // `offsetWidth` actually *differs* from the component's current
      // `containerWidth` — already 900 from the first half by the time
      // the second half set it to 900 "again," so that guard silently
      // skipped everything, and `withEmitted` never received a single
      // emission at all. A distinct fixture per half (matching this same
      // file's own Phase 8 cross-grid tests, which already establish
      // this exact two-fixture pattern) is what actually avoids that.
      const layoutWithOverflow: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 9, y: 0 },
      ];
      const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxl: 1600, xl: 1400, xxs: 0 };
      const cols = { lg: 12, md: 10, sm: 10, xs: 10, xxl: 12, xl: 12, xxs: 2 };

      setInputsAndDetectChanges({ breakpoints, colNum: 12, cols, distributeEvenly: false, layout: layoutWithOverflow, responsive: true });
      const withoutEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => withoutEmitted.push(next));
      const containerDivA = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      // 900px resolves to "md" (10 cols) — "b" (x:9,w:2, ends at 11) overflows it.
      Object.defineProperty(containerDivA, `offsetWidth`, { configurable: true, value: 900 });
      component.ngAfterViewInit();
      const itemBWithout = withoutEmitted[withoutEmitted.length - 1].find(item => item.i === `b`)!;

      const secondFixture = TestBed.createComponent(GridLayoutComponent);
      const secondComponent = secondFixture.componentInstance;
      Object.assign(secondComponent, { breakpoints, colNum: 12, cols, distributeEvenly: true, layout: layoutWithOverflow, responsive: true });
      secondComponent.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
      secondFixture.detectChanges();
      const withEmitted: TLayout[] = [];
      secondComponent.layoutChange.subscribe((next: TLayout) => withEmitted.push(next));
      const containerDivB = secondFixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      Object.defineProperty(containerDivB, `offsetWidth`, { configurable: true, value: 900 });
      secondComponent.ngAfterViewInit();
      const itemBWith = withEmitted[withEmitted.length - 1].find(item => item.i === `b`)!;
      secondFixture.nativeElement.remove();

      // Plain clamp keeps "b" at a fixed, formula-derived x (cols - w);
      // moveToCorrectPlace instead resolves it via sideways collision
      // avoidance against already-placed items, landing somewhere
      // `correctBounds`'s own simpler formula never would.
      //
      // Deliberately not asserting a specific x/y for either side here,
      // after mispredicting this exact outcome twice already by hand-
      // tracing `moveToCorrectPlace` plus the compaction pass that runs
      // after it (the first guess assumed a permanent new row; tracing
      // again showed the subsequent vertical compaction pulls "b" right
      // back up to y:0 anyway, once its own sideways shift stops it from
      // actually overlapping "a" — just at a different x than the plain
      // clamp produces). The one claim this test can make confidently,
      // without needing to fully re-derive `moveToCorrectPlace`'s own
      // exact algorithm by hand: the two paths take genuinely different
      // routes for an overflowing item, so they should not coincidentally
      // land on the exact same result.
      expect(itemBWith).not.toEqual(itemBWithout);
    });

    it(`Should seed the layouts cache from responsiveLayouts at init`, () => {
      const seededLayout: TLayout = [{ h: 3, i: `0`, w: 3, x: 0, y: 0 }];
      setInputsAndDetectChanges({ layout, responsive: true, responsiveLayouts: { md: seededLayout } });

      expect(component.layouts[`md`]).toEqual(seededLayout);
    });

    it(`Should cache the outgoing breakpoint's own current layout when switching to a new breakpoint`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, responsive: true });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1000 });
      component.ngAfterViewInit();
      expect(component.lastBreakpoint).toBe(`md`);

      // Switch to a narrower breakpoint ("sm", <996) — "md"'s own layout
      // (as it stood right before switching away) should now be cached.
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 800 });
      component.ngAfterViewInit();

      expect(component.layouts[`md`]).toBeTruthy();
    });
  });

  describe(`Phase 7 — transformScale / transition / resize-handle CSS cascade`, () => {
    it(`Should cascade transformScale to the eventBus`, () => {
      setInputsAndDetectChanges({ layout, transformScale: 1 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      const seen: number[] = [];
      eventBus.transformScale$.subscribe(value => seen.push(value));

      component.transformScale = 0.5;
      component.ngOnChanges({ transformScale: {} } as unknown as SimpleChanges);

      expect(seen).toEqual([1, 0.5]);
    });

    it(`Should apply transitionDurationMs/transitionTimingFunction as CSS custom properties on containerStyle`, () => {
      setInputsAndDetectChanges({ layout, transitionDurationMs: 350, transitionTimingFunction: `ease-in-out` });

      expect(component.containerStyle[`--grid-transition-duration`]).toBe(`350ms`);
      expect(component.containerStyle[`--grid-transition-timing`]).toBe(`ease-in-out`);
    });

    it(`Should apply --kdl-resize-handle-color only when showResizeHandles is on`, () => {
      setInputsAndDetectChanges({ layout, resizeHandleColor: `blue`, showResizeHandles: false });
      expect(component.containerStyle[`--kdl-resize-handle-color`]).toBeUndefined();

      setInputsAndDetectChanges({ showResizeHandles: true });
      expect(component.containerStyle[`--kdl-resize-handle-color`]).toBe(`blue`);
    });
  });

  describe(`Phase 8 — allowCrossGridDrag`, () => {
    const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
      element.getBoundingClientRect = () => ({
        bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
      });
    };

    let targetFixture: ComponentFixture<GridLayoutComponent> | undefined;

    afterEach(() => {
      targetFixture?.nativeElement.remove();
      targetFixture = undefined;
    });

    const setupTwoGrids = (): { source: GridLayoutComponent; target: GridLayoutComponent } => {
      const sourceLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ allowCrossGridDrag: true, colNum: 12, layout: sourceLayout, layoutId: `source` });
      const sourceContainer = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      mockRect(sourceContainer, { bottom: 300, left: 0, right: 300, top: 0 });

      targetFixture = TestBed.createComponent(GridLayoutComponent);
      const target = targetFixture.componentInstance;
      Object.assign(target, { allowCrossGridDrag: true, colNum: 12, layout: [], layoutId: `target` });
      target.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
      targetFixture.detectChanges();
      const targetContainer = targetFixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      // Positioned well to the right of the source grid's own 0–300 rect.
      mockRect(targetContainer, { bottom: 300, left: 500, right: 800, top: 0 });

      return { source: component, target };
    };

    it(`Should remove the dragged item from the source grid and add it to the target grid's own layout, when dropped inside the target's own rect`, () => {
      const { target } = setupTwoGrids();
      const sourceEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => sourceEmitted.push(next));
      const targetEmitted: TLayout[] = [];
      target.layoutChange.subscribe((next: TLayout) => targetEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Drop point (600, 100) falls inside the target's own 500–800/0–300 rect.
      eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      const sourceFinal = sourceEmitted[sourceEmitted.length - 1];
      expect(sourceFinal.find(item => item.i === `a`)).toBeUndefined();
      const targetFinal = targetEmitted[targetEmitted.length - 1];
      expect(targetFinal.find(item => item.i === `a`)).toBeTruthy();
    });

    it(`Should not throw, and should not accept the drop, when the target's own containerRef is unresolved (its own getRect returns null)`, () => {
      const { target } = setupTwoGrids();
      (target as unknown as { containerRef: unknown }).containerRef = undefined;
      const targetEmitted: TLayout[] = [];
      target.layoutChange.subscribe((next: TLayout) => targetEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      expect(() => {
        eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
        // Same drop point that, with a real containerRef, would fall
        // inside the target's own rect — with getRect() now returning
        // null instead, there's nothing for this point to match against.
        eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });
      }).not.toThrow();

      expect(targetEmitted.length).toBe(0);
    });

    it(`Should emit crossGridItemDropped on the target grid when it accepts the drop`, () => {
      const { target } = setupTwoGrids();
      const dropped: { item: { i: string | number }; sourceLayoutId: string }[] = [];
      target.crossGridItemDropped.subscribe(payload => dropped.push(payload));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      // Checking sourceLayoutId and the dropped item's own id specifically
      // — not a full deep-equal against the entire payload — confirmed
      // necessary via a real test run: the emitted payload's own `item`
      // field genuinely includes every field `ILayoutItem` has (including
      // `moved: false`, compaction's own bookkeeping flag), matching
      // `ICrossGridItemDropped`'s own documented shape correctly; a full
      // deep-equal against just `{ sourceLayoutId }` was this test's own
      // incomplete expectation, not a bug in what's actually emitted.
      expect(dropped.length).toBe(1);
      expect(dropped[0].sourceLayoutId).toBe(`source`);
      expect(dropped[0].item.i).toBe(`a`);
    });

    it(`Should reject the drop and keep the item in the source grid, when the target has disableExternalDrop on`, () => {
      const { target } = setupTwoGrids();
      target.disableExternalDrop = true;
      const rejected: { itemId: string | number; sourceLayoutId: string }[] = [];
      target.crossGridDropRejected.subscribe(payload => rejected.push(payload));
      const sourceEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => sourceEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(rejected).toEqual([{ itemId: `a`, sourceLayoutId: `source` }]);
      const sourceFinal = sourceEmitted[sourceEmitted.length - 1];
      // Item stays in the source grid, committed as a normal in-grid move.
      expect(sourceFinal.find(item => item.i === `a`)).toBeTruthy();
    });

    it(`Should commit a normal in-grid move when dropped outside any registered target zone`, () => {
      setupTwoGrids();
      const sourceEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => sourceEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Drop point (5000, 5000) is outside both grids' own rects entirely.
      eventBus.emitItemDrag({ clientX: 5000, clientY: 5000, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      const sourceFinal = sourceEmitted[sourceEmitted.length - 1];
      expect(sourceFinal.find(item => item.i === `a`)?.x).toBe(2);
    });

    it(`Should not attempt any cross-grid lookup at all when allowCrossGridDrag is off (the default)`, () => {
      const sourceLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ allowCrossGridDrag: false, colNum: 12, layout: sourceLayout });
      const sourceEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => sourceEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      const sourceFinal = sourceEmitted[sourceEmitted.length - 1];
      // Committed as a normal in-grid move regardless of where the
      // pointer ended up — no other grid was ever consulted.
      expect(sourceFinal.find(item => item.i === `a`)?.x).toBe(2);
    });

    it(`Should re-register the cross-grid zone when allowCrossGridDrag toggles on after the initial render`, () => {
      setInputsAndDetectChanges({ allowCrossGridDrag: false, colNum: 12, layout: [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }] });

      component.allowCrossGridDrag = true;
      component.ngOnChanges({ allowCrossGridDrag: { firstChange: false } } as unknown as SimpleChanges);

      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      const sourceEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => sourceEmitted.push(next));

      // With the zone now actually registered, dragging "far away" (no
      // real target grid registered at that point) still just falls
      // through to a normal in-grid move — the point of this test is
      // that re-toggling on didn't throw and left the drag pipeline
      // functioning, not a specific cross-grid outcome.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      expect(() => eventBus.emitItemDrag({ clientX: 5000, clientY: 5000, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 })).not.toThrow();

      expect(sourceEmitted[sourceEmitted.length - 1].find(item => item.i === `a`)?.x).toBe(2);
    });
  });

  describe(`Phase 8 — allowOutsideDrop`, () => {
    const dispatchDragEvent = (
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

    it(`Should emit itemDroppedFromOutside with the grid-unit position derived from the drop's own clientX/clientY`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, colNum: 12, layout: [], margin: [10, 10], outsideDropHeight: 2, outsideDropWidth: 2, rowHeight: 100 });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      containerDiv.getBoundingClientRect = () => ({
        bottom: 500, height: 500, left: 0, right: 1220, top: 0, width: 1220, x: 0, y: 0, toJSON: () => ({}),
      });
      component.containerWidth = 1220;
      const dropped: { h: number; w: number; x: number; y: number }[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push({ h: payload.h, w: payload.w, x: payload.x, y: payload.y }));
      const mockDataTransfer = { getData: () => `` } as unknown as DataTransfer;

      dispatchDragEvent(containerDiv, `drop`, { clientX: 101, clientY: 0, dataTransfer: mockDataTransfer });

      // colWidth = (1220-10*13)/12 = 90.8333; x = round((101-10)/(90.8333+10)) = round(0.902) = 1
      expect(dropped).toEqual([{ h: 2, w: 2, x: 1, y: 0 }]);
    });

    it(`Should fall back to the drop rect's own measured width when containerWidth hasn't been measured yet`, () => {
      // containerWidth deliberately left at its own unmeasured 0 —
      // outsideDropPositionFromEvent's own "this.containerWidth || rect.
      // width" fallback should use the container's own real, measured
      // rect width instead in that case, rather than computing colWidth
      // against a zero container width.
      setInputsAndDetectChanges({ allowOutsideDrop: true, colNum: 12, layout: [], margin: [10, 10], outsideDropHeight: 2, outsideDropWidth: 2, rowHeight: 100 });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      containerDiv.getBoundingClientRect = () => ({
        bottom: 500, height: 500, left: 0, right: 1220, top: 0, width: 1220, x: 0, y: 0, toJSON: () => ({}),
      });
      const dropped: { h: number; w: number; x: number; y: number }[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push({ h: payload.h, w: payload.w, x: payload.x, y: payload.y }));
      const mockDataTransfer = { getData: () => `` } as unknown as DataTransfer;

      dispatchDragEvent(containerDiv, `drop`, { clientX: 101, clientY: 0, dataTransfer: mockDataTransfer });

      // Same math as the already-measured test above (colWidth derived
      // from rect.width:1220, the same value containerWidth would
      // otherwise have held) — confirming the fallback produces the
      // identical, correct result rather than dividing by zero.
      expect(dropped).toEqual([{ h: 2, w: 2, x: 1, y: 0 }]);
    });

    it(`Should not attach any listeners at all when allowOutsideDrop is off (the default)`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: false, layout: [] });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      const dropped: unknown[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push(payload));

      dispatchDragEvent(containerDiv, `drop`, { clientX: 0, clientY: 0 });

      expect(dropped.length).toBe(0);
    });

    it(`Should set isDragging to true on dragover, and back to false once dragEnterCount returns to zero on dragleave`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, colNum: 12, layout: [], margin: [10, 10], rowHeight: 100 });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      component.containerWidth = 1220;

      dispatchDragEvent(containerDiv, `dragenter`);
      dispatchDragEvent(containerDiv, `dragover`, { clientX: 50, clientY: 50 });

      expect(component.isDragging).toBe(true);

      dispatchDragEvent(containerDiv, `dragleave`);

      expect(component.isDragging).toBe(false);
    });

    it(`Should not accept the drop at all when outsideDropAccept returns false`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, layout: [], outsideDropAccept: () => false });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      const dropped: unknown[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push(payload));

      dispatchDragEvent(containerDiv, `drop`, { clientX: 0, clientY: 0 });

      expect(dropped.length).toBe(0);
    });

    it(`Should not increment dragEnterCount at all on dragenter when outsideDropAccept returns false`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, layout: [], outsideDropAccept: () => false });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      dispatchDragEvent(containerDiv, `dragenter`);

      expect((component as unknown as { dragEnterCount: number }).dragEnterCount).toBe(0);
    });

    it(`Should not show the placeholder on dragover when outsideDropAccept returns false`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, layout: [], outsideDropAccept: () => false });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      dispatchDragEvent(containerDiv, `dragover`, { clientX: 50, clientY: 50 });

      expect(component.isDragging).toBe(false);
    });

    it(`Should detach the listeners once allowOutsideDrop toggles back off`, () => {
      setInputsAndDetectChanges({ allowOutsideDrop: true, layout: [] });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      component.allowOutsideDrop = false;
      component.ngOnChanges({ allowOutsideDrop: { firstChange: false } } as unknown as SimpleChanges);

      const dropped: unknown[] = [];
      component.itemDroppedFromOutside.subscribe(payload => dropped.push(payload));
      dispatchDragEvent(containerDiv, `drop`, { clientX: 0, clientY: 0 });

      expect(dropped.length).toBe(0);
    });

    it(`Should be a no-op, not a throw, when allowOutsideDrop is toggled with containerRef unresolved`, () => {
      // Same corrected approach as the equivalent scrollToItem()/
      // focusItem() test above — a "before any detectChanges()" fresh
      // fixture didn't actually leave containerRef unresolved (confirmed
      // via a real coverage run), so this directly overrides the private
      // field instead, deterministically exercising
      // setOutsideDropEnabled's own "no container" guard.
      setInputsAndDetectChanges({ allowOutsideDrop: false, layout: [] });
      (component as unknown as { containerRef: unknown }).containerRef = undefined;

      component.allowOutsideDrop = true;

      expect(() => component.ngOnChanges({ allowOutsideDrop: { firstChange: false } } as unknown as SimpleChanges)).not.toThrow();
    });
  });

  describe(`Phase 9 — imperative API`, () => {
    it(`Should re-run compaction via compactNow(), pulling a scattered item back up`, () => {
      const scatteredLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 4 }];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.VERTICAL, layout: scatteredLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.compactNow();

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.y).toBe(0);
    });

    it(`Should force real compaction via compactNow() even when compactType is NONE`, () => {
      const scatteredLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 4 }];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: scatteredLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      // compactType:NONE only governs *automatic* compaction during drag/
      // resize — an explicit, manually-triggered compactNow() should
      // still actually tidy up, matching Vue's own behavior.
      component.compactNow();

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.y).toBe(0);
    });

    it(`Should perform the same operation via rearrange(), as an alias for compactNow()`, () => {
      const scatteredLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 4 }];
      setInputsAndDetectChanges({ colNum: 12, layout: scatteredLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.rearrange();

      const itemA = emitted[0].find(item => item.i === `a`);
      expect(itemA?.y).toBe(0);
    });

    it(`Should discard the oldest undo snapshot once undoHistoryLimit is exceeded via repeated compactNow() calls`, () => {
      const scatteredLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 4 }];
      setInputsAndDetectChanges({ colNum: 12, enableUndoRedo: true, layout: scatteredLayout, undoHistoryLimit: 1 });

      component.compactNow();
      component.compactNow();

      // With undoHistoryLimit:1, the first snapshot is discarded once
      // the second compactNow() pushes its own — only one undo should
      // ever be available at a time.
      component.undo();
      expect(component.canUndo).toBe(false);
    });

    it(`Should duplicate an item with a "-copy" suffixed id, placed below the source`, () => {
      const singleItemLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ colNum: 12, layout: singleItemLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      const newId = component.duplicateItem(`a`);

      expect(newId).toBe(`a-copy`);
      const duplicated = emitted[0].find(item => item.i === `a-copy`);
      expect(duplicated).toBeTruthy();
      expect(duplicated?.w).toBe(2);
      expect(duplicated?.h).toBe(2);
    });

    it(`Should return null from duplicateItem() when the given id doesn't match any item`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });

      expect(component.duplicateItem(`does-not-exist`)).toBeNull();
    });

    it(`Should append a numeric suffix to the copy's own id when duplicating the same item more than once`, () => {
      const singleItemLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ colNum: 12, layout: singleItemLayout });

      const firstCopyId = component.duplicateItem(`a`);
      const secondCopyId = component.duplicateItem(`a`);

      expect(firstCopyId).toBe(`a-copy`);
      expect(secondCopyId).toBe(`a-copy-2`);
    });

    it(`Should record an undo snapshot for compactNow() when enableUndoRedo is on, revertible via undo()`, () => {
      const scatteredLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 4 }];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.VERTICAL, enableUndoRedo: true, layout: scatteredLayout });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.compactNow();

      expect(component.canUndo).toBe(true);
      component.undo();

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      // Reverted to its own original, pre-compaction y:4, not the
      // compacted y:0.
      expect(itemA?.y).toBe(4);
    });

    it(`Should align every selected item to the anchor's own left edge via alignSelected`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: threeItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`left`);

      const itemB = emitted[0].find(item => item.i === `b`);
      // "a" is the anchor (first selected) and never moves; "b" aligns to
      // its own left edge (x:0).
      expect(itemB?.x).toBe(0);
    });

    it(`Should be a no-op via alignSelected() when fewer than 2 items are selected`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout, multiSelect: true });
      component.selectItem(`0`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`left`);

      expect(emitted.length).toBe(0);
    });

    it(`Should align selected items vertically to the anchor's own top edge, not just horizontally`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 4 },
        { h: 2, i: `b`, w: 2, x: 6, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`top`);

      const itemB = emitted[0].find(item => item.i === `b`);
      // "a" is the anchor (first selected) and never moves; "b" aligns to
      // its own top edge (y:4).
      expect(itemB?.y).toBe(4);
    });

    it(`Should skip an adjustment that would collide with a non-selected item, when preventCollision is on`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
        { h: 2, i: `c`, w: 2, x: 0, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: threeItemLayout, multiSelect: true, preventCollision: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      // Aligning "b" to "a"'s own left edge (x:0) would land it directly
      // on top of "c" (not selected, at x:0,y:4) — preventCollision
      // should skip just that one adjustment.
      component.alignSelected(`left`);

      const itemB = emitted[0].find(item => item.i === `b`);
      expect(itemB?.x).toBe(6);
    });

    it(`Should still apply an adjustment that collides only with another item also being aligned, even when preventCollision is on`, () => {
      // Corrected setup, not merely reworded: an earlier version placed
      // "a" and "b" on different rows entirely, so aligning "b" to "a"'s
      // own x never actually collided with anything at all — the test
      // wasn't exercising the "exempt a fellow-selected collision" branch
      // it claimed to. Same row now, so aligning "b" onto "a"'s own x
      // lands it directly on top of the anchor itself, which is exactly
      // the case that should be exempted from the preventCollision check.
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 4 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, multiSelect: true, preventCollision: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`left`);

      const itemB = emitted[0].find(item => item.i === `b`);
      expect(itemB?.x).toBe(0);
    });

    it(`Should record an undo snapshot for distributeSelected() when enableUndoRedo is on, revertible via undo()`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 3, y: 0 },
        { h: 2, i: `c`, w: 2, x: 10, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, enableUndoRedo: true, layout: threeItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      component.toggleItemSelection(`c`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.distributeSelected(`horizontal`);

      expect(component.canUndo).toBe(true);
      component.undo();

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.x).toBe(3);
    });

    it(`Should evenly space the middle item via distributeSelected, leaving the two outermost items untouched`, () => {
      const threeItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 3, y: 0 },
        { h: 2, i: `c`, w: 2, x: 10, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: threeItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      component.toggleItemSelection(`c`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.distributeSelected(`horizontal`);

      const itemA = emitted[0].find(item => item.i === `a`);
      const itemC = emitted[0].find(item => item.i === `c`);
      // The two outermost items (by position) stay exactly where they are.
      expect(itemA?.x).toBe(0);
      expect(itemC?.x).toBe(10);
    });

    it(`Should be a no-op via distributeSelected() when fewer than 3 items are selected`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.distributeSelected(`horizontal`);

      expect(emitted.length).toBe(0);
    });

    it(`Should record an undo snapshot for alignSelected() when enableUndoRedo is on, revertible via undo()`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, enableUndoRedo: true, layout: twoItemLayout, multiSelect: true });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));

      component.alignSelected(`left`);

      expect(component.canUndo).toBe(true);
      component.undo();

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      // "b" reverted to its own original x:6, not left aligned at x:0.
      expect(itemB?.x).toBe(6);
    });

    it(`Should discard the oldest undo snapshot once undoHistoryLimit is exceeded via repeated alignSelected() calls`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, enableUndoRedo: true, layout: twoItemLayout, multiSelect: true, undoHistoryLimit: 1 });
      component.selectItem(`a`);
      component.toggleItemSelection(`b`);

      component.alignSelected(`left`);
      component.alignSelected(`top`);

      component.undo();
      expect(component.canUndo).toBe(false);
    });

    it(`Should skip an adjustment referencing an id no longer present in the working layout, without throwing`, () => {
      // Exercises applyAlignDistributeAdjustments's own defensive "item
      // not found" guard directly — core's own computeAlignAdjustments/
      // computeDistributeAdjustments only ever return adjustments for
      // ids that genuinely exist in the layout passed to them, so this
      // isn't reachable through the public alignSelected()/
      // distributeSelected() API at all; calling the private method
      // directly with a deliberately bogus id is the only way to
      // exercise this guard, matching this file's own established
      // pattern of casting to reach private members when needed.
      setInputsAndDetectChanges({ colNum: 12, layout });

      expect(() => {
        (component as unknown as { applyAlignDistributeAdjustments: (adjustments: Map<string, { x?: number; y?: number }>, selectedIds: string[]) => void })
          .applyAlignDistributeAdjustments(new Map([[`does-not-exist`, { x: 0 }]]), [`does-not-exist`]);
      }).not.toThrow();
    });

    it(`Should render the current layout as an SVG string containing every item's own id, via exportLayoutAsSvg`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });

      const svg = component.exportLayoutAsSvg();

      expect(svg).toContain(`<svg`);
      expect(svg).toContain(`>0<`);
      expect(svg).toContain(`>1<`);
    });

    it(`Should scroll a matching item into view via scrollToItem, without throwing for a missing id`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      const item = document.createElement(`div`);
      item.setAttribute(`data-grid-item-id`, `0`);
      const scrollIntoViewSpy = jest.fn();
      item.scrollIntoView = scrollIntoViewSpy;
      containerDiv.appendChild(item);

      component.scrollToItem(`0`);

      expect(scrollIntoViewSpy).toHaveBeenCalled();
      expect(() => component.scrollToItem(`does-not-exist`)).not.toThrow();
    });

    it(`Should be a no-op, not a throw, when scrollToItem()/focusItem() are called with containerRef unresolved`, () => {
      // Corrected approach, not merely reworded: an earlier version of
      // this test relied on calling these methods before any
      // detectChanges() at all, on the assumption that a `{static: true}`
      // ViewChild wouldn't yet be resolved at that point. Confirmed wrong
      // via a real coverage run: the branch stayed uncovered regardless,
      // meaning `containerRef` was already available by then after all
      // (TestBed.createComponent() apparently builds enough of the view
      // for a static ViewChild to resolve before ngOnInit is explicitly
      // invoked). Directly overriding the private field to `undefined`
      // sidesteps that timing question entirely and deterministically
      // exercises the guard this test exists for.
      setInputsAndDetectChanges({ colNum: 12, layout });
      (component as unknown as { containerRef: unknown }).containerRef = undefined;

      expect(() => component.scrollToItem(`0`)).not.toThrow();
      expect(() => component.focusItem(`0`)).not.toThrow();
    });

    it(`Should focus a matching item via focusItem, without throwing for a missing id`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      const item = document.createElement(`div`);
      item.setAttribute(`data-grid-item-id`, `0`);
      const focusSpy = jest.fn();
      item.focus = focusSpy;
      containerDiv.appendChild(item);

      component.focusItem(`0`);

      expect(focusSpy).toHaveBeenCalled();
      expect(() => component.focusItem(`does-not-exist`)).not.toThrow();
    });
  });

  describe(`Phase 12 — horizontalShift / restoreOnDrag`, () => {
    it(`Should produce a different collision-resolution outcome for the colliding item when horizontalShift is on, versus the default (vertical push)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];

      setInputsAndDetectChanges({ colNum: 12, horizontalShift: false, layout: twoItemLayout });
      const withoutShiftEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => withoutShiftEmitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });
      const itemBWithoutShift = withoutShiftEmitted[0].find(item => item.i === `b`)!;

      setInputsAndDetectChanges({ colNum: 12, horizontalShift: true, layout: twoItemLayout });
      const withShiftEmitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => withShiftEmitted.push(next));
      const eventBusForShift = fixture.debugElement.injector.get(GridEventBusService);
      eventBusForShift.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });
      const itemBWithShift = withShiftEmitted[0].find(item => item.i === `b`)!;

      // Genuinely different outcomes confirms horizontalShift actually
      // reached moveElement, rather than being silently ignored (a
      // hardcoded `false` would produce the exact same result both times).
      expect(itemBWithShift).not.toEqual(itemBWithoutShift);
    });

    it(`Should not pass any minPositions in context at all when restoreOnDrag is off (the default)`, () => {
      const receivedContexts: { minPositions?: unknown }[] = [];
      const spyCompactor: ICompactor = {
        compact: (currentLayout: TLayout, _cols: number, context) => {
          receivedContexts.push(context);
          return currentLayout;
        },
        type: `spy`,
      };
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactor: spyCompactor, layout: twoItemLayout, restoreOnDrag: false });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(receivedContexts.at(-1)?.minPositions).toBeUndefined();
    });

    it(`Should pass every item's own pre-drag x/y as context.minPositions to the compactor on dragend, when restoreOnDrag is on`, () => {
      const receivedContexts: { minPositions?: Record<string | number, { x: number; y: number }> }[] = [];
      const spyCompactor: ICompactor = {
        compact: (currentLayout: TLayout, _cols: number, context) => {
          receivedContexts.push(context as { minPositions?: Record<string | number, { x: number; y: number }> });
          return currentLayout;
        },
        type: `spy`,
      };
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 3 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactor: spyCompactor, layout: twoItemLayout, restoreOnDrag: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(receivedContexts.at(-1)?.minPositions?.[`b`]).toEqual({ x: 4, y: 3 });
    });

    it(`Should pass minPositions on every tick once restoreOnDrag captures it, not just at the final dragend`, () => {
      // Corrected, not merely renamed: an earlier version of this test
      // asserted the opposite — that minPositions was *absent* during a
      // mid-drag dragmove tick, gated to dragend only. That was a real
      // bug this port had, not Vue's own actual behavior: gating the
      // minPositions-aware compaction to dragend alone let dragstart's
      // own (otherwise-ungated) compaction pass eagerly close a
      // pre-existing layout gap before dragend's own protection ever
      // ran, defeating restoreOnDrag's entire purpose — confirmed via a
      // real failing test ("keep every other item at or above its own
      // pre-drag position") and fixed by applying this on every tick,
      // matching Vue's own `dragEvent`, which runs this identical branch
      // unconditionally on every call.
      const receivedContexts: { minPositions?: unknown }[] = [];
      const spyCompactor: ICompactor = {
        compact: (currentLayout: TLayout, _cols: number, context) => {
          receivedContexts.push(context);
          return currentLayout;
        },
        type: `spy`,
      };
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 4, y: 3 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactor: spyCompactor, layout: twoItemLayout, restoreOnDrag: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 1, y: 0 });

      expect(receivedContexts.at(-1)?.minPositions).toBeDefined();
    });

    it(`Should keep every other item at or above its own pre-drag position after compaction, when restoreOnDrag is on with the built-in vertical compactor`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 5 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.VERTICAL, layout: twoItemLayout, restoreOnDrag: true });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      // Drag "a" out of the way entirely (far right), which would
      // otherwise let ordinary vertical compaction pull "b" all the way
      // up to y:0 (nothing above it anymore) — restoreOnDrag should hold
      // it at its own pre-drag y:5 instead.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 10, y: 0 });

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.y).toBe(5);
    });

    it(`Should let compaction pull other items all the way up as normal when restoreOnDrag is off (the default)`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 5 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.VERTICAL, layout: twoItemLayout, restoreOnDrag: false });
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 10, y: 0 });

      const itemB = emitted[emitted.length - 1].find(item => item.i === `b`);
      expect(itemB?.y).toBe(0);
    });
  });

  describe(`Phase 14 — grid-wide cascade (IGridDefaults)`, () => {
    it(`Should push an IGridDefaults snapshot reflecting all five contributing @Input()s together, once ngOnChanges sees them change`, () => {
      // Corrected, not merely reworded: an earlier version of this test
      // relied solely on setInputsAndDetectChanges's own ngOnChanges call
      // (component.ngOnChanges({ layout: {} }), per this file's own
      // setInputsAndDetectChanges helper above) to trigger the initial
      // push — but that helper only ever populates a `layout` key,
      // never isDraggable/isResizable/isBounded/isMirrored/maxRows, so
      // pushGridDefaults()'s own gated check (deliberately real, unlike
      // GridItemComponent's own unconditional resolveGridDefaults() —
      // see that component's own ngOnChanges for why its case is
      // different) never actually fired, and this test was silently
      // asserting against the untouched constructor-time defaults the
      // whole time. A direct, explicit ngOnChanges call with the actual
      // keys this test cares about — matching the very next test's own,
      // already-correct approach — is what a real Angular-driven
      // @Input() binding change would produce anyway.
      setInputsAndDetectChanges({ colNum: 12, isBounded: true, isDraggable: false, isMirrored: true, isResizable: false, layout, maxRows: 5 });
      component.ngOnChanges({ isBounded: {}, isDraggable: {}, isMirrored: {}, isResizable: {}, maxRows: {} } as unknown as SimpleChanges);
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      const received: unknown[] = [];
      eventBus.gridDefaults$.subscribe(defaults => received.push(defaults));

      expect(received[received.length - 1]).toEqual({
        ariaLabels: {},
        borderRadiusPx: 10,
        enableEditMode: true,
        isBounded: true,
        isDraggable: false,
        isMirrored: true,
        isResizable: false,
        maxRows: 5,
        showCloseButton: false,
        useBorderRadius: false,
      });
    });

    it(`Should push an updated IGridDefaults snapshot whenever any one of the five contributing @Input()s changes after the initial render`, () => {
      setInputsAndDetectChanges({ colNum: 12, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, layout, maxRows: Infinity });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      const received: unknown[] = [];
      eventBus.gridDefaults$.subscribe(defaults => received.push(defaults));

      component.isBounded = true;
      component.ngOnChanges({ isBounded: {} } as unknown as SimpleChanges);

      expect(received[received.length - 1]).toEqual({
        ariaLabels: {},
        borderRadiusPx: 10,
        enableEditMode: true,
        isBounded: true,
        isDraggable: true,
        isMirrored: false,
        isResizable: true,
        maxRows: Infinity,
        showCloseButton: false,
        useBorderRadius: false,
      });
    });

    it(`Should not push a new IGridDefaults snapshot when an unrelated @Input() changes`, () => {
      setInputsAndDetectChanges({ colNum: 12, isBounded: false, isDraggable: true, isMirrored: false, isResizable: true, layout, maxRows: Infinity });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      const received: unknown[] = [];
      eventBus.gridDefaults$.subscribe(defaults => received.push(defaults));
      const countAfterInitial = received.length;

      component.rowHeight = 200;
      component.ngOnChanges({ rowHeight: {} } as unknown as SimpleChanges);

      expect(received.length).toBe(countAfterInitial);
    });
  });

  describe(`Phase 20 — showGridLines`, () => {
    it(`Should not have the kdl-grid-lines class at all when showGridLines is false (the default)`, () => {
      setInputsAndDetectChanges({ layout });

      expect(fixture.nativeElement.querySelector(`div`)?.classList.contains(`kdl-grid-lines`)).toBe(false);
    });

    it(`Should add the kdl-grid-lines class to the container when showGridLines is true`, () => {
      setInputsAndDetectChanges({ layout, showGridLines: true });

      expect(fixture.nativeElement.querySelector(`div`)?.classList.contains(`kdl-grid-lines`)).toBe(true);
    });

    it(`Should toggle the kdl-grid-lines class off again after being set, when showGridLines flips back to false`, () => {
      setInputsAndDetectChanges({ layout, showGridLines: true });
      expect(fixture.nativeElement.querySelector(`div`)?.classList.contains(`kdl-grid-lines`)).toBe(true);

      setInputsAndDetectChanges({ showGridLines: false });
      // Required, not optional — confirmed via a real test run, not
      // assumed: this component is OnPush, and toggling a plain
      // @Input() via Object.assign (not a real parent-template binding
      // change) doesn't itself mark the view dirty, even for the root
      // of a TestBed fixture. Same root cause already diagnosed at
      // length for the autoHeight/resizeHandles toggle tests earlier
      // in this file's own history — should have been applied here from
      // the start rather than assumed unnecessary for a "simple" class
      // binding.
      (component as unknown as { changeDetectorRef: { markForCheck: () => void } }).changeDetectorRef.markForCheck();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector(`div`)?.classList.contains(`kdl-grid-lines`)).toBe(false);
    });
  });

  describe(`Phase 17 — heightMode`, () => {
    it(`Should defer to autoSize:true (matching this component's own prior behavior) when heightMode is left at its own default (null)`, () => {
      setInputsAndDetectChanges({ autoSize: true, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBe(`340px`);
      expect(component.containerStyle[`overflow-y`]).toBeUndefined();
    });

    it(`Should defer to autoSize:false (matching this component's own prior behavior) when heightMode is left at its own default (null)`, () => {
      setInputsAndDetectChanges({ autoSize: false, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBeUndefined();
      expect(component.containerStyle[`overflow-y`]).toBeUndefined();
    });

    it(`Should let heightMode:'auto' override autoSize:false`, () => {
      setInputsAndDetectChanges({ autoSize: false, heightMode: `auto`, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBe(`340px`);
    });

    it(`Should let heightMode:'fixed' override autoSize:true`, () => {
      setInputsAndDetectChanges({ autoSize: true, heightMode: `fixed`, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBeUndefined();
    });

    it(`Should set no explicit height but overflow-y:auto for heightMode:'scroll'`, () => {
      setInputsAndDetectChanges({ heightMode: `scroll`, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBeUndefined();
      expect(component.containerStyle[`overflow-y`]).toBe(`auto`);
    });

    it(`Should set height:100% and overflow-y:auto for heightMode:'fit'`, () => {
      setInputsAndDetectChanges({ heightMode: `fit`, layout, margin: [10, 10], rowHeight: 100 });

      expect(component.containerStyle[`height`]).toBe(`100%`);
      expect(component.containerStyle[`overflow-y`]).toBe(`auto`);
    });

    it(`Should recompute the container height when heightMode changes after the initial render`, () => {
      setInputsAndDetectChanges({ heightMode: `fixed`, layout, margin: [10, 10], rowHeight: 100 });
      expect(component.containerStyle[`height`]).toBeUndefined();

      setInputsAndDetectChanges({ heightMode: `fit` });

      expect(component.containerStyle[`height`]).toBe(`100%`);
      expect(component.containerStyle[`overflow-y`]).toBe(`auto`);
    });
  });

  describe(`Phase 21 — moveBlockedByCollision / columnsChanged / layoutReady / dragStart|Move|End`, () => {
    it(`Should emit moveBlockedByCollision when preventCollision blocks a drag entirely, staying at its own pre-move position`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 2, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Straight into "b"'s own position — fully blocked, preventCollision on.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(blocked).toEqual([`a`]);
    });

    it(`Should not emit moveBlockedByCollision when a drag succeeds without any collision`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 8, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 4, y: 0 });

      expect(blocked.length).toBe(0);
    });

    it(`Should not emit moveBlockedByCollision when the pointer pauses over the item's own current, unchanged cell`, () => {
      const singleItemLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: singleItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Same position as already occupied — not a genuine move attempt.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 0, y: 0 });

      expect(blocked.length).toBe(0);
    });

    it(`Should clamp a resize to the maximum available space and emit moveBlockedByCollision when preventCollision is on and it collides`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 3, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Growing to w:5 would overlap "b" (at x:3) — should clamp to w:3
      // (leastX(3) - item.x(0)), not the full requested w:5.
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 5, x: 0, y: 0 });

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.w).toBe(3);
      expect(blocked).toEqual([`a`]);
    });

    it(`Should clamp the height (not width) of a resize colliding with a neighbor below, not beside, it`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 0, y: 3 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // Growing to h:5 (w unchanged) would overlap "b" (at y:3, same
      // column) — should clamp h to 3 (leastY(3) - item.y(0)), leaving
      // w completely untouched (leastX never becomes finite here, since
      // "b"'s own x (0) isn't strictly greater than item.x (0)).
      eventBus.emitItemResize({ eventType: `resizemove`, h: 5, i: `a`, w: 2, x: 0, y: 0 });

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.h).toBe(3);
      expect(itemA?.w).toBe(2);
      expect(blocked).toEqual([`a`]);
    });

    it(`Should not clamp or emit moveBlockedByCollision for a resize that doesn't collide with anything`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 8, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: true });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 4, x: 0, y: 0 });

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.w).toBe(4);
      expect(blocked.length).toBe(0);
    });

    it(`Should not clamp a resize at all when preventCollision is off (the default), even if it overlaps another item`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 3, y: 0 },
      ];
      setInputsAndDetectChanges({ colNum: 12, compactType: ECompactType.NONE, layout: twoItemLayout, preventCollision: false });
      const blocked: (string | number)[] = [];
      component.moveBlockedByCollision.subscribe(id => blocked.push(id));
      const emitted: TLayout[] = [];
      component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizemove`, h: 2, i: `a`, w: 5, x: 0, y: 0 });

      const itemA = emitted[emitted.length - 1].find(item => item.i === `a`);
      expect(itemA?.w).toBe(5);
      expect(blocked.length).toBe(0);
    });

    it(`Should emit columnsChanged with the new colNum when that @Input() changes after the initial render`, () => {
      // Corrected, not merely reworded: an earlier version of this test
      // relied on setInputsAndDetectChanges's own ngOnChanges call
      // (component.ngOnChanges({ layout: {} })), which never includes a
      // colNum key at all — confirmed via a real failing test run — so
      // the gated columnsChanged emission never actually fired. A
      // direct, targeted ngOnChanges call with the real key, matching
      // this file's own established pattern for exactly this class of
      // gated-@Input() test, is what a real Angular-driven binding
      // change would produce anyway.
      setInputsAndDetectChanges({ colNum: 12, layout });
      const changed: number[] = [];
      component.columnsChanged.subscribe(colNum => changed.push(colNum));

      component.colNum = 6;
      component.ngOnChanges({ colNum: { firstChange: false } } as unknown as SimpleChanges);

      expect(changed).toEqual([6]);
    });

    it(`Should not emit columnsChanged for the initial colNum value`, () => {
      const changed: number[] = [];
      setInputsAndDetectChanges({ colNum: 12, layout });
      component.columnsChanged.subscribe(colNum => changed.push(colNum));

      expect(changed.length).toBe(0);
    });

    it(`Should emit layoutReady exactly once, on the first real container-width measurement`, () => {
      setInputsAndDetectChanges({ layout });
      const ready: TLayout[] = [];
      component.layoutReady.subscribe(l => ready.push(l));
      const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;

      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1000 });
      component.ngAfterViewInit();

      return new Promise<void>(resolve => {
        setTimeout(() => {
          expect(ready.length).toBe(1);
          expect(ready[0]).toBe(layout);

          // A second, later measurement shouldn't emit layoutReady again.
          Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1100 });
          component.ngAfterViewInit();

          setTimeout(() => {
            expect(ready.length).toBe(1);
            resolve();
          }, 0);
        }, 0);
      });
    });

    it(`Should emit dragStart/dragMove/dragEnd with this item's own id on each respective drag tick`, () => {
      setInputsAndDetectChanges({ colNum: 12, layout });
      const starts: (string | number)[] = [];
      const moves: (string | number)[] = [];
      const ends: (string | number)[] = [];
      component.dragStart.subscribe(id => starts.push(id));
      component.dragMove.subscribe(id => moves.push(id));
      component.dragEnd.subscribe(id => ends.push(id));
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `0`, w: 2, x: 1, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `0`, w: 2, x: 1, y: 0 });

      expect(starts).toEqual([`0`]);
      expect(moves).toEqual([`0`]);
      expect(ends).toEqual([`0`]);
    });
  });

  describe(`Regular in-grid drag/resize placeholder tracking + placeholderTemplate`, () => {
    it(`Should populate placeholder and set isDragging on a regular in-grid dragstart, not just outside-drop`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.isDragging).toBe(true);
      expect(component.placeholder).toEqual({ h: 2, w: 2, x: 0, y: 0 });
    });

    it(`Should update placeholder on each dragmove tick to reflect the in-progress target position`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `0`, w: 2, x: 4, y: 2 });

      expect(component.placeholder).toEqual({ h: 2, w: 2, x: 4, y: 2 });
    });

    it(`Should clear isDragging and placeholder once the in-grid drag ends`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragend`, h: 2, i: `0`, w: 2, x: 4, y: 2 });

      expect(component.isDragging).toBe(false);
      expect(component.placeholder).toBeNull();
    });

    it(`Should populate placeholder and set isDragging on a regular in-grid resizestart/resizemove too, not just drag`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });

      expect(component.isDragging).toBe(true);
      expect(component.placeholder).toEqual({ h: 2, w: 2, x: 0, y: 0 });

      eventBus.emitItemResize({ eventType: `resizemove`, h: 4, i: `0`, w: 5, x: 0, y: 0 });

      expect(component.placeholder).toEqual({ h: 4, w: 5, x: 0, y: 0 });
    });

    it(`Should clear isDragging and placeholder once the in-grid resize ends`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemResize({ eventType: `resizestart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemResize({ eventType: `resizeend`, h: 4, i: `0`, w: 5, x: 0, y: 0 });

      expect(component.isDragging).toBe(false);
      expect(component.placeholder).toBeNull();
    });

    it(`Should reflect a snapToGrid-adjusted target position in the placeholder, matching what moveElement is about to resolve against`, () => {
      const twoItemLayout: TLayout = [
        { h: 2, i: `a`, w: 2, x: 0, y: 0 },
        { h: 2, i: `b`, w: 2, x: 6, y: 4 },
      ];
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout: twoItemLayout, margin: [10, 10], rowHeight: 100, snapThreshold: 1, snapToGrid: true });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      // x:7 is 1 unit shy of "b"'s own left edge (x:6), within snapThreshold
      // — should snap to x:6, and the placeholder should reflect that
      // snapped value, not the raw, pre-snap x:7.
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `a`, w: 2, x: 7, y: 4 });

      expect(component.placeholder?.x).toBe(6);
    });

    it(`Should clear isDragging and placeholder when a cross-grid drag is accepted by another registered grid`, () => {
      const mockRect = (element: HTMLElement, rect: Partial<DOMRect>): void => {
        element.getBoundingClientRect = () => ({
          bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, toJSON: () => ({}), ...rect,
        });
      };
      const sourceLayout: TLayout = [{ h: 2, i: `a`, w: 2, x: 0, y: 0 }];
      setInputsAndDetectChanges({ allowCrossGridDrag: true, colNum: 12, containerWidth: 1220, layout: sourceLayout, layoutId: `source`, margin: [10, 10], rowHeight: 100 });
      const sourceContainer = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      mockRect(sourceContainer, { bottom: 300, left: 0, right: 300, top: 0 });

      const targetFixture = TestBed.createComponent(GridLayoutComponent);
      const target = targetFixture.componentInstance;
      Object.assign(target, { allowCrossGridDrag: true, colNum: 12, layout: [], layoutId: `target` });
      target.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
      targetFixture.detectChanges();
      const targetContainer = targetFixture.nativeElement.querySelector(`div`) as HTMLDivElement;
      mockRect(targetContainer, { bottom: 300, left: 500, right: 800, top: 0 });

      const eventBus = fixture.debugElement.injector.get(GridEventBusService);
      eventBus.emitItemDrag({ clientX: 100, clientY: 100, eventType: `dragstart`, h: 2, i: `a`, w: 2, x: 0, y: 0 });
      expect(component.isDragging).toBe(true);

      // Drop point falls inside the target's own rect — accepted, source
      // takes the early-return path in handleItemDrag.
      eventBus.emitItemDrag({ clientX: 600, clientY: 100, eventType: `dragend`, h: 2, i: `a`, w: 2, x: 2, y: 0 });

      expect(component.isDragging).toBe(false);
      expect(component.placeholder).toBeNull();

      targetFixture.nativeElement.remove();
    });

    it(`Should render the custom placeholderTemplate's own content, with the correct placeholder/isDragging context, during a regular in-grid drag`, () => {
      @Component({
        imports: [GridLayoutComponent, GridItemComponent],
        standalone: true,
        template: `
          <kdl-grid-layout [colNum]="12" [layout]="layout" [margin]="[10, 10]" [rowHeight]="100">
            <kdl-grid-item [h]="2" i="0" [w]="2" [x]="0" [y]="0">item</kdl-grid-item>
            <ng-template #placeholder let-placeholder let-dragging="isDragging">
              <span class="custom-placeholder-marker" [attr.data-x]="placeholder?.x" [attr.data-y]="placeholder?.y" [attr.data-dragging]="dragging"></span>
            </ng-template>
          </kdl-grid-layout>
        `,
      })
      class TestHostComponent {
        layout: TLayout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }];
      }

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [TestHostComponent] });
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();

      const layoutDebugEl = hostFixture.debugElement.query(el => el.componentInstance instanceof GridLayoutComponent);
      const layoutComponent = layoutDebugEl.componentInstance as GridLayoutComponent;
      expect(layoutComponent.placeholderTemplate).toBeTruthy();

      // Real measurement, same jsdom limitation and same fix as this
      // file's own earlier containerWidth tests — GridLayoutComponent has
      // no `containerWidth` @Input() at all (it's a public field, measured
      // internally via ResizeObserver); mocking the inner container div's
      // own offsetWidth and calling ngAfterViewInit() again directly is
      // what actually populates it here, not a template binding.
      const containerDiv = layoutDebugEl.nativeElement.querySelector(`div`) as HTMLDivElement;
      Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: 1220 });
      layoutComponent.ngAfterViewInit();

      const eventBus = layoutDebugEl.injector.get(GridEventBusService);
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragmove`, h: 2, i: `0`, w: 2, x: 3, y: 1 });
      hostFixture.detectChanges();

      const marker = hostFixture.nativeElement.querySelector(`.custom-placeholder-marker`) as HTMLElement;
      expect(marker).toBeTruthy();
      expect(marker.getAttribute(`data-x`)).toBe(`3`);
      expect(marker.getAttribute(`data-y`)).toBe(`1`);
      expect(marker.getAttribute(`data-dragging`)).toBe(`true`);
      // The fallback plain placeholder div should not also render.
      expect(hostFixture.nativeElement.querySelector(`.kdl-grid-placeholder`)).toBeFalsy();

      hostFixture.nativeElement.remove();
    });

    it(`Should fall back to the existing plain .kdl-grid-placeholder div when no placeholderTemplate is provided at all`, () => {
      setInputsAndDetectChanges({ colNum: 12, containerWidth: 1220, layout, margin: [10, 10], rowHeight: 100 });
      const eventBus = fixture.debugElement.injector.get(GridEventBusService);

      eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: `dragstart`, h: 2, i: `0`, w: 2, x: 0, y: 0 });
      fixture.detectChanges();

      expect(component.placeholderTemplate).toBeUndefined();
      expect(fixture.nativeElement.querySelector(`.kdl-grid-placeholder`)).toBeTruthy();
    });
  });
});
