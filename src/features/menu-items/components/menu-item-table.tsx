import { Link } from 'react-router';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MenuItemActions } from '@/features/menu-items/components/menu-item-actions';
import type { MenuItem } from '@/features/menu-items/types/menu-item.types';
import { formatDate } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

function MenuItemTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-36">SKU</TableHead>
        <TableHead>Item name</TableHead>
        <TableHead className="w-32 text-right">Base price</TableHead>
        <TableHead className="w-28">Status</TableHead>
        <TableHead className="hidden w-36 md:table-cell">Created</TableHead>
        <TableHead className="w-16 text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function MenuItemTable({ items }: { items: MenuItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <MenuItemTableHeader />
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs font-medium">{item.sku}</TableCell>
              <TableCell className="max-w-64">
                <Link
                  to={`/menu-items/${item.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {item.name}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(item.basePrice)}
              </TableCell>
              <TableCell>
                <StatusBadge isActive={item.isActive} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(item.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <MenuItemActions menuItem={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function MenuItemTableSkeleton() {
  return (
    <div className="rounded-lg border" role="status" aria-label="Loading menu items">
      <Table>
        <MenuItemTableHeader />
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-44" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
