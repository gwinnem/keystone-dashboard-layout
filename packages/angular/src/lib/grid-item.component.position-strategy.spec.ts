import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimpleChanges } from '@angular/core';
import type { IPositionStrategy } from 'keystone-dashboard-layout-core';
import { GridItemComponent } from './grid-item.component';
import { GridEventBusService } from './grid-event-bus.service';

/** Puts every item at a fixed, recognisable spot so a test can tell this strategy's style from the built-in ones. */
const markerStrategy: IPositionStrategy = {
  className: `my-position`,
  getStyle: ({ width, height }) => ({ height: `${height}px`, left: `7px`, position: `absolute`, top: `9px`, width: `${width}px` }),
  type: `marker`,
};

describe(`GridItemComponent positionStrategy`, () => {
  let fixture: ComponentFixture<GridItemComponent>;
  let component: GridItemComponent;
  let bus: GridEventBusService;

  const styleAsMap = (): Record<string, string | undefined> => component.style as Record<string, string | undefined>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GridItemComponent],
      providers: [GridEventBusService],
    }).compileComponents();

    bus = TestBed.inject(GridEventBusService);
    bus.setContainerWidth(1200);
    fixture = TestBed.createComponent(GridItemComponent);
    component = fixture.componentInstance;
    Object.assign(component, { h: 2, i: `0`, w: 2, x: 0, y: 0 });
    component.ngOnChanges({} as SimpleChanges);
    fixture.detectChanges();
  });

  const hostElement = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it(`Should position with CSS transforms by default, with no extra class`, () => {
    expect(styleAsMap()[`transform`]).toContain(`translate3d`);
    expect(hostElement().classList.contains(`my-position`)).toBe(false);
  });

  it(`Should keep using useCssTransforms: false when no strategy is given`, () => {
    bus.setUseCssTransforms(false);
    fixture.detectChanges();

    expect(styleAsMap()[`transform`]).toBeUndefined();
    expect(styleAsMap()[`top`]).toBeDefined();
  });

  it(`Should use a custom strategy's style and class once the grid supplies one`, () => {
    bus.setPositionStrategy(markerStrategy);
    fixture.detectChanges();

    expect(styleAsMap()[`left`]).toBe(`7px`);
    expect(styleAsMap()[`top`]).toBe(`9px`);
    expect(hostElement().classList.contains(`my-position`)).toBe(true);
  });

  it(`Should let positionStrategy win over useCssTransforms`, () => {
    bus.setUseCssTransforms(true);
    bus.setPositionStrategy(markerStrategy);
    fixture.detectChanges();

    expect(styleAsMap()[`transform`]).toBeUndefined();
    expect(styleAsMap()[`left`]).toBe(`7px`);
  });

  it(`Should add no class for a strategy that does not ask for one`, () => {
    bus.setPositionStrategy({ ...markerStrategy, className: undefined });
    fixture.detectChanges();

    expect(hostElement().classList.contains(`my-position`)).toBe(false);
    expect(component.positionStrategyClass).toBe(``);
  });

  it(`Should go back to the built-in strategy when the grid clears it`, () => {
    bus.setPositionStrategy(markerStrategy);
    fixture.detectChanges();
    bus.setPositionStrategy(null);
    fixture.detectChanges();

    expect(styleAsMap()[`transform`]).toContain(`translate3d`);
    expect(hostElement().classList.contains(`my-position`)).toBe(false);
  });

  it(`Should pass rtl and the right anchor to the strategy when the item is mirrored`, () => {
    const seen: Parameters<IPositionStrategy['getStyle']>[0][] = [];
    bus.setPositionStrategy({
      getStyle: input => {
        seen.push(input);
        return markerStrategy.getStyle(input);
      },
      type: `spy`,
    });
    bus.setGridDefaults({ ...bus['gridDefaultsSubject'].value, isMirrored: true });
    fixture.detectChanges();

    const last = seen[seen.length - 1];
    expect(last.rtl).toBe(true);
    expect(typeof last.right).toBe(`number`);
    expect(last.left).toBeUndefined();
  });
});
