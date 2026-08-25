<template>
  <div class="grids-row">
    <div class="grid-column">
      <p class="grid-label">Grid A</p>
      <GridLayout
        v-model:layout="layoutA"
        :col-num="6"
        :row-height="60"
        show-grid-lines>
        <GridItem
          v-for="item in layoutA"
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
    <div class="grid-column">
      <p class="grid-label">Grid B</p>
      <GridLayout
        v-model:layout="layoutB"
        :col-num="6"
        :row-height="60"
        show-grid-lines>
        <GridItem
          v-for="item in layoutB"
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
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layoutA = ref<TLayout>([
    { h: 2, i: 'a0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'a1', w: 3, x: 3, y: 0 },
  ]);

  const layoutB = ref<TLayout>([
    { h: 2, i: 'b0', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b1', w: 3, x: 3, y: 0 },
  ]);
</script>

<style scoped>
.grids-row {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
}

.grid-label {
  color: var(--kg-text-lo-light);
  font-family: var(--kg-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
  text-transform: uppercase;
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
