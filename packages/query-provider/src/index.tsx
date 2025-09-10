import React, { PropsWithChildren, useMemo } from 'react';
import { QueryClient, QueryClientProvider, QueryClientConfig } from '@tanstack/react-query';

interface QueryProviderProps {
  config?: QueryClientConfig;
}

export const QueryProvider = ({ children, config }: PropsWithChildren<QueryProviderProps>) => {
  const queryClient = useMemo(() => new QueryClient(config), [config]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
