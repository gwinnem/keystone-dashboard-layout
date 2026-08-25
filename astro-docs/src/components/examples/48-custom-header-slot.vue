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
      :y="item.y">
      <template #header>
        <div class="item-header">{{ item.i }} — header</div>
      </template>
      <div class="item-body">
        <p
          v-for="n in 4"
          :key="n">Body content line {{ n }} — scrolls internally if the item is too short to fit everything.</p>
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 3, i: '0', w: 4, x: 0, y: 0 },
    { h: 3, i: '1', w: 4, x: 4, y: 0 },
  ]);
</script>

<style scoped>
.item-header {
  background: var(--kg-blueprint);
  color: white;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
}

.item-body {
  background: var(--kg-panel);
  color: var(--kg-text-hi-light);
  font-size: 11px;
  padding: 8px 12px;
}

.item-body p {
  margin: 0 0 6px;
}
</style>
