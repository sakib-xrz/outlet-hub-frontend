import type { Sale } from '@/features/sales/types/sale.types';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

export function Receipt({ sale, cashierLabel }: { sale: Sale; cashierLabel: string }) {
  return (
    <article
      aria-labelledby="receipt-heading"
      data-print-receipt
      className="mx-auto w-full max-w-sm rounded-lg border bg-card p-5 font-mono text-sm print:max-w-none print:border-0 print:p-0"
    >
      <header className="mb-3 text-center">
        <p className="font-sans text-base font-semibold">{sale.outletName}</p>
        <p className="text-xs text-muted-foreground">{sale.outletCode}</p>
      </header>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Receipt</dt>
        <dd id="receipt-heading" className="text-right font-semibold">
          {sale.receiptCode}
        </dd>
        <dt className="text-muted-foreground">Date</dt>
        <dd className="text-right">{formatDateTime(sale.createdAt)}</dd>
        <dt className="text-muted-foreground">Cashier</dt>
        <dd className="text-right">{cashierLabel}</dd>
      </dl>
      <table className="w-full border-y border-dashed text-xs">
        <thead>
          <tr className="text-muted-foreground">
            <th scope="col" className="py-1 text-left font-normal">
              Item
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Qty
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Price
            </th>
            <th scope="col" className="py-1 text-right font-normal">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.menuItemId} className="align-top">
              <td className="py-1 pr-2 break-words">{item.itemName}</td>
              <td className="py-1 text-right tabular-nums">{item.quantity}</td>
              <td className="py-1 text-right tabular-nums">{formatMoney(item.unitPrice)}</td>
              <td className="py-1 text-right tabular-nums">{formatMoney(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 flex justify-between text-base font-semibold">
        <span>Total (BDT)</span>
        <span className="tabular-nums" aria-label="Receipt total">
          {formatMoney(sale.totalAmount)}
        </span>
      </p>
      <p className="mt-4 text-center text-xs text-muted-foreground">Thank you</p>
    </article>
  );
}
