<template>
  <div class="demo-controls">
    <span class="demo-description">
      Instead of letting the library auto-generate a layout for each
      breakpoint, you can hand it exact layouts to switch between via
      <code>responsiveLayouts</code>. Shrink the panel (or your window)
      to see the hand-authored mobile layout kick in below
      <code>md</code>. Current breakpoint: <strong>{{ lastBreakpoint }}</strong>
    </span>
  </div>

  <GridLayout
    v-model:layout="layout"
    responsive
    :responsive-layouts="responsiveLayouts"
    :row-height="50"
    show-grid-lines
    @breakpoint-changed="onBreakpointChanged">
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout, type TResponsiveLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const lastBreakpoint = ref('—');

  function onBreakpointChanged(breakpoint: string): void {
    lastBreakpoint.value = breakpoint;
  }

  // The default (large-screen) layout — three items side by side.
  // Ported directly from the previous VitePress-based docs site's own
  // identical example (confirmed via a direct source read): a more
  // realistic "header/sidebar/content" dashboard shape than a flat row
  // of interchangeable items, and the `xs` breakpoint (480px) rather
  // than `sm` (768px) — the lower, more readily-crossable threshold
  // that a narrow docs-example panel can actually reach.
  const layout = ref<TLayout>([
    { h: 2, i: 'header', w: 6, x: 0, y: 0 },
    { h: 3, i: 'sidebar', w: 2, x: 0, y: 2 },
    { h: 3, i: 'content', w: 4, x: 2, y: 2 },
  ]);

  // Hand-authored layout for narrow screens: stack everything, sidebar last.
  const responsiveLayouts: TResponsiveLayout = {
    xs: [
      { h: 2, i: 'header', w: 4, x: 0, y: 0 },
      { h: 4, i: 'content', w: 4, x: 0, y: 2 },
      { h: 3, i: 'sidebar', w: 4, x: 0, y: 6 },
    ],
  };
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
}

.example-item {
  align-items: center;
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  display: flex;
  font-family: var(--kg-font-mono);
  height: 100%;
  justify-content: center;
  width: 100%;
}
</style>
