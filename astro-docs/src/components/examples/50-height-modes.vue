<template>
  <div class="demo-controls">
    <select
      v-model="heightMode"
      class="demo-select">
      <option value="auto">auto (grows to fit, default)</option>
      <option value="fixed">fixed (no explicit height)</option>
      <option value="scroll">scroll (fixed frame height, scrolls)</option>
      <option value="fit">fit (100% of parent, scrolls)</option>
    </select>
  </div>

  <div class="fixed-frame">
    <GridLayout
      v-model:layout="layout"
      :col-num="6"
      :height-mode="heightMode"
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
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  const heightMode = ref<'auto' | 'fixed' | 'scroll' | 'fit'>('auto');

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 3, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 0, y: 6 },
    { h: 2, i: '3', w: 3, x: 3, y: 8 },
  ]);
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.demo-select {
  border: 1px solid var(--kg-line-light);
  border-radius: 6px;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 4px 8px;
}

.fixed-frame {
  border: 1px dashed var(--kg-line-light);
  height: 260px;
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
