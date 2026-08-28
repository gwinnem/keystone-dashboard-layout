import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <aside class="app-sidebar">
        <h1>Angular Examples</h1>
        <p class="app-sidebar-section-label">Examples</p>
        <ul class="example-list">
          <li><a routerLink="/examples/01-basic-drag-resize" routerLinkActive="is-active">01 — Basic drag & resize</a></li>
          <li><a routerLink="/examples/02-bounded-drag" routerLinkActive="is-active">02 — Bounded drag to container</a></li>
          <li><a routerLink="/examples/03-events" routerLinkActive="is-active">03 — Events</a></li>
          <li><a routerLink="/examples/04-multiple-grids" routerLinkActive="is-active">04 — Multiple grids</a></li>
          <li><a routerLink="/examples/05-drag-allow-ignore-elements" routerLinkActive="is-active">05 — Drag allow / ignore elements</a></li>
          <li><a routerLink="/examples/06-mirrored-rtl" routerLinkActive="is-active">06 — Mirrored (RTL)</a></li>
          <li><a routerLink="/examples/07-responsive-breakpoints" routerLinkActive="is-active">07 — Responsive breakpoints</a></li>
          <li><a routerLink="/examples/08-prevent-collision" routerLinkActive="is-active">08 — Prevent collision</a></li>
          <li><a routerLink="/examples/09-responsive-predefined-layouts" routerLinkActive="is-active">09 — Responsive predefined layouts</a></li>
          <li><a routerLink="/examples/10-add-remove-items" routerLinkActive="is-active">10 — Add or remove items</a></li>
          <li><a routerLink="/examples/11-outside-drag-drop" routerLinkActive="is-active">11 — Drag, drop from outside</a></li>
          <li><a routerLink="/examples/12-cross-grid-drag-drop" routerLinkActive="is-active">12 — Drag, drop from grid to grid</a></li>
          <li><a routerLink="/examples/13-close-button" routerLinkActive="is-active">13 — Show close button</a></li>
          <li><a routerLink="/examples/14-border-radius" routerLinkActive="is-active">14 — Border radius</a></li>
          <li><a routerLink="/examples/15-horizontal-shift" routerLinkActive="is-active">15 — Horizontal shift</a></li>
          <li><a routerLink="/examples/16-grid-lines" routerLinkActive="is-active">16 — Show grid lines</a></li>
          <li><a routerLink="/examples/17-static-items" routerLinkActive="is-active">17 — Static items</a></li>
          <li><a routerLink="/examples/18-custom-drag-handle-close-button" routerLinkActive="is-active">18 — Custom drag handle & close button</a></li>
          <li><a routerLink="/examples/19-save-load-layout" routerLinkActive="is-active">19 — Save/load layout</a></li>
          <li><a routerLink="/examples/20-auto-size-grid" routerLinkActive="is-active">20 — Auto-size grid on content</a></li>
          <li><a routerLink="/examples/21-edit-mode-toggle" routerLinkActive="is-active">21 — Edit mode toggle</a></li>
          <li><a routerLink="/examples/22-cross-grid-drop-restrictions" routerLinkActive="is-active">22 — Cross-grid drop restrictions</a></li>
          <li><a routerLink="/examples/23-outside-drag-drop-multiple-grids" routerLinkActive="is-active">23 — Drag, drop from outside into multiple grids</a></li>
          <li><a routerLink="/examples/24-transition-duration-easing" routerLinkActive="is-active">24 — Configurable transition duration & easing</a></li>
          <li><a routerLink="/examples/25-custom-drag-placeholder" routerLinkActive="is-active">25 — Custom drag-placeholder content</a></li>
          <li><a routerLink="/examples/26-alignment-guides" routerLinkActive="is-active">26 — Alignment guides while dragging</a></li>
          <li><a routerLink="/examples/27-scroll-to-item-focus-item" routerLinkActive="is-active">27 — scrollToItem & focusItem</a></li>
          <li><a routerLink="/examples/28-svg-export" routerLinkActive="is-active">28 — Export layout as SVG</a></li>
          <li><a routerLink="/examples/29-compact-now-rearrange-duplicate-item" routerLinkActive="is-active">29 — compactNow, rearrange & duplicateItem</a></li>
          <li><a routerLink="/examples/30-blocked-move-feedback" routerLinkActive="is-active">30 — Blocked-move feedback</a></li>
          <li><a routerLink="/examples/31-per-item-auto-height" routerLinkActive="is-active">31 — Per-item autoHeight</a></li>
          <li><a routerLink="/examples/32-snap-to-grid" routerLinkActive="is-active">32 — Snap to grid</a></li>
          <li><a routerLink="/examples/33-resize-hint-appearance" routerLinkActive="is-active">33 — Configurable resize-hint appearance</a></li>
          <li><a routerLink="/examples/34-outside-drop-accept-payload" routerLinkActive="is-active">34 — outsideDropAccept & readOutsideDropPayload</a></li>
          <li><a routerLink="/examples/35-named-presets" routerLinkActive="is-active">35 — Named layout presets</a></li>
          <li><a routerLink="/examples/36-aria-labels" routerLinkActive="is-active">36 — Localizable ARIA strings</a></li>
          <li><a routerLink="/examples/37-multi-select-group-move-resize" routerLinkActive="is-active">37 — Multi-select & group move/resize</a></li>
          <li><a routerLink="/examples/38-size-constraints-aspect-ratio" routerLinkActive="is-active">38 — Size constraints & aspect ratio</a></li>
          <li><a routerLink="/examples/39-auto-scroll" routerLinkActive="is-active">39 — autoScroll</a></li>
          <li><a routerLink="/examples/40-layout-lifecycle-events" routerLinkActive="is-active">40 — Layout lifecycle events</a></li>
          <li><a routerLink="/examples/41-layout-bounds-rendering-options" routerLinkActive="is-active">41 — Layout bounds & rendering options</a></li>
          <li><a routerLink="/examples/42-pluggable-compaction" routerLinkActive="is-active">42 — Pluggable compaction</a></li>
          <li><a routerLink="/examples/43-undo-redo" routerLinkActive="is-active">43 — Undo/redo</a></li>
          <li><a routerLink="/examples/44-grid-dimensions" routerLinkActive="is-active">44 — Grid dimensions</a></li>
          <li><a routerLink="/examples/45-switching-layouts-remount" routerLinkActive="is-active">45 — Switching layouts & forcing a remount</a></li>
          <li><a routerLink="/examples/46-align-distribute-selected" routerLinkActive="is-active">46 — Align & distribute selected items</a></li>
          <li><a routerLink="/examples/47-spacing-indicators" routerLinkActive="is-active">47 — Spacing indicators</a></li>
          <li><a routerLink="/examples/48-custom-header-slot" routerLinkActive="is-active">48 — Custom header</a></li>
          <li><a routerLink="/examples/49-per-item-z-index" routerLinkActive="is-active">49 — Per-item zIndex override</a></li>
          <li><a routerLink="/examples/50-height-modes" routerLinkActive="is-active">50 — Height modes (heightMode)</a></li>
          <li><a routerLink="/examples/51-drag-activation-distance" routerLinkActive="is-active">51 — Drag activation distance</a></li>
          <li><a routerLink="/examples/52-restrict-resize-handles" routerLinkActive="is-active">52 — Restricting resize handles to specific edges</a></li>
        </ul>
      </aside>
      <main class="app-main">
        <div class="app-main-inner">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
})
export class AppComponent {}
