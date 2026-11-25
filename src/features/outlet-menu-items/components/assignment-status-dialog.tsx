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
import { useSetAssignmentStatus } from '@/features/outlet-menu-items/hooks/use-outlet-menu';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';

export function AssignmentStatusDialog({
  item,
  open,
  onOpenChange,
}: {
  item: OutletMenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const setStatus = useSetAssignmentStatus(item.outletId, item.menuItemId);
  const deactivating = item.isActive;
  const pending = setStatus.isPending;
  const blockedReason = deactivating
    ? null
    : !item.outletIsActive
      ? 'The outlet is inactive. Activate the outlet first.'
      : !item.menuItemIsActive
        ? 'The master menu item is inactive. Activate it in the Master Menu first.'
        : null;

  const confirm = () => {
    if (pending || blockedReason) return;
    setStatus.mutate(!item.isActive, {
      onSuccess: (updated) => {
        toast.success(
          `${updated.sku} is now ${updated.isActive ? 'active' : 'inactive'} in this outlet.`,
        );
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating
              ? `Remove ${item.name} from this outlet's menu?`
              : `Reactivate ${item.name} in this outlet?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {deactivating ? (
              <div className="space-y-2">
                <p>The assignment is deactivated, not deleted:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>The item becomes unavailable in this outlet only.</li>
                  <li>Other outlets that sell this item are not affected.</li>
                  <li>Stock ({item.stockQuantity}) and any custom price are preserved.</li>
                  <li>Past sales remain unchanged.</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  The existing stock ({item.stockQuantity}) and pricing are kept exactly as they
                  were.
                </p>
                {blockedReason && <p className="font-medium text-destructive">{blockedReason}</p>}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={deactivating ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={pending || blockedReason !== null}
            aria-busy={pending}
          >
            {pending && <Spinner />}
            {deactivating ? 'Deactivate assignment' : 'Reactivate assignment'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
