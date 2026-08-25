<template>
  <div class="demo-controls">
    <ExampleNumberField
      v-model="maxRows"
      label="maxRows"
      :max="10"
      :min="1" />
    <ExampleToggle
      v-model="distributeEvenly"
      label="distributeEvenly" />
    <ExampleToggle
      v-model="useCssTransforms"
      label="useCssTransforms" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :distribute-evenly="distributeEvenly"
    :max-rows="maxRows"
    :row-height="50"
    show-grid-lines
    :use-css-transforms="useCssTransforms">
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

  const maxRows = ref(4);
  const distributeEvenly = ref(false);
  const useCssTransforms = ref(true);

  const layout = ref<TLayout>(
    Array.from({ length: 8 }, (_, index) => ({
      h: 2,
      i: String(index),
      w: 3,
      x: (index % 4) * 3,
      y: Math.floor(index / 4) * 2,
    })),
  );
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
