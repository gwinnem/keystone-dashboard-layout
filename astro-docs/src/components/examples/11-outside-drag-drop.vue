<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="verticalCompactEnabled"
      label="compactType (vertical vs none)" />
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
    :compact-type="compactType"
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

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
  ]);

  const verticalCompactEnabled = ref(true);
  const compactType = computed(() => (verticalCompactEnabled.value ? ECompactType.VERTICAL : ECompactType.NONE));

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
  align-items: center;
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
