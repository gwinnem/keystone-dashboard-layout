<template>
  <div class="demo-controls">
    <div
      v-for="widget in widgets"
      :key="widget.label"
      class="outside-source"
      draggable="true"
      @dragstart="onDragStart($event, widget.label)">
      &#8942; {{ widget.label }}
    </div>
  </div>

  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Grid 1</p>
      <GridLayout
        v-model:layout="leftLayout"
        allow-cross-grid-drag
        allow-outside-drop
        :col-num="6"
        layout-id="outside-drag-drop-multiple-grids-left"
        :outside-drop-height="2"
        :outside-drop-width="2"
        :row-height="60"
        show-grid-lines
        @item-dropped-from-outside="onDropped('left', $event)">
        <GridItem
          v-for="item in leftLayout"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.label ?? item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
    <div class="grid-column">
      <p class="grid-label">Grid 2</p>
      <GridLayout
        v-model:layout="rightLayout"
        allow-cross-grid-drag
        allow-outside-drop
        :col-num="6"
        layout-id="outside-drag-drop-multiple-grids-right"
        :outside-drop-height="2"
        :outside-drop-width="2"
        :row-height="60"
        show-grid-lines
        @item-dropped-from-outside="onDropped('right', $event)">
        <GridItem
          v-for="item in rightLayout"
          :key="item.i"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="example-item">{{ item.label ?? item.i }}</div>
        </GridItem>
      </GridLayout>
    </div>
  </div>

  <LayoutJsonViewer label="Grid 1" :layout="leftLayout" />
  <LayoutJsonViewer label="Grid 2" :layout="rightLayout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const widgets = [{ label: 'A' }, { label: 'B' }];

  type TDroppableLayout = (TLayout[number] & { label?: string })[];
  const leftLayout = ref<TDroppableLayout>([{ h: 2, i: 'left-0', w: 2, x: 0, y: 0 }]);
  const rightLayout = ref<TDroppableLayout>([]);

  function onDragStart(event: DragEvent, label: string): void {
    event.dataTransfer?.setData('text/plain', label);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  interface IOutsideDropPayload {
    x: number;
    y: number;
    w: number;
    h: number;
    dataTransfer: DataTransfer | null;
  }

  // Both grids also set `allowCrossGridDrag`, a separate, independent
  // mechanism from `allowOutsideDrop` — an item already placed in one
  // grid can be dragged into the other too, not just new items from
  // the palette. Reading `dataTransfer` back here (rather than a fixed
  // string like other outside-drop examples use) is what actually
  // names the new item meaningfully — the library has no way to know
  // what a plain draggable element represents on its own.
  function onDropped(gridId: 'left' | 'right', payload: IOutsideDropPayload): void {
    const label = payload.dataTransfer?.getData('text/plain') || 'New';
    const target = gridId === 'left' ? leftLayout : rightLayout;
    target.value = [
      ...target.value,
      { h: payload.h, i: String(Date.now()), label, w: payload.w, x: payload.x, y: payload.y },
    ];
  }
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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

.grid-column :deep(.vue-grid-layout) {
  min-height: 140px;
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
