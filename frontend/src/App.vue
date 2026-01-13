<template>
  <div :style="systemStyles">
    <router-view />
  </div>
</template>

<script setup>
import { computed, watch, onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// Importar e usar store de forma lazy (após Pinia estar inicializado)
const authStore = ref(null);

// Função para obter a store de forma segura
const getAuthStore = async () => {
  if (!authStore.value) {
    try {
      const { useAuthStore } = await import('@gestor/system/frontend/src/stores/auth');
      authStore.value = useAuthStore();
      // Verificar autenticação e carregar dados do usuário ao inicializar
      await authStore.value.checkAuth();
    } catch (error) {
      console.error('Erro ao carregar auth store:', error);
    }
  }
  return authStore.value;
};

const systemStyles = computed(() => {
  if (!authStore.value || !authStore.value.system) {
    return {};
  }
  
  return {
    '--system-primary': authStore.value.system.primaryColor || '#1976D2',
    '--system-secondary': authStore.value.system.secondaryColor || '#26A69A',
    '--system-text': authStore.value.system.textColor || '#FFFFFF',
  };
});

// Watch para mudanças no sistema (após store estar disponível)
watch(() => authStore.value?.system, (system) => {
  if (system) {
    // Atualizar cores do Quasar dinamicamente
    $q.dark.set(false);
    // As cores serão aplicadas via CSS variables
  }
}, { immediate: true });

// Inicializar store após montagem
onMounted(async () => {
  await getAuthStore();
});

</script>

<style>
:root {
  --system-primary: #1976D2;
  --system-secondary: #26A69A;
  --system-text: #FFFFFF;
}

/* Aplicar cores do sistema quando disponíveis */
.bg-primary {
  background-color: var(--system-primary) !important;
}

.bg-secondary {
  background-color: var(--system-secondary) !important;
}

.text-primary {
  color: var(--system-primary) !important;
}

.text-secondary {
  color: var(--system-secondary) !important;
}
</style>
