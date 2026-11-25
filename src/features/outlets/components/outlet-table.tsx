import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OutletActions } from '@/features/outlets/components/outlet-actions';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Outlet } from '@/features/outlets/types/outlet.types';
import { formatDate } from '@/lib/utils/format';

const SKELETON_ROWS = 5;

function OutletTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-32">Code</TableHead>
        <TableHead>Name</TableHead>
        <TableHead className="hidden lg:table-cell">Address</TableHead>
        <TableHead className="w-28">Status</TableHead>
        <TableHead className="hidden w-36 md:table-cell">Created</TableHead>
        <TableHead className="w-16 text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function OutletTable({ outlets, canManage }: { outlets: Outlet[]; canManage: boolean }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <OutletTableHeader />
        <TableBody>
          {outlets.map((outlet) => (
            <TableRow key={outlet.id}>
              <TableCell className="font-mono text-xs font-medium">{outlet.code}</TableCell>
              <TableCell className="max-w-56">
                <Link
                  to={`/outlets/${outlet.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {outlet.name}
                </Link>
              </TableCell>
              <TableCell className="hidden max-w-72 truncate text-muted-foreground lg:table-cell">
                {outlet.address ?? '—'}
              </TableCell>
              <TableCell>
                <StatusBadge isActive={outlet.isActive} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(outlet.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <OutletActions outlet={outlet} canManage={canManage} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function OutletTableSkeleton() {
  return (
    <div className="rounded-lg border" role="status" aria-label="Loading outlets">
      <Table>
        <OutletTableHeader />
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-4 w-56" />
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
