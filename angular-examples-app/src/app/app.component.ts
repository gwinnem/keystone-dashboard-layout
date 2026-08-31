import { Component } from '@angular/core';
import { isDevMode } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

// Docs links are environment-aware — isDevMode() (Angular's own
// idiomatic dev/prod check, not Vite's import.meta.env, since this is
// an Angular CLI/esbuild build, not a Vite one) points back at the
// local astro-docs dev server during local development, and at the
// real, deployed docs site otherwise. Mirrors the same dev/prod split
// astro-docs' own Header.astro uses for its own Angular "Examples"
// link, just from the opposite direction. Four links, not five —
// deliberately no "Examples" entry here: this app *is* the examples
// experience already, so linking to itself would be redundant (astro-
// docs' own top nav shows "Examples" as the current/active section
// when browsing there; this app has no equivalent "other" state to
// switch away from).
const DOCS_BASE = isDevMode() ? `http://localhost:4321/angular` : `https://kdl.winnem.tech/angular`;
const GUIDE_URL = `${DOCS_BASE}/guide/introduction/`;
const FEATURES_URL = `${DOCS_BASE}/features/`;
const COMPONENTS_URL = `${DOCS_BASE}/components/`;
const API_URL = `${DOCS_BASE}/api/`;
// The brand mark's own link/tooltip deliberately match astro-docs' own
// Header.astro exactly (same href target, same "Keystone Dashboard
// Layout" tooltip text, no "— Angular Examples" suffix) — that
// component's own site-title link goes to the overall site root
// (Astro.props.siteTitleHref), not to whatever framework section
// happens to be active, so this app's own brand mark does the same:
// the *site* root (astro-docs' own landing page), not this app's own
// internal '/' route. That internal route is still reachable — via
// the sidebar's own separate "Gallery" link, which already points
// there with routerLink.
const SITE_ROOT_URL = isDevMode() ? `http://localhost:4321/` : `https://kdl.winnem.tech/`;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-topbar">
      <a class="app-topbar-brand" [href]="siteRootUrl">
        <svg class="app-topbar-brand-icon" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="9" height="9" rx="2" fill="#4FB8C9"/>
          <rect x="12" y="1" width="9" height="6" rx="2" fill="#F5F4EF" fill-opacity="0.9"/>
          <rect x="12" y="9" width="9" height="12" rx="2" fill="#F5F4EF" fill-opacity="0.5"/>
          <rect x="1" y="12" width="9" height="9" rx="2" fill="#F2A93B"/>
        </svg>
        <span>KDL</span>
        <span class="app-topbar-brand-tooltip">Keystone Dashboard Layout</span>
      </a>
      <nav class="app-topbar-links" aria-label="Site">
        <a [href]="guideUrl">Guide</a>
        <a [href]="featuresUrl">Features</a>
        <a [href]="componentsUrl">Components</a>
        <a [href]="apiUrl">API</a>
      </nav>
      <div class="app-topbar-icons">
        <a class="app-topbar-icon" href="https://github.com/gwinnem/keystone-dashboard-layout" target="_blank" rel="noopener" aria-label="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.8 1.19 1.83 1.19 3.09 0 4.43-2.7 5.4-5.27 5.69.42.36.78 1.07.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .3.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
          <span class="app-topbar-icon-tooltip">GitHub</span>
        </a>
        <a class="app-topbar-icon" href="https://x.com/gwinnem/" target="_blank" rel="noopener" aria-label="X">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>
          <span class="app-topbar-icon-tooltip">X</span>
        </a>
        <a class="app-topbar-icon app-topbar-icon--linkedin" href="https://www.linkedin.com/in/gwinnem/" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>
          <span class="app-topbar-icon-tooltip">LinkedIn</span>
        </a>
        <a class="app-topbar-icon" href="https://www.xing.com/profile/Geirr_Winnem" target="_blank" rel="noopener" aria-label="Xing">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.188 0c-.517 0-.741.325-.927.66 0 0-7.455 13.224-7.702 13.657.015.024 4.919 9.023 4.919 9.023.17.308.436.66.967.66h3.454c.211 0 .375-.078.463-.22.089-.151.089-.346-.009-.536l-4.879-8.916c-.004-.006-.004-.016 0-.022L22.139.756c.095-.191.097-.387.006-.535C22.056.078 21.894 0 21.686 0h-3.498zM3.648 4.74c-.211 0-.385.074-.473.216-.09.149-.078.339.02.531l2.34 4.05c.004.01.004.016 0 .021L1.86 16.051c-.099.188-.093.381 0 .529.085.142.239.234.45.234h3.461c.518 0 .766-.348.945-.667l3.734-6.609-2.378-4.155c-.172-.315-.434-.659-.962-.659H3.648v.016z"/></svg>
          <span class="app-topbar-icon-tooltip">Xing</span>
        </a>
      </div>
    </header>
    <div class="app-shell">
      <aside class="app-sidebar">
        <a class="app-sidebar-gallery-link" routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Gallery</a>
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
          <li><a routerLink="/examples/53-resize-direction-toggles" routerLinkActive="is-active">53 — Resize direction toggles</a></li>
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
export class AppComponent {
  protected readonly siteRootUrl = SITE_ROOT_URL;
  protected readonly guideUrl = GUIDE_URL;
  protected readonly featuresUrl = FEATURES_URL;
  protected readonly componentsUrl = COMPONENTS_URL;
  protected readonly apiUrl = API_URL;
}
