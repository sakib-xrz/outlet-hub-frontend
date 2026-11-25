import { ChevronsUpDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/features/auth/constants';
import { useLogout } from '@/features/auth/hooks/use-logout';
import { useSessionUser } from '@/features/auth/hooks/use-session';

export function UserMenu() {
  const user = useSessionUser();
  const logout = useLogout();
  if (!user) return null;

  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Open account menu">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm sm:inline">{user.email}</span>
          <ChevronsUpDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{user.email}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
