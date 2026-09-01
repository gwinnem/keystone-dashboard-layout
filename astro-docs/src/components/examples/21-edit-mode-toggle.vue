<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="editMode"
      label="Edit mode" />
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :enable-edit-mode="editMode"
    :row-height="60"
    :show-close-button="editMode"
    show-grid-lines>
    <GridItem
      v-for="item in layout"
      :key="item.i"
      :h="item.h"
      :i="item.i"
      :w="item.w"
      :x="item.x"
      :y="item.y"
      @remove-grid-item="removeItem">
      <div
        class="example-item"
        :class="{ 'example-item--static': !editMode }">
        {{ item.label }}
      </div>
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

  const editMode = ref(false);

  const layout = ref<(TLayout[number] & { label: string })[]>([
    { h: 1, i: '0', label: 'Revenue', w: 4, x: 0, y: 0 },
    { h: 1, i: '1', label: 'Active users', w: 4, x: 4, y: 0 },
    { h: 1, i: '2', label: 'Signups', w: 4, x: 8, y: 0 },
    { h: 3, i: '3', label: 'Traffic over time', w: 8, x: 0, y: 1 },
    { h: 3, i: '4', label: 'Top referrers', w: 4, x: 8, y: 1 },
  ]);

  // Bug fix (ported from the previous VitePress-based docs site's own
  // identical example, confirmed via a direct source read): this used
  // to render a fully-working, clickable close button once edit mode
  // was on, but nothing was listening for `@remove-grid-item` at all —
  // the click handler fired every time, correctly gated on edit mode
  // being on, but the item was never actually removed from `layout`,
  // since there was no listener to do that removal.
  function removeItem(id: string | number): void {
    layout.value = layout.value.filter((item) => item.i !== id);
  }
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

.example-item--static {
  background: var(--kg-paper-3);
}
</style>
