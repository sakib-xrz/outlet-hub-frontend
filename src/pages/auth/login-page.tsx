import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';
import { useRestoreFailed } from '@/features/auth/hooks/use-session';
import { retrySessionRestore } from '@/features/auth/services/session';

export function LoginPage() {
  const restoreFailed = useRestoreFailed();
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    setRetrying(true);
    try {
      await retrySessionRestore();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      {restoreFailed && (
        <Alert>
          <AlertCircle aria-hidden />
          <AlertTitle>Could not restore your session</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            Your previous session could not be restored right now. Retry, or sign in again.
            <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Use your OutletHub account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
