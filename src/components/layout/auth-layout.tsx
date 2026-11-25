import { Outlet } from 'react-router';
import { Brand } from '@/components/layout/brand';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-14">
        <Outlet />
      </main>
    </div>
  );
}
