import { FileQuestion } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for does not exist or has moved."
        action={
          <Button asChild variant="outline">
            <Link to={ROUTES.root}>Go to home</Link>
          </Button>
        }
      />
    </main>
  );
}
