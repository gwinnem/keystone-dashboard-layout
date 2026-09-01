<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="forceRemount"
      label="Force remount on switch" />
    <button
      class="demo-btn"
      @click="switchTo('a')">Switch to Layout A</button>
    <button
      class="demo-btn"
      @click="switchTo('b')">Switch to Layout B</button>
  </div>

  <GridLayout
    :key="forceRemount ? gridKey : 'stable'"
    ref="gridRef"
    v-model:layout="layout"
    :col-num="12"
    enable-undo-redo
    :row-height="70"
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

  <p class="demo-description">Current layout: <strong>{{ currentLayoutName }}</strong></p>
  <p class="demo-description">canUndo: <strong>{{ gridRef?.canUndo ?? false }}</strong></p>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layoutA: TLayout = [
    { h: 2, i: 'a0', w: 2, x: 0, y: 0 },
    { h: 2, i: 'a1', w: 2, x: 2, y: 0 },
    { h: 2, i: 'a2', w: 2, x: 4, y: 0 },
  ];

  // Deliberately the same length (3 items) as layoutA — GridLayout
  // commits an undo point whenever the layout's own length changes,
  // which would otherwise fire on every switch regardless of whether
  // anything was actually dragged, confounding this example's own
  // demonstration of canUndo staying stale specifically from Layout
  // A's own drag.
  const layoutB: TLayout = [
    { h: 3, i: 'b0', w: 4, x: 0, y: 0 },
    { h: 3, i: 'b1', w: 4, x: 4, y: 0 },
    { h: 2, i: 'b2', w: 8, x: 0, y: 3 },
  ];

  const layout = ref<TLayout>(structuredClone(layoutA));
  const currentLayoutName = ref<'A' | 'B'>('A');
  const forceRemount = ref(false);
  const gridRef = ref<InstanceType<typeof GridLayout>>();

  // Only meaningful while forceRemount is on — changing this changes
  // GridLayout's own :key above, which is what actually triggers Vue
  // to unmount and remount the component (a fresh instance, all
  // internal state reset) rather than just reactively updating props
  // on the existing one. Incrementing on every switch (not just
  // toggling true/false once) means switching back and forth between
  // A and B remounts every time, not just the first switch after
  // enabling it.
  const gridKey = ref(0);

  function switchTo(target: 'a' | 'b'): void {
    layout.value = structuredClone(target === 'a' ? layoutA : layoutB);
    currentLayoutName.value = target === 'a' ? 'A' : 'B';
    gridKey.value += 1;
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

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
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
