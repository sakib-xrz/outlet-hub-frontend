import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  createOutletFormSchema,
  updateOutletFormSchema,
} from '@/features/outlets/schemas/outlet.schemas';
import type {
  CreateOutletInput,
  Outlet,
  UpdateOutletInput,
} from '@/features/outlets/types/outlet.types';
import { normalizeApiError } from '@/lib/api/errors';

type FormValues = { code: string; name: string; address: string };
type ParsedValues = { code: string; name: string; address: string | null };

const editSchema = updateOutletFormSchema.extend({ code: z.string() });
const FIELDS = ['code', 'name', 'address'] as const;

type OutletFormProps =
  | {
      mode: 'create';
      onSubmit: (input: CreateOutletInput) => Promise<unknown>;
      onCancel: () => void;
    }
  | {
      mode: 'edit';
      outlet: Outlet;
      onSubmit: (input: UpdateOutletInput) => Promise<unknown>;
      onCancel: () => void;
    };

function isField(field: string): field is (typeof FIELDS)[number] {
  return (FIELDS as readonly string[]).includes(field);
}

export function OutletForm(props: OutletFormProps) {
  const editing = props.mode === 'edit';
  const form = useForm<FormValues, unknown, ParsedValues>({
    resolver: zodResolver(editing ? editSchema : createOutletFormSchema),
    defaultValues: editing
      ? { code: props.outlet.code, name: props.outlet.name, address: props.outlet.address ?? '' }
      : { code: '', name: '', address: '' },
    mode: 'onTouched',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (props.mode === 'edit')
        await props.onSubmit({ name: values.name, address: values.address });
      else await props.onSubmit(values);
    } catch (error) {
      const apiError = normalizeApiError(error);
      const fieldErrors = apiError.fieldErrors.filter(({ field }) => isField(field));
      for (const { field, message } of fieldErrors) {
        if (isField(field)) form.setError(field, { type: 'server', message });
      }
      if (!fieldErrors.length) form.setError('root.server', { message: apiError.message });
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
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="outlet-code">Outlet code</FieldLabel>
              <Input
                {...field}
                id="outlet-code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                readOnly={editing}
                aria-readonly={editing}
                aria-invalid={fieldState.invalid}
                aria-describedby="outlet-code-hint outlet-code-error"
                className="font-mono uppercase read-only:bg-muted read-only:text-muted-foreground"
                disabled={pending}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
              <FieldDescription id="outlet-code-hint">
                {editing
                  ? 'Outlet codes cannot be changed after creation.'
                  : 'Letters, numbers and hyphens, e.g. MIRPUR-01. Cannot be changed later.'}
              </FieldDescription>
              <FieldError id="outlet-code-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="outlet-name">Outlet name</FieldLabel>
              <Input
                {...field}
                id="outlet-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'outlet-name-error' : undefined}
                disabled={pending}
              />
              <FieldError id="outlet-name-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="outlet-address">
                Address <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="outlet-address"
                rows={3}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'outlet-address-error' : undefined}
                disabled={pending}
              />
              <FieldError id="outlet-address-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner />}
            {editing ? 'Save changes' : 'Create outlet'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
