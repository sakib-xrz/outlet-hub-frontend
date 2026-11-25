import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { syncCompletedSale } from '@/features/sales/hooks/use-sales';
import { saleService } from '@/features/sales/services/sale.service';
import {
  type CartConflict,
  type CartLine,
  cartKey,
  useCartStore,
} from '@/features/sales/stores/cart.store';
import type { PendingCheckout, Sale } from '@/features/sales/types/sale.types';
import {
  clearPendingCheckout,
  loadPendingCheckout,
  savePendingCheckout,
  toSalePayload,
} from '@/features/sales/utils/pending-checkout';
import { type ApiError, normalizeApiError } from '@/lib/api/errors';

export type CheckoutPhase =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'uncertain'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'completed'; sale: Sale; replayed: boolean };

const UNCERTAIN_KINDS = new Set<ApiError['kind']>([
  'network',
  'timeout',
  'server',
  'unknown',
  'canceled',
  'rate_limited',
]);
const CORRECTABLE_CODES = new Set(['PRICE_CHANGED', 'INSUFFICIENT_STOCK', 'ITEM_UNAVAILABLE']);

const REJECTION_MESSAGES: Record<string, string> = {
  PRICE_CHANGED: 'Some prices changed. Review the highlighted items, then confirm the sale again.',
  INSUFFICIENT_STOCK: 'Some items no longer have enough stock. Adjust the highlighted quantities.',
  ITEM_UNAVAILABLE: 'Some items are no longer available. Remove the highlighted items.',
  OUTLET_INACTIVE: 'This outlet is inactive, so sales cannot be completed.',
  IDEMPOTENCY_CONFLICT:
    'This checkout could not be matched to the original sale. Start the sale again.',
  SALE_TOTAL_LIMIT_EXCEEDED: 'The sale total is too large. Split it into smaller sales.',
  RECEIPT_LIMIT_EXCEEDED: 'This outlet has reached its receipt number limit. Contact HQ.',
};

const UNCERTAIN_MESSAGE =
  'We could not confirm whether this sale was completed. It may already be recorded. Check its status, or retry the same sale — retrying never charges twice.';

function toConflicts(error: ApiError): CartConflict[] {
  return error.fieldErrors.flatMap(({ meta }): CartConflict[] => {
    const menuItemId = typeof meta?.menuItemId === 'string' ? meta.menuItemId : null;
    if (!menuItemId) return [];
    if (error.code === 'PRICE_CHANGED' && typeof meta?.currentUnitPrice === 'string') {
      return [{ kind: 'price', menuItemId, currentUnitPrice: meta.currentUnitPrice }];
    }
    if (error.code === 'INSUFFICIENT_STOCK' && typeof meta?.availableQuantity === 'number') {
      return [{ kind: 'stock', menuItemId, availableQuantity: meta.availableQuantity }];
    }
    return error.code === 'ITEM_UNAVAILABLE' ? [{ kind: 'unavailable', menuItemId }] : [];
  });
}

export function useCheckout(userId: string, outletId: string) {
  const queryClient = useQueryClient();
  const key = cartKey(userId, outletId);
  const applyConflicts = useCartStore((state) => state.applyConflicts);
  const clearCart = useCartStore((state) => state.clear);
  const [pending, setPending] = useState<PendingCheckout | null>(() =>
    loadPendingCheckout(userId, outletId),
  );
  const [phase, setPhase] = useState<CheckoutPhase>(() =>
    loadPendingCheckout(userId, outletId)
      ? {
          kind: 'uncertain',
          message:
            'An unfinished checkout was found. Check whether it was completed before starting a new sale.',
        }
      : { kind: 'idle' },
  );
  const inFlight = useRef(false);

  const finishPending = useCallback(() => {
    clearPendingCheckout(userId, outletId);
    setPending(null);
  }, [userId, outletId]);

  const complete = useCallback(
    async (sale: Sale, replayed: boolean) => {
      finishPending();
      clearCart(key);
      setPhase({ kind: 'completed', sale, replayed });
      await syncCompletedSale(queryClient, sale);
    },
    [clearCart, finishPending, key, queryClient],
  );

  const submit = useCallback(
    async (request: PendingCheckout) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPhase({ kind: 'submitting' });
      try {
        const result = await saleService.create(outletId, toSalePayload(request));
        await complete(result.sale, result.replayed);
      } catch (error) {
        const apiError = normalizeApiError(error);
        if (UNCERTAIN_KINDS.has(apiError.kind) || apiError.code === 'CONCURRENT_UPDATE') {
          setPhase({ kind: 'uncertain', message: UNCERTAIN_MESSAGE });
          return;
        }
        finishPending();
        if (apiError.code && CORRECTABLE_CODES.has(apiError.code)) {
          applyConflicts(key, toConflicts(apiError));
          await queryClient.invalidateQueries({ queryKey: outletMenuKeys.outlet(outletId) });
        }
        setPhase({
          kind: 'rejected',
          message: (apiError.code && REJECTION_MESSAGES[apiError.code]) ?? apiError.message,
        });
      } finally {
        inFlight.current = false;
      }
    },
    [applyConflicts, complete, finishPending, key, outletId, queryClient],
  );

  const confirm = useCallback(
    async (lines: CartLine[]) => {
      if (pending || inFlight.current || lines.length === 0) return;
      const request: PendingCheckout = {
        requestId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        lines: lines.map(({ menuItemId, sku, name, quantity, unitPrice }) => ({
          menuItemId,
          sku,
          name,
          quantity,
          unitPrice,
        })),
      };
      savePendingCheckout(userId, outletId, request);
      setPending(request);
      await submit(request);
    },
    [outletId, pending, submit, userId],
  );

  const retrySame = useCallback(async () => {
    if (pending) await submit(pending);
  }, [pending, submit]);

  const checkStatus = useCallback(async () => {
    if (!pending || inFlight.current) return;
    inFlight.current = true;
    setPhase({ kind: 'submitting' });
    try {
      const result = await saleService.getByRequest(outletId, pending.requestId);
      await complete(result.sale, true);
    } catch (error) {
      const apiError = normalizeApiError(error);
      setPhase({
        kind: 'uncertain',
        message:
          apiError.kind === 'not_found'
            ? 'No completed sale was found for this checkout yet. If you retry, use "Retry same sale" — it cannot create a duplicate.'
            : `The status could not be checked: ${apiError.message}`,
      });
    } finally {
      inFlight.current = false;
    }
  }, [complete, outletId, pending]);

  const discard = useCallback(() => {
    finishPending();
    setPhase({ kind: 'idle' });
  }, [finishPending]);

  const reset = useCallback(() => setPhase({ kind: 'idle' }), []);

  return { phase, pending, confirm, retrySame, checkStatus, discard, reset };
}
