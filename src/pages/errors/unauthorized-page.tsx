import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <EmptyState
        icon={ShieldAlert}
        title="Access denied"
        description="Your account does not have permission to view this page. Contact an HQ administrator if you believe this is a mistake."
        action={
          <Button asChild variant="outline">
            <Link to={ROUTES.root}>Go to home</Link>
          </Button>
        }
      />
    </main>
  );
}
