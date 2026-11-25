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
import { MenuItemFormDialog } from '@/features/menu-items/components/menu-item-form-dialog';
import { MenuItemStatusDialog } from '@/features/menu-items/components/menu-item-status-dialog';
import type { MenuItem } from '@/features/menu-items/types/menu-item.types';

export function MenuItemActions({ menuItem }: { menuItem: MenuItem }) {
  const [dialog, setDialog] = useState<'edit' | 'status' | null>(null);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${menuItem.name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link to={`/menu-items/${menuItem.id}`}>
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
            variant={menuItem.isActive ? 'destructive' : 'default'}
            onSelect={() => setDialog('status')}
          >
            {menuItem.isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
            {menuItem.isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MenuItemFormDialog
        menuItem={menuItem}
        open={dialog === 'edit'}
        onOpenChange={(open) => setDialog(open ? 'edit' : null)}
      />
      <MenuItemStatusDialog
        menuItem={menuItem}
        open={dialog === 'status'}
        onOpenChange={(open) => setDialog(open ? 'status' : null)}
      />
    </>
  );
}
