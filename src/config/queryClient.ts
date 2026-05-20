import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60 * 1000,
      gcTime:               5 * 60 * 1000,
      retry:                (failureCount, error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect:   'always',
    },
    mutations: {
      retry: 0,
    },
  },
});
