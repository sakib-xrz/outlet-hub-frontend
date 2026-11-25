import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  titleAs?: 'h1' | 'h2';
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  titleAs: Title = 'h1',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-4 px-4 py-10 text-center', className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <Title className="text-xl font-semibold tracking-tight">{title}</Title>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
