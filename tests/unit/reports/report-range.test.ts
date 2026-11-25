import { describe, expect, it } from 'vitest';
import { barRatio, formatCount } from '@/features/reports/utils/report-format';
import {
  customRangeError,
  describeRange,
  parseDay,
  resolveRange,
  toDay,
} from '@/features/reports/utils/report-range';

const NOW = new Date(2026, 10, 26, 15, 42, 7);
const local = (year: number, month: number, day: number): string =>
  new Date(year, month, day).toISOString();

describe('resolveRange', () => {
  it.each([
    ['today', local(2026, 10, 26), local(2026, 10, 27)],
    ['7d', local(2026, 10, 20), local(2026, 10, 27)],
    ['30d', local(2026, 9, 28), local(2026, 10, 27)],
    ['month', local(2026, 10, 1), local(2026, 11, 1)],
  ] as const)('%s uses local midnights with an exclusive end', (period, from, to) => {
    expect(resolveRange(period, {}, NOW).range).toEqual({ from, to });
  });

  it('never uses an inclusive 23:59:59 end', () => {
    const { range } = resolveRange('today', {}, NOW);
    const end = new Date(range?.to ?? '');
    expect([end.getHours(), end.getMinutes(), end.getSeconds()]).toEqual([0, 0, 0]);
  });

  it('returns no range for all time', () => {
    const resolved = resolveRange('all', {}, NOW);
    expect(resolved.range).toBeNull();
    expect(describeRange(resolved)).toBe('All recorded sales');
  });

  it('makes a custom end date inclusive by ending at the next local midnight', () => {
    expect(resolveRange('custom', { from: '2026-02-01', to: '2026-02-28' }, NOW).range).toEqual({
      from: local(2026, 1, 1),
      to: local(2026, 2, 1),
    });
  });

  it('falls back to the last 30 days for an invalid custom range', () => {
    expect(resolveRange('custom', { from: '2026-02-30', to: '2026-03-01' }, NOW).range).toEqual(
      resolveRange('30d', {}, NOW).range,
    );
  });

  it('rolls the month over at the year end', () => {
    expect(resolveRange('month', {}, new Date(2026, 11, 31, 23, 59)).range?.to).toBe(
      local(2027, 0, 1),
    );
  });
});

describe('custom range validation', () => {
  it.each([
    [undefined, '2026-01-01', /valid start and end/],
    ['2026-02-31', '2026-03-01', /valid start and end/],
    ['2026-03-02', '2026-03-01', /on or after/],
    ['2026-01-01', '2027-01-02', /at most 366 days/],
  ])('rejects %s – %s', (from, to, message) => {
    expect(customRangeError(from, to)).toMatch(message);
  });

  it('accepts a single day and a full leap year', () => {
    expect(customRangeError('2026-03-01', '2026-03-01')).toBeNull();
    expect(customRangeError('2028-01-01', '2028-12-31')).toBeNull();
  });

  it('round-trips calendar days', () => {
    expect(toDay(parseDay('2026-11-05') ?? new Date(0))).toBe('2026-11-05');
  });
});

describe('report formatting', () => {
  it('groups integer strings exactly beyond 2^53', () => {
    expect(formatCount('9007199254740993')).toBe('9,007,199,254,740,993');
    expect(formatCount(0)).toBe('0');
  });

  it('computes bar ratios safely', () => {
    expect(barRatio('50.00', 200)).toBe(0.25);
    expect(barRatio('0.00', 0)).toBe(0);
    expect(barRatio('NaN', 10)).toBe(0);
  });
});
