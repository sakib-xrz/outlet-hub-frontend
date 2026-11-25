import type { OutletRevenue } from '@/features/reports/types/report.types';
import { barRatio } from '@/features/reports/utils/report-format';
import { formatMoney } from '@/lib/utils/money';

export function RevenueByOutletChart({ items }: { items: OutletRevenue[] }) {
  const max = Math.max(0, ...items.map((item) => Number(item.totalRevenue) || 0));

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="text-sm text-muted-foreground">
        Revenue for the {items.length} {items.length === 1 ? 'outlet' : 'outlets'} on this page
      </figcaption>
      <ul className="flex flex-col gap-2.5" aria-label="Revenue by outlet chart">
        {items.map((item) => (
          <li key={item.outletId} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm">
            <span className="truncate font-mono text-xs" title={item.outletName}>
              {item.outletCode}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted" aria-hidden>
                <div
                  className={
                    item.isActive
                      ? 'h-full rounded-sm bg-primary'
                      : 'h-full rounded-sm bg-muted-foreground/60'
                  }
                  style={{ width: `${(barRatio(item.totalRevenue, max) * 100).toFixed(2)}%` }}
                />
              </div>
              <span className="w-28 shrink-0 text-right tabular-nums">
                {formatMoney(item.totalRevenue)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
