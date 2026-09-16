import { useCallback, useEffect, useState } from 'react';
import API from '@/services/api-services';
import { User } from '@/contracts/interfaces/user';

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await API.users.list();
      setUsers(data);
    } catch {
      setError('No pudimos cargar los usuarios. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = {
    total: users.length,
    activos: users.filter((u) => u.estado === 'Activo').length,
    pendientes: users.filter((u) => u.estado === 'Pendiente').length,
  };

  return { users, stats, isLoading, error, reload: load };
}
