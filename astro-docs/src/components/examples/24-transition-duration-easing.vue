<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="shuffle">Shuffle</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="resetLayout">Reset layout</button>
    <ExampleNumberField
      v-model="transitionDurationMs"
      label="transitionDurationMs"
      :max="2000"
      :min="0" />
    <select
      v-model="transitionTimingFunction"
      class="demo-select">
      <option value="ease">ease</option>
      <option value="linear">linear</option>
      <option value="ease-in-out">ease-in-out</option>
      <option value="cubic-bezier(.68,-0.55,.27,1.55)">bounce-ish</option>
    </select>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-grid-lines
    :transition-duration-ms="transitionDurationMs"
    :transition-timing-function="transitionTimingFunction">
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

  // Kept as its own constant (not read back out of `layout` itself) so
  // "Reset layout" always restores the exact original positions, not
  // whatever the layout happened to compact/shuffle into after some
  // interaction — otherwise comparing different duration/easing
  // settings has no way to get back to a consistent starting point
  // without reloading the whole page.
  const INITIAL_LAYOUT: TLayout = [
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
    { h: 2, i: '3', w: 3, x: 9, y: 0 },
  ];

  const layout = ref<TLayout>(INITIAL_LAYOUT.map((item) => ({ ...item })));

  const transitionDurationMs = ref(600);
  const transitionTimingFunction = ref('ease');

  function shuffle(): void {
    layout.value = [...layout.value]
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({ ...item, x: (index % 4) * 3, y: Math.floor(index / 4) * 2 }));
  }

  function resetLayout(): void {
    layout.value = INITIAL_LAYOUT.map((item) => ({ ...item }));
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

.demo-btn--ghost {
  background: transparent;
  border: 1px solid var(--kg-line-light);
  color: var(--kg-text-hi-light);
}

.demo-select {
  border: 1px solid var(--kg-line-light);
  border-radius: 6px;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 4px 8px;
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
