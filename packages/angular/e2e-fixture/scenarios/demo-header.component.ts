import { Component, Input } from '@angular/core';

/**
 * A real, standalone Angular component (not a plain `<div>`) used to
 * prove `kdlGridItemHeader` works when applied to any projected
 * element's own selector, not just plain HTML — `GridItemHeaderDirective`
 * is a pure attribute selector (`[kdlGridItemHeader]`) with no tag-name
 * restriction, so Angular's own content projection (`<ng-content
 * select="[kdlGridItemHeader]">`) matches it here exactly the same way
 * it would match a plain `<div kdlGridItemHeader>` — nothing in
 * `GridItemComponent`'s own template/detection logic (`@ContentChild
 * (GridItemHeaderDirective)`) cares what element/component the
 * directive happens to be attached to.
 */
@Component({
  selector: `app-demo-header`,
  standalone: true,
  template: `
    <span class="demo-header-icon">★</span>
    <strong>{{ title }}</strong>
    <span class="demo-header-badge">{{ badgeCount }}</span>
  `,
  styles: [`
    :host {
      align-items: center;
      display: flex;
      gap: 8px;
    }
    .demo-header-icon {
      color: #f59e0b;
    }
    .demo-header-badge {
      background: #4f46e5;
      border-radius: 10px;
      color: #fff;
      font-size: 11px;
      margin-left: auto;
      padding: 2px 8px;
    }
  `],
})
export class DemoHeaderComponent {
  @Input() title = `Widget`;
  @Input() badgeCount = 0;
}
