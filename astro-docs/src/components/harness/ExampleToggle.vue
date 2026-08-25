<!--
  Ported from vitepress-docs/.vitepress/theme/components/ExampleToggle.vue
  — a labeled boolean toggle, styled as a switch rather than a bare
  checkbox, v-model compatible. Only --vp-c-* tokens replaced with this
  project's own --kg-* tokens; markup and behavior unchanged.
-->
<template>
  <label class="toggle">
    <input
      :checked="modelValue"
      type="checkbox"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)" />
    <span class="toggle__track"><span class="toggle__thumb"></span></span>
    <span class="toggle__label">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
  defineProps<{
    modelValue: boolean;
    label: string;
  }>();
  defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
  }>();
</script>

<style scoped>
.toggle {
  align-items: center;
  color: var(--kg-text-hi-light);
  cursor: pointer;
  display: inline-flex;
  font-size: 13px;
  gap: 8px;
  user-select: none;
}

.toggle input {
  height: 0;
  opacity: 0;
  position: absolute;
  width: 0;
}

.toggle__track {
  background: var(--kg-paper-3);
  border-radius: 999px;
  flex-shrink: 0;
  height: 20px;
  position: relative;
  transition: background-color 0.15s ease;
  width: 34px;
}

.toggle__thumb {
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 25%);
  height: 16px;
  left: 2px;
  position: absolute;
  top: 2px;
  transition: transform 0.15s ease;
  width: 16px;
}

.toggle input:checked + .toggle__track {
  background: var(--kg-amber);
}

.toggle input:checked + .toggle__track .toggle__thumb {
  transform: translateX(14px);
}

.toggle input:focus-visible + .toggle__track {
  outline: 2px solid var(--kg-blueprint-deep);
  outline-offset: 2px;
}

.toggle__label {
  white-space: nowrap;
}
</style>
