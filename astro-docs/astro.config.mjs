import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import react from '@astrojs/react';

// Standalone Astro + Starlight site. Not part of the pnpm workspace on
// purpose (see package.json's own description) — installs/runs
// independently of the monorepo's turbo pipeline.
//
// Vue, React, and Angular all have real sidebar entries now. Each
// underlying package (packages/vue, packages/react, packages/angular)
// was confirmed directly (not assumed) to be a complete, tested,
// full-parity implementation before its docs began — every phase in
// each one's own docs/IMPLEMENTATION_PLAN.md is marked done — so each
// is being built out for real, the same incremental way (Guide first,
// then Features/Components/API/Examples).
//
// Angular examples specifically are NOT embedded here as Astro islands
// — that was tried via the community @analogjs/astro-angular package
// (there's no official @astrojs/angular) and abandoned after hitting
// real, unresolved issues (a component that consistently resolved to
// undefined in Astro's MDX renderer, even after fixing a genuine
// Angular-version mismatch and a genuine tsconfig scoping gap). Angular
// examples now live in a real, separate, standalone Angular CLI app
// instead (../angular-examples-app, outside this workspace too) — see
// that app's own README for the full rationale. Angular's own Examples
// sidebar section is deliberately omitted here until that app is
// deployed somewhere this site can link to (or iframe).
export default defineConfig({
  integrations: [
    vue(),
    react(),
    starlight({
      title: 'Keystone Dashboard Layout',
      favicon: '/favicon.svg',
      // Site-wide --kg-* design tokens (colors, fonts) used throughout
      // every ported example's own harness/decorative CSS. Without this,
      // only the custom landing page (index.astro, which pulls the same
      // file in via its own inline <style> @import) ever saw these
      // variables — every Starlight-rendered page, including every
      // example, silently fell back to unstyled/transparent values for
      // anything using var(--kg-*), since the custom property was never
      // actually defined there at all.
      customCss: ['./src/styles/tokens.css'],
      components: {
        // Shows only the relevant top-level section in the sidebar
        // while browsing under it (Guide, Components, API, Examples) —
        // see the override file's own comment for why this couldn't
        // just follow Starlight's current "Multiple sidebars" example
        // verbatim (that example targets a newer Starlight version's
        // route-data API than what's installed here).
        Sidebar: './src/components/overrides/Sidebar.astro',
        // VitePress-style top nav (section links + a custom icon row,
        // since Starlight's own SocialIcons has no npm entry in its
        // supported platform list) — see that override's own comment
        // for the desktop-only caveat.
        Header: './src/components/overrides/Header.astro',
        // Hides the right-hand Table of Contents entirely on every
        // /vue/examples/* page — route-dependent rather than per-page
        // frontmatter, so it applies automatically to any future
        // example added later too. See the override file's own comment.
        PageSidebar: './src/components/overrides/PageSidebar.astro',
        // Companion to the PageSidebar override above — that one stops
        // rendering ToC *content* on examples pages; this one stops
        // *reserving the column's own width* for it, so the main content
        // area actually expands into the freed space instead of just
        // leaving a blank gap. See that override's own comment for why
        // both are needed together.
        TwoColumnContent: './src/components/overrides/TwoColumnContent.astro',
      },
      social: {
        github: 'https://github.com/gwinnem/keystone-dashboard-layout',
      },
      sidebar: [
        {
          label: 'Vue',
          items: [
            {
              label: 'Guide',
              items: [
                { label: 'Introduction', slug: 'vue/guide/introduction' },
                { label: 'Installation', slug: 'vue/guide/installation' },
                {
                  label: 'Project',
                  items: [
                    { label: 'Architecture', slug: 'vue/guide/project/architecture' },
                    { label: 'Testing philosophy', slug: 'vue/guide/project/testing' },
                    { label: 'Accessibility scope', slug: 'vue/guide/project/accessibility' },
                    { label: 'Comparison: alternatives', slug: 'vue/guide/project/comparison-alternatives' },
                    { label: 'Comparison: commercial', slug: 'vue/guide/project/comparison-commercial' },
                    { label: 'Roadmap', slug: 'vue/guide/project/roadmap' },
                    { label: 'Production readiness', slug: 'vue/guide/project/production-readiness' },
                  ],
                },
                { label: 'Changelog', slug: 'vue/guide/changelog' },
              ],
            },
            { label: 'Features', slug: 'vue/features' },
            {
              label: 'Components',
              items: [
                { label: 'Overview', slug: 'vue/components' },
                {
                  label: 'GridLayout',
                  items: [
                    { label: 'Props', slug: 'vue/components/grid-layout/props' },
                    { label: 'Vue events', slug: 'vue/components/grid-layout/vue-events' },
                    { label: 'Eventbus events', slug: 'vue/components/grid-layout/eventbus-events' },
                    { label: 'Slots', slug: 'vue/components/grid-layout/slots' },
                  ],
                },
                {
                  label: 'GridItem',
                  items: [
                    { label: 'Props', slug: 'vue/components/grid-item/props' },
                    { label: 'Vue events', slug: 'vue/components/grid-item/vue-events' },
                    { label: 'Eventbus events', slug: 'vue/components/grid-item/eventbus-events' },
                    { label: 'Slots', slug: 'vue/components/grid-item/slots' },
                  ],
                },
                { label: 'CustomCloseButton', slug: 'vue/components/custom-close-button' },
                { label: 'CustomDragElement', slug: 'vue/components/custom-drag-element' },
                {
                  label: 'Styling',
                  items: [
                    { label: 'CSS variables', slug: 'vue/components/styling/css-variables' },
                    { label: 'GridLayout CSS', slug: 'vue/components/styling/css-grid-layout' },
                    { label: 'GridItem CSS', slug: 'vue/components/styling/css-grid-item' },
                  ],
                },
              ],
            },
            {
              label: 'API',
              items: [
                { label: 'Overview', slug: 'vue/api' },
                { label: 'Eventbus (IEventsData)', slug: 'vue/api/interfaces/eventbus' },
                { label: 'Layout interface', slug: 'vue/api/interfaces/layout' },
                { label: 'ARIA labels', slug: 'vue/api/interfaces/aria-labels' },
                { label: 'Pluggable compaction', slug: 'vue/api/interfaces/compactor' },
                { label: 'Layout persistence', slug: 'vue/api/interfaces/layout-persistence' },
                { label: 'SVG export & outside-drop payload', slug: 'vue/api/interfaces/svg-export-and-payload' },
                { label: 'Cross-grid & outside-drop event payloads', slug: 'vue/api/interfaces/event-payloads' },
                { label: 'Exposed instance state', slug: 'vue/api/interfaces/exposed-state' },
                { label: 'Layout types', slug: 'vue/api/types/layout' },
                { label: 'EGridLayoutEvent', slug: 'vue/api/enums/grid-layout-events' },
                { label: 'EGridItemEvent', slug: 'vue/api/enums/grid-item-events' },
                { label: 'ECompactType', slug: 'vue/api/enums/compact-type' },
              ],
            },
            {
              label: 'Examples',
              items: [
                { label: 'Gallery', slug: 'vue/examples' },
                // All 45 examples are now ported — see PLAN.md's own
                // §4.4 table for the full title/slug list.
                { label: '01 — Basic drag & resize', slug: 'vue/examples/basic-drag-resize' },
                { label: '02 — Bounded drag to container', slug: 'vue/examples/bounded-drag' },
                { label: '03 — Events', slug: 'vue/examples/events' },
                { label: '04 — Multiple grids', slug: 'vue/examples/multiple-grids' },
                { label: '05 — Drag allow / ignore elements', slug: 'vue/examples/drag-allow-ignore-elements' },
                { label: '06 — Mirrored (RTL)', slug: 'vue/examples/mirrored-rtl' },
                { label: '07 — Responsive breakpoints', slug: 'vue/examples/responsive-breakpoints' },
                { label: '08 — Prevent collision', slug: 'vue/examples/prevent-collision' },
                { label: '09 — Responsive predefined layouts', slug: 'vue/examples/responsive-predefined-layouts' },
                { label: '10 — Add or remove items', slug: 'vue/examples/add-remove-items' },
                { label: '11 — Drag, drop from outside', slug: 'vue/examples/outside-drag-drop' },
                { label: '12 — Drag, drop from grid to grid', slug: 'vue/examples/cross-grid-drag-drop' },
                { label: '13 — Show close button', slug: 'vue/examples/close-button' },
                { label: '14 — Border radius', slug: 'vue/examples/border-radius' },
                { label: '15 — Horizontal shift', slug: 'vue/examples/horizontal-shift' },
                { label: '16 — Show grid lines', slug: 'vue/examples/grid-lines' },
                { label: '17 — Static items', slug: 'vue/examples/static-items' },
                { label: '18 — Custom drag handle & close button', slug: 'vue/examples/custom-drag-handle-close-button' },
                { label: '19 — v-model & save/load layout', slug: 'vue/examples/save-load-layout' },
                { label: '20 — Auto-size grid on content', slug: 'vue/examples/auto-size-grid' },
                { label: '21 — Edit mode toggle', slug: 'vue/examples/edit-mode-toggle' },
                { label: '22 — Cross-grid drop restrictions', slug: 'vue/examples/cross-grid-drop-restrictions' },
                { label: '23 — Drag, drop from outside into multiple grids', slug: 'vue/examples/outside-drag-drop-multiple-grids' },
                { label: '24 — Configurable transition duration & easing', slug: 'vue/examples/transition-duration-easing' },
                { label: '25 — Custom drag-placeholder content', slug: 'vue/examples/custom-drag-placeholder' },
                { label: '26 — Alignment guides while dragging', slug: 'vue/examples/alignment-guides' },
                { label: '27 — scrollToItem & focusItem', slug: 'vue/examples/scroll-to-item-focus-item' },
                { label: '28 — Export layout as SVG', slug: 'vue/examples/svg-export' },
                { label: '29 — compactNow, rearrange & duplicateItem', slug: 'vue/examples/compact-now-rearrange-duplicate-item' },
                { label: '30 — Blocked-move feedback', slug: 'vue/examples/blocked-move-feedback' },
                { label: '31 — Per-item autoHeight', slug: 'vue/examples/per-item-auto-height' },
                { label: '32 — Snap to grid', slug: 'vue/examples/snap-to-grid' },
                { label: '33 — Configurable resize-hint appearance', slug: 'vue/examples/resize-hint-appearance' },
                { label: '34 — outsideDropAccept & readOutsideDropPayload', slug: 'vue/examples/outside-drop-accept-payload' },
                { label: '35 — Named layout presets', slug: 'vue/examples/named-presets' },
                { label: '36 — Localizable ARIA strings', slug: 'vue/examples/aria-labels' },
                { label: '37 — Multi-select & group move/resize', slug: 'vue/examples/multi-select-group-move-resize' },
                { label: '38 — Size constraints & aspect ratio', slug: 'vue/examples/size-constraints-aspect-ratio' },
                { label: '39 — autoScroll', slug: 'vue/examples/auto-scroll' },
                { label: '40 — Layout lifecycle events', slug: 'vue/examples/layout-lifecycle-events' },
                { label: '41 — Layout bounds & rendering options', slug: 'vue/examples/layout-bounds-rendering-options' },
                { label: '42 — Pluggable compaction', slug: 'vue/examples/pluggable-compaction' },
                { label: '43 — Undo/redo', slug: 'vue/examples/undo-redo' },
                { label: '44 — Grid dimensions', slug: 'vue/examples/grid-dimensions' },
                { label: '45 — Switching layouts & forcing a remount', slug: 'vue/examples/switching-layouts-remount' },
                // 46+ are new examples covering real features found
                // during the full documentation audit that had no
                // example in the original 45-example set (added to the
                // library after that set was authored) — see PLAN.md.
                { label: '46 — Align & distribute selected items', slug: 'vue/examples/align-distribute-selected' },
                { label: '47 — Spacing indicators', slug: 'vue/examples/spacing-indicators' },
                { label: '48 — Custom header slot', slug: 'vue/examples/custom-header-slot' },
                { label: '49 — Per-item zIndex override', slug: 'vue/examples/per-item-z-index' },
                { label: '50 — Height modes (heightMode)', slug: 'vue/examples/height-modes' },
                { label: '51 — Drag activation distance', slug: 'vue/examples/drag-activation-distance' },
                { label: '52 — Restricting resize handles to specific edges', slug: 'vue/examples/restrict-resize-handles' },
              ],
            },
          ],
        },
        // React docs, begun for real (packages/react is a complete,
        // tested, full-parity implementation, confirmed directly —
        // see astro.config.mjs's own top comment). Built out
        // incrementally, the same phase order Vue's own docs followed:
        // Guide first, then Features/Components/API/Examples.
        {
          label: 'React',
          items: [
            {
              label: 'Guide',
              items: [
                { label: 'Introduction', slug: 'react/guide/introduction' },
                { label: 'Installation', slug: 'react/guide/installation' },
              ],
            },
            { label: 'Features', slug: 'react/features' },
            {
              label: 'Components',
              items: [
                { label: 'Overview', slug: 'react/components' },
                { label: 'GridLayout props', slug: 'react/components/grid-layout/props' },
                { label: 'GridItem props', slug: 'react/components/grid-item/props' },
                { label: 'Styling', slug: 'react/components/styling' },
              ],
            },
            {
              label: 'API',
              items: [
                { label: 'Overview', slug: 'react/api' },
                { label: 'Imperative handle (IGridLayoutHandle)', slug: 'react/api/interfaces/imperative-handle' },
                { label: 'Layout persistence', slug: 'react/api/interfaces/layout-persistence' },
                { label: 'Cross-grid & outside-drop event payloads', slug: 'react/api/interfaces/event-payloads' },
              ],
            },
            {
              label: 'Examples',
              items: [
                { label: 'Gallery', slug: 'react/examples' },
                { label: '01 — Basic drag & resize', slug: 'react/examples/basic-drag-resize' },
                { label: '02 — Bounded drag to container', slug: 'react/examples/bounded-drag' },
                { label: '03 — Events', slug: 'react/examples/events' },
                { label: '04 — Multiple grids', slug: 'react/examples/multiple-grids' },
                { label: '05 — Drag allow / ignore elements', slug: 'react/examples/drag-allow-ignore-elements' },
                { label: '06 — Mirrored (RTL)', slug: 'react/examples/mirrored-rtl' },
                { label: '07 — Responsive breakpoints', slug: 'react/examples/responsive-breakpoints' },
                { label: '08 — Prevent collision', slug: 'react/examples/prevent-collision' },
                { label: '09 — Responsive predefined layouts', slug: 'react/examples/responsive-predefined-layouts' },
                { label: '10 — Add or remove items', slug: 'react/examples/add-remove-items' },
                { label: '11 — Drag, drop from outside', slug: 'react/examples/outside-drag-drop' },
                { label: '12 — Drag, drop from grid to grid', slug: 'react/examples/cross-grid-drag-drop' },
                { label: '13 — Show close button', slug: 'react/examples/close-button' },
                { label: '14 — Border radius', slug: 'react/examples/border-radius' },
                { label: '15 — Horizontal shift', slug: 'react/examples/horizontal-shift' },
                { label: '16 — Show grid lines', slug: 'react/examples/grid-lines' },
                { label: '17 — Static items', slug: 'react/examples/static-items' },
                { label: '18 — Custom drag handle & close button', slug: 'react/examples/custom-drag-handle-close-button' },
                { label: '19 — Save/load layout', slug: 'react/examples/save-load-layout' },
                { label: '20 — Auto-size grid on content', slug: 'react/examples/auto-size-grid' },
                { label: '21 — Edit mode toggle', slug: 'react/examples/edit-mode-toggle' },
                { label: '22 — Cross-grid drop restrictions', slug: 'react/examples/cross-grid-drop-restrictions' },
                { label: '23 — Drag, drop from outside into multiple grids', slug: 'react/examples/outside-drag-drop-multiple-grids' },
                { label: '24 — Configurable transition duration & easing', slug: 'react/examples/transition-duration-easing' },
                { label: '25 — Custom drag-placeholder content', slug: 'react/examples/custom-drag-placeholder' },
                { label: '26 — Alignment guides while dragging', slug: 'react/examples/alignment-guides' },
                { label: '27 — scrollToItem & focusItem', slug: 'react/examples/scroll-to-item-focus-item' },
                { label: '28 — Export layout as SVG', slug: 'react/examples/svg-export' },
                { label: '29 — compactNow, rearrange & duplicateItem', slug: 'react/examples/compact-now-rearrange-duplicate-item' },
                { label: '30 — Blocked-move feedback', slug: 'react/examples/blocked-move-feedback' },
                { label: '31 — Per-item autoHeight', slug: 'react/examples/per-item-auto-height' },
                { label: '32 — Snap to grid', slug: 'react/examples/snap-to-grid' },
                { label: '33 — Configurable resize-hint appearance', slug: 'react/examples/resize-hint-appearance' },
                { label: '34 — outsideDropAccept & readOutsideDropPayload', slug: 'react/examples/outside-drop-accept-payload' },
                { label: '35 — Named layout presets', slug: 'react/examples/named-presets' },
                { label: '36 — Localizable ARIA strings', slug: 'react/examples/aria-labels' },
                { label: '37 — Multi-select & group move/resize', slug: 'react/examples/multi-select-group-move-resize' },
                { label: '38 — Size constraints & aspect ratio', slug: 'react/examples/size-constraints-aspect-ratio' },
                { label: '39 — autoScroll', slug: 'react/examples/auto-scroll' },
                { label: '40 — Layout lifecycle events', slug: 'react/examples/layout-lifecycle-events' },
                { label: '41 — Layout bounds & rendering options', slug: 'react/examples/layout-bounds-rendering-options' },
                { label: '42 — Pluggable compaction', slug: 'react/examples/pluggable-compaction' },
                { label: '43 — Undo/redo', slug: 'react/examples/undo-redo' },
                { label: '44 — Grid dimensions', slug: 'react/examples/grid-dimensions' },
                { label: '45 — Switching layouts & forcing a remount', slug: 'react/examples/switching-layouts-remount' },
                { label: '46 — Align & distribute selected items', slug: 'react/examples/align-distribute-selected' },
                { label: '47 — Spacing indicators', slug: 'react/examples/spacing-indicators' },
                { label: '48 — Custom header', slug: 'react/examples/custom-header-slot' },
                { label: '49 — Per-item zIndex override', slug: 'react/examples/per-item-z-index' },
                { label: '50 — Height modes (heightMode)', slug: 'react/examples/height-modes' },
                { label: '51 — Drag activation distance', slug: 'react/examples/drag-activation-distance' },
                { label: '52 — Restricting resize handles to specific edges', slug: 'react/examples/restrict-resize-handles' },
              ],
            },
          ],
        },
        // Angular docs, begun for real (packages/angular was
        // confirmed directly — via its own docs/IMPLEMENTATION_PLAN.md
        // and a full read of grid-layout.component.ts/grid-item.
        // component.ts — to be a complete, full-parity implementation,
        // matching Vue/React). Built out incrementally, the same phase
        // order Vue/React's own docs followed: Guide first, then
        // Features/Components/API/Examples.
        {
          label: 'Angular',
          items: [
            {
              label: 'Guide',
              items: [
                { label: 'Introduction', slug: 'angular/guide/introduction' },
                { label: 'Installation', slug: 'angular/guide/installation' },
              ],
            },
            { label: 'Features', slug: 'angular/features' },
            {
              label: 'Components',
              items: [
                { label: 'Overview', slug: 'angular/components' },
                { label: 'GridLayoutComponent props', slug: 'angular/components/grid-layout/props' },
                { label: 'GridItemComponent props', slug: 'angular/components/grid-item/props' },
              ],
            },
            {
              label: 'API',
              items: [
                { label: 'Overview', slug: 'angular/api' },
                { label: 'Public members (GridLayoutComponent)', slug: 'angular/api/interfaces/public-members' },
                { label: 'Layout persistence', slug: 'angular/api/interfaces/layout-persistence' },
                { label: 'Cross-grid & outside-drop event payloads', slug: 'angular/api/interfaces/event-payloads' },
              ],
            },
          ],
        },
        // Core docs — the framework-agnostic shared implementation
        // underneath Vue/React/Angular, not a UI component library
        // itself, so this section deliberately doesn't follow the same
        // Guide/Features/Components/API/Examples shape the three
        // framework packages above use. Placed last since it's an
        // advanced/internals topic most users installing one of the
        // three framework packages never need to open at all (see this
        // section's own Introduction page for who it actually is for).
        {
          label: 'Core',
          items: [
            {
              label: 'Guide',
              items: [
                { label: 'Introduction', slug: 'core/guide/introduction' },
                { label: 'Installation', slug: 'core/guide/installation' },
              ],
            },
            { label: 'API reference', slug: 'core/api' },
          ],
        },
      ],
    }),
  ],
});
