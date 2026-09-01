<template>
  <div class="demo-controls">
    <ExampleNumberField
      v-model="rowHeight"
      label="rowHeight"
      :max="200"
      :min="20" />
    <ExampleNumberField
      v-model="colNum"
      label="colNum"
      :max="24"
      :min="2" />
    <ExampleNumberField
      v-model="marginX"
      label="margin[0]"
      :max="40"
      :min="0" />
    <ExampleNumberField
      v-model="marginY"
      label="margin[1]"
      :max="40"
      :min="0" />
    <ExampleToggle
      v-model="showGridLines"
      label="showGridLines" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="colNum"
    :margin="[marginX, marginY]"
    :row-height="rowHeight"
    :show-grid-lines="showGridLines">
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
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleNumberField from '../harness/ExampleNumberField.vue';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const showGridLines = ref(true);

  const rowHeight = ref(60);
  const colNum = ref(12);
  const marginX = ref(10);
  const marginY = ref(10);

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
    { h: 2, i: '2', w: 3, x: 6, y: 0 },
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
