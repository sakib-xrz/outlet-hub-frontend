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
import { StaffActions } from '@/features/staff/components/staff-actions';
import type { StaffSummary } from '@/features/staff/types/staff.types';
import { formatDate } from '@/lib/utils/format';

function StaffTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Email</TableHead>
        <TableHead className="w-28 text-right">Outlets</TableHead>
        <TableHead className="w-28">Status</TableHead>
        <TableHead className="hidden w-36 md:table-cell">Created</TableHead>
        <TableHead className="w-16 text-right">
          <span className="sr-only">Actions</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function StaffTable({ staff }: { staff: StaffSummary[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <StaffTableHeader />
        <TableBody>
          {staff.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="max-w-72">
                <Link
                  to={`/staff/${member.id}`}
                  className="block truncate font-medium hover:underline"
                >
                  {member.email}
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">{member.outletCount}</TableCell>
              <TableCell>
                <StatusBadge isActive={member.isActive} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {formatDate(member.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <StaffActions staff={member} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function StaffTableSkeleton() {
  return (
    <div className="rounded-lg border" role="status" aria-label="Loading staff">
      <Table>
        <StaffTableHeader />
        <TableBody>
          {Array.from({ length: 5 }, (_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-56" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-4 w-6" />
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
