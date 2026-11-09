import { useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuthStore, type User } from '../store/auth-store';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const { data } = await api.post<{ access_token: string }>('/api/auth/refresh');
        const me = await api.get<User>('/api/auth/me', { headers: { Authorization: `Bearer ${data.access_token}` } });
        if (active) setSession(data.access_token, me.data);
      } catch {
        if (active) clearSession();
      }
    }
    initialize();
    return () => { active = false; };
  }, [clearSession, setSession]);

  return children;
}
