<template>
  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="70"
    show-grid-lines
    @remove-grid-item="removeItem">
    <GridItem
      v-for="item in layout"
      :key="item.i"
      drag-allow-from=".vue-draggable-handle"
      resize-ignore-from=".vue-draggable-handle"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y">
      <div class="example-item">
        <CustomDragElement text="⠿" />
        <span>{{ item.i }}</span>
        <CustomCloseButton
          :i="item.i"
          @remove-grid-item="removeItem" />
      </div>
    </GridItem>
  </GridLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, CustomDragElement, CustomCloseButton, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);

  function removeItem(id: string | number): void {
    layout.value = layout.value.filter((item) => item.i !== id);
  }
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
  justify-content: space-between;
  padding: 0 12px;
  position: relative;
  width: 100%;
}
</style>
