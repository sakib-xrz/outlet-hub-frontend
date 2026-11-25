import { Spinner } from '@/components/shared/spinner';

export function FullPageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center gap-3"
    >
      <Spinner className="size-5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
