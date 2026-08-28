<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="isDraggable"
      label="isDraggable" />
    <ExampleToggle
      v-model="isResizable"
      label="isResizable" />
    <ExampleNumberField
      v-model="colNum"
      label="colNum"
      :max="12"
      :min="1" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="colNum"
    :is-draggable="isDraggable"
    :is-resizable="isResizable"
    :row-height="60"
    show-grid-lines
    @dragend="activeId = null"
    @dragstart="activeId = $event">
    <GridItem
      v-for="(item, index) in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div
        class="panel"
        :class="{ 'panel--active': activeId === item.i }">
        <span class="panel__title">panel {{ letters[index] }}</span>
        <span class="panel__bar" />
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import ExampleNumberField from '../harness/ExampleNumberField.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const isDraggable = ref(true);
  const isResizable = ref(true);
  const colNum = ref(12);
  const activeId = ref<string | number | null>(null);
  const letters = ['a', 'b', 'c', 'd', 'e'];

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 2, y: 0 },
    { h: 2, i: '2', w: 2, x: 4, y: 0 },
    { h: 4, i: '3', w: 2, x: 6, y: 0 },
    { h: 2, i: '4', w: 2, x: 8, y: 0 },
  ]);
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.panel {
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(20, 23, 26, 0.06);
  height: 100%;
  padding: 12px 14px;
  position: relative;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
}

.panel--active {
  border-color: var(--kg-amber-deep);
  box-shadow: 0 0 0 1px var(--kg-amber-deep), 0 6px 16px rgba(156, 98, 8, 0.18);
}

.panel--active::after {
  background: var(--kg-amber);
  border-radius: 50%;
  content: '';
  height: 6px;
  position: absolute;
  right: 8px;
  top: 8px;
  width: 6px;
}

.panel__title {
  color: var(--kg-blueprint-deep);
  display: block;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  font-weight: 500;
}

.panel--active .panel__title {
  color: var(--kg-amber-deep);
}

.panel__bar {
  background: var(--kg-line-light);
  border-radius: 2px;
  display: block;
  height: 4px;
  margin-top: 10px;
  width: 60%;
}
</style>
