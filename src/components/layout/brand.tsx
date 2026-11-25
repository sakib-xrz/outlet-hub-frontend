import { cn } from 'cn';

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('text-base font-semibold tracking-tight', className)}>
      Outlet<span className="text-muted-foreground">Hub</span>
    </span>
  );
}
