<template>
  <div class="demo-controls">
    <button class="demo-btn" type="button" @click="onSave">Save layout</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="onLoad">Load saved layout</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="reset">Reset to default</button>
  </div>

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
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <p class="demo-status">
    <span v-if="status">{{ status }}</span>
    <span v-else>Drag or resize items, then click "Save layout".</span>
  </p>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, useLayoutStorage, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const STORAGE_KEY = 'keystonegrid-example-19-layout';

  const defaultLayout = (): TLayout => [
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ];

  const layout = ref<TLayout>(defaultLayout());
  const status = ref('');

  // autoLoad: false — this example wants an explicit "Load saved
  // layout" button rather than silently restoring on page load, so the
  // default layout above is what visitors see first. The composable
  // itself (not a hand-rolled localStorage.setItem/getItem pair) is
  // what actually strips the internal `moved` field before saving and
  // gracefully handles a missing/malformed stored value on load — the
  // two things a manual implementation has to account for itself.
  const { save, load, hasSaved } = useLayoutStorage(STORAGE_KEY, layout, { autoLoad: false });

  function onSave(): void {
    save();
    status.value = `Saved at ${new Date().toLocaleTimeString()}`;
  }

  function onLoad(): void {
    if (!hasSaved()) {
      status.value = 'No saved layout found yet — try "Save layout" first.';
      return;
    }
    load();
    status.value = 'Loaded saved layout.';
  }

  function reset(): void {
    layout.value = defaultLayout();
    status.value = 'Reset to default layout.';
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-bottom: 16px;
}

.demo-btn {
  background: var(--kg-blueprint);
  border: none;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-family: var(--kg-font-mono);
  font-size: 12px;
  padding: 6px 12px;
}

.demo-btn--ghost {
  background: transparent;
  border: 1px solid var(--kg-line-light);
  color: var(--kg-text-hi-light);
}

.demo-status {
  color: var(--kg-text-lo-light);
  font-size: 12px;
  font-style: italic;
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
