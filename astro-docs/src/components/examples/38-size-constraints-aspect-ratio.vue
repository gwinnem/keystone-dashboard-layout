<template>
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
      :max-h="item.i === '0' ? 4 : undefined"
      :max-w="item.i === '0' ? 5 : undefined"
      :min-h="item.i === '0' ? 2 : undefined"
      :min-w="item.i === '0' ? 2 : undefined"
      :preserve-aspect-ratio="item.i === '1'"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        {{ item.i === '0' ? 'w: 2-5, h: 2-4' : item.i === '1' ? 'aspect locked' : item.i }}
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
    { h: 2, i: '1', w: 2, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 5, y: 0 },
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
  font-size: 11px;
  height: 100%;
  justify-content: center;
  padding: 0 8px;
  text-align: center;
  width: 100%;
}
</style>
