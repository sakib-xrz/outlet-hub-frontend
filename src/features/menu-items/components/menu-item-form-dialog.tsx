import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MenuItemForm } from '@/features/menu-items/components/menu-item-form';
import {
  useCreateMenuItem,
  useUpdateMenuItem,
} from '@/features/menu-items/hooks/use-menu-item-mutations';
import type { MenuItem } from '@/features/menu-items/types/menu-item.types';

function CreateContent({ onDone }: { onDone: () => void }) {
  const create = useCreateMenuItem();
  return (
    <MenuItemForm
      onCancel={onDone}
      onSubmit={async (values) => {
        const item = await create.mutateAsync(values);
        toast.success(`Menu item ${item.sku} created.`);
        onDone();
      }}
    />
  );
}

function EditContent({ menuItem, onDone }: { menuItem: MenuItem; onDone: () => void }) {
  const update = useUpdateMenuItem(menuItem.id);
  return (
    <MenuItemForm
      menuItem={menuItem}
      onCancel={onDone}
      onSubmit={async ({ name, description, basePrice }) => {
        await update.mutateAsync({ name, description, basePrice });
        toast.success('Menu item saved.');
        onDone();
      }}
    />
  );
}

export function MenuItemFormDialog({
  open,
  onOpenChange,
  menuItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem?: MenuItem;
}) {
  const close = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{menuItem ? 'Edit menu item' : 'Create menu item'}</DialogTitle>
          <DialogDescription>
            {menuItem
              ? 'Changes apply to future sales only. Outlet price overrides and past sales are not changed.'
              : 'New items are active and not yet assigned to any outlet.'}
          </DialogDescription>
        </DialogHeader>
        {menuItem ? (
          <EditContent menuItem={menuItem} onDone={close} />
        ) : (
          <CreateContent onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
