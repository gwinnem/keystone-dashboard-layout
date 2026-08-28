import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { ExampleNumberFieldComponent } from '../harness/example-number-field.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 4, x: 0, y: 0 },
  { h: 2, i: '1', w: 4, x: 4, y: 0 },
  { h: 2, i: '2', w: 4, x: 8, y: 0 },
];

@Component({
  selector: 'app-layout-bounds-rendering-options-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, ExampleNumberFieldComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="maxRowsEnabled" (checkedChange)="maxRowsEnabled = $event" label="maxRows: 3"></example-toggle>
      <example-toggle [checked]="restoreOnDrag" (checkedChange)="restoreOnDrag = $event" label="restoreOnDrag"></example-toggle>
      <example-toggle [checked]="distributeEvenly" (checkedChange)="distributeEvenly = $event" label="distributeEvenly"></example-toggle>
      <example-number-field [value]="transformScale" (valueChange)="transformScale = $event" label="transformScale" [min]="0.5" [max]="2"></example-number-field>
      <example-toggle [checked]="useCssTransforms" (checkedChange)="onUseCssTransformsChange($event)" label="useCssTransforms"></example-toggle>
    </div>

    <div #container [style.transform]="'scale(' + transformScale + ')'" style="transform-origin: top left;">
      <kdl-grid-layout
        [colNum]="12"
        [distributeEvenly]="distributeEvenly"
        [layout]="layout"
        [maxRows]="maxRowsEnabled ? 3 : infinity"
        (layoutChange)="onLayoutChange($event)"
        [restoreOnDrag]="restoreOnDrag"
        [rowHeight]="60"
        [showGridLines]="true"
        [transformScale]="transformScale"
        [useCssTransforms]="useCssTransforms"
      >
        @for (item of layout; track item.i) {
          <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
            <div class="example-item">{{ item.i }}</div>
          </kdl-grid-item>
        }
      </kdl-grid-layout>
    </div>

    <p class="demo-description">
      Item "0"'s own positioning right now: <strong>{{ positioningMechanism }}</strong>
    </p>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-description {
      color: var(--kg-text-lo-light);
      font-size: 13px;
    }
  `],
})
export class LayoutBoundsRenderingOptionsDemoComponent implements AfterViewInit {
  readonly infinity = Infinity;
  maxRowsEnabled = false;
  restoreOnDrag = false;
  distributeEvenly = false;
  transformScale = 1;
  useCssTransforms = true;
  layout: TLayout = initialLayout;
  positioningMechanism = '';

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    this.refreshPositioningReadout();
  }

  onUseCssTransformsChange(value: boolean): void {
    this.useCssTransforms = value;
    this.refreshPositioningReadout();
  }

  onLayoutChange(next: TLayout): void {
    this.layout = next;
    this.refreshPositioningReadout();
  }

  // useCssTransforms toggles between two mechanisms that render
  // visually identically (transform: translate3d(...) vs plain
  // top/left), so there'd be no way to actually see the toggle do
  // anything without opening devtools. Reading the real, current
  // inline style back out of the rendered DOM makes the effect visible
  // here. setTimeout defers this to the next tick, after Angular's own
  // change detection for this pass has actually rendered the update.
  private refreshPositioningReadout(): void {
    setTimeout(() => {
      const el = this.containerRef?.nativeElement.querySelector<HTMLElement>('[data-grid-item-id="0"] > div');
      if (!el) return;
      this.positioningMechanism = el.style.transform ? `transform: ${el.style.transform}` : `top: ${el.style.top}, left: ${el.style.left}`;
    }, 0);
  }
}
