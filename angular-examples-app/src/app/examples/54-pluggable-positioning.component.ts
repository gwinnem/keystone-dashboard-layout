import { Component } from '@angular/core';
import { GridLayoutComponent, GridItemComponent } from 'keystone-dashboard-layout-angular';
import { topLeftStrategy, transformStrategy } from 'keystone-dashboard-layout-core';
import type { IPositionStrategy, TLayout } from 'keystone-dashboard-layout-core';

type TChoice = 'transform' | 'top-left' | 'outline';

// A custom strategy: reuse the built-in top/left output and add to it.
// getStyle() must keep width/height as 'NNpx' strings.
const outlineStrategy: IPositionStrategy = {
  className: 'strategy-outline',
  getStyle: (position) => ({
    ...topLeftStrategy.getStyle(position),
    outline: '2px dashed #f59e0b',
    outlineOffset: '-2px',
  }),
  type: 'outline',
};

const strategies: Record<TChoice, IPositionStrategy> = {
  outline: outlineStrategy,
  'top-left': topLeftStrategy,
  transform: transformStrategy,
};

@Component({
  selector: 'app-pluggable-positioning-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent],
  template: `
    <div class="demo-controls">
      <label>
        Positioning strategy
        <select [value]="choice" (change)="onChoice($any($event.target).value)">
          <option value="transform">transformStrategy (CSS transforms)</option>
          <option value="top-left">topLeftStrategy (top / left)</option>
          <option value="outline">custom: top / left + outline</option>
        </select>
      </label>
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [positionStrategy]="strategy" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="positioning-item">{{ item.i }} &middot; {{ choice }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>
  `,
  styles: [`
    .demo-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-bottom: 16px;
    }

    .positioning-item {
      align-items: center;
      background: var(--kg-panel);
      border: 1px solid var(--kg-line-light);
      border-radius: 8px;
      color: var(--kg-text-hi-light);
      display: flex;
      font-family: var(--kg-font-mono);
      font-size: 11px;
      height: 100%;
      justify-content: center;
      padding: 8px;
      text-align: center;
      width: 100%;
    }
  `],
})
export class PluggablePositioningDemoComponent {
  layout: TLayout = [
    { h: 2, i: '0', w: 4, x: 0, y: 0 },
    { h: 3, i: '1', w: 4, x: 4, y: 0 },
    { h: 2, i: '2', w: 4, x: 8, y: 0 },
    { h: 2, i: '3', w: 6, x: 0, y: 3 },
  ];
  choice: TChoice = 'transform';
  // A plain field reassigned only on change, so the input gets a stable
  // reference between changes.
  strategy: IPositionStrategy = transformStrategy;

  onChoice(value: TChoice): void {
    this.choice = value;
    this.strategy = strategies[value];
  }
}
