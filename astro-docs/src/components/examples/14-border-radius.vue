<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="useBorderRadius"
      label="useBorderRadius" />
    <ExampleNumberField
      v-model="borderRadiusPx"
      label="borderRadiusPx"
      :max="40"
      :min="0" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :border-radius-px="borderRadiusPx"
    :col-num="12"
    :row-height="60"
    show-grid-lines
    :use-border-radius="useBorderRadius">
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
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import ExampleNumberField from '../harness/ExampleNumberField.vue';

  const useBorderRadius = ref(true);
  const borderRadiusPx = ref(16);

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 2, x: 0, y: 0 },
    { h: 2, i: '1', w: 2, x: 2, y: 0 },
    { h: 2, i: '2', w: 2, x: 4, y: 0 },
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
  border-radius: inherit;
  color: var(--kg-text-hi-light);
  display: flex;
  font-family: var(--kg-font-mono);
  height: 100%;
  justify-content: center;
  width: 100%;
}
</style>
