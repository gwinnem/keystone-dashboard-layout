<template>
  <div class="demo-controls">
    <div
      class="outside-source"
      draggable="true"
      @dragstart="onDragStart">
      drag me in
    </div>
  </div>

  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Grid A</p>
      <GridLayout
        v-model:layout="layoutA"
        allow-outside-drop
        :col-num="6"
        :row-height="60"
        show-grid-lines
        @item-dropped-from-outside="onDroppedA">
        <GridItem
          v-for="item in layoutA"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
    <div class="grid-column">
      <p class="grid-label">Grid B</p>
      <GridLayout
        v-model:layout="layoutB"
        allow-outside-drop
        :col-num="6"
        :row-height="60"
        show-grid-lines
        @item-dropped-from-outside="onDroppedB">
        <GridItem
          v-for="item in layoutB"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layoutA = ref<TLayout>([]);
  const layoutB = ref<TLayout>([]);

  let nextId = 0;

  function onDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('text/plain', 'from-outside');
  }

  function onDroppedA({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    layoutA.value.push({ h, i: `a${nextId}`, w, x, y });
    nextId += 1;
  }

  function onDroppedB({ x, y, w, h }: { x: number; y: number; w: number; h: number }): void {
    layoutB.value.push({ h, i: `b${nextId}`, w, x, y });
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

.grids-row {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.grid-label {
  color: var(--kg-text-lo-light);
  font-family: var(--kg-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
  text-transform: uppercase;
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
