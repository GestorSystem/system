<template>
  <div class="search-filters">
    <!-- Botão de busca expansível com popup -->
    <q-btn
      flat
      round
      dense
      icon="search"
    >
      <q-tooltip>Buscar e Filtrar</q-tooltip>
      <q-popup-proxy
        v-model="expanded"
        :breakpoint="0"
        transition-show="scale"
        transition-hide="scale"
      >
        <q-card class="search-filters-card" style="min-width: 500px; max-width: 800px;">
      <q-card-section class="q-pa-sm">
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2">Buscar e Filtrar</div>
        </div>

        <!-- Campo de busca -->
        <q-input
          :model-value="props.searchValue"
          debounce="300"
          placeholder="Buscar..."
          dense
          outlined
          class="q-mb-md"
          @update:model-value="onSearchChange"
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>

        <!-- Filtros baseados em relations -->
        <div v-if="filterableRelations.length > 0" class="q-mb-sm">
          <div class="text-caption text-weight-medium q-mb-xs">Filtros:</div>
          <div class="row q-gutter-sm">
            <template v-for="relation in filterableRelations" :key="relation.field">
              <q-select
                :model-value="props.filters[relation.payloadField || relation.field]"
                :label="relation.label"
                :options="relationOptions[relation.field] || []"
                :option-label="relation.itemLabel || 'name'"
                :option-value="relation.itemValue || 'id'"
                :loading="loadingOptions[relation.field] || false"
                emit-value
                map-options
                outlined
                dense
                clearable
                class="col-auto"
                style="min-width: 200px"
                @update:model-value="(value) => onFilterChange(relation, value)"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey">
                      Nenhum item encontrado
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </template>
          </div>
        </div>

        <!-- Botões de ação -->
        <div class="row q-gutter-sm justify-end">
          <q-btn
            flat
            dense
            label="Limpar Filtros"
            @click="clearFilters"
          />
        </div>
      </q-card-section>
        </q-card>
      </q-popup-proxy>
    </q-btn>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { api } from '../boot/axios';

const props = defineProps({
  searchValue: {
    type: String,
    default: ''
  },
  relations: {
    type: Array,
    default: () => []
  },
  filters: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:searchValue', 'update:filters', 'search', 'filter']);

const expanded = ref(false);
const relationOptions = ref({});
const loadingOptions = ref({});

// Filtrar relations que podem ser usadas como filtros (apenas select - belongsTo)
// Ordenar para que relations sem dependência venham primeiro
const filterableRelations = computed(() => {
  const relations = props.relations.filter(relation => 
    relation.type === 'select' && 
    relation.endpoint && 
    relation.itemValue &&
    relation.payloadField // Apenas relations com payloadField podem ser filtros
  );
  
  // Ordenar: relations sem dependência primeiro, depois as dependentes
  return relations.sort((a, b) => {
    if (!a.dependsOn && b.dependsOn) return -1;
    if (a.dependsOn && !b.dependsOn) return 1;
    return 0;
  });
});

// Carregar opções para cada relation filtrable
async function loadRelationOptions(relation) {
  if (relationOptions.value[relation.field] && relationOptions.value[relation.field].length > 0) {
    return; // Já carregado
  }

  loadingOptions.value[relation.field] = true;
  try {
    const response = await api.get(relation.endpoint, {
      params: {
        limit: 1000, // Carregar muitas opções para filtros
        sortBy: relation.itemLabel || 'name',
        desc: 'false'
      }
    });
    
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      data = data.data;
    } else if (!Array.isArray(data)) {
      data = [];
    }
    
    relationOptions.value[relation.field] = data;
  } catch (error) {
    console.error(`Erro ao carregar opções para ${relation.label}:`, error);
    relationOptions.value[relation.field] = [];
  } finally {
    loadingOptions.value[relation.field] = false;
  }
}

// Carregar opções para relations dependentes quando o campo pai mudar
async function loadDependentRelationOptions(relation) {
  const dependentField = getDependentField(relation);
  if (!dependentField) {
    await loadRelationOptions(relation);
    return;
  }

  const parentValue = props.filters[dependentField];
  if (!parentValue) {
    // Se não tem valor no pai, limpar opções
    relationOptions.value[relation.field] = [];
    return;
  }

  loadingOptions.value[relation.field] = true;
  try {
    const filterParam = relation.filterParam || dependentField;
    const response = await api.get(relation.endpoint, {
      params: {
        [filterParam]: parentValue,
        limit: 1000,
        sortBy: relation.itemLabel || 'name',
        desc: 'false'
      }
    });
    
    let data = response.data;
    if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
      data = data.data;
    } else if (!Array.isArray(data)) {
      data = [];
    }
    
    relationOptions.value[relation.field] = data;
  } catch (error) {
    console.error(`Erro ao carregar opções dependentes para ${relation.label}:`, error);
    relationOptions.value[relation.field] = [];
  } finally {
    loadingOptions.value[relation.field] = false;
  }
}

// Obter o campo dependente de uma relation
function getDependentField(relation) {
  if (!relation.dependsOn) return null;
  
  // Verificar se dependsOn é o payloadField de outra relation
  const parentRelation = props.relations.find(r => 
    r.payloadField === relation.dependsOn || r.field === relation.dependsOn
  );
  
  if (parentRelation && parentRelation.payloadField) {
    return parentRelation.payloadField;
  }
  
  return relation.dependsOn;
}

function onSearchChange(value) {
  emit('update:searchValue', value);
  emit('search', value);
}

function onFilterChange(relation, value) {
  const newFilters = { ...props.filters };
  const fieldKey = relation.payloadField || relation.field;
  
  // Atualizar o valor do filtro
  if (value !== null && value !== undefined && value !== '') {
    newFilters[fieldKey] = value;
  } else {
    // Se o valor foi limpo, remover do objeto
    delete newFilters[fieldKey];
  }
  
  // Limpar filtros de relations que dependem desta
  const dependentRelations = filterableRelations.value.filter(r => {
    const depField = getDependentField(r);
    return depField === fieldKey;
  });
  dependentRelations.forEach(depRel => {
    const depField = depRel.payloadField || depRel.field;
    delete newFilters[depField];
    relationOptions.value[depRel.field] = [];
  });
  
  emit('update:filters', newFilters);
  emit('filter', newFilters);
  
  // Carregar opções para relations dependentes após um pequeno delay
  setTimeout(() => {
    dependentRelations.forEach(depRel => {
      if (value) {
        loadDependentRelationOptions(depRel);
      }
    });
  }, 100);
}

function clearFilters() {
  emit('update:searchValue', '');
  emit('update:filters', {});
  emit('search', '');
  emit('filter', {});
  // Limpar opções de relations dependentes
  filterableRelations.value.forEach(rel => {
    if (rel.dependsOn) {
      relationOptions.value[rel.field] = [];
    }
  });
}

// Carregar opções iniciais para relations sem dependência
// E carregar relations dependentes se já tiverem valor no filtro
onMounted(() => {
  filterableRelations.value.forEach(relation => {
    if (!relation.dependsOn) {
      loadRelationOptions(relation);
    } else {
      // Se já tem valor no filtro pai, carregar opções dependentes
      const dependentField = getDependentField(relation);
      if (dependentField && props.filters[dependentField]) {
        loadDependentRelationOptions(relation);
      }
    }
  });
});

// Observar mudanças em filters para carregar relations dependentes
watch(() => props.filters, (newFilters, oldFilters) => {
  filterableRelations.value.forEach(relation => {
    if (relation.dependsOn) {
      const dependentField = getDependentField(relation);
      if (dependentField) {
        const newValue = newFilters[dependentField];
        const oldValue = oldFilters?.[dependentField];
        if (newValue !== oldValue) {
          if (newValue) {
            loadDependentRelationOptions(relation);
          } else {
            // Se o valor foi removido, limpar opções
            relationOptions.value[relation.field] = [];
          }
        }
      }
    }
  });
}, { deep: true });

// Observar quando o popup é aberto para carregar opções
watch(() => expanded.value, (isExpanded) => {
  if (isExpanded) {
    // Carregar opções para todas as relations filtrables
    filterableRelations.value.forEach(relation => {
      if (!relation.dependsOn) {
        loadRelationOptions(relation);
      } else {
        // Se já tem valor no filtro pai, carregar opções dependentes
        const dependentField = getDependentField(relation);
        if (dependentField && props.filters[dependentField]) {
          loadDependentRelationOptions(relation);
        }
      }
    });
  }
});
</script>

<style scoped>
.search-filters {
  position: relative;
}

.search-filters-menu {
  z-index: 2000;
}
</style>

