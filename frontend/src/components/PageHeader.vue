<template>
  <div class="page-header q-pa-md" :style="headerStyle">
    <div class="row items-center justify-between">
      <div class="row items-center">
        <slot name="left-actions"></slot>
        <q-icon :name="icon" size="md" class="q-mr-sm" />
        <div class="text-h5">{{ title }}</div>
      </div>
      <div class="row items-center q-gutter-sm">
        <slot name="actions"></slot>
        <slot name="search-filters"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'settings'
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  searchValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:searchValue', 'search']);

const authStore = useAuthStore();

const headerStyle = computed(() => {
  if (!authStore.system?.secondaryColor) return { backgroundColor: 'var(--q-secondary)' };
  return {
    backgroundColor: authStore.system.secondaryColor,
    color: authStore.system.textColor || '#FFFFFF'
  };
});

const searchModel = computed({
  get: () => props.searchValue,
  set: (value) => {
    emit('update:searchValue', value);
    emit('search', value);
  }
});
</script>

