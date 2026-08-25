<template>
  <div class="demo-controls">
    <button
      v-for="id in ['0', '5', '11']"
      :key="id"
      class="demo-btn"
      @click="gridRef?.scrollToItem(id)">Scroll to {{ id }}</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="gridRef?.focusItem('11')">Focus 11</button>
  </div>

  <div class="scroll-frame">
    <GridLayout
      ref="gridRef"
      v-model:layout="layout"
      :col-num="4"
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
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>(
    Array.from({ length: 12 }, (_, index) => ({
      h: 2,
      i: String(index),
      w: 2,
      x: (index % 2) * 2,
      y: Math.floor(index / 2) * 2,
    })),
  );

  const gridRef = ref<InstanceType<typeof GridLayout>>();
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

.scroll-frame {
  height: 260px;
  overflow-y: auto;
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
