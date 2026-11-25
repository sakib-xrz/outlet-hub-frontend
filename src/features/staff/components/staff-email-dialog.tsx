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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { editStaffFormSchema } from '@/features/staff/schemas/staff.schemas';
import { useUpdateStaffEmail } from '@/features/staff/hooks/use-staff-mutations';
import type { EditStaffFormValues } from '@/features/staff/types/staff.types';
import { normalizeApiError } from '@/lib/api/errors';

type Staff = { id: string; email: string };

function EmailForm({ staff, onDone }: { staff: Staff; onDone: () => void }) {
  const update = useUpdateStaffEmail(staff.id);
  const form = useForm<EditStaffFormValues, unknown, { email: string }>({
    resolver: zodResolver(editStaffFormSchema),
    defaultValues: { email: staff.email },
    mode: 'onTouched',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async ({ email }) => {
    if (email === staff.email) {
      onDone();
      return;
    }
    try {
      await update.mutateAsync(email);
      toast.success('Email address updated.');
      onDone();
    } catch (error) {
      const apiError = normalizeApiError(error);
      const emailError = apiError.fieldErrors.find(({ field }) => field === 'email');
      if (emailError) form.setError('email', { type: 'server', message: emailError.message });
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
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="edit-staff-email">Email</FieldLabel>
              <Input
                {...field}
                id="edit-staff-email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'edit-staff-email-error' : undefined}
                disabled={pending}
              />
              <FieldError id="edit-staff-email-error" errors={[fieldState.error]} />
            </Field>
          )}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner />}
            Save email
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

export function StaffEmailDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit email</DialogTitle>
          <DialogDescription>
            The new address becomes this staff member&apos;s sign-in email immediately.
          </DialogDescription>
        </DialogHeader>
        <EmailForm staff={staff} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
