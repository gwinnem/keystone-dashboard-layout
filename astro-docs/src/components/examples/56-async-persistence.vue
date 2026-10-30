<template>
  <div class="demo-controls">
    <button class="demo-btn" :disabled="isSaving" type="button" @click="onSave">Save to server</button>
    <button class="demo-btn demo-btn--ghost" :disabled="isLoading" type="button" @click="onLoad">Load from server</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="onClear">Delete from server</button>
    <button class="demo-btn demo-btn--ghost" type="button" @click="reset">Reset to default</button>
  </div>

  <div class="demo-controls">
    <label>
      Server latency
      <select v-model.number="latency">
        <option :value="0">none</option>
        <option :value="600">600 ms</option>
        <option :value="2000">2 s</option>
      </select>
    </label>
    <label>
      <input v-model="serverDown" type="checkbox" />
      Server is down
    </label>
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
      <div class="example-item">{{ item.i }}</div>
    </GridItem>
  </GridLayout>

  <p class="demo-status">
    <span v-if="isSaving">Saving…</span>
    <span v-else-if="isLoading">Loading…</span>
    <span v-else-if="error">Server error: {{ errorMessage }}</span>
    <span v-else-if="status">{{ status }}</span>
    <span v-else>Drag or resize items, then save. Nothing is stored until you do.</span>
  </p>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import {
    GridLayout,
    GridItem,
    createMemoryAsyncStorage,
    useAsyncLayoutStorage,
    type IAsyncLayoutStorage,
    type TLayout,
  } from 'keystone-dashboard-layout-vue';
  import 'keystone-dashboard-layout-vue/style.css';

  const defaultLayout = (): TLayout => [
    { h: 2, i: 'A', w: 4, x: 0, y: 0 },
    { h: 2, i: 'B', w: 4, x: 4, y: 0 },
    { h: 2, i: 'C', w: 4, x: 8, y: 0 },
  ];

  const layout = ref<TLayout>(defaultLayout());
  const status = ref('');
  const latency = ref(600);
  const serverDown = ref(false);

  // A stand-in for a real backend: an in-memory store that answers after a delay, or fails
  // while "down". In an app this would be createHttpStorage({ baseUrl: '/api/layouts' }),
  // createIndexedDbStorage(), or your own IAsyncLayoutStorage.
  const memory = createMemoryAsyncStorage();
  const wait = (): Promise<void> => new Promise(resolve => setTimeout(resolve, latency.value));
  const guard = async (): Promise<void> => {
    await wait();
    if (serverDown.value) {
      throw new Error('503 Service Unavailable');
    }
  };
  const server: IAsyncLayoutStorage = {
    getItem: async key => { await guard(); return memory.getItem(key); },
    removeItem: async key => { await guard(); return memory.removeItem(key); },
    setItem: async (key, value) => { await guard(); return memory.setItem(key, value); },
  };

  // autoLoad: false so the default layout is what visitors see first.
  const { clear, error, isLoading, isSaving, load, save } = useAsyncLayoutStorage(
    'keystonegrid-example-56-layout',
    layout,
    server,
    { autoLoad: false },
  );

  const errorMessage = computed(() => (error.value instanceof Error ? error.value.message : String(error.value)));

  async function onSave(): Promise<void> {
    status.value = (await save()) ? `Saved at ${new Date().toLocaleTimeString()}` : '';
  }

  async function onLoad(): Promise<void> {
    status.value = (await load()) ? 'Loaded the layout from the server.' : '';
    if (!error.value && !status.value) {
      status.value = 'Nothing saved on the server yet.';
    }
  }

  async function onClear(): Promise<void> {
    status.value = (await clear()) ? 'Deleted the saved layout from the server.' : '';
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

.demo-btn:disabled {
  cursor: progress;
  opacity: 0.6;
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
