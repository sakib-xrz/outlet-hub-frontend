import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { getAvailability } from '@/features/outlet-menu-items/utils';

const DOT = { ok: 'bg-emerald-500', warn: 'bg-amber-500', off: 'bg-muted-foreground' } as const;

export function AvailabilityBadge({ item }: { item: OutletMenuItem }) {
  const { label, tone } = getAvailability(item);
  return (
    <Badge variant={tone === 'ok' ? 'secondary' : 'outline'} className="gap-1.5">
      <span className={cn('size-1.5 rounded-full', DOT[tone])} aria-hidden />
      {label}
    </Badge>
  );
}
