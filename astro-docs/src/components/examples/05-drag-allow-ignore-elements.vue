<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="70"
    show-grid-lines>
    <GridItem
      :drag-allow-from="'.drag-handle'"
      :h="layout[0].h"
      :i="layout[0].i"
      :w="layout[0].w"
      :x="layout[0].x"
      :y="layout[0].y">
      <div class="example-item">
        <div class="drag-handle">drag here</div>
      </div>
    </GridItem>
    <GridItem
      :drag-ignore-from="'.no-drag'"
      :h="layout[1].h"
      :i="layout[1].i"
      :w="layout[1].w"
      :x="layout[1].x"
      :y="layout[1].y">
      <div class="example-item">
        <div class="item-body">
          {{ layout[1].i }}
          <button
            class="no-drag no-drag-btn"
            type="button"
            @click.stop>not draggable</button>
        </div>
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);
</script>

<style scoped>
.example-item {
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  font-family: var(--kg-font-mono);
  height: 100%;
  overflow: hidden;
  width: 100%;
}

.drag-handle {
  align-items: center;
  background: var(--kg-blueprint);
  color: white;
  cursor: grab;
  display: flex;
  font-size: 11px;
  height: 24px;
  justify-content: center;
}

.item-body {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  justify-content: center;
}

.no-drag-btn {
  background: var(--kg-paper-3);
  border: 1px solid var(--kg-line-light);
  border-radius: 4px;
  cursor: default;
  font-size: 10px;
  padding: 2px 6px;
}
</style>
