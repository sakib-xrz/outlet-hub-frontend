import { PageContainer } from '@/components/layout/page-container';
import { useSessionUser } from '@/features/auth/hooks/use-session';
import { HqDashboard } from '@/features/reports/components/hq-dashboard';
import { StaffDashboard } from '@/features/reports/components/staff-dashboard';

export function DashboardPage() {
  const user = useSessionUser();
  const isHq = user?.role === 'HQ_ADMIN';

  return (
    <PageContainer
      title="Dashboard"
      description={
        isHq
          ? 'Company revenue, sales and best sellers across all outlets.'
          : 'Jump into the outlets you work at.'
      }
    >
      {user && (isHq ? <HqDashboard /> : <StaffDashboard />)}
    </PageContainer>
  );
}
