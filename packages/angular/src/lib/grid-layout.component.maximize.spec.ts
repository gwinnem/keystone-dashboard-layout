import { Component } from '@angular/core';
import type { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ECompactType, type ICompactor, type IGridAriaLabels, type ILayoutItem, type TLayout } from 'keystone-dashboard-layout-core';
import { GridEventBusService } from './grid-event-bus.service';
import { GridItemComponent } from './grid-item.component';
import { GridLayoutComponent } from './grid-layout.component';

interface IResizedEvent {
  h: number;
  height: number;
  i: string | number;
  w: number;
  width: number;
}

const trio = (): TLayout => [
  { h: 2, i: `0`, w: 2, x: 0, y: 0 },
  { h: 2, i: `1`, w: 2, x: 2, y: 0 },
  { h: 2, i: `2`, w: 2, x: 0, y: 2 },
];

@Component({
  imports: [GridLayoutComponent, GridItemComponent],
  standalone: true,
  template: `
    <kdl-grid-layout
      [ariaLabels]="ariaLabels"
      [colNum]="12"
      [compactor]="compactor"
      [compactType]="compactType"
      [enableEditMode]="enableEditMode"
      [isMirrored]="isMirrored"
      [layout]="layout"
      [margin]="[10, 10]"
      [maximizedItem]="maximizedItem"
      [multiSelect]="multiSelect"
      [rowHeight]="100"
      [showCloseButton]="showCloseButton"
      [showMaximizeButton]="showMaximizeButton"
      [useCssTransforms]="useCssTransforms"
      (layoutChange)="layoutChanges.push($event)"
      (maximizedItemChange)="maximizedChanges.push($event)">
      @for (entry of layout; track entry.i) {
        <kdl-grid-item
          [h]="entry.h"
          [i]="entry.i"
          [isStatic]="entry.isStatic ?? false"
          [showMaximizeButton]="itemShowMaximizeButton"
          [w]="entry.w"
          [x]="entry.x"
          [y]="entry.y"
          (itemResized)="resized.push($event)">content {{ entry.i }}</kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
})
class HostComponent {
  ariaLabels: IGridAriaLabels = {};
  compactor: ICompactor | null = null;
  compactType: ECompactType = ECompactType.VERTICAL;
  enableEditMode = true;
  isMirrored = false;
  itemShowMaximizeButton: boolean | null = null;
  layout: TLayout = trio();
  layoutChanges: TLayout[] = [];
  maximizedChanges: (string | number | null)[] = [];
  maximizedItem: string | number | null = null;
  multiSelect = false;
  resized: IResizedEvent[] = [];
  showCloseButton = false;
  showMaximizeButton = false;
  useCssTransforms = true;
}

describe(`GridLayoutComponent maximize / restore`, () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let grid: GridLayoutComponent;
  let gridHeight: number;
  let restoreStubs: (() => void)[] = [];

  /** jsdom lays nothing out, so the grid's measured size is stubbed on the prototype (a getter on the element itself would not survive the items' own lookups). */
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

  /** Renders the host, then lets the grid measure a 1200 × 500 container (the way the other specs do: after the first render, then `ngAfterViewInit()` again). */
  const mount = (setup: (instance: HostComponent) => void = () => undefined): void => {
    unstub();
    gridHeight = 500;
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    setup(host);
    fixture.detectChanges();
    stubGetter(`offsetWidth`, () => 1200);
    stubGetter(`clientHeight`, () => gridHeight);
    grid = fixture.debugElement.query(By.directive(GridLayoutComponent)).componentInstance as GridLayoutComponent;
    grid.ngAfterViewInit();
    fixture.detectChanges();
  };

  const itemDebug = (id: string | number): DebugElement => fixture.debugElement.queryAll(By.directive(GridItemComponent)).find(entry => (entry.componentInstance as GridItemComponent).i === id)!;
  const itemEl = (id: string | number): HTMLElement => itemDebug(id).nativeElement as HTMLElement;
  const itemStyle = (id: string | number): Record<string, string | undefined> => (itemDebug(id).componentInstance as GridItemComponent).style as Record<string, string | undefined>;
  const isHidden = (id: string | number): boolean => itemEl(id).style.display === `none`;
  const maximizeButton = (id: string | number): HTMLButtonElement | null => itemEl(id).querySelector(`.btn-maximize`);
  const buttonLabel = (id: string | number): string => (itemEl(id).querySelector(`.btn-maximize .kdl-visually-hidden`)?.textContent ?? ``).trim();
  const lastLayout = (): TLayout => host.layoutChanges[host.layoutChanges.length - 1];
  const entryOf = (layout: TLayout, id: string): ILayoutItem => layout.find(entry => entry.i === id)!;
  const keydown = (id: string | number, key: string): void => {
    itemEl(id).dispatchEvent(new KeyboardEvent(`keydown`, { bubbles: true, cancelable: true, key }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    unstub();
  });

  describe(`maximizing`, () => {
    it(`Should fill the grid minus one margin on each side`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      const style = itemStyle(`1`);

      expect(style[`transform`]).toBe(`translate3d(10px,10px, 0)`);
      expect(style[`width`]).toBe(`1180px`);
      expect(style[`height`]).toBe(`480px`);
    });

    it(`Should hide every other item but keep it mounted`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      expect(itemDebug(`0`)).toBeTruthy();
      expect(itemDebug(`2`)).toBeTruthy();
      expect(isHidden(`0`)).toBe(true);
      expect(isHidden(`2`)).toBe(true);
      expect(isHidden(`1`)).toBe(false);
    });

    it(`Should mark the maximized item with a class`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      expect(itemEl(`1`).classList.contains(`kdl-grid-item--maximized`)).toBe(true);
      expect(itemEl(`0`).classList.contains(`kdl-grid-item--maximized`)).toBe(false);
    });

    it(`Should maximize and restore through the public methods`, () => {
      mount();
      expect(grid.maximizedItem).toBeNull();

      grid.maximize(`2`);
      fixture.detectChanges();
      expect(grid.maximizedItem).toBe(`2`);
      expect(itemStyle(`2`)[`width`]).toBe(`1180px`);

      grid.restore();
      fixture.detectChanges();
      expect(grid.maximizedItem).toBeNull();
      expect(isHidden(`0`)).toBe(false);
    });

    it(`Should switch straight to another item`, () => {
      mount(instance => {
        instance.maximizedItem = `0`;
      });

      grid.maximize(`1`);
      fixture.detectChanges();

      expect(isHidden(`0`)).toBe(true);
      expect(isHidden(`1`)).toBe(false);
      expect(itemStyle(`1`)[`width`]).toBe(`1180px`);
    });

    it(`Should toggle with toggleMaximize`, () => {
      mount();

      grid.toggleMaximize(`1`);
      expect(grid.maximizedItem).toBe(`1`);

      grid.toggleMaximize(`2`);
      expect(grid.maximizedItem).toBe(`2`);

      grid.toggleMaximize(`2`);
      expect(grid.maximizedItem).toBeNull();
    });

    it(`Should follow the maximizedItem input after mount`, () => {
      mount();

      host.maximizedItem = `1`;
      fixture.detectChanges();
      expect(isHidden(`0`)).toBe(true);

      host.maximizedItem = null;
      fixture.detectChanges();
      expect(isHidden(`0`)).toBe(false);
    });

    it(`Should use the grid height measured when the item was maximized`, () => {
      mount();
      gridHeight = 300;

      grid.maximize(`0`);
      fixture.detectChanges();

      expect(itemStyle(`0`)[`height`]).toBe(`280px`);
    });

    it(`Should anchor to the right edge when the grid is mirrored`, () => {
      mount(instance => {
        instance.isMirrored = true;
        instance.maximizedItem = `0`;
        instance.useCssTransforms = false;
      });

      const style = itemStyle(`0`);

      expect(style[`right`]).toBe(`10px`);
      expect(style[`left`]).toBeUndefined();
    });

    it(`Should ignore an id the layout does not have`, () => {
      mount(instance => {
        instance.maximizedItem = `nope`;
      });

      expect(grid.maximizedItem).toBeNull();
      expect(isHidden(`0`)).toBe(false);
    });

    it(`Should work with a numeric id`, () => {
      mount(instance => {
        instance.layout = [{ h: 2, i: 0, w: 2, x: 0, y: 0 }, { h: 2, i: 1, w: 2, x: 2, y: 0 }];
        instance.maximizedItem = 0;
      });

      expect(grid.maximizedItem).toBe(0);
      expect(isHidden(1)).toBe(true);
    });
  });

  describe(`restoring`, () => {
    it(`Should put every item back where layout has it, without touching layout`, () => {
      mount();
      const before = JSON.stringify(host.layout);
      const styleBefore = JSON.stringify(itemStyle(`1`));

      grid.maximize(`1`);
      fixture.detectChanges();
      expect(JSON.stringify(host.layout)).toBe(before);

      grid.restore();
      fixture.detectChanges();

      expect(JSON.stringify(host.layout)).toBe(before);
      expect(JSON.stringify(itemStyle(`1`))).toBe(styleBefore);
      expect(itemEl(`1`).classList.contains(`kdl-grid-item--maximized`)).toBe(false);
    });

    it(`Should do nothing when nothing is maximized`, () => {
      mount();

      grid.restore();

      expect(host.maximizedChanges).toEqual([]);
    });

    it(`Should un-hide the others when the maximized item is removed from layout`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });
      expect(isHidden(`0`)).toBe(true);

      host.layout = host.layout.filter(entry => entry.i !== `1`);
      fixture.detectChanges();

      expect(grid.maximizedItem).toBeNull();
      expect(isHidden(`0`)).toBe(false);
      expect(host.maximizedChanges).toEqual([null]);
    });
  });

  describe(`events`, () => {
    it(`Should emit maximizedItemChange with the id, then null`, () => {
      mount();

      grid.maximize(`1`);
      grid.restore();

      expect(host.maximizedChanges).toEqual([`1`, null]);
    });

    it(`Should not emit when the item is already maximized`, () => {
      mount();

      grid.maximize(`1`);
      grid.maximize(`1`);

      expect(host.maximizedChanges).toHaveLength(1);
    });

    it(`Should not emit for an id the layout does not have`, () => {
      mount();

      grid.maximize(`nope`);

      expect(host.maximizedChanges).toEqual([]);
    });

    it(`Should not emit when the change came from the input`, () => {
      mount();

      host.maximizedItem = `1`;
      fixture.detectChanges();
      host.maximizedItem = null;
      fixture.detectChanges();

      expect(host.maximizedChanges).toEqual([]);
    });

    it(`Should not emit a layout change just for maximizing`, () => {
      mount();
      const updates = host.layoutChanges.length;

      grid.maximize(`1`);
      fixture.detectChanges();
      grid.restore();
      fixture.detectChanges();

      expect(host.layoutChanges).toHaveLength(updates);
    });
  });

  describe(`Escape`, () => {
    it(`Should restore on Escape`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      keydown(`1`, `Escape`);

      expect(grid.maximizedItem).toBeNull();
      expect(host.maximizedChanges).toEqual([null]);
    });

    it(`Should ignore other keys`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      keydown(`1`, `Enter`);

      expect(grid.maximizedItem).toBe(`1`);
    });

    it(`Should leave an Escape that something inside the item already handled`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });
      itemEl(`1`).addEventListener(`keydown`, event => event.preventDefault());

      keydown(`1`, `Escape`);

      expect(grid.maximizedItem).toBe(`1`);
    });

    it(`Should do nothing on Escape when nothing is maximized`, () => {
      mount();

      keydown(`1`, `Escape`);

      expect(host.maximizedChanges).toEqual([]);
    });
  });

  describe(`compaction`, () => {
    const gap = (): TLayout => [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 0, y: 6 }];

    it(`Should suspend compaction while maximized, and compact once on restore`, () => {
      mount(instance => {
        instance.layout = gap();
        instance.maximizedItem = `0`;
      });

      grid.compactNow();
      expect(entryOf(lastLayout(), `1`).y).toBe(6);

      grid.restore();

      expect(entryOf(lastLayout(), `1`).y).toBe(2);
    });

    it(`Should compact an item added while maximized once restored`, () => {
      mount(instance => {
        instance.maximizedItem = `0`;
      });

      host.layout = [...host.layout, { h: 2, i: `3`, w: 2, x: 0, y: Infinity }];
      fixture.detectChanges();
      expect(host.layoutChanges.some(layout => layout.some(entry => entry.i === `3` && entry.y === Infinity))).toBe(false);

      grid.restore();

      expect(Number.isFinite(entryOf(lastLayout(), `3`).y)).toBe(true);
    });

    it(`Should emit a layout change on restore only when compaction moved something`, () => {
      mount(instance => {
        instance.layout = gap();
        instance.maximizedItem = `0`;
      });
      const before = host.layoutChanges.length;

      grid.restore();
      expect(host.layoutChanges).toHaveLength(before + 1);

      grid.maximize(`0`);
      const settled = host.layoutChanges.length;
      grid.restore();
      expect(host.layoutChanges).toHaveLength(settled);
    });
  });

  describe(`interaction while maximized`, () => {
    it(`Should not be draggable or resizable, and be again once restored`, () => {
      mount();
      expect(itemEl(`1`).classList.contains(`kdl-grid-item--draggable`)).toBe(true);
      expect(itemEl(`1`).querySelector(`.kdl-resize-hint--se`)).not.toBeNull();

      grid.maximize(`1`);
      fixture.detectChanges();
      expect(itemEl(`1`).classList.contains(`kdl-grid-item--draggable`)).toBe(false);
      expect(itemEl(`1`).querySelector(`.kdl-resize-hint--se`)).toBeNull();

      grid.restore();
      fixture.detectChanges();
      expect(itemEl(`1`).classList.contains(`kdl-grid-item--draggable`)).toBe(true);
      expect(itemEl(`1`).querySelector(`.kdl-resize-hint--se`)).not.toBeNull();
    });

    it(`Should not move from the keyboard while maximized`, () => {
      mount();

      grid.maximize(`1`);
      fixture.detectChanges();
      const before = host.layoutChanges.length;
      keydown(`1`, `ArrowRight`);
      expect(host.layoutChanges).toHaveLength(before);

      grid.restore();
      fixture.detectChanges();
      keydown(`1`, `ArrowRight`);
      expect(entryOf(lastLayout(), `1`).x).toBe(3);
    });

    it(`Should keep the close button while maximized`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
        instance.showCloseButton = true;
      });

      expect(itemEl(`1`).querySelector(`.kdl-grid-item-close-button`)).not.toBeNull();
    });
  });

  describe(`the maximize button`, () => {
    it(`Should not render by default`, () => {
      mount();

      expect(fixture.nativeElement.querySelector(`.btn-maximize`)).toBeNull();
    });

    it(`Should render on every item when the grid asks for it`, () => {
      mount(instance => {
        instance.showMaximizeButton = true;
      });

      expect(fixture.nativeElement.querySelectorAll(`.btn-maximize`)).toHaveLength(3);
    });

    it(`Should let an item turn it on for itself`, () => {
      mount(instance => {
        instance.itemShowMaximizeButton = true;
      });

      expect(fixture.nativeElement.querySelectorAll(`.btn-maximize`)).toHaveLength(3);
    });

    it(`Should let an item turn it off for itself`, () => {
      mount(instance => {
        instance.itemShowMaximizeButton = false;
        instance.showMaximizeButton = true;
      });

      expect(fixture.nativeElement.querySelector(`.btn-maximize`)).toBeNull();
    });

    it(`Should follow the grid's showMaximizeButton after mount`, () => {
      mount();

      host.showMaximizeButton = true;
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll(`.btn-maximize`)).toHaveLength(3);
    });

    it(`Should maximize its item when clicked, then restore it`, () => {
      mount(instance => {
        instance.showMaximizeButton = true;
      });

      maximizeButton(`1`)!.click();
      fixture.detectChanges();
      expect(grid.maximizedItem).toBe(`1`);
      expect(isHidden(`0`)).toBe(true);

      maximizeButton(`1`)!.click();
      fixture.detectChanges();
      expect(grid.maximizedItem).toBeNull();
      expect(isHidden(`0`)).toBe(false);
    });

    it(`Should label itself Maximize, and Restore while maximized`, () => {
      mount(instance => {
        instance.showMaximizeButton = true;
      });
      expect(buttonLabel(`1`)).toBe(`Maximize`);

      grid.maximize(`1`);
      fixture.detectChanges();

      expect(buttonLabel(`1`)).toBe(`Restore`);
      expect(maximizeButton(`1`)!.classList.contains(`btn-maximize--active`)).toBe(true);
    });

    it(`Should take its labels from ariaLabels`, () => {
      mount(instance => {
        instance.ariaLabels = { maximizeButton: `Vergroot`, restoreButton: `Herstel` };
        instance.showMaximizeButton = true;
      });
      expect(buttonLabel(`1`)).toBe(`Vergroot`);

      grid.maximize(`1`);
      fixture.detectChanges();

      expect(buttonLabel(`1`)).toBe(`Herstel`);
    });

    it(`Should work on a static item and with edit mode off`, () => {
      mount(instance => {
        instance.enableEditMode = false;
        instance.layout = [{ h: 2, i: `0`, isStatic: true, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 2, y: 0 }];
        instance.showMaximizeButton = true;
      });

      maximizeButton(`0`)!.click();

      expect(grid.maximizedItem).toBe(`0`);
    });

    it(`Should not count as a click on the item`, () => {
      mount(instance => {
        instance.multiSelect = true;
        instance.showMaximizeButton = true;
      });

      maximizeButton(`1`)!.click();

      expect(grid.selectedItemIds.size).toBe(0);
    });

    describe(`focus (Safari does not focus a button on click)`, () => {
      beforeEach(() => {
        mount(instance => {
          instance.showMaximizeButton = true;
        });
      });

      it(`Should take focus when clicked, so the grid hears the next key`, () => {
        expect(document.activeElement).not.toBe(maximizeButton(`1`));

        maximizeButton(`1`)!.click();
        fixture.detectChanges();

        expect(document.activeElement).toBe(maximizeButton(`1`));
      });

      it(`Should restore on Escape right after a click maximized the item`, () => {
        maximizeButton(`1`)!.click();
        fixture.detectChanges();
        expect(grid.maximizedItem).toBe(`1`);

        (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent(`keydown`, { bubbles: true, cancelable: true, key: `Escape` }));
        fixture.detectChanges();

        expect(grid.maximizedItem).toBeNull();
      });

      it(`Should keep focus on the same button when a click restores the item`, () => {
        maximizeButton(`1`)!.click();
        fixture.detectChanges();
        const focused = document.activeElement;

        maximizeButton(`1`)!.click();
        fixture.detectChanges();

        expect(grid.maximizedItem).toBeNull();
        expect(document.activeElement).toBe(focused);
        expect(focused).toBe(maximizeButton(`1`));
      });

      it(`Should leave focus alone when the item is maximized through the public method`, () => {
        const input = document.createElement(`input`);
        document.body.appendChild(input);
        input.focus();

        grid.maximize(`1`);
        fixture.detectChanges();

        expect(document.activeElement).toBe(input);
        input.remove();
      });
    });
  });

  describe(`measuring and publishing`, () => {
    const bus = (): GridEventBusService => fixture.debugElement.query(By.directive(GridLayoutComponent)).injector.get(GridEventBusService);
    /** How many times the items have been told the maximized state, counted from now. */
    const countPublished = (): (() => number) => {
      let count = -1;
      bus().maximizedState$.subscribe(() => {
        count += 1;
      });
      return () => count;
    };

    it(`Should measure the grid height when the input maximizes an item`, () => {
      mount();
      gridHeight = 300;

      host.maximizedItem = `1`;
      fixture.detectChanges();

      expect(itemStyle(`1`)[`height`]).toBe(`280px`);
    });

    it(`Should tell the items again when the grid's height changes while an item is maximized`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });
      const published = countPublished();

      gridHeight = 400;
      grid.ngAfterViewInit();

      expect(published()).toBe(1);
    });

    it(`Should not tell the items again when the grid's height stays the same`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });
      const published = countPublished();

      grid.ngAfterViewInit();

      expect(published()).toBe(0);
    });

    it(`Should not tell the items anything about the height while nothing is maximized`, () => {
      mount();
      const published = countPublished();

      gridHeight = 400;
      grid.ngAfterViewInit();

      expect(published()).toBe(0);
    });
  });

  describe(`measuring only when asked to`, () => {
    it(`Should leave the measured height alone when some other input changes`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });
      gridHeight = 400;
      host.multiSelect = true;
      fixture.detectChanges();
      const published = fixture.debugElement.query(By.directive(GridLayoutComponent)).injector.get(GridEventBusService);
      let count = 0;
      published.maximizedState$.subscribe(() => {
        count += 1;
      });
      count = 0;

      grid.ngAfterViewInit();

      expect(count).toBe(1);
    });
  });

  describe(`compaction held back`, () => {
    it(`Should leave an overlap in the layout alone when the maximized item is switched, and settle it once none is left`, () => {
      // Overlapping on purpose: a grid that mounts this way is not compacted, and the compaction that runs while something is
      // maximized would push one of the two down. Only restoring may do that.
      mount(instance => {
        instance.layout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 0, y: 0 }];
        instance.maximizedItem = `0`;
      });
      const before = host.layoutChanges.length;

      grid.maximize(`1`);
      expect(host.layoutChanges).toHaveLength(before);

      grid.restore();
      expect(host.layoutChanges).toHaveLength(before + 1);
    });

    it(`Should hand a custom compactor the grid's compactType on restore`, () => {
      const seen: ECompactType[] = [];
      mount(instance => {
        instance.compactor = { compact: (layout, _cols, context) => { seen.push(context.compactType); return layout; }, type: `spy` };
        instance.compactType = ECompactType.HORIZONTAL;
        instance.maximizedItem = `0`;
      });
      seen.length = 0;

      grid.restore();

      expect(seen).toEqual([ECompactType.HORIZONTAL]);
    });

    it(`Should not compact, or report a layout change, just because an item gets maximized`, () => {
      mount(instance => {
        instance.layout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 0, y: 6 }];
      });
      const before = host.layoutChanges.length;

      grid.maximize(`0`);

      expect(host.layoutChanges).toHaveLength(before);
    });

    it(`Should compact along the grid's compactType on restore`, () => {
      mount(instance => {
        instance.compactType = ECompactType.HORIZONTAL;
        instance.layout = [{ h: 2, i: `0`, w: 2, x: 0, y: 0 }, { h: 2, i: `1`, w: 2, x: 6, y: 0 }];
        instance.maximizedItem = `0`;
      });

      grid.restore();

      expect(entryOf(lastLayout(), `1`).x).toBe(2);
    });
  });

  describe(`item events`, () => {
    const lastResized = (id: string): IResizedEvent => host.resized.filter(event => event.i === id).pop()!;

    it(`Should report the new pixel size of the maximized item`, () => {
      mount();

      grid.maximize(`1`);
      fixture.detectChanges();

      expect(lastResized(`1`)).toEqual({ h: 2, height: 480, i: `1`, w: 2, width: 1180 });
    });

    it(`Should report the pixel size it goes back to on restore`, () => {
      mount();
      grid.maximize(`1`);

      grid.restore();
      fixture.detectChanges();

      expect(lastResized(`1`)).toEqual({ h: 2, height: 210, i: `1`, w: 2, width: 188 });
    });

    it(`Should leave the other items' size alone`, () => {
      mount();

      grid.maximize(`1`);
      fixture.detectChanges();

      expect(host.resized.filter(event => event.i === `0`)).toEqual([]);
    });

    it(`Should follow the grid's height while maximized`, () => {
      mount(instance => {
        instance.maximizedItem = `1`;
      });

      gridHeight = 400;
      grid.ngAfterViewInit();
      fixture.detectChanges();

      expect(itemStyle(`1`)[`height`]).toBe(`380px`);
      expect(lastResized(`1`).height).toBe(380);
    });
  });
});

describe(`GridItemComponent maximize on its own`, () => {
  const baseInputs: Partial<GridItemComponent> = { colNum: 12, containerWidth: 1220, h: 2, i: `0`, margin: [10, 10], rowHeight: 100, w: 2, x: 0, y: 0 };

  const create = (providers: unknown[] = []): { component: GridItemComponent; fixture: ComponentFixture<GridItemComponent> } => {
    TestBed.configureTestingModule({ imports: [GridItemComponent], providers: providers as never[] });
    const fixture = TestBed.createComponent(GridItemComponent);
    return { component: fixture.componentInstance, fixture };
  };

  const apply = (fixture: ComponentFixture<GridItemComponent>, inputs: Partial<GridItemComponent>): void => {
    Object.assign(fixture.componentInstance, inputs);
    fixture.componentInstance.ngOnChanges({});
    fixture.detectChanges();
  };

  describe(`without a grid around it`, () => {
    it(`Should neither hide itself nor show the maximize button`, () => {
      const { component, fixture } = create();

      apply(fixture, baseInputs);

      expect(component.hostStyle[`display`]).toBeUndefined();
      expect(component.resolvedShowMaximizeButton).toBe(false);
      expect((fixture.nativeElement as HTMLElement).querySelector(`.btn-maximize`)).toBeNull();
    });

    it(`Should survive a click on its maximize button`, () => {
      const { component, fixture } = create();
      apply(fixture, { ...baseInputs, showMaximizeButton: true });

      // Called from inside a click listener of its own, which is the only place the event has a `currentTarget`; and caught
      // there, because an error thrown inside a DOM event handler never reaches the caller of `click()`.
      const button = (fixture.nativeElement as HTMLElement).querySelector(`.btn-maximize`) as HTMLButtonElement;
      const errors: unknown[] = [];
      button.addEventListener(`click`, event => {
        try {
          component.handleMaximizeButtonClick(event);
        } catch(error) {
          errors.push(error);
        }
      });

      button.click();

      expect(errors).toEqual([]);
    });
  });

  describe(`reporting its size`, () => {
    const reportedFor = (containerWidth: number): number => {
      const { component, fixture } = create([GridEventBusService]);
      const bus = TestBed.inject(GridEventBusService);
      // No margin, so even a one pixel wide container leaves a positive column width. The width goes in through the bus: the item takes it from there as soon as it initialises.
      bus.setMargin([0, 0]);
      apply(fixture, baseInputs);
      bus.setContainerWidth(containerWidth);
      let reported = 0;
      component.itemResized.subscribe(() => {
        reported += 1;
      });

      bus.setMaximizedState({ height: 500, id: `0` });

      return reported;
    };

    afterEach(() => TestBed.resetTestingModule());

    it(`Should report once the container has been measured`, () => {
      expect(reportedFor(1220)).toBe(1);
    });

    it(`Should report for a container exactly one pixel wide`, () => {
      expect(reportedFor(1)).toBe(1);
    });

    it(`Should not report for a container narrower than a pixel`, () => {
      expect(reportedFor(0)).toBe(0);
      TestBed.resetTestingModule();
      expect(reportedFor(0.5)).toBe(0);
    });

    it(`Should not report for a container width that is not a finite number`, () => {
      expect(reportedFor(NaN)).toBe(0);
      TestBed.resetTestingModule();
      expect(reportedFor(Infinity)).toBe(0);
    });
  });
});

describe(`GridEventBusService maximize`, () => {
  let service: GridEventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GridEventBusService] });
    service = TestBed.inject(GridEventBusService);
  });

  it(`Should default maximizedState$ to nothing maximized`, () => {
    const seen: unknown[] = [];
    service.maximizedState$.subscribe(value => seen.push(value));

    expect(seen).toEqual([{ height: 0, id: null }]);
  });

  it(`Should emit a new value on maximizedState$ after setMaximizedState`, () => {
    const seen: unknown[] = [];
    service.maximizedState$.subscribe(value => seen.push(value));

    service.setMaximizedState({ height: 500, id: `1` });

    expect(seen).toEqual([{ height: 0, id: null }, { height: 500, id: `1` }]);
  });

  it(`Should emit the id on toggleMaximize$ after emitToggleMaximize, and give a late subscriber nothing`, () => {
    service.emitToggleMaximize(`early`);
    const seen: (string | number)[] = [];
    service.toggleMaximize$.subscribe(value => seen.push(value));

    service.emitToggleMaximize(`1`);

    expect(seen).toEqual([`1`]);
  });
});
