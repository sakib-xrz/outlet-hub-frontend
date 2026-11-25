import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/password-input';
import { useLogin } from '@/features/auth/hooks/use-login';
import { loginFormSchema } from '@/features/auth/schemas/auth.schemas';
import type { LoginCredentials, LoginFormValues } from '@/features/auth/types/auth.types';
import { normalizeApiError } from '@/lib/api/errors';

const FIELDS = ['email', 'password'] as const;
type LoginField = (typeof FIELDS)[number];

function isLoginField(field: string): field is LoginField {
  return (FIELDS as readonly string[]).includes(field);
}

export function LoginForm() {
  const login = useLogin();
  const form = useForm<LoginFormValues, unknown, LoginCredentials>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });
  const rootError = form.formState.errors.root?.server?.message;
  const pending = form.formState.isSubmitting || login.isPending;

  const onSubmit = form.handleSubmit(async (credentials) => {
    try {
      await login.mutateAsync(credentials);
    } catch (error) {
      const apiError = normalizeApiError(error);
      const fieldErrors = apiError.fieldErrors.filter(({ field }) => isLoginField(field));

      for (const { field, message } of fieldErrors) {
        if (isLoginField(field)) form.setError(field, { type: 'server', message });
      }
      if (apiError.kind === 'invalid_credentials') {
        form.resetField('password');
        form.setFocus('password');
      }
      if (!fieldErrors.length) form.setError('root.server', { message: apiError.message });
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={rootError ? 'login-error' : undefined}>
      <FieldGroup className="gap-5">
        {rootError && (
          <Alert variant="destructive" id="login-error">
            <AlertCircle aria-hidden />
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'login-email-error' : undefined}
                disabled={pending}
              />
              <FieldError id="login-email-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <PasswordInput
                {...field}
                id="login-password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'login-password-error' : undefined}
                disabled={pending}
              />
              <FieldError id="login-password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending && <Spinner />}
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}
