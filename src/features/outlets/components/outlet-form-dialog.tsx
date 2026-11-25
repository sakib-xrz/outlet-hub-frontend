import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OutletForm } from '@/features/outlets/components/outlet-form';
import { useCreateOutlet, useUpdateOutlet } from '@/features/outlets/hooks/use-outlet-mutations';
import type { Outlet } from '@/features/outlets/types/outlet.types';

type OutletFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outlet?: Outlet;
};

function CreateOutletForm({ onDone }: { onDone: () => void }) {
  const create = useCreateOutlet();
  return (
    <OutletForm
      mode="create"
      onCancel={onDone}
      onSubmit={async (input) => {
        const outlet = await create.mutateAsync(input);
        toast.success(`Outlet ${outlet.code} created.`);
        onDone();
      }}
    />
  );
}

function EditOutletForm({ outlet, onDone }: { outlet: Outlet; onDone: () => void }) {
  const update = useUpdateOutlet(outlet.id);
  return (
    <OutletForm
      mode="edit"
      outlet={outlet}
      onCancel={onDone}
      onSubmit={async (input) => {
        await update.mutateAsync(input);
        toast.success('Outlet details saved.');
        onDone();
      }}
    />
  );
}

export function OutletFormDialog({ open, onOpenChange, outlet }: OutletFormDialogProps) {
  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{outlet ? 'Edit outlet' : 'Create outlet'}</DialogTitle>
          <DialogDescription>
            {outlet
              ? 'Update the outlet name or address.'
              : 'A receipt counter is created automatically with the outlet.'}
          </DialogDescription>
        </DialogHeader>
        {outlet ? (
          <EditOutletForm outlet={outlet} onDone={close} />
        ) : (
          <CreateOutletForm onDone={close} />
        )}
      </DialogContent>
    </Dialog>
  );
}
