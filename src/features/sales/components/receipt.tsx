import { useEffect, useRef } from 'react';
import type { Sale } from '@/features/sales/types/sale.types';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

// Singleton <style media="print"> in document.head.
// Tracks the height of every mounted receipt and uses the tallest so the
// @page height is always large enough for the longest receipt.
let printStyleEl: HTMLStyleElement | null = null;
const receiptHeights = new Map<Element, number>();

const PX_TO_MM = 25.4 / 96;
const SAFETY_MM = 2;
const WIDTH_MM = 80;

function writePrintStyle() {
  if (!printStyleEl) return;
  const maxH = receiptHeights.size > 0 ? Math.max(...receiptHeights.values()) : WIDTH_MM;
  printStyleEl.textContent = `@page { size: ${WIDTH_MM}mm ${maxH.toFixed(1)}mm; margin: 0; }`;
}

function useReceiptPrintStyle() {
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;

    if (!printStyleEl) {
      printStyleEl = document.createElement('style');
      printStyleEl.media = 'print';
      document.head.appendChild(printStyleEl);
    }

    // Initial measurement; may be 0 in jsdom / before layout completes.
    receiptHeights.set(el, el.getBoundingClientRect().height * PX_TO_MM + SAFETY_MM);
    writePrintStyle();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const hPx = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
        receiptHeights.set(el, hPx * PX_TO_MM + SAFETY_MM);
        writePrintStyle();
      }
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      receiptHeights.delete(el);
      if (receiptHeights.size === 0) {
        printStyleEl?.remove();
        printStyleEl = null;
      } else {
        writePrintStyle();
      }
    };
  }, []); // articleRef is a stable ref — intentionally omitted from deps

  return articleRef;
}

export function Receipt({ sale, cashierLabel }: { sale: Sale; cashierLabel: string }) {
  const articleRef = useReceiptPrintStyle();
  return (
    <article
      ref={articleRef}
      aria-labelledby="receipt-heading"
      data-print-receipt
      className="mx-auto w-[80mm] rounded-lg border bg-card p-[4mm] font-mono text-sm print:rounded-none print:border-0"
    >
      <header className="mb-3 text-center">
        <p className="font-sans text-base font-semibold">{sale.outletName}</p>
        <p className="text-xs text-muted-foreground print:text-black">{sale.outletCode}</p>
      </header>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground print:text-black">Receipt</dt>
        <dd id="receipt-heading" className="text-right font-semibold">
          {sale.receiptCode}
        </dd>
        <dt className="text-muted-foreground print:text-black">Date</dt>
        <dd className="text-right">{formatDateTime(sale.createdAt)}</dd>
        <dt className="text-muted-foreground print:text-black">Cashier</dt>
        <dd className="text-right">{cashierLabel}</dd>
      </dl>
      <table className="w-full border-y border-dashed text-xs">
        <thead>
          <tr className="text-muted-foreground print:text-black">
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
              <td className="py-1 pr-2 wrap-break-word">{item.itemName}</td>
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
      <p className="mt-4 text-center text-xs text-muted-foreground print:text-black">Thank you</p>
    </article>
  );
}
