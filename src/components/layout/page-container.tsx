import type { ReactNode } from 'react';
import { cn } from 'cn';

type PageContainerProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn('mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8', className)}
    >
      <div
        data-slot="page-container-header"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
