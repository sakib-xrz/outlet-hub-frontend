import { MoreHorizontal, Power, PowerOff, RotateCcw, Tag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssignmentStatusDialog } from '@/features/outlet-menu-items/components/assignment-status-dialog';
import { PriceOverrideDialog } from '@/features/outlet-menu-items/components/price-override-dialog';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';

type ActionDialog = 'price' | 'restore' | 'status' | null;

export function OutletMenuActions({ item }: { item: OutletMenuItem }) {
  const [dialog, setDialog] = useState<ActionDialog>(null);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.name}`}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onSelect={() => setDialog('price')}>
            <Tag aria-hidden />
            Edit price
          </DropdownMenuItem>
          {item.priceSource === 'OVERRIDE' && (
            <DropdownMenuItem onSelect={() => setDialog('restore')}>
              <RotateCcw aria-hidden />
              Restore master price
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={item.isActive ? 'destructive' : 'default'}
            onSelect={() => setDialog('status')}
          >
            {item.isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
            {item.isActive ? 'Deactivate assignment' : 'Reactivate assignment'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PriceOverrideDialog
        item={item}
        initialMode={dialog === 'restore' || item.priceSource === 'BASE' ? 'inherit' : 'custom'}
        open={dialog === 'price' || dialog === 'restore'}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <AssignmentStatusDialog
        item={item}
        open={dialog === 'status'}
        onOpenChange={(open) => setDialog(open ? 'status' : null)}
      />
    </>
  );
}
