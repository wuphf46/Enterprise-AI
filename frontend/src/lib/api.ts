import axios from 'axios';
import { useAuthStore } from '../store/auth-store';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first?.msg === 'string' && first.msg.trim()) return first.msg;
    }
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;
async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api.post<{ access_token: string }>('/api/auth/refresh')
      .then(({ data }) => {
        useAuthStore.setState({ accessToken: data.access_token });
        return data.access_token;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return null;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  const url = String(original?.url ?? '');
  if (error.response?.status !== 401 || original?._retry || url.includes('/api/auth/')) {
    return Promise.reject(error);
  }
  original._retry = true;
  const token = await refreshAccessToken();
  if (!token) return Promise.reject(error);
  original.headers.Authorization = `Bearer ${token}`;
  return api(original);
});
