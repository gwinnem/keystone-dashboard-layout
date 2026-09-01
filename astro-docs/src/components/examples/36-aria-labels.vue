<template>
  <div class="demo-controls">
    <ExampleToggle
      v-model="spanish"
      label="Use Spanish grid-wide labels" />
  </div>

  <GridLayout
    ref="gridRef"
    v-model:layout="layout"
    :aria-labels="gridAriaLabels"
    :col-num="12"
    :row-height="80"
    show-grid-lines>
    <GridItem
      :h="layout[0].h"
      :i="layout[0].i"
      show-close-button
      :w="layout[0].w"
      :x="layout[0].x"
      :y="layout[0].y">
      <div class="example-item">Uses grid-wide labels</div>
    </GridItem>
    <GridItem
      :aria-labels="{ closeButton: 'Fermer' }"
      :h="layout[1].h"
      :i="layout[1].i"
      show-close-button
      :w="layout[1].w"
      :x="layout[1].x"
      :y="layout[1].y">
      <div class="example-item">Own override (French close button)</div>
    </GridItem>
  </GridLayout>

  <div class="aria-readout">
    <h4>Current ARIA strings (normally screen-reader-only)</h4>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>aria-roledescription</th>
          <th>Move/resize instructions</th>
          <th>Close button label</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in ariaReadout"
          :key="row.id">
          <td>{{ row.id }}</td>
          <td>{{ row.roleDescription }}</td>
          <td>{{ row.instructions }}</td>
          <td>{{ row.closeButtonLabel }}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <LayoutJsonViewer :layout="layout" />
</template>

<script lang="ts" setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { GridLayout, GridItem, type IGridAriaLabels, type TLayout } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';
  import ExampleToggle from '../harness/ExampleToggle.vue';
  import LayoutJsonViewer from '../harness/LayoutJsonViewer.vue';

  const layout = ref<TLayout>([
    { h: 2, i: 'a', w: 6, x: 0, y: 0 },
    { h: 2, i: 'b', w: 6, x: 6, y: 0 },
  ]);

  const spanish = ref(false);
  const gridRef = ref<InstanceType<typeof GridLayout>>();

  const gridAriaLabels = computed<IGridAriaLabels>(() =>
    spanish.value
      ? {
        closeButton: 'Cerrar',
        itemRoleDescription: 'Elemento arrastrable y redimensionable',
        moveInstruction: 'Presiona las flechas para mover.',
        resizeInstruction: 'Presiona shift más flechas para redimensionar.',
      }
      : {},
  );

  // Every one of the strings this example is about is deliberately
  // visually hidden in normal use — toggling the language above
  // produces no visible change at all on its own. Reading these same
  // values back out of the real, rendered DOM (not duplicating the
  // ariaLabels logic separately) and displaying them in an ordinary,
  // visible table makes the actual effect immediately visible without
  // needing devtools or a screen reader.
  interface IAriaReadoutRow {
    id: string;
    roleDescription: string;
    instructions: string;
    closeButtonLabel: string;
  }

  const ariaReadout = ref<IAriaReadoutRow[]>([]);

  async function refreshAriaReadout(): Promise<void> {
    await nextTick();
    const container = gridRef.value?.$el as HTMLElement | undefined;
    if (!container) {
      return;
    }
    ariaReadout.value = layout.value.map((item) => {
      const el = container.querySelector<HTMLElement>(`[data-grid-item-id="${item.i}"]`);
      const closeButtonEl = el?.querySelector<HTMLElement>('.btn-close .visually-hidden');
      const instructionsEl = el ? container.querySelector<HTMLElement>(`#${el.getAttribute('aria-describedby')}`) : null;
      return {
        closeButtonLabel: closeButtonEl?.textContent?.trim() ?? '(none)',
        id: String(item.i),
        instructions: instructionsEl?.textContent?.trim().replace(/\s+/g, ' ') ?? '(none)',
        roleDescription: el?.getAttribute('aria-roledescription') ?? '(none)',
      };
    });
  }

  // `immediate: true` alone isn't enough here: it runs synchronously
  // during setup, before this component has actually mounted, so
  // `gridRef.value` is still undefined at that point and
  // refreshAriaReadout() returns early without populating anything —
  // leaving the table stuck empty until the user happens to toggle
  // something. onMounted (which fires strictly after the template ref
  // is populated) is what actually gets the first, correct read.
  watch([spanish, layout], refreshAriaReadout);
  onMounted(refreshAriaReadout);
</script>

<style scoped>
.demo-controls {
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

.aria-readout {
  margin-top: 16px;
}

.aria-readout h4 {
  color: var(--kg-text-lo-light);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.aria-readout table {
  border-collapse: collapse;
  font-family: var(--kg-font-mono);
  font-size: 0.85em;
  width: 100%;
}

.aria-readout th,
.aria-readout td {
  border: 1px solid var(--kg-line-light);
  padding: 6px 10px;
  text-align: left;
}
</style>
