<template>
  <h2>Maximize</h2>
  <p class="demo-description">
    Every item has a maximize button. Click it and the item fills the grid; click it again, or press Escape, to put everything back.
  </p>

  <div
    class="demo-grid-wrap"
    data-testid="maximize-grid-wrap">
    <GridLayout
      :col-num="12"
      data-testid="maximize-grid"
      :layout="layout"
      :row-height="80"
      :show-maximize-button="true">
      <template #default>
        <GridItem
          v-for="item in layout"
          :key="item.i"
          :data-testid="`maximize-item-${item.i}`"
          :h="item.h"
          :i="item.i"
          :w="item.w"
          :x="item.x"
          :y="item.y">
          <div class="demo-item">
            Item {{ item.i }}
          </div>
        </GridItem>
      </template>
    </GridLayout>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridItem, GridLayout } from '@/components';
  import type { TLayout } from '@/components';

  const layout = ref<TLayout>([
    { i: '0', x: 0, y: 0, w: 4, h: 2 },
    { i: '1', x: 4, y: 0, w: 4, h: 2 },
    { i: '2', x: 8, y: 0, w: 4, h: 2 },
  ]);
</script>
