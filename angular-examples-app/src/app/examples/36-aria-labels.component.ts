import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import type { IGridAriaLabels, TLayout } from 'keystone-dashboard-layout-core';
import { ExampleToggleComponent } from '../harness/example-toggle.component';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const initialLayout: TLayout = [
  { h: 2, i: 'a', w: 6, x: 0, y: 0 },
  { h: 2, i: 'b', w: 6, x: 6, y: 0 },
];

const spanishLabels: IGridAriaLabels = {
  closeButton: 'Cerrar',
  itemRoleDescription: 'Elemento arrastrable y redimensionable',
  moveInstruction: 'Presiona las flechas para mover.',
  resizeInstruction: 'Presiona shift más flechas para redimensionar.',
};

interface IAriaReadoutRow {
  id: string;
  roleDescription: string;
  instructions: string;
  closeButtonLabel: string;
}

@Component({
  selector: 'app-aria-labels-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, ExampleToggleComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <example-toggle [checked]="spanish" (checkedChange)="onSpanishChange($event)" label="Use Spanish grid-wide labels"></example-toggle>
    </div>

    <div #container>
      <kdl-grid-layout [ariaLabels]="spanish ? spanishLabels : {}" [colNum]="12" [layout]="layout" (layoutChange)="onLayoutChange($event)" [rowHeight]="80" [showGridLines]="true">
        <kdl-grid-item i="a" [x]="0" [y]="0" [w]="6" [h]="2" [showCloseButton]="true">
          <div class="example-item">Uses grid-wide labels</div>
        </kdl-grid-item>
        <kdl-grid-item i="b" [x]="6" [y]="0" [w]="6" [h]="2" [showCloseButton]="true" [ariaLabels]="{ closeButton: 'Fermer' }">
          <div class="example-item">Own override (French close button)</div>
        </kdl-grid-item>
      </kdl-grid-layout>
    </div>

    <div class="aria-readout">
      <h4>Current ARIA strings (normally screen-reader-only)</h4>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>aria-roledescription</th>
            <th>Move/resize instructions</th>
            <th>Close button label</th>
          </tr>
        </thead>
        <tbody>
          @for (row of ariaReadout; track row.id) {
            <tr>
              <td>{{ row.id }}</td>
              <td>{{ row.roleDescription }}</td>
              <td>{{ row.instructions }}</td>
              <td>{{ row.closeButtonLabel }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .aria-readout {
      margin-top: 16px;
    }
    .aria-readout h4 {
      color: var(--kg-text-lo-light);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin: 0 0 8px;
      text-transform: uppercase;
    }
    .aria-readout table {
      border-collapse: collapse;
      font-family: var(--kg-font-mono);
      font-size: 0.85em;
      width: 100%;
    }
    .aria-readout th,
    .aria-readout td {
      border: 1px solid var(--kg-line-light);
      padding: 6px 10px;
      text-align: left;
    }
  `],
})
export class AriaLabelsDemoComponent implements AfterViewInit {
  readonly spanishLabels = spanishLabels;
  layout: TLayout = initialLayout;
  spanish = false;
  ariaReadout: IAriaReadoutRow[] = [];

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    this.refreshAriaReadout();
  }

  onSpanishChange(value: boolean): void {
    this.spanish = value;
    this.refreshAriaReadout();
  }

  onLayoutChange(next: TLayout): void {
    this.layout = next;
    this.refreshAriaReadout();
  }

  // Every one of the strings this example is about is deliberately
  // visually hidden in normal use — toggling the language produces no
  // visible change at all on its own. Reading these same values back
  // out of the real, rendered DOM (not duplicating the ariaLabels
  // logic separately) and displaying them in an ordinary, visible
  // table makes the actual effect immediately visible without needing
  // devtools or a screen reader. setTimeout defers this to the next
  // tick, after Angular's own change detection for this pass has
  // actually rendered the update — calling it synchronously right
  // after mutating layout/spanish would read stale DOM.
  private refreshAriaReadout(): void {
    setTimeout(() => {
      const container = this.containerRef?.nativeElement;
      if (!container) return;
      this.ariaReadout = this.layout.map((item) => {
        const el = container.querySelector<HTMLElement>(`[data-grid-item-id="${item.i}"]`);
        const closeButtonEl = el?.querySelector<HTMLElement>('.kdl-grid-item-close-button .kdl-visually-hidden');
        const instructionsId = el?.getAttribute('aria-describedby');
        const instructionsEl = instructionsId ? container.querySelector<HTMLElement>(`#${instructionsId}`) : null;
        return {
          closeButtonLabel: closeButtonEl?.textContent?.trim() ?? '(none)',
          id: String(item.i),
          instructions: instructionsEl?.textContent?.trim().replace(/\s+/g, ' ') ?? '(none)',
          roleDescription: el?.getAttribute('aria-roledescription') ?? '(none)',
        };
      });
    }, 0);
  }
}
