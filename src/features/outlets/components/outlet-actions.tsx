import { Eye, MoreHorizontal, Pencil, Power, PowerOff } from 'lucide-react';
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
import { OutletFormDialog } from '@/features/outlets/components/outlet-form-dialog';
import { OutletStatusDialog } from '@/features/outlets/components/outlet-status-dialog';
import type { Outlet } from '@/features/outlets/types/outlet.types';

type Dialog = 'edit' | 'status' | null;

export function OutletActions({ outlet, canManage }: { outlet: Outlet; canManage: boolean }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const detailsPath = `/outlets/${outlet.id}`;

  if (!canManage) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link to={detailsPath} aria-label={`View ${outlet.name}`}>
          View
        </Link>
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${outlet.name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link to={detailsPath}>
              <Eye aria-hidden />
              View details
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('edit')}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={outlet.isActive ? 'destructive' : 'default'}
            onSelect={() => setDialog('status')}
          >
            {outlet.isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
            {outlet.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <OutletFormDialog
        outlet={outlet}
        open={dialog === 'edit'}
        onOpenChange={(open) => setDialog(open ? 'edit' : null)}
      />
      <OutletStatusDialog
        outlet={outlet}
        open={dialog === 'status'}
        onOpenChange={(open) => setDialog(open ? 'status' : null)}
      />
    </>
  );
}
