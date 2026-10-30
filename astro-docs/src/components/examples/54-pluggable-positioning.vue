<template>
  <div class="demo-controls">
    <label>
      Positioning strategy
      <select v-model="choice">
        <option value="transform">transformStrategy (CSS transforms)</option>
        <option value="top-left">topLeftStrategy (top / left)</option>
        <option value="outline">custom: top / left + outline</option>
      </select>
    </label>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :position-strategy="strategy"
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
      <div class="example-item">{{ item.i }} &middot; {{ choice }}</div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import {
    GridLayout,
    GridItem,
    topLeftStrategy,
    transformStrategy,
    type IPositionStrategy,
    type TLayout,
  } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  // A custom strategy: reuse the built-in top/left output and add to it.
  // getStyle() must keep width/height as 'NNpx' strings.
  const outlineStrategy: IPositionStrategy = {
    className: 'strategy-outline',
    getStyle: (position) => ({
      ...topLeftStrategy.getStyle(position),
      outline: '2px dashed #f59e0b',
      outlineOffset: '-2px',
    }),
    type: 'outline',
  };

  const choice = ref<'transform' | 'top-left' | 'outline'>('transform');

  const strategy = computed<IPositionStrategy>(() => {
    if (choice.value === 'top-left') return topLeftStrategy;
    if (choice.value === 'outline') return outlineStrategy;
    return transformStrategy;
  });

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 4, x: 0, y: 0 },
    { h: 3, i: '1', w: 4, x: 4, y: 0 },
    { h: 2, i: '2', w: 4, x: 8, y: 0 },
    { h: 2, i: '3', w: 6, x: 0, y: 3 },
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
