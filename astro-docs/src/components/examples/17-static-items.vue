<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-close-button
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :is-static="item.i === 'anchor'"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div
        class="example-item"
        :class="{ 'example-item--static': item.i === 'anchor' }">
        {{ item.i === 'anchor' ? 'locked in place' : item.i }}
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: 'anchor', w: 4, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 4, y: 0 },
    { h: 2, i: '2', w: 2, x: 6, y: 0 },
  ]);
</script>

<style scoped>
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

.example-item--static {
  background: var(--kg-paper-3);
  border-color: var(--kg-blueprint-deep);
  color: var(--kg-blueprint-deep);
}
</style>
