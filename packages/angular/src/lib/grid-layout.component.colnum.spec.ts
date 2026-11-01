import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ECompactType, type ICompactor, type TLayout } from 'keystone-dashboard-layout-core';
import { GridItemComponent } from './grid-item.component';
import { GridLayoutComponent } from './grid-layout.component';

/**
 * A changed `colNum` re-fits the layout to the new column count (Vue does the same: its `colNum` watcher always runs the
 * responsive-layout pass). Before this, going from 12 to 6 columns left items at x: 6 and x: 8, drawn off the right edge, with
 * nothing reported through `layoutChange`.
 */

// Five items in a row, the last two past column 6 (the layout of the docs' "Basic drag & resize" example).
const wideRow = (): TLayout => [
  { h: 2, i: `a`, w: 2, x: 0, y: 0 },
  { h: 2, i: `b`, w: 2, x: 2, y: 0 },
  { h: 2, i: `c`, w: 2, x: 4, y: 0 },
  { h: 4, i: `d`, w: 2, x: 6, y: 0 },
  { h: 2, i: `e`, w: 2, x: 8, y: 0 },
];

@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  standalone: true,
  template: `
    <kdl-grid-layout
      [colNum]="colNum"
      [compactor]="compactor"
      [compactType]="compactType"
      [layout]="layout"
      [margin]="[10, 10]"
      [responsive]="responsive"
      [rowHeight]="60"
      (columnsChanged)="columnsChanges.push($event)"
      (layoutChange)="onLayoutChange($event)">
      @for (entry of layout; track entry.i) {
        <kdl-grid-item [h]="entry.h" [i]="entry.i" [w]="entry.w" [x]="entry.x" [y]="entry.y">{{ entry.i }}</kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
class HostComponent {
  colNum = 12;
  columnsChanges: number[] = [];
  compactor: ICompactor | null = null;
  compactType: ECompactType = ECompactType.VERTICAL;
  /** What a consumer bound with `(layoutChange)="layout = $event"` does; switched off to look at the emitted layout alone. */
  feedBack = true;
  layout: TLayout = wideRow();
  layoutChanges: TLayout[] = [];
  responsive = false;

  onLayoutChange(next: TLayout): void {
    this.layoutChanges.push(next);
    if(this.feedBack) {
      this.layout = next;
    }
  }
}

describe(`GridLayoutComponent colNum change`, () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let grid: GridLayoutComponent;
  let restoreStubs: (() => void)[] = [];

  /** jsdom lays nothing out, so the grid's measured width is stubbed on the prototype (a getter on the element itself would not survive the items' own lookups). */
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

  /** Renders the host, then lets the grid measure a container `width` px wide (the way the other specs do: after the first render, then `ngAfterViewInit()` again). */
  const mount = (setup: (instance: HostComponent) => void = () => undefined, width = 1200): void => {
    unstub();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    setup(host);
    fixture.detectChanges();
    stubGetter(`offsetWidth`, () => width);
    grid = fixture.debugElement.query(By.directive(GridLayoutComponent)).componentInstance as GridLayoutComponent;
    grid.ngAfterViewInit();
    fixture.detectChanges();
  };

  /** Sets the new `colNum` and runs change detection, with whatever the mount reported already out of the way. */
  const changeColNum = (colNum: number): void => {
    host.layoutChanges = [];
    host.colNum = colNum;
    fixture.detectChanges();
    fixture.detectChanges();
  };

  const lastLayout = (): TLayout => host.layoutChanges[host.layoutChanges.length - 1];
  const entryOf = (layout: TLayout, id: string): TLayout[number] => layout.find(entry => entry.i === id)!;
  const overlaps = (a: TLayout[number], b: TLayout[number]): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  const expectFitsAndSeparate = (layout: TLayout, cols: number): void => {
    layout.forEach(entry => {
      expect(entry.x).toBeGreaterThanOrEqual(0);
      expect(entry.x + entry.w).toBeLessThanOrEqual(cols);
    });
    layout.forEach((entry, index) => {
      layout.slice(index + 1).forEach(other => {
        expect(overlaps(entry, other)).toBe(false);
      });
    });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    unstub();
  });

  it(`Should pull items past the last column back inside when colNum shrinks, and report it`, () => {
    mount();

    changeColNum(6);

    expect(host.layoutChanges).toHaveLength(1);
    expectFitsAndSeparate(lastLayout(), 6);
  });

  it(`Should leave the items that already fit where they are`, () => {
    mount();

    changeColNum(6);

    expect(entryOf(lastLayout(), `a`)).toMatchObject({ x: 0, y: 0 });
    expect(entryOf(lastLayout(), `b`)).toMatchObject({ x: 2, y: 0 });
    expect(entryOf(lastLayout(), `c`)).toMatchObject({ x: 4, y: 0 });
  });

  it(`Should compact the re-fitted layout, not just clamp it`, () => {
    mount();

    changeColNum(6);

    // d and e had nowhere to go on row 0 (a, b and c fill all six columns), so they sit below it.
    const d = entryOf(lastLayout(), `d`);
    const e = entryOf(lastLayout(), `e`);
    expect(d.y).toBeGreaterThanOrEqual(2);
    expect(e.y).toBeGreaterThanOrEqual(2);
    expect(Math.min(d.y, e.y)).toBe(2);
  });

  it(`Should not change the layout array the consumer passed in`, () => {
    const original = wideRow();
    mount(instance => {
      instance.layout = original;
      instance.feedBack = false;
    });

    changeColNum(6);

    expect(original).toEqual(wideRow());
  });

  it(`Should report nothing when the new colNum needs no change to the layout`, () => {
    mount(instance => {
      instance.layout = wideRow().slice(0, 2);
    });

    changeColNum(6);

    expect(host.layoutChanges).toHaveLength(0);
  });

  it(`Should report nothing when colNum grows`, () => {
    mount(instance => {
      instance.colNum = 6;
      instance.layout = wideRow().slice(0, 3);
    });

    changeColNum(12);

    expect(host.layoutChanges).toHaveLength(0);
  });

  it(`Should not re-fit anything on the initial mount`, () => {
    mount();

    expect(host.layoutChanges).toHaveLength(0);
  });

  it(`Should fire layoutChange once, not again when the consumer passes the reported layout back`, () => {
    mount();

    changeColNum(6);

    // `feedBack` is on by default: the reported layout came back through the `layout` input before this assertion.
    expect(host.layoutChanges).toHaveLength(1);
    expect(host.layout).toBe(lastLayout());
  });

  it(`Should still report columnsChanged with the new value`, () => {
    mount();

    changeColNum(6);

    expect(host.columnsChanges).toEqual([6]);
  });

  it(`Should re-fit with responsive on too, inside the same breakpoint`, () => {
    // 1200px is the `lg` breakpoint (12 columns) with the default breakpoints, so colNum is the only thing that changes.
    mount(instance => {
      instance.responsive = true;
    });

    changeColNum(6);

    expect(host.layoutChanges.length).toBeGreaterThan(0);
    expectFitsAndSeparate(lastLayout(), 6);
  });

  it(`Should keep a responsive grid on its breakpoint's columns when colNum is raised above them`, () => {
    // 800px is the `sm` breakpoint (6 columns): colNum is only a ceiling over that, so 20 changes nothing.
    mount(instance => {
      instance.responsive = true;
    }, 800);

    changeColNum(20);

    expect((grid as unknown as { effectiveColNum: number }).effectiveColNum).toBe(6);
    expect(host.layoutChanges).toHaveLength(0);
  });

  it(`Should take colNum outright when responsive is off, even above the columns of the breakpoint the width falls in`, () => {
    // 800px is the `sm` breakpoint (6 columns), but nothing is responsive, so colNum alone decides.
    mount(undefined, 800);

    changeColNum(20);

    expect((grid as unknown as { effectiveColNum: number }).effectiveColNum).toBe(20);
  });

  it(`Should take colNum outright while a responsive grid is still unmeasured`, () => {
    // No width yet (0): there is no breakpoint to read the columns from, so 0 must not stand in for the smallest one.
    mount(instance => {
      instance.responsive = true;
    }, 0);

    changeColNum(6);

    expect((grid as unknown as { effectiveColNum: number }).effectiveColNum).toBe(6);
  });

  it(`Should hand the compactor the grid's compactType when re-fitting`, () => {
    const compact = jest.fn((layout: TLayout) => layout);
    mount(instance => {
      instance.compactor = { compact } as unknown as ICompactor;
      instance.compactType = ECompactType.HORIZONTAL;
    });

    changeColNum(6);

    expect(compact).toHaveBeenCalledWith(expect.anything(), 6, { compactType: ECompactType.HORIZONTAL });
  });

  it(`Should hold a responsive grid at colNum when that is below its breakpoint's columns`, () => {
    mount(instance => {
      instance.responsive = true;
    }, 800);

    changeColNum(4);

    expect((grid as unknown as { effectiveColNum: number }).effectiveColNum).toBe(4);
    expectFitsAndSeparate(lastLayout(), 4);
  });
});
