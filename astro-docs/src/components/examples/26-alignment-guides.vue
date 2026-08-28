<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="showAlignmentGuides"
      label="showAlignmentGuides" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :compact-type="ECompactType.NONE"
    :row-height="60"
    :show-alignment-guides="showAlignmentGuides"
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

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const showAlignmentGuides = ref(true);

  // compactType: NONE — without this, the default vertical compaction
  // actively fights against positioning items to test alignment: items
  // would snap/settle after each drag rather than staying exactly
  // where placed, making it hard to actually see two edges line up.
  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 4, y: 0 },
    { h: 2, i: '2', w: 2, x: 6, y: 4 },
  ]);
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
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
  height: 100%;
  justify-content: center;
  width: 100%;
}
</style>
