<template>
  <div class="demo-controls">
    <span class="demo-description">Current breakpoint: <strong>{{ lastBreakpoint }}</strong></span>
  </div>

  <GridLayout
    v-model:layout="layout"
    responsive
    :responsive-layouts="responsiveLayouts"
    :row-height="60"
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
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout, type TResponsiveLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const lastBreakpoint = ref('lg');

  function onBreakpointChanged(breakpoint: string): void {
    lastBreakpoint.value = breakpoint;
  }

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
    { h: 2, i: '3', w: 3, x: 9, y: 0 },
  ]);

  // A deliberately different arrangement at 'sm' — stacked in a single
  // column, reordered — not just a narrower reflow of the 'lg' layout.
  const responsiveLayouts: TResponsiveLayout = {
    sm: [
      { h: 2, i: '3', w: 6, x: 0, y: 0 },
      { h: 2, i: '0', w: 6, x: 0, y: 2 },
      { h: 2, i: '1', w: 6, x: 0, y: 4 },
      { h: 2, i: '2', w: 6, x: 0, y: 6 },
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
