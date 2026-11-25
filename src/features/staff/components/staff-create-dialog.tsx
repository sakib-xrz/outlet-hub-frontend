import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StaffForm } from '@/features/staff/components/staff-form';
import { useCreateStaff } from '@/features/staff/hooks/use-staff-mutations';

function CreateStaffContent({ onDone }: { onDone: () => void }) {
  const create = useCreateStaff();
  return (
    <StaffForm
      onCancel={onDone}
      onSubmit={async (input) => {
        const staff = await create.mutateAsync(input);
        create.reset();
        toast.success(`Staff account ${staff.email} created.`);
        onDone();
      }}
    />
  );
}

export function StaffCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create staff account</DialogTitle>
          <DialogDescription>
            The account is created as Outlet Staff. Share the password with the staff member through
            a secure channel.
          </DialogDescription>
        </DialogHeader>
        <CreateStaffContent onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
