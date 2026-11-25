import { z } from 'zod';

export const CURRENCY_SYMBOL = '৳';
export const MONEY_MAX = '9999999999.99';

const MONEY_PATTERN = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/;

export const moneyInputSchema = z
  .string()
  .trim()
  .min(1, 'Enter a price.')
  .regex(MONEY_PATTERN, `Enter an amount from 0 to ${MONEY_MAX} with at most 2 decimals.`)
  .transform((value) => {
    const [whole = '0', fraction = ''] = value.split('.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
  });

export const moneyResponseSchema = z.string().regex(/^(0|[1-9]\d{0,9})\.\d{2}$/);

export function formatMoney(value: string): string {
  const [whole = '0', fraction = '00'] = value.split('.');
  return `${CURRENCY_SYMBOL}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}
