import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type ApiError, normalizeApiError } from '@/lib/api/errors';

const RETRYABLE = new Set<ApiError['kind']>(['network', 'timeout', 'server']);
const SILENT = new Set<ApiError['kind']>(['canceled', 'session_expired']);
const MAX_QUERY_RETRIES = 2;

function notify(error: unknown): void {
  const apiError = normalizeApiError(error);
  if (SILENT.has(apiError.kind)) return;
  toast.error(apiError.message, { id: `api-error:${apiError.kind}` });
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data !== undefined) notify(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (!mutation.meta?.suppressErrorToast) notify(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES && RETRYABLE.has(normalizeApiError(error).kind),
      },
      mutations: { retry: false },
    },
  });
}

export const queryClient = createQueryClient();
