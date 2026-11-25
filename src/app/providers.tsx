import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, type ReactNode, Suspense } from 'react';
import { ThemeProvider } from '@/components/shared/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query/client';

const QueryDevtools = import.meta.env.DEV
  ? lazy(async () => ({
      default: (await import('@tanstack/react-query-devtools')).ReactQueryDevtools,
    }))
  : null;

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <Toaster position="top-right" closeButton />
      </ThemeProvider>
      {QueryDevtools && (
        <Suspense fallback={null}>
          <QueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
