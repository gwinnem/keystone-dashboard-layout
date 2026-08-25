import { TestBed } from '@angular/core/testing';
import { GridEventBusService } from './grid-event-bus.service';

/**
 * Phase 2 unit tests (see `docs/IMPLEMENTATION_PLAN.md`'s own Phase 2
 * scope note) — the service in isolation, confirming default values
 * and that each `setXxx` method updates its own `BehaviorSubject`
 * correctly. The DI-scoping behavior itself (one instance per
 * `GridLayoutComponent`, a `GridItemComponent` descendant picking it up
 * automatically) is exercised in `grid-layout.component.spec.ts`'s own
 * integration-style tests instead, since that's a real component-tree
 * question this service's own isolated tests can't meaningfully cover.
 */
describe(`GridEventBusService`, () => {
  let service: GridEventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GridEventBusService] });
    service = TestBed.inject(GridEventBusService);
  });

  it(`Should default containerWidth$ to 0`, done => {
    service.containerWidth$.subscribe(value => {
      expect(value).toBe(0);
      done();
    });
  });

  it(`Should default colNum$ to 12`, done => {
    service.colNum$.subscribe(value => {
      expect(value).toBe(12);
      done();
    });
  });

  it(`Should default rowHeight$ to 150`, done => {
    service.rowHeight$.subscribe(value => {
      expect(value).toBe(150);
      done();
    });
  });

  it(`Should default margin$ to [10, 10]`, done => {
    service.margin$.subscribe(value => {
      expect(value).toEqual([10, 10]);
      done();
    });
  });

  it(`Should default useCssTransforms$ to true`, done => {
    service.useCssTransforms$.subscribe(value => {
      expect(value).toBe(true);
      done();
    });
  });

  it(`Should emit a new value on containerWidth$ after setContainerWidth`, () => {
    const seen: number[] = [];
    service.containerWidth$.subscribe(value => seen.push(value));

    service.setContainerWidth(1220);

    expect(seen).toEqual([0, 1220]);
  });

  it(`Should emit a new value on colNum$ after setColNum`, () => {
    const seen: number[] = [];
    service.colNum$.subscribe(value => seen.push(value));

    service.setColNum(6);

    expect(seen).toEqual([12, 6]);
  });

  it(`Should emit a new value on rowHeight$ after setRowHeight`, () => {
    const seen: number[] = [];
    service.rowHeight$.subscribe(value => seen.push(value));

    service.setRowHeight(80);

    expect(seen).toEqual([150, 80]);
  });

  it(`Should emit a new value on margin$ after setMargin`, () => {
    const seen: [number, number][] = [];
    service.margin$.subscribe(value => seen.push(value));

    service.setMargin([20, 5]);

    expect(seen).toEqual([[10, 10], [20, 5]]);
  });

  it(`Should emit a new value on useCssTransforms$ after setUseCssTransforms`, () => {
    const seen: boolean[] = [];
    service.useCssTransforms$.subscribe(value => seen.push(value));

    service.setUseCssTransforms(false);

    expect(seen).toEqual([true, false]);
  });

  it(`Should give a late subscriber the current value immediately, not just future emissions`, () => {
    service.setContainerWidth(1220);
    service.setColNum(6);

    const seen: number[] = [];
    // Subscribing after both setters above already ran — a plain
    // Subject would give this subscriber nothing at all until the next
    // emission; BehaviorSubject's whole reason for being chosen here
    // (see grid-item.component.ts's own doc comment) is that a late
    // subscriber still immediately gets the current value.
    service.containerWidth$.subscribe(value => seen.push(value));

    expect(seen).toEqual([1220]);
  });

  it(`Should keep two separate service instances fully independent`, () => {
    const other = TestBed.runInInjectionContext(() => new GridEventBusService());

    service.setContainerWidth(1220);

    let otherValue: number | undefined;
    other.containerWidth$.subscribe(value => {
      otherValue = value;
    });

    expect(otherValue).toBe(0);
  });
});
