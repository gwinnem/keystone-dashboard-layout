<template>
  <div class="demo-controls">
    <button class="demo-btn" type="button" @click="addAndJumpToItem">+ Add item (scrolls &amp; focuses it)</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="jumpToFirst">Scroll to item 0</button>
  </div>

  <div class="scroll-frame">
    <GridLayout
      ref="gridRef"
      v-model:layout="layout"
      :col-num="4"
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
  </div>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import '@keystone-dashboard-layout/vue/style.css';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>(
    Array.from({ length: 6 }, (_, index) => ({ h: 2, i: String(index), w: 4, x: 0, y: index * 2 })),
  );

  const gridRef = ref<InstanceType<typeof GridLayout>>();

  function addAndJumpToItem(): void {
    const id = `new-${Date.now()}`;
    layout.value.push({ h: 2, i: id, w: 4, x: 0, y: layout.value.length * 2 });
    // The new item's own element doesn't exist in the DOM yet at this
    // exact point — Vue's own reactivity batches DOM updates
    // asynchronously, so a naive synchronous call here would find
    // nothing and do nothing. Both scrollToItem/focusItem already
    // await nextTick() internally, so this call site doesn't need to
    // know anything about that timing for it to work correctly.
    gridRef.value?.scrollToItem(id);
    gridRef.value?.focusItem(id);
  }

  function jumpToFirst(): void {
    gridRef.value?.scrollToItem('0');
    gridRef.value?.focusItem('0');
  }
</script>

<style scoped>
.demo-controls {
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

.scroll-frame {
  border: 1px solid var(--kg-line-light);
  border-radius: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px;
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
