import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthBootstrap } from '../auth/auth-bootstrap';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}><AuthBootstrap>{children}</AuthBootstrap></QueryClientProvider>;
}
