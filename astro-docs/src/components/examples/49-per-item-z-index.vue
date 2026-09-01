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
      :w="item.w"
      :x="item.x"
      :y="item.y"
      :z-index="item.i === 'pinned' ? 10 : null">
      <div
        class="example-item"
        :class="{ 'example-item--pinned': item.i === 'pinned' }">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  const layout = ref<TLayout>([
    { h: 3, i: 'pinned', w: 4, x: 4, y: 0 },
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 8, y: 0 },
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

.example-item--pinned {
  background: var(--kg-amber);
  border-color: var(--kg-amber-deep);
  color: #2b1b02;
  font-weight: 600;
}
</style>
