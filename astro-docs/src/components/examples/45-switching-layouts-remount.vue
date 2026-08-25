<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="switchLayout('a')">Layout A</button>
    <button
      class="demo-btn"
      @click="switchLayout('b')">Layout B</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="forceRemount">Force remount</button>
  </div>

  <GridLayout
    :key="remountKey"
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
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
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layoutA: TLayout = [
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ];

  const layoutB: TLayout = [
    { h: 3, i: '0', w: 4, x: 0, y: 0 },
    { h: 2, i: '1', w: 4, x: 4, y: 0 },
    { h: 2, i: '2', w: 4, x: 8, y: 0 },
  ];

  const layout = ref<TLayout>([...layoutA]);
  const remountKey = ref(0);

  function switchLayout(which: 'a' | 'b'): void {
    layout.value = (which === 'a' ? layoutA : layoutB).map((item) => ({ ...item }));
  }

  function forceRemount(): void {
    remountKey.value += 1;
  }
</script>

<style scoped>
.demo-controls {
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
