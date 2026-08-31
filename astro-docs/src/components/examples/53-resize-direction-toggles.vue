<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="n"
      label="N" />
    <ExampleToggle
      v-model="s"
      label="S" />
    <ExampleToggle
      v-model="e"
      label="E" />
    <ExampleToggle
      v-model="w"
      label="W" />
    <ExampleToggle
      v-model="ne"
      label="NE" />
    <ExampleToggle
      v-model="nw"
      label="NW" />
    <ExampleToggle
      v-model="se"
      label="SE" />
    <ExampleToggle
      v-model="sw"
      label="SW" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-grid-lines
    show-resize-handles>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :resize-handles="resizeHandles"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">{{ resizeHandles.length ? resizeHandles.join(', ') : 'none' }}</div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import type { TResizeHandle } from '@keystone-dashboard-layout/core';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';

  const n = ref(true);
  const s = ref(true);
  const e = ref(true);
  const w = ref(false);
  const ne = ref(true);
  const nw = ref(false);
  const se = ref(true);
  const sw = ref(false);

  const resizeHandles = computed<TResizeHandle[]>(() => {
    const handles: TResizeHandle[] = [];
    if (n.value) handles.push('n');
    if (s.value) handles.push('s');
    if (e.value) handles.push('e');
    if (w.value) handles.push('w');
    if (ne.value) handles.push('ne');
    if (nw.value) handles.push('nw');
    if (se.value) handles.push('se');
    if (sw.value) handles.push('sw');
    return handles;
  });

  const layout = ref<TLayout>([
    { h: 3, i: '0', w: 4, x: 4, y: 0 },
  ]);
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 16px;
}

.example-item {
  align-items: center;
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  display: flex;
  font-family: var(--kg-font-mono);
  font-size: 11px;
  height: 100%;
  justify-content: center;
  padding: 8px;
  text-align: center;
  width: 100%;
}
</style>
