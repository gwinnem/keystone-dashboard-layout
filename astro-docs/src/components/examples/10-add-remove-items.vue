<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="appendToFirstRow"
      label="Add to end of first row (instead of a new row)" />
    <button
      class="demo-btn"
      type="button"
      @click="addItem">+ Add item</button>
    <button
      class="demo-btn demo-btn--ghost"
      type="button"
      @click="layout = []">Clear all</button>
  </div>

  <GridLayout
    v-model:layout="layout"
    :col-num="12"
    :row-height="60"
    show-close-button
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
      <div class="example-item">
        {{ item.i }}
      </div>
    </GridItem>
  </GridLayout>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { GridLayout, GridItem, type TLayout } from '@keystone-dashboard-layout/vue';
  import { findFirstFitSlot } from '@keystone-dashboard-layout/core';
  import '@keystone-dashboard-layout/vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const colNum = 12;

  const layout = ref<TLayout>([
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 2, i: '1', w: 3, x: 3, y: 0 },
  ]);

  const appendToFirstRow = ref(false);
  let nextId = 2;

  /**
   * A real first-fit bin-pack, ported directly from the previous
   * VitePress-based docs site's own identical example (confirmed via a
   * direct source read, including that file's own two documented bug
   * fixes below — not re-derived from scratch): appending with `x:0,
   * y:0` (or `y: Infinity`, the simpler convention this package's other
   * examples use) and letting compaction settle it is the normal
   * pattern, but it never *reuses a gap* left by a removed item — a new
   * item always lands in a fresh row at the bottom even when there's
   * clearly room higher up. `findFirstFitSlot` (this package's own
   * exported helper — the same one `allowCrossGridDrag`'s own accept
   * side uses) scans row by row from the top, column by column from the
   * left, for the first open gap instead.
   */
  function addItem(): void {
    const newItem = { h: 2, i: String(nextId), w: 3, x: 0, y: 0 };
    nextId += 1;

    if (appendToFirstRow.value) {
      const firstRowItems = layout.value.filter((item) => item.y === 0);
      // Bug fix (ported from the same source): the rightmost occupied
      // edge (max of x+w across first-row items), not the sum of every
      // first-row item's own width — summing only equals "the first
      // free column" when the row is packed with no gaps at all;
      // removing an item from the middle of a full first row (not the
      // end) leaves the sum unchanged, landing the new item on top of
      // whatever's still sitting at the old rightmost edge instead of
      // in the actual gap this toggle exists to fill.
      const rightmostEdge = firstRowItems.reduce((max, item) => Math.max(max, item.x + item.w), 0);
      if (rightmostEdge + newItem.w <= colNum) {
        newItem.x = rightmostEdge;
        layout.value.push(newItem);
        return;
      }
      // First row is full — fall through to the general bin-pack below.
    }

    const slot = findFirstFitSlot(layout.value, colNum, newItem.w, newItem.h);
    newItem.x = slot.x;
    newItem.y = slot.y;
    layout.value.push(newItem);
  }

  function removeItem(id: string | number): void {
    layout.value = layout.value.filter((item) => item.i !== id);
  }
</script>

<style scoped>
.demo-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
