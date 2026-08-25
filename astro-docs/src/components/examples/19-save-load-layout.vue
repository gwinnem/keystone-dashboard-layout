<template>
  <div class="demo-controls">
    <button
      class="demo-btn"
      @click="save">Save</button>
    <button
      class="demo-btn demo-btn--ghost"
      @click="load">Load</button>
    <span
      v-if="status"
      class="demo-status">{{ status }}</span>
  </div>

  <GridLayout
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

  const STORAGE_KEY = 'keystonegrid-example-19-layout';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);

  const status = ref('');

  function save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.value));
    status.value = 'Saved.';
  }

  function load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      status.value = 'Nothing saved yet.';
      return;
    }
    layout.value = JSON.parse(raw) as TLayout;
    status.value = 'Loaded.';
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

.demo-status {
  color: var(--kg-text-lo-light);
  font-size: 12px;
  font-style: italic;
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
