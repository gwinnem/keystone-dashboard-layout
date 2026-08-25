<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="autoScroll"
      label="autoScroll" />
  </div>

  <div class="scroll-frame">
    <GridLayout
      v-model:layout="layout"
      :col-num="6"
      :row-height="60"
      show-grid-lines>
      <GridItem
        v-for="item in layout"
        :key="item.i"
        :auto-scroll="autoScroll"
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

  const autoScroll = ref(true);

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 2, y: 8 },
    { h: 2, i: '2', w: 2, x: 0, y: 16 },
  ]);
</script>

<style scoped>
.demo-controls {
  margin-bottom: 16px;
}

.scroll-frame {
  height: 300px;
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
