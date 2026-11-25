import { toast } from 'sonner';
import { Spinner } from '@/components/shared/spinner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUpdateOutletStatus } from '@/features/outlets/hooks/use-outlet-mutations';
import type { Outlet } from '@/features/outlets/types/outlet.types';

type OutletStatusDialogProps = {
  outlet: Outlet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OutletStatusDialog({ outlet, open, onOpenChange }: OutletStatusDialogProps) {
  const updateStatus = useUpdateOutletStatus(outlet.id);
  const deactivating = outlet.isActive;
  const pending = updateStatus.isPending;

  const confirm = () => {
    if (pending) return;
    updateStatus.mutate(!outlet.isActive, {
      onSuccess: (updated) => {
        toast.success(`${updated.code} is now ${updated.isActive ? 'active' : 'inactive'}.`);
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? `Deactivate ${outlet.name}?` : `Activate ${outlet.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {deactivating ? (
              <div className="space-y-2">
                <p>Deactivating {outlet.code} takes effect immediately:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Assigned staff lose access to this outlet.</li>
                  <li>New business operations for this outlet must be blocked.</li>
                  <li>
                    Staff assignments, stock records, sales history and receipt numbering are
                    preserved.
                  </li>
                </ul>
              </div>
            ) : (
              <p>
                {outlet.code} becomes available to its assigned staff again. All existing records
                and assignments are kept as they were.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={deactivating ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending && <Spinner />}
            {deactivating ? 'Deactivate outlet' : 'Activate outlet'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
