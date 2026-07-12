import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListIcon, LogOutIcon, StoreIcon, UserIcon } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { toast } from "sonner";

import { apiFetch } from "@/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryKeys } from "@/data/query-keys";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Items", Icon: ListIcon },
  { to: "/stores", label: "Stores", Icon: StoreIcon },
];

function useLogoutMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => apiFetch("/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: queryKeys.auth.me,
        type: "all",
      });
      void navigate("/login");
    },
    onError: () => toast.error("Failed to log out", { duration: 6000 }),
  });
}

function AccountMenu({ mobile = false }: { mobile?: boolean }) {
  const { user } = useAuth();
  const logoutMutation = useLogoutMutation();
  const initial = user?.username.slice(0, 1).toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={mobile ? "icon-lg" : "icon"}
          className={
            mobile
              ? "h-full w-full flex-col gap-0 rounded-none"
              : "rounded-full"
          }
          aria-label={`${user?.username ?? "User"} account menu`}
        >
          {mobile ? (
            <UserIcon />
          ) : (
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
          )}
          {mobile && <span className="text-xs">User</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={mobile ? "top" : "bottom"}
        className="w-44"
      >
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onSelect={() => {
            logoutMutation.mutate();
          }}
        >
          <LogOutIcon />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function navLinkClass(isActive: boolean) {
  return cn(
    "text-muted-foreground hover:bg-muted hover:text-foreground",
    isActive && "bg-muted text-foreground"
  );
}

export function DesktopNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="bg-card hidden border-b shadow-sm md:block"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-4 py-2">
        <Link to="/" className="text-primary mr-auto text-xl font-semibold">
          LShop
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <Button key={to} variant="ghost" size="sm" asChild>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <Icon data-icon="inline-start" />
                {label}
              </NavLink>
            </Button>
          ))}
          <AccountMenu />
        </div>
      </div>
    </nav>
  );
}

export function MobileNavigation() {
  return (
    <nav
      aria-label="Mobile navigation"
      className="bg-card fixed inset-x-0 bottom-0 z-50 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-start border-t pt-1 shadow-md md:hidden"
    >
      {navItems.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "text-muted-foreground hover:text-foreground flex h-15 flex-1 flex-col items-center justify-center gap-0.5 text-xs",
              isActive && "text-primary"
            )
          }
        >
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
      <div className="h-15 flex-1">
        <AccountMenu mobile />
      </div>
    </nav>
  );
}

export function Navigation() {
  return (
    <>
      <DesktopNavigation />
      <MobileNavigation />
    </>
  );
}
