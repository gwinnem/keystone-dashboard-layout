<template>
  <div class="demo-controls">
    <label>
      Collision mode
      <select v-model="mode">
        <option value="swap">swap: trade places</option>
        <option value="push">push: shove aside (default)</option>
      </select>
    </label>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :collision-mode="mode"
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
      <div class="example-item">{{ item.i }}</div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TCollisionMode, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  const mode = ref<TCollisionMode>('swap');

  // Equal-size tiles: dropping one on another always has a clean cell to swap into.
  const layout = ref<TLayout>([
    { h: 2, i: 'A', w: 4, x: 0, y: 0 },
    { h: 2, i: 'B', w: 4, x: 4, y: 0 },
    { h: 2, i: 'C', w: 4, x: 8, y: 0 },
    { h: 2, i: 'D', w: 4, x: 0, y: 2 },
    { h: 2, i: 'E', w: 4, x: 4, y: 2 },
    { h: 2, i: 'F', w: 4, x: 8, y: 2 },
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
  font-size: 14px;
  height: 100%;
  justify-content: center;
  padding: 8px;
  text-align: center;
  width: 100%;
}
</style>
