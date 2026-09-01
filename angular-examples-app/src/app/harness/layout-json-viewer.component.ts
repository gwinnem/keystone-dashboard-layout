import { Component, Input } from '@angular/core';
import type { ILayoutItem } from 'keystone-dashboard-layout-core';

/**
 * Angular port of the astro-docs Vue harness's own LayoutJsonViewer.vue
 * — compact "current layout state" readout showing live x/y/w/h for
 * every item. Same markup/behavior, same --kg-* design tokens.
 */
@Component({
  selector: 'layout-json-viewer',
  standalone: true,
  template: `
    <div class="layout-json">
      @if (label) {
        <p class="layout-json__label">{{ label }}</p>
      }
      <div class="layout-json__grid">
        @for (item of layout; track item.i) {
          <div class="layout-json__item">
            <strong>{{ item.i }}</strong>
            <span class="layout-json__coords">x:{{ item.x }} y:{{ item.y }} w:{{ item.w }} h:{{ item.h }}</span>
          </div>
        }
        @if (layout.length === 0) {
          <p class="layout-json__empty">empty</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .layout-json + .layout-json {
      margin-top: 10px;
    }

    .layout-json__label {
      color: var(--kg-text-lo-light);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .layout-json__grid {
      background: var(--kg-ink);
      border-radius: 8px;
      display: grid;
      font-family: var(--kg-font-mono);
      font-size: 12.5px;
      gap: 6px 16px;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      padding: 12px 14px;
    }

    .layout-json__item {
      color: var(--kg-text-lo-dark);
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }

    .layout-json__item strong {
      color: var(--kg-amber);
    }

    .layout-json__empty {
      color: var(--kg-text-lo-dark);
      font-style: italic;
      margin: 0;
    }
  `],
})
export class LayoutJsonViewerComponent {
  @Input({ required: true }) layout: ILayoutItem[] = [];
  @Input() label?: string;
}
