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
import { useUpdateMenuItemStatus } from '@/features/menu-items/hooks/use-menu-item-mutations';
import type { MenuItem } from '@/features/menu-items/types/menu-item.types';

export function MenuItemStatusDialog({
  menuItem,
  open,
  onOpenChange,
}: {
  menuItem: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateStatus = useUpdateMenuItemStatus(menuItem.id);
  const deactivating = menuItem.isActive;
  const pending = updateStatus.isPending;

  const confirm = () => {
    if (pending) return;
    updateStatus.mutate(!menuItem.isActive, {
      onSuccess: (updated) => {
        toast.success(`${updated.sku} is now ${updated.isActive ? 'active' : 'inactive'}.`);
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deactivating ? `Deactivate ${menuItem.name}?` : `Activate ${menuItem.name}?`}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {deactivating ? (
              <div className="space-y-2">
                <p>
                  This switches off {menuItem.sku} in the master menu, for every outlet at once:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>It cannot be sold anywhere, even where its outlet assignment is active.</li>
                  <li>Outlet assignments, stock quantities and outlet price overrides are kept.</li>
                  <li>Past sales and receipts are not changed.</li>
                </ul>
              </div>
            ) : (
              <p>
                {menuItem.sku} becomes available again in the master menu. Each outlet still needs
                its own active assignment before it can sell the item.
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
            {deactivating ? 'Deactivate item' : 'Activate item'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
