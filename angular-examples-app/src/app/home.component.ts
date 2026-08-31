import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Landing page for the '' route — now the full examples gallery,
 * adapted from astro-docs' own vue/examples.mdx (same category
 * grouping and descriptions; internal routerLinks point at this app's
 * own /examples/* routes instead of astro-docs slugs, and a few
 * labels/descriptions are Angular's own where the framework's own
 * idiom differs — e.g. "Save/load layout" not "v-model & save/load
 * layout", matching this app's own sidebar list in app.component.ts
 * rather than Vue's v-model-specific wording).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Examples</h1>
    <p class="gallery-intro">
      Every example below renders the real, published component — not a
      screenshot. All 53 are ported; grouped here the same way the
      <a href="https://kdl.winnem.tech/angular/features/" target="_blank" rel="noopener">Features</a>
      guide groups its own categories, so a bullet there and an example
      here always mean the same thing.
    </p>

    <h2>Drag &amp; resize</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/01-basic-drag-resize"><strong>Basic drag &amp; resize</strong></a> — the simplest possible setup.</li>
      <li><a routerLink="/examples/02-bounded-drag"><strong>Bounded drag to container</strong></a> — keep items inside the grid's own edges.</li>
      <li><a routerLink="/examples/05-drag-allow-ignore-elements"><strong>Drag allow / ignore elements</strong></a> — restrict dragging to a handle, or exclude specific elements.</li>
      <li><a routerLink="/examples/17-static-items"><strong>Static items</strong></a> — lock an item in place as a fixed obstacle.</li>
      <li><a routerLink="/examples/18-custom-drag-handle-close-button"><strong>Custom drag handle &amp; close button</strong></a> — custom templates in place of the defaults.</li>
      <li><a routerLink="/examples/31-per-item-auto-height"><strong>Per-item autoHeight</strong></a> — a live-resyncing height driven by the item's own content.</li>
      <li><a routerLink="/examples/38-size-constraints-aspect-ratio"><strong>Size constraints &amp; aspect ratio</strong></a> — clamp resize bounds; lock the width/height ratio.</li>
      <li><a routerLink="/examples/39-auto-scroll"><strong>autoScroll</strong></a> — scroll a container automatically near its edge during drag/resize.</li>
      <li><a routerLink="/examples/51-drag-activation-distance"><strong>Drag activation distance</strong></a> — minimum pointer movement before a pointerdown becomes a drag.</li>
      <li><a routerLink="/examples/52-restrict-resize-handles"><strong>Restricting resize handles to specific edges</strong></a> — resize only from the edges/corners you choose.</li>
      <li><a routerLink="/examples/53-resize-direction-toggles"><strong>Resize direction toggles</strong></a> — toggle any of the 8 resize edges/corners live and watch resizeHandles update.</li>
      <li><a routerLink="/examples/49-per-item-z-index"><strong>Per-item zIndex override</strong></a> — pin one item permanently above every other.</li>
    </ul>

    <h2>Layout &amp; collision</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/08-prevent-collision"><strong>Prevent collision</strong></a> — block a drag/resize instead of pushing other items.</li>
      <li><a routerLink="/examples/10-add-remove-items"><strong>Add or remove items</strong></a> — the grid re-compacts automatically, no manual position math.</li>
      <li><a routerLink="/examples/15-horizontal-shift"><strong>Horizontal shift</strong></a> — push colliding items left/right instead of down.</li>
      <li><a routerLink="/examples/19-save-load-layout"><strong>Save/load layout</strong></a> — layout is a plain, JSON-serializable array.</li>
      <li><a routerLink="/examples/20-auto-size-grid"><strong>Auto-size grid on content</strong></a> — the container's own height grows/shrinks to fit.</li>
      <li><a routerLink="/examples/26-alignment-guides"><strong>Alignment guides while dragging</strong></a> — Figma-style guide lines, purely visual.</li>
      <li><a routerLink="/examples/28-svg-export"><strong>Export layout as SVG</strong></a> — a dependency-free standalone SVG snapshot.</li>
      <li><a routerLink="/examples/29-compact-now-rearrange-duplicate-item"><strong>compactNow, rearrange &amp; duplicateItem</strong></a> — on-demand tidying and item duplication.</li>
      <li><a routerLink="/examples/30-blocked-move-feedback"><strong>Blocked-move feedback</strong></a> — a real event the moment preventCollision blocks a move.</li>
      <li><a routerLink="/examples/32-snap-to-grid"><strong>Snap to grid</strong></a> — magnetic snapping that actually adjusts where an item lands.</li>
      <li><a routerLink="/examples/35-named-presets"><strong>Named layout presets</strong></a> — save and switch between several named arrangements.</li>
      <li><a routerLink="/examples/41-layout-bounds-rendering-options"><strong>Layout bounds &amp; rendering options</strong></a> — maxRows, distributeEvenly, useCssTransforms.</li>
      <li><a routerLink="/examples/42-pluggable-compaction"><strong>Pluggable compaction</strong></a> — five built-in strategies, or a genuinely custom ICompactor.</li>
      <li><a routerLink="/examples/43-undo-redo"><strong>Undo/redo</strong></a> — opt-in history at committed-change granularity.</li>
      <li><a routerLink="/examples/47-spacing-indicators"><strong>Spacing indicators</strong></a> — a labeled distance badge in the gap to the nearest neighbor.</li>
      <li><a routerLink="/examples/50-height-modes"><strong>Height modes (heightMode)</strong></a> — the modern replacement for autoSize, including 'scroll'/'fit' modes.</li>
    </ul>

    <h2>Multi-select &amp; group operations</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/37-multi-select-group-move-resize"><strong>Multi-select &amp; group move/resize</strong></a> — select several items, move one, the rest follow.</li>
      <li><a routerLink="/examples/46-align-distribute-selected"><strong>Align &amp; distribute selected items</strong></a> — align a multi-selection to an edge, or evenly space the ones between the outermost two.</li>
    </ul>

    <h2>Responsive</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/07-responsive-breakpoints"><strong>Responsive breakpoints</strong></a> — auto-generate a layout per breakpoint.</li>
      <li><a routerLink="/examples/09-responsive-predefined-layouts"><strong>Responsive predefined layouts</strong></a> — full control over what each breakpoint looks like.</li>
    </ul>

    <h2>Internationalization</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/06-mirrored-rtl"><strong>Mirrored (RTL)</strong></a> — flip the entire grid for right-to-left locales.</li>
    </ul>

    <h2>Accessibility</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/27-scroll-to-item-focus-item"><strong>scrollToItem &amp; focusItem</strong></a> — scroll an off-screen item into view, or move keyboard focus to it.</li>
      <li><a routerLink="/examples/36-aria-labels"><strong>Localizable ARIA strings</strong></a> — override every user-facing string, not just read the English default.</li>
    </ul>

    <h2>Cross-grid &amp; external drag-and-drop</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/04-multiple-grids"><strong>Multiple grids</strong></a> — independent grids on one page, nothing shared.</li>
      <li><a routerLink="/examples/11-outside-drag-drop"><strong>Drag, drop from outside</strong></a> — native HTML5 drag-and-drop into the grid.</li>
      <li><a routerLink="/examples/12-cross-grid-drag-drop"><strong>Drag, drop from grid to grid</strong></a> — drag an item between two independent grid instances.</li>
      <li><a routerLink="/examples/22-cross-grid-drop-restrictions"><strong>Cross-grid drop restrictions</strong></a> — reject an incoming drop with disableExternalDrop.</li>
      <li><a routerLink="/examples/23-outside-drag-drop-multiple-grids"><strong>Drag, drop from outside into multiple grids</strong></a> — each grid decides independently whether to accept.</li>
      <li><a routerLink="/examples/34-outside-drop-accept-payload"><strong>outsideDropAccept &amp; readOutsideDropPayload</strong></a> — reject incompatible drags; read a richer, typed payload.</li>
    </ul>

    <h2>Styling &amp; customization</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/13-close-button"><strong>Show close button</strong></a> — a built-in per-item close affordance.</li>
      <li><a routerLink="/examples/14-border-radius"><strong>Border radius</strong></a> — cascades from the grid to every item that doesn't set its own.</li>
      <li><a routerLink="/examples/16-grid-lines"><strong>Show grid lines</strong></a> — visible guide lines behind the items.</li>
      <li><a routerLink="/examples/21-edit-mode-toggle"><strong>Edit mode toggle</strong></a> — a master switch for a view-only dashboard mode.</li>
      <li><a routerLink="/examples/24-transition-duration-easing"><strong>Configurable transition duration &amp; easing</strong></a> — the CSS transition applied to position/size changes.</li>
      <li><a routerLink="/examples/25-custom-drag-placeholder"><strong>Custom drag-placeholder content</strong></a> — custom content rendered while dragging.</li>
      <li><a routerLink="/examples/33-resize-hint-appearance"><strong>Configurable resize-hint appearance</strong></a> — a visible resize handle instead of only a cursor change.</li>
      <li><a routerLink="/examples/44-grid-dimensions"><strong>Grid dimensions</strong></a> — rowHeight, colNum, margin, live-reactive.</li>
      <li><a routerLink="/examples/48-custom-header-slot"><strong>Custom header</strong></a> — a separate region above an item's own main content.</li>
    </ul>

    <h2>Developer experience</h2>
    <ul class="gallery-list">
      <li><a routerLink="/examples/03-events"><strong>Events</strong></a> — every event the grid and each item emit.</li>
      <li><a routerLink="/examples/40-layout-lifecycle-events"><strong>Layout lifecycle events</strong></a> — layout-ready/layout-updated, in the order they actually fire.</li>
      <li><a routerLink="/examples/45-switching-layouts-remount"><strong>Switching layouts &amp; forcing a remount</strong></a> — a plain reassignment vs. a genuine forced remount.</li>
    </ul>
  `,
})
export class HomeComponent {}
