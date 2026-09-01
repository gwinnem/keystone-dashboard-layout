<template>
  <div class="demo-controls">
    <button class="demo-btn" type="button" @click="addRow">+ Add row</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="removeRow">- Remove row</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    auto-size
    :col-num="12"
    :row-height="50"
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

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 6, x: 0, y: 0 },
    { h: 2, i: '1', w: 6, x: 6, y: 0 },
  ]);

  let nextRow = 1;

  function addRow(): void {
    const y = layout.value.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    layout.value.push({ h: 2, i: `row-${nextRow}`, w: 12, x: 0, y });
    nextRow += 1;
  }

  function removeRow(): void {
    if (layout.value.length > 1) {
      layout.value.pop();
    }
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
