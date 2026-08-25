<template>
  <div class="demo-controls">
    <div
      class="outside-source"
      draggable="true"
      @dragstart="onDragStart">
      drag me in
    </div>
  </div>

  <GridLayout
    v-model:layout="layout"
    allow-outside-drop
    :col-num="12"
    :outside-drop-height="2"
    :outside-drop-width="3"
    :row-height="60"
    show-grid-lines
    @item-dropped-from-outside="onDropped">
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
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
  ]);

  let nextId = 1;

  function onDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', 'from-outside');
  }

  function onDropped({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    layout.value.push({ h, i: String(nextId), w, x, y });
    nextId += 1;
  }
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.outside-source {
  background: var(--kg-amber);
  border-radius: 6px;
  color: #2b1b02;
  cursor: grab;
  display: inline-block;
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
