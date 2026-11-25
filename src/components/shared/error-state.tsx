import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';

type ErrorStateProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
