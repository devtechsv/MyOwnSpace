import axios from 'axios';
import Router from 'next/router';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://localhost:7127/api/v1',
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Solo del lado del cliente: las llamadas server-side (SSR, vía
    // with-auth.tsx) ya manejan su propio 401 explícitamente. Se
    // excluyen login/logout porque un 401 ahí es un resultado normal
    // del flujo (credenciales incorrectas / cookie ya vencida al
    // desloguear), no una sesión que se cortó a mitad de uso.
    const esSesionVencida =
      typeof window !== 'undefined' &&
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/logout');

    if (esSesionVencida) {
      Router.push('/login?expired=1');
    }

    return Promise.reject(error);
  },
);

export default apiClient;