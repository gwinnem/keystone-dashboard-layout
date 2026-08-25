import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';

// Standalone Astro + Starlight site. Not part of the pnpm workspace on
// purpose (see package.json's own description) — installs/runs
// independently of the monorepo's turbo pipeline.
//
// Only the Vue section has real sidebar entries today. React and
// Angular get a single placeholder page each until those docs exist —
// see astro-docs/PLAN.md (section 6, "Phase 6") for the sequencing
// this was scoped against.
export default defineConfig({
  integrations: [
    vue(),
    starlight({
      title: 'KeystoneGrid',
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
        // React and Angular don't have real docs yet (see PLAN.md,
        // Phase 6) — each gets a real top-level sidebar group of its
        // own, matching Vue's structure, so the framework-aware Sidebar
        // override below has something genuine to isolate to instead of
        // falling back to Vue's full tree while browsing a different
        // framework's placeholder page. Deliberately just the one real
        // page each has today — no invented sub-sections.
        {
          label: 'React',
          items: [
            { label: 'Coming soon', slug: 'react' },
          ],
        },
        {
          label: 'Angular',
          items: [
            { label: 'Coming soon', slug: 'angular' },
          ],
        },
      ],
    }),
  ],
});
