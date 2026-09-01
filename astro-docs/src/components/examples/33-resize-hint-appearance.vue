<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="showResizeHandles"
      label="showResizeHandles (grid default)" />
    <label class="demo-color-field">
      resizeHandleColor
      <input
        v-model="resizeHandleColor"
        type="color">
    </label>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :resize-handle-color="resizeHandleColor"
    :row-height="100"
    :show-resize-handles="showResizeHandles"
    show-grid-lines>
    <GridItem
      :h="layout[0].h"
      :i="layout[0].i"
      :w="layout[0].w"
      :x="layout[0].x"
      :y="layout[0].y">
      <div class="example-item">grid default</div>
    </GridItem>
    <GridItem
      :h="layout[1].h"
      :i="layout[1].i"
      resize-handle-color="crimson"
      show-resize-handles
      :w="layout[1].w"
      :x="layout[1].x"
      :y="layout[1].y">
      <div class="example-item">own override (always visible, crimson)</div>
    </GridItem>
    <GridItem
      :h="layout[2].h"
      :i="layout[2].i"
      :show-resize-handles="false"
      :w="layout[2].w"
      :x="layout[2].x"
      :y="layout[2].y">
      <div class="example-item">own override (always hidden)</div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const showResizeHandles = ref(true);
  const resizeHandleColor = ref('#f2a93b');

  // A per-item resizeHandleColor/showResizeHandles override always
  // takes precedence over the grid-level default, the same inherit
  // pattern isDraggable/isResizable already use — the color picker
  // below only ever affects item "a", since "b"/"c" set their own.
  const layout = ref<TLayout>([
    { h: 2, i: 'a', w: 4, x: 0, y: 0 },
    { h: 2, i: 'b', w: 4, x: 4, y: 0 },
    { h: 2, i: 'c', w: 4, x: 8, y: 0 },
  ]);
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.demo-color-field {
  align-items: center;
  color: var(--kg-text-lo-light);
  display: flex;
  font-size: 13px;
  gap: 6px;
}

.demo-color-field input {
  border: none;
  border-radius: 4px;
  height: 22px;
  padding: 0;
  width: 28px;
}

.example-item {
  align-items: center;
  background: var(--kg-panel);
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  color: var(--kg-text-hi-light);
  display: flex;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  height: 100%;
  justify-content: center;
  text-align: center;
  width: 100%;
}
</style>
