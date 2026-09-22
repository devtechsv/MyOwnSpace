import { useRouter } from 'next/router';
import { useCallback } from 'react';
import API from '@/services/api-services';

export function useLogout() {
  const router = useRouter();

  return useCallback(async () => {
    try {
      await API.auth.logout();
    } finally {
      // Pase lo que pase con la llamada al backend (incluso un 401 si
      // la cookie ya había expirado), el usuario siempre termina en
      // /login — antes, un logout() que tiraba dejaba al usuario varado.
      await router.push('/login');
    }
  }, [router]);
}