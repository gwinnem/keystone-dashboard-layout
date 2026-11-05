import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { SimpleChanges } from '@angular/core';
import { GridLayoutComponent } from './grid-layout.component';
import { GridEventBusService } from './grid-event-bus.service';
import type { TLayout } from 'keystone-dashboard-layout-core';

describe(`GridLayoutComponent collisionMode`, () => {
  let fixture: ComponentFixture<GridLayoutComponent>;
  let component: GridLayoutComponent;
  let eventBus: GridEventBusService;
  let emitted: TLayout[];

  const buildLayout = (): TLayout => [
    { h: 2, i: `a`, w: 2, x: 0, y: 0 },
    { h: 2, i: `b`, w: 2, x: 4, y: 0 },
    { h: 2, i: `c`, w: 2, x: 8, y: 0 },
  ];

  const pos = (layout: TLayout, id: string): [number, number] => {
    const item = layout.find(entry => entry.i === id)!;
    return [item.x, item.y];
  };
  const last = (): TLayout => emitted[emitted.length - 1];

  const setup = (inputs: Partial<GridLayoutComponent>): void => {
    Object.assign(component, { colNum: 12, layout: buildLayout(), ...inputs });
    component.ngOnChanges({ layout: {} } as unknown as SimpleChanges);
    fixture.detectChanges();
    eventBus = fixture.debugElement.injector.get(GridEventBusService);
    emitted = [];
    component.layoutChange.subscribe((next: TLayout) => emitted.push(next));
  };

  const drag = (type: `dragstart` | `dragmove` | `dragend`, id: string, x: number, y = 0): void => {
    eventBus.emitItemDrag({ clientX: 0, clientY: 0, eventType: type, h: 2, i: id, w: 2, x, y });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GridLayoutComponent] }).compileComponents();
    fixture = TestBed.createComponent(GridLayoutComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.nativeElement.remove();
  });

  it(`Should default to push`, () => {
    expect(component.collisionMode).toBe(`push`);
  });

  it(`Should leave the item underneath where the push puts it, by default`, () => {
    setup({});

    drag(`dragstart`, `a`, 0);
    drag(`dragmove`, `a`, 4);
    drag(`dragend`, `a`, 4);

    expect(pos(last(), `a`)).toEqual([4, 0]);
    expect(pos(last(), `b`)).not.toEqual([0, 0]);
  });

  it(`Should swap the two items when collisionMode is swap`, () => {
    setup({ collisionMode: `swap` });

    drag(`dragstart`, `a`, 0);
    drag(`dragmove`, `a`, 4);
    drag(`dragend`, `a`, 4);

    expect(pos(last(), `a`)).toEqual([4, 0]);
    expect(pos(last(), `b`)).toEqual([0, 0]);
    expect(pos(last(), `c`)).toEqual([8, 0]);
  });

  it(`Should put the swapped item back when the drag moves on`, () => {
    setup({ collisionMode: `swap` });

    drag(`dragstart`, `a`, 0);
    drag(`dragmove`, `a`, 4);
    expect(pos(last(), `b`)).toEqual([0, 0]);

    drag(`dragmove`, `a`, 0);
    drag(`dragend`, `a`, 0);

    expect(pos(last(), `a`)).toEqual([0, 0]);
    expect(pos(last(), `b`)).toEqual([4, 0]);
  });

  it(`Should swap on a partial overlap too, as long as the other item fits the dragged item's starting cell`, () => {
    setup({ collisionMode: `swap` });

    drag(`dragstart`, `b`, 4);
    // x=7 overlaps c (8-9) only partly; c is the single item hit and fits b's starting cell.
    drag(`dragmove`, `b`, 7);
    drag(`dragend`, `b`, 7);

    expect(pos(last(), `b`)).toEqual([7, 0]);
    expect(pos(last(), `c`)).toEqual([4, 0]);
  });

  it(`Should ignore swap while preventCollision is on`, () => {
    setup({ collisionMode: `swap`, preventCollision: true });

    drag(`dragstart`, `a`, 0);
    drag(`dragmove`, `a`, 4);
    drag(`dragend`, `a`, 4);

    expect(pos(last(), `a`)).toEqual([0, 0]);
    expect(pos(last(), `b`)).toEqual([4, 0]);
  });

  it(`Should start every drag with a fresh swap state`, () => {
    setup({ collisionMode: `swap` });

    drag(`dragstart`, `a`, 0);
    drag(`dragmove`, `a`, 4);
    drag(`dragend`, `a`, 4);

    drag(`dragstart`, `a`, 4);
    drag(`dragmove`, `a`, 0);
    drag(`dragend`, `a`, 0);

    expect(pos(last(), `a`)).toEqual([0, 0]);
    expect(pos(last(), `b`)).toEqual([4, 0]);
  });
});
