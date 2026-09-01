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
      :max-h="item.maxH"
      :max-w="item.maxW"
      :min-h="item.minH"
      :min-w="item.minW"
      :preserve-aspect-ratio="item.preserveAspectRatio"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        {{ item.label }}
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<(TLayout[number] & {
    label: string;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    preserveAspectRatio?: boolean;
  })[]>([
    { h: 2, i: '0', label: 'minW: 2, maxW: 4', maxW: 4, minW: 2, w: 3, x: 0, y: 0 },
    { h: 2, i: '1', label: 'minH: 2, maxH: 3', maxH: 3, minH: 2, w: 3, x: 3, y: 0 },
    { h: 2, i: '2', label: 'preserveAspectRatio', preserveAspectRatio: true, w: 3, x: 6, y: 0 },
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
