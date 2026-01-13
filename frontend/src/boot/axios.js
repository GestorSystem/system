import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';
import axios from 'axios';
import { useAuthStore } from '../stores/auth'; // Import the auth store

const api = axios.create({
  baseURL: 'http://localhost:3000', // Your backend API base URL
});

// Configurar interceptor de request ANTES do boot (para garantir que funcione imediatamente)
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token'); // Get token directly from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔐 Token adicionado ao header Authorization');
    } else {
      console.warn('⚠️  Token não encontrado no localStorage');
    }
  } catch (error) {
    console.error('❌ Erro ao acessar localStorage no interceptor:', error);
  }
  return config;
}, (error) => {
  console.error('❌ Erro no interceptor de request:', error);
  return Promise.reject(error);
});

export default boot(({ app, router }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api
  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api;
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       then you can easily perform requests: this.$api.get('/users')

  api.interceptors.response.use(
    (response) => {
      // Verificar se permissões foram adicionadas (via headers) em respostas bem-sucedidas
      const permissionAdded = response.headers['x-permission-added'];
      const addedPermissions = response.headers['x-added-permissions'];
      const redirectUrl = response.headers['x-redirect-url'];
      
      if (permissionAdded === 'true' && addedPermissions) {
        // Mostrar mensagem de sucesso
        const permissionsList = addedPermissions.split(',').join(', ');
        Notify.create({
          type: 'positive',
          message: `Permissão(ões) ${permissionsList} adicionada(s) ao ADMIN`,
          icon: 'check_circle',
          position: 'top',
          timeout: 5000
        });
        
        // Redirecionar para a URL original ou recarregar a página atual após um delay
        const finalRedirectUrl = redirectUrl || window.location.pathname;
        if (finalRedirectUrl && finalRedirectUrl !== '/access-denied') {
          setTimeout(() => {
            window.location.href = finalRedirectUrl;
          }, 500);
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }
      }
      
      return response;
    },
    (error) => {
      // Access the Pinia instance here
      const authStore = useAuthStore();
      
      if (error.response) {
        // 401: Não autenticado - fazer logout e redirecionar para login
        if (error.response.status === 401) {
          authStore.logout();
          router.push('/login');
        }
        // 403: Sem permissão
        else if (error.response.status === 403) {
          // Verificar se permissões foram adicionadas (via headers)
          const permissionAdded = error.response.headers['x-permission-added'];
          const addedPermissions = error.response.headers['x-added-permissions'];
          const redirectUrl = error.response.headers['x-redirect-url'];
          
          // Se a permissão foi adicionada automaticamente para ADMIN
          if (permissionAdded === 'true' && addedPermissions) {
            // Mostrar mensagem de sucesso
            const permissionsList = addedPermissions.split(',').join(', ');
            Notify.create({
              type: 'positive',
              message: `Permissão(ões) ${permissionsList} adicionada(s) ao ADMIN`,
              icon: 'check_circle',
              position: 'top',
              timeout: 5000
            });
            
            // Redirecionar para a URL original ou recarregar a página atual
            const finalRedirectUrl = redirectUrl || window.location.pathname;
            if (finalRedirectUrl && finalRedirectUrl !== '/access-denied') {
              // Aguardar um pouco para mostrar a notificação antes de redirecionar
              setTimeout(() => {
                window.location.href = finalRedirectUrl;
              }, 500);
            } else {
              // Se não houver URL de redirecionamento, recarregar a página atual
              setTimeout(() => {
                window.location.reload();
              }, 500);
            }
            
            return Promise.resolve({ data: { success: true, permissionAdded: true } });
          }
          
          // Caso normal: redirecionar para página de acesso negado
          const currentPath = router.currentRoute.value?.path || window.location.pathname;
          if (currentPath !== '/access-denied') {
            router.push('/access-denied').catch(() => {
              // Ignorar erro de navegação se já estiver na rota
            });
          }
        }
      }
      
      return Promise.reject(error);
    }
  );
});

export { api };
