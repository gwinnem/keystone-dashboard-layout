<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="70"
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :drag-allow-from="item.i === '0' ? '.drag-handle' : null"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        <div
          v-if="item.i === '0'"
          class="drag-handle">
          drag here
        </div>
        <div class="item-body">
          {{ item.i }}
          <button
            v-if="item.i === '1'"
            class="no-drag-btn"
            @click.stop>not draggable</button>
        </div>
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);
</script>

<style scoped>
.example-item {
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  font-family: var(--kg-font-mono);
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.drag-handle {
  align-items: center;
  background: var(--kg-blueprint);
  color: white;
  cursor: grab;
  display: flex;
  font-size: 11px;
  height: 24px;
  justify-content: center;
}

.item-body {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100% - 24px);
  justify-content: center;
}

.no-drag-btn {
  background: var(--kg-paper-3);
  border: 1px solid var(--kg-line-light);
  border-radius: 4px;
  cursor: default;
  font-size: 10px;
  padding: 2px 6px;
}
</style>
