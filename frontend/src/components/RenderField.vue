<template>
  <div>
    <!-- Modo somente leitura: exibir apenas texto -->
    <div v-if="field.readonly === true">
      <div v-if="field.label" class="text-subtitle2 q-mb-xs">
        {{ field.label }}
      </div>
      <div v-if="field.type === 'color'" class="text-body2 row items-center q-gutter-sm">
        <div
          class="color-preview-readonly"
          :style="{ backgroundColor: formData[field.name] || '#cccccc' }"
        ></div>
        <span>{{ getDisplayValue(field) }}</span>
      </div>
      <div v-else class="text-body2">
        {{ getDisplayValue(field) }}
      </div>
    </div>

    <!-- File upload com preview -->
    <div v-else-if="field.type === 'file'">
      <div class="text-subtitle2 q-mb-sm">{{ field.label }}</div>
      <q-file
        :model-value="fileRefs[field.name]"
        :label="field.fileLabel || `Selecionar ${field.label} (${field.accept || 'arquivo'})`"
        :accept="field.accept || '*'"
        outlined
        @update:model-value="updateFileRef"
      >
        <template v-slot:prepend>
          <q-icon name="image" />
        </template>
      </q-file>
      <div v-if="formData[field.name]" class="q-mt-sm">
        <img 
          v-if="field.previewType === 'image'"
          :src="formData[field.name]" 
          :alt="field.label" 
          :style="field.previewStyle || 'max-width: 200px; max-height: 100px; object-fit: contain;'" 
        />
      </div>
    </div>
    
    <!-- TransferList para relações belongsToMany -->
    <TransferList
      v-else-if="field.type === 'transfer'"
      :available-items="getOptions(field)"
      :selected-items="formData[field.name] || []"
      :item-label="field.itemLabel || 'name'"
      :item-value="field.itemValue || 'id'"
      :available-label="field.availableLabel || 'Disponíveis'"
      :selected-label="field.selectedLabel || 'Selecionados'"
      :loading="loadingMap[field.name] || false"
      @update:selected-items="updateValue"
    />
    
    <!-- RelationMultiSelect -->
    <RelationMultiSelect
      v-else-if="field.type === 'multiselect'"
      :relation="field"
      :available-items="getOptions(field)"
      :selected-items="formData[field.name] || []"
      :loading="loadingMap[field.name] || false"
      @update:selected-items="updateValue"
    />
    
    <!-- RelationInlineForm -->
    <RelationInlineForm
      v-else-if="field.type === 'inline'"
      :relation="field"
      :model-value="formData[field.name] || []"
      :select-options="selectOptions"
      :options-map="optionsMap"
      :loading-map="loadingMap"
      @update:model-value="updateValue"
    />

    <!-- SubCrudTable -->
    <SubCrudTable
      v-else-if="field.type === 'sub-crud'"
      :relation="field"
      :model-value="formData[field.name] || []"
      :select-options="selectOptions"
      :options-map="optionsMap"
      :loading-map="loadingMap"
      @update:model-value="updateValue"
    />

    <!-- Campo customizado (component) -->
    <component
      v-else-if="field.type === 'component'"
      :is="field.component"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      v-bind="field.props || {}"
      :rules="field.rules || []"
    />
    
    <!-- Campo text -->
    <q-input
      v-else-if="field.type === 'text'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo email -->
    <q-input
      v-else-if="field.type === 'email'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="email"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo password -->
    <q-input
      v-else-if="field.type === 'password'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="password"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo number -->
    <q-input
      v-else-if="field.type === 'number'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="number"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo textarea -->
    <q-input
      v-else-if="field.type === 'textarea'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="textarea"
      :label="field.label"
      :rows="field.rows || 3"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo select -->
    <q-select
      v-else-if="field.type === 'select'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      :options="getOptions(field)"
      :option-label="field.optionLabel || field.itemLabel || 'label'"
      :option-value="field.optionValue || field.itemValue || 'value'"
      :loading="(field.optionsEndpoint || field.loading) && !getOptions(field).length"
      :clearable="field.clearable !== false"
      emit-value
      map-options
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo icon -->
    <IconPicker
      v-else-if="field.type === 'icon'"
      :model-value="formData[field.name]"
      :label="field.label"
      :rules="field.rules || []"
      @update:model-value="updateValue"
    />

    <!-- Campo color -->
    <div v-else-if="field.type === 'color'" class="color-field-wrapper">
      <q-input
        :model-value="formData[field.name]"
        @update:model-value="updateValue"
        :label="field.label"
        outlined
        dense
        :rules="field.rules || []"
        :hint="formData[field.name] || 'Selecione uma cor'"
        readonly
      >
        <template v-slot:prepend>
          <div
            class="color-preview"
            :style="{ backgroundColor: formData[field.name] || '#cccccc' }"
            @click="openColorPicker(field.name)"
          >
            <q-icon
              v-if="!formData[field.name]"
              name="palette"
              size="xs"
              color="grey-6"
            />
          </div>
        </template>
        <template v-slot:append>
          <q-btn
            flat
            dense
            round
            icon="colorize"
            @click="openColorPicker(field.name)"
          >
            <q-tooltip>Selecionar cor</q-tooltip>
          </q-btn>
        </template>
      </q-input>
      <input
        :ref="(el) => { 
          if (el && field.name) { 
            colorInputRefs.value[field.name] = el; 
          } 
        }"
        type="color"
        :value="formData[field.name] || '#000000'"
        @input="updateValue($event.target.value)"
        class="color-input-hidden"
        tabindex="-1"
      />
    </div>
    
    <!-- Campo date -->
    <q-input
      v-else-if="field.type === 'date'"
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      type="date"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
    
    <!-- Campo boolean -->
    <q-toggle
      v-else-if="field.type === 'boolean'"
      :model-value="formData[field.name] || false"
      @update:model-value="updateValue"
      :label="field.label"
      :disable="field.disable || false"
      :dense="field.dense !== false"
    />
    
    <!-- Campo padrão (text) -->
    <q-input
      v-else
      :model-value="formData[field.name]"
      @update:model-value="updateValue"
      :label="field.label"
      outlined
      :rules="field.rules || []"
    />
  </div>
</template>

<script setup>
import { ref as vueRef } from 'vue';
import TransferList from './TransferList.vue';
import RelationMultiSelect from './RelationMultiSelect.vue';
import RelationInlineForm from './RelationInlineForm.vue';
import SubCrudTable from './SubCrudTable.vue';
import IconPicker from './IconPicker.vue';

const props = defineProps({
  field: {
    type: Object,
    required: true
  },
  formData: {
    type: Object,
    required: true
  },
  fileRefs: {
    type: Object,
    default: () => ({})
  },
  selectOptions: {
    type: Object,
    default: () => ({})
  },
  // Mapa genérico de opções/itens disponíveis para selects e relações
  optionsMap: {
    type: Object,
    default: () => ({}) 
  },
  // Mapa de loading states
  loadingMap: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['file-upload', 'update:modelValue']);

// Objeto reativo para armazenar referências dos inputs de cor (um por campo)
const colorInputRefs = vueRef({});

// Função para abrir o color picker
function openColorPicker(fieldName) {
  const colorInput = colorInputRefs.value[fieldName];
  if (colorInput && colorInput.click) {
    colorInput.click();
  }
}

// Helper para obter opções de select ou relations
function getOptions(field) {
  if (field.options) return field.options;
  // Tentar optionsMap (novo padrão) ou selectOptions (padrão antigo)
  return props.optionsMap[field.name] || props.selectOptions[field.name] || [];
}

// Valor para exibição em campos somente leitura
function getDisplayValue(field) {
  const value = props.formData[field.name];

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  // Select simples
  if (field.type === 'select') {
    const options = getOptions(field);
    const labelKey = field.optionLabel || field.itemLabel || 'label';
    const valueKey = field.optionValue || field.itemValue || 'value';

    const match = options.find(opt => {
      const optVal = opt[valueKey] ?? opt.value ?? opt.id;
      return optVal === value;
    });

    if (match) {
      return match[labelKey] ?? match.label ?? String(value);
    }
    return String(value);
  }

  // Multi-select / transfer
  if (field.type === 'multiselect' || field.type === 'transfer') {
    const arr = Array.isArray(value) ? value : [];
    const options = getOptions(field);
    const labelKey = field.optionLabel || field.itemLabel || 'label';
    const valueKey = field.optionValue || field.itemValue || 'value';

    const labels = arr.map(v => {
      if (v && typeof v === 'object') {
        return v[labelKey] ?? v[valueKey] ?? '';
      }
      const opt = options.find(o => {
        const optVal = o[valueKey] ?? o.value ?? o.id;
        return optVal === v;
      });
      return opt ? (opt[labelKey] ?? opt.label ?? String(v)) : String(v);
    }).filter(Boolean);

    return labels.length ? labels.join(', ') : '-';
  }

  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  // Data/Datetime
  if (field.type === 'date' || field.type === 'datetime') {
    if (value instanceof Date) {
      return value.toLocaleString('pt-BR');
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('pt-BR');
      }
      return '-';
    }
  }

  // Verificar se é uma data válida mesmo que não seja do tipo date
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR');
    }
  }

  // Color
  if (field.type === 'color') {
    if (!value) return '-';
    return value.toUpperCase();
  }

  // Se for "Invalid date" ou similar, retornar '-'
  if (typeof value === 'string' && value.toLowerCase().includes('invalid')) {
    return '-';
  }

  return String(value);
}

function updateValue(value) {
  // Não mutar props diretamente - emitir evento para o pai atualizar
  emit('update:modelValue', { field: props.field.name, value });
}

function updateFileRef(file) {
  emit('file-upload', props.field, file);
}
</script>

<style scoped>
.color-preview {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.color-preview:hover {
  border-color: rgba(0, 0, 0, 0.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.color-preview-readonly {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 2px solid rgba(0, 0, 0, 0.12);
  display: inline-block;
  flex-shrink: 0;
}

.color-field-wrapper {
  position: relative;
}

.color-input-hidden {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
  z-index: -1;
  left: -9999px;
}
</style>

