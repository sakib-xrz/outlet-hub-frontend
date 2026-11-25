export function formatCount(value: string | number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function barRatio(value: string, max: number): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || max <= 0) return 0;
  return Math.min(1, amount / max);
}
