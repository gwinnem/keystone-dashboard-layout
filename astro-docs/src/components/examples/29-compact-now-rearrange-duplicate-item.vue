<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="scatter">Scatter (leaves gaps)</button>
    <button
      class="demo-btn"
      @click="gridRef?.compactNow()">Tidy up (compactNow)</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="gridRef?.duplicateItem('a')">Duplicate item "a"</button>
  </div>

  <GridLayout
    ref="gridRef"
    v-model:layout="layout"
    :col-num="12"
    :compact-type="ECompactType.NONE"
    :row-height="60"
    show-close-button
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y"
      @remove-grid-item="removeItem">
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  // compactType: NONE — without this, the default vertical compaction
  // would re-run on every external layout change (including scatter's
  // own random repositioning below) and immediately re-tidy everything
  // right back, leaving no visible gap for compactNow()/rearrange() to
  // demonstrably fix at all.
  const layout = ref<TLayout>([
    { h: 2, i: 'a', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b', w: 3, x: 3, y: 0 },
    { h: 2, i: 'c', w: 3, x: 6, y: 0 },
    { h: 2, i: 'd', w: 3, x: 9, y: 0 },
  ]);

  const gridRef = ref<InstanceType<typeof GridLayout>>();

  function scatter(): void {
    layout.value = layout.value.map((item) => ({
      ...item,
      x: Math.floor(Math.random() * 9),
      y: Math.floor(Math.random() * 6),
    }));
  }

  function removeItem(id: string | number): void {
    layout.value = layout.value.filter((item) => item.i !== id);
  }
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
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
