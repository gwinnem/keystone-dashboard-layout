<template>
  <div class="demo-controls">
    <select
      v-model="mode"
      class="demo-select">
      <option value="vertical">compactType: vertical</option>
      <option value="horizontal">compactType: horizontal</option>
      <option value="none">compactType: none</option>
      <option value="vertical-overlap">compactType: vertical-overlap</option>
      <option value="custom">custom compactor: single column</option>
    </select>
    <button
      class="demo-btn"
      @click="scatter">Scatter</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :compact-type="compactType"
    :compactor="customCompactor"
    :row-height="60"
    show-grid-lines>
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
  import { computed, ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout, type ICompactor } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  type TMode = 'vertical' | 'horizontal' | 'none' | 'vertical-overlap' | 'custom';

  const mode = ref<TMode>('vertical');

  const compactType = computed(() => {
    switch (mode.value) {
      case 'horizontal': return ECompactType.HORIZONTAL;
      case 'none': return ECompactType.NONE;
      case 'vertical-overlap': return ECompactType.VERTICAL_OVERLAP;
      default: return ECompactType.VERTICAL;
    }
  });

  // A custom ICompactor — stacks every non-static item into a single
  // left-hand column, one after another, ignoring x/width entirely.
  // Deliberately dramatic/simple for clarity, not a realistic default.
  const singleColumnCompactor: ICompactor = {
    type: 'single-column',
    compact(inputLayout) {
      let nextY = 0;
      return inputLayout.map(item => {
        if (item.isStatic) return item;
        const positioned = { ...item, x: 0, y: nextY };
        nextY += item.h;
        return positioned;
      });
    },
  };

  const customCompactor = computed(() => (mode.value === 'custom' ? singleColumnCompactor : null));

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
    { h: 2, i: '3', w: 3, x: 9, y: 0 },
  ]);

  function scatter(): void {
    layout.value = layout.value.map(item => ({
      ...item,
      x: Math.floor(Math.random() * 9),
      y: Math.floor(Math.random() * 6),
    }));
  }
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.demo-select {
  border: 1px solid var(--kg-line-light);
  border-radius: 6px;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 4px 8px;
}

.demo-btn {
  background: var(--kg-blueprint);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 6px 12px;
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
