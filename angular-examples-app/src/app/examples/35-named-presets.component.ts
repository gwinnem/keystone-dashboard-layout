import { Component, inject } from '@angular/core';
import { GridLayoutComponent, GridItemComponent, GridLayoutPresetsService } from '@keystone-dashboard-layout/angular';
import type { TLayout } from '@keystone-dashboard-layout/core';
import { LayoutJsonViewerComponent } from '../harness/layout-json-viewer.component';

const PRESETS_KEY = 'example-35-presets';

const initialLayout: TLayout = [
  { h: 2, i: '0', w: 3, x: 0, y: 0 },
  { h: 2, i: '1', w: 3, x: 3, y: 0 },
  { h: 2, i: '2', w: 3, x: 6, y: 0 },
];

@Component({
  selector: 'app-named-presets-demo',
  standalone: true,
  imports: [GridLayoutComponent, GridItemComponent, LayoutJsonViewerComponent],
  template: `
    <div class="demo-controls">
      <input class="demo-input" placeholder="preset name" [value]="presetName" (input)="onNameInput($event)" />
      <button class="demo-btn" type="button" (click)="save()">Save preset</button>
      @for (name of presetNames; track name) {
        <button class="demo-btn demo-btn--ghost" type="button" (click)="load(name)">Load "{{ name }}"</button>
      }
    </div>

    <kdl-grid-layout [colNum]="12" [layout]="layout" (layoutChange)="layout = $event" [rowHeight]="60" [showGridLines]="true">
      @for (item of layout; track item.i) {
        <kdl-grid-item [i]="item.i" [x]="item.x" [y]="item.y" [w]="item.w" [h]="item.h">
          <div class="example-item">{{ item.i }}</div>
        </kdl-grid-item>
      }
    </kdl-grid-layout>

    <p class="demo-description">
      Saved presets: {{ presetNames.length ? presetNames.join(', ') : 'none yet' }}
    </p>

    <layout-json-viewer [layout]="layout" />
  `,
  styles: [`
    .demo-input {
      border: 1px solid var(--kg-line-light);
      border-radius: 6px;
      font-family: var(--kg-font-mono);
      font-size: 12px;
      padding: 5px 8px;
    }
    .demo-description {
      color: var(--kg-text-lo-light);
      font-size: 13px;
    }
  `],
})
export class NamedPresetsDemoComponent {
  private readonly presets = inject(GridLayoutPresetsService);
  layout: TLayout = initialLayout;
  presetName = 'compact';
  presetNames: string[] = this.presets.listPresets(PRESETS_KEY);

  onNameInput(event: Event): void {
    this.presetName = (event.target as HTMLInputElement).value;
  }

  save(): void {
    if (!this.presetName) return;
    this.presets.savePreset(PRESETS_KEY, this.presetName, this.layout);
    this.presetNames = this.presets.listPresets(PRESETS_KEY);
  }

  load(name: string): void {
    const loaded = this.presets.loadPreset(PRESETS_KEY, name);
    if (loaded) {
      this.layout = loaded;
    }
  }
}
