import { NavLink, useLocation } from 'react-router';
import { Brand } from '@/components/layout/brand';
import { NAVIGATION } from '@/components/layout/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useSessionUser } from '@/features/auth/hooks/use-session';

export function AppSidebar() {
  const user = useSessionUser();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const items = NAVIGATION.filter((item) => user && item.roles.includes(user.role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 flex-row items-center gap-2 border-b">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
          aria-hidden
        >
          O
        </span>
        <Brand className="truncate group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Main navigation">
              {items.map(({ title, to, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === to || pathname.startsWith(`${to}/`)}
                    tooltip={title}
                  >
                    <NavLink to={to} onClick={() => isMobile && setOpenMobile(false)}>
                      <Icon aria-hidden />
                      <span>{title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
