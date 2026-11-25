import { Eye, KeyRound, Mail, MoreHorizontal, Power, PowerOff, Store } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OutletAssignmentDialog } from '@/features/staff/components/outlet-assignment-dialog';
import { ResetPasswordDialog } from '@/features/staff/components/reset-password-dialog';
import { StaffEmailDialog } from '@/features/staff/components/staff-email-dialog';
import { StaffStatusDialog } from '@/features/staff/components/staff-status-dialog';

type Staff = { id: string; email: string; isActive: boolean };
type StaffDialog = 'email' | 'outlets' | 'password' | 'status' | null;

export function StaffDialogs({
  staff,
  dialog,
  onDialogChange,
}: {
  staff: Staff;
  dialog: StaffDialog;
  onDialogChange: (dialog: StaffDialog) => void;
}) {
  const handle = (name: Exclude<StaffDialog, null>) => (open: boolean) =>
    onDialogChange(open ? name : null);
  return (
    <>
      <StaffEmailDialog staff={staff} open={dialog === 'email'} onOpenChange={handle('email')} />
      <OutletAssignmentDialog
        staffId={staff.id}
        email={staff.email}
        open={dialog === 'outlets'}
        onOpenChange={handle('outlets')}
      />
      <ResetPasswordDialog
        staffId={staff.id}
        email={staff.email}
        open={dialog === 'password'}
        onOpenChange={handle('password')}
      />
      <StaffStatusDialog staff={staff} open={dialog === 'status'} onOpenChange={handle('status')} />
    </>
  );
}

export type { StaffDialog };

export function StaffActions({ staff }: { staff: Staff }) {
  const [dialog, setDialog] = useState<StaffDialog>(null);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${staff.email}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link to={`/staff/${staff.id}`}>
              <Eye aria-hidden />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('email')}>
            <Mail aria-hidden />
            Edit email
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('outlets')}>
            <Store aria-hidden />
            Manage outlets
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('password')}>
            <KeyRound aria-hidden />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={staff.isActive ? 'destructive' : 'default'}
            onSelect={() => setDialog('status')}
          >
            {staff.isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
            {staff.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <StaffDialogs staff={staff} dialog={dialog} onDialogChange={setDialog} />
    </>
  );
}
