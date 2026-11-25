import { describe, expect, it } from 'vitest';
import { formatMoney, moneyInputSchema } from '@/lib/utils/money';

describe('moneyInputSchema', () => {
  it.each([
    ['0', '0.00'],
    ['12.5', '12.50'],
    [' 250 ', '250.00'],
    ['0.10', '0.10'],
    ['9999999999.99', '9999999999.99'],
  ])('normalizes %j to %s as a string', (input, expected) => {
    expect(moneyInputSchema.parse(input)).toBe(expected);
  });

  it.each(['', '-1', '1.234', '1e3', 'NaN', 'Infinity', '01', '1,000', '.5', '10000000000'])(
    'rejects %j',
    (input) => {
      expect(moneyInputSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe('formatMoney', () => {
  it('groups digits without converting to a floating-point number', () => {
    expect(formatMoney('9999999999.99')).toBe('৳9,999,999,999.99');
    expect(formatMoney('1250.50')).toBe('৳1,250.50');
    expect(formatMoney('0.10')).toBe('৳0.10');
  });
});
