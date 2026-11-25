import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '@/components/shared/error-state';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }

  public override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-svh items-center justify-center">
        <ErrorState
          description="The application encountered an unexpected problem. Reload the page to continue."
          retryLabel="Reload page"
          onRetry={() => window.location.reload()}
        />
      </main>
    );
  }
}
