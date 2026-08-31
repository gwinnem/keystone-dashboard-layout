import { Component } from '@angular/core';
import { BasicGridComponent } from './scenarios/basic-grid.component';
import { DynamicItemsComponent } from './scenarios/dynamic-items.component';
import { DragResizeComponent } from './scenarios/drag-resize.component';
import { KeyboardAccessibilityComponent } from './scenarios/keyboard-accessibility.component';
import { AdvancedFeaturesComponent } from './scenarios/advanced-features.component';
import { MultiSelectComponent } from './scenarios/multi-select.component';
import { ResponsiveComponent } from './scenarios/responsive.component';
import { RtlComponent } from './scenarios/rtl.component';
import { CrossGridComponent } from './scenarios/cross-grid.component';
import { ExternalDropComponent } from './scenarios/external-drop.component';
import { ItemOverridesComponent } from './scenarios/item-overrides.component';

type TScenarioId = `basic` | `dynamic` | `drag-resize` | `keyboard` | `advanced-features` | `multi-select` | `responsive` | `rtl` | `cross-grid` | `external-drop` | `item-overrides`;

/**
 * Minimal scenario switcher for the e2e test fixture — deliberately
 * not a showcase/demo app (no descriptive copy, no styling beyond
 * what's needed for items to have a visible bounding box). Just
 * enough routing between scenarios for Playwright to reach each one
 * via a `data-testid` nav button, mirroring the mechanism (not the
 * presentation) of React's own `e2e-fixture/App.tsx`. Full parity with
 * React's own 11-scenario e2e suite as of this writing.
 */
@Component({
  imports: [
    BasicGridComponent,
    DynamicItemsComponent,
    DragResizeComponent,
    KeyboardAccessibilityComponent,
    AdvancedFeaturesComponent,
    MultiSelectComponent,
    ResponsiveComponent,
    RtlComponent,
    CrossGridComponent,
    ExternalDropComponent,
    ItemOverridesComponent,
  ],
  selector: `app-root`,
  standalone: true,
  template: `
    <nav class="fixture-nav">
      @for (scenario of scenarios; track scenario.id) {
        <button [attr.data-testid]="'nav-' + scenario.id" type="button" (click)="activeId = scenario.id">{{ scenario.id }}</button>
      }
    </nav>
    <main class="fixture-main">
      @switch (activeId) {
        @case ('basic') { <app-basic-grid /> }
        @case ('dynamic') { <app-dynamic-items /> }
        @case ('drag-resize') { <app-drag-resize /> }
        @case ('keyboard') { <app-keyboard-accessibility /> }
        @case ('advanced-features') { <app-advanced-features /> }
        @case ('multi-select') { <app-multi-select /> }
        @case ('responsive') { <app-responsive /> }
        @case ('rtl') { <app-rtl /> }
        @case ('cross-grid') { <app-cross-grid /> }
        @case ('external-drop') { <app-external-drop /> }
        @case ('item-overrides') { <app-item-overrides /> }
      }
    </main>
  `,
})
export class AppComponent {
  readonly scenarios: { id: TScenarioId }[] = [
    { id: `basic` },
    { id: `dynamic` },
    { id: `drag-resize` },
    { id: `keyboard` },
    { id: `advanced-features` },
    { id: `multi-select` },
    { id: `responsive` },
    { id: `rtl` },
    { id: `cross-grid` },
    { id: `external-drop` },
    { id: `item-overrides` },
  ];
  activeId: TScenarioId = `basic`;
}
