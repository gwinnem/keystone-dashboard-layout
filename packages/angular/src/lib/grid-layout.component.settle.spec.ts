import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimpleChanges } from '@angular/core';
import type { TLayout } from 'keystone-dashboard-layout-core';
import { GridLayoutComponent } from './grid-layout.component';

/**
 * A grid keeps its items' transitions off (`--grid-transition-duration: 0ms`) until it has been painted once at its measured
 * width — two animation frames after the first measurement. Before this, the items sat at provisional positions on load and
 * then animated into the measured ones.
 */
describe(`GridLayoutComponent settling`, () => {
  let fixture: ComponentFixture<GridLayoutComponent>;
  let component: GridLayoutComponent;
  let queue: Map<number, FrameRequestCallback>;
  let nextId: number;
  let settleRequests: number;
  let cancelled: number[];

  const layout: TLayout = [
    { h: 2, i: `0`, w: 2, x: 0, y: 0 },
    { h: 3, i: `1`, w: 2, x: 2, y: 0 },
  ];

  /** Runs every callback queued right now; callbacks queued while running wait for the next frame. */
  const runFrame = (): void => {
    const pending = [...queue.values()];
    queue.clear();
    pending.forEach(callback => callback(0));
  };

  const duration = (): unknown => component.containerStyle[`--grid-transition-duration`];

  /** Ids of the settle frames still waiting to run (other code queues frames of its own, so the queue's size says nothing). */
  const pendingSettleIds = (): number[] =>
    [...queue.entries()].filter(([, callback]) => callback.toString().includes(`hasSettled`)).map(([id]) => id);

  const setInputs = (inputs: Partial<GridLayoutComponent>): void => {
    Object.assign(component, inputs);
    component.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
    fixture.detectChanges();
  };

  /** jsdom lays nothing out, so the container's measured width is stubbed, then measured again by hand. */
  const measure = (width: number): void => {
    const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
    Object.defineProperty(containerDiv, `offsetWidth`, { configurable: true, value: width });
    component.ngAfterViewInit();
  };

  beforeEach(async () => {
    queue = new Map();
    nextId = 1;
    settleRequests = 0;
    cancelled = [];
    jest.spyOn(window, `requestAnimationFrame`).mockImplementation(callback => {
      // Other code may request frames of its own; the settle frames are told apart by their own source.
      if(callback.toString().includes(`hasSettled`)) {
        settleRequests += 1;
      }
      const id = nextId++;
      queue.set(id, callback);
      return id;
    });
    jest.spyOn(window, `cancelAnimationFrame`).mockImplementation(id => {
      cancelled.push(id);
      queue.delete(id);
    });

    await TestBed.configureTestingModule({ imports: [GridLayoutComponent] }).compileComponents();
    fixture = TestBed.createComponent(GridLayoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    jest.restoreAllMocks();
  });

  it(`Should keep transitions off before the container has been measured`, () => {
    setInputs({ layout, transitionDurationMs: 350 });

    expect(duration()).toBe(`0ms`);
  });

  it(`Should not schedule any settle frame while the container has no width`, () => {
    setInputs({ layout, transitionDurationMs: 350 });

    expect(settleRequests).toBe(0);
    expect(pendingSettleIds()).toHaveLength(0);
  });

  it(`Should keep transitions off right after the first measurement`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);

    expect(duration()).toBe(`0ms`);
  });

  it(`Should still have transitions off after one frame`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();

    expect(duration()).toBe(`0ms`);
  });

  it(`Should switch transitions on, at the configured duration, after two frames`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();
    runFrame();

    expect(duration()).toBe(`350ms`);
  });

  it(`Should use the default duration (200ms) once settled when none is set`, () => {
    setInputs({ layout });
    measure(800);
    runFrame();
    runFrame();

    expect(duration()).toBe(`200ms`);
  });

  it(`Should render the settled duration into the container element`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    const containerDiv = fixture.nativeElement.querySelector(`div`) as HTMLDivElement;
    fixture.detectChanges();
    expect(containerDiv.style.getPropertyValue(`--grid-transition-duration`)).toBe(`0ms`);

    runFrame();
    runFrame();
    fixture.detectChanges();

    expect(containerDiv.style.getPropertyValue(`--grid-transition-duration`)).toBe(`350ms`);
  });

  it(`Should keep the timing function applied throughout`, () => {
    setInputs({ layout, transitionTimingFunction: `ease-in-out` });
    expect(component.containerStyle[`--grid-transition-timing`]).toBe(`ease-in-out`);

    measure(800);
    runFrame();
    runFrame();

    expect(component.containerStyle[`--grid-transition-timing`]).toBe(`ease-in-out`);
  });

  it(`Should apply a duration changed before settling only once it has settled`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);

    setInputs({ transitionDurationMs: 500 });
    expect(duration()).toBe(`0ms`);

    runFrame();
    runFrame();

    expect(duration()).toBe(`500ms`);
  });

  it(`Should apply a duration changed after settling straight away`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();
    runFrame();

    setInputs({ transitionDurationMs: 500 });

    expect(duration()).toBe(`500ms`);
  });

  it(`Should only schedule its two settle frames once, however often it is re-measured afterwards`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();
    runFrame();
    expect(settleRequests).toBe(2);

    measure(600);
    measure(900);

    expect(settleRequests).toBe(2);
  });

  it(`Should stay settled when the container later reports a zero width`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();
    runFrame();

    measure(0);

    expect(duration()).toBe(`350ms`);
  });

  it(`Should settle once a container that started unmeasurable gains a width`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(0);
    expect(settleRequests).toBe(0);

    measure(700);
    expect(duration()).toBe(`0ms`);
    runFrame();
    runFrame();

    expect(duration()).toBe(`350ms`);
  });

  it(`Should cancel its pending settle frame when destroyed before the first frame`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    const ids = pendingSettleIds();
    expect(ids).toHaveLength(1);

    component.ngOnDestroy();

    expect(cancelled).toContain(ids[0]);
    expect(pendingSettleIds()).toHaveLength(0);
  });

  it(`Should cancel the second settle frame too when destroyed between the two frames`, () => {
    setInputs({ layout, transitionDurationMs: 350 });
    measure(800);
    runFrame();
    const ids = pendingSettleIds();
    expect(ids).toHaveLength(1);

    component.ngOnDestroy();

    expect(cancelled).toContain(ids[0]);
    expect(pendingSettleIds()).toHaveLength(0);
    expect(duration()).toBe(`0ms`);
  });

  it(`Should not cancel anything when destroyed without having scheduled a frame`, () => {
    setInputs({ layout });

    component.ngOnDestroy();

    expect(cancelled).toHaveLength(0);
  });
});
