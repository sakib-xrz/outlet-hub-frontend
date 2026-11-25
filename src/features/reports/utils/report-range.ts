import type { ReportPeriod, ReportRange } from '@/features/reports/types/report.types';

export const MAX_RANGE_DAYS = 366;
const DAY_MS = 86_400_000;

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  month: 'This month',
  all: 'All time',
  custom: 'Custom range',
};

const localDay = (year: number, month: number, day: number): Date => new Date(year, month, day);
const startOfDay = (date: Date): Date =>
  localDay(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number): Date =>
  localDay(date.getFullYear(), date.getMonth(), date.getDate() + days);

export function parseDay(value: string | undefined): Date | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = localDay(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

export function toDay(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type ResolvedRange = { range: ReportRange; start: Date | null; endInclusive: Date | null };

export function customRangeError(from: string | undefined, to: string | undefined): string | null {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end) return 'Choose a valid start and end date.';
  if (end < start) return 'The end date must be on or after the start date.';
  if (addDays(end, 1).getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    return `Choose a range of at most ${MAX_RANGE_DAYS} days.`;
  }
  return null;
}

export function resolveRange(
  period: ReportPeriod,
  custom: { from?: string | undefined; to?: string | undefined } = {},
  now: Date = new Date(),
): ResolvedRange {
  const today = startOfDay(now);
  let start: Date;
  let end: Date;
  switch (period) {
    case 'all':
      return { range: null, start: null, endInclusive: null };
    case 'today':
      start = today;
      end = addDays(today, 1);
      break;
    case '7d':
      start = addDays(today, -6);
      end = addDays(today, 1);
      break;
    case 'month':
      start = localDay(today.getFullYear(), today.getMonth(), 1);
      end = localDay(today.getFullYear(), today.getMonth() + 1, 1);
      break;
    case 'custom': {
      const from = parseDay(custom.from);
      const to = parseDay(custom.to);
      if (from && to && !customRangeError(custom.from, custom.to)) {
        start = from;
        end = addDays(to, 1);
        break;
      }
      return resolveRange('30d', {}, now);
    }
    case '30d':
      start = addDays(today, -29);
      end = addDays(today, 1);
      break;
  }
  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    start,
    endInclusive: addDays(end, -1),
  };
}

const dayFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

export function describeRange({ start, endInclusive }: ResolvedRange): string {
  if (!start || !endInclusive) return 'All recorded sales';
  const first = dayFormat.format(start);
  const last = dayFormat.format(endInclusive);
  return first === last ? first : `${first} – ${last}`;
}
