<template>
  <div class="demo-controls">
    <span class="demo-description">Selected: {{ gridRef?.selectedItems?.join(', ') || 'none' }}</span>
    <span class="demo-description">Try it: select two items, then Tab to one and press an arrow key — the other moves too.</span>
  </div>

  <GridLayout
    ref="gridRef"
    v-model:layout="layout"
    :compact-type="ECompactType.NONE"
    multi-select
    :row-height="80"
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :is-static="item.i === 'd'"
      :max-w="item.i === 'd' ? 3 : undefined"
      show-resize-handles
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        {{ item.i }}{{ item.i === 'd' ? ' (static)' : '' }}
      </div>
      <template #resize-handle="{ edge }">
        <span
          class="resize-dot"
          :title="edge">⤡</span>
      </template>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, ECompactType, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: 'a', w: 3, x: 0, y: 0 },
    { h: 2, i: 'b', w: 3, x: 3, y: 0 },
    { h: 2, i: 'c', w: 3, x: 6, y: 0 },
    { h: 2, i: 'd', w: 3, x: 0, y: 2 },
  ]);

  const gridRef = ref<InstanceType<typeof GridLayout>>();
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.demo-description {
  color: var(--kg-text-lo-light);
  font-size: 13px;
}

.resize-dot {
  color: var(--kg-amber-deep);
  font-size: 12px;
  pointer-events: none;
  user-select: none;
}
</style>
