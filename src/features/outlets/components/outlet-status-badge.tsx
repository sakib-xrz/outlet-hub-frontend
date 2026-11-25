import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';

export function OutletStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'secondary' : 'outline'} className="gap-1.5">
      <span
        className={cn('size-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-muted-foreground')}
        aria-hidden
      />
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
