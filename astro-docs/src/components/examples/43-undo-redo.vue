<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      :disabled="!gridRef?.canUndo"
      @click="gridRef?.undo()">Undo</button>
    <button
      class="demo-btn"
      :disabled="!gridRef?.canRedo"
      @click="gridRef?.redo()">Redo</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="addItem">Add item</button>
    <ExampleNumberField
      v-model="undoHistoryLimit"
      label="undoHistoryLimit"
      :max="20"
      :min="1" />
  </div>

  <GridLayout
    ref="gridRef"
    v-model:layout="layout"
    :col-num="12"
    enable-undo-redo
    :row-height="60"
    show-grid-lines
    :undo-history-limit="undoHistoryLimit">
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
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleNumberField from '../harness/ExampleNumberField.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 2, y: 0 },
    { h: 2, i: '2', w: 2, x: 4, y: 0 },
  ]);

  const gridRef = ref<InstanceType<typeof GridLayout>>();
  let nextId = 3;
  // Set well below the library's own default (50) specifically so the
  // cap itself is easy to observe: add more items than the limit, then
  // keep undoing — canUndo becomes false before every addition is
  // undone, since the oldest snapshot was already dropped to stay
  // under it.
  const undoHistoryLimit = ref(3);

  function addItem(): void {
    layout.value.push({ h: 2, i: String(nextId), w: 2, x: 0, y: Infinity });
    nextId += 1;
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
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

.demo-btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
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
