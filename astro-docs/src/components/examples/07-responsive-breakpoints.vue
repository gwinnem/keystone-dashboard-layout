<template>
  <div class="demo-controls">
    <span class="demo-description">
      This example's own container is narrower than the library's
      default breakpoints (designed for a full browser window), so the
      breakpoints here are scaled down to fit it — shrink the panel
      below (or your browser window) to see the column count step down
      at each one. Current breakpoint: <strong>{{ lastBreakpoint }}</strong>
    </span>
  </div>

  <GridLayout
    v-model:layout="layout"
    :breakpoints="breakpoints"
    :cols="cols"
    responsive
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

  <p class="demo-description">
    This example's own breakpoints (columns): <code>xxl &ge;600 (12 cols)</code>,
    <code>xl &ge;500 (12 cols)</code>, <code>lg &ge;400 (12 cols)</code>,
    <code>md &ge;320 (10 cols)</code>, <code>sm &ge;240 (6 cols)</code>,
    <code>xs &ge;160 (4 cols)</code>, <code>xxs &lt;160 (2 cols)</code>
    — the library's own defaults are much larger (see the API reference),
    sized for a real page rather than a docs-example panel.
  </p>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type IBreakpoints, type IColumns, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const lastBreakpoint = ref('—');

  function onBreakpointChanged(breakpoint: string): void {
    lastBreakpoint.value = breakpoint;
  }

  // Scaled down from the library's own defaults (xxl:1600/xl:1400/
  // lg:1200/md:996/sm:768/xs:480/xxs:0) to fit this example's own
  // narrow container — the default thresholds, designed for a real
  // page, are never reached at all inside a docs-example panel this
  // narrow, so every breakpoint below "sm" would be completely
  // undemonstrable here otherwise. Ported directly from the previous
  // VitePress-based docs site's own identical fix (confirmed via a
  // direct source read).
  const breakpoints: IBreakpoints = { lg: 400, md: 320, sm: 240, xl: 500, xs: 160, xxl: 600, xxs: 0 };
  const cols: IColumns = { lg: 12, md: 10, sm: 6, xl: 12, xs: 4, xxl: 12, xxs: 2 };

  const layout = ref<TLayout>([
    // Row 1: a full-width header band.
    { h: 1, i: '0', w: 12, x: 0, y: 0 },
    // Row 2: three equal-width cards.
    { h: 2, i: '1', w: 4, x: 0, y: 1 },
    { h: 2, i: '2', w: 4, x: 4, y: 1 },
    { h: 2, i: '3', w: 4, x: 8, y: 1 },
    // Row 3: two wider cards, an asymmetric split.
    { h: 2, i: '4', w: 8, x: 0, y: 3 },
    { h: 2, i: '5', w: 4, x: 8, y: 3 },
  ]);
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
