<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="addItem">+ Add item</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-close-button
    show-grid-lines
    @remove-grid-item="removeItem">
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

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);

  let nextId = 2;

  function addItem(): void {
    layout.value.push({ h: 2, i: String(nextId), w: 3, x: 0, y: Infinity });
    nextId += 1;
  }

  function removeItem(id: string | number): void {
    layout.value = layout.value.filter((item) => item.i !== id);
  }
</script>

<style scoped>
.demo-controls {
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
