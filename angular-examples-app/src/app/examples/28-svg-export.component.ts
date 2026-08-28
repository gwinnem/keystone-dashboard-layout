import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from '@keystone-dashboard-layout/angular';
import { exportLayoutAsSvg } from '@keystone-dashboard-layout/core';
import type { TLayout } from '@keystone-dashboard-layout/core';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 6, x: 0, y: 2 },
];

@Component({
  selector: 'app-svg-export-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <button class="demo-btn" type="button" (click)="showExport = !showExport">{{ showExport ? 'Hide' : 'Show' }} exported SVG</button>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="80" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    @if (showExport) {
      <p class="demo-description">
        Exported SVG (rendered below as a data URL — no innerHTML/DomSanitizer bypass needed,
        since the raw markup never touches the DOM directly):
      </p>
      <div class="svg-preview">
        <img alt="Exported grid layout, rendered as SVG" [src]="dataUrl" />
      </div>
      <p class="demo-description">
        <a download="layout.svg" [href]="dataUrl">Download layout.svg</a>
      </p>
    }
  `,
  styles: [`
    .demo-description {
      color: var(--kg-text-lo-light);
      font-size: 13px;
      margin-top: 16px;
    }
    .svg-preview {
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      overflow: hidden;
    }
    .svg-preview img {
      display: block;
      max-width: 100%;
    }
  `],
})
export class SvgExportDemoComponent {
  layout: TLayout = initialLayout;
  showExport = false;

  get dataUrl(): string {
    // A real data URL, not a placeholder — an <img>'s own src can
    // safely point at one directly, unlike innerHTML/DomSanitizer's
    // bypassSecurityTrustHtml (which would inject the raw SVG markup
    // as live DOM), so this needs no explicit security bypass of any
    // kind, and the download link below is the exact same string, not
    // a separate mechanism.
    const svg = exportLayoutAsSvg(this.layout, { backgroundColor: '#f8fafc', colNum: 12, containerWidth: 700, rowHeight: 80 });
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
}
