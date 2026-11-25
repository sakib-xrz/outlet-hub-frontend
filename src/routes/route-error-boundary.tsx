import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ErrorState } from '@/components/shared/error-state';
import { NotFoundPage } from '@/pages/errors/not-found-page';

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  if (import.meta.env.DEV) console.error(error);

  return (
    <main className="flex min-h-svh items-center justify-center">
      <ErrorState
        description="This page failed to load. If the application was just updated, reloading usually fixes it."
        retryLabel="Reload page"
        onRetry={() => window.location.reload()}
      />
    </main>
  );
}
