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
import { useUpdateStaffStatus } from '@/features/staff/hooks/use-staff-mutations';

type Staff = { id: string; email: string; isActive: boolean };

export function StaffStatusDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useUpdateStaffStatus(staff.id);
  const deactivating = staff.isActive;
  const pending = updateStatus.isPending;

  const confirm = () => {
    if (pending) return;
    updateStatus.mutate(!staff.isActive, {
      onSuccess: (updated) => {
        toast.success(`${updated.email} is now ${updated.isActive ? 'active' : 'inactive'}.`);
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? 'Deactivate staff account?' : 'Activate staff account?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {deactivating ? (
              <div className="space-y-2">
                <p>{staff.email} will be blocked immediately:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>All sign-in sessions are revoked and new sign-ins are refused.</li>
                  <li>Outlet assignments and historical sales records are preserved.</li>
                </ul>
              </div>
            ) : (
              <p>
                {staff.email} can sign in again with their existing password. Previously revoked
                sessions stay revoked, and their outlet assignments are unchanged.
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
            {deactivating ? 'Deactivate account' : 'Activate account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
