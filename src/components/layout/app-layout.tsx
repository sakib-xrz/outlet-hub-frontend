import { Outlet, useNavigation } from 'react-router';
import { AppHeader } from '@/components/layout/app-header';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePreferencesStore } from '@/stores/preferences.store';

export function AppLayout() {
  const sidebarOpen = usePreferencesStore((state) => state.sidebarOpen);
  const setSidebarOpen = usePreferencesStore((state) => state.setSidebarOpen);
  const navigating = useNavigation().state === 'loading';

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <a
          href="#main-content"
          className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <AppHeader />
          {navigating && (
            <div
              role="progressbar"
              aria-label="Loading page"
              className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary/70"
            />
          )}
          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
