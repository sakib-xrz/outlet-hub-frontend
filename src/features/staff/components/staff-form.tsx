import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/features/auth/components/password-input';
import { OutletPicker } from '@/features/outlets/components/outlet-picker';
import {
  STAFF_PASSWORD_MAX_LENGTH,
  STAFF_PASSWORD_MIN_LENGTH,
  createStaffFormSchema,
} from '@/features/staff/schemas/staff.schemas';
import type {
  CreateStaffFormOutput,
  CreateStaffFormValues,
  CreateStaffInput,
} from '@/features/staff/types/staff.types';
import { normalizeApiError } from '@/lib/api/errors';

const SERVER_FIELDS = { email: 'email', password: 'password', outletIds: 'outlets' } as const;

type StaffFormProps = {
  onSubmit: (input: CreateStaffInput) => Promise<unknown>;
  onCancel: () => void;
};

export const PASSWORD_GUIDANCE = `${STAFF_PASSWORD_MIN_LENGTH}–${STAFF_PASSWORD_MAX_LENGTH} characters. A long passphrase or a password-manager value works best.`;

export function StaffForm({ onSubmit, onCancel }: StaffFormProps) {
  const form = useForm<CreateStaffFormValues, unknown, CreateStaffFormOutput>({
    resolver: zodResolver(createStaffFormSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', outlets: [] },
    mode: 'onTouched',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async ({ email, password, outlets }) => {
    try {
      await onSubmit({ email, password, outletIds: outlets.map((outlet) => outlet.id) });
    } catch (error) {
      const apiError = normalizeApiError(error);
      let mapped = false;
      for (const { field, message } of apiError.fieldErrors) {
        const target = SERVER_FIELDS[field as keyof typeof SERVER_FIELDS] as
          (typeof SERVER_FIELDS)[keyof typeof SERVER_FIELDS] | undefined;
        if (target) {
          form.setError(target, { type: 'server', message });
          mapped = true;
        }
      }
      if (!mapped) form.setError('root.server', { message: apiError.message });
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
              <FieldLabel htmlFor="staff-email">Email</FieldLabel>
              <Input
                {...field}
                id="staff-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'staff-email-error' : undefined}
                disabled={pending}
              />
              <FieldError id="staff-email-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="staff-password">Password</FieldLabel>
              <PasswordInput
                {...field}
                id="staff-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby="staff-password-hint staff-password-error"
                disabled={pending}
              />
              <FieldDescription id="staff-password-hint">{PASSWORD_GUIDANCE}</FieldDescription>
              <FieldError id="staff-password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="staff-confirm-password">Confirm password</FieldLabel>
              <PasswordInput
                {...field}
                id="staff-confirm-password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'staff-confirm-password-error' : undefined}
                disabled={pending}
              />
              <FieldError id="staff-confirm-password-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="outlets"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Assigned outlets</FieldLabel>
              <FieldDescription id="staff-outlets-hint">
                Optional. Only active outlets can be assigned.
              </FieldDescription>
              <OutletPicker
                value={field.value}
                onChange={field.onChange}
                disabled={pending}
                invalid={fieldState.invalid}
                describedBy="staff-outlets-hint staff-outlets-error"
              />
              <FieldError id="staff-outlets-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner />}
            Create staff
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
