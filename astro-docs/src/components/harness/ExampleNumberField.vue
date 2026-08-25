<!--
  Ported from vitepress-docs/.vitepress/theme/components/ExampleNumberField.vue
  — a labeled number input matching ExampleToggle's look, v-model
  compatible. Only --vp-c-* tokens replaced; markup/behavior unchanged.
-->
<template>
  <label class="number-field">
    <span class="number-field__label">{{ label }}</span>
    <input
      class="number-field__input"
      :max="max"
      :min="min"
      :step="step"
      type="number"
      :value="modelValue"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))" />
  </label>
</template>

<script setup lang="ts">
  withDefaults(defineProps<{
    modelValue: number;
    label: string;
    min?: number;
    max?: number;
    step?: number;
  }>(), {
    max: undefined,
    min: undefined,
    step: 1,
  });
  defineEmits<{
    (e: 'update:modelValue', value: number): void;
  }>();
</script>

<style scoped>
.number-field {
  align-items: center;
  color: var(--kg-text-hi-light);
  display: inline-flex;
  font-size: 13px;
  gap: 8px;
}

.number-field__label {
  white-space: nowrap;
}

.number-field__input {
  background: var(--kg-paper);
  border: 1px solid var(--kg-line-light);
  border-radius: 6px;
  color: var(--kg-text-hi-light);
  font-size: 13px;
  padding: 3px 8px;
  width: 64px;
}

.number-field__input:focus {
  outline: 2px solid var(--kg-blueprint-deep);
  outline-offset: -1px;
}
</style>
