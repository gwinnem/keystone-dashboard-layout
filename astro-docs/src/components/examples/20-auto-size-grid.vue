<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="autoSize"
      label="autoSize" />
  </div>

  <div
    class="fixed-frame"
    :class="{ 'fixed-frame--scroll': !autoSize }">
    <GridLayout
      v-model:layout="layout"
      :auto-size="autoSize"
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
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';

  const autoSize = ref(true);

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 4, x: 0, y: 0 },
    { h: 3, i: '1', w: 4, x: 4, y: 0 },
    { h: 4, i: '2', w: 4, x: 8, y: 0 },
  ]);
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.fixed-frame--scroll {
  border: 1px dashed var(--kg-line-light);
  height: 220px;
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
