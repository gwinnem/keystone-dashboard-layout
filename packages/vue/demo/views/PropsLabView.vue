<template>
  <h2>Props lab</h2>
  <p class="demo-description">
    A test fixture, not an example: every <code>GridLayout</code> and <code>GridItem</code> property is
    bound to a control here (<code>grid-&lt;prop&gt;</code> / <code>item-&lt;prop&gt;</code> test ids), every
    emitted event is logged, and every exposed method has a button — so each property can be switched on,
    driven in a real browser and asserted against. The stage is a fixed 1200px wide, so pixel maths is
    deterministic. Per-item controls apply to the <em>target item</em> only; every other item keeps
    inheriting the grid-wide defaults, which is what makes the inheritance rules testable.
  </p>

  <div class="lab-page">
    <aside class="lab-side">
      <fieldset class="demo-controls lab-fieldset">
        <legend>Lab</legend>
        <label>
          <input
            v-model="useLibraryDefaults"
            data-testid="lab-use-library-defaults"
            type="checkbox" />
          bind nothing (library defaults)
        </label>
        <label>
          <input
            v-model="showGridB"
            data-testid="lab-show-grid-b"
            type="checkbox" />
          show second grid (B)
        </label>
        <label>
          stage width (px)
          <input
            v-model.number="stageWidth"
            data-testid="lab-stage-width"
            type="number" />
        </label>
        <label>
          stage scale (CSS ancestor)
          <input
            v-model.number="stageScale"
            data-testid="lab-stage-scale"
            step="0.1"
            type="number" />
        </label>
        <button
          data-testid="lab-clear-log"
          type="button"
          @click="clearLog">
          Clear event log
        </button>
        <button
          data-testid="lab-reset-layout"
          type="button"
          @click="resetLayout">
          Reset layouts
        </button>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid — booleans</legend>
        <label
          v-for="name in gridBooleanProps"
          :key="name">
          <input
            v-model="grid[name]"
            :data-testid="`grid-${name}`"
            type="checkbox" />
          {{ name }}
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid — numbers</legend>
        <label
          v-for="name in gridNumberProps"
          :key="name">
          {{ name }}
          <input
            v-model.number="grid[name]"
            :data-testid="`grid-${name}`"
            step="any"
            type="number" />
        </label>
        <label>
          maxRows (blank = Infinity)
          <input
            v-model="grid.maxRows"
            data-testid="grid-maxRows"
            type="text" />
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid — choices &amp; text</legend>
        <label>
          heightMode
          <select
            v-model="grid.heightMode"
            data-testid="grid-heightMode">
            <option value="">null (defer to autoSize)</option>
            <option value="auto">auto</option>
            <option value="fixed">fixed</option>
            <option value="scroll">scroll</option>
            <option value="fit">fit</option>
          </select>
        </label>
        <label>
          compactType
          <select
            v-model="grid.compactType"
            data-testid="grid-compactType">
            <option
              v-for="type in compactTypes"
              :key="type"
              :value="type">
              {{ type }}
            </option>
          </select>
        </label>
        <label>
          compactor
          <select
            v-model="grid.compactorMode"
            data-testid="grid-compactor">
            <option value="builtin">null (built-in)</option>
            <option value="downward">custom (downward)</option>
          </select>
        </label>
        <label>
          transitionTimingFunction
          <input
            v-model="grid.transitionTimingFunction"
            data-testid="grid-transitionTimingFunction"
            type="text" />
        </label>
        <label>
          resizeHandleColor
          <input
            v-model="grid.resizeHandleColor"
            data-testid="grid-resizeHandleColor"
            type="text" />
        </label>
        <label>
          layoutId
          <input
            v-model="grid.layoutId"
            data-testid="grid-layoutId"
            type="text" />
        </label>
        <label>
          <input
            v-model="grid.acceptOnlyLabWidgets"
            data-testid="grid-outsideDropAccept"
            type="checkbox" />
          outsideDropAccept (only the lab widget)
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid — resizeHandles</legend>
        <label
          v-for="edge in resizeHandleEdges"
          :key="edge">
          <input
            v-model="gridResizeHandles"
            :data-testid="`grid-resize-handle-${edge}`"
            type="checkbox"
            :value="edge" />
          {{ edge }}
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid — ariaLabels / responsive data</legend>
        <label
          v-for="key in ariaKeys"
          :key="key">
          {{ key }}
          <input
            v-model="gridAria[key]"
            :data-testid="`grid-aria-${key}`"
            type="text" />
        </label>
        <label>
          breakpoints (JSON)
          <textarea
            v-model="grid.breakpointsJson"
            data-testid="grid-breakpoints"
            rows="2"></textarea>
        </label>
        <label>
          cols (JSON)
          <textarea
            v-model="grid.colsJson"
            data-testid="grid-cols"
            rows="2"></textarea>
        </label>
        <label>
          responsiveLayouts (JSON)
          <textarea
            v-model="grid.responsiveLayoutsJson"
            data-testid="grid-responsiveLayouts"
            rows="3"></textarea>
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Grid B (cross-grid target)</legend>
        <label>
          <input
            v-model="gridB.allowCrossGridDrag"
            data-testid="gridB-allowCrossGridDrag"
            type="checkbox" />
          allowCrossGridDrag
        </label>
        <label>
          <input
            v-model="gridB.disableExternalDrop"
            data-testid="gridB-disableExternalDrop"
            type="checkbox" />
          disableExternalDrop
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — target</legend>
        <label>
          target item
          <select
            v-model="itemTarget"
            data-testid="item-target">
            <option
              v-for="item in layout"
              :key="item.i"
              :value="String(item.i)">
              {{ item.i }}
            </option>
          </select>
        </label>
        <label>
          layout-entry patch (JSON, merged into the target's entry in `layout`)
          <textarea
            v-model="layoutPatch"
            data-testid="lab-layout-patch"
            rows="2"></textarea>
        </label>
        <button
          data-testid="lab-apply-layout-patch"
          type="button"
          @click="applyLayoutPatch">
          apply patch to target's layout entry
        </button>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — tri-state (inherit / true / false)</legend>
        <label
          v-for="key in itemTriKeys"
          :key="key">
          {{ key }}
          <select
            v-model="itemTri[key]"
            :data-testid="`item-${key}`">
            <option value="inherit">inherit</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — booleans</legend>
        <label
          v-for="key in itemBooleanKeys"
          :key="key">
          <input
            v-model="itemBool[key]"
            :data-testid="`item-${key}`"
            type="checkbox" />
          {{ key }}
        </label>
        <label>
          <input
            v-model="itemSlots.header"
            data-testid="item-slot-header"
            type="checkbox" />
          #header slot
        </label>
        <label>
          <input
            v-model="itemSlots.resizeHandle"
            data-testid="item-slot-resize-handle"
            type="checkbox" />
          #resize-handle slot
        </label>
        <label>
          <input
            v-model="gridSlots.placeholder"
            data-testid="grid-slot-placeholder"
            type="checkbox" />
          #placeholder slot (grid)
        </label>
        <button
          data-testid="item-add-line"
          type="button"
          @click="lineCount += 1">
          Add content line (target)
        </button>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — numbers &amp; text (blank = default)</legend>
        <label
          v-for="key in itemNumberKeys"
          :key="key">
          {{ key }}
          <input
            v-model="itemNum[key]"
            :data-testid="`item-${key}`"
            type="text" />
        </label>
        <label
          v-for="key in itemTextKeys"
          :key="key">
          {{ key }}
          <input
            v-model="itemText[key]"
            :data-testid="`item-${key}`"
            type="text" />
        </label>
        <label>
          dragActivationDistance
          <select
            v-model="activation.mode"
            data-testid="item-dragActivationDistance-mode">
            <option value="default">null (3px)</option>
            <option value="number">number</option>
            <option value="object">per pointer</option>
          </select>
        </label>
        <label
          v-for="key in activationKeys"
          :key="key">
          activation.{{ key }}
          <input
            v-model="activation[key]"
            :data-testid="`item-dragActivationDistance-${key}`"
            type="text" />
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — resizeHandles</legend>
        <label>
          <input
            v-model="itemInheritHandles"
            data-testid="item-resizeHandles-inherit"
            type="checkbox" />
          inherit (null)
        </label>
        <label
          v-for="edge in resizeHandleEdges"
          :key="edge">
          <input
            v-model="itemResizeHandles"
            :data-testid="`item-resize-handle-${edge}`"
            type="checkbox"
            :value="edge" />
          {{ edge }}
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Item — ariaLabels</legend>
        <label
          v-for="key in ariaKeys"
          :key="key">
          {{ key }}
          <input
            v-model="itemAria[key]"
            :data-testid="`item-aria-${key}`"
            type="text" />
        </label>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Exposed methods</legend>
        <button
          data-testid="lab-compact-now"
          type="button"
          @click="gridRef?.compactNow()">
          compactNow
        </button>
        <button
          data-testid="lab-rearrange"
          type="button"
          @click="gridRef?.rearrange()">
          rearrange
        </button>
        <button
          data-testid="lab-duplicate"
          type="button"
          @click="duplicateTarget">
          duplicateItem(target)
        </button>
        <button
          data-testid="lab-undo"
          :disabled="!gridRef?.canUndo"
          type="button"
          @click="gridRef?.undo()">
          undo
        </button>
        <button
          data-testid="lab-redo"
          :disabled="!gridRef?.canRedo"
          type="button"
          @click="gridRef?.redo()">
          redo
        </button>
        <button
          v-for="edge in alignEdges"
          :key="edge"
          :data-testid="`lab-align-${edge}`"
          type="button"
          @click="gridRef?.alignSelected(edge)">
          align {{ edge }}
        </button>
        <button
          data-testid="lab-distribute-horizontal"
          type="button"
          @click="gridRef?.distributeSelected('horizontal')">
          distribute horizontal
        </button>
        <button
          data-testid="lab-distribute-vertical"
          type="button"
          @click="gridRef?.distributeSelected('vertical')">
          distribute vertical
        </button>
        <label>
          item id
          <input
            v-model="methodId"
            data-testid="lab-method-id"
            type="text" />
        </label>
        <button
          data-testid="lab-select-item"
          type="button"
          @click="gridRef?.selectItem(methodId)">
          selectItem
        </button>
        <button
          data-testid="lab-deselect-item"
          type="button"
          @click="gridRef?.deselectItem(methodId)">
          deselectItem
        </button>
        <button
          data-testid="lab-toggle-item"
          type="button"
          @click="gridRef?.toggleItemSelection(methodId)">
          toggleItemSelection
        </button>
        <button
          data-testid="lab-clear-selection"
          type="button"
          @click="gridRef?.clearSelection()">
          clearSelection
        </button>
        <button
          data-testid="lab-scroll-to-item"
          type="button"
          @click="gridRef?.scrollToItem(methodId)">
          scrollToItem
        </button>
        <button
          data-testid="lab-focus-item"
          type="button"
          @click="gridRef?.focusItem(methodId)">
          focusItem
        </button>
        <button
          data-testid="lab-add-item"
          type="button"
          @click="addItem">
          add item
        </button>
        <button
          data-testid="lab-remove-last-item"
          type="button"
          @click="removeLastItem">
          remove last item
        </button>
        <button
          data-testid="lab-load-align-layout"
          type="button"
          @click="loadAlignLayout">
          load align/distribute layout
        </button>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset">
        <legend>Presets / storage / SVG export</legend>
        <button
          data-testid="lab-save-preset"
          type="button"
          @click="savePresetAndRefresh('lab')">
          save preset "lab"
        </button>
        <button
          data-testid="lab-load-preset"
          type="button"
          @click="loadPresetResult('lab')">
          load preset "lab"
        </button>
        <button
          data-testid="lab-load-missing-preset"
          type="button"
          @click="loadPresetResult('does-not-exist')">
          load missing preset
        </button>
        <button
          data-testid="lab-delete-preset"
          type="button"
          @click="deletePresetAndRefresh('lab')">
          delete preset "lab"
        </button>
        <button
          data-testid="lab-save-storage"
          type="button"
          @click="storage.save(); refreshStorage()">
          storage.save
        </button>
        <button
          data-testid="lab-load-storage"
          type="button"
          @click="storageLoaded = storage.load()">
          storage.load
        </button>
        <button
          data-testid="lab-clear-storage"
          type="button"
          @click="storage.clear(); refreshStorage()">
          storage.clear
        </button>
        <button
          data-testid="lab-export-svg"
          type="button"
          @click="exportSvg">
          exportLayoutAsSvg
        </button>
      </fieldset>

      <fieldset class="demo-controls lab-fieldset lab-readouts">
        <legend>Readouts</legend>
        <div>layout: <code data-testid="lab-layout-json">{{ layoutJson }}</code></div>
        <div>layout B: <code data-testid="lab-layout-b-json">{{ layoutBJson }}</code></div>
        <div>selected: <code data-testid="lab-selected">{{ gridRef?.selectedItems?.join(',') ?? '' }}</code></div>
        <div>canUndo: <code data-testid="lab-can-undo">{{ String(!!gridRef?.canUndo) }}</code></div>
        <div>canRedo: <code data-testid="lab-can-redo">{{ String(!!gridRef?.canRedo) }}</code></div>
        <div>breakpoint: <code data-testid="lab-breakpoint">{{ lastBreakpointEvent }}</code></div>
        <div>columns: <code data-testid="lab-columns">{{ lastColumnsEvent }}</code></div>
        <div>measured width: <code data-testid="lab-grid-width">{{ gridRef?.width ?? '' }}</code></div>
        <div>isDragging: <code data-testid="lab-is-dragging">{{ String(!!gridRef?.isDragging) }}</code></div>
        <div>presets: <code data-testid="lab-presets">{{ presetNames.join(',') }}</code></div>
        <div>preset load returned: <code data-testid="lab-preset-loaded">{{ String(presetLoaded) }}</code></div>
        <div>storage has data: <code data-testid="lab-storage-has">{{ String(storageHas) }}</code></div>
        <div>storage.load returned: <code data-testid="lab-storage-loaded">{{ String(storageLoaded) }}</code></div>
        <div>json error: <code data-testid="lab-json-error">{{ jsonError }}</code></div>
        <pre
          class="lab-svg"
          data-testid="lab-svg-output">{{ svgOutput }}</pre>
      </fieldset>

      <ul
        class="demo-log lab-log"
        data-testid="event-log">
        <li
          v-for="entry in entries"
          :key="entry.id"
          :data-event="entry.name"
          :data-payload="entry.payload">
          {{ entry.name }}
        </li>
      </ul>
    </aside>

    <section class="lab-stage">
      <div
        class="lab-palette"
        data-testid="lab-palette">
        <div
          class="demo-droppable"
          data-testid="lab-widget"
          draggable="true"
          @dragstart="onWidgetDragStart">
          ⠿ widget
        </div>
        <div
          class="demo-droppable lab-widget-other"
          data-testid="lab-widget-incompatible"
          draggable="true"
          @dragstart="onIncompatibleDragStart">
          ⠿ incompatible
        </div>
      </div>

      <div
        class="lab-grid-wrap"
        data-testid="lab-grid-wrap"
        :style="{ transform: stageScale === 1 ? undefined : `scale(${stageScale})`, transformOrigin: '0 0', width: `${stageWidth}px` }">
        <GridLayout
          ref="gridRef"
          v-model:layout="layout"
          v-bind="gridBind"
          data-testid="lab-grid"
          @breakpoint-changed="onBreakpointChanged"
          @columns-changed="onColumnsChanged"
          @cross-grid-drop-rejected="logA('cross-grid-drop-rejected', $event)"
          @cross-grid-item-dropped="logA('cross-grid-item-dropped', $event)"
          @dragend="logA('dragend', $event)"
          @dragmove="logA('dragmove', $event)"
          @dragstart="logA('dragstart', $event)"
          @item-dropped-from-outside="onDroppedFromOutside"
          @layout-ready="logA('layout-ready', $event)"
          @layout-updated="logA('layout-updated', $event)"
          @move-blocked-by-collision="logA('move-blocked-by-collision', $event)"
          @selection-changed="logA('selection-changed', $event)"
          @update:layout="logA('update:layout', $event)">
          <GridItem
            v-for="item in layout"
            :key="item.i"
            v-bind="itemBind(item)"
            :data-testid="`grid-item-${item.i}`"
            :h="item.h"
            :i="item.i"
            :w="item.w"
            :x="item.x"
            :y="item.y"
            @container-resized="(...args: unknown[]) => logA('container-resized', ...args)"
            @item-clicked="onItemClicked"
            @item-move="(...args: unknown[]) => logA('item-move', ...args)"
            @item-moved="(...args: unknown[]) => logA('item-moved', ...args)"
            @remove-grid-item="onRemoveItem"
            @resize="(...args: unknown[]) => logA('resize', ...args)"
            @resized="(...args: unknown[]) => logA('resized', ...args)">
            <template
              v-if="isTarget(item) && itemSlots.header"
              #header>
              <strong
                class="lab-header"
                data-testid="lab-header-content">header slot</strong>
            </template>
            <template
              v-if="isTarget(item) && itemSlots.resizeHandle"
              #resize-handle="{ edge }">
              <span
                class="lab-custom-handle"
                :data-edge="edge"
                data-testid="lab-custom-handle">{{ edge }}</span>
            </template>
            <div
              class="demo-item lab-item"
              :data-testid="`lab-item-body-${item.i}`">
              Item {{ item.i }}
              <button
                class="lab-inner-button"
                type="button">
                btn
              </button>
              <template v-if="isTarget(item)">
                <p
                  v-for="n in lineCount"
                  :key="n"
                  class="lab-line">
                  line {{ n }}
                </p>
              </template>
            </div>
          </GridItem>
          <template
            v-if="gridSlots.placeholder"
            #placeholder="{ isDragging: placeholderDragging }">
            <div
              class="lab-placeholder"
              :data-dragging="String(placeholderDragging)"
              data-testid="lab-placeholder-content">
              custom placeholder
            </div>
          </template>
        </GridLayout>
      </div>

      <div
        v-if="showGridB"
        class="lab-grid-wrap lab-grid-b"
        data-testid="lab-grid-b-wrap"
        :style="{ width: `${stageWidth}px` }">
        <GridLayout
          v-model:layout="layoutB"
          v-bind="gridBBind"
          data-testid="lab-grid-b"
          @cross-grid-drop-rejected="logB('cross-grid-drop-rejected', $event)"
          @cross-grid-item-dropped="logB('cross-grid-item-dropped', $event)"
          @dragend="logB('dragend', $event)"
          @dragstart="logB('dragstart', $event)"
          @item-dropped-from-outside="onDroppedFromOutsideB"
          @layout-updated="logB('layout-updated', $event)">
          <GridItem
            v-for="item in layoutB"
            :key="item.i"
            :data-testid="`b-grid-item-${item.i}`"
            :h="item.h"
            :i="item.i"
            :w="item.w"
            :x="item.x"
            :y="item.y">
            <div class="demo-item">
              B: {{ item.i }}
            </div>
          </GridItem>
        </GridLayout>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
  import { computed, reactive, ref } from 'vue';
  import {
    ECompactType,
    GridItem,
    GridLayout,
    exportLayoutAsSvg,
    useLayoutPresets,
    useLayoutStorage,
  } from '@/components';
  import type {
    IGridAriaLabels,
    ICompactor,
    IOutsideItemDropped,
    TLayout,
  } from '@/components';
  import { collides } from '@/core';
  import type { TResizeHandle } from 'keystone-dashboard-layout-core';

  const resizeHandleEdges: TResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const compactTypes = Object.values(ECompactType);
  const alignEdges = ['left', 'right', 'top', 'bottom', 'center-x', 'center-y'] as const;
  const ariaKeys = ['closeButton', 'itemRoleDescription', 'moveInstruction', 'resizeInstruction'] as const;
  type TAriaKey = typeof ariaKeys[number];

  const LAB_MIME = `application/x-lab-widget`;

  const initialLayout = (): TLayout => [
    { h: 2, i: '0', w: 3, x: 0, y: 0 },
    { h: 3, i: '1', w: 2, x: 3, y: 0 },
    { h: 4, i: '2', w: 4, x: 7, y: 0 },
    { h: 2, i: '3', w: 3, x: 0, y: 3 },
  ];

  /**
   * A layout built for align/distribute assertions: every pair of items is far enough apart that aligning
   * one to another can never make them overlap (which compaction would then "resolve" and blur the result),
   * and every distribute gap divides evenly.
   *
   *   p (anchor, x2 w4)  with q (x8 w2) on another row  -> left 2, right 4, centre-x 3
   *   r (anchor, y6 h4)  with s (y9 h2) in another column -> top 6, bottom 8, centre-y 7
   *   t1/t2/t3 share a row: outer items x0..2 and x10..12 -> t2 lands on x5
   *   v1/v2/v3 share a column: outer items y0..2 and y8..10 -> v2 lands on y4
   */
  const alignLayout = (): TLayout => [
    { h: 2, i: 'p', w: 4, x: 2, y: 0 },
    { h: 2, i: 'q', w: 2, x: 8, y: 3 },
    { h: 4, i: 'r', w: 3, x: 0, y: 6 },
    { h: 2, i: 's', w: 2, x: 6, y: 9 },
    { h: 2, i: 't1', w: 2, x: 0, y: 12 },
    { h: 2, i: 't2', w: 2, x: 3, y: 12 },
    { h: 2, i: 't3', w: 2, x: 10, y: 12 },
    { h: 2, i: 'v1', w: 1, x: 11, y: 0 },
    { h: 2, i: 'v2', w: 1, x: 11, y: 3 },
    { h: 2, i: 'v3', w: 1, x: 11, y: 8 },
  ];

  const layout = ref<TLayout>(initialLayout());
  const layoutB = ref<TLayout>([]);
  const gridRef = ref<InstanceType<typeof GridLayout>>();

  const useLibraryDefaults = ref(false);
  const showGridB = ref(false);
  const stageScale = ref(1);
  const stageWidth = ref(1200);

  // ---------------------------------------------------------------- grid state

  const gridBooleanProps = [
    'autoSize',
    'allowCrossGridDrag',
    'disableExternalDrop',
    'allowOutsideDrop',
    'useBorderRadius',
    'showAlignmentGuides',
    'showSpacingGuides',
    'snapToGrid',
    'distributeEvenly',
    'horizontalShift',
    'isBounded',
    'isDraggable',
    'isMirrored',
    'isResizable',
    'multiSelect',
    'preventCollision',
    'responsive',
    'restoreOnDrag',
    'showCloseButton',
    'showGridLines',
    'showResizeHandles',
    'useCssTransforms',
    'enableUndoRedo',
    'enableEditMode',
  ] as const;
  type TGridBooleanProp = typeof gridBooleanProps[number];

  const gridNumberProps = [
    'outsideDropWidth',
    'outsideDropHeight',
    'borderRadiusPx',
    'transitionDurationMs',
    'snapThreshold',
    'colNum',
    'marginX',
    'marginY',
    'rowHeight',
    'transformScale',
    'undoHistoryLimit',
  ] as const;
  type TGridNumberProp = typeof gridNumberProps[number];

  type TGridState = Record<TGridBooleanProp, boolean> & Record<TGridNumberProp, number> & {
    heightMode: '' | 'auto' | 'fixed' | 'scroll' | 'fit';
    compactType: `${ECompactType}`;
    compactorMode: 'builtin' | 'downward';
    transitionTimingFunction: string;
    resizeHandleColor: string;
    layoutId: string;
    maxRows: string;
    acceptOnlyLabWidgets: boolean;
    breakpointsJson: string;
    colsJson: string;
    responsiveLayoutsJson: string;
  };

  const defaultGridState = (): TGridState => ({
    acceptOnlyLabWidgets: false,
    allowCrossGridDrag: false,
    allowOutsideDrop: false,
    autoSize: true,
    borderRadiusPx: 10,
    breakpointsJson: ``,
    colNum: 12,
    colsJson: ``,
    compactType: `none`,
    compactorMode: `builtin`,
    disableExternalDrop: false,
    distributeEvenly: false,
    enableEditMode: true,
    enableUndoRedo: false,
    heightMode: ``,
    horizontalShift: false,
    isBounded: false,
    isDraggable: true,
    isMirrored: false,
    isResizable: true,
    layoutId: `lab-grid-a`,
    marginX: 10,
    marginY: 10,
    maxRows: ``,
    multiSelect: false,
    outsideDropHeight: 2,
    outsideDropWidth: 2,
    preventCollision: false,
    resizeHandleColor: `rgb(94 94 94 / 45%)`,
    responsive: false,
    responsiveLayoutsJson: ``,
    restoreOnDrag: false,
    rowHeight: 60,
    showAlignmentGuides: false,
    showCloseButton: false,
    showGridLines: false,
    showResizeHandles: false,
    showSpacingGuides: false,
    snapThreshold: 1,
    snapToGrid: false,
    transformScale: 1,
    transitionDurationMs: 0,
    transitionTimingFunction: `ease`,
    undoHistoryLimit: 50,
    useBorderRadius: false,
    useCssTransforms: true,
  });

  const grid = reactive<TGridState>(defaultGridState());
  const gridB = reactive({ allowCrossGridDrag: false, disableExternalDrop: false });
  const gridResizeHandles = ref<TResizeHandle[]>([...resizeHandleEdges]);
  const gridAria = reactive<Record<TAriaKey, string>>({
    closeButton: ``,
    itemRoleDescription: ``,
    moveInstruction: ``,
    resizeInstruction: ``,
  });
  const gridSlots = reactive({ placeholder: false });

  /** Parses a JSON textarea without ever throwing, so a half-typed value never takes the whole lab down. */
  const parseJson = <T,>(raw: string): { failed: boolean; value: T | undefined } => {
    if(raw.trim() === ``) {
      return { failed: false, value: undefined };
    }
    try {
      return { failed: false, value: JSON.parse(raw) as T };
    } catch {
      return { failed: true, value: undefined };
    }
  };
  const parsedBreakpoints = computed(() => parseJson<Record<string, number>>(grid.breakpointsJson));
  const parsedCols = computed(() => parseJson<Record<string, number>>(grid.colsJson));
  const parsedResponsiveLayouts = computed(() => parseJson<Record<string, TLayout>>(grid.responsiveLayoutsJson));
  const jsonError = computed(() => {
    const failed: string[] = [];
    if(parsedBreakpoints.value.failed) {
      failed.push(`breakpoints`);
    }
    if(parsedCols.value.failed) {
      failed.push(`cols`);
    }
    if(parsedResponsiveLayouts.value.failed) {
      failed.push(`responsiveLayouts`);
    }
    return failed.length === 0 ? `` : `invalid JSON: ${failed.join(`, `)}`;
  });

  // A deliberately visible, testably-different custom compactor: items settle toward the bottom instead of floating up.
  const downwardCompactor: ICompactor = {
    compact(layoutToCompact) {
      const maxY = 10;
      const placed: TLayout = [];
      const sorted = [...layoutToCompact].sort((a, b) => b.y - a.y);
      for(const item of sorted) {
        const moved = { ...item };
        if(!moved.isStatic) {
          while (moved.y + moved.h < maxY && !placed.some(other => collides({ ...moved, y: moved.y + 1 }, other))) {
            moved.y++;
          }
        }
        placed.push(moved);
      }
      return layoutToCompact.map(item => placed.find(entry => entry.i === item.i) ?? item);
    },
    type: `downward`,
  };

  const acceptLabWidgetsOnly = (dataTransfer: DataTransfer | null): boolean => !!dataTransfer?.types.includes(LAB_MIME);

  const gridBind = computed<Record<string, unknown>>(() => {
    if(useLibraryDefaults.value) {
      return {};
    }
    const ariaLabels: IGridAriaLabels = {};
    ariaKeys.forEach(key => {
      if(gridAria[key] !== ``) {
        ariaLabels[key] = gridAria[key];
      }
    });
    return {
      allowCrossGridDrag: grid.allowCrossGridDrag,
      allowOutsideDrop: grid.allowOutsideDrop,
      ariaLabels,
      autoSize: grid.autoSize,
      borderRadiusPx: grid.borderRadiusPx,
      breakpoints: parsedBreakpoints.value.value,
      colNum: grid.colNum,
      cols: parsedCols.value.value,
      compactType: grid.compactType,
      compactor: grid.compactorMode === `downward` ? downwardCompactor : null,
      disableExternalDrop: grid.disableExternalDrop,
      distributeEvenly: grid.distributeEvenly,
      enableEditMode: grid.enableEditMode,
      enableUndoRedo: grid.enableUndoRedo,
      heightMode: grid.heightMode === `` ? null : grid.heightMode,
      horizontalShift: grid.horizontalShift,
      isBounded: grid.isBounded,
      isDraggable: grid.isDraggable,
      isMirrored: grid.isMirrored,
      isResizable: grid.isResizable,
      layoutId: grid.layoutId === `` ? undefined : grid.layoutId,
      margin: [grid.marginX, grid.marginY],
      maxRows: grid.maxRows.trim() === `` ? Infinity : Number(grid.maxRows),
      multiSelect: grid.multiSelect,
      outsideDropAccept: grid.acceptOnlyLabWidgets ? acceptLabWidgetsOnly : null,
      outsideDropHeight: grid.outsideDropHeight,
      outsideDropWidth: grid.outsideDropWidth,
      preventCollision: grid.preventCollision,
      resizeHandleColor: grid.resizeHandleColor,
      resizeHandles: gridResizeHandles.value,
      responsive: grid.responsive,
      responsiveLayouts: parsedResponsiveLayouts.value.value,
      restoreOnDrag: grid.restoreOnDrag,
      rowHeight: grid.rowHeight,
      showAlignmentGuides: grid.showAlignmentGuides,
      showCloseButton: grid.showCloseButton,
      showGridLines: grid.showGridLines,
      showResizeHandles: grid.showResizeHandles,
      showSpacingGuides: grid.showSpacingGuides,
      snapThreshold: grid.snapThreshold,
      snapToGrid: grid.snapToGrid,
      transformScale: grid.transformScale,
      transitionDurationMs: grid.transitionDurationMs,
      transitionTimingFunction: grid.transitionTimingFunction,
      undoHistoryLimit: grid.undoHistoryLimit,
      useBorderRadius: grid.useBorderRadius,
      useCssTransforms: grid.useCssTransforms,
    };
  });

  const gridBBind = computed<Record<string, unknown>>(() => ({
    allowCrossGridDrag: gridB.allowCrossGridDrag,
    colNum: grid.colNum,
    compactType: grid.compactType,
    disableExternalDrop: gridB.disableExternalDrop,
    layoutId: `lab-grid-b`,
    margin: [grid.marginX, grid.marginY],
    rowHeight: grid.rowHeight,
    transitionDurationMs: 0,
  }));

  // ---------------------------------------------------------------- item state

  const itemTarget = ref(`0`);
  const itemTriKeys = [
    'isDraggable',
    'isResizable',
    'isBounded',
    'enableEditMode',
    'showCloseButton',
    'showResizeHandles',
    'useBorderRadius',
    'isMirrored',
  ] as const;
  type TItemTriKey = typeof itemTriKeys[number];
  type TTri = 'inherit' | 'true' | 'false';
  const itemTri = reactive<Record<TItemTriKey, TTri>>({
    enableEditMode: `inherit`,
    isBounded: `inherit`,
    isDraggable: `inherit`,
    isMirrored: `inherit`,
    isResizable: `inherit`,
    showCloseButton: `inherit`,
    showResizeHandles: `inherit`,
    useBorderRadius: `inherit`,
  });
  const triValue = (mode: TTri): boolean | undefined => {
    if(mode === `true`) {
      return true;
    }
    if(mode === `false`) {
      return false;
    }
    return undefined;
  };

  const itemBooleanKeys = ['isStatic', 'preserveAspectRatio', 'autoScroll', 'autoHeight'] as const;
  type TItemBooleanKey = typeof itemBooleanKeys[number];
  const itemBool = reactive<Record<TItemBooleanKey, boolean>>({
    autoHeight: false,
    autoScroll: false,
    isStatic: false,
    preserveAspectRatio: false,
  });
  const itemSlots = reactive({ header: false, resizeHandle: false });
  const lineCount = ref(1);

  const itemNumberKeys = ['minW', 'minH', 'maxW', 'maxH', 'borderRadiusPx', 'zIndex'] as const;
  type TItemNumberKey = typeof itemNumberKeys[number];
  const itemNum = reactive<Record<TItemNumberKey, string>>({
    borderRadiusPx: ``,
    maxH: ``,
    maxW: ``,
    minH: ``,
    minW: ``,
    zIndex: ``,
  });
  const numberOrUndefined = (raw: string): number | undefined => (raw.trim() === `` ? undefined : Number(raw));

  const itemTextKeys = ['dragAllowFrom', 'dragIgnoreFrom', 'resizeIgnoreFrom', 'resizeHandleColor'] as const;
  type TItemTextKey = typeof itemTextKeys[number];
  const itemText = reactive<Record<TItemTextKey, string>>({
    dragAllowFrom: ``,
    dragIgnoreFrom: ``,
    resizeHandleColor: ``,
    resizeIgnoreFrom: ``,
  });
  const textOrUndefined = (raw: string): string | undefined => (raw.trim() === `` ? undefined : raw);

  const activationKeys = ['value', 'mouse', 'touch', 'pen'] as const;
  type TActivationKey = typeof activationKeys[number];
  const activation = reactive<{ mode: 'default' | 'number' | 'object' } & Record<TActivationKey, string>>({
    mode: `default`,
    mouse: ``,
    pen: ``,
    touch: ``,
    value: ``,
  });
  const activationValue = (): number | { mouse?: number; touch?: number; pen?: number } | undefined => {
    if(activation.mode === `number`) {
      return Number(activation.value || 0);
    }
    if(activation.mode === `object`) {
      return {
        mouse: numberOrUndefined(activation.mouse),
        pen: numberOrUndefined(activation.pen),
        touch: numberOrUndefined(activation.touch),
      };
    }
    return undefined;
  };

  const itemInheritHandles = ref(true);
  const itemResizeHandles = ref<TResizeHandle[]>([...resizeHandleEdges]);
  const itemAria = reactive<Record<TAriaKey, string>>({
    closeButton: ``,
    itemRoleDescription: ``,
    moveInstruction: ``,
    resizeInstruction: ``,
  });

  const isTarget = (item: TLayout[number]): boolean => String(item.i) === itemTarget.value;

  /**
   * `GridLayout`'s group move/resize decide who may be carried along from the *layout entries*
   * (`isStatic`, `isDraggable`, `isResizable`, `minW`, `maxW`, `minH`, `maxH`), not from the props set on a
   * `GridItem` — so those need a way to be set on the entry itself.
   */
  const layoutPatch = ref(`{}`);
  const applyLayoutPatch = (): void => {
    let patch: Record<string, unknown>;
    try {
      patch = JSON.parse(layoutPatch.value) as Record<string, unknown>;
    } catch {
      return;
    }
    layout.value = layout.value.map(entry => (String(entry.i) === itemTarget.value ? { ...entry, ...patch } : entry));
  };

  /** Per-item overrides, applied to the target item only — every other item keeps inheriting the grid-wide defaults. */
  const itemBind = (item: TLayout[number]): Record<string, unknown> => {
    if(useLibraryDefaults.value || !isTarget(item)) {
      return {};
    }
    const itemAriaLabels: IGridAriaLabels = {};
    ariaKeys.forEach(key => {
      if(itemAria[key] !== ``) {
        itemAriaLabels[key] = itemAria[key];
      }
    });
    return {
      ariaLabels: itemAriaLabels,
      autoHeight: itemBool.autoHeight,
      autoScroll: itemBool.autoScroll,
      borderRadiusPx: numberOrUndefined(itemNum.borderRadiusPx),
      dragActivationDistance: activationValue(),
      dragAllowFrom: textOrUndefined(itemText.dragAllowFrom),
      dragIgnoreFrom: textOrUndefined(itemText.dragIgnoreFrom),
      enableEditMode: triValue(itemTri.enableEditMode),
      isBounded: triValue(itemTri.isBounded),
      isDraggable: triValue(itemTri.isDraggable),
      isMirrored: triValue(itemTri.isMirrored),
      isResizable: triValue(itemTri.isResizable),
      isStatic: itemBool.isStatic,
      maxH: numberOrUndefined(itemNum.maxH),
      maxW: numberOrUndefined(itemNum.maxW),
      minH: numberOrUndefined(itemNum.minH),
      minW: numberOrUndefined(itemNum.minW),
      preserveAspectRatio: itemBool.preserveAspectRatio,
      resizeHandleColor: textOrUndefined(itemText.resizeHandleColor),
      resizeHandles: itemInheritHandles.value ? undefined : itemResizeHandles.value,
      resizeIgnoreFrom: textOrUndefined(itemText.resizeIgnoreFrom),
      showCloseButton: triValue(itemTri.showCloseButton),
      showResizeHandles: triValue(itemTri.showResizeHandles),
      useBorderRadius: triValue(itemTri.useBorderRadius),
      zIndex: numberOrUndefined(itemNum.zIndex),
    };
  };

  // ---------------------------------------------------------------- event log

  interface ILogEntry {
    id: number;
    name: string;
    payload: string;
  }

  const entries = ref<ILogEntry[]>([]);
  let sequence = 0;
  const lastBreakpointEvent = ref(``);
  const lastColumnsEvent = ref(``);

  const isLayoutArray = (value: unknown): value is TLayout =>
    Array.isArray(value) && value.every(entry => entry && typeof entry === `object` && `i` in entry && `x` in entry && `w` in entry);

  const summarize = (value: unknown): unknown => {
    if(typeof value === `function`) {
      return `[function]`;
    }
    if(typeof DataTransfer !== `undefined` && value instanceof DataTransfer) {
      return { types: Array.from(value.types) };
    }
    if(typeof MouseEvent !== `undefined` && value instanceof MouseEvent) {
      return { ctrlKey: value.ctrlKey, metaKey: value.metaKey, shiftKey: value.shiftKey, type: value.type };
    }
    if(isLayoutArray(value)) {
      return value.map(({ h, i, w, x, y }) => ({ h, i, w, x, y }));
    }
    if(Array.isArray(value)) {
      return value.map(summarize);
    }
    if(value && typeof value === `object`) {
      const out: Record<string, unknown> = {};
      Object.entries(value).forEach(([key, inner]) => {
        out[key] = summarize(inner);
      });
      return out;
    }
    return value;
  };

  const record = (name: string, args: unknown[]): void => {
    sequence += 1;
    entries.value.push({ id: sequence, name, payload: JSON.stringify(args.map(summarize)) });
    if(entries.value.length > 2000) {
      entries.value.splice(0, entries.value.length - 2000);
    }
  };

  const logA = (name: string, ...args: unknown[]): void => record(name, args);
  const logB = (name: string, ...args: unknown[]): void => record(`b:${name}`, args);
  const clearLog = (): void => {
    entries.value = [];
  };

  const onBreakpointChanged = (breakpoint: string, ...rest: unknown[]): void => {
    lastBreakpointEvent.value = breakpoint;
    logA(`breakpoint-changed`, breakpoint, ...rest);
  };
  const onColumnsChanged = (columns: number): void => {
    lastColumnsEvent.value = String(columns);
    logA(`columns-changed`, columns);
  };
  const onItemClicked = (id: string | number, event: MouseEvent): void => logA(`item-clicked`, id, event);

  const onRemoveItem = (id: string | number): void => {
    logA(`remove-grid-item`, id);
    layout.value = layout.value.filter(item => item.i !== id);
  };

  // ---------------------------------------------------------------- outside drop

  const onWidgetDragStart = (event: DragEvent): void => {
    event.dataTransfer?.setData(LAB_MIME, JSON.stringify({ label: `widget` }));
    if(event.dataTransfer) {
      event.dataTransfer.effectAllowed = `copy`;
    }
  };
  const onIncompatibleDragStart = (event: DragEvent): void => {
    event.dataTransfer?.setData(`text/plain`, `incompatible`);
  };

  let dropCounter = 0;
  const onDroppedFromOutside = (payload: IOutsideItemDropped): void => {
    logA(`item-dropped-from-outside`, payload);
    dropCounter += 1;
    layout.value = [...layout.value, { h: payload.h, i: `drop-${dropCounter}`, w: payload.w, x: payload.x, y: payload.y }];
  };
  const onDroppedFromOutsideB = (payload: IOutsideItemDropped): void => {
    logB(`item-dropped-from-outside`, payload);
    dropCounter += 1;
    layoutB.value = [...layoutB.value, { h: payload.h, i: `drop-${dropCounter}`, w: payload.w, x: payload.x, y: payload.y }];
  };

  // ---------------------------------------------------------------- methods / persistence

  const methodId = ref(`0`);
  let addCounter = 0;

  const duplicateTarget = (): void => {
    gridRef.value?.duplicateItem(itemTarget.value);
  };
  const addItem = (): void => {
    addCounter += 1;
    const bottom = layout.value.reduce((max, item) => Math.max(max, item.y + item.h), 0);
    layout.value = [...layout.value, { h: 2, i: `added-${addCounter}`, w: 3, x: 0, y: bottom }];
  };
  const removeLastItem = (): void => {
    layout.value = layout.value.slice(0, -1);
  };
  const resetLayout = (): void => {
    layout.value = initialLayout();
    layoutB.value = [];
    lineCount.value = 1;
  };
  const loadAlignLayout = (): void => {
    layout.value = alignLayout();
  };

  const { savePreset, loadPreset, deletePreset, listPresets } = useLayoutPresets(`lab-presets`, layout);
  const presetNames = ref<string[]>(listPresets());
  const presetLoaded = ref<boolean | null>(null);
  const savePresetAndRefresh = (name: string): void => {
    savePreset(name);
    presetNames.value = listPresets();
  };
  const loadPresetResult = (name: string): void => {
    presetLoaded.value = loadPreset(name);
  };
  const deletePresetAndRefresh = (name: string): void => {
    deletePreset(name);
    presetNames.value = listPresets();
  };

  const storage = useLayoutStorage(`lab-storage`, layout, { autoLoad: false });
  const storageHas = ref(storage.hasSaved());
  const storageLoaded = ref<boolean | null>(null);
  const refreshStorage = (): void => {
    storageHas.value = storage.hasSaved();
  };

  const svgOutput = ref(``);
  const exportSvg = (): void => {
    svgOutput.value = exportLayoutAsSvg(layout.value, {
      colNum: grid.colNum,
      containerWidth: 1200,
      margin: [grid.marginX, grid.marginY],
      rowHeight: grid.rowHeight,
    });
  };

  const compactLayout = (value: TLayout): { i: string | number; x: number; y: number; w: number; h: number }[] =>
    value.map(({ h, i, w, x, y }) => ({ h, i, w, x, y }));
  const layoutJson = computed(() => JSON.stringify(compactLayout(layout.value)));
  const layoutBJson = computed(() => JSON.stringify(compactLayout(layoutB.value)));
</script>

<style scoped>
.lab-page {
  align-items: start;
  display: grid;
  gap: 16px;
  grid-template-columns: 380px 1200px;
}

.lab-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.lab-fieldset {
  margin-bottom: 0;
}

.lab-fieldset label {
  font-size: 12px;
}

.lab-fieldset input[type='text'],
.lab-fieldset textarea,
.lab-fieldset select {
  font-size: 12px;
  max-width: 180px;
}

.lab-readouts {
  display: block;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.lab-svg {
  font-size: 10px;
  max-height: 60px;
  overflow: auto;
  white-space: pre-wrap;
}

.lab-log {
  list-style: none;
  margin: 0;
  max-height: 180px;
  padding: 8px 12px;
}

.lab-stage {
  align-self: start;
  position: sticky;
  top: 8px;
}

.lab-palette {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.lab-widget-other {
  background: var(--color-text-muted);
}

.lab-grid-wrap {
  background: #fff;
}

.lab-grid-b {
  margin-top: 16px;
}

.lab-grid-wrap :deep(.vue-grid-layout) {
  min-height: 160px;
}

.lab-inner-button {
  font-size: 11px;
  margin-left: 6px;
  padding: 2px 6px;
}

.lab-header {
  background: #f1f5f9;
  display: block;
  font-size: 12px;
  padding: 2px 6px;
}

.lab-custom-handle {
  font-size: 9px;
  pointer-events: none;
}

.lab-line {
  font-size: 10px;
  margin: 0;
}

/* The demo's item body is a flex row; the autoHeight tests add lines of content, which must stack to make it taller. */
.lab-item {
  flex-direction: column;
}

.lab-placeholder {
  font-size: 11px;
}
</style>
