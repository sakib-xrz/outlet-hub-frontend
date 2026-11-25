import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/features/auth/components/password-input';
import { PASSWORD_GUIDANCE } from '@/features/staff/components/staff-form';
import { resetPasswordFormSchema } from '@/features/staff/schemas/staff.schemas';
import { useResetStaffPassword } from '@/features/staff/hooks/use-staff-mutations';
import type { ResetPasswordFormValues } from '@/features/staff/types/staff.types';
import { normalizeApiError } from '@/lib/api/errors';

function ResetPasswordForm({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const reset = useResetStaffPassword(staffId);
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
    mode: 'onTouched',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async ({ newPassword }) => {
    try {
      await reset.mutateAsync(newPassword);
      reset.reset();
      toast.success('Password reset. The staff member has been signed out of all sessions.');
      onDone();
    } catch (error) {
      reset.reset();
      const apiError = normalizeApiError(error);
      const fieldError = apiError.fieldErrors.find(({ field }) => field === 'newPassword');
      if (fieldError) form.setError('newPassword', { type: 'server', message: fieldError.message });
      else form.setError('root.server', { message: apiError.message });
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <FieldGroup className="gap-5">
        {rootError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}
        <Controller
          name="newPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-new-password">New password</FieldLabel>
              <PasswordInput
                {...field}
                id="reset-new-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby="reset-new-password-hint reset-new-password-error"
                disabled={pending}
              />
              <FieldDescription id="reset-new-password-hint">{PASSWORD_GUIDANCE}</FieldDescription>
              <FieldError id="reset-new-password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-confirm-password">Confirm new password</FieldLabel>
              <PasswordInput
                {...field}
                id="reset-confirm-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'reset-confirm-password-error' : undefined}
                disabled={pending}
              />
              <FieldError id="reset-confirm-password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner />}
            Reset password
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function ResetPasswordDialog({
  staffId,
  email,
  open,
  onOpenChange,
}: {
  staffId: string;
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {email}. Their refresh sessions are revoked, so they must sign in
            again. Access already granted can last up to 15 minutes until it expires.
          </DialogDescription>
        </DialogHeader>
        <ResetPasswordForm staffId={staffId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
