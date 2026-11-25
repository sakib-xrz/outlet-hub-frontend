import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/error-state';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { OutletPicker, type OutletOption } from '@/features/outlets/components/outlet-picker';
import { useReplaceStaffOutlets } from '@/features/staff/hooks/use-staff-mutations';
import { useStaffQuery } from '@/features/staff/hooks/use-staff-queries';
import type { StaffDetail } from '@/features/staff/types/staff.types';
import { normalizeApiError } from '@/lib/api/errors';

function AssignmentForm({ staff, onDone }: { staff: StaffDetail; onDone: () => void }) {
  const replace = useReplaceStaffOutlets(staff.id);
  const [selected, setSelected] = useState<OutletOption[]>(staff.outlets);
  const [error, setError] = useState<string | null>(null);
  const currentIds = new Set(staff.outlets.map((outlet) => outlet.id));
  const selectedIds = new Set(selected.map((outlet) => outlet.id));
  const added = selected.filter((outlet) => !currentIds.has(outlet.id)).length;
  const removed = staff.outlets.filter((outlet) => !selectedIds.has(outlet.id)).length;
  const pending = replace.isPending;

  const save = () => {
    if (pending) return;
    setError(null);
    replace.mutate(
      selected.map((outlet) => outlet.id),
      {
        onSuccess: (updated) => {
          toast.success(`Outlet assignments saved for ${updated.email}.`);
          onDone();
        },
        onError: (failure) => {
          const apiError = normalizeApiError(failure);
          setError(apiError.fieldErrors[0]?.message ?? apiError.message);
        },
      },
    );
  };

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <OutletPicker
        value={selected}
        onChange={setSelected}
        retainableIds={currentIds}
        disabled={pending}
      />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {added || removed ? `${added} to add, ${removed} to remove.` : 'No changes yet.'}
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={save} disabled={pending || (!added && !removed)} aria-busy={pending}>
          {pending && <Spinner />}
          Save assignments
        </Button>
      </DialogFooter>
    </>
  );
}

function AssignmentContent({ staffId, onDone }: { staffId: string; onDone: () => void }) {
  const staff = useStaffQuery(staffId);
  if (staff.isPending) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading assignments">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (staff.isError) {
    return (
      <ErrorState
        className="py-4"
        title="Assignments could not be loaded"
        description={staff.error.message}
        onRetry={() => void staff.refetch()}
      />
    );
  }
  return <AssignmentForm staff={staff.data} onDone={onDone} />;
}

export function OutletAssignmentDialog({
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
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage outlet assignments</DialogTitle>
          <DialogDescription>
            Choose every outlet {email} should have. Existing inactive assignments stay until you
            remove them; inactive outlets cannot be newly assigned.
          </DialogDescription>
        </DialogHeader>
        <AssignmentContent staffId={staffId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
