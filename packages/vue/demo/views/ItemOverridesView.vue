<template>
  <h2>Per-item overrides</h2>
  <p class="demo-description">
    <code>GridItem</code>-level props that aren't covered by the "Drag &amp; resize" playground —
    every control here applies uniformly to all items below, so you can isolate one prop's effect
    at a time. <code>isDraggable</code>/<code>isResizable</code>/<code>isBounded</code> use a
    three-way selector since <code>null</code> (inherit the grid's own default) is a real,
    distinct state from an explicit <code>true</code>/<code>false</code>. The
    <code>resizeHandles</code> checkboxes restrict which of the 8 edge/corner handles actually
    render and activate — uncheck a few to see resizing become unavailable from just those
    edges, without disabling resizability entirely. The <code>#header</code> slot and
    <code>zIndex</code> controls (item "0" only) demonstrate a distinct title-bar region
    separate from the main content, and an explicit stacking-order override that wins over the
    library's own implicit static/resizing z-index handling — try dragging item "0" over another
    item with a high zIndex set to see it stay on top.
  </p>

  <div class="demo-controls">
    <label>
      <input
        v-model="isStatic"
        data-testid="toggle-is-static"
        type="checkbox" />
      isStatic (all items)
    </label>
    <label>
      <input
        v-model="enableEditMode"
        data-testid="toggle-enable-edit-mode"
        type="checkbox" />
      enableEditMode
    </label>
    <label>
      <input
        v-model="preserveAspectRatio"
        data-testid="toggle-preserve-aspect-ratio"
        type="checkbox" />
      preserveAspectRatio
    </label>
    <label>
      <input
        v-model="showCloseButton"
        data-testid="toggle-item-close-button"
        type="checkbox" />
      showCloseButton
    </label>
    <label>
      <input
        v-model="useBorderRadius"
        data-testid="toggle-item-border-radius"
        type="checkbox" />
      useBorderRadius
    </label>
    <label>
      Border radius (px)
      <input
        v-model.number="borderRadiusPx"
        data-testid="input-item-border-radius"
        max="60"
        min="0"
        step="1"
        type="number" />
    </label>

    <label>
      isDraggable
      <select
        v-model="isDraggableMode"
        data-testid="select-is-draggable">
        <option value="inherit">Inherit</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    </label>
    <label>
      isResizable
      <select
        v-model="isResizableMode"
        data-testid="select-is-resizable">
        <option value="inherit">Inherit</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    </label>
    <label>
      isBounded
      <select
        v-model="isBoundedMode"
        data-testid="select-is-bounded">
        <option value="inherit">Inherit</option>
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    </label>

    <label>
      minW
      <input
        v-model.number="minW"
        data-testid="input-min-w"
        min="1"
        step="1"
        type="number" />
    </label>
    <label>
      minH
      <input
        v-model.number="minH"
        data-testid="input-min-h"
        min="1"
        step="1"
        type="number" />
    </label>
    <label>
      maxW
      <input
        v-model.number="maxW"
        data-testid="input-max-w"
        min="1"
        step="1"
        type="number" />
    </label>
    <label>
      maxH
      <input
        v-model.number="maxH"
        data-testid="input-max-h"
        min="1"
        step="1"
        type="number" />
    </label>

    <label>
      <input
        v-model="autoScroll"
        data-testid="toggle-auto-scroll"
        type="checkbox" />
      autoScroll (item "0" only)
    </label>
    <label>
      <input
        v-model="showHeader"
        data-testid="toggle-item-header"
        type="checkbox" />
      #header slot (item "0" only)
    </label>
    <label>
      zIndex (item "0" only)
      <input
        v-model="itemZIndexInput"
        data-testid="input-item-z-index"
        placeholder="inherit"
        type="number" />
    </label>
    <label>
      dragIgnoreFrom
      <input
        v-model="dragIgnoreFrom"
        data-testid="input-drag-ignore-from"
        placeholder="a, button"
        type="text" />
    </label>
    <label>
      dragAllowFrom
      <input
        v-model="dragAllowFrom"
        data-testid="input-drag-allow-from"
        placeholder="none"
        type="text" />
    </label>
    <label>
      resizeIgnoreFrom
      <input
        v-model="resizeIgnoreFrom"
        data-testid="input-resize-ignore-from"
        placeholder="none"
        type="text" />
    </label>

    <fieldset class="resize-handles-fieldset">
      <legend>resizeHandles (all items)</legend>
      <label
        v-for="edge in resizeHandleEdges"
        :key="edge">
        <input
          v-model="enabledResizeHandles"
          :data-testid="`toggle-resize-handle-${edge}`"
          type="checkbox"
          :value="edge" />
        {{ edge }}
      </label>
    </fieldset>
  </div>

  <div
    class="demo-grid-wrap demo-override-scroll-area"
    data-testid="item-overrides-scroll-area">
    <GridLayout
      v-model:layout="layout"
      data-testid="item-overrides-grid"
      :row-height="70">
      <template #default>
        <GridItem
          v-for="item in layout"
          :key="item.i"
          :auto-scroll="item.i === '0' && autoScroll"
          :border-radius-px="borderRadiusPx"
          :data-testid="`grid-item-${item.i}`"
          :drag-allow-from="dragAllowFrom || null"
          :drag-ignore-from="dragIgnoreFrom"
          :enable-edit-mode="enableEditMode"
          :h="item.h"
          :i="item.i"
          :is-bounded="isBoundedValue"
          :is-draggable="isDraggableValue"
          :is-resizable="isResizableValue"
          :is-static="isStatic"
          :max-h="maxH"
          :max-w="maxW"
          :min-h="minH"
          :min-w="minW"
          :preserve-aspect-ratio="preserveAspectRatio"
          :resize-handles="enabledResizeHandles"
          :resize-ignore-from="resizeIgnoreFrom || null"
          :show-close-button="showCloseButton"
          :use-border-radius="useBorderRadius"
          :w="item.w"
          :x="item.x"
          :y="item.y"
          :z-index="item.i === '0' ? itemZIndexValue : null">
          <template
            v-if="item.i === '0' && showHeader"
            #header>
            <strong class="item-header-title">Item {{ item.i }} — header slot</strong>
          </template>
          <div class="demo-item">
            Item {{ item.i }}
            <button
              class="item-inner-button"
              type="button">
              btn
            </button>
          </div>
        </GridItem>
      </template>
    </GridLayout>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { GridItem, GridLayout } from '@/components';
  import type { TLayout } from '@/components';
  import type { TResizeHandle } from 'keystone-dashboard-layout-core';

  const layout = ref<TLayout>([
    { i: '0', x: 0, y: 0, w: 4, h: 2 },
    { i: '1', x: 4, y: 0, w: 4, h: 2 },
    { i: '2', x: 8, y: 0, w: 4, h: 2 },
    // Far enough below the fold that this scroll area actually needs to
    // scroll — otherwise there's nothing for autoScroll to demonstrate.
    { i: '3', x: 0, y: 10, w: 4, h: 2 },
  ]);

  const autoScroll = ref(false);
  const showHeader = ref(false);
  const itemZIndexInput = ref('');
  const itemZIndexValue = computed(() => (itemZIndexInput.value === '' ? null : Number(itemZIndexInput.value)));
  const isStatic = ref(false);
  const enableEditMode = ref(true);
  const preserveAspectRatio = ref(false);
  const showCloseButton = ref(false);
  const useBorderRadius = ref(false);
  const borderRadiusPx = ref(10);

  const minW = ref(1);
  const minH = ref(1);
  const maxW = ref(12);
  const maxH = ref(12);

  const dragIgnoreFrom = ref('a, button');
  const dragAllowFrom = ref('');
  const resizeIgnoreFrom = ref('');

  const resizeHandleEdges: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const enabledResizeHandles = ref<TResizeHandle[]>([...resizeHandleEdges]);

  type TTriState = 'inherit' | 'true' | 'false';
  const isDraggableMode = ref<TTriState>('inherit');
  const isResizableMode = ref<TTriState>('inherit');
  const isBoundedMode = ref<TTriState>('inherit');

  const triStateToValue = (mode: TTriState): boolean | null => {
    if(mode === 'true') return true;
    if(mode === 'false') return false;
    return null;
  };

  const isDraggableValue = computed(() => triStateToValue(isDraggableMode.value));
  const isResizableValue = computed(() => triStateToValue(isResizableMode.value));
  const isBoundedValue = computed(() => triStateToValue(isBoundedMode.value));
</script>

<style scoped>
.item-inner-button {
  font-size: 11px;
  margin-left: 6px;
  padding: 2px 6px;
}

.demo-override-scroll-area {
  max-height: 340px;
  overflow-y: auto;
}

.resize-handles-fieldset {
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 6px 12px 10px;
}

.resize-handles-fieldset label {
  align-items: center;
  display: inline-flex;
  gap: 4px;
}

.item-header-title {
  background: #f1f5f9;
  border-bottom: 1px solid #cbd5e1;
  display: block;
  font-size: 12px;
  padding: 4px 8px;
}
</style>
