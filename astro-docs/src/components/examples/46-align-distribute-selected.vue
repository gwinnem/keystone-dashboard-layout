<template>
  <div class="demo-controls">
    <span class="demo-description">Selected: {{ gridRef?.selectedItems?.join(', ') || 'none' }}</span>
    <button
      class="demo-btn"
      @click="gridRef?.alignSelected('left')">Align left</button>
    <button
      class="demo-btn"
      @click="gridRef?.alignSelected('center-x')">Align center-x</button>
    <button
      class="demo-btn"
      @click="gridRef?.alignSelected('right')">Align right</button>
    <button
      class="demo-btn"
      @click="gridRef?.alignSelected('top')">Align top</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="gridRef?.distributeSelected('horizontal')">Distribute horizontal</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="gridRef?.distributeSelected('vertical')">Distribute vertical</button>
  </div>

  <GridLayout
    ref="gridRef"
    v-model:layout="layout"
    :compact-type="ECompactType.NONE"
    multi-select
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
  import { ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: 'a', w: 2, x: 0, y: 0 },
    { h: 2, i: 'b', w: 3, x: 3, y: 2 },
    { h: 2, i: 'c', w: 2, x: 7, y: 1 },
    { h: 2, i: 'd', w: 2, x: 5, y: 4 },
  ]);

  const gridRef = ref<InstanceType<typeof GridLayout>>();
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
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

.demo-btn--ghost {
  background: transparent;
  border: 1px solid var(--kg-line-light);
  color: var(--kg-text-hi-light);
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
